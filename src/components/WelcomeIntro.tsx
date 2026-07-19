import { AnimatePresence, motion } from "framer-motion";
import {
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  X,
  MousePointer2,
  CheckCircle2,
  AlertTriangle,
  Users,
} from "lucide-react";
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

/* ============================ Timeline ============================ */

const SCENES = [
  { id: 1, start: 0, end: 3000, caption: "Welcome to your workflow. Easily track tasks from initial backlog to final completion." },
  { id: 2, start: 3000, end: 7000, caption: "1. Prioritize your pipeline by moving tasks from Backlog to To Do." },
  { id: 3, start: 7000, end: 12000, caption: "2. Track active work and instantly flag bottlenecked tasks in the Blocked column." },
  { id: 4, start: 12000, end: 15000, caption: "3. Send tasks to Review for quality assurance and team sign-off." },
  { id: 5, start: 15000, end: 19000, caption: "4. Cross the finish line! Celebrate completed milestones with your team." },
];
const LOOP = SCENES[SCENES.length - 1].end;

/* Column geometry (percent of board area) */
const COLUMNS = [
  { id: "backlog", name: "Backlog", tone: "slate" as const },
  { id: "todo", name: "To Do", tone: "blue" as const },
  { id: "progress", name: "In Progress", tone: "violet" as const },
  { id: "review", name: "Review", tone: "amber" as const },
  { id: "blocked", name: "Blocked", tone: "rose" as const },
  { id: "completed", name: "Completed", tone: "emerald" as const },
];
// centers with 4% board padding
const COL_CENTERS = COLUMNS.map((_, i) => 4 + (92 / 6) * (i + 0.5));
const CARD_W = 13;
const CARD_Y = 50; // top %

/* ============================ Utils ============================ */

function lerp(a: number, b: number, k: number) { return a + (b - a) * k; }
function clamp01(k: number) { return Math.max(0, Math.min(1, k)); }
function easeInOut(k: number) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }

type Pt = { x: number; y: number };

function tween(fromT: number, toT: number, ms: number, from: Pt, to: Pt): Pt {
  if (ms <= fromT) return from;
  if (ms >= toT) return to;
  const k = easeInOut((ms - fromT) / (toT - fromT));
  return { x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k) };
}

/* ============================ Cursor + Card scripting ============================ */

function scriptCursor(ms: number): Pt {
  // Scene 1: sweep across headers y ~ 18%
  if (ms < 3000) {
    const k = easeInOut(ms / 3000);
    return { x: lerp(COL_CENTERS[0], COL_CENTERS[5], k), y: 18 };
  }
  // Scene 2: to backlog card, grab, drag to todo
  if (ms < 7000) {
    const local = ms - 3000;
    if (local < 700) return tween(0, 700, local, { x: COL_CENTERS[5], y: 18 }, { x: COL_CENTERS[0], y: CARD_Y + 6 });
    if (local < 1200) return { x: COL_CENTERS[0], y: CARD_Y + 6 };
    if (local < 3200) {
      const k = easeInOut((local - 1200) / 2000);
      return { x: lerp(COL_CENTERS[0], COL_CENTERS[1], k), y: CARD_Y + 6 };
    }
    return { x: COL_CENTERS[1], y: CARD_Y + 6 };
  }
  // Scene 3: drag to In Progress → auto to Blocked → click Resolve → drag to Review
  if (ms < 12000) {
    const local = ms - 7000;
    // 0-1500 drag from ToDo -> In Progress
    if (local < 1500) {
      const k = easeInOut(local / 1500);
      return { x: lerp(COL_CENTERS[1], COL_CENTERS[2], k), y: CARD_Y + 6 };
    }
    // 1500-2500 cursor moves toward blocked column while card auto-moves
    if (local < 2500) {
      const k = easeInOut((local - 1500) / 1000);
      return { x: lerp(COL_CENTERS[2], COL_CENTERS[4], k), y: CARD_Y + 10 };
    }
    // 2500-3200 hover resolve button (click)
    if (local < 3200) return { x: COL_CENTERS[4], y: CARD_Y + 14 };
    // 3200-5000 drag from Blocked -> Review
    if (local < 5000) {
      const k = easeInOut((local - 3200) / 1800);
      return { x: lerp(COL_CENTERS[4], COL_CENTERS[3], k), y: CARD_Y + 6 };
    }
    return { x: COL_CENTERS[3], y: CARD_Y + 6 };
  }
  // Scene 4: hover profile icons on card in Review
  if (ms < 15000) {
    const local = ms - 12000;
    return tween(0, 1200, local, { x: COL_CENTERS[3], y: CARD_Y + 6 }, { x: COL_CENTERS[3] + 3, y: CARD_Y + 2 });
  }
  // Scene 5: grab from Review, drop into Completed
  const local = ms - 15000;
  if (local < 700) return { x: COL_CENTERS[3], y: CARD_Y + 6 };
  if (local < 2700) {
    const k = easeInOut((local - 700) / 2000);
    return { x: lerp(COL_CENTERS[3], COL_CENTERS[5], k), y: CARD_Y + 6 };
  }
  return { x: COL_CENTERS[5], y: CARD_Y + 6 };
}

