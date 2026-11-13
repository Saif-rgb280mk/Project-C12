## B.1 What it is

KINETIC XI 3D is the playable, full-3D realisation of the blueprint. It runs in a web browser on a MacBook: double-click `game3d/index.html`. It is built on **Three.js r160 (WebGL 2)** loaded from the jsDelivr CDN.

The game reuses the tested simulation from the blueprint: ball aerodynamics, the living pitch, momentum-true players, fatigue, AI and the laws of the game. On top of it sits a new renderer, a new interface and your updated MacBook key layout. The 3D world appears behind the main menu as soon as the page loads.

## B.2 Architecture

| Layer | Files | Role |
|---|---|---|
| Simulation (120 Hz, shared design with the engine) | `game3d/js/sim/core.js, surface.js, ball.js, player.js, ai.js, match.js` | physics, living pitch, players, AI, laws, effect events for the renderer |
| Input | `game3d/js/sim/input.js` | MacBook capture (timestamps, `preventDefault`) + Context Intent Arbiter for the new layout |
| Settings | `game3d/js/sim/settings.js` | presets, live options, persistence |
| Renderer | `game3d/js/gfx/engine.js` | WebGLRenderer, ACES tone mapping, PCF soft shadows, post-processing |
| World | `environment.js, stadium.js, pitch.js, goals.js, humanoid.js, ball3d.js, weather.js, markers.js, camera.js` | sky/lights, stadium, turf, nets, players, ball, rain, at-feet HUD, cameras |
| Interface | `game3d/js/ui/menu.js, hud.js`, `game3d/css/style.css` | glassmorphism menus, scorebug, radar, FPS counter, stats panels |
| Boot and loop | `game3d/index.html`, `game3d/js/main.js` | CDN import map, fixed-timestep loop, FPS limiter, live settings |

## B.3 Rendering pipeline

- **Renderer:** WebGL 2, sRGB output and ACES Filmic tone mapping. Exposure is set per condition.
- **Shadows:** PCF soft shadow maps, with the map size chosen live (Off / 1024 / 2048 / 4096).
- **Post-processing chain:** RenderPass (half-float HDR target, optional **4x MSAA**) → **UnrealBloomPass** → **OutputPass** (tone mapping and sRGB) → optional **FXAA**. The anti-aliasing mode rebuilds the chain live. Bloom strength follows the lighting, so floodlit nights glow more than daylight.
- **PBR materials:**
  - `MeshStandardMaterial` for turf, lines, stadium, steel, kits, skin and boots.
  - `MeshPhysicalMaterial` with clearcoat for the ball, and glass for the dugouts.
  - A PMREM environment map baked per condition, either from the physical sky or from a floodlight rig, so metal and wet surfaces reflect the right light.
- **Lighting by condition:**

| Condition | Sky | Key light | Extras |
|---|---|---|---|
| Clear Day | Preetham physical sky (Sky shader) | shadow-casting sun, 52° | soft blue haze |
| Sunset | low warm sun, 4° | long shadows + floodlights at 32% | warm fog |
| Floodlit Night | star field | 4 corner floodlight SpotLights with real-time shadows | volumetric light shafts |
| Rain | dark | floodlights | rain streaks + splashes, wet glossy turf, thicker fog |

- **Volumetric lighting:** additive cone shaders from every floodlight cluster. Light fades with distance from the lamp, toward the cone silhouette, and near the camera.

## B.4 Procedural stadium architecture

- **Bowl:** every row follows a rounded-rectangle contour, so the bowl has continuous curved corners.
  - The **lower tier** has 22 rows: 0.82 m treads and 0.42 m risers, starting 7.5 m from the lines.
  - The **upper tier** has 18 steeper rows that overhang the lower tier, with a soffit and concourse wall.
  - Aisles run every 24 m. Seat colours come in sectors, using PBR vertex colours.
