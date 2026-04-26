import app from "./app.js";
import { logger } from "./lib/logger.js";
import { db, adminsTable } from "@workspace/db";
import bcrypt from "bcrypt";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "newwinebelieversnetwork@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "PassW0rd";

async function seedAdminIfNeeded() {
  try {
    const existing = await db.select().from(adminsTable).limit(1);
    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await db.insert(adminsTable).values({ email: ADMIN_EMAIL, passwordHash });
      logger.info({ email: ADMIN_EMAIL }, "Default admin seeded");
    } else {
      logger.info({ email: existing[0].email }, "Admin already exists, skipping seed");
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed admin — server will still start");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

seedAdminIfNeeded().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
});
