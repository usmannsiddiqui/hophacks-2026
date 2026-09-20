## Mashwara - ہروشم ##

A qualified pharmacist behind every counter.

In Pakistan and similar markets, most counter staff selling medicine are unqualified. Mashwara puts a remote, qualified pharmacist in the loop for free, using a local volunteer as the bridge and Urdu voice as the patient's interface. She speaks; the volunteer reads English; a pharmacist elsewhere reviews and authorises; the answer comes back in Urdu.

How it works

1. She talks. Urdu voice into a phone at the counter, transcribed by ElevenLabs Scribe.
2. The app listens carefully. Gemini turns her account into a med list with provenance — every item keeps her own words — plus draft questions worth asking.
3. The table decides, not the model. Interactions come from a hand-curated table where every row carries a severity, a reason and a citation. Anything the model merely suspects is rendered as a question, never a finding.
4. A pharmacist authorises. The report reaches a queue; a named professional approves or declines each medicine, and a refusal must say why.
5. She hears the plan in Urdu.
6. The visit is remembered. Backboard.io stores what the pharmacist signed, so a follow-up days later doesn't start from zero.

Try it without speaking Urdu

Open a visit and click Use the sample Urdu recording next to Start recording. It runs the real pipeline and produces a genuine high-severity flag: Tylenol and Panadol are both paracetamol, and together they reach a liver-damaging dose.

Stack

Next.js · React  · TypeScript · Tailwind · Neon Postgres + Drizzle · Gemini (structuring) · ElevenLabs Scribe (STT) · xAI (follow-up question speech) · Backboard.io (memory) · pnpm

Running it

pnpm install
cp .env.example .env.local   # fill in the keys
pnpm db:push
pnpm db:seed                 # optional: the demo case
pnpm dev
