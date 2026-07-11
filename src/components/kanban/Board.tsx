import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
import { Sparkles, LogOut, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listTasks, createTask, updateTask, deleteTask, reorderTask } from "@/lib/tasks.functions";
import { Button } from "@/components/ui/button";
import Column from "./Column";
import TaskCard from "./TaskCard";
import TaskEditor from "./TaskEditor";
import AiChat from "./AiChat";
import { toast } from "sonner";

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  due_date: string | null;
  position: number;
};

const COLUMNS: { id: Task["status"]; label: string; dot: string }[] = [
  { id: "todo", label: "To Do", dot: "bg-todo" },
  { id: "in_progress", label: "In Progress", dot: "bg-progress" },
  { id: "done", label: "Done", dot: "bg-done" },
];

export default function Board() {
  const qc = useQueryClient();
  const list = useServerFn(listTasks);
  const create = useServerFn(createTask);
  const update = useServerFn(updateTask);
  const remove = useServerFn(deleteTask);
  const reorder = useServerFn(reorderTask);

  const { data, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => list(),
  });
  const tasks: Task[] = (data?.tasks as Task[]) ?? [];

  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [creatingIn, setCreatingIn] = useState<Task["status"] | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const createMut = useMutation({
    mutationFn: (vars: { title: string; description?: string; status: Task["status"]; due_date?: string | null }) =>
      create({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
  const updateMut = useMutation({
    mutationFn: (vars: Partial<Task> & { id: string }) => update({ data: vars as any }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const grouped = COLUMNS.map((c) => ({
    ...c,
    items: tasks.filter((t) => t.status === c.id).sort((a, b) => a.position - b.position),
  }));

  const onDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);
  const onDragEnd = async (e: DragEndEvent) => {
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

    // optimistic
    qc.setQueryData(["tasks"], (old: any) => ({
      tasks: (old?.tasks ?? []).map((t: Task) =>
        t.id === activeTask.id ? { ...t, status: newStatus, position: newPos } : t,
      ),
    }));

    try {
      await reorder({ data: { id: activeTask.id, status: newStatus, position: newPos } });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to move task");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    }
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
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setChatOpen(true)} className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Ask AI
            </Button>
            <Button size="sm" variant="ghost" onClick={() => supabase.auth.signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Tasks</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Drag cards to reorder. Click a card to edit. Changes save automatically.
            </p>
          </div>
        </div>

        {isLoading ? (
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
                  <TaskCard task={activeTask} dragging />
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
          onSave={async (vals) => {
            if (editing) {
              await updateMut.mutateAsync({ id: editing.id, ...vals } as any);
            } else {
              await createMut.mutateAsync({ ...vals, status: creatingIn ?? "todo" } as any);
            }
            setEditing(null);
            setCreatingIn(null);
          }}
          onDelete={editing ? async () => {
            await deleteMut.mutateAsync(editing.id);
            setEditing(null);
          } : undefined}
        />
      )}

      {/* Floating add button on mobile */}
      <button
        onClick={() => setCreatingIn("todo")}
        className="fixed bottom-6 right-6 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105 md:hidden"
        aria-label="Add task"
      >
        <Plus className="h-5 w-5" />
      </button>

      <AiChat open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
}
