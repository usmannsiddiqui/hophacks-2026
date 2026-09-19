import { PhoneFrame, ScreenShell } from "@/components/screen-shell";
import { getFile } from "@/lib/files";

type Ctx = { params: Promise<{ id: string }> };

export default async function Page({ params }: Ctx) {
  const { id } = await params;
  const file = await getFile(id);
  const turns = file?.turns.slice(0, 4) ?? [];

  return (
    <ScreenShell code={`P3 / W0 · ${id}`} title="Live translate" hint="Urdu is hers. English is yours. Never inferred from the voice.">
      <div className="mx-auto max-w-3xl space-y-3">
        {turns.map(t => (
          <article
            key={t.id}
            className={t.heard === "ur"
              ? "ml-8 rounded-2xl bg-surface-sunken p-4"
              : "mr-8 rounded-2xl border border-line p-4"}
          >
            <p className={t.heard === "ur" ? "urdu text-web-ur" : "text-sm"}>{t.spoken}</p>
            <p className={`mt-2 ${t.heard === "ur" ? "text-web-en" : "urdu text-web-ur text-ink-muted"}`}>{t.translated}</p>
          </article>
        ))}
        {!turns.length ? <p className="text-sm text-ink-muted">Turns appear here after live translate is wired.</p> : null}
        <PhoneFrame>
          <button type="button" className="h-16 w-full rounded-lg border border-line">Hold to talk</button>
        </PhoneFrame>
      </div>
    </ScreenShell>
  );
}
