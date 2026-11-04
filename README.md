# Pixel Blast

A puzzle game prototype that combines **Pixel Flow** with **Block Blast**.

Place blocks on an 8×8 board. Every cleared row or column turns its blocks into colored shooters. Send the shooters around a conveyor belt to knock pixels off a pixel-art picture. Clear the picture to win, and jam the board to lose.

## Play it

Open `index.html` in a browser. There's no build step or install.

- Drag pieces onto the board; tap or click a queued shooter to launch it.
- Built for a portrait phone screen; works with a mouse too.

## Make levels

Open `tools/editor.html` (or use the "Level editor" link on the game's menu):

- Paint pixels on an 8×8 to 16×16 grid, or **import an image** and it snaps to the game colors.
- **Simulate 40 bot games** for an instant difficulty rating (Easy / Medium / Hard).
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
docs/BALANCE.md         latest balance + economy numbers
docs/APP_STORE_LISTING.md   draft store copy, keywords, privacy-label notes
docs/PRIVACY_POLICY.md  draft (template, not legal advice)
docs/TERMS.md           draft (template, not legal advice)
ROADMAP.md              plan to the App Store and TikTok Mini Games
```

## Status

This is a prototype for checking that the mechanic is fun, and the art is placeholder. The economy has been tightened: a win pays 8 coins plus a streak bonus, and continues cost 30, then 60, then 120, with at most 3 per level. See the roadmap for what's next.
