// KINETIC XI — macOS platform layer (Objective-C++)
// KXIKeyboardInput.mm : low-latency MacBook keyboard capture feeding the engine's
// IntentArbiter with hardware-timestamped key edges.
//
//  * Primary path: Apple GameController framework (GCKeyboard, macOS 11+). It reports every
//    key - including Left Control / Left Shift as distinct keys - as USB HID usages, so
//    left/right modifiers never get confused and multi-key rollover is preserved.
//  * Fallback path: an NSEvent local monitor. Modifier keys arrive as FlagsChanged events,
//    so we decode the device-dependent flag bits to know WHICH modifier moved.
//  * Key-down events are swallowed so AppKit never plays the "funk" error beep, and key
//    auto-repeat is discarded (the arbiter measures holds itself).
//  * missionControlConflicts() reads com.apple.symbolichotkeys to warn the player when
//    Control+Arrow is still owned by Mission Control / Spaces (the mandated Sprint chord).
//
// Build: add to an Xcode/CMake target with -fobjc-arc, link AppKit and GameController.
// NOTE: requires the macOS SDK — not compiled in the Linux CI container that produced the
// engine test results; it compiles against the same kxi/input.hpp API that the tests cover.

#import <AppKit/AppKit.h>
#import <GameController/GameController.h>
#import <QuartzCore/QuartzCore.h>

#include <mutex>
#include <string>
#include <vector>

#include "kxi/input.hpp"

namespace kxi::mac {

class KeyboardInput {
public:
    bool start();
    void stop();
    /// Called once per simulation tick on the game thread.
    std::vector<KeyEvent> drain();
    static std::vector<SystemConflict> missionControlConflicts();

private:
    void push(Key k, bool down, double timestamp);
    void attachGameControllerKeyboard(GCKeyboard* keyboard);

