#!/usr/bin/env node
// Story report: runs the bot on story levels. Usage: node sim/story.js --from 1 --to 60 --runs 40 [--every 1]
//   node sim/story.js --check     # self-check of the level schedule and generator
//   node sim/story.js --rules     # asserts for the special pixel rules in src/core.js
const S = require('../src/story.js');
const { KEYS, Game } = require('../src/core.js');
const { evaluate } = require('../src/bot.js');

const featOf = lv => { const m = new Set((lv.mods || []).join('') + (lv.boardIce ? '#' : '')); return [...'FHSX*#KLCG'].filter(c => m.has(c)).join('').replace('L', m.has('K') ? '' : 'L'); };
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? +args[i + 1] : def; };

if (args.includes('--check')) {
  const assert = require('assert');
  const sizes = { 1: 5, 5: 5, 6: 6, 29: 6, 30: 7, 49: 7, 50: 8, 99: 8, 100: 9, 149: 9, 150: 10, 200: 11, 2000: 32 };
  for (const n in sizes) assert.strictEqual(S.sizeFor(+n), sizes[n], 'size ' + n);
  for (let n = 1; n <= 300; n++) {
    const a = S.level(n), N = S.sizeFor(n), px = a.rows.join('').replace(/\./g, '');
    assert.deepStrictEqual(a, S.level(n), 'deterministic ' + n);
    assert.ok(a.generated === !S.ART[n] && a.id === 'story-' + n && a.rows.length === N, 'shape ' + n);
    assert.ok(a.rows.every(r => r.length === N && [...r].every(c => c === '.' || (c !== 'D' && KEYS.includes(c)))), 'letters ' + n);
    if (a.generated) assert.strictEqual(new Set(px).size, S.colorsFor(n), 'colors ' + n);
  }
  const L = 'FHSX*#KC', win = (n, k) => k < 8 ? [L[k]] : k < 16 ? [L[k - 8], L[(k - 7) % 8]] : [L[(k - 16) % 8], L[(k - 15) % 8], L[(k - 14) % 8]];
  const starts = [17, 40, 75, 125, 175, 225, 275, 325], seen = {};
  for (let n = 1; n <= 900; n++) {
    const a = S.level(n), f = featOf(a), k = n < 17 ? -1 : n < 40 ? 0 : n < 75 ? 1 : n < 125 ? 2 : 3 + Math.floor((n - 125) / 50);
    if (n <= 600) assert.deepStrictEqual(a, S.level(n), 'determinism ' + n);
    assert.strictEqual(a.intro, starts.includes(n) ? L[starts.indexOf(n)] : undefined, 'intro ' + n);
    assert.ok(starts.includes(n) || !a.intro, 'intro only at midpoints ' + n);
    if (k < 0) assert.ok(!a.mods && !a.boardIce, 'none below 17 ' + n);
    if (n < 51) assert.ok(!f.includes('G'), 'no gold below 51 ' + n);
    if (a.intro) assert.ok(!f.includes('G'), 'no gold on intro ' + n);
    assert.ok(!a.mods || !a.generated === !!S.ART[n], 'art flag ' + n);
    if (k >= 0) {
      const w = new Set(win(n, k)); w.add('G');
      assert.ok([...f].every(c => w.has(c)), 'features outside window ' + n + ' ' + f);
      for (const c of f) (seen[k] = seen[k] || new Set()).add(c);
    }
    if (!a.mods && !a.boardIce) { assert.ok(!a.intro, 'intro without features ' + n); continue; }
    const N = a.rows.length, px = a.rows.join('').replace(/\./g, '').length, g = a.mods || a.rows.map(r => '.'.repeat(r.length));
    assert.ok(!a.mods || (a.mods.length === N && a.mods.every((r, y) => r.length === N && [...r].every((c, x) => '.HFSX*CKLG'.includes(c) && (c === '.' || a.rows[y][x] !== '.')))), 'mods shape ' + n);
    const at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? null : g[y][x]);
    const hit = (x, y, blk) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { for (let u = x + dx, v = y + dy; at(u, v) !== null; u += dx, v += dy) if (blk(at(u, v))) return false; return true; });
    let stone = 0, keys = 0, locks = 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const c = g[y][x];
      if (c === 'S') stone++; else if (a.rows[y][x] !== '.') assert.ok(hit(x, y, d => d === 'S'), 'stone blocks ' + n + ' ' + x + ',' + y);
      if (c === 'K') { keys++; assert.ok(hit(x, y, d => d === 'S' || d === 'L'), 'key reachable ' + n); }
      if (c === 'L') locks++;
      if (c === 'C') assert.ok(new Set(a.rows.join('').replace(/\./g, '')).size > 1, 'chameleon needs 2 colors ' + n);
    }
    assert.ok(stone <= Math.max(1, px * .15) && stone < px, 'stone share ' + n);
    assert.ok(!locks || keys, 'locks need a key ' + n);
    if (a.boardIce) {
      const b = a.boardIce, cnt = b.join('').replace(/\./g, '').length;
      assert.ok(b.length === 8 && b.every(r => r.length === 8 && /^[.#]+$/.test(r)), 'ice shape ' + n);
      assert.ok(cnt >= 3 && cnt <= 10 && b.every(r => r.includes('.')) && [...Array(8).keys()].every(x => b.some(r => r[x] === '.')), 'ice count ' + n);
    }
  }
  for (let k = 0; k < 8; k++) assert.ok(seen[k] && seen[k].has(L[k]), 'window ' + k + ' shows its feature');
  console.log('story check ok');
  process.exit(0);
}

if (args.includes('--rules')) {
  const assert = require('assert');
  const E = '...', mk = (rows, mods, cfg) => new Game({ id: 't', rows, mods }, Object.assign({ seed: 1 }, cfg));
  const shoot = (g, color, slot, n = 1) => { const s = { color, ammo: n }; for (let i = 0; i < n; i++) g.tryFire(s, slot); return n - s.ammo; };
  const types = (g, t) => g.events.filter(e => e.type === t);
  let g;
  // hidden: outer pixel reveals at start, inner one only once exposed
  g = mk(['RRR', 'RRR', 'RRR'], ['H..', '.H.', E]);
  assert.ok(!g.hidden[0][0] && g.hidden[1][1] && types(g, 'reveal').length === 1, 'hidden corner reveals');
  assert.strictEqual(g.remaining(true).R, 8, 'knownOnly skips hidden');
  shoot(g, 'R', 1);
  assert.ok(!g.hidden[1][1] && types(g, 'reveal').some(e => e.x === 1 && e.y === 1 && e.color === 'R'), 'hidden reveals when exposed');
  // frozen (own color only): 3 matching hits crack, 4th breaks, other colors do nothing
  g = mk(['R..', E, E], ['F..', E, E]);
  assert.strictEqual(g.remaining().R, 4, 'frozen counts ice hits');
  assert.strictEqual(shoot(g, 'B', 0, 3), 0, 'wrong color ignored');
  assert.strictEqual(shoot(g, 'R', 0, 3), 3);
  assert.ok(g.ice[0][0] === 0 && g.pic[0][0] === 'R' && types(g, 'crack').length === 3 && types(g, 'fire').every(e => e.kept), 'ice cracked, pixel kept');
  assert.strictEqual(shoot(g, 'R', 0), 1); g.update(0);
  assert.ok(!g.pic[0][0] && g.status === 'won', 'frozen breaks on 4th hit');
  g = mk(['R..', E, E], ['F..', E, E], { iceAnyColor: true });
  assert.strictEqual(shoot(g, 'B', 0, 3), 3); assert.strictEqual(shoot(g, 'B', 0), 0); assert.strictEqual(shoot(g, 'R', 0), 1);
  assert.ok(!g.pic[0][0], 'iceAnyColor: any color cracks, own color breaks');
  // stone: blocks sight, uncounted, not needed to win
  g = mk(['R..', 'R..', E], ['S..', E, E]);
  assert.strictEqual(shoot(g, 'R', 0), 0); assert.strictEqual(g.exposedColors().size, 1); // only the left-side view of (0,1)
  assert.strictEqual(g.countPixels(), 1);
  assert.strictEqual(shoot(g, 'R', 10), 1); g.update(0);
  assert.ok(g.pic[0][0] && g.status === 'won', 'stone stays, level won');
  // bomb: takes neighbours (chains), spares stone
  g = mk(['RRR', 'RRR', 'RRR'], ['.X.', 'S.X', E]);
  assert.strictEqual(shoot(g, 'R', 1), 1);
  const bomb = types(g, 'bomb')[0];
  assert.ok(g.pic[0][0] === null && g.pic[1][0] === 'R' && g.pic[2][2] === null && g.pic[2][0] === 'R' && g.pic[2][1] === null, 'bomb chain cleared');
  assert.ok(bomb.cells.length === 6 && g.shotsFired === 1, 'bomb event and single shot');
  // rainbow pixel
  g = mk(['R..', E, E], ['*..', E, E]);
  assert.strictEqual(shoot(g, 'B', 0), 1); assert.ok(!g.pic[0][0], 'rainbow pixel');
  // chameleon
  g = mk(['R..', 'G..', E], ['C..', E, E]);
  g.update(2.4); assert.strictEqual(g.pic[0][0], 'R');
  g.update(0.2); assert.ok(g.pic[0][0] === 'G' && types(g, 'shift')[0].color === 'G', 'chameleon shifts');
  // key / locked
  g = mk(['RG.', E, E], ['LK.', E, E]);
  assert.ok(g.locked && shoot(g, 'R', 0) === 0 && g.exposedColors().size === 1, 'locked blocks');
  assert.strictEqual(shoot(g, 'G', 1), 1);
  assert.ok(!g.locked && types(g, 'unlock').length === 1 && g.countPixels() === 1, 'unlock');
  assert.strictEqual(shoot(g, 'R', 0), 1);
  // gold: 10 hits any color, 9 goldHit then 1 gold
  g = mk(['R..', E, E], ['G..', E, E]);
  assert.strictEqual(g.remaining().R, 0);
  assert.strictEqual(shoot(g, 'B', 0, 10), 10);
  assert.ok(types(g, 'goldHit').length === 9 && types(g, 'gold').length === 1 && types(g, 'gold')[0].coins === 3 && !g.pic[0][0], 'gold');
  assert.strictEqual(types(g, 'fire').filter(e => e.kept).length, 9);
  // board ice: counts for lines, no ammo, not mono
  g = new Game({ id: 't', rows: ['R..', E, E], boardIce: ['#.......', ...Array(7).fill('........')] }, { seed: 1 });
  assert.strictEqual(g.board[0][0], '#');
  for (let x = 1; x < 8; x++) g.board[0][x] = 'R';
  g.resolveLines();
  assert.deepStrictEqual(g.queue, [{ color: 'R', ammo: 7 }]); assert.strictEqual(types(g, 'clear')[0].mono, 0);
  assert.ok(g.board[0].every(c => !c));
  console.log('rules ok');
  process.exit(0);
}

const from = opt('from', 1), to = opt('to', 60), runs = opt('runs', 40), every = opt('every', 1);
const pct = x => (x * 100).toFixed(0).padStart(4) + '%';
console.log(['n', 'feat', 'size', 'colors', 'pixels', 'gen', 'win', 'win+3c', 'moves'].map(s => s.padEnd(7)).join(''));
for (let n = from; n <= to; n += every) {
  const lv = S.level(n), r = evaluate(lv, runs, { cfg: { autoLaunch: true } });
  const row = [n, featOf(lv), lv.rows.length, S.colorsFor(n), lv.rows.join('').replace(/\./g, '').length, lv.generated ? 'yes' : 'no', pct(r.winRate), pct(r.winRateWithContinues), r.medianMoves == null ? '-' : r.medianMoves];
  console.log(row.map(s => String(s).padEnd(7)).join(''));
}
