import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || process.env.STORAGE_SUPABASE_JWT_SECRET || "event-app-jwt-secret-change-in-prod";

export interface AuthRequest extends Request {
  adminId?: number;
  adminEmail?: string;
}

export function requireAuth(req: any, res: any, next: any): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { adminId: number; email: string };
    req.adminId = payload.adminId;
    req.adminEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
  }
}

export function signToken(adminId: number, email: string): string {
  return jwt.sign({ adminId, email }, JWT_SECRET, { expiresIn: "7d" });
}
