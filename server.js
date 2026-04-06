import express from "express";
import admin from "firebase-admin";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import * as transform from "./transform.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: true }));
app.use(express.json());

let db1;
let firebase1Initialized = false;

async function initializeFirebase1() {
  try {
    // ✅ Use default credentials (BEST for App Engine)
    const app1 = admin.initializeApp(
      {
        credential: admin.credential.applicationDefault(),
      },
      "firebase1"
    );

    db1 = admin.firestore(app1);

    // Test connection
    await db1.collection("test").limit(1).get();

    firebase1Initialized = true;
    console.log("✅ Firebase initialized successfully");
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error);
    process.exit(1);
  }
}

// Middleware to ensure Firebase is ready
const checkFirebaseInit = (req, res, next) => {
  if (!firebase1Initialized) {
    return res.status(500).json({
      error: "Firebase not initialized",
    });
  }
  next();
};

app.post("/handleMultipleCampaignData", checkFirebaseInit, async (req, res) => {
  const getUnixDateTime = () => Math.floor(Date.now() / 1000);
  const unixDateTime = getUnixDateTime();

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

    console.log("📥 Received data:", req.body);

    // Validation
    if (!phoneNumber || !name || campaign === undefined || !projectName) {
      return res.status(400).json({
        error:
          "Missing required fields: phoneNumber, name, campaign, projectName",
      });
    }

    if (typeof phoneNumber !== "string" || typeof name !== "string") {
      return res.status(400).json({
        error: "phoneNumber and name must be strings.",
      });
    }

    const newUserDataCampaign1 = [
      {
        phoneNumber,
        name,
        campaign,
        projectId,
        projectName,
        utmDetails,
        currentAgent,
        added: unixDateTime,
      },
    ];

    let transformedLeads;

    try {
      transformedLeads = await transform.transformData(
        newUserDataCampaign1,
        db1
      );
    } catch (error) {
      console.error("❌ Transformation error:", error);
      return res.status(500).json({
        error: "Data transformation failed",
      });
    }

    for (const record of transformedLeads) {
      const { enquiryData, alreadyExists, ...userData } = record;

      console.log("👤 User Data:", userData);
      console.log("📄 Enquiry Data:", enquiryData);
      console.log("🔁 Already Exists:", alreadyExists);

      // Save user if not exists
      if (!alreadyExists) {
        await db1
          .collection("canvashomesUsersV2")
          .doc(userData.userId)
          .set(userData);
      }

      // Always save enquiry
      await db1
        .collection("canvashomesEnquiriesV2")
        .doc(enquiryData.enquiryId)
        .set(enquiryData);
    }

    return res.status(201).json({
      message: "✅ Data saved successfully",
    });
  } catch (error) {
    console.error("❌ Request error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// Health check (IMPORTANT for App Engine)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    firebase: firebase1Initialized ? "Connected" : "Not Connected",
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "🚀 Server running",
    firebase: firebase1Initialized ? "Connected" : "Not Connected",
    endpoints: {
      health: "/health",
      campaign: "/handleMultipleCampaignData",
    },
  });
});

// Start server
async function startServer() {
  await initializeFirebase1();

  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("❌ Server start failed:", error);
  process.exit(1);
});