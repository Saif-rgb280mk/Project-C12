// KINETIC XI 3D — automated browser tests + screenshot capture (Node.js + Playwright).
// Usage:  node tools/game3d_browser_tests.js <output-dir> [path-to-local-three-package]
// If a local `three@0.160.0` package folder is given, CDN requests are served from it
// (for offline/CI machines); otherwise the page loads Three.js from cdn.jsdelivr.net.
// Checks: boot without errors, menu tabs, live key tester, conditions preview, PLAY MATCH,
// kick-off pass, shot power bar + strike, goal + net ripple + celebration, Esc pause/resume,
// live graphics presets (render scale, shadows, crowd, AA, bloom), close-up of the players.
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const OUT = path.resolve(process.argv[2] || 'game3d-test-output');
const THREE_DIR = process.argv[3] ? path.resolve(process.argv[3]) : null;
const PAGE = 'file://' + path.resolve(__dirname, '../game3d/index.html');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  if (THREE_DIR) {
    await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', (route) => {
      const file = path.join(THREE_DIR, route.request().url().replace('https://cdn.jsdelivr.net/npm/three@0.160.0/', ''));
      if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
      route.fulfill({ status: 200, contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(file) });
    });
  }
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const ev = (f, a) => page.evaluate(f, a);
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  // Menu buttons are clicked through the DOM (software-rendered CI browsers are too slow
  // for synthetic pointer events while WebGL frames are in flight).
  const click = (css, text) => ev(([css, text]) => { const el = [...document.querySelectorAll(css)].find((e) => !text || e.textContent.includes(text)); el.click(); }, [css, text]);
  const quality = (p) => ev((p) => { KXI.applyGfxPreset(KXI.app.settings, p); KXI.app.applyGraphics(); }, p);
  const results = {};

  await page.goto(PAGE);
  await page.waitForFunction(() => window.KXI && KXI.app, null, { timeout: 90000 });
  await page.waitForTimeout(6000);
  results.boot = await ev(() => ({ state: KXI.app.match.state, loadingHidden: document.getElementById('loading').classList.contains('done'), menuOpen: KXI.app.menu.isOpen }));
  await shot('01_main_menu_night');

  await click('button[data-tab="settings"]'); await page.waitForTimeout(2500); await shot('02_game_settings');
  await click('button[data-tab="controls"]');
  await page.keyboard.down('KeyW'); await page.keyboard.down('KeyD'); await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(1500);
  results.keyTester = await ev(() => [...document.querySelectorAll('.kbd-demo .lit')].map((e) => e.textContent));
  await shot('03_controls');
  await page.keyboard.up('KeyW'); await page.keyboard.up('KeyD'); await page.keyboard.up('ArrowUp');
  await click('button[data-tab="kickoff"]');
  for (const [cond, n] of [['Sunset', '04_sunset'], ['Clear Day', '05_clear_day'], ['Rain', '06_rain']]) {
    await click('.cond', cond); await page.waitForTimeout(6000); await shot(n);
  }
  await click('.cond', 'Floodlit Night'); await page.waitForTimeout(1500);

  await click('button', 'PLAY MATCH'); await page.waitForTimeout(6000);
  results.play = await ev(() => ({ state: KXI.app.match.state, hud: !document.getElementById('hud').classList.contains('hidden'), user: KXI.app.match.user.name }));
  await shot('07_broadcast_kickoff');
  await page.keyboard.down('ArrowRight'); await page.keyboard.down('KeyS'); await page.waitForTimeout(90); await page.keyboard.up('KeyS'); await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(4000);
  results.kickoff = await ev(() => ({ state: KXI.app.match.state, passes: KXI.app.match.stats[0].passes }));
  await shot('08_broadcast_play');

  await quality('Medium');
  await ev(() => {
    const m = KXI.app.match; m.state = 'play'; m.restart = null; m.gkHold = null;
    const u = m.teams[0].players.find((p) => p.role === 'ST'); m.switchTo(u); const s = m.teams[0].attackSign;
    u.pos = { x: s * 28, y: 7, z: 0 }; u.vel = { x: 0, y: 0, z: 0 }; u.facing = s > 0 ? 0 : Math.PI;
    m.ball.pos = { x: s * 28.5, y: 7, z: 0.11 }; m.ball.vel = { x: 0, y: 0, z: 0 };
    m.lastTouch = u; m.lastTouchTeam = u.team; m.lastTouchTime = m.time; m.inFlight = false;
    for (const p of m.teams[1].players) if (!p.isGK) p.pos = { x: -s * 5, y: (p.idx - 5) * 5, z: 0 };
  });
  await page.waitForTimeout(1500);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(450);
  results.powerBar = await ev(() => ({ charging: KXI.app.match.lastOut.charging, power: +KXI.app.match.lastOut.chargePower.toFixed(2) }));
  await shot('09_power_bar');
  await page.keyboard.up('KeyD');
  await page.waitForFunction(() => KXI.app.match.lastKick && KXI.app.match.lastKick.type === 'Shot', null, { timeout: 30000 });
  await page.waitForTimeout(400);
  results.shot = await ev(() => ({ type: KXI.app.match.lastKick.type, speed: +KXI.app.match.lastKick.speed.toFixed(1), spin: +KXI.app.match.lastKick.spin.toFixed(1) }));
  await shot('10_shot');

  await ev(() => {
    const m = KXI.app.match; m.state = 'play'; m.restart = null; m.gkHold = null; const s = m.teams[0].attackSign;
    m.lastTouch = m.user; m.lastTouchTeam = m.user.team; m.teams[1].players[0].pos = { x: s * 50, y: 3, z: 0 };
    m.ball.pos = { x: s * 47, y: -1, z: 1.3 }; m.ball.vel = { x: s * 24, y: 0, z: 1 }; m.ball.grounded = false; m.inFlight = true;
  });
  await page.waitForFunction(() => KXI.app.match.state === 'goal', null, { timeout: 30000 });
  await page.waitForTimeout(1200);
  results.goal = await ev(() => ({ state: KXI.app.match.state, score: KXI.app.match.score.join('-') }));
  await shot('11_goal_celebration');
  await page.waitForTimeout(5000);

  await page.keyboard.press('Escape'); await page.waitForTimeout(1500);
  results.pause = await ev(() => ({ paused: KXI.app.paused, menuOpen: KXI.app.menu.isOpen }));
  await shot('12_pause_menu');
  await click('button', 'RESUME'); await page.waitForTimeout(800);
  results.resume = await ev(() => ({ paused: KXI.app.paused, menuOpen: KXI.app.menu.isOpen }));

  results.presets = {};
  for (const p of ['Low', 'Medium', 'High', 'Ultra (MacBook Pro)']) {
    await quality(p); await page.waitForTimeout(1500);
    results.presets[p] = await ev(() => ({ renderScale: KXI.app.engine.renderer.getPixelRatio(), shadows: KXI.app.engine.renderer.shadowMap.enabled,
      shadowMap: KXI.app.atmo.floods[0].shadow.mapSize.x, crowd: KXI.app.stadium.crowd.count, aa: KXI.app.engine.aa, bloom: KXI.app.engine.bloomPass.enabled, fpsTarget: KXI.app.settings.graphics.fpsTarget }));
  }
  await quality('High');
  await ev(() => {
    const a = KXI.app;
    a.rig.update = function () { const c = a.engine.camera; const p = a.match.teams[0].players[9].pos; c.position.set(p.x + 3.0, 1.6, -p.y + 3.6); c.lookAt(p.x, 1.0, -p.y); c.fov = 38; c.updateProjectionMatrix(); };
  });
  await page.waitForTimeout(5000);
  await shot('13_players_closeup');
  results.fpsCounter = await ev(() => document.getElementById('fps').textContent.trim());
  results.pageErrors = errors;
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
