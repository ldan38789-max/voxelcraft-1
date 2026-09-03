import { isSolid } from "./blockTypes";

export interface RaycastResult {
  hit: boolean;
  blockX: number;
  blockY: number;
  blockZ: number;
  normalX: number;
  normalY: number;
  normalZ: number;
  distance: number;
}

export interface RaycastWorld {
  getBlock(wx: number, wy: number, wz: number): number;
}

export function voxelRaycast(
  world: RaycastWorld,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDistance: number
): RaycastResult {
  const miss: RaycastResult = {
    hit: false,
    blockX: 0,
    blockY: 0,
    blockZ: 0,
    normalX: 0,
    normalY: 0,
    normalZ: 0,
    distance: 0,
  };

  const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
  const stepZ = dz > 0 ? 1 : dz < 0 ? -1 : 0;

  const tDeltaX = stepX !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / dy) : Infinity;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dz) : Infinity;

  let vx = Math.floor(ox);
  let vy = Math.floor(oy);
  let vz = Math.floor(oz);

  const nextBoundaryX = stepX > 0 ? vx + 1 : vx;
  const nextBoundaryY = stepY > 0 ? vy + 1 : vy;
  const nextBoundaryZ = stepZ > 0 ? vz + 1 : vz;

  let tMaxX = stepX !== 0 ? (nextBoundaryX - ox) / dx : Infinity;
  let tMaxY = stepY !== 0 ? (nextBoundaryY - oy) / dy : Infinity;
  let tMaxZ = stepZ !== 0 ? (nextBoundaryZ - oz) / dz : Infinity;

  let nx = 0;
  let ny = 0;
  let nz = 0;
  let t = 0;

  for (;;) {
    const block = world.getBlock(vx, vy, vz);
    if (isSolid(block)) {
      return {
        hit: true,
        blockX: vx,
        blockY: vy,
        blockZ: vz,
        normalX: nx,
        normalY: ny,
        normalZ: nz,
        distance: t,
      };
    }

    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      t = tMaxX;
      if (t > maxDistance) return miss;
      vx += stepX;
      tMaxX += tDeltaX;
      nx = -stepX;
      ny = 0;
      nz = 0;
    } else if (tMaxY < tMaxZ) {
      t = tMaxY;
      if (t > maxDistance) return miss;
      vy += stepY;
      tMaxY += tDeltaY;
      nx = 0;
      ny = -stepY;
      nz = 0;
    } else {
      t = tMaxZ;
      if (t > maxDistance) return miss;
      vz += stepZ;
      tMaxZ += tDeltaZ;
      nx = 0;
      ny = 0;
      nz = -stepZ;
    }
  }
}
