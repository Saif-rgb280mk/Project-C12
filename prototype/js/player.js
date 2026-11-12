// KINETIC XI — Playable Prototype
// player.js : athletes. Locomotion (port of engine/src/locomotion.cpp: force–velocity
// propulsion, traction friction circle, plant-and-cut, gait clock), fatigue (port of
// engine/src/fatigue.cpp: D' balance + glycogen + strain) and two-bone leg IK
// (port of engine/src/foot_ik.cpp) used by the renderer to plant feet.
'use strict';
(function (K) {
  const V = K.V;

  /** Analytic two-bone IK: returns {knee, foot, reached}. */
  K.solveTwoBone = (hip, target, pole, l1, l2) => {
    const to = V.sub(target, hip);
    const raw = V.len(to);
    const u = raw > 1e-9 ? V.mul(to, 1 / raw) : { x: 0, y: 0, z: -1 };
    const d = K.clamp(raw, Math.abs(l1 - l2) + 1e-4, (l1 + l2) * 0.999);
    const tp = V.sub(pole, hip);
    let bend = V.sub(tp, V.mul(u, V.dot(tp, u)));
    bend = V.len(bend) > 1e-9 ? V.norm(bend) : { x: 1, y: 0, z: 0 };
    const c = K.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
    const s = Math.sqrt(Math.max(0, 1 - c * c));
    return { knee: V.add(hip, V.add(V.mul(u, l1 * c), V.mul(bend, l1 * s))), foot: V.add(hip, V.mul(u, d)), reached: raw <= (l1 + l2) * 0.999 };
  };

  K.Player = class {
    constructor(team, idx, role, base, attrs, name, number) {
      this.team = team; this.idx = idx; this.role = role; this.base = base;
      this.a = attrs; this.name = name; this.number = number;
      this.isGK = role === 'GK';
      this.pos = { x: 0, y: 0, z: 0 }; this.vel = { x: 0, y: 0, z: 0 };
      this.facing = team.attackSign > 0 ? 0 : Math.PI;
      this.stepPhase = Math.random(); this.nextFoot = 0; this.slip = 0; this.lean = 0; this.accT = 0;
      this.fat = { dMax: 180, d: 180, gly: 1, strain: 0, dist: 0, hsDist: 0, top: 0 };
      this.injured = false;
      this.action = null;      // {type, t, dur, dir, ...}
      this.touchCd = 0; this.contestCd = 0;
      this.cmd = { dir: { x: 0, y: 0, z: 0 }, sprint: 'None', strafe: false, strafeFacing: 0, hold: false, jockey: false, withBall: false, frac: null };
      this.target = null; this.runTarget = null; this.runTimer = Math.random() * 1.5;
      this.receive = null;     // {point, until}
      this.wrongFooted = 0;    // seconds of delayed reaction after a feint
      this.decisionTimer = 0;
    }

    mods(match) {
      const f = this.fat;
      if (!match.settings.gameplay.fatigue) return { top: 1, acc: 1, err: 1 };
      const dpf = f.d / f.dMax;
      let top = (0.8 + 0.2 * Math.sqrt(dpf)) * (0.94 + 0.06 * f.gly);
      let acc = (0.75 + 0.25 * dpf) * (0.92 + 0.08 * f.gly);
      let err = 1 + 0.6 * (1 - dpf) + 0.5 * (1 - f.gly);
      if (this.injured) { top *= 0.6; acc *= 0.5; err *= 1.4; }
      return { top, acc, err };
    }

    sliders(match) {
      const g = match.settings.gameplay, side = this.team.isUser ? 'user' : 'cpu';
      return {
        speed: K.sliderMul(g.sprintSpeed[side], 0.8, 1.2),
        accel: K.sliderMul(g.acceleration[side], 0.7, 1.3),
      };
    }

    targetSpeed(cmd, sc) {
      if (cmd.hold) return 0;
      let f = cmd.frac != null ? cmd.frac : 0.62;
      if (cmd.sprint === 'Controlled') f = Math.max(f, 0.8);
      if (cmd.sprint === 'Full') f = 1.0;
      if (cmd.withBall) f *= cmd.sprint === 'Full' ? 0.84 + 0.12 * this.a.dribbling : 0.93 + 0.05 * this.a.dribbling;
      if (cmd.strafe) f = Math.min(f, 0.45);
      if (cmd.jockey) f = Math.min(f, cmd.sprint === 'None' ? 0.42 : 0.6);
      return this.a.topSpeed * sc.top * f;
    }

    /** One locomotion tick. Returns a foot event {plant, foot, pos, impulse, shear, slipped}. */
    locomote(dt, traction, sc) {
      const cmd = this.cmd;
      const ev = { plant: false, slipped: false };
      const dir = V.fnorm(cmd.dir);
      const has = V.flen(dir) > 0;
      const vDes = V.mul(dir, has ? this.targetSpeed(cmd, sc) : 0);
      const v = V.flat(this.vel);
      const sp = V.flen(v);
      const cad = sp < 0.25 ? 0 : 1.6 + 0.32 * sp;
      const prev = this.stepPhase;
      this.stepPhase += cad * dt;
      const plant = Math.floor(this.stepPhase) > Math.floor(prev);

      const tHat = sp > 0.2 ? V.mul(v, 1 / sp) : has ? dir : V.fromHeading(this.facing);
      const dv = V.sub(vDes, v);
      const dvT = V.dot(dv, tHat);
      const dvN = V.sub(dv, V.mul(tHat, dvT));
      const dvNl = V.flen(dvN);
      const vmax = this.a.topSpeed * sc.top;
      const aTMax = dvT > 0 ? Math.max(0.6, this.a.accel * sc.acc * (1 - sp / (vmax * 1.02))) : this.a.decel * Math.sqrt(sc.acc);
      const fl = traction * K.G * 1.05;
      let aNMax = traction * K.G * (0.55 + 0.45 * this.a.agility);
      const turn = sp > 3 && has ? Math.acos(K.clamp(V.dot(tHat, dir), -1, 1)) : 0;
      if (turn > 0.7 && !plant) aNMax *= 0.35;
      const aT = K.clamp(dvT / dt, -aTMax, aTMax);
      const aN = Math.min(dvNl / dt, aNMax);
      let a = V.add(V.mul(tHat, aT), dvNl > 1e-9 ? V.mul(dvN, aN / dvNl) : { x: 0, y: 0, z: 0 });
      const dem = V.flen(a);
      if (dem > fl) {
        if (dem > fl * (1.15 + 0.35 * this.a.balance) && traction < 0.9 && this.slip <= 0) { this.slip = 0.35; ev.slipped = true; }
        a = V.mul(a, fl / dem);
      }
      if (this.slip > 0) { a = V.mul(a, 0.25); this.slip -= dt; }
      this.vel = V.add(v, V.mul(a, dt));
      this.pos = V.add(this.pos, V.mul(this.vel, dt));
      this.pos.z = 0;
      this.accT = V.dot(a, tHat);

      const ns = V.flen(this.vel);
      const turnTo = (target, rate) => {
        const d = K.wrapAngle(target - this.facing);
        this.facing = K.wrapAngle(this.facing + K.clamp(d, -rate * dt, rate * dt));
      };
      if (cmd.strafe || cmd.jockey) turnTo(cmd.strafeFacing, 8);
      else if (ns > 0.5) turnTo(V.heading(this.vel), 12 - 6 * K.sat(ns / Math.max(1, vmax)));
      else if (has) turnTo(V.heading(dir), 10);

      const left = V.fromHeading(this.facing + Math.PI / 2);
      this.lean = Math.atan2(V.dot(a, left), K.G);
      if (plant) {
        const foot = this.nextFoot; this.nextFoot ^= 1;
        ev.plant = true; ev.foot = foot;
        ev.pos = V.add(this.pos, V.mul(left, foot === 0 ? 0.11 : -0.11));
        ev.impulse = 75 * (1.5 + 0.35 * ns);
        ev.shear = K.sat(dem / Math.max(0.1, fl));
      }
      return ev;
    }

    /** Fatigue: D' (short-term) integrates in real seconds, glycogen in match seconds. */
    tire(dt, dtMatch, hardness, injurySlider, rng) {
      const f = this.fat, sp = V.flen(this.vel), st = this.a.stamina;
      const cs = 4.2 * (0.88 + 0.12 * f.gly);
      if (sp > cs) f.d -= (sp - cs) * dt * (1 + (0.25 * Math.max(0, this.accT)) / 4);
      else {
        const tau = ((546 * Math.exp(-0.5 * (cs - sp)) + 120) * (1.3 - 0.6 * st)) / 4;   // /4: short prototype halves
        f.d += ((f.dMax - f.d) / tau) * dt;
      }
      f.d = K.clamp(f.d, 0, f.dMax);
      f.gly = K.clamp(f.gly - dtMatch * (0.000045 + 0.000012 * sp * sp) * (1.2 - 0.4 * st), 0, 1);
      let load = 0;
      if (this.accT < -4.5) load += (-this.accT - 4.5) * 0.02;
      load += Math.max(0, sp / this.a.topSpeed - 0.9) * 0.15 * (2 - f.d / f.dMax);
      f.strain += load * dt * (0.8 + 0.4 * hardness) - (f.strain * dt) / 90;
      f.dist += sp * dt;
      if (sp > 5.5) f.hsDist += sp * dt;
      f.top = Math.max(f.top, sp);
      if (!this.injured && injurySlider > 0) {
        const mul = injurySlider <= 50 ? injurySlider / 50 : 1 + (2 * (injurySlider - 50)) / 50;
        // ~0.3–0.6 time-loss injuries per match across 22 players at slider 50.
        const hazard = 0.00008 * mul * (1 + 4 * Math.min(1, f.strain) ** 2) * (1 + 1.2 * (1 - f.d / f.dMax)) * 0.84; // per match-minute
        if (rng.next() < 1 - Math.exp((-hazard * dtMatch) / 60)) this.injured = true;
      }
    }

    footPoint() { return V.add(this.pos, V.fromHeading(this.facing, 0.3)); }
    busy() { return this.action && ['slide', 'fallen', 'dive', 'celebrate'].includes(this.action.type); }
  };

  /** Generates believable attributes per role, with deterministic variation. */
  K.makeAttributes = (role, quality, rng) => {
    const q = quality, r = () => rng.range(-0.06, 0.06);
    const base = {
      topSpeed: 8.6 + 0.8 * q + rng.range(-0.3, 0.4), accel: 7.4 + 0.9 * q + rng.range(-0.3, 0.3), decel: 8.3,
      agility: 0.62 + 0.25 * q + r(), balance: 0.65 + 0.2 * q + r(), dribbling: 0.6 + 0.25 * q + r(),
      passing: 0.62 + 0.25 * q + r(), shooting: 0.55 + 0.3 * q + r(), control: 0.62 + 0.25 * q + r(),
      tackling: 0.5 + 0.25 * q + r(), heading: 0.55 + 0.25 * q + r(), stamina: 0.65 + 0.25 * q + r(), gk: 0.2,
    };
    if (role === 'GK') Object.assign(base, { gk: 0.72 + 0.2 * q, topSpeed: 7.4, dribbling: 0.4, shooting: 0.3, tackling: 0.3 });
    if (['LCB', 'RCB', 'CB'].includes(role)) Object.assign(base, { tackling: 0.75 + 0.15 * q, heading: 0.78 + 0.15 * q, dribbling: 0.5, shooting: 0.4 });
    if (['LB', 'RB'].includes(role)) Object.assign(base, { tackling: 0.68 + 0.15 * q, topSpeed: base.topSpeed + 0.3, stamina: 0.8 });
    if (['CDM', 'LCM', 'RCM', 'CM'].includes(role)) Object.assign(base, { passing: 0.75 + 0.18 * q, stamina: 0.85, tackling: 0.65 });
    if (['LW', 'RW', 'LM', 'RM'].includes(role)) Object.assign(base, { dribbling: 0.78 + 0.17 * q, topSpeed: base.topSpeed + 0.5, accel: base.accel + 0.4 });
    if (['ST', 'LST', 'RST'].includes(role)) Object.assign(base, { shooting: 0.8 + 0.15 * q, heading: 0.72 + 0.15 * q, control: 0.75 });
    for (const k of Object.keys(base)) if (k !== 'topSpeed' && k !== 'accel' && k !== 'decel') base[k] = K.clamp(base[k], 0.2, 0.97);
    return base;
  };
})(window.KXI);
