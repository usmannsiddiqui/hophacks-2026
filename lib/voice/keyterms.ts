import substances from "@/data/substances.json";

// Keyterms bias STT toward words it would otherwise mishear. Satisfies both vendors:
// Scribe (SDK 2.68): < 50 chars, <= 5 words, none of < > { } [ ] \, 20% surcharge, and
// over 100 terms a 20 s minimum is billed. Grok: max 100 terms, 50 chars each.
const MAX_TERMS = 100;
const BANNED = /[<>{}[\]\\]/;

type Substance = { id: string; display: string; aliases?: string[]; aliases_ur?: string[] };

/** Counter vocabulary that is not a substance but decides what gets recognised. */
const EXTRA = ["حکیم", "سفوف", "hakeem", "shugar", "BP"];

function valid(term: string): boolean {
  const t = term.trim();
  return t.length > 0 && t.length < 50 && t.split(/\s+/).length <= 5 && !BANNED.test(t);
}

/**
 * Terms for every substance that has Urdu aliases, i.e. the ones Stream A has
 * localised for Pakistan. Grows automatically as they add aliases_ur.
 */
export function demoKeyterms(): string[] {
  const list = (substances as { substances: Substance[] }).substances
    .filter(s => s.aliases_ur?.length)
    .flatMap(s => [s.display, ...(s.aliases ?? []), ...(s.aliases_ur ?? [])]);
  return [...new Set([...list, ...EXTRA].map(t => t.trim()))].filter(valid).slice(0, MAX_TERMS);
}
