// KINETIC XI 3D — interface
// menu.js : the main menu and pause menu (dark glassmorphism over the live 3D stadium).
//   KICK OFF      : club + kit pickers, stadium time/weather, half length, difficulty, PLAY MATCH
//                   (pause mode: RESUME · RESTART MATCH · QUIT TO MAIN MENU)
//   GAME SETTINGS : Graphics & Performance (preset, FPS target, render scale, shadows, AA,
//                   bloom & volumetrics, crowd density, turf detail), Gameplay, Camera, Audio —
//                   every change applies immediately and is saved.
//   CONTROLS      : the exact MacBook layout + a live keyboard tester.
'use strict';
(function (K) {
  const UI = (K.UI = K.UI || {});
  const CLUB_IDS = () => Object.keys(K.CLUBS);

  UI.Menu = class {
    constructor(settings, cb) {
      this.s = settings;
      this.cb = cb;
      this.root = document.getElementById('menu');
      this.body = document.getElementById('tab-body');
      this.tabs = document.getElementById('tabs');
      this.tagline = document.getElementById('menu-tagline');
      this.tab = 'kickoff';
      this.mode = 'main';
      this.tabs.querySelectorAll('button').forEach((b) => { b.onclick = () => this.show(b.dataset.tab); });
      this.render();
    }

    get isOpen() { return this.root.classList.contains('open'); }
    open(mode) { this.mode = mode; this.root.classList.add('open'); this.show(mode === 'pause' ? 'kickoff' : this.tab); }
    close() { this.root.classList.remove('open'); }
    show(tab) {
      this.tab = tab;
      this.tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
      this.render();
    }
    changed(kind) { K.saveSettings3(this.s); if (this.cb.onChange) this.cb.onChange(kind); }

    render() {
      this.tagline.textContent = this.mode === 'pause' ? 'Match paused' : 'Matchday · Physics-first football';
      this.body.innerHTML = '';
      if (this.tab === 'kickoff') this.kickoff();
      else if (this.tab === 'settings') this.settings();
      else this.controls();
    }

    // ---------------------------------------------------------------- widgets ----
    sec(title) { const d = document.createElement('div'); d.className = 'sec'; d.innerHTML = `<h3>${title}</h3>`; this.body.appendChild(d); return d; }
    row(parent, label, hint, control) {
      const r = document.createElement('div'); r.className = 'row';
      const l = document.createElement('label'); l.innerHTML = label + (hint ? `<small>${hint}</small>` : '');
      r.appendChild(l); r.appendChild(control); parent.appendChild(r); return r;
    }
    seg(options, value, onPick, labels) {
      const d = document.createElement('div'); d.className = 'seg';
      options.forEach((o, i) => {
        const b = document.createElement('button');
        b.textContent = labels ? labels[i] : o;
        if (String(o) === String(value)) b.classList.add('on');
        b.onclick = () => { d.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); onPick(o); };
        d.appendChild(b);
      });
      return d;
    }
    slider(min, max, step, value, fmt, onInput) {
      const w = document.createElement('div'); w.className = 'slider';
      const i = document.createElement('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = value;
      const o = document.createElement('output'); o.textContent = fmt(value);
      i.oninput = () => { const v = parseFloat(i.value); o.textContent = fmt(v); onInput(v); };
      w.appendChild(i); w.appendChild(o); return w;
    }
    toggle(value, onSet) {
      const b = document.createElement('button'); b.className = 'toggle' + (value ? ' on' : '');
      b.setAttribute('aria-pressed', value ? 'true' : 'false');
      b.onclick = () => { const v = !b.classList.contains('on'); b.classList.toggle('on', v); b.setAttribute('aria-pressed', String(v)); onSet(v); };
      return b;
    }
    button(text, cls, onClick) { const b = document.createElement('button'); b.className = 'btn ' + (cls || ''); b.textContent = text; b.onclick = onClick; return b; }

    // ---------------------------------------------------------------- KICK OFF ----
    kickoff() {
      const ko = this.s.kickoff;
      if (this.mode === 'pause') {
        const lab = document.createElement('div'); lab.className = 'paused-label'; lab.textContent = 'MATCH PAUSED';
        this.body.appendChild(lab);
      }
      const sec = this.sec('MATCHUP');
      const grid = document.createElement('div'); grid.className = 'matchup';
      const picker = (side) => {
        const key = side === 'home' ? 'home' : 'away', kitKey = side === 'home' ? 'homeKit' : 'awayKit';
        const club = K.CLUBS[ko[key]];
        const card = document.createElement('div'); card.className = 'club-pick';
        const kit = club.kits[ko[kitKey]];
        card.innerHTML = `<div class="side">${side.toUpperCase()}</div>
          <div class="club-name"><span class="crest" style="background:${kit.shirt};color:${kit.trim}">${club.short}</span>${club.name}</div>`;
        if (this.mode === 'main') {
          const arrows = document.createElement('div'); arrows.className = 'club-arrows';
          const cycle = (d) => {
            const ids = CLUB_IDS();
            let i = ids.indexOf(ko[key]);
            do { i = (i + d + ids.length) % ids.length; } while (ids[i] === ko[key === 'home' ? 'away' : 'home']);
            ko[key] = ids[i];
            this.changed('teams'); this.render();
          };
          arrows.appendChild(this.button('◀', '', () => cycle(-1)));
          arrows.appendChild(this.button('▶', '', () => cycle(1)));
          card.appendChild(arrows);
          const kits = document.createElement('div'); kits.className = 'kits';
          for (const k of ['Home', 'Away', 'Third']) {
            const kk = club.kits[k];
            const sw = document.createElement('div'); sw.className = 'kit-sw' + (ko[kitKey] === k ? ' on' : '');
            sw.innerHTML = `<div class="shirt" style="background:linear-gradient(90deg, ${kk.shirt} 0 42%, ${kk.trim} 42% 58%, ${kk.shirt} 58%)"></div>${k.toUpperCase()}`;
            sw.onclick = () => { ko[kitKey] = k; this.changed('teams'); this.render(); };
            kits.appendChild(sw);
          }
          card.appendChild(kits);
        }
        return card;
      };
      grid.appendChild(picker('home'));
      const vs = document.createElement('div'); vs.className = 'vs'; vs.textContent = 'VS'; grid.appendChild(vs);
      grid.appendChild(picker('away'));
      sec.appendChild(grid);

      if (this.mode === 'main') {
        const cs = this.sec('STADIUM TIME / WEATHER');
        const conds = document.createElement('div'); conds.className = 'conds';
        const thumbs = { 'Clear Day': 'day', Sunset: 'sunset', 'Floodlit Night': 'night', Rain: 'rain' };
        for (const name of Object.keys(thumbs)) {
          const c = document.createElement('div'); c.className = 'cond' + (ko.conditions === name ? ' on' : '');
          c.innerHTML = `<div class="thumb ${thumbs[name]}"></div>${name}`;
          c.onclick = () => { ko.conditions = name; this.changed('conditions'); this.render(); };
          conds.appendChild(c);
        }
        cs.appendChild(conds);
        const q = this.sec('MATCH');
        this.row(q, 'Half length', 'Real-time minutes per half',
          this.seg([2, 4, 6, 8, 10], this.s.gameplay.halfMinutes, (v) => { this.s.gameplay.halfMinutes = v; this.changed('gameplay'); }, ['2', '4', '6', '8', '10']));
        this.row(q, 'AI difficulty', '', this.difficultySeg());
        const play = document.createElement('div'); play.className = 'play-row';
        play.appendChild(this.button('PLAY MATCH', 'primary', () => this.cb.onPlay()));
        const hint = document.createElement('span'); hint.style.color = 'var(--muted)'; hint.style.fontSize = '12px';
        hint.textContent = 'You control the home side · S to kick off';
        play.appendChild(hint);
        this.body.appendChild(play);
      } else {
        const row = document.createElement('div'); row.className = 'btn-row';
        row.appendChild(this.button('RESUME', 'primary', () => this.cb.onResume()));
        row.appendChild(this.button('RESTART MATCH', '', () => this.cb.onRestart()));
        row.appendChild(this.button('QUIT TO MAIN MENU', '', () => this.cb.onQuit()));
        this.body.appendChild(row);
      }
    }

    difficultySeg() {
      return this.seg(['Amateur', 'Semi-Pro', 'Professional', 'World Class', 'Legendary'], this.s.gameplay.difficulty,
        (v) => { this.s.gameplay.difficulty = v; this.changed('gameplay'); });
    }

    // ---------------------------------------------------------------- GAME SETTINGS ----
    settings() {
      const g = this.s.graphics;
      const custom = () => { g.preset = 'Custom'; this.changed('graphics'); const ps = this.body.querySelector('.preset-seg'); if (ps) ps.querySelectorAll('button').forEach((b) => b.classList.remove('on')); };
      const gs = this.sec('GRAPHICS &amp; PERFORMANCE');
      const preset = this.seg(Object.keys(K.GFX_PRESETS), g.preset, (v) => { K.applyGfxPreset(this.s, v); this.changed('graphics'); this.render(); });
      preset.classList.add('preset-seg');
      this.row(gs, 'Graphics quality preset', g.preset === 'Custom' ? 'Custom (individual options changed)' : 'Sets every option below', preset);
      this.row(gs, 'FPS limiter / target', 'Uncapped = display maximum (120 Hz on ProMotion)',
        this.seg(['30', '60', '120', 'Uncapped'], g.fpsTarget, (v) => { g.fpsTarget = v; custom(); }, ['30 FPS', '60 FPS', '120 FPS', 'Uncapped']));
      this.row(gs, 'Render resolution scale', '100% = one rendered pixel per screen point',
        this.slider(50, 150, 5, Math.round(g.renderScale * 100), (v) => `${v}%`, (v) => { g.renderScale = v / 100; custom(); }));
      this.row(gs, 'Shadow map quality', 'Real-time floodlight / sun shadows',
        this.seg(['Off', '1024', '2048', '4096'], g.shadows, (v) => { g.shadows = v; custom(); }, ['Off', '1024px', '2048px', '4096px']));
      this.row(gs, 'Anti-aliasing', 'MSAA 4x (multisampled) or FXAA (post-process)',
        this.seg(['Off', 'FXAA', 'MSAA'], g.aa, (v) => { g.aa = v; custom(); }, ['Off', 'FXAA', 'MSAA 4x']));
      this.row(gs, 'Floodlight bloom &amp; volumetric lighting', 'Glow on lamps/LED boards + light shafts', this.toggle(g.bloom, (v) => { g.bloom = v; custom(); }));
      this.row(gs, '3D crowd density', 'Up to 24,000 animated spectators',
        this.seg(['Low', 'Medium', 'High', 'Ultra'], g.crowd, (v) => { g.crowd = v; custom(); }));
      this.row(gs, 'Pitch turf detail', 'Procedural grass-blade normal map',
        this.seg(['Standard', 'High-Detail'], g.turf, (v) => { g.turf = v; custom(); }, ['Standard', 'High-Detail Normal Map']));

      const gp = this.sec('GAMEPLAY');
      this.row(gp, 'Match half length', '', this.slider(1, 10, 1, this.s.gameplay.halfMinutes, (v) => `${v} min`, (v) => { this.s.gameplay.halfMinutes = v; this.changed('gameplay'); }));
      this.row(gp, 'AI difficulty', 'Reaction time, decision quality, execution error', this.difficultySeg());
      this.row(gp, 'Sprint speed', '50 = realistic', this.slider(0, 100, 1, this.s.gameplay.sprintSpeed.user, (v) => v, (v) => { K.setSharedSlider(this.s, 'sprintSpeed', v); this.changed('gameplay'); }));
      this.row(gp, 'Shot power', '50 = realistic', this.slider(0, 100, 1, this.s.gameplay.shotSpeed.user, (v) => v, (v) => { K.setSharedSlider(this.s, 'shotSpeed', v); this.changed('gameplay'); }));
      this.row(gp, 'Pass assistance', 'Assisted: target + power · Semi: you set power · Manual: you aim',
        this.seg(['Assisted', 'SemiAssisted', 'Manual'], this.s.access.passAssist, (v) => { this.s.access.passAssist = v; this.changed('gameplay'); }, ['Assisted', 'Semi', 'Manual']));

      const cam = this.sec('CAMERA');
      this.row(cam, 'Camera', '', this.seg(['Broadcast', 'Tele'], this.s.camera.preset, (v) => { this.s.camera.preset = v; this.changed('camera'); }));
      this.row(cam, 'Camera height', '', this.slider(0, 20, 1, this.s.camera.height, (v) => v, (v) => { this.s.camera.height = v; this.changed('camera'); }));
      this.row(cam, 'Camera zoom', '', this.slider(0, 20, 1, this.s.camera.zoom, (v) => v, (v) => { this.s.camera.zoom = v; this.changed('camera'); }));
      this.row(cam, 'Ball tracking speed', 'Camera damping', this.slider(0, 20, 1, this.s.camera.tracking, (v) => v, (v) => { this.s.camera.tracking = v; this.changed('camera'); }));
      this.row(cam, 'Camera shake on big moments', '', this.toggle(this.s.camera.shake, (v) => { this.s.camera.shake = v; this.changed('camera'); }));

      const au = this.sec('AUDIO');
      for (const [k, label] of [['master', 'Master volume'], ['crowd', 'Stadium crowd'], ['commentary', 'Commentary'], ['sfx', 'Ball & kick SFX'], ['pa', 'PA announcer']]) {
        this.row(au, label, '', this.slider(0, 100, 1, this.s.audio[k], (v) => v, (v) => { this.s.audio[k] = v; this.changed('audio'); }));
      }
    }

    // ---------------------------------------------------------------- CONTROLS ----
    controls() {
      const tip = document.createElement('div'); tip.className = 'tip';
      tip.innerHTML = '<b>Mac tip:</b> macOS uses <b>Control + Arrow keys</b> for Mission Control and Spaces, which blocks Sprint. ' +
        'Open System Settings → Keyboard → Keyboard Shortcuts… → Mission Control and untick "Mission Control", "Application windows", "Move left a space" and "Move right a space".';
      this.body.appendChild(tip);
      const s = this.sec('LIVE KEY TESTER — press keys to light them up');
      const demo = document.createElement('div'); demo.className = 'kbd-demo';
      const keys = [['W', 'W'], ['A', 'A'], ['S', 'S'], ['D', 'D'], ['LeftShift', 'SHIFT', 'w2'], ['LeftCtrl', 'CTRL', 'w2'], ['Escape', 'ESC'],
        ['Left', '←'], ['Up', '↑'], ['Down', '↓'], ['Right', '→']];
      for (const [id, label, cls] of keys) {
        const k = document.createElement('span'); k.dataset.key = id; k.textContent = label; if (cls) k.className = cls;
        demo.appendChild(k);
      }
      s.appendChild(demo);
      this.demo = demo;
      const t = this.sec('MACBOOK KEYBOARD LAYOUT');
      const table = document.createElement('table'); table.className = 'ctl';
      table.innerHTML = K.CONTROLS.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('');
      t.appendChild(table);
    }

    /** Lights keys in the CONTROLS tab tester. */
    keyLight(key, down) {
      if (!this.demo || this.tab !== 'controls') return;
      const el = this.demo.querySelector(`[data-key="${key}"]`);
      if (el) el.classList.toggle('lit', down);
    }
  };
})(window.KXI);
