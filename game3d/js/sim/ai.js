// KINETIC XI 3D — simulation module (shared with the 2D prototype)
// ai.js : the team brain (port of engine/src/tactics.cpp) — threat surface, pitch control,
// coordinated defensive line, pressing, zonal marking, off-ball run planning, goalkeeper
// positioning & diving, on-ball utility decisions, restarts, and the Adaptive Manager
// that watches YOUR habits and re-plans the CPU at stoppages.
'use strict';
(function (K) {
  const V = K.V, P = K.PITCH;
  const AI = {};
  K.AI = AI;

  /** Expected-threat style value of the ball at p for a team attacking `sign`. */
  AI.threat = (p, sign) => {
    const goalX = sign * P.HL;
    const dx = Math.abs(goalX - p.x), dy = p.y, d = Math.hypot(dx, dy);
    let th = Math.atan2(2 * P.GOAL_HW * dx, dx * dx + dy * dy - P.GOAL_HW * P.GOAL_HW);
    if (th < 0) th += Math.PI;
    const prog = K.sat((sign * p.x + P.HL) / P.L);
    return K.sat(0.03 + 0.12 * prog * prog + 0.75 * Math.exp(-d / 11) * (0.35 + 0.65 * Math.min(1, th / 0.9)));
  };

  AI.timeToReach = (pl, pt, react = 0.25) => {
    const after = V.add(pl.pos, V.mul(V.flat(pl.vel), react));
    return react + V.fdist(after, pt) / Math.max(0.5, pl.a.topSpeed * 0.95);
  };

  /** Softmin pitch control over the 6 nearest players (cheap version of the engine model). */
  AI.control = (m, pt, team) => {
    let mine = 0, all = 0;
    for (const pl of m.players) {
      if (V.fdist(pl.pos, pt) > 30) continue;
      const w = Math.exp(-AI.timeToReach(pl, pt) / 0.45);
      all += w; if (pl.team === team) mine += w;
    }
    return all > 0 ? mine / all : 0.5;
  };

  /** Earliest point on the predicted ball path this player can reach (loose balls, passes). */
  AI.intercept = (m, pl) => {
    const pred = m.pred;
    if (!pred) return { point: V.copy(m.ball.pos), t: 0 };
    for (const s of pred) {
      if (s.pos.z > 2.3) continue;
      const tt = AI.timeToReach(pl, s.pos, 0.15 + pl.wrongFooted);
      if (tt <= s.t + 0.05) return { point: V.flat(s.pos), t: s.t };
    }
    const last = pred[pred.length - 1];
    return { point: V.flat(last.pos), t: last.t + AI.timeToReach(pl, last.pos) };
  };

  AI.secondLastDefenderX = (team, sign) => {
    // `team` = defending team; returns x of its second-deepest player relative to its goal.
    const xs = team.players.map((p) => p.pos.x * sign).sort((a, b) => b - a);
    return (xs[1] !== undefined ? xs[1] : 0) * sign;
  };

  AI.nearestOpponent = (m, p) => {
    let best = null, bd = 1e9;
    for (const o of m.players) if (o.team !== p.team) { const d = V.fdist(o.pos, p.pos); if (d < bd) { bd = d; best = o; } }
    return { o: best, d: bd };
  };

  // ---------------------------------------------------------------- Adaptive Manager ----
  K.AdaptiveManager = class {
    constructor(personality = 'Pragmatist') {
      this.personality = personality;
      this.c = {}; this.samples = 0; this.lastPlan = -100;
      this.plan = this.base();
    }
    base() {
      const table = {
        Pragmatist: { press: 0.45, line: 0.45, width: 0.5, compact: 0.6, marking: 0.55 },
        PressingMachine: { press: 0.8, line: 0.7, width: 0.55, compact: 0.7, marking: 0.65 },
        PossessionPurist: { press: 0.6, line: 0.6, width: 0.65, compact: 0.5, marking: 0.5 },
        CounterPuncher: { press: 0.3, line: 0.3, width: 0.45, compact: 0.75, marking: 0.6 },
      };
      return Object.assign({ flank: 0, reasons: [] }, table[this.personality] || table.Pragmatist);
    }
    observe(ev) {
      for (const k of Object.keys(this.c)) this.c[k] *= 0.97;
      this.c[ev] = (this.c[ev] || 0) + 1;
      this.samples++;
    }
    tendency(ev) {
      const flank = ['PassLeft', 'PassCentre', 'PassRight'];
      const g = (k) => this.c[k] || 0;
      if (flank.includes(ev)) { const t = flank.reduce((s, k) => s + g(k), 0); return t ? g(ev) / t : 0; }
      const t = Object.values(this.c).reduce((s, v) => s + v, 0);
      return t ? g(ev) / t : 0;
    }
    maybeReplan(minute, stoppage, goalDiff) {
      if (!stoppage && minute - this.lastPlan < 5) return null;
      if (this.samples < 6) return null;
      const n = this.base(), R = n.reasons;
      const L = this.tendency('PassLeft'), Rt = this.tendency('PassRight');
      if (Rt > 0.5 && Rt > L + 0.2) { n.flank = 1; R.push('Shifting the block and doubling up on your right flank'); }
      else if (L > 0.5 && L > Rt + 0.2) { n.flank = -1; R.push('Shifting the block and doubling up on your left flank'); }
      if (this.tendency('ThroughBall') > 0.18) { n.line -= 0.2; R.push('Dropping the line — you keep playing in behind'); }
      if (this.tendency('Cross') > 0.18) { n.width += 0.15; n.marking += 0.1; R.push('Full-backs tighter to stop your crosses'); }
      if (this.tendency('LongShot') > 0.12) { n.compact += 0.2; R.push('Closing down the edge of the box against long shots'); }
      if (this.tendency('SlowBuildUp') > 0.2) { n.press += 0.25; R.push('Pressing high — your build-up is slow'); }
      if (this.tendency('FastCounter') > 0.15) { n.line -= 0.1; n.compact += 0.1; R.push('Rest-defence: holding players back against your counters'); }
      if (this.tendency('Dribble') > 0.25) { n.marking += 0.15; n.compact += 0.1; R.push('Doubling up on your dribblers'); }
      if (this.tendency('Skill') > 0.15) { n.marking -= 0.1; R.push('Standing off your skillers instead of diving in'); }
      if (goalDiff < 0 && minute > 70) { n.press += 0.2; n.line += 0.15; R.push('Chasing the game — everyone forward'); }
      else if (goalDiff > 0 && minute > 75) { n.press -= 0.15; n.line -= 0.15; R.push('Protecting the lead — low block'); }
      const blend = (a, b) => K.sat(a + (b - a) * 0.6);
      for (const k of ['press', 'line', 'width', 'compact', 'marking']) this.plan[k] = blend(this.plan[k], n[k]);
      this.plan.flank = n.flank; this.plan.reasons = R;
      this.lastPlan = minute;
      return R.length ? R : null;
    }
  };

  // ---------------------------------------------------------------- Defensive line ----
  AI.line = (m, team) => {
    const s = -team.attackSign;                // own goal side
    const goalX = s * P.HL;
    const depthOf = (x) => -s * (x - goalX);
    const ball = m.ball.pos;
    const plan = team.plan;
    const side = team.isUser ? 'user' : 'cpu';
    const slider = (m.settings.gameplay.lineHeight[side] + plan.line * 100) / 2;
    let depth = 18 + 27 * K.sat(slider / 100);
    const c = m.carrier;
    let trigger = 'hold';
    if (c && c.team !== team) {
      const toOwn = V.fnorm({ x: goalX - c.pos.x, y: -c.pos.y, z: 0 });
      const facingOwn = V.dot(V.fromHeading(c.facing), toOwn) < -0.3;   // facing away from our goal = threat
      const nearest = AI.nearestOpponent(m, c).d;
      const pressured = nearest < 3;
      const runner = c.team.players.some((q) => q !== c && depthOf(q.pos.x) < depth + 4 && V.dot(V.flat(q.vel), { x: s, y: 0, z: 0 }) > 3);
      if (!facingOwn && V.dot(V.fromHeading(c.facing), toOwn) > 0.5) { depth += 6; trigger = 'step-up'; }
      else if (!pressured && runner) { depth -= 7; trigger = 'drop'; }
      else if (pressured) { depth += 2; trigger = 'compress'; }
    }
    depth = Math.min(depth, depthOf(ball.x) - 3);
    depth = K.clamp(depth, 6, 50);
    const span = 28 + 16 * K.sat(plan.width);
    const shift = K.clamp(ball.y * 0.35, -9, 9) + plan.flank * team.attackSign * -6;
    return {
      lineX: goalX - s * depth,
      midX: goalX - s * (depth + 9 + 9 * (1 - K.sat(plan.compact))),
      span, shift, trigger,
    };
  };

  // ---------------------------------------------------------------- Movement brain ----
  const ROLE_BACK = new Set(['LB', 'LCB', 'RCB', 'RB']);
  const ROLE_ATT = new Set(['LW', 'RW', 'ST', 'LST', 'RST', 'LM', 'RM', 'AM']);

  AI.anchor = (m, p, inPos) => {
    const T = p.team, sign = T.attackSign;
    const b = K.toTeamSpace(m.ball.pos, sign);
    let u, v;
    if (inPos) { u = p.base.u * 0.55 + 0.25 + 0.45 * b.u; v = p.base.v * (0.9 + 0.2 * T.plan.width); }
    else { u = p.base.u * 0.45 - 0.15 + 0.4 * b.u; v = p.base.v * (0.6 + 0.25 * T.plan.width) + 0.25 * b.v; }
    v += (inPos ? 0 : 0.15 * T.plan.flank * -1);
    return K.fromTeamSpace(K.clamp(u, -0.95, 0.92), K.clamp(v, -0.95, 0.95), sign);
  };

  AI.setMove = (p, target, urgency, faceTo) => {
    const d = V.sub(target, p.pos);
    const dist = V.flen(d);
    const c = p.cmd;
    c.withBall = false; c.strafe = false; c.hold = false; c.jockey = false; c.frac = null;
    if (dist < 0.35) { c.dir = { x: 0, y: 0, z: 0 }; c.sprint = 'None'; }
    else {
      c.dir = V.fnorm(d);
      c.sprint = urgency > 0.7 || (urgency > 0.3 && dist > 10) ? 'Full' : urgency > 0.3 && dist > 4 ? 'Controlled' : 'None';
      if (c.sprint === 'None') c.frac = K.clamp(0.25 + dist * 0.05, 0.25, 0.62);
    }
    if (faceTo) { c.jockey = dist < 6; c.strafeFacing = V.heading(V.sub(faceTo, p.pos)); }
  };

  AI.think = (m, dt) => {
    const carrier = m.carrier;
    for (const T of m.teams) {
      const inPos = carrier && carrier.team === T;
      const oppPos = carrier && carrier.team !== T;
      const line = AI.line(m, T);
      T.lineInfo = line;
      const outfield = T.players.filter((p) => !p.isGK && p !== m.user && !p.busy());
      // Pressers
      let press = [];
      if (oppPos) {
        const sorted = outfield.slice().sort((a, b) => AI.timeToReach(a, carrier.pos) - AI.timeToReach(b, carrier.pos));
        const bu = K.toTeamSpace(carrier.pos, T.attackSign).u;   // ball in team space (+ = our attacking half)
        const pressZone = 0.6 - T.plan.press * 1.2;
        press = sorted.slice(0, bu > pressZone ? 2 : 1);
        if (T.isUser && m.teammateContain && sorted.length) press = [sorted[0]];
      }
      // Loose-ball chaser
      let chaser = null;
      if (!carrier && m.state === 'play' && !m.gkHold) {
        let best = 1e9;
        for (const p of outfield) { const ic = AI.intercept(m, p); if (ic.t < best) { best = ic.t; chaser = p; p._ic = ic; } }
      }
      for (const p of T.players) {
        if (p === m.user || p.busy()) continue;
        if (p.wrongFooted > 0) p.wrongFooted = Math.max(0, p.wrongFooted - dt);
        if (p.isGK) { AI.keeper(m, p, dt); continue; }
        if (m.state === 'restart' || m.state === 'kickoff') { AI.restartShape(m, p); continue; }
        if (p === carrier) { AI.carrierMove(m, p); continue; }
        if (p.receive && m.time < p.receive.until && !carrier) {
          const ic = AI.intercept(m, p);
          AI.setMove(p, ic.point, 0.9);
          continue;
        }
        if (p === chaser) { AI.setMove(p, p._ic.point, 1); continue; }
        if (press.includes(p)) {
          const own = { x: -T.attackSign * P.HL, y: 0, z: 0 };
          const contain = V.add(carrier.pos, V.mul(V.fnorm(V.sub(own, carrier.pos)), press[0] === p ? 1.0 : 2.5));
          const aggressive = T.isUser && m.teammateContain;
          AI.setMove(p, aggressive ? carrier.pos : contain, aggressive ? 1 : 0.85, carrier.pos);
          continue;
        }
        if (inPos) AI.support(m, p, dt);
        else AI.defend(m, p, line);
      }
    }
  };

  AI.defend = (m, p, line) => {
    const T = p.team, sign = T.attackSign;
    let target = AI.anchor(m, p, false);
    if (ROLE_BACK.has(p.role)) {
      const order = { LB: 0.5, LCB: 1 / 6, RCB: -1 / 6, RB: -0.5 }[p.role];
      target = { x: line.lineX, y: K.clamp(order * sign * line.span + line.shift, -P.HW + 2, P.HW - 2), z: 0 };
    } else if (!ROLE_ATT.has(p.role)) {
      target.x = line.midX;
    }
    // Zonal marking: pick up the most dangerous opponent near our zone, stay goal-side.
    const side = T.isUser ? 'user' : 'cpu';
    const tight = K.sat(T.plan.marking * K.sliderMul(m.settings.gameplay.marking[side], 0.5, 1.5));
    let mark = null, md = 12;
    for (const o of m.players) {
      if (o.team === T || o.isGK) continue;
      const d = V.fdist(o.pos, target);
      if (d < md) { md = d; mark = o; }
    }
    if (mark) {
      const own = { x: -sign * P.HL, y: 0, z: 0 };
      const goalSide = V.add(mark.pos, V.mul(V.fnorm(V.sub(own, mark.pos)), 1.6));
      target = V.lerp(target, goalSide, 0.35 + 0.5 * tight);
    }
    AI.setMove(p, target, V.fdist(p.pos, target) > 12 ? 0.6 : 0.25, m.ball.pos);
  };

  AI.support = (m, p, dt) => {
    const T = p.team, sign = T.attackSign;
    p.runTimer -= dt;
    const side = T.isUser ? 'user' : 'cpu';
    const freq = K.sliderMul(m.settings.gameplay.runFrequency[side], 0.3, 2.0);
    if (!p.runTarget || p.runTimer <= 0) {
      p.runTimer = 1.0 + Math.random() * 0.8;
      const anchor = AI.anchor(m, p, true);
      const opp = m.teams[0] === T ? m.teams[1] : m.teams[0];
      const offX = AI.secondLastDefenderX(opp, sign);
      let best = anchor, bestScore = -1e9;
      const radii = ROLE_ATT.has(p.role) ? [0, 7, 14, 20] : [0, 6, 11];
      for (const r of radii) {
        for (let k = 0; k < (r ? 10 : 1); k++) {
          const ang = (k / 10) * Math.PI * 2;
          const tgt = r ? V.add(p.pos, V.fromHeading(ang, r)) : anchor;
          tgt.x = K.clamp(tgt.x, -P.HL + 1, P.HL - 1); tgt.y = K.clamp(tgt.y, -P.HW + 1, P.HW - 1);
          const ctrl = AI.control(m, tgt, T);
          const off = sign * (tgt.x - offX) > 0.3 && sign * (tgt.x - m.ball.pos.x) > 0;
          const crowd = V.fdist(tgt, m.ball.pos) < 6 ? 0.06 : 0;
          const score = AI.threat(tgt, sign) * ctrl - (0.004 / freq) * r - 0.015 * V.fdist(tgt, anchor) - (off ? 0.25 : 0) - crowd;
          if (score > bestScore) { bestScore = score; best = tgt; }
        }
      }
      p.runTarget = best;
    }
    AI.setMove(p, p.runTarget, ROLE_ATT.has(p.role) ? 0.5 : 0.3, null);
  };

  AI.carrierMove = (m, p) => {
    const it = p.aiIntent || { dir: V.fromHeading(p.team.attackSign > 0 ? 0 : Math.PI), sprint: 'None' };
    const c = p.cmd;
    c.dir = it.dir; c.sprint = it.sprint; c.withBall = true; c.strafe = false; c.hold = false; c.jockey = false; c.frac = null;
  };

  AI.restartShape = (m, p) => {
    const r = m.restart;
    if (r && r.taker === p) { p.cmd.dir = { x: 0, y: 0, z: 0 }; return; }
    let target = AI.anchor(m, p, r && r.team === p.team);
    if (m.state === 'kickoff') {
      const sign = p.team.attackSign;
      target = K.fromTeamSpace(Math.min(p.base.u * 0.5 - 0.08, -0.03), p.base.v * 0.85, sign);
      if (r && r.team !== p.team && V.flen(target) < P.CIRCLE_R + 0.5) target = V.mul(V.fnorm(target), P.CIRCLE_R + 1);
    } else if (r && r.team !== p.team && ['freekick', 'corner'].includes(r.kind)) {
      const d = V.fdist(target, r.spot);
      if (d < 9.5) target = V.add(r.spot, V.mul(V.fnorm(V.sub(target, r.spot)), 9.6));
    }
    if (r && r.kind === 'corner') {   // attackers and defenders crowd the box for a corner
      const sign = r.team.attackSign;
      const atk = p.team === r.team;
      if (ROLE_ATT.has(p.role) || ['LCB', 'RCB', 'CDM'].includes(p.role)) {
        target = { x: sign * (P.HL - (atk ? 9 : 6) - Math.random() * 3), y: (p.base.v * 8 + (atk ? 2 : 0)) * sign, z: 0 };
      }
    }
    AI.setMove(p, target, 0.5, m.ball.pos);
  };

  // ---------------------------------------------------------------- Goalkeeper ----
  AI.keeper = (m, p, dt) => {
    const sign = p.team.attackSign, goalX = -sign * P.HL;
    const ball = m.ball.pos;
    if (m.gkHold && m.gkHold.gk === p) { p.cmd.dir = { x: 0, y: 0, z: 0 }; return; }
    // Shot detection: predicted path crosses our goal line on target.
    if (m.pred && !(p.action && p.action.type === 'dive') && V.flen(m.ball.vel) > 8) {
      for (const s of m.pred) {
        if (s.t > 1.6) break;
        if (Math.sign(s.pos.x - goalX) !== sign && Math.abs(s.pos.y) < P.GOAL_HW + 1.2 && s.pos.z < P.GOAL_H + 0.6) {
          // Where does it cross the keeper's plane?
          const plane = m.pred.find((q) => sign * (q.pos.x - p.pos.x) <= 0);
          const at = plane ? plane.pos : s.pos;
          const tArrive = plane ? plane.t : s.t;
          const lat = at.y - p.pos.y;
          const side = p.team.isUser ? 'user' : 'cpu';
          const abil = p.a.gk * K.sliderMul(m.settings.gameplay.gkAbility[side], 0.6, 1.35) * (p.team.isUser ? 1 : m.cpuSkill);
          const react = 0.32 - 0.16 * K.sat(abil);
          if (Math.abs(lat) > 0.7 && tArrive > react) {
            p.action = { type: 'dive', t: 0, dur: 0.75, dir: { x: 0, y: Math.sign(lat), z: 0 }, speed: Math.min(6.5, Math.abs(lat) / Math.max(0.15, tArrive - react) + 0.5) * (0.8 + 0.3 * abil), high: at.z > 1.3, delay: react };
          } else {
            AI.setMove(p, { x: p.pos.x, y: at.y, z: 0 }, 1, ball);
          }
          return;
        }
      }
    }
    if (p.team.isUser && m.rushKeeper) { AI.setMove(p, m.carrier ? m.carrier.pos : ball, 1, ball); return; }
    // Claim loose balls in the box.
    const inBox = sign * (ball.x - goalX) < P.BOX_D && Math.abs(ball.y) < P.BOX_HW;
    if (!m.carrier && inBox && ball.z < 2.5) {
      const ic = AI.intercept(m, p);
      const mine = m.players.filter((q) => q.team !== p.team).every((q) => AI.intercept(m, q).t > ic.t - 0.1);
      if (mine) { AI.setMove(p, ic.point, 1, ball); return; }
    }
    // Angle play: stand on the ball–goal-centre line, closer when the ball is closer.
    const g = { x: goalX, y: 0, z: 0 };
    const db = V.fdist(ball, g);
    const depth = K.clamp(0.6 + 0.09 * db, 0.8, 5.5);
    const target = V.add(g, V.mul(V.fnorm(V.sub(ball, g)), depth));
    target.y = K.clamp(target.y, -P.GOAL_HW, P.GOAL_HW);
    AI.setMove(p, target, db < 25 ? 0.6 : 0.3, ball);
  };

  // ---------------------------------------------------------------- On-ball decisions ----
  /** Lane safety for a pass from a to b with ball speed v: 1 = clean, 0 = surely cut out. */
  AI.laneSafety = (m, from, to, team, v = 15) => {
    const d = V.fdist(from, to);
    let risk = 0;
    for (const o of m.players) {
      if (o.team === team) continue;
      const ab = V.sub(to, from), ao = V.sub(o.pos, from);
      const t = K.clamp(V.dot(ao, ab) / Math.max(1e-6, V.dot(ab, ab)), 0, 1);
      const cp = V.add(from, V.mul(ab, t));
      const tBall = (t * d) / v;
      const tOpp = 0.25 + V.fdist(o.pos, cp) / (o.a.topSpeed * 0.9) - 0.6;   // ~0.6 m reach
      risk = Math.max(risk, K.sat(1 - (tOpp - tBall) / 0.45));
    }
    return 1 - risk;
  };

  AI.decide = (m, p) => {
    const T = p.team, sign = T.attackSign;
    const near = AI.nearestOpponent(m, p);
    const pressure = K.sat(1 - near.d / 4.5);
    const here = AI.threat(p.pos, sign);
    const goal = { x: sign * P.HL, y: 0, z: 0 };
    const opts = [];
    const dGoal = V.fdist(p.pos, goal);
    if (dGoal < 30 && sign * p.pos.x > 0) {
      const xg = K.sat(here * 1.25 * (1 - pressure * 0.4));
      const inBox = dGoal < 17 && Math.abs(p.pos.y) < P.BOX_HW;
      opts.push({ kind: dGoal > 17 && Math.abs(p.pos.y) < 14 && Math.random() < 0.35 ? 'FinesseShot' : 'Shot', value: xg * 1.8 + (inBox ? 0.3 : 0) + (dGoal < 25 ? 0.12 : 0) });
    }
    for (const q of T.players) {
      if (q === p || q.injured) continue;
      if (q.isGK && pressure < 0.6) continue;
      const lead = V.mul(V.flat(q.vel), 0.6);
      const tgt = V.add(q.pos, lead);
      const d = V.fdist(p.pos, tgt);
      if (d < 5 || d > 50) continue;
      const safety = AI.laneSafety(m, p.pos, tgt, T, 9.5);   // real average speed of a ground pass
      const val = AI.threat(tgt, sign);
      const prog = sign * (tgt.x - p.pos.x) / 40;
      const wide = Math.abs(tgt.y) > P.BOX_HW && sign * tgt.x > P.HL - 24;
      const kind = d > 30 && safety < 0.5 ? 'LobPass' : 'GroundPass';
      const s2 = kind === 'LobPass' ? (AI.nearestOpponent(m, q).d < 2 ? 0.6 : 0.85) : safety;
      if (s2 < 0.3) continue;   // don't gift the ball away
      opts.push({ kind, q, target: tgt, value: (val + 0.06 * prog + 0.03) * s2 * s2 * (1 + pressure * 0.3) });
      // Through ball into a run
      if (V.flen(q.vel) > 4 && sign * q.vel.x > 2) {
        const tt = V.add(q.pos, V.mul(V.fnorm(q.vel), 7 + V.flen(q.vel) * 0.5));
        tt.x = K.clamp(tt.x, -P.HL + 2, P.HL - 2); tt.y = K.clamp(tt.y, -P.HW + 2, P.HW - 2);
        const ctl = AI.control(m, tt, T);
        opts.push({ kind: 'ThroughPass', q, target: tt, value: AI.threat(tt, sign) * ctl * AI.laneSafety(m, p.pos, tt, T, 11) * 1.1 });
      }
      if (wide && sign * p.pos.x > P.HL - 26 && Math.abs(p.pos.y) > P.BOX_HW - 4 && ROLE_ATT.has(q.role) && Math.abs(q.pos.y) < 10) {
        opts.push({ kind: 'Cross', q, target: { x: sign * (P.HL - 9), y: q.pos.y * 0.6, z: 0 }, value: 0.22 });
      }
    }
    // Dribble: toward goal, bent away from the nearest opponent.
    let dir = V.fnorm(V.sub(goal, p.pos));
    if (near.o && near.d < 7) dir = V.fnorm(V.add(V.mul(dir, 0.8), V.mul(V.fnorm(V.sub(p.pos, near.o.pos)), 0.7)));
    const ahead = V.add(p.pos, V.mul(dir, 6));
    let space = 99;
    for (const o of m.players) if (o.team !== T) space = Math.min(space, V.fdist(o.pos, ahead));
    opts.push({ kind: 'dribble', dir, sprint: space > 6 ? 'Full' : space > 3 ? 'Controlled' : 'None', value: AI.threat(ahead, sign) * K.sat(space / 7) + 0.03 + (1 - pressure) * 0.04 });
    // Clearance under pressure deep in our own half.
    if (sign * p.pos.x < -P.HL + 22 && pressure > 0.6) opts.push({ kind: 'Clearance', value: 0.3 });
    // Softmax-ish choice; colder (smarter) on higher difficulty.
    const temp = m.cpuTemp * (T.isUser ? 1.2 : 1);
    let sum = 0;
    for (const o of opts) { o.w = Math.exp(o.value / temp); sum += o.w; }
    let r = Math.random() * sum;
    for (const o of opts) { r -= o.w; if (r <= 0) return o; }
    return opts[opts.length - 1];
  };

  /** Restart / kickoff / GK distribution choice. */
  AI.restartChoice = (m, taker) => {
    const T = taker.team, sign = T.attackSign, r = m.restart;
    if (r && r.kind === 'corner') {
      const tgts = T.players.filter((q) => q !== taker && sign * q.pos.x > P.HL - 18 && Math.abs(q.pos.y) < 12);
      const q = tgts.sort((a, b) => b.a.heading - a.a.heading)[0];
      return { kind: 'Cross', q, target: q ? { x: q.pos.x, y: q.pos.y, z: 0 } : { x: sign * (P.HL - 8), y: 0, z: 0 }, power: 0.6 };
    }
    if (r && r.kind === 'freekick' && V.fdist(taker.pos, { x: sign * P.HL, y: 0, z: 0 }) < 30 && sign * taker.pos.x > 0) {
      return { kind: 'FinesseShot', power: 0.7 };
    }
    let best = null, bv = -1;
    const isThrow = r && r.kind === 'throw';
    for (const q of T.players) {
      if (q === taker || q.isGK) continue;
      const d = V.fdist(taker.pos, q.pos);
      if (d < (isThrow ? 4 : 6) || d > (isThrow ? 20 : 45)) continue;
      if (isThrow && AI.nearestOpponent(m, q).d < 2.5) continue;   // throws go short, to a free man
      const v = AI.laneSafety(m, taker.pos, q.pos, T, 9.5) * (0.6 + AI.threat(q.pos, sign)) - d * 0.003 + Math.random() * 0.1;
      if (v > bv) { bv = v; best = q; }
    }
    if (!best) return { kind: 'Clearance', power: 0.8 };
    const far = V.fdist(taker.pos, best.pos) > 30;
    return { kind: far || (r && r.kind === 'goalkick' && Math.random() < 0.5) ? 'LobPass' : 'GroundPass', q: best, target: V.copy(best.pos), power: 0.5 };
  };
})(window.KXI);
