import express from "express";
import { handleMultipleCampaignData } from "../controllers/googleLeadsController.js";
import { getMetaLeads } from "../controllers/metaLeadsController.js";
import { firebaseInitialized } from "../config/firebase.js";

const router = express.Router();

// Middleware to ensure Firebase is ready
const checkFirebaseInit = (req, res, next) => {
  if (!firebaseInitialized) {
    return res.status(500).json({
      error: "Firebase not initialized",
    });
  }
  next();
};

// Health check
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    firebase: firebaseInitialized ? "Connected" : "Not Connected",
    timestamp: new Date().toISOString(),
  });
});

// Google Leads Route
router.post("/handleMultipleCampaignData", checkFirebaseInit, handleMultipleCampaignData);

// Meta Leads Route
router.get("/meta-leads", checkFirebaseInit, getMetaLeads);

export default router;
