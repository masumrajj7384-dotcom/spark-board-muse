import { AnimatePresence, motion } from "framer-motion";
import { MousePointer2, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "mra.welcome.seen";

type Col = "backlog" | "todo" | "completed";
const COLS: { id: Col; label: string; dot: string; ring: string }[] = [
  { id: "backlog", label: "Backlog", dot: "bg-slate-400", ring: "ring-slate-400/40" },
  { id: "todo", label: "To Do", dot: "bg-blue-400", ring: "ring-blue-400/50" },
  { id: "completed", label: "Completed", dot: "bg-emerald-400", ring: "ring-emerald-400/60" },
];

/**
 * useIntroController — exposes { open, close, replay } and auto-opens on first visit.
 */
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

export default function WelcomeIntro({ open, onClose }: { open: boolean; onClose: () => void }) {
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
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-background/40 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="glass-panel relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl p-6 sm:p-8"
            initial={{ opacity: 0, y: 30, rotateX: -12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, rotateX: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
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
              A living, glassmorphic Kanban board. Drag tasks across columns, ask the AI assistant
              anything, and let the aurora do the rest. Here's how it flows.
            </p>

            <DemoBoard />

            <div className="mt-6 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                Tip: press <kbd className="rounded bg-muted px-1.5 py-0.5">/</kbd> to search,{" "}
                <kbd className="rounded bg-muted px-1.5 py-0.5">⌘K</kbd> for commands,{" "}
                <kbd className="rounded bg-muted px-1.5 py-0.5">N</kbd> for a new task.
              </div>
              <Button
                onClick={onClose}
                className="bg-gradient-to-r from-primary to-primary/70 shadow-[0_10px_30px_-10px_rgba(139,92,246,0.6)]"
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

/** Mock board with an auto-moving cursor that grabs a card from Backlog → To Do → Completed. */
function DemoBoard() {
  const [col, setCol] = useState<Col>("backlog");
  const [dragging, setDragging] = useState(false);
  const [hoverCol, setHoverCol] = useState<Col | null>(null);
  // cursor position in % of demo container
  const [cursor, setCursor] = useState({ x: 18, y: 55 });

  useEffect(() => {
    let alive = true;
    const seq: { x: number; y: number; wait: number; on?: () => void }[] = [
      { x: 18, y: 55, wait: 500 }, // rest over Backlog card
      { x: 18, y: 55, wait: 400, on: () => setDragging(true) }, // grab
      { x: 50, y: 55, wait: 700, on: () => { setCol("todo"); setHoverCol("todo"); } }, // over To Do
      { x: 50, y: 55, wait: 500 },
      { x: 82, y: 55, wait: 800, on: () => { setCol("completed"); setHoverCol("completed"); } }, // over Completed
      { x: 82, y: 55, wait: 500, on: () => { setDragging(false); setHoverCol(null); } }, // drop
      { x: 82, y: 55, wait: 900 },
      // reset
      { x: 18, y: 55, wait: 600, on: () => { setCol("backlog"); } },
    ];
    let i = 0;
    const tick = () => {
      if (!alive) return;
      const step = seq[i];
      setCursor({ x: step.x, y: step.y });
      step.on?.();
      i = (i + 1) % seq.length;
      setTimeout(tick, step.wait);
    };
    const t = setTimeout(tick, 600);
    return () => { alive = false; clearTimeout(t); };
  }, []);

  return (
    <div className="relative mt-6 h-64 w-full overflow-hidden rounded-2xl border border-border/40 bg-background/30 p-3">
      <div className="grid h-full grid-cols-3 gap-3">
        {COLS.map((c) => (
          <div
            key={c.id}
            className={cn(
              "glass relative flex flex-col rounded-xl p-2.5 transition-all",
              hoverCol === c.id && `ring-2 ${c.ring} scale-[1.02]`,
            )}
          >
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium">
              <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
              {c.label}
            </div>
            <div className="flex-1">
              {col === c.id && (
                <motion.div
                  layoutId="demo-card"
                  transition={{ type: "spring", stiffness: 240, damping: 26 }}
                  className={cn(
                    "rounded-lg border-l-[3px] border-l-primary bg-card/70 p-2 shadow-lg backdrop-blur",
                    dragging && "ring-2 ring-primary/60 shadow-[0_20px_40px_-10px_rgba(139,92,246,0.6)] rotate-[1deg]",
                  )}
                >
                  <div className="text-[11px] font-semibold">Ship landing page</div>
                  <div className="mt-1 flex items-center gap-1">
                    <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-300">
                      High
                    </span>
                    <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[9px] text-blue-300">
                      design
                    </span>
                  </div>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-emerald-400"
                      animate={{ width: col === "completed" ? "100%" : col === "todo" ? "60%" : "20%" }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Simulated cursor */}
      <motion.div
        className="pointer-events-none absolute z-20"
        animate={{ left: `${cursor.x}%`, top: `${cursor.y}%`, scale: dragging ? 0.9 : 1 }}
        transition={{ type: "spring", stiffness: 90, damping: 18, mass: 0.6 }}
        style={{ translateX: "-4px", translateY: "-2px" }}
      >
        <div className="relative">
          {dragging && (
            <motion.div
              className="absolute -inset-3 rounded-full bg-primary/40 blur-md"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
            />
          )}
          <MousePointer2
            className={cn(
              "relative h-5 w-5 drop-shadow-[0_2px_6px_rgba(139,92,246,0.7)]",
              dragging ? "text-primary" : "text-foreground",
            )}
            fill="currentColor"
          />
        </div>
      </motion.div>
    </div>
  );
}
