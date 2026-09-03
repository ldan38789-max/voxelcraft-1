interface LoadingScreenProps {
  progress: number;
  seed: number;
}

export default function LoadingScreen({ progress, seed }: LoadingScreenProps) {
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-slate-950 text-white">
      <div className="text-2xl font-bold tracking-tight">Đang tạo thế giới…</div>
      <div className="font-mono text-xs text-slate-400">Seed: {seed}</div>
      <div className="h-3 w-72 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="font-mono text-sm text-emerald-300">{pct}%</div>
      <p className="max-w-xs text-center text-xs text-slate-500">
        Đang sinh địa hình xung quanh điểm xuất phát (terrain, hang động, cây, nước)…
      </p>
    </div>
  );
}
