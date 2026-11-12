// KINETIC XI — Engine Core
// tactics.hpp : the team brain.
//   PitchControl      — physics-based "who gets there first" probability field (in the
//                       spirit of Spearman's pitch-control model) used by every decision.
//   ThreatSurface     — expected-threat style value of having the ball at a location.
//   OffBallRunPlanner — teammates search candidate runs and pick the one that adds the
//                       most threat in space they can actually win, minus offside risk.
//   DefensiveLine     — a coordinated zonal back line: height, compactness, ball-side
//                       shift, step-up and drop triggers, offside-trap leader.
//   AdaptiveManager   — the CPU manager. It watches YOUR habits (flank bias, through-ball
//                       addiction, crossing, long shots, slow build-up, dribbling) and
//                       re-plans at tactical windows with hysteresis — visibly and fairly.
#pragma once

#include <array>
#include <string>
#include <vector>

#include "kxi/math.hpp"

namespace kxi {

struct AgentSnapshot {
    Vec3 pos{};
    Vec3 vel{};
    int team = 0;
    double maxSpeed = 8.5;
    double reactionTime = 0.25;   // seconds before the agent starts moving toward a point
};

/// Pitch dimensions: x in [-L/2, L/2], y in [-W/2, W/2]. Team 0 attacks +x by default.
struct PitchGeometry {
    double length = 105.0;
    double width = 68.0;
    double goalHalfWidth = 3.66;
};

class PitchControl {
public:
    explicit PitchControl(double temperature = 0.45) : sigma_(temperature) {}
    /// Time for an agent to reach a point: reaction + travel (with current-velocity carry).
    static double timeToReach(const AgentSnapshot& a, const Vec3& point);
    /// Probability that `team` controls `point` (softmin over arrival times).
    double probability(const std::vector<AgentSnapshot>& agents, const Vec3& point, int team) const;

private:
    double sigma_;
};

class ThreatSurface {
public:
    explicit ThreatSurface(PitchGeometry g = {}) : g_(g) {}
    /// Value in [0,1] of possessing the ball at p when attacking toward +x (sign = +1) or -x.
    double value(const Vec3& p, int attackSign) const;

private:
    PitchGeometry g_;
};

struct RunCandidate {
    Vec3 target{};
    double score = -1e9;
    double threat = 0.0;
    double control = 0.0;
    bool offsideRisk = false;
};

struct RunPlannerConfig {
    double runFrequency = 1.0;        // from the Run Frequency slider (0.25 .. 2.0)
    double maxRunLength = 22.0;
    int angularSamples = 12;
    int radialSamples = 3;
    double shapeWeight = 0.015;       // pull back toward the formation anchor
};

class OffBallRunPlanner {
public:
    OffBallRunPlanner(PitchGeometry g = {}, RunPlannerConfig c = {}) : g_(g), c_(c), threat_(g) {}

    /// Best run for `runner` (index into agents). secondLastDefenderX is the offside line.
    RunCandidate plan(const std::vector<AgentSnapshot>& agents, int runner, const Vec3& anchor,
                      const Vec3& ballPos, int attackSign, double secondLastDefenderX) const;

private:
    PitchGeometry g_;
    RunPlannerConfig c_;
    ThreatSurface threat_;
    PitchControl control_;
};

struct LineInputs {
    Vec3 ballPos{};
    int defendSign = -1;            // -1: defending the goal at -x
    bool carrierPressured = false;
    bool carrierFacingOwnGoal = false;
    bool ballMovingBackward = false; // backward pass by the opponent: step-up trigger
    bool runnerInBehindThreat = false;
    double lineHeightSlider = 50;    // 0..100
    double lineLengthSlider = 50;    // compactness (distance to midfield line)
    double lineWidthSlider = 50;
};

struct LineOutput {
    double lineX = 0.0;              // x of the back line
    double midfieldX = 0.0;          // x of the midfield line
    std::array<double, 4> slotY{};   // y for LB, LCB, RCB, RB (zonal, ball-side shift)
    std::string trigger;             // "hold", "step-up", "drop", "compress"
};

class DefensiveLine {
public:
    explicit DefensiveLine(PitchGeometry g = {}) : g_(g) {}
    LineOutput compute(const LineInputs& in) const;

private:
    PitchGeometry g_;
};

// ------------------------------------------------------------------------------------
// Adaptive manager
// ------------------------------------------------------------------------------------
enum class ObservedEvent {
    PassLeftFlank, PassCentre, PassRightFlank, ThroughBall, Cross, LongShot,
    DribbleAttempt, SlowBuildUp, FastCounter, SkillMove
};

enum class ManagerPersonality { Pragmatist, PressingMachine, PossessionPurist, CounterPuncher };

struct TacticalPlan {
    double pressHeight = 0.5;      // 0 deep block .. 1 man-to-man high press
    double lineHeight = 0.5;
    double width = 0.5;            // 0 narrow .. 1 wide
    double compactness = 0.5;
    int overloadFlank = 0;         // -1 left, 0 none, +1 right: shift + double-team side
    double markingTightness = 0.5;
    std::vector<std::string> reasons;   // surfaced to the HUD: "CPU drops deeper vs through balls"
};

class AdaptiveManager {
public:
    explicit AdaptiveManager(ManagerPersonality p = ManagerPersonality::Pragmatist);

    void observe(ObservedEvent e);
    /// Re-plans if a tactical window is open (stoppage or >= 5 match minutes since last).
    /// goalDiff is from the CPU's perspective; minute is match minute.
    bool maybeReplan(double minute, bool stoppage, int goalDiff);
    const TacticalPlan& plan() const { return plan_; }
    double tendency(ObservedEvent e) const;   // 0..1 normalised share / rate
    int samples() const { return samples_; }

private:
    TacticalPlan basePlan() const;

    ManagerPersonality personality_;
    std::array<double, 10> counts_{};
    int samples_ = 0;
    double lastPlanMinute_ = -100.0;
    TacticalPlan plan_;
};

}  // namespace kxi
