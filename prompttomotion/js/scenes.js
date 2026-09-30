/*
 * PromptToMotion scenes.
 *
 * 1. EXAMPLES: hand-written scenes that follow the scene contract (see runtime.js).
 * 2. PTM_mock(prompt, style): the offline "mock generator". It reads keywords from the prompt
 *    and builds a real, playable scene from a library of layers. Use it to test the whole
 *    app (player, export, history) without calling any AI.
 */

// A scene is stored as source code. Writing the examples as real functions lets the
// browser syntax-check them; sceneSource() turns a function body into scene code.
function sceneSource(fn, prefix) {
  const src = fn.toString();
  return (prefix || "") + src.slice(src.indexOf("{") + 1, src.lastIndexOf("}")).replace(/^\n/, "").replace(/\s+$/, "") + "\n";
}

// ---------------------------------------------------------------- examples
function exampleFireworks() {
// Fireworks over a city skyline. Every rocket's path is computed from time, so any frame can be drawn directly.
function setup(W, H) {
  const blocks = [];
  let x = 0, i = 0;
  while (x < W + 60) {
    const w = 34 + hash(i * 3.1) * 44, h = H * (0.12 + hash(i * 7.7) * 0.28), win = [];
    for (let wy = 12; wy < h - 10; wy += 15) for (let wx = 7; wx < w - 9; wx += 11) if (hash(i * 13 + wx * 1.7 + wy * 0.31) < 0.35) win.push([wx, wy]);
    blocks.push({ x, w, h, win });
    x += w + 3; i++;
  }
  return { blocks };
}
function draw(ctx, t, { W, H, duration, state }) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#050817"); sky.addColorStop(1, "#231a4d");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 140; i++) {
    ctx.fillStyle = "rgba(255,255,255," + (0.2 + 0.5 * Math.abs(Math.sin(t * 1.3 + i))) + ")";
    ctx.fillRect(hash(i) * W, hash(i + 50) * H * 0.7, 1.6, 1.6);
  }
  const GAP = 0.45, LIFE = 2.9, count = Math.floor((duration - 1e-6) / GAP) + 1;
  ctx.globalCompositeOperation = "lighter";
  for (let k = 0; k < count; k++) {
    for (const age of [t - k * GAP, t + duration - k * GAP]) {
      if (age < 0 || age > LIFE) continue;
      const x = W * (0.12 + hash(k * 1.9) * 0.76), top = H * (0.12 + hash(k * 4.3) * 0.28), hue = Math.floor(hash(k * 8.1) * 360);
      const rise = 0.85;
      if (age < rise) {
        const y = H - (H - top) * ease.out(age / rise);
        ctx.fillStyle = "hsl(" + hue + ",100%,85%)";
        ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill();
        for (let s = 1; s < 8; s++) { ctx.fillStyle = "hsla(" + hue + ",100%,70%," + (0.5 - s * 0.06) + ")"; ctx.fillRect(x - 1, y + s * 6, 2, 4); }
        continue;
      }
      const a = age - rise, fade = Math.max(0, 1 - a / (LIFE - rise)), n = 70;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * TAU + hash(k + i) * 0.2, sp = (0.55 + hash(k * 3 + i) * 0.45) * Math.min(W, H) * 0.24;
        const d = sp * (1 - Math.exp(-a * 2.6)), px = x + Math.cos(ang) * d, py = top + Math.sin(ang) * d + 34 * a * a;
        ctx.fillStyle = "hsla(" + (hue + hash(i) * 40) + ",100%,62%," + fade + ")";
        ctx.beginPath(); ctx.arc(px, py, 1 + 2.2 * fade, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = "hsla(" + hue + ",100%,70%," + 0.12 * fade + ")";
      ctx.fillRect(0, 0, W, H);
    }
  }
  ctx.globalCompositeOperation = "source-over";
  for (const b of state.blocks) {
    ctx.fillStyle = "#04050d"; ctx.fillRect(b.x, H - b.h, b.w, b.h);
    for (const [wx, wy] of b.win) {
      ctx.fillStyle = "rgba(255,206,120," + (0.55 + 0.35 * Math.sin(t * 0.8 + wx * wy)) + ")";
      ctx.fillRect(b.x + wx, H - b.h + wy, 4, 6);
    }
  }
}
}

function exampleSolar() {
// The solar system in a fake-3D perspective. Planets behind the sun are drawn first.
const PLANETS = [
  { r: 3, d: 62, turns: 6, c: "#b8ada0" }, { r: 6, d: 88, turns: 4, c: "#e9c47c" },
  { r: 6.5, d: 118, turns: 3, c: "#4c8fe3", moon: true }, { r: 5, d: 148, turns: 2, c: "#d9643c" },
  { r: 16, d: 205, turns: 1, c: "#d9b58b" }, { r: 13, d: 262, turns: 1, c: "#eadaa8", ring: true }
];
function draw(ctx, t, { W, H, progress }) {
  ctx.fillStyle = "#03040b"; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = "rgba(255,255,255," + (0.25 + 0.6 * Math.abs(Math.sin(progress * TAU * 2 + i))) + ")";
    ctx.fillRect(hash(i) * W, hash(i + 99) * H, 1.4, 1.4);
  }
  const cx = W / 2, cy = H / 2, k = Math.min(W / 640, H / 380), tilt = 0.38 + 0.08 * Math.sin(progress * TAU);
  const pos = PLANETS.map((p, i) => {
    const a = progress * TAU * p.turns + i * 1.7;
    return { p, x: cx + Math.cos(a) * p.d * k, y: cy + Math.sin(a) * p.d * k * tilt };
  });
  ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1;
  for (const p of PLANETS) { ctx.beginPath(); ctx.ellipse(cx, cy, p.d * k, p.d * k * tilt, 0, 0, TAU); ctx.stroke(); }
  const planet = o => {
    const r = o.p.r * k;
    if (o.p.ring) { ctx.strokeStyle = "rgba(234,218,168,0.75)"; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.ellipse(o.x, o.y, r * 2.1, r * 0.7, -0.3, 0, TAU); ctx.stroke(); }
    const g = ctx.createRadialGradient(o.x - r * 0.4, o.y - r * 0.4, r * 0.1, o.x, o.y, r);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.25, o.p.c); g.addColorStop(1, "#0b0b0b");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, TAU); ctx.fill();
    if (o.p.moon) { const ma = progress * TAU * 8; ctx.fillStyle = "#cfcfcf"; ctx.beginPath(); ctx.arc(o.x + Math.cos(ma) * r * 2.3, o.y + Math.sin(ma) * r * 2.3 * tilt, 1.8 * k, 0, TAU); ctx.fill(); }
  };
  pos.filter(o => o.y < cy).forEach(planet);
  const sr = 30 * k, sun = ctx.createRadialGradient(cx, cy, 0, cx, cy, sr * 3);
  sun.addColorStop(0, "#fff7d6"); sun.addColorStop(0.3, "#ffbf3c"); sun.addColorStop(0.34, "rgba(255,140,40,0.5)"); sun.addColorStop(1, "rgba(255,120,20,0)");
  ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(cx, cy, sr * 3, 0, TAU); ctx.fill();
  pos.filter(o => o.y >= cy).forEach(planet);
}
}

