## 6. Pillar 2 — Complete MacBook Keyboard Control Scheme (mandatory)

**Reference code:** `engine/include/kxi/input.hpp`, `engine/src/input.cpp` (tested), `prototype/js/input.js` (same rules), `platform/macos/KXIKeyboardInput.mm`.

### 6.1 The mandated layout (exact)

| Action | Keys | Context / resolution |
|---|---|---|
| Movement | ↑ ← ↓ → | always; camera-relative |
| Sprint | Left Ctrl + Arrow Keys | ramps controlled → full after 240 ms |
| Controlled Sprint | D or Left Ctrl + Direction | D + Direction off the ball; Ctrl feathering on the ball |
| Stop Ball | Left Ctrl (no direction) | tap in possession; hold = stand on the ball |
| Strafe Dribble | Left Shift (no direction) | hold in possession; facing locked toward goal |
| Skill Moves | Modifier Key + Direction | gesture grammar (6.4) |
| Ground Pass / Header | S | tap (< 200 ms); header when the ball arrives above 1.3 m |
| Through Pass | A | hold for power |
| Lob Pass / Cross / Header | S (context-sensitive, tap vs hold) | hold ≥ 200 ms; Cross inside the crossing zone |
| Lobbed Through Pass | Left Shift + A | chord, either order within 110 ms |
| Driven Ground Pass | D + Modifier Key | when NOT (in range AND aiming at goal) |
| Shoot / Volley / Header | D | hold for power; volley/header from ball height |
| Finesse Shot | D + Modifier Key | when in range AND aim inside the goal cone |
| Protect Ball / Shield / Jockey | W (W + Arrows to jockey) | shield in possession; jockey when defending |
| Change Player | Left Shift | press, out of possession (arrows pick a direction) |
| Defending — Contain | Context Key (hold) | auto goal-side containment |
| Defending — Teammate Contain | D (hold) | nearest AI teammate presses aggressively |
| Defending — Sliding Tackle | S | press |
| Defending — Steal / Standing Tackle | D + combination | D pressed while W (jockey) or Context Key held |
| Defending — Rush Goalkeeper Out | A (hold) | keeper sprints at the ball carrier |

**Key definitions used to make the layout complete and unambiguous:**

- **Modifier Key = `E`** (alternative: Left Option ⌥). It is pressed by the left index finger without leaving the A/S/D/W home row.
- **Context Key = `E`** in the defending phase. Attack and defence never need it at the same time, so one physical key serves both roles.
- **"D + Combination" = D pressed while W or E is held.** It is the only defending use of D that is a press rather than a hold.

### 6.2 The Context Intent Arbiter

The arbiter turns raw key edges into intents using three inputs:

1. **The match phase**: InPossession, TeammatePossession, Defending, LooseBall, plus a *ball incoming* flag and the predicted ball height at contact.
2. **Hardware timestamps** on every key edge (event-sourced, so a 40 ms tap is classified identically at 30, 60 or 240 fps; this is unit-tested).
3. **Chord windows** (110 ms).

| Overloaded key | Meanings | Deterministic rule |
|---|---|---|
| D | shoot / volley / header, controlled sprint, teammate contain, tackle, finesse, driven pass | phase first; then E chord; then ball height; held with direction off the ball = controlled sprint |
| S | ground pass, lob, cross, header, sliding tackle | defending = slide on press; otherwise tap/hold at 200 ms; crossing zone → cross; aerial → header |
| Left Shift | strafe dribble, change player, lobbed-through chord | out of possession = change player on press; with A within 110 ms = lobbed through; held ≥ 110 ms in possession = strafe |
| Left Ctrl | sprint, controlled sprint, stop ball | with direction = sprint ramp; tap without direction = stop ball; held without direction = stand on the ball |
| E | skill modifier, finesse/driven modifier, Contain | defending = contain; with D = precision strike; with arrows = skill gesture |
| A | through pass, lobbed through, rush keeper | defending = rush keeper (hold); Shift held = lobbed |
| W | shield, jockey, tackle combination | possession = shield; defending = jockey; + D = standing tackle |

**Timing constants** (all scaled by the Accessibility "timing window scale" from 0.75 to 2.0): tap/hold 200 ms · chord 110 ms · controlled-sprint ramp 240 ms · feather window 300 ms · skill gesture spacing 380 ms · full power bar 1.0 s · stop-ball tap ≤ 200 ms.

**Safety rules:**

