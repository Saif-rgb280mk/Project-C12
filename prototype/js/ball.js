// KINETIC XI — Playable Prototype
// ball.js : true-inertia ball (port of engine/src/ball_physics.cpp) — drag crisis, Magnus,
// knuckle wobble, impulse bounces with spin transfer, skid→roll, rolling resistance — plus
// physics-solved aiming (the game asks "which launch hits that spot?" and the SAME physics
// answers, then human error is applied to the launch, never to the outcome).
'use strict';
(function (K) {
  const V = K.V;
  const BP = {
    m: 0.43, r: 0.11, kI: 2 / 3,
    cdSub: 0.47, cdSup: 0.17, reCrit: 2.4e5, reW: 2.5e4, maxCl: 0.38,
    knuckle: 0.14, knuckleSpin: 9, spinK0: 0.02, spinK1: 0.004,
  };
  BP.A = Math.PI * BP.r * BP.r;
  BP.I = BP.kI * BP.m * BP.r * BP.r;
  K.BALL = BP;

  K.newBall = () => ({
    pos: { x: 0, y: 0, z: BP.r }, vel: { x: 0, y: 0, z: 0 }, spin: { x: 0, y: 0, z: 0 },
    grounded: true, t: 0, seed: 1, roll: 0,
  });

  K.BallPhysics = class {
    constructor() {
      this.rho = 1.225;
      this.mu = 1.81e-5;
      this.wind = { x: 0, y: 0, z: 0 };
    }

    accel(s) {
      const vr = V.sub(s.vel, this.wind);
      const sp = V.len(vr);
      const a = { x: 0, y: 0, z: -K.G };
      if (sp < 1e-6) return a;
      const re = (this.rho * sp * 2 * BP.r) / this.mu;
      const cd = BP.cdSup + (BP.cdSub - BP.cdSup) / (1 + Math.exp((re - BP.reCrit) / BP.reW));
      const kd = (-0.5 * this.rho * cd * BP.A * sp) / BP.m;
      a.x += vr.x * kd; a.y += vr.y * kd; a.z += vr.z * kd;
      const w = V.len(s.spin);
      if (w > 1e-6) {
        const S = (BP.r * w) / sp;
        const cl = Math.min(S < 0.1 ? 1.5 * S : 0.09 + 0.6 * S, BP.maxCl);
        const dir = V.cross(V.mul(s.spin, 1 / w), V.mul(vr, 1 / sp));
        const km = (0.5 * this.rho * cl * BP.A * sp * sp) / BP.m;
        a.x += dir.x * km; a.y += dir.y * km; a.z += dir.z * km;
      }
      if (w < BP.knuckleSpin && sp > 8) {
        const z = (re - BP.reCrit) / (5 * BP.reW);
        const weight = (1 - w / BP.knuckleSpin) * Math.exp(-z * z);
        const vh = V.mul(vr, 1 / sp);
        const side = V.norm(V.cross(vh, { x: 0, y: 0, z: 1 }));
        const up = V.cross(side, vh);
        const tr = (s.t * sp) / 22;
        const n1 = K.noise1(tr, s.seed), n2 = 0.6 * K.noise1(tr, s.seed + 977);
        const kk = (0.5 * this.rho * BP.A * sp * sp * BP.knuckle * weight) / BP.m;
        a.x += (side.x * n1 + up.x * n2) * kk;
        a.y += (side.y * n1 + up.y * n2) * kk;
        a.z += (side.z * n1 + up.z * n2) * kk;
      }
      return a;
    }

    rk4(s, h) {
      const decay = (st) => -(BP.spinK0 + BP.spinK1 * V.len(st.vel));
      const mk = (st, d, dt) => ({
        pos: V.add(st.pos, V.mul(d.dp, dt)), vel: V.add(st.vel, V.mul(d.dv, dt)),
        spin: V.add(st.spin, V.mul(d.dw, dt)), t: st.t + dt, seed: st.seed,
      });
      const ev = (st) => ({ dp: st.vel, dv: this.accel(st), dw: V.mul(st.spin, decay(st)) });
      const k1 = ev(s), k2 = ev(mk(s, k1, h / 2)), k3 = ev(mk(s, k2, h / 2)), k4 = ev(mk(s, k3, h));
      const comb = (f) => V.mul(V.add(V.add(k1[f], V.mul(V.add(k2[f], k3[f]), 2)), k4[f]), h / 6);
      s.pos = V.add(s.pos, comb('dp'));
      s.vel = V.add(s.vel, comb('dv'));
      s.spin = V.add(s.spin, comb('dw'));
    }

    /** Advances the ball. Returns {bounced, impact}. surface may be null. */
    step(s, dt, surface, sub = 1 / 360) {
      const rep = { bounced: false, impact: 0 };
      const rc = { x: 0, y: 0, z: -BP.r };
      let rem = dt;
      while (rem > 1e-9) {
        const h = Math.min(sub, rem);
        const k = surface ? surface.coeffs(s.pos.x, s.pos.y) : { e: 0.68, mu: 0.55, crr: 0.08 };
        if (!s.grounded) {
          this.rk4(s, h);
          if (s.pos.z < BP.r) {
            s.pos.z = BP.r;
            if (s.vel.z < 0) {
              const imp = -s.vel.z;
              rep.bounced = true;
              rep.impact = Math.max(rep.impact, imp);
              const e = k.e * (1 - 0.15 * K.sat((imp - 5) / 20));
              const jn = BP.m * (1 + e) * imp;
              s.vel.z = e * imp;
              const vc = V.add(V.flat(s.vel), V.cross(s.spin, rc));
              const vcl = V.flen(vc);
              if (vcl > 1e-6) {
                const j = Math.min(vcl / (1 / BP.m + (BP.r * BP.r) / BP.I), k.mu * jn);
                const jt = V.mul(vc, -j / vcl);
                s.vel = V.add(s.vel, V.mul(jt, 1 / BP.m));
                s.spin = V.add(s.spin, V.mul(V.cross(rc, jt), 1 / BP.I));
              }
              s.spin.z *= 0.9;
              if (s.vel.z < 0.35) { s.vel.z = 0; s.grounded = true; }
            }
          }
        } else {
          const sp0 = V.flen(s.vel);
          if (sp0 < 1e-4 && Math.abs(s.spin.z) < 1e-3) {
            s.vel = { x: 0, y: 0, z: 0 };
            s.spin = { x: 0, y: 0, z: 0 };
          } else {
            const a = this.accel(s);
            s.vel.x += a.x * h; s.vel.y += a.y * h;   // drag + Magnus in the plane
            const vc = V.add(V.flat(s.vel), V.cross(s.spin, rc));
            const vcl = V.flen(vc);
            if (vcl > 0.02) {
              const j = Math.min(vcl / (1 / BP.m + (BP.r * BP.r) / BP.I), k.mu * BP.m * K.G * h);
              const jt = V.mul(vc, -j / vcl);
              s.vel = V.add(s.vel, V.mul(jt, 1 / BP.m));
              s.spin = V.add(s.spin, V.mul(V.cross(rc, jt), 1 / BP.I));
            } else {
              s.spin.x = -s.vel.y / BP.r;
              s.spin.y = s.vel.x / BP.r;
            }
            const sp = V.flen(s.vel);
            const dec = k.crr * K.G * h;
            if (sp <= dec) { s.vel.x = 0; s.vel.y = 0; s.spin.x = 0; s.spin.y = 0; }
            else { s.vel.x *= (sp - dec) / sp; s.vel.y *= (sp - dec) / sp; }
            const dz = Math.min(Math.abs(s.spin.z), 6 * h);
            s.spin.z -= Math.sign(s.spin.z) * dz;
          }
          s.pos.x += s.vel.x * h;
          s.pos.y += s.vel.y * h;
          s.pos.z = BP.r;
          s.vel.z = 0;
        }
        s.roll += V.len(s.spin) * h;
        s.t += h;
        rem -= h;
      }
      return rep;
    }

    /** Sets a strike: velocity + spin (the engine version derives spin from the contact offset). */
    strike(s, vel, spin, seed) {
      s.vel = V.copy(vel);
      s.spin = V.copy(spin || { x: 0, y: 0, z: 0 });
      s.grounded = vel.z <= 0.05 && s.pos.z <= BP.r + 0.01;
      s.t = 0;
      s.seed = seed | 0;
    }

    clone(s) {
      return { pos: V.copy(s.pos), vel: V.copy(s.vel), spin: V.copy(s.spin), grounded: s.grounded, t: s.t, seed: s.seed, roll: 0 };
    }

    /** Samples the future path every `every` seconds up to tMax (used by AI & keepers). */
    predict(s, surface, tMax = 3, every = 0.05) {
      const c = this.clone(s);
      const out = [{ t: 0, pos: V.copy(c.pos), vel: V.copy(c.vel) }];
      for (let t = every; t <= tMax + 1e-9; t += every) {
        this.step(c, every, surface, 1 / 120);
        out.push({ t, pos: V.copy(c.pos), vel: V.copy(c.vel) });
      }
      return out;
    }

    /** Fixed speed: solve yaw & pitch so the ball passes through `target` (shots, crosses). */
    solveAim(from, target, speed, spinFor, surface, iters = 7) {
      const d = V.sub(target, from);
      const D = Math.max(1, V.flen(d));
      const fwd = V.fnorm(d);
      const left = { x: -fwd.y, y: fwd.x, z: 0 };
      let yaw = V.heading(d);
      let pitch = Math.atan2((target.z || 0) - from.z + 0.5 * K.G * (D / speed) ** 2, D);
      let best = null;
      for (let i = 0; i < iters; i++) {
        const vel = { x: speed * Math.cos(pitch) * Math.cos(yaw), y: speed * Math.cos(pitch) * Math.sin(yaw), z: speed * Math.sin(pitch) };
        const spin = spinFor ? spinFor(vel) : { x: 0, y: 0, z: 0 };
        const s = { pos: V.copy(from), vel: V.copy(vel), spin: V.copy(spin), grounded: false, t: 0, seed: 0, roll: 0 };
        let prev = this.clone(s), hit = null;
        for (let n = 0; n < 600; n++) {
          prev = this.clone(s);
          this.step(s, 1 / 120, surface, 1 / 120);
          if (V.dot(V.sub(s.pos, from), fwd) >= D) {
            const a = V.dot(V.sub(prev.pos, from), fwd), b = V.dot(V.sub(s.pos, from), fwd);
            hit = V.lerp(prev.pos, s.pos, (D - a) / Math.max(1e-6, b - a));
            break;
          }
          if (V.flen(s.vel) < 0.3) break;
        }
        if (!hit) { pitch += 0.06; continue; }
        const lat = V.dot(V.sub(hit, target), left);
        const ht = hit.z - (target.z || 0);
        best = { vel, spin };
        if (Math.abs(lat) < 0.08 && Math.abs(ht) < 0.08) break;
        yaw -= Math.atan2(lat, D);
        pitch -= Math.atan2(ht, D) * 0.9;
      }
      return best || { vel: V.fromHeading(yaw, speed), spin: { x: 0, y: 0, z: 0 } };
    }

    /** Fixed launch angle: solve speed & yaw so the FIRST landing hits `target` (lobs). */
    solveLob(from, target, pitchAngle, spinFor, surface, iters = 7) {
      const d = V.sub(target, from);
      const D = Math.max(2, V.flen(d));
      let yaw = V.heading(d);
      let speed = Math.sqrt((K.G * D) / Math.max(0.2, Math.sin(2 * pitchAngle))) * 1.08;
      let res = null;
      for (let i = 0; i < iters; i++) {
        const vel = { x: speed * Math.cos(pitchAngle) * Math.cos(yaw), y: speed * Math.cos(pitchAngle) * Math.sin(yaw), z: speed * Math.sin(pitchAngle) };
        const spin = spinFor ? spinFor(vel) : { x: 0, y: 0, z: 0 };
        const s = { pos: V.copy(from), vel: V.copy(vel), spin: V.copy(spin), grounded: false, t: 0, seed: 0, roll: 0 };
        let land = null;
        for (let n = 0; n < 900; n++) {
          this.step(s, 1 / 120, surface, 1 / 120);
          if (s.vel.z < 0 && s.pos.z < 0.35) { land = s.pos; break; }
        }
        res = { vel, spin };
        if (!land) break;
        const fwd = V.fnorm(d), left = { x: -fwd.y, y: fwd.x, z: 0 };
        const along = V.dot(V.sub(land, from), fwd), lat = V.dot(V.sub(land, target), left);
        if (Math.abs(along - D) < 0.3 && Math.abs(lat) < 0.3) break;
        speed *= Math.sqrt(D / Math.max(1, along));
        speed = K.clamp(speed, 4, 38);
        yaw -= Math.atan2(lat, D);
      }
      return res;
    }
  };
})(window.KXI);
