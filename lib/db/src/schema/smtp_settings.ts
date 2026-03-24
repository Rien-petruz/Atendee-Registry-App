import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const smtpSettingsTable = pgTable("smtp_settings", {
  id: serial("id").primaryKey(),
  host: text("host").notNull().default("smtp.gmail.com"),
  port: integer("port").notNull().default(587),
  username: text("username").notNull(),
  passwordEncrypted: text("password_encrypted").notNull(),
  encryption: text("encryption").notNull().default("tls"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSmtpSettingsSchema = createInsertSchema(smtpSettingsTable).omit({ id: true, updatedAt: true });
export type InsertSmtpSettings = z.infer<typeof insertSmtpSettingsSchema>;
export type SmtpSettings = typeof smtpSettingsTable.$inferSelect;
