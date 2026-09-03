import * as THREE from "three";
import { skyFragmentShader, skyVertexShader } from "./shaders";
import { DayNightCycle } from "./dayNight";

export function createSkyDome(radius = 450): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius, 32, 16);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x4fa8ea) },
      bottomColor: { value: new THREE.Color(0xcfeeff) },
      sunDirection: { value: new THREE.Vector3(0, 1, 0) },
      sunColor: { value: new THREE.Color(0xffffff) },
      starOpacity: { value: 0 },
    },
    vertexShader: skyVertexShader,
    fragmentShader: skyFragmentShader,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  mesh.name = "sky_dome";
  return mesh;
}

export function updateSkyDome(mesh: THREE.Mesh, cameraPos: THREE.Vector3, cycle: DayNightCycle): void {
  mesh.position.copy(cameraPos);
  const mat = mesh.material as THREE.ShaderMaterial;
  const palette = cycle.getSkyPalette();
  (mat.uniforms.topColor.value as THREE.Color).copy(palette.top);
  (mat.uniforms.bottomColor.value as THREE.Color).copy(palette.horizon);
  (mat.uniforms.sunColor.value as THREE.Color).copy(palette.sunColor);
  (mat.uniforms.sunDirection.value as THREE.Vector3).copy(cycle.getSunDirection());
  mat.uniforms.starOpacity.value = cycle.getStarOpacity();
}
