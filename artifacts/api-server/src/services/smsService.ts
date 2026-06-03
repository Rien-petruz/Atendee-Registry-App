import { db, smsSettingsTable, attendeesTable, smsCampaignsTable, eq, and, sql } from "@workspace/db";
import { decrypt } from "../lib/crypto.js";
import { logger } from "../lib/logger.js";

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
  const query = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const url = `${KUDISMS_BASE}${path}?${query}`;

  const response: any = await fetch(url, { method: "GET" });

  const text: string = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`KudiSMS returned non-JSON response: ${text.slice(0, 200)}`);
  }
}

function extractBalance(result: any): number {
  const balanceKeyPattern = /(balance|credit|wallet|bal)/i;
  const seen = new WeakSet<object>();

  function walk(node: any): number | null {
    if (node == null) return null;
    if (typeof node === "object") {
      if (seen.has(node)) return null;
      seen.add(node);
      for (const [key, value] of Object.entries(node)) {
        if (balanceKeyPattern.test(key)) {
          const num = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.\-]/g, ""));
          if (Number.isFinite(num) && num !== 0) return num;
        }
        const nested = walk(value);
        if (nested != null) return nested;
      }
      return null;
    }
    return null;
  }

  return walk(result) ?? 0;
}

export async function checkKudiSmsBalance(token: string): Promise<{ balance: number; raw: any }> {
  const result = await kudiSmsRequest("/balance", { token });
  if (result?.status === "error") {
    throw new Error(`KudiSMS balance check failed (${result.error_code}): ${result.msg}`);
  }
  const fromMsg = Number(String(result?.msg ?? "").replace(/[^0-9.\-]/g, ""));
  const balance = Number.isFinite(fromMsg) && fromMsg > 0 ? fromMsg : extractBalance(result);
  return { balance, raw: result };
}

export interface BulkSmsResult {
  successCount: number;
  failedCount: number;
  total: number;
  errors: { phone: string; reason: string }[];
}

function isKudiSmsSuccess(result: any): boolean {
  if (!result) return false;
  const status = String(result.status ?? "").toLowerCase();
  if (status === "ok" || status === "success") return true;
  const code = String(result.error_code ?? "");
  if (code === "000") return true;
  return false;
}

export type KudiSmsRoute = "standard" | "corporate";

export async function sendOneTestSms(opts: { phone: string; message: string; route?: KudiSmsRoute; senderIdOverride?: string }): Promise<{ url: string; raw: any; normalizedPhone: string | null }> {
  const [settings] = await db.select().from(smsSettingsTable).limit(1);
  if (!settings) throw new Error("SMS provider not configured");

  const token = decrypt(settings.tokenEncrypted);
  const senderID = opts.senderIdOverride ?? settings.senderId;
  const normalizedPhone = normalizeNigerianPhone(opts.phone);
  if (!normalizedPhone) return { url: "", raw: { localError: "Invalid Nigerian phone number" }, normalizedPhone: null };

  const params: Record<string, string> = { token, senderID, recipients: normalizedPhone, message: opts.message };
  if (opts.route === "corporate") {
    params.gateway = "corporate";
  }
  const query = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const url = `${KUDISMS_BASE}/sms?${query}`;
  const safeUrl = url.replace(token, "REDACTED");

  const response: any = await fetch(url, { method: "GET" });
  const text: string = await response.text();
  let raw: any;
  try { raw = JSON.parse(text); } catch { raw = { nonJson: text.slice(0, 500) }; }
  return { url: safeUrl, raw, normalizedPhone };
}

interface SendOptions {
  message: string;
  targetGroup?: "all" | "newcomers" | "returning";
  filterMonth?: number;
  filterYear?: number;
  phones?: string[];
  route?: KudiSmsRoute;
}

export async function sendBulkSms(opts: SendOptions): Promise<BulkSmsResult> {
  const [settings] = await db.select().from(smsSettingsTable).limit(1);
  if (!settings) throw new Error("SMS provider not configured");

  const token = decrypt(settings.tokenEncrypted);
  const senderID = settings.senderId;

  let recipientPairs: { phone: string; name: string; email: string }[] = [];

  if (opts.phones && opts.phones.length > 0) {
    recipientPairs = opts.phones.map((p) => ({ phone: p, name: "", email: "" }));
  } else {
    const conditions: any[] = [];
    if (opts.targetGroup === "newcomers") conditions.push(eq(attendeesTable.isNewcomer, true));
    else if (opts.targetGroup === "returning") conditions.push(eq(attendeesTable.isNewcomer, false));

    if ((opts.filterMonth && opts.filterMonth >= 1 && opts.filterMonth <= 12) || (opts.filterYear && opts.filterYear > 0)) {
      const monthCond = opts.filterMonth && opts.filterMonth >= 1 && opts.filterMonth <= 12 ? sql` AND att.month = ${opts.filterMonth}` : sql``;
      const yearCond = opts.filterYear && opts.filterYear > 0 ? sql` AND att.year = ${opts.filterYear}` : sql``;
      conditions.push(
        sql`EXISTS (SELECT 1 FROM attendances att WHERE att.attendee_id = ${attendeesTable.id}${monthCond}${yearCond})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const recipients = await db.select().from(attendeesTable).where(whereClause);
    recipientPairs = recipients.map((r) => ({ phone: r.phoneNumber, name: r.fullName, email: r.email }));
  }

  const errors: { phone: string; reason: string }[] = [];
  let successCount = 0;
  let failedCount = 0;

  for (const recipient of recipientPairs) {
    const phone = normalizeNigerianPhone(recipient.phone);
    if (!phone) {
      failedCount++;
      errors.push({ phone: recipient.phone, reason: "Invalid Nigerian phone number" });
      continue;
    }

    const personalized = opts.message
      .replace(/\{\{name\}\}/g, recipient.name || "")
      .replace(/\{\{email\}\}/g, recipient.email || "");

    try {
      logger.info({ phone, route: opts.route, senderID }, "Sending SMS via KudiSMS");
      const params: Record<string, string> = {
        token,
        senderID,
        recipients: phone,
        message: personalized,
      };
      if (opts.route === "corporate") {
        params.gateway = "corporate";
      }
      const result = await kudiSmsRequest("/sms", params);
      logger.info({ phone, route: opts.route, kudismsStatus: result?.status, kudismsErrorCode: result?.error_code, kudismsMsg: result?.msg }, "KudiSMS send result");
      if (isKudiSmsSuccess(result)) {
        successCount++;
      } else {
        failedCount++;
        const reason = result?.msg
          ? `${result.error_code ?? "?"}: ${result.msg}`
          : `Unrecognized response: ${JSON.stringify(result).slice(0, 200)}`;
        errors.push({ phone, reason });
        logger.warn({ phone, route: opts.route, reason }, "KudiSMS send failed");
      }
    } catch (err: any) {
      failedCount++;
      errors.push({ phone, reason: err?.message || "Request failed" });
      logger.error({ phone, route: opts.route, err }, "KudiSMS request error");
    }
  }

  const total = recipientPairs.length;

  try {
    await db.insert(smsCampaignsTable).values({
      message: opts.message,
      targetGroup: opts.targetGroup ?? "retry",
      filterMonth: opts.filterMonth ?? null,
      filterYear: opts.filterYear ?? null,
      successCount,
      failedCount,
      total,
    });
  } catch {}

  return { successCount, failedCount, total, errors };
}
