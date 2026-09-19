import { ScreenShell } from "@/components/screen-shell";
import { getFile } from "@/lib/files";

type Ctx = { params: Promise<{ id: string }> };

export default async function Page({ params }: Ctx) {
  const { id } = await params;
  const file = await getFile(id);
  const attachment = file?.attachments[0];

  return (
    <ScreenShell code={`W3 Web · ${id}`} title="Bringing in an old file" hint="A document never overwrites her voice. Disagreement raises a question.">
      <div className="max-w-xl rounded-3xl border border-dashed border-line bg-surface-raised p-8">
        <p className="text-sm">Drop a prescription, report or strip photo.</p>
        {attachment ? (
          <p className="mt-4 text-sm text-ink-muted">
            On the canned file: {attachment.label}
            {attachment.extracted.length ? ` · ${attachment.extracted.length} extracted` : ""}
          </p>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">Gemini vision is Stream A, after the voice path is green.</p>
        )}
      </div>
    </ScreenShell>
  );
}
