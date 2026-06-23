import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const emailValidationCacheTable = pgTable("email_validation_cache", {
  email: text("email").primaryKey(),
  isValid: boolean("is_valid").notNull(),
  status: text("status").notNull(), // valid, invalid, catch-all, unknown, spamtrap, abuse, do_not_mail
  validatedAt: timestamp("validated_at").defaultNow().notNull(),
});
