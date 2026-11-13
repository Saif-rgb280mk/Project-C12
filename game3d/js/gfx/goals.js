// KINETIC XI 3D — graphics
// goals.js : 3D goals with physics-reactive nets.
//   * Posts and crossbar: 12 cm painted-aluminium tubes (PBR), net support frame behind.
//   * Net: Verlet cloth (back + roof as one sheet, plus two side sheets). Edge particles are
//     pinned to the frame; interior particles have distance constraints to neighbours and a
//     spring back to rest. The ball pushes particles out of its volume, and a scored goal adds
//     an impulse ripple, so the net bulges and shivers on every goal.
'use strict';
(function (K) {
  const G = K.GFX, P = K.PITCH;
  const DEPTH = 2.0, TOP_BACK = 1.0, TOP_H = 2.3;

  function netTexture(T) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, 64, 64);
    g.strokeStyle = 'rgba(255,255,255,1)';
    g.lineWidth = 5;
    g.beginPath(); g.moveTo(0, 32); g.lineTo(64, 32); g.moveTo(32, 0); g.lineTo(32, 64); g.stroke();
    const t = new T.CanvasTexture(cv);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  /** A rectangular Verlet cloth sheet whose rest shape comes from fn(u, v) → Vector3. */
  class Cloth {
    constructor(T, nu, nv, fn, pinFn, mat, repU, repV) {
      this.T = T; this.nu = nu; this.nv = nv;
      this.rest = []; this.pos = []; this.prev = []; this.pin = [];
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
        const p = fn(i / (nu - 1), j / (nv - 1));
        this.rest.push(p.clone()); this.pos.push(p.clone()); this.prev.push(p.clone());
        this.pin.push(pinFn(i, j));
      }
      this.links = [];
      const idx = (i, j) => j * nu + i;
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
        if (i < nu - 1) this.links.push([idx(i, j), idx(i + 1, j), this.rest[idx(i, j)].distanceTo(this.rest[idx(i + 1, j)])]);
        if (j < nv - 1) this.links.push([idx(i, j), idx(i, j + 1), this.rest[idx(i, j)].distanceTo(this.rest[idx(i, j + 1)])]);
      }
      const geo = new T.PlaneGeometry(1, 1, nu - 1, nv - 1);
      const uv = geo.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * repU, uv.getY(k) * repV);
      this.geo = geo;
      this.mesh = new T.Mesh(geo, mat);
      this.mesh.frustumCulled = false;
      this.writeGeometry();
      this.active = 0;
    }
    writeGeometry() {
      // PlaneGeometry vertex order: rows from top (v = 1) to bottom; our j runs v 0 → 1.
      const a = this.geo.attributes.position;
      for (let j = 0; j < this.nv; j++) for (let i = 0; i < this.nu; i++) {
        const p = this.pos[j * this.nu + i];
        a.setXYZ((this.nv - 1 - j) * this.nu + i, p.x, p.y, p.z);
      }
      a.needsUpdate = true;
      this.geo.computeVertexNormals();
    }
    step(dt, ball, r) {
      const damp = 0.965, k = 30 * dt * dt, g = -1.2 * dt * dt;
      let moving = 0;
      for (let n = 0; n < this.pos.length; n++) {
        if (this.pin[n]) continue;
        const p = this.pos[n], q = this.prev[n], rs = this.rest[n];
        const vx = (p.x - q.x) * damp, vy = (p.y - q.y) * damp, vz = (p.z - q.z) * damp;
        q.copy(p);
        p.x += vx + (rs.x - p.x) * k;
        p.y += vy + (rs.y - p.y) * k + g;
        p.z += vz + (rs.z - p.z) * k;
        moving += Math.abs(vx) + Math.abs(vy) + Math.abs(vz);
      }
      for (let it = 0; it < 3; it++) {
        for (const [a, b, len] of this.links) {
          const pa = this.pos[a], pb = this.pos[b];
          const dx = pb.x - pa.x, dy = pb.y - pa.y, dz = pb.z - pa.z;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
          if (d <= len * 1.25) continue;   // nets are slack: only resist over-stretching
          const f = (d - len * 1.25) / d * 0.5;
          if (!this.pin[a]) { pa.x += dx * f; pa.y += dy * f; pa.z += dz * f; }
          if (!this.pin[b]) { pb.x -= dx * f; pb.y -= dy * f; pb.z -= dz * f; }
        }
        if (ball) {
          for (let n = 0; n < this.pos.length; n++) {
            if (this.pin[n]) continue;
            const p = this.pos[n];
            const dx = p.x - ball.x, dy = p.y - ball.y, dz = p.z - ball.z;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < r * r) {
              const d = Math.sqrt(d2) || 1e-6;
              const push = (r - d) / d;
              p.x += dx * push; p.y += dy * push; p.z += dz * push;
              moving += 1;
            }
          }
        }
      }
      return moving;
    }
    impulse(centre, radius, strength, dir) {
      for (let n = 0; n < this.pos.length; n++) {
        if (this.pin[n]) continue;
        const p = this.pos[n], q = this.prev[n];
        const d = p.distanceTo(centre);
        if (d < radius) {
          const f = (1 - d / radius) * strength;
          q.x -= dir.x * f; q.y -= dir.y * f; q.z -= dir.z * f;
        }
      }
      this.active = 3;
    }
  }

  G.Goals = class {
    constructor(engine) {
      const T = (this.T = engine.T);
      this.group = new T.Group();
      engine.scene.add(this.group);
      const tube = new T.MeshStandardMaterial({ color: '#f7f7f5', roughness: 0.28, metalness: 0.15 });
      const support = new T.MeshStandardMaterial({ color: '#d8dadc', roughness: 0.4, metalness: 0.5 });
      const netMat = new T.MeshStandardMaterial({ map: netTexture(T), alphaTest: 0.45, side: T.DoubleSide, roughness: 0.85, color: '#f2f2ee' });
      this.goals = [];
      const bar = (a, b, r, m) => {
        const d = b.clone().sub(a);
        const mesh = new T.Mesh(new T.CylinderGeometry(r, r, d.length(), 16), m);
        mesh.position.copy(a).add(b).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.group.add(mesh);
      };
      for (const s of [-1, 1]) {
        const gx = s * P.HL, hw = P.GOAL_HW, h = P.GOAL_H;
        const V3 = (x, y, z) => new T.Vector3(x, y, z);
        // Frame (three.js: Z = -sim y)
        bar(V3(gx, 0, -hw), V3(gx, h + 0.06, -hw), 0.06, tube);
        bar(V3(gx, 0, hw), V3(gx, h + 0.06, hw), 0.06, tube);
        bar(V3(gx, h, -hw - 0.06), V3(gx, h, hw + 0.06), 0.06, tube);
        for (const z of [-hw, hw]) {
          bar(V3(gx, h, z), V3(gx + s * TOP_BACK, TOP_H, z), 0.025, support);
          bar(V3(gx + s * TOP_BACK, TOP_H, z), V3(gx + s * DEPTH, 0.02, z), 0.025, support);
          bar(V3(gx, 0.02, z), V3(gx + s * DEPTH, 0.02, z), 0.025, support);
        }
        bar(V3(gx + s * DEPTH, 0.02, -hw), V3(gx + s * DEPTH, 0.02, hw), 0.025, support);
        bar(V3(gx + s * TOP_BACK, TOP_H, -hw), V3(gx + s * TOP_BACK, TOP_H, hw), 0.02, support);

        // Back + roof sheet: v runs from the ground bar (0) up the sloped back, then along the roof to the crossbar (1).
        const backLen = Math.hypot(DEPTH - TOP_BACK, TOP_H), roofLen = Math.hypot(TOP_BACK, h - TOP_H);
        const total = backLen + roofLen;
        const profile = (v) => {
          const d = v * total;
          if (d <= backLen) { const t = d / backLen; return [gx + s * (DEPTH - (DEPTH - TOP_BACK) * t), TOP_H * t]; }
          const t = (d - backLen) / roofLen;
          return [gx + s * (TOP_BACK - TOP_BACK * t), TOP_H + (h - TOP_H) * t];
        };
        const nu = 26, nv = 14;
        const main = new Cloth(T, nu, nv, (u, v) => { const [x, y] = profile(v); return V3(x, y, -hw + 2 * hw * u); },
          (i, j) => i === 0 || i === nu - 1 || j === 0 || j === nv - 1, netMat, (2 * hw) / 0.14, total / 0.14);
        this.group.add(main.mesh);
        // Side sheets: u from the goal line to the back, v from the ground up to the top edge.
        const sides = [-hw, hw].map((z) => {
          const sideTop = (u) => (u * DEPTH <= TOP_BACK ? h + (TOP_H - h) * (u * DEPTH / TOP_BACK) : TOP_H * (1 - (u * DEPTH - TOP_BACK) / (DEPTH - TOP_BACK)));
          const c = new Cloth(T, 9, 9, (u, v) => V3(gx + s * u * DEPTH, sideTop(u) * v, z),
            (i, j) => i === 0 || i === 8 || j === 0 || j === 8, netMat, DEPTH / 0.14, h / 0.14);
          this.group.add(c.mesh);
          return c;
        });
        this.goals.push({ side: s, cloths: [main].concat(sides) });
      }
      this.ballV = new T.Vector3();
    }

    /** ballSim: sim ball state; fx: effect events (a 'goal' adds a ripple impulse). */
    update(dt, ballSim, fx, ballScale) {
      const T = this.T;
      this.ballV.set(ballSim.pos.x, ballSim.pos.z, -ballSim.pos.y);
      for (const e of fx) {
        if (e.type !== 'goal') continue;
        const g = this.goals.find((q) => q.side === e.side);
        const centre = new T.Vector3(e.side * (P.HL + DEPTH * 0.7), K.clamp(e.z, 0.4, 2.2), -e.y);
        for (const c of g.cloths) c.impulse(centre, 2.6, 0.09, new T.Vector3(-e.side, 0, 0));
      }
      const r = 0.11 * ballScale + 0.05;
      for (const g of this.goals) {
        const near = Math.abs(this.ballV.x - g.side * (P.HL + 1)) < 2.6 && Math.abs(this.ballV.z) < P.GOAL_HW + 1.5;
        for (const c of g.cloths) {
          if (!near && c.active <= 0) continue;
          const moving = c.step(Math.min(dt, 1 / 30), near ? this.ballV : null, r);
          c.active = moving > 0.002 ? 3 : c.active - dt;
          c.writeGeometry();
        }
      }
    }
  };
})(window.KXI);
