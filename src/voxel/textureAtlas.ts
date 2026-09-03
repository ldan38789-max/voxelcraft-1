import * as THREE from "three";

export const TILE_PX = 32;
export const ATLAS_COLS = 4;
export const ATLAS_ROWS = 4;

export const TILE_GRASS_TOP = 0;
export const TILE_GRASS_SIDE = 1;
export const TILE_DIRT = 2;
export const TILE_STONE = 3;
export const TILE_BEDROCK = 4;
export const TILE_SAND = 5;
export const TILE_SNOW = 6;
export const TILE_LOG_TOP = 7;
export const TILE_LOG_SIDE = 8;
export const TILE_LEAVES = 9;
export const TILE_COAL_ORE = 10;
export const TILE_IRON_ORE = 11;
export const TILE_GOLD_ORE = 12;
export const TILE_WATER = 13;

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  color: [number, number, number],
  seed: number,
  noiseAmount = 34
): void {
  const x0 = col * TILE_PX;
  const y0 = row * TILE_PX;
  const rand = mulberry32(seed);
  const img = ctx.createImageData(TILE_PX, TILE_PX);

  for (let y = 0; y < TILE_PX; y++) {
    for (let x = 0; x < TILE_PX; x++) {
      const noise = (rand() - 0.5) * noiseAmount;
      let r = color[0] + noise;
      let g = color[1] + noise;
      let b = color[2] + noise;

      if (x === 0 || y === 0 || x === TILE_PX - 1 || y === TILE_PX - 1) {
        r -= 16;
        g -= 16;
        b -= 16;
      }

      const idx = (y * TILE_PX + x) * 4;
      img.data[idx] = clamp255(r);
      img.data[idx + 1] = clamp255(g);
      img.data[idx + 2] = clamp255(b);
      img.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, x0, y0);
}

function drawSpeckles(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  color: [number, number, number],
  seed: number,
  count: number,
  dotSize = 3
): void {
  const x0 = col * TILE_PX;
  const y0 = row * TILE_PX;
  const rand = mulberry32(seed);
  ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rand() * (TILE_PX - dotSize));
    const y = Math.floor(rand() * (TILE_PX - dotSize));
    ctx.fillRect(x0 + x, y0 + y, dotSize, dotSize);
  }
}

function drawLogTopRings(ctx: CanvasRenderingContext2D, col: number, row: number): void {
  const x0 = col * TILE_PX;
  const y0 = row * TILE_PX;
  const cx = x0 + TILE_PX / 2;
  const cy = y0 + TILE_PX / 2;
  ctx.strokeStyle = "rgba(80,52,26,0.55)";
  ctx.lineWidth = 1;
  for (let r = 3; r < TILE_PX / 2; r += 4) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawLogSideStripes(ctx: CanvasRenderingContext2D, col: number, row: number, seed: number): void {
  const x0 = col * TILE_PX;
  const y0 = row * TILE_PX;
  const rand = mulberry32(seed);
  ctx.strokeStyle = "rgba(60,40,20,0.45)";
  ctx.lineWidth = 1;
  for (let x = 2; x < TILE_PX; x += 5) {
    const jitter = Math.floor(rand() * 2);
    ctx.beginPath();
    ctx.moveTo(x0 + x + jitter, y0);
    ctx.lineTo(x0 + x + jitter, y0 + TILE_PX);
    ctx.stroke();
  }
}

export function createTextureAtlas(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_COLS * TILE_PX;
  canvas.height = ATLAS_ROWS * TILE_PX;
  const ctx = canvas.getContext("2d")!;

  const at = (id: number): [number, number] => [id % ATLAS_COLS, Math.floor(id / ATLAS_COLS)];

  drawTile(ctx, ...at(TILE_GRASS_TOP), [92, 196, 68], 11);
  drawTile(ctx, ...at(TILE_GRASS_SIDE), [121, 96, 61], 22);
  drawTile(ctx, ...at(TILE_DIRT), [133, 96, 62], 33);
  drawTile(ctx, ...at(TILE_STONE), [122, 122, 124], 44);
  drawTile(ctx, ...at(TILE_BEDROCK), [58, 58, 60], 55, 46);
  drawTile(ctx, ...at(TILE_SAND), [223, 208, 149], 66, 22);
  drawTile(ctx, ...at(TILE_SNOW), [238, 244, 250], 77, 16);
  drawTile(ctx, ...at(TILE_LOG_TOP), [178, 138, 90], 88, 18);
  drawTile(ctx, ...at(TILE_LOG_SIDE), [110, 78, 46], 99, 20);
  drawTile(ctx, ...at(TILE_LEAVES), [58, 138, 56], 111, 30);
  drawTile(ctx, ...at(TILE_COAL_ORE), [122, 122, 124], 44);
  drawTile(ctx, ...at(TILE_IRON_ORE), [122, 122, 124], 44);
  drawTile(ctx, ...at(TILE_GOLD_ORE), [122, 122, 124], 44);
  drawTile(ctx, ...at(TILE_WATER), [47, 111, 168], 133, 20);

  drawLogTopRings(ctx, ...at(TILE_LOG_TOP));
  drawLogSideStripes(ctx, ...at(TILE_LOG_SIDE), 123);

  drawSpeckles(ctx, ...at(TILE_COAL_ORE), [30, 30, 32], 201, 10, 3);
  drawSpeckles(ctx, ...at(TILE_IRON_ORE), [199, 156, 118], 202, 9, 3);
  drawSpeckles(ctx, ...at(TILE_GOLD_ORE), [237, 205, 76], 203, 8, 3);

  const sideX0 = (TILE_GRASS_SIDE % ATLAS_COLS) * TILE_PX;
  const sideY0 = Math.floor(TILE_GRASS_SIDE / ATLAS_COLS) * TILE_PX;
  const lipH = Math.max(5, Math.round(TILE_PX * 0.22));
  ctx.fillStyle = "rgb(92,186,68)";
  ctx.fillRect(sideX0, sideY0, TILE_PX, lipH);
  const rand = mulberry32(77);
  ctx.fillStyle = "rgb(86,176,64)";
  for (let x = 0; x < TILE_PX; x++) {
    const extra = Math.floor(rand() * 3);
    if (extra > 0) ctx.fillRect(sideX0 + x, sideY0 + lipH, 1, extra);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function getTileUV(tileId: number): [number, number, number, number] {
  const col = tileId % ATLAS_COLS;
  const row = Math.floor(tileId / ATLAS_COLS);
  const u0 = col / ATLAS_COLS;
  const u1 = (col + 1) / ATLAS_COLS;
  const v0 = row / ATLAS_ROWS;
  const v1 = (row + 1) / ATLAS_ROWS;
  return [u0, v0, u1, v1];
}
