// KINETIC XI — Engine Core
// foot_ik.cpp : law-of-cosines two-bone IK + pelvis grounding and weight shift.
#include "kxi/foot_ik.hpp"

#include <cmath>

namespace kxi {

TwoBoneResult solveTwoBone(const Vec3& hip, const Vec3& target, const Vec3& poleHint,
                           double upper, double lower) {
    TwoBoneResult r;
    const Vec3 toTarget = target - hip;
    const double rawDist = length(toTarget);
    const Vec3 u = normalizeOr(toTarget, Vec3{0.0, 0.0, -1.0});

    const double maxReach = (upper + lower) * 0.999;
    const double minReach = std::abs(upper - lower) + 1e-4;
    const double d = clamp(rawDist, minReach, maxReach);
    r.reached = rawDist <= maxReach && rawDist >= minReach;

    // Bend direction: component of (pole - hip) perpendicular to the hip->target axis.
    Vec3 toPole = poleHint - hip;
    Vec3 bend = toPole - u * dot(toPole, u);
    bend = normalizeOr(bend, normalizeOr(cross(u, Vec3{0.0, 1.0, 0.0}), Vec3{1.0, 0.0, 0.0}));

    const double cosHip = clamp((upper * upper + d * d - lower * lower) / (2.0 * upper * d), -1.0, 1.0);
    const double sinHip = std::sqrt(std::max(0.0, 1.0 - cosHip * cosHip));
    r.knee = hip + u * (upper * cosHip) + bend * (upper * sinHip);
    r.foot = hip + u * d;
    const double cosKnee = clamp((upper * upper + lower * lower - d * d) / (2.0 * upper * lower), -1.0, 1.0);
    r.kneeAngle = std::acos(cosKnee);
    return r;
}

PelvisResult solveGrounding(const PelvisInput& in, const LegRig& rig) {
    PelvisResult out;
    const Vec3 left = headingVector(in.facing + kPi * 0.5);
    const Vec3 forward = headingVector(in.facing);

    // 1) Weight transfer: lean the centre of mass toward the support foot. The shift grows
    //    with lateral acceleration (cutting) and is capped at ~9 cm.
    const double supportSign = in.supportFoot == 0 ? 1.0 : -1.0;
    out.comShift = clamp(0.03 + std::abs(in.lateralAccel) * 0.008, 0.0, 0.09);
    Vec3 pelvis = in.pelvisAnimated + left * (out.comShift * supportSign);

    // 2) Pelvis drop: lower the hips until the farther foot target becomes reachable.
    const double reach = (rig.upper + rig.lower) * 0.995;
    double requiredDrop = 0.0;
    for (int side = 0; side < 2; ++side) {
        const double s = side == 0 ? 1.0 : -1.0;
        const Vec3 hip = pelvis + left * (rig.hipHalfWidth * s);
        const Vec3 target = side == 0 ? in.leftFootTarget : in.rightFootTarget;
        const Vec3 d = target - hip;
        const double horizontal = flatLength(d);
        if (horizontal < reach) {
            const double maxVertical = std::sqrt(reach * reach - horizontal * horizontal);
            const double vertical = hip.z - target.z;
            requiredDrop = std::max(requiredDrop, vertical - maxVertical);
        }
    }
    out.pelvisDrop = clamp(requiredDrop, 0.0, 0.25);  // never crouch more than 25 cm
    pelvis.z -= out.pelvisDrop;
    out.pelvis = pelvis;

    // 3) Solve each leg; knees point forward (pole 0.5 m in front of the knee line).
    const Vec3 hipL = pelvis + left * rig.hipHalfWidth;
    const Vec3 hipR = pelvis - left * rig.hipHalfWidth;
    out.left = solveTwoBone(hipL, in.leftFootTarget, hipL + forward * 0.5 + Vec3{0, 0, -0.4},
                            rig.upper, rig.lower);
    out.right = solveTwoBone(hipR, in.rightFootTarget, hipR + forward * 0.5 + Vec3{0, 0, -0.4},
                             rig.upper, rig.lower);
    return out;
}

}  // namespace kxi
