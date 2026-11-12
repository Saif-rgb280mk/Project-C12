# KINETIC XI — Master Design Prompt & Architectural Blueprint

**Version 1.0 · Lead Game Architecture · Physics Engineering · Sports Game Direction**

KINETIC XI is an original, next-generation football (soccer) simulation built around one promise: **nothing on the pitch is faked.** The ball flies because air pushes on it. Players turn because their studs grip the turf. The pitch gets worse because rain falls on it and boots tear it. The CPU manager changes shape because it has watched how *you* play. This document is both the **mega-prompt** you can hand to a game-development AI and the **master design document** a human team can build from. Every system described here has a reference implementation in the accompanying source code (C++17 engine core, Objective-C++/Swift/Metal macOS layer, and a playable JavaScript prototype). The system tests and lab measurements are reproduced in Part D (Verified Results).

## How to use this document

- **As an AI prompt:** paste Section 0 ("The Master Prompt") first, then attach the sections you want built. Section 0 tells the AI its role, the non-negotiable rules and the acceptance criteria. Every later section is written as a specification it can implement.
- **As a design document:** Sections 1–9 are the blueprint, from vision through physics, AI, presentation, controls, settings, technology and production.
- **As a learning resource:** each system names the real science it is built on (aerodynamics, sports physiology, football analytics). Part E explains every language and tool used.

## 0. The Master Prompt

Copy everything in this section into the AI system or task prompt.

```text
ROLE
You are the Lead Game Architect, Physics Engine Programmer and Sports Game Director of
"KINETIC XI", an original, ultra-realistic football (soccer) simulation for macOS on Apple
Silicon (first-class), with Windows and console ports. You write production-quality code,
explain trade-offs, and never fake physics with canned animation.

OBJECTIVE
Build a football game whose realism, physics fidelity and tactical depth exceed the current
annual AAA football simulation, while keeping a fully original identity: original clubs,
original presentation ("Raw Broadcast"), original mechanics (Living Pitch, True-Inertia Ball,
Keyboard Mastery, Touchline Mind adaptive manager). Never copy another game's names, modes,
UI, menus, audio, art or branding.

NON-NEGOTIABLE RULES
1. Zero magnetism: the ball's velocity may only change through gravity, aerodynamic forces,
   ground/woodwork/net contact, or a physical contact by a body part that can actually reach
   it (foot, thigh, chest, head, hands, slide). Dribbling is a sequence of planned touches.
2. All ball flight is integrated from forces: drag with a Reynolds-dependent drag crisis,
   Magnus lift from spin, a seeded knuckle side force, wind. Use RK4 at <= 1/480 s substeps.
3. Aiming is physics-solved: the game finds the launch (speed, yaw, pitch, spin) that hits the
   intended target THROUGH the same physics, then applies human error to the launch.
4. Player movement obeys force–velocity propulsion, a traction friction circle sampled from
   the pitch, and plant-and-cut turning. Feet are grounded with two-bone IK.
5. The pitch is a simulated surface (moisture, standing water, wear, compaction) updated by
   weather and footfalls. Ball bounce/skid/roll and player grip read it every substep.
6. Fatigue uses the critical-speed / D' balance model plus glycogen and muscle strain; injury
   risk is a hazard rate scaled by the Injury Frequency slider.
7. AI uses pitch control and expected-threat value; teammates plan off-ball runs; defenders
   hold a coordinated zonal line with step-up/drop triggers; the CPU manager adapts to the
   human's observed habits at tactical windows with hysteresis, and explains its changes.
   Difficulty changes reaction time, decision temperature and execution error. It never adds
   stat boosts, scripted "momentum", or rubber-banding.
8. The MacBook keyboard layout in Section 6 is mandatory and exact. Resolve overloaded keys
   with the Context Intent Arbiter (phase + timestamped tap/hold + chord windows). Input is
   event-sourced with OS timestamps so behaviour is frame-rate independent.
9. Settings (graphics, gameplay sliders with separate User/CPU values, camera, audio,
   accessibility, full key remapping) are declared once and drive save, load, validation and
   menu generation.
10. Deterministic simulation: fixed 120 Hz tick, seeded RNG, no fast-math, so replays and
    rollback netcode reproduce matches bit-for-bit on the same build.

DELIVERABLES (in order)
A. Engine core library + unit tests proving each physical claim (ranges in Part D, Verified Results).
B. macOS platform layer: GameController keyboard capture, Metal renderer (MetalFX, ray
   tracing on hardware-RT GPUs), thermal/power governor, PHASE spatial audio.
C. Vertical slice: one stadium, two clubs, full 11v11 match with all laws, weather and the
   complete settings suite.
D. Content scale-up, online (rollback), career modes, localisation.

ACCEPTANCE CRITERIA (automated where possible)
- 25 m free kick at 27 m/s, 16 deg, ~8 rev/s sidespin curls 3–5 m and stays under the bar.
- A 12 m/s ground pass travels 25–80 m on a dry pitch, FURTHER on a wet film, and LESS
  than half as far through 9 mm of standing water.
- Elite sprint splits: 10 m in 1.6–2.4 s, 30 m in 3.7–5.0 s; no 90-degree snap turns at 8 m/s.
- Every mandated key binding reachable; tap/hold classification identical at 30/60/240 Hz.
- 60 fps on a base M-series MacBook Air at its preset; 120 fps on 14"/16" ProMotion Pro/Max.
- Input-to-photon latency < 50 ms at 60 Hz and < 33 ms at 120 Hz.
```

