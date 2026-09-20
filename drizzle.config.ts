import { defineConfig } from "drizzle-kit";

// drizzle-kit does not read .env.local the way next does.
try { process.loadEnvFile(".env.local"); } catch { /* canned mode: no DATABASE_URL */ }

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
