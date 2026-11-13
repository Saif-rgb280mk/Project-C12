// KINETIC XI 3D — simulation module (shared with the 2D prototype)
// audio.js : raw stadium acoustics synthesised live with the Web Audio API — a crowd bed
// that breathes with the danger of play (swells, roars, groans, rhythmic clapping), ball
// strikes whose weight follows the physics impulse, wet-pitch splashes, woodwork, net,
// referee whistle, and spoken commentary / PA announcements (Web Speech API).
// Separate busses mirror the settings: Stadium Crowd, Commentary, On-Pitch SFX, PA.
'use strict';
(function (K) {
  K.Audio = class {
    constructor() { this.ctx = null; this.excite = 0.2; this.targetExcite = 0.2; this.lastSpeech = 0; }

    start(settings) {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch (e) { this.ctx = null; return; }
      const c = this.ctx;
      this.master = c.createGain(); this.master.connect(c.destination);
      this.crowdBus = c.createGain(); this.crowdBus.connect(this.master);
      this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
      // Pink-ish noise buffer shared by every noise voice.
      const len = c.sampleRate * 3, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
      }
      this.noise = buf;
      // Crowd bed: two band-passed noise layers (voices + rumble) and a clap/chant layer.
      const mk = (freq, q, gain) => {
        const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
        const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
        const g = c.createGain(); g.gain.value = gain;
        src.connect(f); f.connect(g); g.connect(this.crowdBus); src.start();
        return { f, g };
      };
      this.voices = mk(900, 0.7, 0.5);
      this.rumble = mk(220, 0.9, 0.35);
      this.chant = mk(1400, 2.5, 0.0);
      this.apply(settings);
    }

    apply(s) {
      this.s = s;
      if (!this.ctx) return;
      const a = s.audio;
      this.master.gain.value = a.master / 100;
      this.crowdBus.gain.value = (a.crowd / 100) * 0.9;
      this.sfxBus.gain.value = a.sfx / 100;
    }

    /** Called every frame: excitement follows the ball's danger. */
    tick(dt, danger) {
      if (!this.ctx) return;
      this.targetExcite = 0.18 + 0.55 * danger;
      this.excite += (this.targetExcite - this.excite) * Math.min(1, dt * 1.5);
      const t = this.ctx.currentTime;
      this.voices.g.gain.setTargetAtTime(0.25 + 0.75 * this.excite, t, 0.2);
      this.voices.f.frequency.setTargetAtTime(700 + 900 * this.excite, t, 0.3);
      this.rumble.g.gain.setTargetAtTime(0.2 + 0.4 * this.excite, t, 0.3);
      const clap = (Math.sin(t * Math.PI * 4) > 0.6 ? 1 : 0) * (Math.sin(t * 0.21) > 0.3 ? 0.18 : 0);
      this.chant.g.gain.setTargetAtTime(clap * (1 - this.excite), t, 0.02);
    }

    roar(amount = 1) { this.excite = Math.min(1.6, this.excite + 0.9 * amount); }
    groan() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.voices.f.frequency.setTargetAtTime(380, t, 0.05);
      this.voices.f.frequency.setTargetAtTime(900, t + 0.7, 0.4);
      this.excite = Math.min(1.3, this.excite + 0.4);
    }

    burst(dur, freq, q, gain, type = 'bandpass', pan = 0, bus = this.sfxBus) {
      const c = this.ctx;
      const src = c.createBufferSource(); src.buffer = this.noise;
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain(); const t = c.currentTime;
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const p = c.createStereoPanner ? c.createStereoPanner() : null;
      src.connect(f); f.connect(g);
      if (p) { p.pan.value = K.clamp(pan, -1, 1); g.connect(p); p.connect(bus); } else g.connect(bus);
      src.start(t, Math.random() * 2); src.stop(t + dur + 0.05);
    }
    thump(freq0, freq1, dur, gain, pan = 0) {
      const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(freq0, t); o.frequency.exponentialRampToValueAtTime(freq1, t + dur);
      const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const p = c.createStereoPanner ? c.createStereoPanner() : null;
      o.connect(g);
      if (p) { p.pan.value = K.clamp(pan, -1, 1); g.connect(p); p.connect(this.sfxBus); } else g.connect(this.sfxBus);
      o.start(t); o.stop(t + dur + 0.05);
    }

    kick(speed, pan) {
      if (!this.ctx) return;
      const k = K.sat(speed / 30);
      this.thump(120 + 60 * k, 45, 0.09 + 0.08 * k, 0.25 + 0.6 * k, pan);
      this.burst(0.03, 2500, 0.8, 0.15 + 0.35 * k, 'highpass', pan);
    }
    touch(pan) { if (this.ctx) this.thump(160, 70, 0.05, 0.12, pan); }
    bounce(impact, wet, pan) {
      if (!this.ctx || impact < 1.2) return;
      const k = K.sat(impact / 12);
      if (wet > 0.6) this.burst(0.12, 600, 0.5, 0.15 + 0.3 * k, 'lowpass', pan);
      else this.thump(110, 50, 0.07, 0.1 + 0.3 * k, pan);
    }
    post(pan) { if (!this.ctx) return; this.thump(520, 480, 0.6, 0.5, pan); this.thump(1210, 1180, 0.4, 0.2, pan); }
    net() { if (this.ctx) this.burst(0.5, 1500, 0.7, 0.35, 'bandpass'); }
    whistle(n = 1, long = false) {
      if (!this.ctx) return;
      const c = this.ctx;
      for (let i = 0; i < n; i++) {
        const t = c.currentTime + i * 0.45, dur = long ? 0.9 : 0.32;
        for (const fr of [2200, 2330]) {
          const o = c.createOscillator(); o.frequency.value = fr;
          const lfo = c.createOscillator(); lfo.frequency.value = 28;
          const lg = c.createGain(); lg.gain.value = 40; lfo.connect(lg); lg.connect(o.frequency);
          const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12, t + 0.02);
          g.gain.setValueAtTime(0.12, t + dur - 0.05); g.gain.linearRampToValueAtTime(0.0001, t + dur);
          o.connect(g); g.connect(this.sfxBus); o.start(t); lfo.start(t); o.stop(t + dur); lfo.stop(t + dur);
        }
      }
    }
    chime() {
      if (!this.ctx) return;
      const c = this.ctx, t = c.currentTime, vol = (this.s.audio.pa / 100) * 0.25;
      [[784, 0], [659, 0.35]].forEach(([f, dt]) => {
        const o = c.createOscillator(); o.frequency.value = f;
        const g = c.createGain(); g.gain.setValueAtTime(vol, t + dt); g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.9);
        o.connect(g); g.connect(this.master); o.start(t + dt); o.stop(t + dt + 1);
      });
    }
    say(text, kind = 'commentary') {
      if (!('speechSynthesis' in window)) return;
      const s = this.s; if (!s) return;
      const vol = ((kind === 'pa' ? s.audio.pa : s.audio.commentary) / 100) * (s.audio.master / 100);
      if (vol <= 0.01) return;
      const now = performance.now();
      if (kind === 'commentary' && now - this.lastSpeech < 2500) return;
      this.lastSpeech = now;
      try {
        if (kind === 'commentary') window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.volume = vol; u.rate = kind === 'pa' ? 0.92 : 1.08; u.pitch = kind === 'pa' ? 0.8 : 1.05;
        window.speechSynthesis.speak(u);
      } catch (e) { /* speech unavailable */ }
    }
  };
})(window.KXI);
