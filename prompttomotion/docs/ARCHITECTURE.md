# PromptToMotion: architecture and build guide

This document covers three things you asked for: the recommended tech stack, how prompts are handled, and how mock outputs work for testing.

## 1. What is in this folder

| Path | What it is |
|---|---|
| `index.html` | Landing page and studio (HTML + Tailwind classes). |
| `js/app.js` | The app: form, generators, player control, exports, history, loading and reveal transitions. |
| `js/fx.js` | Everything that makes the page itself move: entrance, particle hero, typing, tilt, glow, scroll reveals, the loading orb. See [ANIMATED_UI.md](ANIMATED_UI.md). |
| `js/runtime.js` | The player that runs **inside** a sandboxed iframe: clock, scrubbing, camera, lighting, motion blur, baked physics, MP4/GIF/Lottie exporters. |
| `js/scenes.js` | Example scenes and the offline **mock generator** (runner, dragon, castle, pine forest, UFO, cities, seas, weather and more). |
| `js/sound.js` | Procedural sound design (Web Audio), synced to the player clock. |
| `js/tailwind.config.js` | Tailwind config (colours point at CSS variables). |
| `css/app.css` | Colour tokens (light and dark), sliders, player and card styles. |
| `build.py` | Bundles everything into one HTML file. |

Run it by opening `index.html` in a browser (it needs internet for the Tailwind CDN and fonts). For a single-file build: `python3 prompttomotion/build.py`.

## 2. How generation works in this prototype

The key idea: **the model does not produce pixels or video. It writes a small program (a "scene") that draws each frame.**

```
prompt + options ──► generator ──► scene code ──► sandboxed iframe ──► player ──► export
                     (mock or                      (canvas, clock,      (play, pause,   (MP4, GIF,
                      Claude)                       self-test)           scrub, loop)    Lottie)
```

Why this design:

- **Sharp at any size and frame rate.** A scene is a function of time, so 24 fps, 60 fps or 4K are the same code.
- **Perfect scrubbing and looping.** `draw(ctx, t, info)` is a pure function of `t`, so any frame can be drawn on demand and the last frame can lead into the first.
- **Easy to edit.** "Make it night time" becomes "here is the code, change it like this", which models do well.
- **Cheap to test.** No GPU, no video model, and the mock generator needs no AI at all.

The trade-off: results look like polished motion graphics and illustrations, not photorealistic video. For photoreal footage you would add a video model as a second engine (see section 4).

### The scene contract

Generated code must define:

```js
function setup(W, H) { return state }               // optional, runs once
function simulate(state, dt, t, info) { /* physics step, mutates state */ }   // optional
function draw(ctx, t, info) { /* paint one frame */ }
// info = { W, H, duration, progress, frame, frames, fps, state, camera, light }
```

Rules the runtime enforces or the prompt requires: `draw` must be a pure function of `t` and `info.state`; per-object data is built in `setup` with `hash(i)`; the canvas is cleared before every call; motion completes whole cycles per loop. The runtime also seeds `Math.random` per frame so even sloppy code renders the same frame the same way every time.

### Detail controls: camera, lighting, motion blur, physics

These are applied by the runtime around the scene, so they work on every animation (mock, Claude or example) and change the preview instantly, with no new model call.

| Control | How it works |
|---|---|
| **Camera** (static, push in, pull out, pan left/right, orbit, crane, handheld, plus an intensity slider) | `cameraAt(progress)` returns `{ x, y, zoom, rot }`. The runtime applies it as a canvas transform before `draw`, with enough over-scan that edges never show. The same object is passed to the scene as `info.camera` so scenes can add parallax (`layer offset = info.camera.x * W * depth`). |
| **Lighting** (natural sunlight, cinematic, neon glow, golden hour, moonlit, studio soft, as drawn) | Two parts. `info.light` tells the scene where the light is (`dx, dy` point toward it), its colours and shadow colour, so scenes shade consistently. After the scene is drawn, `grade()` adds a bright-biased bloom, tints with blend modes (multiply, screen, soft-light), feathered light shafts, scanlines (neon), a vignette and letterbox bars (cinematic). |
| **Motion blur** (off, light, medium, heavy) | Temporal supersampling. Each output frame is drawn 1, 2, 3 or 4 times in the preview (1, 4, 8 or 12 times in exports) at times spread across a 180-degree shutter, and averaged with `globalAlpha = 1 / (k + 1)`. This is real blur from real motion, not a filter. If the preview can't keep up, it lowers its own sub-frame count and tells the user; exports stay full quality. |
| **Frame rate** (12, 24, 30, 60) | The clock is sampled only on frame boundaries, so 60 fps really is 60 distinct pictures a second. Changing it rebakes physics and updates the frame counter. Video export benchmarks a few frames first and picks a size and blur level that can be recorded in real time without dropping speed. |
| **Physics** (`simulate`) | The runtime calls `simulate` in fixed sub-steps once (4 per frame), stores a snapshot for every frame, and hands the right snapshot to `draw`. Because it is baked, scrubbing, looping, stepping and export all show the identical picture. Helpers: `PHYS.spring`, `PHYS.makeChain` and `PHYS.chain` (verlet rope, scarf, hair), `PHYS.ik2` (two-bone legs and arms). |
| **Scene detail** (standard, high, ultra) and **fluid character physics** | These shape the brief sent to Claude (layer counts, particles, shading, secondary motion, when to use `simulate`). They apply to the next generation. The mock generator's richer layers (three parallax city layers, haze, glitter, motes, the running character) are always on. |

