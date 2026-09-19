import { PhoneFrame, ScreenShell } from "@/components/screen-shell";
import { getFile } from "@/lib/files";

type Ctx = { params: Promise<{ id: string }> };

export default async function Page({ params }: Ctx) {
  const { id } = await params;
  const file = await getFile(id);
  const rec = file?.recordings[0];

  return (
    <ScreenShell code={`P2 Phone · ${id}`} title="Let her talk" hint={file ? file.patient.name : "No file"}>
      <PhoneFrame>
        <p className="text-sm text-ink-muted">Ink-dot level. Never a waveform. Big Done.</p>
        <div className="mt-8 flex justify-center">
          <span className="h-3 w-3 rounded-full bg-ink" aria-hidden />
        </div>
        <p className="urdu mt-8 text-phone-ur">اپنی بات کریں۔</p>
        {rec ? <p className="mt-4 text-phone-en">{rec.english}</p> : null}
        <button type="button" className="mt-10 h-16 w-full rounded-lg bg-ink text-white">Done</button>
      </PhoneFrame>
    </ScreenShell>
  );
}
