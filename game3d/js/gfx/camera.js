// KINETIC XI 3D — graphics
// camera.js : camera direction.
//   menu      : slow fly-through orbit inside the bowl, under the roof (also half/full time)
//   Broadcast : touchline gantry that pans with play, leads the ball with its velocity,
//               widens when the ball is in the air and tightens near the box (dynamic zoom)
//   Tele      : higher, further, long lens (flattened, tactical)
//   celebrate : low tracking shot on the goal scorer
// Height and Zoom sliders (0–20) shape the gantry; all motion is critically damped. The rig
// writes the camera's ground heading back to the match so the arrow keys stay camera-relative.
'use strict';
(function (K) {
  const G = K.GFX, P = K.PITCH;

  G.CameraRig = class {
    constructor(engine) {
      const T = (this.T = engine.T);
      this.camera = engine.camera;
      this.eye = new T.Vector3(0, 30, 60);
      this.look = new T.Vector3();
      this.s = { tx: { v: 0 }, ty: { v: 0 }, fov: { v: 0 }, ex: { v: 0 }, ey: { v: 0 }, ez: { v: 0 }, lx: { v: 0 }, ly: { v: 0 }, lz: { v: 0 } };
      this.tx = 0; this.ty = 0; this.fov = 32;
      this.orbit = 0.6;
      this.time = 0;
      this.mode = 'menu';
    }

    snap() { this.snapNext = true; }

    update(match, settings, dt) {
      this.time += dt;
      const cs = settings.camera, b = match.ball;
      let mode = match.cam.mode;
      if (['prematch', 'halftime', 'fulltime'].includes(match.state)) mode = 'menu';
      if (match.cam.reset) { this.snapNext = true; match.cam.reset = false; }
      const eye = new this.T.Vector3(), look = new this.T.Vector3();
      let fov;
      if (mode === 'menu') {
        this.orbit += dt * 0.055;
        const a = this.orbit;
        // Low sweep inside the bowl, looking across to the opposite stand so the roof
        // trusses, floodlights and sky are in frame behind the pitch.
        eye.set(Math.cos(a) * 60, 19 + Math.sin(a * 0.7) * 3, Math.sin(a) * 42);
        look.set(Math.cos(a + Math.PI) * 30, 7, Math.sin(a + Math.PI) * 20);
        fov = 52;
      } else if (mode === 'celebrate' && match.celebrator) {
        const c = match.celebrator.pos;
        look.set(c.x, 1.3, -c.y);
        eye.set(c.x - 4.5 * Math.sign(c.x || 1), 2.6, -c.y + 7.5);
        fov = 34;
      } else {
        const tele = cs.preset === 'Tele';
        const hN = K.clamp(cs.height, 0, 20) / 20, zN = K.clamp(cs.zoom, 0, 20) / 20;
        const height = tele ? K.lerp(19, 34, hN) : K.lerp(14, 30, hN);
        const back = tele ? 56.5 : K.lerp(52, 45, zN);
        const fovBase = tele ? K.lerp(27, 15, zN) : K.lerp(42, 24, zN);
        const ax = K.clamp(b.pos.x + b.vel.x * 0.45, -P.HL + 9, P.HL - 9);
        const ay = K.clamp(b.pos.y * 0.42 + b.vel.y * 0.15, -P.HW * 0.6, P.HW * 0.6);
        const st = 1.2 * Math.pow(0.08 / 1.2, K.clamp(cs.tracking, 0, 20) / 20) + 0.15;
        if (this.snapNext) { this.tx = ax; this.ty = ay; this.s.tx.v = 0; this.s.ty.v = 0; }
        this.tx = K.smoothDamp(this.tx, ax, this.s.tx, st, dt);
        this.ty = K.smoothDamp(this.ty, ay, this.s.ty, st * 1.35, dt);
        const dyn = (b.pos.z > 6 ? 4 : 0) + (Math.abs(b.pos.x) > P.HL - 22 ? -2.5 : 0);
        fov = fovBase + dyn;
        eye.set(this.tx * 0.82, height, back);
        look.set(this.tx, 0.6, -this.ty);
      }
      // Damped eye / look / fov (snap on resets).
      const sm = mode === 'game' ? 0.12 : 0.6;
      if (this.snapNext || this.mode !== mode && mode === 'game') {
        this.eye.copy(eye); this.look.copy(look); this.fov = fov;
        for (const k of Object.keys(this.s)) this.s[k].v = 0;
        this.snapNext = false;
      } else {
        this.eye.x = K.smoothDamp(this.eye.x, eye.x, this.s.ex, sm, dt);
        this.eye.y = K.smoothDamp(this.eye.y, eye.y, this.s.ey, sm, dt);
        this.eye.z = K.smoothDamp(this.eye.z, eye.z, this.s.ez, sm, dt);
        this.look.x = K.smoothDamp(this.look.x, look.x, this.s.lx, sm, dt);
        this.look.y = K.smoothDamp(this.look.y, look.y, this.s.ly, sm, dt);
        this.look.z = K.smoothDamp(this.look.z, look.z, this.s.lz, sm, dt);
        this.fov = K.smoothDamp(this.fov, fov, this.s.fov, 0.7, dt);
      }
      this.mode = mode;
      const cam = this.camera;
      cam.position.copy(this.eye);
      // Handheld-style shake on big moments.
      if (match.cam.shake > 0 && cs.shake) {
        const k = 0.12 * match.cam.shake;
        cam.position.x += K.noise1(this.time * 7, 3) * k;
        cam.position.y += K.noise1(this.time * 6, 5) * k;
        match.cam.shake = Math.max(0, match.cam.shake - dt * 0.8);
      }
      cam.lookAt(this.look);
      if (Math.abs(cam.fov - this.fov) > 0.01) { cam.fov = this.fov; cam.updateProjectionMatrix(); }
      // Feed the camera heading back so input stays camera-relative (sim: x, y = -Z).
      match.cam.yaw = Math.atan2(-(this.look.z - this.eye.z), this.look.x - this.eye.x);
      match.cam.targetX = this.look.x;
    }
  };
})(window.KXI);