## 1. Vision, Pillars and Original Identity

### 1.1 Vision statement

A football game you can **read like real football**. When a pass dies in a puddle, it is because the puddle is really there. When your winger can't turn, it is because he is at 9 m/s on wet grass. When the CPU suddenly doubles up on your left-back, it is because you have played 60% of your passes down that flank and the manager told them to. Every outcome has a cause the player can see, learn and exploit.

### 1.2 Design pillars

| Pillar | Promise | Measured by |
|---|---|---|
| Physics Truth | No canned trajectories, no magnet ball | Lab tests in Part D; zero "ball snaps" in telemetry |
| Tactical Intelligence | Teammates think, opponents adapt | Off-ball run quality, adaptation events per match |
| Raw Atmosphere | Gritty, broadcast-real presentation | Audio/visual reactivity to match danger |
| Keyboard Mastery | A laptop keyboard is a first-class controller | Every action reachable; arbiter tests; latency |
| Respect the Player | Deep settings, honest difficulty, accessibility | Settings coverage; no hidden stat boosts |

### 1.3 Benchmark targets (versus the current annual AAA football simulation)

This project does not reuse or reference any competitor assets. "Better than" is defined by **measurable targets** that a team can verify:

| Area | Typical annual-sim approach | KINETIC XI target |
|---|---|---|
| Ball control | Animation-driven contact with assisted ball attachment | 100% physics touches; ball never attached outside GK hands |
| Ball flight | Tuned curves per shot type | Force-integrated flight with drag crisis, Magnus and knuckle |
| Pitch | Static surface, cosmetic rain | Living hydrology + wear that changes friction and bounce |
| Fatigue | Single stamina bar | D' + glycogen + strain with injury hazard |
| CPU tactics | Preset instructions | Habit-learning manager that re-plans and explains itself |
| Keyboard | Port of pad layout | Purpose-built arbiter, Mac shortcut doctor, rollover lab |
| Mac | Often unavailable | Native Metal, MetalFX, hardware RT on M3+, thermal governor |

### 1.4 Original identity

- **Name:** KINETIC XI ("XI" for the eleven, "kinetic" for the physics-first promise).
- **World:** fictional clubs and leagues at launch (for example Northbank Athletic and Harbour City Rovers), so the game ships without licences and builds its own lore. Licensing can be layered on later.
- **Signature systems:** *Living Pitch* (Section 3.3), *True-Inertia Ball* (3.1), *Touchline Mind* adaptive manager (4.7), *Raw Broadcast* presentation (5.1), *Keyboard Mastery* (6).
- **Look:** night matches under four floodlight towers with four soft player shadows, film grain, wet-lens droplets, mud building up on kits through a rainy match.
- **Sound:** the stadium first, the commentary second. Crowd swell follows real danger (expected threat), and the ball's thud is keyed to real impact speed and pitch wetness.

## 2. Engine Architecture

### 2.1 Layered architecture

```text
+--------------------------------------------------------------------------------+
| PRESENTATION   Raw Broadcast director · HUD · menus · replays · commentary     |
+--------------------------------------------------------------------------------+
| GAME LAYER     Match rules & referee · set pieces · career/online modes        |
+--------------------------------------------------------------------------------+
| AI             Perception → World model (pitch control, xT) → Team brain       |
|                → Role policies → Utility + learned policy → Touchline Mind     |
+--------------------------------------------------------------------------------+
| SIMULATION     Input arbiter · Locomotion · Touch planner · Ball physics ·     |
|  (120 Hz)      Living pitch · Fatigue · Contacts/fouls · Goalkeeping           |
+--------------------------------------------------------------------------------+
| ANIMATION      Motion matching (style) + two-bone IK grounding + active ragdoll |
+--------------------------------------------------------------------------------+
| PLATFORM       macOS: Metal 3/4, MetalFX, GameController, PHASE audio,         |
|                thermal/power governor · Windows: D3D12/Vulkan · consoles       |
+--------------------------------------------------------------------------------+
```

