import { Router } from "express";
import { db, smtpSettingsTable, smsSettingsTable, eq } from "@workspace/db";
import { requireAuth } from "../middleware/auth.js";
import { encrypt, decrypt } from "../lib/crypto.js";
import { getSmtpTransport } from "../services/emailService.js";
import { checkKudiSmsBalance, sendOneTestSms } from "../services/smsService.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.get("/smtp", requireAuth, async (req: any, res: any) => {
  const [settings] = await db.select().from(smtpSettingsTable).limit(1);

  if (!settings) {
    res.json({
      host: "smtp.gmail.com",
      port: 587,
      username: "",
      encryption: "tls",
      isConfigured: false,
    });
    return;
  }

  res.json({
    host: settings.host,
    port: settings.port,
    username: settings.username,
    encryption: settings.encryption,
    isConfigured: true,
  });
});

router.post("/smtp", requireAuth, async (req: any, res: any) => {
  const { host, port, username, password, encryption } = req.body;

  if (!host || !port || !username || !password || !encryption) {
    res.status(400).json({ error: "Bad Request", message: "All SMTP fields are required" });
    return;
  }

  if (!["tls", "ssl", "none"].includes(encryption)) {
    res.status(400).json({ error: "Bad Request", message: "Encryption must be tls, ssl, or none" });
    return;
  }

  const passwordEncrypted = encrypt(password);

  const [existing] = await db.select().from(smtpSettingsTable).limit(1);

  let settings;
  if (existing) {
    const [updated] = await db
      .update(smtpSettingsTable)
      .set({ host, port, username, passwordEncrypted, encryption, updatedAt: new Date() })
      .where(eq(smtpSettingsTable.id, existing.id))
      .returning();
    settings = updated;
  } else {
    const [inserted] = await db
      .insert(smtpSettingsTable)
      .values({ host, port, username, passwordEncrypted, encryption })
      .returning();
    settings = inserted;
  }

  res.json({
    host: settings.host,
    port: settings.port,
    username: settings.username,
    encryption: settings.encryption,
    isConfigured: true,
  });
});

router.post("/smtp/test", requireAuth, async (req: any, res: any) => {
  try {
    const transport = await getSmtpTransport();
    await transport.verify();
    res.json({ message: "SMTP connection successful" });
  } catch (err: any) {
    logger.error({ err }, "SMTP test failed");
    res.status(400).json({ error: "SMTP Test Failed", message: err?.message || "Could not connect to SMTP server" });
  }
});

router.get("/sms", requireAuth, async (_req: any, res: any) => {
  const [settings] = await db.select().from(smsSettingsTable).limit(1);
  if (!settings) {
    res.json({ provider: "kudisms", senderId: "", isConfigured: false });
    return;
  }
  res.json({
    provider: settings.provider,
    senderId: settings.senderId,
    isConfigured: true,
  });
});

router.post("/sms", requireAuth, async (req: any, res: any) => {
  const { token, senderId } = req.body ?? {};
  if (!token || !senderId) {
    res.status(422).json({ error: "Validation Error", message: "token and senderId are required" });
    return;
  }
  if (typeof senderId !== "string" || senderId.length === 0 || senderId.length > 20) {
    res.status(422).json({ error: "Validation Error", message: "senderId must be 1-20 characters" });
    return;
  }

  const tokenEncrypted = encrypt(token);
  const [existing] = await db.select().from(smsSettingsTable).limit(1);

  let settings;
  if (existing) {
    [settings] = await db
      .update(smsSettingsTable)
      .set({ tokenEncrypted, senderId, updatedAt: new Date() })
      .where(eq(smsSettingsTable.id, existing.id))
      .returning();
  } else {
    [settings] = await db
      .insert(smsSettingsTable)
      .values({ provider: "kudisms", tokenEncrypted, senderId })
      .returning();
  }

  res.json({ provider: settings.provider, senderId: settings.senderId, isConfigured: true });
});

router.post("/sms/send-test", requireAuth, async (req: any, res: any) => {
  const { phone, message, route, senderIdOverride } = req.body ?? {};
  if (!phone || typeof phone !== "string") {
    res.status(422).json({ error: "Validation Error", message: "phone is required" });
    return;
  }
  const testMessage = typeof message === "string" && message.length > 0 ? message : "Test from attendee registry app";
  try {
    const { url, raw, normalizedPhone } = await sendOneTestSms({
      phone,
      message: testMessage,
      route: route === "corporate" ? "corporate" : "standard",
      senderIdOverride: typeof senderIdOverride === "string" && senderIdOverride.length > 0 ? senderIdOverride : undefined,
    });
    res.json({ url, raw, normalizedPhone });
  } catch (err: any) {
    logger.error({ err }, "Test SMS failed");
    res.status(400).json({ error: "Test Failed", message: err?.message || "Could not send test SMS" });
  }
});

router.post("/sms/test", requireAuth, async (_req: any, res: any) => {
  const [settings] = await db.select().from(smsSettingsTable).limit(1);
  if (!settings) {
    res.status(400).json({ error: "Bad Request", message: "SMS provider not configured" });
    return;
  }
  try {
    const token = decrypt(settings.tokenEncrypted);
    const { balance, raw } = await checkKudiSmsBalance(token);
    res.json({ message: "KudiSMS connection successful", balance, raw });
  } catch (err: any) {
    logger.error({ err }, "KudiSMS test failed");
    res.status(400).json({ error: "Test Failed", message: err?.message || "Could not connect to KudiSMS" });
  }
});

export default router;
