import { Router } from "express";
import { db, attendeesTable, attendancesTable, eq, ilike, or, and, desc, asc, count, sql } from "@workspace/db";
import { requireAuth } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.post("/", async (req: any, res: any) => {
  const { fullName, email, phoneNumber, isNewcomer } = req.body;

  if (!fullName || !email || !phoneNumber) {
    res.status(422).json({ error: "Validation Error", message: "fullName, email, and phoneNumber are required" });
    return;
  }

  if (typeof isNewcomer !== "boolean") {
    res.status(422).json({ error: "Validation Error", message: "isNewcomer must be a boolean" });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(422).json({ error: "Validation Error", message: "Invalid email format" });
    return;
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Find existing attendee or create a new one
    let [attendee] = await db
      .select()
      .from(attendeesTable)
      .where(eq(attendeesTable.email, normalizedEmail))
      .limit(1);

    const isReturning = !!attendee;

    if (!attendee) {
      [attendee] = await db
        .insert(attendeesTable)
        .values({ fullName, email: normalizedEmail, phoneNumber, isNewcomer })
        .returning();
    }

    // Record attendance for the current month — silently ignored if already recorded
    await db
      .insert(attendancesTable)
      .values({ attendeeId: attendee.id, month: currentMonth, year: currentYear })
      .onConflictDoNothing();

    res.status(isReturning ? 200 : 201).json(attendee);
  } catch (err: any) {
    logger.error({ err }, "Failed to register attendee");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to register attendee" });
  }
});

async function upsertAttendeeWithAttendance(input: {
  fullName: string;
  email: string;
  phoneNumber: string;
  isNewcomer: boolean;
  month: number;
  year: number;
}) {
  const normalizedEmail = input.email.toLowerCase();
  const createdAt = new Date(Date.UTC(input.year, input.month - 1, 1));

  let [attendee] = await db
    .select()
    .from(attendeesTable)
    .where(eq(attendeesTable.email, normalizedEmail))
    .limit(1);

  const created = !attendee;

  if (!attendee) {
    [attendee] = await db
      .insert(attendeesTable)
      .values({
        fullName: input.fullName,
        email: normalizedEmail,
        phoneNumber: input.phoneNumber,
        isNewcomer: input.isNewcomer,
        createdAt,
      })
      .returning();
  }

  const [inserted] = await db
    .insert(attendancesTable)
    .values({ attendeeId: attendee.id, month: input.month, year: input.year })
    .onConflictDoNothing()
    .returning();

  return { attendee, created, attendanceAdded: !!inserted };
}

router.post("/admin", requireAuth, async (req: any, res: any) => {
  const { fullName, email, phoneNumber, isNewcomer, month, year } = req.body ?? {};

  if (!fullName || !email || !phoneNumber) {
    res.status(422).json({ error: "Validation Error", message: "fullName, email, and phoneNumber are required" });
    return;
  }
  if (typeof isNewcomer !== "boolean") {
    res.status(422).json({ error: "Validation Error", message: "isNewcomer must be a boolean" });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(422).json({ error: "Validation Error", message: "Invalid email format" });
    return;
  }

  const now = new Date();
  const m = Number.isInteger(month) ? Number(month) : now.getMonth() + 1;
  const y = Number.isInteger(year) ? Number(year) : now.getFullYear();

  if (m < 1 || m > 12) {
    res.status(422).json({ error: "Validation Error", message: "month must be between 1 and 12" });
    return;
  }
  if (y < 2000 || y > 2100) {
    res.status(422).json({ error: "Validation Error", message: "year must be between 2000 and 2100" });
    return;
  }

  try {
    const result = await upsertAttendeeWithAttendance({
      fullName,
      email,
      phoneNumber,
      isNewcomer,
      month: m,
      year: y,
    });
    res.json(result);
  } catch (err: any) {
    logger.error({ err }, "Failed to add attendee (admin)");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to add attendee" });
  }
});

router.post("/import", requireAuth, async (req: any, res: any) => {
  const { rows } = req.body ?? {};
  if (!Array.isArray(rows)) {
    res.status(422).json({ error: "Validation Error", message: "rows must be an array" });
    return;
  }
  if (rows.length === 0) {
    res.status(422).json({ error: "Validation Error", message: "rows is empty" });
    return;
  }
  if (rows.length > 5000) {
    res.status(422).json({ error: "Validation Error", message: "rows exceeds maximum of 5000" });
    return;
  }

  let createdAttendees = 0;
  let attendancesAdded = 0;
  let skipped = 0;
  const errors: { rowNumber: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;
    const fullName = typeof row?.fullName === "string" ? row.fullName.trim() : "";
    const email = typeof row?.email === "string" ? row.email.trim() : "";
    const phoneNumber = typeof row?.phoneNumber === "string" ? row.phoneNumber.trim() : "";
    const isNewcomer = row?.isNewcomer === true || row?.isNewcomer === "true";
    const month = Number(row?.month);
    const year = Number(row?.year);

    if (!fullName || !email || !phoneNumber) {
      skipped++;
      errors.push({ rowNumber, message: "fullName, email, and phoneNumber are required" });
      continue;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      skipped++;
      errors.push({ rowNumber, message: "Invalid email format" });
      continue;
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      skipped++;
      errors.push({ rowNumber, message: "month must be an integer between 1 and 12" });
      continue;
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      skipped++;
      errors.push({ rowNumber, message: "year must be an integer between 2000 and 2100" });
      continue;
    }

    try {
      const result = await upsertAttendeeWithAttendance({
        fullName, email, phoneNumber, isNewcomer, month, year,
      });
      if (result.created) createdAttendees++;
      if (result.attendanceAdded) attendancesAdded++;
    } catch (err: any) {
      skipped++;
      errors.push({ rowNumber, message: err?.message || "Failed to insert row" });
    }
  }

  res.json({
    totalRows: rows.length,
    createdAttendees,
    attendancesAdded,
    skipped,
    errors,
  });
});

