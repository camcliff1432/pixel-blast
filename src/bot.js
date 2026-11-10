// Pixel Blast balance bot: a heuristic player used to tune levels and numbers.
// It is a decent but not perfect player. Treat its win rate as "a focused casual player".
(function (root) {
  'use strict';

  function getCore() {
    if (typeof module !== 'undefined' && module.exports) return require('./core.js');
    return root.PBCore;
  }

  // Score one placement. Higher is better.
  function scorePlacement(game, p, gx, gy, need) {
    const { fullLines } = getCore();
    const BN = game.BN;
    const b = game.board.map(r => r.slice());
    for (const [x, y] of p.sh) b[gy + y][gx + x] = p.color;
    const { rows, cols } = fullLines(b);
    const n = rows.length + cols.length;
    let value = 0;
    if (n) {
      const seen = new Set(), counts = {};
      const add = (x, y) => { const k = y * BN + x; if (!seen.has(k)) { seen.add(k); if (b[y][x] !== '#') counts[b[y][x]] = (counts[b[y][x]] || 0) + 1; } };
      for (const y of rows) for (let x = 0; x < BN; x++) add(x, y);
      for (const x of cols) for (let y = 0; y < BN; y++) add(x, y);
      const mult = (n >= 2 ? game.cfg.comboMult : 1) * game.ammoPerBlock;
      const queueRoom = game.cfg.queueSize - game.queue.length;
      let shooters = 0;
      for (const c in counts) {
        const shots = counts[c] * mult;
        const useful = Math.min(shots, Math.max(0, need[c] || 0));
        value += (useful * 3 + shots * 0.3) / game.ammoPerBlock;
        if (!(game.mergeQueue && game.queue.some(s => s.color === c))) shooters++;
      }
      if (shooters > queueRoom) value -= (shooters - queueRoom) * 15; // shots would be lost
      for (const k of seen) b[(k / BN) | 0][k % BN] = null;
    }
    // board shape: holes (empty cells boxed in) are bad, open space is good
    let holes = 0, empty = 0, sameAdj = 0;
    for (let y = 0; y < BN; y++) for (let x = 0; x < BN; x++) {
      const c = b[y][x];
      if (!c) {
        empty++;
        let blocked = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const X = x + dx, Y = y + dy;
          if (X < 0 || Y < 0 || X >= BN || Y >= BN || b[Y][X]) blocked++;
        }
        if (blocked >= 3) holes++;
      } else {
        if (x + 1 < BN && b[y][x + 1] === c) sameAdj++;
        if (y + 1 < BN && b[y + 1][x] === c) sameAdj++;
      }
    }
    // can the other tray pieces still fit afterwards?
    let stuck = 0;
    for (const q of game.tray) if (q && q !== p && !game.canPlaceAnywhere(q.sh, b)) stuck++;
    return n * 30 + value - holes * 7 + empty * 0.6 + sameAdj * 0.5 - stuck * 120;
  }

  function chooseMove(game) {
    const r = game.remaining(true), pend = game.pendingAmmo();
    const need = {};
    const rainbowShare = (pend['*'] || 0) / Math.max(1, game.colors.length);
    for (const c of game.colors) need[c] = (r[c] || 0) - (pend[c] || 0) - rainbowShare;
    let best = null;
    for (let i = 0; i < 3; i++) {
      const p = game.tray[i];
      if (!p) continue;
      for (let y = 0; y < game.BN; y++) for (let x = 0; x < game.BN; x++) {
        if (!game.fits(p.sh, x, y)) continue;
        if (game.cfg.strictQueue && game.wouldOverflowQueue(p, x, y)) continue;
        const s = scorePlacement(game, p, x, y, need);
        if (!best || s > best.s) best = { i, x, y, s };
      }
    }
    return best;
  }

  function chooseLaunch(game) {
    if (game.canLaunch() !== 'ok' || !game.queue.length) return -1;
    const exposed = game.exposedColors();
    // any shooter is useful against a rainbow pixel, gold, or (if any color cracks it) ice
    let wild = false;
    for (let i = 0; i < game.lap && !wild; i++) {
      const t = game.scanTarget(i);
      if (!t || game.blocked(t[0], t[1])) continue;
      const m = game.mods[t[1]][t[0]];
      wild = m === '*' || (m === 'G' && game.cfg.goldAnyColor) || (m === 'F' && game.ice[t[1]][t[0]] > 0 && game.cfg.iceAnyColor);
    }
    let best = -1, bestAmmo = -1;
    game.queue.forEach((s, i) => {
      if ((wild || s.color === '*' || exposed.has(s.color)) && s.ammo > bestAmmo) { best = i; bestAmmo = s.ammo; }
    });
    if (best >= 0) return best;
    // nothing hittable right now: cycle the biggest shooter only when the queue is nearly full
    if (game.queue.length >= game.cfg.queueSize - 1) {
      game.queue.forEach((s, i) => { if (s.ammo > bestAmmo) { best = i; bestAmmo = s.ammo; } });
      return best;
    }
    return -1;
  }

  // Play one game. opts: seed, thinkTime (seconds between placements), maxTime, continues, cfg overrides.
  function playGame(level, opts) {
    opts = opts || {};
    const { Game } = getCore();
    const g = new Game(level, Object.assign({ seed: opts.seed }, opts.cfg || {}));
    const think = opts.thinkTime != null ? opts.thinkTime : 1.2;
    const maxTime = opts.maxTime || 600, dt = 0.05;
    const allowContinues = opts.continues || 0;
    while (g.time < maxTime) {
      if (g.status === 'jammed') {
        if (g.continues < allowContinues) g.continueAfterJam();
        else break;
        continue;
      }
      if (g.status !== 'play') break;
      const m = chooseMove(g);
      if (m) g.placePiece(m.i, m.x, m.y);
      else if (g.cfg.strictQueue && g.queue.length) { const li = g.queue.reduce((b, q, i, a) => q.ammo > a[b].ammo ? i : b, 0); g.launch(li); } // blocked: free a slot
      for (let t = 0; t < think && g.status === 'play'; t += dt) {
        if (!g.cfg.autoLaunch) { const li = chooseLaunch(g); if (li >= 0) g.launch(li); }
        g.update(dt);
      }
      g.drain();
    }
    return {
      result: g.status === 'won' ? 'won' : g.status === 'jammed' ? 'jammed' : g.status === 'buried' ? 'buried' : 'timeout',
      shotsFired: g.shotsFired, stormDropped: g.stormDropped,
      time: g.time, moves: g.moves, lines: g.lines, continues: g.continues,
      shotsLost: g.shotsLost, pixelsLeft: g.countPixels(), total: level.rows.join('').replace(/\./g, '').length,
    };
  }

  // Summary over many seeds.
  function evaluate(level, runs, opts) {
    opts = opts || {};
    const out = { runs, won: 0, wonWithContinues: 0, contUsed: [0, 0, 0, 0], times: [], moves: [], shotsLost: 0, progress: 0 };
    for (let s = 0; s < runs; s++) {
      const seed = (opts.seedBase || 1000) + s;
      const a = playGame(level, Object.assign({}, opts, { seed, continues: 0 }));
      if (a.result === 'won') { out.won++; out.times.push(a.time); out.moves.push(a.moves); }
      out.shotsLost += a.shotsLost;
      out.progress += 1 - a.pixelsLeft / a.total;
      const b = playGame(level, Object.assign({}, opts, { seed, continues: 3 }));
      if (b.result === 'won') { out.wonWithContinues++; out.contUsed[b.continues]++; }
    }
    const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
    return {
      winRate: out.won / runs,
      winRateWithContinues: out.wonWithContinues / runs,
      continuesNeeded: out.contUsed, // among eventual wins: how many used 0,1,2,3 continues
      medianTime: med(out.times), medianMoves: med(out.moves),
      avgShotsLost: out.shotsLost / runs,
      avgProgress: out.progress / runs,
    };
  }

  const api = { playGame, evaluate, chooseMove, chooseLaunch, scorePlacement };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PBBot = api;
})(typeof self !== 'undefined' ? self : this);
