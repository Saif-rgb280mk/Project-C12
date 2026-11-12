// KINETIC XI — Playable Prototype
// render.js : gritty broadcast presentation on Canvas 2D with a real perspective camera —
// stadium & animated crowd, floodlights with multi-shadows, mowing stripes that darken and
// gloss when wet, live wear & puddle patches from the pitch model, IK-planted player
// figures, ball with spin & shadow, rain/lightning, scorebug, radar, keyboard overlay.
'use strict';
(function (K) {
  const V = K.V, P = K.PITCH;
  const QN = { Off: 0, Low: 1, Medium: 2, High: 3, Ultra: 4 };

  K.Renderer = class {
    constructor(canvas) {
      this.c = canvas; this.g = canvas.getContext('2d');
      this.rain = []; this.trail = []; this.flash = 0; this.nextBolt = 15; this.t = 0;
      this.ref = { pos: { x: -10, y: 10, z: 0 }, vel: { x: 0, y: 0, z: 0 }, facing: 0, stepPhase: 0 };
      this.crowd = this.makeCrowd(8000);
      this.grain = this.makeGrain();
    }

    resize(s) {
      const dpr = (window.devicePixelRatio || 1) * s.graphics.renderScale;
      const w = Math.floor(window.innerWidth * dpr), h = Math.floor(window.innerHeight * dpr);
      if (this.c.width !== w || this.c.height !== h) { this.c.width = w; this.c.height = h; }
    }

    makeCrowd(n) {
      const rng = new K.Rng(99), pts = [];
      const pal = ['#d8262f', '#ffffff', '#1d5fd6', '#f5d33b', '#2b2b2b', '#8a8a8a', '#c94b4b', '#3a6fd8'];
      for (let i = 0; i < n; i++) {
        const side = rng.next();
        let p;
        if (side < 0.5) { const r = rng.next(); p = { x: rng.range(-68, 68), y: P.HW + 6 + r * 34, z: 1.5 + r * 24 }; }
        else if (side < 0.75) { const r = rng.next(); p = { x: -(P.HL + 7 + r * 28), y: rng.range(-44, 44), z: 1.5 + r * 20 }; }
        else { const r = rng.next(); p = { x: P.HL + 7 + r * 28, y: rng.range(-44, 44), z: 1.5 + r * 20 }; }
        p.c = pal[Math.floor(rng.next() * (p.x < 0 ? 4 : 8)) % pal.length];
        p.ph = rng.next() * 6.28;
        pts.push(p);
      }
      return pts;
    }

    makeGrain() {
      const cv = document.createElement('canvas'); cv.width = cv.height = 256;
      const g = cv.getContext('2d'), id = g.createImageData(256, 256);
      for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      g.putImageData(id, 0, 0);
      return cv;
    }

    // ------------------------------------------------------------- helpers ----
    poly(pts3, fill, stroke) {
      const cam = this.cam, g = this.g;
      const pts = cam.projectPoly(pts3);
      if (pts.length < 3) return;
      g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.closePath();
      if (fill) { g.fillStyle = fill; g.fill(); }
      if (stroke) { g.strokeStyle = stroke; g.stroke(); }
    }
    seg(a, b, width, colour) {
      const s = this.cam.projectSeg(a, b);
      if (!s) return;
      const g = this.g;
      // Use the FAR end's scale and clamp, so lines clipped at the near plane stay thin.
      g.strokeStyle = colour; g.lineWidth = K.clamp(width * Math.min(s[0].s, s[1].s), 1, this.c.height * 0.012);
      g.beginPath(); g.moveTo(s[0].x, s[0].y); g.lineTo(s[1].x, s[1].y); g.stroke();
    }
    circle3(cx, cy, r, a0 = 0, a1 = Math.PI * 2, n = 40, width = 0.12, colour = 'rgba(255,255,255,0.85)') {
      for (let i = 0; i < n; i++) {
        const t0 = a0 + ((a1 - a0) * i) / n, t1 = a0 + ((a1 - a0) * (i + 1)) / n;
        this.seg({ x: cx + Math.cos(t0) * r, y: cy + Math.sin(t0) * r, z: 0 }, { x: cx + Math.cos(t1) * r, y: cy + Math.sin(t1) * r, z: 0 }, width, colour);
      }
    }
    shade(hex, k) {
      const n = parseInt(hex.slice(1), 16);
      const r = Math.min(255, ((n >> 16) & 255) * k), gg = Math.min(255, ((n >> 8) & 255) * k), b = Math.min(255, (n & 255) * k);
      return `rgb(${r | 0},${gg | 0},${b | 0})`;
    }

    // ------------------------------------------------------------- frame ----
    draw(m, dt) {
      this.t += dt; this.dt = Math.min(0.1, dt);
      const s = m.settings, g = this.g, W = this.c.width, H = this.c.height;
      const cam = m.camera; cam.setup(W, H); this.cam = cam; this.m = m;
      const tod = s.weather.time, wx = s.weather.preset;
      const night = tod === 'Night', dusk = tod === 'Dusk';
      const storm = wx === 'Storm' || wx === 'Heavy Rain';
      this.light = night ? 0.82 : dusk ? 0.9 : storm ? 0.78 : 1.0;

      // Sky
      const sky = g.createLinearGradient(0, 0, 0, H);
      if (night) { sky.addColorStop(0, '#05070d'); sky.addColorStop(1, '#16202e'); }
      else if (dusk) { sky.addColorStop(0, '#2a2140'); sky.addColorStop(0.6, '#c8674a'); sky.addColorStop(1, '#f2b277'); }
      else if (storm) { sky.addColorStop(0, '#3a4048'); sky.addColorStop(1, '#6b737c'); }
      else { sky.addColorStop(0, '#5d8fc9'); sky.addColorStop(1, '#bcd6ee'); }
      g.fillStyle = sky; g.fillRect(0, 0, W, H);

      this.drawStadium(m, night);
      this.drawPitch(m);
      this.drawLines();
      this.drawShadowsAndBodies(m, night);
      this.drawWeather(m, dt);
      this.drawPost(m);
      this.drawHUD(m);
    }

    drawStadium(m, night) {
      const L = this.light;
      const stand = this.shade('#2a3140', L), standHi = this.shade('#3b4458', L), roof = this.shade('#1b2028', L);
      // Far stand, end stands, near stand (visible in Pro cam), roofs.
      this.poly([{ x: -78, y: P.HW + 5, z: 0.5 }, { x: 78, y: P.HW + 5, z: 0.5 }, { x: 78, y: P.HW + 42, z: 27 }, { x: -78, y: P.HW + 42, z: 27 }], stand);
      this.poly([{ x: -78, y: P.HW + 42, z: 27 }, { x: 78, y: P.HW + 42, z: 27 }, { x: 78, y: P.HW + 46, z: 34 }, { x: -78, y: P.HW + 46, z: 34 }], roof);
      for (const sgn of [-1, 1]) {
        this.poly([{ x: sgn * (P.HL + 6), y: -48, z: 0.5 }, { x: sgn * (P.HL + 6), y: 48, z: 0.5 }, { x: sgn * (P.HL + 38), y: 48, z: 23 }, { x: sgn * (P.HL + 38), y: -48, z: 23 }], standHi);
      }
      this.poly([{ x: -78, y: -(P.HW + 5), z: 0.5 }, { x: 78, y: -(P.HW + 5), z: 0.5 }, { x: 78, y: -(P.HW + 42), z: 27 }, { x: -78, y: -(P.HW + 42), z: 27 }], stand);
      // Crowd
      const q = QN[m.settings.graphics.crowd];
      const n = [0, 1500, 3200, 5200, 8000][q];
      const g = this.g, ex = m.audio.excite || 0.2;
      for (let i = 0; i < n; i++) {
        const c = this.crowd[i];
        const bob = Math.max(0, Math.sin(this.t * (6 + ex * 6) + c.ph)) * 0.25 * ex * (m.state === 'goal' ? 3 : 1);
        const pr = this.cam.project({ x: c.x, y: c.y, z: c.z + bob });
        if (!pr) continue;
        const sz = Math.max(1, pr.s * 0.45);
        g.fillStyle = c.c;
        g.globalAlpha = 0.55 * L;
        g.fillRect(pr.x - sz / 2, pr.y - sz, sz, sz * 1.4);
      }
      g.globalAlpha = 1;
      // Advertising boards (original, brand-free).
      const boards = ['#c62828', '#0d47a1', '#f9a825', '#2e7d32', '#6a1b9a'];
      for (let i = 0; i < 14; i++) {
        const x0 = -P.HL + i * 7.5, x1 = x0 + 7.3;
        this.poly([{ x: x0, y: P.HW + 3, z: 0 }, { x: x1, y: P.HW + 3, z: 0 }, { x: x1, y: P.HW + 3, z: 0.9 }, { x: x0, y: P.HW + 3, z: 0.9 }], this.shade(boards[i % boards.length], L));
      }
      // Floodlights
      if (night) {
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
          const top = { x: sx * (P.HL + 14), y: sy * (P.HW + 16), z: 45 };
          this.seg({ x: top.x, y: top.y, z: 0 }, top, 0.6, '#444b55');
          const pr = this.cam.project(top);
          if (pr) {
            const r = Math.max(20, pr.s * 9);
            const gr = g.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, r);
            gr.addColorStop(0, 'rgba(255,255,240,0.95)'); gr.addColorStop(0.2, 'rgba(255,250,220,0.35)'); gr.addColorStop(1, 'rgba(255,250,220,0)');
            g.fillStyle = gr; g.beginPath(); g.arc(pr.x, pr.y, r, 0, 6.283); g.fill();
          }
        }
      }
    }

    drawPitch(m) {
      const s = m.settings, sf = m.surface, L = this.light;
      const avgM = sf.avgMoisture();
      const wetK = 1 - 0.22 * avgM;
      const base1 = this.shade('#3f8f3a', L * wetK), base2 = this.shade('#357f31', L * wetK);
      this.poly([{ x: -P.HL - 7, y: -P.HW - 5, z: 0 }, { x: P.HL + 7, y: -P.HW - 5, z: 0 }, { x: P.HL + 7, y: P.HW + 5, z: 0 }, { x: -P.HL - 7, y: P.HW + 5, z: 0 }], this.shade('#2f6f2c', L * wetK));
      const tq = QN[s.graphics.turf];
      const n = tq === 0 ? 1 : 18;
      for (let i = 0; i < n; i++) {
        const x0 = -P.HL + (P.L * i) / n, x1 = -P.HL + (P.L * (i + 1)) / n;
        this.poly([{ x: x0, y: -P.HW, z: 0 }, { x: x1, y: -P.HW, z: 0 }, { x: x1, y: P.HW, z: 0 }, { x: x0, y: P.HW, z: 0 }], i % 2 ? base1 : base2);
      }
      if (tq >= 2) {   // live wear & puddles from the pitch model
        const c = sf.cell;
        for (let j = 0; j < sf.ny; j++) for (let i = 0; i < sf.nx; i++) {
          const k = j * sf.nx + i, wear = sf.wear[k], water = sf.water[k];
          if (wear < 0.08 && water < 0.25) continue;
          const x0 = i * c - P.HL, y0 = j * c - P.HW;
          const q = [{ x: x0, y: y0, z: 0.01 }, { x: x0 + c, y: y0, z: 0.01 }, { x: x0 + c, y: y0 + c, z: 0.01 }, { x: x0, y: y0 + c, z: 0.01 }];
          if (wear >= 0.08) this.poly(q, `rgba(${110 * L | 0},${84 * L | 0},${50 * L | 0},${Math.min(0.75, wear * 0.9)})`);
          if (water >= 0.25) this.poly(q, `rgba(${92 * L | 0},${112 * L | 0},${132 * L | 0},${Math.min(0.85, 0.3 + water / 5)})`);
        }
      }
      if (avgM > 0.45 && tq >= 1) {   // wet sheen: floodlight reflection band on the far side
        const pr = this.cam.project({ x: this.cam.target.x, y: P.HW * 0.6, z: 0 });
        if (pr) {
          const g = this.g, r = pr.s * 45;
          const gr = g.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, r);
          gr.addColorStop(0, `rgba(220,235,255,${0.16 * (avgM - 0.4)})`); gr.addColorStop(1, 'rgba(220,235,255,0)');
          g.fillStyle = gr; g.save(); g.scale(1, 0.35); g.beginPath(); g.arc(pr.x, pr.y / 0.35, r, 0, 6.283); g.fill(); g.restore();
        }
      }
    }

    drawLines() {
      const w = 0.12, col = `rgba(255,255,255,${0.85 * this.light})`;
      const L = (x0, y0, x1, y1) => this.seg({ x: x0, y: y0, z: 0.02 }, { x: x1, y: y1, z: 0.02 }, w, col);
      L(-P.HL, -P.HW, P.HL, -P.HW); L(P.HL, -P.HW, P.HL, P.HW); L(P.HL, P.HW, -P.HL, P.HW); L(-P.HL, P.HW, -P.HL, -P.HW);
      L(0, -P.HW, 0, P.HW);
      this.circle3(0, 0, P.CIRCLE_R, 0, Math.PI * 2, 48, w, col);
      this.circle3(0, 0, 0.2, 0, Math.PI * 2, 8, 0.2, col);
      for (const s of [-1, 1]) {
        const gx = s * P.HL;
        L(gx, -P.BOX_HW, gx - s * P.BOX_D, -P.BOX_HW); L(gx - s * P.BOX_D, -P.BOX_HW, gx - s * P.BOX_D, P.BOX_HW); L(gx - s * P.BOX_D, P.BOX_HW, gx, P.BOX_HW);
        L(gx, -P.SIX_HW, gx - s * P.SIX_D, -P.SIX_HW); L(gx - s * P.SIX_D, -P.SIX_HW, gx - s * P.SIX_D, P.SIX_HW); L(gx - s * P.SIX_D, P.SIX_HW, gx, P.SIX_HW);
        const spot = gx - s * P.SPOT;
        this.circle3(spot, 0, 0.18, 0, Math.PI * 2, 8, 0.2, col);
        const a = Math.acos((P.BOX_D - P.SPOT) / P.ARC_R);
        if (s > 0) this.circle3(spot, 0, P.ARC_R, Math.PI - a, Math.PI + a, 16, w, col);
        else this.circle3(spot, 0, P.ARC_R, -a, a, 16, w, col);
        for (const sy of [-1, 1]) this.circle3(gx, sy * P.HW, 1, s > 0 ? (sy > 0 ? Math.PI : Math.PI / 2) : (sy > 0 ? 1.5 * Math.PI : 0), s > 0 ? (sy > 0 ? 1.5 * Math.PI : Math.PI) : (sy > 0 ? 2 * Math.PI : Math.PI / 2), 6, w, col);
      }
    }

    drawGoal(side, m) {
      const gx = side * P.HL, d = P.GOAL_DEPTH, hw = P.GOAL_HW, h = P.GOAL_H;
      const ripple = m.state === 'goal' && Math.sign(m.ball.pos.x) === side ? Math.sin(this.t * 25) * 0.15 * Math.max(0, 1 - m.goalTimer) : 0;
      const net = 'rgba(235,235,235,0.35)';
      const bx = gx + side * (d + ripple);
      for (let i = 0; i <= 12; i++) { const y = -hw + (2 * hw * i) / 12; this.seg({ x: gx, y, z: h }, { x: bx, y, z: h * 0.85 }, 0.02, net); this.seg({ x: bx, y, z: h * 0.85 }, { x: bx, y, z: 0 }, 0.02, net); }
      for (let i = 0; i <= 6; i++) { const z = (h * 0.85 * i) / 6; this.seg({ x: bx, y: -hw, z }, { x: bx, y: hw, z }, 0.02, net); }
      for (const sy of [-1, 1]) for (let i = 0; i <= 5; i++) { const t = i / 5; this.seg({ x: gx + side * d * t, y: sy * hw, z: 0 }, { x: gx + side * d * t, y: sy * hw, z: h * (1 - 0.15 * t) }, 0.02, net); }
      const post = '#f4f4f4';
      this.seg({ x: gx, y: -hw, z: 0 }, { x: gx, y: -hw, z: h }, 0.12, post);
      this.seg({ x: gx, y: hw, z: 0 }, { x: gx, y: hw, z: h }, 0.12, post);
      this.seg({ x: gx, y: -hw, z: h }, { x: gx, y: hw, z: h }, 0.12, post);
    }

    drawShadowsAndBodies(m, night) {
      const g = this.g, cam = this.cam;
      // Referee (presentation only): stays on a diagonal behind play.
      const ref = this.ref, target = { x: m.ball.pos.x - 8, y: K.clamp(m.ball.pos.y + 10, -P.HW + 3, P.HW - 3), z: 0 };
      const dv = V.sub(target, ref.pos);
      ref.vel = V.lerp(ref.vel, V.mul(V.fnorm(dv), Math.min(6.5, V.flen(dv) * 0.6)), Math.min(1, this.dt * 2));
      ref.pos = V.add(ref.pos, V.mul(ref.vel, this.dt)); ref.stepPhase += (1.6 + 0.32 * V.flen(ref.vel)) * this.dt;
      if (V.flen(ref.vel) > 0.3) ref.facing = V.heading(ref.vel);

      const items = [];
      for (const p of m.players) { const c = cam.toCam(p.pos); if (c.z > 0.6) items.push({ z: c.z, kind: 'p', p }); }
      { const c = cam.toCam(ref.pos); if (c.z > 0.6) items.push({ z: c.z, kind: 'ref' }); }
      { const c = cam.toCam(m.ball.pos); if (c.z > 0.4) items.push({ z: c.z, kind: 'ball' }); }
      for (const side of [-1, 1]) { const c = cam.toCam({ x: side * (P.HL + 1), y: 0, z: 0 }); items.push({ z: c.z, kind: 'goal', side }); }
      // Shadows first (floodlights cast four soft shadows at night).
      const dirs = night ? [[0.7, 0.6], [-0.7, 0.6], [0.7, -0.6], [-0.7, -0.6]] : [[0.5, 0.35]];
      g.fillStyle = night ? 'rgba(0,0,0,0.13)' : 'rgba(0,0,0,0.28)';
      const shadowAt = (pos, len) => {
        for (const [dx, dy] of dirs) {
          const a = cam.project({ x: pos.x + dx * len * 0.5, y: pos.y + dy * len * 0.5, z: 0 });
          const b = cam.project({ x: pos.x + dx * len * 0.5 + 0.35, y: pos.y + dy * len * 0.5, z: 0 });
          if (!a || !b) continue;
          const rx = Math.max(2, Math.abs(b.x - a.x) * 1.3 + len * a.s * 0.25);
          g.beginPath(); g.ellipse(a.x, a.y, rx, Math.max(1, rx * 0.32), 0, 0, 6.283); g.fill();
        }
      };
      for (const p of m.players) shadowAt(p.pos, 1.2);
      shadowAt(ref.pos, 1.2);
      { const b = m.ball.pos, pr = cam.project({ x: b.x, y: b.y, z: 0 }); if (pr) { g.fillStyle = `rgba(0,0,0,${0.35 / (1 + b.z * 0.6)})`; g.beginPath(); g.ellipse(pr.x, pr.y, Math.max(1.5, pr.s * 0.13), Math.max(1, pr.s * 0.05), 0, 0, 6.283); g.fill(); } }
      // Controlled-player ring on the turf (under bodies).
      this.drawIndicator(m);
      items.sort((a, b) => b.z - a.z);
      for (const it of items) {
        if (it.kind === 'p') this.drawPlayer(it.p, m);
        else if (it.kind === 'ref') this.drawFigure(ref, '#111111', '#f5d33b', '#111111', '#e0b48c', 0, null, null);
        else if (it.kind === 'ball') this.drawBall(m);
        else this.drawGoal(it.side, m);
      }
    }

    drawIndicator(m) {
      const u = m.user;
      if (!u || ['prematch', 'halftime', 'fulltime'].includes(m.state)) return;
      const k = m.settings.access.indicatorScale;
      const col = '#ffe14d';
      const r = 0.65 * k;
      this.circle3(u.pos.x, u.pos.y, r, 0, Math.PI * 2, 20, 0.08 * k, col);
      const f = V.fromHeading(u.facing);
      this.seg(V.add(u.pos, V.mul(f, r)), V.add(u.pos, V.mul(f, r + 0.6 * k)), 0.14 * k, col);
    }

    drawPlayer(p, m) {
      const kit = p.isGK ? (p.team.id === 0 ? '#2ecc71' : '#ff8c1a') : p.team.colour;
      const kit2 = p.isGK ? '#111111' : p.team.colour2;
      this.drawFigure(p, kit, kit2, p.team.shorts, p.team.id === 0 ? '#c68e6a' : '#8d5a3b', p.number, p.action, p);
      if (p === m.user && !['prematch', 'halftime', 'fulltime'].includes(m.state)) this.drawUserTag(p, m);
    }

    /** Projected 3D figure; legs solved with two-bone IK so planted feet stay on the turf. */
    drawFigure(p, kit, kit2, shorts, skin, number, action, player) {
      const g = this.g, cam = this.cam;
      const fw = V.fromHeading(p.facing), lf = V.fromHeading(p.facing + Math.PI / 2);
      const sp = V.flen(p.vel), ph = (p.stepPhase || 0) * Math.PI;
      let hipZ = 0.95, torso = { x: 0, y: 0, z: 0.55 };
      const pos = p.pos;
      let footL, footR;
      const stride = K.clamp(sp * 0.11, 0, 0.5), lift = sp > 0.5 ? 0.18 : 0;
      footL = V.add(V.add(pos, V.mul(lf, 0.11)), V.mul(fw, Math.cos(ph) * stride)); footL.z = Math.max(0, Math.sin(ph)) * lift;
      footR = V.add(V.add(pos, V.mul(lf, -0.11)), V.mul(fw, -Math.cos(ph) * stride)); footR.z = Math.max(0, -Math.sin(ph)) * lift;
      const at = action && action.type;
      if (at === 'slide') { hipZ = 0.28; torso = V.add(V.mul(fw, -0.35), { x: 0, y: 0, z: 0.32 }); footL = V.add(pos, V.mul(fw, 0.85)); footL.z = 0.12; footR = V.add(V.add(pos, V.mul(fw, 0.4)), V.mul(lf, -0.2)); footR.z = 0.05; }
      else if (at === 'fallen') { hipZ = 0.15; torso = V.add(V.mul(fw, 0.6), { x: 0, y: 0, z: 0.02 }); footL = V.add(pos, V.mul(fw, -0.8)); footL.z = 0.1; footR = V.add(V.add(pos, V.mul(fw, -0.75)), V.mul(lf, 0.25)); footR.z = 0.1; }
      else if (at === 'dive') { const d = action.dir; hipZ = 0.75; torso = V.add(V.mul(d, 0.55), { x: 0, y: 0, z: action.high ? 0.35 : 0.1 }); footL = V.add(pos, V.mul(d, -0.7)); footL.z = 0.4; footR = V.add(pos, V.mul(d, -0.65)); footR.z = 0.25; }
      else if (at === 'kick') { footR = V.add(V.add(pos, V.mul(fw, 0.35 + 0.2 * Math.sin(action.t * 11))), V.mul(lf, -0.08)); footR.z = 0.25; }
      else torso = V.add(torso, V.add(V.mul(lf, -(p.lean || 0) * 0.25), V.mul(fw, sp * 0.012)));
      const pelvis = { x: pos.x, y: pos.y, z: hipZ };
      const shoulder = V.add(pelvis, torso);
      const head = V.add(shoulder, at === 'slide' || at === 'fallen' || at === 'dive' ? V.mul(V.fnorm(torso), 0.25) : { x: 0, y: 0, z: 0.22 });
      const legs = [[V.add(pelvis, V.mul(lf, 0.1)), footL], [V.add(pelvis, V.mul(lf, -0.1)), footR]];
      const drawLeg = (hip, foot) => {
        const ik = K.solveTwoBone(hip, foot, V.add(V.add(hip, V.mul(fw, 0.6)), { x: 0, y: 0, z: -0.3 }), 0.47, 0.48);
        this.seg(hip, ik.knee, 0.15, shorts);
        this.seg(ik.knee, ik.foot, 0.11, kit2 === '#111111' ? '#222' : '#eeeeee');
        this.seg(ik.foot, V.add(ik.foot, V.mul(fw, 0.16)), 0.09, '#111');
      };
      // far leg first
      const dL = cam.toCam(legs[0][1]).z, dR = cam.toCam(legs[1][1]).z;
      if (dL > dR) { drawLeg(...legs[0]); } else { drawLeg(...legs[1]); }
      this.seg(pelvis, shoulder, 0.36, kit);
      this.seg(V.add(pelvis, { x: 0, y: 0, z: 0.05 }), V.add(shoulder, { x: 0, y: 0, z: -0.05 }), 0.08, kit2);
      if (dL > dR) { drawLeg(...legs[1]); } else { drawLeg(...legs[0]); }
      for (const sgn of [1, -1]) {
        const sh = V.add(shoulder, V.mul(lf, 0.2 * sgn));
        const swing = at === 'dive' ? V.add(V.mul(action.dir, 0.65), { x: 0, y: 0, z: 0.25 }) : V.add(V.mul(fw, Math.cos(ph) * 0.25 * -sgn * K.sat(sp / 3)), { x: 0, y: 0, z: -0.5 });
        const hand = V.add(sh, swing);
        const elbow = V.lerp(sh, hand, 0.5);
        this.seg(sh, elbow, 0.1, kit);
        this.seg(elbow, hand, 0.08, skin);
      }
      const hp = cam.project(head);
      if (hp) {
        g.fillStyle = skin; g.beginPath(); g.arc(hp.x, hp.y, Math.max(1.5, hp.s * 0.12), 0, 6.283); g.fill();
        g.fillStyle = '#2a1d14'; g.beginPath(); g.arc(hp.x, hp.y - hp.s * 0.03, Math.max(1, hp.s * 0.11), Math.PI, 2 * Math.PI); g.fill();
      }
      // Shirt number on the back when facing away from the camera.
      if (number && V.dot(fw, cam.f) > 0.2) {
        const np = cam.project(V.add(pelvis, { x: 0, y: 0, z: 0.33 }));
        if (np && np.s > 14) { g.fillStyle = kit2; g.font = `bold ${Math.round(np.s * 0.24)}px Inter, Helvetica, Arial`; g.textAlign = 'center'; g.fillText(String(number), np.x, np.y); }
      }
    }

    drawUserTag(p, m) {
      const g = this.g, top = this.cam.project({ x: p.pos.x, y: p.pos.y, z: 2.3 });
      if (!top) return;
      const H = this.c.height, u = H / 1080, k = m.settings.access.indicatorScale;
      g.textAlign = 'center';
      g.font = `600 ${Math.round(15 * u * k)}px Inter, Helvetica, Arial`;
      g.fillStyle = '#ffe14d';
      g.fillText(`${p.number} ${p.name.toUpperCase()}`, top.x, top.y - 16 * u);
      const bw = 70 * u * k, bh = 6 * u * k;
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(top.x - bw / 2, top.y - 10 * u, bw, bh);
      const dpf = p.fat.d / p.fat.dMax;
      g.fillStyle = dpf > 0.5 ? '#47d16c' : dpf > 0.25 ? '#ffc93c' : '#ff4d4d';
      g.fillRect(top.x - bw / 2, top.y - 10 * u, bw * dpf, bh);
      const o = m.lastOut;
      if (o && o.charging) {
        g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(top.x - bw / 2, top.y + 2 * u, bw, bh * 1.6);
        g.fillStyle = /Shot|Volley|Header/.test(o.charging) ? '#ff6b3d' : '#4fc3ff';
        g.fillRect(top.x - bw / 2, top.y + 2 * u, bw * o.chargePower, bh * 1.6);
        g.font = `600 ${Math.round(12 * u * k)}px Inter, Helvetica, Arial`; g.fillStyle = '#fff';
        g.fillText(K.ACTION_LABEL[o.charging] || o.charging, top.x, top.y + 26 * u);
      }
    }

    drawBall(m) {
      const g = this.g, b = m.ball, pr = this.cam.project(b.pos);
      if (!pr) return;
      const r = Math.max(2, pr.s * K.BALL.r);
      if (m.settings.graphics.motionBlur) {
        this.trail.push({ x: pr.x, y: pr.y });
        if (this.trail.length > 7) this.trail.shift();
        if (V.len(b.vel) > 12) {
          g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = r * 1.4; g.lineCap = 'round';
          g.beginPath(); g.moveTo(this.trail[0].x, this.trail[0].y);
          for (const t of this.trail) g.lineTo(t.x, t.y);
          g.stroke(); g.lineCap = 'butt';
        }
      }
      const gr = g.createRadialGradient(pr.x - r * 0.35, pr.y - r * 0.35, r * 0.1, pr.x, pr.y, r);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#b9bec4');
      g.fillStyle = gr; g.beginPath(); g.arc(pr.x, pr.y, r, 0, 6.283); g.fill();
      if (r > 3) {
        g.fillStyle = '#222';
        for (let i = 0; i < 3; i++) {
          const a = b.roll * 0.5 + i * 2.094;
          g.beginPath(); g.arc(pr.x + Math.cos(a) * r * 0.5, pr.y + Math.sin(a) * r * 0.35, r * 0.22, 0, 6.283); g.fill();
        }
      }
    }

    drawWeather(m, dt) {
      const s = m.settings, g = this.g, W = this.c.width, H = this.c.height;
      const preset = s.weather.preset;
      const rain = { Dry: 0, Overcast: 0, 'Light Rain': 0.3, 'Heavy Rain': 0.75, Storm: 1 }[preset] || 0;
      const q = QN[s.graphics.weatherFx];
      const want = Math.floor(rain * [0, 300, 700, 1200, 2000][q]);
      while (this.rain.length < want) this.rain.push({ x: Math.random() * 90 - 45, y: Math.random() * 70 - 30, z: Math.random() * 25 });
      if (this.rain.length > want) this.rain.length = want;
      if (want) {
        const w = m.windNow, c = this.cam.target;
        g.strokeStyle = 'rgba(205,220,240,0.55)'; g.lineWidth = Math.max(1.2, H / 700);
        g.beginPath();
        for (const d of this.rain) {
          d.z -= 9 * dt; d.x += w.x * dt; d.y += w.y * dt;
          if (d.z < 0) { d.z = 25; d.x = Math.random() * 90 - 45; d.y = Math.random() * 70 - 30; }
          const p0 = { x: c.x + d.x, y: c.y + d.y, z: d.z };
          const s2 = this.cam.projectSeg(p0, { x: p0.x - w.x * 0.03, y: p0.y - w.y * 0.03, z: p0.z + 0.35 });
          if (!s2) continue;
          g.moveTo(s2[0].x, s2[0].y); g.lineTo(s2[1].x, s2[1].y);
        }
        g.stroke();
        g.fillStyle = `rgba(150,160,175,${0.08 * rain})`; g.fillRect(0, 0, W, H);   // mist
      }
      if (preset === 'Storm' && !s.access.reduceFlashing) {
        this.nextBolt -= dt;
        if (this.nextBolt <= 0) { this.flash = 1; this.nextBolt = 12 + Math.random() * 14; if (m.audio.ctx) m.audio.burst(2.5, 90, 0.5, 0.6, 'lowpass'); }
      }
      if (this.flash > 0) { g.fillStyle = `rgba(235,240,255,${this.flash * 0.55})`; g.fillRect(0, 0, W, H); this.flash = Math.max(0, this.flash - dt * 3); }
    }

    drawPost(m) {
      const s = m.settings, g = this.g, W = this.c.width, H = this.c.height;
      if (s.graphics.vignette) {
        const gr = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.5)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
      }
      if (s.graphics.filmGrain) {
        g.globalAlpha = 0.05; g.globalCompositeOperation = 'overlay';
        const ox = Math.random() * 256, oy = Math.random() * 256;
        for (let x = -ox; x < W; x += 256) for (let y = -oy; y < H; y += 256) g.drawImage(this.grain, x, y);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      if (m.camera.mode !== 'game') { g.fillStyle = '#000'; g.fillRect(0, 0, W, H * 0.07); g.fillRect(0, H * 0.93, W, H * 0.07); }
    }

    // ------------------------------------------------------------- HUD ----
    drawHUD(m) {
      const g = this.g, W = this.c.width, H = this.c.height, u = H / 1080;
      const font = (sz, wt = 600) => `${wt} ${Math.round(sz * u)}px Inter, "Helvetica Neue", Helvetica, Arial, sans-serif`;
      g.textBaseline = 'alphabetic';
      if (m.state === 'prematch') { this.drawPrematch(m, u, font); return; }
      // Scorebug
      const x = 36 * u, y = 34 * u;
      g.fillStyle = 'rgba(8,10,14,0.82)'; g.fillRect(x, y, 430 * u, 46 * u);
      g.fillStyle = m.teams[0].colour; g.fillRect(x, y, 8 * u, 46 * u);
      g.fillStyle = m.teams[1].colour; g.fillRect(x + 206 * u, y, 8 * u, 46 * u);
      g.fillStyle = '#fff'; g.font = font(22, 700); g.textAlign = 'left';
      g.fillText(m.teams[0].short, x + 20 * u, y + 31 * u);
      g.fillText(m.teams[1].short, x + 224 * u, y + 31 * u);
      g.textAlign = 'center';
      g.fillText(String(m.score[0]), x + 160 * u, y + 31 * u); g.fillText(String(m.score[1]), x + 364 * u, y + 31 * u);
      const mins = m.minute(), mm = Math.floor(mins), ss = Math.floor((mins - mm) * 60);
      g.fillStyle = '#ffe14d'; g.fillRect(x + 430 * u, y, 92 * u, 46 * u);
      g.fillStyle = '#111'; g.font = font(21, 700);
      g.fillText(`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, x + 476 * u, y + 31 * u);
      g.fillStyle = 'rgba(255,255,255,0.65)'; g.font = font(12, 600); g.textAlign = 'left';
      g.fillText(`KXI · LIVE · ${m.fps || 0} FPS`, x, y - 8 * u);
      // Weather & pitch
      const wx = m.settings.weather;
      g.textAlign = 'right'; g.font = font(14, 600); g.fillStyle = 'rgba(255,255,255,0.9)';
      g.fillText(`${wx.preset.toUpperCase()} · ${wx.time.toUpperCase()} · WIND ${V.flen(m.windNow).toFixed(1)} m/s`, W - 36 * u, y + 16 * u);
      g.fillStyle = '#9fe0a8'; g.fillText(`PITCH: ${m.surface.describe()}`, W - 36 * u, y + 38 * u);
      // Toasts
      let ty = 120 * u;
      for (const t of m.toasts) {
        const a = Math.min(1, (t.dur - t.t) * 2, t.t * 6);
        const big = t.kind === 'goal' || t.kind === 'big';
        g.globalAlpha = a; g.textAlign = 'center';
        g.font = font(big ? 44 : t.kind === 'manager' ? 17 : 20, big ? 800 : 600);
        const wdt = g.measureText(t.text).width + 40 * u;
        g.fillStyle = t.kind === 'manager' ? 'rgba(20,40,90,0.85)' : t.kind === 'warn' ? 'rgba(120,30,20,0.85)' : big ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.6)';
        const hh = big ? 64 * u : 34 * u;
        g.fillRect(W / 2 - wdt / 2, ty, wdt, hh);
        g.fillStyle = t.kind === 'goal' ? '#ffe14d' : '#fff';
        g.fillText(t.text, W / 2, ty + hh * 0.7);
        ty += hh + 8 * u;
        g.globalAlpha = 1;
      }
      // Player card
      const U = m.user;
      if (U) {
        const px = 36 * u, py = H - 128 * u;
        g.fillStyle = 'rgba(8,10,14,0.78)'; g.fillRect(px, py, 330 * u, 92 * u);
        g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = font(18, 700);
        g.fillText(`#${U.number} ${U.name}  ·  ${U.role}`, px + 14 * u, py + 26 * u);
        const bar = (label, v, yy, col) => {
          g.font = font(11, 600); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillText(label, px + 14 * u, yy + 9 * u);
          g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(px + 110 * u, yy, 200 * u, 10 * u);
          g.fillStyle = col; g.fillRect(px + 110 * u, yy, 200 * u * K.sat(v), 10 * u);
        };
        bar("SPRINT (D')", U.fat.d / U.fat.dMax, py + 38 * u, '#47d16c');
        bar('MATCH ENERGY', U.fat.gly, py + 54 * u, '#4fc3ff');
        bar('MUSCLE STRAIN', U.fat.strain, py + 70 * u, U.fat.strain > 0.5 ? '#ff4d4d' : '#ffb347');
        g.textAlign = 'right'; g.font = font(13, 600); g.fillStyle = '#ffe14d';
        g.fillText(`${(V.flen(U.vel) * 3.6).toFixed(1)} km/h${U.injured ? ' · INJURED' : ''}`, px + 316 * u, py + 26 * u);
      }
      if (m.settings.graphics.radar) this.drawRadar(m, u);
      if (m.settings.access.overlay) this.drawInputOverlay(m, u, font);
      if (m.state === 'halftime' || m.state === 'fulltime') this.drawStats(m, u, font);
    }

    drawRadar(m, u) {
      const g = this.g, W = this.c.width, H = this.c.height;
      const rw = 300 * u, rh = (rw * P.W) / P.L, rx = W / 2 - rw / 2, ry = H - rh - 24 * u;
      g.fillStyle = 'rgba(10,30,14,0.7)'; g.fillRect(rx, ry, rw, rh);
      g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1; g.strokeRect(rx, ry, rw, rh);
      g.beginPath(); g.moveTo(rx + rw / 2, ry); g.lineTo(rx + rw / 2, ry + rh); g.stroke();
      const map = (p) => ({ x: rx + ((p.x + P.HL) / P.L) * rw, y: ry + ((P.HW - p.y) / P.W) * rh });
      for (const p of m.players) {
        const q = map(p.pos);
        g.fillStyle = p === m.user ? '#ffe14d' : p.team.colour;
        g.beginPath(); g.arc(q.x, q.y, p === m.user ? 4.5 * u : 3.2 * u, 0, 6.283); g.fill();
      }
      const b = map(m.ball.pos);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(b.x, b.y, 2.6 * u, 0, 6.283); g.fill();
    }

    drawInputOverlay(m, u, font) {
      const g = this.g, W = this.c.width, H = this.c.height;
      const b = m.settings.input.bindings, down = m.kb.down;
      const ox = W - 380 * u, oy = H - 200 * u, k = 40 * u;
      g.fillStyle = 'rgba(8,10,14,0.72)'; g.fillRect(ox - 12 * u, oy - 34 * u, 370 * u, 214 * u);
      const key = (label, slot, x, y, w = 1) => {
        const on = down.has(b[slot]);
        g.fillStyle = on ? '#ffe14d' : 'rgba(255,255,255,0.12)';
        g.fillRect(ox + x * k, oy + y * k, w * k - 4 * u, k - 4 * u);
        g.fillStyle = on ? '#111' : '#fff'; g.font = font(13, 700); g.textAlign = 'center';
        g.fillText(label, ox + x * k + (w * k - 4 * u) / 2, oy + y * k + k * 0.62);
      };
      key(K.KEY_LABEL(b.shieldJockey), 'shieldJockey', 1, 0); key(K.KEY_LABEL(b.modifierContext), 'modifierContext', 2, 0);
      key(K.KEY_LABEL(b.through), 'through', 0.6, 1); key(K.KEY_LABEL(b.passLob), 'passLob', 1.6, 1); key(K.KEY_LABEL(b.shootTackle), 'shootTackle', 2.6, 1);
      key('SHIFT', 'strafeSwitch', 0, 2, 2); key('CTRL', 'sprint', 0, 3, 1.6);
      key('↑', 'up', 6, 2); key('←', 'left', 5, 3); key('↓', 'down', 6, 3); key('→', 'right', 7, 3);
      const o = m.lastOut || {};
      const ctx = m.context();
      g.textAlign = 'left'; g.font = font(12, 600); g.fillStyle = 'rgba(255,255,255,0.75)';
      g.fillText(`PHASE: ${ctx.phase.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}`, ox, oy - 14 * u);
      g.fillStyle = '#ffe14d';
      const intent = [o.sprint && o.sprint !== 'None' ? `${o.sprint.toUpperCase()} SPRINT` : '', o.strafe ? 'STRAFE' : '', o.shield ? 'SHIELD' : '',
        o.jockey ? 'JOCKEY' : '', o.contain ? 'CONTAIN' : '', o.teammateContain ? 'TEAMMATE CONTAIN' : '', o.rushKeeper ? 'RUSH GK' : '',
        o.holdBall ? 'HOLD BALL' : '', o.closeControl ? 'SKILL INPUT' : '', o.charging ? `${(K.ACTION_LABEL[o.charging] || o.charging).toUpperCase()} ${(o.chargePower * 100) | 0}%` : ''].filter(Boolean).join(' · ');
      g.fillText(intent || '—', ox + 3.4 * k, oy + 0.6 * k);
      const lc = m.lastCommand;
      if (lc && m.time - lc.t < 2.5) {
        g.fillStyle = '#4fc3ff'; g.font = font(14, 700);
        g.fillText(`▶ ${lc.text.toUpperCase()}`, ox + 3.4 * k, oy + 1.4 * k);
      }
    }

    drawStats(m, u, font) {
      const g = this.g, W = this.c.width, H = this.c.height;
      g.fillStyle = 'rgba(5,7,10,0.86)'; g.fillRect(W / 2 - 330 * u, H / 2 - 250 * u, 660 * u, 500 * u);
      g.textAlign = 'center'; g.fillStyle = '#ffe14d'; g.font = font(30, 800);
      g.fillText(m.state === 'halftime' ? 'HALF TIME' : 'FULL TIME', W / 2, H / 2 - 200 * u);
      g.fillStyle = '#fff'; g.font = font(26, 700);
      g.fillText(`${m.teams[0].name}  ${m.score[0]} – ${m.score[1]}  ${m.teams[1].name}`, W / 2, H / 2 - 155 * u);
      const st = m.stats, tot = st[0].poss + st[1].poss || 1;
      const dist = (t) => (m.teams[t].players.reduce((s, p) => s + p.fat.dist, 0) / 1000).toFixed(1);
      const rows = [
        ['Possession', `${Math.round((st[0].poss / tot) * 100)}%`, `${Math.round((st[1].poss / tot) * 100)}%`],
        ['Shots (on target)', `${st[0].shots} (${st[0].onTarget})`, `${st[1].shots} (${st[1].onTarget})`],
        ['Expected goals (xG)', st[0].xg.toFixed(2), st[1].xg.toFixed(2)],
        ['Passes completed', `${st[0].passOk}/${st[0].passes}`, `${st[1].passOk}/${st[1].passes}`],
        ['Tackles won', st[0].tackles, st[1].tackles], ['Saves', st[0].saves, st[1].saves],
        ['Fouls · Offsides · Corners', `${st[0].fouls} · ${st[0].offsides} · ${st[0].corners}`, `${st[1].fouls} · ${st[1].offsides} · ${st[1].corners}`],
        ['Distance covered (km)', dist(0), dist(1)],
      ];
      g.font = font(18, 600);
      rows.forEach((r, i) => {
        const yy = H / 2 - 95 * u + i * 36 * u;
        g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillText(r[0], W / 2, yy);
        g.fillStyle = '#fff'; g.fillText(String(r[1]), W / 2 - 220 * u, yy); g.fillText(String(r[2]), W / 2 + 220 * u, yy);
      });
      g.fillStyle = '#ffe14d'; g.font = font(16, 600);
      g.fillText(m.state === 'halftime' ? 'Press any key for the second half' : 'Press R for a rematch', W / 2, H / 2 + 225 * u);
    }

    drawPrematch(m, u, font) {
      const g = this.g, W = this.c.width, H = this.c.height;
      g.fillStyle = 'rgba(4,6,10,0.55)'; g.fillRect(0, 0, W, H);
      g.textAlign = 'center'; g.fillStyle = '#ffe14d'; g.font = font(18, 700);
      g.fillText('MATCHDAY · LIVE', W / 2, H * 0.2);
      g.fillStyle = '#fff'; g.font = font(64, 800);
      g.fillText('KINETIC XI', W / 2, H * 0.2 + 70 * u);
      g.font = font(28, 700);
      g.fillText(`${m.teams[0].name}  vs  ${m.teams[1].name}`, W / 2, H * 0.2 + 120 * u);
      g.font = font(15, 600); g.fillStyle = 'rgba(255,255,255,0.8)';
      const wx = m.settings.weather;
      g.fillText(`${wx.preset} · ${wx.time} · ${m.settings.gameplay.difficulty} · ${m.settings.gameplay.halfMinutes}-minute halves · Camera: ${m.settings.camera.preset}`, W / 2, H * 0.2 + 152 * u);
      [0, 1].forEach((t) => {
        const team = m.teams[t], x = t === 0 ? W / 2 - 300 * u : W / 2 + 300 * u;
        g.fillStyle = team.colour; g.fillRect(x - 130 * u, H * 0.2 + 172 * u, 260 * u, 6 * u);
        g.fillStyle = '#fff'; g.font = font(14, 600);
        team.players.forEach((p, i) => g.fillText(`${p.number}  ${p.name}  ·  ${p.role}`, x, H * 0.2 + (200 + i * 21) * u));
      });
      const conf = K.macConflicts(m.settings.input.bindings);
      g.font = font(15, 600);
      let yy = H * 0.64;
      g.fillStyle = '#ffe14d'; g.fillText('CONTROLS — exact MacBook layout', W / 2, yy);
      const lines = ['Move ↑←↓→ · Sprint Ctrl+Arrows · Pass S (tap) · Lob/Cross S (hold) · Through A · Lobbed Through Shift+A',
        'Shoot D · Finesse D+E · Driven Pass D+E · Skills E+Arrows · Shield W · Strafe Shift · Stop Ball Ctrl',
        'Defend: Change Shift · Jockey W · Contain E · Teammate Contain D · Slide S · Tackle W+D · Rush GK A',
        'Esc = Pause / Settings (graphics, sliders, camera, audio, accessibility, key remapping)'];
      g.fillStyle = '#fff'; g.font = font(13, 500);
      lines.forEach((l, i) => g.fillText(l, W / 2, yy + (24 + i * 20) * u));
      if (conf.length && conf[0].mac) {
        g.fillStyle = '#ff9b6a'; g.font = font(13, 600);
        g.fillText('Mac tip: Control+Arrow is owned by Mission Control — untick it in System Settings → Keyboard → Keyboard Shortcuts → Mission Control (or rebind Sprint in Esc → Controls).', W / 2, yy + 120 * u);
      }
      g.fillStyle = '#ffe14d'; g.font = font(22, 700);
      g.globalAlpha = 0.6 + 0.4 * Math.sin(this.t * 3);
      g.fillText('PRESS ANY KEY TO KICK OFF', W / 2, H * 0.88);
      g.globalAlpha = 1;
    }
  };
})(window.KXI);
