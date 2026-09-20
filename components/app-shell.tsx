"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useFile } from "./file-provider";
import { FlagPill } from "./primitives";

export function AppShell({
  children,
  aside,
  title,
  phone = false,
}: {
  children: ReactNode;
  aside?: ReactNode;
  title: string;
  phone?: boolean;
}) {
  const { file, demo, error } = useFile();
  const path = usePathname();
  const base = `/file/${file.id}`;
  const steps = [
    { label: "Her account", href: base },
    { label: "Findings", href: `${base}/findings` },
    { label: "Follow-up", href: `${base}/ask` },
    { label: "Pharmacist", href: `/pharmacist/${file.id}` },
    { label: "Advice", href: `${base}/advice` },
  ];
  return (
    <div className={phone ? "app phone-page" : "app"}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <Link href="/" className="brand">
          Mashwara
          <span className="brand-urdu urdu" lang="ur">
            مشورہ
          </span>
        </Link>
        <span className="topbar-context">{title}</span>
        <div className="topbar-actions">
          <FlagPill file={file} />
          <Link href="/pharmacist/files" className="text-link">
            Pharmacist queue
          </Link>
        </div>
      </header>
      {demo && (
        <div className="demo-strip">
          Sample walkthrough{" "}
          <span>
            Fictional case saved in this browser. No live consultation.
          </span>
          <Link href="/file/new">New walkthrough</Link>
        </div>
      )}
      <nav className="journey-nav" aria-label="Patient journey">
        {steps.map((s, i) => (
          <Link
            key={s.href}
            href={s.href}
            aria-current={path === s.href ? "page" : undefined}
          >
            <span className="step-index">{i + 1}</span>
            {s.label}
          </Link>
        ))}
      </nav>
      <div className={`workspace ${aside ? "with-aside" : ""}`}>
        <main id="main" className="workspace-main">
          {error && (
            <div role="alert" className="error-box">
              {error}
            </div>
          )}
          {children}
        </main>
        {aside && <aside className="workspace-aside">{aside}</aside>}
      </div>
      <footer className="app-footer">
        <span>
          Free advice, made possible by volunteer time and pharmacist expertise.
        </span>
        <span>Advice, not emergencies.</span>
      </footer>
    </div>
  );
}
