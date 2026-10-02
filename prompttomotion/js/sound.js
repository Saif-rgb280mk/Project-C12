/*
 * PromptToMotion sound design.
 *
 * A procedural soundscape built with the Web Audio API: no audio files, everything is synthesised.
 * Each animation carries a set of tags (rain, sea, fire, city, dragon, ...), either from the mock generator's analysis
 * of the prompt or from the "sound" list Claude returns. The tags become:
 *   - continuous beds   (rain hiss, ocean swell, wind, engine drones, a musical pad chosen from the sky's mood)
 *   - random events     (crickets, birds, bubbles, fire crackle, chimes, a synth arpeggio)
 *   - synced events     (footsteps on every foot-plant, thunder after each lightning flash, wing whooshes,
 *                        firework bursts), triggered from the player's clock so they line up with the picture
 * Sound is for the preview only. Downloads are silent. It starts only from a click (browser rule), and is off by default.
 */
(() => {
  "use strict";
  const AC = window.AudioContext || window.webkitAudioContext;
  const S = { W: 960, H: 540, ctx: null, master: null, bus: null, analyser: null, white: null, brown: null, nodes: [], timers: [], enabled: false, playing: false, take: null, dur: 6, tags: new Set(), sky: "day", prevT: 0, idx: {} };
  const KNOWN = ["rain", "wind", "sea", "fire", "city", "lightning", "rocket", "car", "ufo", "dragon", "character", "pines", "birds", "bubbles", "confetti", "hearts", "neongrid", "planets", "snow", "fireworks", "warp", "stars", "boat", "fish", "castle"];
  const rnd = (a, b) => a + Math.random() * (b - a);

  function ensure() {
    if (S.ctx) return S.ctx;
    S.ctx = new AC();
    S.master = S.ctx.createGain(); S.master.gain.value = 0;
    const comp = S.ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 6; comp.attack.value = 0.01; comp.release.value = 0.25;
    S.analyser = S.ctx.createAnalyser(); S.analyser.fftSize = 1024;
    S.master.connect(comp); comp.connect(S.analyser); S.analyser.connect(S.ctx.destination);
    const n = S.ctx.sampleRate * 3, w = S.ctx.createBuffer(1, n, S.ctx.sampleRate), b = S.ctx.createBuffer(1, n, S.ctx.sampleRate), wd = w.getChannelData(0), bd = b.getChannelData(0);
    let last = 0; for (let i = 0; i < n; i++) { const r = Math.random() * 2 - 1; wd[i] = r; last = (last + 0.02 * r) / 1.02; bd[i] = last * 3.5; }
    S.white = w; S.brown = b;
    return S.ctx;
  }

  // ---------- small building blocks ----------
  const keep = n => { S.nodes.push(n); return n; };
  const gain = v => { const g = S.ctx.createGain(); g.gain.value = v; return g; };
  const filt = (type, f, q) => { const b = S.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; return b; };
  const osc = (type, f) => { const o = S.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(); return keep(o); };
  const noise = buf => { const s = S.ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = Math.random(); s.start(); return keep(s); };
  const lfo = (rate, depth, param) => { const o = osc("sine", rate), g = gain(depth); o.connect(g); g.connect(param); };
  const chain = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; };
  const later = (fn, ms) => { const id = setTimeout(fn, ms); S.timers.push(id); return id; };
  function every(min, max, fn) { const go = () => { fn(); later(go, rnd(min, max)); }; later(go, rnd(min, max)); }
  function envTone(type, f0, f1, dur, vol, dest, filterHz) {
    const t = S.ctx.currentTime, o = S.ctx.createOscillator(), g = S.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let n = o; if (filterHz) { const f = filt("lowpass", filterHz); o.connect(f); n = f; } n.connect(g); g.connect(dest || S.bus); o.start(t); o.stop(t + dur + 0.05);
  }
  function burst(buf, dur, vol, filterType, hz, q, dest) {
    const t = S.ctx.currentTime, s = S.ctx.createBufferSource(), g = S.ctx.createGain(), f = filt(filterType, hz, q); s.buffer = buf; s.loop = true; s.loopStart = Math.random();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || S.bus); s.start(t); s.stop(t + dur + 0.05);
  }

  // ---------- one-shot sounds ----------
  const thud = () => { burst(S.brown, 0.13, 0.5, "lowpass", 220, 1); envTone("sine", 95, 48, 0.14, 0.45); };
  const thunder = () => { burst(S.brown, 2.4, 0.9, "lowpass", 170, 1); later(() => burst(S.white, 0.5, 0.25, "lowpass", 900, 0.7), 40); };
  const whoosh = () => { const t = S.ctx.currentTime, s = S.ctx.createBufferSource(), f = filt("bandpass", 300, 1.1), g = S.ctx.createGain(); s.buffer = S.white; s.loop = true; f.frequency.setValueAtTime(260, t); f.frequency.exponentialRampToValueAtTime(950, t + 0.2); f.frequency.exponentialRampToValueAtTime(260, t + 0.5);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.18); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55); s.connect(f); f.connect(g); g.connect(S.bus); s.start(t); s.stop(t + 0.6); };
  const firework = () => { burst(S.brown, 0.5, 0.9, "lowpass", 260, 1); for (let i = 0; i < 6; i++) later(() => burst(S.white, 0.05, 0.22, "highpass", 3000, 1), 60 + i * rnd(30, 90)); };
  const chirp = () => { const f = rnd(2200, 4200); envTone("sine", f, f * rnd(1.15, 1.5), rnd(0.07, 0.14), 0.05, S.bus); if (Math.random() < 0.6) later(() => envTone("sine", f * 1.2, f * 1.6, 0.09, 0.04), 130); };
  const blip = () => { const f = rnd(420, 900); envTone("sine", f, f * 1.8, 0.09, 0.07); };
  const crackle = () => burst(S.white, rnd(0.012, 0.04), rnd(0.12, 0.4), "highpass", rnd(1500, 4500), 1);
  const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
  const chime = () => { const f = PENTA[(Math.random() * PENTA.length) | 0]; envTone("sine", f, 0, 1.3, 0.06); envTone("sine", f * 2, 0, 0.8, 0.02); };
  const ARP = [110, 130.81, 164.81, 220, 164.81, 130.81, 146.83, 174.61];
  let arpI = 0;
  const arp = () => { const f = ARP[arpI++ % ARP.length]; envTone("sawtooth", f * 2, 0, 0.22, 0.05, S.bus, 1500); if (arpI % 4 === 1) envTone("sawtooth", f, 0, 0.5, 0.06, S.bus, 400); };

  // ---------- beds and music ----------
  const PADS = { day: [261.63, 329.63, 392, 493.88, 587.33], sunset: [174.61, 220, 261.63, 329.63, 392], night: [110, 130.81, 164.81, 196, 246.94], space: [55, 82.41, 110, 164.81, 246.94], underwater: [98, 146.83, 196, 246.94, 293.66] };
  function pad(sky, vol) {
    const notes = PADS[sky] || PADS.day, lp = filt("lowpass", sky === "space" ? 700 : 1100, 0.4), out = gain(vol); lp.connect(out); out.connect(S.bus);
    notes.forEach((f, i) => { for (const d of [-4, 5]) { const o = osc(i % 2 ? "triangle" : "sine", f); o.detune.value = d; const g = gain(0.0001); o.connect(g); g.connect(lp); lfo(rnd(0.05, 0.12), 0.05, g.gain); g.gain.value = 0.06; } });
    lfo(0.04, 300, lp.frequency);
  }
  const bed = {
    rain() { chain(noise(S.white), filt("highpass", 900), filt("bandpass", 5200, 0.4), gain(0.2), S.bus); },
    wind() { const lp = filt("lowpass", 520, 0.8); chain(noise(S.brown), lp, gain(0.3), S.bus); lfo(0.13, 260, lp.frequency); },
    sea() { const g = gain(0.14); chain(noise(S.brown), filt("lowpass", 440), g, S.bus); lfo(0.11, 0.09, g.gain); },
    fire() { chain(noise(S.brown), filt("lowpass", 700), gain(0.1), S.bus); every(0.05, 0.25, crackle); },
    city() { const lp = filt("lowpass", 230); lp.connect(S.bus); const g = gain(0.06); g.connect(lp); for (const f of [55, 55.4, 82.5]) { const o = osc("sawtooth", f); o.connect(g); } chain(noise(S.brown), filt("lowpass", 300), gain(0.05), S.bus); },
    lightning() { chain(noise(S.brown), filt("lowpass", 120), gain(0.1), S.bus); },
    rocket() { chain(noise(S.white), filt("lowpass", 420), gain(0.22), S.bus); chain(noise(S.brown), filt("lowpass", 160), gain(0.3), S.bus); },
    car() { const lp = filt("lowpass", 260), g = gain(0.09); lp.connect(S.bus); g.connect(lp); const o = osc("sawtooth", 48); o.connect(g); lfo(3.5, 4, o.frequency); chain(noise(S.white), filt("bandpass", 800, 0.6), gain(0.03), S.bus); },
    ufo() { const g = gain(0.08), lp = filt("lowpass", 1400); g.connect(lp); lp.connect(S.bus); const a = osc("sine", 220), b = osc("sine", 330.6); a.connect(g); b.connect(g); lfo(6, 34, a.frequency); lfo(0.4, 60, b.frequency); },
    dragon() { chain(noise(S.brown), filt("lowpass", 190), gain(0.22), S.bus); const lp = filt("lowpass", 420); chain(noise(S.brown), lp, gain(0.12), S.bus); lfo(0.09, 180, lp.frequency); },
    pines() { const lp = filt("lowpass", 700); chain(noise(S.brown), lp, gain(0.1), S.bus); lfo(0.17, 220, lp.frequency); },
    snow() { const lp = filt("lowpass", 480); chain(noise(S.brown), lp, gain(0.1), S.bus); lfo(0.1, 200, lp.frequency); },
    warp() { chain(noise(S.white), filt("lowpass", 300), gain(0.14), S.bus); const o = osc("sawtooth", 62), g = gain(0.06); o.connect(filt("lowpass", 240)).connect(g); g.connect(S.bus); },
    birds() { every(0.6, 2.4, chirp); },
    bubbles() { every(0.15, 0.7, blip); },
    confetti() { every(0.1, 0.4, chime); },
    hearts() { every(0.3, 0.9, chime); },
    neongrid() { later(function loop() { arp(); later(loop, 240); }, 100); },
    planets() { pad("space", 0.05); }
  };

  function tagsFor(take) {
    let layers = [], sky = "day";
    const prompt = String(take.prompt || "").replace(/ → /g, ". ");
    const a = window.PTM_analyze ? window.PTM_analyze(prompt) : { layers: [], sky: "day" };
    if (take.sound && Array.isArray(take.sound.layers)) { layers = take.sound.layers.filter(t => KNOWN.includes(t)); sky = take.sound.sky || a.sky; }
    else { layers = a.layers; sky = a.sky; }
    const set = new Set(layers);
    if (/fireworks/.test(take.id || "")) set.add("fireworks");
    if (/solar/.test(take.id || "")) { set.add("planets"); sky = "space"; }
    if (/warp/.test(take.id || "")) { set.add("warp"); sky = "space"; }
    if (!set.has("rain") && !set.has("city") && (sky === "night" || set.has("stars")) && !set.has("ufo") && !set.has("rocket") && sky !== "space") set.add("crickets");
    return { set, sky: ["day", "sunset", "night", "space", "underwater"].includes(sky) ? sky : "day" };
  }

  function teardown() {
    S.timers.forEach(clearTimeout); S.timers = [];
    for (const n of S.nodes) { try { n.stop && n.stop(); } catch (_) {} try { n.disconnect(); } catch (_) {} }
    S.nodes = [];
    if (S.bus) { const old = S.bus, t = S.ctx.currentTime; old.gain.cancelScheduledValues(t); old.gain.setTargetAtTime(0, t, 0.05); setTimeout(() => { try { old.disconnect(); } catch (_) {} }, 400); }
    S.bus = null;
  }
  function build() {
    if (!S.ctx || !S.take) return;
    teardown();
    S.bus = S.ctx.createGain(); S.bus.gain.value = 0; S.bus.connect(S.master); S.bus.gain.setTargetAtTime(1, S.ctx.currentTime, 0.25);
    const { set, sky } = tagsFor(S.take); S.tags = set; S.sky = sky; arpI = 0;
    pad(sky, set.has("neongrid") ? 0.06 : 0.12);
    for (const t of set) if (bed[t]) bed[t]();
    if (set.has("crickets")) { const g = gain(0.012), o = osc("sine", 4400); o.connect(g); g.connect(S.bus); lfo(24, 0.012, g.gain); lfo(0.3, 0.008, g.gain); }
    if (set.has("sea") || set.has("boat")) if (!set.has("sea")) bed.sea();
    S.idx = {}; S.prevT = 0;
  }
  function applyPlaying() { if (!S.ctx || !S.master) return; const t = S.ctx.currentTime; S.master.gain.cancelScheduledValues(t); S.master.gain.setTargetAtTime(S.enabled && S.playing ? 0.85 : 0, t, S.playing ? 0.12 : 0.08); }

  // synced events: fire when the clock crosses a moment, but not when the viewer scrubs across it
  function crossed(key, prev, t, at) { return prev < at && t >= at && t - prev < 0.35; }
  function onTime(m) {
    const was = S.playing; S.playing = !!m.playing; S.dur = m.duration;
    if (was !== S.playing) applyPlaying();
    if (!S.enabled || !S.bus || !S.playing) { S.prevT = m.t; return; }
    const t = m.t, prev = S.prevT, dur = m.duration; S.prevT = t;
    if (t < prev - 0.35) return;      // looped or scrubbed back
    if (S.tags.has("character")) { const cycles = window.PTM_gait ? PTM_gait(S.W, S.H, dur).cycles : Math.max(2, Math.round(dur * 1.4)), interval = dur / (2 * cycles), i = Math.floor(t / interval), p = Math.floor(prev / interval); if (i !== p && i - p < 3) thud(); }   // one thud per foot landing, in step with the picture
    if (S.tags.has("dragon")) { const interval = dur / Math.max(3, Math.round(dur * 1.6)), i = Math.floor(t / interval), p = Math.floor(prev / interval); if (i !== p && i - p < 3) whoosh(); }
    if (S.tags.has("lightning")) for (const at of [0.28, 0.71]) if (crossed("l" + at, prev, t, at * dur + 0.2)) thunder();
    if (S.tags.has("fireworks")) { const i = Math.floor((t - 0.85) / 0.45), p = Math.floor((prev - 0.85) / 0.45); if (t > 0.85 && i !== p && i - p < 3) firework(); }
  }

  window.PTM_SND = {
    supported: !!AC,
    get enabled() { return S.enabled; },
    async toggle() {
      if (!AC) return false;
      S.enabled = !S.enabled;
      if (S.enabled) { ensure(); try { await S.ctx.resume(); } catch (_) {} build(); S.playing = true; applyPlaying(); }
      else { applyPlaying(); setTimeout(() => { if (!S.enabled) teardown(); }, 500); }
      return S.enabled;
    },
    setTake(take, params) { S.take = take; S.dur = params && params.duration || 6; const wh = params && window.PTM_ASPECTS && window.PTM_ASPECTS[params.aspect]; if (wh) { S.W = wh[0]; S.H = wh[1]; } if (S.enabled) build(); },
    onTime,
    tags: () => [...S.tags],
    level() { if (!S.analyser) return 0; const d = new Float32Array(S.analyser.fftSize); S.analyser.getFloatTimeDomainData(d); let e = 0; for (const v of d) e += v * v; return Math.sqrt(e / d.length); },
    state: () => (S.ctx ? S.ctx.state : "none"),
    KNOWN
  };
})();
