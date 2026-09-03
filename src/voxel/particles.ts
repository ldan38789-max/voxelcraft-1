import * as THREE from "three";
import { BlockType } from "./blockTypes";

const PARTICLE_COLORS: Record<number, number> = {
  [BlockType.GRASS]: 0x5cc444,
  [BlockType.DIRT]: 0x856040,
  [BlockType.STONE]: 0x7a7a7c,
  [BlockType.BEDROCK]: 0x3a3a3c,
  [BlockType.SAND]: 0xdfd095,
  [BlockType.SNOW]: 0xeef4fa,
  [BlockType.WOOD_LOG]: 0x6e4e2e,
  [BlockType.LEAVES]: 0x3a8a38,
  [BlockType.COAL_ORE]: 0x4a4a4c,
  [BlockType.IRON_ORE]: 0xb5967c,
  [BlockType.GOLD_ORE]: 0xdcc255,
};

interface ParticleSlot {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

/**
 * Hệ hạt nhẹ dùng THREE.InstancedMesh (1 draw call cho toàn bộ hạt) để hiển thị
 * mảnh vỡ khi phá block, tránh tạo/huỷ mesh liên tục gây áp lực GC.
 */
export class ParticleSystem {
  private readonly mesh: THREE.InstancedMesh;
  private readonly slots: ParticleSlot[] = [];
  private readonly dummy = new THREE.Object3D();
  private readonly maxCount: number;
  private cursor = 0;

  constructor(scene: THREE.Scene, maxCount = 180) {
    this.maxCount = maxCount;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.mesh = new THREE.InstancedMesh(geometry, material, maxCount);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(maxCount * 3), 3);
    this.mesh.frustumCulled = false;
    this.mesh.name = "break_particles";
    scene.add(this.mesh);

    for (let i = 0; i < maxCount; i++) {
      this.slots.push({ active: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, maxLife: 1 });
      this.hideInstance(i);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  private hideInstance(i: number): void {
    this.dummy.position.set(0, -9999, 0);
    this.dummy.scale.setScalar(0.0001);
    this.dummy.rotation.set(0, 0, 0);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(i, this.dummy.matrix);
  }

  spawnBreakParticles(blockId: number, wx: number, wy: number, wz: number): void {
    const color = new THREE.Color(PARTICLE_COLORS[blockId] ?? 0x999999);
    const count = 7;
    for (let n = 0; n < count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.maxCount;
      const slot = this.slots[i];
      slot.active = true;
      slot.pos.set(wx + 0.3 + Math.random() * 0.4, wy + 0.25 + Math.random() * 0.4, wz + 0.3 + Math.random() * 0.4);
      slot.vel.set((Math.random() - 0.5) * 2.4, Math.random() * 2.8 + 1.2, (Math.random() - 0.5) * 2.4);
      slot.maxLife = 0.35 + Math.random() * 0.3;
      slot.life = slot.maxLife;
      this.mesh.setColorAt(i, color);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    let anyActive = false;
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (!slot.active) continue;
      anyActive = true;
      slot.life -= dt;
      if (slot.life <= 0) {
        slot.active = false;
        this.hideInstance(i);
        continue;
      }
      slot.vel.y -= 9.5 * dt;
      slot.pos.addScaledVector(slot.vel, dt);
      const t = slot.life / slot.maxLife;
      this.dummy.position.copy(slot.pos);
      this.dummy.scale.setScalar(Math.max(0.001, 0.13 * t));
      this.dummy.rotation.set(slot.life * 5, slot.life * 4, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (anyActive) this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
