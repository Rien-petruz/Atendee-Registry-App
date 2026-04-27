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
