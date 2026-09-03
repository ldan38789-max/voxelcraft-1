import { BlockType } from "./blockTypes";
import { CHUNK_HEIGHT, CHUNK_SIZE_X, CHUNK_SIZE_Z, SEA_LEVEL, WorldGenParams } from "./settings";
import { computeColumnInfo, SurfaceBiome, WorldNoises } from "./biome";
import { SeededNoise3D } from "./noise3d";
import { hash2, hash3 } from "./hash";

export interface WorldGenContext {
  seed: number;
  params: WorldGenParams;
  noises: WorldNoises;
  caveNoise: SeededNoise3D;
}

const TREE_MARGIN = 3;
const ORE_SEED_OFFSET = 0x0ea51;
const TREE_SEED_OFFSET = 0x7ee31;
const TRUNK_SEED_OFFSET = 0x55aa1;

export function computeSurfaceHeight(ctx: WorldGenContext, wx: number, wz: number): number {
  return computeColumnInfo(ctx.noises, wx, wz, ctx.params).height;
}

export function generateChunkBlocksInto(ctx: WorldGenContext, cx: number, cz: number, out: Uint8Array): void {
  const { params, seed } = ctx;
  const originX = cx * CHUNK_SIZE_X;
  const originZ = cz * CHUNK_SIZE_Z;
  const planeStride = CHUNK_SIZE_X * CHUNK_SIZE_Z;

  const paddedW = CHUNK_SIZE_X + TREE_MARGIN * 2;
  const paddedD = CHUNK_SIZE_Z + TREE_MARGIN * 2;
  const paddedCount = paddedW * paddedD;

  const colHeights = new Int16Array(paddedCount);
  const colBiomes = new Uint8Array(paddedCount);
  const colTreeChance = new Float32Array(paddedCount);

  for (let pz = 0; pz < paddedD; pz++) {
    const wz = originZ + (pz - TREE_MARGIN);
    const rowBase = pz * paddedW;
    for (let px = 0; px < paddedW; px++) {
      const wx = originX + (px - TREE_MARGIN);
      const info = computeColumnInfo(ctx.noises, wx, wz, params);
      const idx = rowBase + px;
      colHeights[idx] = info.height;
      colBiomes[idx] = info.surfaceBiome;
      colTreeChance[idx] = info.treeChance;
    }
  }

  for (let x = 0; x < CHUNK_SIZE_X; x++) {
    const px = x + TREE_MARGIN;
    for (let z = 0; z < CHUNK_SIZE_Z; z++) {
      const pz = z + TREE_MARGIN;
      const padIdx = pz * paddedW + px;
      const height = colHeights[padIdx];
      const biome = colBiomes[padIdx] as SurfaceBiome;
      const colBase = x + z * CHUNK_SIZE_X;
      const top = height < CHUNK_HEIGHT ? height : CHUNK_HEIGHT - 1;

      const isBeach =
        (biome === SurfaceBiome.PLAINS || biome === SurfaceBiome.HILLS || biome === SurfaceBiome.FOREST) &&
        height <= SEA_LEVEL + 1;

      let surfaceBlock: number;
      let fillerBlock: number;
      let fillerDepth: number;

      if (biome === SurfaceBiome.DESERT || isBeach) {
        surfaceBlock = BlockType.SAND;
        fillerBlock = BlockType.SAND;
        fillerDepth = params.sandDepth;
      } else if (biome === SurfaceBiome.MOUNTAINS) {
        surfaceBlock = height >= params.snowLine ? BlockType.SNOW : BlockType.STONE;
        fillerBlock = BlockType.STONE;
        fillerDepth = 1;
      } else {
        surfaceBlock = height >= params.snowLine ? BlockType.SNOW : BlockType.GRASS;
        fillerBlock = BlockType.DIRT;
        fillerDepth = params.dirtDepth;
      }

      const fillerStart = height - fillerDepth;

      for (let y = 0; y <= top; y++) {
        let block: number;
        if (y === 0) block = BlockType.BEDROCK;
        else if (y < fillerStart) block = BlockType.STONE;
        else if (y < height) block = fillerBlock;
        else block = surfaceBlock;
        out[colBase + y * planeStride] = block;
      }

      // Lấp nước cho các cột thấp hơn mực nước biển (hồ / biển đơn giản)
      if (height < SEA_LEVEL) {
        const waterTop = Math.min(SEA_LEVEL, CHUNK_HEIGHT - 1);
        for (let y = height + 1; y <= waterTop; y++) {
          out[colBase + y * planeStride] = BlockType.WATER;
        }
      }
    }
  }

  const buffer = params.caveSurfaceBuffer;
  for (let x = 0; x < CHUNK_SIZE_X; x++) {
    const wx = originX + x;
    const px = x + TREE_MARGIN;
    for (let z = 0; z < CHUNK_SIZE_Z; z++) {
      const wz = originZ + z;
      const pz = z + TREE_MARGIN;
      const height = colHeights[pz * paddedW + px];
      const colBase = x + z * CHUNK_SIZE_X;
      const yMax = height - buffer;

      for (let y = 2; y <= yMax; y++) {
        const idx = colBase + y * planeStride;
        if (out[idx] !== BlockType.STONE) continue;

        const n = ctx.caveNoise.fbm3D(
          wx * params.caveScale,
          y * params.caveScale * params.caveVerticalSquash,
          wz * params.caveScale,
          3,
          0.5,
          2.0
        );

        if (n > params.caveThreshold) {
          out[idx] = BlockType.AIR;
        }
      }
    }
  }

  for (let x = 0; x < CHUNK_SIZE_X; x++) {
    const wx = originX + x;
    for (let z = 0; z < CHUNK_SIZE_Z; z++) {
      const wz = originZ + z;
      const colBase = x + z * CHUNK_SIZE_X;

      for (let y = 1; y < CHUNK_HEIGHT; y++) {
        const idx = colBase + y * planeStride;
        if (out[idx] !== BlockType.STONE) continue;

        const roll = hash3(seed ^ ORE_SEED_OFFSET, wx, y, wz);
        if (y <= params.oreGoldMaxY && roll < params.oreGoldChance) {
          out[idx] = BlockType.GOLD_ORE;
        } else if (y <= params.oreIronMaxY && roll < params.oreIronChance) {
          out[idx] = BlockType.IRON_ORE;
        } else if (roll < params.oreCoalChance) {
          out[idx] = BlockType.COAL_ORE;
        }
      }
    }
  }

  for (let pz = 0; pz < paddedD; pz++) {
    const wz = originZ + (pz - TREE_MARGIN);
    const rowBase = pz * paddedW;
    for (let px = 0; px < paddedW; px++) {
      const padIdx = rowBase + px;
      const chance = colTreeChance[padIdx];
      if (chance <= 0) continue;
      if (colHeights[padIdx] <= SEA_LEVEL + 1) continue; // không mọc cây sát mép nước

      const wx = originX + (px - TREE_MARGIN);
      const roll = hash2(seed ^ TREE_SEED_OFFSET, wx, wz);
      if (roll >= chance) continue;

      const groundY = colHeights[padIdx];
      if (groundY + 7 >= CHUNK_HEIGHT) continue;

      stampTree(out, seed, originX, originZ, wx, groundY, wz);
    }
  }
}

