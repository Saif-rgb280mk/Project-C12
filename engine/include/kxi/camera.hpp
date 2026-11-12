// KINETIC XI — Engine Core
// camera.hpp : gameplay camera rigs — Broadcast, Tele, Co-op, Pro, Custom — driven by the
// Height / Zoom / Ball Tracking Speed sliders. Tracking uses critically-damped springs with
// velocity look-ahead (the operator "leads" the ball like a real broadcast cameraman) and
// never overshoots.
#pragma once

#include "kxi/math.hpp"
#include "kxi/settings.hpp"

namespace kxi {

struct PitchGeometryLite {
    double length = 105.0;
    double width = 68.0;
};

struct CameraPose {
    Vec3 eye{};
    Vec3 target{};
    double fovDeg = 35.0;
};

struct CameraRigParams {
    double height = 16.0;          // metres above the turf
    double distance = 40.0;        // metres back from the near touchline (or behind player)
    double fovDeg = 32.0;
    double smoothTime = 0.35;      // seconds (from Ball Tracking Speed)
    double lookAhead = 0.35;       // seconds of ball-velocity lead
    double lateralFollow = 0.5;    // how much the target follows the ball across the pitch
    bool behindPlayer = false;     // Pro camera
};

/// Translates the menu settings into physical rig parameters.
CameraRigParams rigParams(const CameraSettings& s, double pitchWidth = 68.0);

class CameraRig {
public:
    explicit CameraRig(const CameraSettings& s, PitchGeometryLite g = {});
    void setSettings(const CameraSettings& s);
    CameraPose update(const Vec3& ball, const Vec3& ballVel, const Vec3& focusPlayer,
                      double focusFacing, double dt);
    const CameraRigParams& params() const { return p_; }

private:
    CameraSettings settings_;
    CameraRigParams p_;
    PitchGeometryLite g_;
    double tx_ = 0.0, ty_ = 0.0, vx_ = 0.0, vy_ = 0.0;
    double yaw_ = 0.0, yawVel_ = 0.0;
    bool initialised_ = false;
};

}  // namespace kxi
