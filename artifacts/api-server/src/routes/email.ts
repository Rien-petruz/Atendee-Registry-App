import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth.js";
import { sendBulkEmail } from "../services/emailService.js";

const router: IRouter = Router();

router.post("/send", requireAuth, async (req, res) => {
  const { subject, message, targetGroup, imageBase64, imageMimeType } = req.body;

  if (!subject || !message || !targetGroup) {
    res.status(400).json({ error: "Bad Request", message: "subject, message, and targetGroup are required" });
    return;
  }

  if (!["all", "newcomers", "returning"].includes(targetGroup)) {
    res.status(400).json({ error: "Bad Request", message: "targetGroup must be all, newcomers, or returning" });
    return;
  }

  try {
    const result = await sendBulkEmail(subject, message, targetGroup, imageBase64, imageMimeType);
    res.json({
      ...result,
      message: `Email sent to ${result.successCount} of ${result.total} recipients`,
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to send bulk email");
    if (err?.message?.includes("SMTP not configured") || err?.message?.includes("SMTP settings not configured")) {
      res.status(400).json({ error: "Bad Request", message: "SMTP is not configured. Please configure SMTP settings first." });
      return;
    }
    res.status(500).json({ error: "Internal Server Error", message: err?.message || "Failed to send emails" });
  }
});

export default router;
