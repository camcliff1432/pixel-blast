#!/usr/bin/env node
// How much does the shooting decision matter?
// The same bot places the blocks in every run. Only the shot policy changes: a careful one
// against a careless one. The gap between them is the skill a shooting model actually asks for.
// A model where careless play does as well as careful play has no decision in it.
//
// Usage: node sim/agency.js [--runs 40] [--angles 16] [--level heart] [--modes belt,line,aim,echo,plinko] [--echoSpread 1]
const LEVELS = require('../src/levels.js');
const { Game, rngFrom, fullLines } = require('../src/core.js');
const { chooseMove, chooseLaunch, scorePlacement } = require('../src/bot.js');

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const runs = +opt('runs', 40), ANGLES = +opt('angles', 16), only = opt('level', null);
const MODES = opt('modes', 'belt,line,aim,echo,plinko').split(',');
const W_TAKE = +opt('wTake', 25), W_PLAN = +opt('wPlan', 3), SPREAD = +opt('echoSpread', 0);   // echo bot: weight on pixels taken now, and on building toward lines that still have pixels

// Pixels a shooter of this color would take from this slot: its own color, from the outside in,
// until a pixel of another color gets in the way.
function lineRun(g, color, slot) {
  const N = g.N, side = Math.floor(slot / N), k = slot % N;
  let n = 0;
  for (let s = 0; s < N; s++) {
    let x, y;
    if (side === 0) { x = k; y = s; } else if (side === 1) { x = N - 1 - s; y = k; }
    else if (side === 2) { x = N - 1 - k; y = N - 1 - s; } else { x = s; y = N - 1 - k; }
    const c = g.pic[y][x];
    if (!c) continue;
    if (color === '*' || c === color) n++; else break;
  }
  return n;
}
// Play a volley on a copy of the picture and count what it would take.
function tryVolley(g, qi, angle) {
  const sh = Object.create(g);
  sh.pic = g.pic.map(r => r.slice());
  sh.queue = g.queue.map(s => Object.assign({}, s));
  sh.balls = []; sh.pending = []; sh.shotsFired = 0; sh.score = 0;
  sh.launchX = g.launchX; sh.volleyT = 0; sh.emit = () => {};
  if (sh.aimShoot(qi, angle) !== 'ok') return 0;
  for (let t = 0; sh.volleyActive() && t < 12; t += 0.05) sh.updateBalls(0.05);
  return sh.shotsFired;
}
// Echo: what this placement's clear would take, played out on a copy of the picture.
// The shooters are the cleared blocks plus whatever is banked, firing down the echoed lines.
function echoTake(g, p, gx, gy) {
  const b = g.board.map(r => r.slice());
  for (const [x, y] of p.sh) b[gy + y][gx + x] = p.color;
  const { rows, cols } = fullLines(b);
  if (!rows.length && !cols.length) return 0;
  const ammo = {}, seen = new Set(), N = g.N;
  for (const s of g.queue) ammo[s.color] = (ammo[s.color] || 0) + s.ammo;
  const add = (x, y) => { const k = y * g.BN + x; if (!seen.has(k)) { seen.add(k); ammo[b[y][x]] = (ammo[b[y][x]] || 0) + g.ammoPerBlock; } };
  for (const y of rows) for (let x = 0; x < g.BN; x++) add(x, y);
  for (const x of cols) for (let y = 0; y < g.BN; y++) add(x, y);
  const pic = g.pic.map(r => r.slice()), slots = g.echoTargets(rows, cols).slots;
  let took = 0, progress = true;
  while (progress) {
    progress = false;
    for (const slot of slots) {
      const side = Math.floor(slot / N), k = slot % N;
      for (let s = 0; s < N; s++) {
        let x, y;
        if (side === 0) { x = k; y = s; } else if (side === 1) { x = N - 1 - s; y = k; }
        else if (side === 2) { x = N - 1 - k; y = N - 1 - s; } else { x = s; y = N - 1 - k; }
        const c = pic[y][x];
        if (!c) continue;
        const use = ammo[c] > 0 ? c : ammo['*'] > 0 ? '*' : null;
        if (use) { ammo[use]--; pic[y][x] = null; took++; progress = true; }
        break;
      }
    }
  }
  return took;
}
// Echo's only aiming is where you clear, so the careful player is one who places for the shot.
function chooseEchoMove(g) {
  const r = g.remaining(), pend = g.pendingAmmo(), need = {};
  for (const c of g.colors) need[c] = (r[c] || 0) - (pend[c] || 0);
  // How many pixels still sit in the picture lines each board row and column answers to.
  const dRow = Array(g.BN).fill(0), dCol = Array(g.BN).fill(0);
  for (let py = 0; py < g.N; py++) for (let px = 0; px < g.N; px++) if (g.pic[py][px]) {
    dRow[Math.floor(py * g.BN / g.N)]++; dCol[Math.floor(px * g.BN / g.N)]++;
  }
  let best = null;
  for (let i = 0; i < 3; i++) {
    const p = g.tray[i];
    if (!p) continue;
    for (let y = 0; y < g.BN; y++) for (let x = 0; x < g.BN; x++) {
      if (!g.fits(p.sh, x, y)) continue;
      let plan = 0;
      for (const [dx, dy] of p.sh) plan += dRow[y + dy] + dCol[x + dx];
      const s = scorePlacement(g, p, x, y, need) + W_TAKE * echoTake(g, p, x, y) + W_PLAN * plan;
      if (!best || s > best.s) best = { i, x, y, s };
    }
  }
  return best;
}
// Drop a ball on a copy of the picture and count what it would break. The bounce jitter comes from
// a fixed stream here, not the game's own, so this is a good guess at the real drop rather than a replay.
function tryDrop(g, qi, x) {
  const sh = Object.create(g);
  sh.pic = g.pic.map(r => r.slice());
  sh.queue = g.queue.map(s => Object.assign({}, s));
  sh.drops = []; sh.shotsFired = 0; sh.score = 0; sh.shotsLost = 0; sh.emit = () => {};
  sh.envRng = rngFrom(12345);
  if (sh.dropBall(qi, x) !== 'ok') return 0;
  for (let t = 0; sh.drops.length && t < 10; t += 0.05) sh.updateDrops(0.05);
  return sh.shotsFired;
}
const stateKey = g => g.countPixels() + '|' + g.queue.map(s => s.color + s.ammo).join(',') + '|' + g.emplaced.length;

