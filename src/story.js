// Pixel Blast story levels: Level n -> picture. Size sets the band, color count sets difficulty within it.
(function (root) {
  'use strict';
  const core = typeof module !== 'undefined' && module.exports ? require('./core.js') : root.PBCore;
  const { KEYS, rngFrom } = core;
  const HUES = KEYS.filter(k => k !== 'D');
  const BANDS = [[1, 5], [6, 6], [30, 7], [50, 8], [100, 9]]; // [first level, picture size]; then +1 every 50 from 150

  function bandStart(n) {
    if (n >= 100) return 100 + 50 * Math.floor((n - 100) / 50);
    return BANDS.filter(b => b[0] <= n).pop()[0];
  }
  function sizeFor(n) {
    if (n >= 150) return Math.min(32, 10 + Math.floor((n - 150) / 50));
    return BANDS.filter(b => b[0] <= n).pop()[1];
  }
  function colorsFor(n) {
    if (n === 1) return 1;
    const s = bandStart(n), len = n < 100 ? BANDS[BANDS.findIndex(b => b[0] === s) + 1][0] - s : 50;
    const top = sizeFor(n) < 6 ? 2 : sizeFor(n) < 8 ? 4 : 5, c = 2 + Math.round((top - 2) * (n - s) / (len - 1)) + (n % 10 === 0 ? 2 : 0);
    return Math.min(c, Math.floor(sizeFor(n) * sizeFor(n) / 6), HUES.length);
  }

  // Symmetric picture: a shape mask (circle/diamond/square) colored in rings or bands, mirrored left-right (sometimes 4-way).
  function generate(n) {
    const N = sizeFor(n), c = colorsFor(n), hard = n % 10 === 0;
    let rows;
    for (let attempt = 0; attempt < 99; attempt++) {
      const rng = rngFrom(n * 7919 + attempt);
      const pool = HUES.slice(), cols = Array.from({ length: c }, () => pool.splice(Math.floor(rng() * pool.length), 1)[0]);
      const four = rng() < 0.5, metric = Math.floor(rng() * 3), rings = rng() < 0.6, r = 0.7 + rng() * 0.5, wob = rng() * 0.4;
      const noise = Array.from({ length: N }, () => Array.from({ length: N }, rng));
      rows = [];
      for (let y = 0; y < N; y++) {
        let row = '';
        for (let x = 0; x < N; x++) {
          const mx = Math.min(x, N - 1 - x), my = four ? Math.min(y, N - 1 - y) : y;
          const dx = Math.abs(2 * x - N + 1) / N, dy = Math.abs(2 * y - N + 1) / N;
          const d = (metric === 0 ? Math.hypot(dx, dy) : metric === 1 ? dx + dy : Math.max(dx, dy) * 1.3) + (noise[my][mx] - 0.5) * wob;
          const t = rings ? d / r : y / N + (noise[my][mx] - 0.5) * wob;
          row += d <= r ? cols[Math.max(0, Math.min(c - 1, Math.floor(t * c)))] : '.';
        }
        rows.push(row);
      }
      const px = rows.join('').replace(/\./g, '');
      if (px.length >= N * N * (hard ? 0.8 : 0.6) && px.length <= N * N * (hard ? 1 : 0.9) && cols.every(k => px.includes(k))) break;
    }
    return rows;
  }

  // To replace a generated level, paste the editor's rows under its number: ART[12] = { name: 'Cat', rows: [...] }
  const ART = {
    1: { name: 'Heart', rows: ['.R.R.', 'RRRRR', 'RRRRR', '.RRR.', '..R..'] },
    3: { name: 'Smiley', rows: ['.YYY.', 'YBYBY', 'YYYYY', 'YBBBY', '.YYY.'] },
    8: { name: 'Fish', rows: ['......', '.BBB.Y', 'BYBBYY', 'BBBBYY', '.BBB.Y', '......'] },
    15: { name: 'Tree', rows: ['..GG..', '.GRGG.', 'GGGGRG', '.GGGG.', '..YY..', '..YY..'] },
    25: { name: 'Mushroom', rows: ['.RRRR.', 'RYRRYR', 'RRRRRR', '.YBBY.', '.YYYY.', 'GGGGGG'] },
    35: { name: 'Landscape', rows: ['BBBBBYY', 'BBBBBYY', 'BBBRBBB', 'BBRRRBB', 'BRRYRRB', 'GGGGGGG', 'GGGGGGG'] },
    45: { name: 'Rocket', rows: ['BBBRBBB', 'BBRYRBB', 'BBYYYBB', 'BBYBYBB', 'BBYYYBB', 'BRYYYRB', 'BRBYBRB'] },
  };
  // Cam's full-size pictures, placed where their size comes up in the schedule.
  const LEVELS = typeof module !== 'undefined' && module.exports ? require('./levels.js') : root.PB_LEVELS;
  const full = id => LEVELS.find(l => l.id === id);
  Object.assign(ART, { 151: full('heart'), 157: full('smiley'), 163: full('fish'), 171: full('tree'), 177: full('landscape'), 251: full('mushroom'), 261: full('rocket') });

  // Special pixels arrive at the middle of each size band; each window runs to the next midpoint (1, then 2, then 3 features at a time).
  const FEATS = 'FHSX*#KC';
  const DENS = { F: [.04, .15], H: [.05, .22], S: [.025, .10], X: [.03, .12], '*': [.03, .12], C: [.03, .08], K: [.03, .07], '#': [3, 5] }; // fraction of pixels (board ice: cells) at window start..end
  function plan(n) {
    if (n < 17) return null;
    const k = n < 40 ? 0 : n < 75 ? 1 : n < 125 ? 2 : 3 + Math.floor((n - 125) / 50);
    const start = [17, 40, 75][k] || 125 + 50 * (k - 3), end = [40, 75, 125][k] || start + 50;
    const m = k < 8 ? 1 : k < 16 ? 2 : 3, i = k < 8 ? k : k < 16 ? k - 8 : k - 16;
    return { k, start, end, feats: Array.from({ length: m }, (_, j) => FEATS[(i + j) % 8]) };
  }

  // Mods for a picture: one char per cell (see core.js), plus board ice. Deterministic from n.
  function features(n, rows) {
    const w = plan(n), intro = !!w && w.k < 8 && n === w.start, gold = n >= 51 && n % 3 === 0 && !intro;
    if (!w && !gold) return {};
    const N = rows.length, rng = rngFrom(n * 104729 + 31337), g = rows.map(r => [...r].map(() => '.'));
    const cells = [];
    rows.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.') cells.push([x, y]); }));
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
    const px = cells.length, colors = new Set(rows.join('').replace(/\./g, '')).size;
    const t = w ? (n - w.start) / (w.end - w.start) : 0, mult = [1, 1, .75, .6][w ? w.feats.length : 0] * (n % 10 === 0 ? 1.5 : 1);
    const count = (f, d = DENS[f]) => Math.max(1, Math.min(Math.floor(px * .25), Math.round(px * (d[0] + (d[1] - d[0]) * t) * mult)));
    const hittable = (x, y, blk) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      for (let a = x + dx, b = y + dy; a >= 0 && b >= 0 && a < N && b < N; a += dx, b += dy) if (blk(g[b][a])) return false;
      return true;
    });
    // every pixel in the row and column of (cx, cy) that is not blocking (and matches `only`) can still be hit
    const safe = (cx, cy, blk, only) => cells.every(([x, y]) => (x !== cx && y !== cy) || blk(g[y][x]) || (only && g[y][x] !== only) || hittable(x, y, blk));
    const put = (ch, num, blk, only, order) => {
      let done = 0;
      for (const [x, y] of (order || cells)) {
        if (done >= num) break;
        if (g[y][x] !== '.') continue;
        g[y][x] = ch;
        if (blk && !safe(x, y, blk, only)) g[y][x] = '.'; else done++;
      }
      return done;
    };
    const isS = c => c === 'S', isSL = c => c === 'S' || c === 'L';
    const inner = ([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => (rows[y + dy] || '')[x + dx] > '.');
    let boardIce;
    for (const f of w ? w.feats : []) {
      const num = intro ? Math.min(2, count(f)) : count(f);
      if (f === 'S') put('S', Math.min(num, Math.floor(px * .15)), isS);
      if (f === 'K' && put('K', Math.max(1, Math.round(num / 4)), isSL)) put('L', num, isSL, 'K');
      if (f === 'C' && colors > 1) put('C', num);
      if (f === 'H') put('H', num, null, null, cells.slice().sort((a, b) => inner(b) - inner(a)));
      if ('FX*'.includes(f)) put(f, num);
      if (f === '#') {
        const b = Array.from({ length: 8 }, () => Array(8).fill('.')), rc = Array(8).fill(0), cc = Array(8).fill(0);
        for (let i = 0, want = intro ? 3 : Math.max(3, Math.min(10, Math.round((DENS[f][0] + (DENS[f][1] - DENS[f][0]) * t) * mult))); want > 0 && i < 200; i++) {
          const x = Math.floor(rng() * 8), y = Math.floor(rng() * 8);
          if (b[y][x] === '.' && rc[y] < 7 && cc[x] < 7) { b[y][x] = '#'; rc[y]++; cc[x]++; want--; }
        }
        boardIce = b.map(r => r.join(''));
      }
    }
    if (gold) put('G', N >= 12 ? 2 : 1);
    const out = {};
    if (g.some(r => r.some(c => c !== '.'))) out.mods = g.map(r => r.join(''));
    if (boardIce) out.boardIce = boardIce;
    if (intro) out.intro = w.feats[0];
    return out;
  }

  function level(n) {
    const a = ART[n], rows = a ? a.rows : generate(n);
    return Object.assign({ id: 'story-' + n, name: a ? a.name || 'Level ' + n : 'Level ' + n, n, rows, generated: !a }, features(n, rows));
  }

  const api = { sizeFor, colorsFor, level, plan, ART };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PB_STORY = api;
})(typeof self !== 'undefined' ? self : this);
