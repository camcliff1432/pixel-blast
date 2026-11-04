// Pixel Blast game core: all rules, no drawing or input.
// Used by the game (index.html), the level editor and the balance bot.
// Deterministic for a given seed, so balance runs are reproducible.
(function (root) {
  'use strict';

  // Game colors. Pictures and blocks use these letters. '*' is the rainbow shooter (hits any color).
  const PALETTE = {
    R: '#ef4444', // red
    O: '#f97316', // orange
    Y: '#facc15', // yellow
    G: '#22c55e', // green
    T: '#14b8a6', // teal
    B: '#3b82f6', // blue
    P: '#a855f7', // purple
    K: '#f472b6', // pink
    N: '#92603b', // brown
    L: '#f5f0e6', // light / white
    A: '#9ca3af', // gray
    D: '#3f4654', // dark
  };
  const KEYS = Object.keys(PALETTE);
  const COLOR_NAMES = { R: 'Red', O: 'Orange', Y: 'Yellow', G: 'Green', T: 'Teal', B: 'Blue', P: 'Purple', K: 'Pink', N: 'Brown', L: 'Light', A: 'Gray', D: 'Dark' };
  const RAINBOW = '*';

  const SHAPES = [
    [[0, 0]],
    [[0, 0], [1, 0]], [[0, 0], [0, 1]],
    [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [0, 2]],
    [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [0, 2], [0, 3]],
    [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
    [[0, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]], [[1, 0], [0, 1], [1, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 2]], [[0, 0], [1, 0], [2, 0], [0, 1]], [[0, 0], [1, 0], [1, 1], [1, 2]], [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[0, 0], [1, 0], [2, 0], [1, 1]], [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]],
  ];

  // Every tunable number lives here. The balance bot sweeps these.
  const DEFAULTS = {
    boardSize: 8,       // block board is boardSize x boardSize
    queueSize: 6,       // shooter queue slots
    mergeQueue: true,   // a new shooter joins a queued shooter of the same color instead of taking a slot
    beltCap: 0,         // max shooters on the belt at once; 0 = auto (5 up to 12x12, up to 10 at 32x32)
    lapSeconds: 0,      // time for a shooter to go once around; 0 = auto (5.7s up to 12x12, 4s at 32x32)
    launchGap: 1.3,     // min spacing between shooters, in slots at a 10x10 picture
    comboMult: 1.5,     // ammo multiplier when clearing 2+ lines at once
    monoBonus: 4,       // bonus shots for a single-color line (x ammoPerBlock)
    rainbowAmmo: 8,     // shots in a rainbow booster shooter (x ammoPerBlock)
    colorNeedBonus: 4,  // weight added to colors the picture still needs
    ammoPerBlock: 0,    // shots per cleared block; 0 = auto (1 under 150 px, else 1 per 100 px)
    sand: false,        // sand mode: pixels above a shot pixel fall down
  };

  function rngFrom(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shapeSize(sh) {
    return { w: Math.max(...sh.map(c => c[0])) + 1, h: Math.max(...sh.map(c => c[1])) + 1 };
  }
  function fullLines(board) {
    const n = board.length, rows = [], cols = [];
    for (let y = 0; y < n; y++) if (board[y].every(c => c)) rows.push(y);
    for (let x = 0; x < n; x++) {
      let f = true;
      for (let y = 0; y < n; y++) if (!board[y][x]) { f = false; break; }
      if (f) cols.push(x);
    }
    return { rows, cols };
  }
  function pixelCount(level) { return level.rows.join('').replace(/\./g, '').length; }
  function autoAmmoPerBlock(level) { const px = pixelCount(level); return px < 150 ? 1 : Math.round(px / 100); }
  // Big pictures need more belt throughput or they drag on (tested with the balance bot).
  function autoBeltCap(n) { return Math.max(5, Math.min(10, 5 + Math.round((n - 12) / 4))); }
  function autoLapSeconds(n) { return n <= 12 ? 5.7 : Math.max(4, 5.7 - (n - 12) * 1.7 / 20); }

  class Game {
    constructor(level, opts) {
      opts = opts || {};
      this.cfg = Object.assign({}, DEFAULTS, opts);
      this.seed = opts.seed != null ? opts.seed >>> 0 : Math.floor(Math.random() * 4294967296);
      this.rng = rngFrom(this.seed);
      this.events = [];
      this.BN = this.cfg.boardSize;
      this.board = Array.from({ length: this.BN }, () => Array(this.BN).fill(null));
      this.tray = [null, null, null];
      this.queue = [];
      this.belt = [];
      this.score = 0; this.lines = 0; this.moves = 0; this.time = 0;
      this.shotsFired = 0; this.shotsLost = 0; this.picsCleared = 0; this.continues = 0;
      this._id = 0;
      this.status = 'play'; // 'play' | 'won' | 'jammed'
      this.setPicture(level);
      this.refillTray();
    }

    // ----- picture -----
    setPicture(level) {
      this.level = level;
      this.N = level.rows.length;
      this.pic = level.rows.map(r => [...r].map(c => (c === '.' ? null : c)));
      this.lap = 4 * this.N;
      this.beltCap = this.cfg.beltCap || autoBeltCap(this.N);
      this.lapSeconds = this.cfg.lapSeconds || autoLapSeconds(this.N);
      this.speed = this.lap / this.lapSeconds;
      this.launchGapSlots = this.cfg.launchGap * this.N / 10;
      this.ammoPerBlock = level.ammoPerBlock || this.cfg.ammoPerBlock || autoAmmoPerBlock(level);
      this.sandMode = !!(this.cfg.sand || level.sand);
      this.colors = KEYS.filter(k => level.rows.some(r => r.includes(k)));
      if (!this.colors.length) this.colors = ['R'];
    }
    nextPicture(level) { this.setPicture(level); if (this.status === 'won') this.status = 'play'; }
    countPixels() { let n = 0; for (const r of this.pic) for (const c of r) if (c) n++; return n; }
    remaining() {
      const r = {};
      for (const k of this.colors) r[k] = 0;
      for (const row of this.pic) for (const c of row) if (c) r[c] = (r[c] || 0) + 1;
      return r;
    }
    pendingAmmo() {
      const p = { [RAINBOW]: 0 };
      for (const s of this.queue) p[s.color] = (p[s.color] || 0) + s.ammo;
      for (const s of this.belt) p[s.color] = (p[s.color] || 0) + s.ammo;
      return p;
    }

    emit(type, data) { this.events.push(Object.assign({ type }, data)); }
    drain() { const e = this.events; this.events = []; return e; }

    // ----- block board -----
    fits(sh, gx, gy, board) {
      board = board || this.board;
      for (const [x, y] of sh) {
        const X = gx + x, Y = gy + y;
        if (X < 0 || Y < 0 || X >= this.BN || Y >= this.BN || board[Y][X]) return false;
      }
      return true;
    }
    canPlaceAnywhere(sh, board) {
      for (let y = 0; y < this.BN; y++) for (let x = 0; x < this.BN; x++) if (this.fits(sh, x, y, board)) return true;
      return false;
    }
    pickColor() {
      const r = this.remaining(), p = this.pendingAmmo();
      let tot = 0;
      const w = this.colors.map(k => {
        const need = Math.max(0, (r[k] || 0) - (p[k] || 0));
        const v = need > 0 ? need + this.cfg.colorNeedBonus * this.ammoPerBlock : ((r[k] || 0) > 0 ? 3 : 0);
        tot += v; return v;
      });
      if (tot === 0) return this.colors[Math.floor(this.rng() * this.colors.length)];
      let x = this.rng() * tot;
      for (let i = 0; i < w.length; i++) { x -= w[i]; if (x < 0) return this.colors[i]; }
      return this.colors[this.colors.length - 1];
    }
    newPiece() {
      const sh = SHAPES[Math.floor(this.rng() * SHAPES.length)];
      return Object.assign({ sh, color: this.pickColor() }, shapeSize(sh));
    }
    refillTray() {
      for (let a = 0; a < 30; a++) {
        this.tray = [this.newPiece(), this.newPiece(), this.newPiece()];
        if (this.tray.some(p => this.canPlaceAnywhere(p.sh))) return;
      }
    }
    placePiece(i, gx, gy) {
      if (this.status !== 'play') return false;
      const p = this.tray[i];
      if (!p || !this.fits(p.sh, gx, gy)) return false;
      for (const [x, y] of p.sh) this.board[gy + y][gx + x] = p.color;
      this.score += p.sh.length;
      this.moves++;
      this.tray[i] = null;
      this.emit('place', { cells: p.sh.map(([x, y]) => [gx + x, gy + y]), color: p.color });
      this.resolveLines();
      if (this.tray.every(t => !t)) this.refillTray();
      this.checkJam();
      return true;
    }
    // Put a shooter in the queue (merging into a same-color one if enabled). Returns false if no room.
    enqueue(color, ammo) {
      if (this.cfg.mergeQueue) {
        const q = this.queue.find(s => s.color === color);
        if (q) { q.ammo += ammo; return true; }
      }
      if (this.queue.length >= this.cfg.queueSize) return false;
      this.queue.push({ color, ammo });
      return true;
    }
    resolveLines() {
      const { rows, cols } = fullLines(this.board);
      const n = rows.length + cols.length;
      if (!n) return;
      const B = this.board, BN = this.BN, apb = this.ammoPerBlock;
      const seen = new Set(), cells = [], counts = {}, bonus = {};
      const add = (x, y) => {
        const k = y * BN + x;
        if (!seen.has(k)) { seen.add(k); counts[B[y][x]] = (counts[B[y][x]] || 0) + 1; cells.push({ x, y, color: B[y][x] }); }
      };
      let mono = 0;
      for (const y of rows) {
        for (let x = 0; x < BN; x++) add(x, y);
        const c0 = B[y][0];
        if (B[y].every(c => c === c0)) { bonus[c0] = (bonus[c0] || 0) + this.cfg.monoBonus * apb; mono++; }
      }
      for (const x of cols) {
        for (let y = 0; y < BN; y++) add(x, y);
        const c0 = B[0][x];
        let m = true;
        for (let y = 0; y < BN; y++) if (B[y][x] !== c0) m = false;
        if (m) { bonus[c0] = (bonus[c0] || 0) + this.cfg.monoBonus * apb; mono++; }
      }
      const mult = n >= 2 ? this.cfg.comboMult : 1;
      for (const c of cells) B[c.y][c.x] = null;
      this.lines += n;
      this.score += 10 * n * n;
      const made = [];
      for (const c of Object.keys(counts)) {
        const ammo = Math.ceil(counts[c] * mult * apb) + (bonus[c] || 0);
        if (ammo > 0) made.push({ color: c, ammo });
      }
      made.sort((a, b) => b.ammo - a.ammo);
      let lost = 0;
      for (const s of made) if (!this.enqueue(s.color, s.ammo)) lost += s.ammo;
      this.shotsLost += lost;
      this.emit('clear', { cells, n, mono, mult, made, lost, bonusShots: mono * this.cfg.monoBonus * apb });
    }
    checkJam() {
      const left = this.tray.filter(Boolean);
      if (this.status === 'play' && left.length && !left.some(p => this.canPlaceAnywhere(p.sh))) {
        this.status = 'jammed';
        this.emit('jam', {});
      }
    }
    // booster / continue helpers
    shuffleTray() { if (this.status !== 'play') return; this.refillTray(); this.checkJam(); }
    continueAfterJam() {
      if (this.status !== 'jammed') return;
      this.status = 'play';
      this.continues++;
      this.refillTray();
      this.checkJam();
    }
    addShooter(color, ammo) { return this.enqueue(color, ammo); }
    addRainbow() { return this.enqueue(RAINBOW, this.cfg.rainbowAmmo * this.ammoPerBlock); }

    // ----- belt / shooters -----
    canLaunch() {
      if (this.belt.length >= this.beltCap) return 'full';
      if (this.belt.some(s => s.pos < this.launchGapSlots)) return 'gap';
      return 'ok';
    }
    launch(i) {
      if (this.status !== 'play') return 'over';
      if (i < 0 || i >= this.queue.length) return 'empty';
      const c = this.canLaunch();
      if (c !== 'ok') return c;
      const s = this.queue.splice(i, 1)[0];
      this.belt.push({ id: ++this._id, color: s.color, ammo: s.ammo, pos: 0, last: -1 });
      this.emit('launch', { color: s.color, ammo: s.ammo });
      return 'ok';
    }
    // The cell a shooter at slot i would hit (first pixel along its line of sight).
    scanTarget(i) {
      const N = this.N, side = Math.floor(i / N), k = i % N;
      for (let s = 0; s < N; s++) {
        let x, y;
        if (side === 0) { x = k; y = s; }
        else if (side === 1) { x = N - 1 - s; y = k; }
        else if (side === 2) { x = N - 1 - k; y = N - 1 - s; }
        else { x = s; y = N - 1 - k; }
        if (this.pic[y][x]) return [x, y];
      }
      return null;
    }
    // Colors a shooter could currently hit from somewhere on the belt.
    exposedColors() {
      const set = new Set();
      for (let i = 0; i < this.lap; i++) {
        const t = this.scanTarget(i);
        if (t) set.add(this.pic[t[1]][t[0]]);
      }
      return set;
    }
    // Sand mode: pixels above (x, y) fall until they land on something.
    dropColumn(x, y) {
      const falls = [];
      for (let yy = y - 1; yy >= 0; yy--) {
        const c = this.pic[yy][x];
        if (!c) continue;
        let to = yy;
        while (to + 1 < this.N && !this.pic[to + 1][x]) to++;
        if (to !== yy) {
          this.pic[to][x] = c; this.pic[yy][x] = null;
          falls.push({ x, from: yy, to, color: c });
        }
      }
      if (falls.length) this.emit('fall', { falls });
    }
    tryFire(s, i) {
      if (s.ammo <= 0) return;
      const t = this.scanTarget(i);
      if (!t) return;
      const [x, y] = t;
      const pcolor = this.pic[y][x];
      if (s.color !== RAINBOW && pcolor !== s.color) return;
      this.pic[y][x] = null;
      s.ammo--;
      this.shotsFired++;
      this.score += 5;
      this.emit('fire', { slot: i, x, y, color: s.color, pcolor });
      if (this.sandMode) this.dropColumn(x, y);
    }
    update(dt) {
      if (this.status !== 'play') return;
      this.time += dt;
      for (const s of this.belt) {
        s.pos += this.speed * dt;
        const slot = Math.min(Math.floor(s.pos), this.lap - 1);
        while (s.last < slot) { s.last++; this.tryFire(s, s.last); }
      }
      for (let i = this.belt.length - 1; i >= 0; i--) {
        const s = this.belt[i];
        if (s.ammo <= 0) {
          this.belt.splice(i, 1);
          this.emit('spent', { pos: s.pos, color: s.color });
        } else if (s.pos >= this.lap) {
          this.belt.splice(i, 1);
          if (this.enqueue(s.color, s.ammo)) this.emit('returned', { color: s.color, ammo: s.ammo });
          else { this.shotsLost += s.ammo; this.emit('lost', { color: s.color, ammo: s.ammo }); }
        }
      }
      if (this.countPixels() === 0) {
        this.picsCleared++;
        this.status = 'won';
        this.emit('won', {});
      }
    }
  }

  const api = { Game, PALETTE, KEYS, COLOR_NAMES, RAINBOW, SHAPES, DEFAULTS, fullLines, shapeSize, rngFrom, pixelCount, autoAmmoPerBlock, autoBeltCap, autoLapSeconds };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PBCore = api;
})(typeof self !== 'undefined' ? self : this);
