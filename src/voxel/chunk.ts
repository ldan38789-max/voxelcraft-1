import * as THREE from "three";
import { BlockType } from "./blockTypes";
import { CHUNK_HEIGHT, CHUNK_SIZE_X, CHUNK_SIZE_Z } from "./settings";
import type { ChunkMeshData, WaterMeshData } from "./meshBuilder";

export class Chunk {
  readonly cx: number;
  readonly cz: number;
  readonly blocks: Uint8Array;
  readonly heightMap: Uint8Array;
  needsRebuild = true;
  isModified = false;
  readonly mesh: THREE.Mesh;
  readonly waterMesh: THREE.Mesh;

  constructor(cx: number, cz: number, material: THREE.Material, waterMaterial: THREE.Material) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_SIZE_X * CHUNK_HEIGHT * CHUNK_SIZE_Z);
    this.heightMap = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Z);

    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
    this.mesh.matrixAutoUpdate = false;
    this.mesh.name = `chunk_${cx}_${cz}`;

    this.waterMesh = new THREE.Mesh(new THREE.BufferGeometry(), waterMaterial);
    this.waterMesh.matrixAutoUpdate = false;
    this.waterMesh.name = `chunk_water_${cx}_${cz}`;
    this.waterMesh.renderOrder = 5;
  }

  get worldOriginX(): number {
    return this.cx * CHUNK_SIZE_X;
  }

  get worldOriginZ(): number {
    return this.cz * CHUNK_SIZE_Z;
  }

  private index(x: number, y: number, z: number): number {
    return x + z * CHUNK_SIZE_X + y * CHUNK_SIZE_X * CHUNK_SIZE_Z;
  }

  private inBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && x < CHUNK_SIZE_X && y >= 0 && y < CHUNK_HEIGHT && z >= 0 && z < CHUNK_SIZE_Z;
  }

  getBlock(x: number, y: number, z: number): number {
    if (!this.inBounds(x, y, z)) return BlockType.AIR;
    return this.blocks[this.index(x, y, z)];
  }

  setBlock(x: number, y: number, z: number, blockId: number): void {
    if (!this.inBounds(x, y, z)) return;
    this.blocks[this.index(x, y, z)] = blockId;
    this.needsRebuild = true;
    this.isModified = true;

    // Update heightMap
    const hIdx = x + z * CHUNK_SIZE_X;
    if (blockId !== BlockType.AIR) {
      if (y > this.heightMap[hIdx]) {
        this.heightMap[hIdx] = y;
      }
    } else {
      if (y === this.heightMap[hIdx]) {
        let ny = y;
        while (ny >= 0 && this.getBlock(x, ny, z) === BlockType.AIR) {
          ny--;
        }
        this.heightMap[hIdx] = ny;
      }
    }
  }

  setBlockRaw(x: number, y: number, z: number, blockId: number): void {
    this.blocks[this.index(x, y, z)] = blockId;
  }

  fillLayer(y: number, blockId: number): void {
    const rowStart = y * CHUNK_SIZE_X * CHUNK_SIZE_Z;
    this.blocks.fill(blockId, rowStart, rowStart + CHUNK_SIZE_X * CHUNK_SIZE_Z);
  }

  calculateHeightMap(): void {
    for (let x = 0; x < CHUNK_SIZE_X; x++) {
      for (let z = 0; z < CHUNK_SIZE_Z; z++) {
        let y = CHUNK_HEIGHT - 1;
        while (y >= 0 && this.getBlock(x, y, z) === BlockType.AIR) {
          y--;
        }
        this.heightMap[x + z * CHUNK_SIZE_X] = y;
      }
    }
  }

  applyMeshData(data: ChunkMeshData | null): void {
    const oldGeometry = this.mesh.geometry;
    const newGeometry = new THREE.BufferGeometry();

    if (data) {
      newGeometry.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
      newGeometry.setAttribute("uv", new THREE.BufferAttribute(data.uvs, 2));
      newGeometry.setAttribute("lightValue", new THREE.BufferAttribute(data.lights, 1));
      newGeometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
      newGeometry.computeBoundingSphere();
      newGeometry.computeBoundingBox();
    }

    this.mesh.geometry = newGeometry;
    oldGeometry.dispose();
  }

  applyWaterMeshData(data: WaterMeshData | null): void {
    const oldGeometry = this.waterMesh.geometry;
    const newGeometry = new THREE.BufferGeometry();

    if (data) {
      newGeometry.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
      newGeometry.setAttribute("lightValue", new THREE.BufferAttribute(data.lights, 1));
      newGeometry.setAttribute("topFlag", new THREE.BufferAttribute(data.tops, 1));
      newGeometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
      newGeometry.computeBoundingSphere();
      newGeometry.computeBoundingBox();
    }

    this.waterMesh.geometry = newGeometry;
    oldGeometry.dispose();
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.waterMesh.geometry.dispose();
  }
}