// One shooting decision, if the policy wants one. Returns true when it acted.
function shoot(g, mode, careful, rnd) {
  if (!g.queue.length || mode === 'echo') return false;   // echo fires by itself; its skill is in the placement
  if (mode === 'belt') {
    if (!careful) return false;                       // careless belt = auto-launch, set in cfg
    const li = chooseLaunch(g);
    return li >= 0 && g.launch(li) === 'ok';
  }
  if (mode === 'line') {
    if (!careful) {
      const qi = Math.floor(rnd() * g.queue.length), slot = Math.floor(rnd() * g.lap);
      return g.aimAt(qi, slot) === 'ok';
    }
    let best = null;
    for (let qi = 0; qi < g.queue.length; qi++) for (let slot = 0; slot < g.lap; slot++) {
      if (g.emplaced.some(e => e.slot === slot)) continue;
      const v = Math.min(g.queue[qi].ammo, lineRun(g, g.queue[qi].color, slot));
      if (v > 0 && (!best || v > best.v)) best = { qi, slot, v };
    }
    return !!best && g.aimAt(best.qi, best.slot) === 'ok';
  }
  if (mode === 'plinko') {
    if (g.drops.length >= g.cfg.plinkoMax) return false;
    if (!careful) return g.dropBall(0, rnd() * g.N) === 'ok';
    const key = stateKey(g) + '|' + g.drops.length;
    if (g._held === key) return false;
    let best = null;
    for (let qi = 0; qi < g.queue.length; qi++) for (let c = 0; c < g.N; c++) {
      const v = tryDrop(g, qi, c + 0.5);
      if (v > 0 && (!best || v > best.v)) best = { qi, x: c + 0.5, v };
    }
    if (!best) { g._held = key; return false; }
    return g.dropBall(best.qi, best.x) === 'ok';
  }
  // aim
  if (g.volleyActive()) return false;
  const lo = -Math.PI + 0.15, hi = -0.15;
  if (!careful) return g.aimShoot(0, lo + rnd() * (hi - lo)) === 'ok';
  const key = stateKey(g);
  if (g._held === key) return false;                  // already looked: nothing worth firing yet
  let best = null;
  for (let qi = 0; qi < g.queue.length; qi++) for (let a = 0; a < ANGLES; a++) {
    const angle = lo + (a + 0.5) / ANGLES * (hi - lo);
    const v = tryVolley(g, qi, angle);
    if (v > 0 && (!best || v > best.v)) best = { qi, angle, v };
  }
  if (!best) { g._held = key; return false; }
  return g.aimShoot(best.qi, best.angle) === 'ok';
}

