import type { Flag, MedItem, Question } from "@/lib/types";
import { displayOf } from "@/lib/vocab";

const ROLE: Record<MedItem["role"], string> = {
  requested: "Requested",
  takes: "Takes daily",
  remedy: "Remedy",
  prescribed: "Prescribed",
};

const SOURCE: Record<MedItem["source"], string> = {
  voice: "Voice",
  photo: "Photo",
  document: "Document",
};

export function isArabic(s: string) {
  return /[\u0600-\u06FF]/.test(s);
}

export function FlagPill({ flags, signed }: { flags: Flag[]; signed?: boolean }) {
  if (!flags.length) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm ${signed ? "border border-flag bg-surface text-flag" : "bg-flag text-white"}`}>
      {flags.length} {flags.length === 1 ? "flag" : "flags"}
    </span>
  );
}

export function HerWords({ text }: { text: string | null }) {
  if (!text) return <p className="mt-1 text-sm text-ask">From a document — she did not say this.</p>;
  return (
    <p className={`mt-1 rounded-lg bg-surface-sunken px-3 py-2 ${isArabic(text) ? "urdu text-web-ur" : "text-sm"}`}>
      {text}
    </p>
  );
}

export function MedicineRow({ item }: { item: MedItem }) {
  return (
    <li className="border-b border-line py-3 last:border-0">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-medium">{displayOf(item.term)}</span>
        <span className="text-xs text-ink-muted">{ROLE[item.role]} · {SOURCE[item.source]}</span>
      </div>
      <HerWords text={item.herWords} />
    </li>
  );
}

export function FlagCard({ flag, medList }: { flag: Flag; medList: MedItem[] }) {
  if (!flag.citation) return null;
  const byId = Object.fromEntries(medList.map(m => [m.id, m]));
  return (
    <article className="rounded-2xl border border-flag-line bg-flag-wash p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-flag">{flag.severity}</p>
      <h3 className="mt-1 text-base font-medium">
        {displayOf(byId[flag.a]?.term ?? "?")} + {displayOf(byId[flag.b]?.term ?? "?")}
      </h3>
      <p className="mt-2 text-sm">{flag.reason}</p>
      <p className="mt-2 text-xs text-ink-muted">{flag.citation}</p>
    </article>
  );
}

export function QuestionCard({ q, phone }: { q: Question; phone?: boolean }) {
  return (
    <article className="rounded-2xl border border-ask-line bg-ask-wash p-4">
      <p className={`leading-none text-ask ${phone ? "text-4xl" : "text-2xl"}`} aria-hidden>?</p>
      <p className={`urdu mt-2 ${phone ? "text-phone-ur" : "text-web-ur"}`}>{q.text.urdu}</p>
      <p className={`mt-1 ${phone ? "text-phone-en" : "text-web-en"}`}>{q.text.english}</p>
      <p className="mt-2 text-sm">{q.why}</p>
      {q.answeredIn ? <p className="mt-2 text-xs text-ink-muted">Answered in {q.answeredIn}</p> : null}
    </article>
  );
}