type CardState = {
  visible: boolean;
  colIdx: number; // logical column
  x: number; // percent left
  dragging: boolean;
  blocked: boolean;
  approved: boolean;
  completed: boolean;
};

function scriptCard(ms: number): CardState {
  const base: CardState = {
    visible: false,
    colIdx: 0,
    x: COL_CENTERS[0] - CARD_W / 2,
    dragging: false,
    blocked: false,
    approved: false,
    completed: false,
  };

  if (ms < 3000) return base; // Scene 1 — no card yet

  // Scene 2: appear in Backlog, drag to To Do
  if (ms < 7000) {
    const local = ms - 3000;
    let x = COL_CENTERS[0];
    let dragging = false;
    let colIdx = 0;
    if (local < 1200) { x = COL_CENTERS[0]; colIdx = 0; }
    else if (local < 3200) {
      dragging = true;
      const k = easeInOut((local - 1200) / 2000);
      x = lerp(COL_CENTERS[0], COL_CENTERS[1], k);
      colIdx = k > 0.5 ? 1 : 0;
    } else { x = COL_CENTERS[1]; colIdx = 1; }
    return { ...base, visible: true, x: x - CARD_W / 2, dragging, colIdx };
  }

  // Scene 3
  if (ms < 12000) {
    const local = ms - 7000;
    let x = COL_CENTERS[1];
    let colIdx = 1;
    let dragging = false;
    let blocked = false;
    // 0-1500 drag ToDo -> In Progress
    if (local < 1500) {
      dragging = true;
      const k = easeInOut(local / 1500);
      x = lerp(COL_CENTERS[1], COL_CENTERS[2], k);
      colIdx = k > 0.5 ? 2 : 1;
    }
    // 1500-2200 sit In Progress
    else if (local < 2200) { x = COL_CENTERS[2]; colIdx = 2; }
    // 2200-3200 auto-move to Blocked (self-driven), badge appears
    else if (local < 3200) {
      const k = easeInOut((local - 2200) / 1000);
      x = lerp(COL_CENTERS[2], COL_CENTERS[4], k);
      colIdx = k > 0.5 ? 4 : 2;
      blocked = true;
    }
    // 3200-3400 sits in Blocked with badge (cursor arrives, clicks Resolve at ~3200)
    else if (local < 3400) { x = COL_CENTERS[4]; colIdx = 4; blocked = true; }
    // 3400-5000 drag Blocked -> Review, badge fading
    else if (local < 5000) {
      dragging = true;
      const k = easeInOut((local - 3400) / 1600);
      x = lerp(COL_CENTERS[4], COL_CENTERS[3], k);
      colIdx = k > 0.5 ? 3 : 4;
      blocked = false;
    }
    return { ...base, visible: true, x: x - CARD_W / 2, dragging, colIdx, blocked };
  }

  // Scene 4: sit in Review, approval appears late
  if (ms < 15000) {
    const local = ms - 12000;
    return {
      ...base,
      visible: true,
      x: COL_CENTERS[3] - CARD_W / 2,
      colIdx: 3,
      approved: local > 1400,
    };
  }

  // Scene 5: drag Review -> Completed
  const local = ms - 15000;
  let x = COL_CENTERS[3];
  let colIdx = 3;
  let dragging = false;
  let completed = false;
  if (local < 700) { x = COL_CENTERS[3]; }
  else if (local < 2700) {
    dragging = true;
    const k = easeInOut((local - 700) / 2000);
    x = lerp(COL_CENTERS[3], COL_CENTERS[5], k);
    colIdx = k > 0.5 ? 5 : 3;
  } else { x = COL_CENTERS[5]; colIdx = 5; completed = true; }
  return { ...base, visible: true, x: x - CARD_W / 2, dragging, colIdx, approved: true, completed };
}