    std::mutex mutex_;
    std::vector<KeyEvent> queue_;
    std::array<bool, kKeyCount> down_{};
    id localMonitor_ = nil;
    id connectObserver_ = nil;
    bool gameControllerActive_ = false;
};

void KeyboardInput::push(Key k, bool down, double timestamp) {
    std::lock_guard<std::mutex> lock(mutex_);
    const auto i = static_cast<std::size_t>(k);
    if (down_[i] == down) return;   // auto-repeat or duplicate edge
    down_[i] = down;
    queue_.push_back({k, down, timestamp});
}

std::vector<KeyEvent> KeyboardInput::drain() {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<KeyEvent> out;
    out.swap(queue_);
    return out;
}

void KeyboardInput::attachGameControllerKeyboard(GCKeyboard* keyboard) {
    if (keyboard == nil || keyboard.keyboardInput == nil) return;
    gameControllerActive_ = true;
    KeyboardInput* owner = this;
    keyboard.keyboardInput.keyChangedHandler =
        ^(GCKeyboardInput* /*kb*/, GCControllerButtonInput* /*key*/, GCKeyCode keyCode, BOOL pressed) {
            // GCKeyCode values are USB HID usages (keyboard page 0x07).
            if (auto k = keyFromHidUsage(static_cast<std::uint16_t>(keyCode))) {
                owner->push(*k, pressed == YES, CACurrentMediaTime());
            }
        };
}

bool KeyboardInput::start() {
    // 1) GameController keyboard (coalesced = all physical keyboards merged).
    if (@available(macOS 11.0, *)) {
        attachGameControllerKeyboard(GCKeyboard.coalescedKeyboard);
        KeyboardInput* owner = this;
        connectObserver_ = [[NSNotificationCenter defaultCenter]
            addObserverForName:GCKeyboardDidConnectNotification
                        object:nil
                         queue:[NSOperationQueue mainQueue]
                    usingBlock:^(NSNotification* note) {
                        owner->attachGameControllerKeyboard((GCKeyboard*)note.object);
                    }];
    }

    // 2) NSEvent monitor: swallows key-downs (no system beep) and is the fallback source.
    KeyboardInput* owner = this;
    const NSEventMask mask = NSEventMaskKeyDown | NSEventMaskKeyUp | NSEventMaskFlagsChanged;
    localMonitor_ = [NSEvent addLocalMonitorForEventsMatchingMask:mask handler:^NSEvent*(NSEvent* e) {
        // Let Command shortcuts (Cmd+Q, Cmd+Tab...) reach the system untouched.
        if (e.type != NSEventTypeFlagsChanged && (e.modifierFlags & NSEventModifierFlagCommand)) return e;
        const auto key = keyFromMacVirtualKeyCode(e.keyCode);
        if (!owner->gameControllerActive_ && key) {
            if (e.type == NSEventTypeKeyDown && !e.isARepeat) owner->push(*key, true, e.timestamp);
            else if (e.type == NSEventTypeKeyUp) owner->push(*key, false, e.timestamp);
            else if (e.type == NSEventTypeFlagsChanged) {
                // Device-dependent modifier bits (IOKit/hidsystem/IOLLEvent.h NX_DEVICE*KEYMASK).
                const NSUInteger f = e.modifierFlags;
                bool down = false;
                switch (*key) {
                    case Key::LeftCtrl:     down = (f & 0x00000001) != 0; break;
                    case Key::LeftShift:    down = (f & 0x00000002) != 0; break;
                    case Key::RightShift:   down = (f & 0x00000004) != 0; break;
                    case Key::LeftCommand:  down = (f & 0x00000008) != 0; break;
                    case Key::RightCommand: down = (f & 0x00000010) != 0; break;
                    case Key::LeftOption:   down = (f & 0x00000020) != 0; break;
                    case Key::RightOption:  down = (f & 0x00000040) != 0; break;
                    case Key::RightCtrl:    down = (f & 0x00002000) != 0; break;
                    case Key::CapsLock:     down = (f & NSEventModifierFlagCapsLock) != 0; break;
                    case Key::Fn:           down = (f & NSEventModifierFlagFunction) != 0; break;
                    default: break;
                }
                owner->push(*key, down, e.timestamp);
            }
        }
        // Swallow gameplay key-downs/ups so AppKit doesn't beep or type into anything.
        return (e.type == NSEventTypeFlagsChanged) ? e : nil;
    }];
    return localMonitor_ != nil;
}

void KeyboardInput::stop() {
    if (localMonitor_) { [NSEvent removeMonitor:localMonitor_]; localMonitor_ = nil; }
    if (connectObserver_) { [[NSNotificationCenter defaultCenter] removeObserver:connectObserver_]; connectObserver_ = nil; }
    if (@available(macOS 11.0, *)) {
        GCKeyboard* kb = GCKeyboard.coalescedKeyboard;
        if (kb.keyboardInput) kb.keyboardInput.keyChangedHandler = nil;
    }
    gameControllerActive_ = false;
}

std::vector<SystemConflict> KeyboardInput::missionControlConflicts() {
    // AppleSymbolicHotKeys IDs: 32 Mission Control (Ctrl+Up), 33 Application windows
    // (Ctrl+Down), 79 Move left a space (Ctrl+Left), 81 Move right a space (Ctrl+Right).
    struct Entry { const char* id; const char* combo; const char* owner; };
    static const Entry entries[] = {
        {"32", "Control + Up", "Mission Control"},
        {"33", "Control + Down", "Application windows"},
        {"79", "Control + Left", "Move left a space"},
        {"81", "Control + Right", "Move right a space"},
    };
    std::vector<SystemConflict> out;
    CFPropertyListRef raw = CFPreferencesCopyAppValue(CFSTR("AppleSymbolicHotKeys"),
                                                      CFSTR("com.apple.symbolichotkeys"));
    NSDictionary* hotkeys = CFBridgingRelease(raw);
    for (const Entry& e : entries) {
        bool enabled = true;   // absent from the plist = system default = enabled
        NSDictionary* item = [hotkeys isKindOfClass:[NSDictionary class]] ? hotkeys[@(e.id)] : nil;
        if ([item isKindOfClass:[NSDictionary class]] && item[@"enabled"] != nil) enabled = [item[@"enabled"] boolValue];
        if (enabled) {
            out.push_back({e.combo, std::string("macOS ") + e.owner,
                           "System Settings > Keyboard > Keyboard Shortcuts... > Mission Control: untick it, "
                           "or rebind Sprint to Left Option in Controls > Keyboard."});
        }
    }
    return out;
}

}  // namespace kxi::mac
