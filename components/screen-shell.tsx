import type { ReactNode } from "react";
import Link from "next/link";

export function ScreenShell({
  code,
  title,
  hint,
  children,
}: {
  code: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-surface text-ink">
      <header className="border-b border-line bg-surface-raised px-6 py-4">
        <p className="text-xs text-ink-muted">{code}</p>
        <h1 className="mt-1 text-2xl font-medium">{title}</h1>
        {hint ? <p className="mt-1 text-sm text-ink-muted">{hint}</p> : null}
        <nav className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link className="underline" href="/">Demo</Link>
          <Link className="underline" href="/file/new">New case</Link>
          <Link className="underline" href="/file/MW-1042">File</Link>
          <Link className="underline" href="/file/MW-1042/findings">Findings</Link>
          <Link className="underline" href="/pharmacist">Queue</Link>
        </nav>
      </header>
      <div className="px-6 py-6">{children}</div>
    </main>
  );
}

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[390px] rounded-[24px] border border-line bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      {children}
    </div>
  );
}