/* ============================ Board Sim ============================ */

const TONE_RING: Record<string, string> = {
  slate: "ring-slate-400/50 bg-slate-400/10",
  blue: "ring-blue-400/70 bg-blue-500/15 shadow-[0_0_24px_-4px_rgba(59,130,246,0.75)]",
  violet: "ring-violet-400/70 bg-violet-500/15 shadow-[0_0_24px_-4px_rgba(139,92,246,0.75)]",
  amber: "ring-amber-400/70 bg-amber-400/15 shadow-[0_0_24px_-4px_rgba(251,191,36,0.7)]",
  rose: "ring-rose-500/80 bg-rose-500/15 shadow-[0_0_28px_-4px_rgba(244,63,94,0.8)]",
  emerald: "ring-emerald-400/80 bg-emerald-400/15 shadow-[0_0_28px_-4px_rgba(52,211,153,0.8)]",
};

const TONE_HEADER: Record<string, string> = {
  slate: "text-slate-200",
  blue: "text-blue-200",
  violet: "text-violet-200",
  amber: "text-amber-200",
  rose: "text-rose-200",
  emerald: "text-emerald-200",
};

const CONFETTI = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  dx: (Math.random() - 0.5) * 140,
  dy: -40 - Math.random() * 90,
  rot: (Math.random() - 0.5) * 360,
  color: ["#34d399", "#a78bfa", "#60a5fa", "#f472b6", "#fbbf24"][i % 5],
  delay: Math.random() * 0.15,
}));

