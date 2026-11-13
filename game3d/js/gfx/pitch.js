// KINETIC XI 3D — graphics
// pitch.js : photoreal procedural pitch.
//   * Colour map (2048 px canvas): 20 mowing stripes + cross-cut checker, blade speckle,
//     worn goalmouths and centre circle, darker run-off.
//   * High-detail grass normal map (procedural blade height field → Sobel normals), tiled.
//   * Raised 3D white line geometry (lines, arcs, spots) with polygon offset.
//   * Live skid marks: slides and wet bounces are painted into the turf texture.
//   * Wet-pitch response: darker albedo, lower roughness, stronger floodlight reflections.
//   * Corner flags that wave in the wind.
'use strict';
(function (K) {
  const G = K.GFX, P = K.PITCH;
  const EXT_X = P.L + 14, EXT_Y = P.W + 12;   // grass plane (with run-off)

  G.Pitch = class {
    constructor(engine) {
      const T = (this.T = engine.T);
      this.engine = engine;
      this.group = new T.Group();
      engine.scene.add(this.group);
      this.canvas = document.createElement('canvas');
      this.canvas.width = 2048;
      this.canvas.height = Math.round(2048 * EXT_Y / EXT_X);
      this.paintTurf();
      this.colorTex = new T.CanvasTexture(this.canvas);
      this.colorTex.colorSpace = T.SRGBColorSpace;
      this.colorTex.anisotropy = engine.renderer.capabilities.getMaxAnisotropy();
      this.normalTex = this.makeNormalMap();
      this.mat = new T.MeshStandardMaterial({ map: this.colorTex, roughness: 0.9, metalness: 0, normalMap: this.normalTex, normalScale: new T.Vector2(0.55, 0.55) });
      const plane = new T.Mesh(new T.PlaneGeometry(EXT_X, EXT_Y), this.mat);
      plane.rotation.x = -Math.PI / 2;
      plane.receiveShadow = true;
      this.group.add(plane);
      this.buildLines();
      this.buildFlags();
      this.dirty = false;
      this.dirtyTimer = 0;
      this.wet = false;
      this.time = 0;
    }

    /** World (sim) metres → canvas pixels. */
    px(x, y) {
      return [((x + EXT_X / 2) / EXT_X) * this.canvas.width, (1 - (y + EXT_Y / 2) / EXT_Y) * this.canvas.height];
    }

    paintTurf() {
      const cv = this.canvas, g = cv.getContext('2d'), W = cv.width, H = cv.height;
      const ppm = W / EXT_X;
      g.fillStyle = '#2c6a2a';
      g.fillRect(0, 0, W, H);
      const [x0, y0] = this.px(-P.HL, P.HW), [x1, y1] = this.px(P.HL, -P.HW);
      // Mowing stripes along the length + a subtle cross-cut checkerboard.
      const n = 20;
      for (let i = 0; i < n; i++) {
        const sx = x0 + ((x1 - x0) * i) / n;
        g.fillStyle = i % 2 ? '#3a8634' : '#2f742c';
        g.fillRect(sx, y0 - 2, (x1 - x0) / n + 1, y1 - y0 + 4);
      }
      const m = 10;
      for (let j = 0; j < m; j++) {
        if (j % 2) continue;
        g.fillStyle = 'rgba(255,255,255,0.035)';
        g.fillRect(x0, y0 + ((y1 - y0) * j) / m, x1 - x0, (y1 - y0) / m);
      }
      // Blade speckle (fine colour variation).
      const rng = new K.Rng(5);
      for (let i = 0; i < 90000; i++) {
        const x = rng.next() * W, y = rng.next() * H;
        g.fillStyle = rng.next() < 0.5 ? 'rgba(20,50,18,0.16)' : 'rgba(150,200,110,0.08)';
        g.fillRect(x, y, 1 + rng.next() * 1.5, 1);
      }
      // Worn areas: goalmouths and centre circle.
      const wear = (x, y, rx, ry, a) => {
        const [cx, cy] = this.px(x, y);
        const grd = g.createRadialGradient(cx, cy, 0, cx, cy, rx * ppm);
        grd.addColorStop(0, `rgba(120,98,60,${a})`); grd.addColorStop(1, 'rgba(120,98,60,0)');
        g.save(); g.translate(cx, cy); g.scale(1, ry / rx); g.translate(-cx, -cy);
        g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, rx * ppm, 0, Math.PI * 2); g.fill(); g.restore();
      };
      wear(-P.HL + 3, 0, 5, 7, 0.35); wear(P.HL - 3, 0, 5, 7, 0.35);
      wear(-P.HL + 11, 0, 2, 2, 0.25); wear(P.HL - 11, 0, 2, 2, 0.25);
      wear(0, 0, 3, 3, 0.2);
      // Faint painted base under the 3D lines (keeps them readable at low resolution).
      g.strokeStyle = 'rgba(235,240,235,0.35)';
      g.lineWidth = 0.12 * ppm;
      g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    }

    makeNormalMap() {
      const T = this.T, N = 512;
      const h = new Float32Array(N * N);
      const rng = new K.Rng(11);
      // Height field: thousands of short vertical blade streaks + soft noise.
      for (let i = 0; i < 26000; i++) {
        const x = Math.floor(rng.next() * N), y = Math.floor(rng.next() * N);
        const len = 3 + Math.floor(rng.next() * 9), amp = 0.4 + rng.next() * 0.6, lean = rng.next() * 2 - 1;
        for (let k = 0; k < len; k++) {
          const xx = (x + Math.round(lean * k * 0.4) + N) % N, yy = (y + k) % N;
          h[yy * N + xx] += amp * (1 - k / len);
        }
      }
      const img = new ImageData(N, N);
      const s = 2.2;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const at = (xx, yy) => h[((yy + N) % N) * N + ((xx + N) % N)];
          const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
          const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
          let nx = -dx * s, ny = -dy * s, nz = 8;
          const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
          const i = (y * N + x) * 4;
          img.data[i] = (nx * 0.5 + 0.5) * 255; img.data[i + 1] = (ny * 0.5 + 0.5) * 255; img.data[i + 2] = (nz * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
        }
      }
      const cv = document.createElement('canvas'); cv.width = cv.height = N;
      cv.getContext('2d').putImageData(img, 0, 0);
      const tex = new T.CanvasTexture(cv);
      tex.wrapS = tex.wrapT = T.RepeatWrapping;
      tex.repeat.set(EXT_X / 2.4, EXT_Y / 2.4);
      tex.anisotropy = this.engine.renderer.capabilities.getMaxAnisotropy();
      return tex;
    }

    buildLines() {
      const T = this.T;
      const pos = [], w = 0.12, y = 0.012;
      const quad = (ax, ay, bx, by) => {   // sim coords → a flat strip of width w
        const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy), nx = (-dy / l) * (w / 2), ny = (dx / l) * (w / 2);
        const v = [[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]];
        for (const k of [0, 2, 1, 0, 3, 2]) pos.push(v[k][0], y, -v[k][1]);
      };
      const arc = (cx, cy, r, a0, a1, seg = 48) => {
        for (let i = 0; i < seg; i++) {
          const t0 = a0 + ((a1 - a0) * i) / seg, t1 = a0 + ((a1 - a0) * (i + 1)) / seg;
          quad(cx + Math.cos(t0) * r, cy + Math.sin(t0) * r, cx + Math.cos(t1) * r, cy + Math.sin(t1) * r);
        }
      };
      const disc = (cx, cy, r) => arc(cx, cy, r / 2, 0, Math.PI * 2, 12);
      quad(-P.HL, -P.HW, P.HL, -P.HW); quad(P.HL, -P.HW, P.HL, P.HW); quad(P.HL, P.HW, -P.HL, P.HW); quad(-P.HL, P.HW, -P.HL, -P.HW);
      quad(0, -P.HW, 0, P.HW);
      arc(0, 0, P.CIRCLE_R, 0, Math.PI * 2, 72);
      disc(0, 0, 0.3);
      for (const s of [-1, 1]) {
        const gx = s * P.HL;
        quad(gx, -P.BOX_HW, gx - s * P.BOX_D, -P.BOX_HW); quad(gx - s * P.BOX_D, -P.BOX_HW, gx - s * P.BOX_D, P.BOX_HW); quad(gx - s * P.BOX_D, P.BOX_HW, gx, P.BOX_HW);
        quad(gx, -P.SIX_HW, gx - s * P.SIX_D, -P.SIX_HW); quad(gx - s * P.SIX_D, -P.SIX_HW, gx - s * P.SIX_D, P.SIX_HW); quad(gx - s * P.SIX_D, P.SIX_HW, gx, P.SIX_HW);
        const spot = gx - s * P.SPOT;
        disc(spot, 0, 0.3);
        const a = Math.acos((P.BOX_D - P.SPOT) / P.ARC_R);
        if (s > 0) arc(spot, 0, P.ARC_R, Math.PI - a, Math.PI + a, 24); else arc(spot, 0, P.ARC_R, -a, a, 24);
        for (const sy of [-1, 1]) {
          const a0 = s > 0 ? (sy > 0 ? Math.PI : Math.PI / 2) : (sy > 0 ? 1.5 * Math.PI : 0);
          arc(gx, sy * P.HW, 1, a0, a0 + Math.PI / 2, 8);
        }
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.computeVertexNormals();
      this.lineMat = new T.MeshStandardMaterial({ color: '#f3f5f2', roughness: 0.65, emissive: '#ffffff', emissiveIntensity: 0.012, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const lines = new T.Mesh(g, this.lineMat);
      lines.receiveShadow = true;
      this.group.add(lines);
    }

    buildFlags() {
      const T = this.T;
      this.flags = [];
      const pole = new T.MeshStandardMaterial({ color: '#f2f2f2', roughness: 0.4 });
      const cloth = new T.MeshStandardMaterial({ color: '#ffd23f', roughness: 0.8, side: T.DoubleSide });
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const g = new T.Group();
        const p = new T.Mesh(new T.CylinderGeometry(0.018, 0.018, 1.5, 8), pole);
        p.position.y = 0.75; p.castShadow = true;
        const geo = new T.PlaneGeometry(0.42, 0.3, 8, 1);
        geo.translate(0.21, 0, 0);
        const f = new T.Mesh(geo, cloth);
        f.position.y = 1.33; f.castShadow = true;
        g.add(p); g.add(f);
        g.position.set(sx * P.HL, 0, -sy * P.HW);
        this.group.add(g);
        this.flags.push(f);
      }
    }

    setDetail(level) {
      this.mat.normalMap = level === 'High-Detail' ? this.normalTex : null;
      this.mat.needsUpdate = true;
    }

    setWet(wet) {
      this.wet = wet;
      this.mat.color.set(wet ? '#a9b5a4' : '#ffffff');
      this.mat.roughness = wet ? 0.42 : 0.9;
      this.mat.envMapIntensity = wet ? 1.6 : 1.0;
      this.mat.needsUpdate = true;
    }

    /** Paints a skid/wear mark (sim coordinates). */
    mark(x, y, dir, length, width, alpha, colour = '92,74,44') {
      const g = this.canvas.getContext('2d');
      const ppm = this.canvas.width / EXT_X;
      const [cx, cy] = this.px(x, y);
      g.save();
      g.translate(cx, cy);
      g.rotate(-dir);
      g.fillStyle = `rgba(${colour},${alpha})`;
      g.beginPath();
      g.ellipse(0, 0, (length * ppm) / 2, (width * ppm) / 2, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
      this.dirty = true;
    }

    consume(fx) {
      for (const e of fx) {
        if (e.type === 'skid') this.mark(e.x, e.y, e.dir, 0.9, e.w, this.wet ? 0.2 : 0.12, this.wet ? '70,58,36' : '96,82,52');
        else if (e.type === 'bounce' && (e.wet > 0.6 || e.impact > 8)) this.mark(e.x, e.y, Math.atan2(e.vy, e.vx), 0.5, 0.22, e.wet > 0.6 ? 0.18 : 0.06, '40,60,30');
      }
    }

    update(dt, wind) {
      this.time += dt;
      this.dirtyTimer += dt;
      if (this.dirty && this.dirtyTimer > 0.3) { this.colorTex.needsUpdate = true; this.dirty = false; this.dirtyTimer = 0; }
      const ws = Math.hypot(wind.x, wind.y), wa = Math.atan2(-wind.y, wind.x);
      this.flags.forEach((f, i) => {
        f.rotation.y = -wa + Math.sin(this.time * (2 + ws * 0.4) + i) * 0.25;
        const pos = f.geometry.attributes.position;
        for (let k = 0; k < pos.count; k++) {
          const x = pos.getX(k);
          pos.setZ(k, Math.sin(this.time * 6 + x * 9 + i) * 0.04 * (x / 0.42) * (0.4 + ws * 0.1));
        }
        pos.needsUpdate = true;
      });
    }
  };
})(window.KXI);
