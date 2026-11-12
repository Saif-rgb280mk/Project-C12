// KINETIC XI — Playable Prototype
// camera.js : broadcast camera rigs (port of engine/src/camera.cpp) + a real perspective
// projection with near-plane clipping, so the pitch is drawn in true 3D from a gantry.
'use strict';
(function (K) {
  const V = K.V, P = K.PITCH;

  K.rigParams = (c) => {
    const hS = 0.6 + 0.04 * c.height, zS = 0.6 + 0.04 * c.zoom;
    const smooth = 1.2 * Math.pow(0.08 / 1.2, K.clamp(c.tracking, 0, 20) / 20);
    switch (c.preset) {
      case 'Tele': return { h: 28 * hS, d: 58 * zS, fov: 20, look: 0.45, follow: 0.3, smooth };
      case 'CoOp': return { h: 24 * hS, d: 40 * zS, fov: 40, look: 0.25, follow: 0.25, smooth: smooth * 1.4 };
      case 'Pro': return { h: 3.2 * hS, d: 8 * zS, fov: 60, look: 0, follow: 1, smooth: smooth * 0.6, pro: true };
      case 'Custom': return { h: 6 + 1.7 * c.height, d: 20 + 2.5 * c.zoom, fov: 35, look: 0.3, follow: 0.5, smooth };
      default: return { h: 16 * hS, d: 30 * zS, fov: 32, look: 0.35, follow: 0.45, smooth };
    }
  };

  K.Camera = class {
    constructor() {
      this.eye = { x: 0, y: -60, z: 16 }; this.target = { x: 0, y: 0, z: 0 }; this.fov = 32;
      this.sx = { v: 0 }; this.sy = { v: 0 }; this.syaw = { v: 0 };
      this.tx = 0; this.ty = 0; this.yaw = 0; this.init = false;
      this.shake = 0; this.time = 0; this.mode = 'game'; this.cine = 0;
      this.w = 1; this.h = 1;
    }

    update(m, dt) {
      this.time += dt;
      const c = m.settings.camera;
      const p = K.rigParams(c);
      this.fov = p.fov;
      const ball = m.ball.pos, bv = m.ball.vel;
      if (this.mode === 'walkout') {   // pre-match sweep around the stadium
        this.cine += dt;
        const a = -Math.PI / 2 + Math.sin(this.cine * 0.25) * 0.9;
        this.eye = { x: Math.cos(a) * 75, y: Math.sin(a) * 70, z: 22 + 6 * Math.sin(this.cine * 0.4) };
        this.target = { x: 0, y: 0, z: 0 };
        this.fov = 42;
        return;
      }
      if (this.mode === 'celebrate' && m.celebrator) {   // low touchline shot of the scorer
        const s = m.celebrator.pos;
        this.tx = K.smoothDamp(this.tx, s.x, this.sx, 0.5, dt);
        this.ty = K.smoothDamp(this.ty, s.y, this.sy, 0.5, dt);
        this.target = { x: this.tx, y: this.ty, z: 1.2 };
        this.eye = { x: this.tx - 6, y: -(P.HW + 4), z: 3.5 };
        this.fov = 30;
        this.applyShake(m, dt, 0.06);
        return;
      }
      if (p.pro && m.user) {
        const u = m.user;
        const attackYaw = u.team.attackSign > 0 ? 0 : Math.PI;
        const desired = attackYaw + 0.2 * K.wrapAngle(u.facing - attackYaw);
        if (!this.init) { this.yaw = desired; this.init = true; }
        this.yaw = K.smoothDamp(this.yaw, this.yaw + K.wrapAngle(desired - this.yaw), this.syaw, 0.8, dt);
        const fwd = V.fromHeading(this.yaw);
        this.eye = V.add(V.sub(u.pos, V.mul(fwd, p.d)), { x: 0, y: 0, z: p.h });
        this.target = V.add(V.add(u.pos, V.mul(fwd, 10)), { x: 0, y: 0, z: 1 });
        this.applyShake(m, dt, 0.02);
        return;
      }
      const ax = K.clamp(ball.x + bv.x * p.look, -P.HL + 8, P.HL - 8);
      const ay = K.clamp((ball.y + bv.y * p.look) * p.follow, -P.HW, P.HW);
      if (!this.init) { this.tx = ax; this.ty = ay; this.init = true; }
      this.tx = K.smoothDamp(this.tx, ax, this.sx, p.smooth, dt);
      this.ty = K.smoothDamp(this.ty, ay, this.sy, p.smooth * 1.3, dt);
      this.target = { x: this.tx, y: this.ty, z: 0 };
      this.eye = { x: this.tx * 0.85, y: -(P.HW + p.d), z: p.h };
      this.applyShake(m, dt, 0.035);
    }

    applyShake(m, dt, amp) {
      const s = m.settings;
      if (!s.camera.shake || s.access.reduceShake) return;
      const t = this.time;
      const k = amp * (1 + this.shake * 6);
      this.eye = V.add(this.eye, { x: K.noise1(t * 0.9, 3) * k, y: K.noise1(t * 0.7, 5) * k, z: K.noise1(t * 1.1, 9) * k });
      this.shake = Math.max(0, this.shake - dt);
    }

    /** Heading of the camera's forward vector on the pitch (input is camera-relative). */
    yawForInput() { return Math.atan2(this.target.y - this.eye.y, this.target.x - this.eye.x); }

    setup(w, h) {
      this.w = w; this.h = h;
      this.f = V.norm(V.sub(this.target, this.eye));
      this.r = V.norm(V.cross(this.f, { x: 0, y: 0, z: 1 }));
      this.u = V.cross(this.r, this.f);
      this.focal = h / 2 / Math.tan((this.fov * Math.PI) / 360);
      this.near = 0.5;
    }
    toCam(p) {
      const d = { x: p.x - this.eye.x, y: p.y - this.eye.y, z: (p.z || 0) - this.eye.z };
      return { x: d.x * this.r.x + d.y * this.r.y + d.z * this.r.z, y: d.x * this.u.x + d.y * this.u.y + d.z * this.u.z, z: d.x * this.f.x + d.y * this.f.y + d.z * this.f.z };
    }
    camToScreen(c) {
      return { x: this.w / 2 + (c.x / c.z) * this.focal, y: this.h / 2 - (c.y / c.z) * this.focal, z: c.z, s: this.focal / c.z };
    }
    project(p) {
      const c = this.toCam(p);
      if (c.z < this.near) return null;
      return this.camToScreen(c);
    }
    /** Clips a 3D polygon against the near plane and projects it. */
    projectPoly(pts) {
      const cs = pts.map((p) => this.toCam(p));
      const out = [];
      for (let i = 0; i < cs.length; i++) {
        const a = cs[i], b = cs[(i + 1) % cs.length];
        const ain = a.z >= this.near, bin = b.z >= this.near;
        if (ain) out.push(a);
        if (ain !== bin) {
          const t = (this.near - a.z) / (b.z - a.z);
          out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: this.near });
        }
      }
      return out.map((c) => this.camToScreen(c));
    }
    projectSeg(a, b) {
      let ca = this.toCam(a), cb = this.toCam(b);
      if (ca.z < this.near && cb.z < this.near) return null;
      if (ca.z < this.near) { const t = (this.near - ca.z) / (cb.z - ca.z); ca = { x: ca.x + (cb.x - ca.x) * t, y: ca.y + (cb.y - ca.y) * t, z: this.near }; }
      if (cb.z < this.near) { const t = (this.near - cb.z) / (ca.z - cb.z); cb = { x: cb.x + (ca.x - cb.x) * t, y: cb.y + (ca.y - cb.y) * t, z: this.near }; }
      return [this.camToScreen(ca), this.camToScreen(cb)];
    }
  };
})(window.KXI);
