---
title: "HopHacks F26 — Tracks, Rubrics & Strategy"
tags: [hophacks, hackathon, research]
date: 2026-09-18
status: active
---

# HopHacks Fall 2026 — Track Research

> [!INFO] Hard facts
> - **When:** Fri Sep 18 9:00 PM → Sun Sep 20 ~8:45 AM ET (36 h). Hodson Hall + Glass Pavilion, JHU Homewood.
> - **Submit on Devpost.** All demos **in person**. Teams of 2–4.
> - **Git rule:** first commit AFTER 9 PM Fri, last commit BEFORE hacking ends. No edits after. (Our first commit: 21:45 Fri ✅)
> - **Overall judging — 4 equal criteria:** polish (app *and* presentation), usefulness, creativity, technical difficulty.
> - **2025 field:** 102 submissions.
> - Repo: https://github.com/usmannsiddiqui/hophacks-2026 · Code: `~/dev/projects/hophacks-2026`

## Prize map

### Overall (auto-considered)
1st $1,024 + ElevenLabs Pro 3 mo · 2nd $512 · 3rd $256

### Track prizes — **pick exactly one**
| Track | Sponsor | Prize | Notes |
|---|---|---|---|
| Best Data Visualization | DSAI + marimo | $800 / $500 / $300 | Marimo notebook + Baltimore open data. Full rubric below. Highest 1st-place cash of any track. |
| Best Memetics Hack | Calcifer Computing | $1,000 winner-takes-all | "studies or uses memetics" — vague, fewest entrants likely. |
| Most Philanthropic Hack | Bloomberg | Beats headphones | 2024/2025 winners: donation apps (Dust, RippleEffect, Charity Search Engine). |
| Best Use of SpacetimeDB | SpacetimeDB | $500 / $200 / $100 | 2025 winner: multiplayer rhythm game. Real-time/multiplayer projects. |
| Best Healthcare Hack | Forge | $2,000 **contingent on joining Forge cohort** | Biggest number, biggest strings. Healthcare is the most crowded category historically (~half of 2024 winners). |

### Branded prizes — **stack as many as you want**
| Sponsor | Requirement | Prize |
|---|---|---|
| ElevenLabs (direct) | Agentic depth, lifelike/responsive interaction, creative API use, novelty on real-world problem | 6 mo Scale tier/member (~$1,794 each) |
| ElevenLabs / MLH | Integrate AI voice/audio | Wireless earbuds |
| Auctor AI | "Conversation → action": solve a problem, support a decision, create something, save tedious work | Merch |
| Google / MLH | Use Gemini API | Swag |
| Backboard / MLH | Persistent AI experience (memory/state) | Tile pack |
| DigitalOcean / MLH | Use DO cloud/AI | Mouse |
| Snowflake / MLH | Integrate Snowflake API | Raspberry Pi 4 |
| GoDaddy / MLH | Register a domain | Gift card |
| Solana / MLH | Build on Solana | Ledger |
| Tiger Data / MLH | Performance-focused use | Stream Deck |
| SpaceXAI | Built with Cursor + Grok Imagine/Voice API, space data | 4 Cursor keyboards; all entrants → water bottle |
| OPEF | Environmental Intelligence (climate, geospatial, sensing, disaster, ESG…) | $250 + internship interviews |

## Rubrics (verbatim-ish)

### DSAI × marimo — Best Data Visualization
**Required notebook sections:** Executive summary · Problem statement · Data overview · Core visualization · Insight synthesis · Discussion/Future work.
**Data:** must be from https://data.baltimorecity.gov/. Combining multiple datasets is called out as "interesting."
**Judges read for < 5 minutes.** Notebooks with errors are **disqualified**.

| Criterion | Weight | What wins |
|---|---|---|
| Creativity & Impact | 20% | Fresh angle; cross-reference related work; real-world relevance; multiple datasets |
| Storytelling, Presentation & Visual Design | 30% | Complete story, logical cell flow, intentional palette/typography/marks, makes viewer want to explore |
| Code Quality & Clarity | 20% | Clean, documented, **reproducible end-to-end with minimal setup** |
| Interactivity & UX | 20% | Uses marimo reactivity; widgets drive real exploration; **custom anywidget** strongly rewarded; include feedback on marimo |
| Agentic Tool Usage | 10% | Reflection on how you used AI agents to build it |

### ElevenLabs (direct prize)
Judged on: **agentic depth**, **lifelike + responsive interaction**, **creative API integration**, **novelty on a real-world problem**. Products: TTS (32 langs), STT, Music, SFX, Dubbing, Voice cloning, **Agents Platform** (voice/chat agents with tools + knowledge base). 2025 showcase winners: Reconnect Generations (voice-preserving family interviews), Aphasio (speech therapy), Kisan (multilingual farmer assistant), Orva (voice dental charting), Pronunciation Coach.
Credits: 1 mo Creator ($22) via Discord `#coupon-codes`. Support: `#hackathon-support`.

## What past winners look like
- **2025 (24 flagged winners / 102):** Lookout (multi-agent security cam), MedRelay (healthcare compliance), BeatBoxing (SpacetimeDB rhythm game), Dom (voice web accessibility), Veris (scam protection for seniors), GreenWeb Current (carbon viz), RippleEffect (spare-change donations), Crack The Code (prompt-injection training).
- **2024:** NoteSync AI, Young Heroes (911 sim for kids), DenEyes (ADHD detection via CV), E-Graveyard (cloned-voice remembrance), MedTap (NFC medical data), Charity Search Engine.
- **Pattern:** winners pair one *clear human story* with one *visibly hard technical thing* (multi-agent, CV, hand tracking, voice). Healthcare dominates the field → hardest to stand out in.

## Strategy read (my take — challenge this in grilling)

> [!TIP] Prize-stacking logic
> Overall prizes are judged on **polish + usefulness + creativity + difficulty**. Branded prizes stack freely. So the winning shape is: **one strong overall entry** that *happens* to satisfy 2–3 branded prizes as a side effect — not a Frankenstein built to hit sponsors.

**Candidate lanes (ranked by expected value given "amazing design system" as the team edge):**
1. **Memetics ($1k, winner-takes-all, vague brief, small field)** + ElevenLabs/Gemini branded. Design-heavy, story-heavy; low competition. Risk: "memetics" is under-specified — need to pin what Calcifer means (ask at their booth *tonight*).
2. **Data Viz ($800, precise rubric)** — rubric is a checklist we can hit deterministically; custom anywidget = design-system showcase. Risk: it's a *notebook*, not an app; overall-prize "polish" reads differently. Could pair with a companion web app but that doubles scope.
3. **Healthcare/Forge ($2k)** — biggest cash but contingent on cohort + most crowded. Only if the idea is genuinely healthcare-native.

**Avoid:** Solana, SpaceXAI (forces Cursor + Grok), Snowflake — tooling tax with no design upside.

## Open questions for the grilling
- What does Calcifer mean by "memetics"? (booth question — do this first)
- Is the product a web app (design system shines) or a notebook (rubric shines)? Can't be both in 36 h.
- Which 1 branded prize is a *free* add-on to the idea vs. a distraction?
- Demo format: table-side demo, ~3 min. What is the *one* interaction judges must see?
