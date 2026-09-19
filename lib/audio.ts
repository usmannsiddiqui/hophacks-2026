export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
export const MAX_RECORDING_SECONDS = 180;
export const AUDIO_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
];
export type Transcript = {
  text: string;
  language: "ur";
  words: { text: string; start: number; end: number }[];
};
export function isSupportedAudio(type: string) {
  return AUDIO_TYPES.includes(type.split(";")[0].trim().toLowerCase());
}
