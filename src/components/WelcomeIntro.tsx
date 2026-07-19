import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, RotateCcw, Sparkles, X, MousePointer2, PanelLeftClose, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "mra.welcome.seen";

export function useIntroController() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setOpen(true), 250);
      return () => clearTimeout(t);
    }
  }, []);
  return {
    open,
    close: () => {
      if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, "1");
      setOpen(false);
    },
    replay: () => setOpen(true),
  };
}

/* ----------------------------- Simulation ----------------------------- */

// Timing (ms) — total loop = 9000
const T = {
  step1Start: 300,
  cursorToToggle: 1000, // cursor arrives at sidebar toggle
  sidebarCollapse: 1600, // sidebar collapses
  step1End: 2600,

  step2Start: 2700,
  cursorToCard: 3600, // cursor grabs card
  dragStart: 4000,
  dragEnd: 6200, // over completed
  drop: 6500,
  celebrate: 6700,
  loopEnd: 9000,
};

const CAPTIONS: { at: number; text: string; step: 1 | 2 }[] = [
  { at: 0, step: 1, text: "1. Collapse workspace for a focused fullscreen view." },
  { at: T.step2Start, step: 2, text: "2. Drag and drop tasks seamlessly across your workflow pipeline." },
];

type Pt = { x: number; y: number };

// Cursor keyframe path (percentages of the stage box)
const CURSOR_PATH: { t: number; p: Pt }[] = [
  { t: 0, p: { x: 50, y: 80 } },
  { t: T.cursorToToggle, p: { x: 8, y: 18 } }, // sidebar toggle
  { t: T.sidebarCollapse, p: { x: 8, y: 18 } },
  { t: T.step1End, p: { x: 15, y: 55 } },
  { t: T.cursorToCard, p: { x: 18, y: 55 } }, // over card in backlog
  { t: T.dragStart, p: { x: 18, y: 55 } },
  { t: T.dragEnd, p: { x: 82, y: 55 } }, // over completed
  { t: T.drop, p: { x: 82, y: 55 } },
  { t: T.loopEnd, p: { x: 82, y: 60 } },
];

function lerp(a: number, b: number, k: number) {
  return a + (b - a) * k;
}
function easeInOut(k: number) {
  return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
}
function cursorAt(ms: number): Pt {
  for (let i = 0; i < CURSOR_PATH.length - 1; i++) {
    const a = CURSOR_PATH[i];
    const b = CURSOR_PATH[i + 1];
    if (ms >= a.t && ms <= b.t) {
      const k = b.t === a.t ? 1 : easeInOut((ms - a.t) / (b.t - a.t));
      return { x: lerp(a.p.x, b.p.x, k), y: lerp(a.p.y, b.p.y, k) };
    }
  }
  return CURSOR_PATH[CURSOR_PATH.length - 1].p;
}

const COLUMNS = [
  { id: "backlog", name: "Backlog", accent: "from-slate-400/40 to-slate-500/10" },
  { id: "progress", name: "In Progress", accent: "from-blue-400/40 to-blue-500/10" },
  { id: "review", name: "Review", accent: "from-amber-400/40 to-amber-500/10" },
  { id: "completed", name: "Completed", accent: "from-emerald-400/50 to-emerald-500/10" },
];

