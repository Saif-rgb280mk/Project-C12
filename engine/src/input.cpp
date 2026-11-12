// KINETIC XI — Engine Core
// input.cpp : key tables, macOS key codes, bindings, system-conflict detection and the
// Context Intent Arbiter state machine.
#include "kxi/input.hpp"

#include <algorithm>
#include <cmath>

namespace kxi {
namespace {

constexpr const char* kKeyNames[kKeyCount] = {
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S",
    "T", "U", "V", "W", "X", "Y", "Z",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    "Up", "Down", "Left", "Right",
    "LeftCtrl", "RightCtrl", "LeftShift", "RightShift", "LeftOption", "RightOption",
    "LeftCommand", "RightCommand", "Fn",
    "Space", "Tab", "Return", "Escape", "CapsLock",
};

// HIToolbox/Events.h virtual key codes, in Key enum order.
constexpr std::uint16_t kMacCodes[kKeyCount] = {
    0x00, 0x0B, 0x08, 0x02, 0x0E, 0x03, 0x05, 0x04, 0x22, 0x26, 0x28, 0x25, 0x2E,  // A..M
    0x2D, 0x1F, 0x23, 0x0C, 0x0F, 0x01, 0x11, 0x20, 0x09, 0x0D, 0x07, 0x10, 0x06,  // N..Z
    0x1D, 0x12, 0x13, 0x14, 0x15, 0x17, 0x16, 0x1A, 0x1C, 0x19,                    // 0..9
    0x7E, 0x7D, 0x7B, 0x7C,                                                        // arrows
    0x3B, 0x3E, 0x38, 0x3C, 0x3A, 0x3D, 0x37, 0x36, 0x3F,                          // modifiers
    0x31, 0x30, 0x24, 0x35, 0x39,                                                  // misc
};

// USB HID usage IDs (keyboard page 0x07), in Key enum order.
constexpr std::uint16_t kHidUsages[kKeyCount] = {
    0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10,  // A..M
    0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D,  // N..Z
    0x27, 0x1E, 0x1F, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26,                    // 0..9
    0x52, 0x51, 0x50, 0x4F,                                                        // arrows
    0xE0, 0xE4, 0xE1, 0xE5, 0xE2, 0xE6, 0xE3, 0xE7, 0x00,                          // modifiers (Fn has no usage)
    0x2C, 0x2B, 0x28, 0x29, 0x39,                                                  // misc
};

constexpr const char* kSlotNames[kSlotCount] = {
    "Move Up", "Move Down", "Move Left", "Move Right",
    "Sprint / Stop Ball", "Strafe / Change Player", "Pass / Lob / Slide",
    "Through Pass / Rush GK", "Shoot / Tackle / Contain-Mate", "Shield / Jockey",
    "Modifier / Contain",
};

bool isArrowSlot(Slot s) { return s == Slot::Up || s == Slot::Down || s == Slot::Left || s == Slot::Right; }

}  // namespace

const char* keyName(Key k) { return kKeyNames[static_cast<std::size_t>(k)]; }

std::optional<Key> keyFromName(std::string_view name) {
    for (std::size_t i = 0; i < kKeyCount; ++i)
        if (name == kKeyNames[i]) return static_cast<Key>(i);
    return std::nullopt;
}

std::uint16_t macVirtualKeyCode(Key k) {
    return k == Key::Count ? 0xFFFF : kMacCodes[static_cast<std::size_t>(k)];
}

std::optional<Key> keyFromMacVirtualKeyCode(std::uint16_t vk) {
    for (std::size_t i = 0; i < kKeyCount; ++i)
        if (kMacCodes[i] == vk) return static_cast<Key>(i);
    return std::nullopt;
}

std::uint16_t hidUsage(Key k) {
    return k == Key::Count ? 0 : kHidUsages[static_cast<std::size_t>(k)];
}

std::optional<Key> keyFromHidUsage(std::uint16_t usage) {
    if (usage == 0) return std::nullopt;
    for (std::size_t i = 0; i < kKeyCount; ++i)
        if (kHidUsages[i] == usage) return static_cast<Key>(i);
    return std::nullopt;
}

bool isModifierKey(Key k) {
    switch (k) {
        case Key::LeftCtrl: case Key::RightCtrl: case Key::LeftShift: case Key::RightShift:
        case Key::LeftOption: case Key::RightOption: case Key::LeftCommand: case Key::RightCommand:
        case Key::Fn: case Key::CapsLock:
            return true;
        default:
            return false;
    }
}

const char* slotName(Slot s) { return kSlotNames[static_cast<std::size_t>(s)]; }

KeyBindings KeyBindings::defaults() {
    KeyBindings b;
    auto set = [&](Slot s, Key k) { b.keys[static_cast<std::size_t>(s)] = k; };
    set(Slot::Up, Key::Up);
    set(Slot::Down, Key::Down);
    set(Slot::Left, Key::Left);
    set(Slot::Right, Key::Right);
    set(Slot::Sprint, Key::LeftCtrl);
    set(Slot::StrafeSwitch, Key::LeftShift);
    set(Slot::PassLob, Key::S);
    set(Slot::Through, Key::A);
    set(Slot::ShootTackle, Key::D);
    set(Slot::ShieldJockey, Key::W);
    set(Slot::ModifierContext, Key::E);
    return b;
}

std::optional<Slot> KeyBindings::slotForKey(Key k) const {
    for (std::size_t i = 0; i < kSlotCount; ++i)
        if (keys[i] == k) return static_cast<Slot>(i);
    return std::nullopt;
}

std::optional<Slot> KeyBindings::rebind(Slot s, Key k) {
    const auto existing = slotForKey(k);
    const Key previous = (*this)[s];
    keys[static_cast<std::size_t>(s)] = k;
    if (existing && *existing != s) {
        keys[static_cast<std::size_t>(*existing)] = previous;  // swap, never leave a hole
        return existing;
    }
    return std::nullopt;
}

bool KeyBindings::isValid() const {
    for (std::size_t i = 0; i < kSlotCount; ++i) {
        if (keys[i] == Key::Count) return false;
        for (std::size_t j = i + 1; j < kSlotCount; ++j)
            if (keys[i] == keys[j]) return false;
    }
    return true;
}

std::vector<SystemConflict> macSystemShortcutConflicts(const KeyBindings& b) {
    std::vector<SystemConflict> out;
    auto bound = [&](Key k) { return b.slotForKey(k).has_value(); };
    const Key sprint = b[Slot::Sprint];
    const bool arrowsBound = b[Slot::Up] == Key::Up || b[Slot::Down] == Key::Down ||
                             b[Slot::Left] == Key::Left || b[Slot::Right] == Key::Right;
    if ((sprint == Key::LeftCtrl || sprint == Key::RightCtrl) && arrowsBound) {
        const std::string fix =
            "System Settings > Keyboard > Keyboard Shortcuts... > Mission Control: untick "
            "'Mission Control', 'Application windows', 'Move left a space' and 'Move right a space' "
            "(or rebind Sprint).";
        out.push_back({"Control + Left/Right", "macOS Spaces (Move left/right a space)", fix});
        out.push_back({"Control + Up", "macOS Mission Control", fix});
        out.push_back({"Control + Down", "macOS Application windows (App Expose)", fix});
    }
    if (bound(Key::LeftCommand) || bound(Key::RightCommand)) {
        out.push_back({"Command + Q/W/H/M/Tab", "macOS app quit / close / hide / minimise / switcher",
                       "Never bind Command in gameplay; use Option or a letter key."});
    }
    if (bound(Key::Fn)) {
        out.push_back({"Fn (Globe) + Arrows", "Page Up / Page Down / Home / End, emoji & dictation",
                       "Rebind away from Fn/Globe."});
    }
    if ((sprint == Key::LeftCtrl || sprint == Key::RightCtrl) && bound(Key::Space)) {
        out.push_back({"Control + Space", "macOS input-source switching",
                       "Disable in Keyboard Shortcuts > Input Sources, or avoid Space."});
    }
    return out;
}

std::vector<std::vector<Key>> requiredChords(const KeyBindings& b) {
    const Key up = b[Slot::Up], down = b[Slot::Down], left = b[Slot::Left], right = b[Slot::Right];
    const Key ctrl = b[Slot::Sprint], shift = b[Slot::StrafeSwitch], mod = b[Slot::ModifierContext];
    const Key s = b[Slot::PassLob], a = b[Slot::Through], d = b[Slot::ShootTackle], wk = b[Slot::ShieldJockey];
    return {
        {ctrl, up, right, d},            // diagonal sprint + shot
        {ctrl, down, left, s},           // diagonal sprint + cross
        {ctrl, up, left, mod, d},        // sprinting finesse shot (5 keys: worst case)
        {shift, a, up, right},           // lobbed through ball on the diagonal
        {mod, d, down, right},           // driven pass on the diagonal
        {wk, d, left, up},               // jockey + standing tackle on the diagonal
        {wk, up, down},                  // opposing arrows while jockeying (ghosting classic)
        {shift, left, right, up},        // strafe dribble with three arrows
    };
}

std::vector<BindingRow> bindingTable(const KeyBindings& b) {
    auto k = [&](Slot s) { return std::string(keyName(b[s])); };
    const std::string arrows = k(Slot::Up) + "/" + k(Slot::Left) + "/" + k(Slot::Down) + "/" + k(Slot::Right);
    return {
        {"Movement", arrows, "Always (camera-relative)"},
        {"Sprint", k(Slot::Sprint) + " + Arrows", "Ramps controlled->full after 240 ms"},
        {"Controlled Sprint", k(Slot::ShootTackle) + " or " + k(Slot::Sprint) + " + Direction",
         "D+Dir off the ball; Ctrl feathering on the ball"},
        {"Stop Ball", k(Slot::Sprint) + " (no direction)", "In possession, tap"},
        {"Strafe Dribble", k(Slot::StrafeSwitch) + " (no direction)", "In possession, hold"},
        {"Skill Moves", k(Slot::ModifierContext) + " + Direction gestures", "In possession"},
        {"Ground Pass / Header", k(Slot::PassLob) + " (tap)", "Released < 200 ms"},
        {"Through Pass", k(Slot::Through), "Hold for power"},
        {"Lob Pass / Cross / Header", k(Slot::PassLob) + " (hold)", "Cross inside crossing zone"},
        {"Lobbed Through Pass", k(Slot::StrafeSwitch) + " + " + k(Slot::Through), "Chord window 110 ms"},
        {"Driven Ground Pass", k(Slot::ShootTackle) + " + " + k(Slot::ModifierContext), "Outside shooting context"},
        {"Shoot / Volley / Header", k(Slot::ShootTackle), "Hold for power"},
        {"Finesse Shot", k(Slot::ShootTackle) + " + " + k(Slot::ModifierContext), "In range, aim inside goal cone"},
        {"Protect / Shield / Jockey", k(Slot::ShieldJockey) + " (+ Arrows)", "Shield in possession, jockey defending"},
        {"Change Player", k(Slot::StrafeSwitch), "Out of possession, press"},
        {"Contain", k(Slot::ModifierContext) + " (hold)", "Defending (Context Key)"},
        {"Teammate Contain", k(Slot::ShootTackle) + " (hold)", "Defending"},
        {"Sliding Tackle", k(Slot::PassLob), "Defending, press"},
        {"Steal / Standing Tackle", k(Slot::ShootTackle) + " + " + k(Slot::ShieldJockey) + " or " +
                                        k(Slot::ModifierContext), "Defending, D while W/E held"},
        {"Rush Goalkeeper Out", k(Slot::Through) + " (hold)", "Defending"},
    };
}

const char* actionName(ActionType a) {
    switch (a) {
        case ActionType::None: return "None";
        case ActionType::GroundPass: return "GroundPass";
        case ActionType::LobPass: return "LobPass";
        case ActionType::Cross: return "Cross";
        case ActionType::PassingHeader: return "PassingHeader";
        case ActionType::ThroughPass: return "ThroughPass";
        case ActionType::LobbedThroughPass: return "LobbedThroughPass";
        case ActionType::DrivenGroundPass: return "DrivenGroundPass";
        case ActionType::Shot: return "Shot";
        case ActionType::Volley: return "Volley";
        case ActionType::ShootingHeader: return "ShootingHeader";
        case ActionType::FinesseShot: return "FinesseShot";
        case ActionType::StopBall: return "StopBall";
        case ActionType::SkillMove: return "SkillMove";
        case ActionType::ChangePlayer: return "ChangePlayer";
        case ActionType::SlidingTackle: return "SlidingTackle";
        case ActionType::StandingTackle: return "StandingTackle";
    }
    return "?";
}

const char* skillName(SkillMove s) {
    switch (s) {
        case SkillMove::None: return "None";
        case SkillMove::KnockOn: return "KnockOn";
        case SkillMove::BodyFeintLeft: return "BodyFeintLeft";
        case SkillMove::BodyFeintRight: return "BodyFeintRight";
        case SkillMove::StepoverBurst: return "StepoverBurst";
        case SkillMove::DragBack: return "DragBack";
        case SkillMove::SoleRoll: return "SoleRoll";
        case SkillMove::RouletteLeft: return "RouletteLeft";
        case SkillMove::RouletteRight: return "RouletteRight";
        case SkillMove::InsideShiftLeft: return "InsideShiftLeft";
        case SkillMove::InsideShiftRight: return "InsideShiftRight";
        case SkillMove::HeelChop: return "HeelChop";
    }
    return "?";
}

// ====================================================================================
// IntentArbiter
// ====================================================================================

IntentArbiter::IntentArbiter(KeyBindings bindings, InputTuning tuning)
    : bindings_(bindings), tuning_(tuning) {}

bool IntentArbiter::isSlotDown(Slot s) const { return down_[static_cast<std::size_t>(bindings_[s])]; }

Vec3 IntentArbiter::screenDirection() const {
    const double x = (isSlotDown(Slot::Right) ? 1.0 : 0.0) - (isSlotDown(Slot::Left) ? 1.0 : 0.0);
    const double y = (isSlotDown(Slot::Up) ? 1.0 : 0.0) - (isSlotDown(Slot::Down) ? 1.0 : 0.0);
    return normalize(Vec3{x, y, 0.0});
}

Vec3 IntentArbiter::worldDirection(const GameContext& ctx) const {
    // Screen "up" maps to the camera's forward direction on the pitch.
    const Vec3 s = screenDirection();
    const double a = ctx.cameraYaw - kPi / 2.0;
    const double c = std::cos(a), sn = std::sin(a);
    return {s.x * c - s.y * sn, s.x * sn + s.y * c, 0.0};
}

char IntentArbiter::relativeToken(const Vec3& worldDir, double facing) const {
    const double rel = wrapAngle(headingOf(worldDir) - facing);
    if (std::abs(rel) <= kPi / 4.0) return 'F';
    if (std::abs(rel) >= 3.0 * kPi / 4.0) return 'B';
    return rel > 0.0 ? 'L' : 'R';
}

ActionType IntentArbiter::predictChargeType(double held, const GameContext& ctx) const {
    const bool aerial = ctx.ballIncoming && ctx.ballHeightAtContact > 1.3;
    switch (charge_.slot) {
        case Slot::PassLob:
            if (aerial) return ActionType::PassingHeader;
            if (held < w(tuning_.tapThreshold)) return ActionType::GroundPass;
            return ctx.inCrossingZone ? ActionType::Cross : ActionType::LobPass;
        case Slot::Through:
            return charge_.lobbed ? ActionType::LobbedThroughPass : ActionType::ThroughPass;
        case Slot::ShootTackle:
            if (charge_.precision) {
                switch (tuning_.precision) {
                    case PrecisionPriority::AlwaysFinesse: return ActionType::FinesseShot;
                    case PrecisionPriority::AlwaysDriven: return ActionType::DrivenGroundPass;
                    case PrecisionPriority::Context:
                        return (ctx.inShootingRange && ctx.aimInGoalCone) ? ActionType::FinesseShot
                                                                          : ActionType::DrivenGroundPass;
                }
            }
            if (aerial) return ActionType::ShootingHeader;
            if (ctx.ballIncoming && ctx.ballHeightAtContact > 0.35) return ActionType::Volley;
            return ActionType::Shot;
        default:
            return ActionType::None;
    }
}

void IntentArbiter::fireCharge(double t, const GameContext& ctx, ArbiterOutput& out) {
    const double held = t - charge_.start;
    Command c;
    c.type = predictChargeType(held, ctx);
    c.heldSeconds = held;
    c.time = t;
    c.aim = lastWorldDir_;
    const double tap = w(tuning_.tapThreshold);
    if (c.type == ActionType::GroundPass) {
        c.power = saturate(held / tap);  // only Manual passing uses the tap length
    } else if (charge_.slot == Slot::PassLob && c.type != ActionType::PassingHeader) {
        c.power = saturate((held - tap) / (w(tuning_.maxCharge) - tap));
    } else {
        c.power = saturate(held / w(tuning_.maxCharge));
    }
    out.commands.push_back(c);
    charge_ = Charge{};
}

void IntentArbiter::resolveGesture(double t, ArbiterOutput& out) {
    if (gesture_.empty()) return;
    SkillMove move = SkillMove::None;
    const char a = gesture_[0].token;
    const char b = gesture_.size() > 1 ? gesture_[1].token : '\0';
    if (b != '\0') {
        if (a == 'F' && b == 'F') move = SkillMove::StepoverBurst;
        else if (a == 'B' && b == 'B') move = SkillMove::SoleRoll;
        else if (a == 'L' && b == 'R') move = SkillMove::RouletteRight;
        else if (a == 'R' && b == 'L') move = SkillMove::RouletteLeft;
        else if (a == 'F' && b == 'L') move = SkillMove::InsideShiftLeft;
        else if (a == 'F' && b == 'R') move = SkillMove::InsideShiftRight;
        else if (a == 'F' && b == 'B') move = SkillMove::HeelChop;
    }
    if (move == SkillMove::None) {  // single token (or unmatched pair -> first token)
        if (a == 'F') move = SkillMove::KnockOn;
        else if (a == 'B') move = SkillMove::DragBack;
        else if (a == 'L') move = SkillMove::BodyFeintLeft;
        else move = SkillMove::BodyFeintRight;
    }
    Command c;
    c.type = ActionType::SkillMove;
    c.skill = move;
    c.time = t;
    c.aim = lastWorldDir_;
    out.commands.push_back(c);
    gesture_.clear();
}

void IntentArbiter::onPress(Slot s, double t, const GameContext& ctx, ArbiterOutput& out) {
    pressTime_[static_cast<std::size_t>(s)] = t;
    const bool possession = ctx.phase == Phase::InPossession;
    const bool onBallAction = possession || ctx.ballIncoming;
    const bool defending = ctx.phase == Phase::Defending;
    lastWorldDir_ = length(worldDirection(ctx)) > 0 ? worldDirection(ctx) : lastWorldDir_;

    if (isArrowSlot(s)) {
        if (possession && isSlotDown(Slot::ModifierContext) && !charge_.active) {
            gestureActive_ = true;
            // Use the key just pressed (not the combined diagonal) for the token.
            Vec3 single{};
            if (s == Slot::Up) single = {0, 1, 0};
            if (s == Slot::Down) single = {0, -1, 0};
            if (s == Slot::Left) single = {-1, 0, 0};
            if (s == Slot::Right) single = {1, 0, 0};
            const double a = ctx.cameraYaw - kPi / 2.0;
            const Vec3 singleWorld{single.x * std::cos(a) - single.y * std::sin(a),
                                   single.x * std::sin(a) + single.y * std::cos(a), 0.0};
            gesture_.push_back({relativeToken(singleWorld, ctx.facing), t});
            if (gesture_.size() >= 2) resolveGesture(t, out);
        }
        return;
    }

    switch (s) {
        case Slot::Sprint:
            feathering_ = (t - lastCtrlRelease_) < w(tuning_.featherWindow);
            dirDuringCtrl_ = length(screenDirection()) > 0.0;
            break;

        case Slot::StrafeSwitch:
            shiftConsumed_ = false;
            if (charge_.active && charge_.slot == Slot::Through && t - charge_.start <= w(tuning_.chordWindow)) {
                charge_.lobbed = true;   // A then Shift inside the chord window
                shiftConsumed_ = true;
            } else if (!possession && !ctx.ballIncoming) {
                Command c;
                c.type = ActionType::ChangePlayer;
                c.time = t;
                c.aim = worldDirection(ctx);
                out.commands.push_back(c);
                shiftConsumed_ = true;
            }
            break;

        case Slot::PassLob:
            if (defending) {
                Command c;
                c.type = ActionType::SlidingTackle;
                c.time = t;
                c.aim = worldDirection(ctx);
                out.commands.push_back(c);
            } else if (onBallAction) {
                charge_ = Charge{true, Slot::PassLob, t, false, false};
            }
            break;

        case Slot::Through:
            if (onBallAction && !defending) {
                charge_ = Charge{true, Slot::Through, t, false, false};
                if (isSlotDown(Slot::StrafeSwitch)) {   // Shift held first: lobbed through
                    charge_.lobbed = true;
                    shiftConsumed_ = true;
                }
            }
            break;

        case Slot::ShootTackle:
            if (defending) {
                if (isSlotDown(Slot::ShieldJockey) || isSlotDown(Slot::ModifierContext)) {
                    Command c;
                    c.type = ActionType::StandingTackle;
                    c.time = t;
                    c.aim = worldDirection(ctx);
                    out.commands.push_back(c);
                }
            } else if (onBallAction) {
                charge_ = Charge{true, Slot::ShootTackle, t, isSlotDown(Slot::ModifierContext), false};
                gesture_.clear();  // a shot cancels a half-entered skill gesture
                gestureActive_ = false;
            }
            break;

        case Slot::ModifierContext:
            if (charge_.active && charge_.slot == Slot::ShootTackle &&
                t - charge_.start <= w(tuning_.chordWindow)) {
                charge_.precision = true;   // D then E inside the chord window
            } else if (possession) {
                gesture_.clear();
                gestureActive_ = true;
            }
            break;

        default:
            break;
    }
}

void IntentArbiter::onRelease(Slot s, double t, const GameContext& ctx, ArbiterOutput& out) {
    const double held = t - pressTime_[static_cast<std::size_t>(s)];
    switch (s) {
        case Slot::Sprint:
            lastCtrlRelease_ = t;
            if (ctx.phase == Phase::InPossession && held <= w(tuning_.stopBallTapMax) && !dirDuringCtrl_ &&
                length(screenDirection()) == 0.0) {
                Command c;
                c.type = ActionType::StopBall;
                c.time = t;
                out.commands.push_back(c);
            }
            break;
        case Slot::PassLob:
        case Slot::Through:
        case Slot::ShootTackle:
            if (charge_.active && charge_.slot == s) {
                lastWorldDir_ = length(worldDirection(ctx)) > 0 ? worldDirection(ctx) : lastWorldDir_;
                fireCharge(t, ctx, out);
            }
            break;
        case Slot::ModifierContext:
            if (!gesture_.empty()) resolveGesture(t, out);
            gestureActive_ = false;
            break;
        default:
            break;
    }
}

ArbiterOutput IntentArbiter::update(const std::vector<KeyEvent>& events, const GameContext& ctx, double now) {
    ArbiterOutput out;

    // Losing (or winning) the ball mid-charge cancels the charge and any gesture.
    if (ctx.phase != lastPhase_) {
        const bool wasOnBall = lastPhase_ == Phase::InPossession;
        const bool isOnBall = ctx.phase == Phase::InPossession;
        if (wasOnBall != isOnBall && !ctx.ballIncoming) {
            charge_ = Charge{};
            gesture_.clear();
            gestureActive_ = false;
        }
        lastPhase_ = ctx.phase;
    }

    for (const KeyEvent& e : events) {
        const std::size_t ki = static_cast<std::size_t>(e.key);
        if (ki >= kKeyCount) continue;
        if (down_[ki] == e.down) continue;           // auto-repeat / duplicate edge
        down_[ki] = e.down;
        const auto slot = bindings_.slotForKey(e.key);
        if (!slot) continue;
        if (e.down) onPress(*slot, e.time, ctx, out);
        else onRelease(*slot, e.time, ctx, out);
    }

    // ---- Continuous (held) state at `now` ----
    const Vec3 dir = worldDirection(ctx);
    const bool hasDir = length(dir) > 0.0;
    if (hasDir) lastWorldDir_ = dir;
    out.moveDir = dir;

    const bool possession = ctx.phase == Phase::InPossession;
    const bool defending = ctx.phase == Phase::Defending;
    const bool ctrl = isSlotDown(Slot::Sprint);
    const bool shift = isSlotDown(Slot::StrafeSwitch);
    const bool mod = isSlotDown(Slot::ModifierContext);
    const bool dKey = isSlotDown(Slot::ShootTackle);
    const bool wKey = isSlotDown(Slot::ShieldJockey);
    const bool aKey = isSlotDown(Slot::Through);

    // Single-token skill gestures resolve after the gesture window.
    if (gesture_.size() == 1 && now - gesture_[0].time > w(tuning_.gestureWindow)) resolveGesture(now, out);

    // Sprint / controlled sprint.
    if (ctrl && hasDir) {
        const double held = now - pressTime_[static_cast<std::size_t>(Slot::Sprint)];
        switch (tuning_.sprintMode) {
            case SprintMode::Ramp:
                out.sprint = (feathering_ || held < w(tuning_.controlledSprintWindow)) ? SprintLevel::Controlled
                                                                                       : SprintLevel::Full;
                break;
            case SprintMode::InstantFull: out.sprint = SprintLevel::Full; break;
            case SprintMode::AlwaysControlled: out.sprint = SprintLevel::Controlled; break;
        }
    } else if (dKey && hasDir && !charge_.active && !ctx.ballIncoming &&
               (ctx.phase == Phase::TeammatePossession || ctx.phase == Phase::LooseBall)) {
        out.sprint = SprintLevel::Controlled;   // "D + Direction" off the ball
    }

    out.closeControl = possession && mod && gestureActive_;
    out.holdBall = possession && ctrl && !hasDir &&
                   now - pressTime_[static_cast<std::size_t>(Slot::Sprint)] > w(tuning_.stopBallTapMax);
    out.strafe = possession && shift && !shiftConsumed_ &&
                 now - pressTime_[static_cast<std::size_t>(Slot::StrafeSwitch)] >= w(tuning_.chordWindow);
    out.shield = possession && wKey;
    out.jockey = defending && wKey;
    out.contain = defending && mod;
    out.teammateContain = defending && dKey && !wKey && !mod;
    out.rushKeeper = defending && aKey;

    if (charge_.active) {
        const double held = now - charge_.start;
        out.charging = predictChargeType(held, ctx);
        out.chargePower = saturate(held / w(tuning_.maxCharge));
    }
    return out;
}

}  // namespace kxi
