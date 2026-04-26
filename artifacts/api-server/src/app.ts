import express from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app = express();

// Add request logging in non-production for debugging
if (process.env.NODE_ENV !== "production") {
  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(req: any) {
          return {
            id: req.id,
            method: req.method,
            url: req.url?.split("?")[0],
          };
        },
        res(res: any) {
          return {
            statusCode: res.statusCode,
          };
        },
      },
    }),
  );
} else {
  // In production, only log errors
  app.use((_req: any, _res: any, next: any) => {
    next();
  });
}

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api", router);

// Health check endpoint at root
app.get("/", (_req: any, res: any) => {
  res.json({ status: "ok", service: "attendee-registry-api" });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  logger.error({ err, method: req.method, path: req.path }, "API Error");
  res.status(err.status || 500).json({
    error: err.name || "Internal Server Error",
    message: err.message || "An unexpected error occurred",
  });
});

export default app;
