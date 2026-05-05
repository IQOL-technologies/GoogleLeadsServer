import { saveRequestToGCS } from "../utils/storageUtils.js";

/**
 * Middleware to log incoming lead requests to GCS for DLP.
 * @param {string} source - The source identifier ('google', 'meta', etc.)
 */
const logLeadRequest = (source) => {
  return (req, res, next) => {
    // Determine payload based on method
    const payload = req.method === "POST" ? req.body : req.query;

    // Save to GCS asynchronously (don't await to avoid delaying the response)
    if (payload && Object.keys(payload).length > 0) {
      saveRequestToGCS(payload, source).catch((err) => {
        console.error(`DLP Middleware error (${source}):`, err);
      });
    }

    next();
  };
};

export { logLeadRequest };
