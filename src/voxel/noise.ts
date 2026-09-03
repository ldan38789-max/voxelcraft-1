function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function (): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRAD_X = new Float64Array([1, -1, 1, -1, 1, -1, 0, 0]);
const GRAD_Y = new Float64Array([1, 1, -1, -1, 0, 0, 1, -1]);

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

export class SeededNoise2D {
  readonly seed: number;
  private readonly perm: Uint8Array;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    const rand = mulberry32(this.seed);

    const base = new Uint8Array(256);
    for (let i = 0; i < 256; i++) base[i] = i;

    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = base[i];
      base[i] = base[j];
      base[j] = tmp;
    }

    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = base[i & 255];
  }

  private gradDot(hash: number, x: number, y: number): number {
    const idx = hash & 7;
    return GRAD_X[idx] * x + GRAD_Y[idx] * y;
  }

  noise2D(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const X = xi & 255;
    const Y = yi & 255;
    const xf = x - xi;
    const yf = y - yi;

    const topRight = this.perm[this.perm[X + 1] + Y + 1];
    const topLeft = this.perm[this.perm[X] + Y + 1];
    const bottomRight = this.perm[this.perm[X + 1] + Y];
    const bottomLeft = this.perm[this.perm[X] + Y];

    const u = fade(xf);
    const v = fade(yf);

    const dotBL = this.gradDot(bottomLeft, xf, yf);
    const dotBR = this.gradDot(bottomRight, xf - 1, yf);
    const dotTL = this.gradDot(topLeft, xf, yf - 1);
    const dotTR = this.gradDot(topRight, xf - 1, yf - 1);

    return lerp(lerp(dotBL, dotBR, u), lerp(dotTL, dotTR, u), v);
  }

  fbm(x: number, y: number, octaves: number, persistence: number, lacunarity: number): number {
    let amplitude = 1;
    let frequency = 1;
    let sum = 0;
    let maxAmplitude = 0;

    for (let i = 0; i < octaves; i++) {
      sum += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxAmplitude += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return sum / maxAmplitude;
  }
}
