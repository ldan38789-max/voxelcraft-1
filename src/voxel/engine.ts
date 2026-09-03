import * as THREE from "three";
import { BlockInteraction, type InteractionStats } from "./blockInteraction";
import { createTextureAtlas } from "./textureAtlas";
import { blockFragmentShader, blockVertexShader, waterFragmentShader, waterVertexShader } from "./shaders";
import { World } from "./world";
import { Player } from "./player";
import { ProceduralTerrainGenerator } from "./terrain";
import { isSolid } from "./blockTypes";
import { Inventory, type InventorySnapshot } from "./inventory";
import { storage, GameSaveData } from "./storage";
import { DayNightCycle } from "./dayNight";
import { createSkyDome, updateSkyDome } from "./sky";
import { ParticleSystem } from "./particles";
import { soundManager } from "./audio";
import { gameSettings } from "./gameSettings";
import {
  CAMERA_FAR,
  CAMERA_FOV,
  CAMERA_NEAR,
  CHUNK_HEIGHT,
  computeFogDistances,
  DEFAULT_WORLD_SEED,
  MAX_RENDER_DISTANCE,
  MIN_RENDER_DISTANCE,
  MOVE_SPEED,
  PITCH_LIMIT,
  SKY_COLOR,
  SPRINT_SPEED,
} from "./settings";

export interface EngineStats {
  fps: number;
  x: number;
  y: number;
  z: number;
  chunkCount: number;
  pendingRebuilds: number;
  pointerLocked: boolean;
  seed: number;
  onGround: boolean;
  inWater: boolean;
  interaction: InteractionStats;
  inventory: InventorySnapshot;
  inventoryOpen: boolean;
  timeOfDay: number;
  clockLabel: string;
  renderDistance: number;
}

const SPAWN_X = 8;
const SPAWN_Z = 8;
const SPAWN_Y_OFFSET = 2;
const FOOTSTEP_INTERVAL = 0.42;

export class VoxelEngine {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly clock = new THREE.Clock();
  private readonly material: THREE.ShaderMaterial;
  private readonly waterMaterial: THREE.ShaderMaterial;
  private readonly container: HTMLElement;
  private world: World;
  private player: Player;
  private terrainGenerator: ProceduralTerrainGenerator;
  private seed: number;
  private blockInteraction: BlockInteraction;

  private readonly dayNight = new DayNightCycle();
  private readonly skyMesh: THREE.Mesh;
  private readonly ambientLight: THREE.AmbientLight;
  private readonly sunLight: THREE.DirectionalLight;
  private readonly particles: ParticleSystem;

  private fogNear: number;
  private fogFar: number;

  readonly inventory = new Inventory();
  private inventoryOpen = false;

  private spawnX = SPAWN_X;
  private spawnZ = SPAWN_Z;
  private initialReady = false;

  private yaw = -Math.PI * 0.75;
  private pitch = -0.15;
  private readonly keys = new Set<string>();
  private pointerLocked = false;
  private animationFrameId = 0;
  private disposed = false;

  private mouseSensitivity: number;
  private renderDistance: number;

  private fpsAccumulator = 0;
  private fpsFrameCount = 0;
  private fps = 0;

  private footstepTimer = 0;
  private wasInWater = false;

  onStats?: (stats: EngineStats) => void;
  onPointerLockChange?: (locked: boolean) => void;
  onMessage?: (msg: string) => void;
  onLoadProgress?: (progress: number) => void;
  onReady?: () => void;

