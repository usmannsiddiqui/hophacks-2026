import { PhoneFrame, ScreenShell } from "@/components/screen-shell";

export default function Page() {
  return (
    <ScreenShell code="P1 Phone" title="New case" hint="Three fields. She never touches the screen.">
      <PhoneFrame>
        <label className="text-xs text-ink-muted" htmlFor="name">Name</label>
        <input id="name" defaultValue="Nasreen Bibi" className="mt-1 h-12 w-full rounded-lg border border-line bg-surface px-3" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-ink-muted" htmlFor="age">Age</label>
            <input id="age" defaultValue="64" className="mt-1 h-12 w-full rounded-lg border border-line bg-surface px-3" />
          </div>
          <div>
            <label className="text-xs text-ink-muted" htmlFor="sex">Sex</label>
            <input id="sex" defaultValue="F" className="mt-1 h-12 w-full rounded-lg border border-line bg-surface px-3" />
          </div>
        </div>
        <p className="urdu mt-6 text-phone-ur">اپنی بات کریں۔</p>
        <button type="button" className="mt-8 h-16 w-full rounded-lg bg-ink text-white">Start recording</button>
        <p className="mt-3 text-xs text-ink-muted">Mic and Scribe land with Stream B. This is the frame.</p>
      </PhoneFrame>
    </ScreenShell>
  );
}
