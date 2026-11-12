// KINETIC XI — Engine Core
// fatigue.hpp : a three-layer physiological model, grounded in sports science.
//   1. Anaerobic reserve  — the Critical-Speed / D' model (the running equivalent of the
//      cycling Critical-Power / W' balance model by Skiba et al.). Running faster than the
//      player's critical speed spends D' metres; running slower restores it exponentially.
//   2. Match glycogen     — a slow tank that lowers critical speed late in the match.
//   3. Muscle strain      — acute load from hard decelerations and near-max sprints on a
//      tired body; it decays, but also feeds a slow chronic load. Together with pitch
//      hardness and the Injury Frequency slider it drives an injury hazard rate.
// Integrate in *match time*: when halves are shortened, the caller scales dt so a 6-minute
// half still produces a believable 45-minute physiological curve.
#pragma once

#include "kxi/math.hpp"

namespace kxi {

struct FatigueProfile {
    double criticalSpeed = 4.2;     // m/s sustainable without draining D'
    double dPrimeMax = 180.0;       // metres of running above critical speed
    double stamina = 0.75;          // 0..1 (glycogen economy, D' recovery speed)
    double injuryProneness = 0.3;   // 0..1 (history, age, hamstring profile)
};

struct FatigueState {
    double dPrime = 180.0;
    double glycogen = 1.0;          // 1 full .. 0 empty
    double acuteStrain = 0.0;       // 0.. ~1+
    double chronicStrain = 0.0;     // 0..1
    double distanceM = 0.0;
    double highSpeedDistanceM = 0.0;   // > 5.5 m/s (broadcast "sprint distance" stat)
    bool injured = false;
};

struct PerformanceModifiers {
    double topSpeedScale = 1.0;
    double accelScale = 1.0;
    double technicalErrorScale = 1.0;  // multiplies pass/shot/first-touch error
    double reactionScale = 1.0;        // multiplies AI decision latency
};

class FatigueModel {
public:
    explicit FatigueModel(FatigueProfile p = {}) : p_(p) {}

    void reset(FatigueState& s) const;
    double effectiveCriticalSpeed(const FatigueState& s) const;

    /// speed (m/s), speedFraction (speed / personal top speed), tangential accel (m/s^2;
    /// negative = braking), dt in match seconds, pitch hardness 0..1.
    void update(FatigueState& s, double speed, double speedFraction, double accelTangential,
                double dt, double pitchHardness) const;

    PerformanceModifiers modifiers(const FatigueState& s) const;

    /// Injury hazard (expected injuries per match-minute). Slider 0..100 (50 = realistic).
    double injuryHazardPerMinute(const FatigueState& s, int injuryFrequencySlider) const;
    bool rollInjury(const FatigueState& s, int injuryFrequencySlider, double dt, Rng& rng) const;

    const FatigueProfile& profile() const { return p_; }

private:
    FatigueProfile p_;
};

}  // namespace kxi
