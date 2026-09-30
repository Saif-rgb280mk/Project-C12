/*
 * PromptToMotion player runtime (v2).
 *
 * This function never runs in the main page. app.js turns it into a string with
 * PTM_runtime.toString() and injects it into the sandboxed preview <iframe>, next to the
 * scene code (written by Claude, the mock generator, or a built-in example).
 *
 * It owns everything that touches the scene:
 *   - the canvas and a deterministic clock (true FPS: the scene is only sampled on frame boundaries)
 *   - play / pause / loop / seek / frame step, driven by postMessage from the page
 *   - CAMERA moves (push, pull, pan, orbit, crane, handheld), applied to every scene
 *   - LIGHTING looks (natural, cinematic, neon, golden hour, moonlit, studio): colour grade, bloom, vignette, rays
 *   - MOTION BLUR by temporal supersampling (several sub-frames averaged per output frame)
 *   - PHYSICS: an optional simulate() step is baked once, so springs, cloth and ropes scrub and export correctly
 *   - the exporters: MP4 or WebM (MediaRecorder), GIF (own encoder), Lottie (image-sequence JSON)
 *
 * Scene contract (what generated code must provide):
 *   function setup(W, H) { return state }              // optional, runs once
 *   function simulate(state, dt, t, info) { ... }      // optional, fixed-step physics, mutates state
 *   function draw(ctx, t, info) { ... }                // required, called once per frame (and per blur sub-frame)
 *   info = { W, H, duration, progress, frame, frames, fps, state, camera, light }
 * Helpers available to scenes: TAU, clamp, lerp, hash, noise, ease.*, PHYS.*, and a seeded Math.random.
 */