### 2.2 Simulation tick (fixed 120 Hz, deterministic)

The order is fixed and identical in the C++ engine and the JavaScript prototype (`prototype/js/game.js`, `tick()`):

1. **Drain input edges** (OS timestamps) → **Context Intent Arbiter** → commands + held intents.
2. **Weather & Living Pitch** hydrology update (accumulated every 0.25 s).
3. **User intent** → locomotion command for the controlled player; queue strikes that are out of reach.
4. **AI think**: team shape, defensive line, pressers, chasers, runs, goalkeeper.
5. **Actions**: slides, dives, falls, lunges, skill moves; foul detection from body contact.
6. **Locomotion** for 22 players (force–velocity, friction circle, plant-and-cut) → footfalls feed the pitch → **fatigue** integration → **body separation**.
7. **Ball physics** (RK4 flight, contact impulses, rolling) → woodwork and net collisions.
8. **Touch resolution**: every player that can *physically* reach the ball is a candidate. The carrier versus challenger contest is resolved by attributes, shielding, slide/lunge and wrong-footing. The winner's touch is applied as an impulse.
9. **Laws**: goal, out of play, offside (judged at the moment of the pass), fouls, restarts.
10. **Bookkeeping**: possession, stats, adaptive-manager observations, crowd excitement, ball-path prediction (every 3 ticks, 3 s horizon) for AI and keepers.

### 2.3 Threading and determinism

- **Simulation thread** at `QOS_CLASS_USER_INTERACTIVE` (Swift: `Thread.qualityOfService = .userInteractive`) so it lands on performance cores. The render thread consumes interpolated snapshots, and the audio thread runs on Core Audio's real-time thread.
- **Job system** for AI (22 agents of independent perception) and animation (motion-matching search) with a work-stealing queue; results are merged in a fixed order so the outcome is deterministic.
- **Determinism rules:** a fixed tick; no `-ffast-math`; a seeded SplitMix64 RNG per subsystem (`kxi::Rng`); per-strike knuckle seeds; identical summation order. This gives bit-exact **replays from input streams** and **rollback netcode** (input delay 2 frames, rollback window up to 8 frames at 120 Hz).
- **Unified memory (Apple Silicon):** the pitch-state texture (moisture, water, wear, stripes) is written by the CPU each 0.25 s directly into a shared `MTLBuffer`/texture with `storageModeShared`, so it needs no copy.

### 2.4 Data model (entity-component, data-oriented)

| Component | Key fields | Owner system |
|---|---|---|
| `LocomotionState` | pos, vel, facing, stepPhase, slipTimer, lean | Locomotion |
| `AthleteProfile` | topSpeed, maxAccel, maxDecel, agility, balance, dribbling | Data (ratings) |
| `FatigueState` | dPrime, glycogen, acuteStrain, chronicStrain, distance | Fatigue |
| `BallState` | pos, vel, spin, grounded, time-since-strike, knuckleSeed | Ball physics |
| `SurfaceCell` | moisture, waterDepthMm, wear, compaction, grassHeightMm, drainageBias | Living Pitch |
| `TacticalPlan` | pressHeight, lineHeight, width, compactness, overloadFlank, marking | Touchline Mind |
| `KeyBindings` | slot → physical key | Input |


## 3. Pillar 1 — Hyper-Realistic Gameplay and Physics Engine

### 3.1 True-Inertia Ball (zero scripting, zero magnetism)

**Reference code:** `engine/include/kxi/ball_physics.hpp`, `engine/src/ball_physics.cpp`, `prototype/js/ball.js`.

#### Physical constants

| Quantity | Value | Source / note |
|---|---|---|
| Mass m | 0.430 kg | Laws of the Game, Law 2: 410–450 g |
| Radius r | 0.110 m | circumference 68–70 cm |
| Moment of inertia I | (2/3)·m·r² | thin spherical shell |
| Drag coefficient, subcritical | 0.47 | smooth-sphere regime |
| Drag coefficient, supercritical | 0.17 | after the drag crisis |
| Critical Reynolds number | 2.4 × 10⁵ (≈ 16 m/s) | panel design moves this ("ball personality") |
| Max lift coefficient | 0.38 | saturation of Magnus lift |
| Air density | 1.225 kg/m³ at sea level, from temperature, altitude and humidity | barometric + ideal-gas law |

