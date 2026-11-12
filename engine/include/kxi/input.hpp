// KINETIC XI — Engine Core
// input.hpp : MacBook keyboard control scheme + the Context Intent Arbiter.
//
// The mandated layout overloads several keys (D shoots, controls sprint, contains and
// tackles; S passes, lobs, crosses, heads and slides; Left Shift strafes, switches and
// forms the lobbed-through chord). The arbiter resolves every overload deterministically
// from (a) the match phase, (b) hardware-timestamped tap/hold durations and (c) chord
// windows, so every meaning in the spec stays reachable without extra keys.
//
// Input is EVENT-SOURCED: each key edge carries the OS timestamp, and the arbiter replays
// edges in order. A 40 ms tap is classified identically at 30, 60 or 120 fps.
#pragma once

#include <array>
#include <cstdint>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

#include "kxi/locomotion.hpp"
#include "kxi/math.hpp"

namespace kxi {

// ------------------------------------------------------------------------------------
// Physical keys (layout-independent positions; names follow a US ANSI MacBook keyboard)
// ------------------------------------------------------------------------------------
enum class Key : std::uint8_t {
    A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z,
    Num0, Num1, Num2, Num3, Num4, Num5, Num6, Num7, Num8, Num9,
    Up, Down, Left, Right,
    LeftCtrl, RightCtrl, LeftShift, RightShift, LeftOption, RightOption,
    LeftCommand, RightCommand, Fn,
    Space, Tab, Return, Escape, CapsLock,
    Count
};
constexpr std::size_t kKeyCount = static_cast<std::size_t>(Key::Count);

const char* keyName(Key k);
std::optional<Key> keyFromName(std::string_view name);
/// macOS virtual key code (HIToolbox/Events.h kVK_*). 0xFFFF if the key has none.
std::uint16_t macVirtualKeyCode(Key k);
std::optional<Key> keyFromMacVirtualKeyCode(std::uint16_t vk);
/// USB HID usage ID (page 0x07). Apple's GameController GCKeyCode values, SDL scancodes
/// and Windows Raw Input all speak this language, so one table serves every platform.
std::uint16_t hidUsage(Key k);
std::optional<Key> keyFromHidUsage(std::uint16_t usage);
/// Modifier keys arrive on macOS as NSEventTypeFlagsChanged, not keyDown/keyUp.
bool isModifierKey(Key k);

// ------------------------------------------------------------------------------------
// Logical slots — what the player rebinds. Defaults reproduce the mandated layout.
// ------------------------------------------------------------------------------------
enum class Slot : std::uint8_t {
    Up, Down, Left, Right,
    Sprint,           // Left Ctrl   : sprint / controlled sprint / stop ball
    StrafeSwitch,     // Left Shift  : strafe dribble / change player / lobbed-through chord
    PassLob,          // S           : ground pass, lob, cross, header, sliding tackle
    Through,          // A           : through pass, rush goalkeeper out
    ShootTackle,      // D           : shoot/volley/header, controlled sprint, teammate contain, tackle
    ShieldJockey,     // W           : protect ball / jockey
    ModifierContext,  // E           : skill-move & finesse/driven modifier, defensive Contain
    Count
};
constexpr std::size_t kSlotCount = static_cast<std::size_t>(Slot::Count);
const char* slotName(Slot s);

struct KeyBindings {
    std::array<Key, kSlotCount> keys{};