function exampleWarp() {
// Warp speed. Each star moves a whole number of times per loop, so the loop is seamless.
function draw(ctx, t, { W, H, progress }) {
  ctx.fillStyle = "#01010a"; ctx.fillRect(0, 0, W, H);
  const cx = W / 2 + Math.sin(progress * TAU) * W * 0.04, cy = H / 2 + Math.cos(progress * TAU) * H * 0.04, f = Math.max(W, H) * 0.5;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, f * 0.6);
  glow.addColorStop(0, "rgba(90,120,255,0.25)"); glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 650; i++) {
    const sx = (hash(i) - 0.5) * 2, sy = (hash(i + 1000) - 0.5) * 2, laps = 1 + Math.floor(hash(i + 2000) * 3);
    let z = hash(i + 3000) - progress * laps; z -= Math.floor(z); z = 0.02 + z * 0.98;
    const z2 = Math.min(1, z + 0.035);
    const x1 = cx + (sx / z) * f, y1 = cy + (sy / z) * f, x2 = cx + (sx / z2) * f, y2 = cy + (sy / z2) * f, b = 1 - z;
    ctx.strokeStyle = "hsla(" + (205 + b * 70) + ",90%," + (60 + b * 35) + "%," + b + ")";
    ctx.lineWidth = 0.5 + b * 2.6;
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x1, y1); ctx.stroke();
  }
}
}

const PTM_EXAMPLES = [
  { id: "ex-fireworks", title: "Fireworks over the city", note: "Rockets rise and burst over a skyline at night.", prompt: "Fireworks bursting over a city skyline at night",
    params: { style: "vector", duration: 6, aspect: "16:9", fps: 30 }, code: sceneSource(exampleFireworks), engine: "example" },
  { id: "ex-solar", title: "The solar system", note: "Planets orbit the sun in perspective; the loop is seamless.", prompt: "The planets orbiting the sun, seen at an angle",
    params: { style: "3d", duration: 8, aspect: "16:9", fps: 30 }, code: sceneSource(exampleSolar), engine: "example" },
  { id: "ex-warp", title: "Warp speed", note: "Flying through a star field at light speed.", prompt: "Flying through space at warp speed",
    params: { style: "3d", duration: 5, aspect: "1:1", fps: 60 }, code: sceneSource(exampleWarp), engine: "example" }
];

// ---------------------------------------------------------------- mock generator
// Keyword rules: layer name and the words that switch it on.
const PTM_KEYWORDS = [
  ["stars", /\b(stars?|starry|night|space|galaxy|cosmos|universe|midnight|firework)/],
  ["moon", /\b(moon|night|midnight|werewolf)/],
  ["sun", /\b(sun|sunny|sunset|sunrise|dawn|dusk|summer|desert|beach)/],
  ["clouds", /\b(clouds?|sky|rain|storm|windy|day)/],
  ["mountains", /\b(mountains?|hills?|landscape|valley|dragon|volcano)/],
  ["city", /\b(city|cities|buildings?|skyline|street|town|cyber|urban|skyscraper|rooftops?)/],
  ["sea", /\b(sea|ocean|beach|waves?|boat|ship|sail|island)/],
  ["boat", /\b(boat|ship|sail|pirate)/],
  ["rain", /\b(rain|rainy|storm|stormy|drizzle|thunder)/],
  ["lightning", /\b(storm|stormy|thunder|lightning)/],
  ["snow", /\b(snow|snowy|winter|christmas|blizzard|frost)/],
  ["fire", /\b(fire|flames?|campfire|burning|dragon|volcano|lava)/],
  ["fish", /\b(fish|aquarium|underwater|coral|reef|shark)/],
  ["bubbles", /\b(bubbles?|underwater|aquarium|fish|soda)/],
  ["birds", /\b(birds?|flock|flying|seagulls?|dragon)/],
  ["balls", /\b(balls?|bounce|bouncing|bouncy|football|soccer|basketball)/],
  ["planets", /\b(planets?|orbit|solar|saturn|jupiter)/],
  ["rocket", /\b(rockets?|launch|spaceship|astronaut|lift ?off)/],
  ["confetti", /\b(party|confetti|celebrat|birthday|congrat|win|winner)/],
  ["hearts", /\b(love|hearts?|valentine|romantic|crush)/],
  ["neongrid", /\b(neon|synthwave|retro|80s|cyber|vaporwave|arcade)/],
  ["leaves", /\b(autumn|fall(ing)? leaves|leaf|leaves|forest)/],
  ["car", /\b(cars?|drive|driving|road|race|racing|truck)/],
  ["character", /\b(person|people|man|woman|girl|boy|kid|child|hero|character|runner|running|run|sprint|sprinting|jog|jogging|ninja|athlete|explorer|traveller|traveler|parkour)\b/]
];