router.delete("/:id", requireAuth, async (req: any, res: any) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(422).json({ error: "Validation Error", message: "id must be a positive integer" });
    return;
  }

  try {
    const deleted = await db.delete(attendeesTable).where(eq(attendeesTable.id, id)).returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: "Not Found", message: "Attendee not found" });
      return;
    }
    res.json({ deleted: true, attendee: deleted[0] });
  } catch (err: any) {
    logger.error({ err, id }, "Failed to delete attendee");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to delete attendee" });
  }
});

router.delete("/:id/attendances", requireAuth, async (req: any, res: any) => {
  const id = Number(req.params.id);
  const { month, year } = req.body ?? {};
  const m = Number(month);
  const y = Number(year);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(422).json({ error: "Validation Error", message: "id must be a positive integer" });
    return;
  }
  if (!Number.isInteger(m) || m < 1 || m > 12) {
    res.status(422).json({ error: "Validation Error", message: "month must be 1-12" });
    return;
  }
  if (!Number.isInteger(y) || y < 2000 || y > 2100) {
    res.status(422).json({ error: "Validation Error", message: "year must be 2000-2100" });
    return;
  }

  try {
    const deleted = await db
      .delete(attendancesTable)
      .where(
        and(
          eq(attendancesTable.attendeeId, id),
          eq(attendancesTable.month, m),
          eq(attendancesTable.year, y),
        )
      )
      .returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: "Not Found", message: "No attendance found for that attendee/month/year" });
      return;
    }
    res.json({ deleted: true, attendance: deleted[0] });
  } catch (err: any) {
    logger.error({ err, id, m, y }, "Failed to delete attendance");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to delete attendance" });
  }
});

router.get("/", requireAuth, async (req: any, res: any) => {
  const {
    search = "",
    filter = "all",
    sort = "newest",
    page = "1",
    limit = "20",
    month = "",
    year = "",
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];

  if (search) {
    conditions.push(
      or(
        ilike(attendeesTable.fullName, `%${search}%`),
        ilike(attendeesTable.email, `%${search}%`)
      )
    );
  }

  if (filter === "newcomers") {
    conditions.push(eq(attendeesTable.isNewcomer, true));
  } else if (filter === "returning") {
    conditions.push(eq(attendeesTable.isNewcomer, false));
  }

  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  if (monthNum >= 1 && monthNum <= 12 || yearNum > 0) {
    const monthCond = monthNum >= 1 && monthNum <= 12 ? sql` AND att.month = ${monthNum}` : sql``;
    const yearCond = yearNum > 0 ? sql` AND att.year = ${yearNum}` : sql``;
    conditions.push(
      sql`EXISTS (SELECT 1 FROM attendances att WHERE att.attendee_id = ${attendeesTable.id}${monthCond}${yearCond})`
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const orderBy = sort === "oldest" ? asc(attendeesTable.createdAt) : desc(attendeesTable.createdAt);

  const [attendees, totalResult] = await Promise.all([
    db
      .select()
      .from(attendeesTable)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limitNum)
      .offset(offset),
    db
      .select({ count: count() })
      .from(attendeesTable)
      .where(whereClause),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);
  const totalPages = Math.ceil(total / limitNum);

  res.json({
    attendees,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages,
  });
});

router.get("/export", requireAuth, async (req: any, res: any) => {
  const { filter = "all" } = req.query as Record<string, string>;

  let attendees;
  if (filter === "newcomers") {
    attendees = await db.select().from(attendeesTable).where(eq(attendeesTable.isNewcomer, true)).orderBy(desc(attendeesTable.createdAt));
  } else if (filter === "returning") {
    attendees = await db.select().from(attendeesTable).where(eq(attendeesTable.isNewcomer, false)).orderBy(desc(attendeesTable.createdAt));
  } else {
    attendees = await db.select().from(attendeesTable).orderBy(desc(attendeesTable.createdAt));
  }

  const headers = ["ID", "Full Name", "Email", "Phone", "Is Newcomer", "Date Registered"];
  const rows = attendees.map((a) => [
    a.id,
    `"${a.fullName.replace(/"/g, '""')}"`,
    a.email,
    a.phoneNumber,
    a.isNewcomer ? "Yes" : "No",
    new Date(a.createdAt).toISOString(),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="attendees-${Date.now()}.csv"`);
  res.send(csv);
});

export default router;
