import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const attendeesTable = pgTable("attendees", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phoneNumber: text("phone_number").notNull(),
  isNewcomer: boolean("is_newcomer").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAttendeeSchema = createInsertSchema(attendeesTable).omit({ id: true, createdAt: true });
export type InsertAttendee = z.infer<typeof insertAttendeeSchema>;
export type Attendee = typeof attendeesTable.$inferSelect;
