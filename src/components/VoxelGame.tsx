import { useEffect, useRef, useState } from "react";
import { EngineStats, VoxelEngine } from "@/voxel/engine";
import { BlockType } from "@/voxel/blockTypes";
import { HOTBAR_SIZE, INVENTORY_COLS, MAIN_SIZE, type Slot } from "@/voxel/inventory";
import { normalizeSeedInput, randomSeed } from "@/voxel/seed";
import { gameSettings, type GameSettingsData } from "@/voxel/gameSettings";
import { cn } from "@/utils/cn";
import MainMenu from "@/components/MainMenu";
import LoadingScreen from "@/components/LoadingScreen";
import SettingsPanel from "@/components/SettingsPanel";

const BLOCK_COLORS: Record<number, { top: string; side: string; bottom: string }> = {
  [BlockType.GRASS]: { top: "#5cc444", side: "#79603d", bottom: "#856040" },
  [BlockType.DIRT]: { top: "#856040", side: "#856040", bottom: "#856040" },
  [BlockType.STONE]: { top: "#7a7a7c", side: "#7a7a7c", bottom: "#7a7a7c" },
  [BlockType.BEDROCK]: { top: "#3a3a3c", side: "#3a3a3c", bottom: "#3a3a3c" },
  [BlockType.SAND]: { top: "#dfd095", side: "#dfd095", bottom: "#dfd095" },
  [BlockType.SNOW]: { top: "#eef4fa", side: "#eef4fa", bottom: "#eef4fa" },
  [BlockType.WOOD_LOG]: { top: "#b28a5a", side: "#6e4e2e", bottom: "#b28a5a" },
  [BlockType.LEAVES]: { top: "#3a8a38", side: "#3a8a38", bottom: "#3a8a38" },
  [BlockType.COAL_ORE]: { top: "#4a4a4c", side: "#4a4a4c", bottom: "#4a4a4c" },
  [BlockType.IRON_ORE]: { top: "#b5967c", side: "#b5967c", bottom: "#b5967c" },
  [BlockType.GOLD_ORE]: { top: "#dcc255", side: "#dcc255", bottom: "#dcc255" },
};

function blockLabel(blockId: number): string {
  switch (blockId) {
    case BlockType.GRASS: return "Grass";
    case BlockType.DIRT: return "Dirt";
    case BlockType.STONE: return "Stone";
    case BlockType.BEDROCK: return "Bedrock";
    case BlockType.SAND: return "Sand";
    case BlockType.SNOW: return "Snow";
    case BlockType.WOOD_LOG: return "Wood Log";
    case BlockType.LEAVES: return "Leaves";
    case BlockType.COAL_ORE: return "Coal Ore";
    case BlockType.IRON_ORE: return "Iron Ore";
    case BlockType.GOLD_ORE: return "Gold Ore";
    default: return "Trống";
  }
}

function BlockIcon({ blockId, size = 28 }: { blockId: number; size?: number }) {
  const colors = BLOCK_COLORS[blockId] ?? BLOCK_COLORS[BlockType.STONE];
  return (
    <div className="relative" style={{ width: size, height: size, transform: "rotate(-10deg)" }} aria-hidden>
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: size * 0.5,
          background: colors.top,
          clipPath: "polygon(50% 0, 100% 30%, 50% 60%, 0 30%)",
        }}
      />
      <div
        className="absolute bottom-0 left-0"
        style={{
          width: size * 0.5,
          height: size * 0.7,
          background: colors.side,
          clipPath: "polygon(0 0, 100% 30%, 100% 100%, 0 70%)",
          transform: "translateY(-10%)",
          filter: "brightness(0.8)",
        }}
      />
      <div
        className="absolute bottom-0 right-0"
        style={{
          width: size * 0.5,
          height: size * 0.7,
          background: colors.side,
          clipPath: "polygon(0 30%, 100% 0, 100% 70%, 0 100%)",
          transform: "translateY(-10%)",
          filter: "brightness(0.65)",
        }}
      />
    </div>
  );
}

function ItemSlot({
  stack,
  selected,
  size = 48,
  indexLabel,
  onClick,
  onContextMenu,
}: {
  stack: Slot;
  selected?: boolean;
  size?: number;
  indexLabel?: string;
  onClick?: () => void;
  onContextMenu?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.();
      }}
      title={stack ? `${blockLabel(stack.blockId)} x${stack.count}` : "Ô trống"}
      className={cn(
        "relative flex items-center justify-center rounded-md border transition select-none",
        selected
          ? "border-white bg-white/15 shadow-[0_0_0_2px_rgba(255,255,255,0.3)]"
          : "border-white/15 bg-black/30 hover:border-white/40"
      )}
      style={{ width: size, height: size }}
    >
      {stack && <BlockIcon blockId={stack.blockId} size={size * 0.72} />}
      {stack && stack.count > 1 && (
        <span className="absolute bottom-0.5 right-1 font-mono text-[11px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
          {stack.count}
        </span>
      )}
      {indexLabel && (
        <span className="absolute left-1 top-0.5 text-[10px] font-bold text-white/70">{indexLabel}</span>
      )}
    </button>
  );
}

