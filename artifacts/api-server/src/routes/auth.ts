import { Router } from "express";
import bcrypt from "bcrypt";
import { db, adminsTable, eq, desc } from "@workspace/db";
import { requireAuth, signToken, type AuthRequest } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.post("/login", async (req: any, res: any) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Bad Request", message: "Email and password are required" });
    return;
  }

  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.email, email)).limit(1);

  if (!admin) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }

  const token = signToken(admin.id, admin.email);

  res.json({
    token,
    admin: {
      id: admin.id,
      email: admin.email,
      createdAt: admin.createdAt,
    },
  });
});

router.post("/logout", (_req: any, res: any) => {
  res.json({ message: "Logged out successfully" });
});

router.get("/me", requireAuth, async (req: AuthRequest, res: any) => {
  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, req.adminId!)).limit(1);

  if (!admin) {
    res.status(401).json({ error: "Unauthorized", message: "Admin not found" });
    return;
  }

  res.json({
    id: admin.id,
    email: admin.email,
    createdAt: admin.createdAt,
  });
});

router.get("/admins", requireAuth, async (_req: AuthRequest, res: any) => {
  const admins = await db
    .select({ id: adminsTable.id, email: adminsTable.email, createdAt: adminsTable.createdAt })
    .from(adminsTable)
    .orderBy(desc(adminsTable.createdAt));
  res.json({ admins });
});

router.post("/admins", requireAuth, async (req: any, res: any) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(422).json({ error: "Validation Error", message: "email and password are required" });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(422).json({ error: "Validation Error", message: "Invalid email format" });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(422).json({ error: "Validation Error", message: "password must be at least 8 characters" });
    return;
  }

  const normalizedEmail = email.toLowerCase();
  const [existing] = await db.select().from(adminsTable).where(eq(adminsTable.email, normalizedEmail)).limit(1);
  if (existing) {
    res.status(409).json({ error: "Conflict", message: "An admin with that email already exists" });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const [created] = await db
      .insert(adminsTable)
      .values({ email: normalizedEmail, passwordHash })
      .returning({ id: adminsTable.id, email: adminsTable.email, createdAt: adminsTable.createdAt });
    res.status(201).json(created);
  } catch (err: any) {
    logger.error({ err }, "Failed to create admin");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to create admin" });
  }
});

router.delete("/admins/:id", requireAuth, async (req: any, res: any) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(422).json({ error: "Validation Error", message: "id must be a positive integer" });
    return;
  }
  if (id === req.adminId) {
    res.status(400).json({ error: "Bad Request", message: "You cannot delete the currently signed-in admin" });
    return;
  }

  const totalRows = await db.select({ id: adminsTable.id }).from(adminsTable);
  if (totalRows.length <= 1) {
    res.status(400).json({ error: "Bad Request", message: "Cannot delete the last remaining admin" });
    return;
  }

  try {
    const deleted = await db
      .delete(adminsTable)
      .where(eq(adminsTable.id, id))
      .returning({ id: adminsTable.id, email: adminsTable.email });
    if (deleted.length === 0) {
      res.status(404).json({ error: "Not Found", message: "Admin not found" });
      return;
    }
    res.json({ deleted: true, admin: deleted[0] });
  } catch (err: any) {
    logger.error({ err, id }, "Failed to delete admin");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to delete admin" });
  }
});

export default router;