function BoardSimulation({ time, playing }: { time: number; playing: boolean }) {
  const cursor = cursorAt(time);
  const sidebarCollapsed = time >= T.sidebarCollapse - 200;
  const dragging = time >= T.dragStart && time < T.drop;
  const dropped = time >= T.drop;

  // Card position during drag: interpolate x from 18% to 82%
  const cardProgress =
    dragging ? easeInOut(Math.min(1, (time - T.dragStart) / (T.dragEnd - T.dragStart))) : dragging ? 0 : 0;

  // Which column is "hot" as the cursor passes
  const cursorCol = Math.min(3, Math.max(0, Math.floor((cursor.x - 15) / ((85 - 15) / 4))));
  const showDropZones = dragging;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-[#0b1024] via-[#0e1330] to-[#0a0f24] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
      {/* aurora */}
      <div className="pointer-events-none absolute -inset-10 opacity-70 blur-3xl">
        <div className="absolute left-[10%] top-[10%] h-40 w-40 rounded-full bg-indigo-500/40" />
        <div className="absolute right-[15%] top-[30%] h-56 w-56 rounded-full bg-violet-500/30" />
        <div className="absolute bottom-[10%] left-[30%] h-40 w-40 rounded-full bg-cyan-400/30" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center gap-2 border-b border-white/10 bg-white/[0.04] px-3 py-2 backdrop-blur-md">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        </div>
        <div className="ml-2 text-[10px] font-medium tracking-wide text-white/70">
          Masum Raj Automation · Board
        </div>
      </div>

      {/* Body: sidebar + board */}
      <div className="relative z-10 flex h-[calc(100%-32px)]">
        {/* Sidebar */}
        <motion.aside
          animate={{ width: sidebarCollapsed ? 36 : 120 }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
          className="relative shrink-0 border-r border-white/10 bg-white/[0.03] p-2 backdrop-blur-md"
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-[9px] font-semibold uppercase tracking-widest text-white/60 transition-opacity",
                sidebarCollapsed && "opacity-0",
              )}
            >
              Workspace
            </span>
            <motion.span
              animate={{
                scale: time >= T.cursorToToggle - 200 && time <= T.sidebarCollapse + 200 ? 1.15 : 1,
                backgroundColor:
                  time >= T.cursorToToggle - 200 && time <= T.sidebarCollapse + 200
                    ? "rgba(139,92,246,0.6)"
                    : "rgba(255,255,255,0.08)",
              }}
              className="grid h-5 w-5 place-items-center rounded-md text-white"
            >
              <PanelLeftClose className="h-3 w-3" />
            </motion.span>
          </div>
          {!sidebarCollapsed && (
            <div className="mt-3 space-y-1.5">
              {["Board", "Dashboard", "Calendar", "Docs"].map((l, i) => (
                <div
                  key={l}
                  className={cn(
                    "rounded-md px-1.5 py-1 text-[9px] font-medium text-white/70",
                    i === 0 && "bg-white/10 text-white",
                  )}
                >
                  {l}
                </div>
              ))}
            </div>
          )}
        </motion.aside>

        {/* Board */}
        <div className="relative flex-1 p-2">
          <div className="grid h-full grid-cols-4 gap-2">
            {COLUMNS.map((c, i) => {
              const isDropTarget = showDropZones && cursorCol === i;
              const isFinalTarget = dropped && c.id === "completed";
              return (
                <div
                  key={c.id}
                  className={cn(
                    "relative flex flex-col rounded-xl border border-white/10 bg-white/[0.04] p-1.5 backdrop-blur-sm transition-all",
                    isDropTarget && "border-primary/60 bg-primary/10 shadow-[0_0_0_2px_rgba(139,92,246,0.35)]",
                    isFinalTarget && "border-emerald-400/60 bg-emerald-400/10",
                  )}
                >
                  <div className="flex items-center justify-between px-1 pb-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-white/70">
                      {c.name}
                    </span>
                    <span className="rounded bg-white/10 px-1 text-[8px] text-white/60">
                      {c.id === "backlog" && !dropped ? 1 : c.id === "completed" && dropped ? 1 : 0}
                    </span>
                  </div>
                  <div className={cn("h-full rounded-md bg-gradient-to-b", c.accent, "opacity-40")} />
                </div>
              );
            })}
          </div>

          {/* The moving task card (absolute overlay across board area) */}
          {(() => {
            // Board area is inside p-2, grid 4 cols. Compute card left in percentage of board area.
            // Backlog center ~ 12.5%, Completed center ~ 87.5%.
            const startPct = 6; // inside backlog col
            const endPct = 74; // inside completed col
            const leftPct = dropped ? endPct : startPct + (endPct - startPct) * cardProgress;
            const lifted = dragging;
            return (
              <motion.div
                animate={{
                  left: `${leftPct}%`,
                  scale: lifted ? 1.04 : 1,
                  rotate: lifted ? -2 : 0,
                  boxShadow: lifted
                    ? "0 20px 40px -10px rgba(139,92,246,0.55)"
                    : "0 6px 16px -6px rgba(0,0,0,0.6)",
                }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
                className={cn(
                  "absolute top-[38%] w-[20%] rounded-lg border p-2 backdrop-blur-md",
                  dropped
                    ? "border-emerald-400/60 bg-emerald-400/15"
                    : "border-white/15 bg-white/[0.08]",
                )}
                style={{ transformOrigin: "center" }}
              >
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                  <span className="text-[8px] font-medium uppercase tracking-wider text-white/60">
                    Task
                  </span>
                  {dropped && <CheckCircle2 className="ml-auto h-3 w-3 text-emerald-400" />}
                </div>
                <div className="mt-1 text-[10px] font-semibold leading-tight text-white">
                  Deploy Landing Page
                </div>
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="rounded bg-rose-500/20 px-1 py-0.5 text-[7px] font-semibold text-rose-300">
                    High
                  </span>
                  <span className="text-[7px] text-white/50">Jul 22</span>
                </div>
              </motion.div>
            );
          })()}

          {/* Celebration burst */}
          <AnimatePresence>
            {dropped && (
              <motion.div
                key="burst"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: [0, 1, 0], scale: [0.6, 1.4, 1.8] }}
                transition={{ duration: 1.2 }}
                className="pointer-events-none absolute right-[6%] top-[38%] h-16 w-16 rounded-full bg-emerald-400/40 blur-2xl"
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Simulated cursor */}
      <motion.div
        animate={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
        transition={{ type: "tween", ease: "easeInOut", duration: 0.15 }}
        className="pointer-events-none absolute z-20 -translate-x-1 -translate-y-1"
      >
        <MousePointer2
          className={cn(
            "h-5 w-5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] transition-transform",
            dragging && "scale-90",
          )}
          fill="white"
          color="white"
        />
        {dragging && (
          <span className="absolute -right-2 -top-2 grid h-3 w-3 place-items-center rounded-full bg-primary text-[8px] text-primary-foreground">
            •
          </span>
        )}
      </motion.div>

      {!playing && (
        <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-black/30 backdrop-blur-[1px]">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-primary/90 text-primary-foreground shadow-[0_10px_40px_-5px_rgba(139,92,246,0.9)] ring-1 ring-white/20">
            <Play className="h-6 w-6 translate-x-0.5" fill="currentColor" />
          </span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Overlay ------------------------------ */

export default function WelcomeIntro({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);
  const last = useRef<number | null>(null);

  // Auto play when opened, pause when closed
  useEffect(() => {
    if (open) {
      setTime(0);
      setPlaying(true);
    } else {
      setPlaying(false);
    }
  }, [open]);

  // RAF loop
  useEffect(() => {
    if (!playing) {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      last.current = null;
      return;
    }
    const tick = (ts: number) => {
      if (last.current == null) last.current = ts;
      const dt = ts - last.current;
      last.current = ts;
      setTime((t) => (t + dt) % T.loopEnd);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      last.current = null;
    };
  }, [playing]);

  const progress = (time / T.loopEnd) * 100;

  const caption = useMemo(() => {
    let current = CAPTIONS[0];
    for (const c of CAPTIONS) if (time >= c.at) current = c;
    return current;
  }, [time]);

  const toggle = () => setPlaying((p) => !p);
  const restart = () => {
    setTime(0);
    setPlaying(true);
  };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setTime(pct * T.loopEnd);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ perspective: 1400 }}
        >
          <motion.div
            className="absolute inset-0 bg-background/40 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="glass-panel relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl p-6 sm:p-8"
            initial={{ opacity: 0, y: 30, rotateX: -12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, rotateX: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              A quick tour
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome to Masum Raj Automation
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              Watch this interactive walkthrough — everything below is animated live in your browser.
            </p>

            <div className="mt-5">
              <BoardSimulation time={time} playing={playing} />

              {/* Caption */}
              <div className="mt-3 min-h-[24px]">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={caption.step}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="text-sm font-medium text-foreground/90"
                  >
                    {caption.text}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Controls */}
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={toggle}
                  aria-label={playing ? "Pause" : "Play"}
                  className="grid h-9 w-9 place-items-center rounded-full bg-primary/90 text-primary-foreground shadow-[0_8px_20px_-6px_rgba(139,92,246,0.7)] hover:opacity-95"
                >
                  {playing ? (
                    <Pause className="h-4 w-4" fill="currentColor" />
                  ) : (
                    <Play className="h-4 w-4 translate-x-[1px]" fill="currentColor" />
                  )}
                </button>
                <button
                  onClick={restart}
                  aria-label="Restart"
                  className="grid h-9 w-9 place-items-center rounded-full bg-muted text-foreground hover:bg-accent"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <div
                  onClick={seek}
                  className="relative h-2 flex-1 cursor-pointer overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full bg-gradient-to-r from-primary via-fuchsia-500 to-emerald-400 transition-[width] duration-75"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground">
                  {Math.floor(time / 1000)}s / {Math.floor(T.loopEnd / 1000)}s
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                Tip: <kbd className="rounded bg-muted px-1.5 py-0.5">/</kbd> search ·{" "}
                <kbd className="rounded bg-muted px-1.5 py-0.5">⌘K</kbd> commands ·{" "}
                <kbd className="rounded bg-muted px-1.5 py-0.5">N</kbd> new task
              </div>
              <Button
                onClick={onClose}
                className={cn(
                  "bg-gradient-to-r from-primary to-primary/70 shadow-[0_10px_30px_-10px_rgba(139,92,246,0.6)]",
                )}
              >
                Explore Board
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
