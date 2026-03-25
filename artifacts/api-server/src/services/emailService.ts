import nodemailer from "nodemailer";
import { db } from "@workspace/db";
import { smtpSettingsTable, attendeesTable } from "@workspace/db";
import { decrypt } from "../lib/crypto.js";
import { eq, ilike, or } from "drizzle-orm";

export async function getSmtpTransport() {
  const [settings] = await db.select().from(smtpSettingsTable).limit(1);

  if (!settings) {
    throw new Error("SMTP settings not configured");
  }

  const password = decrypt(settings.passwordEncrypted);

  const secure = settings.encryption === "ssl";
  const port = settings.port;

  return nodemailer.createTransport({
    host: settings.host,
    port,
    secure,
    auth: {
      user: settings.username,
      pass: password,
    },
    tls: settings.encryption === "tls" ? { rejectUnauthorized: false } : undefined,
  });
}

function replacePlaceholders(template: string, name: string, email: string): string {
  return template.replace(/\{\{name\}\}/g, name).replace(/\{\{email\}\}/g, email);
}

export async function sendBulkEmail(
  subject: string,
  messageTemplate: string,
  targetGroup: "all" | "newcomers" | "returning",
  imageBase64?: string,
  imageMimeType?: string
): Promise<{ successCount: number; failedCount: number; total: number }> {
  const [smtpSettings] = await db.select().from(smtpSettingsTable).limit(1);
  if (!smtpSettings) throw new Error("SMTP not configured");

  let query = db.select().from(attendeesTable);

  let recipients;
  if (targetGroup === "newcomers") {
    recipients = await db.select().from(attendeesTable).where(eq(attendeesTable.isNewcomer, true));
  } else if (targetGroup === "returning") {
    recipients = await db.select().from(attendeesTable).where(eq(attendeesTable.isNewcomer, false));
  } else {
    recipients = await db.select().from(attendeesTable);
  }

  const transport = await getSmtpTransport();

  let successCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    try {
      const personalizedSubject = replacePlaceholders(subject, recipient.fullName, recipient.email);
      const personalizedMessage = replacePlaceholders(messageTemplate, recipient.fullName, recipient.email);

      const htmlBody = personalizedMessage.replace(/\n/g, "<br>");
      const imageTag = imageBase64 && imageMimeType
        ? `<div style="margin-top:24px;text-align:center;"><img src="data:${imageMimeType};base64,${imageBase64}" alt="Email image" style="max-width:100%;border-radius:8px;" /></div>`
        : "";

      await transport.sendMail({
        from: smtpSettings.username,
        to: recipient.email,
        subject: personalizedSubject,
        html: htmlBody + imageTag,
        text: personalizedMessage,
      });

      successCount++;
    } catch {
      failedCount++;
    }
  }

  return { successCount, failedCount, total: recipients.length };
}
