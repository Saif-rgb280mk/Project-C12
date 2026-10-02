# The animated website: how it works

Everything that moves on the page (not inside the animation itself) lives in `js/fx.js` and `css/app.css`. The app logic in `js/app.js` only asks for effects through `window.PTM_FX`, so you can restyle the motion without touching generation.

## Libraries

- **Tailwind CSS** for layout and spacing. Colours are CSS variables (`css/app.css`) mapped into Tailwind by `js/tailwind.config.js`, so light and dark themes are one file.
- **Motion** (`motion@11`, the vanilla engine from the Framer Motion team, loaded from jsDelivr) for element animation.
- **No hard dependency on Motion.** `play()` in `fx.js` calls `Motion.animate` when it exists and falls back to the Web Animations API when it doesn't, with the same keyframe format. Both paths are tested.
- **Canvas 2D** for the particle backgrounds and the loading orb.
- Everything respects `prefers-reduced-motion`: the entrance is skipped, infinite CSS animations stop, and canvases draw one still frame.

## One call for every animation

```js
// keyframes are [from, to] (or more); x, y are px; filter and clipPath are strings
PTM_FX.play(el, { opacity: [0, 1], y: [30, 0], filter: ["blur(12px)", "blur(0px)"] }, { duration: 0.8, delay: 0.1, ease: "out" });
PTM_FX.stagger(elements, keyframes, { step: 0.07 });
```

`play()` holds the first frame during the delay (so nothing flashes), then clears its inline styles when finished unless you pass `keep: true`.

## Entrance (the first 2 seconds)

1. `#intro` is a full-screen dark overlay that is in the HTML from the first paint, so the page never flashes unstyled.
2. `runIntro()` in `fx.js` draws 170 glowing particles on `#introCanvas`. They spiral in from the edges and settle into a ring while the SVG logo draws itself with CSS `stroke-dashoffset` (the shapes use `pathLength="1"`), the three words of the name fade and blur in, and a progress bar counts to 100%.
3. At 1.85 s the particles burst outward, an **iris** (`clip-path: circle(150%)` to `circle(0%)`) closes over the overlay, and `heroEntrance()` starts: the headline letters (split into spans by `splitHeadline()`) rise in with a blur and a stagger, then each `[data-anim]` block follows.
4. Click, Enter, Space, Escape or the Skip button jump to the reveal. Failsafes: a CSS-only rule removes the overlay after 7 s if scripts fail, and hero content shows itself after 7.5 s.

## Design rule: show what matters, fold the rest

The page is deliberately quiet. The landing page is a hero and one short row of four features. The studio shows only what most people need (the prompt, a style, length, shape, frame rate, Generate, and the preview with its playback and download controls). Everything else (camera, lighting, blur, detail, physics, smooth preview, the generator choice, scene code) sits in one **Advanced** fold in the controls card. Its closed header shows a one-line summary of the current look ("Golden hour · Handheld · Medium blur"), so nothing is hidden from view without a clue.

The motion follows the same rule: effects appear when you act (focus, hover, generate), not all the time. The prompt boxes have a plain border that becomes a moving gradient only while you type; buttons glow under the pointer; the only things that move on their own are the hero mesh (faint, and masked away from the headline), the live preview, and the small demos in the features row.

## Interactive hero

- `heroMesh()` fills `#heroCanvas` with 16 to 52 drifting particles (scaled to the area), links any two within 130 px with faint lines, and draws a perspective wave-grid floor. A CSS mask fades the canvas out on the left so the headline stays clean. The pointer attracts nearby particles; a click or tap sends out a ring pulse. It pauses when off screen or when the tab is hidden.
- The hero preview card tilts a few degrees toward the pointer (`.tilt`).
- The headline's second line has a slow colour shimmer that runs through each letter.

## The hero is a live demo

The preview card in the hero does not play a canned video. `heroShow()` in `app.js` runs the real engine: as each example prompt finishes typing in the hero input, the preview blurs, the orb appears with the prompt typed into it, the mock generator builds a scene for that prompt (each with its own style, lighting and camera), and the iris opens onto the result. Then the next prompt starts typing. The same `irisReveal()` function finishes both this and the studio's transition. It pauses while the hero is off screen or the tab is hidden, and it is skipped under reduced motion.

## Micro-interactions

