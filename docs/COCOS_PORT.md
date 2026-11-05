# Porting Pixel Blast to Cocos Creator

Why: TikTok stopped accepting HTML mini games on 28 August 2026, retired the online HTML games on
4 September and deleted legacy HTML data on 30 September. The supported engines are Cocos, LayaAir
and Unity. The HTML prototype cannot ship there in any form, and a Cocos project also builds the
iOS target, so one port covers both stores.

Do this port **while the game is small**. It is 2,004 lines today. Every screen added to
`index.html` before the port is a screen rebuilt twice.

## The one rule

`src/core.js` must never import anything from Cocos. It has no DOM references today (verified:
`document`, `window`, `canvas` and `localStorage` appear nowhere in `src/core.js`, `src/bot.js`,
`src/economy.js` or `src/levels.js`), and that is the single property that makes this port a
translation instead of a rewrite. Keep the engine out of it and the next port — Unity, a web build,
a server-side daily-puzzle validator — stays cheap too.

## What moves, and what gets thrown away

| File | Lines | Fate |
| --- | --- | --- |
| `src/core.js` | 485 | → `core.ts`, near-literal. Classes, `Math.imul`, spread, `Object.assign` all survive TypeScript as-is. Strip the IIFE wrapper for `export`. |
| `src/bot.js` | 154 | → `bot.ts`. Only `getCore()` changes, to an import. Keep it: it powers the editor's difficulty rating and every sim. |
| `src/economy.js` | 21 | → `economy.ts`. A plain object; add types. |
| `src/levels.js` | 90 | → `levels.json` + a `Level` interface. Phase 1 of the roadmap wants JSON anyway. |
| `sim/*.js` | 136 | Stay as Node scripts, pointed at the compiled output. **They are the port's regression test.** |
| `index.html` | 733 | **Thrown away.** Canvas drawing, layout, input and meta-progression all become scene nodes and components. |
| `tools/editor.html` | 385 | Stays a plain web page. It only needs `core` and `bot` as a browser bundle, not the engine. |

So: 750 lines translate, 733 get rebuilt, 385 stay where they are.

## The view layer is already specified

`core` emits an event per thing worth animating and the view drains them each frame. The port's
rendering work is exactly "draw these fifteen events", and the list will not grow during the port:

`place` · `clear` · `fire` · `fall` · `spent` · `returned` · `lost` · `blocked` · `regrow` ·
`spawn` · `surge` · `buried` · `jam` · `won` · plus `launch`

`index.html`'s `handleEvents()` is the reference implementation of each one. Read it as a spec, not
as code to copy.

## Target setup

- **Cocos Creator 3.8.x**, 2D, TypeScript. As of late 2026 the current stable line is 3.8.x
  (3.8.8, December 2025, with 3.8.9 in development); COCOS 4 and the PinK IDE are still alpha, so a
  game meant to ship belongs on 3.8. Confirm the version in the Cocos Dashboard before installing.
- One scene, with Menu / Game / Overlay as prefabs. A game this size does not need scene loading.
- Canvas at the prototype's 400×780 design resolution, fit-height, plus a `SafeArea` node for the
  HUD so the score and ☰ clear a notch.

### Two engine-specific decisions to make up front

1. **Do not render the picture as one node per pixel.** A 32×32 picture is 1,024 nodes, plus the
   board and belt, and that is where frame time goes on a mid-range phone. Draw the picture into a
   single `Texture2D` and update pixels on `fire` / `fall` / `regrow` / `spawn`, or use one
   `Graphics` node. The 8×8 board is 64 nodes and can stay nodes.
2. **Use the `Button` component for anything that spends coins.** `Button` fires on touch-up;
   the prototype's hand-rolled hit test fires on touch-down, which means a mis-touch spends 30–120
   coins with no confirmation. The port fixes that for free if you use the component.

## Phases

Each phase ends somewhere you can stop.

**P0 — Baseline.** Record `node sim/balance.js --runs 100` and `node sim/economy.js` output for a
fixed seed set. This is what the port has to reproduce. *(Node 26 LTS is installed; the current
numbers are in `BALANCE.md`.)*

