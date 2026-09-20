"use client";
import Link from "next/link";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

import { outreachAreaNames, type OutreachAreaId } from "@/lib/outreach/location";
import { ProductHeader } from "./product-header";
import { GlassMaterial } from "./glass-material";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  startCapture,
  type CaptureSession,
  type CapturedAudio,
} from "@/lib/audio-capture";
import {
  audioUploadFilename,
  isSupportedAudio,
  MAX_AUDIO_BYTES,
  MAX_RECORDING_SECONDS,
  type Transcript,
} from "@/lib/audio";
import {
  createVisitDraft,
  mergeFollowUps,
  readVisitDraft,
  reviewVisitDraft,
  VISIT_DRAFT_KEY,
  VISIT_HISTORY_KEY,
  saveVisitDraft,
  readVisitHistory,
  type VisitDraft,
  type VisitPatient,
} from "@/lib/visit-draft";
import { ReportRequestOwner, requestVisitReport } from "@/lib/report-request";
import { VisitReportView } from "./visit-report";
import { FollowUpQuestions } from "./follow-up-questions";
import { PharmacistDecision } from "./pharmacist-decision";

/** A recorded Urdu visit, served from public/, for testers who do not speak Urdu. */
const SAMPLE_AUDIO_URL = "/samples/sample-visit-urdu.mp3";

