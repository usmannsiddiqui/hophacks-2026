import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { PatientFile } from "@/lib/types";

/** One row per PatientFile. The whole file is the JSON; columns exist only for the queue. */
export const files = pgTable("files", {
  id: text("id").primaryKey(),
  status: text("status").notNull(),
  data: jsonb("data").$type<PatientFile>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
