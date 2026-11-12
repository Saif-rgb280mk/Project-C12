// KINETIC XI — Engine Core
// settings.cpp : field visitor (single source of truth), JSON save/load with clamping,
// slider curves, Apple Silicon presets and the dynamic-resolution governor.
#include "kxi/settings.hpp"

#include <cmath>
#include <type_traits>

namespace kxi {
namespace {

constexpr std::array<const char*, kSlotCount> kSlotIds{
    "up", "down", "left", "right", "sprint", "strafeSwitch", "passLob", "through",
    "shootTackle", "shieldJockey", "modifierContext"};

template <class T, class U>
constexpr bool is = std::is_same_v<std::remove_const_t<T>, U>;

// ---- The one and only field list ------------------------------------------------------
template <class V, class T>
void visit(V& v, T& t) {
    if constexpr (is<T, GraphicsSettings>) {
        v.integer("resolutionWidth", t.resolutionWidth, 640, 7680);
        v.integer("resolutionHeight", t.resolutionHeight, 360, 4320);
        v.real("renderScale", t.renderScale, 0.5, 2.0);
        v.enumeration("upscaler", t.upscaler, kUpscalerNames);
        v.flag("dynamicResolution", t.dynamicResolution);
        v.enumeration("frameRateCap", t.frameRateCap, kFrameCapNames);
        v.flag("vsync", t.vsync);
        v.enumeration("displayMode", t.displayMode, kDisplayModeNames);
        v.flag("rtReflections", t.rtReflections);
        v.flag("rtStadiumLighting", t.rtStadiumLighting);
        v.enumeration("rtQuality", t.rtQuality, kQualityNames);
        v.enumeration("grassDensity", t.grassDensity, kQualityNames);
        v.enumeration("crowdDetail", t.crowdDetail, kQualityNames);
        v.enumeration("weatherParticles", t.weatherParticles, kQualityNames);
        v.flag("motionBlur", t.motionBlur);
        v.real("motionBlurStrength", t.motionBlurStrength, 0.0, 1.0);
        v.enumeration("shadows", t.shadows, kQualityNames);
        v.enumeration("ambientOcclusion", t.ambientOcclusion, kQualityNames);
        v.enumeration("textureQuality", t.textureQuality, kQualityNames);
        v.enumeration("antiAliasing", t.antiAliasing, kAANames);
        v.real("sharpening", t.sharpening, 0.0, 1.0);
        v.flag("filmGrain", t.filmGrain);
        v.flag("lensDirt", t.lensDirt);
        v.flag("batteryAwareProfile", t.batteryAwareProfile);
        v.flag("lowPowerModeCap", t.lowPowerModeCap);
    } else if constexpr (is<T, GameplaySettings>) {
        v.slider("sprintSpeed", t.sprintSpeed);
        v.slider("acceleration", t.acceleration);
        v.slider("shotError", t.shotError);
        v.slider("passError", t.passError);
        v.slider("shotSpeed", t.shotSpeed);
        v.slider("passSpeed", t.passSpeed);
        v.slider("firstTouchControl", t.firstTouchControl);
        v.slider("goalkeeperAbility", t.goalkeeperAbility);
        v.slider("marking", t.marking);
        v.slider("runFrequency", t.runFrequency);
        v.slider("lineHeight", t.lineHeight);
        v.slider("lineLength", t.lineLength);
        v.slider("lineWidth", t.lineWidth);
        v.slider("fullbackPositioning", t.fullbackPositioning);
        v.slider("injuryFrequency", t.injuryFrequency);
        v.slider("injurySeverity", t.injurySeverity);
        v.integer("halfLengthMinutes", t.halfLengthMinutes, 2, 45);
        v.integer("gameSpeed", t.gameSpeed, 0, 100);
        v.flag("fatigueRealism", t.fatigueRealism);
    } else if constexpr (is<T, CameraSettings>) {
        v.enumeration("preset", t.preset, kCameraNames);
        v.integer("height", t.height, 0, 20);
        v.integer("zoom", t.zoom, 0, 20);
        v.integer("trackingSpeed", t.trackingSpeed, 0, 20);
        v.flag("dynamicDirector", t.dynamicDirector);
        v.flag("handheldShake", t.handheldShake);
    } else if constexpr (is<T, AudioSettings>) {
        v.integer("master", t.master, 0, 100);
        v.integer("stadiumCrowd", t.stadiumCrowd, 0, 100);
        v.integer("commentary", t.commentary, 0, 100);
        v.integer("onPitchSfx", t.onPitchSfx, 0, 100);
        v.integer("paAnnouncer", t.paAnnouncer, 0, 100);
        v.integer("refereeMic", t.refereeMic, 0, 100);
        v.integer("music", t.music, 0, 100);
        v.integer("menuSfx", t.menuSfx, 0, 100);
        v.enumeration("dynamicRange", t.dynamicRange, kDynamicRangeNames);
        v.flag("spatialAudio", t.spatialAudio);
        v.text("commentaryLanguage", t.commentaryLanguage);
    } else if constexpr (is<T, AccessibilitySettings>) {
        v.enumeration("groundPass", t.groundPass, kAssistNames);
        v.enumeration("throughPass", t.throughPass, kAssistNames);
        v.enumeration("lobPass", t.lobPass, kAssistNames);
        v.enumeration("crossing", t.crossing, kAssistNames);
        v.enumeration("shooting", t.shooting, kAssistNames);
        v.flag("inputOverlay", t.inputOverlay);
        v.enumeration("overlayStyle", t.overlayStyle, kOverlayNames);
        v.flag("holdToToggle", t.holdToToggle);
        v.enumeration("colorblind", t.colorblind, kColorblindNames);
        v.real("indicatorScale", t.indicatorScale, 0.5, 2.5);
        v.flag("subtitles", t.subtitles);
        v.flag("reduceFlashing", t.reduceFlashing);
        v.flag("reduceCameraShake", t.reduceCameraShake);
        v.flag("menuNarration", t.menuNarration);
    } else if constexpr (is<T, InputTuning>) {
        v.real("tapThreshold", t.tapThreshold, 0.08, 0.6);
        v.real("chordWindow", t.chordWindow, 0.05, 0.3);
        v.real("controlledSprintWindow", t.controlledSprintWindow, 0.0, 1.0);
        v.real("featherWindow", t.featherWindow, 0.1, 0.6);
        v.real("gestureWindow", t.gestureWindow, 0.2, 0.8);
        v.real("maxCharge", t.maxCharge, 0.5, 2.0);
        v.real("stopBallTapMax", t.stopBallTapMax, 0.08, 0.5);
        v.real("timingScale", t.timingScale, 0.75, 2.0);
        v.enumeration("sprintMode", t.sprintMode, kSprintModeNames);
        v.enumeration("precision", t.precision, kPrecisionNames);
    } else if constexpr (is<T, InputSettings>) {
        v.bindings("bindings", t.bindings);
        v.section("tuning", t.tuning);
        v.flag("cameraRelativeSkills", t.cameraRelativeSkills);
    } else if constexpr (is<T, Settings>) {
        v.section("graphics", t.graphics);
        v.section("gameplay", t.gameplay);
        v.section("camera", t.camera);
        v.section("audio", t.audio);
        v.section("accessibility", t.accessibility);
        v.section("input", t.input);
    }
}

// ---- Writer -------------------------------------------------------------------------------
struct Writer {
    Json obj = Json::object();
    void integer(const char* k, const int& v, int, int) { obj.set(k, Json::number(v)); }
    void real(const char* k, const double& v, double, double) { obj.set(k, Json::number(v)); }
    void flag(const char* k, const bool& v) { obj.set(k, Json::boolean(v)); }
    void text(const char* k, const std::string& v) { obj.set(k, Json::string(v)); }
    template <class E, std::size_t N>
    void enumeration(const char* k, const E& v, const std::array<const char*, N>& names) {
        obj.set(k, Json::string(names[static_cast<std::size_t>(v)]));
    }
    void slider(const char* k, const SliderPair& p) {
        Json o = Json::object();
        o.set("user", Json::number(p.user));
        o.set("cpu", Json::number(p.cpu));
        obj.set(k, std::move(o));
    }
    void bindings(const char* k, const KeyBindings& b) {
        Json o = Json::object();
        for (std::size_t i = 0; i < kSlotCount; ++i) o.set(kSlotIds[i], Json::string(keyName(b.keys[i])));
        obj.set(k, std::move(o));
    }
    template <class T>
    void section(const char* k, const T& t) {
        Writer sub;
        visit(sub, t);
        obj.set(k, std::move(sub.obj));
    }
};

// ---- Reader -------------------------------------------------------------------------------
struct Reader {
    const Json* obj;
    std::vector<std::string>* warnings;
    std::string path;

