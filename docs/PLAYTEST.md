# Phase 0 playtest

The point of this round is one decision: **is the core loop worth paying for the Cocos port and
40 levels?** Everything else is noise until that is answered.

Watch people play. Do not ask them whether they liked it — they will say yes. Five people watched
in person beats twenty links sent out.

## What to watch for, in order of how much it matters

**1. Does the central idea land without being told?** The mechanic is: clearing a line turns those
blocks into shooters of their colors, and a shooter only hits a pixel of its own color. That is
explained in four lines of text on the menu and nowhere else. Watch whether a new player works out
on their own that the *color* of the blocks they place decides what they can shoot. If they are
placing blocks purely to clear lines and treating the shooters as something that just happens, the
game has not taught its own idea.

**2. Do they understand that outer pixels hide inner ones?** This is the strategic layer — the
reason the order you shoot in matters. If nobody notices it, the game is a block puzzle with a
screensaver attached.

**3. Where does the first jam happen, and how do they feel about it?** The bot wins level 1 on the
first try 74% of the time, where a tutorial level should be about 95%. Expect first-timers to jam
on Heart. Watch what they do at the game-over screen: continue, retry, or quit.

**4. Do they tap the queue at all?** The queue starts empty, so for the first thirty seconds there
is nothing to tap and no feedback that tapping is a thing. Some people will never discover
launching and will wonder why nothing is happening.

**5. The strip above the queue is a button that looks like a label.** "TAP A SHOOTER TO LAUNCH ·
BELT 0/5 · auto: off" toggles auto-launch when tapped. Watch for accidental toggles, and for
whether anyone finds it deliberately.

**6. Five mode chips before they have played once.** Classic / Sand / Boss / Strict / Duel is a lot
of choice on a first screen. Watch whether anyone picks a non-Classic mode first, and whether that
goes badly.

## The economy, specifically

Starting wallet is 40 coins. A win pays 8 plus a streak multiplier. A continue costs 30, then 60,
then 120. Rainbow costs 50, Shuffle 30.

So a new player cannot afford the Rainbow booster at all, and one continue on level 1 leaves them
at 10 coins and net negative for the session. That is the intended pressure — it is where a
rewarded ad would go later — but it has never been watched on a real person. Note every time
someone wants a continue and cannot afford one; the sim puts that at about a quarter of jams.

## Questions worth asking, after they stop playing

Three, and no more:

1. What were you trying to do just then? (ask it *during*, the first time they hesitate)
2. If this were on your phone, when would you open it?
3. What did you think the coins were for?

## Not worth collecting feedback on yet

These are known and already on the roadmap. Say so up front and save everyone the time.

- **There is no sound at all.** None. Not a bug.
- The art is placeholder and the pictures are programmer-drawn.
- Seven levels, and the difficulty curve between them is not designed — it just tracks pixel count.
- No tutorial, no animations beyond the basics, no haptics.

## Reading the state mid-test

Open the browser console on the game and:

```js
__pb.state()   // level, mode, coins, streak, album, score, continues, queue length, pixels left
```

The win screen already shows moves, time and score. `docs/BALANCE.md` has what the bot does on the
same levels, which is the closest thing to a baseline for "is this person struggling more than
expected".

## After the round

If the loop holds — people get the color idea, and at least some of them ask for another level —
start [COCOS_PORT.md](COCOS_PORT.md) P1 and leave the HTML build alone.

If it does not hold, the cheapest fixes are all in level design and teaching, not in code: a real
first level at about 95%, and the shooter idea taught in the first thirty seconds rather than in a
paragraph on the menu.