#### Forces (evaluated inside every RK4 stage)

```text
v_rel   = v - wind
Re      = rho * |v_rel| * 2r / mu                      (Reynolds number)
Cd(Re)  = Cd_sup + (Cd_sub - Cd_sup) / (1 + exp((Re - Re_crit) / width))     drag crisis
F_drag  = -1/2 * rho * Cd * A * |v_rel| * v_rel
S       = r * |omega| / |v_rel|                         (spin parameter)
Cl(S)   = 1.5 S            for S < 0.1
        = 0.09 + 0.6 S     for S >= 0.1   (capped at 0.38)
F_magnus= 1/2 * rho * Cl * A * |v_rel|^2 * (omega_hat x v_hat)
F_knuckle (only if |omega| < 9 rad/s and |v| > 8 m/s):
        = 1/2 * rho * A * |v|^2 * C_k * w(Re, omega) * n(t)
          n(t): seeded value noise across the two axes perpendicular to v
          w   : (1 - |omega|/9) * exp(-((Re - Re_crit) / (5*width))^2)
d(omega)/dt = -(k0 + k1 * |v_rel|) * omega             (aerodynamic spin decay)
```

Signs are tested. Topspin makes the ball dip and backspin makes it float. An anticlockwise spin seen from above (+z) curls the ball to its left. A strike on the back-right of the ball with the inside of the right foot produces exactly that spin, through `omega += (r_contact × J) / I`. **Spin emerges from the contact point; it is never assigned by shot type.**

#### Ground contact (impulse model)

- **Bounce:** the normal impulse is `Jn = m(1+e)|v_n|`. The restitution `e` comes from the pitch cell and falls slightly with impact speed (a viscoelastic ball).
- **Tangential impulse:** the impulse needed to reach rolling is `J_stick = |v_c| / (1/m + r²/I)`, limited by Coulomb friction `mu_slide · Jn`. It changes both linear and angular velocity, which is why backspin "checks" and topspin "kicks on".
- **Skid → roll:** on the ground, kinetic friction drives the contact-point slip `v_c = v + omega × (−r·ẑ)` to zero. When `|v_c| < 0.02 m/s` the ball is locked into pure rolling (`omega_y = v_x/r`, `omega_x = −v_y/r`).
- **Rolling resistance:** deceleration `c_rr · g`, with `c_rr` from grass length, water film, puddles and mud (Section 3.3). Sidespin is scrubbed by torsional friction.

#### Measured behaviour (from `kxi_lab`; full output in Part D, Verified Results)

| Case | Result |
|---|---|
| 25 m free kick, 27 m/s, 16°, no spin (two knuckle seeds) | 0.53 m and 0.16 m lateral wander, unpredictable by design |
| Same strike, 8 rev/s sidespin | 3.88 m of curl, 1.86 m high at the goal line (under the bar) |
| Same strike, curl + topspin | 3.32 m of curl, dips to 0.44 m |
| 12 m/s ground pass, dry | 34.5 m |
| Same pass, soaked (no puddles) | 38.3 m: the wet film makes the pitch "zippy" |
| Same pass, 9 mm standing water | 9.4 m: the puddle kills the pass |
| Drop from 2 m: bounce apex dry / wet / puddle | 0.95 m / 0.78 m / 0.32 m |

#### Woodwork and net

Posts and crossbar are capsules of radius 6 cm. A ball–capsule contact reflects the normal velocity with restitution 0.6 and halves the spin. Once the ball is inside the frame, the net is a damped constraint volume (back, sides, roof) that triggers the net-ripple visual and audio.

### 3.2 Strikes: physics-solved aiming plus human error

**Reference code:** `BallPhysics.solveAim` / `solveLob` in `prototype/js/ball.js`, `performKick` in `prototype/js/game.js`.

1. The player's **intent** gives a target: a receiver (with velocity lead), a space (through ball), a goal-mouth point (shots), or a direction plus power (manual).
2. The **solver** runs the real ball physics forward (the shooting method):
   - **Shots and crosses:** fix the speed, iterate yaw and pitch from lateral and height miss distances (≤ 7 iterations, ~0.08 m tolerance).
   - **Lobs:** fix the launch angle, iterate speed and yaw until the first landing hits the target.
   - Spin is part of the solve, so a finesse shot is *aimed outside the post and curls in*, and the solver accounts for that automatically.
