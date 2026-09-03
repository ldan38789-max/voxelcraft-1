import { BlockType, BLOCK_TEXTURES, isTransparent } from "./blockTypes";
import { Chunk } from "./chunk";
import { FACES, FaceDef } from "./faces";
import { CHUNK_HEIGHT, CHUNK_SIZE_X, CHUNK_SIZE_Z } from "./settings";
import { getTileUV } from "./textureAtlas";
import type { World } from "./world";

export interface ChunkMeshData {
  positions: Float32Array;
  uvs: Float32Array;
  lights: Float32Array;
  indices: Uint16Array | Uint32Array;
}

export interface WaterMeshData {
  positions: Float32Array;
  lights: Float32Array;
  tops: Float32Array;
  indices: Uint16Array | Uint32Array;
}

export interface ChunkMeshResult {
  opaque: ChunkMeshData | null;
  water: WaterMeshData | null;
}

function faceBaseLight(world: World, wx: number, wy: number, wz: number, face: FaceDef): number {
  const lightWX = wx + face.dir[0];
  const lightWZ = wz + face.dir[2];

  let faceSunlight = 0.25; // ambient
  const h = world.getHighestBlockY(lightWX, lightWZ);
  if (wy >= h) {
    faceSunlight = 1.0;
  } else {
    const hwX1 = world.getHighestBlockY(lightWX + 1, lightWZ);
    const hwX2 = world.getHighestBlockY(lightWX - 1, lightWZ);
    const hwZ1 = world.getHighestBlockY(lightWX, lightWZ + 1);
    const hwZ2 = world.getHighestBlockY(lightWX, lightWZ - 1);
    if (wy >= hwX1 || wy >= hwX2 || wy >= hwZ1 || wy >= hwZ2) {
      faceSunlight = 0.65;
    }
  }

  let dirFactor = 0.8;
  if (face.dir[1] > 0) dirFactor = 1.0;
  else if (face.dir[1] < 0) dirFactor = 0.5;
  else if (Math.abs(face.dir[2]) > 0) dirFactor = 0.85;
  else if (Math.abs(face.dir[0]) > 0) dirFactor = 0.7;

  return faceSunlight * dirFactor;
}

function vertexAOMultiplier(
  world: World,
  lightWX: number,
  lightWY: number,
  lightWZ: number,
  face: FaceDef,
  corner: readonly [number, number, number]
): number {
  const vx = corner[0] * 2 - 1;
  const vy = corner[1] * 2 - 1;
  const vz = corner[2] * 2 - 1;

  let dx1 = 0,
    dy1 = 0,
    dz1 = 0;
  let dx2 = 0,
    dy2 = 0,
    dz2 = 0;

  if (face.dir[0] !== 0) {
    dy1 = vy;
    dz2 = vz;
  } else if (face.dir[1] !== 0) {
    dx1 = vx;
    dz2 = vz;
  } else {
    dx1 = vx;
    dy2 = vy;
  }

  const side1 = !isTransparent(world.getBlock(lightWX + dx1, lightWY + dy1, lightWZ + dz1));
  const side2 = !isTransparent(world.getBlock(lightWX + dx2, lightWY + dy2, lightWZ + dz2));
  const cornerBlock = !isTransparent(world.getBlock(lightWX + dx1 + dx2, lightWY + dy1 + dy2, lightWZ + dz1 + dz2));

  let ao = 3;
  if (side1 && side2) ao = 0;
  else ao = 3 - (side1 ? 1 : 0) - (side2 ? 1 : 0) - (cornerBlock ? 1 : 0);

  return [0.4, 0.6, 0.8, 1.0][ao];
}

export function buildChunkMesh(chunk: Chunk, world: World): ChunkMeshResult {
  const oPositions: number[] = [];
  const oUvs: number[] = [];
  const oLights: number[] = [];
  const oIndices: number[] = [];
  let oVertexCount = 0;

  const wPositions: number[] = [];
  const wLights: number[] = [];
  const wTops: number[] = [];
  const wIndices: number[] = [];
  let wVertexCount = 0;

  const originX = chunk.worldOriginX;
  const originZ = chunk.worldOriginZ;

  for (let x = 0; x < CHUNK_SIZE_X; x++) {
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let z = 0; z < CHUNK_SIZE_Z; z++) {
        const blockId = chunk.getBlock(x, y, z);
        if (blockId === BlockType.AIR) continue;

        const wx = originX + x;
        const wy = y;
        const wz = originZ + z;
        const isWaterBlock = blockId === BlockType.WATER;
        const textures = isWaterBlock ? null : BLOCK_TEXTURES[blockId];

        for (const face of FACES) {
          const nx = x + face.dir[0];
          const ny = y + face.dir[1];
          const nz = z + face.dir[2];

          let neighborBlock: number;
          const insideChunk =
            nx >= 0 && nx < CHUNK_SIZE_X && ny >= 0 && ny < CHUNK_HEIGHT && nz >= 0 && nz < CHUNK_SIZE_Z;
          if (insideChunk) {
            neighborBlock = chunk.getBlock(nx, ny, nz);
          } else {
            neighborBlock = world.getBlock(wx + face.dir[0], wy + face.dir[1], wz + face.dir[2]);
          }

          if (isWaterBlock) {
            if (!isTransparent(neighborBlock) || neighborBlock === BlockType.WATER) continue;
          } else if (!isTransparent(neighborBlock)) {
            continue;
          }

          const baseLight = faceBaseLight(world, wx, wy, wz, face);

          if (isWaterBlock) {
            const base = wVertexCount;
            const topFlag = face.dir[1] > 0 ? 1 : 0;
            for (let i = 0; i < 4; i++) {
              const corner = face.corners[i];
              wPositions.push(wx + corner[0], wy + corner[1], wz + corner[2]);
              wLights.push(baseLight);
              wTops.push(topFlag);
            }
            wIndices.push(base, base + 1, base + 2, base, base + 2, base + 3);
            wVertexCount += 4;
            continue;
          }

          const lightWX = wx + face.dir[0];
          const lightWY = wy + face.dir[1];
          const lightWZ = wz + face.dir[2];

          const tileId = textures![face.faceType];
          const [u0, v0, u1, v1] = getTileUV(tileId);

          const base = oVertexCount;
          for (let i = 0; i < 4; i++) {
            const corner = face.corners[i];
            const aoMult = vertexAOMultiplier(world, lightWX, lightWY, lightWZ, face, corner);
            const vertexLight = baseLight * aoMult;

            oPositions.push(wx + corner[0], wy + corner[1], wz + corner[2]);
            oLights.push(vertexLight);

            const [lu, lv] = face.uvs[i];
            oUvs.push(u0 + lu * (u1 - u0), v1 - lv * (v1 - v0));
          }

          oIndices.push(base, base + 1, base + 2, base, base + 2, base + 3);
          oVertexCount += 4;
        }
      }
    }
  }

  const opaque: ChunkMeshData | null =
    oVertexCount === 0
      ? null
      : {
          positions: new Float32Array(oPositions),
          uvs: new Float32Array(oUvs),
          lights: new Float32Array(oLights),
          indices: oVertexCount > 65535 ? new Uint32Array(oIndices) : new Uint16Array(oIndices),
        };

  const water: WaterMeshData | null =
    wVertexCount === 0
      ? null
      : {
          positions: new Float32Array(wPositions),
          lights: new Float32Array(wLights),
          tops: new Float32Array(wTops),
          indices: wVertexCount > 65535 ? new Uint32Array(wIndices) : new Uint16Array(wIndices),
        };

  return { opaque, water };
}
