import { QuestionCard } from "@/components/file-bits";
import { PhoneFrame, ScreenShell } from "@/components/screen-shell";
import { getFile } from "@/lib/files";

type Ctx = { params: Promise<{ id: string }> };

export default async function Page({ params }: Ctx) {
  const { id } = await params;
  const file = await getFile(id);
  const open = file?.questions.find(q => !q.answeredIn) ?? file?.questions[0];

  return (
    <ScreenShell code={`P4 Phone · ${id}`} title="Ask her this" hint="One open question. Tap to have it spoken in Urdu.">
      <PhoneFrame>
        {open ? <QuestionCard q={open} phone /> : <p className="text-sm text-ink-muted">No open question.</p>}
        <button type="button" className="mt-8 h-16 w-full rounded-lg bg-ink text-white">Play in Urdu</button>
      </PhoneFrame>
    </ScreenShell>
  );
}
