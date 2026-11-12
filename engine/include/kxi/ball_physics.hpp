// KINETIC XI — Engine Core
// ball_physics.hpp : "True-Inertia" ball. Zero scripted trajectories, zero magnetism.
// Everything the ball does comes from forces and impulses:
//   * gravity
//   * aerodynamic drag with a Reynolds-number dependent drag crisis
//   * Magnus lift from spin (curl, dip, float)
//   * a seeded knuckle-ball side force when a shot is struck with almost no spin
//   * impulse-based bounces with Coulomb friction and spin transfer
//   * rolling resistance and skid->roll transition sampled from the living pitch
#pragma once

#include <cstdint>

#include "kxi/math.hpp"
#include "kxi/surface.hpp"

namespace kxi {

struct BallParams {
    double mass = 0.430;              // kg (Law 2: 410–450 g)
    double radius = 0.110;            // m  (circumference 68–70 cm)
    double inertiaFactor = 2.0 / 3.0; // I = k m r^2 ; thin shell = 2/3
    // Drag crisis: subcritical Cd ~0.47, supercritical ~0.17. Panel design moves the
    // critical Reynolds number — each ball model gets its own "flight personality".
    double cdSubcritical = 0.47;
    double cdSupercritical = 0.17;
    double reCritical = 2.4e5;
    double reTransitionWidth = 2.5e4;
    double maxLiftCoefficient = 0.38;
    // Knuckle-ball: erratic side force for low-spin strikes near the drag crisis.
    double knuckleStrength = 0.14;        // side-force coefficient amplitude
    double knuckleSpinThreshold = 9.0;    // rad/s; above this the wobble vanishes
    // Aerodynamic spin decay: dw/dt = -(k0 + k1*|v|) * w
    double spinDecayBase = 0.02;
    double spinDecayPerSpeed = 0.004;

    double area() const { return kPi * radius * radius; }
    double inertia() const { return inertiaFactor * mass * radius * radius; }
};

struct Atmosphere {
    double airDensity = 1.225;         // kg/m^3 at sea level, 15 C
    double dynamicViscosity = 1.81e-5; // Pa*s
    Vec3 wind{0.0, 0.0, 0.0};

    /// Ideal-gas density with altitude (barometric formula) and humidity correction.
    static Atmosphere fromConditions(double temperatureC, double altitudeM, double relativeHumidity,
                                     const Vec3& wind);
};

struct BallState {
    Vec3 pos{0.0, 0.0, 0.11};
    Vec3 vel{};
    Vec3 spin{};          // angular velocity, rad/s (world space)
    bool grounded = true; // in sustained contact with the turf (rolling / skidding)
    double time = 0.0;              // seconds since the last strike (drives knuckle phase)
    std::uint64_t knuckleSeed = 1;  // re-seeded on every strike (deterministic replays)
};

struct ForceBreakdown {
    Vec3 gravity, drag, magnus, knuckle;
    double reynolds = 0.0, cd = 0.0, cl = 0.0, spinParameter = 0.0;
};

struct StepReport {
    bool bounced = false;
    double impactSpeed = 0.0;   // normal speed at the bounce (audio + turf damage)
    bool landedRolling = false;
};

class BallPhysics {
public:
    explicit BallPhysics(BallParams params = {}, Atmosphere atmosphere = {});

    /// Advances the ball by dt, internally sub-stepping at <= maxSubstep (default 1/480 s).
    /// surface may be null (uses default dry coefficients).
    StepReport step(BallState& s, double dt, const PitchSurface* surface) const;

    /// Applies a strike impulse J (N*s) at contactOffset (from ball centre to the contact
    /// point on the ball surface). Spin emerges from the offset: strike the right side of
    /// the ball and it spins anticlockwise and curls left — no canned "finesse" curve.
    void applyStrike(BallState& s, const Vec3& impulse, const Vec3& contactOffset,
                     std::uint64_t seed) const;

    ForceBreakdown forces(const BallState& s) const;

    static double dragCoefficient(double reynolds, const BallParams& p);
    static double liftCoefficient(double spinParameter, double maxCl);

    const BallParams& params() const { return params_; }
    const Atmosphere& atmosphere() const { return atmosphere_; }
    void setAtmosphere(const Atmosphere& a) { atmosphere_ = a; }
    void setMaxSubstep(double s) { maxSubstep_ = s; }

private:
    struct Derivative { Vec3 dpos, dvel, dspin; };
    Derivative evaluate(const BallState& s) const;
    void integrateFlightRK4(BallState& s, double h) const;
    StepReport resolveGroundContact(BallState& s, double h, const ContactCoefficients& k) const;

    BallParams params_;
    Atmosphere atmosphere_;
    double maxSubstep_ = 1.0 / 480.0;
};

}  // namespace kxi
