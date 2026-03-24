import { db } from "@workspace/db";
import { adminsTable } from "@workspace/db";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

const NEW_EMAIL = "newwinebelieversnetwork@gmail.com";
const NEW_PASSWORD = "PassW0rd";

async function updateAdmin() {
  const passwordHash = await bcrypt.hash(NEW_PASSWORD, 12);

  const existing = await db.select().from(adminsTable).limit(1);

  if (existing.length > 0) {
    await db
      .update(adminsTable)
      .set({ email: NEW_EMAIL, passwordHash })
      .where(eq(adminsTable.id, existing[0].id));
    console.log(`Admin updated: ${NEW_EMAIL}`);
  } else {
    await db.insert(adminsTable).values({ email: NEW_EMAIL, passwordHash });
    console.log(`Admin created: ${NEW_EMAIL}`);
  }

  process.exit(0);
}

updateAdmin().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