**P1 — Logic, in TypeScript, with no engine.** Translate core/bot/economy/levels, point the sims at
the build, and assert the port is exact: **same seed + same move list must give the same score,
pixel count and status.** `fairPieces` makes this a real equality test rather than a statistical
one — that is the second reason it exists. Do not open Cocos until this passes.

**P2 — It draws.** Cocos project renders board, picture, belt, queue and tray from a `Game`
instance. No input, no animation. `game.update(dt)` on a clamped dt (the prototype clamps to 0.05;
keep that or the belt teleports after a backgrounded tab).

**P3 — It plays.** Drag-and-drop placement, tap-to-launch. Keep the prototype's touch offset — it
lifts a dragged piece about 34px above the finger so your thumb does not cover it. Ugly but
playable is the milestone.

**P4 — It feels like something.** The fifteen events wired to effects, toasts, and the audio and
haptics that do not exist yet at all.

**P5 — Screens.** Menu, album, win/lose, boosters, streak, coins. Build the album as a `ScrollView`
from the start: the prototype's fixed layout runs off the bottom of the canvas at nine levels, and
the plan calls for 30–50.

**P6 — Modes.** Sand, Boss, Strict, Endless, Sandstorm, Duel. All of this is already in `core`, so
it is menu wiring, not game logic.

**P7 — Save.** `sys.localStorage`, same JSON shape. Three fixes to make while you are in there:
key the album by `level.id` instead of `level.name` (renaming a picture currently wipes progress),
decide whether Endless should fill the album (it does today), and validate the loaded blob —
a corrupt save currently gives you `NaN` coins forever.

**P8 — Device.** Web build in a browser, then a real phone.

**P9 — iOS.** Cocos → native iOS project → Xcode, which needs macOS. No Mac here, so either a
GitHub Actions macOS runner off the repo or Codemagic. Signing needs the Apple Developer account,
which is why enrolment is the first thing on the list that is not code.

**P10 — TikTok.** Cocos has no TikTok build target. Build the **Douyin Mini Game** target
(Project → Build, Platform → Douyin Mini Game, fill in the appid; output lands in a
`bytedance-mini-game` folder), then hand-adjust the entry file, package structure and resource
loading per TikTok's migration guide, add `minigame.config.json`, the Mini Games SDK init, TikTok
Login and TikTok's rewarded ads. Debug with TikTok DevTool on a real phone. Note that Douyin mini
game packages are **not** loaded on demand — the whole package, engine included, loads at once, so
watch the package size from P2 onward rather than at the end.

## What not to do

- Do not fix `index.html`'s menu overflow, album keying or touch-down spending. Those are listed
  above as P5 and P7 work in the engine you are keeping. Fixing them twice is the thing this
  document exists to prevent.
- Do not bring `window.__pb` along. It has `clearPic()` in it.
- Do not let the view drive the logic. `game.update(dt)` stays the only clock, or replays,
  duels and the daily puzzle all stop working.
- Do not re-tune balance mid-port. Freeze the numbers at P0 and tune once the port is exact.

## Rough effort

Assuming no prior Cocos experience and AI-assisted work:

| | |
| --- | --- |
| P1 logic + regression test | 1–2 days |
| P2–P4 view layer | 1–2 weeks |
| P5–P7 screens, modes, save | ~1 week |
| P9 iOS pipeline | 2–5 days, mostly signing |
| P10 TikTok package | 3–5 days |

The long pole is not the port. It is the 30–50 levels, the original art and the sound, none of
which exist yet, and all of which are what App Store review guideline 4.3 looks at.

## References

- [TikTok · Migrate from HTML to Native Runtime](https://developers.tiktok.com/docs/en/migrate-from-html-to-native-runtime)
- [TikTok · Build Mini Games With Cocos](https://developers.tiktok.com/docs/en/build-mini-games-with-cocos)
- [TikTok · Mini Games Technical Overview](https://developers.tiktok.com/docs/en/mini-games-technical-overview)
- [Cocos · Publish to Douyin Mini Games](https://docs.cocos.com/creator/manual/en/editor/publish/publish-bytedance-mini-game.html)
- [Cocos · Use TypeScript](https://docs.cocos.com/creator/3.3/manual/en/scripting/typescript.html)
