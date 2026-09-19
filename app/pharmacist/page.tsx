import Link from "next/link";
import { FlagPill } from "@/components/file-bits";
import { ScreenShell } from "@/components/screen-shell";
import { listFiles } from "@/lib/files";

export default async function Page() {
  const files = await listFiles();

  return (
    <ScreenShell code="2A Pharmacist" title="Queue" hint="Poll every 3s when Neon is on. Canned mode shows the demo file.">
      <ul className="mx-auto max-w-xl divide-y divide-line">
        {files.map(f => (
          <li key={f.id}>
            <Link href={`/pharmacist/${f.id}`} className="flex items-center justify-between py-4 hover:underline">
              <span>
                <span className="font-medium">{f.patient.name}</span>
                <span className="mt-1 block text-sm text-ink-muted">{f.place.shop} · {f.status}</span>
              </span>
              <FlagPill flags={f.flags} />
            </Link>
          </li>
        ))}
      </ul>
    </ScreenShell>
  );
}
