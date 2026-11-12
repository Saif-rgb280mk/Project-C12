// KINETIC XI — Engine Core
// tests.cpp : self-contained unit + physical-plausibility tests (no external framework).
// Every claim the design document makes about the engine is checked here.
#include <cmath>
#include <cstdio>
#include <functional>
#include <string>
#include <vector>

#include "kxi/ball_physics.hpp"
#include "kxi/camera.hpp"
#include "kxi/fatigue.hpp"
#include "kxi/foot_ik.hpp"
#include "kxi/input.hpp"
#include "kxi/locomotion.hpp"
#include "kxi/settings.hpp"
#include "kxi/surface.hpp"
#include "kxi/tactics.hpp"

using namespace kxi;

namespace {

int g_failures = 0;
int g_checks = 0;
std::string g_current;

#define CHECK(cond)                                                                       \
    do {                                                                                  \
        ++g_checks;                                                                       \
        if (!(cond)) {                                                                    \
            ++g_failures;                                                                 \
            std::printf("    FAIL [%s] line %d: %s\n", g_current.c_str(), __LINE__, #cond); \
        }                                                                                 \
    } while (0)

#define CHECK_NEAR(a, b, tol) CHECK(std::abs((a) - (b)) <= (tol))

struct TestCase {
    const char* name;
    std::function<void()> fn;
};

std::vector<TestCase>& registry() {
    static std::vector<TestCase> r;
    return r;
}
struct Register {
    Register(const char* n, std::function<void()> f) { registry().push_back({n, std::move(f)}); }
};
#define TEST(name) \
    static void name(); \
    static Register reg_##name(#name, name); \
    static void name()

// Simulates a ball until it falls back to the turf (or a time limit), returns final state.
BallState flyUntilLanding(const BallPhysics& phys, BallState s, double maxT = 6.0) {
    const double dt = 1.0 / 120.0;
    double t = 0.0;
    bool wasAirborne = false;
    while (t < maxT) {
        BallState prev = s;
        const StepReport r = phys.step(s, dt, nullptr);
        if (s.pos.z > 0.2) wasAirborne = true;
        if (wasAirborne && r.bounced) return prev;
        t += dt;
    }
    return s;
}

// Simulates until the ball crosses x = planeX; returns interpolated state at the plane.
BallState flyToPlane(const BallPhysics& phys, BallState s, double planeX) {
    const double dt = 1.0 / 240.0;
    for (int i = 0; i < 2400; ++i) {
        BallState prev = s;
        phys.step(s, dt, nullptr);
        if (s.pos.x >= planeX) {
            const double f = (planeX - prev.pos.x) / (s.pos.x - prev.pos.x);
            BallState r = s;
            r.pos = lerp(prev.pos, s.pos, f);
            return r;
        }
    }
    return s;
}

// ======================================================================== BALL ===
TEST(ball_drag_crisis) {
    BallParams p;
    CHECK(BallPhysics::dragCoefficient(1.0e5, p) > 0.40);
    CHECK(BallPhysics::dragCoefficient(4.5e5, p) < 0.20);
    CHECK(BallPhysics::dragCoefficient(2.0e5, p) > BallPhysics::dragCoefficient(3.0e5, p));
}

TEST(ball_lift_coefficient_monotonic_and_capped) {
    CHECK_NEAR(BallPhysics::liftCoefficient(0.05, 0.38), 0.075, 1e-9);
    CHECK(BallPhysics::liftCoefficient(0.3, 0.38) > BallPhysics::liftCoefficient(0.2, 0.38));
    CHECK_NEAR(BallPhysics::liftCoefficient(5.0, 0.38), 0.38, 1e-9);
}

TEST(ball_vacuum_matches_analytic_projectile) {
    BallParams p;
    p.cdSubcritical = p.cdSupercritical = 0.0;
    p.maxLiftCoefficient = 0.0;
    p.knuckleStrength = 0.0;
    BallPhysics phys(p);
    BallState s;
    s.pos = {0, 0, p.radius};
    const double v = 20.0, ang = kPi / 4.0;
    s.vel = {v * std::cos(ang), 0.0, v * std::sin(ang)};
    s.grounded = false;
    const BallState land = flyUntilLanding(phys, s);
    CHECK_NEAR(land.pos.x, v * v / kGravity, 0.15);   // 40.77 m
}

TEST(ball_drag_shortens_range) {
    BallPhysics phys;
    BallState s;
    s.pos = {0, 0, 0.11};
    s.vel = {20.0 * std::cos(0.6), 0, 20.0 * std::sin(0.6)};
    s.grounded = false;
    const BallState land = flyUntilLanding(phys, s);
    const double vacuumRange = 400.0 * std::sin(1.2) / kGravity;
    CHECK(land.pos.x < vacuumRange * 0.95);
    CHECK(land.pos.x > vacuumRange * 0.6);
}

TEST(ball_topspin_dips_backspin_floats) {
    BallPhysics phys;
    auto launch = [&](double spinY) {
        BallState s;
        s.pos = {0, 0, 0.11};
        s.vel = {24.0 * std::cos(0.35), 0, 24.0 * std::sin(0.35)};
        s.spin = {0, spinY, 0};
        s.grounded = false;
        return flyUntilLanding(phys, s).pos.x;
    };
    const double none = launch(0.0), top = launch(+40.0), back = launch(-40.0);
    CHECK(top < none);
    CHECK(back > none);
}

TEST(ball_sidespin_curls_free_kick_into_plausible_range) {
    BallPhysics phys;
    BallState s;
    s.pos = {0, 0, 0.11};
    const double v = 27.0, elev = 0.28;   // ~16 degrees, a typical free-kick launch
    s.vel = {v * std::cos(elev), 0, v * std::sin(elev)};
    s.spin = {0, 0, 55.0};            // anticlockwise from above -> curls to +y (left)
    s.grounded = false;
    const BallState at = flyToPlane(phys, s, 25.0);
    std::printf("    free kick: lateral %.2f m, height %.2f m at 25 m\n", at.pos.y, at.pos.z);
    CHECK(at.pos.y > 1.5);
    CHECK(at.pos.y < 7.0);
    CHECK(at.pos.z > 0.5);
}

TEST(ball_strike_offset_generates_correct_spin_sign) {
    BallPhysics phys;
    BallState s;
    // Inside-of-the-right-foot: strike the back-right of the ball (right = -y when kicking +x).
    phys.applyStrike(s, {12.0, 0.0, 0.0}, {-0.10, -0.02, 0.0}, 42);
    CHECK(s.spin.z > 0.0);         // anticlockwise -> curls left (+y)
    CHECK_NEAR(s.vel.x, 12.0 / 0.43, 1e-9);
}

TEST(ball_knuckle_wanders_without_spin_and_is_deterministic) {
    BallPhysics phys;
    auto shoot = [&](std::uint64_t seed, double spin) {
        BallState s;
        phys.applyStrike(s, {0.43 * 26.0, 0.0, 0.43 * 4.0}, {0, 0, 0}, seed);
        s.spin = {0, 0, spin};
        s.pos = {0, 0, 0.11};
        return flyToPlane(phys, s, 25.0).pos.y;
    };
    const double a = shoot(7, 0.0), b = shoot(7, 0.0), c = shoot(99, 0.0);
    CHECK_NEAR(a, b, 1e-12);       // same seed = identical replay
    CHECK(std::abs(a) > 0.02 || std::abs(c) > 0.02);   // it actually moves
    CHECK(std::abs(a - c) > 1e-4); // different seeds wander differently
}

TEST(ball_bounce_lower_on_wet_and_dead_in_puddle) {
    BallPhysics phys;
    auto bounceApex = [&](double moisture, double depth) {
        PitchSurface pitch;
        pitch.setUniform(moisture, depth);
        BallState s;
        s.pos = {0, 0, 2.0};
        s.grounded = false;
        double apex = 0.0;
        bool bounced = false;
        for (int i = 0; i < 600; ++i) {
            const StepReport r = phys.step(s, 1.0 / 240.0, &pitch);
            if (r.bounced) bounced = true;
            if (bounced) apex = std::max(apex, s.pos.z);
            if (bounced && s.vel.z < 0 && apex > 0.12) break;
        }
        return apex;
    };
    const double dry = bounceApex(0.1, 0.0), wet = bounceApex(1.0, 0.0), puddle = bounceApex(1.0, 10.0);
    std::printf("    bounce apex from 2 m: dry %.2f  wet %.2f  puddle %.2f\n", dry, wet, puddle);
    CHECK(dry > wet);
    CHECK(wet > puddle);
}

TEST(ball_rolling_distance_dry_wet_flooded) {
    BallPhysics phys;
    auto roll = [&](double moisture, double depth) {
        PitchSurface pitch;
        pitch.setUniform(moisture, depth);
        BallState s;
        s.pos = {-40, 0, 0.11};
        s.vel = {12.0, 0, 0};
        s.spin = {0, 12.0 / 0.11, 0};   // rolling already
        s.grounded = true;
        for (int i = 0; i < 120 * 30; ++i) phys.step(s, 1.0 / 120.0, &pitch);
        return s.pos.x + 40.0;
    };
    const double dry = roll(0.1, 0.0), wet = roll(1.0, 0.0), flooded = roll(1.0, 9.0);
    std::printf("    12 m/s ground pass travels: dry %.1f m  wet %.1f m  flooded %.1f m\n", dry, wet, flooded);
    CHECK(dry > 25.0 && dry < 80.0);
    CHECK(wet > dry);            // a wet film makes the pitch "zippy"
    CHECK(flooded < dry * 0.5);  // standing water kills the pass
}

TEST(ball_skid_transitions_to_roll) {
    BallPhysics phys;
    BallState s;
    s.pos = {0, 0, 0.11};
    s.vel = {10.0, 0, 0};
    s.spin = {};                 // pure skid
    s.grounded = true;
    for (int i = 0; i < 240; ++i) phys.step(s, 1.0 / 240.0, nullptr);
    CHECK_NEAR(s.vel.x, s.spin.y * 0.11, 0.05);   // v = w r : rolling without slipping
}

TEST(atmosphere_altitude_reduces_density) {
    const Atmosphere sea = Atmosphere::fromConditions(15.0, 0.0, 0.0, {});
    const Atmosphere high = Atmosphere::fromConditions(15.0, 2240.0, 0.0, {});   // high-altitude stadium
    CHECK_NEAR(sea.airDensity, 1.225, 0.01);
    CHECK(high.airDensity < sea.airDensity * 0.82);
}

// ===================================================================== SURFACE ===
TEST(surface_rain_creates_puddles_in_low_compacted_spots_then_drains) {
    PitchSurface pitch;
    WeatherState storm;
    storm.rainRateMmPerHour = 40.0;
    for (int i = 0; i < 600; ++i) pitch.update(1.0, storm);   // 10 minutes torrential
    CHECK(pitch.averageMoisture() > 0.9);
    CHECK(pitch.maxWaterDepthMm() > 1.0);
    WeatherState sun;
    sun.temperatureC = 24.0;
    sun.relativeHumidity = 0.4;
    const double flooded = pitch.maxWaterDepthMm();
    for (int i = 0; i < 1800; ++i) pitch.update(1.0, sun);
    CHECK(pitch.maxWaterDepthMm() < flooded);
}

TEST(surface_footfalls_wear_wet_turf_faster) {
    PitchSurface dry, wet;
    dry.setUniform(0.1, 0.0);
    wet.setUniform(1.0, 0.0);
    const Vec3 spot{40.0, 0.0, 0.0};
    for (int i = 0; i < 2000; ++i) {
        dry.registerFootfall(spot, 300.0, 0.8);
        wet.registerFootfall(spot, 300.0, 0.8);
    }
    CHECK(wet.cellAt(spot).wear > dry.cellAt(spot).wear);
    CHECK(coefficientsForCell(wet.cellAt(spot)).shoeTraction < coefficientsForCell(dry.cellAt(spot)).shoeTraction);
}

// ================================================================== LOCOMOTION ===
TEST(locomotion_sprint_splits_are_elite_plausible) {
    AthleteProfile p;
    LocomotionState st;
    LocomotionCommand cmd;
    cmd.desiredDirection = {1, 0, 0};
    cmd.sprint = SprintLevel::Full;
    double t = 0.0, t10 = -1.0, t30 = -1.0;
    const double dt = 1.0 / 120.0;
    while (t < 8.0) {
        Locomotion::step(st, cmd, p, {}, 1.0, dt);
        t += dt;
        if (t10 < 0 && st.pos.x >= 10.0) t10 = t;
        if (t30 < 0 && st.pos.x >= 30.0) t30 = t;
    }
    std::printf("    10 m split %.2f s, 30 m split %.2f s, speed after 8 s %.2f m/s\n", t10, t30, length(st.vel));
    CHECK(t10 > 1.6 && t10 < 2.4);
    CHECK(t30 > 3.7 && t30 < 5.0);
    CHECK(length(st.vel) > 0.95 * p.topSpeed);
}

TEST(locomotion_turning_respects_momentum_and_traction) {
    auto headingChange = [](double traction) {
        AthleteProfile p;
        LocomotionState st;
        st.vel = {8.0, 0, 0};
        LocomotionCommand cmd;
        cmd.desiredDirection = {0, 1, 0};   // hard 90 degree cut at 8 m/s
        cmd.sprint = SprintLevel::Full;
        for (int i = 0; i < 24; ++i) Locomotion::step(st, cmd, p, {}, traction, 1.0 / 120.0);   // 0.2 s
        return std::atan2(st.vel.y, st.vel.x);
    };
    const double dry = headingChange(1.0), wet = headingChange(0.6);
    CHECK(dry < kPi / 3.0);   // no instant 90-degree snaps at speed
    CHECK(wet < dry);         // less grip, wider arc
}

TEST(locomotion_gait_plants_feet_at_sprint_cadence) {
    AthleteProfile p;
    LocomotionState st;
    st.vel = {8.0, 0, 0};
    LocomotionCommand cmd;
    cmd.desiredDirection = {1, 0, 0};
    cmd.sprint = SprintLevel::Full;
    int plants = 0, left = 0;
    for (int i = 0; i < 120; ++i) {
        const FootEvent e = Locomotion::step(st, cmd, p, {}, 1.0, 1.0 / 120.0);
        if (e.planted) { ++plants; if (e.foot == 0) ++left; }
    }
    CHECK(plants >= 3 && plants <= 5);
    CHECK(left >= 1 && left <= plants - 1);   // alternating feet
}

// ====================================================================== FOOT IK ===
TEST(ik_two_bone_preserves_lengths_and_reaches) {
    const Vec3 hip{0, 0, 0.93};
    const Vec3 target{0.25, 0.05, 0.05};
    const TwoBoneResult r = solveTwoBone(hip, target, hip + Vec3{1, 0, -0.4}, 0.46, 0.47);
    CHECK(r.reached);
    CHECK_NEAR(distance(r.knee, hip), 0.46, 1e-6);
    CHECK_NEAR(distance(r.foot, r.knee), 0.47, 1e-6);
    CHECK_NEAR(distance(r.foot, target), 0.0, 1e-6);
    CHECK(r.knee.x > 0.1);   // knee bends forward, toward the pole
}

TEST(ik_unreachable_target_is_clamped_not_nan) {
    const Vec3 hip{0, 0, 0.93};
    const TwoBoneResult r = solveTwoBone(hip, {3.0, 0, 0}, {1, 0, 0.5}, 0.46, 0.47);
    CHECK(!r.reached);
    CHECK(std::isfinite(r.knee.x) && std::isfinite(r.foot.z));
    CHECK(distance(r.foot, hip) <= 0.93 + 1e-6);
}

TEST(ik_pelvis_drops_for_wide_stance_and_shifts_weight) {
    PelvisInput in;
    in.pelvisAnimated = {0, 0, 0.93};
    in.leftFootTarget = {0.45, 0.25, 0.0};    // long lunge
    in.rightFootTarget = {-0.35, -0.2, 0.0};
    in.lateralAccel = 6.0;
    in.supportFoot = 0;
    const PelvisResult r = solveGrounding(in, LegRig{});
    CHECK(r.pelvisDrop > 0.0);
    CHECK(r.left.reached && r.right.reached);
    CHECK(r.comShift > 0.05);
}

// ====================================================================== FATIGUE ===
TEST(fatigue_dprime_drains_and_recovers) {
    FatigueModel m;
    FatigueState s;
    m.reset(s);
    for (int i = 0; i < 30 * 10; ++i) m.update(s, 8.0, 0.9, 0.0, 0.1, 0.5);   // 30 s sprinting
    const double drained = s.dPrime;
    CHECK(drained < 80.0);
    CHECK(m.modifiers(s).topSpeedScale < 0.95);
    CHECK(m.modifiers(s).technicalErrorScale > 1.2);
    for (int i = 0; i < 180 * 10; ++i) m.update(s, 1.0, 0.1, 0.0, 0.1, 0.5);  // 3 min walking
    CHECK(s.dPrime > drained + 0.5 * (180.0 - drained));
}

TEST(fatigue_full_match_glycogen_and_injury_slider) {
    FatigueModel m;
    FatigueState s;
    m.reset(s);
    Rng rng(3);
    for (int i = 0; i < 5400; ++i) {
        const double v = (i % 60 < 6) ? 7.0 : 1.4;   // intermittent profile, ~11 km
        m.update(s, v, v / 9.0, 0.0, 1.0, 0.5);
    }
    std::printf("    90 min: distance %.1f km, glycogen %.2f, CS %.2f m/s\n", s.distanceM / 1000.0,
                s.glycogen, m.effectiveCriticalSpeed(s));
    CHECK(s.glycogen > 0.25 && s.glycogen < 0.7);
    CHECK(m.injuryHazardPerMinute(s, 0) == 0.0);
    CHECK(m.injuryHazardPerMinute(s, 100) > m.injuryHazardPerMinute(s, 50));
    FatigueState strained = s;
    strained.acuteStrain = 0.8;
    CHECK(m.injuryHazardPerMinute(strained, 50) > 2.0 * m.injuryHazardPerMinute(s, 50));
}

// ======================================================================== INPUT ===
struct InputHarness {
    IntentArbiter arb;
    GameContext ctx;
    double now = 0.0;
    std::vector<KeyEvent> pending;
    std::vector<Command> fired;
    ArbiterOutput last;

    void press(Key k) { pending.push_back({k, true, now}); }
    void release(Key k) { pending.push_back({k, false, now}); }
    void advance(double seconds) {
        const double end = now + seconds;
        do {
            now = std::min(end, now + 1.0 / 120.0);
            last = arb.update(pending, ctx, now);
            pending.clear();
            for (const Command& c : last.commands) fired.push_back(c);
        } while (now < end - 1e-9);
    }
    bool firedType(ActionType t) const {
        for (const Command& c : fired)
            if (c.type == t) return true;
        return false;
    }
    const Command* find(ActionType t) const {
        for (const Command& c : fired)
            if (c.type == t) return &c;
        return nullptr;
    }
};

TEST(input_default_layout_matches_spec) {
    const KeyBindings b = KeyBindings::defaults();
    CHECK(b[Slot::Up] == Key::Up && b[Slot::Left] == Key::Left);
    CHECK(b[Slot::Sprint] == Key::LeftCtrl);
    CHECK(b[Slot::StrafeSwitch] == Key::LeftShift);
    CHECK(b[Slot::PassLob] == Key::S);
    CHECK(b[Slot::Through] == Key::A);
    CHECK(b[Slot::ShootTackle] == Key::D);
    CHECK(b[Slot::ShieldJockey] == Key::W);
    CHECK(b.isValid());
}

TEST(input_mac_virtual_keycodes_roundtrip) {
    CHECK(macVirtualKeyCode(Key::A) == 0x00);
    CHECK(macVirtualKeyCode(Key::S) == 0x01);
    CHECK(macVirtualKeyCode(Key::D) == 0x02);
    CHECK(macVirtualKeyCode(Key::W) == 0x0D);
    CHECK(macVirtualKeyCode(Key::LeftCtrl) == 0x3B);
    CHECK(macVirtualKeyCode(Key::LeftShift) == 0x38);
    CHECK(macVirtualKeyCode(Key::Up) == 0x7E);
    for (std::size_t i = 0; i < kKeyCount; ++i) {
        const Key k = static_cast<Key>(i);
        const auto back = keyFromMacVirtualKeyCode(macVirtualKeyCode(k));
        CHECK(back.has_value() && *back == k);
    }
    CHECK(isModifierKey(Key::LeftCtrl) && !isModifierKey(Key::D));
    CHECK(hidUsage(Key::A) == 0x04 && hidUsage(Key::LeftCtrl) == 0xE0 && hidUsage(Key::Up) == 0x52);
    for (std::size_t i = 0; i < kKeyCount; ++i) {
        const Key k = static_cast<Key>(i);
        if (k == Key::Fn) continue;   // Fn/Globe is not a HID keyboard-page usage
        const auto back = keyFromHidUsage(hidUsage(k));
        CHECK(back.has_value() && *back == k);
    }
}

TEST(input_movement_is_camera_relative) {
    InputHarness h;
    h.press(Key::Right);
    h.advance(0.05);
    CHECK_NEAR(h.last.moveDir.x, 1.0, 1e-9);
    h.press(Key::Up);
    h.advance(0.05);
    CHECK_NEAR(h.last.moveDir.x, std::sqrt(0.5), 1e-9);
    CHECK_NEAR(h.last.moveDir.y, std::sqrt(0.5), 1e-9);
    h.ctx.cameraYaw = 0.0;   // camera looking down +x (e.g. Pro cam): screen-up = +x
    h.release(Key::Right);
    h.advance(0.05);
    CHECK_NEAR(h.last.moveDir.x, 1.0, 1e-9);
}

TEST(input_sprint_ramps_controlled_to_full_and_feathering) {
    InputHarness h;
    h.press(Key::Right);
    h.press(Key::LeftCtrl);
    h.advance(0.10);
    CHECK(h.last.sprint == SprintLevel::Controlled);
    h.advance(0.30);
    CHECK(h.last.sprint == SprintLevel::Full);
    h.release(Key::LeftCtrl);
    h.advance(0.1);
    h.press(Key::LeftCtrl);        // re-press inside feather window
    h.advance(0.5);
    CHECK(h.last.sprint == SprintLevel::Controlled);
}

TEST(input_stop_ball_and_hold) {
    InputHarness h;
    h.press(Key::LeftCtrl);
    h.advance(0.08);
    h.release(Key::LeftCtrl);
    h.advance(0.02);
    CHECK(h.firedType(ActionType::StopBall));
    h.press(Key::LeftCtrl);
    h.advance(0.5);
    CHECK(h.last.holdBall);
}

TEST(input_s_tap_ground_pass_hold_lob_cross_header) {
    InputHarness h;
    h.press(Key::S);
    h.advance(0.08);
    h.release(Key::S);
    h.advance(0.02);
    CHECK(h.firedType(ActionType::GroundPass));

    InputHarness lob;
    lob.press(Key::S);
    lob.advance(0.6);
    CHECK(lob.last.charging == ActionType::LobPass);
    lob.release(Key::S);
    lob.advance(0.02);
    const Command* c = lob.find(ActionType::LobPass);
    CHECK(c && c->power > 0.4 && c->power < 0.6);

    InputHarness cross;
    cross.ctx.inCrossingZone = true;
    cross.press(Key::S);
    cross.advance(0.5);
    cross.release(Key::S);
    cross.advance(0.02);
    CHECK(cross.firedType(ActionType::Cross));

    InputHarness header;
    header.ctx.phase = Phase::TeammatePossession;
    header.ctx.ballIncoming = true;
    header.ctx.ballHeightAtContact = 1.8;
    header.press(Key::S);
    header.advance(0.1);
    header.release(Key::S);
    header.advance(0.02);
    CHECK(header.firedType(ActionType::PassingHeader));
}

TEST(input_through_and_lobbed_through_chords) {
    InputHarness h;
    h.press(Key::A);
    h.advance(0.3);
    h.release(Key::A);
    h.advance(0.02);
    CHECK(h.firedType(ActionType::ThroughPass));

    InputHarness l;              // Shift first, then A
    l.press(Key::LeftShift);
    l.advance(0.03);
    l.press(Key::A);
    l.advance(0.3);
    l.release(Key::A);
    l.release(Key::LeftShift);
    l.advance(0.02);
    CHECK(l.firedType(ActionType::LobbedThroughPass));
    CHECK(!l.firedType(ActionType::ThroughPass));

    InputHarness r;              // A first, Shift inside the chord window
    r.press(Key::A);
    r.advance(0.05);
    r.press(Key::LeftShift);
    r.advance(0.3);
    r.release(Key::A);
    r.advance(0.02);
    CHECK(r.firedType(ActionType::LobbedThroughPass));
}

TEST(input_shot_power_and_precision_context) {
    InputHarness h;
    h.press(Key::D);
    h.advance(0.6);
    h.release(Key::D);
    h.advance(0.02);
    const Command* shot = h.find(ActionType::Shot);
    CHECK(shot && std::abs(shot->power - 0.6) < 0.05);

    InputHarness f;              // D + Modifier in range, aim in goal cone -> finesse
    f.ctx.inShootingRange = true;
    f.ctx.aimInGoalCone = true;
    f.press(Key::E);
    f.advance(0.02);
    f.press(Key::D);
    f.advance(0.4);
    f.release(Key::D);
    f.advance(0.02);
    CHECK(f.firedType(ActionType::FinesseShot));

    InputHarness d;              // D + Modifier in midfield -> driven ground pass
    d.press(Key::D);
    d.advance(0.03);
    d.press(Key::E);             // inside chord window
    d.advance(0.3);
    d.release(Key::D);
    d.advance(0.02);
    CHECK(d.firedType(ActionType::DrivenGroundPass));

    InputHarness v;              // first-time volley on an incoming ball
    v.ctx.phase = Phase::TeammatePossession;
    v.ctx.ballIncoming = true;
    v.ctx.ballHeightAtContact = 0.8;
    v.press(Key::D);
    v.advance(0.3);
    v.release(Key::D);
    v.advance(0.02);
    CHECK(v.firedType(ActionType::Volley));
}

TEST(input_skill_gestures_relative_to_facing) {
    InputHarness h;
    h.ctx.facing = 0.0;          // facing +x; Right arrow = forward
    h.press(Key::E);
    h.advance(0.02);
    h.press(Key::Right);
    h.advance(0.05);
    h.release(Key::Right);
    h.advance(0.05);
    h.press(Key::Right);
    h.advance(0.05);
    const Command* s = h.find(ActionType::SkillMove);
    CHECK(s && s->skill == SkillMove::StepoverBurst);
    CHECK(h.last.closeControl);

    InputHarness b;              // single "back" token resolves after the window
    b.ctx.facing = 0.0;
    b.press(Key::E);
    b.press(Key::Left);
    b.advance(0.5);
    const Command* drag = b.find(ActionType::SkillMove);
    CHECK(drag && drag->skill == SkillMove::DragBack);
}

TEST(input_strafe_and_controlled_sprint_off_ball) {
    InputHarness h;
    h.press(Key::LeftShift);
    h.advance(0.2);
    CHECK(h.last.strafe);

    InputHarness o;
    o.ctx.phase = Phase::TeammatePossession;
    o.press(Key::D);
    o.press(Key::Up);
    o.advance(0.3);
    CHECK(o.last.sprint == SprintLevel::Controlled);
    CHECK(!o.firedType(ActionType::Shot));
}

TEST(input_defending_actions) {
    InputHarness h;
    h.ctx.phase = Phase::Defending;
    h.press(Key::LeftShift);
    h.advance(0.02);
    CHECK(h.firedType(ActionType::ChangePlayer));
    h.press(Key::S);
    h.advance(0.02);
    CHECK(h.firedType(ActionType::SlidingTackle));
    h.release(Key::S);
    h.press(Key::E);
    h.advance(0.05);
    CHECK(h.last.contain);
    h.release(Key::E);
    h.press(Key::D);
    h.advance(0.05);
    CHECK(h.last.teammateContain);
    CHECK(!h.firedType(ActionType::StandingTackle));
    h.release(Key::D);
    h.press(Key::W);
    h.press(Key::Left);
    h.advance(0.05);
    CHECK(h.last.jockey);
    h.press(Key::D);             // "D + combination" while jockeying = standing tackle
    h.advance(0.02);
    CHECK(h.firedType(ActionType::StandingTackle));
    h.press(Key::A);
    h.advance(0.05);
    CHECK(h.last.rushKeeper);
}

TEST(input_losing_ball_cancels_charge) {
    InputHarness h;
    h.press(Key::D);
    h.advance(0.3);
    h.ctx.phase = Phase::Defending;
    h.advance(0.02);
    h.release(Key::D);
    h.advance(0.02);
    CHECK(!h.firedType(ActionType::Shot));
}

TEST(input_frame_rate_independent_tap) {
    // A 150 ms tap must be a ground pass whether the game ticks at 30 or 240 Hz,
    // because the arbiter uses the OS timestamps of the key edges.
    for (double hz : {30.0, 60.0, 240.0}) {
        IntentArbiter arb;
        GameContext ctx;
        std::vector<KeyEvent> ev{{Key::S, true, 0.010}, {Key::S, false, 0.160}};
        const ArbiterOutput out = arb.update(ev, ctx, 1.0 / hz + 0.2);
        bool ground = false;
        for (const Command& c : out.commands) ground = ground || c.type == ActionType::GroundPass;
        CHECK(ground);
    }
}

TEST(input_rebind_swaps_and_mac_conflicts_detected) {
    KeyBindings b = KeyBindings::defaults();
    const auto conflicts = macSystemShortcutConflicts(b);
    CHECK(conflicts.size() >= 3);   // Control + arrows owned by Mission Control / Spaces
    const auto swapped = b.rebind(Slot::Sprint, Key::D);   // D already = ShootTackle
    CHECK(swapped.has_value() && *swapped == Slot::ShootTackle);
    CHECK(b[Slot::ShootTackle] == Key::LeftCtrl);
    CHECK(b.isValid());
    KeyBindings clean = KeyBindings::defaults();
    clean.rebind(Slot::Sprint, Key::LeftOption);
    CHECK(macSystemShortcutConflicts(clean).empty());
    CHECK(requiredChords(clean).size() >= 6);
}

// ===================================================================== SETTINGS ===
TEST(settings_json_roundtrip_and_clamping) {
    Settings s;
    s.graphics.frameRateCap = FrameRateCap::Fps120;
    s.gameplay.shotError.cpu = 73;
    s.camera.preset = CameraPreset::Tele;
    s.input.bindings.rebind(Slot::Sprint, Key::LeftOption);
    const std::string text = s.toJson().dump();
    std::string err;
    const auto parsed = Json::parse(text, &err);
    CHECK(parsed.has_value());
    std::vector<std::string> warnings;
    const Settings back = Settings::fromJson(*parsed, &warnings);
    CHECK(warnings.empty());
    CHECK(back.graphics.frameRateCap == FrameRateCap::Fps120);
    CHECK(back.gameplay.shotError.cpu == 73);
    CHECK(back.camera.preset == CameraPreset::Tele);
    CHECK(back.input.bindings[Slot::Sprint] == Key::LeftOption);

    const auto bad = Json::parse(R"({"camera":{"height":99,"preset":"Drone"},"audio":{"master":-5}})");
    CHECK(bad.has_value());
    warnings.clear();
    const Settings repaired = Settings::fromJson(*bad, &warnings);
    CHECK(repaired.camera.height == 20);
    CHECK(repaired.camera.preset == CameraPreset::Broadcast);
    CHECK(repaired.audio.master == 0);
    CHECK(warnings.size() == 3);
}

TEST(settings_slider_curve) {
    CHECK_NEAR(GameplaySettings::multiplier(50, 0.25, 2.5), 1.0, 1e-12);
    CHECK_NEAR(GameplaySettings::multiplier(0, 0.25, 2.5), 0.25, 1e-12);
    CHECK_NEAR(GameplaySettings::multiplier(100, 0.25, 2.5), 2.5, 1e-12);
    CHECK(GameplaySettings::multiplier(60, 0.25, 2.5) < 1.1);   // fine control near default
}

TEST(settings_apple_presets) {
    AppleHardware air;   // M1 base, on battery
    air.generation = 1;
    air.pluggedIn = false;
    const GraphicsSettings g1 = applePreset(air);
    CHECK(!g1.rtReflections && !g1.rtStadiumLighting);
    CHECK(g1.frameRateCapValue() == 30);

    AppleHardware max;
    max.generation = 3;
    max.chipClass = AppleHardware::ChipClass::Max;
    max.proMotionDisplay = true;
    max.nativeWidth = 3456;
    max.nativeHeight = 2234;
    const GraphicsSettings g3 = applePreset(max);
    CHECK(g3.rtReflections && g3.rtStadiumLighting);
    CHECK(g3.frameRateCapValue() == 120);
    CHECK(g3.grassBladesPerSquareMetre() == 18000);
}

TEST(settings_dynamic_resolution_controller) {
    DynamicResolutionController drc(0.5, 1.0);
    for (int i = 0; i < 300; ++i) drc.update(25.0, 60, 0, 1.0 / 60.0);   // 40 fps: too slow
    const double low = drc.scale();
    CHECK(low < 0.9);
    for (int i = 0; i < 2400; ++i) drc.update(9.0, 60, 0, 1.0 / 60.0);  // headroom
    CHECK(drc.scale() > low);
    const auto hot = drc.update(16.0, 60, 3, 1.0 / 60.0);
    CHECK(hot.renderScale <= 0.6 + 1e-9 && hot.recommendedFrameCap == 30);
}

// ===================================================================== TACTICS ===
TEST(tactics_pitch_control_and_threat) {
    std::vector<AgentSnapshot> agents{{{0, 0, 0}, {}, 0}, {{20, 0, 0}, {}, 1}};
    PitchControl pc;
    CHECK(pc.probability(agents, {2, 0, 0}, 0) > 0.9);
    CHECK(pc.probability(agents, {18, 0, 0}, 0) < 0.1);
    ThreatSurface ts;
    CHECK(ts.value({45, 0, 0}, +1) > ts.value({20, 0, 0}, +1));
    CHECK(ts.value({45, 0, 0}, +1) > ts.value({45, 25, 0}, +1));
}

TEST(tactics_run_planner_finds_onside_space) {
    std::vector<AgentSnapshot> agents{
        {{10, 0, 0}, {}, 0},                       // ball carrier
        {{22, 10, 0}, {}, 0},                      // runner
        {{28, -6, 0}, {}, 1}, {{28, 6, 0}, {}, 1}, // centre-backs
        {{30, 18, 0}, {}, 1}, {{29, -18, 0}, {}, 1},
    };
    OffBallRunPlanner planner;
    const RunCandidate c = planner.plan(agents, 1, {22, 10, 0}, {10, 0, 0}, +1, 28.0);
    std::printf("    run target (%.1f, %.1f) threat %.2f control %.2f offside %d\n", c.target.x, c.target.y,
                c.threat, c.control, c.offsideRisk ? 1 : 0);
    CHECK(!c.offsideRisk);
    CHECK(c.control > 0.5);
    CHECK(ThreatSurface().value(c.target, +1) >= ThreatSurface().value({22, 10, 0}, +1));
}

TEST(tactics_defensive_line_triggers) {
    DefensiveLine dl;
    LineInputs in;
    in.ballPos = {0, 0, 0};
    in.defendSign = -1;
    const LineOutput hold = dl.compute(in);
    in.runnerInBehindThreat = true;
    const LineOutput drop = dl.compute(in);
    in.runnerInBehindThreat = false;
    in.carrierFacingOwnGoal = true;
    const LineOutput step = dl.compute(in);
    CHECK(drop.lineX < hold.lineX && drop.trigger == "drop");
    CHECK(step.lineX > hold.lineX && step.trigger == "step-up");
    in.ballPos = {-40, 20, 0};
    in.carrierFacingOwnGoal = false;
    const LineOutput deep = dl.compute(in);
    CHECK(deep.lineX < -40.0 + 1e-9);         // never in front of the ball
    CHECK(deep.slotY[0] > hold.slotY[0]);     // shifted to the ball side
}

TEST(tactics_adaptive_manager_learns_user_habits) {
    AdaptiveManager mgr(ManagerPersonality::Pragmatist);
    const double baseLine = mgr.plan().lineHeight;
    for (int i = 0; i < 14; ++i) mgr.observe(ObservedEvent::PassRightFlank);
    for (int i = 0; i < 3; ++i) mgr.observe(ObservedEvent::PassCentre);
    for (int i = 0; i < 6; ++i) mgr.observe(ObservedEvent::ThroughBall);
    for (int i = 0; i < 6; ++i) mgr.observe(ObservedEvent::SlowBuildUp);
    CHECK(mgr.maybeReplan(20.0, true, 0));
    CHECK(mgr.plan().overloadFlank == +1);
    CHECK(mgr.plan().lineHeight < baseLine);
    CHECK(mgr.plan().pressHeight > 0.45);
    for (const std::string& r : mgr.plan().reasons) std::printf("    CPU manager: %s\n", r.c_str());
    CHECK(!mgr.maybeReplan(22.0, false, 0));  // window closed: no flip-flopping
}

// ====================================================================== CAMERA ===
TEST(camera_presets_and_tracking_speed) {
    CameraSettings slow, fast;
    slow.trackingSpeed = 2;
    fast.trackingSpeed = 18;
    CameraRig a(slow), b(fast);
    a.update({0, 0, 0}, {}, {}, 0.0, 1.0 / 60.0);
    b.update({0, 0, 0}, {}, {}, 0.0, 1.0 / 60.0);
    CameraPose pa, pb;
    for (int i = 0; i < 30; ++i) {   // ball jumps 30 m, half a second
        pa = a.update({30, 0, 0}, {}, {}, 0.0, 1.0 / 60.0);
        pb = b.update({30, 0, 0}, {}, {}, 0.0, 1.0 / 60.0);
    }
    CHECK(pb.target.x > pa.target.x);
    CHECK(pa.eye.y < -34.0);   // gantry sits outside the touchline

    CameraSettings pro;
    pro.preset = CameraPreset::Pro;
    CameraRig rp(pro);
    const CameraPose pp = rp.update({}, {}, {10, 0, 0}, 0.0, 1.0 / 60.0);
    CHECK(pp.eye.x < 10.0);    // behind the player
    CHECK(pp.target.x > 10.0);
}

}  // namespace

int main() {
    std::printf("KINETIC XI engine core — test run\n");
    for (const TestCase& t : registry()) {
        g_current = t.name;
        const int before = g_failures;
        t.fn();
        std::printf("[%s] %s\n", g_failures == before ? " OK " : "FAIL", t.name);
    }
    std::printf("\n%d checks, %d failures, %zu tests\n", g_checks, g_failures, registry().size());
    return g_failures == 0 ? 0 : 1;
}