  private readonly handleKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);

    if (e.code.startsWith("Digit")) {
      const digit = parseInt(e.code.substring(5), 10);
      if (digit >= 1 && digit <= 9) {
        this.inventory.selectHotbar(digit - 1);
      }
    }

    if (e.code === "KeyE") {
      this.toggleInventory();
    } else if (e.code === "Escape") {
      this.handleEscape();
    }
  };
  private readonly handleKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);
  private readonly handleMouseMove = (e: MouseEvent) => {
    if (!this.pointerLocked) return;
    this.yaw -= e.movementX * this.mouseSensitivity;
    this.pitch -= e.movementY * this.mouseSensitivity;
    this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch));
  };
  private readonly handlePointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    this.onPointerLockChange?.(this.pointerLocked);
  };
  private readonly handleClick = () => {
    soundManager.resume();
    if (!this.pointerLocked && !this.inventoryOpen) {
      this.renderer.domElement.requestPointerLock();
    }
  };
  private readonly handleMouseDown = (e: MouseEvent) => {
    if (!this.pointerLocked || this.inventoryOpen) return;

    if (e.button === 0) {
      const target = this.blockInteraction.target;
      const brokenBlockId = this.blockInteraction.breakBlock(this.world);
      if (brokenBlockId !== null) {
        this.inventory.addItem(brokenBlockId, 1);
        soundManager.playBreak();
        if (target) {
          this.particles.spawnBreakParticles(brokenBlockId, target.blockX, target.blockY, target.blockZ);
        }
      }
    } else if (e.button === 2) {
      const selected = this.inventory.getSelectedItem();
      if (selected) {
        const placed = this.blockInteraction.placeBlock(this.world, this.player, selected.blockId);
        if (placed) {
          this.inventory.consumeSelected();
          soundManager.playPlace();
        }
      }
    }
  };
  private readonly handleContextMenu = (e: Event) => {
    e.preventDefault();
  };
  private readonly handleResize = () => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  constructor(container: HTMLElement, initialSeed: number = DEFAULT_WORLD_SEED) {
    this.container = container;
    this.seed = initialSeed >>> 0;

    const userSettings = gameSettings.get();
    this.mouseSensitivity = userSettings.mouseSensitivity;
    this.renderDistance = userSettings.renderDistance;
    soundManager.setVolume(userSettings.masterVolume);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SKY_COLOR);
    const fog = computeFogDistances(this.renderDistance);
    this.fogNear = fog.near;
    this.fogFar = fog.far;
    this.scene.fog = new THREE.Fog(SKY_COLOR, this.fogNear, this.fogFar);

    this.camera = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      container.clientWidth / Math.max(1, container.clientHeight),
      CAMERA_NEAR,
      CAMERA_FAR
    );
    this.camera.rotation.order = "YXZ";

    this.skyMesh = createSkyDome();
    this.scene.add(this.skyMesh);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);
    this.sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const atlas = createTextureAtlas();
    this.material = new THREE.ShaderMaterial({
      uniforms: { map: { value: atlas }, dayLight: { value: 1 } },
      vertexShader: blockVertexShader,
      fragmentShader: blockFragmentShader,
    });

    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        dayLight: { value: 1 },
        time: { value: 0 },
        waterColor: { value: new THREE.Color(0x2f6fa8) },
        opacity: { value: 0.72 },
      },
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.particles = new ParticleSystem(this.scene);

    this.terrainGenerator = new ProceduralTerrainGenerator(this.seed);
    this.world = new World(
      this.scene,
      this.material,
      this.waterMaterial,
      this.terrainGenerator,
      SPAWN_X,
      SPAWN_Z,
      this.renderDistance
    );
    const spawnY = this.findSafeSpawnY(SPAWN_X, SPAWN_Z);
    this.player = new Player(SPAWN_X, spawnY, SPAWN_Z);
    this.camera.position.copy(this.player.eyePosition);

    this.blockInteraction = new BlockInteraction(this.scene);

    this.setupInput();
    this.animate();
  }

  private findSafeSpawnY(wx: number, wz: number): number {
    const approxHeight = this.terrainGenerator.getSurfaceHeight!(wx, wz);
    for (let y = Math.min(CHUNK_HEIGHT - 2, approxHeight + 8); y > 1; y--) {
      if (isSolid(this.world.getBlock(wx, y, wz)) && !isSolid(this.world.getBlock(wx, y + 1, wz))) {
        return y + SPAWN_Y_OFFSET;
      }
    }
    return approxHeight + SPAWN_Y_OFFSET;
  }

  async saveGame(): Promise<void> {
    const data: GameSaveData = {
      seed: this.seed,
      playerPos: { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z },
      inventory: {
        slots: this.inventory.getSnapshot().slots,
        selectedHotbar: this.inventory.getSnapshot().selectedHotbar,
      },
    };
    await storage.saveMetadata(data);

    const promises: Promise<void>[] = [];
    for (const chunk of this.world.chunkManager.chunks.values()) {
      if (chunk.isModified) {
        promises.push(storage.saveChunk(chunk.cx, chunk.cz, chunk.blocks));
      }
    }
    await Promise.all(promises);
    this.onMessage?.("Đã lưu thế giới!");
  }

  async hasSavedGame(): Promise<boolean> {
    return storage.hasSave();
  }

  async loadGame(): Promise<boolean> {
    const data = await storage.loadMetadata();
    if (!data) {
      this.onMessage?.("Không tìm thấy dữ liệu lưu!");
      return false;
    }

    this.seed = data.seed;
    this.inventory.loadFromSnapshot(data.inventory);

    this.world.dispose();
    this.terrainGenerator = new ProceduralTerrainGenerator(this.seed);
    this.spawnX = data.playerPos.x;
    this.spawnZ = data.playerPos.z;
    this.initialReady = false;
    this.world = new World(
      this.scene,
      this.material,
      this.waterMaterial,
      this.terrainGenerator,
      data.playerPos.x,
      data.playerPos.z,
      this.renderDistance
    );
    this.player.teleport(data.playerPos.x, data.playerPos.y, data.playerPos.z);
    this.camera.position.copy(this.player.eyePosition);
    this.onMessage?.("Đã tải thế giới!");
    return true;
  }

  regenerateWorld(seed: number): void {
    this.seed = seed >>> 0;
    this.world.dispose();

    this.terrainGenerator = new ProceduralTerrainGenerator(this.seed);
    this.spawnX = this.player.position.x;
    this.spawnZ = this.player.position.z;
    this.initialReady = false;
    this.world = new World(
      this.scene,
      this.material,
      this.waterMaterial,
      this.terrainGenerator,
      this.player.position.x,
      this.player.position.z,
      this.renderDistance
    );

    const surfaceY = this.findSafeSpawnY(this.player.position.x, this.player.position.z);
    this.player.teleport(this.player.position.x, surfaceY, this.player.position.z);
    this.camera.position.copy(this.player.eyePosition);
  }

  getSeed(): number {
    return this.seed;
  }

  setRenderDistance(distance: number): void {
    const clamped = Math.max(MIN_RENDER_DISTANCE, Math.min(MAX_RENDER_DISTANCE, Math.round(distance)));
    this.renderDistance = clamped;
    this.world.setRenderDistance(clamped, this.player.position.x, this.player.position.z);
    const fog = computeFogDistances(clamped);
    this.fogNear = fog.near;
    this.fogFar = fog.far;
    gameSettings.update({ renderDistance: clamped });
  }

  getRenderDistance(): number {
    return this.renderDistance;
  }

  setMouseSensitivity(value: number): void {
    this.mouseSensitivity = value;
    gameSettings.update({ mouseSensitivity: value });
  }

  getMouseSensitivity(): number {
    return this.mouseSensitivity;
  }

  setMasterVolume(value: number): void {
    soundManager.setVolume(value);
    gameSettings.update({ masterVolume: value });
  }

  selectHotbar(index: number): void {
    this.inventory.selectHotbar(index);
  }

  clickInventorySlot(index: number, rightClick = false): void {
    this.inventory.clickSlot(index, rightClick);
  }

  get isInventoryOpen(): boolean {
    return this.inventoryOpen;
  }

  openInventory(): void {
    if (this.inventoryOpen) return;
    this.inventoryOpen = true;
    this.blockInteraction.hideHighlight();
    if (this.pointerLocked) {
      document.exitPointerLock();
    }
  }

  closeInventory(): void {
    if (!this.inventoryOpen) return;
    this.inventoryOpen = false;
    this.inventory.returnCursorStack();
    this.renderer.domElement.requestPointerLock();
  }

  toggleInventory(): void {
    if (this.inventoryOpen) this.closeInventory();
    else this.openInventory();
  }

  resumeGame(): void {
    if (this.inventoryOpen) {
      this.closeInventory();
      return;
    }
    if (!this.pointerLocked) {
      this.renderer.domElement.requestPointerLock();
    }
  }

  pauseGame(): void {
    if (this.pointerLocked) {
      document.exitPointerLock();
    }
  }

  private handleEscape(): void {
    if (this.inventoryOpen) {
      this.closeInventory();
      return;
    }
    if (this.pointerLocked) {
      document.exitPointerLock();
    } else {
      this.renderer.domElement.requestPointerLock();
    }
  }

  private setupInput(): void {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("pointerlockchange", this.handlePointerLockChange);
    this.renderer.domElement.addEventListener("click", this.handleClick);
    this.renderer.domElement.addEventListener("mousedown", this.handleMouseDown);
    this.renderer.domElement.addEventListener("contextmenu", this.handleContextMenu);
    window.addEventListener("resize", this.handleResize);
  }

  private buildPlayerInput(): { moveX: number; moveZ: number; jump: boolean } {
    const lookDir = new THREE.Vector3();
    this.camera.getWorldDirection(lookDir);
    lookDir.y = 0;
    if (lookDir.lengthSq() > 1e-8) lookDir.normalize();
    else lookDir.set(0, 0, -1);

    const worldUp = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(lookDir, worldUp).normalize();

    let dirX = 0;
    let dirZ = 0;

    if (this.keys.has("KeyW")) {
      dirX += lookDir.x;
      dirZ += lookDir.z;
    }
    if (this.keys.has("KeyS")) {
      dirX -= lookDir.x;
      dirZ -= lookDir.z;
    }
    if (this.keys.has("KeyD")) {
      dirX += right.x;
      dirZ += right.z;
    }
    if (this.keys.has("KeyA")) {
      dirX -= right.x;
      dirZ -= right.z;
    }

    const lengthSq = dirX * dirX + dirZ * dirZ;
    if (lengthSq > 1e-8) {
      const invLen = 1 / Math.sqrt(lengthSq);
      dirX *= invLen;
      dirZ *= invLen;
    }

    const sprinting = this.keys.has("ControlLeft") || this.keys.has("ControlRight");
    const speed = sprinting ? SPRINT_SPEED : MOVE_SPEED;

    const jump = this.keys.has("Space");

    return { moveX: dirX * speed, moveZ: dirZ * speed, jump };
  }

  private animate = (): void => {
    if (this.disposed) return;
    this.animationFrameId = requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);

    const frozen = !this.pointerLocked || this.inventoryOpen;

    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");

    if (!frozen) {
      const input = this.buildPlayerInput();
      this.player.update(dt, this.world, input);

      const moving = Math.abs(input.moveX) > 0.05 || Math.abs(input.moveZ) > 0.05;
      if (this.player.onGround && moving) {
        this.footstepTimer += dt;
        if (this.footstepTimer >= FOOTSTEP_INTERVAL) {
          this.footstepTimer = 0;
          soundManager.playFootstep();
        }
      } else {
        this.footstepTimer = FOOTSTEP_INTERVAL * 0.4;
      }

      if (this.player.inWater && !this.wasInWater) soundManager.playSplash();
      this.wasInWater = this.player.inWater;
    }

    this.world.update(this.player.position.x, this.player.position.z);

    this.camera.position.copy(this.player.eyePosition);

    // Chu kỳ ngày/đêm — luôn chạy kể cả khi tạm dừng, giống Minecraft.
    this.dayNight.update(dt);
    const dayFactor = this.dayNight.getDayFactor();
    this.material.uniforms.dayLight.value = dayFactor;
    this.waterMaterial.uniforms.dayLight.value = dayFactor;
    this.waterMaterial.uniforms.time.value += dt;

    this.ambientLight.intensity = 0.28 + dayFactor * 0.45;
    this.sunLight.intensity = this.dayNight.getSunIntensity() * 0.9;
    const sunDir = this.dayNight.getSunDirection();
    this.sunLight.position.copy(this.camera.position).addScaledVector(sunDir, 150);
    this.sunLight.target.position.copy(this.camera.position);
    this.sunLight.target.updateMatrixWorld();

    updateSkyDome(this.skyMesh, this.camera.position, this.dayNight);

    if (this.scene.fog instanceof THREE.Fog) {
      if (this.player.inWater) {
        this.scene.fog.color.set(0x1a4f7a);
        this.scene.fog.near = 0.5;
        this.scene.fog.far = 16;
      } else {
        this.scene.fog.color.copy(this.dayNight.getFogColor());
        this.scene.fog.near = this.fogNear;
        this.scene.fog.far = this.fogFar;
      }
    }

    this.particles.update(dt);

    if (!frozen) {
      this.blockInteraction.update(this.camera, this.world);
    } else {
      this.blockInteraction.hideHighlight();
    }

    this.renderer.render(this.scene, this.camera);

    this.fpsAccumulator += dt;
    this.fpsFrameCount += 1;
    if (this.fpsAccumulator >= 0.25) {
      this.fps = this.fpsFrameCount / this.fpsAccumulator;
      this.fpsAccumulator = 0;
      this.fpsFrameCount = 0;
    }

    if (!this.initialReady) {
      const progress = this.world.getSpawnLoadProgress(this.spawnX, this.spawnZ, Math.min(3, this.renderDistance));
      this.onLoadProgress?.(progress);
      if (progress >= 1) {
        this.initialReady = true;
        this.onReady?.();
      }
    }

    this.onStats?.({
      fps: this.fps,
      x: this.player.position.x,
      y: this.player.position.y,
      z: this.player.position.z,
      chunkCount: this.world.loadedChunkCount,
      pendingRebuilds: this.world.pendingRebuildCount,
      pointerLocked: this.pointerLocked,
      seed: this.seed,
      onGround: this.player.onGround,
      inWater: this.player.inWater,
      interaction: this.blockInteraction.getStats(),
      inventory: this.inventory.getSnapshot(),
      inventoryOpen: this.inventoryOpen,
      timeOfDay: this.dayNight.time,
      clockLabel: this.dayNight.getClockLabel(),
      renderDistance: this.renderDistance,
    });
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animationFrameId);

    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("pointerlockchange", this.handlePointerLockChange);
    this.renderer.domElement.removeEventListener("click", this.handleClick);
    this.renderer.domElement.removeEventListener("mousedown", this.handleMouseDown);
    this.renderer.domElement.removeEventListener("contextmenu", this.handleContextMenu);
    window.removeEventListener("resize", this.handleResize);

    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }

    this.blockInteraction.dispose(this.scene);
    this.particles.dispose(this.scene);

    this.scene.remove(this.skyMesh);
    this.skyMesh.geometry.dispose();
    (this.skyMesh.material as THREE.Material).dispose();

    this.scene.remove(this.ambientLight);
    this.scene.remove(this.sunLight);
    this.scene.remove(this.sunLight.target);

    this.world.dispose();
    this.material.dispose();
    this.waterMaterial.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
