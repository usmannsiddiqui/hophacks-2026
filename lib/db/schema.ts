import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { PatientFile } from "@/lib/types";
import type { VisitRecord } from "@/lib/review";

/** One row per PatientFile. The whole file is the JSON; columns exist only for the queue. */
export const files = pgTable("files", {
  id: text("id").primaryKey(),
  status: text("status").notNull(),
  data: jsonb("data").$type<PatientFile>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One row per visit sent to the pharmacist queue. The report and the pharmacist's
 * decision are the JSON; the columns exist only so the queue can be listed and polled
 * without deserialising every report.
 */
export const visits = pgTable("visits", {
  id: text("id").primaryKey(),
  status: text("status").notNull(),
  outcome: text("outcome"),
  data: jsonb("data").$type<VisitRecord>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
