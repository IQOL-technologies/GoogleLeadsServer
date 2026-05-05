import { processLeads } from "../services/googleLeadsService.js";
import { db } from "../config/firebase.js";
import { sendErrorEmail } from "../utils/emailUtils.js";

const handleMultipleCampaignData = async (req, res) => {
  try {
    const {
      phoneNumber,
      name,
      campaign,
      projectId,
      projectName,
      utmDetails,
      currentAgent,
    } = req.body;

    console.log("Received data:", req.body);

    // Validation
    if (!phoneNumber || !name || campaign === undefined || !projectName) {
      return res.status(400).json({
        error: "Missing required fields: phoneNumber, name, campaign, projectName",
      });
    }

    if (typeof phoneNumber !== "string" || typeof name !== "string") {
      return res.status(400).json({
        error: "phoneNumber and name must be strings.",
      });
    }

    const leads = [
      {
        phoneNumber,
        name,
        campaign,
        projectId,
        projectName,
        utmDetails,
        currentAgent,
      },
    ];

    let processedResults;
    try {
      processedResults = await processLeads(leads, db);
    } catch (error) {
      console.error("Processing error:", error);
      
      // Alert Admin via Email
      sendErrorEmail("Lead Processing Failure (Google)", error.message, {
        payload: req.body
      }).catch(e => console.error("Failed to send error email", e));

      return res.status(500).json({
        error: "Data processing failed",
      });
    }

    for (const result of processedResults) {
      const { userData, enquiryData } = result;

      // Save user if not exists
      if (!userData.userAlreadyExists) {
        const { userAlreadyExists, ...userToSave } = userData;
        await db.collection("canvashomesUsersV2").doc(userData.userId).set(userToSave);
      }

      // Always save enquiry
      await db.collection("canvashomesEnquiriesV2").doc(enquiryData.enquiryId).set(enquiryData);
    }

    return res.status(201).json({
      message: "Data saved successfully",
    });
  } catch (error) {
    console.error("Request error:", error);

    // Alert Admin via Email
    sendErrorEmail("Critical Request Error (Google)", error.message, {
      payload: req.body
    }).catch(e => console.error("Failed to send error email", e));

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

export { handleMultipleCampaignData };
