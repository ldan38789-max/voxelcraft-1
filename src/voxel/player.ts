import * as THREE from "three";
import { BlockType, isSolid } from "./blockTypes";
import {
  COLLISION_RESOLUTION_ITERATIONS,
  GRAVITY,
  JUMP_SPEED,
  MAX_FALL_SPEED,
  PLAYER_EYE_HEIGHT,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  WATER_GRAVITY_SCALE,
  WATER_HORIZONTAL_SCALE,
  WATER_MAX_FALL_SPEED,
  WATER_SWIM_UP_SPEED,
} from "./settings";

export interface CollisionWorld {
  getBlock(wx: number, wy: number, wz: number): number;
}

export interface PlayerInput {
  moveX: number;
  moveZ: number;
  jump: boolean;
}

interface AABB {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

const EPS = 1e-4;

export class Player {
  readonly position: THREE.Vector3;
  readonly velocity = new THREE.Vector3(0, 0, 0);
  onGround = false;
  inWater = false;

  // Vector dùng lại (scratch) để tránh cấp phát bộ nhớ mỗi bước va chạm (tối ưu CPU/GC).
  private readonly scratchPos = new THREE.Vector3();

  constructor(x: number, y: number, z: number) {
    this.position = new THREE.Vector3(x, y, z);
  }

  get eyePosition(): THREE.Vector3 {
    return new THREE.Vector3(this.position.x, this.position.y + PLAYER_EYE_HEIGHT, this.position.z);
  }

  teleport(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.onGround = false;
  }

  private getAABB(pos: THREE.Vector3): AABB {
    const hw = PLAYER_WIDTH / 2;
    return {
      minX: pos.x - hw,
      maxX: pos.x + hw,
      minY: pos.y,
      maxY: pos.y + PLAYER_HEIGHT,
      minZ: pos.z - hw,
      maxZ: pos.z + hw,
    };
  }

  occupiesBlock(bx: number, by: number, bz: number): boolean {
    const box = this.getAABB(this.position);
    const bMinX = bx;
    const bMaxX = bx + 1;
    const bMinY = by;
    const bMaxY = by + 1;
    const bMinZ = bz;
    const bMaxZ = bz + 1;

    return (
      box.minX < bMaxX - EPS &&
      box.maxX > bMinX + EPS &&
      box.minY < bMaxY - EPS &&
      box.maxY > bMinY + EPS &&
      box.minZ < bMaxZ - EPS &&
      box.maxZ > bMinZ + EPS
    );
  }

  private isAABBColliding(world: CollisionWorld, box: AABB): boolean {
    const minX = Math.floor(box.minX + EPS);
    const maxX = Math.floor(box.maxX - EPS);
    const minY = Math.floor(box.minY + EPS);
    const maxY = Math.floor(box.maxY - EPS);
    const minZ = Math.floor(box.minZ + EPS);
    const maxZ = Math.floor(box.maxZ - EPS);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (isSolid(world.getBlock(x, y, z))) return true;
        }
      }
    }
    return false;
  }

  private moveAxis(world: CollisionWorld, axis: "x" | "y" | "z", amount: number): void {
    if (amount === 0) return;

    const MAX_STEP = 0.4;
    const steps = Math.ceil(Math.abs(amount) / MAX_STEP);
    const stepAmount = amount / steps;

    for (let s = 0; s < steps; s++) {
      if (!this.moveAxisStep(world, axis, stepAmount)) {
        break;
      }
    }
  }

  private moveAxisStep(world: CollisionWorld, axis: "x" | "y" | "z", amount: number): boolean {
    const collidesAtOffset = (offset: number): boolean => {
      this.scratchPos.copy(this.position);
      this.scratchPos[axis] += offset;
      return this.isAABBColliding(world, this.getAABB(this.scratchPos));
    };

    if (!collidesAtOffset(amount)) {
      this.position[axis] += amount;
      return true;
    }

    let lo = 0;
    let hi = amount;
    for (let i = 0; i < COLLISION_RESOLUTION_ITERATIONS; i++) {
      const mid = (lo + hi) / 2;
      if (collidesAtOffset(mid)) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    this.position[axis] += lo;

    if (axis === "y") {
      this.velocity.y = 0;
      if (amount < 0) {
        this.onGround = true;
      }
    } else {
      this.velocity[axis] = 0;
    }
    return false;
  }

  private checkInWater(world: CollisionWorld): boolean {
    const bx = Math.floor(this.position.x);
    const bz = Math.floor(this.position.z);
    const feetY = Math.floor(this.position.y + 0.15);
    const midY = Math.floor(this.position.y + PLAYER_HEIGHT * 0.5);
    return world.getBlock(bx, feetY, bz) === BlockType.WATER || world.getBlock(bx, midY, bz) === BlockType.WATER;
  }

  update(dt: number, world: CollisionWorld, input: PlayerInput): void {
    if (dt <= 0) return;

    const wasGrounded = this.onGround;
    this.inWater = this.checkInWater(world);

    const horizontalScale = this.inWater ? WATER_HORIZONTAL_SCALE : 1;
    this.velocity.x = input.moveX * horizontalScale;
    this.velocity.z = input.moveZ * horizontalScale;

    if (this.inWater) {
      this.velocity.y -= GRAVITY * WATER_GRAVITY_SCALE * dt;
      if (this.velocity.y < -WATER_MAX_FALL_SPEED) this.velocity.y = -WATER_MAX_FALL_SPEED;
      if (input.jump) this.velocity.y = WATER_SWIM_UP_SPEED;
    } else {
      this.velocity.y -= GRAVITY * dt;
      if (this.velocity.y < -MAX_FALL_SPEED) this.velocity.y = -MAX_FALL_SPEED;
      if (input.jump && wasGrounded) {
        this.velocity.y = JUMP_SPEED;
      }
    }

    this.onGround = false;

    this.moveAxis(world, "x", this.velocity.x * dt);
    this.moveAxis(world, "z", this.velocity.z * dt);
    this.moveAxis(world, "y", this.velocity.y * dt);
  }
}
