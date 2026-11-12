// KINETIC XI — Engine Core
// ball_physics.cpp : aerodynamics (drag crisis, Magnus, knuckle), RK4 flight integration,
// impulse-based bounce with friction/spin transfer, skid-to-roll and rolling resistance.
#include "kxi/ball_physics.hpp"

#include <cmath>

namespace kxi {

Atmosphere Atmosphere::fromConditions(double temperatureC, double altitudeM, double relativeHumidity,
                                      const Vec3& wind) {
    Atmosphere a;
    const double T = temperatureC + 273.15;
    const double pressure = 101325.0 * std::pow(1.0 - 2.25577e-5 * altitudeM, 5.25588);
    const double pSat = 610.78 * std::pow(10.0, 7.5 * temperatureC / (temperatureC + 237.3));
    const double pVapour = saturate(relativeHumidity) * pSat;
    const double pDry = pressure - pVapour;
    a.airDensity = pDry / (287.058 * T) + pVapour / (461.495 * T);   // humid air is LIGHTER
    a.dynamicViscosity = 1.716e-5 * std::pow(T / 273.15, 1.5) * (273.15 + 110.4) / (T + 110.4);
    a.wind = wind;
    return a;
}

BallPhysics::BallPhysics(BallParams params, Atmosphere atmosphere)
    : params_(params), atmosphere_(atmosphere) {}

double BallPhysics::dragCoefficient(double re, const BallParams& p) {
    // Logistic blend between sub- and super-critical regimes (the "drag crisis").
    const double t = 1.0 / (1.0 + std::exp((re - p.reCritical) / p.reTransitionWidth));
    return p.cdSupercritical + (p.cdSubcritical - p.cdSupercritical) * t;
}

double BallPhysics::liftCoefficient(double s, double maxCl) {
    // Piecewise-linear fit to wind-tunnel data for spinning spheres (Sawicki et al.).
    const double cl = (s < 0.1) ? 1.5 * s : 0.09 + 0.6 * s;
    return std::min(cl, maxCl);
}

ForceBreakdown BallPhysics::forces(const BallState& s) const {
    ForceBreakdown f;
    const BallParams& p = params_;
    const double rho = atmosphere_.airDensity;
    const Vec3 vRel = s.vel - atmosphere_.wind;
    const double speed = length(vRel);
    const double area = p.area();

    f.gravity = {0.0, 0.0, -p.mass * kGravity};
    if (speed < 1e-6) return f;

    f.reynolds = rho * speed * (2.0 * p.radius) / atmosphere_.dynamicViscosity;
    f.cd = dragCoefficient(f.reynolds, p);
    f.drag = vRel * (-0.5 * rho * f.cd * area * speed);

    const double omega = length(s.spin);
    if (omega > 1e-6) {
        f.spinParameter = p.radius * omega / speed;
        f.cl = liftCoefficient(f.spinParameter, p.maxLiftCoefficient);
        // cross(w_hat, v_hat) carries the sin(theta) factor automatically.
        const Vec3 dir = cross(s.spin / omega, vRel / speed);
        f.magnus = dir * (0.5 * rho * f.cl * area * speed * speed);
    }

    // Knuckle-ball: low spin + speed near the drag crisis -> asymmetric boundary-layer
    // separation -> a wandering side force. Deterministic from the strike seed.
    if (omega < p.knuckleSpinThreshold && speed > 8.0 && p.knuckleStrength > 0.0) {
        const double z = (f.reynolds - p.reCritical) / (5.0 * p.reTransitionWidth);
        const double weight = (1.0 - omega / p.knuckleSpinThreshold) * std::exp(-z * z);
        const Vec3 vHat = vRel / speed;
        const Vec3 side = normalizeOr(cross(vHat, Vec3{0, 0, 1}), Vec3{0, 1, 0});
        const Vec3 upish = cross(side, vHat);
        const double travel = s.time * speed / 22.0;   // long, irregular ~22 m wobble wavelength
        const Vec3 n = side * valueNoise1D(travel, s.knuckleSeed) +
                       upish * (0.6 * valueNoise1D(travel, s.knuckleSeed + 977));
        f.knuckle = n * (0.5 * rho * area * speed * speed * p.knuckleStrength * weight);
    }
    return f;
}

BallPhysics::Derivative BallPhysics::evaluate(const BallState& s) const {
    const ForceBreakdown f = forces(s);
    const Vec3 total = f.gravity + f.drag + f.magnus + f.knuckle;
    const double speed = length(s.vel - atmosphere_.wind);
    Derivative d;
    d.dpos = s.vel;
    d.dvel = total / params_.mass;
    d.dspin = s.spin * (-(params_.spinDecayBase + params_.spinDecayPerSpeed * speed));
    return d;
}

void BallPhysics::integrateFlightRK4(BallState& s, double h) const {
    auto advance = [](const BallState& base, const Derivative& d, double dt) {
        BallState r = base;
        r.pos += d.dpos * dt;
        r.vel += d.dvel * dt;
        r.spin += d.dspin * dt;
        r.time += dt;
        return r;
    };
    const Derivative k1 = evaluate(s);
    const Derivative k2 = evaluate(advance(s, k1, h * 0.5));
    const Derivative k3 = evaluate(advance(s, k2, h * 0.5));
    const Derivative k4 = evaluate(advance(s, k3, h));
    s.pos += (k1.dpos + (k2.dpos + k3.dpos) * 2.0 + k4.dpos) * (h / 6.0);
    s.vel += (k1.dvel + (k2.dvel + k3.dvel) * 2.0 + k4.dvel) * (h / 6.0);
    s.spin += (k1.dspin + (k2.dspin + k3.dspin) * 2.0 + k4.dspin) * (h / 6.0);
}

StepReport BallPhysics::resolveGroundContact(BallState& s, double /*h*/, const ContactCoefficients& k) const {
    StepReport rep;
    const BallParams& p = params_;
    const double r = p.radius;
    const double m = p.mass;
    const double I = p.inertia();
    s.pos.z = r;
    if (s.vel.z >= 0.0) return rep;

    const double impact = -s.vel.z;
    rep.bounced = true;
    rep.impactSpeed = impact;
    // Viscoelastic ball: restitution falls slightly with impact speed.
    const double e = k.restitution * (1.0 - 0.15 * saturate((impact - 5.0) / 20.0));
    const double jn = m * (1.0 + e) * impact;
    s.vel.z = e * impact;

    // Tangential impulse at the contact point (Coulomb-limited, can achieve rolling).
    const Vec3 rc{0.0, 0.0, -r};
    const Vec3 vc = flat(s.vel) + cross(s.spin, rc);
    const double vcLen = flatLength(vc);
    if (vcLen > 1e-6) {
        const double jStick = vcLen / (1.0 / m + r * r / I);
        const double j = std::min(jStick, k.slidingFriction * jn);
        const Vec3 jt = vc * (-j / vcLen);
        s.vel += jt / m;
        s.spin += cross(rc, jt) / I;
    }
    s.spin.z *= 0.9;  // torsional scrub during the bounce

    if (s.vel.z < 0.35) {  // too little bounce left: settle onto the turf
        s.vel.z = 0.0;
        s.grounded = true;
        rep.landedRolling = true;
    }
    return rep;
}

StepReport BallPhysics::step(BallState& s, double dt, const PitchSurface* surface) const {
    StepReport report;
    const BallParams& p = params_;
    const double r = p.radius;
    const double m = p.mass;
    const double I = p.inertia();
    const Vec3 rc{0.0, 0.0, -r};

    double remaining = dt;
    while (remaining > 1e-12) {
        const double h = std::min(maxSubstep_, remaining);
        const ContactCoefficients k = surface ? surface->coefficientsAt(s.pos) : ContactCoefficients{};

        if (!s.grounded) {
            integrateFlightRK4(s, h);
            if (s.pos.z < r) {
                const StepReport c = resolveGroundContact(s, h, k);
                if (c.bounced) {
                    report.bounced = true;
                    report.impactSpeed = std::max(report.impactSpeed, c.impactSpeed);
                }
                report.landedRolling = report.landedRolling || c.landedRolling;
            }
        } else {
            const double speed0 = flatLength(s.vel);
            if (speed0 < 1e-4 && std::abs(s.spin.z) < 1e-3) {
                s.vel = {};
                s.spin = {};
            } else {
                // Planar aerodynamics still act on a rolling ball (drag, sidespin curl).
                const ForceBreakdown f = forces(s);
                s.vel += flat(f.drag + f.magnus) * (h / m);

                // Skid phase: kinetic friction drives the contact slip to zero (pure roll).
                const Vec3 vc = flat(s.vel) + cross(s.spin, rc);
                const double vcLen = flatLength(vc);
                if (vcLen > 0.02) {
                    const double jNeed = vcLen / (1.0 / m + r * r / I);
                    const double j = std::min(jNeed, k.slidingFriction * m * kGravity * h);
                    const Vec3 jt = vc * (-j / vcLen);
                    s.vel += jt / m;
                    s.spin += cross(rc, jt) / I;
                } else {
                    s.spin.x = -s.vel.y / r;
                    s.spin.y = s.vel.x / r;
                }

                // Rolling resistance (grass length, water film, puddles, mud).
                const double sp = flatLength(s.vel);
                const double dec = k.rollingResistance * kGravity * h;
                if (sp <= dec) {
                    s.vel.x = s.vel.y = 0.0;
                    s.spin.x = s.spin.y = 0.0;
                } else {
                    s.vel = flat(s.vel) * ((sp - dec) / sp);
                }
                // Torsional friction removes sidespin while the ball rolls.
                const double dz = std::min(std::abs(s.spin.z), 6.0 * h);
                s.spin.z -= (s.spin.z > 0 ? dz : -dz);
            }
            s.pos += flat(s.vel) * h;
            s.pos.z = r;
            s.vel.z = 0.0;
        }
        s.time += h;
        remaining -= h;
    }
    return report;
}

void BallPhysics::applyStrike(BallState& s, const Vec3& impulse, const Vec3& contactOffset,
                              std::uint64_t seed) const {
    s.vel += impulse / params_.mass;
    s.spin += cross(contactOffset, impulse) / params_.inertia();
    s.grounded = false;  // contact resolution re-settles it next step if it stays low
    s.knuckleSeed = seed;
    s.time = 0.0;
}

}  // namespace kxi
