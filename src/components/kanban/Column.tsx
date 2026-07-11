import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import TaskCard from "./TaskCard";
import type { Task } from "./Board";

export default function Column({
  id,
  label,
  dot,
  items,
  onAdd,
  onOpen,
}: {
  id: Task["status"];
  label: string;
  dot: string;
  items: Task[];
  onAdd: () => void;
  onOpen: (t: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const bgClass = id === "todo" ? "bg-todo-bg" : id === "in_progress" ? "bg-progress-bg" : "bg-done-bg";
  const glowClass = id === "todo" ? "ring-todo/40" : id === "in_progress" ? "ring-progress/40" : "ring-done/40";
  const topBorderClass = id === "todo" ? "border-t-todo" : id === "in_progress" ? "border-t-progress" : "border-t-done";
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[400px] flex-col rounded-2xl border border-border ${topBorderClass} border-t-4 bg-surface p-3 shadow-sm transition ${
        isOver ? `ring-2 ${glowClass} scale-[1.01]` : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1.5 py-1">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">{items.length}</span>
        </div>
        <button
          onClick={onAdd}
          aria-label="Add task"
          className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex flex-col gap-2.5">
        {items.map((t) => (
          <TaskCard key={t.id} task={t} onOpen={onOpen} column={id} />
        ))}
        {items.length === 0 && (
          <button
            onClick={onAdd}
            className="rounded-xl border border-dashed border-border/80 px-3 py-6 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            + Add a task
          </button>
        )}
      </div>
    </div>
  );
}
