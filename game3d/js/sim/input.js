// KINETIC XI 3D — input
// input.js : MacBook keyboard capture (timestamped key edges, zero browser scrolling) and
// the Context Intent Arbiter for the 3D game's layout:
//
//   Move ............................ ↑ ← ↓ →
//   Sprint .......................... Left Ctrl + Arrows
//   Stop ball ....................... Left Ctrl tap (no arrows)
//   Controlled sprint / Shield / Jockey  W (W + Arrows: jockey on defence, shield/controlled sprint on attack)
//   Strafe dribble / Change player .. Left Shift (hold in possession / press on defence)
//   Skill move ...................... Left Shift + direction TAP
//   Ground pass / Header ............ S (tap)
//   Lob / Cross / Sliding tackle .... S (hold) / S on defence
//   Through pass / Rush GK .......... A / A held on defence
//   Lobbed through .................. Left Shift + A
//   Shoot / Volley / Header / Standing tackle  D (hold for power) / D on defence
//   Finesse shot / Driven pass ...... W + D / W + S
//   Pause / Settings ................ Esc
'use strict';
(function (K) {
  const V = K.V;

  const CODE_TO_KEY = {
    ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
    ControlLeft: 'LeftCtrl', ControlRight: 'RightCtrl', ShiftLeft: 'LeftShift', ShiftRight: 'RightShift',
    AltLeft: 'LeftOption', AltRight: 'RightOption', MetaLeft: 'LeftCommand', MetaRight: 'RightCommand',
    Space: 'Space', Tab: 'Tab', Enter: 'Return', Escape: 'Escape',
  };
  for (let c = 65; c <= 90; c++) CODE_TO_KEY['Key' + String.fromCharCode(c)] = String.fromCharCode(c);
  K.CODE_TO_KEY = CODE_TO_KEY;
  const GAME_KEYS = new Set(['Up', 'Down', 'Left', 'Right', 'LeftCtrl', 'LeftShift', 'S', 'A', 'D', 'W', 'Space', 'Escape', 'Tab']);

  /** The layout table shown in the CONTROLS tab (and the PDF). */
  K.CONTROLS = [
    ['Move', '↑ ← ↓ →', 'Always (camera-relative)'],
    ['Sprint', 'Left Ctrl + Arrows', 'Full sprint'],
    ['Stop Ball', 'Left Ctrl (tap, no arrows)', 'In possession; hold = stand on the ball'],
    ['Controlled Sprint', 'W + Arrows', 'Attacking, no defender close'],
    ['Shield / Protect Ball', 'W (+ Arrows)', 'In possession, or with a defender within 2.6 m'],
    ['Jockey', 'W + Arrows', 'Defending'],
    ['Strafe Dribble', 'Left Shift (hold)', 'In possession, facing locked to goal'],
    ['Skill Move', 'Left Shift + direction tap', '→ knock-on · ← drag-back · ↑/↓ body feint · →→ stepover · …'],
    ['Change Player', 'Left Shift', 'Defending / loose ball (arrows pick direction)'],
    ['Ground Pass / Header', 'S (tap)', 'Released in under 0.2 s'],
    ['Lob Pass / Cross / Header', 'S (hold)', 'Cross when wide in the final third'],
    ['Sliding Tackle', 'S', 'Defending'],
    ['Through Pass', 'A (hold for power)', 'In possession'],
    ['Lobbed Through Pass', 'Left Shift + A', 'In possession'],
    ['Rush Goalkeeper Out', 'A (hold)', 'Defending'],
    ['Shoot / Volley / Header', 'D (hold for power)', 'Power bar at the player\'s feet'],
    ['Standing Tackle', 'D', 'Defending'],
    ['Finesse Shot', 'W + D', 'In possession'],
    ['Driven Pass', 'W + S', 'In possession'],
    ['Pause / Settings', 'Esc', 'Any time during a match'],
  ];

  K.ACTION_LABEL = {
    GroundPass: 'Ground Pass', LobPass: 'Lob Pass', Cross: 'Cross', PassingHeader: 'Header',
    ThroughPass: 'Through Pass', LobbedThroughPass: 'Lobbed Through', DrivenGroundPass: 'Driven Pass',
    Shot: 'Shot', Volley: 'Volley', ShootingHeader: 'Header', FinesseShot: 'Finesse Shot', StopBall: 'Stop Ball',
    SkillMove: 'Skill', ChangePlayer: 'Change Player', SlidingTackle: 'Sliding Tackle', StandingTackle: 'Standing Tackle', Throw: 'Throw-in',
  };

  /** Captures key edges with their DOM timestamps (same clock as performance.now()). */
  K.KeyboardCapture = class {
    constructor(target = window) {
      this.queue = [];
      this.down = new Set();
      this.listeners = [];
      this.enabled = true;   // false while a menu text field has focus
      const onDown = (e) => {
        const k = CODE_TO_KEY[e.code];
        if (!k) return;
        if (e.metaKey && k !== 'LeftCommand' && k !== 'RightCommand') return;   // leave ⌘ shortcuts to macOS
        if (GAME_KEYS.has(k)) e.preventDefault();                               // no scrolling, no focus jumps
        this.listeners.forEach((f) => f(k, true, e));
        if (e.repeat || !this.enabled) return;
        if (!this.down.has(k)) { this.down.add(k); this.queue.push({ key: k, down: true, time: e.timeStamp / 1000 }); }
      };
      const onUp = (e) => {
        const k = CODE_TO_KEY[e.code];
        if (!k) return;
        if (GAME_KEYS.has(k)) e.preventDefault();
        if (this.down.has(k)) { this.down.delete(k); this.queue.push({ key: k, down: false, time: e.timeStamp / 1000 }); }
        // macOS browsers drop key-ups of keys pressed while ⌘ is held: release everything.
        if (k === 'LeftCommand' || k === 'RightCommand') this.releaseAll(e.timeStamp / 1000);
        this.listeners.forEach((f) => f(k, false, e));
      };
      target.addEventListener('keydown', onDown, { passive: false });
      target.addEventListener('keyup', onUp, { passive: false });
      window.addEventListener('blur', () => this.releaseAll(performance.now() / 1000));
    }
    releaseAll(t) {
      for (const k of this.down) this.queue.push({ key: k, down: false, time: t });
      this.down.clear();
    }
    drain() { const q = this.queue; this.queue = []; return q; }
    onKey(f) { this.listeners.push(f); }
  };

  const ARROWS = { Up: { x: 0, y: 1 }, Down: { x: 0, y: -1 }, Left: { x: -1, y: 0 }, Right: { x: 1, y: 0 } };

  /** Context Intent Arbiter for the 3D layout. Same principles as engine/src/input.cpp:
   *  match phase first, then hardware-timestamped tap/hold durations, then chord windows. */
  K.Input3 = class {
    constructor(tuning) {
      this.t = Object.assign({ tap: 0.2, chord: 0.12, skillTap: 0.18, gesture: 0.3, maxCharge: 1.0, stopTap: 0.2, scale: 1.0 }, tuning || {});
      this.down = {};
      this.pressT = {};
      this.charge = null;
      this.tokens = [];
      this.shiftConsumed = false;
      this.dirDuringCtrl = false;
      this.lastPhase = 'InPossession';
      this.lastDir = { x: 0, y: 0, z: 0 };
    }
    w(s) { return s * this.t.scale; }
    screenDir() {
      const x = (this.down.Right ? 1 : 0) - (this.down.Left ? 1 : 0);
      const y = (this.down.Up ? 1 : 0) - (this.down.Down ? 1 : 0);
      return V.fnorm({ x, y, z: 0 });
    }
    toWorld(ctx, s) { return V.rotate({ x: s.x, y: s.y, z: 0 }, ctx.cameraYaw - Math.PI / 2); }
    token(worldDir, facing) {
      const rel = K.wrapAngle(V.heading(worldDir) - facing);
      if (Math.abs(rel) <= Math.PI / 4) return 'F';
      if (Math.abs(rel) >= (3 * Math.PI) / 4) return 'B';
      return rel > 0 ? 'L' : 'R';
    }
    predict(held, ctx) {
      const c = this.charge;
      const aerial = ctx.ballIncoming && ctx.ballHeight > 1.3;
      if (c.slot === 'S') {
        if (c.mod) return 'DrivenGroundPass';
        if (aerial) return 'PassingHeader';
        if (held < this.w(this.t.tap)) return 'GroundPass';
        return ctx.inCrossingZone ? 'Cross' : 'LobPass';
      }
      if (c.slot === 'A') return c.lobbed ? 'LobbedThroughPass' : 'ThroughPass';
      if (c.mod) return 'FinesseShot';
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
      else if (this.charge.slot === 'S' && type !== 'PassingHeader' && type !== 'DrivenGroundPass') power = K.sat((held - tap) / (this.w(this.t.maxCharge) - tap));
      else power = K.sat(held / this.w(this.t.maxCharge));
      out.commands.push({ type, power, held, aim: V.copy(this.lastDir), time: t });
      this.charge = null;
    }
    resolveSkill(t, out) {
      if (!this.tokens.length) return;
      const a = this.tokens[0].tok, b = this.tokens[1] ? this.tokens[1].tok : '';
      const pairs = { FF: 'StepoverBurst', BB: 'SoleRoll', LR: 'RouletteRight', RL: 'RouletteLeft', FL: 'InsideShiftLeft', FR: 'InsideShiftRight', FB: 'HeelChop' };
      const singles = { F: 'KnockOn', B: 'DragBack', L: 'BodyFeintLeft', R: 'BodyFeintRight' };
      out.commands.push({ type: 'SkillMove', skill: (b && pairs[a + b]) || singles[a], power: 0, aim: V.copy(this.lastDir), time: t });
      this.tokens = [];
    }
    onPress(k, t, ctx, out) {
      this.pressT[k] = t;
      const pos = ctx.phase === 'InPossession', def = ctx.phase === 'Defending';
      const onBall = pos || ctx.ballIncoming;
      const wd = this.toWorld(ctx, this.screenDir());
      if (V.flen(wd) > 0) this.lastDir = wd;
      switch (k) {
        case 'LeftCtrl':
          this.dirDuringCtrl = V.flen(this.screenDir()) > 0;
          break;
        case 'LeftShift':
          this.shiftConsumed = false;
          if (this.charge && this.charge.slot === 'A' && t - this.charge.start <= this.w(this.t.chord)) {
            this.charge.lobbed = true; this.shiftConsumed = true;
          } else if (!pos && !ctx.ballIncoming) {
            out.commands.push({ type: 'ChangePlayer', power: 0, aim: wd, time: t });
            this.shiftConsumed = true;
          }
          break;
        case 'S':
          if (def) out.commands.push({ type: 'SlidingTackle', power: 0, aim: wd, time: t });
          else if (onBall) this.charge = { slot: 'S', start: t, mod: !!this.down.W, lobbed: false };
          break;
        case 'A':
          if (onBall && !def) this.charge = { slot: 'A', start: t, mod: false, lobbed: !!this.down.LeftShift };
          if (this.charge && this.charge.lobbed) this.shiftConsumed = true;
          break;
        case 'D':
          if (def) out.commands.push({ type: 'StandingTackle', power: 0, aim: wd, time: t });
          else if (onBall) { this.charge = { slot: 'D', start: t, mod: !!this.down.W, lobbed: false }; this.tokens = []; }
          break;
        case 'W':
          if (this.charge && (this.charge.slot === 'D' || this.charge.slot === 'S') && t - this.charge.start <= this.w(this.t.chord)) this.charge.mod = true;
          break;
        default: break;
      }
    }
    onRelease(k, t, ctx, out) {
      const held = t - (this.pressT[k] == null ? t : this.pressT[k]);
      const pos = ctx.phase === 'InPossession';
      if (ARROWS[k]) {
        // Skill move: an arrow TAP while Left Shift is held (a held arrow is strafe movement).
        if (pos && this.down.LeftShift && held <= this.w(this.t.skillTap)) {
          this.shiftConsumed = true;
          this.tokens.push({ tok: this.token(this.toWorld(ctx, ARROWS[k]), ctx.facing), t });
          if (this.tokens.length >= 2) this.resolveSkill(t, out);
        }
        return;
      }
      if (k === 'LeftCtrl') {
        if (pos && held <= this.w(this.t.stopTap) && !this.dirDuringCtrl && V.flen(this.screenDir()) === 0) {
          out.commands.push({ type: 'StopBall', power: 0, aim: { x: 0, y: 0, z: 0 }, time: t });
        }
      } else if (k === 'S' || k === 'A' || k === 'D') {
        if (this.charge && this.charge.slot === k) {
          const wd = this.toWorld(ctx, this.screenDir());
          if (V.flen(wd) > 0) this.lastDir = wd;
          this.fire(t, ctx, out);
        }
      } else if (k === 'LeftShift') {
        if (this.tokens.length) this.resolveSkill(t, out);
      }
    }
    update(events, ctx, now) {
      const out = { moveDir: { x: 0, y: 0, z: 0 }, sprint: 'None', holdBall: false, strafe: false, shield: false, jockey: false,
        rushKeeper: false, teammateContain: false, closeControl: false, charging: null, chargePower: 0, commands: [] };
      if (ctx.phase !== this.lastPhase) {
        const was = this.lastPhase === 'InPossession', is = ctx.phase === 'InPossession';
        if (was !== is && !ctx.ballIncoming) { this.charge = null; this.tokens = []; }
        this.lastPhase = ctx.phase;
      }
      for (const e of events) {
        if (!!this.down[e.key] === e.down) continue;
        this.down[e.key] = e.down;
        if (e.down) this.onPress(e.key, e.time, ctx, out); else this.onRelease(e.key, e.time, ctx, out);
      }
      const dir = this.toWorld(ctx, this.screenDir());
      const hasDir = V.flen(dir) > 0;
      if (hasDir) this.lastDir = dir;
      out.moveDir = dir;
      const pos = ctx.phase === 'InPossession', def = ctx.phase === 'Defending';
      if (this.tokens.length === 1 && now - this.tokens[0].t > this.w(this.t.gesture)) this.resolveSkill(now, out);
      const ctrl = !!this.down.LeftCtrl, shift = !!this.down.LeftShift, wKey = !!this.down.W;
      if (ctrl && hasDir) out.sprint = 'Full';
      else if (wKey && hasDir && !def && !(pos && ctx.opponentNear)) out.sprint = 'Controlled';
      const since = (k) => (this.pressT[k] == null ? 0 : now - this.pressT[k]);
      out.holdBall = pos && ctrl && !hasDir && since('LeftCtrl') > this.w(this.t.stopTap);
      out.strafe = pos && shift && !this.shiftConsumed && since('LeftShift') >= this.w(this.t.chord);
      out.shield = pos && wKey && (!hasDir || ctx.opponentNear);
      out.jockey = def && wKey;
      out.rushKeeper = def && !!this.down.A;
      if (this.charge) {
        out.charging = this.predict(now - this.charge.start, ctx);
        out.chargePower = K.sat((now - this.charge.start) / this.w(this.t.maxCharge));
      }
      return out;
    }
    cancel() { this.charge = null; this.tokens = []; this.down = {}; }
  };
})(window.KXI);
