Use modularity in the code.
Separate into multiple files as rationally and logically needed, avoid long files or messy code.
Use only HTML + CSS + Javascript + Three.js on Vite.

#### OBJECTIVE

Create a polished, playable 3D voxel-style sandbox game on top of a random natural terrain. The world should feel alive and game-like rather than architectural or static: rolling land, simple generated structures, vegetation, enemies, loot, combat, progression, and a controllable player character.

The scene must be generated procedurally and should prioritize clean gameplay systems, readable visuals, and maintainable code structure.

#### STACK & ARCHITECTURE REQUIREMENTS

- Use Vite for local development.
- Use only HTML, CSS, JavaScript, and Three.js.
- Code must be modular and separated into multiple files by responsibility.
- Avoid oversized files and avoid putting all logic into a single monolithic script.
- Organize code into sensible modules such as scene setup, terrain generation, player controller, enemy systems, inventory, combat, UI, items, and utilities.
- Keep public interfaces between modules clear and minimal.

#### WORLD DESIGN

- Generate a random terrain with natural variation: hills, slopes, flat patches, and walkable spaces.
- Populate the world with basic structures only. Keep them simple and gameplay-friendly rather than overly detailed.
- Include simple towers distributed around the world as points of interest.
- Include simple enemy camps placed naturally on suitable terrain.
- Scatter vegetation procedurally across the terrain.
- Ensure the ground is solid and continuous, with no voids or broken traversal.
- Add some simple environmental variation so the world does not feel empty or repetitive.

#### STRUCTURES

- Keep structures intentionally simple and lightweight.
- Include small towers with basic silhouette variety.
- Include enemy camps made from simple modular elements such as tents, crates, fire pits, fences, or rough barriers.
- Structures should be placed in a way that supports exploration and combat.
- Enemy camps should feel like meaningful combat spaces rather than random decoration.
- Include campfire heal spots in the world, especially near camps or other points of interest.

#### TIME & ATMOSPHERE

- Implement natural time progression automatically.
- The lighting should shift smoothly over time.
- The environment should feel readable during gameplay, not too dark to navigate.
- Add basic visual atmosphere and simple effects where appropriate.

#### PLAYER CONTROLS & MOVEMENT

- Implement a playable character.
- Character body can use the same style/body shape already used in the current project.
- Controls:
	- **WASD** to move.
	- **Shift** to sprint.
	- **Space** to jump.
	- Mouse movement automatically controls the camera direction. Do not require holding a mouse button to rotate the camera.
- Movement must include collision and basic physics.
- The player should not pass through terrain, structures, enemies, or other solid obstacles.
- Include grounded movement, gravity, jumping, and basic air control.
- Add basic animations and effects for movement and actions.

#### CAMERA

- Use a gameplay-oriented camera, suitable for controlling a character in a 3D world.
- Mouse look should be responsive and stable.
- The camera should follow the player cleanly.
- Prevent camera behavior from feeling awkward or disconnected during movement and combat.

#### COMBAT

- Player starts with **100 health**.
- Implement combat with:
	- **Left mouse button:** attack.
	- **Right mouse button:** defend.
- Attacking and defending must have visible animation and simple visual effects.
- Combat must interact with equipped items.
- Defense should reduce incoming damage when the player is actively defending with a defensive item equipped.

#### ENEMIES

- Spawn slime enemies throughout the world.
- Maximum of **10 slimes active in the world** at a time.
- Slimes must:
	- move,
	- collide with the world and player,
	- attack the player,
	- have health,
	- respawn after death.
- Slimes should be randomly generated with small variations, especially color and minor visual differences.
- Despite visual variation, all slimes share the same base combat values:
	- **10 damage**
	- **50 health**
- Add basic animation and simple effects for slime movement, attacks, hits, death, and respawn.
- Monsters can drop simple consumables such as berries or potions.

#### ITEMS

- Randomly spawn items in the world from a small generated item pool.
- Item set:
	- Sword
	- Shield
	- Torch
	- Dagger
	- Axe
