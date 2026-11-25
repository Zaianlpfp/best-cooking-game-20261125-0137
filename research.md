# Research — best-cooking-game-20261125-0137

Competition: "Make the best cooking game", $250 total, top 10 paid
(1st $60, 2nd $40, 3rd $30, 4th $25, 5th $20, 6th–10th $15).
Opened 25 Nov 2026 08:37 WIB (01:37 UTC), entries close 25 Nov 2026 20:37 WIB
(13:37 UTC), result due 2026-12-10T01:37:00Z. Entry fee FREE.
Program/v1, GitHub repo entry. 2,585 submissions at 11:05 WIB 25 Nov.
Blind rounds: the current round's entry window closes 14:37 WIB — aim to
submit before then so the entry is judged in the current round.

## Judge (from competition.yaml + RULES.txt, read 25 Nov 11:0x WIB)

- Judge = AI model z-ai/glm-5.3-flash (house model "superbot"), pairwise,
  no ties, margin 1–5. Ranked by pick rate across pairwise games.
- Criteria, in order:
  1. Complete cooking game shown in the screenshots — kitchen + order board,
     ingredients on the counter, one dish mid-assembly, a timer, a plate
     ready to serve.
  2. Fun / depth — orders that push route planning, recipes that combine
     differently, pressure that grows.
  3. Feel / polish — chopping and plating answer at once, a timer you can
     feel, the rush readable at a glance.
  4. Look / originality — food worth serving, readable counters, an own
     look; copying a commercial game loses.
  5. Structure — source split into files with one clear job each, named for
     what they do.
- Judge view capped at 1,536 tokens: ONE JPEG contact sheet (cover large on
  top, others small beneath) + source outline (file paths, sizes, first
  declarations). **Screenshots dominate the verdict.**
- Dev heat: each valid entry plays 12 games vs 4 fixed house games + rungs;
  provisional rate = expected win rate vs the house games with a 90% CI.
  Final heat = TOP 40 on the dev board only (3 Swiss rounds + playoff top 12);
  cut entries are never paid. The starter handed in unchanged plays as house
  game #2 — an entry must be clearly better than the starter.
- Text addressed to the judge in a screenshot or a source file is allowed.
- Screenshots: 3–4, each ≤256 KiB, PNG/JPEG, long side ≤1280, short side ≥480;
  first by name = cover. dossier.json byte-for-byte what buildDossier writes
  (≤1.5 MiB; source text cap 160 KiB). game/ ≤993 files/dirs, 48 MiB;
  index.html ≤1 MiB; every reference a `data:` URI or a file inside game/;
  no network. main.ts (Node 22, stdlib only, 10 s, no network, read-only
  /bot, /output writable) runs twice, both runs byte-identical.
- Repo must be created at/after opening, public GitHub, OSI license.
  Owner Zaianlpfp = the account's GitHub login, so no .makefun/owner.json.
- Transcript gate (non-strict comp — `record` returns HTTP 400, so the entry
  uploads a bundle): thinking_in_window (all timestamps between opening
  01:37 UTC and receipt), thinking_reproduces ≥30% authored lines and ≤40%
  unwritten, entrypoint ≥1 authored line, thinking_revised (some file revised
  in ≥2 assistant messages), thinking_turns ≥5 assistant turns with text,
  transcripts_run_record (prompt = Kinasih's own opening prompt verbatim,
  system prompt uploaded as a real file — "withheld" NEVER allowed),
  handed_over_places = none. Starter lines excluded from counted lines.
  thinking_own_work: no other entry's files, no ≥100 downloaded lines / 40%.
- No eval/new Function, no service worker, no cookies on the hosted site.
  An image byte-identical to another account's earlier entry = copy.

## What the dossier shows (and what to optimise for)