    const Json* field(const char* k) const { return obj ? obj->get(k) : nullptr; }
    void warn(const std::string& msg) const {
        if (warnings) warnings->push_back(msg);
    }
    void integer(const char* k, int& v, int lo, int hi) {
        const Json* j = field(k);
        if (!j) return;
        if (!j->isNumber()) { warn(path + k + ": expected a number"); return; }
        const double d = j->asNumber();
        const int c = clamp(static_cast<int>(std::lround(d)), lo, hi);
        if (static_cast<double>(c) != d) warn(path + k + ": clamped to " + std::to_string(c));
        v = c;
    }
    void real(const char* k, double& v, double lo, double hi) {
        const Json* j = field(k);
        if (!j) return;
        if (!j->isNumber()) { warn(path + k + ": expected a number"); return; }
        const double c = clamp(j->asNumber(), lo, hi);
        if (c != j->asNumber()) warn(path + k + ": clamped");
        v = c;
    }
    void flag(const char* k, bool& v) {
        const Json* j = field(k);
        if (!j) return;
        if (!j->isBool()) { warn(path + k + ": expected true/false"); return; }
        v = j->asBool();
    }
    void text(const char* k, std::string& v) {
        const Json* j = field(k);
        if (j && j->isString()) v = j->asString();
    }
    template <class E, std::size_t N>
    void enumeration(const char* k, E& v, const std::array<const char*, N>& names) {
        const Json* j = field(k);
        if (!j) return;
        if (j->isString()) {
            for (std::size_t i = 0; i < N; ++i)
                if (j->asString() == names[i]) { v = static_cast<E>(i); return; }
        }
        warn(path + k + ": unknown value, default kept");
    }
    void slider(const char* k, SliderPair& p) {
        const Json* j = field(k);
        if (!j || !j->isObject()) return;
        Reader sub{j, warnings, path + k + "."};
        sub.integer("user", p.user, 0, 100);
        sub.integer("cpu", p.cpu, 0, 100);
    }
    void bindings(const char* k, KeyBindings& b) {
        const Json* j = field(k);
        if (!j || !j->isObject()) return;
        KeyBindings candidate = b;
        for (std::size_t i = 0; i < kSlotCount; ++i) {
            const Json* e = j->get(kSlotIds[i]);
            if (!e || !e->isString()) continue;
            if (auto key = keyFromName(e->asString())) candidate.keys[i] = *key;
            else warn(path + k + "." + kSlotIds[i] + ": unknown key '" + e->asString() + "'");
        }
        if (candidate.isValid()) b = candidate;
        else warn(path + k + ": duplicate keys, default layout restored");
    }
    template <class T>
    void section(const char* k, T& t) {
        const Json* j = field(k);
        Reader sub{(j && j->isObject()) ? j : nullptr, warnings, path + k + "."};
        visit(sub, t);
    }
};

}  // namespace

// ---- GraphicsSettings helpers -------------------------------------------------------------
int GraphicsSettings::grassBladesPerSquareMetre() const {
    constexpr int kTable[] = {0, 1500, 4000, 9000, 18000};
    return kTable[static_cast<int>(grassDensity)];
}
int GraphicsSettings::crowdAgentCount() const {
    constexpr int kTable[] = {0, 8000, 20000, 45000, 80000};
    return kTable[static_cast<int>(crowdDetail)];
}
int GraphicsSettings::frameRateCapValue() const {
    constexpr int kTable[] = {30, 60, 120, 0};
    return kTable[static_cast<int>(frameRateCap)];
}

double GameplaySettings::multiplier(int slider, double atZero, double atHundred) {
    const double t = (clamp(slider, 0, 100) - 50) / 50.0;
    const double f = 0.15 * std::abs(t) + 0.85 * t * t;   // quadratic blend: fine control near 50
    return t >= 0.0 ? 1.0 + (atHundred - 1.0) * f : 1.0 + (atZero - 1.0) * f;
}

Json Settings::toJson() const {
    Writer w;
    visit(w, *this);
    Json root = std::move(w.obj);
    root.set("schemaVersion", Json::number(1));
    return root;
}

Settings Settings::fromJson(const Json& j, std::vector<std::string>* warnings) {
    Settings s;
    Reader r{j.isObject() ? &j : nullptr, warnings, ""};
    visit(r, s);
    return s;
}

// ---- Apple Silicon presets ----------------------------------------------------------------
GraphicsSettings applePreset(const AppleHardware& hw) {
    using C = AppleHardware::ChipClass;
    GraphicsSettings g;
    g.resolutionWidth = hw.nativeWidth;
    g.resolutionHeight = hw.nativeHeight;
    g.upscaler = Upscaler::MetalFXTemporal;
    g.dynamicResolution = true;
    g.displayMode = DisplayMode::Fullscreen;   // fullscreen also engages macOS Game Mode

    const bool rt = hw.hasHardwareRayTracing();
    switch (hw.chipClass) {
        case C::Base:
            g.renderScale = rt ? 0.70 : 0.67;
            g.frameRateCap = FrameRateCap::Fps60;
            g.grassDensity = Quality::Medium;
            g.crowdDetail = Quality::Medium;
            g.weatherParticles = Quality::Medium;
            g.shadows = Quality::Medium;
            g.ambientOcclusion = Quality::Low;
            g.rtReflections = rt;
            g.rtQuality = Quality::Low;
            break;
        case C::Pro:
            g.renderScale = 0.80;
            g.frameRateCap = hw.proMotionDisplay ? FrameRateCap::Fps120 : FrameRateCap::Fps60;
            g.grassDensity = Quality::High;
            g.crowdDetail = Quality::High;
            g.rtReflections = rt;
            g.rtStadiumLighting = rt;
            g.rtQuality = Quality::Medium;
            break;
        case C::Max:
        case C::Ultra:
            g.renderScale = rt ? 1.0 : 0.85;
            g.frameRateCap = hw.proMotionDisplay ? FrameRateCap::Fps120 : FrameRateCap::Fps60;
            g.grassDensity = Quality::Ultra;
            g.crowdDetail = Quality::Ultra;
            g.weatherParticles = Quality::Ultra;
            g.shadows = Quality::Ultra;
            g.ambientOcclusion = Quality::High;
            g.rtReflections = rt;
            g.rtStadiumLighting = rt;
            g.rtQuality = rt ? Quality::High : Quality::Low;
            break;
    }
    // On battery: protect the battery and the chassis temperature.
    if (!hw.pluggedIn) {
        g.frameRateCap = (hw.chipClass == C::Base) ? FrameRateCap::Fps30 : FrameRateCap::Fps60;
        g.rtReflections = false;
        g.rtStadiumLighting = false;
        g.renderScale = std::min(g.renderScale, 0.7);
        if (g.grassDensity > Quality::Medium) g.grassDensity = Quality::Medium;
    }
    if (hw.lowPowerMode) g.frameRateCap = FrameRateCap::Fps30;
    return g;
}

DynamicResolutionController::Result DynamicResolutionController::update(double frameTimeMs, int targetFps,
                                                                        int thermalState, double dt) {
    const double targetMs = 1000.0 / std::max(1, targetFps);
    const double error = (frameTimeMs - targetMs) / targetMs;   // > 0: too slow
    integral_ = clamp(integral_ + error * dt, -1.0, 1.0);
    scale_ -= (0.5 * error + 0.2 * integral_) * dt;

    double cap = maxScale_;
    int recommended = 0;
    if (thermalState >= 3) { cap = std::min(cap, 0.6); recommended = 30; }
    else if (thermalState == 2) { cap = std::min(cap, 0.75); recommended = 60; }
    scale_ = clamp(scale_, minScale_, cap);
    return {scale_, recommended};
}

}  // namespace kxi
