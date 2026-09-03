import { useEffect, useState } from "react";
import { randomSeed } from "@/voxel/seed";
import { storage } from "@/voxel/storage";

interface MainMenuProps {
  seedInput: string;
  onSeedChange: (value: string) => void;
  onStartNewWorld: () => void;
  onLoadWorld: () => void;
  onOpenSettings: () => void;
}

export default function MainMenu({
  seedInput,
  onSeedChange,
  onStartNewWorld,
  onLoadWorld,
  onOpenSettings,
}: MainMenuProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    storage.hasSave().then(setHasSave);
  }, []);

  return (
    <div className="pointer-events-auto absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-sky-800 via-slate-900 to-slate-950 text-center text-white">
      <div>
        <h1 className="text-4xl font-black tracking-tight drop-shadow">⛏️ Mini Voxel World</h1>
        <p className="mt-2 text-sm text-slate-300">Minecraft mini — nhẹ, ổn định, chơi được ngay trên trình duyệt</p>
      </div>

      {!showCreate ? (
        <div className="flex w-64 flex-col gap-2.5">
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-full bg-emerald-500 px-6 py-2.5 font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
          >
            Tạo world mới
          </button>
          <button
            type="button"
            onClick={onLoadWorld}
            disabled={!hasSave}
            className="rounded-full bg-sky-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-sky-600/30 transition enabled:hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {hasSave ? "Tải thế giới đã lưu" : "Chưa có dữ liệu lưu"}
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-full bg-slate-700 px-6 py-2.5 font-semibold text-white transition hover:bg-slate-600"
          >
            Cài đặt
          </button>
        </div>
      ) : (
        <div className="flex w-72 flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-5">
          <p className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
            Nhập seed (số hoặc chữ) để tạo world
          </p>
          <div className="flex gap-2">
            <input
              value={seedInput}
              onChange={(e) => onSeedChange(e.target.value)}
              placeholder="Ví dụ: 1337 hoặc mySeed"
              className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 font-mono text-sm text-white outline-none focus:border-emerald-400"
            />
            <button
              type="button"
              onClick={() => onSeedChange(String(randomSeed()))}
              title="Seed ngẫu nhiên"
              className="shrink-0 rounded bg-slate-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-500"
            >
              🎲
            </button>
          </div>
          <button
            type="button"
            onClick={onStartNewWorld}
            className="rounded-full bg-emerald-500 px-6 py-2.5 font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
          >
            Bắt đầu chơi
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            className="rounded-full bg-white/10 px-6 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Quay lại
          </button>
        </div>
      )}

      <p className="max-w-md text-xs text-slate-500">
        WASD di chuyển • Space nhảy/bơi lên • Chuột trái phá khối • Chuột phải đặt khối • E mở túi đồ • Esc tạm dừng
      </p>
    </div>
  );
}