### Safety

Scene code is untrusted, so it runs in `<iframe sandbox="allow-scripts">` with no `allow-same-origin`. It cannot read the page, cookies or storage, and it can only talk to the app through `postMessage`. On load the runtime draws four test frames off screen; if the scene throws, the app shows the error and (for Claude scenes) asks Claude to repair the code once, automatically.

### Foot contact, gait and smoothness

A character whose feet sink into the floor, slide, or snap looks broken, so the mock runner follows three rules and the tests measure them (`PTM_gait()` in `js/scenes.js` is the single source of the numbers, shared by the scene and the sound engine):

1. **The sole sits on the ground.** The ankle is placed at `groundY - soleThickness - 1 px`, and the shoe is drawn with a flat sole exactly `soleThickness` below the ankle. The earlier version pinned the ankle to the ground line and drew the shoe around it, which pushed the sole 8 to 11 px into the floor. A contact shadow under each shoe (fading as the foot lifts) and a puff of dust at every landing make the contact readable.
2. **The leg can reach every planted foot.** Hip height comes from `PHYS.hipHeight(l1, l2, stride, bob)`, so the hip-to-ankle distance never exceeds 98.5% of the leg length and the IK never has to clamp (before, the foot was asked for 113% of the leg length, locking the knee and floating or dragging the foot).
3. **A planted foot moves at the road's speed.** The road scrolls `D` pixels per loop, so the foot moves back at `D / duration`; stride and cadence are chosen so this also keeps the stride a natural length. The swing foot is a Hermite curve whose slope at lift-off and landing equals the road's, so it never stops or snaps (the old version teleported the foot by a full stride at lift-off). Background layers scroll at fixed fractions of the road speed, each with a period chosen so it repeats seamlessly, and `tile()` draws as many copies as the frame needs.

Smoothness comes from the runtime:

- **Smooth preview.** While playing, the preview is drawn at the screen's refresh rate at fractional times instead of only on frame boundaries, so a 24 fps clip does not stutter on a 60 Hz screen. Baked physics is blended between the two nearest frames (numbers and arrays are interpolated; a jump larger than 30% of the frame is treated as a respawn and not blended). Exports always use exact frame times. It can be switched off in Advanced, the choice is remembered, and if a computer can't keep up the preview falls back by itself.
- **Pre-rolled physics.** The simulation runs one whole loop first and keeps the second, with gust speeds that fit a whole number of times into the loop, so cloth and hair arrive at frame 0 already moving and the loop has no seam.
- **Rebuilt saves.** Saved offline-generated animations carry `mv` (`PTM_MOCK_VERSION`); when the generator improves, older ones are rebuilt from their prompts on load and their thumbnails redrawn, so fixes reach old saves.
- **Claude's scenes.** The brief now has `GROUND CONTACT` and `SMOOTHNESS` sections with the same rules (sole on the ground line, reachable legs, planted foot at ground speed, contact shadows, continuous speed between segments, `PHYS.hipHeight`).

### Steering, sound and the richer scenes