function PTM_runtime(CONFIG) {
  const post = (ev, data) => parent.postMessage(Object.assign({ ptm: true, sid: CONFIG.sid, ev }, data || {}), "*");

  // ---------- helpers exposed to scenes ----------
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const noise = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u); };
  const ease = {
    in: x => x * x,
    out: x => 1 - (1 - x) * (1 - x),
    inOut: x => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
    sine: x => 0.5 - 0.5 * Math.cos(Math.PI * x),
    outBack: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    outElastic: x => (x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (TAU / 3)) + 1)
  };
  // Physics helpers for characters, cloth and ropes. Use them inside simulate(); they are plain functions.
  const PHYS = {
    // Damped spring. s = { x, v }. Moves s.x toward target; returns s.x.
    spring(s, target, k, d, dt) { s.v += (-k * (s.x - target) - d * s.v) * dt; s.x += s.v * dt; return s.x; },
    // Two-bone inverse kinematics (legs, arms). Returns the joint (knee/elbow) and the reachable end point.
    ik2(ax, ay, tx, ty, l1, l2, dir) {
      let dx = tx - ax, dy = ty - ay, d = Math.hypot(dx, dy) || 1e-3;
      const max = l1 + l2 - 1e-3; if (d > max) { dx *= max / d; dy *= max / d; d = max; }
      const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), s = dir || 1;
      return { x: ax + (dx * a) / d - (s * dy * h) / d, y: ay + (dy * a) / d + (s * dx * h) / d, ex: ax + dx, ey: ay + dy };
    },
    // Verlet chain (scarf, hair, tail, rope). Make one with makeChain, then call chain() every simulate() step.
    makeChain(n, x, y, len) { return Array.from({ length: n }, (_, i) => ({ x: x - i * (len || 10), y, px: x - i * (len || 10), py: y, len: len || 10 })); },
    chain(pts, ax, ay, dt, o) {
      o = o || {}; const g = o.gravity == null ? 600 : o.gravity, damp = o.damping == null ? 0.985 : o.damping, wind = o.wind || 0;
      pts[0].x = ax; pts[0].y = ay; pts[0].px = ax; pts[0].py = ay;
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i], vx = (p.x - p.px) * damp, vy = (p.y - p.py) * damp;
        p.px = p.x; p.py = p.y; p.x += vx + wind * dt * dt; p.y += vy + g * dt * dt;
      }
      for (let it = 0; it < (o.iters || 5); it++) for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-3, k = (d - b.len) / d;
        if (i === 1) { b.x -= dx * k; b.y -= dy * k; } else { a.x += dx * k * 0.5; a.y += dy * k * 0.5; b.x -= dx * k * 0.5; b.y -= dy * k * 0.5; }
      }
    }
  };
  Object.assign(window, { TAU, clamp, lerp, hash, noise, ease, PHYS });

  // Math.random is reseeded before setup() and before every frame, so the same frame always looks the same.
  const mulberry = a => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const seed = n => { Math.random = mulberry(n * 9973 + 12345); };

  // ---------- state ----------
  const S = {
    W: CONFIG.W, H: CONFIG.H, fps: CONFIG.fps, duration: CONFIG.duration, pixel: CONFIG.pixel || 1,
    camMode: CONFIG.camera || "static", camK: CONFIG.camK == null ? 1 : CONFIG.camK, light: CONFIG.light || "none", blur: CONFIG.blur || 0,
    loop: CONFIG.loop !== false, playing: CONFIG.autoplay !== false, t: 0, lastFrame: -1, dirty: true,
    ready: false, broken: false, state: null, snaps: null, drawFn: null, setupFn: null, simFn: null, subCap: 99, ema: 0
  };
  const frames = () => Math.max(1, Math.round(S.duration * S.fps));
  const frameAt = t => Math.min(frames() - 1, Math.floor(t * S.fps + 1e-6));

  const view = document.getElementById("view");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const vscale = Math.min(dpr, 1280 / Math.max(S.W, S.H));
  view.width = Math.round(S.W * vscale);
  view.height = Math.round(S.H * vscale);
  const vctx = view.getContext("2d");
  let low = null;

  function fail(e) {
    if (S.broken) return;
    S.broken = true; S.playing = false;
    post("error", { message: String((e && e.message) || e || "Unknown error") });
  }
  window.addEventListener("error", e => fail(e.error || e.message));

  function resetCtx(c) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
    c.shadowBlur = 0; c.shadowColor = "transparent"; c.filter = "none";
  }

  // ---------- camera ----------
  // Returns { x, y, zoom, rot }: x and y are fractions of the frame. Every mode over-scans so edges never show.
  function cameraAt(p) {
    const k = S.camK, e = ease.inOut(p), a = p * TAU;
    switch (S.camMode) {
      case "push": return { x: 0, y: 0, zoom: 1 + 0.32 * k * e, rot: 0 };
      case "pull": return { x: 0, y: 0, zoom: 1 + 0.32 * k * (1 - e), rot: 0 };
      case "panl": return { x: (0.5 - p) * 0.14 * k, y: 0, zoom: 1 + 0.16 * k, rot: 0 };
      case "panr": return { x: (p - 0.5) * 0.14 * k, y: 0, zoom: 1 + 0.16 * k, rot: 0 };
      case "orbit": return { x: Math.sin(a) * 0.05 * k, y: -Math.cos(a) * 0.02 * k, zoom: 1.1 + 0.06 * k, rot: Math.sin(a) * 0.045 * k };
      case "crane": return { x: 0, y: (0.5 - e) * 0.13 * k, zoom: 1 + 0.15 * k, rot: (e - 0.5) * 0.03 * k };
      case "handheld": return { x: 0.007 * k * (Math.sin(a * 7 + 1) + 0.6 * Math.sin(a * 13 + 2)), y: 0.006 * k * (Math.sin(a * 9 + 3) + 0.5 * Math.sin(a * 17)), zoom: 1.05 + 0.02 * k, rot: 0.006 * k * Math.sin(a * 5 + 4) };
      default: return { x: 0, y: 0, zoom: 1, rot: 0 };
    }
  }
  function applyCamera(c, cam) {
    if (cam.zoom === 1 && !cam.x && !cam.y && !cam.rot) return;
    c.translate(S.W / 2, S.H / 2); c.rotate(cam.rot); c.scale(cam.zoom, cam.zoom); c.translate(-S.W / 2 + cam.x * S.W, -S.H / 2 + cam.y * S.H);
  }

  // ---------- lighting ----------
  // What scenes are told (info.light): dx, dy point TOWARD the light (screen coordinates, y down). Shadows fall the other way.
  const LIGHTS = {
    none: { style: "none", dx: -0.5, dy: -0.85, color: "#ffffff", color2: "#ffffff", ambient: 0.5, shadow: "rgba(0,0,0,0.25)" },
    natural: { style: "natural", dx: -0.55, dy: -0.83, color: "#fff1d6", color2: "#cfe3ff", ambient: 0.45, shadow: "rgba(20,30,60,0.28)" },
    cinematic: { style: "cinematic", dx: 0.65, dy: -0.5, color: "#ffd2a0", color2: "#3c8fb0", ambient: 0.28, shadow: "rgba(6,24,40,0.45)" },
    neon: { style: "neon", dx: 0, dy: -0.3, color: "#ff3df2", color2: "#22d3ee", ambient: 0.18, shadow: "rgba(0,0,0,0.55)" },
    golden: { style: "golden", dx: 0.85, dy: -0.35, color: "#ffb45a", color2: "#ffd9a0", ambient: 0.36, shadow: "rgba(60,20,10,0.38)" },
    moonlit: { style: "moonlit", dx: -0.4, dy: -0.9, color: "#a9c1ff", color2: "#6d86d6", ambient: 0.2, shadow: "rgba(0,0,20,0.5)" },
    studio: { style: "studio", dx: -0.3, dy: -0.95, color: "#ffffff", color2: "#e8eefc", ambient: 0.6, shadow: "rgba(0,0,0,0.2)" }
  };
  // How the picture is graded after the scene is drawn. Blend modes: multiply darkens, screen and soft-light lift.
  const LOOKS = {
    none: null,
    natural: { vig: 0.28, bloom: 0.16, tints: [["soft-light", "rgba(255,214,150,0.30)", "radial"]], rays: 0.09 },
    cinematic: { vig: 0.62, bloom: 0.26, tints: [["multiply", "rgba(24,70,96,0.24)", "flat"], ["soft-light", "rgba(255,150,70,0.34)", "radial"]], bars: true, rays: 0.06 },
    neon: { vig: 0.55, bloom: 0.8, tints: [["screen", "rgba(255,0,190,0.11)", "edgeL"], ["screen", "rgba(0,210,255,0.09)", "edgeR"]], scan: 0.07 },
    golden: { vig: 0.36, bloom: 0.34, tints: [["soft-light", "rgba(255,160,40,0.46)", "radial"]], rays: 0.17 },
    moonlit: { vig: 0.5, bloom: 0.22, tints: [["soft-light", "rgba(80,110,255,0.42)", "flat"], ["multiply", "rgba(130,150,225,0.16)", "flat"]], rays: 0.05 },
    studio: { vig: 0.14, bloom: 0.08, tints: [] }
  };
  let bl = null, bl2 = null, rays = null, scanPat = null;
  function grade(c, cw, ch, t) {
    const look = LOOKS[S.light]; if (!look) return;
    const L = LIGHTS[S.light], lx = cw * (0.5 + L.dx * 0.42), ly = ch * (0.5 + L.dy * 0.42), diag = Math.hypot(cw, ch);
    resetCtx(c);
    if (look.bloom) {   // bright-biased blur: shrink, square the colours (keeps highlights), stretch back and add
      const w1 = Math.max(8, Math.round(cw / 8)), h1 = Math.max(8, Math.round(ch / 8));
      if (!bl || bl.width !== w1 || bl.height !== h1) { bl = document.createElement("canvas"); bl.width = w1; bl.height = h1; bl2 = document.createElement("canvas"); bl2.width = Math.max(4, w1 >> 1); bl2.height = Math.max(4, h1 >> 1); }
      const b = bl.getContext("2d"); resetCtx(b); b.imageSmoothingEnabled = true; b.drawImage(c.canvas, 0, 0, w1, h1);
      b.globalCompositeOperation = "multiply"; b.drawImage(bl, 0, 0);
      const b2 = bl2.getContext("2d"); resetCtx(b2); b2.drawImage(bl, 0, 0, bl2.width, bl2.height);
      c.globalCompositeOperation = "screen"; c.imageSmoothingEnabled = true;
      c.globalAlpha = look.bloom; c.drawImage(bl, 0, 0, cw, ch);
      c.globalAlpha = look.bloom * 0.9; c.drawImage(bl2, 0, 0, cw, ch);
      c.globalAlpha = 1;
    }
    for (const [mode, col, shape] of look.tints) {
      c.globalCompositeOperation = mode;
      let g;
      if (shape === "radial") { g = c.createRadialGradient(lx, ly, 0, lx, ly, diag * 0.8); g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)"); }
      else if (shape === "edgeL" || shape === "edgeR") { g = c.createLinearGradient(shape === "edgeL" ? 0 : cw, 0, cw / 2, 0); g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)"); }
      else g = col;
      c.fillStyle = g; c.fillRect(0, 0, cw, ch);
    }
    if (look.rays) {    // soft light shafts from the light's side, drifting slowly (drawn small and layered, so the edges feather)
      const rw = Math.max(8, Math.round(cw / 10)), rh = Math.max(8, Math.round(ch / 10)), k = rw / cw;
      if (!rays || rays.width !== rw || rays.height !== rh) { rays = document.createElement("canvas"); rays.width = rw; rays.height = rh; }
      const r = rays.getContext("2d"); resetCtx(r); r.clearRect(0, 0, rw, rh); r.globalCompositeOperation = "lighter";
      const ox = lx * k, oy = ly * k, dg = diag * k;
      for (let i = 0; i < 8; i++) {
        const a = Math.atan2(-L.dy, -L.dx) + (i - 3.5) * 0.15 + Math.sin(t * 0.6 + i * 1.7) * 0.03, w = 0.03 + 0.012 * Math.sin(t * 0.9 + i), al = look.rays * (0.7 + 0.3 * Math.sin(t * 0.8 + i * 2)) / 3;
        const g = r.createLinearGradient(ox, oy, ox + Math.cos(a) * dg, oy + Math.sin(a) * dg);
        g.addColorStop(0, "rgba(255,240,210," + al + ")"); g.addColorStop(1, "rgba(255,240,210,0)");
        r.fillStyle = g;
        for (const f of [1, 0.62, 0.3]) { r.beginPath(); r.moveTo(ox, oy); r.lineTo(ox + Math.cos(a - w * f) * dg, oy + Math.sin(a - w * f) * dg); r.lineTo(ox + Math.cos(a + w * f) * dg, oy + Math.sin(a + w * f) * dg); r.closePath(); r.fill(); }
      }
      c.globalCompositeOperation = "screen"; c.imageSmoothingEnabled = true; c.drawImage(rays, 0, 0, cw, ch);
    }
    c.globalCompositeOperation = "source-over";
    if (look.scan) {
      if (!scanPat) { const s = document.createElement("canvas"); s.width = 4; s.height = 3; const sc = s.getContext("2d"); sc.fillStyle = "rgba(0,0,0,1)"; sc.fillRect(0, 0, 4, 1); scanPat = c.createPattern(s, "repeat"); }
      c.globalAlpha = look.scan; c.fillStyle = scanPat; c.fillRect(0, 0, cw, ch); c.globalAlpha = 1;
    }
    if (look.vig) {
      const g = c.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.32, cw / 2, ch / 2, diag * 0.6);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0," + look.vig + ")");
      c.fillStyle = g; c.fillRect(0, 0, cw, ch);
    }
    if (look.bars && cw / ch > 1.5) { const bar = Math.max(0, (ch - cw / 2.2) / 2); c.fillStyle = "#000"; c.fillRect(0, 0, cw, bar); c.fillRect(0, ch - bar, cw, bar); }
  }

  // ---------- physics (baked once, so scrubbing and export are exact) ----------
  const cloneState = st => (typeof structuredClone === "function" ? structuredClone(st) : JSON.parse(JSON.stringify(st)));
  function bake() {
    S.snaps = null;
    if (typeof S.simFn !== "function") return;
    seed(0);
    const st = typeof S.setupFn === "function" ? S.setupFn(S.W, S.H) : {}, N = frames(), SUB = 4, dt = 1 / (S.fps * SUB), snaps = [];
    S.state = st;
    for (let f = 0; f < N; f++) {
      for (let s = 0; s < SUB; s++) { seed(f * SUB + s + 7); S.simFn(st, dt, f / S.fps + s * dt, { W: S.W, H: S.H, fps: S.fps, duration: S.duration, frame: f }); }
      snaps.push(cloneState(st));
    }
    S.snaps = snaps;
  }
  const stateAt = f => (S.snaps ? S.snaps[clamp(f, 0, S.snaps.length - 1)] : S.state);

  // ---------- drawing one picture ----------
  // paintScene: camera + scene into a context (used for the picture itself and for every motion-blur sub-frame).
  function paintScene(c, cw, ch, t, frame) {
    resetCtx(c);
    c.fillStyle = "#000"; c.fillRect(0, 0, cw, ch);
    let target = c, scale = cw / S.W;
    if (S.pixel > 1) {
      const lw = Math.max(1, Math.round(S.W / S.pixel)), lh = Math.max(1, Math.round(S.H / S.pixel));
      if (!low || low.width !== lw || low.height !== lh) { low = document.createElement("canvas"); low.width = lw; low.height = lh; }
      target = low.getContext("2d");
      resetCtx(target); target.fillStyle = "#000"; target.fillRect(0, 0, lw, lh);
      scale = lw / S.W;
    }
    target.save();
    target.setTransform(scale, 0, 0, scale, 0, 0);
    const p = t / S.duration, cam = cameraAt(p);
    applyCamera(target, cam);
    seed(frame + 1);
    try {
      S.drawFn(target, t, { W: S.W, H: S.H, duration: S.duration, progress: p, frame, frames: frames(), fps: S.fps, state: stateAt(frame), camera: cam, light: LIGHTS[S.light] || LIGHTS.none });
    } catch (e) { fail(e); }
    target.restore();
    if (S.pixel > 1) { resetCtx(c); c.imageSmoothingEnabled = false; c.drawImage(low, 0, 0, cw, ch); c.imageSmoothingEnabled = true; }
  }

  // renderAt: the finished picture at time t. subs > 1 averages that many sub-frames across a 180-degree shutter.
  let bufs = null;
  function renderAt(c, cw, ch, t, subs) {
    const n = Math.max(1, subs | 0), frame = frameAt(t);
    if (n === 1) paintScene(c, cw, ch, t, frame);
    else {
      if (!bufs || bufs.w !== cw || bufs.h !== ch) { const mk = () => { const e = document.createElement("canvas"); e.width = cw; e.height = ch; return e; }; bufs = { w: cw, h: ch, sub: mk(), acc: mk() }; }
      const sc = bufs.sub.getContext("2d"), ac = bufs.acc.getContext("2d"), shutter = 0.5 / S.fps;
      resetCtx(ac);
      for (let k = 0; k < n; k++) {
        const tk = clamp(t + (k / (n - 1) - 0.5) * shutter, 0, S.duration - 1e-6);
        paintScene(sc, cw, ch, tk, frameAt(tk));
        ac.globalAlpha = 1 / (k + 1); ac.drawImage(bufs.sub, 0, 0);
      }
      resetCtx(c); c.drawImage(bufs.acc, 0, 0);
    }
    grade(c, cw, ch, t);
  }
  const BLUR_PREVIEW = [1, 2, 3, 4], BLUR_EXPORT = [1, 4, 8, 12];
  const previewSubs = () => Math.max(1, Math.min(BLUR_PREVIEW[S.blur] || 1, S.subCap));
  const exportSubs = () => BLUR_EXPORT[S.blur] || 1;

  // ---------- playback clock ----------
  let lastTs = null, exporting = false, cancelExport = false;
  function tick(ts) {
    requestAnimationFrame(tick);
    if (!S.ready || S.broken || exporting) { lastTs = ts; return; }
    if (S.playing && lastTs !== null) {
      S.t += Math.min(0.1, (ts - lastTs) / 1000);
      if (S.t >= S.duration) {
        if (S.loop) S.t %= S.duration;
        else { S.t = S.duration; S.playing = false; S.dirty = true; post("ended"); }
      }
    }
    lastTs = ts;
    const f = frameAt(S.t);
    if (f !== S.lastFrame || S.dirty) {
      S.lastFrame = f; S.dirty = false;
      const t0 = performance.now(), subs = previewSubs();
      renderAt(vctx, view.width, view.height, f / S.fps, subs);
      // If the preview can't keep up, lower the blur quality of the preview only (exports stay full quality).
      const ms = performance.now() - t0; S.ema = S.ema ? S.ema * 0.9 + ms * 0.1 : ms;
      if (S.playing && subs > 1 && S.ema > (1000 / S.fps) * 1.15) { S.subCap = subs - 1; S.ema = 0; post("perf", { subs: S.subCap }); }
      post("time", { t: S.t, frame: f, frames: frames(), playing: S.playing, duration: S.duration, fps: S.fps });
    }
  }

  function snapshot(t, w) {
    const c = document.createElement("canvas");
    c.width = w; c.height = Math.round((w * S.H) / S.W);
    renderAt(c.getContext("2d"), c.width, c.height, t, 1);
    return c.toDataURL("image/jpeg", 0.78);
  }

  window.addEventListener("message", e => {
    const m = e.data;
    if (!m || !m.ptmCmd) return;
    switch (m.ptmCmd) {
      case "play": if (S.t >= S.duration) S.t = 0; S.playing = true; S.dirty = true; break;
      case "pause": S.playing = false; S.dirty = true; break;
      case "seek": S.t = clamp(+m.t || 0, 0, S.duration); S.dirty = true; break;
      case "step": S.playing = false; S.t = clamp(S.lastFrame + (m.n | 0), 0, frames() - 1) / S.fps; S.dirty = true; break;
      case "loop": S.loop = !!m.on; break;
      case "config": {
        let rebake = false;
        if (m.fps && m.fps !== S.fps) { S.fps = m.fps; rebake = true; }
        if (m.duration && m.duration !== S.duration) { S.duration = m.duration; rebake = true; }
        if (m.pixel != null) S.pixel = m.pixel;
        if (m.camera != null) S.camMode = m.camera;
        if (m.camK != null) S.camK = m.camK;
        if (m.light != null) S.light = m.light;
        if (m.blur != null) { S.blur = m.blur; S.subCap = 99; S.ema = 0; }
        if (rebake && S.ready) { try { bake(); } catch (err) { fail(err); } }
        S.t = Math.min(S.t, S.duration); S.dirty = true;
        break;
      }
      case "thumb": if (S.ready && !S.broken) post("thumb", { url: snapshot(m.t != null ? m.t : S.duration * 0.4, m.w || 320) }); break;
      case "export": runExport(m.format); break;
      case "cancel": cancelExport = true; break;
    }
  });

  // ---------- exporters ----------
  const progress = (p, label) => post("export-progress", { p, label });
  const breathe = () => new Promise(r => setTimeout(r, 0));
  const even = n => Math.max(2, Math.round(n / 2) * 2);
  function checkCancel() { if (cancelExport) throw new Error("cancelled"); }

  async function runExport(format) {
    if (exporting || !S.ready || S.broken) return;
    exporting = true; cancelExport = false;
    try {
      const out = format === "video" ? await exportVideo() : format === "gif" ? await exportGif() : await exportLottie();
      post("export-done", out);
    } catch (e) {
      post("export-error", { message: String((e && e.message) || e), cancelled: cancelExport });
    } finally {
      exporting = false; S.dirty = true;
    }
  }

  // Video is recorded in real time, so first measure how long one frame takes and pick a size and blur that keeps pace.
  function pickVideoQuality() {
    const budget = 1000 / S.fps, subs0 = exportSubs(), long0 = Math.max(S.W, S.H);
    const options = [[1280, subs0], [1280, Math.ceil(subs0 / 2)], [960, Math.ceil(subs0 / 2)], [960, 1], [720, 1], [540, 1]];
    let last = options[options.length - 1];
    for (const [size, subs] of options) {
      const w = even(S.W * (size / long0)), h = even(S.H * (size / long0));
      const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
      const t0 = performance.now(); for (let i = 0; i < 4; i++) renderAt(g, w, h, (i / 4) * S.duration, subs);
      if ((performance.now() - t0) / 4 < budget * 0.7) return { size, subs, w, h };
      last = [size, subs, w, h];
    }
    const size = last[0]; return { size, subs: last[1], w: even(S.W * (size / long0)), h: even(S.H * (size / long0)) };
  }

  // MP4 where the browser can record it (recent Chrome, Edge, Safari), otherwise WebM.
  async function exportVideo() {
    if (typeof MediaRecorder === "undefined") throw new Error("This browser can't record video.");
    const types = ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    const mime = types.find(t => MediaRecorder.isTypeSupported(t));
    if (!mime) throw new Error("This browser can't record video.");
    progress(0, "Choosing a size that keeps your frame rate");
    await breathe();
    const q = pickVideoQuality();
    const c = document.createElement("canvas"); c.width = q.w; c.height = q.h;
    const g = c.getContext("2d");
    const stream = c.captureStream(0), track = stream.getVideoTracks()[0];
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: q.size >= 1280 ? 10e6 : 6e6 });
    const chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise(r => { rec.onstop = r; });
    const N = frames();
    renderAt(g, c.width, c.height, 0, q.subs);
    rec.start(250);
    const start = performance.now();
    try {
      for (let f = 0; f < N; f++) {
        checkCancel();
        renderAt(g, c.width, c.height, f / S.fps, q.subs);
        if (track.requestFrame) track.requestFrame();
        progress((f + 1) / N, "Recording at " + q.w + " px" + (q.subs > 1 ? " with motion blur" : ""));
        const wait = start + ((f + 1) * 1000) / S.fps - performance.now();
        await new Promise(r => setTimeout(r, Math.max(0, wait)));
      }
    } finally {
      rec.stop(); await stopped; track.stop();
    }
    const type = mime.split(";")[0];
    return { blob: new Blob(chunks, { type }), ext: type === "video/mp4" ? "mp4" : "webm", mime: type, width: q.w, blurred: q.subs > 1 };
  }

  // GIF: one shared 256-colour palette (median cut over sampled frames), ordered dithering, LZW.
  async function exportGif() {
    const gfps = Math.min(S.fps, 24), N = Math.max(1, Math.round(S.duration * gfps)), subs = Math.min(exportSubs(), 4);
    const sc = Math.min(1, 480 / Math.max(S.W, S.H)), w = Math.round(S.W * sc), h = Math.round(S.H * sc);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true });
    const render = i => { renderAt(g, w, h, Math.min(S.duration - 1e-6, i / gfps), subs); return g.getImageData(0, 0, w, h).data; };

    const hist = new Uint32Array(32768), every = Math.max(1, Math.floor(N / 24));
    for (let i = 0; i < N; i += every) {
      checkCancel();
      const d = render(i);
      for (let p = 0; p < d.length; p += 12) hist[((d[p] >> 3) << 10) | ((d[p + 1] >> 3) << 5) | (d[p + 2] >> 3)]++;
      progress((0.25 * (i + 1)) / N, "Choosing colours"); await breathe();
    }
    const pal = medianCut(hist, 256);
    const lut = new Int16Array(32768).fill(-1);
    const nearest = k => {
      let v = lut[k]; if (v >= 0) return v;
      const r = ((k >> 10) & 31) * 8 + 4, gg = ((k >> 5) & 31) * 8 + 4, b = (k & 31) * 8 + 4;
      let best = 1e9;
      for (let i = 0; i < pal.length; i++) { const dr = pal[i][0] - r, dg = pal[i][1] - gg, db = pal[i][2] - b, d = dr * dr * 3 + dg * dg * 4 + db * db * 2; if (d < best) { best = d; v = i; } }
      lut[k] = v; return v;
    };
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const gif = gifWriter(w, h, pal), ix = new Uint8Array(w * h);
    for (let i = 0; i < N; i++) {
      checkCancel();
      const d = render(i);
      for (let y = 0, p = 0, q = 0; y < h; y++) for (let x = 0; x < w; x++, p += 4, q++) {
        const o = (bayer[((y & 3) << 2) | (x & 3)] - 7.5) * 0.6;
        const r = clamp(d[p] + o, 0, 255), gg = clamp(d[p + 1] + o, 0, 255), b = clamp(d[p + 2] + o, 0, 255);
        ix[q] = nearest(((r >> 3) << 10) | ((gg >> 3) << 5) | (b >> 3));
      }
      const delay = Math.round(((i + 1) * 100) / gfps) - Math.round((i * 100) / gfps);
      gif.frame(ix, delay);
      progress(0.25 + (0.75 * (i + 1)) / N, "Encoding GIF"); await breathe();
    }
    return { blob: gif.finish(), ext: "gif", mime: "image/gif" };
  }

  function medianCut(hist, max) {
    const ch = (k, a) => (a === 0 ? (k >> 10) & 31 : a === 1 ? (k >> 5) & 31 : k & 31);
    const cols = [];
    for (let k = 0; k < 32768; k++) if (hist[k]) cols.push(k);
    const box = cs => {
      const mn = [31, 31, 31], mx = [0, 0, 0]; let count = 0;
      for (const k of cs) { count += hist[k]; for (let a = 0; a < 3; a++) { const v = ch(k, a); if (v < mn[a]) mn[a] = v; if (v > mx[a]) mx[a] = v; } }
      const rg = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]], axis = rg.indexOf(Math.max(...rg));
      return { cs, count, axis, range: rg[axis] };
    };
    let boxes = cols.length ? [box(cols)] : [];
    while (boxes.length < max) {
      let bi = -1, best = 0;
      boxes.forEach((b, i) => { if (b.cs.length < 2) return; const s = b.count * (b.range + 1); if (s > best) { best = s; bi = i; } });
      if (bi < 0) break;
      const b = boxes[bi];
      b.cs.sort((x, y) => ch(x, b.axis) - ch(y, b.axis));
      let acc = 0, cut = 0;
      for (; cut < b.cs.length - 2; cut++) { acc += hist[b.cs[cut]]; if (acc >= b.count / 2) break; }
      boxes.splice(bi, 1, box(b.cs.slice(0, cut + 1)), box(b.cs.slice(cut + 1)));
    }
    const pal = boxes.map(b => {
      let r = 0, g = 0, bl = 0;
      for (const k of b.cs) { const n = hist[k]; r += (ch(k, 0) * 8 + 4) * n; g += (ch(k, 1) * 8 + 4) * n; bl += (ch(k, 2) * 8 + 4) * n; }
      return [Math.round(r / b.count), Math.round(g / b.count), Math.round(bl / b.count)];
    });
    while (pal.length < 2) pal.push([0, 0, 0]);
    return pal;
  }

  function gifWriter(w, h, pal) {
    const parts = []; let buf = new Uint8Array(1 << 16), pos = 0;
    const byte = b => { if (pos === buf.length) { parts.push(buf); buf = new Uint8Array(1 << 16); pos = 0; } buf[pos++] = b; };
    const word = v => { byte(v & 255); byte((v >> 8) & 255); };
    const str = s => { for (let i = 0; i < s.length; i++) byte(s.charCodeAt(i)); };
    str("GIF89a"); word(w); word(h); byte(0xf7); byte(0); byte(0);
    for (let i = 0; i < 256; i++) { const c = pal[i] || [0, 0, 0]; byte(c[0]); byte(c[1]); byte(c[2]); }
    byte(0x21); byte(0xff); byte(11); str("NETSCAPE2.0"); byte(3); byte(1); word(0); byte(0);
    function lzw(ix) {
      const MIN = 8, CLEAR = 256, EOI = 257;
      let size = MIN + 1, next = EOI + 1, cur = 0, bits = 0;
      const dict = new Map(), block = [];
      const flush = () => { byte(block.length); for (const b of block) byte(b); block.length = 0; };
      const out = code => { cur |= code << bits; bits += size; while (bits >= 8) { block.push(cur & 255); cur >>= 8; bits -= 8; if (block.length === 255) flush(); } };
      byte(MIN); out(CLEAR);
      let prefix = ix[0];
      for (let i = 1; i < ix.length; i++) {
        const k = ix[i], key = prefix * 256 + k, code = dict.get(key);
        if (code !== undefined) { prefix = code; continue; }
        out(prefix);
        if (next === 4096) { out(CLEAR); dict.clear(); next = EOI + 1; size = MIN + 1; }
        else { if (next >= 1 << size) size++; dict.set(key, next++); }
        prefix = k;
      }
      out(prefix); out(EOI);
      if (bits > 0) block.push(cur & 255);
      if (block.length) flush();
      byte(0);
    }
    return {
      frame(ix, delay) {
        byte(0x21); byte(0xf9); byte(4); byte(0); word(Math.max(2, delay)); byte(0); byte(0);
        byte(0x2c); word(0); word(0); word(w); word(h); byte(0);
        lzw(ix);
      },
      finish() { byte(0x3b); parts.push(buf.slice(0, pos)); return new Blob(parts, { type: "image/gif" }); }
    };
  }

  // Lottie: a valid Lottie JSON with one embedded image per frame. It plays in any Lottie player,
  // but it is raster, not vector (see docs/ARCHITECTURE.md for the vector path).
  async function exportLottie() {
    const lfps = Math.min(S.fps, 24), N = Math.max(1, Math.round(S.duration * lfps)), subs = Math.min(exportSubs(), 4);
    const sc = Math.min(1, 480 / Math.max(S.W, S.H)), w = Math.round(S.W * sc), h = Math.round(S.H * sc);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d");
    const assets = [], layers = [];
    const still = v => ({ a: 0, k: v });
    for (let i = 0; i < N; i++) {
      checkCancel();
      renderAt(g, w, h, Math.min(S.duration - 1e-6, i / lfps), subs);
      assets.push({ id: "frame_" + i, w, h, u: "", p: c.toDataURL("image/jpeg", 0.82), e: 1 });
      layers.push({ ddd: 0, ind: i + 1, ty: 2, nm: "Frame " + (i + 1), refId: "frame_" + i, sr: 1,
        ks: { o: still(100), r: still(0), p: still([0, 0, 0]), a: still([0, 0, 0]), s: still([100, 100, 100]) },
        ao: 0, ip: i, op: i + 1, st: 0, bm: 0 });
      progress((i + 1) / N, "Building Lottie frames");
      if (i % 3 === 0) await breathe();
    }
    const json = { v: "5.7.4", fr: lfps, ip: 0, op: N, w, h, nm: CONFIG.title || "PromptToMotion", ddd: 0, assets, layers, markers: [] };
    return { blob: new Blob([JSON.stringify(json)], { type: "application/json" }), ext: "json", mime: "application/json" };
  }

  // ---------- start (called by the last script tag, after the scene code has run) ----------
  window.PTM_start = (drawFn, setupFn, simFn) => {
    try {
      if (typeof drawFn !== "function") throw new Error("The scene has no draw(ctx, t, info) function.");
      S.drawFn = drawFn; S.setupFn = setupFn; S.simFn = simFn;
      seed(0);
      S.state = typeof setupFn === "function" ? setupFn(S.W, S.H) : null;
      bake();
      // Self-test: draw a few frames off screen so a scene that crashes mid-timeline is caught before it is shown.
      const tc = document.createElement("canvas");
      tc.width = Math.max(16, Math.round(S.W / 8)); tc.height = Math.max(16, Math.round(S.H / 8));
      for (const k of [0, 0.3, 0.6, 0.97]) {
        renderAt(tc.getContext("2d"), tc.width, tc.height, k * S.duration, 1);
        if (S.broken) return;
      }
      S.ready = true; S.dirty = true;
      post("ready", { frames: frames() });
    } catch (e) { fail(e); }
    requestAnimationFrame(tick);
  };
}
