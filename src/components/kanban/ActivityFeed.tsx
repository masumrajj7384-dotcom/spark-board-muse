import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SimEvent } from "./useBoardSimulation";

export default function ActivityFeed({ events }: { events: SimEvent[] }) {
  const [collapsed, setCollapsed] = useState(false);

  const toneColor = (tone: SimEvent["tone"]) =>
    tone === "auto"
      ? "text-col-violet"
      : tone === "system"
        ? "text-col-blue"
        : "text-col-emerald";

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
          {collapsed ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
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
                {events.length === 0 ? (
                  <li className="px-3 py-3 text-[11px] text-muted-foreground/70">
                    Awaiting live workspace events…
                  </li>
                ) : (
                  events.map((e, i) => (
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
                        <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70">
                          {i === 0 ? "just now" : `${i * 5}s ago`}
                        </div>
                      </div>
                    </motion.li>
                  ))
                )}
              </AnimatePresence>
            </motion.ul>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
