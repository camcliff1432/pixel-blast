# Pixel Blast — working notes (Gabe branch)

Full feature write-up for Cam: docs/STORY.md. This file is gotchas and numbers.

## Story progression (src/story.js, sim/story.js)
- Size bands: 1–5 → 5×5, 6–29 → 6×6, 30–49 → 7×7, 50–99 → 8×8, 100–149 → 9×9, then +1 size every 50 levels (cap 32).
- Any level number not in `ART` is generated and shows a GENERATED chip. Replace by adding `ART[n] = { name, rows }` at that level's size.
- Cam's 7 pictures: hand-shrunk copies at levels 1, 3, 8, 15, 25, 35, 45; full size at 151, 157, 163, 171, 177 (10×10) and 251, 261 (12×12). Every-10th levels are left generated so the hard-level rule still applies there.
- Feature windows open at band midpoints (17, 40, 75, 125, 175, …, +50) — single features F H S X * # K C, then pairs from 375, triples from 775. Gold separate: n ≥ 51, n % 3 = 0, not on intros.
- Feature placement seed is `n*104729+31337`; the picture generator uses `n*7919`. Changing either reshuffles every level for players mid-progress.

## Gotchas
- Never reference `process` (or other Node-only globals) in `src/*.js` without a `typeof` guard: in the browser it throws, kills the rAF loop, and the game freezes behind the splash. (Happened once with a `process.env.NOFEAT` debug switch.)
- Headless Edge via CDP only advances frames around screenshots; "button did nothing" in a CDP test can just mean no frame was rendered.
- Two Claude sessions have worked this tree at once (same branch, nothing committed). Re-read files before editing.

## Tuning findings (bot, 2026-11-10)
- Bot win rate barely responds to color count; size and pixel count dominate. So 5×5 levels 2–5 are capped at 2 colors, and hard levels get +2 colors plus 80–100% density.
- At 100 runs: levels 1–5 win 90–96% first try; 6×6 band 75–88%; hard levels 8–15 pts under neighbours.
- Feature densities cut after bot runs: board ice 7 cells cost ~18 pts (capped at 5 base); key/lock .12 cost ~29 pts (now .07); hidden .30 → .22; stone .12 → .10.
- Frozen = own color only. `remaining()` counts 1 + ice per frozen pixel so `pickColor` deals enough of that color; without that, frozen levels starve.
- Weakest spots: the no-feature curve is ~30–40% around 250 and 425–450; level 425 win+3cont ~85–93%.
