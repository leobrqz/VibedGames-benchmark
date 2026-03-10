// ── Game Constants ──

// Physics
export const GRAVITY = 22;
export const PHYSICS_SUBSTEPS = 3;

// Player
export const PLAYER_WALK_SPEED = 4.5;
export const PLAYER_SPRINT_SPEED = 7.5;
export const PLAYER_PUSH_SPEED = 2.0;
export const PLAYER_PUSH_SPRINT_SPEED = 3.5;
export const PLAYER_JUMP_FORCE = 9;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_EYE_HEIGHT = 1.6;
export const PLAYER_RADIUS = 0.35;
export const PLAYER_GROUND_SNAP = 0.3;

// Boulder
export const BOULDER_RADIUS = 0.85;
export const BOULDER_MASS = 600;
export const BOULDER_GRAB_DISTANCE = 2.8;
export const BOULDER_GRAB_OFFSET = 1.8;
export const BOULDER_FRICTION = 0.45;
export const BOULDER_RESTITUTION = 0.15;
export const BOULDER_RESET_LATERAL = 14;
export const BOULDER_RESET_BEHIND = 20;
export const BOULDER_PUSH_FORCE = 12;
export const BOULDER_PUSH_SPRINT_FORCE = 20;
export const BOULDER_START_Z = 12;

// Stamina
export const STAMINA_MAX = 100;
export const STAMINA_DRAIN_SPRINT = 18;
export const STAMINA_DRAIN_PUSH_SPRINT = 32;
export const STAMINA_REGEN_MOVING = 10;
export const STAMINA_REGEN_IDLE = 22;
export const STAMINA_EXHAUSTION_THRESHOLD = 20;

// Terrain
export const TERRAIN_CHUNK_LENGTH = 32;
export const TERRAIN_CHUNK_WIDTH = 28;
export const TERRAIN_SEGMENTS = 40;
export const TERRAIN_CHUNKS_AHEAD = 6;
export const TERRAIN_CHUNKS_BEHIND = 2;
export const TERRAIN_BASE_SLOPE = 0.32;
export const TERRAIN_PATH_HALF_WIDTH = 11;
export const TERRAIN_WALL_STEEPNESS = 0.35;

// Camera
export const CAMERA_DISTANCE = 5.5;
export const CAMERA_HEIGHT_OFFSET = 2.2;
export const CAMERA_PUSH_DISTANCE = 6.5;
export const CAMERA_PUSH_HEIGHT = 1.6;
export const CAMERA_SMOOTHING = 6.0;
export const CAMERA_SENSITIVITY = 0.002;
export const CAMERA_MIN_PITCH = -0.8;
export const CAMERA_MAX_PITCH = 1.2;
export const CAMERA_MIN_DISTANCE = 1.5;

// Effects
export const PARTICLE_POOL_SIZE = 300;
export const DUST_EMIT_RATE = 12;
export const PEBBLE_EMIT_RATE = 6;

// Colors
export const COLOR_SKIN = 0xc4956a;
export const COLOR_CLOTH = 0x7a6548;
export const COLOR_DARK = 0x3d2b1f;
export const COLOR_BOULDER = 0x5a5047;
export const COLOR_TERRAIN_WARM = { r: 0.55, g: 0.46, b: 0.36 };
export const COLOR_TERRAIN_COLD = { r: 0.42, g: 0.40, b: 0.42 };
export const COLOR_SKY_LOW = 0x8b7560;
export const COLOR_SKY_HIGH = 0x4a5568;
export const COLOR_FOG_LOW = 0xa09080;
export const COLOR_FOG_HIGH = 0x6b7b8b;
export const COLOR_SUN = 0xffeedd;
export const COLOR_AMBIENT = 0x404860;
