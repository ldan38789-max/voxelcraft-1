import * as THREE from "three";
import { DEFAULT_DAY_LENGTH_SECONDS } from "./settings";

export interface SkyPalette {
  top: THREE.Color;
  horizon: THREE.Color;
  sunColor: THREE.Color;
}

const NIGHT_TOP = new THREE.Color(0x030616);
const NIGHT_HORIZON = new THREE.Color(0x0d1a34);
const DAWN_TOP = new THREE.Color(0x4c6fb0);
const DAWN_HORIZON = new THREE.Color(0xf3a468);
const DAY_TOP = new THREE.Color(0x4fa8ea);
const DAY_HORIZON = new THREE.Color(0xcfeeff);

function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return a.clone().lerp(b, THREE.MathUtils.clamp(t, 0, 1));
}

/**
 * Quản lý chu kỳ ngày/đêm đơn giản: `time` chạy tuần hoàn trong [0,1).
 * time = 0 -> nửa đêm, time = 0.5 -> giữa trưa.
 */
export class DayNightCycle {
  time: number;
  dayLengthSeconds: number;

  constructor(dayLengthSeconds = DEFAULT_DAY_LENGTH_SECONDS, startTime = 0.28) {
    this.dayLengthSeconds = dayLengthSeconds;
    this.time = startTime;
  }

  update(dt: number): void {
    this.time = (this.time + dt / this.dayLengthSeconds) % 1;
  }

  private sunHeight(): number {
    return Math.sin((this.time - 0.25) * Math.PI * 2);
  }

  getSunDirection(): THREE.Vector3 {
    const angle = (this.time - 0.25) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * 0.6, Math.sin(angle), Math.sin(angle) * 0.2 + 0.3).normalize();
  }

  /** 0 = tối hoàn toàn, 1 = giữa trưa — dùng để điều chế độ sáng của khối/nước. */
  getDayFactor(): number {
    const h = this.sunHeight();
    return THREE.MathUtils.clamp(h * 1.3 + 0.35, 0.12, 1);
  }

  getSunIntensity(): number {
    const h = this.sunHeight();
    return THREE.MathUtils.clamp(h * 1.2, 0.05, 1);
  }

  getStarOpacity(): number {
    const h = this.sunHeight();
    return THREE.MathUtils.clamp(-h * 2, 0, 1);
  }

  getSkyPalette(): SkyPalette {
    const h = this.sunHeight();
    const twilight = THREE.MathUtils.clamp(1 - Math.abs(h) * 3.2, 0, 1);
    const dayT = THREE.MathUtils.clamp(h * 1.4 + 0.3, 0, 1);

    let top = lerpColor(NIGHT_TOP, DAY_TOP, dayT);
    let horizon = lerpColor(NIGHT_HORIZON, DAY_HORIZON, dayT);
    top = lerpColor(top, DAWN_TOP, twilight * 0.5);
    horizon = lerpColor(horizon, DAWN_HORIZON, twilight);

    const sunColor = lerpColor(new THREE.Color(0xffe9c4), new THREE.Color(0xfff6e0), dayT);
    return { top, horizon, sunColor };
  }

  getFogColor(): THREE.Color {
    return this.getSkyPalette().horizon;
  }

  /** Giờ hiển thị dạng HH:MM cho UI (0h = nửa đêm, 12h = giữa trưa). */
  getClockLabel(): string {
    const totalMinutes = Math.floor(this.time * 24 * 60);
    const hh = Math.floor(totalMinutes / 60) % 24;
    const mm = totalMinutes % 60;
    return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
  }
}
