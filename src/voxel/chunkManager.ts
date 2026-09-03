import * as THREE from "three";
import { Chunk } from "./chunk";
import { buildChunkMesh } from "./meshBuilder";
import {
  CHUNK_SIZE_X,
  CHUNK_SIZE_Z,
  CHUNK_UNLOAD_BUFFER,
  DEFAULT_RENDER_DISTANCE,
  MAX_CHUNK_LOADS_PER_FRAME,
  MAX_CHUNK_REBUILDS_PER_FRAME,
  MAX_RENDER_DISTANCE,
  MIN_RENDER_DISTANCE,
} from "./settings";
import { TerrainGenerator } from "./terrain";
import type { World } from "./world";
import { storage } from "./storage";

function key(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

interface LoadQueueItem {
  cx: number;
  cz: number;
  dist: number;
}

export class ChunkManager {
  readonly chunks = new Map<string, Chunk>();
  private readonly rebuildQueue = new Set<string>();
  private readonly loadingChunks = new Set<string>();
  private loadQueue: LoadQueueItem[] = [];
  private lastPlayerChunkKey: string | null = null;
  private world: World | null = null;
  private renderDistance: number;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly material: THREE.Material,
    private readonly waterMaterial: THREE.Material,
    private readonly terrain: TerrainGenerator,
    renderDistance: number = DEFAULT_RENDER_DISTANCE
  ) {
    this.renderDistance = renderDistance;
  }

  setWorld(world: World): void {
    this.world = world;
  }

  static worldToChunk(wx: number, wz: number): [number, number] {
    return [Math.floor(wx / CHUNK_SIZE_X), Math.floor(wz / CHUNK_SIZE_Z)];
  }

  getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(key(cx, cz));
  }

  get pendingRebuildCount(): number {
    return this.rebuildQueue.size;
  }

  get currentRenderDistance(): number {
    return this.renderDistance;
  }

  /**
   * Cho phép Settings đổi render distance khi đang chơi: xóa lại hàng đợi load
   * và để update() tự tính lại các chunk cần tải / hủy trong lần gọi kế tiếp.
   */
  setRenderDistance(distance: number): void {
    const clamped = Math.max(MIN_RENDER_DISTANCE, Math.min(MAX_RENDER_DISTANCE, Math.round(distance)));
    if (clamped === this.renderDistance) return;
    this.renderDistance = clamped;
    this.lastPlayerChunkKey = null;
  }

  private neighborsOf(cx: number, cz: number): Array<[number, number]> {
    return [
      [cx + 1, cz],
      [cx - 1, cz],
      [cx, cz + 1],
      [cx, cz - 1],
    ];
  }

  markDirty(cx: number, cz: number): void {
    const chunk = this.getChunk(cx, cz);
    if (chunk) {
      chunk.needsRebuild = true;
      this.rebuildQueue.add(key(cx, cz));
    }
  }

  async loadChunk(cx: number, cz: number): Promise<void> {
    const k = key(cx, cz);
    if (this.chunks.has(k) || this.loadingChunks.has(k)) return;
    this.loadingChunks.add(k);

    const chunk = new Chunk(cx, cz, this.material, this.waterMaterial);

    const savedBlocks = await storage.loadChunk(cx, cz);
    if (savedBlocks) {
      chunk.blocks.set(savedBlocks);
      chunk.isModified = true;
    } else {
      this.terrain.generateChunk(chunk);
    }

    chunk.calculateHeightMap();

    this.chunks.set(k, chunk);
    this.scene.add(chunk.mesh);
    this.scene.add(chunk.waterMesh);
    this.rebuildQueue.add(k);
    this.loadingChunks.delete(k);

    for (const [ncx, ncz] of this.neighborsOf(cx, cz)) {
      this.markDirty(ncx, ncz);
    }
  }

  unloadChunk(cx: number, cz: number): void {
    const k = key(cx, cz);
    const chunk = this.chunks.get(k);
    if (!chunk) return;

    this.scene.remove(chunk.mesh);
    this.scene.remove(chunk.waterMesh);
    chunk.dispose();
    this.chunks.delete(k);
    this.rebuildQueue.delete(k);

    for (const [ncx, ncz] of this.neighborsOf(cx, cz)) {
      this.markDirty(ncx, ncz);
    }
  }

  update(playerX: number, playerZ: number, force = false): void {
    const [pcx, pcz] = ChunkManager.worldToChunk(playerX, playerZ);
    const currentKey = key(pcx, pcz);

    if (force || this.lastPlayerChunkKey !== currentKey) {
      this.lastPlayerChunkKey = currentKey;
      this.rebuildLoadQueue(pcx, pcz);
      this.unloadFarChunks(pcx, pcz);
    }

    this.processLoadQueue();
    this.processRebuildQueue();
  }

  private rebuildLoadQueue(pcx: number, pcz: number): void {
    const r = this.renderDistance;
    const items: LoadQueueItem[] = [];
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const distSq = dx * dx + dz * dz;
        if (distSq <= r * r) {
          const cx = pcx + dx;
          const cz = pcz + dz;
          const k = key(cx, cz);
          if (!this.chunks.has(k) && !this.loadingChunks.has(k)) {
            items.push({ cx, cz, dist: distSq });
          }
        }
      }
    }
    items.sort((a, b) => a.dist - b.dist);
    this.loadQueue = items;
  }

  // Trải việc sinh chunk (terrain generation) ra nhiều frame để tránh giật CPU
  // khi có nhiều chunk cần tải cùng lúc (ví dụ vừa spawn hoặc đổi render distance).
  private processLoadQueue(): void {
    let processed = 0;
    while (processed < MAX_CHUNK_LOADS_PER_FRAME && this.loadQueue.length > 0) {
      const item = this.loadQueue.shift()!;
      const k = key(item.cx, item.cz);
      if (this.chunks.has(k) || this.loadingChunks.has(k)) continue;
      this.loadChunk(item.cx, item.cz);
      processed++;
    }
  }

  private unloadFarChunks(pcx: number, pcz: number): void {
    const unloadRadius = this.renderDistance + CHUNK_UNLOAD_BUFFER;
    for (const k of Array.from(this.chunks.keys())) {
      const [cxStr, czStr] = k.split(",");
      const cx = Number(cxStr);
      const cz = Number(czStr);
      const dx = cx - pcx;
      const dz = cz - pcz;
      if (dx * dx + dz * dz > unloadRadius * unloadRadius) {
        this.unloadChunk(cx, cz);
      }
    }
  }

  private processRebuildQueue(): void {
    if (!this.world) return;
    let processed = 0;

    for (const k of Array.from(this.rebuildQueue)) {
      if (processed >= MAX_CHUNK_REBUILDS_PER_FRAME) break;

      const chunk = this.chunks.get(k);
      if (!chunk) {
        this.rebuildQueue.delete(k);
        continue;
      }

      if (chunk.needsRebuild) {
        const { opaque, water } = buildChunkMesh(chunk, this.world);
        chunk.applyMeshData(opaque);
        chunk.applyWaterMeshData(water);
        chunk.needsRebuild = false;
        processed++;
      }
      this.rebuildQueue.delete(k);
    }
  }

  /** Tỉ lệ chunk quanh spawn (bán kính nhỏ) đã tải xong — dùng cho màn hình loading. */
  getSpawnLoadProgress(px: number, pz: number, radius: number): number {
    const [pcx, pcz] = ChunkManager.worldToChunk(px, pz);
    let total = 0;
    let loaded = 0;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (dx * dx + dz * dz <= radius * radius) {
          total++;
          if (this.chunks.has(key(pcx + dx, pcz + dz))) loaded++;
        }
      }
    }
    return total === 0 ? 1 : loaded / total;
  }

  dispose(): void {
    for (const chunk of this.chunks.values()) {
      this.scene.remove(chunk.mesh);
      this.scene.remove(chunk.waterMesh);
      chunk.dispose();
    }
    this.chunks.clear();
    this.rebuildQueue.clear();
    this.loadingChunks.clear();
    this.loadQueue = [];
  }
}
