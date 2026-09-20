"use client";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { sampleFile, saveDemo } from "@/lib/demo";
import type { PatientFile } from "@/lib/types";
import { Button } from "./primitives";
import { fetchJson } from "./file-provider";

export function Intake() {
  const [mode, setMode] = useState<"sample" | "live">("sample");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = new FormData(event.currentTarget);
    const fixture = sampleFile();
    const file: PatientFile = {
      id: `${mode === "sample" ? "DEMO" : "MW"}-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      patient: {
        name: String(values.get("name")).trim(),
        age: Number(values.get("age")),
        sex: values.get("sex") as "F" | "M" | "Other",
        language: "ur",
      },
      place: fixture.place,
      takenBy: fixture.takenBy,
      request: [],
      recordings: [],
      turns: [],
      history: { urdu: "", english: "" },
      medList: [],
      flags: [],
      questions: [],
      attachments: [],
      status: "recording",
    };
    try {
      if (mode === "sample") saveDemo(file);
      else
        await fetchJson("/api/files", {
          method: "POST",
          body: JSON.stringify(file),
        });
      router.push(`/file/${file.id}/record`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="intake-page">
      <header className="topbar">
        <Link href="/" className="brand">
          Mashwara{" "}
          <span className="brand-urdu urdu" lang="ur">
            مشورہ
          </span>
        </Link>
        <Link className="text-link" href="/visit/new">
          Start a voice visit
        </Link>
        <Link className="text-link" href="/pharmacist/files">
          Pharmacist queue
        </Link>
      </header>
      <main className="intake-layout">
        <section className="intake-story">
          <span className="eyebrow">A pharmacist behind every counter</span>
          <h1>
            Good advice starts
            <br />
            with her story.
          </h1>
          <p className="intro">
            She speaks in Urdu. A volunteer listens. A qualified pharmacist
            brings the expertise.
          </p>
          <div className="story-steps">
            <div>
              <span>01</span>
              <div>
                <h3>Let her talk.</h3>
                <p>
                  Capture the medicines, remedies, and worries in her own words.
                </p>
              </div>
            </div>
            <div>
              <span>02</span>
              <div>
                <h3>Know what to ask.</h3>
                <p>
                  Bring cited interactions and unanswered questions to the
                  surface.
                </p>
              </div>
            </div>
            <div>
              <span>03</span>
              <div>
                <h3>Put a pharmacist in the loop.</h3>
                <p>A reviewed plan, in Urdu, and a report she can take home.</p>
              </div>
            </div>
          </div>
          <div className="giving-note">
            <strong>Free for the person at the counter.</strong>
            <p>Volunteers give their time. Pharmacists give their expertise.</p>
          </div>
        </section>
        <section className="intake-form">
          <div className="row-between">
            <h2>Open a patient file</h2>
            <span className="small muted">Urdu / اردو</span>
          </div>
          <p className="muted">Three details before you hand the phone over.</p>
          <div className="segmented" role="group" aria-label="Walkthrough mode">
            <LiquidButton
              aria-pressed={mode === "sample"}
              onClick={() => {
                setMode("sample");
                setError("");
              }}
            >
              Sample walkthrough
            </LiquidButton>
            <LiquidButton
              aria-pressed={mode === "live"}
              onClick={() => {
                setMode("live");
                setError("");
              }}
            >
              New patient
            </LiquidButton>
          </div>
          <p className="mode-note">
            {mode === "sample"
              ? "Explore a fictional case from first words to signed report. Saved only in this browser."
              : "Live files need configured storage and voice services. Use only fictional data during the hackathon."}
          </p>
          <form key={mode} onSubmit={submit}>
            <label>
              Name
              <input
                name="name"
                autoComplete="off"
                maxLength={120}
                required
                defaultValue={mode === "sample" ? "Nasreen Bibi" : ""}
                placeholder="Patient’s name"
              />
            </label>
            <div className="form-pair">
              <label>
                Age
                <input
                  name="age"
                  type="number"
                  min={0}
                  max={120}
                  required
                  defaultValue={mode === "sample" ? 64 : ""}
                  inputMode="numeric"
                />
              </label>
              <label>
                Sex
                <select name="sex" defaultValue="F">
                  <option value="F">Female</option>
                  <option value="M">Male</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            </div>
            <div className="intake-location">
              <span className="small muted">At the counter</span>
              <strong>{sampleFile().place.shop}</strong>
              <span className="small muted">Gulshan-e-Iqbal, Karachi</span>
            </div>
            {error && (
              <p role="alert" className="error-box">
                {error}
              </p>
            )}
            <Button className="phone-button" disabled={busy} type="submit">
              {busy ? "Opening file…" : "Let her talk"}
            </Button>
            <p className="small muted">
              Start with her uninterrupted account. Follow-up questions come
              afterwards.
            </p>
          </form>
        </section>
      </main>
      <footer className="app-footer">
        <span>Built for the conversations a busy counter can miss.</span>
        <span>Advice, not emergencies.</span>
      </footer>
    </div>
  );
}