3. **Human error is applied to the launch, never to the outcome:** `sigma = base · (1.05 − skill) · slider · fatigueError · (1 + pressure) · (1 + 0.8·power²) · typeFactor`. It perturbs yaw, pitch and speed. Over-hitting (power > 0.85) adds a systematic upward pitch bias, so the shot balloons over.

| Strike | Speed model | Spin model | Error factor |
|---|---|---|---|
| Ground pass | √(v_arr² + 2·a_eff·d), v_arr ≈ 6 m/s | natural roll | 1.0 |
| Driven ground pass | v_arr ≈ 10 m/s | natural roll | 1.0 |
| Through pass | lead = 6 + 0.7·v_receiver (assisted) | natural roll | 1.0 |
| Lob / lobbed through | launch 34° / 39°, speed solved | 18 rad/s backspin | 1.0 |
| Cross | launch 19°, whipped | 38 rad/s sidespin away from the keeper + backspin | 1.0 |
| Shot | (15 + 21·power)·(0.8 + 0.25·shooting) | 14 rad/s topspin | 1.0 |
| Finesse shot | 13 + 10·power | 50 rad/s curl + 8 rad/s topspin | 0.8 |
| Volley | as shot ×0.95 | chaotic | 1.6 |
| Header | (9 + 8·power)·(0.8 + 0.3·heading) | none (can knuckle) | 1.3 |

### 3.3 The Living Pitch (dynamic weather that degrades the surface in real time)

**Reference code:** `engine/src/surface.cpp`, `prototype/js/surface.js`, `platform/macos/GrassBlades.metal`.

The pitch is a grid of 1 m cells (2 m in the prototype). Each cell stores **moisture** (blade water film), **standing water (mm)**, **wear**, **compaction** and **grass height**, plus a static **drainage bias** from two octaves of value noise, so low spots exist exactly where the groundskeeper would expect them.

```text
moisture'   = 0.004 * rain_mm_h * (1 - moisture) - evap * moisture
water_mm'   = rain_mm_s - infiltration - 0.5 * evap
infiltration= base_drain * drainageBias * (1 - 0.8 * compaction)     (elite 72 mm/h; club 43 mm/h)
evap        = 0.00035 * (1 + T/20) * (1 - 0.9 * humidity) * (1 + wind/6)
footfall    : wear       += impulse * shear * k * (1 + 2 * moisture)  (wet turf tears faster)
              compaction += impulse * k2 * (0.5 + moisture)
```

| Coefficient | Formula (grass = height·(1 − 0.7·wear), puddle = water/8 mm, mud = wear·moisture) |
|---|---|
| Ball restitution e | 0.70 − 0.08·moisture − 0.28·puddle − 0.0025·(grass − 24) + 0.06·wear·(1 − moisture) |
| Ball skid friction μ | 0.58·(1 − 0.42·moisture) + 0.30·mud |
| Rolling resistance c_rr | (0.035 + 0.0019·grass)·(1 − 0.22·moisture) + 0.55·puddle^1.5 + 0.05·mud |
| Stud traction | (1 − 0.22·moisture)·(1 − 0.30·puddle)·(1 − 0.25·mud) |
| Hardness (injury load) | 0.35 + 0.5·compaction − 0.25·moisture + 0.2·wear·(1 − moisture) |

**Weather presets:** Dry (0 mm/h), Overcast, Light Rain (3 mm/h), Heavy Rain (18 mm/h), Storm (45 mm/h with 9 m/s gusting wind and lightning). Wind feeds the ball's `v_rel`, so a gust really bends a long ball. Over a rainy match the goalmouths compact and puddle first, the centre circle churns, and the HUD reports the pitch state ("Wet & zippy", "Soaked — puddles forming", "Waterlogged — passes die in puddles"). The renderer draws darker, glossier turf, mud patches and puddles from the same data, and the Metal grass shader lays blades flat where water and wear are high.

### 3.4 Full-body locomotion, inverse kinematics and contact

**Reference code:** `engine/src/locomotion.cpp`, `engine/src/foot_ik.cpp`, `prototype/js/player.js`.

#### Momentum-true movement

