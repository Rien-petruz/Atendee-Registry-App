import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const smsSettingsTable = pgTable("sms_settings", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull().default("kudisms"),
  tokenEncrypted: text("token_encrypted").notNull(),
  senderId: text("sender_id").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SmsSettings = typeof smsSettingsTable.$inferSelect;
