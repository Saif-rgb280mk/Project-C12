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
