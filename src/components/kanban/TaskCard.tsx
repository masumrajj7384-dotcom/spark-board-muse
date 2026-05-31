import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Calendar } from "lucide-react";
import { motion } from "framer-motion";
import type { Task } from "./Board";

function formatDate(d: string | null) {
  if (!d) return null;
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function TaskCard({
  task,
  onOpen,
  dragging,
}: {
  task: Task;
  onOpen?: (t: Task) => void;
  dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };
  const due = formatDate(task.due_date);
  const overdue = task.due_date && new Date(task.due_date) < new Date(new Date().toDateString()) && task.status !== "done";

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      whileHover={{ y: -2 }}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        onOpen?.(task);
      }}
      className={`group cursor-grab rounded-xl border border-border bg-card p-3.5 shadow-sm transition hover:shadow-md active:cursor-grabbing ${
        dragging ? "shadow-xl ring-1 ring-primary/30" : ""
      }`}
    >
      <div className="text-sm font-medium leading-snug text-foreground">{task.title}</div>
      {task.description && (
        <div className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{task.description}</div>
      )}
      {due && (
        <div className={`mt-3 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] ${
          overdue ? "bg-destructive/10 text-destructive" : "bg-surface-2 text-muted-foreground"
        }`}>
          <Calendar className="h-3 w-3" />
          {due}
        </div>
      )}
    </motion.div>
  );
}
