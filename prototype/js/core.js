// KINETIC XI — Playable Prototype
// core.js : namespace, pitch constants, vector helpers, deterministic RNG, noise.
// Plain browser JavaScript (no build step, no modules) so index.html opens from Finder.
'use strict';
window.KXI = window.KXI || {};

(function (K) {
  K.PITCH = {
    L: 105, W: 68, HL: 52.5, HW: 34,
    GOAL_HW: 3.66, GOAL_H: 2.44, GOAL_DEPTH: 2.0,
    BOX_D: 16.5, BOX_HW: 20.16, SIX_D: 5.5, SIX_HW: 9.16,
    SPOT: 11, CIRCLE_R: 9.15, ARC_R: 9.15,
  };
  K.G = 9.81;

  // ---- vectors: plain {x,y,z} objects (z up) ----
  const V = {
    v: (x = 0, y = 0, z = 0) => ({ x, y, z }),
    copy: (a) => ({ x: a.x, y: a.y, z: a.z || 0 }),
    add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: (a.z || 0) + (b.z || 0) }),
    sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) }),
    mul: (a, s) => ({ x: a.x * s, y: a.y * s, z: (a.z || 0) * s }),
    dot: (a, b) => a.x * b.x + a.y * b.y + (a.z || 0) * (b.z || 0),
    cross: (a, b) => ({
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    }),
    len: (a) => Math.sqrt(a.x * a.x + a.y * a.y + (a.z || 0) * (a.z || 0)),
    flen: (a) => Math.hypot(a.x, a.y),
    flat: (a) => ({ x: a.x, y: a.y, z: 0 }),
    norm: (a) => {
      const l = V.len(a);
      return l > 1e-9 ? { x: a.x / l, y: a.y / l, z: (a.z || 0) / l } : { x: 0, y: 0, z: 0 };
    },
    fnorm: (a) => {
      const l = Math.hypot(a.x, a.y);
      return l > 1e-9 ? { x: a.x / l, y: a.y / l, z: 0 } : { x: 0, y: 0, z: 0 };
    },
    dist: (a, b) => V.len(V.sub(a, b)),
    fdist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
    lerp: (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: (a.z || 0) + ((b.z || 0) - (a.z || 0)) * t }),
    heading: (a) => Math.atan2(a.y, a.x),
    fromHeading: (h, s = 1) => ({ x: Math.cos(h) * s, y: Math.sin(h) * s, z: 0 }),
    rotate: (a, ang) => {
      const c = Math.cos(ang), s = Math.sin(ang);
      return { x: a.x * c - a.y * s, y: a.x * s + a.y * c, z: a.z || 0 };
    },
  };
  K.V = V;

  K.clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  K.sat = (v) => K.clamp(v, 0, 1);
  K.lerp = (a, b, t) => a + (b - a) * t;
  K.smoothstep = (a, b, x) => {
    const t = K.sat((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  K.wrapAngle = (a) => {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a <= -Math.PI) a += 2 * Math.PI;
    return a;
  };
  /** Critically damped spring. state = {v}; returns new value. */
  K.smoothDamp = (current, target, state, smoothTime, dt) => {
    smoothTime = Math.max(0.0001, smoothTime);
    const omega = 2 / smoothTime;
    const x = omega * dt;
    const expo = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const change = current - target;
    const temp = (state.v + omega * change) * dt;
    state.v = (state.v - omega * temp) * expo;
    return target + (change + temp) * expo;
  };

  /** Mulberry32: tiny deterministic PRNG (replays, tests). */
  K.Rng = class {
    constructor(seed = 12345) { this.s = seed >>> 0; }
    next() {
      let t = (this.s += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    range(a, b) { return a + (b - a) * this.next(); }
    gauss() { return (this.next() + this.next() + this.next() + this.next() - 2) * 1.7320508; }
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  };

  K.hash01 = (n) => {
    n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
    n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
    n ^= n >>> 16;
    return (n >>> 0) / 4294967296;
  };
  K.noise1 = (t, seed) => {
    const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f);
    const a = K.hash01((seed * 7919 + i) | 0) * 2 - 1;
    const b = K.hash01((seed * 7919 + i + 1) | 0) * 2 - 1;
    return a + (b - a) * u;
  };
  K.noise2 = (x, y, seed) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const h = (a, b) => K.hash01((a * 73856093) ^ (b * 19349663) ^ (seed * 83492791)) * 2 - 1;
    const a = h(ix, iy) + (h(ix + 1, iy) - h(ix, iy)) * ux;
    const b = h(ix, iy + 1) + (h(ix + 1, iy + 1) - h(ix, iy + 1)) * ux;
    return a + (b - a) * uy;
  };

  /** Converts a world position into "team space": u along the attack direction
   *  (-1 own goal line .. +1 opponent goal line), v lateral (+1 = team's left). */
  K.toTeamSpace = (p, attackSign) => ({ u: (p.x * attackSign) / K.PITCH.HL, v: (p.y * attackSign) / K.PITCH.HW });
  K.fromTeamSpace = (u, v, attackSign) => ({ x: u * K.PITCH.HL * attackSign, y: v * K.PITCH.HW * attackSign, z: 0 });
})(window.KXI);
