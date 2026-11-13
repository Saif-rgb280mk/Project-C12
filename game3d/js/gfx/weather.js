// KINETIC XI 3D — graphics
// weather.js : rain. Thousands of wind-blown streaks in a volume that follows the camera's
// focus, plus splash rings that pop on the turf. Streak count scales with the graphics
// preset. The pitch itself gets wetter through the simulation's living-pitch hydrology.
'use strict';
(function (K) {
  const G = K.GFX;

  G.Rain = class {
    constructor(engine) {
      const T = (this.T = engine.T);
      this.max = 9000;
      this.count = 6000;
      this.pos = new Float32Array(this.max * 6);
      this.drops = [];
      for (let i = 0; i < this.max; i++) this.drops.push({ x: (Math.random() - 0.5) * 120, y: Math.random() * 42, z: (Math.random() - 0.5) * 90, v: 15 + Math.random() * 6 });
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(this.pos, 3));
      this.lines = new T.LineSegments(g, new T.LineBasicMaterial({ color: '#b7c6dd', transparent: true, opacity: 0.32, depthWrite: false, fog: true }));
      this.lines.frustumCulled = false;
      this.lines.visible = false;
      engine.scene.add(this.lines);
      // Splash rings (instanced, recycled).
      this.splashN = 160;
      this.splash = new T.InstancedMesh(new T.RingGeometry(0.03, 0.06, 10), new T.MeshBasicMaterial({ color: '#cfd9e8', transparent: true, opacity: 0.45, depthWrite: false }), this.splashN);
      this.splash.rotation.x = -Math.PI / 2;
      this.splash.frustumCulled = false;
      this.splash.visible = false;
      engine.scene.add(this.splash);
      this.splashData = Array.from({ length: this.splashN }, () => ({ x: 0, y: 0, t: 1 }));
      this.obj = new T.Object3D();
      this.centre = new T.Vector3();
    }

    setEnabled(on) { this.lines.visible = on; this.splash.visible = on; }
    setDensity(preset) { this.count = { Low: 2500, Medium: 4500, High: 6500, 'Ultra (MacBook Pro)': 9000 }[preset] || 6500; }

    update(dt, focus, wind) {
      if (!this.lines.visible) return;
      this.centre.lerp(focus, Math.min(1, dt * 2));
      const wx = wind.x, wz = -wind.y;
      const c = this.centre;
      for (let i = 0; i < this.count; i++) {
        const d = this.drops[i];
        d.y -= d.v * dt; d.x += wx * dt; d.z += wz * dt;
        if (d.y < 0) { d.y = 38 + Math.random() * 4; d.x = (Math.random() - 0.5) * 120; d.z = (Math.random() - 0.5) * 90; }
        const k = i * 6, len = 0.55;
        this.pos[k] = c.x + d.x; this.pos[k + 1] = d.y; this.pos[k + 2] = c.z + d.z;
        this.pos[k + 3] = c.x + d.x - wx * 0.03; this.pos[k + 4] = d.y + len; this.pos[k + 5] = c.z + d.z - wz * 0.03;
      }
      this.lines.geometry.setDrawRange(0, this.count * 2);
      this.lines.geometry.attributes.position.needsUpdate = true;
      // Splashes: respawn a few per frame around the focus.
      for (let s = 0; s < 6; s++) {
        const sp = this.splashData[(this.splashI = ((this.splashI || 0) + 1) % this.splashN)];
        sp.x = c.x + (Math.random() - 0.5) * 70; sp.y = c.z + (Math.random() - 0.5) * 50; sp.t = 0;
      }
      for (let i = 0; i < this.splashN; i++) {
        const sp = this.splashData[i];
        sp.t += dt * 2.5;
        const sc = sp.t < 1 ? 0.5 + sp.t * 2.5 : 0.001;
        this.obj.position.set(sp.x, -sp.y, 0.02);
        this.obj.scale.setScalar(sc);
        this.obj.updateMatrix();
        this.splash.setMatrixAt(i, this.obj.matrix);
      }
      this.splash.instanceMatrix.needsUpdate = true;
    }
  };
})(window.KXI);
