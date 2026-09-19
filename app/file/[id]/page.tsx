import Link from "next/link";
import { notFound } from "next/navigation";
import { MedicineRow } from "@/components/file-bits";
import { ScreenShell } from "@/components/screen-shell";
import { getFile } from "@/lib/files";

type Ctx = { params: Promise<{ id: string }> };

export default async function Page({ params }: Ctx) {
  const { id } = await params;
  const file = await getFile(id);
  if (!file) notFound();
  const recording = file.recordings.find(r => r.n === 1);

  return (
    <ScreenShell
      code={`W1 Web · ${file.id} · ${file.status}`}
      title={file.patient.name}
      hint={`${file.patient.age}${file.patient.sex} · ${file.place.shop}, ${file.place.area}, ${file.place.city}`}
    >
      <p className="text-sm">Came for {file.request.join(", ")}</p>
      {recording ? (
        <section className="mt-8 max-w-3xl">
          <h2 className="text-sm font-medium text-ink-muted">Recording 1</h2>
          <p className="urdu mt-2 rounded-2xl bg-surface-sunken p-4">{recording.urdu}</p>
          <p className="mt-3 text-sm text-ink-muted">{recording.english}</p>
        </section>
      ) : null}
      <section className="mt-8 max-w-3xl">
        <h2 className="text-sm font-medium text-ink-muted">Medicines</h2>
        <ul className="mt-2">
          {file.medList.map(m => <MedicineRow key={m.id} item={m} />)}
        </ul>
      </section>
      <p className="mt-8">
        <Link href={`/file/${file.id}/findings`} className="inline-flex h-12 items-center rounded-lg bg-ink px-5 text-white">
          Findings
        </Link>
      </p>
    </ScreenShell>
  );
}
