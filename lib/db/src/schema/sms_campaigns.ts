import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const smsCampaignsTable = pgTable("sms_campaigns", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  targetGroup: text("target_group").notNull(),
  filterMonth: integer("filter_month"),
  filterYear: integer("filter_year"),
  successCount: integer("success_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  total: integer("total").notNull().default(0),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SmsCampaign = typeof smsCampaignsTable.$inferSelect;
