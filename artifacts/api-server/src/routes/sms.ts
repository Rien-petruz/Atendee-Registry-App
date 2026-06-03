import { Router } from "express";
import { db, smsSettingsTable, smsCampaignsTable, desc } from "@workspace/db";
import { requireAuth } from "../middleware/auth.js";
import { decrypt } from "../lib/crypto.js";
import { sendBulkSms, checkKudiSmsBalance } from "../services/smsService.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.get("/balance", requireAuth, async (_req: any, res: any) => {
  const [settings] = await db.select().from(smsSettingsTable).limit(1);
  if (!settings) {
    res.status(400).json({ error: "Bad Request", message: "SMS provider not configured" });
    return;
  }
  try {
    const token = decrypt(settings.tokenEncrypted);
    const { balance } = await checkKudiSmsBalance(token);
    res.json({ balance });
  } catch (err: any) {
    logger.error({ err }, "Failed to fetch KudiSMS balance");
    res.status(502).json({ error: "Upstream Error", message: err?.message || "Failed to fetch balance" });
  }
});

router.post("/send", requireAuth, async (req: any, res: any) => {
  const { message, targetGroup, filterMonth, filterYear, phones, route } = req.body ?? {};
  if (!message) {
    res.status(400).json({ error: "Bad Request", message: "message is required" });
    return;
  }
  if (typeof message !== "string" || message.length === 0 || message.length > 1600) {
    res.status(400).json({ error: "Bad Request", message: "message must be 1-1600 characters" });
    return;
  }

  const isRetry = Array.isArray(phones) && phones.length > 0;
  if (!isRetry) {
    if (!targetGroup) {
      res.status(400).json({ error: "Bad Request", message: "targetGroup is required when phones are not provided" });
      return;
    }
    if (!["all", "newcomers", "returning"].includes(targetGroup)) {
      res.status(400).json({ error: "Bad Request", message: "targetGroup must be all, newcomers, or returning" });
      return;
    }
  }

  const normalizedRoute = route === "corporate" ? "corporate" : "standard";

  try {
    const result = await sendBulkSms({
      message,
      targetGroup: isRetry ? undefined : targetGroup,
      filterMonth: isRetry ? undefined : filterMonth,
      filterYear: isRetry ? undefined : filterYear,
      phones: isRetry ? phones : undefined,
      route: normalizedRoute,
    });
    res.json({
      ...result,
      message: `SMS sent to ${result.successCount} of ${result.total} recipients`,
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to send bulk SMS");
    if (err?.message?.includes("not configured")) {
      res.status(400).json({ error: "Bad Request", message: "KudiSMS is not configured. Please configure SMS settings first." });
      return;
    }
    res.status(500).json({ error: "Internal Server Error", message: err?.message || "Failed to send SMS" });
  }
});

router.get("/history", requireAuth, async (_req: any, res: any) => {
  const campaigns = await db
    .select()
    .from(smsCampaignsTable)
    .orderBy(desc(smsCampaignsTable.sentAt));
  res.json({ campaigns });
});

export default router;