The judge sees the contact sheet FIRST and the source outline second, inside
1,536 tokens. So: the cover screenshot must carry all five criterion-1
elements in ONE frame (kitchen, order board, ingredients on the counter, a
dish mid-assembly, a timer, a plate ready to serve). The other three shots
each prove one of criteria 2–4: a chop in progress (feel), a serve with a
score popup (fun/depth payoff), a late-shift rush with 4 tickets and a
burning wok (growing pressure). File names must say what they do
(`config.js`, `recipes.js`, `world.js`, `input.js`, `audio.js`, `render.js`,
`shots.js`, `main.js`) because the outline shows paths + first declarations.

## Patterns from previous game entries

- `entries/best-game-01` (submitted 16 Nov 01:18 WIB): the starter itself
  (Block Dodger, paddle + falling blocks + coins). Plays as house game #2.
  Lesson: a reskinned starter is the floor, not the bar.
- `entries/best-stealth-game-20261121-1759` ("The Midnight Archive"):
  dev rate 0.981521 but SCREENED OUT, rank 192/4,841 — missed the top-40
  cut by 1 place. Lesson: a high dev win rate does NOT save an entry that
  the dev board ranks below the cut; the screenshots + dossier are what the
  pairwise judge compares, and the final heat only takes the top 40.
- `entries/threejs-fps-01`: 3D via a vendored library — heavy, and the judge
  view still reduces it to one contact sheet. Lesson: 2D canvas with a
  strong, readable cover beats 3D that the judge never really sees.

## Design decision: "DAPUR KILAT — Warung Rush"

Original 2D canvas cooking game, Indonesian warung kitchen — an own look
(nobody else submits an Indonesian warung), readable counters, all five
criterion-1 elements in the cover frame.

- 5 recipes, each combining ingredients differently:
  Nasi Goreng 120 (Nasi[cook] + Telur[cook] + Kecap + Cabai[chop]),
  Mie Goreng 100 (Mie[cook] + Telur[cook] + Sayur[chop]),
  Sate Ayam 90 (Ayam[chop+cook] + Kecap),
  Ayam Geprek 140 (Ayam[chop+cook] + Cabai[chop] + Nasi[cook]),
  Es Teh Manis 60 (Teh + Es, no prep — the fast order).
- Stations: 9 ingredient bins, talenan (chop, hold E 1.2 s), 2 wajan
  (cook 3 s, burns after +6 s → trash), piring (plating), jendela saji
  (serve), tong sampah. Carry ONE item — forces route planning.
- Tickets every ~14 s → 8 s, lifetime 70 s → 45 s, max 4 open, 3 hearts
  (a missed ticket costs a heart), 180 s shift. Score = base + time bonus
  (remaining s × 2) + combo ×(1 + 0.1×streak, cap ×2).
- Controls: WASD/arrows, E/Space/click interact, click-to-move, R restart,
  P pause, M mute. Audio: WebAudio synth only, no files.
- Canvas 1280×720. Top bar: logo, shift timer, coins/score, combo, hearts.
  Order board: up to 4 ticket cards with countdown bars. Kitchen below.
  Bottom bar: held item, plate, hints, message feed.
- Screenshots (1280×720 JPEG, real renders via `?shot=<name>&seed=1`,
  `window.__shotReady`): 1-cover.jpg (mid-rush, all five required elements
  in one frame), 2-chop.jpg (chopping in progress), 3-serve.jpg (serve with
  score popup), 4-rush.jpg (late shift, 4 tickets, burning wok, 1 heart).
  Shot scenes are staged by playing the real rules forward from a seeded
  fresh world with a scripted autopilot, so every frame is a reachable state.

## Risks

- The cover must not look like the starter or any commercial game (Overcooked
  is the obvious comparison — the warung theme, Indonesian recipes and the
  single-carry + hold-to-chop rules are the differentiators; the layout is
  our own).
- 2,585 submissions already: the field is crowded, so the cover has to read
  at contact-sheet size — big ticket cards, big timer, high contrast.
- Blind-round cutoff 14:37 WIB: hand the entry to the parent well before
  that so it can be committed, pushed and submitted in the current round.
