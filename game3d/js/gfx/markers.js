// KINETIC XI 3D — graphics
// markers.js : the subtle at-feet HUD.
//   * Ring under the controlled player: a stamina arc (sprint reserve D', green → amber → red)
//     on the left, and the power arc (blue for passes, orange for shots) on the right while a
//     button is charging, plus a facing notch.
//   * A small chevron ring under the teammate the pass assistance would pick right now.
'use strict';
(function (K) {
  const G = K.GFX, V = K.V;
  const PASS_TYPES = ['GroundPass', 'LobPass', 'Cross', 'ThroughPass', 'LobbedThroughPass', 'DrivenGroundPass', 'PassingHeader'];

  G.Markers = class {
    constructor(engine) {
      const T = (this.T = engine.T);
      this.cv = document.createElement('canvas'); this.cv.width = this.cv.height = 256;
      this.tex = new T.CanvasTexture(this.cv);
      this.tex.colorSpace = T.SRGBColorSpace;
      const mat = new T.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.92 });
      this.ring = new T.Mesh(new T.PlaneGeometry(1.9, 1.9), mat);
      this.ring.rotation.x = -Math.PI / 2;
      this.ring.renderOrder = 5;
      engine.scene.add(this.ring);
      const tcv = document.createElement('canvas'); tcv.width = tcv.height = 128;
      const g = tcv.getContext('2d');
      g.strokeStyle = '#4fc3ff'; g.lineWidth = 9;
      g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#4fc3ff';
      g.beginPath(); g.moveTo(64, 4); g.lineTo(80, 26); g.lineTo(48, 26); g.closePath(); g.fill();
      const ttex = new T.CanvasTexture(tcv); ttex.colorSpace = T.SRGBColorSpace;
      this.target = new T.Mesh(new T.PlaneGeometry(1.3, 1.3), new T.MeshBasicMaterial({ map: ttex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.8 }));
      this.target.rotation.x = -Math.PI / 2;
      this.target.renderOrder = 5;
      engine.scene.add(this.target);
      this.last = '';
      this.t = 0;
    }

    draw(stamina, power, charging, facingAngle) {
      const key = `${stamina.toFixed(2)}|${power.toFixed(2)}|${charging}|${facingAngle.toFixed(2)}`;
      if (key === this.last) return;
      this.last = key;
      const g = this.cv.getContext('2d'), c = 128;
      g.clearRect(0, 0, 256, 256);
      g.lineCap = 'round';
      // Base ring
      g.strokeStyle = 'rgba(255,225,77,0.85)'; g.lineWidth = 7;
      g.beginPath(); g.arc(c, c, 92, 0, Math.PI * 2); g.stroke();
      // Stamina arc (left half)
      g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 12;
      g.beginPath(); g.arc(c, c, 108, Math.PI * 0.6, Math.PI * 1.4); g.stroke();
      g.strokeStyle = stamina > 0.5 ? '#47d16c' : stamina > 0.25 ? '#ffc93c' : '#ff4d4d';
      g.lineWidth = 9;
      g.beginPath(); g.arc(c, c, 108, Math.PI * 1.4 - Math.PI * 0.8 * stamina, Math.PI * 1.4); g.stroke();
      // Power arc (right half)
      if (charging) {
        g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 12;
        g.beginPath(); g.arc(c, c, 108, -Math.PI * 0.4, Math.PI * 0.4); g.stroke();
        g.strokeStyle = /Shot|Volley|Header/.test(charging) && charging !== 'PassingHeader' ? '#ff6b3d' : '#4fc3ff';
        g.lineWidth = 9;
        g.beginPath(); g.arc(c, c, 108, Math.PI * 0.4 - Math.PI * 0.8 * power, Math.PI * 0.4); g.stroke();
      }
      // Facing notch
      g.fillStyle = '#ffe14d';
      g.save(); g.translate(c, c); g.rotate(facingAngle);
      g.beginPath(); g.moveTo(0, -122); g.lineTo(10, -100); g.lineTo(-10, -100); g.closePath(); g.fill();
      g.restore();
      this.tex.needsUpdate = true;
    }

    update(match, dt) {
      this.t += dt;
      const U = match.user;
      const show = U && !['prematch', 'halftime', 'fulltime', 'goal'].includes(match.state);
      this.ring.visible = !!show;
      this.target.visible = false;
      if (!show) return;
      this.ring.position.set(U.pos.x, 0.03, -U.pos.y);
      const out = match.lastOut || {};
      // Canvas "up" is world -Z (sim +y), so the facing notch angle is measured from +y.
      this.draw(U.fat.d / U.fat.dMax, out.chargePower || 0, out.charging || '', Math.PI / 2 - U.facing);
      if (out.charging && PASS_TYPES.includes(out.charging) && match.settings.access.passAssist !== 'Manual') {
        const aim = V.flen(match.arbiter.lastDir) > 0 ? match.arbiter.lastDir : V.fromHeading(U.facing);
        const r = match.bestReceiver(U, aim, out.charging);
        if (r) {
          this.target.visible = true;
          this.target.position.set(r.pos.x, 0.035, -r.pos.y);
          this.target.rotation.z = this.t * 2;
        }
      }
    }
  };
})(window.KXI);
