Use modularity in the code.
Separate into multiple files as rationally and logically needed. Avoid long files and messy code.
Use only HTML + CSS + JavaScript + Three.js on Vite. You may use additional lightweight libraries for physics (such as cannon-es) if needed.

---

#### OVERVIEW

Build a complete, polished 3D web game inspired by the myth of Sisyphus.

The player is a lone figure condemned to push a massive boulder up an infinite mountain that is procedurally generated and never ends. The game is a meditative yet mechanically rich experience: it is not a frustration loop, it is a well-crafted game about perseverance. Every system should serve that feeling.

The game must be visually impressive, mechanically solid, and technically clean. This is not an MVP — it is a proper, finished-feeling game.

---

#### STACK & ARCHITECTURE

- Use **Vite** for local development.
- Use **HTML**, **CSS**, **JavaScript**, and **Three.js** as the primary stack.
- You may include **cannon-es** (or a comparable lightweight physics library) for rigid body simulation if it meaningfully improves the boulder and character physics.
- Code must be **modular**, separated into multiple files by responsibility.
- Do not put all logic into a single file. Each system should have its own module.
- Suggested module boundaries:
  - `main.js` — entry point, game loop, module orchestration
  - `scene.js` — Three.js scene, renderer, lights, fog, sky
  - `terrain.js` — procedural mountain chunk generation and management
  - `player.js` — character controller, input handling, state machine
  - `boulder.js` — boulder physics, grab mechanics, roll simulation
  - `camera.js` — third-person camera with mouse look
  - `stamina.js` — stamina logic and regeneration
  - `animations.js` — character rig, animation states, transitions
  - `effects.js` — particles, dust, sweat, screen shake, post-processing
  - `ui.js` — HUD rendering (stamina bar, height counter, atmosphere text)
  - `audio.js` — ambient sound, footstep, boulder roll, effort sounds
  - `utils.js` — shared math helpers, constants, easing functions
- Keep public interfaces between modules minimal and clear.
- Use `const` and `let`. Avoid polluting the global namespace.

---

#### GAME WORLD & SETTING

- The world is a **mountain that never ends**.
- The player begins on a **short flat starting section** at the base of the mountain. This area is a natural ramp transition into the slope.
- A **massive boulder** sits at the bottom of the slope, just where the flat section ends and the incline begins.
- The mountain slope stretches upward infinitely via **procedural chunk generation**. As the player climbs, new terrain sections are generated ahead and old sections far behind are disposed of to manage memory.
- The mountain is not a straight corridor — it has **lateral width**, slight **direction variation**, and organic surface irregularities. It should feel like a real mountain face, not a treadmill.
- Add environmental storytelling: worn grooves in the rock from previous climbs, faint inscriptions, scattered stones, sparse dead vegetation at lower elevations and bare rock at height.
- Include a **distance/height counter** in the HUD to give the player a sense of progress.
- Add subtle **atmospheric depth**: fog thickens with altitude, sky transitions from warm dusk tones at the base to cold blue-grey at height.

---

#### PROCEDURAL TERRAIN GENERATION

- The mountain is divided into **chunks** (segments of slope), generated ahead of the player and removed behind.
- Each chunk must:
  - Connect seamlessly to the previous chunk with no visible seams or gaps.
  - Have a consistent **upward slope** (the mountain always goes up), but vary in steepness within a defined range.
  - Include small **surface irregularities**: rocks, ridges, embedded boulders, slight lateral camber.
  - Occasionally include wider **landing platforms** or brief flatter sections to give the player breathing room.
  - Have **natural-looking rock geometry**, not flat planes. Use geometry displacement, layered meshes, or noise-based heightmaps to give the surface texture and depth without relying solely on textures.
- The terrain must be **solid and traversable**. The player and boulder must not fall through it.
- Collision geometry must match the visual geometry faithfully.
- Seed the generator so a given run can be reproduced (optional but preferred).

---

#### PLAYER CHARACTER

- The player is a humanoid figure — **Sisyphus**. He should look the part: muscular, worn, determined. Geometry can be low-poly but must read clearly as a human figure.
- The character has a **full skeletal rig** with animated joints for:
  - Idle (standing still, breathing)
  - Walk (forward, backward, strafe)
  - Sprint (faster, leaning slightly forward)
  - Push (arms extended, body braced, feet driving)
  - Push sprint (same as push but more urgent, body more forward)
  - Stumble/strain (triggered when boulder resists strongly)
  - Release boulder (arms withdraw, body straightens)
  - Boulder rolling away (reactive — player watches it roll, slight slump)
