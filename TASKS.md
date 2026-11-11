# Tasks

One line per task. Edit only your own section, plus "Decide together" and "Anyone". To ask the
other person for something, add a line to **their** section starting with `(from Cam)` or
`(from Gabe)` and leave the rest of their section alone.

- `[ ]` not started · `[~]` in progress, with the branch name · `[x]` done, moved to **Done** with the date
- Mark a task `[~]` in the first commit of its branch, and `[x]` in the commit that finishes it.
- If a task touches a shared file (see CLAUDE.md), say which, so the other person can stay out of it.

## Decide together

- [ ] **Mini-game payouts.** Every win pays the same 8 coins, story or mini-game, and the mini-games are harder than Classic (Plinko 45%, Echo 40%, Aim 52% against 60%). So mini-games are not yet the place to earn coins. Options: a flat multiplier, or pay per pixel broken like Sandstorm so a lost run still earns. Touches `src/economy.js`, `finishWin`.
- [ ] **Mode registry refactor.** Give each mode its own file so new modes stop editing the same six places in `core.js` and `index.html`. Must happen on a clean `main` with no branches open on either side. Agree a day.
- [ ] **Which mini-games stay.** Ten modes sit behind More Modes. Echo tested weakest and Cam does not love it. Strict rarely changes anything. Pick what ships.
- [ ] **Name.** "Pixel Blast" is likely taken, and the More Modes menu and the README name two other companies' games. Needed before any store listing.

## Cam

- [ ] Protect `main` in GitHub: Settings → Branches → require a pull request, zero approvals. (Has to be done by hand; Claude is blocked from it.)
- [ ] Delete merged branches on GitHub: `Gabe`, `echo-mode`, `shooting-modes`. All three are fully inside `main`.
- [ ] Prototype the earn-then-spend mini-game: a timed 30-second block round whose line count becomes ammo for a slingshot round against the picture. New files where possible; will touch `start`, `drawMenu`, `DEFAULTS`.
- [ ] Aim: let the next volley fire once the last ball has launched, not landed. It is short of throughput.
- [ ] Line: one drag from the queue to an edge instead of two taps.
- [ ] Run the playtest in `docs/PLAYTEST.md` on the merged build and write up what people did.
- [ ] Paperwork from ROADMAP Track A: business entity, Apple enrolment, Google Play account.

## Gabe

Seeded from `Pixel-Blast.md`. Gabe to confirm, reorder or replace.

- [ ] Story curve: the no-feature levels win only 30–40% around 250 and 425–450.
- [ ] Replace GENERATED levels with drawn pictures (`ART[n]` in `src/story.js`).
- [ ] (from Cam) Teach the mini-games' existence in story: when a player runs out of coins, point them to More Modes.

## Anyone

- [ ] No sound anywhere yet.
- [ ] Coin buttons (continue, boosters) fire on touch-down with no confirm. One mis-touch spends 30–120 coins. `index.html` pointer handlers.
- [ ] Album progress is keyed by picture name, not id; renaming a picture loses it. `finishWin`, `drawMenu`, save data (needs a migration).
- [ ] Endless adds pictures to the album, so it unlocks them without playing them. `finishWin`.
- [ ] The `__pb` test hooks, including `clearPic()`, ship on the public site. Strip or gate before launch.
- [ ] The bot cannot play Line, Aim, Echo or Plinko outside `sim/agency.js`, so the editor's difficulty rating only describes the belt.
- [ ] Colour-blind check: the game depends on telling up to 12 colours apart on a phone.

## Done

- [x] 2026-11-10 Merged Gabe's story mode and Cam's Echo and Plinko into `main` (five conflicts, all kept both sides).
- [x] 2026-11-10 Decided: story mode is home, mini-games are for earning coins.
