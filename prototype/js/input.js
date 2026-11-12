// KINETIC XI — Playable Prototype
// input.js : MacBook keyboard capture + the Context Intent Arbiter (port of
// engine/src/input.cpp — same rules, same timings, same unit-tested behaviour).
'use strict';
(function (K) {
  const V = K.V;

  // e.code -> engine key name
  const CODE_TO_KEY = {
    ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
    ControlLeft: 'LeftCtrl', ControlRight: 'RightCtrl', ShiftLeft: 'LeftShift', ShiftRight: 'RightShift',
    AltLeft: 'LeftOption', AltRight: 'RightOption', MetaLeft: 'LeftCommand', MetaRight: 'RightCommand',
    Space: 'Space', Tab: 'Tab', Enter: 'Return', Escape: 'Escape', CapsLock: 'CapsLock',
  };
  for (let c = 65; c <= 90; c++) CODE_TO_KEY['Key' + String.fromCharCode(c)] = String.fromCharCode(c);
  for (let d = 0; d <= 9; d++) CODE_TO_KEY['Digit' + d] = String(d);
  K.CODE_TO_KEY = CODE_TO_KEY;

  K.KEY_LABEL = (k) => ({
    Up: '↑', Down: '↓', Left: '←', Right: '→', LeftCtrl: 'Left Ctrl', RightCtrl: 'Right Ctrl',
    LeftShift: 'Left Shift', RightShift: 'Right Shift', LeftOption: 'Left Option ⌥', RightOption: 'Right Option ⌥',
    LeftCommand: 'Left ⌘', RightCommand: 'Right ⌘', Space: 'Space', Return: 'Return', Escape: 'Esc',
  }[k] || k);

  K.SLOTS = ['up', 'down', 'left', 'right', 'sprint', 'strafeSwitch', 'passLob', 'through', 'shootTackle', 'shieldJockey', 'modifierContext'];
  K.SLOT_LABEL = {
    up: 'Move Up', down: 'Move Down', left: 'Move Left', right: 'Move Right',
    sprint: 'Sprint / Stop Ball', strafeSwitch: 'Strafe Dribble / Change Player', passLob: 'Pass · Lob · Cross · Slide',
    through: 'Through Pass · Rush GK', shootTackle: 'Shoot · Controlled Sprint · Tackle', shieldJockey: 'Shield · Jockey',
    modifierContext: 'Modifier (skills/finesse) · Contain',
  };
  /** The mandated layout. */
  K.defaultBindings = () => ({
    up: 'Up', down: 'Down', left: 'Left', right: 'Right', sprint: 'LeftCtrl', strafeSwitch: 'LeftShift',
    passLob: 'S', through: 'A', shootTackle: 'D', shieldJockey: 'W', modifierContext: 'E',
  });

  /** Captures key edges with their DOM timestamps (same clock as performance.now()). */
  K.KeyboardCapture = class {
    constructor(target = window) {
      this.queue = [];
      this.down = new Set();
      this.listeners = [];
      this.captureNext = null; // rebinding UI hook
      this.isBound = () => true;
      const onDown = (e) => {
        const k = CODE_TO_KEY[e.code];
        if (!k) return;
        if (this.captureNext) { e.preventDefault(); const cb = this.captureNext; this.captureNext = null; cb(k); return; }
        if (e.metaKey && k !== 'LeftCommand' && k !== 'RightCommand') return;   // leave Cmd shortcuts to macOS
        if (this.isBound(k) || k.length > 2 || k === 'Space') e.preventDefault(); // no scrolling / beeps
        if (e.repeat) return;
        if (!this.down.has(k)) { this.down.add(k); this.queue.push({ key: k, down: true, time: e.timeStamp / 1000 }); }
        this.listeners.forEach((f) => f(k, true));
      };
      const onUp = (e) => {
        const k = CODE_TO_KEY[e.code];
        if (!k) return;
        e.preventDefault();
        if (this.down.has(k)) { this.down.delete(k); this.queue.push({ key: k, down: false, time: e.timeStamp / 1000 }); }
        // macOS browsers drop key-ups of keys pressed while Command is held: release everything.
        if (k === 'LeftCommand' || k === 'RightCommand') this.releaseAll(e.timeStamp / 1000);
      };
      const onBlur = () => this.releaseAll(performance.now() / 1000);
      target.addEventListener('keydown', onDown, { passive: false });
      target.addEventListener('keyup', onUp, { passive: false });
      window.addEventListener('blur', onBlur);
    }
    releaseAll(t) {
      for (const k of this.down) this.queue.push({ key: k, down: false, time: t });
      this.down.clear();
    }
    drain() { const q = this.queue; this.queue = []; return q; }
    onKey(f) { this.listeners.push(f); }
  };

  /** Detects macOS system shortcuts that can steal chords from the mandated layout. */
  K.macConflicts = (b) => {
    const out = [];
    const isMac = /Mac/i.test(navigator.platform || '') || /Mac OS X/.test(navigator.userAgent || '');
    if ((b.sprint === 'LeftCtrl' || b.sprint === 'RightCtrl') && [b.up, b.down, b.left, b.right].some((k) => ['Up', 'Down', 'Left', 'Right'].includes(k))) {
      out.push({
        combo: 'Control + Arrow keys',
        owner: 'macOS Mission Control / Spaces',
        fix: 'System Settings → Keyboard → Keyboard Shortcuts… → Mission Control: untick “Mission Control”, “Application windows”, “Move left a space”, “Move right a space”. Or rebind Sprint to Left Option.',
        mac: isMac,
      });
    }
    if (Object.values(b).some((k) => k === 'LeftCommand' || k === 'RightCommand')) {
      out.push({ combo: 'Command + key', owner: 'macOS / browser shortcuts (⌘W closes the tab!)', fix: 'Do not bind Command.', mac: isMac });
    }
    return out;
  };

  K.ACTION_LABEL = {
    GroundPass: 'Ground Pass', LobPass: 'Lob Pass', Cross: 'Cross', PassingHeader: 'Passing Header',
    ThroughPass: 'Through Pass', LobbedThroughPass: 'Lobbed Through', DrivenGroundPass: 'Driven Ground Pass',
    Shot: 'Shot', Volley: 'Volley', ShootingHeader: 'Header', FinesseShot: 'Finesse Shot', StopBall: 'Stop Ball',
    SkillMove: 'Skill', ChangePlayer: 'Change Player', SlidingTackle: 'Sliding Tackle', StandingTackle: 'Standing Tackle',
  };

  /** Context Intent Arbiter — identical rules to the C++ engine (see tests.cpp). */
  K.IntentArbiter = class {
    constructor(bindings, tuning) {
      this.b = bindings;
      this.t = Object.assign({
        tap: 0.2, chord: 0.11, ctrlWindow: 0.24, feather: 0.3, gesture: 0.38, maxCharge: 1.0, stopTap: 0.2,
        scale: 1.0, sprintMode: 'Ramp', precision: 'Context',
      }, tuning || {});
      this.down = {};
      this.pressT = {};
      this.charge = null;
      this.gesture = [];
      this.gestureActive = false;
      this.lastCtrlRelease = -10;
      this.feathering = false;
      this.dirDuringCtrl = false;
      this.shiftConsumed = false;
      this.lastPhase = 'InPossession';
      this.lastDir = { x: 0, y: 0, z: 0 };
    }
    w(s) { return s * this.t.scale; }
    slotOf(key) { for (const s of K.SLOTS) if (this.b[s] === key) return s; return null; }
    sd(slot) { return !!this.down[this.b[slot]]; }
    screenDir() {
      const x = (this.sd('right') ? 1 : 0) - (this.sd('left') ? 1 : 0);
      const y = (this.sd('up') ? 1 : 0) - (this.sd('down') ? 1 : 0);
      return V.fnorm({ x, y, z: 0 });
    }
    worldDir(ctx, sdir) {
      const s = sdir || this.screenDir();
      return V.rotate(s, ctx.cameraYaw - Math.PI / 2);
    }
    token(worldDir, facing) {
      const rel = K.wrapAngle(V.heading(worldDir) - facing);
      if (Math.abs(rel) <= Math.PI / 4) return 'F';
      if (Math.abs(rel) >= (3 * Math.PI) / 4) return 'B';
      return rel > 0 ? 'L' : 'R';
    }
    predict(held, ctx) {
      const c = this.charge;
      const aerial = ctx.ballIncoming && ctx.ballHeight > 1.3;
      if (c.slot === 'passLob') {
        if (aerial) return 'PassingHeader';
        if (held < this.w(this.t.tap)) return 'GroundPass';
        return ctx.inCrossingZone ? 'Cross' : 'LobPass';
      }
      if (c.slot === 'through') return c.lobbed ? 'LobbedThroughPass' : 'ThroughPass';
      if (c.precision) {
        if (this.t.precision === 'AlwaysFinesse') return 'FinesseShot';
        if (this.t.precision === 'AlwaysDriven') return 'DrivenGroundPass';
        return ctx.inShootingRange && ctx.aimInGoalCone ? 'FinesseShot' : 'DrivenGroundPass';
      }
      if (aerial) return 'ShootingHeader';
      if (ctx.ballIncoming && ctx.ballHeight > 0.35) return 'Volley';
      return 'Shot';
    }
    fire(t, ctx, out) {
      const held = t - this.charge.start;
      const type = this.predict(held, ctx);
      const tap = this.w(this.t.tap);
      let power;
      if (type === 'GroundPass') power = K.sat(held / tap);
      else if (this.charge.slot === 'passLob' && type !== 'PassingHeader') power = K.sat((held - tap) / (this.w(this.t.maxCharge) - tap));
      else power = K.sat(held / this.w(this.t.maxCharge));
      out.commands.push({ type, power, held, aim: V.copy(this.lastDir), time: t });
      this.charge = null;
    }
    resolveGesture(t, out) {
      if (!this.gesture.length) return;
      const a = this.gesture[0].tok, b = this.gesture[1] ? this.gesture[1].tok : '';
      const pairs = { FF: 'StepoverBurst', BB: 'SoleRoll', LR: 'RouletteRight', RL: 'RouletteLeft', FL: 'InsideShiftLeft', FR: 'InsideShiftRight', FB: 'HeelChop' };
      const singles = { F: 'KnockOn', B: 'DragBack', L: 'BodyFeintLeft', R: 'BodyFeintRight' };
      const skill = (b && pairs[a + b]) || singles[a];
      out.commands.push({ type: 'SkillMove', skill, power: 0, aim: V.copy(this.lastDir), time: t });
      this.gesture = [];
    }
    onPress(slot, t, ctx, out) {
      this.pressT[slot] = t;
      const pos = ctx.phase === 'InPossession', def = ctx.phase === 'Defending';
      const onBall = pos || ctx.ballIncoming;
      const wd = this.worldDir(ctx);
      if (V.flen(wd) > 0) this.lastDir = wd;
      if (['up', 'down', 'left', 'right'].includes(slot)) {
        if (pos && this.sd('modifierContext') && !this.charge) {
          this.gestureActive = true;
          const single = { up: { x: 0, y: 1, z: 0 }, down: { x: 0, y: -1, z: 0 }, left: { x: -1, y: 0, z: 0 }, right: { x: 1, y: 0, z: 0 } }[slot];
          this.gesture.push({ tok: this.token(this.worldDir(ctx, single), ctx.facing), t });
          if (this.gesture.length >= 2) this.resolveGesture(t, out);
        }
        return;
      }
      switch (slot) {
        case 'sprint':
          this.feathering = t - this.lastCtrlRelease < this.w(this.t.feather);
          this.dirDuringCtrl = V.flen(this.screenDir()) > 0;
          break;
        case 'strafeSwitch':
          this.shiftConsumed = false;
          if (this.charge && this.charge.slot === 'through' && t - this.charge.start <= this.w(this.t.chord)) {
            this.charge.lobbed = true; this.shiftConsumed = true;
          } else if (!pos && !ctx.ballIncoming) {
            out.commands.push({ type: 'ChangePlayer', power: 0, aim: this.worldDir(ctx), time: t });
            this.shiftConsumed = true;
          }
          break;
        case 'passLob':
          if (def) out.commands.push({ type: 'SlidingTackle', power: 0, aim: this.worldDir(ctx), time: t });
          else if (onBall) this.charge = { slot: 'passLob', start: t, precision: false, lobbed: false };
          break;
        case 'through':
          if (onBall && !def) {
            this.charge = { slot: 'through', start: t, precision: false, lobbed: false };
            if (this.sd('strafeSwitch')) { this.charge.lobbed = true; this.shiftConsumed = true; }
          }
          break;
        case 'shootTackle':
          if (def) {
            if (this.sd('shieldJockey') || this.sd('modifierContext')) out.commands.push({ type: 'StandingTackle', power: 0, aim: this.worldDir(ctx), time: t });
          } else if (onBall) {
            this.charge = { slot: 'shootTackle', start: t, precision: this.sd('modifierContext'), lobbed: false };
            this.gesture = []; this.gestureActive = false;
          }
          break;
        case 'modifierContext':
          if (this.charge && this.charge.slot === 'shootTackle' && t - this.charge.start <= this.w(this.t.chord)) this.charge.precision = true;
          else if (pos) { this.gesture = []; this.gestureActive = true; }
          break;
      }
    }
    onRelease(slot, t, ctx, out) {
      const held = t - (this.pressT[slot] || t);
      if (slot === 'sprint') {
        this.lastCtrlRelease = t;
        if (ctx.phase === 'InPossession' && held <= this.w(this.t.stopTap) && !this.dirDuringCtrl && V.flen(this.screenDir()) === 0) {
          out.commands.push({ type: 'StopBall', power: 0, aim: { x: 0, y: 0, z: 0 }, time: t });
        }
      } else if (slot === 'passLob' || slot === 'through' || slot === 'shootTackle') {
        if (this.charge && this.charge.slot === slot) {
          const wd = this.worldDir(ctx);
          if (V.flen(wd) > 0) this.lastDir = wd;
          this.fire(t, ctx, out);
        }
      } else if (slot === 'modifierContext') {
        if (this.gesture.length) this.resolveGesture(t, out);
        this.gestureActive = false;
      }
    }
    update(events, ctx, now) {
      const out = { moveDir: { x: 0, y: 0, z: 0 }, sprint: 'None', closeControl: false, holdBall: false, strafe: false, shield: false, jockey: false, contain: false, teammateContain: false, rushKeeper: false, charging: null, chargePower: 0, commands: [] };
      if (ctx.phase !== this.lastPhase) {
        const was = this.lastPhase === 'InPossession', is = ctx.phase === 'InPossession';
        if (was !== is && !ctx.ballIncoming) { this.charge = null; this.gesture = []; this.gestureActive = false; }
        this.lastPhase = ctx.phase;
      }
      for (const e of events) {
        if (!!this.down[e.key] === e.down) continue;
        this.down[e.key] = e.down;
        const slot = this.slotOf(e.key);
        if (!slot) continue;
        if (e.down) this.onPress(slot, e.time, ctx, out); else this.onRelease(slot, e.time, ctx, out);
      }
      const dir = this.worldDir(ctx);
      const hasDir = V.flen(dir) > 0;
      if (hasDir) this.lastDir = dir;
      out.moveDir = dir;
      const pos = ctx.phase === 'InPossession', def = ctx.phase === 'Defending';
      const ctrl = this.sd('sprint'), shift = this.sd('strafeSwitch'), mod = this.sd('modifierContext');
      const dKey = this.sd('shootTackle'), wKey = this.sd('shieldJockey'), aKey = this.sd('through');
      if (this.gesture.length === 1 && now - this.gesture[0].t > this.w(this.t.gesture)) this.resolveGesture(now, out);
      if (ctrl && hasDir) {
        const held = now - (this.pressT.sprint || now);
        if (this.t.sprintMode === 'InstantFull') out.sprint = 'Full';
        else if (this.t.sprintMode === 'AlwaysControlled') out.sprint = 'Controlled';
        else out.sprint = this.feathering || held < this.w(this.t.ctrlWindow) ? 'Controlled' : 'Full';
      } else if (dKey && hasDir && !this.charge && !ctx.ballIncoming && (ctx.phase === 'TeammatePossession' || ctx.phase === 'LooseBall')) {
        out.sprint = 'Controlled';
      }
      out.closeControl = pos && mod && this.gestureActive;
      out.holdBall = pos && ctrl && !hasDir && now - (this.pressT.sprint || now) > this.w(this.t.stopTap);
      out.strafe = pos && shift && !this.shiftConsumed && now - (this.pressT.strafeSwitch || now) >= this.w(this.t.chord);
      out.shield = pos && wKey;
      out.jockey = def && wKey;
      out.contain = def && mod;
      out.teammateContain = def && dKey && !wKey && !mod;
      out.rushKeeper = def && aKey;
      if (this.charge) {
        out.charging = this.predict(now - this.charge.start, ctx);
        out.chargePower = K.sat((now - this.charge.start) / this.w(this.t.maxCharge));
      }
      return out;
    }
    cancelCharge() { this.charge = null; }
  };
})(window.KXI);
