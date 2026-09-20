import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { PatientFile } from "@/lib/types";
import type { VisitRecord } from "@/lib/review";

/**
 * One row per PatientFile. The whole file is the JSON; columns exist only for the queue
 * and for finding a returning patient.
 *
 * `phoneHash` and `assistantId` sit BESIDE the JSON rather than inside it on purpose:
 * PatientFile is a frozen contract (docs/specs/contracts.md) and identity is not part of
 * it. The raw phone number is never stored — only sha256(phone + PATIENT_HASH_PEPPER) —
 * so this column cannot be reversed into a number without the server-side pepper.
 */
export const files = pgTable(
  "files",
  {
    id: text("id").primaryKey(),
    status: text("status").notNull(),
    /** sha256(phone + pepper). Null for cases created without a phone number. */
    phoneHash: text("phone_hash"),
    /** Backboard assistant for this patient — one assistant per patient, one thread per visit. */
    assistantId: text("assistant_id"),
    data: jsonb("data").$type<PatientFile>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("files_phone_hash_idx").on(t.phoneHash)],
);

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
