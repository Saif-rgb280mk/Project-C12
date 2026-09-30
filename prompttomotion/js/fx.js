/*
 * PromptToMotion site effects.
 *
 * Everything that makes the page itself move lives here, separate from the app logic:
 *   - play()          one animation call. Uses Motion (Framer Motion's vanilla engine, window.Motion) when it loaded,
 *                     and falls back to the Web Animations API, so the page animates either way.
 *   - runIntro()      entrance: glowing particles converge, logo draws itself, an iris opens onto the hero
 *   - heroMesh()      interactive particle and wave-mesh background that reacts to the pointer
 *   - typer()         typing effect for example prompts
 *   - tilt / glow     pointer-driven 3D tilt on cards and a cursor-following glow on buttons
 *   - reveal          scroll-in animation with stagger
 *   - orb()           the generation "loading" orb (also used for the burst when a preview is ready)
 * Everything respects prefers-reduced-motion.
 */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeInOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const easeOut = x => 1 - Math.pow(1 - x, 3);
  const cssVar = n => getComputedStyle(root).getPropertyValue(n).trim();

  // ------------------------------------------------------------------ animate wrapper
  const EASE = { out: [0.22, 1, 0.36, 1], inOut: [0.65, 0, 0.35, 1], spring: [0.34, 1.56, 0.64, 1], linear: "linear" };
  const bez = e => (Array.isArray(e) ? "cubic-bezier(" + e.join(",") + ")" : e);
  const at = (arr, i) => arr[Math.min(i, arr.length - 1)];
  function styleAt(kf, i) {
    const s = {}, tr = [];
    if (kf.opacity) s.opacity = at(kf.opacity, i);
    if (kf.x || kf.y) tr.push("translate(" + (kf.x ? at(kf.x, i) : 0) + "px," + (kf.y ? at(kf.y, i) : 0) + "px)");
    if (kf.scale) tr.push("scale(" + at(kf.scale, i) + ")");
    if (kf.rotate) tr.push("rotate(" + at(kf.rotate, i) + "deg)");
    if (tr.length) s.transform = tr.join(" ");
    if (kf.filter) s.filter = at(kf.filter, i);
    if (kf.clipPath) s.clipPath = at(kf.clipPath, i);
    return s;
  }
  const setStyle = (el, s) => Object.assign(el.style, s);
  const clearStyle = (el, kf) => { for (const p of Object.keys(styleAt(kf, 0))) el.style[p] = ""; };

  // play(el, { opacity: [0, 1], y: [24, 0], filter: ["blur(8px)", "blur(0px)"] }, { duration, delay, ease, keep })
  // Resolves when done. Unless keep is true, inline styles are cleared afterwards so the element returns to its normal look.
  function play(el, kf, o = {}) {
    if (!el) return Promise.resolve();
    const n = Math.max(...Object.values(kf).map(v => v.length)), last = styleAt(kf, n - 1);
    if (reduce) { setStyle(el, last); if (!o.keep) clearStyle(el, kf); return Promise.resolve(); }
    const dur = o.duration == null ? 0.6 : o.duration, delay = o.delay || 0, ease = EASE[o.ease] || o.ease || EASE.out;
    setStyle(el, styleAt(kf, 0));                       // hold the first frame, including during the delay
    let done;
    try {
      if (window.Motion && window.Motion.animate) {
        const a = window.Motion.animate(el, kf, { duration: dur, delay, ease });
        done = Promise.resolve(a.finished || a);
      } else throw new Error("no motion");
    } catch (e) {
      const frames = Array.from({ length: n }, (_, i) => styleAt(kf, i));
      const a = el.animate(frames, { duration: dur * 1000, delay: delay * 1000, easing: bez(ease), fill: "both" });
      done = a.finished.then(() => { if (o.keep) { try { a.commitStyles(); } catch (_) { setStyle(el, last); } } a.cancel(); });
    }
    return done.then(() => { if (o.keep) setStyle(el, last); else clearStyle(el, kf); }, () => {});
  }
  const stagger = (els, kf, o = {}) => Promise.all(els.map((el, i) => play(el, kf, Object.assign({}, o, { delay: (o.delay || 0) + i * (o.step == null ? 0.07 : o.step) }))));

  // ------------------------------------------------------------------ glowing particle sprite
  const spriteCache = {};
  function sprite(color) {
    if (spriteCache[color]) return spriteCache[color];
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, color); grad.addColorStop(0.25, color); grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad; g.globalAlpha = 1; g.fillRect(0, 0, 64, 64);
    return (spriteCache[color] = c);
  }
  function fitCanvas(cv) {
    const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(1, Math.round(r.width * d)); cv.height = Math.max(1, Math.round(r.height * d));
    return { w: cv.width, h: cv.height, d };
  }

  // ------------------------------------------------------------------ entrance
  function heroEntrance() {
    root.dataset.intro = "play";
    const kinds = { up: { opacity: [0, 1], y: [30, 0] }, pop: { opacity: [0, 1], scale: [0.9, 1], y: [24, 0] }, fade: { opacity: [0, 1] }, right: { opacity: [0, 1], x: [60, 0], scale: [0.96, 1] } };
    const chars = $$(".hl-ch"), items = $$("[data-anim]");
    items.forEach((el, i) => play(el, kinds[el.dataset.anim] || kinds.up, { duration: 0.85, delay: 0.05 + i * 0.09 }));
    stagger(chars, { opacity: [0, 1], y: [46, 0], filter: ["blur(12px)", "blur(0px)"], rotate: [4, 0] }, { duration: 0.8, delay: 0.12, step: 0.032 });
    $$("[data-count]").forEach(el => countUp(el, +el.dataset.count, 0.9));
    setTimeout(() => { root.dataset.intro = "done"; }, 2200);
  }
  function countUp(el, to, delay) {
    if (reduce) { el.textContent = to; return; }
    const t0 = performance.now() + delay * 1000;
    const tick = now => { const k = clamp((now - t0) / 1200, 0, 1); el.textContent = Math.round(to * easeOut(k)); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }

  function runIntro() {
    const intro = $("#intro");
    if (!intro) { heroEntrance(); return Promise.resolve(); }
    if (reduce) { intro.remove(); root.dataset.intro = "done"; return Promise.resolve(); }
    return new Promise(resolve => {
      const cv = $("#introCanvas"), ctx = cv.getContext("2d"), bar = $("#introBar"), pct = $("#introPct");
      let { w, h, d } = fitCanvas(cv);
      const N = 170, ps = Array.from({ length: N }, (_, i) => ({ a: Math.random() * 6.283, r0: (0.35 + Math.random() * 0.85) * Math.max(w, h) * 0.55, spin: (Math.random() < 0.5 ? -1 : 1) * (0.7 + Math.random() * 1.6), jit: Math.random(), col: i % 5 === 0 ? "#ff7a5c" : i % 3 === 0 ? "#ffffff" : "#8892ff", s: 0.5 + Math.random() * 1.1, delay: Math.random() * 0.35 }));
      const TOTAL = 1.85, t0 = performance.now(); let finished = false, last = t0;
      const onResize = () => ({ w, h, d } = fitCanvas(cv)); addEventListener("resize", onResize);
      function finish() {
        if (finished) return; finished = true; removeEventListener("resize", onResize); removeEventListener("keydown", onKey);
        heroEntrance();
        play(intro, { clipPath: ["circle(150% at 50% 50%)", "circle(0% at 50% 50%)"], opacity: [1, 1] }, { duration: 0.95, ease: "inOut", keep: true }).then(() => { intro.remove(); resolve(); });
      }
      function frame(now) {
        if (finished) return;
        const t = (now - t0) / 1000, dt = Math.min(0.05, (now - last) / 1000); last = now;
        const p = clamp(t / TOTAL, 0, 1), cx = w / 2, cy = h * 0.47, ring = Math.min(w, h * 0.75) * 0.33;
        ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "rgba(5,6,13,0.22)"; ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = "lighter";
        for (const q of ps) {
          const k = easeInOut(clamp((t - q.delay) / 1.25, 0, 1)), burst = clamp((t - 1.5) / 0.4, 0, 1);
          q.a += q.spin * dt * (0.6 + k * 2.4);
          const r = lerp(q.r0, ring * (0.8 + q.jit * 0.5), k) * (1 + burst * burst * 2.2);
          const x = cx + Math.cos(q.a) * r, y = cy + Math.sin(q.a) * r * 0.66, sz = (4 + q.s * 7) * d * (1 - burst * 0.5);
          ctx.globalAlpha = (0.1 + 0.36 * k) * (1 - burst);
          ctx.drawImage(sprite(q.col), x - sz, y - sz, sz * 2, sz * 2);
        }
        ctx.globalAlpha = 1;
        const shown = Math.round(easeOut(p) * 100); bar.style.width = shown + "%"; pct.textContent = shown + "%";
        if (t >= TOTAL) finish(); else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
      const skip = () => { if (!finished) finish(); };
      function onKey(e) { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") skip(); }
      intro.addEventListener("click", skip); addEventListener("keydown", onKey);
      const chip = $("#introSkip"); if (chip) chip.addEventListener("click", skip);
    });
  }

  // ------------------------------------------------------------------ hero: interactive particle and wave mesh
  function heroMesh(cv) {
    if (!cv) return;
    const ctx = cv.getContext("2d"), host = cv.parentElement;
    let w = 0, h = 0, d = 1, ps = [], mouse = { x: -9999, y: -9999, on: false }, running = true, visible = true, colors = {}, colT = 0, pulses = [];
    const readColors = () => { colors = { a: cssVar("--accent") || "#3b47f5", b: cssVar("--hot") || "#e8481f", line: cssVar("--accent") || "#3b47f5" }; };
    function resize() {
      ({ w, h, d } = fitCanvas(cv));
      const n = clamp(Math.round((w * h) / (d * d * 11000)), 36, 120);
      ps = Array.from({ length: n }, (_, i) => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.35 * d, vy: (Math.random() - 0.5) * 0.35 * d, s: 0.6 + Math.random() * 1.4, hot: i % 7 === 0 }));
    }
    resize(); readColors(); addEventListener("resize", resize);
    host.addEventListener("pointermove", e => { const r = cv.getBoundingClientRect(); mouse.x = (e.clientX - r.left) * d; mouse.y = (e.clientY - r.top) * d; mouse.on = true; });
    host.addEventListener("pointerleave", () => { mouse.on = false; mouse.x = mouse.y = -9999; });
    host.addEventListener("pointerdown", e => { const r = cv.getBoundingClientRect(); pulses.push({ x: (e.clientX - r.left) * d, y: (e.clientY - r.top) * d, t: 0 }); });
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(cv);
    let time = 0, last = performance.now();
    function draw(now) {
      requestAnimationFrame(draw);
      if (!visible || document.hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
      if (now - colT > 1000) { readColors(); colT = now; }
      ctx.clearRect(0, 0, w, h);
      const link = 130 * d, mr = 170 * d;
      // wave mesh floor: a perspective grid that ripples
      ctx.lineWidth = d; ctx.strokeStyle = colors.line; const hz = h * 0.62;
      for (let r = 0; r < 12; r++) {
        const z = (r + ((time * 0.35) % 1)) / 12, y0 = hz + (h - hz) * z * z; ctx.globalAlpha = 0.05 + 0.16 * z; ctx.beginPath();
        for (let x = 0; x <= w; x += 24 * d) { const yy = y0 + Math.sin(x * 0.008 + time * 1.4 + r) * 7 * z * d + (mouse.on ? Math.max(0, 1 - Math.hypot(x - mouse.x, y0 - mouse.y) / (260 * d)) * -18 * d : 0); x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
        ctx.stroke();
      }
      for (let c = -9; c <= 9; c++) { ctx.globalAlpha = 0.08; ctx.beginPath(); ctx.moveTo(w / 2 + c * 26 * d, hz); ctx.lineTo(w / 2 + c * w * 0.11, h); ctx.stroke(); }
      // particles and links
      for (const p of ps) {
        p.x += p.vx; p.y += p.vy;
        if (mouse.on) { const dx = mouse.x - p.x, dy = mouse.y - p.y, dist = Math.hypot(dx, dy); if (dist < mr) { const f = (1 - dist / mr) * 0.9; p.x -= (dx / dist) * f * 1.6 * d * -0.5; p.y -= (dy / dist) * f * 1.6 * d * -0.5; p.vx += (dx / dist) * 0.004 * d; p.vy += (dy / dist) * 0.004 * d; } }
        p.vx *= 0.995; p.vy *= 0.995; p.vx += (Math.random() - 0.5) * 0.01 * d; p.vy += (Math.random() - 0.5) * 0.01 * d;
        if (p.x < -20) p.x = w + 20; if (p.x > w + 20) p.x = -20; if (p.y < -20) p.y = h + 20; if (p.y > h + 20) p.y = -20;
      }
      ctx.lineWidth = d;
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i], b = ps[j], dx = a.x - b.x, dy = a.y - b.y, dd = dx * dx + dy * dy;
        if (dd < link * link) { ctx.globalAlpha = (1 - Math.sqrt(dd) / link) * 0.32; ctx.strokeStyle = colors.line; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      if (mouse.on) for (const p of ps) { const dist = Math.hypot(p.x - mouse.x, p.y - mouse.y); if (dist < mr) { ctx.globalAlpha = (1 - dist / mr) * 0.6; ctx.strokeStyle = colors.b; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); } }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "lighter";
      for (const p of ps) { const s = (5 + p.s * 6) * d, c = p.hot ? colors.b : colors.a; ctx.globalAlpha = 0.55 + 0.35 * Math.sin(time * 2 + p.x); ctx.drawImage(sprite(c), p.x - s, p.y - s, s * 2, s * 2); }
      for (let i = pulses.length - 1; i >= 0; i--) { const q = pulses[i]; q.t += dt; const k = q.t / 1.2; if (k >= 1) { pulses.splice(i, 1); continue; } ctx.globalAlpha = (1 - k) * 0.7; ctx.strokeStyle = colors.b; ctx.lineWidth = 2 * d; ctx.beginPath(); ctx.arc(q.x, q.y, k * 260 * d, 0, 6.283); ctx.stroke(); }
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    }
    if (reduce) { visible = true; draw(performance.now()); running = false; } else requestAnimationFrame(draw);
  }

  // ------------------------------------------------------------------ typing effect for example prompts
  function typer(input, holder, phrases, opts = {}) {
    if (!input || !holder) return;
    let i = opts.start != null ? opts.start : Math.floor(Math.random() * phrases.length), n = 0, dir = 1, hold = 0, timer = 0, current = "";
    const update = () => { holder.classList.toggle("off", document.activeElement === input || input.value !== ""); };
    if (reduce) { holder.textContent = phrases[i]; update(); ["focus", "blur", "input"].forEach(ev => input.addEventListener(ev, update)); return; }
    function step() {
      current = phrases[i];
      if (hold > 0) { hold -= 1; timer = setTimeout(step, 60); return; }
      n += dir;
      holder.textContent = current.slice(0, n);
      if (dir === 1 && n >= current.length) { dir = -1; hold = 26; if (opts.onTyped) opts.onTyped(current); }
      else if (dir === -1 && n <= 0) { dir = 1; i = (i + 1) % phrases.length; hold = 5; }
      timer = setTimeout(step, dir === 1 ? 34 + Math.random() * 40 : 14);
    }
    ["focus", "blur", "input"].forEach(ev => input.addEventListener(ev, update)); update();
    input.addEventListener("keydown", e => { if (e.key === "ArrowRight" && input.value === "" && current) { input.value = current; input.dispatchEvent(new Event("input")); e.preventDefault(); } });
    step();
    return () => clearTimeout(timer);
  }
  // Type text into an element once (used for the prompt shown while an animation is being made).
  function typeInto(el, text, cps = 48) {
    if (!el) return () => {};
    if (reduce) { el.textContent = text; return () => {}; }
    let k = 0, t = 0; el.textContent = "";
    const tick = () => { k = Math.min(text.length, k + 1); el.textContent = text.slice(0, k); if (k < text.length) t = setTimeout(tick, 1000 / cps); };
    tick(); return () => clearTimeout(t);
  }

  // ------------------------------------------------------------------ pointer effects
  function pointerEffects() {
    document.addEventListener("pointermove", e => {
      const b = e.target.closest && e.target.closest(".btn, .glow-el");
      if (b) { const r = b.getBoundingClientRect(); b.style.setProperty("--mx", e.clientX - r.left + "px"); b.style.setProperty("--my", e.clientY - r.top + "px"); }
    }, { passive: true });
    if (reduce) return;
    for (const el of $$(".tilt")) {
      const max = parseFloat(el.dataset.tilt || "6");
      el.addEventListener("pointermove", e => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; el.style.transform = "perspective(900px) rotateY(" + x * max * 2 + "deg) rotateX(" + -y * max * 2 + "deg) translateZ(0)"; el.style.setProperty("--tx", x * 100 + "%"); el.style.setProperty("--ty", y * 100 + "%"); });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    }
    const hero = $("#hero");
    if (hero) hero.addEventListener("pointermove", e => {
      const r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      hero.style.setProperty("--px", e.clientX - r.left + "px"); hero.style.setProperty("--py", e.clientY - r.top + "px");
      for (const c of $$("[data-depth]", hero)) { const dp = parseFloat(c.dataset.depth); c.style.translate = x * dp * -34 + "px " + y * dp * -24 + "px"; }
    });
  }

  // ------------------------------------------------------------------ scroll reveal and header
  function setupReveal() {
    const els = $$(".rv");
    if (reduce || !("IntersectionObserver" in window)) return;
    els.forEach(el => { const sibs = el.parentElement ? [...el.parentElement.children].filter(c => c.classList.contains("rv")) : []; el.dataset.rvI = Math.max(0, sibs.indexOf(el)); });
    root.classList.add("rv-on");
    const io = new IntersectionObserver(entries => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const el = en.target; io.unobserve(el);
        play(el, { opacity: [0, 1], y: [34, 0] }, { duration: 0.75, delay: Math.min(0.4, (+el.dataset.rvI || 0) * 0.09) });
        el.classList.add("in");
      }
    }, { threshold: 0.1, rootMargin: "0px 0px -5% 0px" });
    els.forEach(el => io.observe(el));
  }
  function headerScroll() {
    const hd = $("#siteHeader"); if (!hd) return;
    const on = () => hd.classList.toggle("scrolled", scrollY > 8); on(); addEventListener("scroll", on, { passive: true });
  }
  function splitHeadline() {
    for (const el of $$("[data-split]")) {
      const text = el.textContent; el.setAttribute("aria-label", text); el.textContent = "";
      let ci = 0;
      text.split(" ").forEach((word, wi, arr) => {
        const w = document.createElement("span"); w.className = "hl-word"; w.setAttribute("aria-hidden", "true");
        [...word].forEach(ch => { const s = document.createElement("span"); s.className = "hl-ch"; s.style.setProperty("--ci", ci++); s.textContent = ch; w.append(s); });
        el.append(w); if (wi < arr.length - 1) el.append(document.createTextNode(" "));
      });
    }
  }

  // ------------------------------------------------------------------ the generation orb (loading state) and burst
  function orb(cv) {
    const ctx = cv.getContext("2d"); let w = 0, h = 0, d = 1, run = false, raf = 0, t = 0, burstT = -1, last = 0;
    const N = 110, ps = Array.from({ length: N }, (_, i) => ({ a: Math.random() * 6.283, rx: 0.16 + Math.random() * 0.34, ry: 0.1 + Math.random() * 0.2, sp: (0.25 + Math.random() * 0.9) * (i % 2 ? 1 : -1), tilt: (Math.random() - 0.5) * 1.6, col: i % 6 === 0 ? "#ff7a5c" : i % 4 === 0 ? "#ffffff" : "#8892ff", s: 0.5 + Math.random(), v: Math.random() * 6.283 }));
    const size = () => ({ w, h, d } = fitCanvas(cv));
    function frame(now) {
      if (!run) return; raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      if (burstT >= 0) burstT += dt;
      ctx.clearRect(0, 0, w, h); ctx.globalCompositeOperation = "lighter";
      const cx = w / 2, cy = h * 0.42, S = Math.min(w, h * 1.4), pulse = 1 + 0.06 * Math.sin(t * 3);
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.3 * pulse); core.addColorStop(0, "rgba(136,146,255,0.55)"); core.addColorStop(0.5, "rgba(255,122,92,0.14)"); core.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = burstT >= 0 ? Math.max(0, 1 - burstT * 1.6) : 1; ctx.fillStyle = core; ctx.fillRect(0, 0, w, h);
      for (const p of ps) {
        p.a += p.sp * dt * (burstT >= 0 ? 2 : 1);
        const k = burstT >= 0 ? 1 + easeOut(clamp(burstT / 0.7, 0, 1)) * 3.2 : 1;
        const x0 = Math.cos(p.a) * p.rx * S * k, y0 = Math.sin(p.a) * p.ry * S * k, x = cx + x0 * Math.cos(p.tilt) - y0 * Math.sin(p.tilt), y = cy + x0 * Math.sin(p.tilt) + y0 * Math.cos(p.tilt);
        const sz = (5 + p.s * 6) * d * (0.8 + 0.3 * Math.sin(t * 4 + p.v));
        ctx.globalAlpha = (burstT >= 0 ? Math.max(0, 1 - burstT * 1.3) : 1) * (0.5 + 0.4 * Math.sin(t * 2 + p.v));
        ctx.drawImage(sprite(p.col), x - sz, y - sz, sz * 2, sz * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    }
    return {
      start() { size(); t = 0; burstT = -1; if (run) return; run = true; last = performance.now(); if (reduce) { frame(last); run = false; return; } raf = requestAnimationFrame(frame); },
      burst() { burstT = 0; },
      stop() { run = false; cancelAnimationFrame(raf); ctx.clearRect(0, 0, cv.width, cv.height); },
      resize: size
    };
  }

  // ------------------------------------------------------------------ boot
  function boot() {
    splitHeadline();
    heroMesh($("#heroCanvas"));
    pointerEffects();
    setupReveal();
    headerScroll();
    const ideas = window.PTM_IDEAS || [];
    typer($("#heroPrompt"), $("#heroTyper"), ideas, { start: 1, onTyped: p => window.PTM_onHeroTyped && window.PTM_onHeroTyped(p) });
    typer($("#prompt"), $("#promptTyper"), ideas);
    return runIntro();
  }
  window.PTM_FX = { play, stagger, orb, typeInto, typer, reduce, boot };
})();
