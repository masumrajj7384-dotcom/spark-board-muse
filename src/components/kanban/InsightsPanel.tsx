import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, TrendingUp, Target, Flame, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskWithMeta, ColumnRow } from "@/lib/board-data";

// Deterministic pseudo-random from seed
function seeded(seed: number) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function AreaChart({ values, color }: { values: number[]; color: string }) {
  const w = 240;
  const h = 60;
  const max = Math.max(...values, 1);
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => [i * step, h - (v / max) * (h - 6) - 3] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const id = `grad-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.55" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id={`glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" filter={`url(#glow-${id})`} />
      {pts.slice(-1).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill={color} filter={`url(#glow-${id})`} />
      ))}
    </svg>
  );
}

function CircularProgress({ value, color }: { value: number; color: string }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <div className="relative grid place-items-center">
      <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} stroke="currentColor" strokeOpacity="0.12" strokeWidth="6" fill="none" />
        <circle
          cx="40"
          cy="40"
          r={r}
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dashoffset 800ms cubic-bezier(0.2,0.8,0.2,1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-lg font-semibold leading-none tabular-nums">{Math.round(value)}%</div>
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">done</div>
      </div>
    </div>
  );
}

function BurndownChart({ total, remaining }: { total: number; remaining: number }) {
  const w = 240;
  const h = 60;
  const days = 10;
  const ideal = Array.from({ length: days }, (_, i) => total - (total / (days - 1)) * i);
  const actual = Array.from({ length: days }, (_, i) => {
    const noise = (seeded(i + 3) - 0.5) * (total * 0.12);
    return Math.max(0, total - (total / (days - 1)) * i * 0.9 + noise);
  });
  actual[actual.length - 1] = remaining;
  const max = Math.max(total, 1);
  const step = w / (days - 1);
  const toPath = (vals: number[]) =>
    vals
      .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - (v / max) * (h - 6) - 3).toFixed(1)}`)
      .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <defs>
        <linearGradient id="burn-actual" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="oklch(0.7 0.22 15)" />
          <stop offset="100%" stopColor="oklch(0.72 0.18 155)" />
        </linearGradient>
      </defs>
      <path d={toPath(ideal)} stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="3,3" fill="none" />
      <path
        d={toPath(actual)}
        stroke="url(#burn-actual)"
        strokeWidth="1.75"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 5px oklch(0.7 0.2 300 / 0.8))" }}
      />
    </svg>
  );
}

export default function InsightsPanel({ tasks, columns }: { tasks: TaskWithMeta[]; columns: ColumnRow[] }) {
  const [open, setOpen] = useState(true);

  const metrics = useMemo(() => {
    const total = tasks.length;
    const completedCol = columns.find((c) => c.color === "emerald");
    const completed = completedCol ? tasks.filter((t) => t.column_id === completedCol.id || t.completed).length : tasks.filter((t) => t.completed).length;
    const inProgress = tasks.filter((t) => {
      const c = columns.find((c) => c.id === t.column_id);
      return c?.color === "violet";
    }).length;
    const blocked = tasks.filter((t) => {
      const c = columns.find((c) => c.id === t.column_id);
      return c?.color === "rose";
    }).length;
    const pct = total ? (completed / total) * 100 : 0;

    // Velocity = simulated 8-week series scaled by activity
    const base = Math.max(2, Math.round(total / 3));
    const velocity = Array.from({ length: 8 }, (_, i) => Math.round(base * (0.6 + seeded(i + total) * 0.9)));
    return { total, completed, inProgress, blocked, pct, velocity, remaining: Math.max(total - completed, 0) };
  }, [tasks, columns]);

  return (
    <motion.div layout className="glass-panel relative mb-5 overflow-hidden rounded-2xl">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-[0_6px_18px_-4px_color-mix(in_oklab,var(--color-primary)_60%,transparent)]">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold tracking-tight">Executive Insights</div>
          <div className="text-[11px] text-muted-foreground">
            {metrics.total} tasks · {metrics.completed} completed · {metrics.blocked} blocked
          </div>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Live
          </span>
          <span className="grid h-2 w-2 place-items-center">
            <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400/60" />
            <span className="absolute h-2 w-2 rounded-full bg-emerald-400" />
          </span>
        </div>
        <ChevronDown className={cn("ml-2 h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-3 border-t border-white/5 p-4 md:grid-cols-3">
              {/* Velocity */}
              <div className="glass rounded-xl p-3">
                <div className="mb-1 flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-col-violet" />
                  <span className="text-xs font-medium">Team Velocity</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">8w</span>
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {metrics.velocity.reduce((a, b) => a + b, 0)} <span className="text-[10px] font-normal text-muted-foreground">pts</span>
                </div>
                <AreaChart values={metrics.velocity} color="oklch(0.72 0.22 295)" />
              </div>

              {/* Sprint Completion */}
              <div className="glass flex items-center gap-3 rounded-xl p-3">
                <CircularProgress value={metrics.pct} color="oklch(0.72 0.2 245)" />
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-col-blue" />
                    <span className="text-xs font-medium">Sprint Completion</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {metrics.completed} of {metrics.total} shipped
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {metrics.inProgress} in progress · {metrics.blocked} blocked
                  </div>
                </div>
              </div>

              {/* Burndown */}
              <div className="glass rounded-xl p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Flame className="h-3.5 w-3.5 text-col-rose" />
                  <span className="text-xs font-medium">Burndown</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">2w sprint</span>
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {metrics.remaining} <span className="text-[10px] font-normal text-muted-foreground">remaining</span>
                </div>
                <BurndownChart total={metrics.total} remaining={metrics.remaining} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