- **Roof:** a cantilevered roof sheet with **external steel trusses** (about 800 instanced members: chords, verticals and diagonals). An inner-edge catwalk truss carries around 200 floodlight lamps plus four 12-lamp corner clusters. All are emissive, so they bloom.
- **LED boards:** pitch-side boards on all four sides plus an LED ribbon round the upper-tier fascia. Canvas textures show fictional sponsors with an LED pixel grid, scroll continuously, and switch campaign every 8 seconds.
- **3D crowd:** up to **24,000 instanced spectators** (torso, shoulders and head) facing the pitch. Shirt and skin tones are per instance. A vertex shader makes them stand and jump with match danger, at zero CPU cost. Density runs from Low to Ultra (18% to 100% of seats).
- **Extras:** dugouts with glass canopies, an apron, and a synthetic run-off ring.

## B.5 Photoreal pitch, goals and ball

- **Turf:**
  - **Colour:** a 2048-px canvas with 20 mowing stripes, a cross-cut checker, 90,000 blade specks and worn goalmouths and centre circle.
  - **Detail:** a **procedural grass normal map**, a blade height field converted to normals with a Sobel filter, tiled about 50 × 33 times. This is the "High-Detail Normal Map" turf setting.
- **Pitch lines:** raised 3D geometry for every line, arc and spot.
- **Skid marks:** sliding tackles and wet bounces paint skid and splash marks into the turf texture live.
- **Rain response:** a wet pitch gets a darker albedo, lower roughness (0.42) and stronger reflections.
- **Goals:**
  - 12 cm painted-aluminium posts and crossbar, with a support frame.
  - **Verlet cloth nets:** a back-and-roof sheet plus two side sheets, with pinned edges, slack-net constraints and spring-back.
  - The ball pushes the mesh out of its way, and every goal adds an impulse ripple.
- **Ball:** a procedural paneled texture plus a seam normal map on a clearcoat physical material. Its orientation integrates the simulation's real angular velocity every frame, so curl, topspin dips and rolling are visible.

## B.6 Articulated players and animation

- **Skeleton:** root → hips → torso → neck/head (hair, ears, nose, eyes) and shoulders → elbows → hands, plus hips → knees → ankles → boots.
- **Sculpted body:** a V-shaped torso, tapered thighs and calves, made by vertex-shaping the capsule primitives.
- **Kits:** shirt, shorts and socks per club kit, canvas shirt numbers on the back, and keeper kits with long sleeves and gloves.
- **Animation:** procedural, computed from the simulation every frame and phase-locked to the simulation's foot plants:
  - Locomotion: run/sprint cycle (stride, knee flex, arm drive, forward lean, counter-rotation, vertical bob), banking into turns, idle breathing.
  - Ball actions: kicking (wind-up, strike, follow-through), headers (jump and nod).
  - Defending: sliding tackle, standing lunge, jockey stance.
  - Goalkeeping: ready stance, ball holding, diving saves (body roll and arms extended).
  - Other: throw-in, falls and stumbles, skill-move feints, arms-up goal celebrations.
- **Blending:** every joint is critically damped toward its target, so actions blend smoothly. Heads track the ball.

## B.7 Cameras and HUD

- **Cameras:**
  - **Menu fly-through:** a low sweep inside the bowl.
  - **Broadcast:** a touchline gantry that leads the ball with its velocity, widens when the ball is in the air and tightens near the box.
  - **Tele:** high gantry with a long lens.
  - **Goal celebration:** close tracking of the scorer.
  - Height, zoom and tracking-speed sliders shape them all, with critically damped motion and optional shake.
