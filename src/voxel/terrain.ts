import { Chunk } from "./chunk";
import { BlockType } from "./blockTypes";
import { SeededNoise2D } from "./noise";
import { SeededNoise3D } from "./noise3d";
import { computeSurfaceHeight, generateChunkBlocksInto, WorldGenContext } from "./terrainCore";
import {
  CHUNK_HEIGHT,
  DEFAULT_WORLD_GEN,
  DEFAULT_WORLD_SEED,
  TERRAIN_BEDROCK_HEIGHT,
  TERRAIN_GRASS_HEIGHT,
  WorldGenParams,
} from "./settings";

export interface TerrainGenerator {
  generateChunk(chunk: Chunk): void;
  getSurfaceHeight?(wx: number, wz: number): number;
}

export class FlatTerrainGenerator implements TerrainGenerator {
  constructor(
    private readonly bedrockHeight: number = TERRAIN_BEDROCK_HEIGHT,
    private readonly grassHeight: number = TERRAIN_GRASS_HEIGHT
  ) {}

  generateChunk(chunk: Chunk): void {
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      let blockId: BlockType;
      if (y <= this.bedrockHeight) {
        blockId = BlockType.STONE;
      } else if (y < this.grassHeight) {
        blockId = BlockType.DIRT;
      } else if (y === this.grassHeight) {
        blockId = BlockType.GRASS;
      } else {
        break;
      }
      chunk.fillLayer(y, blockId);
    }
    chunk.calculateHeightMap();
    chunk.needsRebuild = true;
  }
}

export class ProceduralTerrainGenerator implements TerrainGenerator {
  readonly seed: number;
  private readonly ctx: WorldGenContext;

  constructor(seed: number = DEFAULT_WORLD_SEED, params: WorldGenParams = DEFAULT_WORLD_GEN) {
    this.seed = seed >>> 0;
    this.ctx = {
      seed: this.seed,
      params,
      noises: {
        region: new SeededNoise2D((this.seed ^ 0x1000193) >>> 0),
        height: new SeededNoise2D((this.seed ^ 0x2000193) >>> 0),
        moisture: new SeededNoise2D((this.seed ^ 0x3000193) >>> 0),
      },
      caveNoise: new SeededNoise3D((this.seed ^ 0x4000193) >>> 0),
    };
  }

  getSurfaceHeight(wx: number, wz: number): number {
    return computeSurfaceHeight(this.ctx, wx, wz);
  }

  generateChunk(chunk: Chunk): void {
    generateChunkBlocksInto(this.ctx, chunk.cx, chunk.cz, chunk.blocks);
    chunk.calculateHeightMap();
    chunk.needsRebuild = true;
  }
}
