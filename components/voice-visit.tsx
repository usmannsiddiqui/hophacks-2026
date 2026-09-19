"use client";
import Link from "next/link";
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
  readVisitDraft,
  reviewVisitDraft,
  VISIT_DRAFT_KEY,
  VISIT_HISTORY_KEY,
  saveVisitDraft,
  readVisitHistory,
  type VisitDraft,
  type VisitPatient,
} from "@/lib/visit-draft";

const subscribe = () => () => {};
function storedDraft() {
  try {
    return readVisitDraft(sessionStorage.getItem(VISIT_DRAFT_KEY));
  } catch {
    return null;
  }
}
export function VoiceVisit() {
  const client = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <div className="voice-page">
      <header className="topbar">
        <Link className="brand" href="/">
          Mashwara
        </Link>
        <Link className="text-link" href="/file/new">
          Sample walkthrough
        </Link>
      </header>
      <div className="voice-preview-note">
        Voice capture preview · fictional visits only
      </div>
      <main className="voice-card">
        {client ? <VisitCapture /> : <p role="status">Opening visit…</p>}
      </main>
    </div>
  );
}
function VisitCapture() {
  const [draft, setDraft] = useState<VisitDraft | null>(storedDraft);
  const [stage, setStage] = useState<"setup" | "capture" | "review" | "saved">(
    () =>
      draft
        ? draft.status === "transcript-ready"
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
  const [recording, setRecording] = useState<
    "idle" | "permission" | "recording" | "paused"
  >("idle");
  const [audio, setAudio] = useState<CapturedAudio | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const capture = useRef<CaptureSession | null>(null);
  const microphone = useRef<AbortController | null>(null);
  const upload = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      microphone.current?.abort();
      upload.current?.abort();
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
    try {
      sessionStorage.removeItem(VISIT_DRAFT_KEY);
    } catch {
      setStorageError(
        "Cannot start another visit while draft storage is unavailable.",
      );
      return;
    }
    setDraft(null);
    setText("");
    setAudio(null);
    setAudioUrl("");
    setSeconds(0);
    setError("");
    setStage("setup");
  }
  function restore(previous: VisitDraft) {
    if (!persist(previous)) return;
    setDraft(previous);
    setPatient(previous.patient);
    setText(previous.reviewedUrdu);
    setAudio(null);
    setAudioUrl("");
    setStage(previous.status === "transcript-ready" ? "saved" : "review");
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
  const timer = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <>
      {stage === "setup" ? (
        <form onSubmit={setup}>
          <h1>New visit</h1>
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
          <p className="small muted">Patient language: Urdu</p>
          <button className="button voice-primary" type="submit">
            Start conversation →
          </button>
          {history.length > 0 && (
            <details>
              <summary>Saved transcripts ({history.length})</summary>
              {history.map((previous) => (
                <button
                  type="button"
                  key={previous.id}
                  className="text-link full"
                  onClick={() => restore(previous)}
                >
                  {previous.patient.name} ·{" "}
                  {previous.status === "transcript-ready"
                    ? "Reviewed"
                    : "Draft"}
                </button>
              ))}
            </details>
          )}
        </form>
      ) : (
        <>
          <span className="eyebrow">{patient.name} · Urdu</span>
          {stage === "capture" ? (
            <>
              <h1>Conversation</h1>
              <p className="urdu voice-prompt" lang="ur" dir="rtl">
                اپنی بات آرام سے بتائیں۔
              </p>
              <p className="small muted">
                Patient recording · pause when the volunteer speaks
              </p>
              <div className="voice-recorder">
                <p className="voice-timer" aria-label="Recording duration">
                  {timer}
                </p>
                <p role="status">
                  {recording === "permission"
                    ? "Waiting for microphone permission…"
                    : recording === "recording"
                      ? "Listening to patient"
                      : recording === "paused"
                        ? "Paused"
                        : audio
                          ? "Recording ready"
                          : "Ready to record"}
                </p>
                {recording === "recording" || recording === "paused" ? (
                  <div className="actions">
                    <button className="button secondary" onClick={pause}>
                      {recording === "paused" ? "Resume" : "Pause"}
                    </button>
                    <button
                      className="button"
                      onClick={() => capture.current?.stop()}
                    >
                      Finish recording
                    </button>
                  </div>
                ) : (
                  <button
                    className="button voice-primary"
                    onClick={record}
                    disabled={busy || recording === "permission"}
                  >
                    {audio ? "Record again" : "Start recording"}
                  </button>
                )}
                {recording === "permission" && (
                  <button
                    className="text-link"
                    onClick={() => {
                      microphone.current?.abort();
                      microphone.current = null;
                      setRecording("idle");
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
              {audio && recording === "idle" && (
                <>
                  <audio
                    controls
                    src={audioUrl || undefined}
                    aria-label="Recorded patient account"
                  />
                  <button
                    className="button voice-primary"
                    disabled={busy}
                    onClick={transcribe}
                  >
                    {busy ? "Transcribing…" : "Transcribe recording →"}
                  </button>
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
                    if (draft)
                      persist({
                        ...draft,
                        reviewedUrdu: e.target.value,
                        status: "transcript-review",
                      });
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
              <button className="button voice-primary" onClick={save}>
                Save transcript
              </button>
              <button
                className="text-link"
                onClick={() => {
                  setStage("capture");
                  setError("");
                }}
              >
                Back to recording
              </button>
            </>
          ) : (
            <>
              <span className="status-badge">Transcript ready</span>
              <h1>Transcript saved.</h1>
              <p className="urdu voice-saved" lang="ur" dir="rtl">
                {draft?.reviewedUrdu}
              </p>
              <button
                className="button secondary voice-primary"
                onClick={() => setStage("review")}
              >
                Review transcript
              </button>
              <p className="small muted">
                Saved in this browser tab. English analysis and sending to a
                pharmacist are the next step.
              </p>
              <button className="text-link" onClick={newVisit}>
                Start another visit
              </button>
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
