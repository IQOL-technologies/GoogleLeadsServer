import admin from "firebase-admin";

let db;
let firebaseInitialized = false;

async function initializeFirebase() {
  if (firebaseInitialized) return db;

  try {
    // Use default credentials (BEST for App Engine)
    const app = admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
      credential: admin.credential.applicationDefault(),
    });

    db = admin.firestore(app);

    // Test connection
    await db.collection("test").limit(1).get();

    firebaseInitialized = true;
    console.log("Firebase initialized successfully");
    return db;
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    throw error;
  }
}

export { db, initializeFirebase, firebaseInitialized };
