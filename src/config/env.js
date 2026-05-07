import dotenv from "dotenv";

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "production",

  CLIENT_ID: process.env.CLIENT_ID || "",
  CLIENT_SECRET: process.env.CLIENT_SECRET || "",
  CUSTOMER_ID: process.env.CUSTOMER_ID || "",
  DEVELOPER_TOKEN: process.env.DEVELOPER_TOKEN || "",

  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || "",
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "",

  META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN || "",
  META_AD_ACCOUNT_ID: process.env.META_AD_ACCOUNT_ID || "",
  META_AD_ACCOUNT_ID2: process.env.META_AD_ACCOUNT_ID2 || "",
  META_APP_ID: process.env.META_APP_ID || "",
  META_APP_SECRET: process.env.META_APP_SECRET || "",

  PRIVATE_KEY:
    process.env.PRIVATE_KEY?.replace(/\\n/g, "\n") || "",

  GCS_LOGS_BUCKET_NAME: process.env.GCS_LOGS_BUCKET_NAME || "",

  RECOVERY_SECRET: process.env.RECOVERY_SECRET || "",

  SMTP_HOST: process.env.SMTP_HOST || "",

  SMTP_PORT: parseInt(process.env.SMTP_PORT || "587", 10),

  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",

  SMTP_SECURE: process.env.SMTP_SECURE === "true",

  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "",

  PORT: parseInt(process.env.PORT || "8080", 10),
};