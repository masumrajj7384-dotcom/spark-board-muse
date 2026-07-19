import { useDraggable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { Calendar, CheckSquare, Clock, MessageSquare } from "lucide-react";
import { formatDistanceToNow, isPast, isToday } from "date-fns";
import type { TaskWithMeta } from "@/lib/board-data";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-priority-critical/15 text-priority-critical border-priority-critical/30",
  high: "bg-priority-high/15 text-priority-high border-priority-high/30",
  medium: "bg-priority-medium/15 text-priority-medium border-priority-medium/30",
  low: "bg-priority-low/15 text-priority-low border-priority-low/30",
};

const LABEL_STYLES: Record<string, string> = {
  slate: "bg-col-slate/15 text-col-slate",
  blue: "bg-col-blue/15 text-col-blue",
  violet: "bg-col-violet/15 text-col-violet",
  amber: "bg-col-amber/15 text-col-amber",
  rose: "bg-col-rose/15 text-col-rose",
  emerald: "bg-col-emerald/15 text-col-emerald",
};

export default function TaskCard({
  task,
  onOpen,
  columnColor,
  dragging,
}: {
  task: TaskWithMeta;
  onOpen?: () => void;
  columnColor?: string;
  dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const dragStyle = transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, opacity: isDragging ? 0.35 : 1 } : {};

  const due = task.due_date ? new Date(task.due_date) : null;
  const overdue = due && isPast(due) && !task.completed;
  const today = due && isToday(due);

  const checklistTotal = task.checklist.length;
  const checklistDone = task.checklist.filter((c) => c.completed).length;
  const progress = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : task.completed ? 100 : 0;

  const stripe = `border-l-col-${columnColor ?? "blue"}`;

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--gx", `${px * 100}%`);
    el.style.setProperty("--gy", `${py * 100}%`);
    // 3D tilt — subtle, from center
    const rx = (0.5 - py) * 8; // degrees
    const ry = (px - 0.5) * 10;
    el.style.setProperty("--rx", `${rx}deg`);
    el.style.setProperty("--ry", `${ry}deg`);
  };

  const handleLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--rx", `0deg`);
    el.style.setProperty("--ry", `0deg`);
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={{ ...dragStyle, transformStyle: "preserve-3d" }}
      {...attributes}
      {...listeners}
      layout
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      whileHover={{ y: -3, scale: 1.015 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        onOpen?.();
      }}
      className={cn(
        "glass card-glow group cursor-grab overflow-hidden rounded-xl p-3 transition-all active:cursor-grabbing [transform:perspective(900px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))]",
        "border-l-[3px] border-t-white/15 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5),0_25px_60px_-20px_rgba(0,0,0,0.55)] hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6),0_50px_110px_-25px_rgba(139,92,246,0.4)]",
        stripe,
        (task.priority === "critical" || task.priority === "high") && "holo-border",
        (dragging || isDragging) && "ring-2 ring-primary/60 shadow-[0_30px_80px_-15px_rgba(139,92,246,0.65)] scale-[1.03] rotate-[0.5deg]",
      )}

    >
      {/* Priority + labels row */}
      <div className="mb-2 flex flex-wrap items-center gap-1">
        <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider", PRIORITY_STYLES[task.priority])}>
          {task.priority}
        </span>
        {task.labels.slice(0, 3).map((l) => (
          <span key={l.id} className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", LABEL_STYLES[l.color] ?? LABEL_STYLES.blue)}>
            {l.name}
          </span>
        ))}
        {task.labels.length > 3 && <span className="text-[10px] text-muted-foreground">+{task.labels.length - 3}</span>}
      </div>

      <div className={cn("text-sm font-medium leading-snug text-foreground", task.completed && "line-through text-muted-foreground")}>
        {task.title}
      </div>
      {task.description && <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</div>}

      {checklistTotal > 0 && (
        <div className="mt-2.5">
          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><CheckSquare className="h-3 w-3" />{checklistDone}/{checklistTotal}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {(due || task.estimated_minutes) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {due && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px]",
                overdue
                  ? "bg-destructive/15 text-destructive"
                  : today
                  ? "bg-priority-high/15 text-priority-high"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Calendar className="h-3 w-3" />
              {overdue ? "Overdue" : today ? "Today" : formatDistanceToNow(due, { addSuffix: true })}
            </span>
          )}
          {task.estimated_minutes ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {task.estimated_minutes}m
            </span>
          ) : null}
        </div>
      )}
    </motion.div>
  );
}
