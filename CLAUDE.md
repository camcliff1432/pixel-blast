# Pixel Blast — rules for anyone (or any Claude) working here

Two people build this, each with their own Claude: **Cam** (`camcliff1432`) and **Gabe**
(`halesandgabe`). Run `git config user.name` to see whose session you are in. This file is the
agreement between them. The live task list is at the bottom and in [TASKS.md](TASKS.md).

## What the game is (decided 2026-11-10)

- **Story mode is the game.** The level screen is home. It is meant to be hard.
- **Mini-games are where players earn coins** to spend on continues and boosters in story. They
  live behind "More Modes". Line, Aim, Echo, Plinko, Sand, Boss, Strict, Duel, Endless and
  Sandstorm are all mini-games in this sense.
- The current build is an HTML prototype. The shipping game will be a Cocos Creator port
  ([docs/COCOS_PORT.md](docs/COCOS_PORT.md)), going to Google Play first, then the App Store, then
  TikTok ([ROADMAP.md](ROADMAP.md)).

## Who owns what

Work inside your own area freely. In someone else's area, do not edit: add a line to TASKS.md for
them instead, or have your person ask theirs.

| Area | Owner | Files |
| --- | --- | --- |
| Story mode: levels, generator, special pixels, level screen, splash, tutorial | Gabe | `src/story.js`, `sim/story.js`, `docs/STORY.md`, `Pixel-Blast.md`, and in `index.html`: `drawLevels`, `drawIntro`, `drawTut`, `startTutorial`, `tutStep`, `tutCheck` |
| Mini-games and shooting models (Line, Aim, Echo, Plinko), the earn-then-spend idea | Cam | `sim/agency.js`, and in `src/core.js`: `aimAt`, `updateEmplaced`, `echoTargets`, `aimShoot`, `stepBall`, `updateBalls`, `dropBall`, `stepDrop`, `updateDrops` |
| Store, legal and launch docs | Cam | `ROADMAP.md`, `docs/COCOS_PORT.md`, `docs/PLAYTEST.md`, `docs/APP_STORE_LISTING.md`, `docs/PRIVACY_POLICY.md`, `docs/TERMS.md` |
| Level editor | unowned, ask first | `tools/editor.html` |

### Shared files — both of you edit these, so be careful

`src/core.js` (the `DEFAULTS` block, `setPicture`, `update`, `resolveLines`, `tryFire`),
`index.html` (`start`, `finishWin`, `handleEvents`, `render`, `drawMenu`, `drawEnd`, the pointer
handlers, `saveMeta`), `src/bot.js`, `src/economy.js`, `docs/BALANCE.md`, `README.md`, `TASKS.md`.

In a shared file:

- **Add, do not rearrange.** Put new config in its own commented block at the end of `DEFAULTS`,
  new branches at the end of an `if / else if` chain, new sections at the end of a doc.
- **No drive-by changes.** Do not rename, reformat, reorder or "tidy" code you did not come to
  change. Every stray line is a merge conflict for the other person.
- **Do not change the other person's numbers** (their `DEFAULTS` values, densities, prices). Put the
  case for it in TASKS.md.
- A planned refactor will give each mode its own file so this stops hurting. Until it lands, do not
  start your own restructure of `index.html` or `core.js`.

## How to work

1. `git pull` on `main` first, every session. Re-read any file before editing it: two sessions have
   worked this tree at once before.
2. Branch from fresh `main`, named for the work, not the person: `story-level-art`,
   `mini-slingshot`. One feature per branch. Aim to merge within a few days.
3. Small commits, one change each, with a message that says why.
4. Before merging, rebase onto current `main` and run the checks below.
5. Commit, push and merge only when your person tells you to. Never force-push `main`.
6. When you start or finish something, update TASKS.md in the same commit as the work.

## Checks before you say something is done

Run all that apply, from the repo root, and report the actual output:

```
node sim/balance.js --runs 100     # classic levels. Expected: heart 74, smiley 69, fish 65, tree 65, mushroom 50, landscape 49, rocket 41 (±5)
node sim/story.js --check          # story schedule and generator. Expected: "story check ok"
node sim/story.js --rules          # special pixel rules. Expected: "rules ok"
node sim/agency.js --runs 20       # only if you touched a shooting model
python -m http.server 8137         # then open http://localhost:8137 and check the browser console is clean
```

If the classic numbers move and you did not mean them to, you broke something. If you meant them
to, update [docs/BALANCE.md](docs/BALANCE.md) in the same commit.

## Hard rules

- **`src/*.js` has no DOM in it**, and no Node-only globals (`process`, `require`) without a
  `typeof` guard. It runs in the browser, in Node for the sims, and will be translated for the port.
  An unguarded `process` once froze the game behind the splash.
- **Never change the story seeds** (`n*104729+31337` for features, `n*7919` for pictures). Changing
  either reshuffles every level for players mid-progress.
- **Do not rename save keys or fields** in `saveMeta` without migrating old saves.
- Keep the `noindex` meta tags until launch. The repo and the site are public: no secrets, keys or
  personal details in any file or commit.
- A browser test that drives the page while its tab is hidden gets no animation frames. "The button
  did nothing" can just mean nothing rendered.
- Mode flags in `Game` options must use the local `mk` in `start()`, not `modeKind`, so story runs
  stay on classic rules.

## Where to read more

- [docs/STORY.md](docs/STORY.md) and [Pixel-Blast.md](Pixel-Blast.md): how story levels are built, Gabe's gotchas and tuning notes
- [docs/BALANCE.md](docs/BALANCE.md): every measured number, including what each shooting model is worth
- [ROADMAP.md](ROADMAP.md): the path to the stores, and what each mode does
- [docs/PLAYTEST.md](docs/PLAYTEST.md): what to watch for when real people play

## Current tasks

@TASKS.md