- **Force–velocity propulsion:** `a_t,max = a0 · (1 − v / (1.02·v_max))`, the linear force–velocity profile of sprint running. Acceleration fades naturally near top speed. Braking is limited separately (≈ 8.5 m/s²) and loads the strain model.
- **Traction friction circle:** `|a| ≤ μ_stud · g · 1.05`, with `μ_stud` from the pitch. Demanding more than `(1.15 + 0.35·balance)` × the limit on a slippery surface triggers a **slip** (0.35 s of reduced drive).
- **Turning:** lateral acceleration is capped at `μ·g·(0.55 + 0.45·agility)`, so the turning radius grows with v²: no 90° snaps at speed.
- **Plant-and-cut:** a direction change above 40° at more than 3 m/s can only use full lateral force on the tick a foot plants. Between plants the body is in swing phase and gets 35% of the force. This single rule creates readable, human weight shifts.
- **Gait clock:** cadence = 1.6 + 0.32·v steps/s (≈ 4.5 at a sprint). Each plant emits a `FootEvent` (position, impulse, shear) that drives turf wear, footstep audio and IK targets.

**Measured:** 10 m in 2.04 s, 30 m in 4.38 s from a standing start, 9.0 m/s top speed; a hard cut at 8 m/s turns less than 60° in 0.2 s, and less on wet turf.

#### Full-body IK and weight shifting

- An **analytic two-bone IK** per leg (law of cosines) keeps thigh and shin lengths exact and bends the knee toward a forward pole vector. Unreachable targets clamp to 99.9% extension and never produce NaN.
- A **pelvis solver** lowers the hips just enough for both planted feet to stay in contact (a lunge drops the pelvis), and shifts the **centre of mass** toward the support foot by `0.03 + 0.008·|a_lat|` m (capped at 9 cm).
- **Production pipeline:** motion matching selects style and timing from mocap. IK enforces contact truth. An **active ragdoll** (PD-controlled joints driven toward the animated pose) absorbs shoulder-to-shoulder impulses, so collisions are physical and every fall is different.

#### Body contact and fouls

Players are solid (separation radius 0.31 m). In shielding duels, contest probability uses tackling versus dribbling, shielding (−0.2), slides (+0.25), lunges (+0.12) and wrong-footing (−0.25). A slide that contacts the man before the ball is a foul (a penalty if it happens in the box). A failed standing lunge with body contact is a foul 30% of the time. Severity for cards in the full game comes from relative contact speed and the body part hit.

### 3.5 Realistic fatigue and muscle strain

**Reference code:** `engine/src/fatigue.cpp`, `Player.tire` in `prototype/js/player.js`.

```text
Critical speed (CS) = 4.2 m/s * (0.88 + 0.12 * glycogen)
if v > CS:  D' -= (v - CS) * dt * (1 + 0.25 * max(0, a_t) / 4)          (anaerobic spend)
else:       D' += (D'max - D') / tau * dt,
            tau = (546 * exp(-0.5 * (CS - v)) + 120) * (1.3 - 0.6 * stamina)  (Skiba-style recovery)
glycogen   -= dt_match * (0.000045 + 0.000012 * v^2) * (1.2 - 0.4 * stamina)
strain     += [ (−a_t − 3)*0.02 if braking hard ] + [ (v/vmax − 0.9)*0.15*(2 − D'/D'max) ]
strain     -= strain * dt / 90 s                    chronic += strain * dt / 1800 s
injury hazard / match-minute = base * slider(0→0, 50→1, 100→3)
                               * (1 + 8 strain^2) * (1 + 1.5 chronic) * (1 + 1.2 (1 − D'/D'max))
```

**Effects:** top speed ×(0.80 + 0.20·√(D'/D'max))·(0.94 + 0.06·glycogen); acceleration ×(0.75 + 0.25·D'/D'max); technical error ×(1 + 0.6·(1 − D'/D'max) + 0.5·(1 − glycogen)); decision latency grows with low glycogen. **Time compression:** the short-term D' integrates in real seconds (a 5-second sprint *feels* like a 5-second sprint), while glycogen integrates in match seconds (a 6-minute half still produces a believable 45-minute decline). **Measured:** a box-to-box profile covers 13 km over 90 minutes, and glycogen falls to 0.26.

### 3.6 Goalkeeping

