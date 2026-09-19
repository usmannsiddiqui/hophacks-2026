import Link from "next/link";

const screens: Array<[string, string]> = [
  ["P1 New case", "/file/new"],
  ["P2 Let her talk", "/file/MW-1042/record"],
  ["P3 / W0 Live translate", "/file/MW-1042/translate"],
  ["P4 Ask her this", "/file/MW-1042/ask"],
  ["P5 Advice in Urdu", "/file/MW-1042/advice"],
  ["W1 File", "/file/MW-1042"],
  ["W2 Findings", "/file/MW-1042/findings"],
  ["W3 Import", "/file/MW-1042/import"],
  ["W4 Report", "/file/MW-1042/report"],
  ["2A Queue", "/pharmacist"],
  ["2B/2C File open", "/pharmacist/MW-1042"],
];

export default function Home() {
  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="text-2xl font-medium">Mashwara — screens</h1>
      <p className="mt-1 text-ink-muted">Dev index. Every route below is a placeholder until its stream lands it.</p>
      <ul className="mt-6 divide-y divide-line">
        {screens.map(([label, href]) => (
          <li key={href}><Link className="block py-3 hover:underline" href={href}>{label} <span className="text-ink-muted">{href}</span></Link></li>
        ))}
      </ul>
    </main>
  );
}
