import { useEffect, useMemo, useState } from "react";
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
import { Plus, ChevronDown, Plus as PlusIcon, Bot, Archive, LayoutDashboard, Calendar as CalendarIcon, GanttChart, FileText, Download, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { isPast, isToday, addDays } from "date-fns";
import { toast } from "sonner";
import { useBoardId, useBoard, type TaskWithMeta } from "@/lib/board-data";
import Column from "./Column";
import TaskCard from "./TaskCard";
import TaskDrawer from "./TaskDrawer";
import CommandPalette from "./CommandPalette";
import AiChat from "./AiChat";
import FiltersBar, { emptyFilters, type BoardFilters } from "./FiltersBar";
import { Button } from "@/components/ui/button";
import AppShell from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Board() {
  const boardId = useBoardId();
  const b = useBoard(boardId);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [newColOpen, setNewColOpen] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [filters, setFilters] = useState<BoardFilters>(emptyFilters());

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filteredTasksById = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const now = new Date();
    const weekAhead = addDays(now, 7);
    const out = new Map<string, TaskWithMeta>();
    for (const [id, t] of b.tasksById) {
      if (q && !`${t.title} ${t.description ?? ""} ${t.labels.map((l) => l.name).join(" ")}`.toLowerCase().includes(q)) continue;
      if (filters.priorities.size && !filters.priorities.has(t.priority as never)) continue;
      if (filters.labelIds.size && !t.labels.some((l) => filters.labelIds.has(l.id))) continue;
      if (filters.completed === "yes" && !t.completed) continue;
      if (filters.completed === "no" && t.completed) continue;
      if (filters.due !== "any") {
        const due = t.due_date ? new Date(t.due_date) : null;
        if (filters.due === "none" && due) continue;
        if (filters.due === "today" && (!due || !isToday(due))) continue;
        if (filters.due === "overdue" && (!due || !isPast(due) || t.completed)) continue;
        if (filters.due === "week" && (!due || due > weekAhead || due < now)) continue;
      }
      out.set(id, t);
    }
    return out;
  }, [b.tasksById, filters]);

  const grouped = useMemo(
    () =>
      b.columns.map((c) => ({
        column: c,
        items: [...filteredTasksById.values()]
          .filter((t) => t.column_id === c.id)
          .sort((a, x) => a.position - x.position),
      })),
    [b.columns, filteredTasksById],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inField = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
        return;
      }
      if (inField) return;
      if (e.key === "/") { e.preventDefault(); setCmdOpen(true); }
      if (e.key.toLowerCase() === "n") { e.preventDefault(); newTaskInFirstColumn(); }
      if (e.key.toLowerCase() === "a") { e.preventDefault(); setAiOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const newTaskInFirstColumn = async () => {
    const col = b.columns[0];
    if (!col) return;
    const created = await b.createTask({ column_id: col.id, title: "New task" });
    if (created) setOpenTaskId(created.id);
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);
  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeTask = b.tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id as string;
    const overCol = b.columns.find((c) => c.id === overId);
    let newColId: string;
    let newPos: number;

    if (overCol) {
      newColId = overCol.id;
      const items = b.tasks.filter((t) => t.column_id === newColId && t.id !== activeTask.id).sort((a, x) => a.position - x.position);
      newPos = items.length ? items[items.length - 1].position + 1024 : 1024;
    } else {
      const overTask = b.tasks.find((t) => t.id === overId);
      if (!overTask) return;
      newColId = overTask.column_id;
      const items = b.tasks.filter((t) => t.column_id === newColId && t.id !== activeTask.id).sort((a, x) => a.position - x.position);
      const idx = items.findIndex((t) => t.id === overTask.id);
      const before = items[idx - 1]?.position;
      const after = items[idx]?.position;
      if (before == null && after != null) newPos = after - 512;
      else if (before != null && after == null) newPos = before + 1024;
      else if (before != null && after != null) newPos = (before + after) / 2;
      else newPos = 1024;
    }

    if (activeTask.column_id === newColId && activeTask.position === newPos) return;
    await b.updateTask(activeTask.id, { column_id: newColId, position: newPos });
  };

  const activeTask = activeId ? b.tasksById.get(activeId) : null;
  const openTask = openTaskId ? b.tasksById.get(openTaskId) ?? null : null;

  return (
    <AppShell onOpenSearch={() => setCmdOpen(true)} onOpenCommand={() => setCmdOpen(true)} onOpenAi={() => setAiOpen(true)}>
      <div className="px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Board</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {b.tasks.length} tasks • {b.columns.length} columns • autosaved
            </p>
          </div>
          <div className="flex-1 max-w-xl">
            <FiltersBar filters={filters} setFilters={setFilters} labels={b.labels} />
          </div>
        </div>

        {b.loading || !boardId ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-96 animate-pulse rounded-2xl bg-surface-2" />
            ))}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-thin">
              {grouped.map(({ column, items }) => (
                <Column
                  key={column.id}
                  column={column}
                  items={items}
                  onOpen={(t) => setOpenTaskId(t.id)}
                  onAdd={async () => {
                    const t = await b.createTask({ column_id: column.id, title: "New task" });
                    if (t) setOpenTaskId(t.id);
                  }}
                  onRename={(name) => b.updateColumn(column.id, { name })}
                  onDelete={() => {
                    if (confirm(`Delete "${column.name}" and its tasks?`)) b.deleteColumn(column.id);
                  }}
                  onToggleCollapse={() => b.updateColumn(column.id, { collapsed: !column.collapsed })}
                />
              ))}
              <button
                onClick={() => setNewColOpen(true)}
                className="flex h-11 w-[240px] shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border/60 text-sm text-muted-foreground transition hover:border-primary hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> Add column
              </button>
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
      </div>

      <TaskDrawer
        task={openTask}
        labels={b.labels}
        open={!!openTask}
        onOpenChange={(o) => !o && setOpenTaskId(null)}
        onUpdate={(patch) => openTask && b.updateTask(openTask.id, patch)}
        onDelete={() => { if (openTask) { b.deleteTask(openTask.id); setOpenTaskId(null); toast.success("Task deleted"); } }}
        onArchive={() => { if (openTask) { b.archiveTask(openTask.id); setOpenTaskId(null); toast.success("Task archived"); } }}
        onToggleLabel={(id) => openTask && b.toggleLabelOnTask(openTask.id, id)}
        onAddChecklist={(text) => openTask && b.addChecklistItem(openTask.id, text)}
        onToggleChecklist={(id, c) => b.toggleChecklistItem(id, c)}
        onDeleteChecklist={(id) => b.deleteChecklistItem(id)}
        onCreateLabel={(n, c) => b.createLabel(n, c)}
      />

      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        tasks={[...b.tasksById.values()]}
        onOpenTask={(t) => setOpenTaskId(t.id)}
        onNewTask={newTaskInFirstColumn}
        onOpenAi={() => setAiOpen(true)}
      />

      <AiChat open={aiOpen} onOpenChange={setAiOpen} columns={b.columns} tasks={[...b.tasksById.values()]} />

      <Dialog open={newColOpen} onOpenChange={setNewColOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>New column</DialogTitle></DialogHeader>
          <Input autoFocus value={newColName} onChange={(e) => setNewColName(e.target.value)} placeholder="Column name" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewColOpen(false)}>Cancel</Button>
            <Button onClick={async () => { if (newColName.trim()) { await b.createColumn(newColName.trim()); setNewColName(""); setNewColOpen(false); } }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile FAB */}
      <button
        onClick={newTaskInFirstColumn}
        className="fixed bottom-5 right-5 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105 md:hidden"
        aria-label="Add task"
      >
        <Plus className="h-5 w-5" />
      </button>
    </AppShell>
  );
}
