import { FlagCard, MedicineRow } from "@/components/file-bits";
import { ScreenShell } from "@/components/screen-shell";
import { getFile } from "@/lib/files";

type Ctx = { params: Promise<{ id: string }> };

export default async function Page({ params }: Ctx) {
  const { id } = await params;
  const file = await getFile(id);
  if (!file) {
    return (
      <ScreenShell code="W4 Report" title="Pharmacy consult record">
        <p className="text-sm text-ink-muted">No file.</p>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell code={`W4 Report · ${file.id}`} title="Pharmacy consult record" hint="Limitations are always present.">
      <article className="mx-auto max-w-2xl space-y-8">
        <section>
          <h2 className="text-[13px] text-ink-muted">Presenting request</h2>
          <p className="mt-1">{file.request.join(", ")}</p>
        </section>
        <section>
          <h2 className="text-[13px] text-ink-muted">History</h2>
          <p className="urdu mt-1">{file.history.urdu}</p>
          <p className="mt-2 text-sm text-ink-muted">{file.history.english}</p>
        </section>
        <section>
          <h2 className="text-[13px] text-ink-muted">Medicines</h2>
          <ul>{file.medList.map(m => <MedicineRow key={m.id} item={m} />)}</ul>
        </section>
        <section className="space-y-3">
          <h2 className="text-[13px] text-ink-muted">Interactions</h2>
          {file.flags.map(f => <FlagCard key={f.id} flag={f} medList={file.medList} />)}
        </section>
        <section>
          <h2 className="text-[13px] text-ink-muted">Limitations</h2>
          <p className="mt-1 text-sm">
            Flags only come from cited rows in the interaction table. Unidentified items are questions, not claims.
            This consult is not a diagnosis.
          </p>
        </section>
      </article>
    </ScreenShell>
  );
}
