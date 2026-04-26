// Vercel serverless handler for Express app
// Imports the built Express app from the API server
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { db, adminsTable } from '@workspace/db';
import bcrypt from 'bcrypt';
import router from '../artifacts/api-server/src/routes/index.js';
import { logger } from '../artifacts/api-server/src/lib/logger.js';

const app = express();

// Initialize middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root health check
app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'attendee-registry-api' });
});

// API routes
app.use('/api', router);

// Error handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err, method: req.method, path: req.path }, 'API Error');
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
  });
});

// Initialize admin on startup
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'newwinebelieversnetwork@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'PassW0rd';

async function seedAdminIfNeeded() {
  try {
    const existing = await db.select().from(adminsTable).limit(1);
    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await db.insert(adminsTable).values({ email: ADMIN_EMAIL, passwordHash });
      logger.info({ email: ADMIN_EMAIL }, 'Default admin seeded');
    }
  } catch (err) {
    logger.error({ err }, 'Failed to seed admin — continuing anyway');
  }
}

// Seed admin on first request
let adminSeeded = false;
app.use(async (_req, _res, next) => {
  if (!adminSeeded) {
    await seedAdminIfNeeded();
    adminSeeded = true;
  }
  next();
});

export default app;
