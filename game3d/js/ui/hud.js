// KINETIC XI 3D — interface
// hud.js : in-match broadcast HUD (DOM): minimalist top-left scorebug, toasts, translucent
// bottom-centre radar, current-action readout, half-time / full-time statistics panels,
// and the always-on FPS & frame-time counter.
'use strict';
(function (K) {
  const UI = (K.UI = K.UI || {});
  const P = K.PITCH;
  const $ = (id) => document.getElementById(id);

  UI.HUD = class {
    constructor(handlers) {
      this.h = handlers;
      this.el = { hud: $('hud'), toasts: $('toasts'), action: $('action'), radar: $('radar'), panel: $('panel'),
        sbH: $('sb-h'), sbA: $('sb-a'), clock: $('sb-clock'), half: $('sb-half'), codeH: $('sb-code-h'), codeA: $('sb-code-a'),
        kitH: $('sb-kit-h'), kitA: $('sb-kit-a'), fpsV: $('fps-v'), fpsMs: $('fps-ms'), fpsT: $('fps-t') };
      this.rctx = this.el.radar.getContext('2d');
      this.toastKey = '';
      this.radarT = 0;
      this.panelState = '';
    }

    setVisible(on) { this.el.hud.classList.toggle('hidden', !on); }

    fps(fps, ms, target) {
      this.el.fpsV.textContent = fps.toFixed(0);
      this.el.fpsMs.textContent = `${ms.toFixed(1)} ms`;
      this.el.fpsT.textContent = `target ${target}`;
    }

    update(m, dt) {
      const e = this.el;
      e.codeH.textContent = m.teams[0].short; e.codeA.textContent = m.teams[1].short;
      e.kitH.style.background = m.teams[0].kit.shirt; e.kitA.style.background = m.teams[1].kit.shirt;
      e.sbH.textContent = m.score[0]; e.sbA.textContent = m.score[1];
      const mins = m.minute(), mm = Math.floor(mins), ss = Math.floor((mins - mm) * 60);
      e.clock.textContent = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
      e.half.textContent = m.half === 1 ? '1H' : '2H';
      // Toasts (re-render only when the set changes).
      const key = m.toasts.map((t) => t.text).join('|');
      if (key !== this.toastKey) {
        this.toastKey = key;
        e.toasts.innerHTML = '';
        for (const t of m.toasts.slice(-3)) {
          const d = document.createElement('div');
          d.className = `toast ${t.kind}`;
          d.textContent = t.text;
          e.toasts.appendChild(d);
        }
      }
      // Action readout.
      const o = m.lastOut || {};
      const U = m.user;
      let txt = '';
      if (U) txt = `#${U.number} ${U.name.toUpperCase()} · ${(Math.hypot(U.vel.x, U.vel.y) * 3.6).toFixed(0)} KM/H`;
      if (o.charging) txt += ` · <b>${(K.ACTION_LABEL[o.charging] || o.charging).toUpperCase()} ${Math.round(o.chargePower * 100)}%</b>`;
      else if (o.sprint && o.sprint !== 'None') txt += ` · ${o.sprint === 'Full' ? 'SPRINT' : 'CONTROLLED SPRINT'}`;
      if (o.shield) txt += ' · SHIELD';
      if (o.jockey) txt += ' · JOCKEY';
      if (o.strafe) txt += ' · STRAFE';
      if (m.lastCommand && m.time - m.lastCommand.t < 1.6) txt += ` · <b>${m.lastCommand.text.toUpperCase()}</b>`;
      if (txt !== this.actionTxt) { this.actionTxt = txt; e.action.innerHTML = txt; }
      // Radar at 20 Hz.
      this.radarT += dt;
      if (this.radarT > 0.05) { this.radarT = 0; this.drawRadar(m); }
      this.syncPanel(m);
    }

    drawRadar(m) {
      const g = this.rctx, W = this.el.radar.width, H = this.el.radar.height;
      g.clearRect(0, 0, W, H);
      const pad = 8, sx = (W - pad * 2) / P.L, sy = (H - pad * 2) / P.W;
      const map = (p) => [pad + (p.x + P.HL) * sx, pad + (P.HW - p.y) * sy];
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1;
      g.strokeRect(pad, pad, W - pad * 2, H - pad * 2);
      g.beginPath(); g.moveTo(W / 2, pad); g.lineTo(W / 2, H - pad); g.stroke();
      g.beginPath(); g.arc(W / 2, H / 2, P.CIRCLE_R * sx, 0, Math.PI * 2); g.stroke();
      for (const s of [-1, 1]) {
        const x = s < 0 ? pad : W - pad, w = P.BOX_D * sx * -s;
        g.strokeRect(x, H / 2 - P.BOX_HW * sy, w, P.BOX_HW * 2 * sy);
      }
      for (const p of m.players) {
        const [x, y] = map(p.pos);
        g.fillStyle = p.isGK ? p.team.gkKit.shirt : p.team.kit.shirt;
        g.beginPath(); g.arc(x, y, p === m.user ? 5 : 3.6, 0, Math.PI * 2); g.fill();
        g.strokeStyle = p === m.user ? '#ffe14d' : 'rgba(0,0,0,0.6)'; g.lineWidth = p === m.user ? 2 : 1; g.stroke();
      }
      const [bx, by] = map(m.ball.pos);
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(bx, by, 3, 0, Math.PI * 2); g.fill();
    }

    syncPanel(m) {
      const state = m.state === 'halftime' || m.state === 'fulltime' ? m.state : '';
      if (state === this.panelState) return;
      this.panelState = state;
      const p = this.el.panel;
      if (!state) { p.classList.add('hidden'); p.innerHTML = ''; return; }
      const st = m.stats, tot = st[0].poss + st[1].poss || 1;
      const dist = (t) => (m.teams[t].players.reduce((s, q) => s + q.fat.dist, 0) / 1000).toFixed(1);
      const rows = [
        [`${Math.round((st[0].poss / tot) * 100)}%`, 'Possession', `${Math.round((st[1].poss / tot) * 100)}%`],
        [`${st[0].shots} (${st[0].onTarget})`, 'Shots (on target)', `${st[1].shots} (${st[1].onTarget})`],
        [st[0].xg.toFixed(2), 'Expected goals (xG)', st[1].xg.toFixed(2)],
        [`${st[0].passOk}/${st[0].passes}`, 'Passes completed', `${st[1].passOk}/${st[1].passes}`],
        [st[0].tackles, 'Tackles won', st[1].tackles], [st[0].saves, 'Saves', st[1].saves],
        [`${st[0].fouls} · ${st[0].offsides} · ${st[0].corners}`, 'Fouls · Offsides · Corners', `${st[1].fouls} · ${st[1].offsides} · ${st[1].corners}`],
        [dist(0), 'Distance covered (km)', dist(1)],
      ];
      p.innerHTML = `<h2>${state === 'halftime' ? 'HALF TIME' : 'FULL TIME'}</h2>
        <div class="result">${m.teams[0].name} ${m.score[0]} – ${m.score[1]} ${m.teams[1].name}</div>
        <table>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table>
        <div class="row-btn">${state === 'halftime'
          ? '<button class="btn primary" data-act="second">SECOND HALF (Space)</button>'
          : '<button class="btn" data-act="menu">MAIN MENU</button><button class="btn primary" data-act="rematch">REMATCH</button>'}</div>`;
      p.classList.remove('hidden');
      p.querySelectorAll('button').forEach((b) => { b.onclick = () => this.h[b.dataset.act](); });
    }
  };
})(window.KXI);
