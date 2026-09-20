"use client";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFile } from "./file-provider";
import { AppShell } from "./app-shell";
import { Button, Section } from "./primitives";
import { sampleFile } from "@/lib/demo";
import { cleanCopy } from "@/lib/display";

export function RecordingView() {
  const { file, demo, update, busy } = useFile();
  const router = useRouter();
  const [preview, setPreview] = useState(false);
  async function useSample() {
    const sample = sampleFile();
    try {
      await update({
        recordings: sample.recordings,
        history: {
          urdu: sample.recordings[0].urdu,
          english: sample.recordings[0].english,
        },
        medList: sample.medList,
        request: sample.request,
        questions: sample.questions,
        turns: sample.turns,
        attachments: sample.attachments,
        status: "structured",
      });
      router.push(`/file/${file.id}`);
    } catch {}
  }
  return (
    <AppShell title="Her uninterrupted account" phone>
      <div className="phone-content">
        <span className="eyebrow">{file.patient.name} / Urdu</span>
        <h1>Let her talk.</h1>
        <div className="prompt-panel">
          <p className="urdu phone-urdu" lang="ur" dir="rtl">
            اپنی بات کریں۔ آپ کیا لینے آئی ہیں، کیا دوائیں لیتی ہیں، اور کیا
            تکلیف ہے؟
          </p>
          <p className="muted">
            Tell us what brought you here, what medicines you take, and what is
            troubling you.
          </p>
        </div>
        <p className="urdu phone-urdu" lang="ur" dir="rtl">
          جلدی نہیں ہے۔ اپنی بات مکمل کر لیں۔
        </p>
        <p className="muted">There’s no rush. Let her finish her story.</p>
        {demo ? (
          <div className="rehearsal-panel">
            <strong>Sample account / 3 min 12 sec</strong>
            <p>
              This walkthrough uses Nasreen’s prepared account. It does not turn
              on your microphone.
            </p>
            <LiquidButton
              className="text-link"
              onClick={() => setPreview(!preview)}
              aria-expanded={preview}
            >
              {preview ? "Hide" : "Read"} the sample account
            </LiquidButton>
            {preview && (
              <p className="urdu" lang="ur" dir="rtl">
                {sampleFile().recordings[0].urdu}
              </p>
            )}
            <Button
              disabled={busy || file.status !== "recording"}
              className="phone-button"
              onClick={useSample}
            >
              {busy ? "Building the sample file…" : "Use sample account"}
            </Button>
            {file.status !== "recording" && (
              <Link className="text-link" href={`/file/${file.id}`}>
                Continue to the saved file
              </Link>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <h3>Voice capture is not connected yet.</h3>
            <p>
              The file is saved. Scribe transcription and Gemini structuring are
              the next integration step.
            </p>
            <Link className="button secondary" href="/file/new">
              Try the sample walkthrough
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export function SpeakButton({
  text,
  label = "Play in Urdu",
}: {
  text: string;
  label?: string;
}) {
  const [message, setMessage] = useState("");
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);
  useEffect(
    () => () => {
      audio.current?.pause();
      if (url.current) URL.revokeObjectURL(url.current);
    },
    [],
  );
  async function play() {
    if (playing) {
      audio.current?.pause();
      setPlaying(false);
      return;
    }
    setMessage("");
    setPlaying(true);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: "ur" }),
      });
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("audio")
      )
        throw new Error(
          "Urdu audio is not connected yet. A volunteer can read the words shown here.",
        );
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = URL.createObjectURL(await response.blob());
      audio.current = new Audio(url.current);
      audio.current.onended = () => setPlaying(false);
      await audio.current.play();
    } catch (e) {
      setMessage((e as Error).message);
      setPlaying(false);
    }
  }
  return (
    <div>
      <Button onClick={play} className="phone-button">
        {playing ? "Stop playback" : label}
      </Button>
      {message && (
        <p role="status" className="small muted audio-message">
          {message}
        </p>
      )}
    </div>
  );
}

export function QuestionView({ questionId }: { questionId?: string }) {
  const { file, update, busy } = useFile();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const unanswered = file.questions.filter((q) => !q.answeredIn);
  const initialIndex = Math.max(
    0,
    unanswered.findIndex((q) => q.id === questionId),
  );
  const question =
    unanswered[(initialIndex + index) % Math.max(unanswered.length, 1)];
  async function answer() {
    if (!question) return;
    try {
      await update({
        questions: file.questions.map((q) =>
          q.id === question.id ? { ...q, asked: new Date().toISOString() } : q,
        ),
        ...(file.status === "structured" ? { status: "asking" as const } : {}),
      });
      router.push(`/file/${file.id}/translate?q=${question.id}`);
    } catch {}
  }
  return (
    <AppShell title="Ask her this" phone>
      <div className="phone-content">
        {question && file.status !== "signed" ? (
          <>
            <div className="row-between">
              <span className="eyebrow">One question at a time</span>
              <span className="small muted">{unanswered.length} left</span>
            </div>
            <h1>Ask her this.</h1>
            <div className="question-prompt">
              <span className="question-mark large">?</span>
              <p lang="ur" dir="rtl" className="urdu phone-urdu">
                {question.text.urdu}
              </p>
              <p>{cleanCopy(question.text.english)}</p>
            </div>
            <Section title="Why this matters">
              <p className="muted">{cleanCopy(question.why)}</p>
            </Section>
            <SpeakButton
              text={question.text.urdu}
              label="Ask it out loud in Urdu"
            />
            <Button
              secondary
              disabled={busy}
              onClick={answer}
              className="phone-button"
            >
              Read it to her & capture the answer
            </Button>
            <div className="row-between">
              <LiquidButton className="text-link" onClick={() => setIndex(index + 1)}>
                Skip for now
              </LiquidButton>
              <Link className="text-link" href={`/file/${file.id}/findings`}>
                Back to findings
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1>
              {file.status === "signed"
                ? "The review is closed."
                : "No open questions."}
            </h1>
            <p>Every answer remains with its question in the patient file.</p>
            <Link className="button" href={`/file/${file.id}/findings`}>
              Return to findings
            </Link>
          </>
        )}
      </div>
    </AppShell>
  );
}

