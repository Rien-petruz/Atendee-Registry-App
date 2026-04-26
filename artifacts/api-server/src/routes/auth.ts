import { Router } from "express";
import bcrypt from "bcrypt";
import { db } from "@workspace/db";
import { adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, signToken, type AuthRequest } from "../middleware/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
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

router.post("/logout", (_req, res) => {
  res.json({ message: "Logged out successfully" });
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
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

export default router;
