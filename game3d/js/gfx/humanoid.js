// KINETIC XI 3D — graphics
// humanoid.js : articulated 3D footballers with procedural animation.
//   Skeleton (Object3D hierarchy): root → hips → { torso → { neck, head, shoulders → elbows →
//   hands }, hipL/R → knees → ankles → boots }. Capsule/sphere PBR meshes for skin, shirt,
//   shorts, socks and boots; a canvas-textured shirt number on the back; long sleeves and
//   gloves for goalkeepers.
//   Animation is computed every frame from the SIMULATION state (velocity, gait phase,
//   lean, action) — run/sprint cycles are phase-locked to the simulation's foot plants —
//   and every joint is critically damped toward its target, so actions blend smoothly.
'use strict';
(function (K) {
  const G = K.GFX, V = K.V;
  let GEO = null;

  function geos(T) {
    if (GEO) return GEO;
    const cap = (r, l, s = 10) => new T.CapsuleGeometry(r, l, 4, s);
    GEO = {
      torso: cap(0.155, 0.34, 14), pelvis: cap(0.15, 0.1, 12), neck: new T.CylinderGeometry(0.055, 0.06, 0.12, 10),
      head: new T.SphereGeometry(0.105, 18, 14), hair: new T.SphereGeometry(0.109, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.36),
      hairBack: new T.SphereGeometry(0.108, 12, 8, Math.PI, Math.PI, Math.PI * 0.3, Math.PI * 0.42), eye: new T.SphereGeometry(0.012, 8, 6),
      upperArm: cap(0.05, 0.2), foreArm: cap(0.043, 0.19), hand: new T.SphereGeometry(0.048, 10, 8),
      glove: new T.SphereGeometry(0.066, 10, 8), thigh: cap(0.07, 0.29), shortsLeg: new T.CylinderGeometry(0.088, 0.096, 0.2, 12),
      shin: cap(0.054, 0.31), boot: new T.BoxGeometry(0.1, 0.08, 0.27), number: new T.PlaneGeometry(0.21, 0.21),
    };
    GEO.boot.translate(0, -0.035, 0.06);
    // Sculpt athletic proportions into the primitive capsules (vertex shaping):
    // V-shaped torso (broad shoulders, narrow waist), tapered thighs, calf muscle.
    const shape = (geo, fn) => {
      const a = geo.attributes.position;
      for (let i = 0; i < a.count; i++) { const [x, y, z] = fn(a.getX(i), a.getY(i), a.getZ(i)); a.setXYZ(i, x, y, z); }
      geo.computeVertexNormals();
    };
    const ss = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
    shape(GEO.torso, (x, y, z) => { const k = 0.9 + 0.36 * ss(-0.2, 0.22, y); const c = 1 + 0.12 * ss(0.0, 0.18, y) * (z > 0 ? 1 : 0); return [x * k, y, z * c]; });
    shape(GEO.thigh, (x, y, z) => { const k = 0.82 + 0.3 * ss(-0.25, 0.15, y); return [x * k, y, z * k]; });
    shape(GEO.shin, (x, y, z) => { const k = 0.78 + 0.32 * Math.exp(-((y - 0.08) ** 2) / 0.012); return [x * k, y, z * (k * 1.05)]; });
    GEO.ear = new T.SphereGeometry(0.026, 8, 6);
    GEO.nose = new T.ConeGeometry(0.018, 0.045, 8);
    GEO.nose.rotateX(Math.PI / 2);
    return GEO;
  }

  function numberTexture(T, n, colour) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, 128, 128);
    g.fillStyle = colour;
    g.font = '800 92px Inter, "Helvetica Neue", Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(n), 64, 70);
    const t = new T.CanvasTexture(cv);
    t.colorSpace = T.SRGBColorSpace;
    return t;
  }

  const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

  G.Humanoid = class {
    /** kit: {shirt, trim, shorts, socks}; opts: {gk, skin, hair, boots, number} */
    constructor(T, kit, opts) {
      this.T = T;
      const g = geos(T);
      const mat = (c, r = 0.75, extra = {}) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: r }, extra));
      this.mats = {
        shirt: mat(kit.shirt, 0.72), trim: mat(kit.trim, 0.7), shorts: mat(kit.shorts, 0.68), socks: mat(kit.socks, 0.8),
        skin: mat(opts.skin, 0.55), hair: mat(opts.hair, 0.9), boots: mat(opts.boots || '#111111', 0.35, { metalness: 0.1 }),
        glove: mat('#f2f2f2', 0.6),
      };
      const M = (geo, m, parent, x = 0, y = 0, z = 0) => {
        const mesh = new T.Mesh(geo, m); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
      };
      const J = (parent, x = 0, y = 0, z = 0) => { const o = new T.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };

      const root = (this.root = new T.Group());
      root.rotation.order = 'YXZ';
      const hips = (this.hips = J(root, 0, 0.98, 0));
      M(g.pelvis, this.mats.shorts, hips, 0, -0.03, 0).scale.set(1.08, 1, 0.74);
      const torso = (this.torso = J(hips, 0, 0.02, 0));
      M(g.torso, this.mats.shirt, torso, 0, 0.32, 0).scale.set(1.13, 1, 0.68);
      M(g.neck, this.mats.skin, torso, 0, 0.64, 0);
      const head = (this.head = J(torso, 0, 0.7, 0));
      M(g.head, this.mats.skin, head, 0, 0.07, 0.005).scale.set(0.95, 1.12, 1.02);
      M(g.hair, this.mats.hair, head, 0, 0.075, -0.008).scale.set(0.97, 1.12, 1.04);
      M(g.hairBack, this.mats.hair, head, 0, 0.07, -0.006).scale.set(0.98, 1.12, 1.05);
      const eyeMat = this.mats.eye || (this.mats.eye = new T.MeshStandardMaterial({ color: '#1a1410', roughness: 0.3 }));
      M(g.eye, eyeMat, head, 0.036, 0.085, 0.098);
      M(g.eye, eyeMat, head, -0.036, 0.085, 0.098);
      M(g.ear, this.mats.skin, head, 0.1, 0.06, -0.005).scale.set(0.5, 1, 0.8);
      M(g.ear, this.mats.skin, head, -0.1, 0.06, -0.005).scale.set(0.5, 1, 0.8);
      M(g.nose, this.mats.skin, head, 0, 0.055, 0.112);
      const numTex = numberTexture(T, opts.number, kit.trim);
      const num = new T.Mesh(g.number, new T.MeshStandardMaterial({ map: numTex, transparent: true, roughness: 0.7, depthWrite: false }));
      num.position.set(0, 0.36, -0.112);
      num.rotation.y = Math.PI;
      torso.add(num);

      this.sh = []; this.el = [];
      for (const side of [1, -1]) {   // +1 = left (+X local), -1 = right
        const s = J(torso, side * 0.215, 0.55, 0);
        M(g.upperArm, this.mats.shirt, s, 0, -0.14, 0);
        const e = J(s, 0, -0.29, 0);
        M(g.foreArm, opts.gk ? this.mats.shirt : this.mats.skin, e, 0, -0.13, 0);
        M(opts.gk ? g.glove : g.hand, opts.gk ? this.mats.glove : this.mats.skin, e, 0, -0.29, 0);
        this.sh.push(s); this.el.push(e);
      }
      this.hip = []; this.kn = []; this.an = [];
      for (const side of [1, -1]) {
        const h = J(hips, side * 0.095, -0.06, 0);
        M(g.shortsLeg, this.mats.shorts, h, 0, -0.07, 0);
        M(g.thigh, this.mats.skin, h, 0, -0.22, 0);
        const k = J(h, 0, -0.44, 0);
        M(g.shin, this.mats.socks, k, 0, -0.2, 0);
        const a = J(k, 0, -0.42, 0);
        M(g.boot, this.mats.boots, a, 0, 0, 0);
        this.hip.push(h); this.kn.push(k); this.an.push(a);
      }
      // Current (damped) joint state.
      this.j = { hipsY: 0.98, torsoX: 0, torsoY: 0, torsoZ: 0, rootZ: 0, rootX: 0, headY: 0, headX: 0,
        shX: [0, 0], shZ: [0.1, -0.1], elX: [-0.3, -0.3], hipX: [0, 0], hipZ: [0, 0], knX: [0.1, 0.1], anX: [0, 0] };
      this.lift = 0;
    }

    setKit(kit) {
      this.mats.shirt.color.set(kit.shirt); this.mats.trim.color.set(kit.trim);
      this.mats.shorts.color.set(kit.shorts); this.mats.socks.color.set(kit.socks);
    }

    /** Computes the target pose from simulation state and blends toward it. */
    animate(p, m, dt, t) {
      const sp = V.flen(p.vel), a = K.clamp(sp / 8.5, 0, 1);
      const ph = (p.stepPhase || 0) * Math.PI;
      const sw = Math.sin(ph) * (0.1 + 0.8 * a);
      const tg = {
        hipsY: 0.98 - 0.035 * a + Math.abs(Math.sin(ph)) * 0.04 * a, torsoX: 0.04 + 0.22 * a, torsoY: Math.sin(ph) * 0.14 * a, torsoZ: 0,
        rootZ: -(p.lean || 0) * 0.55, rootX: 0, headY: 0, headX: -0.05 * a,
        shX: [sw * 0.85, -sw * 0.85], shZ: [0.12 + 0.05 * a, -0.12 - 0.05 * a], elX: [-(0.35 + 0.95 * a), -(0.35 + 0.95 * a)],
        hipX: [-sw, sw], hipZ: [0, 0],
        knX: [0.08 + Math.max(0, Math.cos(ph)) * (0.3 + 1.25 * a), 0.08 + Math.max(0, Math.cos(ph + Math.PI)) * (0.3 + 1.25 * a)],
        anX: [-0.2 * Math.sin(ph) * a, 0.2 * Math.sin(ph) * a],
      };
      let lift = 0;
      if (sp < 0.3) {   // idle breathing
        tg.torsoX = 0.03 + Math.sin(t * 1.7 + p.idx) * 0.012;
        tg.shZ = [0.14, -0.14]; tg.elX = [-0.25, -0.25];
      }
      // Look at the ball.
      const toBall = Math.atan2(m.ball.pos.y - p.pos.y, m.ball.pos.x - p.pos.x);
      tg.headY = K.clamp(K.wrapAngle(toBall - p.facing), -1.0, 1.0) * 0.7;
      const ballH = m.ball.pos.z - 1.6;
      tg.headX = K.clamp(-ballH / Math.max(2, V.fdist(p.pos, m.ball.pos)), -0.5, 0.35);

      const act = p.action;
      const ty = act && act.type;
      if (p.cmd && p.cmd.jockey && sp < 4 && !ty) {
        tg.hipsY = 0.9; tg.knX = [0.45, 0.45]; tg.hipX = [-0.25 + sw * 0.4, -0.25 - sw * 0.4]; tg.torsoX = 0.28; tg.shZ = [0.35, -0.35]; tg.elX = [-0.5, -0.5];
      }
      if (p.isGK && !ty && sp < 2.5 && m.state !== 'prematch') {
        const holding = m.gkHold && m.gkHold.gk === p;
        if (holding) { tg.shX = [-1.05, -1.05]; tg.elX = [-1.25, -1.25]; tg.shZ = [-0.15, 0.15]; tg.torsoX = 0.08; }
        else { tg.hipsY = 0.86; tg.knX = [0.5, 0.5]; tg.hipX = [-0.3, -0.3]; tg.torsoX = 0.3; tg.shX = [-0.55, -0.55]; tg.elX = [-0.7, -0.7]; tg.shZ = [0.35, -0.35]; }
      }
      if (m.restart && m.restart.taker === p && m.restart.kind === 'throw') {
        tg.shX = [-2.85, -2.85]; tg.elX = [-0.9, -0.9]; tg.shZ = [0.1, -0.1]; tg.torsoX = -0.15;
      }
      if (ty === 'kick') {
        const u = K.clamp(act.t / act.dur, 0, 1);
        if (act.header) {
          lift = Math.sin(Math.PI * u) * 0.32;
          tg.torsoX = 0.5 * Math.sin(Math.PI * u) - 0.25 * (1 - u); tg.headX = 0.35 * Math.sin(Math.PI * u);
          tg.knX = [0.7, 0.7]; tg.hipX = [-0.2, -0.2]; tg.shZ = [0.6, -0.6]; tg.shX = [-0.5, -0.5];
        } else {
          const R = 1;   // right leg kicks
          const thigh = u < 0.35 ? K.lerp(0, 0.9, u / 0.35) : u < 0.58 ? K.lerp(0.9, -1.3, (u - 0.35) / 0.23) : K.lerp(-1.3, -0.45, (u - 0.58) / 0.42);
          const knee = u < 0.35 ? K.lerp(0.2, 1.5, u / 0.35) : u < 0.58 ? K.lerp(1.5, 0.1, (u - 0.35) / 0.23) : K.lerp(0.1, 0.35, (u - 0.58) / 0.42);
          tg.hipX[R] = thigh; tg.knX[R] = knee; tg.hipX[0] = 0.12; tg.knX[0] = 0.32;
          tg.shZ = [0.75, -0.55]; tg.shX = [-0.45, 0.35]; tg.torsoX = u > 0.35 && u < 0.7 ? -0.12 : 0.1; tg.torsoY = -0.25 * Math.sin(Math.PI * u);
          tg.hipsY = 0.95;
        }
      } else if (ty === 'slide') {
        tg.hipsY = 0.33; tg.torsoX = -1.0; tg.hipX = [-0.65, -1.45]; tg.knX = [1.55, 0.1]; tg.shX = [0.85, 0.85]; tg.shZ = [0.5, -0.5]; tg.elX = [-0.2, -0.2]; tg.rootZ = 0;
      } else if (ty === 'fallen') {
        tg.hipsY = 0.2; tg.torsoX = -1.45; tg.hipX = [-1.4, -1.25]; tg.knX = [0.25, 0.4]; tg.shZ = [1.2, -1.2]; tg.shX = [0.2, 0.2]; tg.rootZ = 0;
      } else if (ty === 'dive') {
        const u = K.clamp(act.t / act.dur, 0, 1);
        const left = V.fromHeading(p.facing + Math.PI / 2);
        const side = Math.sign(V.dot(act.dir, left)) || 1;   // +1 = diving to his left (+X local)
        const e = Math.min(1, u * 2.2);
        tg.rootZ = -side * 1.3 * e;
        tg.hipsY = 0.95 + (act.high ? 0.35 : 0.05) * Math.sin(Math.PI * Math.min(1, u * 1.6)) - 0.45 * Math.max(0, u - 0.6);
        tg.shZ = [2.8 * (side > 0 ? 1 : 0.8), -2.8 * (side < 0 ? 1 : 0.8)]; tg.shX = [-0.3, -0.3]; tg.elX = [-0.1, -0.1];
        tg.hipX = [-0.2, 0.15]; tg.knX = [0.25, 0.4]; tg.torsoX = 0.05;
      } else if (ty === 'lunge') {
        tg.hipsY = 0.86; tg.hipX = [0.35, -1.05]; tg.knX = [0.55, 0.15]; tg.torsoX = 0.35; tg.shZ = [0.6, -0.6];
      } else if (ty === 'stumble') {
        tg.torsoX = 0.55; tg.shZ = [0.9, -0.9]; tg.shX = [-0.6, -0.6];
      } else if (ty === 'skill') {
        const u = K.clamp(act.t / act.dur, 0, 1), s = Math.sin(Math.PI * u);
        const dir = /Left/.test(act.name) ? 1 : /Right/.test(act.name) ? -1 : (Math.floor(act.t * 8) % 2 ? 1 : -1);
        tg.torsoZ = 0.35 * dir * s; tg.torsoY = 0.4 * dir * s; tg.hipZ = [0.45 * s * (dir > 0 ? 1 : 0), -0.45 * s * (dir < 0 ? 1 : 0)];
        tg.hipX[dir > 0 ? 0 : 1] = -0.5 * s; tg.knX[dir > 0 ? 0 : 1] = 0.6 * s; tg.hipsY = 0.93;
      }
      // Goal celebration: scoring team throws its arms up.
      if (m.state === 'goal' && m.celebrator && p.team === m.celebrator.team && !ty) {
        const w = Math.sin(t * 9 + p.idx);
        tg.shZ = [2.6 + 0.2 * w, -2.6 - 0.2 * w]; tg.elX = [-0.3, -0.3]; tg.shX = [-0.2, -0.2];
        if (p === m.celebrator) { tg.torsoX = -0.2; lift = Math.max(0, Math.sin(t * 7)) * 0.12; }
      }

      // Damped blend (fast for actions so kicks read crisply).
      const rate = ty === 'kick' || ty === 'dive' ? 40 : 16;
      const j = this.j;
      for (const k of ['hipsY', 'torsoX', 'torsoY', 'torsoZ', 'rootZ', 'rootX', 'headY', 'headX']) j[k] = damp(j[k], tg[k], rate, dt);
      for (const k of ['shX', 'shZ', 'elX', 'hipX', 'hipZ', 'knX', 'anX']) for (let i = 0; i < 2; i++) j[k][i] = damp(j[k][i], tg[k][i], rate, dt);
      this.lift = damp(this.lift, lift, 20, dt);

      // Apply.
      this.root.position.set(p.pos.x, this.lift, -p.pos.y);
      this.root.rotation.y = G.yawOf(p.facing);
      this.root.rotation.z = j.rootZ;
      this.hips.position.y = j.hipsY;
      this.torso.rotation.set(j.torsoX, j.torsoY, j.torsoZ);
      this.head.rotation.set(j.headX, j.headY, 0);
      for (let i = 0; i < 2; i++) {
        this.sh[i].rotation.set(j.shX[i], 0, j.shZ[i]);
        this.el[i].rotation.set(j.elX[i], 0, 0);
        this.hip[i].rotation.set(j.hipX[i], 0, j.hipZ[i]);
        this.kn[i].rotation.set(j.knX[i], 0, 0);
        this.an[i].rotation.set(j.anX[i], 0, 0);
      }
    }
  };

  /** All 22 players + the referee. Rebuilt when clubs/kits change. */
  G.Squad = class {
    constructor(engine) {
      this.T = engine.T;
      this.scene = engine.scene;
      this.group = new this.T.Group();
      this.scene.add(this.group);
      this.models = [];
      this.ref = null;
      this.refState = { pos: { x: -10, y: 10, z: 0 }, vel: { x: 0, y: 0, z: 0 }, facing: 0, stepPhase: 0, lean: 0, idx: 99, cmd: {} };
      this.key = '';
      this.time = 0;
    }

    build(match) {
      const T = this.T;
      const key = match.teams.map((t) => t.name + JSON.stringify(t.kit)).join('|');
      if (key === this.key) {
        this.models.forEach((h, i) => { h.player = match.players[i]; });
        return;
      }
      this.key = key;
      for (const h of this.models) this.group.remove(h.root);
      if (this.ref) this.group.remove(this.ref.root);
      this.models = [];
      const rng = new K.Rng(4321);
      const skins = ['#f1c7a5', '#e0ac87', '#c68e6a', '#a3714f', '#7d5236', '#5a3a26'];
      const hairs = ['#1c140f', '#2b1d14', '#4a3222', '#7a5a3a', '#b98b52', '#0d0d0d'];
      match.players.forEach((p) => {
        const kit = p.isGK ? p.team.gkKit : p.team.kit;
        const h = new G.Humanoid(T, kit, { gk: p.isGK, skin: rng.pick(skins), hair: rng.pick(hairs), number: p.number,
          boots: rng.pick(['#111111', '#f2f2f2', '#ff5a1f', '#1fb6ff', '#e9ff3b']) });
        h.player = p;
        this.group.add(h.root);
        this.models.push(h);
      });
      this.ref = new G.Humanoid(T, { shirt: '#151515', trim: '#f5d33b', shorts: '#151515', socks: '#151515' }, { skin: '#c68e6a', hair: '#1c140f', number: '' });
      this.group.add(this.ref.root);
    }

    update(match, dt) {
      this.time += dt;
      for (const h of this.models) h.animate(h.player, match, dt, this.time);
      // Referee: follows play on a diagonal behind the ball (presentation only).
      const r = this.refState, b = match.ball.pos;
      const target = { x: b.x - 9, y: K.clamp(b.y + 11, -K.PITCH.HW + 3, K.PITCH.HW - 3), z: 0 };
      const d = V.sub(target, r.pos), dist = V.flen(d);
      const want = dist > 0.5 ? V.mul(V.fnorm(d), Math.min(6.5, dist * 0.7)) : { x: 0, y: 0, z: 0 };
      r.vel = V.lerp(r.vel, want, Math.min(1, dt * 2));
      r.pos = V.add(r.pos, V.mul(r.vel, dt));
      r.stepPhase += (V.flen(r.vel) < 0.25 ? 0 : 1.6 + 0.32 * V.flen(r.vel)) * dt;
      if (V.flen(r.vel) > 0.4) r.facing = V.heading(r.vel); else r.facing = Math.atan2(b.y - r.pos.y, b.x - r.pos.x);
      this.ref.animate(r, match, dt, this.time);
    }
  };
})(window.KXI);
