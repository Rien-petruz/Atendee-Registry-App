import { db } from "@workspace/db";
import { adminsTable } from "@workspace/db";
import bcrypt from "bcrypt";

const DEFAULT_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

async function seedAdmin() {
  const existing = await db.select().from(adminsTable).limit(1);
  if (existing.length > 0) {
    console.log(`Admin already exists: ${existing[0].email}`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  const [admin] = await db
    .insert(adminsTable)
    .values({ email: DEFAULT_EMAIL, passwordHash })
    .returning();

  console.log(`Admin created: ${admin.email} / password: ${DEFAULT_PASSWORD}`);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("Failed to seed admin:", err);
  process.exit(1);
});
