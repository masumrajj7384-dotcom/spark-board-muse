import { AnimatePresence, motion } from "framer-motion";
import { Archive, Bot, Calendar, LayoutDashboard, LayoutGrid, MousePointer2, Sparkles, X } from "lucide-react";
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

const SIDEBAR = [
  { id: "board", label: "Board", Icon: LayoutGrid },
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "calendar", label: "Calendar", Icon: Calendar },
  { id: "archived", label: "Archived", Icon: Archive },
] as const;
type NavId = typeof SIDEBAR[number]["id"];

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
          <motion.div
            className="absolute inset-0 bg-background/40 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
              Watch a 15-second tutorial on how to navigate the board, then dive in.
            </p>

            <TutorialVideo />

            <div className="mt-6 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                Tip: <kbd className="rounded bg-muted px-1.5 py-0.5">/</kbd> search ·{" "}
                <kbd className="rounded bg-muted px-1.5 py-0.5">⌘K</kbd> commands ·{" "}
                <kbd className="rounded bg-muted px-1.5 py-0.5">N</kbd> new task
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

/* ----------------------------- Tutorial Video ----------------------------- */

type Step = {
  caption: string;
  duration: number;
  active?: NavId;
  cursor: { x: number; y: number };
  action?: "click" | "grab" | "drop" | "open";
  col?: Col;
  drawer?: boolean;
};

const STEPS: Step[] = [
  { caption: "1. Open the Workspace sidebar and pick a view.", duration: 900, active: "board", cursor: { x: 8, y: 22 } },
  { caption: "2. Board is your Kanban. Dashboard has insights, Calendar shows due dates.", duration: 1100, active: "dashboard", cursor: { x: 8, y: 34 }, action: "click" },
  { caption: "3. Back to Board — this is where tasks live.", duration: 900, active: "board", cursor: { x: 8, y: 22 }, action: "click" },
  { caption: "4. Click a card to open its details drawer.", duration: 1200, active: "board", cursor: { x: 30, y: 62 }, action: "open", drawer: true, col: "backlog" },
  { caption: "5. Or drag a card across columns to change its status.", duration: 1000, active: "board", cursor: { x: 30, y: 62 }, action: "grab", col: "backlog" },
  { caption: "6. Drop it into To Do…", duration: 1000, active: "board", cursor: { x: 55, y: 62 }, col: "todo" },
  { caption: "7. …and finally mark it Completed.", duration: 1200, active: "board", cursor: { x: 82, y: 62 }, action: "drop", col: "completed" },
  { caption: "That's it — you're ready. Use the ? in the top nav to replay.", duration: 1400, active: "board", cursor: { x: 92, y: 8 } },
];

