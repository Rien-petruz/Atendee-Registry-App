import { db, smsSettingsTable, attendeesTable, smsCampaignsTable, eq, and, sql } from "@workspace/db";
import { decrypt } from "../lib/crypto.js";

const KUDISMS_BASE = "https://my.kudisms.net/api";

export function normalizeNigerianPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+234")) return digits.slice(1);
  if (digits.startsWith("234") && digits.length === 13) return digits;
  if (digits.startsWith("0") && digits.length === 11) return "234" + digits.slice(1);
  if (digits.length === 10 && /^[789]/.test(digits)) return "234" + digits;
  return null;
}

async function kudiSmsRequest(path: string, params: Record<string, string>): Promise<any> {
  const url = `${KUDISMS_BASE}${path}`;
  const body = new URLSearchParams(params);

  const response: any = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text: string = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`KudiSMS returned non-JSON response: ${text.slice(0, 200)}`);
  }
}

export async function checkKudiSmsBalance(token: string): Promise<{ balance: number; raw: any }> {
  const result = await kudiSmsRequest("/balance", { token });
  if (result?.status === "error") {
    throw new Error(`KudiSMS balance check failed (${result.error_code}): ${result.msg}`);
  }
  const balance = Number(result?.data?.balance ?? result?.balance ?? 0);
  return { balance, raw: result };
}

export interface BulkSmsResult {
  successCount: number;
  failedCount: number;
  total: number;
  errors: { phone: string; reason: string }[];
}

export async function sendBulkSms(
  messageTemplate: string,
  targetGroup: "all" | "newcomers" | "returning",
  filterMonth?: number,
  filterYear?: number,
): Promise<BulkSmsResult> {
  const [settings] = await db.select().from(smsSettingsTable).limit(1);
  if (!settings) throw new Error("SMS provider not configured");

  const token = decrypt(settings.tokenEncrypted);
  const senderID = settings.senderId;

  const conditions: any[] = [];
  if (targetGroup === "newcomers") conditions.push(eq(attendeesTable.isNewcomer, true));
  else if (targetGroup === "returning") conditions.push(eq(attendeesTable.isNewcomer, false));

  if ((filterMonth && filterMonth >= 1 && filterMonth <= 12) || (filterYear && filterYear > 0)) {
    const monthCond = filterMonth && filterMonth >= 1 && filterMonth <= 12 ? sql` AND att.month = ${filterMonth}` : sql``;
    const yearCond = filterYear && filterYear > 0 ? sql` AND att.year = ${filterYear}` : sql``;
    conditions.push(
      sql`EXISTS (SELECT 1 FROM attendances att WHERE att.attendee_id = ${attendeesTable.id}${monthCond}${yearCond})`
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const recipients = await db.select().from(attendeesTable).where(whereClause);

  const errors: { phone: string; reason: string }[] = [];
  let successCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    const phone = normalizeNigerianPhone(recipient.phoneNumber);
    if (!phone) {
      failedCount++;
      errors.push({ phone: recipient.phoneNumber, reason: "Invalid Nigerian phone number" });
      continue;
    }

    const personalized = messageTemplate
      .replace(/\{\{name\}\}/g, recipient.fullName)
      .replace(/\{\{email\}\}/g, recipient.email);

    try {
      const result = await kudiSmsRequest("/sms", {
        token,
        senderID,
        recipients: phone,
        message: personalized,
      });
      if (result?.status === "error") {
        failedCount++;
        errors.push({ phone, reason: `${result.error_code}: ${result.msg}` });
      } else {
        successCount++;
      }
    } catch (err: any) {
      failedCount++;
      errors.push({ phone, reason: err?.message || "Request failed" });
    }
  }

  const total = recipients.length;

  try {
    await db.insert(smsCampaignsTable).values({
      message: messageTemplate,
      targetGroup,
      filterMonth: filterMonth ?? null,
      filterYear: filterYear ?? null,
      successCount,
      failedCount,
      total,
    });
  } catch {}

  return { successCount, failedCount, total, errors };
}