const subscribe = () => () => {};
function storedDraft() {
  try {
    return readVisitDraft(sessionStorage.getItem(VISIT_DRAFT_KEY));
  } catch {
    return null;
  }
}
function clearActiveDraft() {
  sessionStorage.removeItem(VISIT_DRAFT_KEY);
}
function continuingVisitUrl(areaId?: OutreachAreaId) {
  return areaId ? `/visit/new?area=${encodeURIComponent(areaId)}` : "/visit/new";
}
export function VoiceVisit({initialAreaId,initialFresh=false}:{initialAreaId?:OutreachAreaId;initialFresh?:boolean}) {
  const client = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <div className="voice-page">
      <ProductHeader title="Community visit" />
      <div className="voice-preview-note">Practice visit · use fictional details</div>
      <main className="voice-card glass-panel">
        <GlassMaterial />
        {client ? <VisitCapture key={initialFresh ? "fresh" : "continue"} initialAreaId={initialAreaId} initialFresh={initialFresh} /> : <p role="status">Opening visit…</p>}
      </main>
    </div>
  );
}
function VisitCapture({initialAreaId,initialFresh}:{initialAreaId?:OutreachAreaId;initialFresh:boolean}) {
  const [draft, setDraft] = useState<VisitDraft | null>(() => {
    if (!initialFresh) return storedDraft();
    return null;
  });
  const [outreachAreaId,setOutreachAreaId]=useState<OutreachAreaId|undefined>(()=>draft?.outreachAreaId??initialAreaId);
  const [stage, setStage] = useState<"setup" | "capture" | "review" | "saved" | "report">(
    () =>
      draft
        ? draft.report ? "report" : draft.status === "transcript-ready"
          ? "saved"
          : "review"
        : "setup",
  );
  const [patient, setPatient] = useState<VisitPatient>(
    () => draft?.patient ?? { name: "", age: 0, sex: "F" },
  );
  const [history, setHistory] = useState(() => {
    try {
      return readVisitHistory(sessionStorage.getItem(VISIT_HISTORY_KEY));
    } catch {
      return [];
    }
  });
  const [text, setText] = useState(() => draft?.reviewedUrdu ?? "");
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [initialClearError, setInitialClearError] = useState("");
  const [recording, setRecording] = useState<
    "idle" | "permission" | "recording" | "paused"
  >("idle");
  const [audio, setAudio] = useState<CapturedAudio | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState("");
  useEffect(() => {
    if (!initialFresh) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      try { clearActiveDraft(); }
      catch {
        setInitialClearError("This browser could not clear the active draft. Your saved transcript history remains available.");
        return;
      }
      window.history.replaceState(window.history.state, "", continuingVisitUrl(initialAreaId));
    });
    return () => { active = false; };
  }, [initialFresh, initialAreaId]);
  const capture = useRef<CaptureSession | null>(null);
  const microphone = useRef<AbortController | null>(null);
  const upload = useRef<AbortController | null>(null);
  const reportRequest = useRef(new ReportRequestOwner());
  const mounted = useRef(true);
  useEffect(() => {
    const owner = reportRequest.current;
    mounted.current = true;
    return () => {
      mounted.current = false;
      microphone.current?.abort();
      upload.current?.abort();
      owner.cancel();
    };
  }, []);
  useEffect(() => {
    if (!audio) return;
    const url = URL.createObjectURL(audio.blob);
    const timer = setTimeout(() => setAudioUrl(url), 0);
    return () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
    };
  }, [audio]);
  useEffect(() => {
    if (recording !== "recording") return;
    const timer = setInterval(
      () => setSeconds(capture.current?.seconds() ?? 0),
      250,
    );
    return () => clearInterval(timer);
  }, [recording]);
  function persist(next: VisitDraft) {
    try {
      saveVisitDraft(sessionStorage, next);
      setHistory(readVisitHistory(sessionStorage.getItem(VISIT_HISTORY_KEY)));
      setStorageError("");
      return true;
    } catch {
      setStorageError(
        "Draft storage is unavailable. Keep this tab open and copy the transcript before leaving.",
      );
      return false;
    }
  }
  function newVisit() {
    reportRequest.current.cancel();
    setReportBusy(false);
    setReportError("");
    try {
      clearActiveDraft();
    } catch {
      setStorageError(
        "Cannot start another visit while draft storage is unavailable.",
      );
      return;
    }
    setDraft(null);
    setOutreachAreaId(initialAreaId);
    setPatient({name:"",age:0,sex:"F"});
    setText("");
    setAudio(null);
    setAudioUrl("");
    setSeconds(0);
    setError("");
    setStage("setup");
  }
  function restore(previous: VisitDraft) {
    reportRequest.current.cancel();
    setReportBusy(false);
    setReportError("");
    if (!persist(previous)) return;
    setDraft(previous);
    setPatient(previous.patient);
    setOutreachAreaId(previous.outreachAreaId);
    setText(previous.reviewedUrdu);
    setAudio(null);
    setAudioUrl("");
    setStage(previous.report ? "report" : previous.status === "transcript-ready" ? "saved" : "review");
  }
  function setup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPatient({
      name: String(data.get("name")).trim(),
      age: Number(data.get("age")),
      sex: data.get("sex") as VisitPatient["sex"],
    });
    setStage("capture");
  }
  async function record() {
    setError("");
    setRecording("permission");
    setSeconds(0);
    setAudio(null);
    setAudioUrl("");
    const controller = new AbortController();
    microphone.current = controller;
    try {
      const session = await startCapture(controller.signal);
      if (!mounted.current || microphone.current !== controller) {
        controller.abort();
        return;
      }
      capture.current = session;
      setRecording("recording");
      const result = await session.finished;
      if (!mounted.current || microphone.current !== controller) return;
      setAudio(result);
      setSeconds(result.seconds);
      setRecording("idle");
    } catch (e) {
      if (!mounted.current || microphone.current !== controller) return;
      setRecording("idle");
      if ((e as Error).name === "AbortError") return;
      setError(
        (e as Error).name === "NotAllowedError"
          ? "Microphone access was denied. Allow it in your browser or upload an audio file."
          : (e as Error).message || "Recording failed. Please try again.",
      );
    }
  }
  function pause() {
    if (recording === "paused") {
      capture.current?.resume();
      setRecording("recording");
    } else {
      capture.current?.pause();
      setRecording("paused");
    }
  }
  // A recorded Urdu visit, so someone who does not speak Urdu can still walk the whole
  // flow. Goes through selectAudio like any other file — no separate code path.
  async function loadSampleAudio() {
    setError("");
    try {
      const response = await fetch(SAMPLE_AUDIO_URL);
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      await selectAudio(
        new File([blob], "sample-visit-urdu.mp3", { type: "audio/mpeg" }),
      );
    } catch {
      setError("The sample recording could not be loaded.");
    }
  }
  async function selectAudio(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!isSupportedAudio(file.type)) {
      setError("Use WebM, MP4, Ogg, WAV or MP3 audio.");
      return;
    }
    if (!file.size || file.size > MAX_AUDIO_BYTES) {
      setError("Choose a nonempty audio file smaller than 4 MiB.");
      return;
    }
    setBusy(true);
    const url = URL.createObjectURL(file);
    const media = new Audio();
    media.preload = "metadata";
    try {
      const duration = await new Promise<number>((resolve, reject) => {
        const timer = setTimeout(
          () =>
            reject(
              new Error(
                "Could not read the audio length. Try WAV, MP3 or a new recording.",
              ),
            ),
          8000,
        );
        media.onloadedmetadata = () => {
          clearTimeout(timer);
          resolve(media.duration);
        };
        media.onerror = () => {
          clearTimeout(timer);
          reject(
            new Error("This audio could not be played. Try another format."),
          );
        };
        media.src = url;
      });
      if (
        !Number.isFinite(duration) ||
        duration <= 0 ||
        duration > MAX_RECORDING_SECONDS
      )
        throw new Error("Choose an audio recording up to 3 minutes long.");
      if (mounted.current) {
        setAudio({ blob: file, seconds: Math.round(duration) });
        setSeconds(Math.round(duration));
      }
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      media.removeAttribute("src");
      media.load();
      URL.revokeObjectURL(url);
      if (mounted.current) setBusy(false);
    }
  }
  async function transcribe() {
    if (!audio || busy) return;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    upload.current = controller;
    const timer = setTimeout(() => controller.abort(), 55000);
    try {
      const form = new FormData();
      const type = audio.blob.type.split(";")[0];
      form.set(
        "audio",
        new File([audio.blob], audioUploadFilename(type), {
          type: audio.blob.type,
        }),
      );
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "Transcription failed. Retry when ready.",
        );
      const next = createVisitDraft(
        patient,
        result as Transcript,
        audio.seconds,
        outreachAreaId,
      );
      if (!mounted.current) return;
      setDraft(next);
      setText(next.reviewedUrdu);
      persist(next);
      setStage("review");
    } catch (e) {
      if (mounted.current)
        setError(
          (e as Error).name === "AbortError"
            ? "Transcription timed out. Your audio is ready to retry."
            : (e as Error).message,
        );
    } finally {
      clearTimeout(timer);
      if (mounted.current) setBusy(false);
    }
  }
  function save() {
    if (!draft) return;
    if (!text.trim()) {
      setError("The transcript cannot be empty.");
      return;
    }
    const next = reviewVisitDraft(draft, text);
    setDraft(next);
    setError("");
    if (persist(next)) setStage("saved");
  }
  async function prepareReport(target: VisitDraft | null = draft) {
    if (!target || target.status !== "transcript-ready" || reportBusy) return;
    const owned = reportRequest.current.begin(target.id);
    setReportBusy(true);
    setReportError("");
    try {
      const next = await requestVisitReport(target, owned.signal);
      if (!mounted.current || !reportRequest.current.isCurrent(owned)) return;
      setDraft(next);
      persist(next);
      setStage("report");
    } catch (cause) {
      if (!mounted.current || !reportRequest.current.isCurrent(owned)) return;
      if ((cause as Error).name !== "AbortError") {
        setReportError((cause as Error).message || "English report preparation failed. Please retry.");
      }
    } finally {
      if (mounted.current && reportRequest.current.isCurrent(owned)) setReportBusy(false);
    }
  }
  function updateDraft(next: VisitDraft) {
    setDraft(next);
    persist(next);
  }
  // Appends the recorded answers to the reviewed account as marked dialogue, then
  // re-runs the Gemini report on the longer account.
  async function updateReportWithAnswers() {
    if (!draft || reportBusy) return;
    let merged: VisitDraft;
    try {
      merged = mergeFollowUps(draft);
    } catch (cause) {
      setReportError((cause as Error).message);
      return;
    }
    reportRequest.current.cancel();
    setReportError("");
    updateDraft(merged);
    await prepareReport(merged);
  }
  const timer = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  if (initialClearError) return (
    <div className="error-box" role="alert"><p>{initialClearError}</p>
      <Link className="button secondary" href="/visit/new">Return to the saved visit</Link>
    </div>
  );
  return (
    <>
      <ol className="journey-progress" aria-label="Visit progress">
        {["Details", "Conversation", "Transcript", "Report"].map((label,index) => {
          const active = stage === "setup" ? 0 : stage === "capture" ? 1 : stage === "report" ? 3 : 2;
          return <li key={label} aria-current={active===index ? "step" : undefined}><span>{index+1}</span>{label}</li>;
        })}
      </ol>
      {stage === "setup" ? (
        <form onSubmit={setup}>
          <h1>Make time to listen.</h1>
          <p className="muted">A few details, then the conversation.</p>
          <label>
            Visit area <span className="small muted">(optional)</span>
            <select value={outreachAreaId??""} onChange={event=>setOutreachAreaId((event.target.value||undefined) as OutreachAreaId|undefined)}>
              <option value="">Choose an area</option>
              {Object.entries(outreachAreaNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <label>
            Name
            <input name="name" maxLength={120} required autoComplete="off" />
          </label>
          <div className="form-pair">
            <label>
              Age
              <input name="age" type="number" min={0} max={120} required />
            </label>
            <label>
              Sex
              <select name="sex">
                <option value="F">Female</option>
                <option value="M">Male</option>
                <option value="Other">Other</option>
              </select>
            </label>
          </div>
          <p className="small muted">Explain how the recording will be used and ask permission before you begin. Patient language: Urdu.</p>
          <LiquidButton className="button voice-primary" type="submit">
            Start conversation
          </LiquidButton>
          {history.length > 0 && (
            <details>
              <summary>Saved transcripts ({history.length})</summary>
              {history.map((previous) => (
                <LiquidButton
                  type="button"
                  key={previous.id}
                  className="text-link full"
                  onClick={() => restore(previous)}
                >
                  {previous.patient.name} ·{" "}
                  {previous.status === "transcript-ready"
                    ? "Reviewed"
                    : "Draft"}
                </LiquidButton>
              ))}
            </details>
          )}
        </form>
      ) : (
        <>
          <p className="voice-patient-context">{patient.name} · Urdu{outreachAreaId ? ` · ${outreachAreaNames[outreachAreaId]}` : ""}</p>
          {stage === "capture" ? (
            <>
              <h1>Tell us in your own words.</h1>
              <p className="urdu voice-prompt" lang="ur" dir="rtl">
                اپنی بات آرام سے بتائیں۔
              </p>
              <p className="small muted">
                Let the person speak freely. Pause before you speak.
              </p>
              <div className="voice-recorder">
                <p className="voice-timer" aria-label="Recording duration">
                  {timer}
                </p>
                <p role="status">
                  {recording === "permission"
                    ? "Waiting for microphone permission…"
                    : recording === "recording"
                      ? "Listening…"
                      : recording === "paused"
                        ? "Paused"
                        : audio
                          ? "Recording ready"
                          : "Ready to record"}
                </p>
                {recording === "recording" || recording === "paused" ? (
                  <div className="actions">
                    <LiquidButton className="button secondary" onClick={pause}>
                      {recording === "paused" ? "Resume" : "Pause"}
                    </LiquidButton>
                    <LiquidButton
                      className="button"
                      onClick={() => capture.current?.stop()}
                    >
                      Finish recording
                    </LiquidButton>
                  </div>
                ) : (
                  <LiquidButton
                    className="button voice-primary"
                    onClick={record}
                    disabled={busy || recording === "permission"}
                  >
                    {audio ? "Record again" : "Start recording"}
                  </LiquidButton>
                )}
                {recording === "permission" && (
                  <LiquidButton
                    className="text-link"
                    onClick={() => {
                      microphone.current?.abort();
                      microphone.current = null;
                      setRecording("idle");
                    }}
                  >
                    Cancel
                  </LiquidButton>
                )}
                {recording === "idle" && (
                  <LiquidButton
                    className="button secondary"
                    disabled={busy}
                    onClick={() => void loadSampleAudio()}
                  >
                    Use the sample Urdu recording
                  </LiquidButton>
                )}
              </div>
              {audio && recording === "idle" && (
                <>
                  <audio
                    controls
                    src={audioUrl || undefined}
                    aria-label="Recorded patient account"
                  />
                  <LiquidButton
                    className="button voice-primary"
                    disabled={busy}
                    onClick={transcribe}
                  >
                    {busy ? "Transcribing…" : "Transcribe recording"}
                  </LiquidButton>
                </>
              )}
              {recording === "idle" && (
                <details className="voice-upload">
                  <summary>Upload audio instead</summary>
                  <label>
                    Audio file
                    <input
                      type="file"
                      accept="audio/webm,audio/mp4,audio/ogg,audio/wav,audio/x-wav,audio/mpeg"
                      disabled={busy}
                      onChange={(e) => {
                        void selectAudio(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </details>
              )}
              <p className="small muted">
                Up to 3 minutes · audio is sent to ElevenLabs when you
                transcribe.
              </p>
            </>
          ) : stage === "review" ? (
            <>
              <h1>Review transcript</h1>
              <label>
                Urdu transcript
                <textarea
                  className="urdu"
                  lang="ur"
                  dir="rtl"
                  rows={7}
                  maxLength={20000}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (draft) {
                      reportRequest.current.cancel();
                      setReportBusy(false);
                      setReportError("");
                      const next = {
                        ...draft,
                        reviewedUrdu: e.target.value,
                        status: "transcript-review",
                        report: undefined,
                      } satisfies VisitDraft;
                      setDraft(next);
                      persist(next);
                    }
                  }}
                />
              </label>
              <details>
                <summary>Original transcription</summary>
                <p className="urdu" lang="ur" dir="rtl">
                  {draft?.transcript.text}
                </p>
              </details>
              {audioUrl && (
                <audio
                  controls
                  src={audioUrl}
                  aria-label="Recorded patient account"
                />
              )}
              <LiquidButton className="button voice-primary" onClick={save}>
                Save transcript
              </LiquidButton>
              <LiquidButton
                className="text-link"
                onClick={() => {
                  reportRequest.current.cancel();
                  setReportBusy(false);
                  setReportError("");
                  setStage("capture");
                  setError("");
                }}
              >
                Back to recording
              </LiquidButton>
            </>
          ) : (
            <>
              {stage !== "report" && <>
              <span className="status-badge">Transcript ready</span>
              <h1>Transcript saved.</h1>
              <p className="urdu voice-saved" lang="ur" dir="rtl">
                {draft?.reviewedUrdu}
              </p>
              <LiquidButton
                className="button secondary voice-primary"
                onClick={() => {
                  reportRequest.current.cancel();
                  setReportBusy(false);
                  setReportError("");
                  setStage("review");
                }}
              >
                Review transcript
              </LiquidButton>
              <p className="small muted">
                Saved in this browser tab. The English report is an AI draft
                for volunteer review and is not sent to a pharmacist.
              </p>
              </>}
              <LiquidButton
                className={stage === "report" ? "text-link" : "button voice-primary"}
                disabled={reportBusy}
                onClick={() => void prepareReport()}
              >
                {reportBusy
                  ? "Preparing English report…"
                  : draft?.report
                    ? "Prepare report again"
                    : "Prepare English report"}
              </LiquidButton>
              {reportBusy && (
                <LiquidButton
                  className="text-link"
                  onClick={() => {
                    reportRequest.current.cancel();
                    setReportBusy(false);
                  }}
                >
                  Cancel report preparation
                </LiquidButton>
              )}
              {reportError && (
                <div className="error-box" role="alert">
                  <p>{reportError}</p>
                  <LiquidButton className="text-link" onClick={() => void prepareReport()}>
                    Retry English report
                  </LiquidButton>
                </div>
              )}
              {draft?.report ? (
                <VisitReportView
                  draft={draft}
                  decisionPanel={<PharmacistDecision key={`${draft.id}-${draft.report.generatedAt}`} draft={draft} />}
                  questionPanel={
                    <FollowUpQuestions
                      draft={draft}
                      disabled={reportBusy}
                      onChange={updateDraft}
                      onUpdateReport={() => void updateReportWithAnswers()}
                    />
                  }
                />
              ) : draft && draft.followUps.length > 0 ? (
                <FollowUpQuestions
                  draft={draft}
                  disabled={reportBusy}
                  onChange={updateDraft}
                  onUpdateReport={() => void updateReportWithAnswers()}
                />
              ) : null}
              <div className="visit-footer-actions">
              {stage === "report" && <LiquidButton className="text-link" onClick={() => { reportRequest.current.cancel(); setReportBusy(false); setReportError(""); setStage("review"); }}>Edit the source transcript</LiquidButton>}
              <LiquidButton className="text-link" onClick={newVisit}>
                Start another visit
              </LiquidButton>
              </div>
            </>
          )}
        </>
      )}
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      {storageError && (
        <p className="error-box" role="alert">
          {storageError}
        </p>
      )}
    </>
  );
}
