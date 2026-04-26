import { Router } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db, sql } from "@workspace/db";

const router = Router();

router.get("/healthz", async (_req: any, res: any) => {
  try {
    // Test DB connection
    await db.execute(sql`SELECT 1`);
    
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
  } catch (err: any) {
    console.error("Health check failed:", err);
    res.status(503).json({ status: "error", message: "Database connection failed", details: err.message });
  }
});

export default router;
