# Roadmap: prototype → Google Play → App Store → TikTok Mini Game

## Two gates that have nothing to do with code

Everything downstream waits on these, and both have lead times measured in weeks. Start them before
writing another line.

**1. A registered business.** TikTok's Developer Portal requires an organization verified as a
registered business before you can publish anything or touch monetization. The verification itself
is reviewed in 1–3 business days; incorporating is not. Apple will let you enrol as an individual,
though an LLC is what puts a company name on the listing instead of your own.

**2. A game already shipped somewhere else.** TikTok's Industry Qualification Review — the step
that confirms you are "a legitimate mini games publisher" — asks for *a playable link to
representative work (a mini game) from another app platform*: Google Play, the App Store, WeChat
Mini App or Douyin Mini App. If that game belongs to a different entity than the verified business,
you also need both entities' registration documents sharing a legal representative, or a stamped
authorization letter from the developing entity.

So **TikTok is downstream of a store release, not parallel to it.** It does not ask for a portfolio
or a track record — one shipped, playable game is the whole bar, and it can be this one.

## The engine decision

TikTok stopped accepting HTML mini games on 28 August 2026, retired the online HTML games on
4 September and deleted legacy HTML data on 30 September. The supported engines are **Cocos,
LayaAir and Unity**. The prototype is plain HTML, so it cannot ship there in any form.

**Cocos Creator 3.8.x (TypeScript)**, because one project builds Android, iOS and the TikTok
package, and because `src/core.js` has no DOM in it and translates almost verbatim. Not COCOS 4 or
the PinK IDE — both still alpha. Unity also targets both but is heavy for a 2D puzzle, and its
larger TikTok size budget (60 MB vs 30 MB) is generous precisely because the engine is big.

The full port plan, phase by phase with a regression test, is in
**[docs/COCOS_PORT.md](docs/COCOS_PORT.md)**.

> **Windows note:** Android builds fine from Windows. iOS must be built and signed with Xcode on
> macOS — use a cloud Mac (Codemagic, or GitHub Actions macOS runners) when the time comes.

---

## Track A — paperwork, running in the background from day one

- [ ] Decide the final name (the App Store almost certainly has a "Pixel Blast"; see [docs/APP_STORE_LISTING.md](docs/APP_STORE_LISTING.md))
- [ ] Register the business entity
- [ ] **Apple Developer Program**: enrol, $99/year — the slowest of the lot, and nothing else unblocks it
- [ ] **Google Play Console**: $25 one-time. Check the current closed-testing rule for new accounts; it has applied to personal accounts and not to organizations
- [ ] **TikTok for Developers**: organization → business verification → app record
- [ ] Privacy policy and Terms on reachable public URLs. GitHub Pages needs a paid plan on a private repo, so either flip this repo public or host the two pages in a small public one
- [ ] Support URL and contact email
- [ ] Ad network account if using ads (AdMob/AppLovin on the stores; TikTok uses its own)

## Track B — the game

### Phase 0 — Validate the fun (now, in the HTML build)
- [ ] Play all seven levels on a phone; note where it feels slow, unfair or confusing
- [ ] Get 5–10 friends on the shared link and watch where they get stuck
- [ ] Decide whether the loop holds attention *before* paying for the port and 40 levels

### Phase 1 — Port to Cocos, while the game is small
Follow [docs/COCOS_PORT.md](docs/COCOS_PORT.md). 750 lines translate, 733 get rebuilt, the editor
stays a plain web page. Every screen added to `index.html` before this is a screen built twice.

