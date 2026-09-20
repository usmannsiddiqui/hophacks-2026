"use client";

import { useEffect, useRef, useState } from "react";
import { audioUploadFilename } from "@/lib/audio";
import { startCapture, type CaptureSession } from "@/lib/audio-capture";
import {
  addFollowUp,
  answeredFollowUps,
  editFollowUp,
  removeFollowUp,
  type FollowUp,
  type VisitDraft,
} from "@/lib/visit-draft";
import type { ReportQuestion } from "@/lib/visit-report";
import type { XaiTranscript } from "@/lib/voice/xai";

type Phase = "idle" | "permission" | "recording" | "transcribing";

// Follow-up answers are transcribed by Grok STT and rewritten into Urdu script.
// Scribe remains the source of the first recording (ADR 0008); this is dialogue
// added afterwards, one question at a time (ADR 0007).
const ANSWER_TRANSCRIBE_URL = "/api/transcribe/xai?lang=ur";

async function transcribeAnswer(blob: Blob, signal: AbortSignal): Promise<string> {
  const form = new FormData();
  const type = blob.type.split(";")[0];
  form.set("audio", new File([blob], audioUploadFilename(type), { type: blob.type }));
  const response = await fetch(ANSWER_TRANSCRIBE_URL, { method: "POST", body: form, signal });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "xAI could not transcribe the answer. Retry when ready.");
  return (result as XaiTranscript).text;
}

