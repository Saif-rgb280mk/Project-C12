// KINETIC XI — Engine Core
// locomotion.cpp : force–velocity propulsion, friction circle, plant-and-cut turning, gait.
#include "kxi/locomotion.hpp"

#include <cmath>

namespace kxi {

double Locomotion::targetSpeed(const LocomotionCommand& cmd, const AthleteProfile& p,
                               const PerformanceScales& s) {
    if (cmd.hold) return 0.0;
    double fraction = 0.62;                                   // purposeful running
    if (cmd.sprint == SprintLevel::Controlled) fraction = 0.80;
    if (cmd.sprint == SprintLevel::Full) fraction = 1.0;
    if (cmd.withBall) {
        // Carrying the ball costs speed; great dribblers lose less.
        fraction *= (cmd.sprint == SprintLevel::Full) ? (0.84 + 0.12 * p.dribbling)
                                                      : (0.93 + 0.05 * p.dribbling);
    }
    if (cmd.strafe) fraction = std::min(fraction, 0.45);
    if (cmd.jockey) fraction = std::min(fraction, cmd.sprint == SprintLevel::None ? 0.42 : 0.60);
    return p.topSpeed * s.topSpeed * fraction;
}

FootEvent Locomotion::step(LocomotionState& st, const LocomotionCommand& cmd, const AthleteProfile& p,
                           const PerformanceScales& s, double traction, double dt) {
    FootEvent ev;
    const Vec3 dir = normalize(flat(cmd.desiredDirection));
    const double vTarget = (length(dir) > 0.0) ? targetSpeed(cmd, p, s) : 0.0;
    const Vec3 vDesired = dir * vTarget;

    Vec3 v = flat(st.vel);
    const double speed = flatLength(v);

    // --- Gait clock first: we need to know whether a foot plants during this tick. ---
    const double previousPhase = st.stepPhase;
    st.stepPhase += cadence(speed) * dt;
    const bool plantThisTick = std::floor(st.stepPhase) > std::floor(previousPhase);

    // --- Decompose the requested velocity change into tangential and normal parts. ---
    const Vec3 tHat = speed > 0.2 ? v / speed : (length(dir) > 0 ? dir : headingVector(st.facing));
    const Vec3 dv = vDesired - v;
    const double dvT = dot(dv, tHat);
    const Vec3 dvNVec = dv - tHat * dvT;
    const double dvN = flatLength(dvNVec);

    const double vmax = p.topSpeed * s.topSpeed;
    double aTMax;
    if (dvT > 0.0) {
        // Force–velocity: propulsive capacity shrinks linearly toward top speed.
        aTMax = std::max(0.6, p.maxAccel * s.accel * (1.0 - speed / (vmax * 1.02)));
    } else {
        aTMax = p.maxDecel * std::sqrt(s.accel);   // braking degrades less with fatigue
    }
    const double frictionLimit = traction * kGravity * 1.05;
    double aNMax = traction * kGravity * (0.55 + 0.45 * p.agility);

    // Plant-and-cut: a big redirection at speed needs a planted foot.
    const double turnDemand = (speed > 3.0 && length(dir) > 0.0)
                                  ? std::acos(clamp(dot(tHat, dir), -1.0, 1.0)) : 0.0;
    if (turnDemand > 0.7 && !plantThisTick) aNMax *= 0.35;

    const double aT = clamp(dvT / dt, -aTMax, aTMax);
    const double aN = std::min(dvN / dt, aNMax);
    Vec3 a = tHat * aT + (dvN > 1e-9 ? dvNVec * (aN / dvN) : Vec3{});

    // --- Friction circle: the turf decides what is physically possible. ---
    const double demanded = flatLength(a);
    if (demanded > frictionLimit) {
        const double slipThreshold = frictionLimit * (1.15 + 0.35 * p.balance);
        if (demanded > slipThreshold && traction < 0.9 && st.slipTimer <= 0.0) {
            st.slipTimer = 0.35;  // feet go from under him: brief loss of drive & control
            ev.slipped = true;
        }
        a = a * (frictionLimit / demanded);
    }
    if (st.slipTimer > 0.0) {
        a = a * 0.25;
        st.slipTimer -= dt;
    }

    v += a * dt;
    st.vel = v;
    st.pos += v * dt;
    st.lastAccel = a;

    // --- Facing ---
    const double newSpeed = flatLength(v);
    auto turnToward = [&](double target, double rate) {
        const double diff = wrapAngle(target - st.facing);
        const double maxStep = rate * dt;
        st.facing = wrapAngle(st.facing + clamp(diff, -maxStep, maxStep));
    };
    if (cmd.strafe || cmd.jockey) {
        turnToward(cmd.strafeFacing, 8.0);
    } else if (newSpeed > 0.5) {
        turnToward(headingOf(v), 12.0 - 6.0 * saturate(newSpeed / std::max(1.0, vmax)));
    } else if (length(dir) > 0.0) {
        turnToward(headingOf(dir), 10.0);
    }

    // Lean into the turn (drives the full-body pose & IK pelvis tilt).
    const Vec3 left = headingVector(st.facing + kPi * 0.5);
    st.lean = std::atan2(dot(a, left), kGravity);

    // --- Foot plant event ---
    if (plantThisTick) {
        const int foot = st.nextFoot;
        st.nextFoot ^= 1;
        const double side = foot == 0 ? 1.0 : -1.0;
        ev.planted = true;
        ev.foot = foot;
        ev.position = st.pos + left * (0.11 * side) + v * 0.08;
        ev.position.z = 0.0;
        ev.impulse = p.massKg * (1.5 + 0.35 * newSpeed);
        ev.shear = saturate(flatLength(a) / std::max(0.1, frictionLimit));
    }
    return ev;
}

}  // namespace kxi
