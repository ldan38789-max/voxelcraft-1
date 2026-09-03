import {
  TILE_BEDROCK,
  TILE_COAL_ORE,
  TILE_DIRT,
  TILE_GOLD_ORE,
  TILE_GRASS_SIDE,
  TILE_GRASS_TOP,
  TILE_IRON_ORE,
  TILE_LEAVES,
  TILE_LOG_SIDE,
  TILE_LOG_TOP,
  TILE_SAND,
  TILE_SNOW,
  TILE_STONE,
  TILE_WATER,
} from "./textureAtlas";

export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  BEDROCK = 4,
  SAND = 5,
  SNOW = 6,
  WOOD_LOG = 7,
  LEAVES = 8,
  COAL_ORE = 9,
  IRON_ORE = 10,
  GOLD_ORE = 11,
  WATER = 12,
}

export type FaceType = "top" | "side" | "bottom";

export const BLOCK_TEXTURES: Record<number, Record<FaceType, number>> = {
  [BlockType.AIR]: { top: TILE_STONE, side: TILE_STONE, bottom: TILE_STONE },
  [BlockType.GRASS]: { top: TILE_GRASS_TOP, side: TILE_GRASS_SIDE, bottom: TILE_DIRT },
  [BlockType.DIRT]: { top: TILE_DIRT, side: TILE_DIRT, bottom: TILE_DIRT },
  [BlockType.STONE]: { top: TILE_STONE, side: TILE_STONE, bottom: TILE_STONE },
  [BlockType.BEDROCK]: { top: TILE_BEDROCK, side: TILE_BEDROCK, bottom: TILE_BEDROCK },
  [BlockType.SAND]: { top: TILE_SAND, side: TILE_SAND, bottom: TILE_SAND },
  [BlockType.SNOW]: { top: TILE_SNOW, side: TILE_SNOW, bottom: TILE_SNOW },
  [BlockType.WOOD_LOG]: { top: TILE_LOG_TOP, side: TILE_LOG_SIDE, bottom: TILE_LOG_TOP },
  [BlockType.LEAVES]: { top: TILE_LEAVES, side: TILE_LEAVES, bottom: TILE_LEAVES },
  [BlockType.COAL_ORE]: { top: TILE_COAL_ORE, side: TILE_COAL_ORE, bottom: TILE_COAL_ORE },
  [BlockType.IRON_ORE]: { top: TILE_IRON_ORE, side: TILE_IRON_ORE, bottom: TILE_IRON_ORE },
  [BlockType.GOLD_ORE]: { top: TILE_GOLD_ORE, side: TILE_GOLD_ORE, bottom: TILE_GOLD_ORE },
  [BlockType.WATER]: { top: TILE_WATER, side: TILE_WATER, bottom: TILE_WATER },
};

/** Trong suốt / cho ánh sáng và mặt kề xuyên qua (dùng để quyết định có vẽ mặt hay không). */
export function isTransparent(blockId: number): boolean {
  return blockId === BlockType.AIR || blockId === BlockType.LEAVES || blockId === BlockType.WATER;
}

/** Có va chạm vật lý hay không (nước không cản người chơi, cho phép bơi). */
export function isSolid(blockId: number): boolean {
  return blockId !== BlockType.AIR && blockId !== BlockType.WATER;
}

export function isWater(blockId: number): boolean {
  return blockId === BlockType.WATER;
}
