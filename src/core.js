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
    sandLapMult: 1.5,   // sand mode: belt is this much slower
    sandMergeQueue: false, // sand mode: same-color shooters do NOT merge (merging made it too easy)
    autoLaunch: false,  // setting: shooters leave the queue on their own (oldest first) whenever the belt has room
    strictQueue: false, // strict mode: you can't clear lines if the new shooters won't fit in the queue
    strictQueueSize: 4, // strict mode: smaller queue, and no same-color merging (bot: ~10-20 pts harder)
    boss: false,        // boss mode: the picture regrows missing pixels over time
    bossInterval: 0,    // seconds between regrown pixels; 0 = auto from picture size
    storm: false,       // sandstorm: endless, sand pixels rain in from the top (implies sand)
    stormStart: 2.0,    // seconds between new sand pixels at the start
    stormAccel: 0.99,   // interval multiplier after each new pixel (speeds up)
    stormMin: 0.2,      // fastest interval (bot survives ~3.5 min median with these)
    stormSurge: 6,      // sandstorm: a jammed board reshuffles the tray but drops this many extra pixels
    // Duel mode. Pieces come from a seeded sequence that does not depend on how the run is going,
    // so the same seed gives the same trays at the same move numbers, and two players can be
    // compared. Colors stay weighted toward the picture, but frozen at its start instead of
    // re-read after every shot, which costs the bot ~13 points of win rate (see docs/BALANCE.md).
    // Off here, so normal play keeps the adaptive pick; index.html turns it on for Duel runs.
    // Also turn it on to replay a run exactly: same seed + same moves = same game.
    fairPieces: false,

    // ---- shooting models. Default (both off) is the belt: shooters circle and fire at whatever
    // they happen to see, which is why automating it barely changes the bot's win rate. ----
    lineAim: false,     // Line: you pick the row or column a shooter fires down, and it empties into it
    lineFireGap: 0.26,  // seconds between shots from an emplaced shooter
    linePatience: 1.2,  // if it cannot hit anything for this long, unused ammo goes back to the queue
    echo: false,        // Echo: no aiming step. The board line you clear fires down the same line of the picture,
                        // and anything it cannot use is banked in the queue until your next clear
    echoPatience: 0.5,  // seconds an echo shooter waits with nothing to hit before banking its ammo
    echoSpread: 0,      // extra picture lines either side of the echoed band (0 = exact; see sim/agency.js for what 1 does)
    freeAim: false,     // Aim: drag to set an angle, the shooter's ammo fires as a bouncing volley
    ballSpeed: 11,      // picture cells per second
    ballGap: 0.07,      // seconds between balls in one volley
    ballLife: 7,        // a ball gives up after this long, so a bad angle cannot stall the game
    ballBounceOnKill: true, // a matching pixel is destroyed and the ball bounces off it (Ballz-style)

    // ---- special pixels ----
    iceAnyColor: false, // frozen pixels: true = any shooter color cracks the ice, false = only the matching color
    iceHits: 3,         // cracks a frozen pixel takes before it is a normal pixel
    chameleonSecs: 2.5, // a chameleon pixel moves to the next color this often
    goldCoins: 3,       // coins reported by the 'gold' event when a gold pixel breaks
    goldHits: 10,       // hits a gold pixel takes to break
    goldAnyColor: true, // gold pixels: any shooter color hits them (false = only the matching color)
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
  // A stream of its own for piece number n (attempt a of a reshuffle), mixed so that neighbouring
  // indexes are unrelated. Piece n is the same for everyone on this seed, whatever they have played.
  function pieceRng(seed, n, a) {
    let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
    h = Math.imul(h ^ (n + 1), 0xc2b2ae35);
    h = Math.imul(h ^ ((a + 1) * 0x27d4eb2f), 0x165667b1);
    const r = rngFrom((h ^ (h >>> 15)) >>> 0);
    r(); // warm up: the first draw of a fresh stream tracks its seed too closely
    return r;
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
  // Boss regrow speed: ~1 pixel every 3.5s on a 60-pixel picture, faster on bigger ones.
  function autoBossInterval(px) { return Math.max(0.35, 3.5 * Math.sqrt(60 / Math.max(1, px))); }
  // Sandstorm starting picture: a random dune along the bottom.
  function stormLevel(seed, n, colors) {
    const rng = rngFrom(seed), cols = colors || ['R', 'Y', 'G', 'B'];
    const rows = Array.from({ length: n }, () => Array(n).fill('.'));
    for (let x = 0; x < n; x++) {
      const h = 2 + Math.floor(rng() * 3) + Math.round(Math.sin(x / n * Math.PI) * 2);
      for (let y = n - h; y < n; y++) rows[y][x] = cols[Math.floor(rng() * cols.length)];
    }
    return { id: 'sandstorm', name: 'Sandstorm', rows: rows.map(r => r.join('')) };
  }
  function autoBeltCap(n) { return Math.max(5, Math.min(10, 5 + Math.round((n - 12) / 4))); }
  function autoLapSeconds(n) { return n <= 12 ? 5.7 : Math.max(4, 5.7 - (n - 12) * 1.7 / 20); }

  class Game {
    constructor(level, opts) {
      opts = opts || {};
      this.cfg = Object.assign({}, DEFAULTS, opts);
      if (this.cfg.strictQueue) this.cfg.queueSize = this.cfg.strictQueueSize;
      this.seed = opts.seed != null ? opts.seed >>> 0 : Math.floor(Math.random() * 4294967296);
      this.rng = rngFrom(this.seed);            // pieces, when cfg.fairPieces is off
      this.pieceNo = 0;                         // fair pieces: index into the seeded piece sequence
      this.envRng = rngFrom(this.seed ^ 0x9e3779b9); // boss regrowth / sandstorm, kept separate so pieces stay in sync
      this.events = [];
      this.BN = this.cfg.boardSize;
      this.board = Array.from({ length: this.BN }, () => Array(this.BN).fill(null));
      this.tray = [null, null, null];
      this.queue = [];
      this.belt = [];
      this.emplaced = [];   // Line mode: shooters parked on a slot, emptying into their line
      this.balls = [];      // Aim mode: balls in flight, in picture-cell coordinates
      this.pending = [];    // Aim mode: balls of the current volley not yet launched
      this.score = 0; this.lines = 0; this.moves = 0; this.time = 0;
      this.shotsFired = 0; this.shotsLost = 0; this.picsCleared = 0; this.continues = 0;
      this._id = 0;
      this.status = 'play'; // 'play' | 'won' | 'jammed' | 'buried'
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
      this.stormMode = !!this.cfg.storm;
      this.sandMode = !!(this.cfg.sand || level.sand || this.stormMode);
      this.bossMode = !!(this.cfg.boss || level.boss) && !this.stormMode;
      const md = level.mods || [];
      this.mods = this.pic.map((r, y) => r.map((c, x) => { const m = c && (md[y] || '')[x]; return m && m !== '.' ? m : null; }));
      this.hidden = this.mods.map(r => r.map(m => m === 'H'));
      this.ice = this.mods.map(r => r.map(m => (m === 'F' ? this.cfg.iceHits : 0)));
      this.goldHp = this.mods.map(r => r.map(m => (m === 'G' ? this.cfg.goldHits : 0)));
      this.locked = this.hasMod('K');
      this.chamT = 0;
      (level.boardIce || []).forEach((r, y) => [...r].forEach((c, x) => { if (c === '#' && !this.board[y][x]) this.board[y][x] = '#'; }));
      this.original = level.rows.map(r => [...r].map(c => (c === '.' ? null : c)));
      this.bossTimer = 0;
      this.bossInterval = this.cfg.bossInterval || autoBossInterval(pixelCount(level));
      this.stormTimer = 0; this.stormInterval = this.cfg.stormStart; this.stormDropped = 0;
      this.launchX = this.N / 2; this.volleyT = 0;
      if (this.emplaced) { this.emplaced.length = 0; this.balls.length = 0; this.pending.length = 0; }
      this.lapSeconds = (this.cfg.lapSeconds || autoLapSeconds(this.N)) * (this.sandMode ? this.cfg.sandLapMult : 1);
      this.mergeQueue = this.sandMode ? this.cfg.sandMergeQueue : this.cfg.strictQueue ? false : this.cfg.mergeQueue;
      this.speed = this.lap / this.lapSeconds;
      this.launchGapSlots = this.cfg.launchGap * this.N / 10;
      this.ammoPerBlock = level.ammoPerBlock || this.cfg.ammoPerBlock || autoAmmoPerBlock(level);
      this.colors = KEYS.filter(k => this.pic.some((r, y) => r.some((c, x) => c === k && this.mods[y][x] !== 'S')));
      if (!this.colors.length) this.colors = ['R'];
      // Fair pieces: the same weighting pickColor() would use on the untouched picture, frozen here.
      // It depends only on the level, so two players on one seed draw the same colors all run.
      const tally = {};
      Object.assign(tally, this.remaining());
      this.colorWeights = this.colors.map(k => (tally[k] || 0) + this.cfg.colorNeedBonus * this.ammoPerBlock);
      this.colorWeightTotal = this.colorWeights.reduce((a, b) => a + b, 0) || 1;
      this.expose();
    }
    nextPicture(level) { this.setPicture(level); if (this.status === 'won') this.status = 'play'; }
    hasMod(m) { return this.mods.some(r => r.includes(m)); }
    // Stone and still-locked pixels can't be hit and block line of sight.
    blocked(x, y) { const m = this.mods[y][x]; return m === 'S' || (m === 'L' && this.locked); }
    countPixels() { let n = 0; this.pic.forEach((row, y) => row.forEach((c, x) => { if (c && this.mods[y][x] !== 'S') n++; })); return n; }
    // Shots still needed per color: ice and gold hits count too when only the own color pays them. Stone never counts; knownOnly skips hidden pixels.
    remaining(knownOnly) {
      const r = {};
      for (const k of this.colors) r[k] = 0;
      this.pic.forEach((row, y) => row.forEach((c, x) => { const m = this.mods[y][x]; if (c && m !== 'S' && !(knownOnly && this.hidden[y][x])) r[c] = (r[c] || 0) + (m === 'G' ? (this.cfg.goldAnyColor ? 0 : this.goldHp[y][x]) : m === 'F' && !this.cfg.iceAnyColor ? 1 + this.ice[y][x] : 1); }));
      return r;
    }
    pendingAmmo() {
      const p = { [RAINBOW]: 0 };
      for (const s of this.queue) p[s.color] = (p[s.color] || 0) + s.ammo;
      for (const s of this.belt) p[s.color] = (p[s.color] || 0) + s.ammo;
      for (const s of this.emplaced) p[s.color] = (p[s.color] || 0) + s.ammo;
      for (const s of this.pending) p[s.color] = (p[s.color] || 0) + 1;
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
    // Piece number n of this seed's sequence (attempt a > 0 = a reshuffled tray). Reads no run state.
    fairPiece(n, a) {
      const r = pieceRng(this.seed, n, a);
      const sh = SHAPES[Math.floor(r() * SHAPES.length)];
      let x = r() * this.colorWeightTotal, color = this.colors[this.colors.length - 1];
      for (let i = 0; i < this.colors.length; i++) {
        x -= this.colorWeights[i];
        if (x < 0) { color = this.colors[i]; break; }
      }
      return Object.assign({ sh, color }, shapeSize(sh));
    }
    refillTray() {
      for (let a = 0; a < 30; a++) {
        this.tray = this.cfg.fairPieces
          ? [this.fairPiece(this.pieceNo, a), this.fairPiece(this.pieceNo + 1, a), this.fairPiece(this.pieceNo + 2, a)]
          : [this.newPiece(), this.newPiece(), this.newPiece()];
        if (this.tray.some(p => this.canPlaceAnywhere(p.sh))) break;
      }
      // Always 3 per refill, however many attempts it took, so the sequence stays locked to the
      // move number: refill m is pieces 3m..3m+2 for every player on this seed.
      this.pieceNo += 3;
    }
    placePiece(i, gx, gy) {
      if (this.status !== 'play') return false;
      const p = this.tray[i];
      if (!p || !this.fits(p.sh, gx, gy)) return false;
      if (this.cfg.strictQueue && this.wouldOverflowQueue(p, gx, gy)) {
        this.emit('blocked', { need: this.lastNeed, free: this.cfg.queueSize - this.queue.length });
        return false;
      }
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
    // Strict mode check: would placing this piece clear lines whose shooters can't fit in the queue?
    wouldOverflowQueue(p, gx, gy) {
      const b = this.board.map(r => r.slice());
      for (const [x, y] of p.sh) b[gy + y][gx + x] = p.color;
      const { rows, cols } = fullLines(b);
      if (!rows.length && !cols.length) return false;
      const colors = new Set();
      for (const y of rows) for (let x = 0; x < this.BN; x++) colors.add(b[y][x]);
      for (const x of cols) for (let y = 0; y < this.BN; y++) colors.add(b[y][x]);
      colors.delete('#');
      let need = 0;
      for (const c of colors) if (!(this.mergeQueue && this.queue.some(s => s.color === c))) need++;
      this.lastNeed = need;
      return need > this.cfg.queueSize - this.queue.length;
    }
    // Put a shooter in the queue (merging into a same-color one if enabled). Returns false if no room.
    enqueue(color, ammo) {
      if (this.mergeQueue) {
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
        if (!seen.has(k)) { seen.add(k); if (B[y][x] !== '#') counts[B[y][x]] = (counts[B[y][x]] || 0) + 1; cells.push({ x, y, color: B[y][x] }); }
      };
      let mono = 0;
      for (const y of rows) {
        for (let x = 0; x < BN; x++) add(x, y);
        const c0 = B[y][0];
        if (c0 !== '#' && B[y].every(c => c === c0)) { bonus[c0] = (bonus[c0] || 0) + this.cfg.monoBonus * apb; mono++; }
      }
      for (const x of cols) {
        for (let y = 0; y < BN; y++) add(x, y);
        const c0 = B[0][x];
        let m = true;
        for (let y = 0; y < BN; y++) if (B[y][x] !== c0) m = false;
        if (m && c0 !== '#') { bonus[c0] = (bonus[c0] || 0) + this.cfg.monoBonus * apb; mono++; }
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
      if (this.cfg.echo) {
        // Echo: the shooters never wait in the queue. They fire at once down the picture lines
        // that match the board lines just cleared, and whatever is banked in the queue goes too.
        const t = this.echoTargets(rows, cols);
        const ammo = {};
        for (const s of made) ammo[s.color] = (ammo[s.color] || 0) + s.ammo;
        for (const s of this.queue) ammo[s.color] = (ammo[s.color] || 0) + s.ammo;
        this.queue.length = 0;
        Object.keys(ammo).forEach((color, k) => {
          this.emplaced.push({ id: ++this._id, color, ammo: ammo[color], slots: t.slots, si: k % t.slots.length, at: t.slots[k % t.slots.length], cd: 0.1 + k * 0.07, idle: 0, echo: true });
        });
        this.emit('echo', { picRows: t.picRows, picCols: t.picCols });
      } else {
        for (const s of made) if (!this.enqueue(s.color, s.ammo)) lost += s.ammo;
      }
      this.shotsLost += lost;
      this.emit('clear', { cells, n, mono, mult, made, lost, bonusShots: mono * this.cfg.monoBonus * apb });
    }
    // Echo: which picture lines answer to these board lines. The board is 8 wide and pictures are
    // 10 or 12, so each board line owns a band of one or two picture lines; every picture line
    // belongs to exactly one board line, so nothing is out of reach. A row fires from both sides,
    // a column from top and bottom.
    echoTargets(rows, cols) {
      const N = this.N, BN = this.BN, sp = this.cfg.echoSpread, rs = new Set(), cs = new Set(), slots = [];
      for (let p = 0; p < N; p++) {
        const b = Math.floor(p * BN / N);
        for (let d = -sp; d <= sp; d++) {
          if (p + d < 0 || p + d >= N) continue;
          if (rows.includes(b)) rs.add(p + d);
          if (cols.includes(b)) cs.add(p + d);
        }
      }
      const picRows = [...rs].sort((a, b) => a - b), picCols = [...cs].sort((a, b) => a - b);
      for (const p of picRows) slots.push(3 * N + (N - 1 - p), N + p);
      for (const p of picCols) slots.push(p, 2 * N + (N - 1 - p));
      return { picRows, picCols, slots };
    }
    checkJam() {
      const left = this.tray.filter(Boolean);
      if (this.status === 'play' && left.length && !left.some(p => this.canPlaceAnywhere(p.sh))) {
        if (this.stormMode) { // no game over: the storm surges instead
          this.refillTray();
          this.emit('surge', { n: this.cfg.stormSurge });
          for (let i = 0; i < this.cfg.stormSurge && this.status === 'play'; i++) this.stormDrop();
          return;
        }
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

    // ----- Line mode: you choose the row or column -----
    // Park a queued shooter on an edge slot. It empties its ammo down that one line of sight,
    // re-scanning between shots, so it eats inward as the outer pixels come off.
    aimAt(i, slot) {
      if (this.status !== 'play') return 'over';
      if (i < 0 || i >= this.queue.length) return 'empty';
      if (slot == null || slot < 0 || slot >= this.lap) return 'badslot';
      if (this.emplaced.some(e => e.slot === slot)) return 'taken';
      const s = this.queue.splice(i, 1)[0];
      this.emplaced.push({ id: ++this._id, color: s.color, ammo: s.ammo, slot, cd: 0.12, idle: 0 });
      this.emit('aim', { color: s.color, ammo: s.ammo, slot });
      return 'ok';
    }
    updateEmplaced(dt) {
      for (let i = this.emplaced.length - 1; i >= 0; i--) {
        const e = this.emplaced[i];
        e.cd -= dt;
        if (e.cd > 0) continue;
        const before = e.ammo;
        if (e.slots) {                      // Echo: several lines to choose from, taken in turn
          for (let k = 0; k < e.slots.length && e.ammo === before; k++) {
            const slot = e.slots[(e.si + k) % e.slots.length];
            this.tryFire(e, slot);
            if (e.ammo < before) { e.at = slot; e.si = (e.si + k + 1) % e.slots.length; }
          }
        } else this.tryFire(e, e.slot);
        if (e.ammo < before) { e.cd = this.cfg.lineFireGap; e.idle = 0; }
        else {
          e.cd = 0.08;
          e.idle += dt + 0.08;
          if (e.idle >= (e.echo ? this.cfg.echoPatience : this.cfg.linePatience)) { // nothing left to hit from here: give the ammo back
            this.emplaced.splice(i, 1);
            if (this.enqueue(e.color, e.ammo)) this.emit('returned', { color: e.color, ammo: e.ammo });
            else { this.shotsLost += e.ammo; this.emit('lost', { color: e.color, ammo: e.ammo }); }
            continue;
          }
        }
        if (e.ammo <= 0) {
          this.emplaced.splice(i, 1);
          this.emit('spentAt', { slot: e.slots ? e.at : e.slot, color: e.color });
        }
      }
    }

    // ----- Aim mode: drag an angle, the ammo flies as a bouncing volley -----
    volleyActive() { return this.balls.length > 0 || this.pending.length > 0; }
    // angle in radians, measured from the launcher; the caller keeps it pointing into the picture.
    aimShoot(i, angle) {
      if (this.status !== 'play') return 'over';
      if (i < 0 || i >= this.queue.length) return 'empty';
      if (this.volleyActive()) return 'busy';
      const s = this.queue.splice(i, 1)[0];
      const sp = this.cfg.ballSpeed;
      const vx = Math.cos(angle) * sp, vy = Math.sin(angle) * sp;
      for (let n = 0; n < s.ammo; n++) {
        this.pending.push({ at: n * this.cfg.ballGap, color: s.color, x: this.launchX, y: this.N - 0.001, vx, vy });
      }
      this.volleyT = 0;
      this.emit('volley', { color: s.color, ammo: s.ammo, angle });
      return 'ok';
    }
    // One ball step. Cell walls are axis-aligned, so a hit reflects whichever axis it crossed.
    stepBall(b, dt) {
      const N = this.N;
      let left = dt;
      while (left > 1e-6) {
        const step = Math.min(left, 0.18 / Math.max(1e-6, Math.hypot(b.vx, b.vy)));
        left -= step;
        const nx = b.x + b.vx * step, ny = b.y + b.vy * step;
        if (nx < 0 || nx >= N) { b.vx = -b.vx; b.x = Math.max(0.001, Math.min(N - 0.001, nx)); continue; }
        if (ny < 0) { b.vy = -b.vy; b.y = 0.001; continue; }
        if (ny >= N) { b.dead = true; return; }            // out the bottom, like Ballz
        const cx = Math.floor(nx), cy = Math.floor(ny);
        const cell = this.pic[cy] && this.pic[cy][cx];
        if (cell) {
          const ox = Math.floor(b.x), oy = Math.floor(b.y);
          const crossedX = cx !== ox, crossedY = cy !== oy;
          const r = this.hit(cx, cy, b.color, kept => {
            b.ammoHit = (b.ammoHit || 0) + 1;
            this.shotsFired++;
            this.score += 5;
            this.emit('ballHit', Object.assign({ x: cx, y: cy, color: b.color, pcolor: cell, bx: b.x, by: b.y }, kept ? { kept } : {}));
          });
          if (r === 'block') this.emit('ballBounce', { x: cx, y: cy, bx: b.x, by: b.y });
          else if (r === 'break' && !this.cfg.ballBounceOnKill) { b.x = nx; b.y = ny; continue; }
          if (crossedY && !crossedX) b.vy = -b.vy;
          else if (crossedX && !crossedY) b.vx = -b.vx;
          else { b.vx = -b.vx; b.vy = -b.vy; }
          continue; // stay put this step; the reflected velocity carries it out next step
        }
        b.x = nx; b.y = ny;
      }
    }
    updateBalls(dt) {
      if (this.pending.length) {
        this.volleyT += dt;
        while (this.pending.length && this.pending[0].at <= this.volleyT) {
          const p = this.pending.shift();
          this.balls.push({ color: p.color, x: p.x, y: p.y, vx: p.vx, vy: p.vy, life: 0 });
        }
      }
      for (let i = this.balls.length - 1; i >= 0; i--) {
        const b = this.balls[i];
        b.life += dt;
        this.stepBall(b, dt);
        if (b.dead || b.life > this.cfg.ballLife) {
          this.balls.splice(i, 1);
          this.launchX = Math.max(0.5, Math.min(this.N - 0.5, b.x)); // launcher follows the last ball home
        }
      }
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
        if (t && !this.blocked(t[0], t[1])) set.add(this.pic[t[1]][t[0]]);
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
          const mv = (g, z) => { g[to][x] = g[yy][x]; g[yy][x] = z; };
          mv(this.pic, null); mv(this.mods, null); mv(this.hidden, false); mv(this.ice, 0); mv(this.goldHp, 0);
          falls.push({ x, from: yy, to, color: c });
        }
      }
      if (falls.length) this.emit('fall', { falls });
    }
    // A shot of `color` reaches (x, y): returns 'block' (nothing happens), 'keep' (cracked ice / gold hit,
    // pixel stays) or 'break'. `shot(kept)` is called first when the shot lands, to spend ammo and emit.
    hit(x, y, color, shot) {
      if (this.blocked(x, y)) return 'block';
      const m = this.mods[y][x], own = color === RAINBOW || this.pic[y][x] === color;
      if (m === 'F' && this.ice[y][x] > 0) {
        if (!own && !this.cfg.iceAnyColor) return 'block';
        shot(true);
        this.emit('crack', { x, y, ice: --this.ice[y][x] });
        return 'keep';
      }
      if (m === 'G') {
        if (!own && !this.cfg.goldAnyColor) return 'block';
        if (this.goldHp[y][x] > 1) {
          shot(true);
          this.emit('goldHit', { x, y, left: --this.goldHp[y][x] });
          return 'keep';
        }
      } else if (!own && m !== '*') return 'block';
      shot(false);
      this.breakCell(x, y);
      return 'break';
    }
    // Destroy (x, y); a bomb takes its 8 neighbours too (chaining), except stone and locked pixels.
    breakCell(x, y) {
      const todo = [], extra = [], all = [[x, y]];
      let key = false;
      const kill = (X, Y) => {
        const m = this.mods[Y][X];
        this.pic[Y][X] = null; this.mods[Y][X] = null; this.hidden[Y][X] = false; this.ice[Y][X] = 0; this.goldHp[Y][X] = 0;
        if (m === 'K') key = true;
        if (m === 'G') this.emit('gold', { x: X, y: Y, coins: this.cfg.goldCoins });
        return m;
      };
      if (kill(x, y) === 'X') todo.push([x, y]);
      while (todo.length) {
        const [bx, by] = todo.pop();
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const X = bx + dx, Y = by + dy;
          if (!(this.pic[Y] && this.pic[Y][X]) || this.blocked(X, Y)) continue;
          extra.push([X, Y, this.pic[Y][X]]); all.push([X, Y]);
          if (kill(X, Y) === 'X') todo.push([X, Y]);
        }
      }
      if (extra.length) this.emit('bomb', { x, y, cells: extra });
      if (key && !this.hasMod('K')) { this.locked = false; this.emit('unlock', {}); }
      if (this.sandMode) for (const [X, Y] of all) this.dropColumn(X, Y);
      this.expose();
    }
    // Hidden pixels that have come into a line of sight are revealed for good.
    expose() {
      if (!this.hidden.some(r => r.includes(true))) return;
      for (let i = 0; i < this.lap; i++) {
        const t = this.scanTarget(i);
        if (t && this.hidden[t[1]][t[0]]) { this.hidden[t[1]][t[0]] = false; this.emit('reveal', { x: t[0], y: t[1], color: this.pic[t[1]][t[0]] }); }
      }
    }
    tryFire(s, i) {
      if (s.ammo <= 0) return;
      const t = this.scanTarget(i);
      if (!t) return;
      const [x, y] = t, pcolor = this.pic[y][x];
      this.hit(x, y, s.color, kept => {
        s.ammo--;
        this.shotsFired++;
        this.score += 5;
        this.emit('fire', Object.assign({ slot: i, x, y, color: s.color, pcolor }, kept ? { kept } : {}));
      });
    }
    // Boss: bring back one missing pixel, preferring ones touching the remaining picture.
    regrow() {
      const N = this.N, near = [], any = [];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (!this.original[y][x] || this.pic[y][x]) continue;
        any.push([x, y]);
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => this.pic[y + dy] && this.pic[y + dy][x + dx])) near.push([x, y]);
      }
      const pool = near.length ? near : any;
      if (!pool.length) return;
      const [x, y] = pool[Math.floor(this.envRng() * pool.length)];
      this.pic[y][x] = this.original[y][x];
      this.emit('regrow', { x, y, color: this.pic[y][x] });
    }
    // Sandstorm: a new pixel falls into a random column; a full column buries you.
    stormDrop() {
      const N = this.N, x = Math.floor(this.envRng() * N);
      const color = this.colors[Math.floor(this.envRng() * this.colors.length)];
      if (this.pic[0][x]) { this.status = 'buried'; this.emit('buried', { x }); return; }
      let y = 0;
      while (y + 1 < N && !this.pic[y + 1][x]) y++;
      this.pic[y][x] = color;
      this.stormDropped++;
      this.emit('spawn', { x, y, color });
    }
    update(dt) {
      if (this.status !== 'play') return;
      this.time += dt;
      if (this.cfg.freeAim) this.updateBalls(dt);
      else if (this.cfg.lineAim || this.cfg.echo) this.updateEmplaced(dt);
      else {
        for (const s of this.belt) {
          s.pos += this.speed * dt;
          const slot = Math.min(Math.floor(s.pos), this.lap - 1);
          while (s.last < slot) { s.last++; this.tryFire(s, s.last); }
        }
        if (this.cfg.autoLaunch && this.queue.length && this.canLaunch() === 'ok') this.launch(0);
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
      }
      for (this.chamT += dt; this.chamT >= this.cfg.chameleonSecs; this.chamT -= this.cfg.chameleonSecs) {
        this.pic.forEach((row, y) => row.forEach((c, x) => {
          if (this.mods[y][x] !== 'C') return;
          row[x] = this.colors[(this.colors.indexOf(c) + 1) % this.colors.length];
          this.emit('shift', { x, y, color: row[x] });
        }));
      }
      if (this.bossMode && this.countPixels() > 0) {
        this.bossTimer += dt;
        while (this.bossTimer >= this.bossInterval) { this.bossTimer -= this.bossInterval; this.regrow(); }
      }
      if (this.stormMode) {
        this.stormTimer += dt;
        while (this.stormTimer >= this.stormInterval && this.status === 'play') {
          this.stormTimer -= this.stormInterval;
          this.stormInterval = Math.max(this.cfg.stormMin, this.stormInterval * this.cfg.stormAccel);
          this.stormDrop();
        }
        return; // sandstorm never ends by clearing the picture
      }
      if (this.countPixels() === 0) {
        this.picsCleared++;
        this.status = 'won';
        this.emit('won', {});
      }
    }
  }

  const api = { Game, PALETTE, KEYS, COLOR_NAMES, RAINBOW, SHAPES, DEFAULTS, fullLines, shapeSize, rngFrom, pixelCount, autoAmmoPerBlock, autoBeltCap, autoLapSeconds, autoBossInterval, stormLevel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PBCore = api;
})(typeof self !== 'undefined' ? self : this);