- **Perception:** keepers read the predicted ball path (3 s horizon, 50 ms samples) and react after `0.32 − 0.16·ability` s.
- **Positioning:** keepers stand on the ball–goal-centre line at a depth of `0.6 + 0.09·d_ball` m (0.8–5.5 m) and claim loose balls in the box when they win the intercept race.
- **Dives:** lateral dive speed = required speed + 0.5 m/s, capped at 6.5 m/s. High dives raise hand reach to 2.6 m.
- **Hands:** catch if `speed < 12 + 10·ability` and a skill roll passes; otherwise parry away from goal. Very fast shots (> 24 m/s) can squirm through. The back-pass law is enforced: a keeper never handles a teammate's deliberate pass.

### 3.7 Laws of the game and the referee

Offside is judged **at the moment of the pass** against the second-last defender and the ball; the flagged player is only penalised on touching the ball. Restarts covered: kick-off, throw-in (thrown from 1.9 m), corner, goal kick, free kick, penalty. Half-time and full-time swap ends and produce statistics. The full game adds advantage (a 3-second window), cards and VAR-style review cameras (presentation only; decisions stay deterministic).

## 4. Pillar 1b — Next-Gen AI and Tactical Intelligence

**Reference code:** `engine/src/tactics.cpp`, `prototype/js/ai.js`.

### 4.1 Architecture

`Perception (with reaction delay)` → `World model: pitch control + expected threat + ball prediction` → `Team brain: phase, block, defensive line, pressing assignment` → `Role policies (12 roles)` → `Individual decisions (utility softmax + learned policy)` → `Locomotion commands`.

### 4.2 Pitch control and expected threat

```text
time_to_reach(agent, p) = reaction + |p - (pos + vel * reaction)| / v_max
control(team, p)        = sum_team exp(-T/sigma) / sum_all exp(-T/sigma),  sigma = 0.45 s
threat(p)               = 0.03 + 0.12 * progress^2
                          + 0.75 * exp(-d_goal / 11) * (0.35 + 0.65 * min(1, goal_opening / 0.9))
```

### 4.3 Off-ball run planner (teammates make realistic runs)

Each attacker periodically (every 1.0–1.8 s) samples candidate targets at its anchor and on rings of 7/14/20 m. It scores each candidate as follows:

```text
score = threat(target) * control(target)
      - effort_per_metre(run frequency slider) * run_length
      - 0.015 * distance_from_formation_anchor
      - 0.25 if beyond the offside line and ahead of the ball
      - 0.06 if within 6 m of the ball (don't crowd the carrier)
```

The result is diagonal runs into half-spaces, wingers holding width, strikers curving runs along the line to stay onside, and midfielders dropping into pockets when the lane is blocked.

### 4.4 Dynamic zonal defensive line

| Trigger | Condition | Line response |
|---|---|---|
| Hold | default | depth from own goal = 18 + 27·(line height slider) m |
| Step-up | carrier faces his own goal / backward pass | +6 m |
| Drop | carrier unpressured AND a runner threatens in behind | −7 m |
| Compress | carrier pressured within 3 m | +2 m |
| Safety | never in front of the ball, never inside the six-yard box | clamp |

Back-four slots spread across 28–44 m (line width slider), shift 0.35 × ball-y toward the ball side, and shift further toward the flank the Touchline Mind has flagged. The midfield line sits 9–18 m in front (compactness). Markers blend their zone anchor toward a goal-side position on the most dangerous opponent in the zone, by `marking tightness`.

### 4.5 Pressing, cover and loose balls

The nearest defender by time-to-reach presses to a goal-side contain point; a second presser joins when the ball enters the team's press zone (`u > 0.6 − 1.2·pressHeight`). The loose-ball chaser for each team is chosen by the earliest reachable point on the predicted ball path. When a pass is played, the intended receiver attacks its intercept point.

### 4.6 On-ball decisions: utility today, learned policy tomorrow

The utility model (shipping baseline) scores every option:

- **Shot:** xG-style value plus a box bonus.
- **Passes:** receiver threat × lane safety. Lane safety models interception timing for every opponent against the ball's travel time.
- **Through balls:** threat × control at the target.
- **Crosses** from wide areas into attackers.
- **Dribble:** threat ahead × free space.
- **Clearance** under pressure in the defensive third.

The choice is a **softmax with difficulty-dependent temperature** (Legendary 0.03 to Amateur 0.12), so higher difficulty is *smarter*, not stronger.

**Learned policy (production):** a transformer over 23 tokens (22 players + ball). Per-player features are position, velocity, facing, fatigue, role and the team-relative pitch-control sample. Outputs are action logits and target heatmaps. It is trained first by **imitation learning** on broadcast-tracking data, then fine-tuned with **self-play reinforcement learning** (PPO) inside this same deterministic engine, with reward = xG differential + possession value + an anti-exploit penalty. Inference runs on the Apple Neural Engine via Core ML (fallback: Metal Performance Shaders Graph) within a 0.5 ms budget per decision batch. The utility model stays as a guard-rail and as the fallback.