function BoardSim({ time, playing }: { time: number; playing: boolean }) {
  const cursor = scriptCursor(time);
  const card = scriptCard(time);
  const scene = SCENES.find((s) => time >= s.start && time < s.end) ?? SCENES[0];

  // Scene 1: which header is highlighted right now
  const hoverIdx =
    scene.id === 1
      ? Math.max(0, Math.min(5, Math.round(((cursor.x - COL_CENTERS[0]) / (COL_CENTERS[5] - COL_CENTERS[0])) * 5)))
      : -1;

  const showConfetti = scene.id === 5 && time - 15000 > 2650 && time - 15000 < 3800;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-[#0b1024] via-[#0e1330] to-[#0a0f24] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
      {/* aurora */}
      <div className="pointer-events-none absolute -inset-10 opacity-70 blur-3xl">
        <div className="absolute left-[10%] top-[10%] h-40 w-40 rounded-full bg-indigo-500/40" />
        <div className="absolute right-[15%] top-[30%] h-56 w-56 rounded-full bg-violet-500/30" />
        <div className="absolute bottom-[10%] left-[30%] h-40 w-40 rounded-full bg-cyan-400/30" />
      </div>

      {/* Top window bar */}
      <div className="relative z-10 flex items-center gap-2 border-b border-white/10 bg-white/[0.04] px-3 py-2 backdrop-blur-md">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        </div>
        <div className="ml-2 text-[10px] font-medium tracking-wide text-white/70">
          Masum Raj Automation · Board
        </div>
        <div className="ml-auto text-[10px] uppercase tracking-widest text-white/50">
          Scene {scene.id} / 5
        </div>
      </div>

      {/* Board area */}
      <div className="relative h-[calc(100%-32px)] p-2">
        <div className="grid h-full grid-cols-6 gap-1.5">
          {COLUMNS.map((c, i) => {
            const isDragOver =
              card.dragging && card.colIdx === i;
            const isBlockedGlow = c.id === "blocked" && card.blocked && card.colIdx === 4;
            const isCompletedGlow = c.id === "completed" && card.completed;
            const isHeaderHover = hoverIdx === i;
            return (
              <div
                key={c.id}
                className={cn(
                  "relative flex flex-col rounded-xl border border-white/10 bg-white/[0.04] p-1.5 backdrop-blur-sm ring-0 transition-all duration-300",
                  isDragOver && `ring-2 ${TONE_RING[c.tone]}`,
                  isBlockedGlow && `ring-2 ${TONE_RING.rose}`,
                  isCompletedGlow && `ring-2 ${TONE_RING.emerald}`,
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-between rounded-md px-1 py-0.5 transition-all",
                    isHeaderHover && "bg-white/10 ring-1 ring-primary/50",
                  )}
                >
                  <span
                    className={cn(
                      "text-[8px] font-semibold uppercase tracking-wider text-white/70",
                      isHeaderHover && TONE_HEADER[c.tone],
                    )}
                  >
                    {c.name}
                  </span>
                  <span className="rounded bg-white/10 px-1 text-[7px] text-white/60">
                    {c.id === "backlog" && !card.visible ? 0 : ""}
                  </span>
                </div>
                <div className="mt-1 flex-1 rounded-md bg-gradient-to-b from-white/5 to-transparent opacity-40" />
              </div>
            );
          })}
        </div>

        {/* The floating task card */}
        <AnimatePresence>
          {card.visible && (
            <motion.div
              key="task"
              initial={{ opacity: 0, y: 6, scale: 0.94 }}
              animate={{
                opacity: 1,
                y: 0,
                left: `${card.x}%`,
                scale: card.dragging ? 1.05 : 1,
                rotate: card.dragging ? -2 : 0,
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
              className={cn(
                "absolute rounded-lg border p-1.5 backdrop-blur-md",
                card.completed
                  ? "border-emerald-400/70 bg-emerald-400/15 shadow-[0_10px_30px_-6px_rgba(52,211,153,0.6)]"
                  : card.blocked
                    ? "border-rose-400/60 bg-rose-500/10"
                    : "border-white/15 bg-white/[0.08]",
              )}
              style={{
                width: `${CARD_W}%`,
                top: `${CARD_Y}%`,
                boxShadow: card.dragging
                  ? "0 20px 40px -10px rgba(139,92,246,0.55)"
                  : "0 6px 16px -6px rgba(0,0,0,0.6)",
                transformOrigin: "center",
              }}
            >
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                <span className="text-[7px] font-medium uppercase tracking-wider text-white/60">
                  Task
                </span>
                <AnimatePresence>
                  {card.approved && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="ml-auto grid h-3 w-3 place-items-center rounded-full bg-emerald-400 text-[8px] text-emerald-950"
                    >
                      <CheckCircle2 className="h-2.5 w-2.5" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div className="mt-0.5 text-[9px] font-semibold leading-tight text-white">
                Integrate API Automation
              </div>
              <div className="mt-1 flex items-center gap-1">
                <span className="rounded bg-rose-500/20 px-1 py-0.5 text-[6px] font-semibold text-rose-300">
                  High
                </span>
                <span className="text-[6px] text-white/50">Jul 24</span>
                <span className="ml-auto flex -space-x-1">
                  <span className="h-3 w-3 rounded-full border border-white/30 bg-gradient-to-br from-indigo-400 to-violet-500" />
                  <span className="h-3 w-3 rounded-full border border-white/30 bg-gradient-to-br from-cyan-400 to-blue-500" />
                </span>
              </div>

              {/* Blocked badge */}
              <AnimatePresence>
                {card.blocked && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-1 flex items-center gap-1 rounded border border-rose-400/50 bg-rose-500/20 px-1 py-0.5 text-[6px] font-semibold text-rose-200"
                  >
                    <AlertTriangle className="h-2 w-2" />
                    Blocked: API Credentials Missing
                    <button className="ml-auto rounded bg-white/15 px-1 text-[6px] text-white">
                      Resolve
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Confetti burst on completion */}
              {showConfetti && (
                <div className="pointer-events-none absolute inset-0">
                  {CONFETTI.map((p) => (
                    <motion.span
                      key={p.id}
                      initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
                      animate={{ opacity: 0, x: p.dx, y: p.dy, rotate: p.rot }}
                      transition={{ duration: 1.1, delay: p.delay, ease: "easeOut" }}
                      className="absolute left-1/2 top-1/2 h-1.5 w-1 rounded-[1px]"
                      style={{ background: p.color }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Simulated cursor */}
      <motion.div
        animate={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
        transition={{ type: "tween", ease: "linear", duration: 0.08 }}
        className="pointer-events-none absolute z-20 -translate-x-1 -translate-y-1"
      >
        <MousePointer2
          className={cn("h-5 w-5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]", card.dragging && "scale-90")}
          fill="white"
          color="white"
        />
        {card.dragging && (
          <span className="absolute -right-1.5 -top-1.5 grid h-2.5 w-2.5 place-items-center rounded-full bg-primary text-primary-foreground" />
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

/* ============================ Overlay ============================ */

export default function WelcomeIntro({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);
  const last = useRef<number | null>(null);

  useEffect(() => {
    if (open) { setTime(0); setPlaying(true); } else { setPlaying(false); }
  }, [open]);

  useEffect(() => {
    if (!playing) {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null; last.current = null;
      return;
    }
    const tick = (ts: number) => {
      if (last.current == null) last.current = ts;
      const dt = ts - last.current;
      last.current = ts;
      setTime((t) => (t + dt) % LOOP);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null; last.current = null;
    };
  }, [playing]);

  const progress = (time / LOOP) * 100;
  const activeScene = useMemo(
    () => SCENES.find((s) => time >= s.start && time < s.end) ?? SCENES[SCENES.length - 1],
    [time],
  );

  const toggle = () => setPlaying((p) => !p);
  const restart = () => { setTime(0); setPlaying(true); };
  const jumpTo = (sceneId: number) => {
    const s = SCENES.find((x) => x.id === sceneId);
    if (s) { setTime(s.start + 10); setPlaying(true); }
  };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = clamp01((e.clientX - rect.left) / rect.width);
    setTime(pct * LOOP);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ perspective: 1400 }}
        >
          <motion.div
            className="absolute inset-0 bg-background/40 backdrop-blur-md"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="glass-panel relative z-10 w-full max-w-4xl overflow-hidden rounded-3xl p-6 sm:p-8"
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
              Interactive tour
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome to Masum Raj Automation
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              A 5-scene walkthrough — every pixel below is rendered live in your browser.
            </p>

            <div className="mt-5">
              <BoardSim time={time} playing={playing} />

              {/* Caption */}
              <div className="mt-3 min-h-[24px]">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={activeScene.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="text-sm font-medium text-foreground/90"
                  >
                    {activeScene.caption}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Scene dots */}
              <div className="mt-3 flex items-center gap-2">
                {SCENES.map((s) => {
                  const active = activeScene.id === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => jumpTo(s.id)}
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                        active
                          ? "border-primary/70 bg-primary/15 text-primary"
                          : "border-border/50 bg-muted text-muted-foreground hover:bg-accent",
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-primary" : "bg-muted-foreground/60")} />
                      Scene {s.id}
                    </button>
                  );
                })}
              </div>

              {/* Segmented timeline */}
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={toggle}
                  aria-label={playing ? "Pause" : "Play"}
                  className="grid h-9 w-9 place-items-center rounded-full bg-primary/90 text-primary-foreground shadow-[0_8px_20px_-6px_rgba(139,92,246,0.7)] hover:opacity-95"
                >
                  {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4 translate-x-[1px]" fill="currentColor" />}
                </button>
                <button
                  onClick={restart}
                  aria-label="Restart"
                  className="grid h-9 w-9 place-items-center rounded-full bg-muted text-foreground hover:bg-accent"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                <div className="relative flex-1">
                  {/* Segments */}
                  <div onClick={seek} className="relative flex h-2 cursor-pointer overflow-hidden rounded-full bg-muted">
                    {SCENES.map((s) => {
                      const w = ((s.end - s.start) / LOOP) * 100;
                      return (
                        <div
                          key={s.id}
                          onClick={(e) => { e.stopPropagation(); jumpTo(s.id); }}
                          className="relative h-full border-r border-background/80 last:border-r-0"
                          style={{ width: `${w}%` }}
                        />
                      );
                    })}
                    <div
                      className="pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-fuchsia-500 to-emerald-400"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <span className="w-14 text-right text-[11px] tabular-nums text-muted-foreground">
                  {(time / 1000).toFixed(1)}s / {(LOOP / 1000).toFixed(0)}s
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                Tip: <kbd className="rounded bg-muted px-1.5 py-0.5">/</kbd> search ·{" "}
                <kbd className="rounded bg-muted px-1.5 py-0.5">⌘K</kbd> commands ·{" "}
                <kbd className="rounded bg-muted px-1.5 py-0.5">N</kbd> new task
              </div>
              <Button
                onClick={onClose}
                className={cn("bg-gradient-to-r from-primary to-primary/70 shadow-[0_10px_30px_-10px_rgba(139,92,246,0.6)]")}
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
