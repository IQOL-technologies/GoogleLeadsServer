import axios from "axios";
import { getNextId } from "../utils/idGenerator.js";
import { normalizePropertyName, getPropertyIdByName } from "../utils/propertyUtils.js";
import { accounts as configAccounts } from "../config/metaAds.js";

async function fetchAllMetaAds(adAccountId, accessToken, params = {}) {
  if (!adAccountId || !accessToken) {
    throw new Error("Missing adAccountId or accessToken");
  }
  const baseUrl = "https://graph.facebook.com/v23.0";
  const url = `${baseUrl}/${adAccountId}/ads`;
  let allAds = [];
  let nextPage = null;
  let firstRequest = true;
  let pageParams = { ...params };

  do {
    try {
      const response = await axios.get(url, {
        params: {
          access_token: accessToken,
          fields: "id,name",
          ...pageParams,
        },
      });
      const data = response.data;
      if (Array.isArray(data.data)) {
        allAds = allAds.concat(data.data);
      }
      if (data.paging && data.paging.next) {
        const nextUrl = new URL(data.paging.next);
        const after = nextUrl.searchParams.get("after");
        pageParams.after = after;
        nextPage = after;
      } else {
        nextPage = null;
      }
      firstRequest = false;
    } catch (error) {
      throw new Error(
        error.response?.data?.error?.message ||
          error.message ||
          "Meta API error",
      );
    }
  } while (firstRequest || nextPage);
  return { data: allAds };
}

async function fetchMetaLeads(adAccountId, accessToken, params = {}) {
  if (!adAccountId || !accessToken) {
    throw new Error("Missing adAccountId or accessToken");
  }

  const allAds = await fetchAllMetaAds(adAccountId, accessToken);
  if (!allAds || !allAds.data || allAds.data.length === 0) {
    throw new Error("No ads found");
  }
  let allLeads = [];
  const baseUrl = "https://graph.facebook.com/v23.0";

  const now = Date.now();
  const last24h = now - 24 * 60 * 60 * 1000;
  for (const ad of allAds.data) {
    console.log("Processing ad:", ad.id, ad.name);
    const adId = ad.id;
    if (!adId) continue;
    let nextPage = null;
    let firstRequest = true;
    let pageParams = { ...params };
    pageParams.fields =
      "id,ad_id,created_time,field_data,platform,name,form_id,campaign_name,campaign_id,adset_id,adset_name";
    do {
      try {
        const url = `${baseUrl}/${adId}/leads`;
        const response = await axios.get(url, {
          params: {
            access_token: accessToken,
            ...pageParams,
          },
        });
        const data = response.data;
        if (Array.isArray(data.data)) {
          // Filter leads by created_time in the last 24 hours
          const filteredLeads = data.data.filter((lead) => {
            if (!lead.created_time) return false;
            const created = new Date(lead.created_time).getTime();
            return created >= last24h;
          }); 
          allLeads = allLeads.concat(
            filteredLeads.map((lead) => ({
              ...lead,
              ad_id: adId,
              ad_name: ad.name,
              ad_account_id: adAccountId,
            })),
          );
        }
        if (data.paging && data.paging.next) {
          const nextUrl = new URL(data.paging.next);
          const after = nextUrl.searchParams.get("after");
          pageParams.after = after;
          nextPage = after;
        } else {
          nextPage = null;
        }
        firstRequest = false;
      } catch (error) {
        if (error.response && error.response.status === 400) {
          break;
        }
        throw new Error(
          error.response?.data?.error?.message ||
            error.message ||
            "Meta API error",
        );
      }
    } while (firstRequest || nextPage);
  }
  return { data: allLeads };
}

