import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";
import { sendErrorEmail } from "./emailUtils.js";

const storage = new Storage();
// Fallback bucket name for convenience, but should be set in env
const BUCKET_NAME = process.env.GCS_LOGS_BUCKET_NAME || "google-leads-dlp-logs";

/**
 * Saves a payload (JSON) to Google Cloud Storage for DLP.
 * @param {Object} payload - The data to save.
 * @param {string} source - The source of the data (e.g., 'google', 'meta').
 * @returns {Promise<string|null>} The filename if successful, null otherwise.
 */
async function saveRequestToGCS(payload, source = "unknown") {
  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const date = new Date();

    // IST date (YYYY-MM-DD)
    const datePath = date.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    const timestamp = date.getTime();
    const fileName = `logs/${source}/${datePath}/${timestamp}-${uuidv4()}.json`;
    
    const file = bucket.file(fileName);
    await file.save(JSON.stringify(payload, null, 2), {
      contentType: "application/json",
      resumable: false,
    });
    
    console.log(`DLP: Payload saved to GCS: ${fileName}`);
    return fileName;
  } catch (error) {
    console.error("DLP Error: Failed to save to GCS:", error);
    
    // Alert Admin via Email
    sendErrorEmail("DLP Failure: GCS Save Failed", error.message, {
      source,
      bucket: BUCKET_NAME,
      payloadPreview: JSON.stringify(payload).substring(0, 500)
    }).catch(e => console.error("Double failure: GCS and Email failed", e));

    return null;
  }
}

/**
 * Lists files in GCS for a specific date and source.
 * @param {string} source - 'google' or 'meta'.
 * @param {string} date - 'YYYY-MM-DD'.
 * @returns {Promise<string[]>} List of filenames.
 */
async function listGCSLogs(source, date) {
  const bucket = storage.bucket(BUCKET_NAME);
  const prefix = `logs/${source}/${date}/`;
  const [files] = await bucket.getFiles({ prefix });
  return files.map(file => file.name);
}

/**
 * Reads a file from GCS.
 * @param {string} fileName - The full path in the bucket.
 * @returns {Promise<Object>} The JSON content.
 */
async function readGCSLog(fileName) {
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(fileName);
  const [content] = await file.download();
  return JSON.parse(content.toString());
}

export { saveRequestToGCS, listGCSLogs, readGCSLog };