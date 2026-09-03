import { SeededNoise2D } from "./noise";
import type { WorldGenParams } from "./settings";

export enum SurfaceBiome {
  PLAINS = 0,
  HILLS = 1,
  FOREST = 2,
  DESERT = 3,
  MOUNTAINS = 4,
}

export interface WorldNoises {
  region: SeededNoise2D;
  height: SeededNoise2D;
  moisture: SeededNoise2D;
}

export interface ColumnInfo {
  height: number;
  surfaceBiome: SurfaceBiome;
  isMountain: boolean;
  treeChance: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function computeColumnInfo(
  noises: WorldNoises,
  wx: number,
  wz: number,
  params: WorldGenParams
): ColumnInfo {
  const r = noises.region.fbm(wx * params.regionScale, wz * params.regionScale, params.regionOctaves, 0.5, 2.0);

  const hillsFactor = smoothstep(params.hillsStart, params.hillsEnd, r);
  const mountainFactor = smoothstep(params.mountainStart, params.mountainEnd, r);

  const amplitude = lerp(
    lerp(params.plainsAmplitude, params.hillsAmplitude, hillsFactor),
    params.mountainAmplitude,
    mountainFactor
  );
  const baseHeight = params.plainsBase + mountainFactor * params.mountainBaseBonus;

  let hRaw = noises.height.fbm(wx * params.heightScale, wz * params.heightScale, params.heightOctaves, 0.5, 2.0);
  if (mountainFactor > 0) {
    const ridged = 1 - Math.abs(hRaw) * 2;
    hRaw = lerp(hRaw, ridged, mountainFactor);
  }

  let height = Math.round(baseHeight + hRaw * amplitude);
  if (height < params.minHeight) height = params.minHeight;
  if (height > params.maxHeight) height = params.maxHeight;

  const isMountain = mountainFactor > 0.5;

  let surfaceBiome: SurfaceBiome;
  let treeChance = 0;

  if (isMountain) {
    surfaceBiome = SurfaceBiome.MOUNTAINS;
  } else {
    const moisture = noises.moisture.fbm(wx * params.moistureScale, wz * params.moistureScale, 2, 0.5, 2.0);
    if (moisture < -0.2) {
      surfaceBiome = SurfaceBiome.DESERT;
    } else if (moisture > 0.25) {
      surfaceBiome = SurfaceBiome.FOREST;
      treeChance = params.treeChanceForest;
    } else if (hillsFactor > 0.4) {
      surfaceBiome = SurfaceBiome.HILLS;
      treeChance = params.treeChancePlains * 1.6;
    } else {
      surfaceBiome = SurfaceBiome.PLAINS;
      treeChance = params.treeChancePlains;
    }
  }

  return { height, surfaceBiome, isMountain, treeChance };
}