### 4.7 Touchline Mind — the adaptive CPU manager

The CPU manager watches **your** habits with exponentially decayed counters (×0.97 per event). It tracks pass flank (left/centre/right), through balls, crosses, long shots, dribble attempts, slow build-up (more than 10 s in your own half), fast counters (a shot within 8 s of winning the ball) and skill moves. At **tactical windows** (any stoppage, or every 5 match minutes), and only after at least 6 observations, it re-plans:

| Your habit (share of events) | CPU response |
|---|---|
| > 50% of passes down one flank (and 20 points above the other) | shift the block and double up on that flank |
| through balls > 18% | drop the defensive line by 0.2 |
| crosses > 18% | full-backs tighter to wingers, tighter marking |
| long shots > 12% | close down the edge of the box (+compactness) |
| slow build-up > 20% | press high (+0.25 press height) |
| fast counters > 15% | rest-defence: hold players back |
| dribbles > 25% | double up on dribblers |
| skill moves > 15% | stand off and jockey instead of diving in |
| losing after 70' / winning after 75' | chase the game / low block |

**Hysteresis:** the plan moves 60% of the way toward the new target, so it never flip-flops. **Personalities:** Pragmatist, Pressing Machine, Possession Purist, Counter-Puncher. **Fairness:** the manager only changes *tactics*; it never touches physics, attributes or error. **Transparency:** every change is surfaced in the HUD ("CPU MANAGER: Dropping the defensive line — you keep playing in behind").

### 4.8 Honest difficulty

Difficulty sets the CPU's reaction time (0.3–0.8 s), decision temperature, execution-error multiplier (1/skill²) and keeper reaction. There is no scripted "momentum", no rubber-banding and no hidden stat boosts.

## 5. Pillar 1c — Original Identity and Presentation ("Raw Broadcast")

### 5.1 Broadcast-style cameras

- **Gameplay gantry camera:** sits on the near touchline and pans with play. A critically-damped spring tracks the ball with a velocity look-ahead (the operator *leads* the play). The gantry pans 15% less than the target, which gives the parallax of a real camera position.
- **Handheld touchline feel:** low-frequency noise shake on cut-aways, scaled up on big moments, with a Reduce Camera Shake setting.
- **Director (full game):** an event-scoring cut list (shot, save, foul, near-miss, goal) chooses replay angles: reverse-angle gantry, 18-yard high, goal-line low, keeper cam, cable-cam sweep and a manager reaction shot. Replays are reconstructed from the deterministic input stream.
- **Cinematics:** a pre-match walkout orbit with letterbox, and a goal-celebration low touchline tracking shot.

### 5.2 Raw stadium acoustics

- **Crowd simulation:** 6–12 stand sections with mood state (anticipation, frustration, euphoria). The excitement target follows the expected threat of the ball. Each section has a chant generator (rhythm, call-and-response, claps), plus "ooh" groans on misses and roars on shots, saves and goals.
- **Acoustic space:** a per-stadium convolution reverb (measured impulse responses; roof versus open bowl), with Apple PHASE / spatial audio for headphone users.
- **Pitch-level sound:** ball strikes keyed to impulse; bounces keyed to impact speed and wetness (a splash on a soaked pitch); woodwork *clang*; net swish; boots on wet turf; referee microphone; player shouts.
- **Commentary and PA:** event-driven with priority and cooldowns. Commentary ducks under crowd surges and never talks over a goal roar.

### 5.3 Authentic pre-match and post-match immersion

- **Pre-match:** a stadium flyover, team sheets with formation, weather and pitch report ("Heavy rain expected, pitch will deteriorate"), referee coin toss and walkout.
- **Post-match:** the full statistics shown in the prototype (possession, shots on target, xG, pass completion, tackles, saves, fouls/offsides/corners, distance covered), heatmaps, player ratings, an injury report from the strain model, and the Touchline Mind's summary of how it adapted to you.

### 5.4 Visual grit

Film grain, broadcast vignette, wet-lens droplets in rain, mud accumulation on kits proportional to slides and wet footfalls, steam breath on cold nights, and four floodlight shadows per player. On M3-class GPUs and newer, ray-traced reflections handle puddles and wet kits, and ray-traced floodlight lighting adds contact shadows.


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

