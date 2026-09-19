---
title: "HopHacks F26 — User Journey (Nani)"
tags: [hophacks, journey, spec]
date: 2026-09-19
status: draft
---

# User journey — Nani buys two fever meds

> [!ABSTRACT] Premise
> In Pakistan (and similar markets) most counter "pharmacists" are unqualified. %% verify the 95% figure before it goes on a slide %%
> The tool puts a **qualified, remote pharmacist** in the loop for free, using a **local English-speaking volunteer** as the bridge and **Urdu voice** as the patient's interface.

## Actors

| Actor | Where | Speaks | Sees |
|---|---|---|---|
| **Nani** | at the counter | Urdu, voice only | nothing on screen; hears Urdu |
| **The app** | volunteer's phone/tablet | — | everything |
| **Volunteer** | behind the counter | English | live English transcript + flags |
| **Pharmacist** | remote, first-world | English | case packet: transcript, chart, flags, photos |

## The journey (10 steps)

| # | Actor | Does | App produces | Sponsor tech |
|---|---|---|---|---|
| 1 | Nani | Has a fever. Names 2 meds she wants to buy. | — | — |
| 2 | Nani | Speaks in Urdu into the tablet. | Live Urdu → English transcript on the volunteer's screen. | ElevenLabs Scribe (STT) |
| 3 | App | Asks the standard intake questions *in Urdu* — what else do you take, home remedies, anything from a hakeem. | Urdu voice prompts. | ElevenLabs Agent / TTS |
| 4 | Volunteer | Reads English, asks follow-ups when Nani's answer is vague ("the green bottle"). Types nothing — just talks. | Follow-ups also transcribed. | Scribe |
| 5 | Nani | Can't name a product → holds it up. | Photo → product identified ("Panadol CF", "karela extract"), added to transcript with her words beside it. | Gemini vision |
| 6 | App | Transcript closes. Normalizes everything Nani said to a closed vocabulary (~200 meds, OTC, common desi remedies). | **Med list** with provenance: `{term, her_words, source: voice|photo}` | Gemini (structured output) |
| 7 | App | Looks up interactions between: the 2 requested meds × everything she takes. | **Flags** (severity + source row from the verified table). Rendered as a bubble map. | Curated interaction table (deterministic, cited) |
| 8 | Volunteer | Sees "2 flags" → immediate hold: *don't sell both yet*. | Case packet sent to pharmacist queue. | Backboard (case memory) |
| 9 | Pharmacist | Opens packet: transcript, photos, flags. Checks the photo is the right strip. Writes advice in English. | Advice + stamp. | — |
| 10 | App → Nani | Advice spoken back **in Urdu**. Clear plan: keep / stop / swap. Pharmacist sets a next-day follow-up. | Plan card (Urdu audio + text). Follow-up reminder. | ElevenLabs TTS, Backboard |

## The two screens that matter

**Volunteer screen (live):** English transcript scrolling · med list building on the right · flag count badge · "Send to pharmacist" button.

**Pharmacist screen (async):** case packet · bubble map (color = source: requested / disclosed / remedy; size = severity; edges = interactions) · photo strip · advice box · approve.

## The demo beat (3 min)

1. Open on Nani, not a dashboard. Urdu voice.
2. She says "karela" — app doesn't know it yet, asks for a photo, identifies it.
3. Flag appears: *karela + [her diabetes med] → hypoglycemia risk*. Volunteer holds the sale.
4. Cut to pharmacist screen: reviews, approves with advice.
5. Nani hears the plan in Urdu.

## Where it lands on prizes

Bloomberg (free, unqualified-pharmacy access gap) · ElevenLabs ×2 (Urdu agent + TTS) · Gemini (vision + normalization) · Backboard (case memory, follow-up) · Auctor (conversation → action: the hold + plan) · DigitalOcean · GoDaddy.
