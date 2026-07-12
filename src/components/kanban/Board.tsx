import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { motion } from "framer-motion";
import { Sparkles, Plus } from "lucide-react";
import { useLocalTasks, type LocalTask } from "@/lib/local-tasks";
import Column from "./Column";
import TaskCard from "./TaskCard";
import TaskEditor from "./TaskEditor";

export type Task = LocalTask & { user_id?: string };

const COLUMNS: { id: Task["status"]; label: string; dot: string }[] = [
  { id: "todo", label: "To Do", dot: "bg-todo" },
  { id: "in_progress", label: "In Progress", dot: "bg-progress" },
  { id: "done", label: "Done", dot: "bg-done" },
];

export default function Board() {
  const { tasks, hydrated, create, update, remove } = useLocalTasks();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [creatingIn, setCreatingIn] = useState<Task["status"] | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const grouped = useMemo(
    () =>
      COLUMNS.map((c) => ({
        ...c,
        items: tasks.filter((t) => t.status === c.id).sort((a, b) => a.position - b.position),
      })),
    [tasks],
  );

  const onDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id as string;
    const overCol = COLUMNS.find((c) => c.id === overId);
    let newStatus: Task["status"];
    let newPos: number;

    if (overCol) {
      newStatus = overCol.id;
      const items = grouped.find((g) => g.id === newStatus)!.items.filter((t) => t.id !== active.id);
      newPos = items.length ? items[items.length - 1].position + 1024 : 1024;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (!overTask) return;
      newStatus = overTask.status;
      const items = grouped.find((g) => g.id === newStatus)!.items.filter((t) => t.id !== active.id);
      const idx = items.findIndex((t) => t.id === overTask.id);
      const before = items[idx - 1]?.position;
      const after = items[idx]?.position;
      if (before == null && after != null) newPos = after - 512;
      else if (before != null && after == null) newPos = before + 1024;
      else if (before != null && after != null) newPos = (before + after) / 2;
      else newPos = 1024;
    }

    if (activeTask.status === newStatus && activeTask.position === newPos) return;
    update(activeTask.id, { status: newStatus, position: newPos });
  };

  const activeTask = tasks.find((t) => t.id === activeId);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Flow</div>
              <div className="text-[11px] text-muted-foreground">Your personal board</div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Tasks</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Drag cards to reorder. Click a card to edit. Saved to this browser.
            </p>
          </div>
        </div>

        {!hydrated ? (
          <div className="grid grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-96 animate-pulse rounded-2xl bg-surface-2" />
            ))}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {grouped.map((col) => (
                <Column
                  key={col.id}
                  id={col.id}
                  label={col.label}
                  dot={col.dot}
                  items={col.items}
                  onAdd={() => setCreatingIn(col.id)}
                  onOpen={(t) => setEditing(t)}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask ? (
                <motion.div initial={{ scale: 1 }} animate={{ scale: 1.03 }}>
                  <TaskCard task={activeTask} dragging column={activeTask.status} />
                </motion.div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {(editing || creatingIn) && (
        <TaskEditor
          task={editing}
          defaultStatus={creatingIn ?? undefined}
          onClose={() => { setEditing(null); setCreatingIn(null); }}
          onSave={(vals) => {
            if (editing) {
              update(editing.id, vals);
            } else {
              create({ ...vals, status: creatingIn ?? "todo" });
            }
            setEditing(null);
            setCreatingIn(null);
          }}
          onDelete={editing ? () => {
            remove(editing.id);
            setEditing(null);
          } : undefined}
        />
      )}

      <button
        onClick={() => setCreatingIn("todo")}
        className="fixed bottom-6 right-6 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105 md:hidden"
        aria-label="Add task"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}
