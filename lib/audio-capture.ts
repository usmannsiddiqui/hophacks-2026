import { MAX_AUDIO_BYTES, MAX_RECORDING_SECONDS } from "./audio";
export type CapturedAudio = { blob: Blob; seconds: number };
export type CaptureSession = {
  finished: Promise<CapturedAudio>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  seconds: () => number;
};
export async function startCapture(
  signal: AbortSignal,
): Promise<CaptureSession> {
  if (
    !navigator.mediaDevices?.getUserMedia ||
    typeof MediaRecorder === "undefined"
  )
    throw new Error(
      "Recording is unavailable here. Use HTTPS or upload an audio file.",
    );
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
    video: false,
  });
  const release = () => stream.getTracks().forEach((track) => track.stop());
  if (signal.aborted) {
    release();
    throw new DOMException("Recording cancelled", "AbortError");
  }
  let recorder: MediaRecorder;
  try {
    const mimeType = [
      "audio/webm;codecs=opus",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ].find((type) => MediaRecorder.isTypeSupported(type));
    recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: 32000,
    });
  } catch (error) {
    release();
    throw error;
  }
  let elapsed = 0,
    activeSince = Date.now(),
    paused = false,
    settled = false,
    bytes = 0;
  const chunks: Blob[] = [];
  const seconds = () =>
    Math.round((elapsed + (paused ? 0 : Date.now() - activeSince)) / 1000);
  let resolve!: (value: CapturedAudio) => void,
    reject!: (reason: unknown) => void;
  const finished = new Promise<CapturedAudio>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  let timer: ReturnType<typeof setTimeout> | undefined = undefined;
  const cleanup = () => {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
    release();
  };
  const fail = (error: Error) => {
    if (settled) return;
    settled = true;
    cleanup();
    if (recorder.state !== "inactive") recorder.stop();
    reject(error);
  };
  const cancel = () =>
    fail(new DOMException("Recording cancelled", "AbortError"));
  const stop = () => {
    if (!paused) {
      elapsed += Date.now() - activeSince;
      paused = true;
    }
    if (recorder.state !== "inactive") recorder.stop();
  };
  recorder.ondataavailable = (event) => {
    if (settled || !event.data.size) return;
    bytes += event.data.size;
    if (bytes > MAX_AUDIO_BYTES) {
      fail(new Error("Recording is too large. Make a shorter recording."));
      return;
    }
    chunks.push(event.data);
  };
  recorder.onerror = () =>
    fail(new Error("Recording stopped unexpectedly. Please try again."));
  recorder.onstop = () => {
    if (settled) return;
    settled = true;
    const duration = Math.min(MAX_RECORDING_SECONDS, seconds());
    paused = true;
    cleanup();
    const blob = new Blob(chunks, {
      type: recorder.mimeType || chunks[0]?.type || "audio/webm",
    });
    if (!blob.size)
      reject(new Error("No audio was captured. Please try again."));
    else resolve({ blob, seconds: duration });
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    recorder.start(1000);
  } catch (error) {
    settled = true;
    cleanup();
    throw error;
  }
  timer = setTimeout(stop, MAX_RECORDING_SECONDS * 1000);
  return {
    finished,
    stop,
    seconds,
    pause: () => {
      if (recorder.state === "recording") {
        recorder.pause();
        elapsed += Date.now() - activeSince;
        paused = true;
      }
    },
    resume: () => {
      if (recorder.state === "paused") {
        recorder.resume();
        activeSince = Date.now();
        paused = false;
      }
    },
  };
}
