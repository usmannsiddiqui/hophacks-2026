import { PhoneFrame, ScreenShell } from "@/components/screen-shell";
import { getFile } from "@/lib/files";

type Ctx = { params: Promise<{ id: string }> };

export default async function Page({ params }: Ctx) {
  const { id } = await params;
  const file = await getFile(id);
  const advice = file?.advice;

  return (
    <ScreenShell code={`P5 Phone · ${id}`} title="Advice in Urdu" hint="Stop is the only coloured chip. She hears this, she does not tap it.">
      <PhoneFrame>
        {advice ? (
          <>
            <p className="urdu text-phone-ur">{advice.urdu}</p>
            <p className="mt-3 text-phone-en">{advice.english}</p>
          </>
        ) : (
          <>
            <p className="urdu text-phone-ur">دوا بعد میں۔ پہلے فارماسسٹ دیکھیں گے۔</p>
            <p className="mt-3 text-phone-en">Do not take these yet. A pharmacist will look first.</p>
            <p className="mt-6 text-xs text-ink-muted">Scaffold copy until a pharmacist signs.</p>
          </>
        )}
        <button type="button" className="mt-10 h-16 w-full rounded-lg bg-ink text-white">Play</button>
      </PhoneFrame>
    </ScreenShell>
  );
}
