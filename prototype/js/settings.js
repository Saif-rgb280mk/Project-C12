// KINETIC XI — Playable Prototype
// settings.js : settings model (mirrors engine/include/kxi/settings.hpp), persistence, and
// the in-game options menu generated from one schema (tabs, User/CPU slider pairs,
// selects, toggles, and a click-to-rebind controls page with the macOS conflict doctor).
'use strict';
(function (K) {
  const STORE_KEY = 'kxi.settings.v1';
  const pair = (u = 50, c = 50) => ({ user: u, cpu: c });

  K.defaultSettings = () => ({
    gameplay: {
      halfMinutes: 4, difficulty: 'Professional', fatigue: true,
      sprintSpeed: pair(), acceleration: pair(), shotError: pair(), passError: pair(), shotSpeed: pair(),
      passSpeed: pair(), firstTouch: pair(), gkAbility: pair(), marking: pair(), runFrequency: pair(),
      lineHeight: pair(), injuryFrequency: pair(),
    },
    camera: { preset: 'Broadcast', height: 10, zoom: 10, tracking: 10, shake: true },
    graphics: { renderScale: 1.0, fpsCap: '60', crowd: 'High', turf: 'High', weatherFx: 'High', motionBlur: true, filmGrain: true, vignette: true, radar: true },
    audio: { master: 80, crowd: 70, commentary: 70, sfx: 85, pa: 60 },
    access: { passAssist: 'SemiAssisted', shotAssist: 'SemiAssisted', overlay: true, timingScale: 1.0, indicatorScale: 1.0, reduceFlashing: false, reduceShake: false },
    input: { bindings: K.defaultBindings(), sprintMode: 'Ramp', precision: 'Context' },
    weather: { preset: 'Dry', time: 'Night', hydrologySpeed: 8 },
  });

  K.loadSettings = () => {
    const d = K.defaultSettings();
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) return d;
      const s = JSON.parse(raw);
      for (const sec of Object.keys(d)) if (s[sec]) Object.assign(d[sec], s[sec]);
      const b = Object.assign(K.defaultBindings(), d.input.bindings || {});
      const vals = Object.values(b);
      d.input.bindings = new Set(vals).size === vals.length ? b : K.defaultBindings();
    } catch (e) { /* storage blocked or corrupt: defaults */ }
    return d;
  };
  K.saveSettings = (s) => {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
  };

  /** 0..100 slider -> multiplier (0 -> atZero, 50 -> 1, 100 -> atHundred), quadratic blend. */
  K.sliderMul = (v, atZero, atHundred) => {
    const t = (K.clamp(v, 0, 100) - 50) / 50;
    const f = 0.15 * Math.abs(t) + 0.85 * t * t;
    return t >= 0 ? 1 + (atHundred - 1) * f : 1 + (atZero - 1) * f;
  };

  const Q = ['Off', 'Low', 'Medium', 'High', 'Ultra'];
  const SCHEMA = [
    ['Gameplay', [
      { label: 'Half length (real minutes)', path: 'gameplay.halfMinutes', type: 'range', min: 2, max: 15, step: 1 },
      { label: 'Difficulty', path: 'gameplay.difficulty', type: 'select', options: ['Amateur', 'Semi-Pro', 'Professional', 'World Class', 'Legendary'] },
      { label: 'Fatigue & muscle strain', path: 'gameplay.fatigue', type: 'toggle' },
      { type: 'heading', label: 'Simulation sliders — User | CPU (50 = realistic)' },
      { label: 'Sprint Speed', path: 'gameplay.sprintSpeed', type: 'pair' },
      { label: 'Acceleration', path: 'gameplay.acceleration', type: 'pair' },
      { label: 'Shot Error', path: 'gameplay.shotError', type: 'pair' },
      { label: 'Pass Error', path: 'gameplay.passError', type: 'pair' },
      { label: 'Shot Speed', path: 'gameplay.shotSpeed', type: 'pair' },
      { label: 'Pass Speed', path: 'gameplay.passSpeed', type: 'pair' },
      { label: 'First Touch Control Error', path: 'gameplay.firstTouch', type: 'pair' },
      { label: 'Goalkeeper Ability', path: 'gameplay.gkAbility', type: 'pair' },
      { label: 'Marking (tightness)', path: 'gameplay.marking', type: 'pair' },
      { label: 'Run Frequency', path: 'gameplay.runFrequency', type: 'pair' },
      { label: 'Line Height', path: 'gameplay.lineHeight', type: 'pair' },
      { label: 'Injury Frequency', path: 'gameplay.injuryFrequency', type: 'pair' },
    ]],
    ['Controls', [{ type: 'controls' }]],
    ['Camera', [
      { label: 'Camera', path: 'camera.preset', type: 'select', options: ['Broadcast', 'Tele', 'CoOp', 'Pro', 'Custom'] },
      { label: 'Height', path: 'camera.height', type: 'range', min: 0, max: 20, step: 1 },
      { label: 'Zoom', path: 'camera.zoom', type: 'range', min: 0, max: 20, step: 1 },
      { label: 'Ball Tracking Speed', path: 'camera.tracking', type: 'range', min: 0, max: 20, step: 1 },
      { label: 'Handheld touchline shake', path: 'camera.shake', type: 'toggle' },
    ]],
    ['Graphics', [
      { label: 'Render scale', path: 'graphics.renderScale', type: 'range', min: 0.5, max: 2, step: 0.05 },
      { label: 'Frame rate cap', path: 'graphics.fpsCap', type: 'select', options: ['30', '60', '120', 'Uncapped'] },
      { label: 'Crowd detail', path: 'graphics.crowd', type: 'select', options: Q },
      { label: 'Turf detail (stripes, wear, puddles)', path: 'graphics.turf', type: 'select', options: Q },
      { label: 'Weather particles', path: 'graphics.weatherFx', type: 'select', options: Q },
      { label: 'Motion blur (ball trail)', path: 'graphics.motionBlur', type: 'toggle' },
      { label: 'Film grain', path: 'graphics.filmGrain', type: 'toggle' },
      { label: 'Broadcast vignette', path: 'graphics.vignette', type: 'toggle' },
      { label: 'Radar', path: 'graphics.radar', type: 'toggle' },
      { type: 'note', label: 'The native Mac build adds Metal ray-traced reflections/lighting, 3D grass blades, MetalFX upscaling and Apple Silicon presets (see the design document).' },
    ]],
    ['Audio', [
      { label: 'Master', path: 'audio.master', type: 'range', min: 0, max: 100, step: 1 },
      { label: 'Stadium crowd', path: 'audio.crowd', type: 'range', min: 0, max: 100, step: 1 },
      { label: 'Commentary', path: 'audio.commentary', type: 'range', min: 0, max: 100, step: 1 },
      { label: 'On-pitch ball / kick SFX', path: 'audio.sfx', type: 'range', min: 0, max: 100, step: 1 },
      { label: 'PA announcer', path: 'audio.pa', type: 'range', min: 0, max: 100, step: 1 },
    ]],
    ['Accessibility', [
      { label: 'Passing assistance', path: 'access.passAssist', type: 'select', options: ['Assisted', 'SemiAssisted', 'Manual'] },
      { label: 'Shooting assistance', path: 'access.shotAssist', type: 'select', options: ['Assisted', 'SemiAssisted', 'Manual'] },
      { label: 'Visual input overlay', path: 'access.overlay', type: 'toggle' },
      { label: 'Timing window scale (tap/hold forgiveness)', path: 'access.timingScale', type: 'range', min: 0.75, max: 2, step: 0.05 },
      { label: 'Player indicator size', path: 'access.indicatorScale', type: 'range', min: 0.5, max: 2.5, step: 0.1 },
      { label: 'Reduce flashing (lightning)', path: 'access.reduceFlashing', type: 'toggle' },
      { label: 'Reduce camera shake', path: 'access.reduceShake', type: 'toggle' },
      { label: 'Sprint mode', path: 'input.sprintMode', type: 'select', options: ['Ramp', 'InstantFull', 'AlwaysControlled'] },
      { label: 'D + Modifier priority', path: 'input.precision', type: 'select', options: ['Context', 'AlwaysFinesse', 'AlwaysDriven'] },
    ]],
    ['Weather', [
      { label: 'Weather', path: 'weather.preset', type: 'select', options: ['Dry', 'Overcast', 'Light Rain', 'Heavy Rain', 'Storm'] },
      { label: 'Time of day', path: 'weather.time', type: 'select', options: ['Day', 'Dusk', 'Night'] },
      { label: 'Pitch hydrology speed-up', path: 'weather.hydrologySpeed', type: 'range', min: 1, max: 30, step: 1 },
    ]],
  ];

  const get = (o, path) => path.split('.').reduce((a, k) => a[k], o);
  const set = (o, path, v) => { const ks = path.split('.'); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };

  /** Builds the options menu inside `root`. onChange(settings) fires after every edit. */
  K.SettingsMenu = class {
    constructor(root, settings, keyboard, onChange) {
      this.root = root; this.s = settings; this.kb = keyboard; this.onChange = onChange;
      this.tab = 'Gameplay';
      this.render();
    }
    changed() { K.saveSettings(this.s); this.onChange(this.s); }
    render() {
      const r = this.root;
      r.innerHTML = '';
      const tabs = document.createElement('div');
      tabs.className = 'tabs';
      for (const [name] of SCHEMA) {
        const b = document.createElement('button');
        b.textContent = name;
        b.className = name === this.tab ? 'tab active' : 'tab';
        b.onclick = () => { this.tab = name; this.render(); };
        tabs.appendChild(b);
      }
      r.appendChild(tabs);
      const body = document.createElement('div');
      body.className = 'tabbody';
      r.appendChild(body);
      const items = SCHEMA.find((t) => t[0] === this.tab)[1];
      for (const it of items) body.appendChild(this.item(it));
      const foot = document.createElement('div');
      foot.className = 'menufoot';
      const reset = document.createElement('button');
      reset.textContent = 'Reset all to defaults';
      reset.onclick = () => { const d = K.defaultSettings(); Object.keys(d).forEach((k) => (this.s[k] = d[k])); this.changed(); this.render(); };
      foot.appendChild(reset);
      const hint = document.createElement('span');
      hint.textContent = 'Esc — resume match';
      foot.appendChild(hint);
      r.appendChild(foot);
    }
    item(it) {
      const row = document.createElement('div');
      row.className = 'row';
      if (it.type === 'heading') { row.className = 'rowhead'; row.textContent = it.label; return row; }
      if (it.type === 'note') { row.className = 'rownote'; row.textContent = it.label; return row; }
      if (it.type === 'controls') return this.controls();
      const lab = document.createElement('label');
      lab.textContent = it.label;
      row.appendChild(lab);
      const val = get(this.s, it.path);
      if (it.type === 'range') {
        const inp = document.createElement('input');
        inp.type = 'range'; inp.min = it.min; inp.max = it.max; inp.step = it.step; inp.value = val;
        const out = document.createElement('output'); out.textContent = val;
        inp.oninput = () => { const v = parseFloat(inp.value); set(this.s, it.path, v); out.textContent = v; this.changed(); };
        row.appendChild(inp); row.appendChild(out);
      } else if (it.type === 'pair') {
        for (const side of ['user', 'cpu']) {
          const wrap = document.createElement('span'); wrap.className = 'pairside';
          const tag = document.createElement('small'); tag.textContent = side.toUpperCase();
          const inp = document.createElement('input');
          inp.type = 'range'; inp.min = 0; inp.max = 100; inp.step = 1; inp.value = val[side];
          const out = document.createElement('output'); out.textContent = val[side];
          inp.oninput = () => { val[side] = parseInt(inp.value, 10); out.textContent = val[side]; this.changed(); };
          wrap.appendChild(tag); wrap.appendChild(inp); wrap.appendChild(out); row.appendChild(wrap);
        }
      } else if (it.type === 'select') {
        const sel = document.createElement('select');
        for (const o of it.options) { const op = document.createElement('option'); op.value = o; op.textContent = o; if (String(val) === o) op.selected = true; sel.appendChild(op); }
        sel.onchange = () => { set(this.s, it.path, sel.value); this.changed(); };
        row.appendChild(sel);
      } else if (it.type === 'toggle') {
        const inp = document.createElement('input');
        inp.type = 'checkbox'; inp.checked = !!val;
        inp.onchange = () => { set(this.s, it.path, inp.checked); this.changed(); };
        row.appendChild(inp);
      }
      return row;
    }
    controls() {
      const box = document.createElement('div');
      const b = this.s.input.bindings;
      const conf = K.macConflicts(b);
      if (conf.length) {
        const warn = document.createElement('div');
        warn.className = 'doctor';
        warn.innerHTML = '<b>Keyboard Doctor</b>' + conf.map((c) => `<p><b>${c.combo}</b> is owned by ${c.owner}.<br>${c.fix}</p>`).join('');
        box.appendChild(warn);
      }
      const table = document.createElement('div');
      table.className = 'bindings';
      for (const slot of K.SLOTS) {
        const row = document.createElement('div'); row.className = 'row';
        const lab = document.createElement('label'); lab.textContent = K.SLOT_LABEL[slot];
        const btn = document.createElement('button'); btn.className = 'keycap'; btn.textContent = K.KEY_LABEL(b[slot]);
        btn.onclick = () => {
          btn.textContent = 'press a key…'; btn.classList.add('listening');
          this.kb.captureNext = (key) => {
            if (key === 'Escape') { this.render(); return; }
            const other = K.SLOTS.find((s) => b[s] === key);
            if (other && other !== slot) b[other] = b[slot];   // swap, never leave a hole
            b[slot] = key;
            this.changed(); this.render();
          };
        };
        row.appendChild(lab); row.appendChild(btn); table.appendChild(row);
      }
      box.appendChild(table);
      const reset = document.createElement('button');
      reset.textContent = 'Restore mandated MacBook layout';
      reset.onclick = () => { this.s.input.bindings = K.defaultBindings(); this.changed(); this.render(); };
      box.appendChild(reset);
      const ref = document.createElement('div');
      ref.className = 'rownote';
      ref.innerHTML = K.BINDING_HELP;
      box.appendChild(ref);
      return box;
    }
  };

  K.BINDING_HELP = `
<table class="help">
<tr><th>Action</th><th>Keys</th><th>When</th></tr>
<tr><td>Movement</td><td>↑ ← ↓ →</td><td>always (camera-relative)</td></tr>
<tr><td>Sprint</td><td>Left Ctrl + Arrows</td><td>starts controlled, full after 0.24 s</td></tr>
<tr><td>Controlled Sprint</td><td>D or Left Ctrl + Direction</td><td>D off the ball · tap-feather Ctrl on the ball</td></tr>
<tr><td>Stop Ball</td><td>Left Ctrl (no direction)</td><td>tap · hold = stand on ball</td></tr>
<tr><td>Strafe Dribble</td><td>Left Shift (no direction)</td><td>hold, in possession</td></tr>
<tr><td>Skill Moves</td><td>E + Direction gestures</td><td>→→ stepover burst · ← drag-back · ←→ roulette …</td></tr>
<tr><td>Ground Pass / Header</td><td>S (tap)</td><td>&lt; 0.2 s</td></tr>
<tr><td>Lob / Cross / Header</td><td>S (hold)</td><td>cross when wide in the final third</td></tr>
<tr><td>Through Pass</td><td>A</td><td>hold for power</td></tr>
<tr><td>Lobbed Through</td><td>Left Shift + A</td><td>chord</td></tr>
<tr><td>Driven Ground Pass</td><td>D + E</td><td>outside shooting context</td></tr>
<tr><td>Shoot / Volley / Header</td><td>D</td><td>hold for power</td></tr>
<tr><td>Finesse Shot</td><td>D + E</td><td>in range, aiming at goal</td></tr>
<tr><td>Shield / Jockey</td><td>W (+ Arrows)</td><td>shield on the ball · jockey defending</td></tr>
<tr><td>Change Player</td><td>Left Shift</td><td>defending (arrows pick direction)</td></tr>
<tr><td>Contain</td><td>E (Context Key, hold)</td><td>defending</td></tr>
<tr><td>Teammate Contain</td><td>D (hold)</td><td>defending</td></tr>
<tr><td>Sliding Tackle</td><td>S</td><td>defending</td></tr>
<tr><td>Steal / Standing Tackle</td><td>D while W or E held</td><td>defending</td></tr>
<tr><td>Rush Goalkeeper Out</td><td>A (hold)</td><td>defending</td></tr>
</table>`;
})(window.KXI);
