import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/** Lazy so the app builds and runs in canned mode with no DATABASE_URL. */
export function getDb() {
  if (!_db) _db = drizzle(neon(process.env.DATABASE_URL!), { schema });
  return _db;
}
