import { getNextId } from "../utils/idGenerator.js";
import { normalizePropertyName, getPropertyIdByName } from "../utils/propertyUtils.js";

const DEFAULT_AGENT_NAME = "unknown";
const DEFAULT_AGENT_ID = "unknown";

async function checkDuplicateLead(db, phoneNumber, propertyName) {
  const querySnapshot = await db
    .collection("canvashomesEnquiriesV2")
    .where("phoneNumber", "==", phoneNumber)
    .where("propertyName", "==", propertyName)
    .get();

  // Also check lowercase just in case
  const querySnapshot1 = await db
    .collection("canvashomesEnquiriesV2")
    .where("phoneNumber", "==", phoneNumber)
    .where("propertyName", "==", propertyName.toLowerCase())
    .get();

  return !querySnapshot.empty || !querySnapshot1.empty;
}

async function checkExistingUser(db, phoneNumber) {
  const userQuery = await db
    .collection("canvashomesUsersV2")
    .where("phoneNumber", "==", phoneNumber)
    .limit(1)
    .get();
    
  if (!userQuery.empty) {
    const userDoc = userQuery.docs[0];
    return userDoc.data().userId;
  }
  return null;
}

async function processLeads(leads, db, forcedTimestamp = null) {
  const now = forcedTimestamp || Math.floor(Date.now() / 1000);
  const results = [];

  for (const row of leads) {
    const phone = row.phoneNumber;
    const name = row.name || "";
    const projectName = normalizePropertyName(row.projectName);
    const platform = "google";

    const agentName = row.currentAgent || DEFAULT_AGENT_NAME;
    const agentId = row.currentAgentId || DEFAULT_AGENT_ID;

    const isDuplicate = await checkDuplicateLead(db, phone, projectName);

    if (isDuplicate) {
      console.log(`Duplicate lead found for ${phone} and ${projectName}, skipping.`);
      continue;
    }

    // Handle User
    let userId = await checkExistingUser(db, phone);
    let userAlreadyExists = false;
    
    if (userId) {
      console.log(`User already exists with userId: ${userId}`);
      userAlreadyExists = true;
    } else {
      userId = await getNextId("canvashomesAdmin/lastUser", "user", db);
      console.log(`Generated new userId: ${userId}`);
    }

    // Generate enquiryId
    const enquiryId = await getNextId("canvashomesAdmin/lastEnquiry", "enq", db);
    
    // Fetch propertyId
    const projectId = await getPropertyIdByName(projectName, db);

    const userData = {
      userId: userId,
      phoneNumber: phone,
      name: name,
      campaign: true,
      utmDetails: row.utmDetails,
      added: now,
      lastModified: now,
      label: "call",
      userAlreadyExists
    };

    const enquiryData = {
      enquiryId: enquiryId,
      userId: userId,
      agentId: agentId,
      agentName: agentName ? agentName.toLowerCase() : null,
      propertyName: projectName ? projectName.toLowerCase() : null,
      propertyId: projectId || null,
      rootPropertyName: null,
      rootPropertyId: null,
      rootPropertySource: null,
      name: name.trim(),
      phoneNumber: phone || null,
      label: "call", 
      source: platform,
      leadStatus: null,
      stage: null,
      utmDetails: row.utmDetails,
      agentHistory: [
        {
          agentId: agentId,
          agentName: agentName ? agentName.toLowerCase() : null,
          timestamp: now,
          lastStage: null,
        },
      ],
      notes: [],
      activityHistory: [
        {
          activityType: "lead added",
          timestamp: now,
          agentName: agentName ? agentName.toLowerCase() : null,
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
      added: now,
      lastModified: now,
    };

    results.push({ userData, enquiryData });
  }

  return results;
}

export { processLeads };