- **Drag to steer.** Dragging the picture moves the camera up to about 6% of the frame (`S.look`), zooms in slightly as you drag so edges never show, and springs back when you let go. It works while paused, it adds to whatever camera move is selected, and scenes receive it in `info.camera` so their parallax responds. It is never part of an export.
- **Sound** (`js/sound.js`). No audio files: everything is synthesised with the Web Audio API. An animation carries tags (from the mock generator's analysis of the prompt, or the `sound` list Claude returns: rain, wind, sea, fire, city, lightning, rocket, car, ufo, dragon, character, pines, birds, bubbles, confetti, hearts, neongrid, planets, snow). Tags become continuous beds (rain hiss, ocean swell, engine drones, a musical pad chosen from the sky's mood), random events (crickets, birds, bubbles, fire crackle, chimes, a synth arpeggio) and **events synced to the player clock**: a footstep on every foot-plant, thunder after each lightning flash, a whoosh on every wingbeat, a burst for each firework. Events only fire when the clock crosses a moment during playback, so scrubbing doesn't trigger them. Sound is off by default, starts only from a click, fades when paused, and is **not included in downloads**.
- **More scene subjects** in the mock generator. The dragon's flight path, wing flap and fire windows are closed-form functions of time; its tail is a simulated chain. Fire-breath particles are born at the mouth, so each particle's path is computed from where the head was when it was born. The castle's flags are cloth chains pinned to the spires. Pine forests sway in three parallax layers, and the UFO has a tractor beam with rising particles.

## 3. How prompts are handled

1. **Collect**: text (max 600 characters), plus `style`, `duration` (2–15 s), `aspect` (16:9, 9:16, 1:1) and `fps` (12, 24, 30, 60).
2. **Map options to constraints** (`ASPECTS` and `rulesFor()` in `app.js`): aspect becomes a pixel size (960×540, 540×960, 720×720); style becomes a paragraph of art direction; duration and fps are passed as numbers; camera, lighting and blur are named so the model doesn't redraw them; detail level and the physics switch pick the matching paragraphs.
3. **Build the brief** = fixed rules (the contract, helpers, safety rules, output format) + style paragraph + the user's words inside triple quotes so they can't be mistaken for instructions.
4. **Call the generator**. The reply must be one JSON object: `{ "title", "note", "sky", "sound", "code" }`.
5. **Validate**: parse JSON, check `code` is a non-empty string, run the self-test in the iframe.
6. **Repair once** if the scene crashes: send the code plus the exact error back and ask for a complete fixed version.
7. **Save**: keep the sound tags, render a thumbnail, store the take (prompt, params, code, thumbnail) in history.
8. **Edit later**: "Change this animation" sends the current code plus the change request and asks for the full new code, not a diff.

Options that change a finished take without another model call: duration, fps, camera, camera intensity, lighting and motion blur (sent to the running player with a `config` message), aspect ratio (player reloads at the new size), and Pixel Art (the runtime renders at 1/4 resolution).

## 4. Recommended tech stack for a production version

### Frontend
- **Next.js (React) + TypeScript** for routing, SSR of the landing page, and typed components. (This prototype is plain JS so it runs from a file.)
- **Tailwind CSS** compiled with the CLI or the framework plugin. Do not ship the Play CDN.
- **Zustand** (or React state) for the studio; **IndexedDB via Dexie** for history instead of `localStorage` (thumbnails and scene code can get large).
- **Canvas 2D** for the player, with **WebGL/three.js** available to scenes for the 3D style.

### Backend
- **Node.js (Fastify or NestJS)** or **Python (FastAPI)**. Endpoints:
  - `POST /api/generations` → `{ prompt, style, duration, aspect, fps }` returns `{ id, status: "queued" }`.
  - `GET /api/generations/:id` (or Server-Sent Events) → `queued | writing | validating | rendering | done | failed`, plus the result.
  - `POST /api/generations/:id/edits` → `{ instruction }` creates a new version.
  - `GET /api/exports/:id?format=mp4|gif|lottie`.
- **Postgres** for users, generations and versions; **Redis + BullMQ** (or Celery) for the job queue; **S3-compatible storage** for thumbnails and exports.
- **Auth**: Clerk, Auth0 or NextAuth. **Payments and quotas**: Stripe plus per-user rate limits (generation is the expensive step).

### AI models and APIs
- **Scene writer**: an LLM through the Claude API (Messages API, structured JSON output). Use a fast tier for drafts and a stronger tier for "Best" quality, exactly as the Detail control does here. Cache by hash of (prompt, options).
- **Prompt safety**: run the user text through a moderation step before generation and reject disallowed requests.
- **Optional photoreal engine**: a hosted video model (for example Runway, Luma or Veo) behind the same job API, chosen with a "Realistic video" style. Its output is an MP4 rather than a scene.
- **Optional image assets**: an image model for backgrounds and textures that scenes can load.

### Rendering and export on the server
Browser recording (used here) is fine for a prototype, but production should render server-side so exports don't need an open tab and always produce MP4:

