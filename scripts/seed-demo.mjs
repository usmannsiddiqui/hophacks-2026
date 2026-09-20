// Seed the canned demo file into Neon.
//
// Without DATABASE_URL lib/files.ts serves data/files/mw-1042.json directly, so every
// screen renders on a fresh clone. The moment DATABASE_URL is set that fallback stops
// and an empty database means empty screens. This puts the same case into Postgres so
// the demo survives the switch — and so both devices read it from one place.
//
// Idempotent: re-running overwrites the demo row and touches nothing else.

import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* env may come from the real environment instead */
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — nothing to seed (the app runs in canned mode).");
  process.exit(1);
}

const file = JSON.parse(await readFile("data/files/mw-1042.json", "utf8"));
const sql = neon(process.env.DATABASE_URL);

await sql`
  insert into files (id, status, data, updated_at)
  values (${file.id}, ${file.status}, ${JSON.stringify(file)}, now())
  on conflict (id) do update
    set status = excluded.status, data = excluded.data, updated_at = now()
`;

const [{ n }] = await sql`select count(*)::int as n from files`;
console.log(`Seeded ${file.id} (${file.patient.name}, status ${file.status}). Rows in files: ${n}.`);
