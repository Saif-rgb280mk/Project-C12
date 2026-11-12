// KINETIC XI — Playable Prototype
// main.js : bootstrap + fixed-timestep loop. Simulation always runs at 120 Hz regardless of
// the frame-rate cap (30 / 60 / 120 / Uncapped only changes how often we draw), so physics
// and the input arbiter behave identically on a 60 Hz MacBook Air and a 120 Hz ProMotion
// MacBook Pro.
'use strict';
(function (K) {
  const canvas = document.getElementById('view');
  const overlay = document.getElementById('overlay');
  const menuRoot = document.getElementById('menu');
  const settings = K.loadSettings();
  const kb = new K.KeyboardCapture(window);
  const match = new K.Match(settings, kb);
  const renderer = new K.Renderer(canvas);
  let paused = false;

  function setPaused(p) {
    paused = p;
    overlay.classList.toggle('open', p);
    if (p) {
      new K.SettingsMenu(menuRoot, settings, kb, () => match.applySettings());
    } else {
      // Forget anything held while the menu was open (prevents stuck keys).
      kb.down.clear(); kb.queue = [];
      match.arbiter.down = {}; match.arbiter.charge = null;
    }
  }
  kb.onKey((k, down) => {
    if (k === 'Escape' && down && !kb.captureNext) setPaused(!paused);
  });
  document.getElementById('resume').onclick = () => setPaused(false);
  canvas.addEventListener('click', () => { match.audio.start(settings); canvas.focus(); });

  const STEP = 1 / 120;
  let acc = 0, last = performance.now(), lastDraw = 0, frames = 0, fpsT = 0;
  function frame(ts) {
    const dt = Math.min(0.1, (ts - last) / 1000);
    last = ts;
    if (!paused) {
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 12) { match.tick(STEP); acc -= STEP; n++; }
      if (n >= 12) acc = 0;   // never spiral after a long stall
    }
    const cap = settings.graphics.fpsCap;
    const gap = cap === 'Uncapped' ? 0 : 1000 / parseInt(cap, 10) - 1.5;
    if (ts - lastDraw >= gap) {
      renderer.resize(settings);
      renderer.draw(match, (ts - lastDraw) / 1000 || STEP);
      lastDraw = ts; frames++;
    }
    fpsT += dt;
    if (fpsT >= 1) { match.fps = frames; frames = 0; fpsT = 0; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Exposed for debugging and automated tests.
  K.game = match;
  K.setPaused = setPaused;
})(window.KXI);