- **Playwright/Puppeteer** loads the same scene in headless Chromium and steps `t` frame by frame, saving PNGs (deterministic because `draw` is pure).
- **FFmpeg** encodes MP4 (H.264), GIF (with `palettegen` and `paletteuse`) and WebM.
- **Lottie**: this prototype writes an image-sequence Lottie (valid, but raster). For real vector Lottie, have the model output a *scene graph* (shapes, transforms, keyframes as JSON) instead of code, then convert it with the Bodymovin schema or `lottie-web`. That needs a constrained vocabulary, so it suits the "2D Vector" style best.

### Ops
Vercel or Fly.io for the app, a separate worker pool for rendering, Sentry for errors, PostHog for analytics, and per-job timeouts (about 5 minutes) with cost caps.

## 5. Mock outputs for testing

Use **Generator → Mock (offline)** in the studio. No AI is called.

`PTM_mock(prompt, style)` in `js/scenes.js`:

1. **Analyse** (`PTM_analyze`): lowercases the prompt and matches keyword rules (`PTM_KEYWORDS`) to switch on layers (`stars`, `sea`, `boat`, `rain`, `lightning`, `fish`, `rocket`, `confetti`, `neongrid`, and so on). It also picks a sky palette (day, sunset, night, space, underwater) and pulls out quoted text like `"Happy Birthday"`.
2. **Compose**: writes a real scene (`setup` + `draw`) that draws the chosen layers back to front, following the same contract Claude's code follows.
3. **Style**: the style flag changes drawing (ink outlines for Anime and Frame-by-Frame, radial shading for 3D, 8 held drawings per second for Frame-by-Frame, 1/4-resolution rendering for Pixel Art).
4. **Fake the queue**: `generate()` waits a few hundred milliseconds between steps ("Reading your prompt", "Planning the scene", "Building layers", "Rendering the preview") so the progress UI, Stop button and error paths behave like the real thing.

Because the mock output goes through the same player, exporters and history as real output, it exercises the whole app. Try these prompts:

| Prompt | Layers you should see |
|---|---|
| `A pirate ship sailing through a storm at night with lightning` | stars, moon, clouds, sea, boat, rain, lightning |
| `Neon rain over a cyberpunk city` | clouds, city, rain, neon grid and sun, stars |
| `Fish swimming in an aquarium with bubbles` | underwater sky, fish, bubbles |
| `Confetti falling and the words "Happy Birthday"` | confetti and animated text |
| `Sunset over the ocean with birds` | sun, sea, birds |
| `A runner sprinting across city rooftops at sunset with a flowing scarf` | three parallax city layers, sun, the running character with a physics scarf and hair |
| `A dragon flying over snowy mountains breathing fire at night` | stars, moon, mountains, snow, the dragon with a simulated tail and fire breath |
| `A knight castle on a hill at sunset with waving flags` | sun, mountains, castle with cloth-simulated flags |
| `A UFO hovering over a quiet pine forest at night` | stars, moon, swaying pines, UFO with a tractor beam |

### Adding a keyword or layer
1. Add `["balloons", /\b(balloons?|party)\b/]` to `PTM_KEYWORDS`.
2. Add a `balloons(ctx, p, W, H)` function to the `L` object in `mockSceneTemplate` (everything must be a function of `p`, the 0–1 progress).
3. Add `"balloons"` to `ORDER` at the depth you want.

### Swapping the mock for a real backend
`generate()` in `app.js` has one branch per engine. To use your server, add a third branch that `POST`s to `/api/generations`, polls the job (calling `job.next()` as the status changes), and returns `{ title, note, code }`. Everything after that (preview, thumbnail, history, export) is unchanged.

## 6. Tests

The behaviours worth automating with Playwright: generate with Mock, change each parameter, scrub and step frames, export all three formats and check the files (GIF header and frame count, Lottie JSON keys, MP4 plays), reload and confirm history persists, and a scene that throws is reported instead of shown. For foot contact: evaluate the scene's `pose()` over a whole loop at several sizes and clip lengths and assert that the legs never exceed their reach, the planted ankle is at the ground-ankle height, the planted foot's speed equals the road speed and no foot jumps between samples; then render frames and assert that no shoe-coloured pixel is below the ground line. For smoothness: the loop seam (last frame to first) should differ by about as much as any two neighbouring frames, and a time halfway between two frames should render halfway between them. For the layout: at several screen widths (320 to 1360) every option of every segmented control must sit fully inside its control and the page must not scroll sideways. For the detail engine, compare screenshots (for example with `pngjs`): the same time seeked twice must be pixel-identical (proves physics is baked), each camera and lighting option must differ from "static" and "as drawn", and heavy motion blur must differ from none. For the animated UI, run once with Motion loaded and once without it (the Web Animations fallback), and once with `reducedMotion: "reduce"`.
