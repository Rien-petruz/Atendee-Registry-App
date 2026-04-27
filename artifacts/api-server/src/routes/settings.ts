import { Router } from "express";
import { db, smtpSettingsTable, eq } from "@workspace/db";
import { requireAuth } from "../middleware/auth.js";
import { encrypt } from "../lib/crypto.js";
import { getSmtpTransport } from "../services/emailService.js";
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

export default router;