- **HUD:**
  - A minimalist **top-left scorebug** (kit colours, score, clock, half).
  - A **bottom-centre translucent radar**.
  - An **at-feet ring** showing stamina (D') and power while charging, plus a chevron under the pass target the assistance would pick.
  - Toasts, half-time and full-time statistics, and an always-on **FPS and frame-time counter**.

## B.8 Menu and settings (all live)

| Setting | Options | What actually changes |
|---|---|---|
| Quality preset | Low · Medium · High · Ultra (MacBook Pro) | all options below at once |
| FPS limiter / target | 30 · 60 · 120 · Uncapped | frame pacing in the main loop; "Uncapped" = every display refresh (120 Hz on ProMotion) |
| Render resolution scale | 50–150 % | renderer and composer pixel ratio (100% = one rendered pixel per screen point) |
| Shadow map quality | Off · 1024 · 2048 · 4096 px | shadow-map size; 2 floodlights cast shadows at 1024 px, all 4 at 2048 px and above |
| Anti-aliasing | Off · FXAA · MSAA 4x | rebuilds the post-processing chain |
| Floodlight bloom & volumetric lighting | On / Off | UnrealBloomPass + light-shaft cones |
| 3D crowd density | Low · Medium · High · Ultra | 4,320 / 9,600 / 16,320 / 24,000 animated spectators |
| Pitch turf detail | Standard · High-Detail normal map | turf normal map on/off |
| Match half length · AI difficulty · Sprint speed · Shot power · Pass assistance | sliders and selectors | the simulation (same slider curves as the engine) |
| Camera · height · zoom · tracking · shake | Broadcast/Tele + sliders | camera rig |
| Audio | master, crowd, commentary, SFX, PA | Web Audio buses + speech |

The **KICK OFF** tab picks the clubs (four fictional clubs), Home/Away/Third kits for each side, and the conditions (Clear Day, Sunset, Floodlit Night, Rain), all previewed live in the 3D stadium. Esc opens the pause version with RESUME, RESTART MATCH and QUIT TO MAIN MENU.

## B.9 The updated MacBook layout and how overlaps are resolved

| Key | Meanings | Rule |
|---|---|---|
| W | controlled sprint, shield, jockey, finesse/driven modifier | defending = jockey; in possession with no arrows, or with a defender within 2.6 m = shield; W + arrows in open space = controlled sprint; held with D = finesse, with S = driven pass (either order within 120 ms) |
| Left Shift | strafe dribble, skill move, change player, lobbed-through chord | defending = change player on press; with A = lobbed through; an arrow **tap** under 0.18 s while held = skill-move token (double taps make combos); held otherwise = strafe |
| S | ground pass, header, lob, cross, sliding tackle | defending = slide; tap < 0.2 s = ground pass; hold = lob / cross (in the crossing zone); aerial ball = header |
| A | through pass, rush keeper | defending = rush keeper (hold); otherwise through pass |
| D | shot, volley, header, standing tackle | defending = standing tackle; otherwise hold for power (power arc at the feet), with volley/header picked from the ball's height |
| Left Ctrl | sprint, stop ball | with arrows = sprint; tap without arrows = stop ball; hold = stand on the ball |

Every game key calls `preventDefault()`, so arrows and Space never scroll the page. ⌘ shortcuts are left to macOS, and keys are released on blur and on ⌘ (Mac browsers drop those key-ups).

## B.10 Performance guidance for MacBooks

| Mac | Suggested preset |
|---|---|
| MacBook Air (M1/M2/M3) | Medium, 60 FPS |
| MacBook Pro 14"/16" (M-Pro) | High, 60–120 FPS |
| MacBook Pro (M-Max) | Ultra (MacBook Pro), 120 FPS |

The counter in the corner shows the real frame rate and frame time. If it drops, lower the render scale first, then the shadow map size, then crowd density.

## B.11 Honest notes

- Everything is procedural (code-generated geometry, textures and animation). There are no motion-capture clips, scanned meshes or licensed assets; the blueprint's production plan adds those.
- The crowd uses Lambert lighting so 24,000 people stay fast. Everything else uses PBR materials.
- "Uncapped" means every display refresh. Browsers cannot present frames faster than the screen refreshes.
- Three.js is loaded from the CDN, so the first launch needs internet.
