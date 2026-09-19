import { NextResponse } from "next/server";
import { ElevenLabsError } from "@elevenlabs/elevenlabs-js";
import { hasScribeKey, scribeRealtimeToken } from "@/lib/voice/stt";

/**
 * POST → { token } for Scribe Realtime (model scribe_v2_realtime) in the browser.
 * Placeholder for the P3 stretch goal: nothing calls it yet. Scribe only, whatever
 * STT_PROVIDER says. The API key never leaves the server; the token is single-use and
 * expires after 15 minutes.
 */
export async function POST() {
  if (!hasScribeKey()) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY not set" }, { status: 503 });
  }
  try {
    return NextResponse.json({ token: await scribeRealtimeToken() });
  } catch (err) {
    if (err instanceof ElevenLabsError) {
      console.error("[transcribe/token]", err.statusCode, err.requestId, err.body);
      return NextResponse.json({ error: "could not mint token", upstream: err.statusCode ?? null }, { status: 502 });
    }
    throw err;
  }
}