function stampTree(
  out: Uint8Array,
  seed: number,
  originX: number,
  originZ: number,
  wx: number,
  groundY: number,
  wz: number
): void {
  const planeStride = CHUNK_SIZE_X * CHUNK_SIZE_Z;
  const trunkHeight = 4 + Math.floor(hash3(seed ^ TRUNK_SEED_OFFSET, wx, 0, wz) * 2);

  const setBlock = (lx: number, ly: number, lz: number, block: number, overwrite: boolean): void => {
    if (lx < 0 || lx >= CHUNK_SIZE_X || lz < 0 || lz >= CHUNK_SIZE_Z || ly < 0 || ly >= CHUNK_HEIGHT) return;
    const idx = lx + lz * CHUNK_SIZE_X + ly * planeStride;
    if (!overwrite && out[idx] !== BlockType.AIR) return;
    out[idx] = block;
  };

  const localX = wx - originX;
  const localZ = wz - originZ;

  for (let i = 1; i <= trunkHeight; i++) {
    setBlock(localX, groundY + i, localZ, BlockType.WOOD_LOG, true);
  }

  const topY = groundY + trunkHeight;
  for (let dy = -2; dy <= 2; dy++) {
    const ly = topY + dy;
    const radius = dy >= 2 || dy <= -2 ? 1 : 2;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (dx * dx + dz * dz > radius * radius + 1) continue;
        if (dx === 0 && dz === 0 && dy < 1) continue;
        setBlock(localX + dx, ly, localZ + dz, BlockType.LEAVES, false);
      }
    }
  }
}
