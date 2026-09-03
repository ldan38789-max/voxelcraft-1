import {
  DEFAULT_MASTER_VOLUME,
  DEFAULT_MOUSE_SENSITIVITY,
  DEFAULT_RENDER_DISTANCE,
  DEFAULT_SHOW_FPS,
  MAX_MOUSE_SENSITIVITY,
  MAX_RENDER_DISTANCE,
  MIN_MOUSE_SENSITIVITY,
  MIN_RENDER_DISTANCE,
} from "./settings";

export interface GameSettingsData {
  renderDistance: number;
  mouseSensitivity: number;
  masterVolume: number;
  showFps: boolean;
}

const STORAGE_KEY = "voxelgame.settings.v1";

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function defaults(): GameSettingsData {
  return {
    renderDistance: DEFAULT_RENDER_DISTANCE,
    mouseSensitivity: DEFAULT_MOUSE_SENSITIVITY,
    masterVolume: DEFAULT_MASTER_VOLUME,
    showFps: DEFAULT_SHOW_FPS,
  };
}

function loadFromStorage(): GameSettingsData {
  const fallback = defaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      renderDistance: clamp(
        Number(parsed.renderDistance) || fallback.renderDistance,
        MIN_RENDER_DISTANCE,
        MAX_RENDER_DISTANCE
      ),
      mouseSensitivity: clamp(
        Number(parsed.mouseSensitivity) || fallback.mouseSensitivity,
        MIN_MOUSE_SENSITIVITY,
        MAX_MOUSE_SENSITIVITY
      ),
      masterVolume: clamp(
        parsed.masterVolume === undefined ? fallback.masterVolume : Number(parsed.masterVolume),
        0,
        1
      ),
      showFps: typeof parsed.showFps === "boolean" ? parsed.showFps : fallback.showFps,
    };
  } catch {
    return fallback;
  }
}

class GameSettingsStore {
  private data: GameSettingsData = loadFromStorage();
  private listeners = new Set<(data: GameSettingsData) => void>();

  get(): GameSettingsData {
    return { ...this.data };
  }

  update(partial: Partial<GameSettingsData>): void {
    this.data = { ...this.data, ...partial };
    this.persist();
    this.listeners.forEach((cb) => cb(this.get()));
  }

  subscribe(cb: (data: GameSettingsData) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // bỏ qua lỗi quota / trình duyệt chặn localStorage
    }
  }
}

export const gameSettings = new GameSettingsStore();
