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
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[400px] flex-col rounded-2xl border border-border bg-surface-1 p-3 transition ${
        isOver ? "ring-2 ring-primary/40" : ""
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
          <TaskCard key={t.id} task={t} onOpen={onOpen} />
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
