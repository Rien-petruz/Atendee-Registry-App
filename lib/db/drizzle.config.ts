import { defineConfig } from "drizzle-kit";
import path from "path";

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.STORAGE_POSTGRES_URL ||
  process.env.STORAGE_POSTGRES_PRISMA_URL;

if (!databaseUrl) {
  throw new Error(
    "Database connection string not found. Ensure one of these is set: DATABASE_URL, POSTGRES_URL, STORAGE_POSTGRES_URL, or STORAGE_POSTGRES_PRISMA_URL"
  );
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
