import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const emailCampaignsTable = pgTable("email_campaigns", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  targetGroup: text("target_group").notNull(),
  filterMonth: integer("filter_month"),
  filterYear: integer("filter_year"),
  successCount: integer("success_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  total: integer("total").notNull().default(0),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertEmailCampaignSchema = createInsertSchema(emailCampaignsTable).omit({ id: true, sentAt: true });
export type EmailCampaign = typeof emailCampaignsTable.$inferSelect;
