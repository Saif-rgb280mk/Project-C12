/*
 * PromptToMotion player runtime.
 *
 * This function never runs in the main page. app.js turns it into a string with
 * PTM_runtime.toString() and injects it into the sandboxed preview <iframe>, next to the
 * scene code (written by Claude, the mock generator, or a built-in example).
 *
 * It owns everything that touches the scene:
 *   - the canvas and a deterministic clock (true FPS: draw() is only sampled on frame boundaries)
 *   - play / pause / loop / seek / frame step, driven by postMessage from the page
 *   - the exporters: MP4 or WebM (MediaRecorder), GIF (own encoder), Lottie (image-sequence JSON)
 *
 * Scene contract (what generated code must provide):
 *   function setup(W, H) { return state }        // optional, runs once
 *   function draw(ctx, t, info) { ... }         // required, called once per frame
 *   info = { W, H, duration, progress, frame, frames, fps, state }
 * Helpers available to scenes: TAU, clamp, lerp, hash, noise, ease.*, and a seeded Math.random.
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
  Object.assign(window, { TAU, clamp, lerp, hash, noise, ease });

  // Math.random is reseeded before setup() and before every frame, so the same frame always looks the same.
  const mulberry = a => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const seed = n => { Math.random = mulberry(n * 9973 + 12345); };

  // ---------- state ----------
  const S = {
    W: CONFIG.W, H: CONFIG.H, fps: CONFIG.fps, duration: CONFIG.duration, pixel: CONFIG.pixel || 1,
    loop: CONFIG.loop !== false, playing: CONFIG.autoplay !== false, t: 0, lastFrame: -1, dirty: true,
    ready: false, broken: false, state: null, drawFn: null, setupFn: null
  };
  const frames = () => Math.max(1, Math.round(S.duration * S.fps));
  const frameAt = t => Math.min(frames() - 1, Math.floor(t * S.fps + 1e-6));

  const view = document.getElementById("view");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  view.width = Math.round(S.W * dpr);
  view.height = Math.round(S.H * dpr);
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

  // Draw frame `frame` (time t) into a target context whose pixel size is cw x ch.
  function drawScene(c, cw, ch, t, frame) {
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
    seed(frame + 1);
    try {
      S.drawFn(target, t, { W: S.W, H: S.H, duration: S.duration, progress: t / S.duration, frame, frames: frames(), fps: S.fps, state: S.state });
    } catch (e) { fail(e); }
    target.restore();
    if (S.pixel > 1) { resetCtx(c); c.imageSmoothingEnabled = false; c.drawImage(low, 0, 0, cw, ch); c.imageSmoothingEnabled = true; }
  }

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
      drawScene(vctx, view.width, view.height, f / S.fps, f);
      post("time", { t: S.t, frame: f, frames: frames(), playing: S.playing, duration: S.duration, fps: S.fps });
    }
  }

  function snapshot(t, w) {
    const c = document.createElement("canvas");
    c.width = w; c.height = Math.round((w * S.H) / S.W);
    const f = frameAt(t);
    drawScene(c.getContext("2d"), c.width, c.height, f / S.fps, f);
    return c.toDataURL("image/jpeg", 0.75);
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
      case "config":
        if (m.fps) S.fps = m.fps;
        if (m.duration) S.duration = m.duration;
        if (m.pixel != null) S.pixel = m.pixel;
        S.t = Math.min(S.t, S.duration); S.dirty = true;
        break;
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

  // MP4 where the browser can record it (recent Chrome, Edge, Safari), otherwise WebM.
  async function exportVideo() {
    if (typeof MediaRecorder === "undefined") throw new Error("This browser can't record video.");
    const types = ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    const mime = types.find(t => MediaRecorder.isTypeSupported(t));
    if (!mime) throw new Error("This browser can't record video.");
    const sc = 1280 / Math.max(S.W, S.H);
    const c = document.createElement("canvas");
    c.width = even(S.W * sc); c.height = even(S.H * sc);
    const g = c.getContext("2d");
    const stream = c.captureStream(0), track = stream.getVideoTracks()[0];
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6 });
    const chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise(r => { rec.onstop = r; });
    const N = frames();
    drawScene(g, c.width, c.height, 0, 0);
    rec.start(250);
    const start = performance.now();
    try {
      for (let f = 0; f < N; f++) {
        checkCancel();
        drawScene(g, c.width, c.height, f / S.fps, f);
        if (track.requestFrame) track.requestFrame();
        progress((f + 1) / N, "Recording video in real time");
        const wait = start + ((f + 1) * 1000) / S.fps - performance.now();
        await new Promise(r => setTimeout(r, Math.max(0, wait)));
      }
    } finally {
      rec.stop(); await stopped; track.stop();
    }
    const type = mime.split(";")[0];
    return { blob: new Blob(chunks, { type }), ext: type === "video/mp4" ? "mp4" : "webm", mime: type };
  }

  // GIF: one shared 256-colour palette (median cut over sampled frames), ordered dithering, LZW.
  async function exportGif() {
    const gfps = Math.min(S.fps, 30), N = Math.max(1, Math.round(S.duration * gfps));
    const sc = Math.min(1, 480 / Math.max(S.W, S.H)), w = Math.round(S.W * sc), h = Math.round(S.H * sc);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true });
    const render = i => { const t = i / gfps; drawScene(g, w, h, t, frameAt(t)); return g.getImageData(0, 0, w, h).data; };

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
    const lfps = Math.min(S.fps, 24), N = Math.max(1, Math.round(S.duration * lfps));
    const sc = Math.min(1, 480 / Math.max(S.W, S.H)), w = Math.round(S.W * sc), h = Math.round(S.H * sc);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d");
    const assets = [], layers = [];
    const still = v => ({ a: 0, k: v });
    for (let i = 0; i < N; i++) {
      checkCancel();
      const t = i / lfps;
      drawScene(g, w, h, t, frameAt(t));
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
  window.PTM_start = (drawFn, setupFn) => {
    try {
      if (typeof drawFn !== "function") throw new Error("The scene has no draw(ctx, t, info) function.");
      S.drawFn = drawFn; S.setupFn = setupFn;
      seed(0);
      S.state = typeof setupFn === "function" ? setupFn(S.W, S.H) : null;
      // Self-test: draw a few frames off screen so a scene that crashes mid-timeline is caught before it is shown.
      const tc = document.createElement("canvas");
      tc.width = Math.max(16, Math.round(S.W / 8)); tc.height = Math.max(16, Math.round(S.H / 8));
      for (const k of [0, 0.3, 0.6, 0.97]) {
        drawScene(tc.getContext("2d"), tc.width, tc.height, k * S.duration, frameAt(k * S.duration));
        if (S.broken) return;
      }
      S.ready = true; S.dirty = true;
      post("ready", { frames: frames() });
    } catch (e) { fail(e); }
    requestAnimationFrame(tick);
  };
}
