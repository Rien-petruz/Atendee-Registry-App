import { Router } from "express";
import { db, smsCampaignsTable, desc } from "@workspace/db";
import { requireAuth } from "../middleware/auth.js";
import { sendBulkSms } from "../services/smsService.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.post("/send", requireAuth, async (req: any, res: any) => {
  const { message, targetGroup, filterMonth, filterYear } = req.body ?? {};
  if (!message || !targetGroup) {
    res.status(400).json({ error: "Bad Request", message: "message and targetGroup are required" });
    return;
  }
  if (!["all", "newcomers", "returning"].includes(targetGroup)) {
    res.status(400).json({ error: "Bad Request", message: "targetGroup must be all, newcomers, or returning" });
    return;
  }
  if (typeof message !== "string" || message.length === 0 || message.length > 1600) {
    res.status(400).json({ error: "Bad Request", message: "message must be 1-1600 characters" });
    return;
  }

  try {
    const result = await sendBulkSms(message, targetGroup, filterMonth, filterYear);
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
