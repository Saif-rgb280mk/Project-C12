// KINETIC XI — automated browser tests for the playable prototype (Node.js + Playwright).
// Usage:  node tools/prototype_tests.js <output-dir>
// Runs: page-load smoke test, kick-off pass, dribbling (jog / sprint / close control),
// immediate shot, settings menu, storm + pitch degradation, camera presets, goal flow,
// half-time, and an accelerated full-match soak test with random keyboard input.
// Writes screenshots and a JSON summary to <output-dir>.
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const OUT = path.resolve(process.argv[2] || 'prototype-test-output');
const PAGE = 'file://' + path.resolve(__dirname, '../prototype/index.html');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const results = {};
  const shot = (name) => page.screenshot({ path: path.join(OUT, name + '.png') });
  const evalm = (fn, arg) => page.evaluate(fn, arg);

  await page.goto(PAGE);
  await page.waitForTimeout(1200);
  await shot('01_prematch');
  await page.keyboard.press('Space');
  await page.waitForTimeout(700);
  await shot('02_kickoff');

  // Kick-off: tap S toward the right.
  await page.keyboard.down('ArrowRight'); await page.keyboard.down('s'); await page.waitForTimeout(90);
  await page.keyboard.up('s'); await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(200);
  results.kickoffPass = await evalm(() => ({ state: KXI.game.state, passes: KXI.game.stats[0].passes, ballSpeed: Math.hypot(KXI.game.ball.vel.x, KXI.game.ball.vel.y).toFixed(1) }));

  // Dribbling: possession kept while jogging, sprinting and in close control (no magnet).
  const setup = () => evalm(() => {
    const m = KXI.game; m.state = 'play'; m.restart = null; m.gkHold = null;
    const u = m.teams[0].players.find((p) => p.role === 'ST'); m.switchTo(u);
    u.pos = { x: -20, y: -20, z: 0 }; u.vel = { x: 0, y: 0, z: 0 }; u.facing = 0; u.fat.d = u.fat.dMax;
    m.ball.pos = { x: -19.4, y: -20, z: 0.11 }; m.ball.vel = { x: 0, y: 0, z: 0 }; m.ball.grounded = true;
    m.lastTouch = u; m.lastTouchTeam = u.team; m.lastTouchTime = m.time; m.inFlight = false; m.pass = null;
    for (const p of m.teams[1].players) p.pos = { x: 45, y: (p.idx - 5) * 5, z: 0 };
  });
  results.dribble = {};
  for (const mode of ['jog', 'sprint', 'closeControl']) {
    await setup();
    await page.keyboard.down('ArrowRight');
    if (mode === 'sprint') await page.keyboard.down('Control');
    if (mode === 'closeControl') await page.keyboard.down('e');
    let kept = 0, maxGap = 0, speed = 0;
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(250);
      const s = await evalm(() => { const m = KXI.game, u = m.user; return { c: m.carrier === u, gap: Math.hypot(m.ball.pos.x - u.pos.x, m.ball.pos.y - u.pos.y), v: Math.hypot(u.vel.x, u.vel.y) }; });
      if (s.c) kept++; maxGap = Math.max(maxGap, s.gap); speed = s.v;
    }
    if (mode === 'sprint') await shot('03_sprint_dribble');
    await page.keyboard.up('ArrowRight'); await page.keyboard.up('Control'); await page.keyboard.up('e');
    results.dribble[mode] = { possessionKept: `${kept}/12`, maxGapM: +maxGap.toFixed(2), finalSpeedMs: +speed.toFixed(1) };
  }

  // Immediate shot from 30 m.
  await evalm(() => {
    const m = KXI.game; m.state = 'play'; m.restart = null;
    const u = m.teams[0].players.find((p) => p.role === 'ST'); m.switchTo(u);
    u.pos = { x: 30, y: 5, z: 0 }; u.vel = { x: 0, y: 0, z: 0 }; u.facing = 0; u.touchCd = 0.3;
    m.ball.pos = { x: 30.5, y: 5, z: 0.11 }; m.ball.vel = { x: 0, y: 0, z: 0 };
    m.lastTouch = u; m.lastTouchTeam = u.team; m.lastTouchTime = m.time; m.inFlight = false;
    const s = m.teams[0].attackSign;
    for (const p of m.teams[1].players) p.pos = p.isGK ? { x: s * 51.5, y: 0, z: 0 } : { x: -s * 10, y: (p.idx - 5) * 5, z: 0 };
  });
  await page.keyboard.down('d'); await page.waitForTimeout(450); await page.keyboard.up('d');
  await page.waitForTimeout(260);
  await shot('04_shot');
  results.shot = await evalm(() => ({ shots: KXI.game.stats[0].shots, type: KXI.game.lastKick.type, ballSpeed: KXI.game.lastKick.speed.toFixed(1), spinRadS: KXI.game.lastKick.spin.toFixed(1) }));

  // Settings menu.
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await shot('05_settings_gameplay');
  await page.click('text=Controls'); await page.waitForTimeout(200); await shot('06_settings_controls');
  await page.click('text=Graphics'); await page.waitForTimeout(150); await shot('07_settings_graphics');
  await page.click('text=Accessibility'); await page.waitForTimeout(150); await shot('08_settings_accessibility');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);

  // Storm: the living pitch degrades.
  await evalm(() => { const s = KXI.game.settings; s.weather.preset = 'Storm'; s.weather.hydrologySpeed = 30; s.access.reduceFlashing = true; KXI.game.applySettings(); });
  await page.waitForTimeout(12000);
  results.storm = await evalm(() => ({ avgMoisture: KXI.game.surface.avgMoisture().toFixed(2), maxWaterMm: KXI.game.surface.maxWater().toFixed(2), pitch: KXI.game.surface.describe() }));
  await shot('09_storm_broadcast');
  await evalm(() => { KXI.game.settings.camera.preset = 'Pro'; KXI.game.camera.init = false; });
  await page.waitForTimeout(1200); await shot('10_storm_pro_camera');
  await evalm(() => { KXI.game.settings.camera.preset = 'Tele'; KXI.game.camera.init = false; });
  await page.waitForTimeout(1200); await shot('11_tele_camera');
  await evalm(() => { const s = KXI.game.settings; s.camera.preset = 'Broadcast'; s.weather.preset = 'Dry'; s.weather.time = 'Day'; KXI.game.camera.init = false; });
  await page.waitForTimeout(1200); await shot('12_day_broadcast');

  // Goal flow.
  await evalm(() => {
    const m = KXI.game; m.state = 'play'; m.restart = null; m.gkHold = null;
    const u = m.teams[0].players.find((p) => p.role === 'ST'); m.lastTouch = u; m.lastTouchTeam = u.team;
    const s = m.teams[0].attackSign; m.teams[1].players[0].pos = { x: s * 50, y: 3, z: 0 };
    m.ball.pos = { x: s * 48, y: -1, z: 0.6 }; m.ball.vel = { x: s * 22, y: 0, z: 1 }; m.ball.grounded = false; m.inFlight = true;
  });
  await page.waitForTimeout(1300);
  results.goal = await evalm(() => ({ state: KXI.game.state, score: KXI.game.score.join('-') }));
  await shot('13_goal_celebration');
  await page.waitForTimeout(5200);

  // Half-time.
  await evalm(() => { const m = KXI.game; m.state = 'play'; m.restart = null; m.inFlight = false; m.clock = m.settings.gameplay.halfMinutes * 60 + 1; });
  await page.waitForTimeout(400);
  results.halfTime = await evalm(() => KXI.game.state);
  await shot('14_half_time_stats');

  // Accelerated soak test: a full match at 120 Hz with random keyboard input.
  results.soak = await evalm(() => {
    const m = KXI.game;
    KXI.setPaused(true); KXI.setPaused(false);
    m.state = 'play'; m.half = 1; m.clock = 0; m.score = [0, 0];
    m.settings.gameplay.halfMinutes = 2; m.settings.weather.preset = 'Heavy Rain'; m.settings.weather.hydrologySpeed = 20;
    const keys = ['Up', 'Down', 'Left', 'Right', 'LeftCtrl', 'LeftShift', 'S', 'A', 'D', 'W', 'E'];
    const rng = new KXI.Rng(2026), down = new Set();
    const real = performance.now.bind(performance); let fake = real(); performance.now = () => fake;
    let ticks = 0, nan = 0;
    for (; ticks < 120 * 60 * 6; ticks++) {
      fake += 1000 / 120;
      if (rng.next() < 0.04) { const k = rng.pick(keys); const d = down.has(k); m.kb.queue.push({ key: k, down: !d, time: fake / 1000 }); if (d) down.delete(k); else down.add(k); }
      if (m.state === 'halftime') m.kb.queue.push({ key: 'Space', down: true, time: fake / 1000 }, { key: 'Space', down: false, time: fake / 1000 + 0.02 });
      if (m.state === 'fulltime') break;
      m.tick(1 / 120);
      for (const p of m.players) if (!isFinite(p.pos.x + p.pos.y + p.vel.x + p.vel.y)) nan++;
      if (!isFinite(m.ball.pos.x + m.ball.pos.y + m.ball.pos.z)) nan++;
    }
    performance.now = real;
    return { simulatedSeconds: Math.round(ticks / 120), finalState: m.state, score: m.score.join('-'), nanValues: nan,
      pitch: m.surface.describe(), injuries: m.players.filter((p) => p.injured).length,
      stats: m.stats.map((s) => ({ shots: s.shots, onTarget: s.onTarget, xG: +s.xg.toFixed(2), passes: `${s.passOk}/${s.passes}`, tackles: s.tackles, saves: s.saves, corners: s.corners, fouls: s.fouls })) };
  });
  results.pageErrors = errors;
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
