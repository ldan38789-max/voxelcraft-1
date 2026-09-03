import * as THREE from "three";
import { BlockType } from "./blockTypes";
import { ChunkManager } from "./chunkManager";
import { CHUNK_HEIGHT, CHUNK_SIZE_X, CHUNK_SIZE_Z, DEFAULT_RENDER_DISTANCE } from "./settings";
import { FlatTerrainGenerator, TerrainGenerator } from "./terrain";

export class World {
  readonly chunkManager: ChunkManager;

  constructor(
    scene: THREE.Scene,
    material: THREE.Material,
    waterMaterial: THREE.Material,
    terrainGenerator: TerrainGenerator = new FlatTerrainGenerator(),
    initialPlayerX = 0,
    initialPlayerZ = 0,
    renderDistance: number = DEFAULT_RENDER_DISTANCE
  ) {
    this.chunkManager = new ChunkManager(scene, material, waterMaterial, terrainGenerator, renderDistance);
    this.chunkManager.setWorld(this);
    this.chunkManager.update(initialPlayerX, initialPlayerZ, true);
  }

  getBlock(wx: number, wy: number, wz: number): number {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return BlockType.AIR;

    const [cx, cz] = ChunkManager.worldToChunk(wx, wz);
    const chunk = this.chunkManager.getChunk(cx, cz);
    if (!chunk) return BlockType.AIR;

    const lx = wx - cx * CHUNK_SIZE_X;
    const lz = wz - cz * CHUNK_SIZE_Z;
    return chunk.getBlock(lx, wy, lz);
  }

  setBlock(wx: number, wy: number, wz: number, blockId: number): void {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return;

    const [cx, cz] = ChunkManager.worldToChunk(wx, wz);
    const chunk = this.chunkManager.getChunk(cx, cz);
    if (!chunk) return;

    const lx = wx - cx * CHUNK_SIZE_X;
    const lz = wz - cz * CHUNK_SIZE_Z;
    chunk.setBlock(lx, wy, lz, blockId);

    this.chunkManager.markDirty(cx, cz);
    if (lx === 0) this.chunkManager.markDirty(cx - 1, cz);
    if (lx === CHUNK_SIZE_X - 1) this.chunkManager.markDirty(cx + 1, cz);
    if (lz === 0) this.chunkManager.markDirty(cx, cz - 1);
    if (lz === CHUNK_SIZE_Z - 1) this.chunkManager.markDirty(cx, cz + 1);
  }

  getHighestBlockY(wx: number, wz: number): number {
    const [cx, cz] = ChunkManager.worldToChunk(wx, wz);
    const chunk = this.chunkManager.getChunk(cx, cz);
    if (!chunk) return 0; // Coi như trời quang nếu chunk chưa tải (tránh bóng giả)
    const lx = wx - cx * CHUNK_SIZE_X;
    const lz = wz - cz * CHUNK_SIZE_Z;
    return chunk.heightMap[lx + lz * CHUNK_SIZE_X];
  }

  update(playerX: number, playerZ: number): void {
    this.chunkManager.update(playerX, playerZ);
  }

  /** Áp dụng render distance mới (từ Settings) và buộc tải/hủy chunk ngay lập tức. */
  setRenderDistance(distance: number, playerX: number, playerZ: number): void {
    this.chunkManager.setRenderDistance(distance);
    this.chunkManager.update(playerX, playerZ, true);
  }

  getSpawnLoadProgress(px: number, pz: number, radius: number): number {
    return this.chunkManager.getSpawnLoadProgress(px, pz, radius);
  }

  get loadedChunkCount(): number {
    return this.chunkManager.chunks.size;
  }

  get pendingRebuildCount(): number {
    return this.chunkManager.pendingRebuildCount;
  }

  get renderDistance(): number {
    return this.chunkManager.currentRenderDistance;
  }

  dispose(): void {
    this.chunkManager.dispose();
  }
}
