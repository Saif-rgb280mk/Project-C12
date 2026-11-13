# KINETIC XI 3D — browser football game

A complete, playable 3D football game built with **Three.js r160 (WebGL 2)**:

- **Rendering:** PBR materials, real-time shadows, bloom with volumetric light shafts, and MSAA/FXAA anti-aliasing.
- **World:** a procedural multi-tier stadium with roof trusses, LED boards and a 24,000-strong animated 3D crowd, plus cloth-simulated goal nets.
- **Players and ball:** articulated 3D players with procedural animation, and a paneled ball with real spin physics.
- **Interface:** a dark glassmorphism main menu whose settings all work live.

## Play it on your MacBook

1. Open this `game3d` folder and **double-click `index.html`**. Safari or Chrome both work; Chrome is recommended for the best WebGL performance.
2. The 3D stadium renders straight away behind the menu. Pick clubs, kits and conditions, then press **PLAY MATCH**.
3. Press **S** to kick off. **Esc** pauses and opens every setting.

Three.js is loaded from the jsDelivr CDN, so the first launch needs an internet connection.

If your browser blocks pages opened from Finder, serve the folder locally instead:

```bash
cd game3d
```

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

**Important on a Mac:** macOS uses Control + Arrow keys for Mission Control and Spaces. To use them for Sprint, go to System Settings → Keyboard → Keyboard Shortcuts… → Mission Control and untick "Mission Control", "Application windows", "Move left a space" and "Move right a space".

## Controls (MacBook keyboard)

| Action | Keys |
|---|---|
| Move | ↑ ← ↓ → |
| Sprint | Left Ctrl + Arrows |
| Stop ball | Left Ctrl (tap, no arrows) |
| Controlled sprint / Shield / Jockey | W (+ Arrows) |
| Strafe dribble / Change player (defence) | Left Shift |
| Skill move | Left Shift + direction tap |
| Ground pass / Header | S (tap) |
| Lob / Cross / Sliding tackle (defence) | S (hold) / S |
| Through pass / Rush GK (defence) | A |
| Lobbed through pass | Left Shift + A |
| Shoot / Volley / Header / Standing tackle (defence) | D (hold for power) |
| Finesse shot / Driven pass | W + D / W + S |
| Pause / Settings | Esc |

## Settings (all live)

- **Graphics:** quality preset (Low · Medium · High · Ultra (MacBook Pro)), FPS target (30 · 60 · 120 · Uncapped), render scale 50–150%, shadow map (Off · 1024 · 2048 · 4096 px), anti-aliasing (Off · FXAA · MSAA 4x), floodlight bloom & volumetric lighting, 3D crowd density (Low → Ultra) and turf detail (Standard · High-Detail normal map). An FPS and frame-time counter sits in the corner.
- **Gameplay:** half length, AI difficulty (Amateur → Legendary), sprint speed, shot power and pass assistance.
- **Camera:** Broadcast or Tele, height, zoom, tracking speed and shake.
- **Audio:** master, crowd, commentary, SFX and PA.

## Tests

```bash
node tools/game3d_sim_tests.js
```

```bash
node tools/game3d_browser_tests.js out
```

The simulation tests check the controls, every club/kit/condition combination and full matches. The browser tests (Playwright) check boot, menus, play, shooting, goals, pause and live graphics presets. If you're offline, pass the path to a local `three@0.160.0` package as a second argument to the browser tests.
