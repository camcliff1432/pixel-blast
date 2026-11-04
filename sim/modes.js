#!/usr/bin/env node
// Tuning for Boss and Sandstorm modes.
// Usage: node sim/modes.js [--runs 30] [--bossScale 1.0] [--stormStart 2.2]
const LEVELS = require('../src/levels.js');
const { stormLevel } = require('../src/core.js');
const { playGame, evaluate } = require('../src/bot.js');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? +args[i + 1] : d; };
const runs = opt('runs', 30);

console.log('== Boss mode (picture regrows) ==');
const { autoBossInterval, pixelCount } = require('../src/core.js');
const scale = opt('bossScale', 1);
for (const lv of LEVELS) {
  const iv = autoBossInterval(pixelCount(lv)) * scale;
  const r = evaluate(lv, runs, { thinkTime: 1.2, cfg: { boss: true, bossInterval: iv } });
  console.log(lv.id.padEnd(10), `regrow every ${iv.toFixed(1)}s`.padEnd(20), 'win', (Math.round(r.winRate * 100) + '%').padStart(4), ' w/cont', (Math.round(r.winRateWithContinues * 100) + '%').padStart(4), ' med time', r.medianTime ? Math.round(r.medianTime) + 's' : '-');
}

console.log('\n== Sandstorm (survive) ==');
const times = [], shots = [], ends = {};
for (let s = 0; s < runs; s++) {
  const lv = stormLevel(7000 + s, 12);
  const r = playGame(lv, { seed: 7000 + s, thinkTime: 1.2, maxTime: 900, cfg: { storm: true, stormStart: opt('stormStart', 2.2) } });
  times.push(r.time); shots.push(r.shotsFired); ends[r.result] = (ends[r.result] || 0) + 1;
}
const med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
console.log(`median survival ${Math.round(med(times))}s (min ${Math.round(Math.min(...times))}, max ${Math.round(Math.max(...times))}) · median pixels blasted ${med(shots)} · endings ${JSON.stringify(ends)}`);
