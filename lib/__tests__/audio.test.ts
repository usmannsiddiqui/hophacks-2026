import { describe, expect, it } from "vitest";
import { audioUploadFilename } from "@/lib/audio";

describe("audioUploadFilename", () => {
  it.each([
    ["audio/webm;codecs=opus", "patient.webm"],
    ["audio/mp4", "patient.m4a"],
    ["audio/ogg", "patient.ogg"],
    ["audio/wav", "patient.wav"],
    ["audio/x-wav", "patient.wav"],
    ["audio/mpeg", "patient.mp3"],
  ])("matches %s with %s", (mime, filename) => {
    expect(audioUploadFilename(mime)).toBe(filename);
  });
});
