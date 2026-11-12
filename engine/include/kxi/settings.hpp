// KINETIC XI — Engine Core
// settings.hpp : the complete AAA options suite.
//   Graphics & Performance (incl. Metal / Apple Silicon presets, MetalFX, ray tracing)
//   Gameplay & Simulation sliders (separate User / CPU values)
//   Camera (Broadcast, Tele, Co-op, Pro, Custom + Height / Zoom / Ball Tracking Speed)
//   Audio (granular mix busses)
//   Accessibility & Input (assist levels, overlays, timing scale, full key remapping)
// Every field is declared ONCE in a visitFields() list that drives JSON save, JSON load
// (with clamping + warnings) and the menu generator — no field can be forgotten.
#pragma once

#include <array>
#include <string>
#include <vector>

#include "kxi/input.hpp"
#include "kxi/json.hpp"

namespace kxi {

enum class Quality { Off, Low, Medium, High, Ultra };
enum class FrameRateCap { Fps30, Fps60, Fps120, Uncapped };
enum class DisplayMode { Fullscreen, Borderless, Windowed };
enum class Upscaler { Off, MetalFXSpatial, MetalFXTemporal };
enum class AntiAliasing { Off, FXAA, TAA };
enum class CameraPreset { Broadcast, Tele, CoOp, Pro, Custom };
enum class AssistLevel { Assisted, SemiAssisted, Manual };
enum class DynamicRange { Night, Standard, Wide };
enum class ColorblindMode { Off, Protanopia, Deuteranopia, Tritanopia };
enum class OverlayStyle { Minimal, Full, KeyboardDiagram };

inline constexpr std::array<const char*, 5> kQualityNames{"Off", "Low", "Medium", "High", "Ultra"};
inline constexpr std::array<const char*, 4> kFrameCapNames{"30", "60", "120", "Uncapped"};
inline constexpr std::array<const char*, 3> kDisplayModeNames{"Fullscreen", "Borderless", "Windowed"};
inline constexpr std::array<const char*, 3> kUpscalerNames{"Off", "MetalFXSpatial", "MetalFXTemporal"};
inline constexpr std::array<const char*, 3> kAANames{"Off", "FXAA", "TAA"};
inline constexpr std::array<const char*, 5> kCameraNames{"Broadcast", "Tele", "CoOp", "Pro", "Custom"};
inline constexpr std::array<const char*, 3> kAssistNames{"Assisted", "SemiAssisted", "Manual"};
inline constexpr std::array<const char*, 3> kDynamicRangeNames{"Night", "Standard", "Wide"};
inline constexpr std::array<const char*, 4> kColorblindNames{"Off", "Protanopia", "Deuteranopia", "Tritanopia"};
inline constexpr std::array<const char*, 3> kOverlayNames{"Minimal", "Full", "KeyboardDiagram"};
inline constexpr std::array<const char*, 3> kSprintModeNames{"Ramp", "InstantFull", "AlwaysControlled"};
inline constexpr std::array<const char*, 3> kPrecisionNames{"Context", "AlwaysFinesse", "AlwaysDriven"};

struct GraphicsSettings {
    int resolutionWidth = 2560;     // MacBook Air 13" native panel
    int resolutionHeight = 1664;
    double renderScale = 0.80;      // internal resolution (0.5 .. 2.0) before upscaling
    Upscaler upscaler = Upscaler::MetalFXTemporal;
    bool dynamicResolution = true;
    FrameRateCap frameRateCap = FrameRateCap::Fps60;
    bool vsync = true;
    DisplayMode displayMode = DisplayMode::Fullscreen;
    bool rtReflections = false;     // wet-pitch puddles, glass, kit sheen
    bool rtStadiumLighting = false; // ray-traced floodlight GI & contact shadows
    Quality rtQuality = Quality::Medium;
    Quality grassDensity = Quality::High;     // 3D turf blades
    Quality crowdDetail = Quality::High;
    Quality weatherParticles = Quality::High;
    bool motionBlur = true;
    double motionBlurStrength = 0.5;
    Quality shadows = Quality::High;
    Quality ambientOcclusion = Quality::Medium;
    Quality textureQuality = Quality::High;
    AntiAliasing antiAliasing = AntiAliasing::TAA;
    double sharpening = 0.35;
    bool filmGrain = true;
    bool lensDirt = true;
    bool batteryAwareProfile = true; // switch to the battery profile when unplugged
    bool lowPowerModeCap = true;     // honour macOS Low Power Mode (30 fps cap)

