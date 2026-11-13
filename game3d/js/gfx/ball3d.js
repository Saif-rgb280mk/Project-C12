// KINETIC XI 3D — graphics
// ball3d.js : detailed paneled football.
//   * Procedural equirectangular panel texture (curved seams, accent graphics, printed logo)
//     plus a seam normal map, on a clearcoated MeshPhysicalMaterial.
//   * Orientation integrates the simulation's angular velocity every frame, so curl
//     (Magnus sidespin), topspin dips and rolling contact are visible on the ball itself.
//   * Rendered at 1.15x real size for readability from the broadcast gantry.
'use strict';
(function (K) {
  const G = K.GFX;
  G.BALL_SCALE = 1.15;

  function panelCanvas() {
    const W = 1024, H = 512;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = '#f6f7f8'; g.fillRect(0, 0, W, H);
    // Six curved panels: seams are phase-shifted sine curves across the sphere.
    const seam = (phase, amp, colour, width) => {
      g.strokeStyle = colour; g.lineWidth = width; g.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const y = H / 2 + Math.sin((x / W) * Math.PI * 4 + phase) * amp;
        if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    };
    // Accent bands (original design: ember red + graphite + gold).
    for (let k = 0; k < 3; k++) {
      const x0 = (k / 3) * W;
      g.fillStyle = ['#d8262f', '#1c1f26', '#e3b448'][k];
      g.beginPath();
      g.moveTo(x0 + 40, H * 0.18);
      g.bezierCurveTo(x0 + 160, H * 0.05, x0 + 260, H * 0.5, x0 + 300, H * 0.82);
      g.bezierCurveTo(x0 + 230, H * 0.62, x0 + 140, H * 0.4, x0 + 40, H * 0.18);
      g.fill();
    }
    seam(0, 120, '#3a3f47', 5);
    seam(Math.PI / 2, 120, '#3a3f47', 5);
    seam(Math.PI, 70, '#3a3f47', 4);
    g.strokeStyle = '#3a3f47'; g.lineWidth = 4;
    for (let k = 0; k < 6; k++) { const x = (k / 6) * W + 85; g.beginPath(); g.moveTo(x, 40); g.lineTo(x + 30, H - 40); g.stroke(); }
    g.fillStyle = '#1c1f26';
    g.font = '800 34px Inter, Helvetica, Arial, sans-serif';
    g.fillText('KINETIC XI', W * 0.58, H * 0.47);
    g.font = '600 18px Inter, Helvetica, Arial, sans-serif';
    g.fillText('MATCH BALL · 2026', W * 0.58, H * 0.53);
    return cv;
  }

  function seamNormal(T, src) {
    // Derive a normal map from the seam darkness (seams are recessed).
    const W = 512, H = 256;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.drawImage(src, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H);
    const lum = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) lum[i] = (d.data[i * 4] + d.data[i * 4 + 1] + d.data[i * 4 + 2]) / 765;
    const out = g.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const at = (xx, yy) => lum[Math.min(H - 1, Math.max(0, yy)) * W + ((xx + W) % W)];
      const dx = (at(x + 1, y) - at(x - 1, y)) * 2.5, dy = (at(x, y + 1) - at(x, y - 1)) * 2.5;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * W + x) * 4;
      out.data[i] = (dx / l * 0.5 + 0.5) * 255; out.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; out.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; out.data[i + 3] = 255;
    }
    g.putImageData(out, 0, 0);
    const t = new T.CanvasTexture(cv);
    return t;
  }

  G.Ball3D = class {
    constructor(engine) {
      const T = (this.T = engine.T);
      const cv = panelCanvas();
      const map = new T.CanvasTexture(cv);
      map.colorSpace = T.SRGBColorSpace;
      map.anisotropy = 8;
      const mat = new T.MeshPhysicalMaterial({ map, normalMap: seamNormal(T, cv), normalScale: new T.Vector2(0.6, 0.6),
        roughness: 0.42, clearcoat: 0.75, clearcoatRoughness: 0.22 });
      this.mesh = new T.Mesh(new T.SphereGeometry(0.11 * G.BALL_SCALE, 48, 32), mat);
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;
      engine.scene.add(this.mesh);
      this.q = new T.Quaternion();
      this.axis = new T.Vector3();
      this.dq = new T.Quaternion();
    }

    sync(ball, dt) {
      const r = 0.11 * G.BALL_SCALE;
      this.mesh.position.set(ball.pos.x, Math.max(r, ball.pos.z + (r - 0.11)), -ball.pos.y);
      // Sim angular velocity (x, y, z-up) → three.js (x, z, -y), integrated as a quaternion.
      const wx = ball.spin.x, wy = ball.spin.z, wz = -ball.spin.y;
      const w = Math.hypot(wx, wy, wz);
      if (w > 1e-4) {
        this.axis.set(wx / w, wy / w, wz / w);
        this.dq.setFromAxisAngle(this.axis, w * dt);
        this.mesh.quaternion.premultiply(this.dq);
      }
    }
  };
})(window.KXI);
