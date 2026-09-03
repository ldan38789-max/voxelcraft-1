export interface FaceDef {
  dir: readonly [number, number, number];
  normal: readonly [number, number, number];
  corners: readonly (readonly [number, number, number])[];
  uvs: readonly (readonly [number, number])[];
  faceType: "top" | "side" | "bottom";
}

export const FACES: readonly FaceDef[] = [
  // Front (+Z)
  {
    dir: [0, 0, 1],
    normal: [0, 0, 1],
    faceType: "side",
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    uvs: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  },
  // Back (-Z)
  {
    dir: [0, 0, -1],
    normal: [0, 0, -1],
    faceType: "side",
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
    uvs: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  },
  // Top (+Y)
  {
    dir: [0, 1, 0],
    normal: [0, 1, 0],
    faceType: "top",
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
    uvs: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  },
  // Bottom (-Y)
  {
    dir: [0, -1, 0],
    normal: [0, -1, 0],
    faceType: "bottom",
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    uvs: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  },
  // Right (+X)
  {
    dir: [1, 0, 0],
    normal: [1, 0, 0],
    faceType: "side",
    corners: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
    uvs: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  },
  // Left (-X)
  {
    dir: [-1, 0, 0],
    normal: [-1, 0, 0],
    faceType: "side",
    corners: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    uvs: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  },
] as const;
