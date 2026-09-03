import { useState } from "react";
import {
  MAX_MOUSE_SENSITIVITY,
  MAX_RENDER_DISTANCE,
  MIN_MOUSE_SENSITIVITY,
  MIN_RENDER_DISTANCE,
} from "@/voxel/settings";
import type { GameSettingsData } from "@/voxel/gameSettings";

interface SettingsPanelProps {
  values: GameSettingsData;
  onChange: (partial: Partial<GameSettingsData>) => void;
  onClose: () => void;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1 flex items-center justify-between text-sm text-slate-200">
        <span>{label}</span>
        <span className="font-mono text-emerald-300">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-500"
      />
    </div>
  );
}

export default function SettingsPanel({ values, onChange, onClose }: SettingsPanelProps) {
  const [local, setLocal] = useState(values);

  const update = (partial: Partial<GameSettingsData>) => {
    const next = { ...local, ...partial };
    setLocal(next);
    onChange(partial);
  };

  const sensitivityPercent = Math.round(
    ((local.mouseSensitivity - MIN_MOUSE_SENSITIVITY) / (MAX_MOUSE_SENSITIVITY - MIN_MOUSE_SENSITIVITY)) * 100
  );

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/70">
      <div className="w-[min(92vw,420px)] rounded-2xl border border-white/15 bg-slate-900/95 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Cài đặt</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Đóng
          </button>
        </div>

        <Slider
          label="Khoảng cách hiển thị (Render Distance)"
          value={local.renderDistance}
          min={MIN_RENDER_DISTANCE}
          max={MAX_RENDER_DISTANCE}
          step={1}
          displayValue={`${local.renderDistance} chunk`}
          onChange={(v) => update({ renderDistance: v })}
        />

        <Slider
          label="Độ nhạy chuột (Mouse Sensitivity)"
          value={local.mouseSensitivity}
          min={MIN_MOUSE_SENSITIVITY}
          max={MAX_MOUSE_SENSITIVITY}
          step={0.0001}
          displayValue={`${sensitivityPercent}%`}
          onChange={(v) => update({ mouseSensitivity: v })}
        />

        <Slider
          label="Âm lượng"
          value={local.masterVolume}
          min={0}
          max={1}
          step={0.01}
          displayValue={`${Math.round(local.masterVolume * 100)}%`}
          onChange={(v) => update({ masterVolume: v })}
        />

        <label className="mt-2 flex cursor-pointer items-center justify-between text-sm text-slate-200">
          <span>Hiện FPS counter</span>
          <input
            type="checkbox"
            checked={local.showFps}
            onChange={(e) => update({ showFps: e.target.checked })}
            className="h-4 w-4 accent-emerald-500"
          />
        </label>

        <p className="mt-4 text-xs text-slate-500">Các thay đổi được lưu tự động và áp dụng ngay lập tức.</p>
      </div>
    </div>
  );
}