export function FollowUpQuestions({
  draft,
  disabled = false,
  onChange,
  onUpdateReport,
}: {
  draft: VisitDraft;
  disabled?: boolean;
  onChange: (next: VisitDraft) => void;
  onUpdateReport: () => void;
}) {
  const questions: ReportQuestion[] = draft.report?.questions ?? [];
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [recordingFor, setRecordingFor] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [playback, setPlayback] = useState<{ url: string; n: number } | null>(null);
  const capture = useRef<CaptureSession | null>(null);
  const microphone = useRef<AbortController | null>(null);
  const upload = useRef<AbortController | null>(null);
  const spoken = useRef(new Map<string, string>());
  const player = useRef<HTMLAudioElement | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const urls = spoken.current;
    return () => {
      mounted.current = false;
      microphone.current?.abort();
      upload.current?.abort();
      for (const url of urls.values()) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  useEffect(() => {
    if (phase !== "recording") return;
    const timer = setInterval(() => setSeconds(capture.current?.seconds() ?? 0), 250);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (!playback || !player.current) return;
    player.current.load();
    void player.current.play().catch(() => {});
  }, [playback]);

  const busy = disabled || speaking !== null || phase !== "idle";
  const answered = answeredFollowUps(draft);
  const orphaned = draft.followUps.filter(
    (item) => !questions.some((question) => question.id === item.questionId),
  );

  async function ask(question: ReportQuestion) {
    if (busy) return;
    const cached = spoken.current.get(question.id);
    if (cached) {
      setPlayback((previous) => ({ url: cached, n: (previous?.n ?? 0) + 1 }));
      return;
    }
    setSpeaking(question.id);
    setError("");
    const controller = new AbortController();
    upload.current = controller;
    try {
      const response = await fetch("/api/tts/xai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: question.text.urdu, language: "ur" }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "xAI speech failed. Retry when ready.");
      }
      const url = URL.createObjectURL(await response.blob());
      if (!mounted.current) {
        URL.revokeObjectURL(url);
        return;
      }
      spoken.current.set(question.id, url);
      setPlayback((previous) => ({ url, n: (previous?.n ?? 0) + 1 }));
    } catch (cause) {
      if (mounted.current && (cause as Error).name !== "AbortError")
        setError((cause as Error).message);
    } finally {
      if (mounted.current) setSpeaking(null);
    }
  }

  async function recordAnswer(question: ReportQuestion) {
    if (busy) return;
    setError("");
    setRecordingFor(question.id);
    setPhase("permission");
    setSeconds(0);
    const controller = new AbortController();
    microphone.current = controller;
    const uploadController = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const session = await startCapture(controller.signal);
      if (!mounted.current || microphone.current !== controller) {
        controller.abort();
        return;
      }
      capture.current = session;
      setPhase("recording");
      const audio = await session.finished;
      if (!mounted.current || microphone.current !== controller) return;
      setPhase("transcribing");
      upload.current = uploadController;
      timer = setTimeout(() => uploadController.abort(), 125_000);
      const answerUrdu = await transcribeAnswer(audio.blob, uploadController.signal);
      if (!mounted.current) return;
      onChange(
        addFollowUp(draft, {
          questionId: question.id,
          question: { urdu: question.text.urdu, english: question.text.english },
          answerUrdu,
          seconds: audio.seconds,
        }),
      );
    } catch (cause) {
      if (!mounted.current) return;
      const name = (cause as Error).name;
      if (name === "AbortError") {
        if (uploadController.signal.aborted)
          setError("xAI timed out while transcribing the answer. Record it again.");
      } else if (name === "NotAllowedError") {
        setError("Microphone access was denied. Allow it in your browser to record an answer.");
      } else {
        setError((cause as Error).message || "Recording the answer failed. Please try again.");
      }
    } finally {
      clearTimeout(timer);
      if (mounted.current) {
        setPhase("idle");
        setRecordingFor(null);
      }
    }
  }

  function cancelRecording() {
    microphone.current?.abort();
    microphone.current = null;
    setPhase("idle");
    setRecordingFor(null);
  }

  const timer = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  function answerEditor(item: FollowUp) {
    return (
      <label className="follow-up-answer">
        Check the recorded answer
        <textarea
          className="urdu"
          lang="ur"
          dir="rtl"
          rows={3}
          maxLength={5000}
          value={item.answerUrdu}
          disabled={disabled}
          onChange={(event) => onChange(editFollowUp(draft, item.id, event.target.value))}
        />
        <span className="small muted">
          {item.seconds}s · not in the report yet
        </span>
        <button
          type="button"
          className="text-link"
          disabled={busy}
          onClick={() => onChange(removeFollowUp(draft, item.id))}
        >
          Discard answer
        </button>
      </label>
    );
  }

  return (
    <div className="follow-up-questions">
      {questions.length ? (
        <p className="small muted">
          Ask each question in Urdu, record the answer, then add the
          answers to the account and update the report.
        </p>
      ) : null}
      {questions.map((question) => {
        const answer = draft.followUps.find((item) => item.questionId === question.id);
        const active = recordingFor === question.id;
        return (
          <div className="question-result" key={question.id}>
            <h3>{question.text.english}</h3>
            <p>{question.why}</p>
            <p className="urdu" lang="ur" dir="rtl">
              {question.text.urdu}
            </p>
            <details className="visit-report-evidence">
              <summary>Source excerpt</summary>
              <p className="urdu small muted" lang="ur" dir="rtl">
                Source: {question.source.excerpt}
              </p>
            </details>
            <div className="follow-up-actions">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => void ask(question)}
              >
                {speaking === question.id ? "Speaking…" : "Ask in Urdu"}
              </button>
              {active && phase === "permission" ? (
                <>
                  <span role="status">Waiting for microphone permission…</span>
                  <button type="button" className="text-link" onClick={cancelRecording}>
                    Cancel
                  </button>
                </>
              ) : active && phase === "recording" ? (
                <>
                  <span role="status" className="follow-up-timer">
                    Listening to patient · {timer}
                  </span>
                  <button
                    type="button"
                    className="button"
                    onClick={() => capture.current?.stop()}
                  >
                    Stop and transcribe
                  </button>
                </>
              ) : active && phase === "transcribing" ? (
                <span role="status">Transcribing the answer…</span>
              ) : (
                <button
                  type="button"
                  className="button"
                  disabled={busy}
                  onClick={() => void recordAnswer(question)}
                >
                  {answer ? "Record answer again" : "Record patient answer"}
                </button>
              )}
            </div>
            {answer ? answerEditor(answer) : null}
          </div>
        );
      })}
      {orphaned.length ? (
        <div className="question-result">
          <h3>Answers recorded earlier</h3>
          <p>These answers belong to questions from a previous report and will still be added.</p>
          {orphaned.map((item) => (
            <div key={item.id}>
              <p className="small">{item.question.english}</p>
              {answerEditor(item)}
            </div>
          ))}
        </div>
      ) : null}
      {answered.length ? (
        <div className="follow-up-footer">
          <p className="small">
            {answered.length === 1
              ? "1 answer is recorded but not in the report yet."
              : `${answered.length} answers are recorded but not in the report yet.`}{" "}
            Update the report to include these answers.
          </p>
          <button
            type="button"
            className="button voice-primary"
            disabled={busy}
            onClick={onUpdateReport}
          >
            Add answers and update English report →
          </button>
        </div>
      ) : null}
      {playback ? (
        <audio ref={player} controls src={playback.url} aria-label="Urdu question spoken by xAI" />
      ) : null}
      {error ? (
        <p className="error-box" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
