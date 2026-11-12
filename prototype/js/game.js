// KINETIC XI — Playable Prototype
// game.js : the match. Fixed 120 Hz simulation: input arbitration → AI → locomotion →
// ball physics → physical touches (no magnet: the ball is only ever moved by a foot, chest,
// head, hands or a slide that can actually reach it) → laws of the game → presentation.
'use strict';
(function (K) {
  const V = K.V, P = K.PITCH, AI = K.AI;

  const FORMATIONS = {
    '4-3-3': [['GK', -0.95, 0], ['LB', -0.6, 0.62], ['LCB', -0.68, 0.22], ['RCB', -0.68, -0.22], ['RB', -0.6, -0.62],
      ['LCM', -0.25, 0.32], ['CDM', -0.4, 0], ['RCM', -0.25, -0.32], ['LW', 0.12, 0.66], ['ST', 0.22, 0], ['RW', 0.12, -0.66]],
    '4-4-2': [['GK', -0.95, 0], ['LB', -0.6, 0.62], ['LCB', -0.68, 0.22], ['RCB', -0.68, -0.22], ['RB', -0.6, -0.62],
      ['LM', -0.22, 0.62], ['LCM', -0.32, 0.2], ['RCM', -0.32, -0.2], ['RM', -0.22, -0.62], ['LST', 0.15, 0.16], ['RST', 0.15, -0.16]],
  };
  // Fictional squads (original names).
  const SQUADS = [
    { name: 'Northbank Athletic', short: 'NBA', colour: '#d8262f', colour2: '#ffffff', shorts: '#1a1a1a', formation: '4-3-3', quality: 0.75,
      names: ['Okafor', 'Lindqvist', 'Moreau', 'Haddad', 'Brennan', 'Sato', 'Varga', 'Quint', 'Adeyemi', 'Castell', 'Rook'] },
    { name: 'Harbour City Rovers', short: 'HCR', colour: '#1d5fd6', colour2: '#f5d33b', shorts: '#ffffff', formation: '4-4-2', quality: 0.75,
      names: ['Petrov', 'Nwosu', 'Dahl', 'Ferreira', 'Kimura', 'Ostrowski', 'Bellamy', 'Ruiz', 'Achterberg', 'Mensah', 'Lacroix'] },
  ];
  const DIFF = {
    Amateur: { skill: 0.75, temp: 0.12, react: 0.8 }, 'Semi-Pro': { skill: 0.85, temp: 0.09, react: 0.65 },
    Professional: { skill: 1.0, temp: 0.06, react: 0.5 }, 'World Class': { skill: 1.08, temp: 0.045, react: 0.4 },
    Legendary: { skill: 1.15, temp: 0.03, react: 0.3 },
  };
  const WEATHER = {
    Dry: { rain: 0, temp: 16, hum: 0.5, wind: 1.5, start: 0.15 }, Overcast: { rain: 0, temp: 11, hum: 0.8, wind: 3, start: 0.35 },
    'Light Rain': { rain: 3, temp: 9, hum: 0.9, wind: 3, start: 0.6 }, 'Heavy Rain': { rain: 18, temp: 8, hum: 0.97, wind: 5, start: 0.85 },
    Storm: { rain: 45, temp: 7, hum: 1, wind: 9, start: 0.95 },
  };
  const PASSES = ['GroundPass', 'DrivenGroundPass', 'ThroughPass', 'LobPass', 'LobbedThroughPass', 'Cross', 'PassingHeader', 'Throw'];
  const SHOTS = ['Shot', 'Volley', 'FinesseShot', 'ShootingHeader'];

  K.Match = class {
    constructor(settings, keyboard) {
      this.settings = settings; this.kb = keyboard;
      this.rng = new K.Rng(20261112);
      this.surface = new K.Surface(2);
      this.phys = new K.BallPhysics();
      this.ball = K.newBall();
      this.camera = new K.Camera();
      this.audio = new K.Audio();
      this.cpuManager = new K.AdaptiveManager('Pragmatist');
      this.time = 0; this.tickN = 0; this.state = 'prematch'; this.half = 1; this.clock = 0;
      this.score = [0, 0];
      this.stats = [0, 1].map(() => ({ poss: 0, shots: 0, onTarget: 0, xg: 0, passes: 0, passOk: 0, tackles: 0, fouls: 0, offsides: 0, corners: 0, saves: 0 }));
      this.toasts = []; this.log = [];
      this.lastTouch = null; this.lastTouchTeam = null; this.lastTouchTime = -10; this.carrier = null;
      this.inFlight = false; this.pass = null; this.queued = null; this.gkHold = null; this.restart = null;
      this.lastShot = null; this.lastOut = null; this.pred = null;
      this.teammateContain = false; this.rushKeeper = false;
      this.windNow = { x: 0, y: 0, z: 0 }; this.hydroAcc = 0;
      this.userPoss = { start: -1, slow: false, dribble: 0, flagged: false };
      this.teams = SQUADS.map((sq, i) => this.makeTeam(sq, i));
      this.players = this.teams[0].players.concat(this.teams[1].players);
      this.teams[0].plan = new K.AdaptiveManager('PossessionPurist').plan;
      this.teams[1].plan = this.cpuManager.plan;
      this.user = this.teams[0].players.find((p) => p.role === 'ST');
      this.arbiter = new K.IntentArbiter(settings.input.bindings, {});
      this.applySettings();
      this.surface.setUniform(WEATHER[settings.weather.preset].start, 0, 0);
      this.placeForKickoff(this.teams[0]);
      this.state = 'prematch';
      this.camera.mode = 'walkout';
    }

    makeTeam(sq, id) {
      const team = { id, name: sq.name, short: sq.short, colour: sq.colour, colour2: sq.colour2, shorts: sq.shorts, attackSign: id === 0 ? 1 : -1, isUser: id === 0, players: [], plan: null };
      const rng = new K.Rng(1000 + id * 77);
      FORMATIONS[sq.formation].forEach(([role, u, v], i) => {
        const p = new K.Player(team, i, role, { u, v }, K.makeAttributes(role, sq.quality, rng), sq.names[i], i === 0 ? 1 : i + 1);
        team.players.push(p);
      });
      return team;
    }

    applySettings() {
      const s = this.settings;
      this.arbiter.b = s.input.bindings;
      Object.assign(this.arbiter.t, { scale: s.access.timingScale, sprintMode: s.input.sprintMode, precision: s.input.precision });
      this.kb.isBound = (k) => Object.values(s.input.bindings).includes(k);
      const d = DIFF[s.gameplay.difficulty] || DIFF.Professional;
      this.cpuSkill = d.skill; this.cpuTemp = d.temp; this.cpuReact = d.react; this.cpuErr = 1 / (d.skill * d.skill);
      this.audio.apply(s);
    }

    minute() { return Math.min(90, (this.half - 1) * 45 + (this.clock / (this.settings.gameplay.halfMinutes * 60)) * 45); }
    other(team) { return team === this.teams[0] ? this.teams[1] : this.teams[0]; }
    toast(text, kind = 'info', dur = 3.2) { this.toasts.push({ text, kind, t: 0, dur }); if (this.toasts.length > 4) this.toasts.shift(); }
    pan(x) { return K.clamp((x - this.camera.target.x) / 40, -1, 1); }

    // ============================================================== main tick ====
    tick(dt) {
      const now = performance.now() / 1000;
      const events = this.kb.drain();
      this.time += dt; this.tickN++;
      this.updateCarrier();
      const ctx = this.context();
      const out = this.arbiter.update(events, ctx, now);
      this.lastOut = out;

      if (['prematch', 'halftime', 'fulltime'].includes(this.state)) {
        if (events.some((e) => e.down && !/Ctrl|Shift|Option|Command|Fn/.test(e.key))) this.advanceScreen(events);
        this.camera.update(this, dt);
        return;
      }
      this.weatherTick(dt);
      this.dtMatch = (dt * 45) / this.settings.gameplay.halfMinutes;
      if (this.state !== 'goal') this.applyUser(out);
      if (this.state === 'goal') this.celebrateThink();
      else AI.think(this, dt);
      this.actions(dt);
      this.movePlayers(dt);
      this.ballTick(dt);
      if (this.state === 'play') {
        this.touches();
        if (this.state === 'play') this.rules();
        this.gkHoldTick(dt);
        this.clockTick(dt);
      } else if (this.state === 'restart' || this.state === 'kickoff') {
        this.restartTick(dt);
        this.clock += dt;
      } else if (this.state === 'goal') {
        this.goalTimer += dt;
        if (this.goalTimer > 4.2) this.placeForKickoff(this.kickoffTeam, true);
      }
      this.updateCarrier();
      this.bookkeeping(dt);
      if (this.tickN % 3 === 0) this.pred = this.phys.predict(this.ball, this.surface, 3, 0.05);
      this.camera.update(this, dt);
      for (const t of this.toasts) t.t += dt;
      this.toasts = this.toasts.filter((t) => t.t < t.dur);
    }

    context() {
      const U = this.user, c = this.carrier, b = this.ball;
      let phase = 'LooseBall';
      const r = this.restart;
      if ((r && r.taker === U) || c === U) phase = 'InPossession';
      else if ((c && c.team === U.team) || (r && r.team === U.team)) phase = 'TeammatePossession';
      else if ((c && c.team !== U.team) || (r && r.team !== U.team)) phase = 'Defending';
      else if (this.lastTouchTeam && this.lastTouchTeam !== U.team && V.flen(b.vel) > 4) phase = 'Defending';
      let incoming = false, height = 0;
      if (c !== U && this.pred && !r) {
        for (const s of this.pred) {
          if (s.t > 1.0) break;
          if (V.fdist(s.pos, V.add(U.pos, V.mul(U.vel, s.t))) < 1.4) { incoming = true; height = s.pos.z; break; }
        }
      }
      const sign = U.team.attackSign;
      const goal = { x: sign * P.HL, y: 0, z: 0 };
      const aim = V.flen(this.arbiter.lastDir) > 0 ? this.arbiter.lastDir : V.fromHeading(U.facing);
      const toGoal = V.fnorm(V.sub(goal, U.pos));
      return {
        phase, facing: U.facing, cameraYaw: this.camera.yawForInput(),
        inShootingRange: V.fdist(U.pos, goal) < 32 && sign * U.pos.x > 0,
        aimInGoalCone: V.dot(V.fnorm(aim), toGoal) > Math.cos(0.55),
        inCrossingZone: sign * U.pos.x > P.HL - 30 && Math.abs(U.pos.y) > P.BOX_HW - 2,
        ballIncoming: incoming, ballHeight: height,
      };
    }

    updateCarrier() {
      const lt = this.lastTouch, b = this.ball.pos;
      if (this.gkHold) this.carrier = this.gkHold.gk;
      else if (this.restart) this.carrier = this.restart.taker;
      else if (lt && !this.inFlight && b.z < 1.2 && this.time - this.lastTouchTime < 3) {
        // Close to the ball, or a knock-on running ahead of him that nobody else is nearer to.
        const d = V.fdist(lt.pos, b);
        const ahead = V.dot(V.sub(b, lt.pos), V.fnorm(lt.vel)) > 0;
        let contested = false;
        if (d >= 2.6) for (const q of this.players) if (q !== lt && V.fdist(q.pos, b) < d) { contested = true; break; }
        this.carrier = d < 2.6 || (d < 5.5 && ahead && !contested) ? lt : null;
      } else this.carrier = null;
    }

    // ============================================================== user input ====
    applyUser(out) {
      const U = this.user, c = U.cmd;
      for (const cmd of out.commands) this.userCommand(cmd);
      this.teammateContain = out.teammateContain;
      this.rushKeeper = out.rushKeeper;
      if (U.busy()) return;
      if (this.restart && this.restart.taker === U) { c.dir = { x: 0, y: 0, z: 0 }; return; }
      c.dir = out.moveDir; c.sprint = out.sprint; c.hold = out.holdBall; c.strafe = false; c.jockey = false;
      c.frac = out.closeControl ? 0.45 : null; c.withBall = this.carrier === U;
      const attackYaw = U.team.attackSign > 0 ? 0 : Math.PI;
      if (out.strafe) { c.strafe = true; c.strafeFacing = attackYaw; }
      if (out.shield) {
        const o = AI.nearestOpponent(this, U).o;
        c.strafe = true; c.frac = 0.4;
        c.strafeFacing = o ? V.heading(V.sub(U.pos, o.pos)) : attackYaw;
      }
      const threat = this.carrier && this.carrier.team !== U.team ? this.carrier : null;
      if (out.jockey) { c.jockey = true; c.strafeFacing = V.heading(V.sub(threat ? threat.pos : this.ball.pos, U.pos)); }
      if (out.contain && threat) {
        const own = { x: -U.team.attackSign * P.HL, y: 0, z: 0 };
        const spot = V.add(threat.pos, V.mul(V.fnorm(V.sub(own, threat.pos)), 2.0));
        const d = V.sub(spot, U.pos);
        const auto = V.flen(d) > 0.4 ? V.fnorm(d) : { x: 0, y: 0, z: 0 };
        c.dir = V.fnorm(V.add(V.mul(auto, 1), V.mul(out.moveDir, 0.4)));
        c.sprint = V.flen(d) > 6 ? 'Full' : 'None';
        c.jockey = V.flen(d) < 5; c.strafeFacing = V.heading(V.sub(threat.pos, U.pos));
      }
      // Receiving assist: drift onto the ball's path if the player isn't steering.
      if (V.flen(out.moveDir) === 0 && this.pass && this.pass.to === U && !this.carrier) {
        const ic = AI.intercept(this, U), d = V.sub(ic.point, U.pos);
        if (V.flen(d) > 0.5) { c.dir = V.fnorm(d); c.sprint = V.flen(d) > 6 ? 'Controlled' : 'None'; }
      }
    }

    userCommand(cmd) {
      const U = this.user;
      switch (cmd.type) {
        case 'ChangePlayer': this.switchPlayer(cmd.aim); return;
        case 'SlidingTackle': this.startSlide(U); return;
        case 'StandingTackle': this.startLunge(U); return;
        case 'StopBall':
          if (this.reach(U)) { this.ball.vel = V.mul(V.flat(U.vel), 0.1); this.ball.spin = { x: 0, y: 0, z: 0 }; }
          return;
        case 'SkillMove':
          this.lastCommand = { text: cmd.skill.replace(/([A-Z])/g, ' $1').trim(), t: this.time };
          if (this.carrier === U || this.reach(U)) this.doSkill(U, cmd.skill);
          return;
        default: break;
      }
      if (this.restart && this.restart.taker === U) { this.userRestartKick(U, cmd); return; }
      // A deliberate strike only needs the ball within physical reach (the dribble-touch
      // cooldown doesn't apply); otherwise it is buffered for 0.6 s until the next touch.
      const r = this.reach(U);
      const kicking = U.action && U.action.type === 'kick';
      this.lastCommand = { text: K.ACTION_LABEL[cmd.type] || cmd.type, t: this.time };
      if (r && !kicking && !this.gkHold) this.userKick(U, cmd);
      else { this.queued = { cmd, until: this.time + 0.6 }; this.lastCommand.text += ' (buffered)'; }
    }

    userKick(U, cmd) {
      const s = this.settings.access;
      const aim = V.flen(cmd.aim) > 0 ? cmd.aim : V.fromHeading(U.facing);
      if (PASSES.includes(cmd.type)) {
        const receiver = s.passAssist === 'Manual' ? null : this.bestReceiver(U, aim, cmd.type);
        this.performKick(U, cmd.type, { receiver, aim, power: cmd.power, assist: s.passAssist });
      } else {
        this.performKick(U, cmd.type, { aim, power: cmd.power, assist: s.shotAssist, aimed: V.flen(cmd.aim) > 0 });
      }
    }

    userRestartKick(U, cmd) {
      const r = this.restart;
      let type = cmd.type;
      if (r.kind === 'throw') type = 'Throw';
      if (r.kind === 'kickoff' && SHOTS.includes(type)) type = 'GroundPass';
      this.state = 'play'; this.restart = null;
      if (type === 'Throw' || PASSES.includes(type)) {
        const aim = V.flen(cmd.aim) > 0 ? cmd.aim : V.fromHeading(U.facing);
        const receiver = this.settings.access.passAssist === 'Manual' ? null : this.bestReceiver(U, aim, type);
        this.performKick(U, type, { receiver, aim, power: cmd.power, assist: this.settings.access.passAssist, noOffside: r.kind !== 'freekick' });
      } else {
        this.performKick(U, type, { aim: cmd.aim, power: cmd.power, assist: this.settings.access.shotAssist, aimed: V.flen(cmd.aim) > 0 });
      }
    }

    bestReceiver(p, aim, type) {
      let best = null, bs = -1e9;
      const sign = p.team.attackSign;
      for (const q of p.team.players) {
        if (q === p || (q.isGK && type !== 'GroundPass')) continue;
        const d = V.sub(q.pos, p.pos), dist = V.flen(d);
        if (dist < 3 || dist > 60) continue;
        const cos = V.dot(V.fnorm(d), V.fnorm(aim));
        if (cos < Math.cos(1.2)) continue;
        let score = cos * 1.0 - dist * 0.006;
        if (type === 'ThroughPass' || type === 'LobbedThroughPass') score += 0.15 * K.sat((sign * q.vel.x) / 5);
        if (type === 'Cross') score += sign * q.pos.x > P.HL - 18 && Math.abs(q.pos.y) < 12 ? 0.5 : -0.5;
        if (score > bs) { bs = score; best = q; }
      }
      return best;
    }

    switchPlayer(aim) {
      const U = this.user, T = U.team, b = this.ball.pos;
      const ownBox = Math.abs(b.x + T.attackSign * P.HL) < P.BOX_D && Math.abs(b.y) < P.BOX_HW;
      let best = null, bs = 1e9;
      for (const q of T.players) {
        if (q === U || (q.isGK && !ownBox)) continue;
        let score;
        if (V.flen(aim) > 0) {
          const d = V.sub(q.pos, U.pos);
          const cos = V.dot(V.fnorm(d), aim);
          if (cos < 0.3 || V.flen(d) > 40) continue;
          score = -cos * 10 + V.flen(d) * 0.05;
        } else score = AI.timeToReach(q, this.pred ? this.pred[Math.min(10, this.pred.length - 1)].pos : b);
        if (score < bs) { bs = score; best = q; }
      }
      if (best) this.switchTo(best);
    }
    switchTo(p) { if (p && p.team.isUser) this.user = p; }

    // ============================================================== actions ====
    startSlide(p) {
      if (p.busy()) return;
      const sp = Math.max(5.5, V.flen(p.vel) + 1.5);
      p.action = { type: 'slide', t: 0, dur: 0.85, speed: sp, touched: false };
    }
    startLunge(p) { if (!p.busy()) p.action = { type: 'lunge', t: 0, dur: 0.32 }; }

    doSkill(p, skill) {
      const f = V.fromHeading(p.facing), l = V.fromHeading(p.facing + Math.PI / 2);
      const b = this.ball;
      const set = (v) => { b.vel = v; b.vel.z = 0; b.spin = { x: -v.y / K.BALL.r, y: v.x / K.BALL.r, z: 0 }; b.grounded = true; };
      const err = () => this.rng.gauss() * 0.25 * (1.1 - p.a.dribbling);
      const sp = V.flen(p.vel);
      switch (skill) {
        case 'KnockOn': set(V.add(V.mul(f, sp + 6), V.mul(l, err()))); break;
        case 'BodyFeintLeft': set(V.add(V.mul(f, sp * 0.6), V.mul(l, 2.2 + err()))); p.vel = V.add(p.vel, V.mul(l, 1.8)); break;
        case 'BodyFeintRight': set(V.add(V.mul(f, sp * 0.6), V.mul(l, -2.2 + err()))); p.vel = V.add(p.vel, V.mul(l, -1.8)); break;
        case 'StepoverBurst': set(V.add(V.mul(f, sp + 3.5), V.mul(l, err() * 2))); break;
        case 'DragBack': set(V.mul(f, -2.6)); p.facing = K.wrapAngle(p.facing + Math.PI); p.vel = V.mul(p.vel, 0.3); break;
        case 'SoleRoll': set(V.mul(l, (this.rng.next() < 0.5 ? 1 : -1) * 1.6)); break;
        case 'RouletteLeft': set(V.add(V.mul(l, 2.0), V.mul(f, 0.8))); p.facing += 0.8; break;
        case 'RouletteRight': set(V.add(V.mul(l, -2.0), V.mul(f, 0.8))); p.facing -= 0.8; break;
        case 'InsideShiftLeft': set(V.add(V.mul(f, sp * 0.5 + 1.5), V.mul(l, 2.6))); break;
        case 'InsideShiftRight': set(V.add(V.mul(f, sp * 0.5 + 1.5), V.mul(l, -2.6))); break;
        case 'HeelChop': set(V.add(V.mul(f, -1.4), V.mul(l, 2.0))); p.facing = K.wrapAngle(p.facing + 1.6); break;
        default: return;
      }
      p.action = { type: 'skill', t: 0, dur: 0.4, name: skill };
      p.touchCd = 0.3;
      this.lastTouch = p; this.lastTouchTeam = p.team; this.lastTouchTime = this.time;
      // Wrong-foot nearby defenders.
      for (const o of this.players) if (o.team !== p.team && V.fdist(o.pos, p.pos) < 4) o.wrongFooted = 0.35 * p.a.dribbling + 0.1;
      if (p.team.isUser) this.cpuManager.observe('Skill');
      this.toast(skill.replace(/([A-Z])/g, ' $1').trim().toUpperCase(), 'skill', 1.4);
    }

    actions(dt) {
      for (const p of this.players) {
        p.touchCd -= dt; p.contestCd -= dt; p.decisionTimer -= dt;
        const a = p.action;
        if (!a) continue;
        a.t += dt;
        if (a.type === 'slide') {
          const v = V.fromHeading(p.facing, Math.max(1.5, a.speed * (1 - a.t / a.dur)));
          p.vel = v; p.pos = V.add(p.pos, V.mul(v, dt));
          if (!a.touched) {
            for (const o of this.players) {
              if (o.team === p.team || o.busy()) continue;
              if (V.fdist(V.add(p.pos, V.fromHeading(p.facing, 0.6)), o.pos) < 0.75) { this.foul(p, o); a.touched = true; break; }
            }
          }
          if (a.t > a.dur) p.action = { type: 'fallen', t: 0, dur: 0.55 };
        } else if (a.type === 'dive') {
          if (a.t > a.delay) {
            const k = 1 - (a.t - a.delay) / (a.dur - a.delay);
            p.vel = V.mul(a.dir, a.speed * Math.max(0, k));
            p.pos = V.add(p.pos, V.mul(p.vel, dt));
          }
          if (a.t > a.dur) p.action = { type: 'fallen', t: 0, dur: 0.45 };
        } else if (a.type === 'fallen') {
          p.vel = V.mul(p.vel, 0.85);
          p.pos = V.add(p.pos, V.mul(p.vel, dt));
          if (a.t > a.dur) p.action = null;
        } else if (a.t > a.dur) {
          if (a.type === 'lunge' && !a.won) {
            const c = this.carrier;
            if (c && c.team !== p.team && V.fdist(c.pos, p.pos) < 0.8 && this.rng.next() < 0.3) this.foul(p, c);
          }
          p.action = null;
        }
      }
    }

    movePlayers(dt) {
      const injury = this.settings.gameplay.injuryFrequency;
      for (const p of this.players) {
        if (p.action && ['slide', 'dive', 'fallen'].includes(p.action.type)) continue;
        if (this.restart && this.restart.taker === p) { p.vel = { x: 0, y: 0, z: 0 }; p.pos = V.copy(this.restart.takerPos); p.facing = this.restart.facing; continue; }
        const k = this.surface.coeffs(p.pos.x, p.pos.y);
        const m = p.mods(this), sl = p.sliders(this);
        const sc = { top: m.top * sl.speed, acc: m.acc * sl.accel };
        if (p.action && ['stumble', 'kick', 'lunge'].includes(p.action.type)) { sc.top *= p.action.type === 'stumble' ? 0.4 : 0.7; }
        if (p.wrongFooted > 0) sc.acc *= 0.3;
        const ev = p.locomote(dt, k.traction, sc);
        if (ev.plant) this.surface.footfall(ev.pos.x, ev.pos.y, ev.impulse, ev.shear);
        if (ev.slipped && p === this.user) this.toast('SLIPPED on the wet turf', 'warn', 1.5);
        const side = p.team.isUser ? 'user' : 'cpu';
        const wasInjured = p.injured;
        if (this.settings.gameplay.fatigue) p.tire(dt, this.dtMatch, k.hardness, injury[side], this.rng);
        if (!wasInjured && p.injured) { this.toast(`INJURY — #${p.number} ${p.name} is struggling`, 'warn', 4); this.audio.say(`${p.name} has pulled up. He's injured.`); }
      }
      // Body separation (players are solid).
      for (let i = 0; i < this.players.length; i++) {
        for (let j = i + 1; j < this.players.length; j++) {
          const a = this.players[i], b = this.players[j];
          const d = V.sub(b.pos, a.pos), dist = V.flen(d);
          if (dist > 0.01 && dist < 0.62) {
            const push = V.mul(V.fnorm(d), (0.62 - dist) / 2);
            a.pos = V.sub(a.pos, push); b.pos = V.add(b.pos, push);
          }
        }
      }
    }

    // ============================================================== ball ====
    ballTick(dt) {
      const b = this.ball;
      if (this.gkHold || this.restart) return;
      this.phys.wind = this.windNow;
      const rep = this.phys.step(b, dt, this.surface);
      if (rep.bounced) this.audio.bounce(rep.impact, this.surface.coeffs(b.pos.x, b.pos.y).moisture, this.pan(b.pos.x));
      this.woodwork();
    }

    woodwork() {
      const b = this.ball, r = K.BALL.r, pr = 0.06;
      for (const side of [-1, 1]) {
        const gx = side * P.HL;
        const segs = [
          [{ x: gx, y: -P.GOAL_HW, z: 0 }, { x: gx, y: -P.GOAL_HW, z: P.GOAL_H }],
          [{ x: gx, y: P.GOAL_HW, z: 0 }, { x: gx, y: P.GOAL_HW, z: P.GOAL_H }],
          [{ x: gx, y: -P.GOAL_HW, z: P.GOAL_H }, { x: gx, y: P.GOAL_HW, z: P.GOAL_H }],
        ];
        for (const [a, c] of segs) {
          const ab = V.sub(c, a), t = K.clamp(V.dot(V.sub(b.pos, a), ab) / V.dot(ab, ab), 0, 1);
          const cp = V.add(a, V.mul(ab, t));
          const d = V.sub(b.pos, cp), dist = V.len(d);
          if (dist < r + pr && dist > 1e-6) {
            const n = V.mul(d, 1 / dist);
            b.pos = V.add(cp, V.mul(n, r + pr));
            const vn = V.dot(b.vel, n);
            if (vn < 0) {
              b.vel = V.sub(b.vel, V.mul(n, 1.6 * vn));
              b.spin = V.mul(b.spin, 0.5); b.grounded = false;
              if (-vn > 3) { this.audio.post(this.pan(b.pos.x)); this.toast('OFF THE WOODWORK!', 'big', 2); this.audio.say('Off the woodwork!'); this.audio.groan(); }
            }
          }
        }
        // Net: once inside the goal frame, the net catches the ball.
        if (side * b.pos.x > P.HL && Math.abs(b.pos.y) < P.GOAL_HW + 0.3 && b.pos.z < P.GOAL_H + 0.2 && this.state === 'goal') {
          if (side * b.pos.x > P.HL + P.GOAL_DEPTH - r) { b.pos.x = side * (P.HL + P.GOAL_DEPTH - r); b.vel = V.mul(b.vel, 0.25); b.vel.x *= -0.3; }
          if (Math.abs(b.pos.y) > P.GOAL_HW - r) { b.pos.y = Math.sign(b.pos.y) * (P.GOAL_HW - r); b.vel.y *= -0.3; }
          if (b.pos.z > P.GOAL_H - r) { b.pos.z = P.GOAL_H - r; b.vel.z *= -0.3; }
        }
      }
    }

    reach(p) {
      const b = this.ball.pos, a = p.action;
      if (a && a.type === 'slide') {
        const d = V.fdist(V.add(p.pos, V.fromHeading(p.facing, 0.7)), b);
        return d < 1.0 && b.z < 0.5 ? { p, d, kind: 'slide' } : null;
      }
      if (a && a.type === 'fallen') return null;
      if (p.isGK && this.inOwnBox(p, b) && this.lastTouchTeam !== p.team) {
        const dive = a && a.type === 'dive';
        const hands = dive ? V.add(p.pos, V.mul(a.dir, 0.5)) : p.pos;
        const d = V.fdist(hands, b);
        const side = p.team.isUser ? 'user' : 'cpu';
        const abil = K.sliderMul(this.settings.gameplay.gkAbility[side], 0.75, 1.25);
        if (d < (dive ? 1.25 : 0.95) * abil && b.z < (dive ? (a.high ? 2.6 : 1.7) : 2.65)) return { p, d, kind: 'hands' };
      }
      if (b.z < 0.7) {
        const lunge = a && a.type === 'lunge';
        const d = V.fdist(p.footPoint(), b);
        return d < 0.78 + 0.12 * p.a.control + (lunge ? 0.55 : 0) ? { p, d, kind: lunge ? 'lunge' : 'foot' } : null;
      }
      const d = V.fdist(p.pos, b);
      if (b.z < 1.75) return d < 0.6 ? { p, d, kind: 'chest' } : null;
      if (b.z < 2.6) return d < 0.65 ? { p, d, kind: 'head' } : null;
      return null;
    }

    inOwnBox(p, pt) {
      const goalX = -p.team.attackSign * P.HL;
      return Math.abs(pt.x - goalX) < P.BOX_D && Math.abs(pt.y) < P.BOX_HW;
    }

    touches() {
      if (this.gkHold) return;
      const cands = [];
      for (const p of this.players) {
        if (p.touchCd > 0) continue;
        const r = this.reach(p);
        if (r) cands.push(r);
      }
      if (!cands.length) return;
      cands.sort((a, b) => a.d - b.d);
      let w = cands[0];
      const c = this.carrier;
      const mine = c && cands.find((x) => x.p === c);
      const ch = c && cands.find((x) => x.p.team !== c.team);
      if (mine && ch) {
        if (ch.p.contestCd > 0) w = mine;
        else {
          ch.p.contestCd = 0.45;
          const shield = c === this.user && this.lastOut && this.lastOut.shield ? 0.2 : 0;
          const pDef = K.sat(0.42 + 0.4 * (ch.p.a.tackling - c.a.dribbling) - shield + (c.cmd.sprint === 'Full' ? 0.08 : 0) +
            (ch.kind === 'slide' ? 0.25 : 0) + (ch.kind === 'lunge' ? 0.12 : 0) - (ch.p.wrongFooted > 0 ? 0.25 : 0));
          if (this.rng.next() < pDef) { w = ch; c.action = { type: 'stumble', t: 0, dur: 0.35 }; if (ch.p.action) ch.p.action.won = true; }
          else { w = mine; ch.p.action = ch.p.action && ch.p.action.type === 'slide' ? ch.p.action : { type: 'stumble', t: 0, dur: 0.4 }; ch.p.touchCd = 0.35; }
        }
      }
      this.handleTouch(w.p, w.kind);
    }

    handleTouch(p, kind) {
      const prevTeam = this.lastTouchTeam;
      const prevToucher = this.lastTouch;
      if (prevTeam && prevTeam !== p.team && !this.inFlight && prevToucher && V.fdist(prevToucher.pos, this.ball.pos) < 3) this.stats[p.team.id].tackles++;
      if (this.pass && this.pass.offside && this.pass.offside.has(p)) { this.offside(p); return; }
      if (this.pass) {
        if (p.team === this.pass.from.team && p !== this.pass.from) this.stats[p.team.id].passOk++;
        this.pass = null;
      }
      this.inFlight = false;
      this.lastTouch = p; this.lastTouchTeam = p.team; this.lastTouchTime = this.time;
      p.touchCd = 0.22; p.receive = null;
      if (prevTeam !== p.team) this.possessionChanged(p.team);
      if (p.team.isUser && p !== this.user && !p.isGK) this.switchTo(p);
      if (kind === 'hands') { this.keeperHands(p); return; }
      if (kind === 'slide') {
        const v = V.fromHeading(p.facing, 6 + this.rng.next() * 3); v.z = 0.6;
        this.phys.strike(this.ball, v, { x: 0, y: 0, z: 0 }, 7);
        this.ball.grounded = false; p.touchCd = 0.8; p.action.touched = true;
        this.audio.touch(this.pan(p.pos.x));
        return;
      }
      if (kind === 'lunge') {
        const v = V.add(V.fromHeading(p.facing, 3.2), V.mul(V.flat(p.vel), 0.4));
        this.phys.strike(this.ball, v, { x: 0, y: 0, z: 0 }, 9);
        p.touchCd = 0.4; if (p.action) p.action.won = true;
        this.audio.touch(this.pan(p.pos.x));
        return;
      }
      if (p === this.user) {
        if (this.queued && this.queued.until >= this.time) { const q = this.queued; this.queued = null; this.userKick(p, q.cmd); return; }
        if (kind === 'head') { this.performKick(p, 'PassingHeader', { receiver: this.bestReceiver(p, V.fromHeading(p.facing), 'PassingHeader'), power: 0.6 }); return; }
        const o = this.lastOut || {};
        this.dribbleTouch(p, kind, { dir: o.moveDir || { x: 0, y: 0, z: 0 }, sprint: o.sprint || 'None', close: o.closeControl, hold: o.holdBall, strafe: o.strafe, shield: o.shield });
        return;
      }
      this.aiTouch(p, kind);
    }

    possessionChanged(team) {
      if (team.isUser) { this.userPoss = { start: this.time, slow: false, dribble: 0, flagged: false }; }
      else this.userPoss.start = -1;
    }

    dribbleTouch(p, kind, it) {
      const b = this.ball, r = K.BALL.r;
      const side = p.team.isUser ? 'user' : 'cpu';
      const ft = K.sliderMul(this.settings.gameplay.firstTouch[side], 0.3, 2.2) * (p.team.isUser ? 1 : this.cpuErr);
      const m = p.mods(this);
      const rel = V.sub(b.vel, p.vel), relSp = V.len(rel);
      if (kind === 'chest' || kind === 'head') {
        const dir = V.flen(it.dir) > 0 ? it.dir : V.fromHeading(p.facing);
        const e = this.rng.gauss() * 0.4 * (1.1 - p.a.control) * ft;
        const v = V.add(V.mul(V.flat(p.vel), 0.5), V.fromHeading(V.heading(dir) + e, 1.2));
        v.z = kind === 'head' ? 1.0 : 0.3;
        this.phys.strike(b, v, { x: 0, y: 0, z: 0 }, 3);
        this.audio.touch(this.pan(p.pos.x));
        return;
      }
      if (it.hold) { b.vel = V.mul(V.flat(p.vel), 0.2); b.spin = { x: 0, y: 0, z: 0 }; b.grounded = true; p.touchCd = 0.3; return; }
      let dir = V.flen(it.dir) > 0 ? V.fnorm(it.dir) : V.flen(p.vel) > 1.2 ? V.fnorm(p.vel) : null;
      if (!dir) {   // standing still: cushion it dead (heavier touch on hard passes)
        if (relSp > 1) {
          let v = V.mul(V.flat(p.vel), 0.2);
          if (relSp > 8) v = V.add(v, V.fromHeading(this.rng.next() * 6.283, relSp * 0.08 * (1.1 - p.a.control) * ft * m.err));
          b.vel = v; b.spin = { x: 0, y: 0, z: 0 }; b.grounded = true;
        }
        p.touchCd = 0.3;
        return;
      }
      let frac = it.sprint === 'Full' ? 1 : it.sprint === 'Controlled' ? 0.8 : 0.62;
      if (it.close) frac = 0.45; if (it.strafe) frac = 0.45; if (it.shield) frac = 0.35;
      const speedP = p.a.topSpeed * m.top * frac * (it.sprint === 'Full' ? 0.84 + 0.12 * p.a.dribbling : 0.95);
      const bv = V.flat(b.vel);
      const along = V.dot(bv, dir);
      const ahead = V.dot(V.sub(b.pos, p.pos), dir);
      const ang = V.flen(bv) > 0.5 ? Math.acos(K.clamp(V.dot(V.fnorm(bv), dir), -1, 1)) : Math.PI;
      if (!(along < speedP + 0.3 || ang > 0.45 || ahead < 0.15 || relSp > 3.5)) return;   // ball running nicely
      // Touch weight follows the player's ACTUAL pace: short pushes while accelerating,
      // long knock-ons only once he is up to speed (you can't out-kick your own legs).
      const cur = Math.max(0, V.dot(V.flat(p.vel), dir));
      const ref = Math.min(speedP, cur + 1.6);
      const dvBase = it.close ? 0.9 : it.strafe || it.shield ? 0.7 : it.sprint === 'Full' ? 3.0 : it.sprint === 'Controlled' ? 2.2 : 1.6;
      const dv = dvBase * K.sat(0.4 + 0.6 * cur / Math.max(1, speedP));
      let vb = Math.max(1.0, ref + dv);
      let sigma = 0.03 + 0.1 * (1 - p.a.dribbling) * (speedP / 9);
      if (relSp > 5) sigma += 0.007 * relSp * (1.1 - p.a.control) * ft;
      sigma *= m.err * (this.surface.coeffs(b.pos.x, b.pos.y).moisture > 0.7 ? 1.15 : 1);
      const yaw = V.heading(dir) + this.rng.gauss() * sigma;
      vb *= 1 + this.rng.gauss() * sigma * 0.8;
      b.vel = V.fromHeading(yaw, vb); b.spin = { x: -b.vel.y / r, y: b.vel.x / r, z: 0 };
      b.grounded = true; b.pos.z = r;
      p.touchCd = K.clamp(0.16 + dv * 0.05, 0.18, 0.4);
      this.audio.touch(this.pan(p.pos.x));
    }

    aiTouch(p, kind) {
      const sign = p.team.attackSign;
      if (kind === 'head' || kind === 'chest') {
        if (kind === 'head') {
          const inBox = sign * p.pos.x > P.HL - P.BOX_D && Math.abs(p.pos.y) < P.BOX_HW;
          if (inBox) this.performKick(p, 'ShootingHeader', { power: 0.7, assist: 'Assisted' });
          else this.performKick(p, 'PassingHeader', { receiver: this.bestReceiver(p, V.fromHeading(sign > 0 ? 0 : Math.PI), 'PassingHeader'), power: 0.8, assist: 'Assisted' });
        } else this.dribbleTouch(p, kind, { dir: V.fromHeading(p.facing), sprint: 'None' });
        return;
      }
      if (p.isGK) {
        const ch = AI.restartChoice(this, p);
        this.performKick(p, ch.kind, { receiver: ch.q, target: ch.target, power: ch.power, assist: 'Assisted' });
        return;
      }
      const relSp = V.len(V.sub(this.ball.vel, p.vel));
      const react = (p.team.isUser ? 0.45 : this.cpuReact) * (0.6 + this.rng.next() * 0.8);
      const near = AI.nearestOpponent(this, p).d;
      if (relSp > 6 && p.decisionTimer <= 0 && near > 2.5) {   // first touch: control, then think
        p.decisionTimer = react * 0.6;
        this.dribbleTouch(p, kind, { dir: V.fromHeading(sign > 0 ? 0 : Math.PI), sprint: 'None' });
        return;
      }
      if (p.decisionTimer > 0 && near > 2) { this.dribbleTouch(p, kind, p.aiIntent || { dir: V.fromHeading(p.facing), sprint: 'None' }); return; }
      const d = AI.decide(this, p);
      p.decisionTimer = react;
      if (d.kind === 'dribble') {
        p.aiIntent = { dir: d.dir, sprint: d.sprint };
        this.dribbleTouch(p, kind, p.aiIntent);
        return;
      }
      this.performKick(p, d.kind, { receiver: d.q, target: d.target, power: SHOTS.includes(d.kind) ? 0.5 + this.rng.next() * 0.35 : 0.5, assist: 'Assisted' });
    }

    keeperHands(p) {
      const b = this.ball, sp = V.len(b.vel);
      const side = p.team.isUser ? 'user' : 'cpu';
      const abil = K.sat(p.a.gk * K.sliderMul(this.settings.gameplay.gkAbility[side], 0.6, 1.35) * (p.team.isUser ? 1 : this.cpuSkill));
      const shot = this.lastShot && this.time - this.lastShot.t < 3 && this.lastShot.team !== p.team;
      if (sp < 12 + 10 * abil && this.rng.next() < 0.55 + 0.4 * abil) {
        this.gkHold = { gk: p, t: 0 };
        b.vel = { x: 0, y: 0, z: 0 }; b.spin = { x: 0, y: 0, z: 0 };
        if (shot) { this.stats[p.team.id].saves++; this.audio.say('Gathered by the keeper.'); this.lastShot = null; }
        return;
      }
      if (this.rng.next() < K.sat((sp - 24) / 22) * (1.15 - abil) * 0.8) { b.vel = V.mul(b.vel, 0.85); p.touchCd = 1; return; }
      const s = p.team.attackSign;
      this.phys.strike(b, { x: Math.abs(b.vel.x) * 0.35 * s + this.rng.range(-1, 1), y: b.vel.y * 0.4 + this.rng.range(-6, 6), z: 2 + this.rng.next() * 3 }, { x: this.rng.range(-20, 20), y: this.rng.range(-20, 20), z: 0 }, 5);
      p.touchCd = 0.8;
      if (shot) { this.stats[p.team.id].saves++; this.toast('WHAT A SAVE!', 'big', 2); this.audio.say('What a save!'); this.audio.roar(0.7); this.lastShot = null; }
    }

    gkHoldTick(dt) {
      const h = this.gkHold;
      if (!h) return;
      h.t += dt;
      const gk = h.gk, b = this.ball;
      b.pos = V.add(gk.pos, V.fromHeading(gk.facing, 0.35)); b.pos.z = 1.1; b.vel = { x: 0, y: 0, z: 0 }; b.grounded = false;
      gk.facing = gk.team.attackSign > 0 ? 0 : Math.PI;
      if (h.t > 1.8) {
        this.gkHold = null;
        b.pos.z = 1.0;
        const ch = AI.restartChoice(this, gk);
        this.performKick(gk, ch.kind === 'GroundPass' ? 'LobPass' : ch.kind, { receiver: ch.q, target: ch.target, power: ch.power, assist: 'Assisted', noOffside: true });
      }
    }

    // ============================================================== kicking ====
    performKick(p, type, o = {}) {
      const b = this.ball, sign = p.team.attackSign;
      const isUser = p.team.isUser, side = isUser ? 'user' : 'cpu', g = this.settings.gameplay;
      const cpuE = isUser ? 1 : this.cpuErr;
      const passErr = K.sliderMul(g.passError[side], 0.25, 2.5) * cpuE;
      const shotErr = K.sliderMul(g.shotError[side], 0.25, 2.5) * cpuE;
      const passSpd = K.sliderMul(g.passSpeed[side], 0.8, 1.2), shotSpd = K.sliderMul(g.shotSpeed[side], 0.8, 1.2);
      const m = p.mods(this);
      const pressure = K.sat(1 - AI.nearestOpponent(this, p).d / 4);
      const from = V.copy(b.pos); from.z = Math.max(from.z, K.BALL.r);
      const power = o.power == null ? 0.5 : o.power;
      const assist = o.assist || 'Assisted';
      const aimDir = o.aim && V.flen(o.aim) > 0 ? V.fnorm(o.aim) : V.fromHeading(p.facing);
      const receiver = o.receiver || null;
      const up = { x: 0, y: 0, z: 1 };
      const gauss = () => this.rng.gauss();
      const rotate = (v, dyaw, dpitch) => {
        const sp = V.len(v), h = V.heading(v) + dyaw, pt = Math.atan2(v.z, V.flen(v)) + dpitch;
        return { x: sp * Math.cos(pt) * Math.cos(h), y: sp * Math.cos(pt) * Math.sin(h), z: sp * Math.sin(pt) };
      };
      const lead = (q, f = 1) => {
        const d = V.fdist(from, q.pos);
        return V.add(q.pos, V.mul(V.flat(q.vel), Math.min(1.2, d / 18) * f));
      };
      const through = (q, mult = 1) => {
        const dir = V.flen(q.vel) > 2 ? V.fnorm(q.vel) : V.fromHeading(sign > 0 ? 0 : Math.PI);
        const L = assist === 'Assisted' || !isUser ? 6 + V.flen(q.vel) * 0.7 : K.lerp(3, 16, power);
        const t = V.add(q.pos, V.mul(dir, L * mult));
        return { x: K.clamp(t.x, -P.HL + 1.5, P.HL - 1.5), y: K.clamp(t.y, -P.HW + 1.5, P.HW - 1.5), z: 0 };
      };
      let vel, spin = { x: 0, y: 0, z: 0 }, target = o.target || null;
      const k = this.surface.coeffs(from.x, from.y);

      if (['GroundPass', 'DrivenGroundPass', 'ThroughPass'].includes(type)) {
        if (!target) target = receiver ? (type === 'ThroughPass' ? through(receiver) : lead(receiver)) : V.add(from, V.mul(aimDir, assist === 'Manual' ? K.lerp(8, 40, power) : 18));
        const d = V.fdist(from, target);
        const vArr = type === 'DrivenGroundPass' ? 10 : type === 'ThroughPass' ? 5 : 6;
        let v0 = Math.sqrt(vArr * vArr + 2 * (k.crr * K.G + 1.3) * d);
        if (isUser && assist === 'Manual' && type === 'GroundPass') v0 = K.lerp(7, 26, power);
        if (isUser && assist === 'SemiAssisted' && type === 'ThroughPass') v0 *= K.lerp(0.8, 1.2, power);
        v0 = Math.min(v0 * passSpd, 31);
        const sigma = (0.012 + 0.05 * (1.05 - p.a.passing)) * passErr * m.err * (1 + pressure) * (1 + v0 / 30);
        vel = V.fromHeading(V.heading(V.sub(target, from)) + gauss() * sigma, v0 * (1 + gauss() * 0.035 * passErr));
        vel.z = from.z > 0.4 ? -0.5 : 0;
        spin = { x: -vel.y / K.BALL.r, y: vel.x / K.BALL.r, z: 0 };
      } else if (['LobPass', 'LobbedThroughPass', 'Cross', 'Clearance', 'Throw'].includes(type)) {
        if (!target) {
          if (type === 'Clearance') target = { x: K.clamp(from.x + sign * 38, -P.HL + 5, P.HL - 5), y: from.y * 0.4 + this.rng.range(-12, 12), z: 0 };
          else if (receiver) target = type === 'LobbedThroughPass' ? through(receiver, 1.3) : lead(receiver, 1.4);
          else target = V.add(from, V.mul(aimDir, K.lerp(type === 'Throw' ? 6 : 15, type === 'Throw' ? 25 : 50, power)));
        }
        if (isUser && receiver && assist === 'SemiAssisted' && type !== 'Throw') target = V.add(from, V.mul(V.sub(target, from), K.lerp(0.8, 1.2, power)));
        const pitch = { LobPass: 0.6, LobbedThroughPass: 0.68, Cross: 0.33, Clearance: 0.55, Throw: 0.32 }[type];
        const curlTo = { x: -sign, y: 0, z: 0 };
        const spinFor = (v) => {
          const vh = V.fnorm(v), left = { x: -vh.y, y: vh.x, z: 0 };
          const back = V.mul(V.cross(up, vh), -(type === 'Cross' ? 8 : 18));
          if (type !== 'Cross') return back;
          return V.add(back, { x: 0, y: 0, z: Math.sign(V.dot(left, curlTo)) * 38 });
        };
        const sol = this.phys.solveLob(from, target, pitch, spinFor, this.surface);
        const sigma = (type === 'Clearance' ? 0.08 : 0.015 + 0.06 * (1.05 - p.a.passing)) * passErr * m.err * (1 + pressure);
        vel = V.mul(rotate(sol.vel, gauss() * sigma, 0), 1 + gauss() * 0.05 * passErr);
        if (type === 'Throw') vel = V.mul(vel, Math.min(1, 16 / Math.max(1, V.len(vel))));
        spin = sol.spin;
      } else {
        // Shots, volleys, headers, finesse.
        const goalX = sign * P.HL;
        const gk = this.other(p.team).players[0];
        let aimY;
        if (type === 'PassingHeader') {
          target = receiver ? lead(receiver) : V.add(from, V.mul(aimDir, 12));
        } else {
          const farSide = gk.pos.y > 0 ? -1 : 1;
          if (assist === 'Manual' && isUser && o.aimed && Math.abs(aimDir.x) > 0.1 && Math.sign(aimDir.x) === sign) {
            aimY = from.y + (aimDir.y / aimDir.x) * (goalX - from.x);
          } else if (assist === 'SemiAssisted' && isUser && o.aimed) {
            const toGoal = V.fnorm({ x: goalX - from.x, y: -from.y, z: 0 });
            const lat = toGoal.x * aimDir.y - toGoal.y * aimDir.x;   // + = aiming left of centre
            aimY = Math.abs(lat) < 0.15 ? farSide * (P.GOAL_HW - 0.6) : Math.sign(lat) * sign * (P.GOAL_HW - 0.55);
          } else aimY = farSide * (P.GOAL_HW - 0.55) + this.rng.range(-0.3, 0.3);
          aimY = K.clamp(aimY, -P.HW, P.HW);
          const aimZ = { Shot: 0.35 + 1.7 * power * power, Volley: 0.4 + 1.5 * power * power, FinesseShot: 0.55 + 1.1 * power, ShootingHeader: 0.35 }[type];
          target = { x: goalX, y: aimY, z: aimZ };
        }
        let speed = { Shot: (15 + 21 * power) * (0.8 + 0.25 * p.a.shooting), Volley: (14 + 20 * power) * (0.8 + 0.25 * p.a.shooting),
          FinesseShot: 13 + 10 * power, ShootingHeader: (9 + 8 * power) * (0.8 + 0.3 * p.a.heading), PassingHeader: 9 + 6 * power }[type];
        speed *= type === 'PassingHeader' ? 1 : shotSpd;
        const curlIn = { x: 0, y: -Math.sign((target.y || 0) - from.y || 1), z: 0 };
        const spinFor = (v) => {
          const vh = V.fnorm(v), left = { x: -vh.y, y: vh.x, z: 0 };
          if (type === 'Shot') return V.mul(V.cross(up, vh), 14);
          if (type === 'FinesseShot') return V.add(V.mul(V.cross(up, vh), 8), { x: 0, y: 0, z: Math.sign(V.dot(left, curlIn)) * 50 });
          if (type === 'Volley') return { x: this.rng.range(-15, 15), y: this.rng.range(-15, 15), z: this.rng.range(-15, 15) };
          return { x: 0, y: 0, z: 0 };
        };
        if (type === 'PassingHeader') target.z = 0.3;
        const sol = this.phys.solveAim(from, target, speed, spinFor, this.surface);
        const mult = { Volley: 1.6, ShootingHeader: 1.3, FinesseShot: 0.8, Shot: 1, PassingHeader: 1.2 }[type];
        const sigma = (0.008 + 0.055 * (1.05 - p.a.shooting)) * shotErr * m.err * (1 + 1.2 * pressure) * (1 + 0.8 * power * power) * mult;
        vel = rotate(sol.vel, gauss() * sigma, gauss() * sigma * 0.8 + (power > 0.85 ? (power - 0.85) * 0.3 : 0));
        spin = sol.spin;
        if (SHOTS.includes(type)) {
          const xg = K.sat(AI.threat(from, sign) * 0.9);
          this.stats[p.team.id].shots++; this.stats[p.team.id].xg += xg;
          this.lastShot = { t: this.time, team: p.team, xg, onTarget: Math.abs(aimY) < P.GOAL_HW };
          if (Math.abs(aimY) < P.GOAL_HW) this.stats[p.team.id].onTarget++;
          this.audio.roar(0.5);
          if (isUser && V.fdist(from, { x: goalX, y: 0, z: 0 }) > 23) this.cpuManager.observe('LongShot');
          if (isUser && this.userPoss.start > 0 && this.time - this.userPoss.start < 8) this.cpuManager.observe('FastCounter');
        }
      }

      this.phys.strike(b, vel, spin, (this.tickN * 2654435761) >>> 0);
      b.pos.z = from.z;
      if (vel.z > 0.05 || from.z > K.BALL.r + 0.05) b.grounded = false;
      p.touchCd = 0.45; p.facing = V.heading(vel);
      p.action = { type: 'kick', t: 0, dur: 0.28 };
      this.lastTouch = p; this.lastTouchTeam = p.team; this.lastTouchTime = this.time; this.inFlight = true;
      if (PASSES.includes(type) || type === 'Clearance') {
        this.stats[p.team.id].passes++;
        this.pass = { from: p, to: receiver, type, t: this.time, offside: o.noOffside ? null : this.offsideSet(p) };
        if (receiver) {
          receiver.receive = { until: this.time + 4 };
          if (isUser) this.switchTo(receiver);
        }
        if (isUser && target) {
          const v = K.toTeamSpace(target, sign).v;
          this.cpuManager.observe(v > 0.33 ? 'PassLeft' : v < -0.33 ? 'PassRight' : 'PassCentre');
          if (type === 'ThroughPass' || type === 'LobbedThroughPass') this.cpuManager.observe('ThroughBall');
          if (type === 'Cross') this.cpuManager.observe('Cross');
        }
      } else this.pass = null;
      this.audio.kick(V.len(vel), this.pan(p.pos.x));
    }

    offsideSet(passer) {
      const T = passer.team, sign = T.attackSign;
      const line = AI.secondLastDefenderX(this.other(T), sign);
      const set = new Set();
      for (const q of T.players) {
        if (q === passer) continue;
        const x = sign * q.pos.x;
        if (x > 0 && x > sign * line + 0.15 && x > sign * this.ball.pos.x) set.add(q);
      }
      return set;
    }

    // ============================================================== laws ====
    rules() {
      const b = this.ball.pos, r = K.BALL.r;
      if (Math.abs(b.x) > P.HL + r) {
        const side = Math.sign(b.x);
        if (Math.abs(b.y) < P.GOAL_HW && b.z < P.GOAL_H) { this.goal(side); return; }
        const attacking = this.teams.find((t) => t.attackSign === side), defending = this.other(attacking);
        if (this.lastTouchTeam === attacking) {
          this.startRestart('goalkick', defending, { x: side * (P.HL - 5.5), y: (b.y > 0 ? 1 : -1) * 5, z: r });
          if (this.lastShot) { this.audio.groan(); this.audio.say('Wide of the target.'); this.lastShot = null; }
        } else {
          this.stats[attacking.id].corners++;
          this.startRestart('corner', attacking, { x: side * (P.HL - 0.3), y: Math.sign(b.y) * (P.HW - 0.3), z: r });
        }
        return;
      }
      if (Math.abs(b.y) > P.HW + r) {
        const team = this.lastTouchTeam === this.teams[0] ? this.teams[1] : this.teams[0];
        this.startRestart('throw', team, { x: K.clamp(b.x, -P.HL + 1, P.HL - 1), y: Math.sign(b.y) * (P.HW - 0.2), z: 1.9 });
      }
    }

    goal(side) {
      const team = this.teams.find((t) => t.attackSign === side);
      this.score[team.id]++;
      this.state = 'goal'; this.goalTimer = 0;
      const scorer = this.lastTouch && this.lastTouch.team === team ? this.lastTouch : null;
      this.celebrator = scorer || team.players.find((p) => /ST/.test(p.role));
      this.camera.mode = 'celebrate'; this.camera.shake = 1;
      this.kickoffTeam = this.other(team);
      this.pass = null; this.queued = null; this.lastShot = null;
      this.audio.net(); this.audio.roar(1.6);
      setTimeout(() => this.audio.chime(), 1600);
      const who = scorer ? `${scorer.name}` : 'an own goal';
      this.toast(`GOAL!  ${team.name}  ${this.score[0]} – ${this.score[1]}`, 'goal', 4);
      this.audio.say(`Goal! ${scorer ? scorer.name + ' scores for ' + team.name : 'An own goal!'}`);
      setTimeout(() => this.audio.say(`Goal for ${team.name}. Scored by number ${scorer ? scorer.number : ''}, ${who}.`, 'pa'), 2600);
      this.log.push({ minute: Math.ceil(this.minute()), text: `${team.short} goal — ${who}` });
    }

    celebrateThink() {
      const c = this.celebrator;
      for (const p of this.players) {
        if (p === this.user && p !== c) { /* still animate */ }
        if (p === c) {
          const flag = { x: c.team.attackSign * P.HL * 0.92, y: Math.sign(c.pos.y || 1) * P.HW * 0.85, z: 0 };
          AI.setMove(p, flag, 0.8);
        } else if (c && p.team === c.team && !p.isGK) AI.setMove(p, c.pos, 0.6);
        else AI.setMove(p, K.fromTeamSpace(p.base.u * 0.5 - 0.1, p.base.v * 0.8, p.team.attackSign), 0.1);
      }
    }

    foul(offender, victim) {
      this.stats[offender.team.id].fouls++;
      victim.action = { type: 'fallen', t: 0, dur: 0.9 };
      this.audio.whistle(1);
      const sign = victim.team.attackSign;
      const inBox = sign * victim.pos.x > P.HL - P.BOX_D && Math.abs(victim.pos.y) < P.BOX_HW;
      if (inBox) {
        this.toast('PENALTY!', 'big', 3); this.audio.say('Penalty!'); this.audio.roar(1);
        this.startRestart('freekick', victim.team, { x: sign * (P.HL - P.SPOT), y: 0, z: K.BALL.r }, true);
      } else {
        this.toast(`FOUL — free kick to ${victim.team.short}`, 'warn', 2.2);
        this.startRestart('freekick', victim.team, { x: victim.pos.x, y: victim.pos.y, z: K.BALL.r });
      }
    }

    offside(p) {
      this.stats[p.team.id].offsides++;
      this.audio.whistle(1);
      this.toast(`OFFSIDE — #${p.number} ${p.name}`, 'warn', 2.2);
      this.audio.say('The flag is up. Offside.');
      this.startRestart('freekick', this.other(p.team), { x: p.pos.x, y: p.pos.y, z: K.BALL.r });
    }

    startRestart(kind, team, spot, penalty = false) {
      this.state = kind === 'kickoff' ? 'kickoff' : 'restart';
      const b = this.ball;
      b.pos = V.copy(spot); b.vel = { x: 0, y: 0, z: 0 }; b.spin = { x: 0, y: 0, z: 0 }; b.grounded = spot.z <= K.BALL.r + 0.01;
      let taker;
      if (kind === 'goalkick') taker = team.players[0];
      else if (kind === 'kickoff') taker = team.players.find((p) => /ST/.test(p.role));
      else if (penalty) taker = team.players.slice().sort((a, c) => c.a.shooting - a.a.shooting)[0];
      else taker = team.players.filter((p) => !p.isGK).sort((a, c) => V.fdist(a.pos, spot) - V.fdist(c.pos, spot))[0];
      const sign = team.attackSign;
      const towards = kind === 'throw' ? { x: 0, y: -Math.sign(spot.y), z: 0 } : V.fnorm(V.sub({ x: sign * P.HL * 0.5, y: 0, z: 0 }, spot));
      const facing = V.heading(kind === 'freekick' || kind === 'kickoff' ? V.fnorm(V.sub({ x: sign * P.HL, y: 0, z: 0 }, spot)) : towards);
      const takerPos = V.sub(V.flat(spot), V.mul(V.fromHeading(facing), kind === 'throw' ? 0.05 : 0.45));
      taker.pos = V.copy(takerPos); taker.vel = { x: 0, y: 0, z: 0 }; taker.facing = facing; taker.action = null;
      this.restart = { kind, team, spot: V.copy(spot), taker, takerPos, facing, timer: 0 };
      this.pass = null; this.queued = null; this.gkHold = null; this.inFlight = false;
      this.lastTouch = taker; this.lastTouchTeam = team; this.lastTouchTime = this.time;
      if (penalty) {
        for (const p of this.players) {
          if (p === taker || p.isGK) continue;
          if (Math.abs(p.pos.x - sign * P.HL) < P.BOX_D + 1) p.pos.x = sign * (P.HL - P.BOX_D - 2);
        }
        this.other(team).players[0].pos = { x: sign * P.HL * 0.995, y: 0, z: 0 };
      }
      if (team.isUser) {
        this.switchTo(taker);
        const what = { kickoff: 'Your kick-off', throw: 'Your throw-in', corner: 'Your corner', goalkick: 'Your goal kick', freekick: penalty ? 'Your penalty — D to shoot' : 'Your free kick' }[kind];
        if (kind !== 'goalkick') this.toast(`${what} — S pass · S hold lob/cross · A through · D shoot`, 'info', 3);
      } else {
        const mine = this.teams[0].players.filter((p) => !p.isGK).sort((a, c) => V.fdist(a.pos, spot) - V.fdist(c.pos, spot));
        if (mine.length) this.switchTo(mine[0]);
      }
      if (kind === 'corner') this.audio.say(`Corner to ${team.name}.`);
      const plan = this.cpuManager.maybeReplan(this.minute(), true, this.score[1] - this.score[0]);
      if (plan) plan.forEach((r) => this.toast(`CPU MANAGER: ${r}`, 'manager', 4.5));
    }

    restartTick(dt) {
      const r = this.restart;
      if (!r) return;
      r.timer += dt;
      const b = this.ball;
      b.pos = V.copy(r.spot); b.vel = { x: 0, y: 0, z: 0 };
      if (r.taker === this.user) {
        if (r.timer > 12) { const ch = AI.restartChoice(this, r.taker); this.state = 'play'; this.restart = null; this.performKick(r.taker, r.kind === 'throw' ? 'Throw' : ch.kind, { receiver: ch.q, target: ch.target, power: ch.power, noOffside: r.kind !== 'freekick' }); }
        return;
      }
      if (r.timer > (r.kind === 'kickoff' ? 1.2 : 1.6)) {
        const ch = AI.restartChoice(this, r.taker);
        this.state = 'play'; this.restart = null;
        let kind = r.kind === 'throw' ? 'Throw' : ch.kind;
        if (r.kind === 'kickoff') kind = 'GroundPass';
        this.performKick(r.taker, kind, { receiver: ch.q, target: ch.target, power: ch.power, assist: 'Assisted', noOffside: r.kind !== 'freekick' });
      }
    }

    placeForKickoff(team, whistle = false) {
      for (const p of this.players) {
        const s = p.team.attackSign;
        p.pos = K.fromTeamSpace(Math.min(p.base.u * 0.5 - 0.08, -0.03), p.base.v * 0.85, s);
        p.vel = { x: 0, y: 0, z: 0 }; p.facing = s > 0 ? 0 : Math.PI; p.action = null; p.receive = null; p.runTarget = null;
      }
      const sts = team.players.filter((p) => /ST|LW|RW/.test(p.role)).slice(0, 2);
      const s = team.attackSign;
      if (sts[0]) sts[0].pos = { x: -s * 0.5, y: 0.3, z: 0 };
      if (sts[1]) sts[1].pos = { x: -s * 1.5, y: -6, z: 0 };
      this.camera.mode = 'game';
      this.camera.init = false;
      this.startRestart('kickoff', team, { x: 0, y: 0, z: K.BALL.r });
      if (whistle) this.audio.whistle(1);
    }

    advanceScreen(events) {
      this.audio.start(this.settings);
      if (this.state === 'prematch') {
        this.camera.mode = 'game';
        this.placeForKickoff(this.teams[0], true);
        this.audio.say(`And we're under way here. ${this.teams[0].name} against ${this.teams[1].name}.`);
      } else if (this.state === 'halftime') {
        this.half = 2; this.clock = 0;
        for (const t of this.teams) t.attackSign *= -1;
        this.placeForKickoff(this.teams[1], true);
        this.audio.say('The second half is under way.');
      } else if (this.state === 'fulltime') {
        if (events.some((e) => e.down && e.key === 'R')) window.location.reload();
      }
    }

    clockTick(dt) {
      this.clock += dt;
      if (this.clock >= this.settings.gameplay.halfMinutes * 60 && !this.inFlight) {
        this.audio.whistle(this.half === 1 ? 2 : 3, true);
        this.state = this.half === 1 ? 'halftime' : 'fulltime';
        this.audio.say(this.half === 1 ? `Half time. ${this.teams[0].name} ${this.score[0]}, ${this.teams[1].name} ${this.score[1]}.` : `Full time! It finishes ${this.score[0]}, ${this.score[1]}.`);
        this.restart = null; this.gkHold = null;
      }
      const m = this.minute();
      const plan = this.cpuManager.maybeReplan(m, false, this.score[1] - this.score[0]);
      if (plan) plan.forEach((r) => this.toast(`CPU MANAGER: ${r}`, 'manager', 4.5));
    }

    weatherTick(dt) {
      const w = WEATHER[this.settings.weather.preset] || WEATHER.Dry;
      const gust = 1 + 0.4 * K.noise1(this.time * 0.15, 11);
      const dir = 0.6 + 0.3 * K.noise1(this.time * 0.03, 13);
      this.windNow = { x: Math.cos(dir) * w.wind * gust, y: Math.sin(dir) * w.wind * gust, z: 0 };
      this.hydroAcc += dt;
      if (this.hydroAcc > 0.25) {
        this.surface.update(this.hydroAcc * this.settings.weather.hydrologySpeed, { rain: w.rain, temp: w.temp, humidity: w.hum, wind: this.windNow });
        this.hydroAcc = 0;
      }
    }

    bookkeeping(dt) {
      if (this.carrier) this.stats[this.carrier.team.id].poss += dt;
      const U = this.user;
      if (this.carrier && this.carrier.team.isUser && this.userPoss.start > 0) {
        const sign = U.team.attackSign;
        if (!this.userPoss.slow && this.time - this.userPoss.start > 10 && sign * this.ball.pos.x < 0) { this.userPoss.slow = true; this.cpuManager.observe('SlowBuildUp'); }
        if (this.carrier === U && U.cmd.sprint === 'Full') this.userPoss.dribble += dt;
        if (!this.userPoss.flagged && this.userPoss.dribble > 1.5) { this.userPoss.flagged = true; this.cpuManager.observe('Dribble'); }
      }
      let danger = 0;
      const ref = this.carrier ? this.carrier.team : this.lastTouchTeam;
      if (ref) danger = AI.threat(this.ball.pos, ref.attackSign) * (this.carrier ? 1 : 0.8);
      this.audio.tick(dt, this.state === 'goal' ? 1 : danger);
    }
  };
})(window.KXI);
