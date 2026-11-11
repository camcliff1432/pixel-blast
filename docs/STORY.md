# Story mode (the `Gabe` branch)

What this branch adds on top of `main`, for Cam. The rules engine (`src/core.js`) was extended, not rewritten. The seven classic levels play exactly as before: `node sim/balance.js --runs 40` gives identical numbers on both branches.

## How the game opens now

1. **Splash:** "Pixel Blast" with bouncing blocks. It switches to "Tap to Start" once the page has loaded.
2. **Tutorial:** first launch only, on a 5×5 star. It teaches dropping a block into a gap, launching, and how outer pixels hide inner ones. Replay it from More Modes > How to Play. `tutorialDone` is saved with the coins.
3. **Level screen**, the new home:
   - It shows "Level N", its status (Current Level / Cleared ✓ / Locked) and size, and the picture.
   - You move between levels by swiping, with the ‹ › buttons, or with the arrow keys.
   - Past levels can be replayed. Future levels show as a locked silhouette. You unlock the next level by beating your current one.
   - Classic modes, Endless, Sandstorm and the editor sit behind **More Modes**.

Story runs are always Classic rules with auto-launch on. The strip above the queue just reads `BELT 0/5`.

Progress is saved as `storyLevel` (the first unbeaten level) inside the existing `pixelblast-meta-v3` save, so old saves still load.

## Level progression (`src/story.js`)

`PB_STORY.level(n)` returns any level number's picture, always the same one for the same `n`.

| Levels | Picture size |
| --- | --- |
| 1–5 | 5×5 |
| 6–29 | 6×6 |
| 30–49 | 7×7 |
| 50–99 | 8×8 |
| 100–149 | 9×9 |
| 150+ | one size bigger every 50 levels (10×10 at 150, 11×11 at 200 …), up to 32×32 |

- **Within a size band, difficulty comes from colors and density.** Level 1 has one color. Each band starts at 2 colors and ramps up, and every 10th level is a hard level with extra colors and a denser picture.
- **Generated vs hand-made pictures:**
  - Pictures are generated (symmetric shapes, seeded by level number) unless the level number has an entry in `ART`.
  - Generated levels show an amber **GENERATED** chip on the level screen, so placeholders are easy to spot.
  - To replace one, draw it in `tools/editor.html` (now 5×5 to 32×32) and add `ART[n] = { name, rows }`. The rows must match that level's size.
- **What's in `ART` today:**
  - Hand-shrunk versions of the seven classic pictures at levels 1, 3, 8, 15, 25, 35 and 45.
  - The originals at full size where their size comes up: 151, 157, 163, 171, 177 (10×10) and 251, 261 (12×12).

## Special pixels

Rules live in `src/core.js`. Every hit goes through one function, `hit()`, so all modes follow the same rules.

| Pixel | Rule |
| --- | --- |
| Frozen | 3 hits of its own color crack the ice, the 4th breaks it (`iceAnyColor: false`, `iceHits: 3`) |
| Hidden | Shows a "?" until a shooter on the belt can see it, then reveals its color for good |
| Stone | Can't be broken, blocks shots, isn't needed to win |
| Bomb | Breaking it breaks its 8 neighbours (chains; spares stone and locked pixels) |
| Rainbow pixel | Any shooter color breaks it |
| Board ice | Ice blocks pre-placed on the 8×8 board; they count toward lines but give no shots |
| Key + Locked | Locked pixels can't be hit until every key pixel is broken |
| Chameleon | Changes color every 2.5 s (`chameleonSecs`) |
| Gold | 10 hits from any color (`goldHits`, `goldAnyColor`), pays 3 coins |

**Ammo:** the game counts frozen ice hits as extra need for that color, so it deals enough blocks of that color. The bot can't see hidden colors.

**Placement schedule:**
- A new feature arrives at the middle of each size band and is the only feature until the next band's middle.
- The first level of each window shows an intro card. Density ramps up through the window.

| Window starts | Features |
| --- | --- |
| 17 | Frozen |
| 40 | Hidden |
| 75 | Stone |
| 125 | Bomb |
| 175 | Rainbow pixel |
| 225 | Board ice |
| 275 | Key + Locked |
| 325 | Chameleon |
| 375 → | two at a time (FH, HS, SX, X*, *#, #K, KC, …) |
| 775 → | three at a time |

- Gold is separate from the windows. It appears on about 1 level in 3 from level 51, never on intro levels.
- Placement is deterministic from the level number, so a restart gets the same special pixels.
- `--check` guarantees every breakable pixel stays reachable.

## Device preview (desktop only)

On a computer the game sits in a phone or iPad frame on a white page. The dropdown at the top right picks Phone, iPad or Full Window, and the choice is remembered. Touch devices always get the plain full-screen game.

## Checks and tuning

```
node sim/story.js --check                       # schedule, determinism, placement constraints (levels 1-900)
node sim/story.js --rules                       # special pixel rules, one assert per rule
node sim/story.js --from 1 --to 60 --runs 100   # bot win rates per story level (feat column = features)
```

Bot first-try win rates (story runs use auto-launch):

| Levels | Size | First-try win |
| --- | --- | --- |
| 1–5 | 5×5 | 88–96% |
| 6–29 | 6×6 | ~70–88% (hard levels ~68–76%) |
| 30–124 | 7×7–9×9 | ~55–75% |
| 175–500 | 10×10 and up | ~35–55% |

With 3 continues the win rate stays at about 93% or better almost everywhere. The details are in [BALANCE.md](BALANCE.md#story-levels).