async function fetchFormName(formId, accessToken) {
  try {
    if (!formId || !accessToken) {
      throw new Error("Missing formId or accessToken");
    }
    const baseUrl = "https://graph.facebook.com/v23.0";
    const url = `${baseUrl}/${formId}`;
    const response = await axios.get(url, {
      params: {
        fields: "name",
        access_token: accessToken,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error?.message || error.message || "Meta API error",
    );
  }
}

function cleanFormName(formName) {
  if (!formName) return "";
  return formName.replace(/form\s*\d+$/i, "").trim();
}

function extractFieldValue(metaLead, fieldName) {
  if (metaLead[fieldName]) {
    return metaLead[fieldName];
  }
  if (Array.isArray(metaLead.field_data)) {
    const field = metaLead.field_data.find((f) => f.name === fieldName);
    if (field && Array.isArray(field.values) && field.values.length > 0) {
      return field.values[0];
    }
  }
  return "";
}

async function checkDuplicateUser(db, phoneNumber) {
  const usersRef = db.collection("canvashomesUsersV2");
  const querySnapshot = await usersRef
    .where("phoneNumber", "==", phoneNumber)
    .get();
  return {
    check: !querySnapshot.empty,
    userId: querySnapshot.empty ? null : querySnapshot.docs[0].data().userId,
  };
}

async function checkDuplicateEnquiry(db, phoneNumber, propertyName) {
  const enquiriesRef = db.collection("canvashomesEnquiriesV2");
  const querySnapshot = await enquiriesRef
    .where("phoneNumber", "==", phoneNumber)
    .where("propertyName", "==", propertyName)
    .get();
  return !querySnapshot.empty;
}

async function fetchAndStoreMetaLeads(params = {}, db) {
  const accounts = params.accounts || configAccounts;
  let totalLeadsSaved = 0;
  let totalUsersSaved = 0;

  for (const account of accounts) {
    try {
      console.log(`Fetching leads for account: ${account.adAccountId}`);
      const leadsData = await fetchMetaLeads(
        account.adAccountId,
        account.accessToken,
        params,
      );
      const leads = leadsData.data || [];

      for (const lead of leads) {
        const leadId = lead.id;
        if (!leadId) continue;

        const phoneNumber = extractFieldValue(lead, "phone_number") || extractFieldValue(lead, "phone");
        if (!phoneNumber) continue;

        // 1. Check if user exists
        const userCheck = await checkDuplicateUser(db, phoneNumber);
        let userId = userCheck.userId;

        // 2. Create user if not exists
        if (!userId) {
          userId = await getNextId("canvashomesAdmin/lastUser", "user", db);
          const userData = await transformMetaLeadToUser(lead, userId);
          await db.collection("canvashomesUsersV2").doc(userId).set(userData, { merge: true });
          totalUsersSaved++;
        }

        const formNameData = lead.form_id
          ? await fetchFormName(lead.form_id, account.accessToken)
          : null;
        const formName = formNameData ? formNameData.name : null;

        const rawPropertyName = formName
          ? cleanFormName(formName)
          : extractFieldValue(lead, "property_name");
        const propertyName = normalizePropertyName(rawPropertyName);
        
        // Fetch propertyId
        const propertyId = await getPropertyIdByName(propertyName, db);

        // 3. Check if enquiry exists
        const isDuplicateEnquiry = await checkDuplicateEnquiry(db, phoneNumber, propertyName);
        if (isDuplicateEnquiry) continue;

        // 4. Create new enquiry
        const enquiryId = await getNextId("canvashomesAdmin/lastEnquiry", "enq", db);
        const enquiryData = await transformMetaLeadToEnquiry(lead, userId, enquiryId, propertyName, propertyId);
        await db.collection("canvashomesEnquiriesV2").doc(enquiryId).set(enquiryData, { merge: true });
        totalLeadsSaved++;
      }
    } catch (error) {
      console.error(`Error processing account ${account.adAccountId}:`, error.message);
    }
  }

  return { leadsSaved: totalLeadsSaved, usersSaved: totalUsersSaved };
}

async function transformMetaLeadToUser(metaLead, userId) {
  const timestamp = Math.floor(Date.now() / 1000);
  return {
    userId: userId,
    metaAccountId: metaLead.ad_account_id,
    adId: metaLead.ad_id,
    adName: metaLead.ad_name,
    name: extractFieldValue(metaLead, "full_name") || extractFieldValue(metaLead, "first_name") || "",
    phoneNumber: extractFieldValue(metaLead, "phone_number") || extractFieldValue(metaLead, "phone") || null,
    emailAddress: extractFieldValue(metaLead, "email") || extractFieldValue(metaLead, "email_address") || null,
    campaign: true,
    utmDetails: {
      campaign: metaLead.campaign_name ?? null,
      campaignId: metaLead.campaign_id ?? null,
      adGroup: metaLead.adset_name ?? null,
      adGroupId: metaLead.adset_id ?? null,
      adName: metaLead.ad_name ?? null,
      adId: metaLead.ad_id ?? null,
      id: metaLead.id ?? null,
      created_time: metaLead.created_time ?? null,
      source: metaLead.platform === "ig" ? "instagram" : "facebook",
      medium: "display",
    },
    added: timestamp,
    lastModified: timestamp,
    label: "call",
  };
}

async function transformMetaLeadToEnquiry(metaLead, userId, enquiryId, propertyName, propertyId = null) {
  const timestamp = Math.floor(Date.now() / 1000);
  return {
    enquiryId: enquiryId,
    userId: userId,
    metaAccountId: metaLead.ad_account_id,
    adId: metaLead.ad_id,
    adName: metaLead.ad_name,
    agentId: "",
    agentName: "unknown",
    propertyName: propertyName,
    propertyId: propertyId,
    rootPropertyName: null,
    rootPropertyId: null,
    name: extractFieldValue(metaLead, "full_name") || extractFieldValue(metaLead, "name") || "",
    phoneNumber: extractFieldValue(metaLead, "phone_number") || extractFieldValue(metaLead, "phone") || null,
    label: "call",
    source: metaLead.platform === "ig" ? "instagram" : "facebook",
    leadStatus: null,
    stage: null,
    agentHistory: [
      {
        agentId: "",
        agentName: "unknown",
        timestamp,
        lastStage: null,
      },
    ],
    notes: [],
    activityHistory: [
      {
        activityType: "lead added",
        timestamp,
        agentName: "System",
        data: {},
      },
    ],
    tag: null,
    taskType: null,
    scheduledDate: null,
    rnr: false,
    rnrCount: 0,
    documents: [],
    requirements: [],
    state: "fresh",
    added: timestamp,
    lastModified: timestamp,
    utmDetails: {
      campaign: metaLead.campaign_name ?? null,
      campaignId: metaLead.campaign_id ?? null,
      adGroup: metaLead.adset_name ?? null,
      adGroupId: metaLead.adset_id ?? null,
      adName: metaLead.ad_name ?? null,
      adId: metaLead.ad_id ?? null,
      id: metaLead.id ?? null,
      created_time: metaLead.created_time ?? null,
      source: metaLead.platform === "ig" ? "instagram" : "facebook",
      medium: "display",
    },
    campaign: true,
  };
}

export { fetchAndStoreMetaLeads };