- Items must appear physically in the world and be easy to notice.
- Add simple ground effects or highlighting so spawned items are readable from a distance.
- Items are picked up automatically when the player walks over them.
- Different items must have different stats.
- Items must support rarity tiers that affect their stats.
- Rarity colors must be:
	- Grey = common
	- Green = uncommon
	- Blue = rare
	- Pink = legendary
- Higher rarity items must provide better stats.
- Defensive items are equipped in the **left hand**.
- When defending, left-hand defensive equipment reduces damage taken.
- Add simple consumables such as berries or potions.
- Consumables can be obtained from enemy drops and used by the player.

#### INVENTORY

- Only the player has an inventory.
- Press **TAB** to open or close the inventory.
- Inventory UI requirements:
	- Stats display at the top.
	- Equipment slots in the middle, including **left hand** and **right hand**.
	- A **5x5 grid** at the bottom.
- Inventory supports drag and drop.
- Picked up items go into the inventory automatically.
- Equipment changes must affect combat stats immediately.
- Add a basic hotbar for quick-equip actions linked to the inventory system.
- The hotbar should allow the player to quickly access or equip items without fully opening the inventory.

#### QUESTS & GOALS

- Add simple quest-style goals to give the player short-term objectives.
- Example goals:
	- Clear 3 camps
	- Collect 5 items
- Completing goals should reward XP.
- Keep the quest system lightweight and easy to understand.

#### PROGRESSION

- Player has an XP bar from **0/100**.
- When XP reaches **100**, the player levels up and XP resets to **0/100**.
- Player max level is **10**.
- On each level up, grant small stat increases such as health, base damage, defense, or similar core combat stats.

- Enemies also have progression:
	- Enemy levels range from **0 to 5**.
	- Enemies can gain XP and become stronger.
	- Each enemy receives an XP amount equal to whatever amount the player currently has in the XP bar at spawn time.
		- Example: if the player has **51/100 XP**, a newly spawned enemy gets **51 XP**.
	- Enemies level up every **100 XP**.
	- Enemy max level is **5**.

#### GAMEPLAY SYSTEMS

- Make all systems work together as one playable loop:
	- explore terrain,
	- collect items,
	- equip gear,
	- use hotbar shortcuts,
	- fight slimes,
	- complete simple goals,
	- gain XP,
	- level up,
	- survive longer.
- The result should feel like an early playable prototype, not just a visual demo.

#### VISUALS & EFFECTS

- Keep the world visually readable and coherent.
- Add basic effects for:
	- footstep dust,
	- item pickup,
	- pickup sparkle effects,
	- hits,
	- hit flashes,
	- attacks,
	- defense,
	- enemy death,
	- respawn,
	- level up if possible.
- Add basic animation to the player and slimes.
- The visuals do not need to be hyper-detailed, but they should feel intentional and game-ready.

#### TECHNICAL REQUIREMENTS

- Deliver the full implementation.
- Use Three.js with Vite.
- Use only HTML, CSS, JavaScript, and Three.js.
- Keep the project modular.
- Use proper separation of concerns.
- Use const and let, avoid global namespace pollution.
- Add robust error handling where needed.
- Dispose of Three.js resources if regenerating or replacing objects.
- Keep performance reasonable for a real-time playable scene.

#### IMPLEMENTATION GUARDRAILS

- Do not generate everything in one file.
- Do not rely on external frameworks beyond Three.js and Vite.
- Keep gameplay code maintainable and readable.
- Avoid messy or tightly coupled systems.
- Use simple but reliable logic for collision, combat, respawning, inventory, drag and drop, and XP progression.
- If a procedural placement or spawn attempt repeatedly fails, skip it safely rather than risking infinite loops.

#### FINAL OUTPUT INSTRUCTION

Generate the full output now.

Build a complete, modular, playable prototype with procedural terrain, basic structures, vegetation, player controller, collision, combat, slime enemies, loot items, inventory, equipment, XP progression, basic animation, and simple effects.