export function TranslateView({ questionId }: { questionId?: string }) {
  const { file, demo, update, busy } = useFile();
  const [urdu, setUrdu] = useState("");
  const [english, setEnglish] = useState("");
  const question = file.questions.find(
    (q) => q.id === questionId && !q.answeredIn,
  );
  const router = useRouter();
  const sampleAnswer =
    question?.id === "q2"
      ? {
          urdu: "ناشتے سے پہلے چکر آتا ہے، کھانے کے بعد آرام آ جاتا ہے۔",
          english:
            "The dizziness comes before breakfast and settles after I eat.",
        }
      : question?.id === "q3"
        ? {
            urdu: "صبح ایک گولی لیتی ہوں۔",
            english: "I take one tablet in the morning.",
          }
        : question?.id === "q4"
          ? {
              urdu: "جی، بلڈ پریشر کی گولی بھی لیتی ہوں۔",
              english: "Yes, I also take the blood pressure tablet.",
            }
          : {
              urdu: "لفافہ گھر پر ہے، اُس پر کچھ لکھا نہیں۔",
              english: "The packet is at home. Nothing is written on it.",
            };
  async function save() {
    if (!urdu.trim() || !english.trim()) return;
    const id = `turn_${crypto.randomUUID()}`;
    try {
      await update({
        turns: [
          ...file.turns,
          {
            id,
            by: "patient",
            heard: "ur",
            spoken: urdu.trim(),
            translated: english.trim(),
            at: new Date().toISOString(),
            ...(question ? { answers: question.id } : {}),
          },
        ],
        questions: file.questions.map((q) =>
          q.id === question?.id
            ? {
                ...q,
                answeredIn: id,
                asked: q.asked ?? new Date().toISOString(),
              }
            : q,
        ),
      });
      setUrdu("");
      setEnglish("");
      router.push(`/file/${file.id}/ask`);
    } catch {}
  }
  return (
    <AppShell
      title="Follow-up conversation"
      aside={
        <Section
          title={
            question ? "Question being answered" : "Keep her words together"
          }
        >
          {question ? (
            <>
              <p>{cleanCopy(question.text.english)}</p>
              <p className="urdu" lang="ur" dir="rtl">
                {question.text.urdu}
              </p>
            </>
          ) : (
            <p className="muted">
              Each spoken turn keeps its original language and translation. No
              voice-based speaker guessing.
            </p>
          )}
          <Link className="button secondary" href={`/file/${file.id}/findings`}>
            Back to findings
          </Link>
        </Section>
      }
    >
      <div className="page-heading">
        <span className="eyebrow">Urdu ↔ English</span>
        <h1>A conversation, kept together.</h1>
        <p>Patient words and their translation, side by side.</p>
      </div>
      <div className="conversation">
        {file.turns.map((t) => (
          <article className={`translate-bubble ${t.by}`} key={t.id}>
            <span className="small muted">
              {t.by === "patient" ? file.patient.name : "Counter operator"} /{" "}
              {t.heard === "ur" ? "Urdu" : "English"} heard
            </span>
            <p
              lang={t.heard}
              dir={t.heard === "ur" ? "rtl" : "ltr"}
              className={t.heard === "ur" ? "urdu" : ""}
            >
              {cleanCopy(t.spoken)}
            </p>
            <p
              className={`translation ${t.heard === "en" ? "urdu" : ""}`}
              lang={t.heard === "en" ? "ur" : "en"}
              dir={t.heard === "en" ? "rtl" : "ltr"}
            >
              {cleanCopy(t.translated)}
            </p>
          </article>
        ))}
      </div>
      {file.status !== "signed" && (
        <section className="answer-composer">
          <h2>{question ? "Record her answer" : "Add her next turn"}</h2>
          <p className="small muted">
            Typed fallback: enter the original Urdu and its English translation.
            Automatic interpretation is not connected yet.
          </p>
          {demo && (
            <Button
              secondary
              onClick={() => {
                setUrdu(sampleAnswer.urdu);
                setEnglish(sampleAnswer.english);
              }}
            >
              Fill a sample answer
            </Button>
          )}
          <label>
            Her words in Urdu
            <textarea
              lang="ur"
              dir="rtl"
              className="urdu"
              value={urdu}
              onChange={(e) => setUrdu(e.target.value)}
            />
          </label>
          <label>
            English translation
            <textarea
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
            />
          </label>
          <Button
            disabled={busy || !urdu.trim() || !english.trim()}
            onClick={save}
          >
            {busy ? "Saving answer…" : "Save answer & continue"}
          </Button>
        </section>
      )}
    </AppShell>
  );
}
