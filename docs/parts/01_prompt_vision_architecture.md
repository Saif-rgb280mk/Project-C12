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
