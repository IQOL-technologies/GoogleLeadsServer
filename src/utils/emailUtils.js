import nodemailer from "nodemailer";
import {env} from "../config/env.js";

/**
 * Sends an error notification email.
 * @param {string} subject - The subject line of the email.
 * @param {string} message - The error message or details.
 * @param {Object} context - Optional metadata/context about the error.
 */
async function sendErrorEmail(subject, message, context = {}) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"Lead Service Alerts" <${env.SMTP_USER}>`,
      to: env.ADMIN_EMAIL,
      subject: `[ALERT] ${subject}`,
      text: `
        Error Alert: ${subject}
        Timestamp: ${new Date().toISOString()}
        Message: ${message}

        Context:
        ${JSON.stringify(context, null, 2)}
      `,
      html: `
        <h2 style="color: #d9534f;">Error Alert: ${subject}</h2>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Message:</strong> ${message}</p>
        <h3>Context:</h3>
        <pre style="background: #f4f4f4; padding: 10px; border: 1px solid #ddd;">
${JSON.stringify(context, null, 2)}
        </pre>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email Alert Sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("Critical: Failed to send error email alert:", error);
    return null;
  }
}

export { sendErrorEmail };
