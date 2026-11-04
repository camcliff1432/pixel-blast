# Pixel Blast

A puzzle game prototype that combines **Pixel Flow** with **Block Blast**.

Place blocks on an 8×8 board. Every cleared row or column turns its blocks into colored shooters. Send the shooters around a conveyor belt to knock pixels off a pixel-art picture. Clear the picture to win, and jam the board to lose.

## Play it

Open `index.html` in any browser. It's a single file with no build step or install.

- **Desktop:** drag pieces with the mouse, and click a queued shooter to launch it.
- **Phone:** the same, by touch. It's built for a portrait screen.

## What's in the prototype

- **Core loop:** each cleared block becomes one shot of its color. Clearing 2+ lines at once gives ×1.5 ammo, and a single-color line adds +4 shots.
- **Belt:** holds up to 5 shooters. A shooter hits the first pixel it can see from its side, but only if the colors match. Shooters with leftover shots return to the queue (6 slots).
- **5 levels:** Heart, Smiley, Fish, Tree, Landscape. There's also an Endless mode.
- **Meta-progression (light):**
  - The picture album fills in as you clear pictures.
  - Coins come with a win-streak multiplier (×1 → ×3).
  - Boosters: Rainbow shooter (hits any color, 30 coins) and Shuffle tray (20 coins).
  - Shuffle & continue when the board jams. If you leave instead, your streak resets.
  - Progress saves to the browser's localStorage.

## Status

This is a rough prototype for testing whether the mechanic is fun. The numbers (ammo, coin rewards, belt size) aren't balanced yet.

See [ROADMAP.md](ROADMAP.md) for the plan from prototype to the App Store and TikTok Mini Games.

## Project layout

```
index.html    the whole game (HTML canvas + vanilla JS)
README.md     this file
ROADMAP.md    steps to publish on iOS and TikTok
```
