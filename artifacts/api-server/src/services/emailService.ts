import nodemailer from "nodemailer";
import { db } from "@workspace/db";
import { smtpSettingsTable, attendeesTable, emailCampaignsTable } from "@workspace/db";
import { decrypt } from "../lib/crypto.js";
import { eq, and, sql } from "drizzle-orm";

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
  imageMimeType?: string,
  filterMonth?: number,
  filterYear?: number
): Promise<{ successCount: number; failedCount: number; total: number }> {
  const [smtpSettings] = await db.select().from(smtpSettingsTable).limit(1);
  if (!smtpSettings) throw new Error("SMTP not configured");

  const conditions: any[] = [];

  if (targetGroup === "newcomers") {
    conditions.push(eq(attendeesTable.isNewcomer, true));
  } else if (targetGroup === "returning") {
    conditions.push(eq(attendeesTable.isNewcomer, false));
  }

  if ((filterMonth && filterMonth >= 1 && filterMonth <= 12) || (filterYear && filterYear > 0)) {
    const monthCond = filterMonth && filterMonth >= 1 && filterMonth <= 12 ? sql` AND att.month = ${filterMonth}` : sql``;
    const yearCond = filterYear && filterYear > 0 ? sql` AND att.year = ${filterYear}` : sql``;
    conditions.push(
      sql`EXISTS (SELECT 1 FROM attendances att WHERE att.attendee_id = ${attendeesTable.id}${monthCond}${yearCond})`
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const recipients = await db.select().from(attendeesTable).where(whereClause);

  const transport = await getSmtpTransport();

  let successCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    try {
      const personalizedSubject = replacePlaceholders(subject, recipient.fullName, recipient.email);
      const personalizedMessage = replacePlaceholders(messageTemplate, recipient.fullName, recipient.email);

      const htmlBody = personalizedMessage.replace(/\n/g, "<br>");
      const imageTag = imageBase64 && imageMimeType
        ? `<div style="margin-top:24px;text-align:center;"><img src="cid:emailimage" alt="Email image" style="max-width:100%;border-radius:8px;" /></div>`
        : "";

      await transport.sendMail({
        from: smtpSettings.username,
        to: recipient.email,
        subject: personalizedSubject,
        html: htmlBody + imageTag,
        text: personalizedMessage,
        attachments: imageBase64 && imageMimeType
          ? [{
              filename: "image",
              content: Buffer.from(imageBase64, "base64"),
              contentType: imageMimeType,
              cid: "emailimage",
            }]
          : [],
      });

      successCount++;
    } catch {
      failedCount++;
    }
  }

  const result = { successCount, failedCount, total: recipients.length };

  try {
    await db.insert(emailCampaignsTable).values({
      subject,
      targetGroup,
      filterMonth: filterMonth ?? null,
      filterYear: filterYear ?? null,
      successCount: result.successCount,
      failedCount: result.failedCount,
      total: result.total,
    });
  } catch {
  }

  return result;
}