    static KeyBindings defaults();
    Key operator[](Slot s) const { return keys[static_cast<std::size_t>(s)]; }
    /// Rebinds a slot. If the key is already used by another slot the two are swapped
    /// (never leaves an action unbound). Returns the slot that was swapped, if any.
    std::optional<Slot> rebind(Slot s, Key k);
    std::optional<Slot> slotForKey(Key k) const;
    bool isValid() const;  // every slot bound, no duplicates
};

struct SystemConflict {
    std::string combo;
    std::string owner;
    std::string fix;
};
/// macOS reserves some combinations before a game ever sees them (e.g. Control+Arrow =
/// Mission Control / Spaces). The first-run "Keyboard Doctor" shows these.
std::vector<SystemConflict> macSystemShortcutConflicts(const KeyBindings& b);

/// Every simultaneous key combination the layout can demand — used by the in-game
/// "Rollover Lab" to verify a specific laptop keyboard has no ghosting on them.
std::vector<std::vector<Key>> requiredChords(const KeyBindings& b);

// ------------------------------------------------------------------------------------
// Game context, actions and the arbiter
// ------------------------------------------------------------------------------------
enum class Phase { InPossession, TeammatePossession, Defending, LooseBall };

struct GameContext {
    Phase phase = Phase::InPossession;
    double facing = 0.0;          // controlled player's facing (world radians)
    double cameraYaw = kPi / 2;   // heading of the camera's forward vector (broadcast = +y)
    bool inShootingRange = false;
    bool aimInGoalCone = false;
    bool inCrossingZone = false;
    bool ballIncoming = false;    // ball arriving at the controlled player (first-time actions)
    double ballHeightAtContact = 0.0;
};

enum class ActionType : std::uint8_t {
    None,
    GroundPass, LobPass, Cross, PassingHeader,
    ThroughPass, LobbedThroughPass, DrivenGroundPass,
    Shot, Volley, ShootingHeader, FinesseShot,
    StopBall, SkillMove, ChangePlayer,
    SlidingTackle, StandingTackle,
};
const char* actionName(ActionType a);

enum class SkillMove : std::uint8_t {
    None, KnockOn, BodyFeintLeft, BodyFeintRight, StepoverBurst, DragBack, SoleRoll,
    RouletteLeft, RouletteRight, InsideShiftLeft, InsideShiftRight, HeelChop,
};
const char* skillName(SkillMove s);

struct Command {
    ActionType type = ActionType::None;
    double power = 0.0;      // 0..1 normalised charge
    double heldSeconds = 0.0;
    SkillMove skill = SkillMove::None;
    Vec3 aim{};              // world-space aim direction at release (may be zero)
    double time = 0.0;
};

struct ArbiterOutput {
    Vec3 moveDir{};          // world-space, normalised or zero
    SprintLevel sprint = SprintLevel::None;
    bool closeControl = false;   // modifier held while dribbling: slow, tight touches
    bool holdBall = false;       // Ctrl held with no direction: stand on the ball
    bool strafe = false;
    bool shield = false;
    bool jockey = false;
    bool contain = false;
    bool teammateContain = false;
    bool rushKeeper = false;
    ActionType charging = ActionType::None;  // live power-bar preview
    double chargePower = 0.0;
    std::vector<Command> commands;           // discrete actions fired this tick
};

enum class SprintMode { Ramp, InstantFull, AlwaysControlled };
enum class PrecisionPriority { Context, AlwaysFinesse, AlwaysDriven };

struct InputTuning {
    double tapThreshold = 0.20;            // S: tap = ground pass, hold = lob/cross
    double chordWindow = 0.11;             // keys pressed this close together form a chord
    double controlledSprintWindow = 0.24;  // Ctrl+Dir starts controlled, ramps to full
    double featherWindow = 0.30;           // re-press Ctrl within this = stay controlled
    double gestureWindow = 0.38;           // skill-move token spacing
    double maxCharge = 1.0;                // full power bar (seconds)
    double stopBallTapMax = 0.20;          // Ctrl tap with no direction = stop ball
    double timingScale = 1.0;              // accessibility: scales every window above
    SprintMode sprintMode = SprintMode::Ramp;
    PrecisionPriority precision = PrecisionPriority::Context;
};

struct KeyEvent {
    Key key;
    bool down;
    double time;  // seconds, from the OS event timestamp
};

class IntentArbiter {
public:
    explicit IntentArbiter(KeyBindings bindings = KeyBindings::defaults(), InputTuning tuning = {});

    /// Replays the key edges since the last tick (in timestamp order), then evaluates the
    /// held state at `now`. Key auto-repeat must be filtered by the platform layer.
    ArbiterOutput update(const std::vector<KeyEvent>& events, const GameContext& ctx, double now);

    void setBindings(const KeyBindings& b) { bindings_ = b; }
    void setTuning(const InputTuning& t) { tuning_ = t; }
    const KeyBindings& bindings() const { return bindings_; }
    const InputTuning& tuning() const { return tuning_; }
    bool isSlotDown(Slot s) const;

private:
    struct Charge {
        bool active = false;
        Slot slot = Slot::PassLob;
        double start = 0.0;
        bool precision = false;   // D + Modifier
        bool lobbed = false;      // Shift + A
    };
    struct GestureToken { char token; double time; };

    void onPress(Slot s, double t, const GameContext& ctx, ArbiterOutput& out);
    void onRelease(Slot s, double t, const GameContext& ctx, ArbiterOutput& out);
    void fireCharge(double t, const GameContext& ctx, ArbiterOutput& out);
    ActionType predictChargeType(double held, const GameContext& ctx) const;
    void resolveGesture(double t, ArbiterOutput& out);
    Vec3 screenDirection() const;
    Vec3 worldDirection(const GameContext& ctx) const;
    char relativeToken(const Vec3& worldDir, double facing) const;
    double w(double seconds) const { return seconds * tuning_.timingScale; }

    KeyBindings bindings_;
    InputTuning tuning_;
    std::array<bool, kKeyCount> down_{};
    std::array<double, kSlotCount> pressTime_{};
    Charge charge_;
    std::vector<GestureToken> gesture_;
    bool gestureActive_ = false;
    double lastCtrlRelease_ = -10.0;
    bool feathering_ = false;
    bool dirDuringCtrl_ = false;
    bool shiftConsumed_ = false;
    Phase lastPhase_ = Phase::InPossession;
    Vec3 lastWorldDir_{};
};

/// One row of the human-readable binding table (menus, PDF, remap UI).
struct BindingRow {
    std::string action;
    std::string keys;
    std::string context;
};
std::vector<BindingRow> bindingTable(const KeyBindings& b);

}  // namespace kxi