function play(level, seed, mode, careful) {
  const g = new Game(level, { seed, lineAim: mode === 'line', freeAim: mode === 'aim', echo: mode === 'echo', echoSpread: SPREAD, plinko: mode === 'plinko', autoLaunch: mode === 'belt' && !careful });
  const rnd = rngFrom(seed ^ 0x51ed270b);
  let decisions = 0;
  while (g.time < 600 && g.status === 'play') {
    const m = mode === 'echo' && careful ? chooseEchoMove(g) : chooseMove(g);
    if (m) g.placePiece(m.i, m.x, m.y);
    for (let t = 0; t < 1.2 && g.status === 'play'; t += 0.05) {
      if (shoot(g, mode, careful, rnd)) decisions++;
      g.update(0.05);
    }
    g.drain();
  }
  return { won: g.status === 'won', time: g.time, moves: g.moves, shots: g.shotsFired, lost: g.shotsLost, decisions };
}

const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const pct = x => (x * 100).toFixed(0).padStart(3) + '%';
const levels = LEVELS.filter(l => !only || l.id === only);
const t0 = Date.now();
console.log(`Shot-decision value · ${runs} runs/level · same placement bot throughout\n`);
console.log('mode   policy    ' + levels.map(l => l.id.slice(0, 6).padStart(7)).join('') + '    mean   med moves   px/decision   shots lost');
const summary = {};
for (const mode of MODES) {
  for (const careful of [true, false]) {
    const perLevel = [], moves = [];
    let shots = 0, decisions = 0, lost = 0, games = 0;
    for (const lv of levels) {
      let won = 0;
      for (let s = 0; s < runs; s++) {
        const r = play(lv, 1000 + s, mode, careful);
        if (r.won) { won++; moves.push(r.moves); }
        shots += r.shots; decisions += r.decisions; lost += r.lost; games++;
      }
      perLevel.push(won / runs);
    }
    const mean = perLevel.reduce((a, b) => a + b, 0) / perLevel.length;
    summary[mode + (careful ? 'C' : 'R')] = mean;
    // belt + careless is auto-launch, which makes its launches inside core, so decisions are not counted here
    const ppd = decisions ? (shots / decisions).toFixed(1) : '  -';
    console.log(mode.padEnd(6), (careful ? 'careful ' : 'careless').padEnd(9), perLevel.map(w => pct(w).padStart(7)).join(''),
      '  ', pct(mean), '  ', String(med(moves) == null ? '-' : med(moves)).padStart(6), '     ', String(ppd).padStart(6), '       ', (lost / games).toFixed(1).padStart(5));
  }
}
console.log('\nWhat careful shooting is worth (mean first-try win rate, careful minus careless):');
for (const mode of MODES) {
  const gap = (summary[mode + 'C'] - summary[mode + 'R']) * 100;
  console.log(`  ${mode.padEnd(6)} ${gap >= 0 ? '+' : ''}${gap.toFixed(0)} points`);
}
console.log(`\n(${((Date.now() - t0) / 1000).toFixed(1)}s)`);
