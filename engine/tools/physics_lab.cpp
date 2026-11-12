// KINETIC XI — Engine Core
// physics_lab.cpp : a command-line lab that prints the engine's behaviour as tables, so
// designers can tune numbers without launching the game. Its output is embedded in the
// design document ("Lab Results").
#include <cmath>
#include <cstdio>
#include <vector>

#include "kxi/ball_physics.hpp"
#include "kxi/fatigue.hpp"
#include "kxi/input.hpp"
#include "kxi/locomotion.hpp"
#include "kxi/surface.hpp"

using namespace kxi;

static void freeKickTable() {
    std::printf("== 1. Free kick from 25 m: same strike speed (27 m/s, 16 deg), different spin ==\n");
    std::printf("%-26s %10s %10s %10s %10s\n", "strike", "time(s)", "y@goal(m)", "z@goal(m)", "v@goal");
    BallPhysics phys;
    struct Variant { const char* name; Vec3 spin; std::uint64_t seed; };
    const Variant variants[] = {
        {"no spin (knuckle seed 11)", {0, 0, 0}, 11},
        {"no spin (knuckle seed 23)", {0, 0, 0}, 23},
        {"curler 8 rev/s", {0, 0, 50}, 1},
        {"curler + topspin", {0, 30, 45}, 1},
        {"driven topspin 6 rev/s", {0, 38, 0}, 1},
    };
    for (const Variant& v : variants) {
        BallState s;
        s.pos = {0, 0, 0.11};
        s.vel = {27.0 * std::cos(0.28), 0, 27.0 * std::sin(0.28)};
        s.spin = v.spin;
        s.grounded = false;
        s.knuckleSeed = v.seed;
        double t = 0;
        BallState prev = s;
        while (s.pos.x < 25.0 && t < 3.0) {
            prev = s;
            phys.step(s, 1.0 / 240.0, nullptr);
            t += 1.0 / 240.0;
        }
        const double f = (25.0 - prev.pos.x) / std::max(1e-9, s.pos.x - prev.pos.x);
        const Vec3 at = lerp(prev.pos, s.pos, f);
        std::printf("%-26s %10.2f %10.2f %10.2f %10.1f\n", v.name, t, at.y, at.z, length(s.vel));
    }
}

static void rollingTable() {
    std::printf("\n== 2. A 12 m/s ground pass on different pitch states ==\n");
    std::printf("%-30s %12s %12s\n", "pitch", "distance(m)", "time(s)");
    BallPhysics phys;
    struct P { const char* name; double moisture, depth, wear; };
    const P pitches[] = {{"dry, 24 mm grass", 0.1, 0, 0}, {"dew / damp", 0.5, 0, 0},
                         {"soaked (no puddles)", 1.0, 0, 0}, {"puddled (4 mm)", 1.0, 4, 0},
                         {"flooded (9 mm)", 1.0, 9, 0}, {"churned mud", 1.0, 0, 0.8}};
    for (const P& p : pitches) {
        PitchSurface pitch;
        pitch.setUniform(p.moisture, p.depth, p.wear);
        BallState s;
        s.pos = {-40, 0, 0.11};
        s.vel = {12, 0, 0};
        s.spin = {0, 12 / 0.11, 0};
        double t = 0;
        while (length(s.vel) > 0.05 && t < 40) {
            phys.step(s, 1.0 / 120.0, &pitch);
            t += 1.0 / 120.0;
        }
        std::printf("%-30s %12.1f %12.2f\n", p.name, s.pos.x + 40.0, t);
    }
}

static void inputTrace() {
    std::printf("\n== 3. Intent Arbiter trace (exact MacBook layout) ==\n");
    IntentArbiter arb;
    GameContext ctx;
    ctx.inShootingRange = true;
    ctx.aimInGoalCone = true;
    struct Step { double t; Key k; bool down; const char* note; };
    const Step script[] = {
        {0.00, Key::Right, true, "Right arrow down"},
        {0.05, Key::LeftCtrl, true, "Left Ctrl down (sprint)"},
        {0.80, Key::S, true, "S down"},
        {0.88, Key::S, false, "S up after 80 ms"},
        {1.20, Key::E, true, "Modifier E down"},
        {1.22, Key::D, true, "D down"},
        {1.70, Key::D, false, "D up after 480 ms"},
        {1.75, Key::E, false, "E up"},
    };
    double now = 0;
    std::size_t i = 0;
    while (now < 1.9) {
        std::vector<KeyEvent> ev;
        while (i < sizeof(script) / sizeof(script[0]) && script[i].t <= now) {
            ev.push_back({script[i].k, script[i].down, script[i].t});
            std::printf("  t=%.2f  %-26s", script[i].t, script[i].note);
            std::printf("\n");
            ++i;
        }
        const ArbiterOutput out = arb.update(ev, ctx, now);
        for (const Command& c : out.commands)
            std::printf("  t=%.2f      -> %s (power %.2f, held %.0f ms)\n", now, actionName(c.type), c.power,
                        c.heldSeconds * 1000.0);
        if (std::fmod(now + 1e-9, 0.25) < 1.0 / 120.0)
            std::printf("  t=%.2f      sprint=%s charging=%s\n", now,
                        out.sprint == SprintLevel::Full ? "FULL" : out.sprint == SprintLevel::Controlled ? "CONTROLLED" : "none",
                        actionName(out.charging));
        now += 1.0 / 120.0;
    }
}

static void fatigueCurve() {
    std::printf("\n== 4. 90-minute physiology of a box-to-box midfielder ==\n");
    std::printf("%6s %10s %10s %10s %12s %12s\n", "minute", "D'(m)", "glycogen", "km", "topSpeedX", "errorX");
    FatigueModel m;
    FatigueState s;
    m.reset(s);
    for (int sec = 0; sec <= 5400; ++sec) {
        const int phase = sec % 75;
        const double v = phase < 6 ? 7.6 : (phase < 20 ? 3.8 : 1.5);
        m.update(s, v, v / 9.0, phase == 0 ? 4.0 : 0.0, 1.0, 0.5);
        if (sec % 900 == 0) {
            const PerformanceModifiers mod = m.modifiers(s);
            std::printf("%6d %10.1f %10.2f %10.2f %12.3f %12.3f\n", sec / 60, s.dPrime, s.glycogen,
                        s.distanceM / 1000.0, mod.topSpeedScale, mod.technicalErrorScale);
        }
    }
}

int main() {
    std::printf("KINETIC XI — Physics & Systems Lab\n\n");
    freeKickTable();
    rollingTable();
    inputTrace();
    fatigueCurve();
    return 0;
}
