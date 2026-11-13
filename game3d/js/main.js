// KINETIC XI 3D — bootstrap and main loop
// main.js : builds the 3D world as soon as Three.js arrives, renders the live stadium behind
// the main menu straight away, then runs the game:
//   * fixed 120 Hz simulation (physics, AI, laws) independent of the frame rate
//   * FPS limiter: 30 / 60 / 120 / Uncapped (display maximum) + live FPS & frame-time counter
//   * every graphics option applies live (render scale, shadows, AA, bloom/volumetrics,
//     crowd density, turf detail, preset); kick-off conditions preview instantly
//   * Esc pauses into the settings menu; Resume / Restart / Quit.
'use strict';
(function (K) {
  const V = K.V;
  const loadText = () => document.getElementById('load-text');

  K.bootError = (err) => {
    const t = loadText();
    t.classList.add('error');
    t.innerHTML = 'Could not load the 3D engine (Three.js r160) from <b>cdn.jsdelivr.net</b>.<br>' +
      'Check your internet connection, then reload. (Details: ' + String(err && err.message || err) + ')';
    document.querySelector('.load-bar').style.display = 'none';
  };

  K.boot = () => {
    try { start(); } catch (err) { K.bootError(err); throw err; }
  };

  function start() {
    const T = K.THREE;
    const settings = K.loadSettings3();
    const kb = new K.KeyboardCapture(window);
    const engine = new K.GFX.Engine(document.getElementById('stage'), T);
    const atmo = new K.GFX.Atmosphere(engine);
    const stadium = new K.GFX.Stadium(engine);
    const pitch = new K.GFX.Pitch(engine);
    const goals = new K.GFX.Goals(engine);
    const ball3d = new K.GFX.Ball3D(engine);
    const squad = new K.GFX.Squad(engine);
    const rain = new K.GFX.Rain(engine);
    const markers = new K.GFX.Markers(engine);
    const rig = new K.GFX.CameraRig(engine);

    let match = null;
    let paused = false;      // simulation frozen (pause menu open during a match)
    let inMatch = false;
    const focus = new T.Vector3();

    const newMatch = () => {
      match = new K.Match(settings, kb, settings.kickoff);
      squad.build(match);
      rig.snap();
      return match;
    };

    const applyGraphics = () => {
      const g = settings.graphics;
      engine.applyGraphics(g);
      atmo.setShadowQuality(g.shadows);
      atmo.setVolumetric(g.bloom);
      stadium.setCrowdDensity(g.crowd);
      pitch.setDetail(g.turf);
      rain.setDensity(g.preset);
    };
    const applyConditions = () => {
      const c = settings.kickoff.conditions;
      atmo.setConditions(c);
      stadium.setLampLevel(atmo.def.lamp);
      rain.setEnabled(c === 'Rain');
      pitch.setWet(c === 'Rain');
    };

    const hud = new K.UI.HUD({
      second: () => match.secondHalf(),
      rematch: () => { newMatch(); match.kickOff(); },
      menu: () => quitToMenu(),
    });

    const quitToMenu = () => {
      inMatch = false; paused = false;
      newMatch();
      hud.setVisible(false);
      menu.open('main');
    };
    const resume = () => {
      paused = false;
      menu.close();
      kb.queue.length = 0;
      kb.down.clear();
      match.arbiter.cancel();
    };

    const menu = new K.UI.Menu(settings, {
      onPlay: () => {
        newMatch();
        match.kickOff();
        inMatch = true; paused = false;
        menu.close();
        hud.setVisible(true);
        kb.queue.length = 0;
      },
      onResume: resume,
      onRestart: () => { newMatch(); match.kickOff(); paused = false; menu.close(); hud.setVisible(true); },
      onQuit: quitToMenu,
      onChange: (kind) => {
        if (kind === 'graphics') applyGraphics();
        if (kind === 'conditions') { applyConditions(); if (!inMatch) newMatch(); }
        if (kind === 'teams' && !inMatch) newMatch();
        if (kind === 'audio' || kind === 'gameplay') match.applySettings();
      },
    });

    kb.onKey((k, down) => {
      menu.keyLight(k, down);
      if (k === 'Escape' && down) {
        if (inMatch && !menu.isOpen) { paused = true; menu.open('pause'); }
        else if (inMatch && menu.isOpen) resume();
      }
    });

    // Build the first (pre-match) state and show the stadium immediately.
    newMatch();
    applyGraphics();
    applyConditions();
    document.getElementById('loading').classList.add('done');

    // Pre-match warm-up: players jog around their kick-off spots while the menu is open.
    const warmup = (m, dt) => {
      for (const p of m.players) {
        if (!p._wu || m.time > p._wu.until) {
          const home = K.fromTeamSpace(Math.min(p.base.u * 0.5 - 0.08, -0.03), p.base.v * 0.85, p.team.attackSign);
          const a = Math.random() * Math.PI * 2, r = Math.random() * 7;
          p._wu = { until: m.time + 2 + Math.random() * 4, target: { x: home.x + Math.cos(a) * r, y: home.y + Math.sin(a) * r, z: 0 } };
        }
        const d = V.sub(p._wu.target, p.pos);
        const far = V.flen(d) > 0.6;
        p.cmd.dir = far ? V.fnorm(d) : { x: 0, y: 0, z: 0 };
        p.cmd.sprint = 'None'; p.cmd.frac = 0.32; p.cmd.withBall = false; p.cmd.strafe = false; p.cmd.jockey = false; p.cmd.hold = false;
        p.locomote(dt, 1, { top: 1, acc: 1 });
      }
    };

    // ---------------------------------------------------------------- main loop ----
    const STEP = 1 / 120;
    let acc = 0, lastFrame = performance.now(), statT = 0, statFrames = 0, statMs = 0;
    function frame(ts) {
      requestAnimationFrame(frame);
      const cap = settings.graphics.fpsTarget;
      const minInterval = cap === 'Uncapped' ? 0 : 1000 / parseInt(cap, 10);
      if (ts - lastFrame < minInterval - 1.0) return;      // FPS limiter
      const dt = Math.min(0.1, (ts - lastFrame) / 1000);
      lastFrame = ts;

      if (!paused) {
        if (match.state === 'prematch') {
          acc = 0;
          match.time += dt;
          warmup(match, dt);
          kb.queue.length = 0;
        } else {
          acc += dt;
          let n = 0;
          while (acc >= STEP && n < 14) { match.tick(STEP); acc -= STEP; n++; }
          if (n >= 14) acc = 0;
        }
      } else {
        kb.queue.length = 0;
      }

      const fx = match.fx.splice(0);
      if (!paused) {
        pitch.consume(fx);
        goals.update(dt, match.ball, fx, K.GFX.BALL_SCALE);
        squad.update(match, dt);
        ball3d.sync(match.ball, dt);
        markers.update(match, dt);
      }
      const ref = match.carrier ? match.carrier.team : match.lastTouchTeam;
      const danger = match.state === 'goal' ? 1.4 : ref ? K.AI.threat(match.ball.pos, ref.attackSign) * 1.2 + 0.1 : 0.15;
      stadium.update(dt, danger);
      atmo.update(dt);
      pitch.update(dt, match.windNow);
      focus.set(match.ball.pos.x, 0, -match.ball.pos.y);
      rain.update(dt, focus, match.windNow);
      rig.update(match, settings, paused ? 0 : dt);
      if (inMatch) hud.update(match, dt);
      engine.render();

      // FPS & frame-time counter (updated twice a second).
      statFrames++; statMs += dt * 1000; statT += dt;
      if (statT >= 0.5) {
        hud.fps(statFrames / statT, statMs / statFrames, cap === 'Uncapped' ? 'max' : cap);
        statT = 0; statFrames = 0; statMs = 0;
      }
    }
    requestAnimationFrame(frame);

    // Exposed for automated tests and debugging.
    K.app = { get match() { return match; }, settings, engine, atmo, stadium, pitch, goals, squad, rig, menu, hud, applyGraphics, applyConditions,
      get paused() { return paused; }, get inMatch() { return inMatch; } };
  }
})(window.KXI);
