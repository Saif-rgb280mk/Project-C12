// KINETIC XI — Engine Core
// camera.cpp : preset tables, slider mapping and the spring-tracked rig.
#include "kxi/camera.hpp"

#include <cmath>

namespace kxi {

CameraRigParams rigParams(const CameraSettings& s, double pitchWidth) {
    CameraRigParams p;
    // Sliders are 0..20 with 10 = preset default; they scale height/distance by +-40%.
    const double hScale = 0.6 + 0.04 * clamp(s.height, 0, 20);
    const double zScale = 0.6 + 0.04 * clamp(s.zoom, 0, 20);
    // Ball Tracking Speed: 0 = lazy 1.2 s, 20 = snappy 0.08 s (exponential feel).
    p.smoothTime = 1.2 * std::pow(0.08 / 1.2, clamp(s.trackingSpeed, 0, 20) / 20.0);

    switch (s.preset) {
        case CameraPreset::Broadcast:
            p.height = 16.0 * hScale; p.distance = 30.0 * zScale; p.fovDeg = 32.0;
            p.lookAhead = 0.35; p.lateralFollow = 0.45;
            break;
        case CameraPreset::Tele:   // long lens, high gantry: flattened, tactical
            p.height = 28.0 * hScale; p.distance = 58.0 * zScale; p.fovDeg = 20.0;
            p.lookAhead = 0.45; p.lateralFollow = 0.3;
            break;
        case CameraPreset::CoOp:   // wider and steadier for several humans
            p.height = 24.0 * hScale; p.distance = 40.0 * zScale; p.fovDeg = 40.0;
            p.lookAhead = 0.25; p.lateralFollow = 0.25; p.smoothTime *= 1.4;
            break;
        case CameraPreset::Pro:    // behind your player, eye-line view
            p.height = 3.2 * hScale; p.distance = 8.0 * zScale; p.fovDeg = 60.0;
            p.lookAhead = 0.0; p.behindPlayer = true; p.smoothTime *= 0.6;
            break;
        case CameraPreset::Custom: // the sliders map to absolute values
            p.height = 6.0 + 1.7 * clamp(s.height, 0, 20);
            p.distance = 20.0 + 2.5 * clamp(s.zoom, 0, 20);
            p.fovDeg = 35.0; p.lookAhead = 0.3; p.lateralFollow = 0.5;
            break;
    }
    (void)pitchWidth;
    return p;
}

CameraRig::CameraRig(const CameraSettings& s, PitchGeometryLite g) : settings_(s), p_(rigParams(s, g.width)), g_(g) {}

void CameraRig::setSettings(const CameraSettings& s) {
    settings_ = s;
    p_ = rigParams(s, g_.width);
}

CameraPose CameraRig::update(const Vec3& ball, const Vec3& ballVel, const Vec3& focus, double facing, double dt) {
    CameraPose pose;
    pose.fovDeg = p_.fovDeg;

    if (p_.behindPlayer) {
        // Smooth the yaw so the view doesn't whip around on every touch.
        if (!initialised_) { yaw_ = facing; initialised_ = true; }
        const double diff = wrapAngle(facing - yaw_);
        double target = yaw_ + diff;
        yaw_ = smoothDamp(yaw_, target, yawVel_, p_.smoothTime, dt);
        const Vec3 fwd = headingVector(yaw_);
        pose.eye = focus - fwd * p_.distance + Vec3{0, 0, p_.height};
        pose.target = focus + fwd * 10.0 + Vec3{0, 0, 1.0};
        return pose;
    }

    // Broadcast-family: a gantry camera on the near touchline (y < 0) that pans with play.
    const double halfL = g_.length * 0.5, halfW = g_.width * 0.5;
    const double aimX = clamp(ball.x + ballVel.x * p_.lookAhead, -halfL + 8.0, halfL - 8.0);
    const double aimY = clamp((ball.y + ballVel.y * p_.lookAhead) * p_.lateralFollow, -halfW, halfW);
    if (!initialised_) { tx_ = aimX; ty_ = aimY; initialised_ = true; }
    tx_ = smoothDamp(tx_, aimX, vx_, p_.smoothTime, dt);
    ty_ = smoothDamp(ty_, aimY, vy_, p_.smoothTime * 1.3, dt);

    pose.target = {tx_, ty_, 0.0};
    pose.eye = {tx_ * 0.85, -(halfW + p_.distance), p_.height};   // gantry pans less than the target
    return pose;
}

}  // namespace kxi
