## E.1 Programming languages used

{{LANGUAGE_TABLE}}

**Why this mix?**

- **C++17** is the industry language for game engines. It is fast and deterministic, it compiles natively for Apple Silicon (arm64), and it is what Unreal and most in-house AAA engines use.
- **JavaScript** gives you something you can play *today* in Safari or Chrome with zero installation.
- **Objective-C++ and Swift** are how a native Mac game talks to macOS: keyboard capture, power and thermal state.
- **Metal Shading Language** is how a Mac game programs the GPU.
- **Python** builds this PDF.

## E.2 Libraries, frameworks and tools

| Tool / library | Version used | What it did here |
|---|---|---|
| GCC (g++) / Clang | 13.3 | compiled the C++17 engine with -Wall -Wextra -Wpedantic -Wshadow -Wconversion (zero warnings) |
| CMake | 3.x | cross-platform build of the engine library, tests and lab tool |
| C++ Standard Library | C++17 | vectors, arrays, optional, string_view, functional — no third-party C++ libraries at all |
| Node.js | 22 | ran the automated browser tests |
| Playwright + Chromium | preinstalled | headless browser: drove the prototype with real key presses and captured the screenshots |
| Web platform APIs | modern browsers | Canvas 2D (rendering), Web Audio (procedural crowd and SFX), Web Speech (commentary/PA), KeyboardEvent (input with timestamps), localStorage (settings) |
| Apple frameworks (macOS code) | macOS 11+ / 14+ | AppKit (NSEvent), GameController (GCKeyboard), QuartzCore, Foundation, IOKit (power source), Metal (GPU family, shaders) |
| Python 3 + ReportLab | 5.0 | generated this PDF (layout, tables, bookmarks, table of contents) |
| Pygments | 2.21 | syntax highlighting of every code listing |
| Pillow | 12 | converted screenshots for the PDF |
| Fonts | DejaVu Sans, JetBrains Mono | body text and code (both free/open licences) |
| Git | 2.x | version control; everything is committed to the project branch |

**Scientific sources** for the physics and AI are listed in Appendix B (aerodynamics of footballs, Magnus lift, knuckle balls, critical-power physiology, sprint mechanics, pitch control, expected threat, motion matching).

## E.3 What is implemented, what is written, what is designed

| Status | Items |
|---|---|
| **Implemented and tested in this environment** | C++ engine core: ball aerodynamics and contact, living pitch, locomotion, two-bone IK, fatigue/injury, MacBook input arbiter, JSON, settings + Apple presets + dynamic resolution, tactics (pitch control, threat, runs, defensive line, adaptive manager), camera rigs. **45 tests / 271 checks pass.** The playable prototype passes automated browser tests (dribbling, shooting, menus, weather, cameras, goals, half-time, full-match soak: 0 errors, 0 NaN). |
| **Written, needs a Mac to compile** | `KXIKeyboardInput.mm` (Objective-C++), `AppleSiliconGovernor.swift`, `GrassBlades.metal`. They use the same tested engine APIs, but the Linux build machine has no macOS SDK, so they were not compiled here. |
| **Designed (specification only)** | Full Metal renderer with MetalFX and ray tracing, motion-captured animation with motion matching and active ragdoll, learned neural policy, rollback netcode, PHASE spatial audio, replay director, Rollover Lab screen, career mode, cards/advantage/VAR. |

## E.4 How to run everything on your MacBook

**1. Play the prototype (no installation):** open the `prototype` folder and double-click `index.html` (Safari or Chrome). Click the page once, then press any key to kick off. Press Esc for every setting.

**2. Fix Control + Arrow keys first.** macOS uses Control + arrows for Mission Control, which steals the Sprint chord. Open System Settings → Keyboard → Keyboard Shortcuts… → Mission Control and untick "Mission Control", "Application windows", "Move left a space" and "Move right a space". Alternatively, rebind Sprint to Left Option in Esc → Controls.

**3. Build and run the engine tests** (Terminal):

```text
xcode-select --install          # Apple's compilers (once)
brew install cmake              # needs Homebrew (https://brew.sh)
cmake -S engine -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
./build/kxi_tests               # 45 tests, 271 checks
./build/kxi_lab                 # physics lab tables
```

**4. Run the browser tests (optional):**

```text
npm install playwright
npx playwright install chromium
node tools/prototype_tests.js test-output
```

**5. Rebuild this PDF (optional):**

```text
pip3 install reportlab pygments pillow
python3 tools/build_pdf.py
```

## E.5 Study guide — understand it well enough to explain it

Learn the project in this order. Each step names the file, the one idea to understand, and an experiment to try.

| Step | File | Key idea | Try this |
|---|---|---|---|
| 1 | `engine/include/kxi/math.hpp` | vectors (x, y, z), dot and cross products | work out by hand why cross(spin, velocity) points sideways |
| 2 | `engine/src/ball_physics.cpp` | force → acceleration → velocity → position (integration) | set knuckleStrength to 0 and re-run `kxi_lab`: the no-spin shots stop wobbling |
| 3 | `engine/src/surface.cpp` | a grid of cells with state that changes over time | change the rain rate in a test and watch puddles form |
| 4 | `engine/src/locomotion.cpp` | limits make movement feel real (friction circle) | lower the traction value and compare turning |
| 5 | `engine/src/input.cpp` | a state machine resolves one key into many actions | follow "S tap vs hold" through `onPress` / `onRelease` |
| 6 | `prototype/js/main.js` | the fixed-timestep game loop | change STEP to 1/30 and feel the difference |
| 7 | `prototype/js/camera.js` | 3D → 2D perspective projection (divide by depth) | change the Broadcast FOV from 32 to 60 |
| 8 | `prototype/js/ai.js` | utility scores + softmax choose actions | raise the shot bonus and watch the CPU shoot more |
| 9 | `engine/src/tactics.cpp` | pitch control: who arrives first wins | move a defender in the test and print the probability |
| 10 | `engine/tests/tests.cpp` | tests prove the claims | break a constant on purpose and watch a test fail |

**Self-check: you are ready when you can answer these without notes.**

1. Why does a ball with topspin dip? (Magnus force direction = spin × velocity.)
2. What is the drag crisis and at roughly what speed does it happen for a football?
3. Why does a wet pitch make a ground pass go further, but a puddle make it stop?
4. What does "no magnetism" mean, and how does the game dribble without it?
5. How does the arbiter tell a ground pass from a lob when both use S?
6. Why must input use timestamps instead of "is the key down this frame"?
7. Why does Control + Arrow need special handling on a Mac?
8. What is D' and why does a sprinter slow down after repeated sprints?
9. How does the CPU manager decide to double up on a flank, and why does it use hysteresis?
10. What is a fixed timestep, and why does determinism matter for replays and online play?
