import * as THREE from "three";
import { BlockType } from "./blockTypes";
import type { Player } from "./player";
import { voxelRaycast, type RaycastResult } from "./raycast";
import { INTERACTION_DISTANCE } from "./settings";
import type { World } from "./world";

export interface InteractionStats {
  targetedBlockX: number | null;
  targetedBlockY: number | null;
  targetedBlockZ: number | null;
  hasTarget: boolean;
}

export class BlockInteraction {
  readonly highlightMesh: THREE.LineSegments;
  target: RaycastResult | null = null;

  constructor(scene: THREE.Scene) {
    const edgeGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01));
    const material = new THREE.LineBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.85,
      depthTest: true,
    });
    this.highlightMesh = new THREE.LineSegments(edgeGeometry, material);
    this.highlightMesh.visible = false;
    this.highlightMesh.frustumCulled = false;
    this.highlightMesh.renderOrder = 999;
    scene.add(this.highlightMesh);
  }

  update(camera: THREE.PerspectiveCamera, world: World): void {
    const origin = camera.getWorldPosition(new THREE.Vector3());
    const dir = camera.getWorldDirection(new THREE.Vector3());

    const result = voxelRaycast(world, origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, INTERACTION_DISTANCE);

    if (result.hit) {
      this.target = result;
      this.highlightMesh.visible = true;
      this.highlightMesh.position.set(
        result.blockX + 0.5,
        result.blockY + 0.5,
        result.blockZ + 0.5
      );
    } else {
      this.target = null;
      this.highlightMesh.visible = false;
    }
  }

  hideHighlight(): void {
    this.highlightMesh.visible = false;
  }

  breakBlock(world: World): number | null {
    if (!this.target || !this.target.hit) return null;
    const blockId = world.getBlock(this.target.blockX, this.target.blockY, this.target.blockZ);
    if (blockId === BlockType.AIR) return null;
    world.setBlock(this.target.blockX, this.target.blockY, this.target.blockZ, BlockType.AIR);
    return blockId;
  }

  placeBlock(world: World, player: Player, blockType: number): boolean {
    if (!this.target || !this.target.hit) return false;
    if (blockType === BlockType.AIR) return false;

    const bx = this.target.blockX + this.target.normalX;
    const by = this.target.blockY + this.target.normalY;
    const bz = this.target.blockZ + this.target.normalZ;

    if (player.occupiesBlock(bx, by, bz)) return false;

    world.setBlock(bx, by, bz, blockType);
    return true;
  }

  getStats(): InteractionStats {
    return {
      targetedBlockX: this.target?.hit ? this.target.blockX : null,
      targetedBlockY: this.target?.hit ? this.target.blockY : null,
      targetedBlockZ: this.target?.hit ? this.target.blockZ : null,
      hasTarget: !!this.target?.hit,
    };
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.highlightMesh);
    this.highlightMesh.geometry.dispose();
    (this.highlightMesh.material as THREE.Material).dispose();
  }
}
