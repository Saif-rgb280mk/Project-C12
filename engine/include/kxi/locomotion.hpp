// KINETIC XI — Engine Core
// locomotion.hpp : momentum-true athlete movement.
//   * Propulsion follows the sprint force–velocity relationship (a = a0 * (1 - v/vmax)),
//     so acceleration fades naturally as a player nears top speed.
//   * All accelerations live inside a traction "friction circle" sampled from the pitch:
//     on a soaked pitch players need wider arcs, and over-demanding grip causes a slip.
//   * Plant-and-cut: sharp direction changes can only be pushed through a planted foot.
//     Between foot plants the body is in swing phase and can barely redirect momentum.
//     The gait clock that decides foot plants also drives the IK foot placement.
#pragma once

#include "kxi/math.hpp"

namespace kxi {

enum class SprintLevel { None, Controlled, Full };

struct AthleteProfile {
    double massKg = 75.0;
    double heightM = 1.80;
    double topSpeed = 9.0;      // m/s (elite wide forwards reach 9.5–10)
    double maxAccel = 8.0;      // m/s^2 initial propulsive acceleration
    double maxDecel = 8.5;      // m/s^2 braking (eccentric load -> strain model)
    double agility = 0.75;      // 0..1 lateral grip usage / turn quality
    double balance = 0.75;      // 0..1 resistance to slips and shoulder charges
    double dribbling = 0.75;    // 0..1 speed retained while carrying the ball
    double legLength = 0.93;    // hip-to-ground, used by IK and stride length
};

/// What the controller (human intent arbiter or AI) asks the body to do this tick.
struct LocomotionCommand {
    Vec3 desiredDirection{};    // flat; zero = decelerate to a stop
    SprintLevel sprint = SprintLevel::None;
    bool strafe = false;        // keep facing locked (strafe dribble, jockey)
    double strafeFacing = 0.0;  // radians
    bool hold = false;          // stand still / stand on the ball
    bool withBall = false;
    bool jockey = false;        // defensive shuffle: lower speed, stays balanced
};

/// Multipliers coming from fatigue, injuries and gameplay sliders.
struct PerformanceScales {
    double topSpeed = 1.0;
    double accel = 1.0;
};

struct FootEvent {
    bool planted = false;
    int foot = 0;            // 0 left, 1 right
    Vec3 position{};
    double impulse = 0.0;    // N*s into the turf (wear, audio)
    double shear = 0.0;      // 0..1 share of the friction circle used (turf tearing)
    bool slipped = false;
};

struct LocomotionState {
    Vec3 pos{};
    Vec3 vel{};
    double facing = 0.0;     // radians
    double stepPhase = 0.0;  // accumulates 1.0 per step
    int nextFoot = 0;
    double slipTimer = 0.0;  // > 0 while recovering from a slip
    double lean = 0.0;       // radians, + = leaning left into a left turn
    Vec3 lastAccel{};
};

class Locomotion {
public:
    /// Target speed (m/s) for a command, before the physics limits are applied.
    static double targetSpeed(const LocomotionCommand& cmd, const AthleteProfile& p,
                              const PerformanceScales& s);

    /// Integrates one tick. traction = shoe/turf grip multiplier from PitchSurface.
    static FootEvent step(LocomotionState& st, const LocomotionCommand& cmd, const AthleteProfile& p,
                          const PerformanceScales& s, double traction, double dt);

    /// Steps per second at a given speed (walk ~1.8, sprint ~4.5).
    static double cadence(double speed) { return speed < 0.25 ? 0.0 : 1.6 + 0.32 * speed; }
};

}  // namespace kxi
