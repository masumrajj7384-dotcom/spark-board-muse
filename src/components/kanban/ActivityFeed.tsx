import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskWithMeta } from "@/lib/board-data";

type Event = {
  id: string;
  icon: string;
  actor: string;
  text: string;
  time: string;
  tone: "auto" | "user" | "system";
};

const ACTORS = ["🤖 Automation", "👤 Rashi Priya", "👤 Aarav Mehta", "👤 Diego Rossi", "👤 Kenji Sato", "🔔 Webhook"];
const TEMPLATES = [
  (t: string) => ({ text: `moved “${t}” to Review`, tone: "auto" as const, icon: "→" }),
  (t: string) => ({ text: `added a blocker tag to “${t}”`, tone: "user" as const, icon: "⚑" }),
  (t: string) => ({ text: `commented on “${t}”`, tone: "user" as const, icon: "💬" }),
  (t: string) => ({ text: `completed “${t}”`, tone: "user" as const, icon: "✓" }),
  (t: string) => ({ text: `AI suggested breakdown for “${t}”`, tone: "system" as const, icon: "✦" }),
  (t: string) => ({ text: `synced “${t}” with GitHub`, tone: "system" as const, icon: "⟳" }),
  (t: string) => ({ text: `escalated “${t}” to high priority`, tone: "auto" as const, icon: "▲" }),
];

function fmtTime(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function ActivityFeed({ tasks }: { tasks: TaskWithMeta[] }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let idc = 0;
    const seed = () => {
      const now = Date.now();
      const initial: Event[] = Array.from({ length: 3 }).map((_, i) => {
        const t = tasks[Math.floor(Math.random() * Math.max(tasks.length, 1))]?.title ?? "New task";
        const tpl = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)](t);
        return {
          id: `e-${now}-${idc++}`,
          actor: ACTORS[Math.floor(Math.random() * ACTORS.length)],
          time: fmtTime(new Date(now - (i + 1) * 32_000)),
          ...tpl,
        };
      });
      setEvents(initial);
    };
    seed();
    const tick = setInterval(() => {
      const t = tasks[Math.floor(Math.random() * Math.max(tasks.length, 1))]?.title ?? "Untitled task";
      const tpl = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)](t);
      setEvents((prev) => [
        {
          id: `e-${Date.now()}-${idc++}`,
          actor: ACTORS[Math.floor(Math.random() * ACTORS.length)],
          time: "just now",
          ...tpl,
        },
        ...prev,
      ].slice(0, 8));
    }, 5200);
    return () => clearInterval(tick);
  }, [tasks]);

  const toneColor = (tone: Event["tone"]) =>
    tone === "auto" ? "text-col-violet" : tone === "system" ? "text-col-blue" : "text-col-emerald";

  return (
    <div className="pointer-events-auto fixed bottom-5 left-5 z-30 hidden w-[320px] md:block">
      <motion.div layout className="glass-panel overflow-hidden rounded-2xl">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left"
        >
          <span className="relative grid h-6 w-6 place-items-center">
            <span className="absolute h-2 w-2 animate-ping rounded-full bg-emerald-400/60" />
            <Activity className="relative h-3.5 w-3.5 text-emerald-400" />
          </span>
          <span className="text-xs font-semibold tracking-tight">Live Activity</span>
          <span className="ml-auto rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-emerald-300">
            {events.length} events
          </span>
          {collapsed ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="max-h-[280px] overflow-y-auto border-t border-white/5 scrollbar-thin"
            >
              <AnimatePresence initial={false}>
                {events.map((e) => (
                  <motion.li
                    key={e.id}
                    layout
                    initial={{ opacity: 0, y: -6, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex items-start gap-2 px-3 py-2 text-[11px] leading-snug"
                  >
                    <span className={cn("mt-0.5 text-xs", toneColor(e.tone))}>{e.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate">
                        <span className="font-medium">{e.actor}</span>{" "}
                        <span className="text-muted-foreground">{e.text}</span>
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70">{e.time}</div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
