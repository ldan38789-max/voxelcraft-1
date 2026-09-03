import { BlockType } from "./blockTypes";

// ==============================================================================
// KÍCH THƯỚC CHUNK
// ==============================================================================
export const CHUNK_SIZE_X = 16;
export const CHUNK_SIZE_Z = 16;
export const CHUNK_HEIGHT = 64;

// ==============================================================================
// LOAD CHUNK XUNG QUANH NGƯỜI CHƠI (render distance có thể chỉnh trong Settings)
// ==============================================================================
export const MIN_RENDER_DISTANCE = 2;
export const MAX_RENDER_DISTANCE = 10;
export const DEFAULT_RENDER_DISTANCE = 5;
export const CHUNK_UNLOAD_BUFFER = 2;
export const MAX_CHUNK_REBUILDS_PER_FRAME = 2;
// Giới hạn số chunk được sinh địa hình (terrain gen) mỗi frame để trải đều chi phí CPU
// qua nhiều frame (time-slicing) — đây là kỹ thuật tối ưu CPU phù hợp cho môi trường
// trình duyệt/JS (JIT của V8 đã tối ưu vòng lặp trên TypedArray tương tự tinh thần Numba,
// Numba/ModernGL của Python không áp dụng được trong dự án web này).
export const MAX_CHUNK_LOADS_PER_FRAME = 2;

export function computeFogDistances(renderDistance: number): { near: number; far: number } {
  return {
    near: Math.max(12, (renderDistance - 1.5) * CHUNK_SIZE_X),
    far: (renderDistance + CHUNK_UNLOAD_BUFFER * 0.5) * CHUNK_SIZE_X,
  };
}

// ==============================================================================
// SINH THẾ GIỚI PHẲNG (dùng cho test / fallback đơn giản)
// ==============================================================================
export const TERRAIN_BEDROCK_HEIGHT = 4;
export const TERRAIN_GRASS_HEIGHT = 10;

// ==============================================================================
// SINH THẾ GIỚI PROCEDURAL
// ==============================================================================
export const DEFAULT_WORLD_SEED = 1337;

// Mực nước biển: các cột có độ cao bề mặt thấp hơn mức này sẽ được lấp nước.
export const SEA_LEVEL = 22;

export interface WorldGenParams {
  plainsAmplitude: number;
  hillsAmplitude: number;
  mountainAmplitude: number;
  plainsBase: number;
  mountainBaseBonus: number;

  regionScale: number;
  regionOctaves: number;
  hillsStart: number;
  hillsEnd: number;
  mountainStart: number;
  mountainEnd: number;

  heightScale: number;
  heightOctaves: number;

  moistureScale: number;
  snowLine: number;

  dirtDepth: number;
  sandDepth: number;

  caveScale: number;
  caveVerticalSquash: number;
  caveThreshold: number;
  caveSurfaceBuffer: number;

  oreCoalChance: number;
  oreIronChance: number;
  oreIronMaxY: number;
  oreGoldChance: number;
  oreGoldMaxY: number;

  treeChancePlains: number;
  treeChanceForest: number;

  minHeight: number;
  maxHeight: number;
}

export const DEFAULT_WORLD_GEN: WorldGenParams = {
  plainsAmplitude: 3,
  hillsAmplitude: 9,
  mountainAmplitude: 30,
  plainsBase: 24,
  mountainBaseBonus: 14,

  regionScale: 0.006,
  regionOctaves: 3,
  hillsStart: -0.2,
  hillsEnd: 0.1,
  mountainStart: 0.25,
  mountainEnd: 0.55,

  heightScale: 0.02,
  heightOctaves: 4,

  moistureScale: 0.008,
  snowLine: 46,

  dirtDepth: 4,
  sandDepth: 5,

  caveScale: 0.05,
  caveVerticalSquash: 0.6,
  caveThreshold: 0.6,
  caveSurfaceBuffer: 3,

  oreCoalChance: 0.045,
  oreIronChance: 0.02,
  oreIronMaxY: 40,
  oreGoldChance: 0.006,
  oreGoldMaxY: 22,

  treeChancePlains: 0.015,
  treeChanceForest: 0.05,

  minHeight: 4,
  maxHeight: CHUNK_HEIGHT - 8,
};

// ==============================================================================
// CAMERA GÓC NHÌN THỨ NHẤT
// ==============================================================================
export const CAMERA_FOV = 75;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 600;

export const MIN_MOUSE_SENSITIVITY = 0.0008;
export const MAX_MOUSE_SENSITIVITY = 0.0055;
export const DEFAULT_MOUSE_SENSITIVITY = 0.0022;
export const PITCH_LIMIT = Math.PI / 2 - 0.02;

export const CAMERA_START_Y = DEFAULT_WORLD_GEN.plainsBase + 6;

// Màu trời mặc định (fallback trước khi sky-dome/day-night cycle cập nhật)
export const SKY_COLOR = 0x8fc6ec;

// ==============================================================================
// CHU KỲ NGÀY / ĐÊM
// ==============================================================================
export const DEFAULT_DAY_LENGTH_SECONDS = 600; // 1 vòng ngày-đêm ~ 10 phút thực

// ==============================================================================
// PLAYER — KÍCH THƯỚC & VẬT LÝ
// ==============================================================================
export const PLAYER_WIDTH = 0.6;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_EYE_HEIGHT = 1.62;

export const MOVE_SPEED = 5.2;
export const SPRINT_SPEED = 8.2;

export const GRAVITY = 28;
export const JUMP_SPEED = 9;
export const MAX_FALL_SPEED = 40;

export const COLLISION_RESOLUTION_ITERATIONS = 16;

// Vật lý bơi lội đơn giản trong nước
export const WATER_GRAVITY_SCALE = 0.22;
export const WATER_SWIM_UP_SPEED = 3.4;
export const WATER_MAX_FALL_SPEED = 3.2;
export const WATER_HORIZONTAL_SCALE = 0.5;

// ==============================================================================
// TƯƠNG TÁC BLOCK
// ==============================================================================
export const INTERACTION_DISTANCE = 6;

export const HOTBAR_BLOCKS: readonly number[] = [
  BlockType.GRASS, // phím 1
  BlockType.DIRT, // phím 2
  BlockType.STONE, // phím 3
  BlockType.SAND, // phím 4
  BlockType.SNOW, // phím 5
  BlockType.WOOD_LOG, // phím 6
  BlockType.LEAVES, // phím 7
  BlockType.COAL_ORE, // phím 8
  BlockType.IRON_ORE, // phím 9
];

// ==============================================================================
// ÂM LƯỢNG / SETTINGS MẶC ĐỊNH
// ==============================================================================
export const DEFAULT_MASTER_VOLUME = 0.6;
export const DEFAULT_SHOW_FPS = true;