function Crosshair() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className="h-4 w-0.5 -translate-x-1/2 bg-white/80 shadow" />
      <div className="-mt-2 h-0.5 w-4 -translate-x-1/2 bg-white/80 shadow" />
    </div>
  );
}

function Hotbar({
  hotbarSlots,
  selectedSlot,
  onSelect,
}: {
  hotbarSlots: Slot[];
  selectedSlot: number;
  onSelect: (index: number) => void;
}) {
  const selectedStack = hotbarSlots[selectedSlot] ?? null;
  return (
    <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2">
      <div className="flex gap-1 rounded-xl bg-black/50 p-1.5 shadow-lg backdrop-blur-sm">
        {hotbarSlots.map((stack, index) => (
          <ItemSlot
            key={index}
            stack={stack}
            selected={index === selectedSlot}
            size={48}
            indexLabel={String(index + 1)}
            onClick={() => onSelect(index)}
          />
        ))}
      </div>
      <div className="mt-2 text-center font-mono text-xs text-white/80">
        {selectedStack ? `${blockLabel(selectedStack.blockId)} x${selectedStack.count}` : "Ô trống"}
      </div>
    </div>
  );
}

function InventoryScreen({
  slots,
  selectedHotbar,
  cursorStack,
  onSlotClick,
  onClose,
}: {
  slots: Slot[];
  selectedHotbar: number;
  cursorStack: Slot;
  onSlotClick: (index: number, rightClick: boolean) => void;
  onClose: () => void;
}) {
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const storageSlots = slots.slice(HOTBAR_SIZE, HOTBAR_SIZE + MAIN_SIZE);
  const hotbarSlots = slots.slice(0, HOTBAR_SIZE);

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-black/60"
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="w-[min(92vw,640px)] rounded-2xl border border-white/15 bg-slate-900/95 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Inventory</h2>
            <p className="text-xs text-slate-400">
              Click trái: cầm/thả cả stack &nbsp;•&nbsp; Click phải: lấy/đặt từng 1 đơn vị
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Đóng (E)
          </button>
        </div>

        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Kho chứa</p>
        <div
          className="mb-4 grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${INVENTORY_COLS}, minmax(0, 1fr))` }}
        >
          {storageSlots.map((stack, i) => {
            const globalIndex = HOTBAR_SIZE + i;
            return (
              <ItemSlot
                key={globalIndex}
                stack={stack}
                size={46}
                onClick={() => onSlotClick(globalIndex, false)}
                onContextMenu={() => onSlotClick(globalIndex, true)}
              />
            );
          })}
        </div>

        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Hotbar</p>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${HOTBAR_SIZE}, minmax(0, 1fr))` }}>
          {hotbarSlots.map((stack, index) => (
            <ItemSlot
              key={index}
              stack={stack}
              size={46}
              selected={index === selectedHotbar}
              indexLabel={String(index + 1)}
              onClick={() => onSlotClick(index, false)}
              onContextMenu={() => onSlotClick(index, true)}
            />
          ))}
        </div>
      </div>

      {cursorStack && mousePos && (
        <div
          className="pointer-events-none fixed z-30 flex h-11 w-11 items-center justify-center"
          style={{ left: mousePos.x - 22, top: mousePos.y - 22 }}
        >
          <BlockIcon blockId={cursorStack.blockId} size={34} />
          {cursorStack.count > 1 && (
            <span className="absolute bottom-0 right-0.5 font-mono text-[11px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
              {cursorStack.count}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function PauseMenu({
  onResume,
  onOpenInventory,
  onOpenSettings,
  onBackToMenu,
  seedInput,
  onSeedChange,
  onRegenerate,
  onRandomSeed,
  onSave,
  onLoad,
}: {
  onResume: () => void;
  onOpenInventory: () => void;
  onOpenSettings: () => void;
  onBackToMenu: () => void;
  seedInput: string;
  onSeedChange: (value: string) => void;
  onRegenerate: () => void;
  onRandomSeed: () => void;
  onSave: () => void;
  onLoad: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-slate-950/80 text-center text-white overflow-y-auto py-8">
      <h1 className="text-3xl font-bold tracking-tight">Tạm dừng</h1>
      <div className="flex flex-col gap-2.5 w-64">
        <button
          type="button"
          onClick={onResume}
          className="rounded-full bg-emerald-500 px-6 py-2.5 font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
        >
          Tiếp tục chơi
        </button>
        <button
          type="button"
          onClick={onOpenInventory}
          className="rounded-full bg-slate-700 px-6 py-2.5 font-semibold text-white transition hover:bg-slate-600"
        >
          Mở Inventory (E)
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="rounded-full bg-slate-700 px-6 py-2.5 font-semibold text-white transition hover:bg-slate-600"
        >
          Cài đặt
        </button>
      </div>

      <div className="flex flex-col gap-2.5 w-64 mt-2">
        <button
          type="button"
          onClick={onSave}
          className="rounded bg-indigo-500 px-6 py-2 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
        >
          Lưu game
        </button>
        <button
          type="button"
          onClick={onLoad}
          className="rounded bg-sky-600 px-6 py-2 font-semibold text-white shadow-lg shadow-sky-600/30 transition hover:bg-sky-500"
        >
          Tải game đã lưu
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-black/40 px-3 py-2 font-mono text-xs text-white">
        <span className="text-slate-300">Seed:</span>
        <input
          value={seedInput}
          onChange={(e) => onSeedChange(e.target.value)}
          className="w-36 rounded border border-white/20 bg-white/10 px-2 py-1 text-white outline-none focus:border-emerald-400"
        />
        <button
          type="button"
          onClick={onRegenerate}
          className="rounded bg-emerald-500 px-2 py-1 font-semibold text-white transition hover:bg-emerald-400"
        >
          Tạo lại
        </button>
        <button
          type="button"
          onClick={onRandomSeed}
          className="rounded bg-slate-600 px-2 py-1 font-semibold text-white transition hover:bg-slate-500"
        >
          Ngẫu nhiên
        </button>
      </div>

      <button
        type="button"
        onClick={onBackToMenu}
        className="rounded-full bg-rose-600/80 px-6 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
      >
        Về menu chính
      </button>

      <p className="max-w-sm text-xs text-slate-400">Nhấn Esc để tiếp tục chơi ngay lập tức.</p>
    </div>
  );
}

type Screen = "menu" | "loading" | "playing";

export default function VoxelGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VoxelEngine | null>(null);
  const [screen, setScreen] = useState<Screen>("menu");
  const [stats, setStats] = useState<EngineStats | null>(null);
  const [locked, setLocked] = useState(false);
  const [seedInput, setSeedInput] = useState<string>("1337");
  const [msg, setMsg] = useState<string>("");
  const [loadProgress, setLoadProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsData, setSettingsData] = useState<GameSettingsData>(gameSettings.get());

  useEffect(() => gameSettings.subscribe(setSettingsData), []);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const wireEngine = (engine: VoxelEngine) => {
    engine.onStats = (s) => setStats(s);
    engine.onMessage = (m) => {
      setMsg(m);
      setTimeout(() => setMsg(""), 3000);
    };
    engine.onPointerLockChange = (isLocked) => setLocked(isLocked);
    engine.onLoadProgress = (p) => setLoadProgress(p);
    engine.onReady = () => setScreen("playing");
  };

  const disposeEngine = () => {
    engineRef.current?.dispose();
    engineRef.current = null;
    setStats(null);
    setLocked(false);
  };

  const handleStartNewWorld = () => {
    disposeEngine();
    const container = containerRef.current;
    if (!container) return;
    const seed = normalizeSeedInput(seedInput);
    setSeedInput(String(seed));
    setLoadProgress(0);
    setScreen("loading");
    const engine = new VoxelEngine(container, seed);
    wireEngine(engine);
    engineRef.current = engine;
  };

  const handleLoadWorld = async () => {
    disposeEngine();
    const container = containerRef.current;
    if (!container) return;
    setLoadProgress(0);
    setScreen("loading");
    const engine = new VoxelEngine(container, normalizeSeedInput(seedInput));
    wireEngine(engine);
    engineRef.current = engine;
    const ok = await engine.loadGame();
    if (ok) {
      setSeedInput(String(engine.getSeed()));
    } else {
      disposeEngine();
      setScreen("menu");
    }
  };

  const handleBackToMenu = () => {
    disposeEngine();
    setScreen("menu");
  };

  const handleRegenerate = (seedValue?: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    const nextSeed = seedValue ?? normalizeSeedInput(seedInput);
    setLoadProgress(0);
    setScreen("loading");
    engine.regenerateWorld(nextSeed);
    setSeedInput(String(nextSeed));
  };

  const handleRandomSeed = () => handleRegenerate(randomSeed());

  const handleReloadInGame = async () => {
    const engine = engineRef.current;
    if (!engine) return;
    setLoadProgress(0);
    setScreen("loading");
    const ok = await engine.loadGame();
    if (ok) {
      setSeedInput(String(engine.getSeed()));
    } else {
      setScreen("playing");
    }
  };

  const handleSettingsChange = (partial: Partial<GameSettingsData>) => {
    const engine = engineRef.current;
    if (partial.renderDistance !== undefined) {
      if (engine) engine.setRenderDistance(partial.renderDistance);
      else gameSettings.update({ renderDistance: partial.renderDistance });
    }
    if (partial.mouseSensitivity !== undefined) {
      if (engine) engine.setMouseSensitivity(partial.mouseSensitivity);
      else gameSettings.update({ mouseSensitivity: partial.mouseSensitivity });
    }
    if (partial.masterVolume !== undefined) {
      if (engine) engine.setMasterVolume(partial.masterVolume);
      else gameSettings.update({ masterVolume: partial.masterVolume });
    }
    if (partial.showFps !== undefined) {
      gameSettings.update({ showFps: partial.showFps });
    }
  };

  const inventoryOpen = stats?.inventoryOpen ?? false;
  const showPauseMenu = screen === "playing" && !!stats && !locked && !inventoryOpen;

  const targetInfo =
    stats && stats.interaction.hasTarget && stats.interaction.targetedBlockX !== null
      ? `(${stats.interaction.targetedBlockX}, ${stats.interaction.targetedBlockY}, ${stats.interaction.targetedBlockZ})`
      : "—";

  const hotbarSlots: Slot[] = stats ? stats.inventory.slots.slice(0, HOTBAR_SIZE) : new Array(HOTBAR_SIZE).fill(null);
  const selectedHotbar = stats?.inventory.selectedHotbar ?? 0;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <div ref={containerRef} className="absolute inset-0" />

      {screen === "playing" && locked && !inventoryOpen && <Crosshair />}

      {screen === "playing" && stats && (
        <div className="pointer-events-none absolute left-4 top-4 space-y-1 rounded-lg bg-black/45 px-4 py-3 font-mono text-xs text-emerald-300 shadow-lg backdrop-blur-sm">
          <p className="text-sm font-semibold text-white">Mini Voxel World</p>
          {settingsData.showFps && <p>FPS: {stats.fps.toFixed(1)}</p>}
          <p>Vị trí: ({stats.x.toFixed(1)}, {stats.y.toFixed(1)}, {stats.z.toFixed(1)})</p>
          <p>Block đang ngắm: {targetInfo}</p>
          <p>World seed: {stats.seed}</p>
          <p>Chunks đã load: {stats.chunkCount} • Render distance: {stats.renderDistance}</p>
          <p>Giờ trong game: {stats.clockLabel} {stats.inWater ? "🌊 (đang bơi)" : ""}</p>
        </div>
      )}

      {msg && (
        <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500/90 px-6 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition-opacity">
          {msg}
        </div>
      )}

      {screen === "playing" && stats && !inventoryOpen && (
        <Hotbar
          hotbarSlots={hotbarSlots}
          selectedSlot={selectedHotbar}
          onSelect={(i) => engineRef.current?.selectHotbar(i)}
        />
      )}

      {screen === "playing" && inventoryOpen && stats && (
        <InventoryScreen
          slots={stats.inventory.slots}
          selectedHotbar={stats.inventory.selectedHotbar}
          cursorStack={stats.inventory.cursorStack}
          onSlotClick={(index, rightClick) => engineRef.current?.clickInventorySlot(index, rightClick)}
          onClose={() => engineRef.current?.closeInventory()}
        />
      )}

      {showPauseMenu && (
        <PauseMenu
          onResume={() => engineRef.current?.resumeGame()}
          onOpenInventory={() => engineRef.current?.openInventory()}
          onOpenSettings={() => setShowSettings(true)}
          onBackToMenu={handleBackToMenu}
          seedInput={seedInput}
          onSeedChange={setSeedInput}
          onRegenerate={() => handleRegenerate()}
          onRandomSeed={handleRandomSeed}
          onSave={() => engineRef.current?.saveGame()}
          onLoad={handleReloadInGame}
        />
      )}

      {screen === "menu" && (
        <MainMenu
          seedInput={seedInput}
          onSeedChange={setSeedInput}
          onStartNewWorld={handleStartNewWorld}
          onLoadWorld={handleLoadWorld}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {screen === "loading" && (
        <LoadingScreen progress={loadProgress} seed={engineRef.current?.getSeed() ?? normalizeSeedInput(seedInput)} />
      )}

      {showSettings && (
        <SettingsPanel values={settingsData} onChange={handleSettingsChange} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
