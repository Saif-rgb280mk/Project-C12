// KINETIC XI 3D — headless simulation tests (Node.js, no browser, no GPU).
// Loads the game's own simulation modules (game3d/js/sim/*.js) into a sandbox and checks:
//   1. the MacBook key layout through the Context Intent Arbiter (every mapped action)
//   2. every club x kit x kick-off condition builds a valid match
//   3. accelerated full matches with random key mashing: no exceptions, no NaN, laws work
// Usage: node tools/game3d_sim_tests.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SIM = path.resolve(__dirname, '../game3d/js/sim');
const ctx = { window: {}, console, setTimeout: () => 0, performance: { now: () => 0 }, Math, JSON, Object, Array, Set, Map, Number, String, Float32Array, Infinity, NaN, isFinite };
ctx.window.localStorage = { getItem: () => null, setItem: () => {} };
vm.createContext(ctx);
for (const f of ['core', 'surface', 'ball', 'player', 'ai', 'audio', 'settings', 'input', 'match']) {
  vm.runInContext(fs.readFileSync(path.join(SIM, f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
}
const K = ctx.window.KXI;

let checks = 0, failures = 0;
const check = (cond, label) => { checks++; if (!cond) { failures++; console.log('  FAIL', label); } };

// ------------------------------------------------------------------ 1. arbiter ----
function harness(phase, extra = {}) {
  const arb = new K.Input3({});
  const ctx = Object.assign({ phase, facing: 0, cameraYaw: Math.PI / 2, inShootingRange: true, aimInGoalCone: true, inCrossingZone: false, ballIncoming: false, ballHeight: 0, opponentNear: false }, extra);
  let now = 0, pending = [], fired = [], last = null;
  return {
    press(k) { pending.push({ key: k, down: true, time: now }); },
    release(k) { pending.push({ key: k, down: false, time: now }); },
    advance(s) { const end = now + s; do { now = Math.min(end, now + 1 / 120); last = arb.update(pending, ctx, now); pending = []; fired.push(...last.commands); } while (now < end - 1e-9); },
    fired: (t) => fired.find((c) => c.type === t),
    get last() { return last; }, ctx,
  };
}
const tap = (h, k, dur = 0.08) => { h.press(k); h.advance(dur); h.release(k); h.advance(0.02); };

{
  let h = harness('InPossession'); h.press('Right'); h.advance(0.05);
  check(Math.abs(h.last.moveDir.x - 1) < 1e-9, 'arrows move (camera-relative)');
  h.press('LeftCtrl'); h.advance(0.05); check(h.last.sprint === 'Full', 'Left Ctrl + arrows = sprint');
  h = harness('InPossession'); tap(h, 'LeftCtrl'); check(!!h.fired('StopBall'), 'Left Ctrl tap (no arrows) = stop ball');
  h = harness('InPossession'); h.press('LeftCtrl'); h.advance(0.4); check(h.last.holdBall, 'Left Ctrl hold = stand on the ball');
  h = harness('InPossession'); h.press('W'); h.press('Up'); h.advance(0.1); check(h.last.sprint === 'Controlled' && !h.last.shield, 'W + arrows (no defender) = controlled sprint');
  h = harness('InPossession', { opponentNear: true }); h.press('W'); h.press('Up'); h.advance(0.1); check(h.last.shield, 'W + arrows with a defender close = shield');
  h = harness('InPossession'); h.press('W'); h.advance(0.1); check(h.last.shield, 'W (no arrows) = shield');
  h = harness('Defending'); h.press('W'); h.press('Left'); h.advance(0.1); check(h.last.jockey, 'W + arrows on defence = jockey');
  h = harness('InPossession'); h.press('LeftShift'); h.advance(0.2); check(h.last.strafe, 'Left Shift hold = strafe dribble');
  h = harness('InPossession'); h.press('LeftShift'); h.advance(0.05); tap(h, 'Right', 0.08); h.advance(0.4);
  check(h.fired('SkillMove') && h.fired('SkillMove').skill === 'KnockOn', 'Left Shift + direction tap = skill move');
  h = harness('InPossession'); h.press('LeftShift'); h.advance(0.05); tap(h, 'Right', 0.06); tap(h, 'Right', 0.06);
  check(h.fired('SkillMove') && h.fired('SkillMove').skill === 'StepoverBurst', 'Left Shift + double tap = stepover');
  h = harness('Defending'); h.press('LeftShift'); h.advance(0.02); check(!!h.fired('ChangePlayer'), 'Left Shift on defence = change player');
  h = harness('InPossession'); tap(h, 'S', 0.08); check(!!h.fired('GroundPass'), 'S tap = ground pass');
  h = harness('InPossession'); tap(h, 'S', 0.6); check(!!h.fired('LobPass'), 'S hold = lob pass');
  h = harness('InPossession', { inCrossingZone: true }); tap(h, 'S', 0.5); check(!!h.fired('Cross'), 'S hold in crossing zone = cross');
  h = harness('TeammatePossession', { ballIncoming: true, ballHeight: 1.8 }); tap(h, 'S', 0.1); check(!!h.fired('PassingHeader'), 'S on an aerial ball = header');
  h = harness('Defending'); h.press('S'); h.advance(0.02); check(!!h.fired('SlidingTackle'), 'S on defence = sliding tackle');
  h = harness('InPossession'); tap(h, 'A', 0.3); check(!!h.fired('ThroughPass'), 'A = through pass');
  h = harness('Defending'); h.press('A'); h.advance(0.1); check(h.last.rushKeeper, 'A held on defence = rush goalkeeper');
  h = harness('InPossession'); h.press('LeftShift'); h.advance(0.03); tap(h, 'A', 0.3); check(!!h.fired('LobbedThroughPass') && !h.fired('ThroughPass'), 'Left Shift + A = lobbed through');
  h = harness('InPossession'); h.press('D'); h.advance(0.5); check(h.last.charging === 'Shot' && h.last.chargePower > 0.45, 'D charges a shot (power bar)');
  h.release('D'); h.advance(0.02); check(h.fired('Shot') && Math.abs(h.fired('Shot').power - 0.5) < 0.05, 'D release = shot with power');
  h = harness('TeammatePossession', { ballIncoming: true, ballHeight: 0.8 }); tap(h, 'D', 0.3); check(!!h.fired('Volley'), 'D on a bouncing ball = volley');
  h = harness('Defending'); h.press('D'); h.advance(0.02); check(!!h.fired('StandingTackle'), 'D on defence = standing tackle');
  h = harness('InPossession'); h.press('W'); h.advance(0.03); tap(h, 'D', 0.4); check(!!h.fired('FinesseShot'), 'W + D = finesse shot');
  h = harness('InPossession'); h.press('D'); h.advance(0.03); h.press('W'); h.advance(0.3); h.release('D'); h.advance(0.02); check(!!h.fired('FinesseShot'), 'D then W inside the chord window = finesse');
  h = harness('InPossession'); h.press('W'); h.advance(0.03); tap(h, 'S', 0.1); check(!!h.fired('DrivenGroundPass'), 'W + S = driven pass');
  h = harness('InPossession'); h.press('D'); h.advance(0.3); h.ctx.phase = 'Defending'; h.advance(0.02); h.release('D'); h.advance(0.02); check(!h.fired('Shot'), 'losing the ball cancels the charge');
  console.log(`arbiter: ${checks - failures}/${checks} layout checks passed`);
}

// ------------------------------------------------------------------ 2. matches build ----
function settings() { const s = K.defaultSettings3(); return s; }
const kb = () => ({ queue: [], drain() { const q = this.queue; this.queue = []; return q; } });
{
  let built = 0;
  const clubs = Object.keys(K.CLUBS);
  for (const home of clubs) for (const away of clubs) {
    if (home === away) continue;
    for (const hk of ['Home', 'Away', 'Third']) for (const cond of Object.keys(K.CONDITIONS)) {
      const m = new K.Match(settings(), kb(), { home, away, homeKit: hk, awayKit: 'Away', conditions: cond });
      check(m.players.length === 22 && m.teams[0].kit === K.CLUBS[home].kits[hk], `match ${home}-${away} ${hk} ${cond}`);
      built++;
    }
  }
  console.log(`build: ${built} club/kit/condition combinations created`);
}

// ------------------------------------------------------------------ 3. soak ----
function soak(seed, cond, halfMinutes) {
  const s = settings();
  s.gameplay.halfMinutes = halfMinutes;
  const k = kb();
  const m = new K.Match(s, k, { home: 'NBA', away: 'HCR', conditions: cond });
  m.kickOff();
  const keys = ['Up', 'Down', 'Left', 'Right', 'LeftCtrl', 'LeftShift', 'S', 'A', 'D', 'W'];
  const rng = new K.Rng(seed), down = new Set();
  let t = 0, nan = 0, ticks = 0, goals = 0, restarts = 0;
  ctx.performance.now = () => t * 1000;
  let lastState = m.state;
  while (ticks < 120 * 60 * (halfMinutes * 2 + 2)) {
    t += 1 / 120; ticks++;
    if (rng.next() < 0.04) { const key = rng.pick(keys); const d = down.has(key); k.queue.push({ key, down: !d, time: t }); if (d) down.delete(key); else down.add(key); }
    if (m.state === 'halftime') m.secondHalf();
    if (m.state === 'fulltime') break;
    m.tick(1 / 120);
    if (m.state !== lastState) { if (m.state === 'goal') goals++; if (m.state === 'restart') restarts++; lastState = m.state; }
    m.fx.length = 0;
    for (const p of m.players) if (!isFinite(p.pos.x + p.pos.y + p.vel.x + p.vel.y)) nan++;
    if (!isFinite(m.ball.pos.x + m.ball.pos.y + m.ball.pos.z)) nan++;
  }
  check(m.state === 'fulltime', `soak ${seed}: reaches full time`);
  check(nan === 0, `soak ${seed}: no NaN`);
  console.log(`soak seed ${seed} (${cond}): ${(ticks / 120).toFixed(0)} s simulated, score ${m.score.join('-')}, goals ${goals}, restarts ${restarts}, shots ${m.stats[0].shots + m.stats[1].shots}, passes ${m.stats[0].passOk + m.stats[1].passOk}/${m.stats[0].passes + m.stats[1].passes}, NaN ${nan}`);
}
soak(1, 'Floodlit Night', 2);
soak(2, 'Rain', 2);
soak(3, 'Clear Day', 2);

console.log(`\n${checks} checks, ${failures} failures`);
process.exit(failures ? 1 : 0);
