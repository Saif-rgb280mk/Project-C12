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
  ["fire", /\b(fire|flames?|campfire|burning|volcano|lava)/],
  ["fish", /\b(fish|aquarium|underwater|coral|reef|shark)/],
  ["bubbles", /\b(bubbles?|underwater|aquarium|fish|soda)/],
  ["birds", /\b(birds?|flock|seagulls?)/],
  ["balls", /\b(balls?|bounce|bouncing|bouncy|football|soccer|basketball)/],
  ["planets", /\b(planets?|orbit|solar|saturn|jupiter)/],
  ["rocket", /\b(rockets?|launch|spaceship|astronaut|lift ?off)/],
  ["confetti", /\b(party|confetti|celebrat|birthday|congrat|win|winner)/],
  ["hearts", /\b(love|hearts?|valentine|romantic|crush)/],
  ["neongrid", /\b(neon|synthwave|retro|80s|cyber|vaporwave|arcade)/],
  ["leaves", /\b(autumn|fall(ing)? leaves|leaf|leaves)/],
  ["car", /\b(cars?|drive|driving|road|race|racing|truck)/],
  ["dragon", /\b(dragons?|wyvern)\b/],
  ["castle", /\b(castle|fortress|kingdom|knight|medieval|palace)\b/],
  ["pines", /\b(forest|woods?|pines?|trees?|jungle)\b/],
  ["ufo", /\b(ufo|ufos|saucer|aliens?|abduct\w*)\b/],
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
  if (layers.includes("dragon")) layers.splice(layers.indexOf("fire"), layers.includes("fire") ? 1 : 0);   // dragons breathe their own fire
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

// Gait geometry for the running character. It lives out here so the scene (inside the preview) and the sound
// engine (in the page) agree on cadence. Everything follows from three rules:
//   1. the sole of a planted foot rests exactly on the ground line,
//   2. the legs are long enough to reach every planted foot, so the knee never locks out,
//   3. a planted foot moves back at exactly the speed the road scrolls, so it never skates.
// D is how far the road scrolls in one loop. With the foot speed = D / duration, one stride cycle covers 4 * stride.
function PTM_gait(W, H, dur) {
  const U = Math.min(H * 0.36, W * 0.5), P = W * 1.6, L = U * 0.49;
  const c0 = Math.max(2, Math.round(dur * 1.4));                       // steps per second the eye finds natural
  const g = Math.max(1, Math.round((U * 0.23 * 4 * c0) / P));          // laps of the near buildings the road covers per loop
  const cycles = Math.max(c0, Math.ceil((g * P) / (4 * U * 0.28)));    // never ask for a stride longer than 0.28 U
  const D = g * P, stride = D / (4 * cycles), bob = U * 0.018, sole = U * 0.05;
  const hv = Math.sqrt(Math.max(0, Math.pow(L * 0.985, 2) - stride * stride)) - bob;   // hip height above the ankle line
  return { U, P, L, cycles, D, stride, bob, sole, hv, roadSpeed: D / dur };
}

