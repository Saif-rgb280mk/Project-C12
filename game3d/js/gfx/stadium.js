// KINETIC XI 3D — graphics
// stadium.js : procedural stadium architecture.
//   * Two-tier bowl whose rows follow rounded-rectangle contours (continuous curved corners),
//     with treads, risers, aisles and seat colours (vertex colours, PBR).
//   * Upper-tier fascia carrying an LED ribbon board, concourse walls, soffit, back wall.
//   * Cantilevered roof with external steel trusses (instanced members) and an inner-edge
//     catwalk truss carrying ~200 floodlight lamps + four corner light clusters.
//   * Pitch-side LED advertising boards with scrolling, campaign-switching canvas textures.
//   * Dugouts, an exterior apron and an instanced 3D crowd (up to 24 000 spectators) that
//     stands and jumps with match excitement (vertex-shader animation, zero CPU cost).
'use strict';
(function (K) {
  const G = K.GFX, P = K.PITCH;
  const STAND_GAP = 7.5;           // metres from the pitch lines to the first row
  const LOWER = { start: 0, rows: 22, depth: 0.82, rise: 0.42, h0: 1.8 };
  const UPPER = { start: 15.5, rows: 18, depth: 0.9, rise: 0.62, h0: 15.8 };
  const ROOF_IN = 1, ROOF_OUT = 33, ROOF_Y_IN = 38.6, ROOF_Y_OUT = 41.2;
  const SEG = 8, EDGE_SUB = 10;

  /** Rounded rectangle offset `o` metres outward from the stand line. Points are CCW and
   *  index-aligned for every offset, so consecutive rows can be stitched into strips. */
  function contour(o) {
    const hx = P.HL + STAND_GAP + o, hz = P.HW + STAND_GAP + o, r = 10 + o;
    const corners = [[hx - r, hz - r, 0], [-(hx - r), hz - r, Math.PI / 2], [-(hx - r), -(hz - r), Math.PI], [hx - r, -(hz - r), 1.5 * Math.PI]];
    const pts = [];
    corners.forEach(([cx, cz, a0], k) => {
      for (let i = 0; i <= SEG; i++) {
        const a = a0 + (i / SEG) * (Math.PI / 2);
        pts.push({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, nx: Math.cos(a), nz: Math.sin(a) });
      }
      const last = pts[pts.length - 1];
      const n = corners[(k + 1) % 4];
      const na = n[2];
      const nxt = { x: n[0] + Math.cos(na) * r, z: n[1] + Math.sin(na) * r };
      for (let j = 1; j < EDGE_SUB; j++) {
        const t = j / EDGE_SUB;
        pts.push({ x: last.x + (nxt.x - last.x) * t, z: last.z + (nxt.z - last.z) * t, nx: last.nx, nz: last.nz });
      }
    });
    // Arc length parameter (for aisles and LED UVs).
    let s = 0;
    pts.forEach((p, i) => { if (i) s += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z); p.s = s; });
    pts.total = s + Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].z - pts[pts.length - 1].z);
    return pts;
  }

  /** Accumulates triangles into position/normal/colour/uv arrays. */
  class MeshBuilder {
    constructor() { this.p = []; this.n = []; this.c = []; this.uv = []; }
    quad(a, b, c, d, n, col, uvs) {
      for (const v of [a, b, c, a, c, d]) this.p.push(v[0], v[1], v[2]);
      for (let i = 0; i < 6; i++) { this.n.push(n[0], n[1], n[2]); this.c.push(col[0], col[1], col[2]); }
      const u = uvs || [[0, 0], [1, 0], [1, 1], [0, 1]];
      for (const k of [0, 1, 2, 0, 2, 3]) this.uv.push(u[k][0], u[k][1]);
    }
    /** Strip between two aligned contours (closed loop). nFn(i) returns the face normal. */
    strip(A, ya, B, yb, nFn, colFn, uvFn) {
      const N = A.length;
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N;
        const uvs = uvFn ? uvFn(i, j) : null;
        this.quad([A[i].x, ya, A[i].z], [A[j].x, ya, A[j].z], [B[j].x, yb, B[j].z], [B[i].x, yb, B[i].z], nFn(i), colFn(i), uvs);
      }
    }
    build(T) {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3));
      g.setAttribute('normal', new T.Float32BufferAttribute(this.n, 3));
      g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3));
      g.setAttribute('uv', new T.Float32BufferAttribute(this.uv, 2));
      g.computeBoundingSphere();
      return g;
    }
  }

  const SPONSORS = [
    ['KINETIC XI', '#0b0f16', '#ffe14d'], ['VOLTA ENERGY', '#00a86b', '#ffffff'], ['APEX BOOTS', '#111111', '#ff4d2e'],
    ['NORTHLINE AIR', '#0d47a1', '#ffffff'], ['HARBOUR BANK', '#f5d33b', '#0f2f6b'], ['SOLANO TELECOM', '#f28c28', '#111111'],
    ['PULSE SPORTS', '#d8262f', '#ffffff'], ['IRONVALE STEEL', '#2b2d42', '#8ec9f0'],
  ];

  G.Stadium = class {
    constructor(engine) {
      const T = (this.T = engine.T);
      this.engine = engine;
      this.group = new T.Group();
      engine.scene.add(this.group);
      this.uTime = { value: 0 };
      this.uExcite = { value: 0.15 };
      this.ledTime = 0;
      this.campaign = 0;
      this.buildApron();
      this.buildBowl();
      this.buildRoof();
      this.buildLED();
      this.buildDugouts();
      this.buildCrowd();
    }

    buildApron() {
      const T = this.T;
      const mat = new T.MeshStandardMaterial({ color: '#1e3a22', roughness: 0.95 });
      const apron = new T.Mesh(new T.PlaneGeometry(260, 200), mat);
      apron.rotation.x = -Math.PI / 2;
      apron.position.y = -0.03;
      apron.receiveShadow = true;
      this.group.add(apron);
      // Running track-style surround (synthetic) between the boards and the first row.
      const ring = new MeshBuilder();
      const A = contour(-STAND_GAP + 4.2), B = contour(0);
      ring.strip(A, 0.005, B, 0.005, () => [0, 1, 0], () => [0.16, 0.24, 0.17]);
      const m = new T.Mesh(ring.build(T), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
      m.receiveShadow = true;
      this.group.add(m);
    }

    buildBowl() {
      const T = this.T, mb = new MeshBuilder();
      const concrete = [0.32, 0.33, 0.36], darkConcrete = [0.13, 0.14, 0.16];
      const seatA = [0.09, 0.1, 0.12], seatB = [0.42, 0.06, 0.09], aisle = [0.46, 0.47, 0.5];
      const seatColour = (pts, i, row) => {
        const p = pts[i];
        if (p.s % 24 < 1.3) return aisle;                    // stairways every 24 m
        const sector = Math.floor((Math.atan2(p.z, p.x) + Math.PI) / (Math.PI / 6));
        const base = sector % 3 === 0 ? seatB : seatA;
        return row % 2 ? base : base.map((v) => v * 1.18);
      };
      const tier = (t) => {
        for (let r = 0; r < t.rows; r++) {
          const o = t.start + r * t.depth, h = t.h0 + r * t.rise;
          const A = contour(o), B = contour(o + t.depth);
          // Riser (faces the pitch) then tread (faces up).
          mb.strip(A, h - t.rise, A, h, (i) => [-A[i].nx, 0, -A[i].nz], () => concrete);
          mb.strip(A, h, B, h, () => [0, 1, 0], (i) => seatColour(A, i, r));
        }
        return { top: t.h0 + (t.rows - 1) * t.rise, back: t.start + t.rows * t.depth };
      };
      // Pitch-level front wall
      const F = contour(LOWER.start);
      mb.strip(F, 0, F, LOWER.h0 - LOWER.rise, (i) => [-F[i].nx, 0, -F[i].nz], () => darkConcrete);
      const lo = tier(LOWER);
      // Concourse wall behind the lower tier
      const CB = contour(lo.back);
      mb.strip(CB, lo.top, CB, 15.2, (i) => [-CB[i].nx, 0, -CB[i].nz], () => darkConcrete);
      // Upper tier soffit (underside of the overhang)
      const S0 = contour(UPPER.start), S1 = contour(lo.back);
      mb.strip(S1, 13.6, S0, 13.6, () => [0, -1, 0], () => darkConcrete);
      const up = tier(UPPER);
      // Back wall
      const BW = contour(up.back);
      mb.strip(BW, up.top, BW, up.top + 6.5, (i) => [-BW[i].nx, 0, -BW[i].nz], () => darkConcrete);
      // Exterior facade (seen from the menu fly-through)
      const EX = contour(ROOF_OUT + 0.5);
      mb.strip(EX, ROOF_Y_OUT, EX, 0, (i) => [EX[i].nx, 0, EX[i].nz], () => [0.2, 0.22, 0.25]);
      const mesh = new T.Mesh(mb.build(T), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.02 }));
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      this.group.add(mesh);
      this.lowerTop = lo; this.upperTop = up;
    }

    buildRoof() {
      const T = this.T;
      const A = contour(ROOF_IN), B = contour(ROOF_OUT);
      // Roof sheet
      const mb = new MeshBuilder();
      mb.strip(A, ROOF_Y_IN, B, ROOF_Y_OUT, () => [0, -1, 0], () => [0.17, 0.19, 0.22]);
      mb.strip(A, ROOF_Y_IN - 1.9, A, ROOF_Y_IN, (i) => [-A[i].nx, 0, -A[i].nz], () => [0.24, 0.26, 0.3]);   // fascia
      const roof = new T.Mesh(mb.build(T), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.55, side: T.DoubleSide }));
      roof.castShadow = true;
      roof.receiveShadow = true;
      this.group.add(roof);

      // Steel members: radial trusses above the roof + an inner-edge catwalk truss below it.
      const members = [];
      const add = (a, b, r) => members.push([a, b, r]);
      const v = (p, y) => new T.Vector3(p.x, y, p.z);
      for (let i = 0; i < A.length; i += 2) {
        const pin = A[i], pout = B[i];
        const yIn = ROOF_Y_IN + 0.3, yOut = ROOF_Y_OUT + 0.3;
        const top = (t) => new T.Vector3(pin.x + (pout.x - pin.x) * t, yIn + 1.6 + (yOut + 5.5 - yIn - 1.6) * t, pin.z + (pout.z - pin.z) * t);
        const bot = (t) => new T.Vector3(pin.x + (pout.x - pin.x) * t, yIn + (yOut - yIn) * t, pin.z + (pout.z - pin.z) * t);
        add(top(0), top(1), 0.22);
        add(bot(0), bot(1), 0.2);
        for (let k = 0; k <= 6; k++) {
          add(bot(k / 6), top(k / 6), 0.12);
          if (k < 6) add(bot(k / 6), top((k + 1) / 6), 0.1);
        }
      }
      for (let i = 0; i < A.length; i++) {
        const j = (i + 1) % A.length;
        add(v(A[i], ROOF_Y_IN - 1.9), v(A[j], ROOF_Y_IN - 1.9), 0.16);
        add(v(A[i], ROOF_Y_IN), v(A[j], ROOF_Y_IN), 0.16);
        add(v(A[i], ROOF_Y_IN - 1.9), v(A[j], ROOF_Y_IN), 0.08);
      }
      const geo = new T.CylinderGeometry(1, 1, 1, 6, 1);
      const steel = new T.MeshStandardMaterial({ color: '#a9b1bb', metalness: 0.85, roughness: 0.32 });
      const inst = new T.InstancedMesh(geo, steel, members.length);
      const m4 = new T.Matrix4(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), s = new T.Vector3();
      members.forEach(([a, b, r], k) => {
        const d = b.clone().sub(a);
        q.setFromUnitVectors(up, d.clone().normalize());
        s.set(r, d.length(), r);
        m4.compose(a.clone().add(b).multiplyScalar(0.5), q, s);
        inst.setMatrixAt(k, m4);
      });
      inst.castShadow = true;
      this.group.add(inst);

      // Floodlight lamps along the roof edge + 4 big corner clusters (emissive → bloom halos).
      const lamps = [];
      const edge = contour(ROOF_IN + 0.6);
      let acc = 0;
      for (let i = 0; i < edge.length; i++) {
        const j = (i + 1) % edge.length;
        const len = Math.hypot(edge[j].x - edge[i].x, edge[j].z - edge[i].z);
        for (let d = (2.4 - acc) % 2.4; d < len; d += 2.4) {
          const t = d / len;
          lamps.push({ pos: new T.Vector3(edge[i].x + (edge[j].x - edge[i].x) * t, ROOF_Y_IN - 2.3, edge[i].z + (edge[j].z - edge[i].z) * t), look: new T.Vector3(0, 0, 0), size: 1 });
        }
        acc = (acc + len) % 2.4;
      }
      // Corner clusters: a 4 x 3 grid of big lamps in the plane facing each spotlight's aim point.
      for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const centre = new T.Vector3(sx * 57.5, 36.4, sz * 39);
        const aim = new T.Vector3(-sx * 16, 0, -sz * 9);
        const fwd = aim.clone().sub(centre).normalize();
        const right = new T.Vector3().crossVectors(fwd, new T.Vector3(0, 1, 0)).normalize();
        const upv = new T.Vector3().crossVectors(right, fwd).normalize();
        for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) {
          const p = centre.clone().addScaledVector(right, (a - 1.5) * 1.5).addScaledVector(upv, (b - 1) * 0.9);
          lamps.push({ pos: p, look: p.clone().add(fwd), size: 1.5 });
        }
      }
      const lampGeo = new T.BoxGeometry(0.9, 0.55, 0.25);
      this.lampMat = new T.MeshStandardMaterial({ color: '#1a1a1a', emissive: '#fff4dc', emissiveIntensity: 10, roughness: 0.4 });
      const lampMesh = new T.InstancedMesh(lampGeo, this.lampMat, lamps.length);
      const o = new T.Object3D();
      lamps.forEach((l, k) => { o.position.copy(l.pos); o.lookAt(l.look); o.scale.setScalar(l.size); o.updateMatrix(); lampMesh.setMatrixAt(k, o.matrix); });
      this.group.add(lampMesh);
      this.lampCount = lamps.length;
    }

    makeLEDTexture(campaign) {
      const T = this.T;
      const cv = this.ledCanvas || (this.ledCanvas = document.createElement('canvas'));
      cv.width = 2048; cv.height = 128;
      const g = cv.getContext('2d');
      const panelW = 256;
      for (let i = 0; i < cv.width / panelW; i++) {
        const [name, bg, fg] = SPONSORS[(i + campaign * 3) % SPONSORS.length];
        const x = i * panelW;
        const grad = g.createLinearGradient(x, 0, x + panelW, 128);
        grad.addColorStop(0, bg); grad.addColorStop(1, campaign % 2 ? fg : bg);
        g.fillStyle = grad; g.fillRect(x, 0, panelW, 128);
        g.fillStyle = campaign % 2 ? bg : fg;
        g.font = '800 46px Inter, "Helvetica Neue", Arial, sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        const words = name.split(' ');
        if (g.measureText(name).width > panelW - 20 && words.length > 1) {
          g.font = '800 34px Inter, "Helvetica Neue", Arial, sans-serif';
          g.fillText(words[0], x + panelW / 2, 44); g.fillText(words.slice(1).join(' '), x + panelW / 2, 88);
        } else g.fillText(name, x + panelW / 2, 66);
      }
      // LED pixel grid
      g.fillStyle = 'rgba(0,0,0,0.28)';
      for (let x = 0; x < cv.width; x += 4) g.fillRect(x, 0, 1, cv.height);
      for (let y = 0; y < cv.height; y += 4) g.fillRect(0, y, cv.width, 1);
      if (!this.ledTex) {
        this.ledTex = new T.CanvasTexture(cv);
        this.ledTex.colorSpace = T.SRGBColorSpace;
        this.ledTex.wrapS = T.RepeatWrapping;
        this.ledTex.anisotropy = 4;
      }
      this.ledTex.needsUpdate = true;
      return this.ledTex;
    }

    buildLED() {
      const T = this.T;
      const tex = this.makeLEDTexture(0);
      const makeMat = (repeat) => {
        const t = tex.clone();
        t.needsUpdate = true;
        t.repeat.set(repeat, 1);
        this.ledTextures = (this.ledTextures || []).concat(t);
        return new T.MeshStandardMaterial({ color: '#050505', emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 2.4, roughness: 0.3 });
      };
      const back = new T.MeshStandardMaterial({ color: '#15171c', roughness: 0.7 });
      const board = (len, x, z, rotY) => {
        const g = new T.Group();
        const face = new T.Mesh(new T.PlaneGeometry(len, 0.92), makeMat(len / 11));
        face.position.set(0, 0.56, 0.061);
        face.rotation.x = -0.08;
        const box = new T.Mesh(new T.BoxGeometry(len, 1.0, 0.12), back);
        box.position.y = 0.5;
        box.castShadow = true;
        g.add(face); g.add(box);
        g.position.set(x, 0, z);
        g.rotation.y = rotY;
        this.group.add(g);
      };
      // Faces point toward the pitch centre (local +Z after rotation).
      board(104, 0, -(P.HW + 4.2), 0);            // far touchline (faces the broadcast camera)
      board(104, 0, P.HW + 4.2, Math.PI);         // near touchline
      board(66, -(P.HL + 4.6), 0, Math.PI / 2);   // left goal line
      board(66, P.HL + 4.6, 0, -Math.PI / 2);     // right goal line
      // Ribbon board on the upper-tier fascia, all the way round the bowl.
      const R = contour(UPPER.start), mb = new MeshBuilder();
      mb.strip(R, 13.65, R, 15.15, (i) => [-R[i].nx, 0, -R[i].nz], () => [1, 1, 1],
        (i, j) => { const u0 = R[i].s / 14, u1 = (j === 0 ? R.total : R[j].s) / 14; return [[u0, 0], [u1, 0], [u1, 1], [u0, 1]]; });
      const ribbon = new T.Mesh(mb.build(T), makeMat(1));
      this.group.add(ribbon);
    }

    buildDugouts() {
      const T = this.T;
      const shell = new T.MeshStandardMaterial({ color: '#2a2e36', roughness: 0.6, metalness: 0.3 });
      const glass = new T.MeshPhysicalMaterial({ color: '#9fb8d0', roughness: 0.08, transmission: 0, transparent: true, opacity: 0.35, metalness: 0 });
      const seat = new T.MeshStandardMaterial({ color: '#b51f2c', roughness: 0.5 });
      for (const sx of [-1, 1]) {
        const g = new T.Group();
        const base = new T.Mesh(new T.BoxGeometry(9, 0.25, 2.2), shell); base.position.y = 0.12;
        const backW = new T.Mesh(new T.BoxGeometry(9, 2.2, 0.15), shell); backW.position.set(0, 1.1, -1.05);
        const roof = new T.Mesh(new T.CylinderGeometry(2.2, 2.2, 9, 20, 1, true, 0, Math.PI / 2), glass);
        roof.rotation.z = Math.PI / 2; roof.position.set(0, 0.2, 1.05); roof.rotation.y = Math.PI;
        const bench = new T.Mesh(new T.BoxGeometry(8.4, 0.45, 0.6), seat); bench.position.set(0, 0.47, -0.6);
        for (const m of [base, backW, bench]) { m.castShadow = true; m.receiveShadow = true; g.add(m); }
        g.add(roof);
        g.position.set(sx * 9, 0, -(P.HW + 2.6));
        this.group.add(g);
      }
    }

    buildCrowd() {
      const T = this.T;
      // Seat positions on every tread of both tiers, facing the pitch.
      const seats = [];
      for (const t of [LOWER, UPPER]) {
        for (let r = 0; r < t.rows; r++) {
          const pts = contour(t.start + r * t.depth + t.depth * 0.55);
          const h = t.h0 + r * t.rise;
          for (let i = 0; i < pts.length; i++) {
            const j = (i + 1) % pts.length;
            const len = Math.hypot(pts[j].x - pts[i].x, pts[j].z - pts[i].z);
            for (let d = 0; d < len; d += 0.64) {
              const tt = d / len;
              const s = pts[i].s + d;
              if (s % 24 < 1.6) continue;   // keep the aisles clear
              seats.push({ x: pts[i].x + (pts[j].x - pts[i].x) * tt, y: h, z: pts[i].z + (pts[j].z - pts[i].z) * tt, nx: pts[i].nx, nz: pts[i].nz });
            }
          }
        }
      }
      // Deterministic shuffle so lower densities still look evenly spread.
      const rng = new K.Rng(77);
      for (let i = seats.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [seats[i], seats[j]] = [seats[j], seats[i]]; }
      const max = Math.min(24000, seats.length);
      this.maxCrowd = max;

      // Spectator mesh: torso + head (+ shoulders), merged, with a per-vertex body/head flag.
      const body = new T.CylinderGeometry(0.19, 0.23, 0.6, 7, 1).toNonIndexed();
      body.translate(0, 0.47, 0);
      const shoulders = new T.BoxGeometry(0.5, 0.12, 0.2).toNonIndexed();
      shoulders.translate(0, 0.74, 0);
      const head = new T.IcosahedronGeometry(0.115, 0).toNonIndexed();
      head.translate(0, 0.93, 0.02);
      const parts = [[body, 1], [shoulders, 1], [head, 0]];
      let n = 0;
      for (const [g] of parts) n += g.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), part = new Float32Array(n);
      let off = 0;
      for (const [g, flag] of parts) {
        pos.set(g.attributes.position.array, off * 3);
        nor.set(g.attributes.normal.array, off * 3);
        part.fill(flag, off, off + g.attributes.position.count);
        off += g.attributes.position.count;
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
      geo.setAttribute('aPart', new T.BufferAttribute(part, 1));
      const phase = new Float32Array(max), skin = new Float32Array(max * 3);
      const skins = [[0.96, 0.8, 0.69], [0.87, 0.67, 0.52], [0.72, 0.52, 0.38], [0.55, 0.38, 0.26], [0.36, 0.24, 0.16]];
      for (let i = 0; i < max; i++) {
        phase[i] = rng.next();
        const s = skins[Math.floor(rng.next() * skins.length)];
        skin.set(s, i * 3);
      }
      geo.setAttribute('aPhase', new T.InstancedBufferAttribute(phase, 1));
      geo.setAttribute('aSkin', new T.InstancedBufferAttribute(skin, 3));

      const mat = new T.MeshLambertMaterial({ color: '#ffffff' });
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = this.uTime;
        sh.uniforms.uExcite = this.uExcite;
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nattribute float aPart;\nattribute float aPhase;\nattribute vec3 aSkin;\nuniform float uTime;\nuniform float uExcite;')
          .replace('#include <color_vertex>', '#ifdef USE_INSTANCING_COLOR\n vColor = mix(aSkin, instanceColor.xyz, aPart);\n#endif')
          .replace('#include <begin_vertex>', `#include <begin_vertex>
            float jump = max(0.0, sin(uTime * (4.0 + aPhase * 3.0) + aPhase * 37.0));
            transformed.y += jump * jump * uExcite * 0.42 + sin(uTime * 1.3 + aPhase * 20.0) * 0.015;`);
      };
      const crowd = (this.crowd = new T.InstancedMesh(geo, mat, max));
      const o = new T.Object3D(), col = new T.Color();
      const shirts = ['#d8262f', '#d8262f', '#ffffff', '#1d5fd6', '#f5d33b', '#1a1a1a', '#3a3f4a', '#6d1a36', '#f28c28', '#2d6a4f', '#8a8f98'];
      for (let i = 0; i < max; i++) {
        const s = seats[i];
        o.position.set(s.x, s.y, s.z);
        o.rotation.set(0, Math.atan2(-s.nx, -s.nz), 0);
        const sc = 0.92 + rng.next() * 0.16;
        o.scale.set(sc, sc, sc);
        o.updateMatrix();
        crowd.setMatrixAt(i, o.matrix);
        // Home end leans to the home colours; mixed elsewhere.
        const pick = shirts[Math.floor(rng.next() * shirts.length)];
        crowd.setColorAt(i, col.set(pick).multiplyScalar(0.85 + rng.next() * 0.3));
      }
      crowd.instanceMatrix.needsUpdate = true;
      crowd.instanceColor.needsUpdate = true;
      crowd.frustumCulled = false;
      this.group.add(crowd);
    }

    setCrowdDensity(level) {
      const frac = { Low: 0.18, Medium: 0.4, High: 0.68, Ultra: 1.0 }[level] || 0.68;
      this.crowd.count = Math.floor(this.maxCrowd * frac);
    }

    setLampLevel(v) { this.lampMat.emissiveIntensity = v; }

    update(dt, excitement) {
      this.uTime.value += dt;
      this.uExcite.value += (K.clamp(excitement, 0.05, 1.4) - this.uExcite.value) * Math.min(1, dt * 2);
      this.ledTime += dt;
      for (const t of this.ledTextures) t.offset.x -= dt * 0.045;
      if (this.ledTime > 8) {
        this.ledTime = 0;
        this.campaign++;
        this.makeLEDTexture(this.campaign);
        for (const t of this.ledTextures) t.needsUpdate = true;
      }
    }
  };
})(window.KXI);
