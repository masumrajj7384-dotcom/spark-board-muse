import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const MEMBERS = [
  { initials: "RP", name: "Rashi Priya", color: "oklch(0.7 0.22 295)", status: "active" },
  { initials: "AM", name: "Aarav Mehta", color: "oklch(0.7 0.2 245)", status: "active" },
  { initials: "DR", name: "Diego Rossi", color: "oklch(0.72 0.18 155)", status: "away" },
  { initials: "KS", name: "Kenji Sato", color: "oklch(0.78 0.18 75)", status: "active" },
];

export default function PresenceAvatars() {
  return (
    <div className="hidden items-center -space-x-2 md:flex">
      {MEMBERS.map((m, i) => (
        <motion.div
          key={m.initials}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
          title={`${m.name} · ${m.status}`}
          className={cn(
            "relative grid h-7 w-7 place-items-center rounded-full text-[10px] font-semibold text-white ring-2 ring-background",
          )}
          style={{
            background: `linear-gradient(135deg, ${m.color}, color-mix(in oklab, ${m.color} 55%, black))`,
            boxShadow: `0 0 0 1.5px color-mix(in oklab, ${m.color} 60%, transparent), 0 4px 12px -4px ${m.color}`,
          }}
        >
          {m.initials}
          {m.status === "active" && (
            <>
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-background"
                style={{ boxShadow: "0 0 6px oklch(0.75 0.2 155)" }}
              />
              <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-2 w-2 animate-ping rounded-full bg-emerald-400/70" />
            </>
          )}
        </motion.div>
      ))}
      <div className="ml-3 hidden text-[10px] leading-tight text-muted-foreground lg:block">
        <div className="font-medium text-foreground">4 online</div>
        <div>collaborating now</div>
      </div>
    </div>
  );
}
