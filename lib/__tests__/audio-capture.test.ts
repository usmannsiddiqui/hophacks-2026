import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { startCapture } from "@/lib/audio-capture";
let stopTrack: ReturnType<typeof vi.fn>;
class Recorder {
  static isTypeSupported(type: string) {
    return type === "audio/webm;codecs=opus";
  }
  state = "inactive";
  mimeType = "audio/webm;codecs=opus";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  start() {
    this.state = "recording";
  }
  pause() {
    this.state = "paused";
  }
  resume() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({
      data: new Blob(["audio"], { type: this.mimeType }),
    });
    this.onstop?.();
  }
}
beforeEach(() => {
  vi.useFakeTimers();
  stopTrack = vi.fn();
  vi.stubGlobal("MediaRecorder", Recorder);
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: vi
        .fn()
        .mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] }),
    },
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("captures nonempty audio, excluding paused time, and releases the microphone", async () => {
  const session = await startCapture(new AbortController().signal);
  vi.advanceTimersByTime(2000);
  session.pause();
  vi.advanceTimersByTime(4000);
  session.resume();
  vi.advanceTimersByTime(1000);
  session.stop();
  const recording = await session.finished;
  expect(recording.seconds).toBe(3);
  expect(await recording.blob.text()).toBe("audio");
  expect(stopTrack).toHaveBeenCalled();
});
it("stops at the session limit and releases the microphone", async () => {
  const session = await startCapture(new AbortController().signal);
  vi.advanceTimersByTime(180000);
  expect((await session.finished).seconds).toBe(180);
  expect(stopTrack).toHaveBeenCalled();
});
it("releases a microphone granted after the user has left", async () => {
  let grant!: (stream: unknown) => void;
  navigator.mediaDevices.getUserMedia = vi.fn().mockImplementation(
    () =>
      new Promise((resolve) => {
        grant = resolve;
      }),
  );
  const abort = new AbortController();
  const starting = startCapture(abort.signal);
  abort.abort();
  grant({ getTracks: () => [{ stop: stopTrack }] });
  await expect(starting).rejects.toMatchObject({ name: "AbortError" });
  expect(stopTrack).toHaveBeenCalled();
});
it("does not retain a recording cancelled by navigation", async () => {
  const abort = new AbortController();
  const session = await startCapture(abort.signal);
  const finished = expect(session.finished).rejects.toMatchObject({
    name: "AbortError",
  });
  abort.abort();
  await finished;
  expect(stopTrack).toHaveBeenCalled();
});

it("does not count asynchronous recorder finalization as patient speech", async () => {
  class DeferredRecorder extends Recorder {
    stop() {
      this.state = "inactive";
      setTimeout(() => {
        this.ondataavailable?.({
          data: new Blob(["audio"], { type: this.mimeType }),
        });
        this.onstop?.();
      }, 1500);
    }
  }
  vi.stubGlobal("MediaRecorder", DeferredRecorder);
  const session = await startCapture(new AbortController().signal);
  vi.advanceTimersByTime(180000);
  vi.advanceTimersByTime(1500);
  expect((await session.finished).seconds).toBe(180);
});
