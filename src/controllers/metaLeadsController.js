import { fetchAndStoreMetaLeads } from "../services/metaLeadsService.js";
import { db } from "../config/firebase.js";
import { sendErrorEmail } from "../utils/emailUtils.js";

const getMetaLeads = async (req, res) => {
  try {
    const params = req.query || {};
    const result = await fetchAndStoreMetaLeads(params, db);
    return res.status(200).json({
      message: "Successfully retrieved and stored Meta leads",
      data: result,
    });
  } catch (error) {
    console.error("Error getting Meta leads:", error);

    // Alert Admin via Email
    sendErrorEmail("Meta Lead Retrieval Failure", error.message, {
      query: req.query
    }).catch(e => console.error("Failed to send error email", e));

    return res.status(500).json({
      message: "Failed to retrieve Meta leads",
      error: error.message,
    });
  }
};

export { getMetaLeads };
