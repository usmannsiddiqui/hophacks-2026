import Link from "next/link";
import { notFound } from "next/navigation";
import { getFile } from "@/lib/files";
import { displayOf } from "@/lib/vocab";

type Ctx = { params: Promise<{ id: string }> };

export default async function Page({ params }: Ctx) {
  const { id } = await params;
  const file = await getFile(id);
  if (!file) notFound();
  const recording = file.recordings.find(r => r.n === 1);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <p className="text-xs text-ink-muted">W1 Web · {file.id} · {file.status}</p>
      <h1 className="mt-1 text-2xl font-medium">{file.patient.name}</h1>
      <p className="text-sm text-ink-muted">
        {file.patient.age}{file.patient.sex} · {file.place.shop}, {file.place.area}, {file.place.city}
      </p>
      <p className="mt-1 text-sm">Came for {file.request.join(", ")}</p>

      {recording ? (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-ink-muted">Recording 1</h2>
          <p className="urdu mt-2 rounded-2xl bg-surface-sunken p-4">{recording.urdu}</p>
          <p className="mt-3 text-sm text-ink-muted">{recording.english}</p>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-sm font-medium text-ink-muted">Medicines</h2>
        <ul className="mt-2 divide-y divide-line">
          {file.medList.map(m => (
            <li key={m.id} className="py-3">
              <p className="font-medium">{displayOf(m.term)}</p>
              {m.herWords ? <p className="urdu text-web-ur">{m.herWords}</p> : <p className="text-sm text-ask">From a document — she did not say this.</p>}
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8">
        <Link href={`/file/${file.id}/findings`} className="inline-flex h-12 items-center rounded-lg bg-ink px-5 text-white">
          Findings
        </Link>
      </p>
    </main>
  );
}