- All animation transitions must be **smooth and blended**, not snapping.
- The character casts a **shadow**.

---

#### CONTROLS

- **WASD** — move (forward, back, strafe left, strafe right).
- **Mouse** — camera look. No button press required. Pointer lock on click.
- **Space** — jump (limited use; cannot jump while grabbing boulder).
- **Shift** — sprint / push harder (consumes stamina while held).
- **E** — toggle grab. First press = attach to boulder (enter push state). Second press = release boulder.
- Controls must feel **responsive and weighty** — not floaty or mechanical.
- Horizontal movement relative to camera direction (standard third-person controls).

---

#### CAMERA

- Third-person camera positioned behind and slightly above the player.
- Mouse look controls the horizontal and vertical orbit of the camera around the player.
- Vertical orbit is clamped to prevent flipping.
- Camera **smoothly follows** the player with a slight lag for organic feel — not instant snapping.
- Camera collides with terrain: if terrain is between the camera and the player, pull the camera in to avoid clipping.
- When grabbing the boulder, the camera subtly shifts to better frame the push action (slightly lower and more behind).
- Add a very subtle **camera shake** when sprinting while pushing, and a stronger shake if the boulder slips.

---

#### BOULDER MECHANICS

The boulder is the central mechanic. It must feel **heavy, alive, and physically convincing**.

**Physical Properties:**
- The boulder is large — roughly chest-height on the player.
- It has mass, friction, and restitution. It resists being pushed uphill and has a natural tendency to roll back down due to slope gravity.
- When not grabbed, the boulder rolls freely under physics: down the slope, around surface irregularities, potentially off the path.
- The boulder's roll speed on a given slope depends on the incline angle and friction of the surface.

**Grab Mechanic:**
- When the player presses **E**, the character enters the **push state**:
  - The character moves toward the boulder and plants their hands visually against its surface.
  - The player's arms are IK-driven or animation-blended to always appear to be in contact with the boulder's surface as the grab point shifts.
  - While grabbed, the player and boulder move as a coupled system. The player pushes the boulder; the boulder's physics resistance is felt through reduced player movement speed.
- While grabbed:
  - The player can push the boulder in **any horizontal direction**, including sideways along the slope or back down — but the boulder's mass and slope make upward movement the hardest direction.
  - The boulder rolls realistically under the player's applied force.
  - **The player cannot jump while grabbing the boulder.**
- When the player releases (**E** again):
  - The character's arms withdraw.
  - The boulder immediately becomes free under physics.
  - If on a slope, it rolls back down. On a flat section, it slows and stops.
  - A brief **rumble/screen shake** and audio cue accompany the release if the boulder is on a slope.

**Visual Detail:**
- The boulder has a distinct rocky texture/material — cracked, worn stone.
- It accumulates **dust particles** as it rolls.
- Small **impact sparks** when it hits terrain obstacles.
- The boulder casts a strong shadow.

---

#### STAMINA SYSTEM

- The player has a **stamina bar** displayed in the HUD as a horizontal bar with clear visual design.
- Stamina ranges from **0 to 100**.
- **Holding Shift** drains stamina:
  - While sprinting without boulder: moderate drain.
  - While sprinting and pushing boulder uphill: fast drain.
- Stamina **regenerates automatically** whenever Shift is not held, at a steady rate.
- Stamina regenerates **faster** when the player is fully stopped.
- When stamina hits **0**:
  - Sprint is disabled until stamina recovers to at least **20**.
  - A visual cue shows the player is exhausted: the stamina bar flashes, the screen edges darken slightly.
  - The character enters a light **strain animation** if trying to push without stamina.
- Stamina bar should have a visual **exhaustion state** (different color or pulsing) when depleted.

---

#### PHYSICS & COLLISION