| Effect | Where | How |
|---|---|---|
| Typing effect on example prompts | Hero input and studio prompt (a "Surprise me" link also fills in an idea) | `typer()` types, holds, erases and moves to the next idea in an overlay span with a blinking caret. It hides on focus or when there is text. Press the right arrow key in the empty box to use the idea. |
| Glowing buttons | Every `.btn` | A pointer listener sets `--mx` and `--my`; a `::after` radial gradient follows the cursor. Primary buttons also glow on hover. |
| Animated gradient border | Both prompt boxes, while focused | `.gborder`: a plain border that becomes a conic gradient whose angle is animated with `@property`, plus a soft ring. |
| Live demos | "Direct it like a film" row | Pure CSS: an orbiting camera dot on an ellipse (`offset-path`), a sweeping light beam, motion-blur echoes, swinging pendulums. |
| Scroll reveals | Sections and cards | `setupReveal()` uses an `IntersectionObserver`; each `.rv` element rises in with a stagger by its position among siblings. |
| Sticky header | Top | Blurs and gains a border after 8 px of scroll; nav links underline on hover. |
| Loading spinners | Generate button, overlay, gallery | A spinner inside the button while working, a two-colour ring in the overlay, shimmer skeletons for thumbnails. |

## The preview canvas: from prompt to finished animation

This is the sequence `startJob()` and `job.end()` in `app.js` run around every generation. The monitor has three layers: the **preview iframe** (the player), the **busy overlay** (`#busy`) and the border glow.

**Loading state** (`startJob`)

1. The monitor gets `.making`, which pulses a glowing outline.
2. The overlay fades in and scales from 1.04 to 1. The old preview behind it blurs to 10 px and grows 5% (`keep: true`, so it stays that way underneath).
3. `orb.start()` runs the particle orb on `#orbCanvas`: 110 glowing particles orbiting on tilted ellipses around a pulsing core.
4. The user's prompt is typed into the overlay (`typeInto`) so they see their words become the orb's caption.
5. The step list advances (each step's dot goes from hollow to pulsing to solid green) and a gradient progress bar follows. For Claude the detail line counts lines written as the answer streams in.
6. The Generate button shows its spinner and the label "Making your animation…". Stop aborts the job.

**Reveal** (`job.end(true)`)

1. `orb.burst()` throws the particles outward and fades them.
2. The new iframe was loaded underneath during generation. It now animates from `blur(16px) scale(1.09) opacity .15` to sharp (1 s).
3. At the same moment the overlay's `clip-path` closes as an **iris** from `circle(150%)` to `circle(0%)` (0.9 s), revealing the sharp preview as the circle shrinks.
4. The overlay is hidden and the orb loop stops (no idle CPU).

If generation fails or is stopped, the overlay just fades out and the old preview un-blurs, so the user is never left on a blank stage.

Camera, lighting and blur changes need no loading state: they go straight to the running player as a `config` message and show on the next frame.

## The same transition in React with Framer Motion

The prototype uses vanilla JS so it runs from a single HTML file. If you move to React, this is the equivalent stage. (This snippet is a reference and is not run in this repo.)

```jsx
import { AnimatePresence, motion } from "framer-motion";

export function PreviewStage({ status, prompt, src, steps }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
      <AnimatePresence mode="wait">
        {status === "ready" && (
          <motion.video
            key={src} src={src} autoPlay loop muted playsInline
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ opacity: 0.15, scale: 1.09, filter: "blur(16px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {status === "generating" && (
          <motion.div
            key="loading"
            className="absolute inset-0 grid place-items-center bg-black/85 text-white"
            style={{ clipPath: "circle(150% at 50% 50%)" }}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ clipPath: "circle(0% at 50% 50%)", transition: { duration: 0.9, ease: [0.65, 0, 0.35, 1] } }}
          >
            <OrbCanvas />                       {/* the particle orb, a canvas in a ref */}
            <TypedPrompt text={prompt} />        {/* types one character at a time */}
            <StepList steps={steps} />           {/* dots go hollow, pulsing, solid */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

`AnimatePresence` keeps the loading layer mounted while its `exit` iris plays, and the `key` on the video makes each new animation animate in from blur.

## Steering and sound

- Drag any preview to steer the camera. The runtime (not the page) handles it, so it works in the hero card, the studio and full screen. It springs back on release.
- The studio has a **Sound** button. See `js/sound.js` and the architecture doc for how the soundscape is built and synced.

## Performance notes

- Only one `requestAnimationFrame` loop runs per visible canvas; the hero mesh pauses off screen and in hidden tabs, the orb only runs while a job is active.
- Particle glow uses pre-rendered sprites (one small canvas per colour) instead of per-frame gradients or `shadowBlur`.
- Pointer effects use CSS variables and `transform`/`translate`, so they don't trigger layout.
- The preview canvas caps its internal resolution at about 1280 px on the long side and lowers motion-blur sub-frames if frames take too long.
