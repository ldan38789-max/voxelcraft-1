export function hash3(seed: number, x: number, y: number, z: number): number {
  let h = (seed ^ 0x9e3779b9) | 0;
  h = Math.imul(h ^ x, 0x27d4eb2d);
  h = Math.imul(h ^ y, 0x165667b1);
  h = Math.imul(h ^ z, 0x85ebca6b);
  h ^= h >>> 15;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h, 0x27d4eb2d);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function hash2(seed: number, x: number, z: number): number {
  return hash3(seed, x, 0x1a2b3c, z);
}
