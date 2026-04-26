import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { attendeesTable } from "./attendees";

export const attendancesTable = pgTable(
  "attendances",
  {
    id: serial("id").primaryKey(),
    attendeeId: integer("attendee_id")
      .notNull()
      .references(() => attendeesTable.id, { onDelete: "cascade" }),
    month: integer("month").notNull(),
    year: integer("year").notNull(),
    attendedAt: timestamp("attended_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.attendeeId, t.month, t.year)]
);

export type Attendance = typeof attendancesTable.$inferSelect;
