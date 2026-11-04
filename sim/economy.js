#!/usr/bin/env node
// Economy simulation: a bot "player" plays through the levels in order, retrying on loss,
// buying continues only when it can afford them. Shows whether coins pile up (too easy)
// or run dry (continues become a real decision / purchase point).
// Usage: node sim/economy.js [--players 50] [--attempts 40] [--winBase 10] [--cont 25,50,100]
const LEVELS = require('../src/levels.js');
const ECON0 = require('../src/economy.js');
const { Game } = require('../src/core.js');
const { chooseMove, chooseLaunch } = require('../src/bot.js');

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const ECON = JSON.parse(JSON.stringify(ECON0));
if (opt('winBase')) ECON.winBase = +opt('winBase');
if (opt('start')) ECON.startCoins = +opt('start');
if (opt('cont')) ECON.continueCosts = opt('cont').split(',').map(Number);
const players = +opt('players', 50), attempts = +opt('attempts', 40), think = +opt('think', 1.2);

const streakMult = s => Math.min(ECON.streakCap, 1 + ECON.streakStep * Math.max(0, s - 1));

// Plays one attempt; buys continues while affordable. Returns outcome + coins spent.
function attempt(level, seed, wallet) {
  const g = new Game(level, { seed });
  let spent = 0, wantedButBroke = false;
  while (g.time < 600) {
    if (g.status === 'jammed') {
      const cost = ECON.continueCosts[g.continues];
      if (cost === undefined) break;
      if (wallet - spent < cost) { wantedButBroke = true; break; }
      spent += cost; g.continueAfterJam(); continue;
    }
    if (g.status !== 'play') break;
    const m = chooseMove(g); if (m) g.placePiece(m.i, m.x, m.y);
    for (let t = 0; t < think && g.status === 'play'; t += 0.05) { const li = chooseLaunch(g); if (li >= 0) g.launch(li); g.update(0.05); }
    g.drain();
  }
  return { won: g.status === 'won', spent, continues: g.continues, wantedButBroke };
}

let tot = { wins: 0, attempts: 0, contBought: 0, broke: 0, earned: 0, spent: 0, endCoins: [], levelsDone: [] };
const coinCurve = Array(attempts).fill(0);
for (let p = 0; p < players; p++) {
  let coins = ECON.startCoins, streak = 0, lvl = 0;
  for (let a = 0; a < attempts; a++) {
    const r = attempt(LEVELS[lvl % LEVELS.length], 50000 + p * 1000 + a, coins);
    coins -= r.spent; tot.spent += r.spent; tot.contBought += r.continues; tot.attempts++;
    if (r.wantedButBroke) tot.broke++;
    if (r.won) { streak++; const earn = Math.round(ECON.winBase * streakMult(streak)); coins += earn; tot.earned += earn; tot.wins++; lvl++; }
    else streak = 0;
    coinCurve[a] += coins;
  }
  tot.endCoins.push(coins); tot.levelsDone.push(lvl);
}
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
console.log(`Economy sim · ${players} players × ${attempts} attempts · ${JSON.stringify({ start: ECON.startCoins, winBase: ECON.winBase, cont: ECON.continueCosts })}\n`);
console.log(`Win rate per attempt:              ${(tot.wins / tot.attempts * 100).toFixed(0)}%`);
console.log(`Levels cleared per player:         ${avg(tot.levelsDone).toFixed(1)}`);
console.log(`Coins earned / spent per player:   ${(tot.earned / players).toFixed(0)} / ${(tot.spent / players).toFixed(0)}`);
console.log(`Continues bought per player:       ${(tot.contBought / players).toFixed(1)}`);
console.log(`Attempts where a continue was wanted but unaffordable: ${(tot.broke / tot.attempts * 100).toFixed(0)}%  <- purchase/ad opportunities`);
console.log(`Coins at end (avg, min, max):      ${avg(tot.endCoins).toFixed(0)}, ${Math.min(...tot.endCoins)}, ${Math.max(...tot.endCoins)}`);
console.log(`Avg wallet after attempt 1/10/20/${attempts}: ${[0, 9, 19, attempts - 1].map(i => (coinCurve[i] / players).toFixed(0)).join(' / ')}`);
