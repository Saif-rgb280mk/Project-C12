// KINETIC XI — Engine Core
// tactics.cpp : pitch control, threat surface, off-ball runs, defensive line, adaptive manager.
#include "kxi/tactics.hpp"

#include <cmath>

namespace kxi {

// ---------------------------------------------------------------- PitchControl ----
double PitchControl::timeToReach(const AgentSnapshot& a, const Vec3& p) {
    // During the reaction time the agent keeps drifting with its current velocity.
    const Vec3 afterReaction = a.pos + flat(a.vel) * a.reactionTime;
    return a.reactionTime + flatDistance(afterReaction, p) / std::max(0.5, a.maxSpeed);
}

double PitchControl::probability(const std::vector<AgentSnapshot>& agents, const Vec3& p, int team) const {
    double mine = 0.0, all = 0.0;
    for (const AgentSnapshot& a : agents) {
        const double w = std::exp(-timeToReach(a, p) / sigma_);
        all += w;
        if (a.team == team) mine += w;
    }
    return all > 0.0 ? mine / all : 0.5;
}

// --------------------------------------------------------------- ThreatSurface ----
double ThreatSurface::value(const Vec3& p, int attackSign) const {
    const double goalX = attackSign * g_.length * 0.5;
    const double dx = std::abs(goalX - p.x);
    const double dy = p.y;
    const double d = std::hypot(dx, dy);
    // Opening angle of the goal mouth as seen from p.
    const double gw = g_.goalHalfWidth;
    const double theta = std::atan2(2.0 * gw * dx, dx * dx + dy * dy - gw * gw);
    const double opening = clamp(theta < 0 ? theta + kPi : theta, 0.0, kPi);
    const double progress = saturate((attackSign * p.x + g_.length * 0.5) / g_.length);
    return saturate(0.03 + 0.12 * progress * progress +
                    0.75 * std::exp(-d / 11.0) * (0.35 + 0.65 * std::min(1.0, opening / 0.9)));
}

// ----------------------------------------------------------- OffBallRunPlanner ----
RunCandidate OffBallRunPlanner::plan(const std::vector<AgentSnapshot>& agents, int runner,
                                     const Vec3& anchor, const Vec3& ballPos, int attackSign,
                                     double secondLastDefenderX) const {
    const AgentSnapshot& me = agents[static_cast<std::size_t>(runner)];
    const double effortPerMetre = 0.004 / std::max(0.25, c_.runFrequency);
    const double halfL = g_.length * 0.5 - 1.0, halfW = g_.width * 0.5 - 1.0;

    RunCandidate best;
    auto evaluate = [&](Vec3 target, double runLength) {
        target.x = clamp(target.x, -halfL, halfL);
        target.y = clamp(target.y, -halfW, halfW);
        target.z = 0.0;
        RunCandidate c;
        c.target = target;
        c.threat = threat_.value(target, attackSign);
        c.control = control_.probability(agents, target, me.team);
        const double beyondLine = attackSign * (target.x - secondLastDefenderX);
        const double aheadOfBall = attackSign * (target.x - ballPos.x);
        c.offsideRisk = beyondLine > 0.3 && aheadOfBall > 0.0;
        c.score = c.threat * c.control - effortPerMetre * runLength -
                  c_.shapeWeight * flatDistance(target, anchor) - (c.offsideRisk ? 0.25 : 0.0) -
                  (flatDistance(target, ballPos) < 4.0 ? 0.05 : 0.0);   // don't crowd the ball
        if (c.score > best.score) best = c;
    };

    evaluate(anchor, flatDistance(me.pos, anchor));
    for (int r = 1; r <= c_.radialSamples; ++r) {
        const double radius = c_.maxRunLength * r / c_.radialSamples;
        for (int k = 0; k < c_.angularSamples; ++k) {
            const double ang = 2.0 * kPi * k / c_.angularSamples;
            evaluate(me.pos + headingVector(ang) * radius, radius);
        }
    }
    return best;
}

// --------------------------------------------------------------- DefensiveLine ----
LineOutput DefensiveLine::compute(const LineInputs& in) const {
    LineOutput out;
    const int s = in.defendSign;
    const double goalX = s * g_.length * 0.5;
    auto depthOf = [&](double x) { return -s * (x - goalX); };   // metres from own goal line

    const double ballDepth = depthOf(in.ballPos.x);
    double depth = 18.0 + 27.0 * saturate(in.lineHeightSlider / 100.0);

    out.trigger = "hold";
    if (in.carrierFacingOwnGoal || in.ballMovingBackward) {
        depth += 6.0;
        out.trigger = "step-up";
    } else if (!in.carrierPressured && in.runnerInBehindThreat) {
        depth -= 7.0;
        out.trigger = "drop";
    } else if (in.carrierPressured) {
        depth += 2.0;
        out.trigger = "compress";
    }
    // The line never sits in front of the ball, and never inside the six-yard box.
    depth = std::min(depth, ballDepth - 3.0);
    depth = clamp(depth, 6.0, 50.0);

    out.lineX = goalX - s * depth;
    const double midDepth = depth + 9.0 + 9.0 * saturate(in.lineLengthSlider / 100.0);
    out.midfieldX = goalX - s * midDepth;

    const double span = 28.0 + 16.0 * saturate(in.lineWidthSlider / 100.0);
    const double shift = clamp(in.ballPos.y * 0.35, -9.0, 9.0);
    const double base[4] = {-0.5, -1.0 / 6.0, 1.0 / 6.0, 0.5};
    const double lim = g_.width * 0.5 - 2.0;
    for (int i = 0; i < 4; ++i) out.slotY[static_cast<std::size_t>(i)] = clamp(base[i] * span + shift, -lim, lim);
    return out;
}

// ------------------------------------------------------------- AdaptiveManager ----
AdaptiveManager::AdaptiveManager(ManagerPersonality p) : personality_(p) { plan_ = basePlan(); }

TacticalPlan AdaptiveManager::basePlan() const {
    TacticalPlan t;
    switch (personality_) {
        case ManagerPersonality::Pragmatist:
            t.pressHeight = 0.45; t.lineHeight = 0.45; t.width = 0.5; t.compactness = 0.6; t.markingTightness = 0.55;
            break;
        case ManagerPersonality::PressingMachine:
            t.pressHeight = 0.8; t.lineHeight = 0.7; t.width = 0.55; t.compactness = 0.7; t.markingTightness = 0.65;
            break;
        case ManagerPersonality::PossessionPurist:
            t.pressHeight = 0.6; t.lineHeight = 0.6; t.width = 0.65; t.compactness = 0.5; t.markingTightness = 0.5;
            break;
        case ManagerPersonality::CounterPuncher:
            t.pressHeight = 0.3; t.lineHeight = 0.3; t.width = 0.45; t.compactness = 0.75; t.markingTightness = 0.6;
            break;
    }
    return t;
}

void AdaptiveManager::observe(ObservedEvent e) {
    for (double& c : counts_) c *= 0.97;   // recent behaviour matters most
    counts_[static_cast<std::size_t>(e)] += 1.0;
    ++samples_;
}

double AdaptiveManager::tendency(ObservedEvent e) const {
    const auto idx = [](ObservedEvent x) { return static_cast<std::size_t>(x); };
    if (e == ObservedEvent::PassLeftFlank || e == ObservedEvent::PassCentre || e == ObservedEvent::PassRightFlank) {
        const double total = counts_[idx(ObservedEvent::PassLeftFlank)] + counts_[idx(ObservedEvent::PassCentre)] +
                             counts_[idx(ObservedEvent::PassRightFlank)];
        return total > 0.0 ? counts_[idx(e)] / total : 0.0;
    }
    double total = 0.0;
    for (double c : counts_) total += c;
    return total > 0.0 ? counts_[idx(e)] / total : 0.0;
}

bool AdaptiveManager::maybeReplan(double minute, bool stoppage, int goalDiff) {
    if (!stoppage && minute - lastPlanMinute_ < 5.0) return false;
    if (samples_ < 6) return false;   // not enough evidence: don't overreact

    TacticalPlan next = basePlan();
    const double left = tendency(ObservedEvent::PassLeftFlank);
    const double right = tendency(ObservedEvent::PassRightFlank);
    if (right > 0.5 && right > left + 0.2) {
        next.overloadFlank = +1;
        next.reasons.push_back("Shifting the block and doubling up on your right flank");
    } else if (left > 0.5 && left > right + 0.2) {
        next.overloadFlank = -1;
        next.reasons.push_back("Shifting the block and doubling up on your left flank");
    }
    if (tendency(ObservedEvent::ThroughBall) > 0.18) {
        next.lineHeight -= 0.2;
        next.reasons.push_back("Dropping the defensive line: you keep playing in behind");
    }
    if (tendency(ObservedEvent::Cross) > 0.18) {
        next.width += 0.15;
        next.markingTightness += 0.1;
        next.reasons.push_back("Full-backs tighter to your wingers to stop the crosses");
    }
    if (tendency(ObservedEvent::LongShot) > 0.12) {
        next.compactness += 0.2;
        next.reasons.push_back("Closing down the edge of the box against long shots");
    }
    if (tendency(ObservedEvent::SlowBuildUp) > 0.2) {
        next.pressHeight += 0.25;
        next.reasons.push_back("Pressing high: your build-up is slow");
    }
    if (tendency(ObservedEvent::FastCounter) > 0.15) {
        next.lineHeight -= 0.1;
        next.compactness += 0.1;
        next.reasons.push_back("Rest-defence: holding players back against your counters");
    }
    if (tendency(ObservedEvent::DribbleAttempt) > 0.25) {
        next.markingTightness += 0.15;
        next.compactness += 0.1;
        next.reasons.push_back("Doubling up on your dribblers");
    }
    if (tendency(ObservedEvent::SkillMove) > 0.15) {
        next.markingTightness -= 0.1;
        next.reasons.push_back("Standing off your skillers instead of diving in");
    }
    if (goalDiff < 0 && minute > 70.0) {
        next.pressHeight += 0.2;
        next.lineHeight += 0.15;
        next.reasons.push_back("Chasing the game: pushing everyone up");
    } else if (goalDiff > 0 && minute > 75.0) {
        next.pressHeight -= 0.15;
        next.lineHeight -= 0.15;
        next.reasons.push_back("Protecting the lead: low block");
    }

    // Hysteresis: move 60% of the way so the plan never flip-flops between windows.
    auto blend = [](double a, double b) { return saturate(lerp(a, b, 0.6)); };
    plan_.pressHeight = blend(plan_.pressHeight, next.pressHeight);
    plan_.lineHeight = blend(plan_.lineHeight, next.lineHeight);
    plan_.width = blend(plan_.width, next.width);
    plan_.compactness = blend(plan_.compactness, next.compactness);
    plan_.markingTightness = blend(plan_.markingTightness, next.markingTightness);
    plan_.overloadFlank = next.overloadFlank;
    plan_.reasons = next.reasons;
    lastPlanMinute_ = minute;
    return true;
}

}  // namespace kxi
