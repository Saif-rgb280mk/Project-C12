// KINETIC XI — Engine Core
// foot_ik.hpp : full-body grounding. An analytic two-bone IK solver per leg plus a pelvis
// solver that lowers/tilts the hips so planted feet never slide or float, and shifts the
// centre of mass over the support foot in proportion to the lateral acceleration.
// Animation provides the *style*; this layer guarantees the *contact truth*.
#pragma once

#include "kxi/math.hpp"

namespace kxi {

struct TwoBoneResult {
    Vec3 knee{};
    Vec3 foot{};          // where the foot actually ends up (== target if reachable)
    bool reached = false;
    double kneeAngle = 0.0;  // interior angle at the knee, radians (pi = straight leg)
};

/// Solves hip->knee->foot so that |knee-hip| = upper and |foot-knee| = lower. The knee bends
/// toward poleHint (a point in front of the knee). Never produces NaN; clamps unreachable
/// targets to the maximum (99.9%) extension along the hip->target ray.
TwoBoneResult solveTwoBone(const Vec3& hip, const Vec3& target, const Vec3& poleHint,
                           double upper, double lower);

struct LegRig {
    double upper = 0.46;     // thigh length
    double lower = 0.47;     // shin + foot height
    double hipHalfWidth = 0.10;
};

struct PelvisInput {
    Vec3 pelvisAnimated{};   // where the animation wants the pelvis
    double facing = 0.0;
    Vec3 leftFootTarget{};   // planted (or swing) foot targets on the turf
    Vec3 rightFootTarget{};
    double lateralAccel = 0.0;   // m/s^2, + = toward the player's left
    int supportFoot = 0;         // which foot carries the weight right now
};

struct PelvisResult {
    Vec3 pelvis{};
    TwoBoneResult left, right;
    double comShift = 0.0;   // metres the centre of mass moved toward the support foot
    double pelvisDrop = 0.0; // metres the pelvis was lowered to keep both feet in contact
};

/// Lowers the pelvis just enough for both foot targets to be reachable, then shifts the
/// centre of mass over the support foot (weight transfer) and solves both legs.
PelvisResult solveGrounding(const PelvisInput& in, const LegRig& rig);

}  // namespace kxi
