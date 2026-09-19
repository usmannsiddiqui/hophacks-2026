import Link from "next/link";
import { ScenarioWorkbench } from "@/components/scenario-workbench";

const screens: Array<[string, string, string]> = [
  ["P1 New case", "/file/new", "Phone"],
  ["P2 Let her talk", "/file/MW-1042/record", "Phone"],
  ["P3 / W0 Live translate", "/file/MW-1042/translate", "Phone / web"],
  ["P4 Ask her this", "/file/MW-1042/ask", "Phone"],
  ["P5 Advice in Urdu", "/file/MW-1042/advice", "Phone"],
  ["W1 File", "/file/MW-1042", "Web"],
  ["W2 Findings", "/file/MW-1042/findings", "Web"],
  ["W3 Import", "/file/MW-1042/import", "Web"],
  ["W4 Report", "/file/MW-1042/report", "Web"],
  ["2A Queue", "/pharmacist", "Pharmacist"],
  ["2B/2C File open", "/pharmacist/MW-1042", "Pharmacist"],
];

export default function Home() {
  return (
    <main className="min-h-dvh bg-surface text-ink">
      <header className="border-b border-line bg-surface-raised px-6 py-6">
        <p className="text-xs text-ink-muted">Mashwara · demo</p>
        <h1 className="mt-1 text-3xl font-medium">A real pharmacist behind every counter.</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Paste a mock patient account. Grok structures it; the interaction table draws the bubble map.
          Colour only marks a flag or a question.
        </p>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <ScenarioWorkbench heading="Mock scenario" />
      </div>

      <section className="border-t border-line bg-surface-raised px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-sm font-medium text-ink-muted">The rest of the scaffold</h2>
          <ul className="mt-4 grid gap-px bg-line sm:grid-cols-2">
            {screens.map(([label, href, lane]) => (
              <li key={href} className="bg-surface-raised">
                <Link className="block px-0 py-3 hover:underline sm:px-2" href={href}>
                  {label} <span className="text-ink-muted">{lane}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
