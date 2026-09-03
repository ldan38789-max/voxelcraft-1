import { hash3 } from "./hash";

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class SeededNoise3D {
  readonly seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  private cornerValue(xi: number, yi: number, zi: number): number {
    return hash3(this.seed, xi, yi, zi) * 2 - 1;
  }

  noise3D(x: number, y: number, z: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const xf = x - xi;
    const yf = y - yi;
    const zf = z - zi;

    const u = fade(xf);
    const v = fade(yf);
    const w = fade(zf);

    const c000 = this.cornerValue(xi, yi, zi);
    const c100 = this.cornerValue(xi + 1, yi, zi);
    const c010 = this.cornerValue(xi, yi + 1, zi);
    const c110 = this.cornerValue(xi + 1, yi + 1, zi);
    const c001 = this.cornerValue(xi, yi, zi + 1);
    const c101 = this.cornerValue(xi + 1, yi, zi + 1);
    const c011 = this.cornerValue(xi, yi + 1, zi + 1);
    const c111 = this.cornerValue(xi + 1, yi + 1, zi + 1);

    const x00 = lerp(c000, c100, u);
    const x10 = lerp(c010, c110, u);
    const x01 = lerp(c001, c101, u);
    const x11 = lerp(c011, c111, u);

    const y0 = lerp(x00, x10, v);
    const y1 = lerp(x01, x11, v);

    return lerp(y0, y1, w);
  }

  fbm3D(x: number, y: number, z: number, octaves: number, persistence: number, lacunarity: number): number {
    let amplitude = 1;
    let frequency = 1;
    let sum = 0;
    let maxAmplitude = 0;

    for (let i = 0; i < octaves; i++) {
      sum += this.noise3D(x * frequency, y * frequency, z * frequency) * amplitude;
      maxAmplitude += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return sum / maxAmplitude;
  }
}
