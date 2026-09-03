export function hashStringToSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function normalizeSeedInput(input: string): number {
  const trimmed = input.trim();
  if (trimmed.length === 0) return randomSeed();
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed) >>> 0;
  return hashStringToSeed(trimmed);
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