function PTM_analyze(prompt) {
  const clean = String(prompt || "").replace(/\s+/g, " ").trim().slice(0, 600);
  const low = clean.toLowerCase();
  const layers = PTM_KEYWORDS.filter(([, re]) => re.test(low)).map(([name]) => name);
  let sky = "day";
  if (/\b(space|galaxy|cosmos|universe|planet|orbit|rocket|astronaut|spaceship)/.test(low)) sky = "space";
  else if (/\b(underwater|aquarium|coral|reef|fish|deep sea)/.test(low)) sky = "underwater";
  else if (/\b(sunset|sunrise|dawn|dusk|evening|golden hour)/.test(low)) sky = "sunset";
  else if (/\b(night|midnight|dark|neon|cyber|moon|stars|firework|synthwave)/.test(low)) sky = "night";
  if (sky === "night" && !layers.includes("stars")) layers.push("stars");
  const quoted = clean.match(/["“]([^"”]{1,40})["”]/);
  const said = clean.match(/\b(?:says?|saying|the words?|text|title|named|name is|spells?)\s*[:\-]?\s*([A-Za-z0-9!?' ]{2,32})/i);
  const text = quoted ? quoted[1].trim() : said ? said[1].trim() : "";
  if (text) layers.push("text");
  if (!layers.filter(l => !["stars", "clouds", "sun", "moon"].includes(l)).length) layers.push("abstract");
  return { prompt: clean, sky, layers: [...new Set(layers)], text };
}

const PTM_SKIES = {
  day: { sky: ["#5aa9e6", "#cfeafd"], ground: "#6fae5b", accent: "#ffcc4d", accent2: "#ff6b6b", ink: "#1b2230" },
  sunset: { sky: ["#2b1b4d", "#ff8a5b"], ground: "#3b2a3f", accent: "#ffd166", accent2: "#ef476f", ink: "#1a1024" },
  night: { sky: ["#070b1f", "#1f2a5c"], ground: "#141a2e", accent: "#8ecbff", accent2: "#ff5fa2", ink: "#05070f" },
  space: { sky: ["#02030a", "#0d1033"], ground: "#1a1a26", accent: "#7cf0ff", accent2: "#ff7ad9", ink: "#02030a" },
  underwater: { sky: ["#1b6fa8", "#052440"], ground: "#c9b27c", accent: "#ffd166", accent2: "#ff7b54", ink: "#031423" }
};

function PTM_mock(prompt, style) {
  const a = PTM_analyze(prompt);
  const cfg = { style, sky: a.sky, layers: a.layers, text: a.text || (a.layers.includes("abstract") ? titleCase(a.prompt.split(" ").slice(0, 4).join(" ")) : ""), palette: PTM_SKIES[a.sky] };
  const shown = a.layers.filter(l => l !== "abstract" && l !== "text");
  return {
    title: makeTitle(a.prompt),
    note: shown.length ? "Mock preview built from: " + shown.join(", ") + (a.text ? ', plus the text "' + a.text + '"' : "") + "." : "Mock preview: no scene keywords found, so this is an abstract motion loop.",
    code: sceneSource(mockSceneTemplate, "// Mock scene from PromptToMotion's offline generator (no AI).\nconst CFG = " + JSON.stringify(cfg) + ";\n"),
    analysis: a
  };
}

// A short title from the prompt: drop the leading article and stop at a natural break.
function makeTitle(prompt) {
  let words = String(prompt).replace(/["“”]/g, "").split(/[,.;!?]| while | with | and | as | at | in | on | from | through | under | over | when /i)[0].trim().split(/\s+/);
  words = words.filter((w, i) => !(i === 0 && /^(a|an|the|some|my)$/i.test(w))).slice(0, 5);
  return titleCase(words.join(" ")) || "Untitled";
}

function titleCase(s) { return String(s).replace(/[^\w\s'!?-]/g, "").replace(/\b\w/g, c => c.toUpperCase()).trim(); }

// The mock scene. CFG is prepended by PTM_mock(). Every layer is a pure function of progress p (0..1),
// so the loop is seamless and scrubbing works. The character's scarf and hair use simulate() (baked physics).
function mockSceneTemplate() {
const PAL = CFG.palette, STYLE = CFG.style, has = n => CFG.layers.includes(n);
const INKED = STYLE === "anime" || STYLE === "frames";
const RUN = has("character");
const wrap = v => v - Math.floor(v);
let DATA = null;
function ink(ctx, w) { if (INKED) { ctx.lineWidth = w || 2.5; ctx.strokeStyle = PAL.ink; ctx.stroke(); } }
function ball(ctx, x, y, r, col) {
  if (STYLE === "3d") {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.3, col); g.addColorStop(1, "rgba(0,0,0,0.9)");
    ctx.fillStyle = g;
  } else ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ink(ctx, Math.max(1.5, r * 0.08));
  if (STYLE === "anime") { ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.4, r * 0.22, r * 0.12, -0.6, 0, TAU); ctx.fill(); }
}
function heart(ctx, x, y, s) {
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.5, y - s * 1.1, x, y - s * 0.5);
  ctx.bezierCurveTo(x + s * 0.5, y - s * 1.1, x + s, y - s * 0.4, x, y + s * 0.3);
}
// Draw fn(offsetX) twice so a pattern of width P repeats without a seam.
function tile(P, off, fn) { const o = -(((off % P) + P) % P); fn(o); fn(o + P); }
function mix(a, b, k) { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const c = (s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k); return "rgb(" + c(16) + "," + c(8) + "," + c(0) + ")"; }
function limb(ctx, pts, w, col, hi, L) {
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (INKED) { ctx.strokeStyle = PAL.ink; ctx.lineWidth = w + 5; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); }
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
  if (hi && STYLE !== "vector" && STYLE !== "pixel") {   // rim light on the side facing the light
    ctx.strokeStyle = hi; ctx.globalAlpha = 0.55; ctx.lineWidth = Math.max(1.5, w * 0.28); ctx.beginPath();
    pts.forEach((q, i) => (i ? ctx.lineTo(q[0] + L.dx * w * 0.28, q[1] + L.dy * w * 0.28) : ctx.moveTo(q[0] + L.dx * w * 0.28, q[1] + L.dy * w * 0.28))); ctx.stroke(); ctx.globalAlpha = 1;
  }
}

// ---- runner: pose is a pure function of time, so physics (simulate) and drawing agree ----
const GAIT_CYCLES = (dur) => Math.max(2, Math.round(dur * 1.4));
function pose(t, W, H, dur) {
  const p = t / dur, U = Math.min(H * 0.36, W * 0.5), ground = H * 0.84, cx = W * (W > H ? 0.36 : 0.5);
  const l1 = U * 0.245, l2 = U * 0.245, gait = p * TAU * GAIT_CYCLES(dur);
  const hipY = ground - (l1 + l2) * 0.9 - Math.cos(gait * 2) * U * 0.025, lean = 0.24 + Math.sin(gait * 2) * 0.02;
  const foot = leg => {
    const m = (((gait + leg * Math.PI) % TAU) + TAU) % TAU, stride = U * 0.3;
    if (m < Math.PI) return { x: cx + stride * (1 - m / Math.PI), y: ground };
    const q = (m - Math.PI) / Math.PI;
    return { x: cx - stride + 2 * stride * ease.inOut(q), y: ground - Math.sin(q * Math.PI) * U * 0.2 };
  };
  const f0 = foot(0), f1 = foot(1), torso = U * 0.3;
  const sx = cx + Math.sin(lean) * torso, sy = hipY - Math.cos(lean) * torso;
  const hx = sx + Math.sin(lean * 0.6) * U * 0.14, hy = sy - Math.cos(lean * 0.6) * U * 0.14, r = U * 0.078;
  const hand = leg => { const th = Math.sin(gait + leg * Math.PI + Math.PI) * 0.95; return { x: sx + Math.sin(th) * U * 0.3 + U * 0.07, y: sy + U * 0.3 - Math.abs(Math.sin(th)) * U * 0.09 }; };
  return { U, ground, cx, l1, l2, hipY, lean, f: [f0, f1], sx, sy, hx, hy, r, hand: [hand(0), hand(1)], nx: sx - U * 0.01, ny: sy - U * 0.02, bx: hx - r * 0.75, by: hy - r * 0.35 };
}
var simulate = has("character") ? function (st, dt, t, info) {
  const q = pose(t, info.W, info.H, info.duration);
  PHYS.chain(st.scarf, q.nx, q.ny, dt, { gravity: 520, wind: -2100 + Math.sin(t * 7) * 380, damping: 0.986, iters: 6 });
  PHYS.chain(st.hair, q.bx, q.by, dt, { gravity: 260, wind: -1100 + Math.sin(t * 9 + 1) * 250, damping: 0.98, iters: 4 });
} : null;

const L = {
  sky(ctx, p, W, H) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, PAL.sky[0]); g.addColorStop(1, PAL.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (CFG.sky === "underwater") {
      ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = "#fff";
      for (let i = 0; i < 5; i++) { const x = (i / 5) * W + Math.sin(p * TAU + i) * 40; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 60, 0); ctx.lineTo(x + 220, H); ctx.lineTo(x + 100, H); ctx.fill(); }
      ctx.restore();
    }
  },
  stars(ctx, p, W, H, S, cam) {
    for (let i = 0; i < 190; i++) { const b = hash(i + 9); ctx.fillStyle = "rgba(255,255,255," + (0.15 + 0.75 * Math.abs(Math.sin(p * TAU * (1 + (i % 3)) + i))) + ")"; ctx.fillRect(((hash(i) * W + cam.x * W * 0.05) % W + W) % W, hash(i + 40) * H * 0.72, 1 + b * 1.4, 1 + b * 1.4); }
  },
  sun(ctx, p, W, H) {
    const low = CFG.sky === "sunset", x = W * (low ? 0.5 : 0.78), y = H * (low ? 0.58 : 0.22), r = Math.min(W, H) * (low ? 0.16 : 0.09);
    const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 3.4);
    g.addColorStop(0, "rgba(255,220,120,0.6)"); g.addColorStop(1, "rgba(255,200,100,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const rr = r * (1 + 0.03 * Math.sin(p * TAU * 2)), sg = ctx.createRadialGradient(x - rr * 0.2, y - rr * 0.2, rr * 0.05, x, y, rr);
    sg.addColorStop(0, "#fffbe8"); sg.addColorStop(0.55, low ? "#ffb347" : PAL.accent); sg.addColorStop(1, low ? "#ff7a3a" : mix(PAL.accent, "#ff9a3a", 0.5));
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill(); ink(ctx, Math.max(1.5, rr * 0.06));
  },
  moon(ctx, p, W, H) {
    const x = W * 0.8, y = H * 0.2, r = Math.min(W, H) * 0.07;
    ctx.fillStyle = "rgba(220,230,255,0.15)"; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, TAU); ctx.fill();
    ball(ctx, x, y, r, "#f4f1e1");
    ctx.fillStyle = PAL.sky[0]; ctx.beginPath(); ctx.arc(x + r * 0.45, y - r * 0.2, r * 0.9, 0, TAU); ctx.fill();
  },
  clouds(ctx, p, W, H, S, cam) {
    for (let i = 0; i < 7; i++) {
      const depth = 0.3 + hash(i + 2) * 0.7, x = wrap(hash(i) + p * (i % 2 ? 1 : 2)) * (W + 380) - 190 + cam.x * W * depth * 0.2, y = H * (0.08 + hash(i + 7) * 0.3), s = (26 + hash(i + 3) * 34) * (0.7 + depth * 0.5);
      ctx.fillStyle = INKED ? (CFG.sky === "day" ? "#ffffff" : mix(PAL.sky[0], "#9aa6d6", 0.4)) : CFG.sky === "night" ? "rgba(160,170,210,0.22)" : "rgba(255,255,255," + (0.6 + depth * 0.3) + ")";
      ctx.beginPath(); for (const [dx, dy, r] of [[0, 0, 1], [0.9, 0.2, 0.8], [-0.9, 0.25, 0.75], [0.3, -0.4, 0.8], [1.6, 0.3, 0.55]]) { ctx.moveTo(x + dx * s + r * s, y + dy * s); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); }
      if (INKED) { ctx.lineWidth = 5; ctx.strokeStyle = PAL.ink; ctx.stroke(); }
      ctx.fill();
    }
  },
  mountains(ctx, p, W, H, S, cam, Lt) {
    [[0.6, "#8fb0c8", 1, 3], [0.7, "#5c7f9a", 2, 5], [0.8, "#3a5670", 4, 7]].forEach(([base, col, laps, freq], li) => {
      const P = W * 1.5, off = RUN ? p * laps * P : 0, far = CFG.sky === "day" ? col : mix("#1c2a44", "#3e5a7a", li / 2);
      const edge = mix(far.startsWith("#") ? far : "#5c7f9a", PAL.sky[1], 0.45);
      const g = ctx.createLinearGradient(0, H * (base - 0.2), 0, H);
      g.addColorStop(0, far); g.addColorStop(1, mix("#0b1424", "#2b4058", 0.4));
      const ridge = x => H * base - (Math.sin((x / P) * TAU * freq) * 0.5 + Math.sin((x / P) * TAU * (freq * 2 + 1) + li) * 0.22 + 0.9) * H * 0.13;
      ctx.fillStyle = g;
      tile(P, off + cam.x * W * (0.2 + li * 0.25), o => {
        ctx.beginPath(); ctx.moveTo(o, H);
        for (let x = 0; x <= P + 8; x += 8) ctx.lineTo(o + x, ridge(x));
        ctx.lineTo(o + P + 8, H); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255," + (0.16 + li * 0.05) + ")"; ctx.lineWidth = 2; ctx.beginPath();
        for (let x = 0; x <= P + 8; x += 8) (x ? ctx.lineTo(o + x, ridge(x)) : ctx.moveTo(o + x, ridge(x))); ctx.stroke();
      });
      if (INKED) { ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2; ctx.beginPath(); for (let x = 0; x <= W; x += 8) (x ? ctx.lineTo(x, ridge(x + off)) : ctx.moveTo(x, ridge(x + off))); ctx.stroke(); }
      const haze = ctx.createLinearGradient(0, H * (base - 0.16), 0, H * (base + 0.06));
      haze.addColorStop(0, "rgba(255,255,255,0)"); haze.addColorStop(1, "rgba(255,255,255," + (0.16 - li * 0.04) + ")");
      ctx.fillStyle = haze; ctx.fillRect(0, H * (base - 0.16), W, H * 0.22);
    });
  },
  city(ctx, p, W, H, S, cam, Lt) {
    const night = CFG.sky !== "day", P = DATA.P;
    DATA.city.forEach((layer, li) => {
      const depth = [0.3, 0.6, 1][li], laps = [1, 2, 4][li], base = H * (RUN ? 0.84 : 0.86) - H * 0.0;
      const body = night ? mix("#0a0d1c", "#26305a", 0.55 - li * 0.25) : mix("#5b6a80", "#a7b4c8", 0.7 - li * 0.3);
      tile(P, (RUN ? p * laps * P : 0) - cam.x * W * depth * 0.5, o => {
        for (const b of layer) {
          const x = o + b.x, y = base - b.h;
          ctx.fillStyle = body; ctx.fillRect(x, y, b.w, b.h + 2);
          if (li === 2) { ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(x + b.w * (Lt.dx > 0 ? 0.72 : 0), y, b.w * 0.28, b.h); }
          if (INKED) { ctx.lineWidth = 2; ctx.strokeStyle = PAL.ink; ctx.strokeRect(x, y, b.w, b.h + 2); }
          if (b.tank) { ctx.fillStyle = mix("#3b4258", "#000000", 0.2); ctx.fillRect(x + b.w * 0.2, y - b.tank, b.w * 0.34, b.tank); ctx.fillRect(x + b.w * 0.26, y - b.tank - 6, b.w * 0.22, 6); }
          if (b.ant) { ctx.fillStyle = "#333b52"; ctx.fillRect(x + b.w * 0.5 - 1, y - b.ant, 2, b.ant); if (night) { ctx.fillStyle = "rgba(255,70,70," + (0.4 + 0.6 * Math.abs(Math.sin(p * TAU * 8 + b.x))) + ")"; ctx.beginPath(); ctx.arc(x + b.w * 0.5, y - b.ant, 2.2, 0, TAU); ctx.fill(); } }
          for (const [wx, wy, ph, on] of b.win) {
            if (night) { if (on) { ctx.fillStyle = "rgba(255," + (190 + ph * 30) + ",110," + (0.5 + 0.4 * Math.sin(p * TAU * 2 + ph * 6)) + ")"; ctx.fillRect(x + wx, y + wy, 4, 6); } }
            else { ctx.fillStyle = "rgba(255,255,255," + (0.12 + 0.18 * Math.abs(Math.sin(p * TAU + ph * 6))) + ")"; ctx.fillRect(x + wx, y + wy, 4, 6); }
          }
        }
      });
      if (li < 2) { const g = ctx.createLinearGradient(0, base - H * 0.34, 0, base); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(" + (night ? "120,130,190" : "255,255,255") + "," + (0.16 - li * 0.06) + ")"); ctx.fillStyle = g; ctx.fillRect(0, base - H * 0.34, W, H * 0.34); }
    });
  },
  ground(ctx, p, W, H, S, cam, Lt) {
    const y0 = H * 0.84, night = CFG.sky !== "day";
    const g = ctx.createLinearGradient(0, y0, 0, H); g.addColorStop(0, night ? "#1a2038" : "#6f7686"); g.addColorStop(1, night ? "#0a0d1c" : "#3c4252");
    ctx.fillStyle = g; ctx.fillRect(0, y0, W, H - y0);
    ctx.fillStyle = "rgba(255,255,255," + (night ? 0.14 : 0.3) + ")"; ctx.fillRect(0, y0, W, 2);
    const P = W * 1.2; tile(P, p * P * 6, o => { for (let i = 0; i < 6; i++) ctx.fillRect(o + i * P / 6, y0 + (H - y0) * 0.45, P / 12, 4); });
  },
  character(ctx, p, W, H, S, cam, Lt, t, dur) {
    const q = pose(t, W, H, dur), U = q.U, st = S || DATA.init;
    const hi = Lt.color, body = STYLE === "pixel" ? PAL.accent2 : PAL.accent2, pants = mix("#22305a", "#0a1024", 0.2), skin = "#f0c39b", scarf = PAL.accent;
    // long soft shadow, cast away from the light
    const sh = ctx.createRadialGradient(q.cx - Lt.dx * U * 0.3, q.ground + U * 0.02, 1, q.cx - Lt.dx * U * 0.3, q.ground + U * 0.02, U * 0.55);
    sh.addColorStop(0, Lt.shadow); sh.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save(); ctx.translate(0, q.ground); ctx.scale(1, 0.14); ctx.translate(0, -q.ground); ctx.fillStyle = sh; ctx.fillRect(q.cx - U, q.ground - U, U * 2, U * 2); ctx.restore();
    // back arm and back leg first
    const legs = [0, 1].map(i => PHYS.ik2(q.cx, q.hipY, q.f[i].x, q.f[i].y, q.l1, q.l2, -1)), arms = [0, 1].map(i => PHYS.ik2(q.sx, q.sy, q.hand[i].x, q.hand[i].y, U * 0.19, U * 0.19, -1));
    const leg = i => { limb(ctx, [[q.cx, q.hipY], [legs[i].x, legs[i].y], [legs[i].ex, legs[i].ey]], U * 0.085, pants, hi, Lt); ctx.fillStyle = "#1b1d24"; ctx.beginPath(); ctx.ellipse(legs[i].ex + U * 0.04, legs[i].ey + U * 0.005, U * 0.08, U * 0.036, 0, 0, TAU); ctx.fill(); ink(ctx, 2); };
    const arm = i => limb(ctx, [[q.sx, q.sy], [arms[i].x, arms[i].y], [arms[i].ex, arms[i].ey]], U * 0.06, i ? skin : mix("#000000", body, 0.75), hi, Lt);
    leg(1); arm(1);
    // scarf tail streams from the physics chain
    const chain = st.scarf;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let i = chain.length - 1; i >= 1; i--) { const a = chain[i - 1], b = chain[i], w = U * (0.05 - 0.036 * (i / chain.length)); ctx.strokeStyle = i % 4 < 2 ? scarf : mix(scarf, "#000000", 0.18); ctx.lineWidth = w * 1.5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    // torso
    limb(ctx, [[q.cx, q.hipY], [q.sx, q.sy]], U * 0.15, body, hi, Lt);
    ctx.strokeStyle = scarf; ctx.lineWidth = U * 0.07; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(q.sx - U * 0.03, q.sy - U * 0.005); ctx.lineTo(q.sx + U * 0.06, q.sy - U * 0.02); ctx.stroke();
    // head and hair
    const hc = st.hair; ctx.strokeStyle = "#2a1a12"; ctx.lineCap = "round";
    for (let i = hc.length - 1; i >= 1; i--) { ctx.lineWidth = q.r * (0.9 - 0.14 * i); ctx.beginPath(); ctx.moveTo(hc[i - 1].x, hc[i - 1].y); ctx.lineTo(hc[i].x, hc[i].y); ctx.stroke(); }
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(q.hx, q.hy, q.r, 0, TAU); ctx.fill(); ink(ctx, 2.5);
    ctx.fillStyle = "#2a1a12"; ctx.beginPath(); ctx.arc(q.hx - q.r * 0.1, q.hy - q.r * 0.15, q.r * 1.02, Math.PI * 0.95, Math.PI * 1.85); ctx.fill();
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(q.hx + q.r * 0.42, q.hy - q.r * 0.05, q.r * 0.11, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.beginPath(); ctx.arc(q.hx + q.r * 0.45, q.hy - q.r * 0.09, q.r * 0.04, 0, TAU); ctx.fill();
    leg(0); arm(0);
  },
  sea(ctx, p, W, H, S, cam, Lt) {
    const lightX = has("moon") || CFG.sky === "night" ? W * 0.8 : CFG.sky === "sunset" ? W * 0.5 : W * 0.78;
    ["#1f6fa3", "#185b87", "#12486c"].forEach((col, i) => {
      const base = H * (0.68 + i * 0.08);
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 6) ctx.lineTo(x, base + Math.sin((x / W) * TAU * (2 + i) + p * TAU * (i % 2 ? -1 : 1)) * H * 0.018);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill(); ink(ctx, 2);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      for (let k = 0; k < 14; k++) { const x = wrap(hash(k + i * 20) + p * (i % 2 ? -1 : 1)) * W, y = base + Math.sin((x / W) * TAU * (2 + i) + p * TAU * (i % 2 ? -1 : 1)) * H * 0.018; ctx.fillRect(x, y - 1, 8 + hash(k) * 10, 2); }
    });
    if (has("sun") || has("moon") || CFG.sky !== "day") {   // glitter path under the light source
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 70; i++) { const y = H * (0.68 + hash(i) * 0.3), spread = (y - H * 0.66) * 0.5, x = lightX + (hash(i + 30) - 0.5) * spread * 2, a = Math.max(0, Math.sin(p * TAU * (2 + (i % 4)) + i * 3)); ctx.fillStyle = "rgba(255,240,200," + a * 0.5 + ")"; ctx.fillRect(x, y, 6 + hash(i + 3) * 10, 1.6); }
      ctx.globalCompositeOperation = "source-over";
    }
  },
  boat(ctx, p, W, H) {
    const x = wrap(p) * (W + 240) - 120, y = H * 0.69 + Math.sin(p * TAU * 3) * 5, tilt = Math.sin(p * TAU * 3 + 1) * 0.06;
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
    ctx.fillStyle = "#7a4a2a"; ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(60, 0); ctx.lineTo(42, 22); ctx.lineTo(-42, 22); ctx.closePath(); ctx.fill(); ink(ctx);
    ctx.fillStyle = "#6b4a33"; ctx.fillRect(-3, -90, 6, 90);
    const flap = Math.sin(p * TAU * 6) * 4;
    ctx.fillStyle = "#f7f3e8"; ctx.beginPath(); ctx.moveTo(4, -86); ctx.quadraticCurveTo(34 + flap, -50, 52, -12); ctx.lineTo(4, -12); ctx.closePath(); ctx.fill(); ink(ctx);
    ctx.restore();
  },
  planets(ctx, p, W, H) {
    const cx = W / 2, cy = H / 2, k = Math.min(W, H) / 400;
    ball(ctx, cx, cy, 34 * k, "#ffb43b");
    [[70, 3, 6, "#6fb3ff"], [110, 2, 9, "#ff7a59"], [155, 1, 14, "#d7c08f"]].forEach(([d, turns, r, c], i) => {
      ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, d * k, d * k * 0.4, 0, 0, TAU); ctx.stroke();
      const a = p * TAU * turns + i * 2; ball(ctx, cx + Math.cos(a) * d * k, cy + Math.sin(a) * d * k * 0.4, r * k, c);
    });
  },
  rocket(ctx, p, W, H) {
    const u = ease.inOut(wrap(p)), x = W * 0.5 + Math.sin(p * TAU * 2) * 12, y = H * 1.15 - u * H * 1.5;
    for (let i = 0; i < 34; i++) {
      const q = wrap(hash(i) + p * 6), sx = x + (hash(i + 5) - 0.5) * 34 * q, sy = y + 60 + q * 150;
      ctx.fillStyle = "rgba(200,200,210," + (0.4 * (1 - q)) + ")"; ctx.beginPath(); ctx.arc(sx, sy, 8 + q * 28, 0, TAU); ctx.fill();
    }
    const fl = 26 + Math.sin(p * TAU * 20) * 8;
    ctx.globalCompositeOperation = "lighter";
    const fg = ctx.createRadialGradient(x, y + 50, 2, x, y + 50, 70 + fl); fg.addColorStop(0, "rgba(255,200,90,0.7)"); fg.addColorStop(1, "rgba(255,120,30,0)"); ctx.fillStyle = fg; ctx.fillRect(x - 120, y - 40, 240, 240);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ffb703"; ctx.beginPath(); ctx.moveTo(x - 11, y + 36); ctx.quadraticCurveTo(x, y + 36 + fl * 2, x + 11, y + 36); ctx.fill();
    ctx.fillStyle = STYLE === "3d" ? "#dfe6ee" : "#f1f4f8"; ctx.beginPath(); ctx.moveTo(x, y - 60); ctx.quadraticCurveTo(x + 24, y - 30, x + 20, y + 36); ctx.lineTo(x - 20, y + 36); ctx.quadraticCurveTo(x - 24, y - 30, x, y - 60); ctx.fill(); ink(ctx);
    ctx.fillStyle = PAL.accent2; ctx.beginPath(); ctx.moveTo(x - 20, y + 10); ctx.lineTo(x - 36, y + 40); ctx.lineTo(x - 20, y + 36); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 20, y + 10); ctx.lineTo(x + 36, y + 40); ctx.lineTo(x + 20, y + 36); ctx.fill();
    ball(ctx, x, y - 14, 8, "#6fd3ff");
  },
  fish(ctx, p, W, H) {
    for (let i = 0; i < 11; i++) {
      const dir = i % 2 ? 1 : -1, s = 12 + hash(i) * 16, x = wrap(hash(i + 2) + p * dir * (1 + (i % 3))) * (W + 120) - 60, y = H * (0.15 + hash(i + 9) * 0.6) + Math.sin(p * TAU * 2 + i) * 10;
      const wig = Math.sin(p * TAU * 12 + i) * 0.35;
      ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
      ctx.fillStyle = "hsl(" + [20, 45, 190, 330, 280][i % 5] + ",85%,58%)";
      ctx.beginPath(); ctx.moveTo(-s * 0.8, 0); ctx.lineTo(-s * 1.6, -s * (0.55 + wig)); ctx.lineTo(-s * 1.6, s * (0.55 - wig)); ctx.closePath(); ctx.fill(); ink(ctx, 1.5);
      ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.55, 0, 0, TAU); ctx.fill(); ink(ctx, 1.5);
      ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.beginPath(); ctx.ellipse(-s * 0.1, -s * 0.22, s * 0.55, s * 0.14, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s * 0.5, -s * 0.12, s * 0.16, 0, TAU); ctx.fill();
      ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(s * 0.55, -s * 0.12, s * 0.08, 0, TAU); ctx.fill();
      ctx.restore();
    }
  },
  bubbles(ctx, p, W, H) {
    ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.2;
    for (let i = 0; i < 55; i++) { const y = H - wrap(hash(i) + p * (1 + (i % 3))) * (H + 20), x = hash(i + 3) * W + Math.sin(p * TAU * 4 + i) * 6; ctx.beginPath(); ctx.arc(x, y, 2 + hash(i + 8) * 5, 0, TAU); ctx.stroke(); }
  },
  birds(ctx, p, W, H) {
    ctx.strokeStyle = CFG.sky === "day" ? "#243042" : "#dfe6ff"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
    for (let i = 0; i < 7; i++) {
      const x = wrap(p + (i % 4) * 0.03) * (W + 200) - 100 - Math.abs(i - 3) * 26, y = H * 0.28 + Math.abs(i - 3) * 16 + Math.sin(p * TAU * 2 + i) * 6, f = Math.sin(p * TAU * 14 + i) * 8;
      ctx.beginPath(); ctx.moveTo(x - 12, y - f); ctx.quadraticCurveTo(x - 5, y - 4, x, y); ctx.quadraticCurveTo(x + 5, y - 4, x + 12, y - f); ctx.stroke();
    }
  },
  balls(ctx, p, W, H) {
    const floor = H * 0.84;
    for (let i = 0; i < 5; i++) {
      const x = W * (0.16 + i * 0.17), r = Math.min(W, H) * (0.04 + hash(i) * 0.03), n = 2 + (i % 3), ph = wrap(p * n + hash(i + 4));
      const hgt = 4 * ph * (1 - ph), y = floor - r - hgt * H * 0.5, squash = ph < 0.06 || ph > 0.94 ? 0.75 : 1;
      ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(x, floor, r * (1.2 - hgt * 0.6), r * 0.25, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(x, y + r * (1 - squash)); ctx.scale(1 / squash, squash); ball(ctx, 0, 0, r, "hsl(" + i * 67 + ",80%,58%)"); ctx.restore();
    }
  },
  car(ctx, p, W, H) {
    const road = H * 0.82;
    ctx.fillStyle = "#2b2f38"; ctx.fillRect(0, road, W, H - road);
    ctx.fillStyle = "#f5d547"; for (let i = -1; i < 12; i++) ctx.fillRect(wrap(-p * 4 + i / 10) * (W + 80) - 40, road + (H - road) * 0.45, 40, 5);
    const x = W * 0.45, y = road - 8 + Math.sin(p * TAU * 16) * 1.5;
    ctx.fillStyle = PAL.accent2; ctx.beginPath(); ctx.moveTo(x - 90, y - 10); ctx.lineTo(x - 80, y - 38); ctx.lineTo(x - 40, y - 40); ctx.lineTo(x - 18, y - 66); ctx.lineTo(x + 40, y - 66); ctx.lineTo(x + 62, y - 40); ctx.lineTo(x + 92, y - 34); ctx.lineTo(x + 96, y - 10); ctx.closePath(); ctx.fill(); ink(ctx);
    ctx.fillStyle = "#bfe3ff"; ctx.beginPath(); ctx.moveTo(x - 10, y - 60); ctx.lineTo(x + 36, y - 60); ctx.lineTo(x + 52, y - 42); ctx.lineTo(x - 26, y - 42); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = "lighter"; const hl = ctx.createLinearGradient(x + 92, y - 22, x + 300, y - 22); hl.addColorStop(0, "rgba(255,240,180,0.55)"); hl.addColorStop(1, "rgba(255,240,180,0)"); ctx.fillStyle = hl; ctx.beginPath(); ctx.moveTo(x + 92, y - 26); ctx.lineTo(x + 300, y - 60); ctx.lineTo(x + 300, y + 10); ctx.lineTo(x + 92, y - 16); ctx.fill(); ctx.globalCompositeOperation = "source-over";
    for (const wx of [x - 55, x + 60]) {
      ball(ctx, wx, y - 6, 18, "#1c1c1c");
      ctx.strokeStyle = "#bbb"; ctx.lineWidth = 3; const a = -p * TAU * 12;
      ctx.beginPath(); ctx.moveTo(wx + Math.cos(a) * 12, y - 6 + Math.sin(a) * 12); ctx.lineTo(wx - Math.cos(a) * 12, y - 6 - Math.sin(a) * 12); ctx.stroke();
    }
  },
  fire(ctx, p, W, H) {
    const bx = W / 2, by = H * 0.82;
    ctx.fillStyle = "#5a3a22"; ctx.save(); ctx.translate(bx, by + 8); ctx.rotate(0.25); ctx.fillRect(-70, -8, 140, 16); ctx.rotate(-0.5); ctx.fillRect(-70, -8, 140, 16); ctx.restore();
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(bx, by - 30, 4, bx, by - 30, H * 0.5); glow.addColorStop(0, "rgba(255,150,50," + (0.32 + 0.06 * Math.sin(p * TAU * 12)) + ")"); glow.addColorStop(1, "rgba(255,90,20,0)"); ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 130; i++) {
      const q = wrap(hash(i) + p * (2 + (i % 3))), x = bx + (hash(i + 9) - 0.5) * 70 * (1 - q) + Math.sin(q * 8 + i) * 12, y = by - q * H * 0.42, r = (1 - q) * 22 + 3;
      ctx.fillStyle = "hsla(" + (50 - q * 45) + ",100%," + (60 - q * 20) + "%," + (0.5 * (1 - q)) + ")";
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < 26; i++) { const q = wrap(hash(i + 300) + p * (1 + (i % 2))), x = bx + (hash(i + 310) - 0.5) * 120 + Math.sin(q * 9 + i) * 26, y = by - q * H * 0.7; ctx.fillStyle = "rgba(255,190,90," + (1 - q) + ")"; ctx.fillRect(x, y, 2, 2); }
    ctx.globalCompositeOperation = "source-over";
  },
  leaves(ctx, p, W, H) {
    for (let i = 0; i < 40; i++) {
      const y = wrap(hash(i) + p * (1 + (i % 2))) * (H + 40) - 20, x = hash(i + 6) * W + Math.sin(p * TAU * 2 + i) * 30, rot = p * TAU * (i % 2 ? 2 : -2) + i;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = ["#e76f51", "#f4a261", "#e9c46a", "#c1440e"][i % 4];
      ctx.beginPath(); ctx.ellipse(0, 0, 11, 5, 0, 0, TAU); ctx.fill(); ink(ctx, 1.2); ctx.restore();
    }
  },
  snow(ctx, p, W, H) {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    for (let i = 0; i < 190; i++) { const y = wrap(hash(i) + p * (1 + (i % 2))) * (H + 10) - 5, x = hash(i + 4) * W + Math.sin(p * TAU * 2 + i) * 14; ctx.beginPath(); ctx.arc(x, y, 1 + hash(i + 2) * 2.6, 0, TAU); ctx.fill(); }
  },
  rain(ctx, p, W, H) {
    ctx.strokeStyle = "rgba(190,210,255,0.55)"; ctx.lineWidth = 1.3;
    for (let i = 0; i < 260; i++) { const y = wrap(hash(i) + p * (3 + (i % 3))) * (H + 40) - 20, x = hash(i + 3) * (W + 60); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 18); ctx.stroke(); }
  },
  lightning(ctx, p, W, H) {
    for (const at of [0.28, 0.71]) {
      const d = p - at; if (d < 0 || d > 0.05) continue;
      const a = 1 - d / 0.05;
      ctx.fillStyle = "rgba(230,235,255," + 0.45 * a + ")"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255," + a + ")"; ctx.lineWidth = 3; ctx.beginPath();
      let x = W * (at < 0.5 ? 0.3 : 0.65), y = 0; ctx.moveTo(x, y);
      for (let s = 0; s < 9; s++) { x += (hash(s + at * 100) - 0.5) * 60; y += H * 0.07; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  },
  confetti(ctx, p, W, H) {
    for (let i = 0; i < 170; i++) {
      const y = wrap(hash(i) + p * (1 + (i % 3))) * (H + 30) - 15, x = hash(i + 7) * W + Math.sin(p * TAU * 3 + i) * 20, rot = p * TAU * 4 + i;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, Math.cos(rot * 1.3));
      ctx.fillStyle = "hsl(" + Math.floor(hash(i + 1) * 360) + ",90%,60%)"; ctx.fillRect(-5, -3, 10, 6); ctx.restore();
    }
  },
  hearts(ctx, p, W, H) {
    for (let i = 0; i < 26; i++) {
      const q = wrap(hash(i) + p * (1 + (i % 2))), y = H + 30 - q * (H + 60), x = hash(i + 5) * W + Math.sin(q * 6 + i) * 20, s = 8 + hash(i + 2) * 14;
      ctx.fillStyle = "hsla(" + (340 + hash(i) * 30) + ",85%,62%," + (1 - q * 0.6) + ")"; heart(ctx, x, y, s); ctx.fill(); ink(ctx, 1.5);
    }
  },
  neongrid(ctx, p, W, H) {
    const hz = H * 0.58;
    const sunG = ctx.createLinearGradient(0, hz - H * 0.3, 0, hz); sunG.addColorStop(0, "#ffd166"); sunG.addColorStop(1, "#ff3d8b");
    ctx.fillStyle = sunG; ctx.beginPath(); ctx.arc(W / 2, hz, H * 0.22, Math.PI, 0); ctx.fill();
    ctx.fillStyle = PAL.sky[1]; for (let i = 0; i < 5; i++) ctx.fillRect(0, hz - H * 0.02 - i * H * 0.035, W, 3 + i);
    ctx.fillStyle = "#0b0520"; ctx.fillRect(0, hz, W, H - hz);
    ctx.strokeStyle = "#ff3df2"; ctx.lineWidth = 1.5; ctx.shadowColor = "#ff3df2"; ctx.shadowBlur = 10;
    for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 12, hz); ctx.lineTo(W / 2 + i * W * 0.12, H); ctx.stroke(); }
    for (let i = 0; i < 12; i++) { const z = wrap(i / 12 - p * 2), y = hz + (H - hz) * z * z; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.shadowBlur = 0;
  },
  abstract(ctx, p, W, H) {
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 8; i++) {
      const a = p * TAU * (i % 2 ? 1 : -1) + i, x = W / 2 + Math.cos(a) * W * 0.22 * (0.5 + hash(i)), y = H / 2 + Math.sin(a * 2) * H * 0.2, r = Math.min(W, H) * (0.12 + hash(i + 3) * 0.12);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, "hsla(" + (i * 50 + p * 360) + ",90%,60%,0.7)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  },
  motes(ctx, p, W, H, S, cam, Lt) {   // floating dust lit by the light, drifting with the camera
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 46; i++) {
      const depth = 0.3 + hash(i + 70) * 0.9, x = ((hash(i) * W + Math.sin(p * TAU + i) * 14 * depth + cam.x * W * depth * 0.6) % W + W) % W, y = ((hash(i + 20) * H - p * H * 0.12 * depth * (1 + (i % 2))) % H + H) % H;
      const r = 1 + depth * 2.2, tw = 0.35 + 0.65 * Math.abs(Math.sin(p * TAU * (1 + (i % 4)) + i));
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3); g.addColorStop(0, "rgba(255,240,210," + 0.35 * tw + ")"); g.addColorStop(1, "rgba(255,240,210,0)");
      ctx.fillStyle = g; ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
    }
    ctx.globalCompositeOperation = "source-over";
  },
  text(ctx, p, W, H) {
    const s = CFG.text; if (!s) return;
    const size = Math.min(W / (s.length * 0.62 + 1), H * 0.18);
    ctx.font = "800 " + size + "px system-ui, sans-serif"; ctx.textBaseline = "middle"; ctx.textAlign = "center";
    const total = ctx.measureText(s).width; let x = W / 2 - total / 2;
    const out = p > 0.88 ? ease.in((p - 0.88) / 0.12) : 0;
    for (let i = 0; i < s.length; i++) {
      const cw = ctx.measureText(s[i]).width, k = ease.outBack(clamp(p * 5 - i * 0.12, 0, 1)) * (1 - out);
      ctx.save(); ctx.translate(x + cw / 2, H * 0.45 + Math.sin(p * TAU * 2 + i * 0.5) * 6); ctx.scale(k, k);
      ctx.fillStyle = "#fff"; ctx.shadowColor = PAL.accent; ctx.shadowBlur = 18; ctx.fillText(s[i], 0, 0);
      if (INKED) { ctx.shadowBlur = 0; ctx.lineWidth = 3; ctx.strokeStyle = PAL.ink; ctx.strokeText(s[i], 0, 0); ctx.fillText(s[i], 0, 0); }
      ctx.restore(); x += cw;
    }
  }
};
const ORDER = ["sky", "stars", "sun", "moon", "neongrid", "clouds", "mountains", "city", "sea", "boat", "planets", "abstract", "rocket", "fish", "bubbles", "ground", "car", "fire", "balls", "birds", "character", "leaves", "snow", "rain", "lightning", "confetti", "hearts", "motes", "text"];
function setup(W, H) {
  const P = W * 1.6, mkLayer = (n, minH, maxH, seedOff) => {
    const out = []; let x = 0, i = 0, widths = [];
    while (x < P) { const w = 30 + hash(i * 3.3 + seedOff) * 54; widths.push(w); x += w; i++; }
    const k = P / x; x = 0;
    widths.forEach((w0, j) => {
      const w = w0 * k, h = H * (minH + hash(j * 5.1 + seedOff) * (maxH - minH)), win = [];
      for (let wy = 12; wy < h - 10; wy += 15) for (let wx = 7; wx < w - 9; wx += 11) win.push([wx, wy, hash(j * 17 + wx * 1.3 + wy * 0.7 + seedOff), hash(j * 3 + wx * 7.7 + wy * 1.9 + seedOff) < 0.42]);
      out.push({ x, w, h, win, tank: hash(j + seedOff * 2) < 0.22 ? 14 + hash(j) * 14 : 0, ant: hash(j + seedOff * 3) < 0.18 ? 18 + hash(j + 4) * 26 : 0 });
      x += w;
    });
    return out;
  };
  DATA = { P, city: [mkLayer(0, 0.16, 0.34, 1), mkLayer(1, 0.14, 0.3, 5), mkLayer(2, 0.09, 0.26, 9)] };
  const q = has("character") ? pose(0, W, H, 6) : { nx: 0, ny: 0, bx: 0, by: 0, U: 100 };
  const st = { scarf: PHYS.makeChain(16, q.nx, q.ny, q.U * 0.085), hair: PHYS.makeChain(5, q.bx, q.by, q.U * 0.05) };
  DATA.init = st;
  return st;
}
function draw(ctx, t, info) {
  const { W, H, duration, state } = info, Lt = info.light, cam = info.camera;
  let p = info.progress, tt = t;
  if (STYLE === "frames") {
    const drawings = Math.max(1, Math.round(duration * 8)), d = Math.floor(p * drawings);
    p = d / drawings; tt = p * duration;
    ctx.translate((hash(d) - 0.5) * 3, (hash(d + 50) - 0.5) * 3);
  }
  for (const name of ORDER) {
    if (name !== "sky" && !has(name) && !(name === "ground" && RUN) && !(name === "motes" && CFG.sky !== "underwater")) continue;
    ctx.save(); L[name](ctx, p, W, H, state, cam, Lt, tt, duration); ctx.restore();
  }
  const needsGround = (has("fire") || has("balls")) && !has("sea") && !has("city") && CFG.sky !== "underwater" && CFG.sky !== "space";
  if (needsGround) { ctx.fillStyle = PAL.ground; ctx.fillRect(0, H * 0.84, W, H * 0.16); }
  if (CFG.sky === "underwater") { ctx.fillStyle = PAL.ground; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, H * 0.93 - Math.sin(x * 0.02) * 8); ctx.lineTo(W, H); ctx.fill(); }
  if (STYLE === "frames") { ctx.fillStyle = "rgba(245,235,215,0.12)"; ctx.fillRect(-10, -10, W + 20, H + 20); }
}
}

// Built-in examples that use the mock generator's engine, so they show camera, light and physics together.
PTM_EXAMPLES.push({ id: "ex-runner", title: "Rooftop runner", note: "A runner sprints past a skyline at golden hour. The scarf and hair are simulated physics.",
  prompt: "A runner sprinting across city rooftops at sunset with a flowing scarf", params: { style: "3d", duration: 6, aspect: "16:9", fps: 30, camera: "handheld", camK: 1, light: "golden", blur: 2, detail: "high", physics: true },
  code: PTM_mock("A runner sprinting across city rooftops at sunset with a flowing scarf", "3d").code, engine: "example" });
PTM_EXAMPLES.push({ id: "ex-neon-storm", title: "Neon storm over the city", note: "Rain, lightning and a synthwave skyline, with a slow orbit camera.",
  prompt: "Neon rain and lightning over a cyberpunk city at night", params: { style: "anime", duration: 6, aspect: "16:9", fps: 30, camera: "orbit", camK: 1, light: "neon", blur: 1, detail: "high", physics: false },
  code: PTM_mock("Neon rain and lightning over a cyberpunk city at night with a storm", "anime").code, engine: "example" });
