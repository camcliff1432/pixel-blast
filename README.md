# Pixel Blast

A puzzle game prototype that combines **Pixel Flow** with **Block Blast**.

Place blocks on an 8×8 board. Every cleared row or column turns its blocks into colored shooters. Send the shooters around a conveyor belt to knock pixels off a pixel-art picture. Clear the picture to win, and jam the board to lose.

## Play it

Open `index.html` in a browser. There's no build step or install.

- Drag pieces onto the board; tap or click a queued shooter to launch it.
- Built for a portrait phone screen; works with a mouse too.
- First launch runs a short tutorial; replay it from More Modes > How to Play.

## Story levels

The game opens on your current numbered level (`src/story.js`). Picture size grows with the level number, and most pictures are generated placeholders, marked GENERATED on the level screen. To replace one, make it in the editor and add its rows to `ART` in `src/story.js` under that level number. `node sim/story.js --check` checks the levels; `node sim/story.js --from 1 --to 60` shows the difficulty curve. Special pixels (frozen, hidden, stone, bomb, rainbow, board ice, key/locked, chameleon, gold) arrive mid-band from level 17. Full write-up: [docs/STORY.md](docs/STORY.md).

## Make levels

Open `tools/editor.html` (or use the "Level editor" link on the game's menu):

- Paint pixels on a 5×5 to 32×32 grid with 12 colors, or **import an image**: it snaps to the game colors (pick how many, 2–12). Changing the size rebuilds from the image.
- **Simulate bot games** for an instant difficulty rating (Easy / Medium / Hard), in Classic or Sand mode.
- **Play-test** the level in the game, then copy the level code into `src/levels.js`.

## Tune the balance (needs Node.js)

```
node sim/balance.js --runs 100           # win rate per level
node sim/balance.js --beltCap 4          # try a different setting
node sim/economy.js                      # does the coin economy hold up?
```

Latest results are in [docs/BALANCE.md](docs/BALANCE.md).

## Project layout

```
index.html              the game (canvas rendering, input, meta-progression)
src/core.js             all game rules, no drawing; seeded so runs are reproducible
src/levels.js           level data (pictures as text rows)
src/economy.js          every price and reward
src/bot.js              heuristic player used for balancing and the editor's difficulty check
tools/editor.html       level editor + image-to-pixel converter
sim/balance.js          per-level win-rate report
sim/economy.js          coin-flow simulation over a play session
sim/modes.js            Boss and Sandstorm tuning
docs/BALANCE.md         latest balance + economy numbers
docs/PLAYTEST.md        what to watch for in a Phase 0 playtest
docs/COCOS_PORT.md      how the port to Cocos Creator goes, phase by phase
docs/APP_STORE_LISTING.md   draft store copy, keywords, privacy-label notes
docs/PRIVACY_POLICY.md  draft (template, not legal advice)
docs/TERMS.md           draft (template, not legal advice)
ROADMAP.md              plan to Google Play, the App Store and TikTok
```

## Status

This is a prototype for checking that the mechanic is fun, and the art is placeholder. The economy has been tightened: a win pays 8 coins plus a streak bonus, and continues cost 30, then 60, then 120, with at most 3 per level. See the roadmap for what's next.
