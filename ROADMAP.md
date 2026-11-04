# Roadmap: prototype → App Store + TikTok Mini Game

## The key decision: one engine for both

TikTok no longer accepts HTML mini games. As of August 28, 2026, TikTok Minis requires a native-runtime build made with **Cocos Creator, LayaAir, or Unity**. The current prototype is plain HTML, so it can't ship to TikTok as is.

**Recommendation: port the game to Cocos Creator (TypeScript).**

- One codebase builds to **iOS** (through Xcode) and to a **TikTok mini game** package.
- It's the closest fit to the current code (2D canvas logic in JS), so an AI-assisted port is realistic.
- Unity also targets both, but it's heavier for a simple 2D puzzle.

Fallback for a faster iOS-only release: wrap the existing HTML in **Capacitor**. That gets to the App Store sooner, but you'd still need the Cocos port for TikTok.

> **Windows note:** iOS apps must be built and signed with Xcode on macOS. Without a Mac, use a cloud Mac build service (Codemagic, or GitHub Actions macOS runners). Cocos and Capacitor both work with these.

---

## Phase 0 — Validate the fun (now)
- [ ] Play all 5 levels on a phone and note where it feels slow, unfair, or confusing
- [ ] Get 5–10 friends to play the shared link and watch where they get stuck
- [ ] Tune: ammo per block, combo multiplier, queue size (6), belt capacity (5), coin rewards
- [ ] Decide on the final name (check the App Store for conflicts with "Pixel Blast")

## Phase 1 — Production game design
- [ ] 30–50 levels with a difficulty curve (new mechanic every ~10 levels: locked pixels, stone blocks, 2-color shooters…)
- [ ] Level format as data (JSON) so levels are easy to add
- [ ] Meta: album chapters, win-streak multiplier, boosters, daily puzzle
- [ ] Monetization plan: rewarded ads (continue, extra booster) + optional coin packs + "remove ads"
- [ ] Original art style and sound (no copied assets from Pixel Flow or Block Blast)

## Phase 2 — Port to Cocos Creator
- [ ] Install Cocos Creator (Windows is fine for development)
- [ ] Rebuild: board, tray drag-and-drop, belt/shooters, picture grid, queue, UI screens
- [ ] Save system (local storage via Cocos `sys.localStorage`)
- [ ] Audio, haptics, animations/juice
- [ ] Test the web build in a browser, then on devices

## Phase 3 — Accounts and legal (do early; some take days)
- [ ] **Apple Developer Program**: enroll (individual, or as an LLC to show a company name), $99/year
- [ ] **TikTok for Developers**: account → create an *organization* → create an *app* in the Developer Portal
- [ ] Privacy policy page and Terms of Service page (hosted URLs; TikTok's review checks for a Terms URL)
- [ ] Support URL / contact email
- [ ] Ad network account if using ads (e.g. AdMob/AppLovin for iOS; TikTok uses its own rewarded-ad APIs)

## Phase 4 — iOS / App Store
- [ ] Get a Mac or set up cloud builds (Codemagic / GitHub Actions)
- [ ] Build the iOS project from Cocos → open in Xcode → set bundle ID, signing, app icon, launch screen
- [ ] App Store Connect: create the app record (name, subtitle, category: Games → Puzzle)
- [ ] Screenshots (6.9" and 6.5" iPhone sizes at minimum), description, keywords
- [ ] Age rating questionnaire, App Privacy ("nutrition label") answers (ads SDKs collect data!)
- [ ] If ads track users: App Tracking Transparency prompt
- [ ] In-app purchases set up in App Store Connect (if any)
- [ ] **TestFlight** beta with friends
- [ ] Submit for review (watch out for guideline 4.3 "spam/copycat": originality matters in this crowded genre)

## Phase 5 — TikTok Mini Game
- [ ] Build the TikTok mini game package from Cocos (adapt the entry file, package structure, platform config)
- [ ] Integrate the platform requirements: `minigame.config.json`, Mini Games SDK initialization, **TikTok Login**
- [ ] Rewarded ads through TikTok's monetization (enable monetization in the Developer Portal)
- [ ] Debug on a real phone with **TikTok DevTool**
- [ ] Upload the code package → preview in TikTok → submit for review
- [ ] Once Live: promote with short-form gameplay clips (the belt-clearing moment is very clip-friendly)

## Phase 6 — Launch and live ops
- [ ] Analytics: level funnel (where players quit), retention D1/D7, ad views
- [ ] Weekly content: new pictures/album chapters, events
- [ ] Iterate on difficulty from the funnel data

## References
- TikTok: [How to develop TikTok Mini Games](https://ads.tiktok.com/help/article/how-to-develop-tiktok-mini-games?lang=en)
- TikTok: [Mini Games Technical Overview](https://developers.tiktok.com/docs/en/mini-games-technical-overview)
- TikTok: [Migrate from HTML to Native Runtime](https://developers.tiktok.com/docs/en/migrate-from-html-to-native-runtime)
- TikTok: [Build Mini Games With Cocos](https://developers.tiktok.com/docs/en/build-mini-games-with-cocos)
- TikTok: [Publication stage requirements](https://developers.tiktok.com/doc/mini-games-publication-stage)
- Apple: [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Apple: [Apple Developer Program](https://developer.apple.com/programs/)

---

## Game modes

**Built**
- **Classic:** clear the picture, using levels and an album.
- **Sand:** pixels above a shot pixel fall down. A toggle on the menu, or `sand: true` on a level. It changes which pixels are exposed, so the order you shoot in matters.
- **Endless:** pictures keep coming until the board jams.
- **Boss:** the picture regrows missing pixels (next to the remaining ones) every few seconds; faster on bigger pictures. A menu toggle like Sand.
- **Sandstorm:** endless survival on a 12×12 dune. New sand pixels rain in faster and faster; a jam doesn't end the run but triggers a 6-pixel sand surge; you lose when a column fills to the top. Best time is saved.
- **Strict:** a 4-slot queue with no same-color merging. If a clear would create more shooters than there are free slots, the block goes back to your hand and the rows that would clear glow red while you drag. You have to launch shooters to make room.
- **Async Duel:** after a win, "Challenge a friend" copies a link with the level, mode and seed. Your friend gets the same piece order, no continues, and has to beat your move count (time breaks ties). No server needed.

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