- Losing possession mid-charge cancels the charge, so you never "shoot" after being tackled.
- A strike is executed only if the ball is physically within reach. Otherwise it is buffered for 0.6 s and fires on the next touch (shown as "(buffered)" in the overlay).
- **Sprint modes:** Ramp (default), Instant Full, Always Controlled.
- **D + Modifier priority:** Context (default), Always Finesse, Always Driven.

### 6.3 Sprint ramp and feathering (analog-trigger emulation)

A keyboard has no analog trigger, so the arbiter emulates one. Ctrl + Direction starts as **Controlled Sprint** and becomes **Full Sprint** after 240 ms. Re-pressing Ctrl within 300 ms of releasing it ("feathering") keeps that press controlled. Off the ball, **D + Direction** is always controlled sprint, which matches the mandated "D or Left Ctrl + Direction".

### 6.4 Skill-move gesture grammar (E held; tokens relative to the player's facing)

| Gesture | Move | Gesture | Move |
|---|---|---|---|
| F | Knock-On (push and run) | F, F | Stepover Burst |
| L / R | Body Feint left / right | B | Drag-Back |
| B, B | Sole Roll | L, R / R, L | Roulette right / left |
| F, L / F, R | Inside Shift left / right | F, B | Heel Chop |

F/B/L/R are forward, back, left and right relative to the player's facing (camera-relative is an option). Two-token gestures fire on the second press. One-token gestures fire when the 380 ms window expires or E is released. Successful moves **wrong-foot** nearby defenders (a 0.35 s reaction delay scaled by dribbling), which is the physical reason skill moves work.

### 6.5 macOS integration and laptop-keyboard engineering

- **Capture:** Apple's GameController framework (`GCKeyboard.coalescedKeyboard`, macOS 11+). It reports every key, including Left Control and Left Shift as separate keys, as USB-HID usages (mapped by `kxi::keyFromHidUsage`).
- **Fallback:** an `NSEvent` local monitor. Modifiers arrive as `FlagsChanged`, decoded with the device-dependent bits (left Ctrl `0x0001`, left Shift `0x0002`, left Option `0x0020`, …). Gameplay key-downs are swallowed so macOS never plays the error beep; auto-repeat is discarded.
- **Mission Control conflict (critical):** macOS assigns **Control + Arrow keys** to Mission Control, App Exposé and switching Spaces. These shortcuts are consumed before the game sees them, which would break the mandated Sprint chord. The **Keyboard Doctor** reads `com.apple.symbolichotkeys` (IDs 32, 33, 79, 81). If they are enabled, it shows the fix: *System Settings → Keyboard → Keyboard Shortcuts… → Mission Control → untick them*. It also offers a one-click rebind of Sprint to Left Option.
- **Other system keys:** the game never binds Command (⌘Q/⌘W/⌘H/⌘M/⌘Tab), never binds Fn/Globe, and releases all keys on focus loss. Browsers on macOS drop key-ups for keys pressed while ⌘ is held, so the prototype releases all keys when ⌘ goes up.
- **Rollover Lab:** laptop keyboard matrices can ghost some combinations, so the game ships a test screen that asks the player to hold every chord the layout can demand (`kxi::requiredChords`). The worst case is five keys: Ctrl + ↑ + ← + E + D. If a chord ghosts on that keyboard, the lab suggests a rebind that avoids it.
- **Latency budget:** OS event → sim ≤ 8.3 ms (120 Hz tick) → render ≤ 16.7 ms (60 Hz) or 8.3 ms (ProMotion) → display. Target end-to-end latency is < 50 ms at 60 Hz and < 33 ms at 120 Hz.

### 6.6 Visual input overlay

The overlay shows a live keyboard diagram (W E / A S D / Shift / Ctrl / arrows lighting up), the current phase, the interpreted intent (CONTROLLED SPRINT, JOCKEY, CONTAIN, FINESSE SHOT 64%…) and the last fired command. It is used for learning, streaming and accessibility.

## 7. Pillar 3 — Comprehensive AAA Settings and Customization Suite

**Reference code:** `engine/include/kxi/settings.hpp`, `engine/src/settings.cpp` (single visitor list → JSON save/load, clamping and warnings), `config/*.json`, `prototype/js/settings.js` (menu generated from one schema).

### 7.1 Graphics and performance