### Phase 2 — Production game design
- [ ] 30–50 levels with a real curve (today: 41–74% bot win rate, drifting with pixel count rather than designed — see [docs/BALANCE.md](docs/BALANCE.md))
- [ ] Level 1 at about 95%, not 74%
- [ ] A new mechanic every ~10 levels: locked pixels, stone blocks, 2-color shooters
- [ ] Original art style and sound — **there is no audio at all today**, and the art is placeholder
- [ ] Meta: album chapters, boosters, daily puzzle (Duel's seeded piece order already does what a daily needs)
- [ ] Monetization: rewarded ads on continue, coin packs, remove-ads

This phase, not the port, is the long pole — and it is what App Store guideline 4.3 looks at.

### Phase 3 — Google Play (Android) · *this is the TikTok ticket*
- [ ] Android build from Cocos, on Windows, no Mac needed
- [ ] Store listing, content rating, data safety form
- [ ] Closed test if required, then production
- [ ] **Once live, that store link unlocks TikTok's Industry Qualification Review** — submit it immediately, it is a one-time check

### Phase 4 — iOS / App Store
- [ ] Cloud macOS build, or a Mac
- [ ] Xcode: bundle ID, signing, app icon, launch screen
- [ ] App Store Connect record (Games → Puzzle, secondary Casual)
- [ ] Screenshots at 6.9" and 6.5", description, keywords
- [ ] Age rating and App Privacy answers (ad SDKs collect data), ATT prompt if anything tracks
- [ ] TestFlight with friends, then submit — watch for 4.3 in a crowded genre

### Phase 5 — TikTok Mini Game
- [ ] Industry Qualification Review (needs Phase 3), plus General and U.S. Launch Approval
- [ ] Basic information submitted and approved — mandatory before any version review
- [ ] Build the **Douyin Mini Game** target in Cocos, then hand-adjust the entry file, package structure and resource loading; there is no TikTok build target
- [ ] `minigame.config.json` and Mini Games SDK init
- [ ] Required capabilities, which are more than login: **silent login, in-app ads, in-app purchases, home screen shortcut, revisit from profile**. Monetization is an integration requirement here, not a later decision
- [ ] Stay under **30 MB total / 4 MB main package** (non-Unity). Pictures are text rows, so 50 levels is about 50 KB — the engine and the audio are the entire budget
- [ ] No zero-byte files in the package, and no dynamically imported scripts from unrestricted sources; the code scan rejects both
- [ ] Debug on a real phone with TikTok DevTool, upload the package, preview in TikTok, submit
- [ ] Set up invoicing: payouts run through revenue settlement statements you confirm and invoice against

### Phase 6 — Launch and live ops
- [ ] Analytics: level funnel, D1/D7 retention, ad views
- [ ] Weekly content: new pictures and album chapters
- [ ] Tune difficulty from funnel data, not from the bot
- [ ] Promote with short-form clips — the belt-clearing moment is the shot

## References

- TikTok: [Mini Games Integration Workflow](https://developers.tiktok.com/docs/en/mini-games-integration-workflow)
- TikTok: [Industry Qualification Review](https://developers.tiktok.com/docs/en/industry-qualification-review)
- TikTok: [Verify Your Business](https://developers.tiktok.com/docs/en/verify-your-business)
- TikTok: [Release Your Mini Game](https://developers.tiktok.com/docs/en/submit-your-app-for-review)
- TikTok: [Mini Games Technical Overview](https://developers.tiktok.com/docs/en/mini-games-technical-overview)
- TikTok: [Migrate from HTML to Native Runtime](https://developers.tiktok.com/docs/en/migrate-from-html-to-native-runtime)
- TikTok: [Build Mini Games With Cocos](https://developers.tiktok.com/docs/en/build-mini-games-with-cocos)
- Cocos: [Publish to Douyin Mini Games](https://docs.cocos.com/creator/manual/en/editor/publish/publish-bytedance-mini-game.html)
- Apple: [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) · [Apple Developer Program](https://developer.apple.com/programs/)

---

## Game modes

**Built**
- **Classic:** clear the picture, using levels and an album.
- **Sand:** pixels above a shot pixel fall down. A toggle on the menu, or `sand: true` on a level. It changes which pixels are exposed, so the order you shoot in matters.
- **Endless:** pictures keep coming until the board jams.
- **Boss:** the picture regrows missing pixels (next to the remaining ones) every few seconds; faster on bigger pictures. A menu toggle like Sand.
- **Sandstorm:** endless survival on a 12×12 dune. New sand pixels rain in faster and faster; a jam doesn't end the run but triggers a 6-pixel sand surge; you lose when a column fills to the top. Best time is saved.
- **Strict:** a 4-slot queue with no same-color merging. If a clear would create more shooters than there are free slots, the block goes back to your hand and the rows that would clear glow red while you drag. You have to launch shooters to make room.
- **Auto-launch (setting):** shooters leave the queue by themselves, oldest first, whenever the belt has room. Toggle it on the menu or by tapping the label above the queue mid-game; it's saved. Works in every mode. Bot win rates are within a few points of careful manual launching.
- **Duel:** a mode on the menu. Pieces come from the seed instead of from how the run is going, so the same seed deals the same trays at the same move numbers to both players. Win one and "Challenge a friend" copies a link with the level and seed; your friend plays that exact game, with no continues, and has to beat your move count (time breaks ties). No server needed. It costs about 14 points of win rate against the normal adaptive piece order (see [docs/BALANCE.md](docs/BALANCE.md)), which is why it is its own mode rather than the rule everywhere.

**Ideas, roughly by effort (small → big)**
| Mode | How it plays | Why it's interesting |
| --- | --- | --- |
| Daily Puzzle | Same picture and same seed (same piece order) for everyone each day; score = moves used | A reason to open the app daily; shareable result like Wordle |
| Zen | No jams: the tray reshuffles automatically when stuck; no coins | Relaxing mode for players who just want to finish pictures |
| Mystery Picture | The picture starts gray and each pixel's color shows only when it's exposed on the outside | Reveal-the-image curiosity; pairs with the album |
| Time Rush | Clear before the timer ends; the belt speeds up as time runs low | High energy, good for short video clips |
| Move Puzzle | Hand-made levels with a fixed piece sequence and a move limit | Pure logic levels; no randomness |
| Layers | Clearing a picture reveals a second picture underneath | Bigger "payoff" levels; good for chapter finales |
| Tilt Sand | Sand mode plus a button that changes the direction gravity pulls | Combines the tilt-puzzle idea with sand |
| Paint Mode (reverse) | Shooters *add* pixels to a blank canvas to recreate a target picture | Same mechanics, opposite fantasy: creating, not destroying |
| Special pixels | Stone (2 hits), bomb (clears neighbors), key (unlocks a locked region) | Adds variety to classic levels every ~10 levels |
