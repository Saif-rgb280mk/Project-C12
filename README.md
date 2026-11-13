# KINETIC XI

## ▶ Play the 3D game

**Double-click `index.html` in this folder (or `game3d/index.html`).** It opens **KINETIC XI 3D**, the full 3D browser football game, in Chrome or Safari. The first launch needs internet to load Three.js.

The game includes:

- **Rendering:** Three.js r160 (WebGL 2) with PBR materials, real-time shadows, bloom, and FXAA or MSAA anti-aliasing.
- **Stadium:** procedural two-tier bowl with roof trusses, LED boards and a 24,000-strong animated 3D crowd.
- **Pitch and goals:** striped turf with a grass normal map, live skid marks and cloth goal nets that ripple.
- **Players and ball:** articulated 3D players (run, sprint, kick, slide, dive animations) and a paneled spinning ball.
- **Interface:** a glassmorphism main menu (Kick Off, Game Settings, Controls), with every graphics, FPS and gameplay option applied live.

Full details are in [`game3d/README.md`](game3d/README.md).

**Mac tip:** to use Control + Arrow keys for Sprint, go to System Settings → Keyboard → Keyboard Shortcuts… → Mission Control and untick "Mission Control", "Application windows", "Move left a space" and "Move right a space".

## Controls (MacBook)

| Action | Keys |
|---|---|
| Move · Sprint · Stop ball | Arrows · Left Ctrl + Arrows · Left Ctrl tap |
| Controlled sprint / Shield / Jockey | W (+ Arrows) |
| Strafe / Change player · Skill move | Left Shift · Left Shift + direction tap |
| Ground pass · Lob / Cross · Slide (defence) | S tap · S hold · S |
| Through pass / Rush GK · Lobbed through | A · Left Shift + A |
| Shoot (hold for power) / Standing tackle (defence) | D |
| Finesse shot · Driven pass | W + D · W + S |
| Pause / Settings | Esc |

## Everything else in this repository

| Folder | Contents |
|---|---|
| `game3d/` | **The 3D game** (HTML, CSS, JavaScript + Three.js, GLSL shaders) |
| `dist/` | `KINETIC_XI_Master_Blueprint_and_Source.pdf` (design document, all code, test results) and `KINETIC_XI_3D_Game.zip` |
| `docs/` | master design prompt and blueprint, test results, screenshots |
| `engine/` | C++17 physics/AI/input engine core with 45 unit tests (`cmake -S engine -B build && cmake --build build && ./build/kxi_tests`) |
| `platform/macos/` | Objective-C++, Swift and Metal files for a native Mac version |
| `tools/` | test runners and the PDF builder |
| `prototype/` | the **old 2D prototype** (superseded by `game3d/`; kept only for reference) |
