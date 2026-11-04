// Pixel Blast economy: every price and reward in one place.
// Run `node sim/economy.js` to see how coins flow over a simulated play session.
(function (root) {
  const ECON = {
    startCoins: 40,
    winBase: 8,                   // coins for clearing a level
    streakStep: 0.25,             // +25% per consecutive win...
    streakCap: 2,                 // ...up to x2
    endlessPerPicture: 4,
    // Escalates each time you continue in the same level; max 3.
    // Sim (sim/economy.js, 40 bot players x 30 attempts): wallet stays ~flat (42 -> 65),
    // ~8 continues bought per 23 levels, and ~24% of jams the player wants a continue
    // but can't afford it (future rewarded-ad / purchase moment).
    // The old values (win 20, continue 20) let the wallet grow 60 -> 825.
    continueCosts: [30, 60, 120],
    booster: { rainbow: 50, shuffle: 30 },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = ECON;
  else root.PB_ECON = ECON;
})(typeof self !== 'undefined' ? self : this);
