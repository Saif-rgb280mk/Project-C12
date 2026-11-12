// KINETIC XI — Engine Core
// fatigue.cpp : D' balance, glycogen depletion, strain accumulation, injury hazard.
#include "kxi/fatigue.hpp"

#include <cmath>

namespace kxi {

void FatigueModel::reset(FatigueState& s) const {
    s = FatigueState{};
    s.dPrime = p_.dPrimeMax;
}

double FatigueModel::effectiveCriticalSpeed(const FatigueState& s) const {
    // Late in the match an empty glycogen tank lowers the sustainable pace by up to 12%.
    return p_.criticalSpeed * (0.88 + 0.12 * s.glycogen);
}

void FatigueModel::update(FatigueState& s, double speed, double speedFraction, double accelT,
                          double dt, double hardness) const {
    const double cs = effectiveCriticalSpeed(s);
    if (speed > cs) {
        // Spending: every metre above CS costs D' (accelerating costs extra).
        s.dPrime -= (speed - cs) * dt * (1.0 + 0.25 * std::max(0.0, accelT) / 4.0);
    } else {
        // Recovery: exponential, faster the further below CS the player is moving.
        double tau = 546.0 * std::exp(-0.5 * (cs - speed)) + 120.0;
        tau *= (1.3 - 0.6 * p_.stamina);
        s.dPrime += (p_.dPrimeMax - s.dPrime) / tau * dt;
    }
    s.dPrime = clamp(s.dPrime, 0.0, p_.dPrimeMax);

    // Glycogen: baseline metabolism + cost growing with speed^2.
    s.glycogen -= dt * (0.000045 + 0.000012 * speed * speed) * (1.2 - 0.4 * p_.stamina);
    s.glycogen = clamp(s.glycogen, 0.0, 1.0);

    // Strain: eccentric braking and near-max sprinting on tired legs, harder pitch = worse.
    const double dPrimeFrac = s.dPrime / p_.dPrimeMax;
    double load = 0.0;
    if (accelT < -3.0) load += (-accelT - 3.0) * 0.02;
    load += std::max(0.0, speedFraction - 0.9) * 0.15 * (1.0 + (1.0 - dPrimeFrac));
    s.acuteStrain += load * dt * (0.8 + 0.4 * hardness);
    s.acuteStrain -= s.acuteStrain * dt / 90.0;          // ~90 s decay
    s.chronicStrain = saturate(s.chronicStrain + s.acuteStrain * dt / 1800.0);

    s.distanceM += speed * dt;
    if (speed > 5.5) s.highSpeedDistanceM += speed * dt;
}

PerformanceModifiers FatigueModel::modifiers(const FatigueState& s) const {
    const double dpf = s.dPrime / p_.dPrimeMax;
    PerformanceModifiers m;
    m.topSpeedScale = (0.80 + 0.20 * std::sqrt(dpf)) * (0.94 + 0.06 * s.glycogen);
    m.accelScale = (0.75 + 0.25 * dpf) * (0.92 + 0.08 * s.glycogen);
    m.technicalErrorScale = 1.0 + 0.6 * (1.0 - dpf) + 0.5 * (1.0 - s.glycogen);
    m.reactionScale = 1.0 + 0.15 * (1.0 - dpf) + 0.3 * (1.0 - s.glycogen);
    if (s.injured) {
        m.topSpeedScale *= 0.6;
        m.accelScale *= 0.5;
        m.technicalErrorScale *= 1.4;
    }
    return m;
}

double FatigueModel::injuryHazardPerMinute(const FatigueState& s, int slider) const {
    slider = clamp(slider, 0, 100);
    const double sliderMul = slider <= 50 ? slider / 50.0 : 1.0 + 2.0 * (slider - 50) / 50.0;
    const double dpf = s.dPrime / p_.dPrimeMax;
    constexpr double kBase = 0.0003;  // ~0.6 time-loss injuries per match across 22 players
    return kBase * sliderMul * (1.0 + 8.0 * s.acuteStrain * s.acuteStrain) *
           (1.0 + 1.5 * s.chronicStrain) * (1.0 + 1.2 * (1.0 - dpf)) * (0.6 + 0.8 * p_.injuryProneness);
}

bool FatigueModel::rollInjury(const FatigueState& s, int slider, double dt, Rng& rng) const {
    if (s.injured) return false;
    const double p = 1.0 - std::exp(-injuryHazardPerMinute(s, slider) * dt / 60.0);
    return rng.uniform() < p;
}

}  // namespace kxi
