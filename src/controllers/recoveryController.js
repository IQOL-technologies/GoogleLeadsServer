import { listGCSLogs, readGCSLog } from "../utils/storageUtils.js";
import { processLeads } from "../services/googleLeadsService.js";
import { db } from "../config/firebase.js";
import {env} from "../config/env.js";

/**
 * Controller to manually recover and re-process leads from GCS logs.
 */
const recoverLeads = async (req, res) => {
  const { source, date, secret } = req.body;

  // Security check: Ensure only authorized users can trigger recovery
  const RECOVERY_SECRET = env.RECOVERY_SECRET;
  if (secret !== RECOVERY_SECRET) {
    return res.status(403).json({ error: "Unauthorized: Invalid recovery secret." });
  }

  if (!source || !date) {
    return res.status(400).json({ 
      error: "Missing required fields: source ('google' or 'meta'), date ('YYYY-MM-DD')" 
    });
  }

  try {
    console.log(`Starting recovery for source: ${source}, date: ${date}`);
    const files = await listGCSLogs(source, date);
    
    let resultsSummary = {
      totalFilesFound: files.length,
      successfullyProcessed: 0,
      alreadyExisted: 0,
      errors: 0,
      failedFiles: []
    };

    for (const fileName of files) {
      try {
        const payload = await readGCSLog(fileName);

        // Extract timestamp from fileName (format: logs/source/YYYY-MM-DD/timestamp-uuid.json)
        const fileNameParts = fileName.split("/");
        const lastPart = fileNameParts[fileNameParts.length - 1];
        const timestampMs = parseInt(lastPart.split("-")[0]);
        const forcedTimestamp = !isNaN(timestampMs) ? Math.floor(timestampMs / 1000) : null;
        
        if (source === "google") {
          // Re-trigger the logic for Google Leads
          // The Google payload contains phoneNumber and projectName
          const leads = Array.isArray(payload) ? payload : [payload];
          
          // processLeads already handles duplicate checks internally
          const processedResults = await processLeads(leads, db, forcedTimestamp);

          if (processedResults.length === 0) {
            resultsSummary.alreadyExisted++;
            continue;
          }

          for (const result of processedResults) {
            const { userData, enquiryData } = result;

            // Save user if not exists
            if (!userData.userAlreadyExists) {
              const { userAlreadyExists, ...userToSave } = userData;
              await db.collection("canvashomesUsersV2").doc(userData.userId).set(userToSave);
            }

            // Always save enquiry (since processLeads filtered out duplicates)
            await db.collection("canvashomesEnquiriesV2").doc(enquiryData.enquiryId).set(enquiryData);
          }
          resultsSummary.successfullyProcessed++;
        } else {
          // Placeholder for other sources if needed
          resultsSummary.errors++;
          resultsSummary.failedFiles.push({ fileName, error: "Unsupported source for recovery" });
        }
      } catch (err) {
        console.error(`Error recovering file ${fileName}:`, err);
        resultsSummary.errors++;
        resultsSummary.failedFiles.push({ fileName, error: err.message });
      }
    }

    return res.json({
      message: "Recovery process completed.",
      summary: resultsSummary
    });
  } catch (error) {
    console.error("Critical recovery error:", error);
    return res.status(500).json({ error: "Recovery failed", details: error.message });
  }
};

export { recoverLeads };
