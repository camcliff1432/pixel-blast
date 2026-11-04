#!/usr/bin/env node
// Balance report: runs the bot on every level and prints win rates.
// Usage:
//   node sim/balance.js                      # default settings, 100 runs per level
//   node sim/balance.js --runs 200
//   node sim/balance.js --beltCap 4 --comboMult 1.25 --think 1.5
//   node sim/balance.js --level rocket
const LEVELS = require('../src/levels.js');
const { DEFAULTS } = require('../src/core.js');
const { evaluate } = require('../src/bot.js');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const runs = +opt('runs', 100);
const think = +opt('think', 1.2);
const only = opt('level', null);
const cfg = {};
for (const k of Object.keys(DEFAULTS)) {
  const v = opt(k, null);
  if (v != null) cfg[k] = v === 'true' ? true : v === 'false' ? false : +v;
}
if (args.includes('--sand')) cfg.sand = true;

const pct = x => (x * 100).toFixed(0).padStart(4) + '%';
const pad = (s, n) => String(s).padEnd(n);
console.log(`Pixel Blast balance · ${runs} runs/level · think ${think}s · overrides ${JSON.stringify(cfg)}\n`);
console.log(pad('level', 11), pad('size', 6), pad('pixels', 7), 'win  ', 'win+3cont', pad(' cont used 0/1/2/3', 20), 'med time', ' med moves', ' shots lost', ' progress');
const t0 = Date.now();
for (const lv of LEVELS) {
  if (only && lv.id !== only) continue;
  const px = lv.rows.join('').replace(/\./g, '').length;
  const r = evaluate(lv, runs, { thinkTime: think, cfg });
  console.log(
    pad(lv.id, 11), pad(`${lv.rows.length}x${lv.rows.length}`, 6), pad(px, 7),
    pct(r.winRate), '   ', pct(r.winRateWithContinues), '   ',
    pad(r.continuesNeeded.join('/'), 17),
    pad(r.medianTime == null ? '-' : Math.round(r.medianTime) + 's', 9),
    pad(r.medianMoves == null ? '-' : r.medianMoves, 10),
    pad(r.avgShotsLost.toFixed(1), 11),
    pct(r.avgProgress),
  );
}
console.log(`\n(${((Date.now() - t0) / 1000).toFixed(1)}s)`);
