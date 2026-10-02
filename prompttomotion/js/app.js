/*
 * PromptToMotion app.
 *
 * Flow: prompt + parameters -> generator (mock or Claude) -> scene code -> sandboxed iframe player -> export / history.
 * Depends on runtime.js (PTM_runtime) and scenes.js (PTM_EXAMPLES, PTM_mock).
 */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // ------------------------------------------------------------------ options
  const ASPECTS = { "16:9": [960, 540], "9:16": [540, 960], "1:1": [720, 720] };
  window.PTM_ASPECTS = ASPECTS;
  const FPS_OPTIONS = [12, 24, 30, 60];
  const CAMERAS = [["static", "Static"], ["push", "Push in"], ["pull", "Pull out"], ["panl", "Pan left"], ["panr", "Pan right"], ["orbit", "Orbit"], ["crane", "Crane"], ["handheld", "Handheld"]];
  const LIGHTS = [["natural", "Natural sunlight", "#fff1d6,#8fb6e8"], ["cinematic", "Cinematic", "#ffb066,#2b6f8f"], ["neon", "Neon glow", "#ff3df2,#22d3ee"], ["golden", "Golden hour", "#ffb45a,#ff6a3a"], ["moonlit", "Moonlit", "#a9c1ff,#3b4a8f"], ["studio", "Studio soft", "#ffffff,#c9d3ea"], ["none", "As drawn", "#7a7f90,#3a3f50"]];
  const BLURS = ["Off", "Light", "Medium", "Heavy"];
  const DETAILS = [["standard", "Standard"], ["high", "High"], ["ultra", "Ultra"]];
  const CAM_NAME = Object.fromEntries(CAMERAS), LIGHT_NAME = Object.fromEntries(LIGHTS.map(l => [l[0], l[1]]));
  const DEFAULT_LOOK = { camera: "static", camK: 1, light: "natural", blur: 1, detail: "high", physics: true };
  const normParams = p => Object.assign({}, DEFAULT_LOOK, p);
  // Viewing preference (not part of an animation): draw the preview at the screen's refresh rate. Downloads always use the chosen frame rate.
  const prefs = { smooth: true };
  try { prefs.smooth = localStorage.getItem("ptm-smooth") !== "0"; } catch (e) { /* storage blocked: keep the default */ }
  const STYLES = [
    { id: "vector", name: "2D Vector", short: "2D", hint: "Flat shapes and bold colour" },
    { id: "3d", name: "3D Render", short: "3D", hint: "Depth, light and shadow" },
    { id: "anime", name: "Anime", short: "Anime", hint: "Ink outlines, cel shading" },
    { id: "pixel", name: "Pixel Art", short: "Pixel", hint: "Chunky pixels, few colours" },
    { id: "frames", name: "Frame-by-Frame", short: "Hand-drawn", hint: "Hand-drawn, 8 drawings a second" }
  ];
  const STYLE_NAME = Object.fromEntries(STYLES.map(s => [s.id, s.name]));
  // The hero preview plays these in turn, generated live by the real engine as each prompt is typed.
  const HERO_SHOW = [
    { prompt: "A runner sprinting across city rooftops at sunset with a flowing scarf", style: "3d", light: "golden", camera: "handheld" },
    { prompt: "A dragon flying over snowy mountains breathing fire at night", style: "anime", light: "cinematic", camera: "push" },
    { prompt: "A knight castle on a hill at sunset with waving flags", style: "3d", light: "golden", camera: "orbit" },
    { prompt: "A UFO hovering over a quiet pine forest at night", style: "3d", light: "moonlit", camera: "pull" },
    { prompt: "Neon rain over a cyberpunk city", style: "anime", light: "neon", camera: "panr" },
    { prompt: "A pirate ship sailing through a storm at night with lightning", style: "vector", light: "cinematic", camera: "crane" },
    { prompt: "A rocket lifting off from a snowy launch pad while stars twinkle", style: "3d", light: "natural", camera: "push" },
    { prompt: "Fish swimming in an aquarium with bubbles", style: "vector", light: "studio", camera: "panl" }
  ];
  const IDEAS = HERO_SHOW.map(h => h.prompt);
  const HISTORY_KEY = "ptm-history-v1", HISTORY_MAX = 24;

  // ------------------------------------------------------------------ capabilities (present inside claude.ai only)
  const useCap = name => (window.claude && window.claude.use ? window.claude.use(name).catch(() => null) : Promise.resolve(null));
  const samplePromise = useCap("sample");
  const downloadsPromise = useCap("downloads");

  // ------------------------------------------------------------------ player: one sandboxed iframe + messaging
  const players = new Set();
  let SID = 0;
  const escScript = s => String(s).replace(/<\/script/gi, "<\\/script");

  function buildDoc(code, cfg) {
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;overflow:hidden;background:#000}#view{display:block;width:100%;height:100%;object-fit:contain}</style></head><body><canvas id="view"></canvas>
<script>(${escScript(PTM_runtime.toString())})(${escScript(JSON.stringify(cfg))});</script>
<script>${escScript(code)}</script>
<script>PTM_start(typeof draw==="function"?draw:null,typeof setup==="function"?setup:null,typeof simulate==="function"?simulate:null);</script></body></html>`;
  }

  class Player {
    constructor(host, opts = {}) {
      this.host = host; this.frame = null; this.sid = 0; this.loop = opts.loop !== false;
      this.onTime = opts.onTime || (() => {}); this.onError = opts.onError || (() => {}); this.onEnded = opts.onEnded || (() => {}); this.onPerf = opts.onPerf || (() => {});
      this.pending = null; this.thumbWait = null; this.exportWait = null; this.last = null;
      players.add(this);
    }
    load(take, { autoplay = true } = {}) {
      const p = take.params, [W, H] = ASPECTS[p.aspect];
      this.sid = ++SID; this.last = null;
      const cfg = { sid: this.sid, W, H, fps: p.fps, duration: p.duration, pixel: p.style === "pixel" ? 4 : 1, smooth: prefs.smooth, camera: p.camera || "static", camK: p.camK == null ? 1 : p.camK, light: p.light || "none", blur: p.blur || 0, loop: this.loop, autoplay, title: take.title };
      const f = document.createElement("iframe");
      f.setAttribute("sandbox", "allow-scripts");
      f.title = "Animation preview";
      f.srcdoc = buildDoc(take.code, cfg);
      if (this.frame) this.frame.remove();
      this.host.style.aspectRatio = W + " / " + H; this.host.style.setProperty("--ar", W / H);
      this.host.prepend(f);
      this.frame = f;
      if (this.pending) this.pending({ ok: false, message: "replaced" });
      return new Promise(res => {
        this.pending = res;
        clearTimeout(this.readyTimer);
        this.readyTimer = setTimeout(() => { if (this.pending === res) { this.pending = null; res({ ok: false, message: "The animation didn't start in time." }); } }, 8000);
      });
    }
    cmd(name, extra) { if (this.frame && this.frame.contentWindow) this.frame.contentWindow.postMessage(Object.assign({ ptmCmd: name }, extra), "*"); }
    thumb(t, w = 320) {
      return new Promise(res => {
        this.thumbWait = res;
        this.cmd("thumb", { t, w });
        setTimeout(() => { if (this.thumbWait === res) { this.thumbWait = null; res(null); } }, 3000);
      });
    }
    export(format, onProgress) {
      return new Promise((resolve, reject) => { this.exportWait = { resolve, reject, onProgress }; this.cmd("export", { format }); });
    }
    destroy() { players.delete(this); if (this.frame) this.frame.remove(); clearTimeout(this.readyTimer); }
    handle(m) {
      switch (m.ev) {
        case "ready": clearTimeout(this.readyTimer); if (this.pending) { this.pending({ ok: true }); this.pending = null; } break;
        case "error":
          clearTimeout(this.readyTimer);
          if (this.pending) { this.pending({ ok: false, message: m.message }); this.pending = null; }
          else this.onError(m.message);
          break;
        case "time": this.last = m; this.onTime(m); break;
        case "ended": this.onEnded(); break;
        case "perf": this.onPerf(m.smooth === false ? false : m.subs); break;
        case "thumb": if (this.thumbWait) { this.thumbWait(m.url); this.thumbWait = null; } break;
        case "export-progress": if (this.exportWait && this.exportWait.onProgress) this.exportWait.onProgress(m.p, m.label); break;
        case "export-done": if (this.exportWait) { this.exportWait.resolve(m); this.exportWait = null; } break;
        case "export-error": if (this.exportWait) { this.exportWait.reject(Object.assign(new Error(m.message), { cancelled: m.cancelled })); this.exportWait = null; } break;
      }
    }
  }
  window.addEventListener("message", e => {
    const m = e.data;
    if (!m || !m.ptm) return;
    for (const p of players) if (p.frame && e.source === p.frame.contentWindow && m.sid === p.sid) p.handle(m);
  });

  // ------------------------------------------------------------------ small helpers
  const fmtTime = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return String(m).padStart(2, "0") + ":" + r.toFixed(2).padStart(5, "0"); };
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "animation";
  const ago = ts => { const s = (Date.now() - ts) / 1000; return s < 60 ? "just now" : s < 3600 ? Math.floor(s / 60) + " min ago" : s < 86400 ? Math.floor(s / 3600) + " h ago" : Math.floor(s / 86400) + " d ago"; };
  const uid = () => "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const bringIntoView = (el, block = "center") => { const r = el.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight) el.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block }); };
  const bytes = n => (n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
  const metaLine = t => t.params.aspect + " · " + t.params.duration + " s · " + t.params.fps + " fps · " + STYLE_NAME[t.params.style];
  const lookLine = t => { const p = normParams(t.params); return [LIGHT_NAME[p.light], CAM_NAME[p.camera], p.blur ? BLURS[p.blur] + " blur" : "No blur"].join(" · "); };

  // ------------------------------------------------------------------ state
  let cur = null;                       // the take shown in the viewer (its params are the live settings)
  let engine = "mock", busy = null, repairs = 0, tab = "mine";
  let history = [];
  try { history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]").filter(t => t && t.code && t.params).map(t => Object.assign(t, { params: normParams(t.params) })); } catch { history = []; }
  // Animations made by the offline generator are rebuilt from their prompt when the generator improves, so old saves get fixes too.
  const rebuilt = [];
  for (const t of history) if (t.engine === "mock" && t.mv !== PTM_MOCK_VERSION) { try { const m = PTM_mock(String(t.prompt).split(" → ")[0], t.params.style); t.code = m.code; t.sound = { layers: m.analysis.layers, sky: m.analysis.sky }; t.mv = PTM_MOCK_VERSION; rebuilt.push(t); } catch (e) { /* keep the old code */ } }
  const saveHistory = () => {
    for (let n = history.length; n >= 0; n--) {
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, n))); return; } catch { /* quota: keep fewer */ }
    }
  };

  // ------------------------------------------------------------------ UI: style, aspect, fps, ideas
  function renderControls() {
    const seg = (host, items, attr, onPick, label) => {
      host.innerHTML = "";
      for (const [id, text, tip] of items) { const b = mk("button", "", text); b.type = "button"; b.setAttribute("role", "radio"); b.dataset[attr] = id; if (tip) b.title = tip; b.onclick = () => onPick(id); host.append(b); }
    };
    seg($("#styleSeg"), STYLES.map(s => [s.id, s.short, s.hint]), "style", v => setParam("style", v));
    seg($("#aspectSeg"), Object.keys(ASPECTS).map(a => [a, a]), "aspect", v => setParam("aspect", v));
    seg($("#fpsSeg"), FPS_OPTIONS.map(f => [String(f), String(f)]), "fps", v => setParam("fps", +v));
    seg($("#blurSeg"), BLURS.map((n, i) => [String(i), n]), "blur", v => setParam("blur", +v));
    seg($("#detailSeg"), DETAILS.map(([id, n]) => [id, n]), "detail", v => setParam("detail", v));
    const fill = (sel, items) => { sel.innerHTML = ""; for (const [id, name] of items) { const o = mk("option", "", name); o.value = id; sel.append(o); } };
    fill($("#cameraSel"), CAMERAS); fill($("#lightSel"), LIGHTS.map(l => [l[0], l[1]]));
    $("#cameraSel").onchange = e => setParam("camera", e.target.value);
    $("#lightSel").onchange = e => setParam("light", e.target.value);
    $("#surpriseBtn").onclick = () => { const pool = IDEAS.filter(t => t !== $("#prompt").value); setVal($("#prompt"), pool[Math.floor(Math.random() * pool.length)]); $("#prompt").focus(); };
  }

  function syncControls() {
    const p = cur.params, on = (sel, attr, val) => document.querySelectorAll(sel).forEach(b => b.setAttribute("aria-checked", String(b.dataset[attr]) === String(val)));
    on("#styleSeg button", "style", p.style); on("#aspectSeg button", "aspect", p.aspect); on("#fpsSeg button", "fps", p.fps);
    on("#blurSeg button", "blur", p.blur); on("#detailSeg button", "detail", p.detail);
    $("#duration").value = p.duration; $("#durationOut").textContent = p.duration + " s";
    $("#cameraSel").value = p.camera; $("#lightSel").value = p.light;
    $("#camK").value = p.camK; $("#camKOut").textContent = Number(p.camK).toFixed(1) + "×"; $("#camK").disabled = p.camera === "static";
    $("#physics").checked = !!p.physics;
    $("#lookSummary").textContent = lookLine(cur);
    $("#takeTitle").textContent = cur.title;
    $("#takeMeta").textContent = metaLine(cur);
    $("#code").textContent = cur.code.trim();
    $("#loopBtn").setAttribute("aria-pressed", player.loop);
    updateTimecode(player.last);
  }

  // Changing a setting updates the take that is on screen straight away.
  let reloadTimer = 0;
  function setParam(key, value) {
    if (busy || !cur) return;
    if (cur.params[key] === value) return;
    cur.params[key] = value;
    if (key === "style") {
      if (cur.engine === "mock") { const m = PTM_mock(cur.prompt.split(" → ")[0], value); cur.code = m.code; cur.note = m.note; cur.mv = PTM_MOCK_VERSION; }
      $("#styleNote").textContent = cur.engine === "mock" ? "" : "This animation keeps its look. Pick Generate to redraw it in the new style. Pixel Art applies right away.";
    }
    if ((key === "duration" || key === "fps") && player.last) {   // show the new frame count right away, even if the preview is off screen
      const L = player.last, d = cur.params.duration, f = cur.params.fps, t = Math.min(L.t, d);
      player.last = Object.assign({}, L, { t, duration: d, fps: f, frames: Math.round(d * f), frame: Math.min(Math.round(d * f) - 1, Math.floor(t * f)) });
    }
    syncControls();
    if (key === "duration" || key === "fps" || key === "camera" || key === "camK" || key === "light" || key === "blur") player.cmd("config", { [key]: value });
    else if (key === "detail" || key === "physics") setStatus("Scene detail and physics shape the next animation you generate.");
    else { clearTimeout(reloadTimer); reloadTimer = setTimeout(() => showTake(cur), 120); }
    persistCurrent();
  }

  // ------------------------------------------------------------------ viewer
  const monitor = $("#monitor");
  let scrubbing = false;
  const player = new Player(monitor, {
    onTime: m => { updateTimecode(m); if (window.PTM_SND) PTM_SND.onTime(m); },
    onError: msg => showError("This animation hit an error: " + msg),
    onEnded: () => setPlayIcon(false),
    onPerf: info => {
      if (info === false) { prefs.smooth = false; $("#smooth").checked = false; setStatus("This computer couldn't keep up with smooth preview, so it switched to drawing on your chosen frame rate. Downloads are not affected."); }
      else setStatus("The preview lowered its motion blur to keep the frame rate. Downloads use full quality.");
    }
  });
  function setPlayIcon(playing) {
    $("#playIcon").innerHTML = playing ? '<path d="M3 2h4v12H3zM9 2h4v12H9z"/>' : '<path d="M4 2l10 6-10 6z"/>';
    $("#playBtn").setAttribute("aria-label", playing ? "Pause" : "Play");
  }
  function updateTimecode(m) {
    const d = cur ? cur.params.duration : 0;
    if (!m) { $("#timecode").textContent = fmtTime(0) + " / " + fmtTime(d); $("#frameNo").textContent = "frame 1/" + Math.round(d * (cur ? cur.params.fps : 30)); return; }
    $("#timecode").textContent = fmtTime(m.t) + " / " + fmtTime(m.duration);
    $("#frameNo").textContent = "frame " + (m.frame + 1) + "/" + m.frames;
    setPlayIcon(m.playing);
    if (!scrubbing) $("#scrub").value = Math.round((m.t / m.duration) * 1000);
  }
  function showError(msg) {
    $("#errText").textContent = msg;
    $("#errBox").classList.remove("hidden"); $("#errBox").classList.add("flex");
    $("#fixBtn").hidden = !(cur && cur.engine === "claude");
  }
  function clearError() { $("#errBox").classList.add("hidden"); $("#errBox").classList.remove("flex"); }

  async function showTake(take, { autoplay = true } = {}) {
    cur = take; clearError();
    if (window.PTM_SND) PTM_SND.setTake(take, take.params);
    syncControls();
    const r = await player.load(take, { autoplay });
    if (r.message === "replaced") return r;
    if (!r.ok) showError("This animation couldn't start: " + r.message);
    return r;
  }

  $("#playBtn").onclick = () => { const playing = player.last ? player.last.playing : true; player.cmd(playing ? "pause" : "play"); };
  $("#prevBtn").onclick = () => player.cmd("step", { n: -1 });
  $("#nextBtn").onclick = () => player.cmd("step", { n: 1 });
  $("#loopBtn").onclick = () => { player.loop = !player.loop; player.cmd("loop", { on: player.loop }); syncControls(); };
  const soundBtn = $("#soundBtn");
  if (window.PTM_SND && PTM_SND.supported) soundBtn.onclick = async () => { const on = await PTM_SND.toggle(); soundBtn.setAttribute("aria-pressed", on); soundBtn.title = on ? "Sound on (downloads are silent)" : "Sound for the preview (downloads are silent)"; }; else soundBtn.hidden = true;
  $("#fullBtn").onclick = () => { (monitor.requestFullscreen ? monitor.requestFullscreen() : Promise.reject()).catch(() => setStatus("Full screen isn't available here.", "err")); };
  const scrub = $("#scrub");
  scrub.addEventListener("pointerdown", () => { scrubbing = true; });
  addEventListener("pointerup", () => { scrubbing = false; });
  scrub.addEventListener("input", () => { scrubbing = true; if (cur) player.cmd("seek", { t: (scrub.value / 1000) * cur.params.duration }); });
  scrub.addEventListener("change", () => { scrubbing = false; });
  document.addEventListener("keydown", e => {
    const tag = e.target.tagName;
    if (tag === "INPUT" && e.target.type !== "range" || tag === "TEXTAREA" || tag === "SELECT" || e.metaKey || e.ctrlKey) return;
    if (e.key === " " && tag !== "BUTTON") { e.preventDefault(); $("#playBtn").click(); }
    else if (e.key === "ArrowLeft" && tag !== "INPUT") { e.preventDefault(); $("#prevBtn").click(); }
    else if (e.key === "ArrowRight" && tag !== "INPUT") { e.preventDefault(); $("#nextBtn").click(); }
    else if ((e.key === "l" || e.key === "L") && tag !== "BUTTON") $("#loopBtn").click();
  });
  $("#duration").addEventListener("input", e => setParam("duration", +e.target.value));
  $("#camK").addEventListener("input", e => setParam("camK", +e.target.value));
  $("#physics").addEventListener("change", e => setParam("physics", e.target.checked));
  $("#smooth").checked = prefs.smooth;
  $("#smooth").addEventListener("change", e => { prefs.smooth = e.target.checked; try { localStorage.setItem("ptm-smooth", prefs.smooth ? "1" : "0"); } catch (err) { /* ignore */ } player.cmd("config", { smooth: prefs.smooth }); heroPlayer.cmd("config", { smooth: prefs.smooth }); });

  // ------------------------------------------------------------------ status + busy overlay (a tiny job runner)
  function setStatus(text, kind) { const s = $("#status"); s.textContent = text; s.style.color = kind === "err" ? "var(--err)" : kind === "ok" ? "var(--ok)" : "var(--mute)"; }

  const FX = window.PTM_FX || { play: () => Promise.resolve(), typeInto: (el, t) => { el.textContent = t; return () => {}; }, orb: () => ({ start() {}, stop() {}, burst() {} }), reduce: true };
  const orb = FX.orb($("#orbCanvas"));
  let stopTyping = () => {};
  const setVal = (el, v) => { el.value = v; el.dispatchEvent(new Event("input")); };

  // The finish of every transition: the orb bursts, the new preview pulls into focus and an iris closes over the overlay.
  async function irisReveal(busyEl, frame, orbObj) {
    orbObj.burst();
    if (frame) FX.play(frame, { filter: ["blur(16px)", "blur(0px)"], scale: [1.09, 1], opacity: [0.15, 1] }, { duration: 1, ease: "out" });
    await FX.play(busyEl, { clipPath: ["circle(150% at 50% 50%)", "circle(0% at 50% 50%)"] }, { duration: 0.9, ease: "inOut", keep: true });
    busyEl.hidden = true; busyEl.style.cssText = ""; orbObj.stop();
  }

  function startJob(title, steps, promptText) {
    const ul = $("#busySteps"); ul.innerHTML = "";
    const items = steps.map(s => { const li = mk("li"); li.dataset.s = "todo"; li.append(mk("span", "dot"), mk("span", "", s)); ul.append(li); return li; });
    const busyEl = $("#busy"), mon = $("#monitor");
    $("#busyTitle").textContent = title; $("#busyDetail").textContent = ""; $("#busyBar").style.width = "0%";
    busyEl.hidden = false; busyEl.style.cssText = "";
    mon.classList.add("making");
    $("#generateBtn").dataset.busy = "1"; $("#generateBtn .btn-label").textContent = "Making your animation…";
    // The overlay fades in over the old preview, which blurs and dims behind it. The prompt is typed into the orb.
    FX.play(busyEl, { opacity: [0, 1], scale: [1.04, 1] }, { duration: 0.4 });
    if (player.frame) FX.play(player.frame, { filter: ["blur(0px)", "blur(10px)"], scale: [1, 1.05] }, { duration: 0.5, keep: true });
    orb.start(); stopTyping(); stopTyping = FX.typeInto($("#promptEcho"), promptText ? "“" + promptText + "”" : "", 46);
    const job = {
      ctl: new AbortController(), step: -1,
      next(detail) { if (this.step >= 0) items[this.step].dataset.s = "done"; this.step++; if (items[this.step]) items[this.step].dataset.s = "run"; $("#busyBar").style.width = Math.min(100, ((this.step + 1) / items.length) * 100 - 6) + "%"; if (detail != null) this.detail(detail); },
      detail(t) { $("#busyDetail").textContent = t; },
      // On success the orb bursts, an iris closes over the overlay and the new preview pulls into focus.
      async end(success) {
        items.forEach(li => (li.dataset.s = "done")); $("#busyBar").style.width = "100%";
        busy = null; $("#generateBtn").disabled = $("#changeBtn").disabled = false;
        $("#generateBtn").dataset.busy = "0"; $("#generateBtn .btn-label").textContent = "Generate animation";
        stopTyping(); mon.classList.remove("making");
        if (success && player.frame) { await irisReveal(busyEl, player.frame, orb); return; }
        if (player.frame) FX.play(player.frame, { filter: ["blur(10px)", "blur(0px)"], scale: [1.05, 1] }, { duration: 0.4 });
        await FX.play(busyEl, { opacity: [1, 0] }, { duration: 0.3, keep: true });
        busyEl.hidden = true; busyEl.style.cssText = ""; orb.stop();
      }
    };
    busy = job; $("#generateBtn").disabled = $("#changeBtn").disabled = true;
    job.next();
    return job;
  }
  $("#stopBtn").onclick = () => { if (busy) busy.ctl.abort(); };

  // ------------------------------------------------------------------ generators
  const STYLE_GUIDE = {
    vector: "2D vector look: flat colours, clean geometric shapes, a tight harmonious palette, minimal gradients, smooth easing, playful overlapping motion.",
    "3d": "3D render look: convincing depth from perspective, radial and linear gradients for volume, soft drop shadows, glow, parallax layers and lighting that moves with the action. Fake 3D is fine.",
    anime: "Anime look: cel shading with two or three tones per object, bold dark ink outlines, dramatic sky, speed lines and sparkles on fast moments, punchy saturated colour.",
    pixel: "Pixel art look: the canvas is rendered at one quarter resolution and scaled up with hard edges, so use chunky bold shapes, avoid thin lines and smooth gradients, and limit yourself to about 12 colours.",
    frames: "Frame-by-frame hand-drawn look: quantise time to about 8 drawings per second (const q = Math.floor(progress * drawings) / drawings, with drawings = Math.round(duration * 8)) and drive all motion from q so it moves in held steps. Add a small wobble to every line using hash(...) of the drawing number, and draw slightly imperfect outlines on a warm paper-coloured background."
  };

  const DETAIL_GUIDE = {
    standard: "Detail level Standard: about 6 to 8 layers and clear, tidy shapes. Keep it under about 300 lines.",
    high: "Detail level High: a rich background with at least 3 parallax depth layers and atmospheric haze; secondary details (small props, birds, lights, reflections); particle effects (dust, sparks, mist); soft shadows and gradient shading on every subject; secondary motion on everything that moves. Keep it under about 380 lines.",
    ultra: "Detail level Ultra: maximum detail. 5 or more depth layers; textured surfaces (windows, bricks, leaves, waves) built from many small elements; light shafts and glow; particles; reflections; contact shadows; rim lighting; overlapping secondary animation. It may reach about 450 lines but must still hold the frame rate, so batch similar fills and never create gradients inside big loops."
  };

  function rulesFor(params) {
    const [W, H] = ASPECTS[params.aspect];
    const p = normParams(params);
    return `You write high-detail animations for a web app. Your JavaScript runs as a classic <script> in a page that already has a full-window <canvas>, and you must follow this exact contract.

CONTRACT
- Define these top-level functions: setup(W, H) (optional; runs once; returns a small state object), simulate(state, dt, t, info) (optional; physics, see below) and draw(ctx, t, info) (required; called once per frame, and several times per frame when motion blur is on).
- ctx is a Canvas 2D context. Draw in a ${W} by ${H} pixel coordinate space (info.W and info.H); it is scaled for you. The canvas is already cleared to black before each call, so paint your own background every frame.
- t is seconds from 0 to info.duration. info = { W, H, duration: ${p.duration}, progress (t / duration, 0 to 1), frame, frames, fps: ${p.fps}, state, camera, light }.
- draw() must be a PURE function of t and info.state: the same t always draws the same picture. Never accumulate state between draw calls, never use Date or performance.now. Compute positions from t or progress. Build per-object data in setup() using hash(i), never Math.random for things that must stay put.
- Make it a seamless loop: every repeating motion should complete a whole number of cycles over progress 0 to 1, or fade or start off screen, so frame 1 follows the last frame smoothly.
- Helpers already defined, do not redeclare them: TAU, clamp(v,a,b), lerp(a,b,k), hash(n) (deterministic 0 to 1), noise(x) (smooth 1D noise), ease.in, ease.out, ease.inOut, ease.sine, ease.outBack, ease.outElastic (each takes 0 to 1), and PHYS (see below).
- Use only Canvas 2D and plain JavaScript. No imports, libraries, network, images, or external fonts. Text may use system-ui with ctx.fillText. Do not touch the DOM.
- Fill the entire canvas and place everything relative to W and H, so it works at any aspect ratio.
- The picture is drawn up to ${p.fps} times a second, so keep draw() efficient.

CAMERA AND LIGHT (the app applies these after you draw)
- The app already applies the camera move (${CAM_NAME[p.camera]}) and the colour grade (${LIGHT_NAME[p.light]}: bloom, vignette, tint) to whatever you draw, and it adds motion blur (${BLURS[p.blur]}). Do NOT draw vignettes, bloom, film grain, letterbox bars, camera shake or motion blur yourself.
- info.camera = { x, y, zoom, rot } (x and y are fractions of the frame). Use it to add parallax: shift each layer by info.camera.x * W * depth, with depth from 0.1 (far) to 1 (near).
- info.light = { dx, dy, color, color2, ambient, shadow }. dx and dy are a unit vector pointing TOWARD the light in screen coordinates (y is down). Put highlights and rim light on the side that faces the light, cast shadows the opposite way in the shadow colour, and tint highlights with info.light.color. Shade every subject with at least a light and a dark tone so it looks lit, not flat.

PHYSICS AND MOVEMENT
- ${p.physics ? "Use physics for anything soft or springy (hair, scarves, cloth, ropes, tails, flags, splashes, bouncing)." : "Physics is optional here."} Define simulate(state, dt, t, info); it changes state one small fixed step at a time (info has W, H, fps, duration, frame). The app runs it once and stores every frame, so scrubbing, looping and export stay exact. draw() reads the result from info.state. Keep state small and JSON-friendly (numbers, arrays, plain objects); keep static scene data (buildings, stars) in module-level variables made in setup, not in state.
- PHYS.spring(s, target, k, d, dt) with s = {x, v}; PHYS.makeChain(n, x, y, len) and PHYS.chain(points, anchorX, anchorY, dt, {gravity, wind, damping, iters}) for verlet cloth and rope; PHYS.ik2(ax, ay, tx, ty, l1, l2, dir) for two-bone legs and arms (returns the knee or elbow {x, y} and the end point {ex, ey}; dir is 1 or -1 for which way the joint bends).
- Characters need a real walk or run cycle: feet planted on the ground during stance, opposite arm swing, body bob and lean, anticipation before a jump, squash and stretch on landings, and follow-through on cloth and hair. Move joints with easing, never linearly.

GROUND CONTACT (no foot may ever sink into the floor)
- Choose one ground line, for example groundY = H * 0.84, and draw the floor from there down. Every foot is a shape with a flat sole, and the lowest point of the sole must never be below groundY, in any frame.
- A planted foot has its sole exactly on groundY: with the shoe drawn around the ankle, put the ankle at groundY minus the sole thickness minus 1 pixel. Never put the ankle itself on groundY, that pushes the shoe into the floor. While a foot swings, lift it along an arc.
- Legs must be able to reach the planted foot. Use PHYS.hipHeight(l1, l2, stride, bob) for the hip height above the ankle line and keep the stride under 0.6 of the leg length, so PHYS.ik2 never has to clamp.
- A planted foot is carried backward at exactly the speed the ground or background scrolls (distance scrolled per loop divided by duration), so it grips the floor instead of skating. The swing foot must leave and land with that same velocity: use a smooth curve (Hermite or eased), never a straight jump.
- Add a soft contact shadow under every planted foot that fades as the foot lifts. On stairs, slopes or platforms, sample the surface height under each foot and plant on that surface.
- Apply the same rule to any body that touches a surface: hands on a wall, wheels on a road, paws on the ground.

SMOOTHNESS
- No value may jump from one frame to the next. Every motion segment starts and ends with continuous speed: blend between poses with smoothstep or ease.inOut, never with a straight cut. Add follow-through (cloth, hair, tail) and overlapping action so parts do not all start and stop together.
- The preview is drawn up to 60 times a second at fractional times, so draw() must accept any t and be continuous in t.

DETAIL
${DETAIL_GUIDE[p.detail]}

STYLE
${STYLE_GUIDE[p.style]}

OUTPUT
Reply with ONLY one JSON object and nothing else: {"title": "short title, at most 6 words", "note": "one sentence on what to watch for", "sky": "one of day, sunset, night, space, underwater", "sound": ["up to 4 tags that describe what the scene should sound like, chosen from: rain, wind, sea, fire, city, lightning, rocket, car, ufo, dragon, character, pines, birds, bubbles, confetti, hearts, neongrid, planets, snow"], "code": "the complete JavaScript"}`;
  }

  async function claudeCall(prompt, params, job) {
    const sample = await samplePromise;
    if (!sample) throw { code: "no_sample" };
    let chars = 0;
    const out = await sample.json(prompt, {
      signal: job.ctl.signal, cache: false, modelTier: $("#tier").value,
      onText: ({ text }) => { chars = text.length; job.detail("Claude has written " + Math.round(chars / 40) + " lines so far"); }
    });
    if (!out || typeof out.code !== "string" || !out.code.trim()) throw { code: "invalid_json" };
    return { title: String(out.title || "Untitled").slice(0, 60), note: String(out.note || ""), code: out.code, sound: Array.isArray(out.sound) ? { layers: out.sound.map(String).slice(0, 6), sky: String(out.sky || "") } : null };
  }

  function errorCopy(e) {
    const c = (e && e.code) || "";
    return ({
      cancelled: "Stopped.", no_sample: "Claude isn't available here, so use the Mock generator or open this page on claude.ai.",
      not_granted: "Claude wasn't allowed to run for this page. Switch to the Mock generator, or allow it and try again.",
      sampling_disabled: "Claude isn't available on this account. Use the Mock generator.",
      rate_limited: "That was a lot of requests in a short time. Wait a minute and try again.",
      refused: "Claude won't make that one. Try describing something different.",
      invalid_json: "Claude's answer came back in the wrong shape. Press the button again.",
      session_expired: "Your claude.ai sign-in expired. Sign in again, then retry."
    })[c] || "Something went wrong reaching Claude. Try again in a moment.";
  }

  // Runs the scene once in the player; if it crashes and Claude wrote it, asks Claude to repair it (once).
  async function previewWithRepair(take, job, params) {
    let r = await showTake(take);
    while (!r.ok && r.message !== "replaced" && take.engine === "claude" && repairs < 1 && !job.ctl.signal.aborted) {
      repairs++;
      job.detail("It hit an error (" + r.message.slice(0, 80) + "). Asking Claude to fix it.");
      const fixed = await claudeCall(`${rulesFor(params)}\n\nThis animation code crashes with the error: ${r.message}\nHere is the code:\n\`\`\`js\n${take.code}\n\`\`\`\nReturn the complete fixed code. Keep the animation the same.`, params, job);
      take.code = fixed.code; r = await showTake(take);
    }
    return r;
  }

  async function finishTake(take) {
    // save a thumbnail, then add to history
    const dur = take.params.duration;
    take.thumb = await player.thumb(dur * 0.4) || "";
    history = [take, ...history.filter(t => t.id !== take.id)].slice(0, HISTORY_MAX);
    tab = "mine"; saveHistory(); renderGallery();
  }
  let persistTimer = 0;
  function persistCurrent() {
    if (!cur || !history.some(t => t.id === cur.id)) return;
    clearTimeout(persistTimer); persistTimer = setTimeout(() => { history = history.map(t => (t.id === cur.id ? cur : t)); saveHistory(); renderGallery(); }, 400);
  }

  async function generate({ prompt, refineFrom, change }) {
    if (busy) return;
    const params = Object.assign({}, cur.params);
    repairs = 0; clearError(); bringIntoView($("#monitor"));
    const useClaude = engine === "claude";
    let ok = false;
    const job = startJob(refineFrom ? "Changing your animation" : "Making your animation",
      useClaude ? ["Sending your brief", "Claude is writing the scene", "Checking that it runs", "Rendering the preview"]
        : ["Reading your prompt", "Planning the scene", "Building layers", "Rendering the preview"], refineFrom ? change : prompt);
    const aborted = () => job.ctl.signal.aborted;
    try {
      let out;
      if (useClaude) {
        job.detail("Style: " + STYLE_NAME[params.style] + ", " + params.aspect + ", " + params.duration + " s");
        const brief = refineFrom
          ? `${rulesFor(params)}\n\nHere is the current animation, made from the request "${refineFrom.prompt}":\n\`\`\`js\n${refineFrom.code}\n\`\`\`\nChange it like this:\n"""${change}"""\nReturn the complete new code, not a diff. Keep everything the viewer didn't ask to change.`
          : `${rulesFor(params)}\n\nThe viewer asked for this animation:\n"""${prompt}"""`;
        job.next("Waiting for Claude…");
        out = await claudeCall(brief, params, job);
        job.next();
      } else {
        // Mock: a real generator with fake queue timing, so the job UI can be tested without any AI.
        await sleep(350); if (aborted()) throw { code: "cancelled" };
        job.next(); const a = PTM_analyze(prompt);
        job.detail("Found: " + (a.layers.filter(l => l !== "abstract").join(", ") || "nothing specific")); await sleep(450);
        if (aborted()) throw { code: "cancelled" };
        job.next(); out = PTM_mock(prompt, params.style); await sleep(300);
        if (aborted()) throw { code: "cancelled" };
      }
      const take = { id: uid(), title: out.title, note: out.note, prompt: refineFrom ? refineFrom.prompt.split(" → ")[0] + " → " + change : prompt, params, code: out.code, engine, mv: engine === "mock" ? PTM_MOCK_VERSION : undefined, created: Date.now(), sound: out.analysis ? { layers: out.analysis.layers, sky: out.analysis.sky } : out.sound || null };
      const r = await previewWithRepair(take, job, params);
      if (r.message === "replaced") return;
      if (r.ok) { ok = true; job.next(); await finishTake(take); setStatus("Done. Your animation is playing.", "ok"); }
      else setStatus("The animation was made but it doesn't run. Try again or change the prompt.", "err");
    } catch (e) {
      setStatus(errorCopy(e), e && e.code === "cancelled" ? "" : "err");
    } finally { await job.end(ok); }
  }

  // ------------------------------------------------------------------ forms
  $("#studioForm").addEventListener("submit", e => {
    e.preventDefault();
    const prompt = $("#prompt").value.trim();
    if (!prompt) { setStatus("Describe your animation first. What should happen, and what should be in it?", "err"); $("#prompt").focus(); return; }
    generate({ prompt });
  });
  $("#prompt").addEventListener("keydown", e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) $("#studioForm").requestSubmit(); });

  $("#changeBtn").onclick = () => {
    const change = $("#change").value.trim();
    if (!change) { setStatus("Type what you want to change first.", "err"); $("#change").focus(); return; }
    if (engine === "mock") {
      // Mock: fold the change into the prompt and rebuild, so keywords in it take effect.
      const prompt = (cur.prompt.split(" → ")[0] + ". " + change).slice(0, 600);
      setVal($("#prompt"), prompt); $("#change").value = ""; generate({ prompt });
    } else { generate({ refineFrom: cur, change }); $("#change").value = ""; }
  };
  $("#change").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); $("#changeBtn").click(); } });
  $("#fixBtn").onclick = () => generate({ refineFrom: cur, change: "It crashes with this error: " + $("#errText").textContent + ". Fix the bug so it runs, and keep the animation the same." });

  $("#heroForm").addEventListener("submit", e => {
    e.preventDefault();
    const v = $("#heroPrompt").value.trim(); if (!v) { $("#heroPrompt").focus(); return; }
    setVal($("#prompt"), v);
    $("#studio").scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth" });
    setTimeout(() => $("#studioForm").requestSubmit(), 350);
  });

  // engine switch
  function setEngine(name, quiet) {
    engine = name;
    document.querySelectorAll("#engineSeg button").forEach(b => b.setAttribute("aria-checked", b.dataset.engine === name));
    $("#tierRow").hidden = name !== "claude";
    $("#engineNote").textContent = name === "claude" ? "Claude writes a new scene for every prompt." : "Offline builds a scene from keywords in your prompt. It needs no AI.";
    if (!quiet) setStatus("");
  }
  document.querySelectorAll("#engineSeg button").forEach(b => (b.onclick = () => { if (!b.disabled) setEngine(b.dataset.engine); }));
  samplePromise.then(s => {
    const btn = document.querySelector('#engineSeg [data-engine="claude"]');
    if (s) setEngine("claude", true);
    else { btn.disabled = true; btn.title = "Claude is only available when this page is open on claude.ai."; setEngine("mock", true); }
  });

  // ------------------------------------------------------------------ export
  let exporting = false;
  async function saveBlob(blob, filename) {
    const d = await downloadsPromise;
    if (d) { await d.save({ filename, data: blob }); return; }
    const a = mk("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  document.querySelectorAll("#exportBtns button").forEach(b => (b.onclick = async () => {
    if (exporting || busy || !cur) return;
    exporting = true; clearError();
    const buttons = document.querySelectorAll("#exportBtns button"); buttons.forEach(x => (x.disabled = true));
    $("#exportProg").classList.remove("hidden"); $("#exportProg").classList.add("grid");
    $("#exportBar").style.width = "0%"; $("#exportLabel").textContent = "Starting…";
    player.cmd("pause");
    try {
      const out = await player.export(b.dataset.format, (p, label) => { $("#exportBar").style.width = Math.round(p * 100) + "%"; $("#exportLabel").textContent = label + " · " + Math.round(p * 100) + "%"; });
      const name = slug(cur.title) + "-" + cur.params.aspect.replace(":", "x") + "." + out.ext;
      await saveBlob(out.blob, name);
      const fallback = b.dataset.format === "video" ? (out.ext !== "mp4" ? " This browser can't record MP4, so it saved WebM." : "") + " Recorded at " + out.width + " px" + (out.blurred ? " with motion blur" : "") + (out.width < 1280 ? " so it could keep " + cur.params.fps + " fps in real time." : ".") : "";
      setStatus("Saved " + name + " (" + bytes(out.blob.size) + ")." + fallback, "ok");
    } catch (e) {
      if (e && e.cancelled) setStatus("Export cancelled.");
      else if (e && e.code === "declined") setStatus("Save cancelled.");
      else setStatus("Couldn't export: " + ((e && e.message) || "unknown error"), "err");
    } finally {
      exporting = false; buttons.forEach(x => (x.disabled = false));
      $("#exportProg").classList.add("hidden"); $("#exportProg").classList.remove("grid");
      player.cmd("play");
    }
  }));
  $("#exportCancel").onclick = () => player.cmd("cancel");

  $("#codeBtn").onclick = () => { const c = $("#code"); c.hidden = !c.hidden; $("#codeBtn").textContent = c.hidden ? "Show scene code" : "Hide scene code"; $("#codeBtn").setAttribute("aria-expanded", !c.hidden); };
  $("#copyBtn").onclick = () => {
    (navigator.clipboard ? navigator.clipboard.writeText(cur.code.trim()) : Promise.reject()).then(
      () => setStatus("Code copied.", "ok"),
      () => { const c = $("#code"); c.hidden = false; const r = document.createRange(); r.selectNodeContents(c); const s = getSelection(); s.removeAllRanges(); s.addRange(r); setStatus("Copying was blocked. The code is selected, press Ctrl+C.", "err"); }
    );
  };

  // ------------------------------------------------------------------ gallery / history
  const exampleThumbs = {};
  function openTake(t) {
    const copy = JSON.parse(JSON.stringify(t)); if (t.engine === "example") copy.id = "ex-open-" + t.id;
    setVal($("#prompt"), String(t.prompt).split(" → ")[0]);
    showTake(t.engine === "example" ? copy : t);
    setStatus("Opened “" + t.title + "”. Edit the prompt or settings, then generate again.");
    bringIntoView($("#monitor"));
  }
  function renderGallery() {
    const host = $("#gallery"); host.innerHTML = "";
    const list = tab === "mine" ? history : PTM_EXAMPLES;
    document.querySelectorAll("#galleryTabs button").forEach(b => b.setAttribute("aria-pressed", b.dataset.tab === tab));
    $("#clearBtn").hidden = tab !== "mine" || !history.length;
    if (!list.length) {
      const d = mk("div", "col-span-full rounded-2xl border border-dashed border-line p-8 text-center text-mute");
      d.append(mk("p", "font-semibold text-ink", "Nothing here yet"), mk("p", "text-sm", "Animations you generate are saved here so you can reopen and edit them."));
      host.append(d); return;
    }
    for (const t of list) {
      const b = mk("div", "take"); b.tabIndex = 0; b.setAttribute("role", "button"); b.setAttribute("aria-label", "Open " + t.title);
      b.setAttribute("aria-current", !!(cur && (cur.id === t.id || cur.id === "ex-open-" + t.id)));
      const [W, H] = ASPECTS[t.params.aspect]; const th = mk("div", "thumb"); th.style.aspectRatio = W + " / " + H;
      const src = t.thumb || exampleThumbs[t.id];
      if (src) { const im = mk("img"); im.src = src; im.alt = ""; th.append(im); } else { th.classList.add("shimmer"); th.append(mk("span", "text-xs text-mute", "Preview loading…")); }
      const row = mk("div", "flex items-start justify-between gap-2");
      const tx = mk("div", "min-w-0"); tx.append(mk("p", "truncate text-sm font-semibold", t.title), mk("p", "truncate text-xs text-mute", metaLine(t) + (t.created ? " · " + ago(t.created) : " · example")));
      row.append(tx);
      if (tab === "mine") {
        const del = mk("button", "btn btn-ghost btn-icon shrink-0", "×"); del.type = "button"; del.title = "Delete"; del.setAttribute("aria-label", "Delete " + t.title);
        del.style.cssText = "width:30px;height:30px;padding:0;font-size:18px;line-height:1";
        del.onclick = ev => { ev.stopPropagation(); history = history.filter(x => x.id !== t.id); saveHistory(); renderGallery(); };
        row.append(del);
      }
      b.append(th, row);
      b.onclick = () => openTake(t);
      b.onkeydown = ev => { if (ev.key === "Enter") openTake(t); };
      host.append(b);
    }
  }
  document.querySelectorAll("#galleryTabs button").forEach(b => (b.onclick = () => { tab = b.dataset.tab; renderGallery(); }));
  let clearArmed = 0;
  $("#clearBtn").onclick = () => {
    if (!clearArmed) { $("#clearBtn").textContent = "Click again to clear all"; clearArmed = setTimeout(() => { clearArmed = 0; $("#clearBtn").textContent = "Clear history"; }, 3000); return; }
    clearTimeout(clearArmed); clearArmed = 0; $("#clearBtn").textContent = "Clear history"; history = []; saveHistory(); renderGallery();
  };

  // Thumbnails for the built-in examples, drawn one at a time by a hidden player.
  async function buildExampleThumbs() {
    const host = mk("div"); host.style.cssText = "position:fixed;left:-9999px;top:0;width:320px"; document.body.append(host);
    const p = new Player(host, { loop: false });
    for (const ex of PTM_EXAMPLES) {
      const r = await p.load(ex, { autoplay: false });
      if (r.ok) { exampleThumbs[ex.id] = await p.thumb(ex.params.duration * 0.4); renderGallery(); }
    }
    let changed = false;
    for (const t of rebuilt) {                      // saved animations that were just rebuilt: draw their thumbnails again
      const r = await p.load(t, { autoplay: false });
      if (r.ok) { const u = await p.thumb(t.params.duration * 0.4); if (u) { t.thumb = u; changed = true; } }
    }
    if (changed) { saveHistory(); renderGallery(); }
    p.destroy(); host.remove();
  }

  // ------------------------------------------------------------------ hero player
  const heroPlayer = new Player($("#heroMonitor"), { onTime: m => { $("#heroTc").textContent = fmtTime(m.t) + " · frame " + (m.frame + 1); } });
  const heroOrb = FX.orb($("#heroOrb")), heroBusy = $("#heroBusy");
  let heroWorking = false, heroVisible = true, stopHeroType = () => {};
  new IntersectionObserver(es => { heroVisible = es[0].isIntersecting; }, { threshold: 0.2 }).observe($("#heroCard"));
  // As each example prompt finishes typing, the preview "generates" it with the real engine: orb, then iris open.
  async function heroShow(prompt) {
    const entry = HERO_SHOW.find(h => h.prompt === prompt);
    if (!entry || heroWorking || FX.reduce || !heroVisible || document.hidden) return;
    heroWorking = true;
    try {
      const m = PTM_mock(prompt, entry.style);
      const take = { id: "hero-" + Date.now(), title: m.title, note: m.note, prompt, code: m.code, engine: "mock", params: normParams({ style: entry.style, duration: 6, aspect: "16:9", fps: 30, camera: entry.camera, light: entry.light, blur: 1, detail: "high" }) };
      heroBusy.hidden = false; heroBusy.style.cssText = "";
      FX.play(heroBusy, { opacity: [0, 1] }, { duration: 0.3 });
      if (heroPlayer.frame) FX.play(heroPlayer.frame, { filter: ["blur(0px)", "blur(8px)"], scale: [1, 1.04] }, { duration: 0.4, keep: true });
      heroOrb.start(); stopHeroType(); stopHeroType = FX.typeInto($("#heroEcho"), "“" + prompt + "”", 70);
      await Promise.all([heroPlayer.load(take), sleep(1300)]);
      $("#heroTitle").textContent = take.title;
      await irisReveal(heroBusy, heroPlayer.frame, heroOrb);
    } finally { heroWorking = false; stopHeroType(); heroBusy.hidden = true; heroOrb.stop(); }
  }
  window.PTM_onHeroTyped = heroShow;


  const heroTake = () => PTM_EXAMPLES.find(e => e.id === "ex-runner") || PTM_EXAMPLES[0];

  // ------------------------------------------------------------------ boot
  PTM_EXAMPLES.forEach(e => (e.params = normParams(e.params)));
  renderControls();
  cur = JSON.parse(JSON.stringify(history[0] || heroTake()));
  if (!history[0]) cur.id = "ex-open-" + cur.id;
  setVal($("#prompt"), String(cur.prompt).split(" → ")[0]);
  setEngine("mock", true);
  renderGallery();
  showTake(cur).then(() => { setTimeout(buildExampleThumbs, 600); });
  heroPlayer.load(heroTake());
  window.PTM_IDEAS = IDEAS;
  FX.boot && FX.boot();
  if (!history.length) tab = "examples", renderGallery();
})();