const PTM_MOCK_VERSION = 3;   // bump when the mock scenes change, so saved mock animations are rebuilt with the fix
function PTM_mock(prompt, style) {
  const a = PTM_analyze(prompt);
  const cfg = { style, sky: a.sky, layers: a.layers, text: a.text || (a.layers.includes("abstract") ? titleCase(a.prompt.split(" ").slice(0, 4).join(" ")) : ""), palette: PTM_SKIES[a.sky] };
  const shown = a.layers.filter(l => l !== "abstract" && l !== "text");
  return {
    title: makeTitle(a.prompt),
    note: shown.length ? "Mock preview built from: " + shown.join(", ") + (a.text ? ', plus the text "' + a.text + '"' : "") + "." : "Mock preview: no scene keywords found, so this is an abstract motion loop.",
    code: sceneSource(mockSceneTemplate, "// Mock scene from PromptToMotion's offline generator (no AI).\nconst CFG = " + JSON.stringify(cfg) + ";\n" + PTM_gait.toString() + "\n"),
    analysis: a, version: PTM_MOCK_VERSION
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
// How a background layer scrolls. Layer speed is a fraction f of the road's speed. Every layer has to move a whole number of
// its own pattern periods per loop to repeat seamlessly, so the period is chosen as f * D / n and the pattern is stretched to fit.
function scroll(f, base, W, H, dur, p) {
  if (!RUN) return { P: base, off: 0, s: 1 };
  const D = PTM_gait(W, H, dur).D, ff = Math.max(f, (0.8 * W) / D);          // a layer must move at least 0.8 of the frame per loop, or its pattern would have to be squashed flat
  const n = Math.max(1, Math.round((ff * D) / base)), P = (ff * D) / n;
  return { P, off: p * ff * D, s: P / base };
}
let VW = 960;   // frame width, set at the start of draw()
// Draw a repeating pattern of period P so that it covers the whole frame, however short the period is.
function tile(P, off, fn) { const o = -(((off % P) + P) % P), n = Math.ceil(VW / P) + 1; for (let i = 0; i <= n; i++) fn(o + i * P); }
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
const GAIT_CYCLES = dur => 0;   // (kept for old saved scenes; the cadence now comes from PTM_gait)
function pose(t, W, H, dur) {
  const G = PTM_gait(W, H, dur), U = G.U, p = t / dur, ground = H * 0.84, cx = W * (W > H ? 0.36 : 0.5);
  const l1 = U * 0.245, l2 = U * 0.245, gait = p * TAU * G.cycles, stride = G.stride;
  const groundAnkle = ground - G.sole - 1.5;                           // ankle height when the foot is planted (1.5 px so an outline never dips below)
  const hipY = groundAnkle - G.hv - Math.cos(gait * 2) * G.bob, lean = 0.24 + Math.sin(gait * 2) * 0.02;
  const foot = leg => {
    const m = (((gait + leg * Math.PI) % TAU) + TAU) % TAU;
    if (m < Math.PI) return { x: cx + stride * (1 - (2 * m) / Math.PI), y: groundAnkle, ang: 0, planted: true, lift: 0 };            // stance: foot slides back with the road
    // swing: a Hermite curve from the back of the stride to the front. Its slope at both ends is the slope of the stance
    // (the foot is carried back by the road at 2 * stride per half cycle), so the foot never stops or snaps at lift-off or landing.
    const q = (m - Math.PI) / Math.PI, q2 = q * q, q3 = q2 * q, v = -2 * stride;
    const hx = (2 * q3 - 3 * q2 + 1) * -stride + (q3 - 2 * q2 + q) * v + (-2 * q3 + 3 * q2) * stride + (q3 - q2) * v;
    const lift = Math.pow(Math.sin(q * Math.PI), 0.75);                                                             // quick rise, soft landing
    return { x: cx + hx, y: groundAnkle - lift * U * 0.2, ang: -0.35 * Math.sin(q * Math.PI), planted: false, lift };
  };
  const f0 = foot(0), f1 = foot(1), torso = U * 0.3;
  const sx = cx + Math.sin(lean) * torso, sy = hipY - Math.cos(lean) * torso;
  const hx = sx + Math.sin(lean * 0.6) * U * 0.14, hy = sy - Math.cos(lean * 0.6) * U * 0.14, r = U * 0.078;
  const hand = leg => { const th = Math.sin(gait + leg * Math.PI + Math.PI) * 0.95; return { x: sx + Math.sin(th) * U * 0.3 + U * 0.07, y: sy + U * 0.3 - Math.abs(Math.sin(th)) * U * 0.09 }; };
  return { U, ground, groundAnkle, sole: G.sole, stride, roadSpeed: G.roadSpeed, D: G.D, cx, l1, l2, hipY, lean, f: [f0, f1], sx, sy, hx, hy, r, hand: [hand(0), hand(1)], nx: sx - U * 0.01, ny: sy - U * 0.02, bx: hx - r * 0.75, by: hy - r * 0.35 };
}
// ---- dragon: flight path, wing flap and fire windows are closed-form; the tail is simulated ----
const FLAPS = dur => Math.max(3, Math.round(dur * 1.6));
function dragonPose(t, W, H, dur) {
  const p = t / dur, U = Math.min(W, H) * 0.3, flap = Math.sin(p * TAU * FLAPS(dur));
  return { p, U, flap, x: -W * 0.22 + W * 1.44 * p, y: H * 0.4 + Math.sin(p * TAU * 2) * H * 0.045 - flap * U * 0.05, bank: Math.cos(p * TAU * 2) * 0.07 };
}
const breathing = p => Math.sin(p * TAU * 2 + 0.9) > -0.25;
function dragonAnchors(q) { return { rx: q.x - q.U * 0.74, ry: q.y + q.U * 0.05, hx: q.x + q.U * 0.88, hy: q.y - q.U * 0.2 }; }
// ---- castle geometry (flag poles are where the cloth physics is pinned) ----
function castleGeom(W, H) {
  const U = Math.min(W * 0.5, H * 0.55), cx = W * (W > H ? 0.68 : 0.5), base = H * 0.78;
  const towers = [{ cx: cx - U * 0.3, w: U * 0.12, h: U * 0.5 }, { cx: cx + U * 0.3, w: U * 0.12, h: U * 0.56 }, { cx, w: U * 0.15, h: U * 0.72 }];
  return { U, cx, base, towers, poles: towers.map(t => ({ x: t.cx, y: base - t.h - t.w * 1.4 - U * 0.15 })) };
}
var simulate = (has("character") || has("dragon") || has("castle")) ? function (st, dt, t, info) {
  if (st.scarf) {
    const q = pose(t, info.W, info.H, info.duration);
    const w = n => (TAU * Math.max(1, Math.round((n * info.duration) / TAU))) / info.duration;   // gust speeds that fit a whole number of times into the loop
    PHYS.chain(st.scarf, q.nx, q.ny, dt, { gravity: 520, wind: -2100 + Math.sin(t * w(7)) * 380, damping: 0.986, iters: 6 });
    PHYS.chain(st.hair, q.bx, q.by, dt, { gravity: 260, wind: -1100 + Math.sin(t * w(9) + 1) * 250, damping: 0.98, iters: 4 });
  }
  if (st.tail) {
    const q = dragonPose(t, info.W, info.H, info.duration), a = dragonAnchors(q), c = st.tail;
    if (Math.hypot(c[0].x - a.rx, c[0].y - a.ry) > q.U * 2) for (let i = 0; i < c.length; i++) { c[i].x = c[i].px = a.rx - i * c[i].len; c[i].y = c[i].py = a.ry; }   // the loop restarts off screen
    PHYS.chain(c, a.rx, a.ry, dt, { gravity: 260, wind: -1500 + Math.sin(t * (TAU * Math.max(1, Math.round((6 * info.duration) / TAU))) / info.duration) * 300, damping: 0.982, iters: 6 });
  }
  if (st.flags) { const g = castleGeom(info.W, info.H); st.flags.forEach((f, i) => PHYS.chain(f, g.poles[i].x, g.poles[i].y, dt, { gravity: 150, wind: 1400 + Math.sin(t * (TAU * Math.max(1, Math.round((5 * info.duration) / TAU))) / info.duration + i * 2) * 450, damping: 0.972, iters: 5 })); }
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
  mountains(ctx, p, W, H, S, cam, Lt, t, dur) {
    [[0.6, "#8fb0c8", 0.5, 3], [0.7, "#5c7f9a", 0.58, 5], [0.8, "#3a5670", 0.66, 7]].forEach(([base, col, f, freq0], li) => {
      const sc = RUN ? scroll(f, W * 1.5, W, H, dur, p) : { P: W * 1.5, off: 0, s: 1 };
      const P = sc.P, off = sc.off, freq = RUN ? Math.max(1, Math.round(P / (W * 0.5))) : freq0, far = CFG.sky === "day" ? col : mix("#1c2a44", "#3e5a7a", li / 2);
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
      if (INKED) { ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2; ctx.beginPath(); const sh = off + cam.x * W * (0.2 + li * 0.25); for (let x = 0; x <= W; x += 8) { const xx = (((x + sh) % P) + P) % P; (x ? ctx.lineTo(x, ridge(xx)) : ctx.moveTo(x, ridge(xx))); } ctx.stroke(); }
      const haze = ctx.createLinearGradient(0, H * (base - 0.16), 0, H * (base + 0.06));
      haze.addColorStop(0, "rgba(255,255,255,0)"); haze.addColorStop(1, "rgba(255,255,255," + (0.16 - li * 0.04) + ")");
      ctx.fillStyle = haze; ctx.fillRect(0, H * (base - 0.16), W, H * 0.22);
    });
  },
  city(ctx, p, W, H, S, cam, Lt, t, dur) {
    const night = CFG.sky !== "day", P = DATA.P;
    DATA.city.forEach((layer, li) => {
      const depth = [0.3, 0.6, 1][li], sc = scroll([0.64, 0.78, 0.92][li], P, W, H, dur, p), base = H * (RUN ? 0.84 : 0.86) - H * 0.0;
      const body = night ? mix("#0a0d1c", "#26305a", 0.55 - li * 0.25) : mix("#5b6a80", "#a7b4c8", 0.7 - li * 0.3);
      tile(sc.P, sc.off - cam.x * W * depth * 0.5, oo => {
        ctx.save(); ctx.translate(oo, 0); ctx.scale(sc.s, 1); const o = 0;
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
        ctx.restore();
      });
      if (li < 2) { const g = ctx.createLinearGradient(0, base - H * 0.34, 0, base); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(" + (night ? "120,130,190" : "255,255,255") + "," + (0.16 - li * 0.06) + ")"); ctx.fillStyle = g; ctx.fillRect(0, base - H * 0.34, W, H * 0.34); }
    });
  },
  ground(ctx, p, W, H, S, cam, Lt, t, dur) {
    const y0 = H * 0.84, night = CFG.sky !== "day";
    const g = ctx.createLinearGradient(0, y0, 0, H); g.addColorStop(0, night ? "#1a2038" : "#6f7686"); g.addColorStop(1, night ? "#0a0d1c" : "#3c4252");
    ctx.fillStyle = g; ctx.fillRect(0, y0, W, H - y0);
    ctx.fillStyle = "rgba(255,255,255," + (night ? 0.14 : 0.3) + ")"; ctx.fillRect(0, y0, W, 2);
    // lane marks move at exactly the speed the planted foot moves, so the feet grip the road
    const D = RUN ? PTM_gait(W, H, dur).D : W * 7.2, K = Math.max(2, Math.round(D / (W * 0.24))), sp = D / K;
    tile(D, p * D, o => { for (let i = 0; i < K; i++) ctx.fillRect(o + i * sp, y0 + (H - y0) * 0.45, sp * 0.42, 4); });
  },
  character(ctx, p, W, H, S, cam, Lt, t, dur) {
    const q = pose(t, W, H, dur), U = q.U, st = S || DATA.init;
    const hi = Lt.color, body = STYLE === "pixel" ? PAL.accent2 : PAL.accent2, pants = mix("#22305a", "#0a1024", 0.2), skin = "#f0c39b", scarf = PAL.accent;
    // long soft shadow, cast away from the light
    const sh = ctx.createRadialGradient(q.cx - Lt.dx * U * 0.3, q.ground + U * 0.02, 1, q.cx - Lt.dx * U * 0.3, q.ground + U * 0.02, U * 0.55);
    sh.addColorStop(0, Lt.shadow); sh.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save(); ctx.translate(0, q.ground); ctx.scale(1, 0.14); ctx.translate(0, -q.ground); ctx.fillStyle = sh; ctx.fillRect(q.cx - U, q.ground - U, U * 2, U * 2); ctx.restore();
    // Contact shadows: a small dark oval under each shoe that fades as the foot lifts. They are what tells the eye the foot is on the floor.
    const legsPre = [0, 1].map(i => PHYS.ik2(q.cx, q.hipY, q.f[i].x, q.f[i].y, q.l1, q.l2, -1));
    for (let i = 0; i < 2; i++) {
      const lift = clamp((q.groundAnkle - q.f[i].y) / (U * 0.2), 0, 1);
      ctx.globalAlpha = (1 - lift) * 0.9; ctx.fillStyle = Lt.shadow; ctx.beginPath(); ctx.ellipse(legsPre[i].ex + U * 0.035, q.ground + U * 0.008, U * (0.1 - 0.04 * lift), U * 0.02, 0, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Dust kicked up at every footfall. Each puff is born where the foot landed and is carried back by the road, so it is a pure function of time.
    const G = PTM_gait(W, H, dur), omega = (TAU * G.cycles) / dur, dustCol = CFG.sky === "day" ? "214,200,170" : "150,165,200";
    for (let i = 0; i < 2; i++) {
      const m = ((((t * omega) + i * Math.PI) % TAU) + TAU) % TAU, age = m / omega, k = age / 0.55;      // m = 0 is the instant the foot lands
      if (k >= 1) continue;
      for (let j = 0; j < 5; j++) {
        const r0 = hash(j * 3.7 + i * 11.3), px = q.cx + q.stride - G.roadSpeed * age - (r0 * 0.5 + j * 0.12) * U * 0.1, rise = U * (0.01 + 0.07 * k) * (0.5 + hash(j + 4.1)), rad = U * (0.014 + 0.04 * k) * (0.7 + r0 * 0.6);
        ctx.fillStyle = "rgba(" + dustCol + "," + (0.42 * (1 - k) * (1 - k)) + ")"; ctx.beginPath(); ctx.arc(px, q.ground - rise, rad, 0, TAU); ctx.fill();
      }
    }
    // back arm and back leg first
    const legs = legsPre, arms = [0, 1].map(i => PHYS.ik2(q.sx, q.sy, q.hand[i].x, q.hand[i].y, U * 0.19, U * 0.19, -1));
    const leg = i => {
      limb(ctx, [[q.cx, q.hipY], [legs[i].x, legs[i].y], [legs[i].ex, legs[i].ey]], U * 0.085, pants, hi, Lt);
      // The shoe is drawn in a frame whose origin is the ankle. Its flat sole is at y = +sole, so with the ankle at
      // groundAnkle the sole rests on the ground line. While the foot swings, the toe tips up a little.
      const f = q.f[i], a = q.sole;
      ctx.save(); ctx.translate(legs[i].ex, legs[i].ey); ctx.rotate(f.ang);
      ctx.fillStyle = "#1b1d24"; ctx.beginPath();
      ctx.moveTo(-U * 0.065, -U * 0.03); ctx.lineTo(U * 0.035, -U * 0.034); ctx.quadraticCurveTo(U * 0.115, -U * 0.02, U * 0.135, a - U * 0.014);
      ctx.lineTo(U * 0.135, a); ctx.lineTo(-U * 0.07, a); ctx.lineTo(-U * 0.07, -U * 0.005); ctx.closePath(); ctx.fill(); ink(ctx, 2);
      ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(-U * 0.07, a - U * 0.012, U * 0.205, U * 0.012);   // pale sole edge, so the contact line reads
      ctx.restore();
    };
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
  pines(ctx, p, W, H, S, cam, Lt, t, dur) {
    const night = CFG.sky !== "day", snowy = has("snow"), P = DATA.P;
    const g = ctx.createLinearGradient(0, H * 0.78, 0, H); g.addColorStop(0, snowy ? (night ? "#8da0b8" : "#eef4fb") : (night ? "#0c1d1c" : "#3c6d44")); g.addColorStop(1, snowy ? (night ? "#3a4860" : "#b9c8da") : (night ? "#050d12" : "#1e4029"));
    DATA.pines.forEach((layer, li) => {
      const depth = [0.35, 0.65, 1][li], sc = scroll([0.66, 0.8, 0.95][li], P, W, H, dur, p), base = H * (0.8 + li * 0.045), col = mix(night ? "#10302f" : "#4a8a5c", night ? "#04121a" : "#1d4a33", li / 2);
      tile(sc.P, sc.off - cam.x * W * depth * 0.5, oo => {
        ctx.save(); ctx.translate(oo, 0); ctx.scale(sc.s, 1); const o = 0;
        for (const t of layer) {
          const h = t.h, w = h * 0.4, sway = Math.sin(p * TAU * 2 + t.ph) * 0.028 * (1 + li * 0.5);
          ctx.save(); ctx.translate(o + t.x, base); ctx.rotate(sway);
          ctx.fillStyle = "#3a2a1c"; ctx.fillRect(-w * 0.05, -h * 0.16, w * 0.1, h * 0.16);
          for (let k = 0; k < 4; k++) {
            const y0 = -h * (0.12 + k * 0.24), tw = w * (1 - k * 0.2);
            ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-tw / 2, y0); ctx.lineTo(0, y0 - h * 0.4); ctx.lineTo(tw / 2, y0); ctx.closePath(); ctx.fill();
            if (INKED) { ctx.lineWidth = 2; ctx.strokeStyle = PAL.ink; ctx.stroke(); }
            if (snowy) { ctx.fillStyle = "rgba(240,247,255,0.92)"; ctx.beginPath(); ctx.moveTo(-tw * 0.22, y0 - h * 0.26); ctx.lineTo(0, y0 - h * 0.4); ctx.lineTo(tw * 0.22, y0 - h * 0.26); ctx.quadraticCurveTo(0, y0 - h * 0.2, -tw * 0.22, y0 - h * 0.26); ctx.fill(); }
            else if (Lt.dx !== 0) { ctx.fillStyle = "rgba(255,240,200,0.1)"; ctx.beginPath(); ctx.moveTo(0, y0 - h * 0.4); ctx.lineTo(Lt.dx > 0 ? tw / 2 : -tw / 2, y0); ctx.lineTo(0, y0); ctx.closePath(); ctx.fill(); }
          }
          ctx.restore();
        }
        ctx.restore();
      });
      const mist = ctx.createLinearGradient(0, base - H * 0.18, 0, base); mist.addColorStop(0, "rgba(200,215,235,0)"); mist.addColorStop(1, "rgba(" + (night ? "110,140,180" : "235,245,255") + "," + (0.2 - li * 0.05) + ")");
      ctx.fillStyle = mist; ctx.fillRect(0, base - H * 0.18, W, H * 0.18);
    });
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.86, W, H * 0.14);
  },
  castle(ctx, p, W, H, S, cam, Lt) {
    const G = castleGeom(W, H), U = G.U, night = CFG.sky !== "day", stone = night ? "#4a5068" : "#9aa0b4", dark = night ? "#2a2f44" : "#6f768c", roof = PAL.accent2;
    const hill = ctx.createLinearGradient(0, G.base - U * 0.1, 0, H); hill.addColorStop(0, night ? "#1c2b2a" : "#5f9c5a"); hill.addColorStop(1, night ? "#0a1414" : "#2d5a33");
    ctx.fillStyle = hill; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, G.base + U * 0.22); ctx.quadraticCurveTo(G.cx, G.base - U * 0.16, W, G.base + U * 0.22); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    const wallTop = G.base - U * 0.34, wallL = G.cx - U * 0.3, wallW = U * 0.6;
    const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); if (INKED) { ctx.lineWidth = 2; ctx.strokeStyle = PAL.ink; ctx.strokeRect(x, y, w, h); } };
    rect(wallL, wallTop, wallW, U * 0.36, stone);
    for (let i = 0; i < 9; i++) rect(wallL + i * wallW / 9 + wallW / 60, wallTop - U * 0.035, wallW / 13, U * 0.04, stone);
    ctx.fillStyle = "rgba(0,0,0,0.18)"; for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) ctx.fillRect(wallL + c * wallW / 10 + (r % 2) * wallW / 20, wallTop + U * 0.04 + r * U * 0.08, wallW / 12, 1.5);
    G.towers.forEach((t, i) => {
      const x = t.cx - t.w / 2, top = G.base - t.h;
      rect(x, top, t.w, t.h + U * 0.05, i === 2 ? dark : stone);
      ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(x + (Lt.dx > 0 ? t.w * 0.65 : 0), top, t.w * 0.35, t.h + U * 0.05);
      ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(x - t.w * 0.14, top); ctx.lineTo(t.cx, top - t.w * 1.4); ctx.lineTo(x + t.w * 1.14, top); ctx.closePath(); ctx.fill(); if (INKED) { ctx.lineWidth = 2; ctx.strokeStyle = PAL.ink; ctx.stroke(); }
      ctx.fillStyle = "#3a2e22"; ctx.fillRect(t.cx - 1.2, top - t.w * 1.4 - U * 0.15, 2.4, U * 0.15);
      for (let k = 0; k < (i === 2 ? 3 : 2); k++) { const lit = night || CFG.sky === "sunset"; ctx.fillStyle = lit ? "rgba(255," + (190 + k * 20) + ",100," + (0.6 + 0.3 * Math.sin(p * TAU * 3 + i + k * 2)) + ")" : "#2b3246"; ctx.beginPath(); ctx.ellipse(t.cx, top + U * 0.1 + k * U * 0.16, t.w * 0.14, t.w * 0.26, 0, 0, TAU); ctx.fill(); }
    });
    ctx.fillStyle = "#1a1410"; ctx.beginPath(); ctx.moveTo(G.cx - U * 0.06, G.base + U * 0.02); ctx.lineTo(G.cx - U * 0.06, G.base - U * 0.1); ctx.arc(G.cx, G.base - U * 0.1, U * 0.06, Math.PI, 0); ctx.lineTo(G.cx + U * 0.06, G.base + U * 0.02); ctx.fill();
    ctx.fillStyle = "rgba(255,170,70," + (0.35 + 0.15 * Math.sin(p * TAU * 6)) + ")"; ctx.fillRect(G.cx - U * 0.04, G.base - U * 0.1, U * 0.08, U * 0.11);
    // flags: cloth physics
    if (S && S.flags) S.flags.forEach((f, i) => {
      const fh = U * 0.075, cols = [PAL.accent, PAL.accent2, PAL.accent];
      ctx.fillStyle = cols[i]; ctx.beginPath();
      f.forEach((q, j) => { const w = fh * (1 - (j / f.length) * 0.55) / 2; j ? ctx.lineTo(q.x, q.y - w) : ctx.moveTo(q.x, q.y - w); });
      for (let j = f.length - 1; j >= 0; j--) { const q = f[j], w = fh * (1 - (j / f.length) * 0.55) / 2; ctx.lineTo(q.x, q.y + w); }
      ctx.closePath(); ctx.fill(); if (INKED) { ctx.lineWidth = 2; ctx.strokeStyle = PAL.ink; ctx.stroke(); }
      ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 1.5; ctx.beginPath(); f.forEach((q, j) => (j ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
    });
  },
  dragon(ctx, p, W, H, S, cam, Lt, t, dur) {
    const q = dragonPose(t, W, H, dur), U = q.U, A = dragonAnchors(q), scale = "#2f7a4f", belly = "#d8c27a", dark = "#1a4a33", wingC = mix(PAL.accent2, "#000000", 0.25);
    // fire breath: particles are born at the mouth, so each one's path is a pure function of time
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 90; i++) {
      const age = ((t * 2.4 + hash(i) * 1.0) % 1) * 0.95, tb = t - age, pb = tb / dur;
      if (!breathing(pb)) continue;
      const qb = dragonPose(tb, W, H, dur), ab = dragonAnchors(qb), sp = U * (1.8 + hash(i + 7) * 1.2), k = age / 0.95;
      const fx = ab.hx + U * 0.12 + sp * age * 0.75, fy = ab.hy + U * 0.1 + (hash(i + 3) - 0.5) * U * 0.35 * k + k * k * U * 0.35, r = U * (0.07 + k * 0.26);
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r); g.addColorStop(0, "rgba(255," + Math.round(245 - k * 110) + "," + Math.round(170 - k * 140) + "," + (0.85 * (1 - k * 0.9)) + ")"); g.addColorStop(1, "rgba(255,80,20,0)");
      ctx.fillStyle = g; ctx.fillRect(fx - r, fy - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.bank);
    // tail from the physics chain (drawn in world space)
    ctx.restore();
    const tail = S.tail; ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let i = tail.length - 1; i >= 1; i--) { const a = tail[i - 1], b = tail[i], w = U * (0.13 - 0.1 * (i / tail.length)); ctx.strokeStyle = i % 2 ? scale : dark; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      if (i % 2 === 0) { ctx.fillStyle = PAL.accent2; ctx.beginPath(); ctx.moveTo(b.x - w * 0.3, b.y - w * 0.4); ctx.lineTo(b.x + w * 0.1, b.y - w * 1.3); ctx.lineTo(b.x + w * 0.5, b.y - w * 0.4); ctx.closePath(); ctx.fill(); } }
    ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.bank);
    const wing = (dx, dy, bright) => {      // a wing is a shoulder, a tip that flaps, finger bones and a membrane
      const ang = -1.2 - q.flap * 0.9, sx = dx, sy = dy, tx = sx + Math.cos(ang) * U * 0.88, ty = sy + Math.sin(ang) * U * 0.88;
      const mid = [0.35, 0.7].map(f => ({ x: sx + (tx - sx) * f - U * 0.18 * (1 - f) + Math.cos(ang + 1.5) * U * 0.18 * f, y: sy + (ty - sy) * f + Math.sin(ang + 1.5) * U * 0.22 * f }));
      ctx.fillStyle = bright ? wingC : mix(PAL.accent2, "#000000", 0.5); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.quadraticCurveTo(mid[1].x, mid[1].y + U * 0.12, mid[1].x - U * 0.05, mid[1].y + U * 0.3); ctx.quadraticCurveTo(mid[0].x, mid[0].y + U * 0.3, sx - U * 0.25, sy + U * 0.22); ctx.closePath(); ctx.fill(); if (INKED) { ctx.lineWidth = 2.5; ctx.strokeStyle = PAL.ink; ctx.stroke(); }
      ctx.strokeStyle = dark; ctx.lineWidth = U * 0.03; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.moveTo(sx, sy); ctx.lineTo(mid[0].x, mid[0].y + U * 0.28); ctx.moveTo(sx, sy); ctx.lineTo(mid[1].x, mid[1].y + U * 0.26); ctx.stroke();
    };
    wing(-U * 0.12, -U * 0.16, false);
    const bg = ctx.createLinearGradient(0, -U * 0.3, 0, U * 0.3); bg.addColorStop(0, scale); bg.addColorStop(0.65, dark); bg.addColorStop(1, belly);
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, 0, U * 0.6, U * 0.24, 0, 0, TAU); ctx.fill(); ink(ctx, 3);
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1.5; for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.arc(i * U * 0.11, -U * 0.04, U * 0.07, Math.PI, 0); ctx.stroke(); }
    ctx.strokeStyle = scale; ctx.lineWidth = U * 0.15; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(U * 0.42, -U * 0.04); ctx.quadraticCurveTo(U * 0.74, -U * 0.04, U * 0.82, -U * 0.22 - q.flap * U * 0.02); ctx.stroke();
    const hx = U * 0.88, hy = -U * 0.26 - q.flap * U * 0.02, open = breathing(q.p) ? 0.3 : 0.06;
    ctx.fillStyle = scale; ctx.beginPath(); ctx.moveTo(hx - U * 0.1, hy - U * 0.08); ctx.lineTo(hx + U * 0.26, hy - U * 0.03 - open * U * 0.1); ctx.lineTo(hx + U * 0.27, hy + U * 0.0); ctx.lineTo(hx - U * 0.06, hy + U * 0.1); ctx.closePath(); ctx.fill(); ink(ctx, 2.5);
    ctx.fillStyle = "#7a1d12"; ctx.beginPath(); ctx.moveTo(hx + U * 0.02, hy + U * 0.03); ctx.lineTo(hx + U * 0.25, hy + U * 0.02); ctx.lineTo(hx + U * 0.22, hy + U * 0.03 + open * U * 0.3); ctx.lineTo(hx - U * 0.02, hy + U * 0.1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PAL.accent2; ctx.beginPath(); ctx.moveTo(hx - U * 0.06, hy - U * 0.08); ctx.lineTo(hx - U * 0.22, hy - U * 0.2); ctx.lineTo(hx - U * 0.02, hy - U * 0.05); ctx.fill();
    ctx.fillStyle = "#ffe066"; ctx.beginPath(); ctx.arc(hx + U * 0.05, hy - U * 0.03, U * 0.03, 0, TAU); ctx.fill(); ctx.fillStyle = "#111"; ctx.fillRect(hx + U * 0.05, hy - U * 0.055, U * 0.012, U * 0.05);
    wing(-U * 0.02, -U * 0.2, true);
    ctx.restore();
  },
  ufo(ctx, p, W, H, S, cam, Lt) {
    const a = p * TAU, U = Math.min(W, H) * 0.2, x = W * (0.5 + 0.14 * Math.sin(a)) + cam.x * W * 0.3, y = H * (0.3 + 0.03 * Math.sin(a * 2)), tilt = Math.cos(a) * 0.09, gy = H * 0.86, top = y + U * 0.12;
    ctx.globalCompositeOperation = "lighter";
    const bw = h => U * (0.22 + 0.5 * ((h - top) / (gy - top))), beam = ctx.createLinearGradient(0, top, 0, gy);
    beam.addColorStop(0, "rgba(170,255,210," + (0.4 + 0.1 * Math.sin(a * 8)) + ")"); beam.addColorStop(1, "rgba(120,220,255,0.1)");
    ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(x - bw(top), top); ctx.lineTo(x + bw(top), top); ctx.lineTo(x + bw(gy), gy); ctx.lineTo(x - bw(gy), gy); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 44; i++) { const k = wrap(hash(i) + p * 3), h = gy - k * (gy - top), w = bw(h) * 0.85; ctx.fillStyle = "rgba(220,255,240," + Math.sin(k * Math.PI) * 0.8 + ")"; ctx.beginPath(); ctx.arc(x + (hash(i + 5) - 0.5) * 2 * w + Math.sin(k * 14 + i) * 6, h, 1.4 + hash(i + 9) * 2, 0, TAU); ctx.fill(); }
    const gg = ctx.createRadialGradient(x, gy, 2, x, gy, U * 0.9); gg.addColorStop(0, "rgba(160,255,210,0.45)"); gg.addColorStop(1, "rgba(160,255,210,0)"); ctx.save(); ctx.translate(0, gy); ctx.scale(1, 0.22); ctx.translate(0, -gy); ctx.fillStyle = gg; ctx.fillRect(x - U, gy - U, U * 2, U * 2); ctx.restore();
    ctx.globalCompositeOperation = "source-over";
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
    const hull = ctx.createLinearGradient(0, -U * 0.14, 0, U * 0.16); hull.addColorStop(0, "#e5ebf5"); hull.addColorStop(0.5, "#8b97ad"); hull.addColorStop(1, "#3a4358");
    ctx.fillStyle = hull; ctx.beginPath(); ctx.ellipse(0, 0, U * 0.52, U * 0.14, 0, 0, TAU); ctx.fill(); ink(ctx, 2.5);
    const dome = ctx.createRadialGradient(-U * 0.06, -U * 0.22, 2, 0, -U * 0.14, U * 0.22); dome.addColorStop(0, "rgba(220,255,255,0.95)"); dome.addColorStop(1, "rgba(90,200,220,0.55)");
    ctx.fillStyle = dome; ctx.beginPath(); ctx.ellipse(0, -U * 0.08, U * 0.22, U * 0.17, 0, Math.PI, 0); ctx.fill(); ink(ctx, 2);
    for (let i = 0; i < 9; i++) { const th = (i / 8 - 0.5) * 2.4, lx = Math.sin(th) * U * 0.42, ly = Math.cos(th) * U * 0.05 + U * 0.02, on = Math.max(0, Math.sin(a * 6 - i * 0.8)); ctx.fillStyle = "rgba(255," + Math.round(200 + 55 * on) + "," + Math.round(80 + 120 * on) + "," + (0.5 + 0.5 * on) + ")"; ctx.beginPath(); ctx.arc(lx, ly, U * 0.022, 0, TAU); ctx.fill(); }
    ctx.restore();
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
const ORDER = ["sky", "stars", "sun", "moon", "neongrid", "clouds", "mountains", "pines", "castle", "city", "sea", "boat", "planets", "abstract", "rocket", "fish", "bubbles", "ground", "car", "fire", "balls", "birds", "dragon", "ufo", "character", "leaves", "snow", "rain", "lightning", "confetti", "hearts", "motes", "text"];
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
  const mkTrees = (n, hmin, hmax, off) => Array.from({ length: n }, (_, i) => ({ x: ((i + hash(i * 2.3 + off) * 0.8) / n) * P, h: H * (hmin + hash(i * 4.1 + off) * (hmax - hmin)), ph: hash(i + off) * TAU }));
  DATA.pines = [mkTrees(14, 0.16, 0.26, 2), mkTrees(11, 0.2, 0.32, 6), mkTrees(8, 0.26, 0.42, 11)];
  const st = {};
  if (has("character")) { const q = pose(0, W, H, 6); st.scarf = PHYS.makeChain(16, q.nx, q.ny, q.U * 0.085); st.hair = PHYS.makeChain(5, q.bx, q.by, q.U * 0.05); }
  if (has("dragon")) { const q = dragonPose(0, W, H, 6), an = dragonAnchors(q); st.tail = PHYS.makeChain(15, an.rx, an.ry, q.U * 0.1); }
  if (has("castle")) { const g = castleGeom(W, H); st.flags = g.poles.map(pl => PHYS.makeChain(7, pl.x, pl.y, g.U * 0.05)); }
  DATA.init = st;
  return st;
}
function draw(ctx, t, info) {
  const { W, H, duration, state } = info, Lt = info.light, cam = info.camera; VW = W;
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