- The player must collide with all terrain geometry. No falling through slopes or rocks.
- The boulder must collide with terrain geometry faithfully.
- The player must collide with the boulder (cannot walk through it).
- When the boulder rolls downhill unattended, it may hit terrain obstacles and deflect realistically.
- If the boulder rolls off the path entirely, it should teleport back to a reasonable reset position (at the player's last solid position on the path) after a short delay, with a visual and audio cue (a distant rumble, then the boulder reappears).
- Gravity is continuously applied to both the boulder and the player.
- The slope angle must meaningfully affect how hard it is to push the boulder. Steeper sections are harder.

---

#### VISUAL DESIGN

The game should look **intentional and polished**, not placeholder.

- **Color palette:** Desaturated warm stone tones, deep blue-grey sky, warm orange-amber for starting section, cold silver-grey at altitude.
- **Lighting:** A single strong directional light (the sun/moon — position it dramatically low for long shadows). Ambient fill. No harsh flat lighting.
- **Fog:** Distance fog tied to altitude. Thicker and colder at height.
- **Shadows:** Cast shadows enabled for player, boulder, and terrain geometry.
- **Post-processing (optional but preferred):** Subtle vignette, slight color grading, FXAA or similar anti-aliasing.
- **Particle effects:**
  - Dust from boulder rolling on terrain.
  - Dust from player footsteps on dry rock.
  - Small pebbles scattering when boulder passes over rough patches.
  - Sweat droplets (stylized) falling from the player during push+sprint.
  - Subtle god-ray or light shaft from above at the start of the game.
- **Boulder material:** Should look like carved or worn granite — dark, heavy, slightly rough.
- **Terrain material:** Layered rock appearance, slight variation in tone to prevent tiling flatness.
- All geometry can be **low-poly** but must be intentionally styled to look good. Never raw or placeholder.

---

#### AUDIO

- Ambient wind that increases in intensity as the player climbs.
- Boulder rolling sound: low rumble, pitch and volume tied to speed and surface.
- Footstep sounds on rock, varying cadence between walk and sprint.
- Effort/grunt sounds from the player when pushing uphill under load, more frequent near stamina exhaustion.
- A heavy impact sound when the boulder strikes rocks.
- A deep rumble and fade when the boulder rolls away after release.
- Subtle low drone as background ambient — something meditative and slightly ominous.
- If audio files are not available, implement an **audio manager stub** that can be wired up later, and generate simple Web Audio API tones for the most important events (boulder roll, impact, release).

---

#### HUD & UI

- **Stamina bar:** bottom-left or bottom-center, horizontal, clearly styled. Shows current stamina with fill level, color transitions (green → yellow → red → exhausted state).
- **Height counter:** top-right or top-center, displays meters climbed or units climbed from starting point. Updates continuously.
- **Grab indicator:** a subtle contextual prompt showing "E — Grab" when near the boulder without grabbing, and "E — Release" while grabbing.
- **Intro screen:** A brief title screen with the game name ("SISYPHUS"), a short flavor line (something stoic and brief), and a "Click to begin" prompt. Fade to game on click.
- **Game over / reset:** If the boulder falls off the path, a brief UI message appears ("The boulder falls. Again.") before it resets. No death — the player simply continues.
- All UI must use a **clean, minimal typography style** — no comic or playful fonts. A serif or neutral geometric sans-serif fits the myth's tone.

---

#### ATMOSPHERE & TONE

- The game should feel **meditative and weighty**, not frustrating or punishing.
- The myth of Sisyphus is a metaphor for human perseverance. The game should evoke that feeling: the effort matters, even if the peak never arrives.
- As the player climbs higher, subtle environmental changes reinforce the mood: the sky darkens slightly, the wind gets louder, the rock becomes more barren.
- There is no winning. There is only climbing.

---

#### TECHNICAL REQUIREMENTS

- Deliver the full implementation.
- Use Three.js with Vite.
- Keep the project modular with clear file separation.
- Use `const` and `let`. No global namespace pollution.
- Dispose of Three.js objects (geometries, materials, textures) when removing old terrain chunks to prevent memory leaks.
- Frame rate should be stable. Do not generate terrain synchronously in a way that causes visible frame drops — use incremental generation if needed.
- Pointer lock must be implemented correctly for mouse-look.
- Boulder reset (if it falls off path) must not break game state.

---

#### IMPLEMENTATION GUARDRAILS

- Do not generate everything in one file.
- Do not use external frameworks beyond Three.js, cannon-es (optional), and Vite.
- Avoid tight coupling between systems. Each module should own its own state.
- Use simple, reliable collision logic. Prefer robust and slightly conservative over clever and fragile.
- If a procedural generation step fails or produces invalid geometry, fall back gracefully — never crash or infinite loop.
- All input handling should go through a single input manager to avoid conflicts.
- The boulder grab/release state must be consistent with animation state, physics state, and input state at all times. No desync.

---

#### FINAL OUTPUT INSTRUCTION

Generate the full implementation now.

Build a complete, modular, playable Sisyphus game: procedurally generated infinite mountain, a physically simulated boulder, a fully animated player character with push mechanics, stamina system, third-person camera with mouse look, particle effects, contextual audio, and a polished HUD. The result must feel like a real, finished game — not a tech demo.