function TutorialVideo() {
  const [i, setI] = useState(0);
  const step = STEPS[i];

  useEffect(() => {
    const t = setTimeout(() => setI((n) => (n + 1) % STEPS.length), step.duration);
    return () => clearTimeout(t);
  }, [i, step.duration]);

  const dragging = step.action === "grab" || (i > 4 && i < 7);
  const drawerOpen = !!step.drawer;

  return (
    <div className="mt-6">
      {/* Video frame */}
      <div className="relative h-80 w-full overflow-hidden rounded-2xl border border-border/40 bg-background/30 shadow-inner">
        {/* Mock top bar */}
        <div className="flex h-8 items-center gap-1.5 border-b border-border/40 bg-background/40 px-3">
          <span className="h-2 w-2 rounded-full bg-red-400/70" />
          <span className="h-2 w-2 rounded-full bg-amber-400/70" />
          <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
          <span className="ml-3 text-[10px] font-medium text-muted-foreground">Masum Raj Automation</span>
        </div>

        <div className="relative flex h-[calc(100%-2rem)]">
          {/* Sidebar */}
          <div className="w-32 shrink-0 border-r border-border/40 bg-background/20 p-2">
            <div className="mb-1 px-1 text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
              Workspace
            </div>
            {SIDEBAR.map(({ id, label, Icon }) => (
              <div
                key={id}
                className={cn(
                  "mb-0.5 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] transition-all",
                  step.active === id
                    ? "bg-primary/15 text-primary font-medium ring-1 ring-primary/30"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
              </div>
            ))}
          </div>

          {/* Board area */}
          <div className="relative flex-1 p-2">
            <div className="grid h-full grid-cols-3 gap-2">
              {COLS.map((c) => {
                const isDropTarget = dragging && step.col === c.id;
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "glass relative flex flex-col rounded-lg p-2 transition-all",
                      isDropTarget && `ring-2 ${c.ring} scale-[1.02]`,
                    )}
                  >
                    <div className="mb-1.5 flex items-center gap-1 text-[9px] font-medium">
                      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
                      {c.label}
                    </div>
                    <div className="flex-1">
                      {step.col === c.id && (
                        <motion.div
                          layoutId="tut-card"
                          transition={{ type: "spring", stiffness: 240, damping: 26 }}
                          className={cn(
                            "rounded-md border-l-[3px] border-l-primary bg-card/70 p-1.5 shadow-md backdrop-blur",
                            dragging && "ring-2 ring-primary/60 shadow-[0_20px_40px_-10px_rgba(139,92,246,0.6)] rotate-[1.5deg] scale-105",
                          )}
                        >
                          <div className="text-[10px] font-semibold">Ship landing page</div>
                          <div className="mt-1 flex items-center gap-1">
                            <span className="rounded-full bg-amber-500/20 px-1 py-0.5 text-[8px] font-semibold uppercase text-amber-300">
                              High
                            </span>
                            <span className="rounded-full bg-blue-500/20 px-1 py-0.5 text-[8px] text-blue-300">
                              design
                            </span>
                          </div>
                          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                            <motion.div
                              className="h-full bg-gradient-to-r from-primary to-emerald-400"
                              animate={{ width: step.col === "completed" ? "100%" : step.col === "todo" ? "60%" : "25%" }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drawer overlay */}
            <AnimatePresence>
              {drawerOpen && (
                <motion.div
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 26 }}
                  className="glass-panel absolute right-2 top-2 bottom-2 w-48 rounded-xl p-3"
                >
                  <div className="text-[10px] font-semibold">Ship landing page</div>
                  <div className="mt-1 text-[9px] text-muted-foreground">Priority · Due · Labels</div>
                  <div className="mt-2 flex gap-1">
                    <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[8px] text-amber-300">High</span>
                    <span className="rounded bg-blue-500/20 px-1 py-0.5 text-[8px] text-blue-300">design</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="h-1.5 w-full rounded bg-muted/60" />
                    <div className="h-1.5 w-3/4 rounded bg-muted/60" />
                    <div className="h-1.5 w-5/6 rounded bg-muted/60" />
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[9px] text-muted-foreground">
                    <Bot className="h-3 w-3 text-primary" />
                    Ask AI about this task
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Simulated cursor */}
        <motion.div
          className="pointer-events-none absolute z-30"
          animate={{ left: `${step.cursor.x}%`, top: `${step.cursor.y}%`, scale: dragging ? 0.9 : 1 }}
          transition={{ type: "spring", stiffness: 90, damping: 18, mass: 0.6 }}
          style={{ translateX: "-4px", translateY: "-2px" }}
        >
          <div className="relative">
            {(step.action === "click" || step.action === "open") && (
              <motion.div
                key={i}
                className="absolute -inset-3 rounded-full border-2 border-primary/70"
                initial={{ scale: 0.4, opacity: 1 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 0.6 }}
              />
            )}
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

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted/40">
          <motion.div
            key={i}
            className="h-full bg-gradient-to-r from-primary to-emerald-400"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: step.duration / 1000, ease: "linear" }}
          />
        </div>
      </div>

      {/* Caption */}
      <div className="mt-3 flex items-start gap-2 min-h-[2.5rem]">
        <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
          {i + 1}
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="text-sm text-foreground/90"
          >
            {step.caption}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Step dots */}
      <div className="mt-2 flex items-center justify-center gap-1.5">
        {STEPS.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            aria-label={`Jump to step ${idx + 1}`}
            className={cn(
              "h-1.5 rounded-full transition-all",
              idx === i ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70",
            )}
          />
        ))}
      </div>
    </div>
  );
}
