/**
 * Âm thanh cơ bản dùng Web Audio API — tổng hợp (synthesize) trực tiếp bằng
 * noise buffer / oscillator thay vì tải file, giữ game nhẹ và không cần asset.
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  volume: number;

  constructor(volume = 0.6) {
    this.volume = volume;
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  resume(): void {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) this.masterGain.gain.value = this.volume;
  }

  private noiseBurst(duration: number, freqStart: number, freqEnd: number, gainValue: number): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freqStart, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), ctx.currentTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    src.connect(filter).connect(gain).connect(this.masterGain);
    src.start();
    src.stop(ctx.currentTime + duration);
  }

  private tone(freq: number, duration: number, gainValue: number, type: OscillatorType = "sine"): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * 0.6), ctx.currentTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain).connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  playBreak(): void {
    this.noiseBurst(0.16, 1400, 200, 0.5);
  }

  playPlace(): void {
    this.noiseBurst(0.1, 700, 300, 0.4);
  }

  playFootstep(): void {
    this.noiseBurst(0.08, 350, 150, 0.16);
  }

  playSplash(): void {
    this.noiseBurst(0.22, 1800, 500, 0.32);
  }

  playClick(): void {
    this.tone(500, 0.05, 0.15, "square");
  }
}

export const soundManager = new SoundManager();
