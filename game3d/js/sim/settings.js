// KINETIC XI 3D — settings
// settings.js : the settings model used by the simulation, the renderer and the menu.
// Graphics options apply live (render scale, FPS target, shadows, anti-aliasing, bloom &
// volumetrics, crowd density, turf detail). Gameplay sliders feed the simulation through
// the same User/CPU slider pairs the engine uses, so the shared physics/AI code is unchanged.
'use strict';
(function (K) {
  const STORE_KEY = 'kxi3d.settings.v1';
  const pair = (u = 50, c = 50) => ({ user: u, cpu: c });

  /** Graphics presets. "Ultra (MacBook Pro)" targets 120 Hz ProMotion panels. */
  K.GFX_PRESETS = {
    Low: { fpsTarget: '60', renderScale: 0.7, shadows: 'Off', aa: 'FXAA', bloom: false, crowd: 'Low', turf: 'Standard' },
    Medium: { fpsTarget: '60', renderScale: 0.85, shadows: '1024', aa: 'FXAA', bloom: true, crowd: 'Medium', turf: 'Standard' },
    High: { fpsTarget: '60', renderScale: 1.0, shadows: '2048', aa: 'MSAA', bloom: true, crowd: 'High', turf: 'High-Detail' },
    'Ultra (MacBook Pro)': { fpsTarget: '120', renderScale: 1.25, shadows: '4096', aa: 'MSAA', bloom: true, crowd: 'Ultra', turf: 'High-Detail' },
  };

  K.defaultSettings3 = () => ({
    graphics: Object.assign({ preset: 'High' }, K.GFX_PRESETS.High),
    gameplay: {
      halfMinutes: 4, difficulty: 'Professional', fatigue: true,
      sprintSpeed: pair(), acceleration: pair(), shotError: pair(), passError: pair(), shotSpeed: pair(),
      passSpeed: pair(), firstTouch: pair(), gkAbility: pair(), marking: pair(), runFrequency: pair(),
      lineHeight: pair(), injuryFrequency: pair(30, 30),
    },
    camera: { preset: 'Broadcast', height: 10, zoom: 10, tracking: 10, shake: true },
    audio: { master: 80, crowd: 75, commentary: 65, sfx: 85, pa: 55 },
    access: { passAssist: 'SemiAssisted', shotAssist: 'SemiAssisted', timingScale: 1.0 },
    input: { bindings: {}, sprintMode: 'Ramp', precision: 'Context' },
    weather: { preset: 'Dry', time: 'Night', hydrologySpeed: 8 },
    kickoff: { home: 'NBA', away: 'HCR', homeKit: 'Home', awayKit: 'Away', conditions: 'Floodlit Night' },
  });

  K.loadSettings3 = () => {
    const d = K.defaultSettings3();
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        for (const sec of Object.keys(d)) if (s[sec] && typeof s[sec] === 'object') Object.assign(d[sec], s[sec]);
      }
    } catch (e) { /* storage blocked or corrupt: defaults */ }
    return d;
  };

  K.saveSettings3 = (s) => {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
  };

  /** 0..100 slider -> multiplier (0 -> atZero, 50 -> 1, 100 -> atHundred), quadratic blend. */
  K.sliderMul = (v, atZero, atHundred) => {
    const t = (K.clamp(v, 0, 100) - 50) / 50;
    const f = 0.15 * Math.abs(t) + 0.85 * t * t;
    return t >= 0 ? 1 + (atHundred - 1) * f : 1 + (atZero - 1) * f;
  };

  /** Applies a preset; returns true if it existed. */
  K.applyGfxPreset = (s, name) => {
    const p = K.GFX_PRESETS[name];
    if (!p) return false;
    Object.assign(s.graphics, p, { preset: name });
    return true;
  };

  /** Single menu sliders write both halves of the engine's User/CPU slider pairs. */
  K.setSharedSlider = (s, key, v) => { s.gameplay[key].user = v; s.gameplay[key].cpu = v; };
})(window.KXI);