| Setting | Range / options | Default | Notes |
|---|---|---|---|
| Resolution | any; native panel by default | 2560×1664 (MacBook Air 13") | |
| Render scale | 50–200% | 80% | internal resolution before upscaling |
| Upscaler | Off / MetalFX Spatial / MetalFX Temporal | Temporal | Apple Silicon |
| Dynamic resolution | on/off | on | PI controller on frame time (tested) |
| Frame-rate cap | 30 / 60 / 120 / Uncapped | 60 | 120 on ProMotion displays |
| V-Sync | on/off | on | |
| Display mode | Fullscreen / Borderless / Windowed | Fullscreen | fullscreen engages macOS Game Mode |
| Ray-traced reflections | on/off | preset | puddles, wet kits, glass |
| Ray-traced stadium lighting | on/off | preset | floodlight GI, contact shadows |
| RT quality | Low–Ultra | Medium | |
| Grass / turf 3D blade density | Off · 1.5k · 4k · 9k · 18k blades/m² | High (9k) | Metal instanced blades (GrassBlades.metal) |
| Crowd detail | Off · 8k · 20k · 45k · 80k agents | High | impostors at distance |
| Dynamic weather particles | Off–Ultra | High | rain streaks, splashes, mist, lightning |
| Motion blur | on/off + strength 0–1 | on, 0.5 | |
| Shadows / AO / textures | Off–Ultra | High / Medium / High | |
| Anti-aliasing | Off / FXAA / TAA | TAA | |
| Sharpening, film grain, lens dirt | sliders / toggles | 0.35 / on / on | |
| Battery-aware profile | on/off | on | switches profile when unplugged |
| Honour Low Power Mode | on/off | on | 30 fps cap |

#### Apple Silicon presets (Metal)

| Mac | Render scale | Cap | Ray tracing | Grass | Crowd |
|---|---|---|---|---|---|
| M1/M2 base (Air) | 67% | 60 (30 on battery) | off (no hardware RT) | Medium | Medium |
| M1/M2 Pro | 80% | 120 with ProMotion | off | High | High |
| M1/M2 Max/Ultra | 85% | 120 with ProMotion | off by default | Ultra | Ultra |
| M3+ base | 70% | 60 | reflections, Low | Medium | Medium |
| M3+ Pro | 80% | 120 with ProMotion | reflections + lighting, Medium | High | High |
| M3+ Max/Ultra | 100% | 120 with ProMotion | reflections + lighting, High | Ultra | Ultra |

Hardware-accelerated ray tracing arrived with the M3 GPU family (Metal GPU family Apple 9), so the presets enable RT only there. Earlier chips run Metal ray tracing in compute, which is fine for photo mode but not for a 60 fps match. The **governor** (`AppleSiliconGovernor.swift`) observes the thermal state, Low Power Mode and the power source. It caps frame rate (thermal *serious* → 60, *critical* or Low Power → 30) and limits the dynamic-resolution ceiling (0.75 / 0.6).

### 7.2 Gameplay and simulation sliders (separate User and CPU values)

Every slider runs 0–100 with 50 = realistic, mapped by a quadratic blend (`f = 0.15|t| + 0.85t²`, t = (v − 50)/50) so the middle range is fine-grained.

| Slider | 0 → | 100 → | Physical parameter scaled |
|---|---|---|---|
| Sprint Speed | ×0.8 | ×1.2 | athlete top speed |
| Acceleration | ×0.7 | ×1.3 | force–velocity a0 |
| Shot Error | ×0.25 | ×2.5 | launch yaw/pitch sigma |
| Pass Error | ×0.25 | ×2.5 | pass launch sigma |
| Shot Speed | ×0.8 | ×1.2 | strike speed |
| Pass Speed | ×0.8 | ×1.2 | pass speed |
| First Touch Control | ×0.3 | ×2.2 | receiving-touch error (higher = heavier touches) |
| Goalkeeper Ability | ×0.6 | ×1.35 | keeper reach, reaction and handling |
| Marking | ×0.5 | ×1.5 | goal-side marking tightness |
| Run Frequency | ×0.3 | ×2.0 | off-ball run willingness |
| Line Height / Length / Width | 18–45 m / 9–18 m / 28–44 m | | defensive-line geometry |
| Full-back Positioning | | | full-back starting depth |
| Injury Frequency | ×0 | ×3 | hazard multiplier |
| Injury Severity | | | time-loss distribution |

Also included: half length (2–45 minutes), game speed, difficulty, and a fatigue-realism toggle.

### 7.3 Camera

| Preset | Height | Distance | FOV | Character |
|---|---|---|---|---|
| Broadcast | 16 m | 30 m back from touchline | 32° | gantry, leads play |
| Tele | 28 m | 58 m | 20° | long lens, tactical, flattened |
| Co-op | 24 m | 40 m | 40° | wide, steadier (×1.4 smoothing) |
| Pro | 3.2 m | 8 m behind player | 60° | eye-line, yaw follows attack direction |
| Custom | 6 + 1.7·h m | 20 + 2.5·z m | 35° | sliders are absolute |

The **Height** and **Zoom** sliders (0–20) scale the preset by 0.6–1.4. **Ball Tracking Speed** (0–20) maps exponentially to a spring smooth-time from 1.2 s (lazy) to 0.08 s (snappy). Other options: handheld shake and the dynamic director (cut-aways and replays).

### 7.4 Audio

The mix busses are Master, **Stadium Crowd**, **Commentary**, **On-Pitch Ball / Kick SFX**, **PA Announcer**, Referee Mic, Music and Menu SFX (each 0–100). Dynamic range has three modes (Night / Standard / Wide), plus spatial audio (PHASE / headphones) and the commentary language. The crowd bus reacts to expected threat; the SFX bus carries kicks keyed to impulse, bounces keyed to impact speed and wetness, woodwork and net.

### 7.5 Accessibility and input

| Feature | Options |
|---|---|
| Passing assistance | Assisted (auto target + auto power) / Semi-assisted (auto target, your power: under- and over-hit possible) / Manual (exact direction and power) — set separately for ground, through, lob and cross |
| Shooting assistance | Assisted (auto far corner) / Semi (arrow picks the side) / Manual (exact aim ray, can miss wide) |
| Full key remapping | click-to-rebind every slot; duplicates are swapped, never left unbound; one-click restore of the mandated layout; Keyboard Doctor warnings |
| Visual input overlay | Minimal / Full / Keyboard diagram |
| Timing window scale | 0.75–2.0 × every tap/hold/chord window |
| Hold-to-toggle | converts holds (sprint, shield, jockey) into toggles |
| Visibility | colour-blind modes, player indicator size 0.5–2.5×, subtitles |
| Comfort | reduce flashing (disables lightning), reduce camera shake, menu narration |

### 7.6 Persistence and validation

Settings are saved as human-readable JSON (`config/settings.default.json` is generated by the engine itself). Loading never fails. Unknown fields are ignored, out-of-range values are clamped with a warning ("settings repaired" toast), unknown enum values keep their defaults, and duplicate key bindings restore the mandated layout. All of this is unit-tested.

## 8. Technical Blueprint

### 8.1 Repository structure

```text
engine/        C++17 core: include/kxi/*.hpp, src/*.cpp, tests/tests.cpp, tools/physics_lab.cpp, CMakeLists.txt
platform/macos KXIKeyboardInput.mm (Objective-C++), AppleSiliconGovernor.swift, GrassBlades.metal
config/        settings.default.json, keybindings.default.json, Apple preset example (generated by the engine)
prototype/     index.html, style.css, js/*.js — playable browser vertical slice (no install)
docs/          this document, lab_results.txt, test_results.txt
tools/         build_pdf.py — builds the complete PDF (document + all code + results)
```

### 8.2 Build and test

- **Engine:** `cmake -S engine -B build && cmake --build build && ./build/kxi_tests` (45 tests, 271 checks) and `./build/kxi_lab`.
- **Mac app:** an Xcode project links `kxi_core`, adds the Objective-C++/Swift files and compiles `.metal` shaders into the default library. CI builds an arm64 slice (add x86_64 for a universal binary).
- **Prototype:** open `prototype/index.html` in Safari or Chrome. Automated browser tests drive it with Playwright (soak test: full matches with random inputs; zero errors, zero NaN).

### 8.3 Frame budget targets (planning estimates: 60 fps on M2 base, 120 fps on M3 Pro)

| Stage | M2 base (16.7 ms) | M3 Pro (8.3 ms) |
|---|---|---|
| Simulation (2 ticks @ 120 Hz incl. AI) | 1.6 ms | 0.9 ms |
| Animation (motion matching + IK, 22 players) | 1.4 ms | 0.8 ms |
| Render submission (CPU) | 2.0 ms | 1.2 ms |
| GPU: G-buffer, grass, crowd impostors | 7.5 ms | 3.4 ms |
| GPU: lighting, RT (M3), post, MetalFX | 3.5 ms | 2.4 ms |
| Audio (separate thread) | — | — |

### 8.4 Online, data and services

- **Netcode:** deterministic lockstep with rollback (input delay 2, max rollback 8 frames at 120 Hz); desync detection with a per-second state hash.
- **Replays:** input streams of about 10 KB per match. Ratings data is versioned JSON with live updates.
- **Telemetry:** ball-snap detector (must stay at zero), input latency, frame time, and adaptive-manager events.
- **Localisation:** commentary is per language, and all UI strings are external.

## 9. Production Roadmap

| Phase | Length | Exit criteria |
|---|---|---|
| Pre-production | 3 months | engine core + tests (done in this repo); playable prototype (done) |
| Vertical slice | 6 months | Metal renderer, mocap-driven animation with IK, one stadium, full presentation |
| Alpha | 6 months | 20 fictional clubs, career mode skeleton, online beta, Rollover Lab |
| Beta | 4 months | performance targets met on every Apple Silicon tier; accessibility audit |
| Launch + live | ongoing | weekly ratings, seasonal content, new stadium acoustics |

**Team (vertical slice):** 2 physics/simulation, 2 AI/ML, 3 graphics (Metal), 2 animation tech, 2 gameplay, 1 audio tech, 2 sound designers, 2 UI/UX, 3 QA, 1 producer.

**Key risks and mitigations:**

- **Physics-first feel is harder to learn:** strong assists and the input overlay.
- **Laptop keyboard ghosting:** Rollover Lab and alternative bindings.
- **Mission Control conflict:** Keyboard Doctor plus a one-click Left Option rebind.
- **Thermal throttling on fanless Airs:** governor + dynamic resolution.
- **ML policy exploits:** keep the utility guard-rails and a self-play exploit penalty.

## Appendix A — Glossary

- **D' (D-prime):** metres of running above critical speed a player can afford before fading.
- **Drag crisis:** a sudden drop in air drag when the boundary layer becomes turbulent (around 16 m/s for a football).
- **Magnus effect:** a sideways force on a spinning ball (curl, dip, float).
- **Knuckle ball:** an almost spinless strike near the drag crisis that wobbles unpredictably.
- **Pitch control:** the probability that a team reaches a location first.
- **Expected threat (xT):** the value of having the ball at a location.
- **IK (inverse kinematics):** solving joint angles from where a foot must be.
- **Friction circle:** the maximum combined acceleration studs can transmit.
- **Event-sourced input:** key edges are processed with their own timestamps, independent of frame rate.

## Appendix B — Scientific references

- IFAB, *Laws of the Game*, Law 2 (the ball).
- Goff, J. E. & Carré, M. J. (2009). Trajectory analysis of a soccer ball. *American Journal of Physics* 77(11).
- Asai, T., Seo, K., Kobayashi, O. & Sakashita, R. (2007). Fundamental aerodynamics of the soccer ball. *Sports Engineering* 10.
- Hong, S., Chung, C., Nakayama, M. & Asai, T. (2010). Unsteady aerodynamic force on a knuckleball in soccer. *Procedia Engineering* 2.
- Sawicki, G. S., Hubbard, M. & Stronge, W. J. (2003). How to hit home runs: optimum baseball bat swing parameters for maximum range trajectories. *American Journal of Physics* 71 (lift-coefficient fit).
- Skiba, P. F. et al. (2012). Modeling the expenditure and reconstitution of work capacity above critical power. *Medicine & Science in Sports & Exercise*.
- Samozino, P. et al. (2016). A simple method for measuring power, force, velocity properties, and mechanical effectiveness in sprint running. *Scandinavian Journal of Medicine & Science in Sports*.
- Spearman, W. (2018). Beyond Expected Goals. *MIT Sloan Sports Analytics Conference*.
- Singh, K. (2018). Introducing Expected Threat (xT).
- Clavet, S. (2016). Motion Matching and the Road to Next-Gen Animation. *GDC*.
- Holden, D., Komura, T. & Saito, J. (2017). Phase-Functioned Neural Networks for Character Control. *SIGGRAPH*.
- Peng, X. B. et al. (2018). DeepMimic: Example-Guided Deep Reinforcement Learning of Physics-Based Character Skills. *SIGGRAPH*.

## Appendix C — Originality statement

KINETIC XI uses only original names, clubs, players, presentation, UI, audio and code. References to "the current annual AAA football simulation" are made solely to set measurable benchmark targets. No third-party trademarks, logos, assets, menus or modes are used or reproduced.
