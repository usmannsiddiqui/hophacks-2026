import { BubbleMap } from "@/components/bubble-map";
import { FlagCard, FlagPill, MedicineRow } from "@/components/file-bits";
import { ResultPanes } from "@/components/result-panes";
import { ScreenShell } from "@/components/screen-shell";
import { getFile } from "@/lib/files";
import { notFound } from "next/navigation";

type Ctx = { params: Promise<{ id: string }> };

export default async function Page({ params }: Ctx) {
  const { id } = await params;
  const file = await getFile(id);
  if (!file) notFound();

  return (
    <ScreenShell
      code={`2B / 2C Pharmacist · ${file.id} · ${file.status}`}
      title={file.patient.name}
      hint="Advice draft and verdicts wait on Stream C. The map is already derived from the file."
    >
      <div className="flex flex-wrap items-center gap-3">
        <FlagPill flags={file.flags} signed={file.status === "signed"} />
        <p className="text-sm text-ink-muted">{file.place.shop}, {file.place.city}</p>
      </div>
      <div className="mt-8">
        <ResultPanes
          detail={
            <div>
              <div className="space-y-3">
                {file.flags.map(f => <FlagCard key={f.id} flag={f} medList={file.medList} />)}
              </div>
              <ul className="mt-8 max-w-xl">
                {file.medList.map(m => <MedicineRow key={m.id} item={m} />)}
              </ul>
              <form className="mt-10 max-w-xl space-y-4">
                <label className="block text-xs text-ink-muted" htmlFor="impression">Impression</label>
                <textarea id="impression" rows={3} className="w-full rounded-2xl border border-line bg-surface p-3 text-sm" placeholder="One line. On the report only." />
                <button type="button" className="h-12 rounded-lg bg-ink px-5 text-white">Sign (scaffold)</button>
              </form>
            </div>
          }
          map={
            <div className="min-h-[min(72vh,620px)] rounded-3xl border border-line bg-surface-raised p-4">
              <BubbleMap medList={file.medList} flags={file.flags} />
            </div>
          }
        />
      </div>
    </ScreenShell>
  );
}