    int grassBladesPerSquareMetre() const;
    int crowdAgentCount() const;
    int frameRateCapValue() const;   // 0 = uncapped
};

struct SliderPair {
    int user = 50;
    int cpu = 50;
};

struct GameplaySettings {
    SliderPair sprintSpeed, acceleration, shotError, passError, shotSpeed, passSpeed,
        firstTouchControl, goalkeeperAbility, marking, runFrequency, lineHeight, lineLength,
        lineWidth, fullbackPositioning, injuryFrequency, injurySeverity;
    int halfLengthMinutes = 6;
    int gameSpeed = 50;
    bool fatigueRealism = true;

    /// Maps a 0..100 slider to a multiplier: 0 -> atZero, 50 -> 1.0, 100 -> atHundred,
    /// with a smooth (quadratic-blend) response so the middle range is fine-grained.
    static double multiplier(int slider, double atZero, double atHundred);
};

struct CameraSettings {
    CameraPreset preset = CameraPreset::Broadcast;
    int height = 10;          // 0..20
    int zoom = 10;            // 0..20
    int trackingSpeed = 10;   // 0..20 (ball tracking responsiveness)
    bool dynamicDirector = true;   // broadcast-style cut-aways, reaction shots, replays
    bool handheldShake = true;     // touchline handheld feel on cut-aways
};

struct AudioSettings {
    int master = 100, stadiumCrowd = 80, commentary = 70, onPitchSfx = 85, paAnnouncer = 60,
        refereeMic = 50, music = 40, menuSfx = 60;
    DynamicRange dynamicRange = DynamicRange::Wide;
    bool spatialAudio = true;
    std::string commentaryLanguage = "en-GB";
};

struct AccessibilitySettings {
    AssistLevel groundPass = AssistLevel::SemiAssisted;
    AssistLevel throughPass = AssistLevel::SemiAssisted;
    AssistLevel lobPass = AssistLevel::SemiAssisted;
    AssistLevel crossing = AssistLevel::SemiAssisted;
    AssistLevel shooting = AssistLevel::SemiAssisted;
    bool inputOverlay = false;
    OverlayStyle overlayStyle = OverlayStyle::KeyboardDiagram;
    bool holdToToggle = false;      // converts holds (sprint, shield, jockey) into toggles
    ColorblindMode colorblind = ColorblindMode::Off;
    double indicatorScale = 1.0;
    bool subtitles = true;
    bool reduceFlashing = false;
    bool reduceCameraShake = false;
    bool menuNarration = false;
};

struct InputSettings {
    KeyBindings bindings = KeyBindings::defaults();
    InputTuning tuning{};
    bool cameraRelativeSkills = false;   // false = skill gestures relative to player facing
};

struct Settings {
    GraphicsSettings graphics;
    GameplaySettings gameplay;
    CameraSettings camera;
    AudioSettings audio;
    AccessibilitySettings accessibility;
    InputSettings input;

    Json toJson() const;
    /// Unknown/missing fields keep their defaults; out-of-range values are clamped and
    /// reported in warnings (shown in the "settings repaired" toast).
    static Settings fromJson(const Json& j, std::vector<std::string>* warnings = nullptr);
};

// ------------------------------------------------------------------------------------
// Apple Silicon presets and runtime governors
// ------------------------------------------------------------------------------------
struct AppleHardware {
    enum class ChipClass { Base, Pro, Max, Ultra };
    int generation = 1;              // M1 = 1, M2 = 2, M3 = 3, M4 = 4 ...
    ChipClass chipClass = ChipClass::Base;
    bool pluggedIn = true;
    bool proMotionDisplay = false;   // 120 Hz MacBook Pro panels
    bool lowPowerMode = false;
    int nativeWidth = 2560;
    int nativeHeight = 1664;

    /// Hardware-accelerated ray tracing arrived with the M3 GPU family; earlier chips run
    /// Metal ray tracing in compute (usable for tests, too slow for a 60 fps match).
    bool hasHardwareRayTracing() const { return generation >= 3; }
};

GraphicsSettings applePreset(const AppleHardware& hw);

/// Keeps frame time on target by steering render scale (PI controller), and reacts to the
/// macOS thermal state (0 nominal, 1 fair, 2 serious, 3 critical).
class DynamicResolutionController {
public:
    DynamicResolutionController(double minScale = 0.5, double maxScale = 1.0)
        : minScale_(minScale), maxScale_(maxScale), scale_(maxScale) {}

    struct Result {
        double renderScale;
        int recommendedFrameCap;   // 0 = keep the user's cap
    };
    Result update(double frameTimeMs, int targetFps, int thermalState, double dt);
    double scale() const { return scale_; }

private:
    double minScale_, maxScale_, scale_;
    double integral_ = 0.0;
};

}  // namespace kxi
