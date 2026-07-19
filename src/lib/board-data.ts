import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type BoardRow = Database["public"]["Tables"]["boards"]["Row"];
export type ColumnRow = Database["public"]["Tables"]["board_columns"]["Row"];
export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
export type LabelRow = Database["public"]["Tables"]["labels"]["Row"];
export type ChecklistRow = Database["public"]["Tables"]["checklist_items"]["Row"];
export type CommentRow = Database["public"]["Tables"]["comments"]["Row"];

export type Priority = "critical" | "high" | "medium" | "low";
export const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"];

const BOARD_KEY = "flow.board_id";

const DEFAULT_COLUMNS: { name: string; color: string }[] = [
  { name: "Backlog", color: "slate" },
  { name: "To Do", color: "blue" },
  { name: "In Progress", color: "violet" },
  { name: "Review", color: "amber" },
  { name: "Blocked", color: "rose" },
  { name: "Completed", color: "emerald" },
];

const DEFAULT_LABELS = [
  { name: "Urgent", color: "rose" },
  { name: "Client", color: "blue" },
  { name: "Internal", color: "slate" },
  { name: "Research", color: "violet" },
  { name: "Development", color: "emerald" },
];

async function bootstrapBoard(): Promise<string> {
  const stored = typeof window !== "undefined" ? window.localStorage.getItem(BOARD_KEY) : null;
  if (stored) {
    // Verify still exists
    const { data } = await supabase.from("boards").select("id").eq("id", stored).maybeSingle();
    if (data) return stored;
  }
  const { data: board, error } = await supabase
    .from("boards")
    .insert({ name: "My Board" })
    .select("id")
    .single();
  if (error || !board) throw error ?? new Error("board create failed");
  const bid = board.id;

  const cols = DEFAULT_COLUMNS.map((c, i) => ({
    board_id: bid,
    name: c.name,
    color: c.color,
    position: (i + 1) * 1024,
  }));
  await supabase.from("board_columns").insert(cols);
  await supabase.from("labels").insert(DEFAULT_LABELS.map((l) => ({ ...l, board_id: bid })));

  try { window.localStorage.setItem(BOARD_KEY, bid); } catch {}
  return bid;
}

export function useBoardId() {
  const [boardId, setBoardId] = useState<string | null>(null);
  useEffect(() => {
    bootstrapBoard().then(setBoardId).catch(() => setBoardId(null));
  }, []);
  return boardId;
}

export type TaskWithMeta = TaskRow & {
  labels: LabelRow[];
  checklist: ChecklistRow[];
};

export function useBoard(boardId: string | null) {
  const [columns, setColumns] = useState<ColumnRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [labels, setLabels] = useState<LabelRow[]>([]);
  const [taskLabels, setTaskLabels] = useState<{ task_id: string; label_id: string }[]>([]);
  const [checklist, setChecklist] = useState<ChecklistRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!boardId) return;
    const [c, t, l, tl] = await Promise.all([
      supabase.from("board_columns").select("*").eq("board_id", boardId).order("position"),
      supabase.from("tasks").select("*").eq("board_id", boardId).eq("archived", false).order("position"),
      supabase.from("labels").select("*").eq("board_id", boardId).order("name"),
      supabase.from("task_labels").select("task_id,label_id"),
    ]);
    setColumns(c.data ?? []);
    setTasks(t.data ?? []);
    setLabels(l.data ?? []);
    setTaskLabels(tl.data ?? []);
    const taskIds = (t.data ?? []).map((x) => x.id);
    if (taskIds.length) {
      const { data: ci } = await supabase.from("checklist_items").select("*").in("task_id", taskIds).order("position");
      setChecklist(ci ?? []);
    } else setChecklist([]);
    setLoading(false);
  }, [boardId]);

  useEffect(() => {
    if (!boardId) return;
    setLoading(true);
    refetch();
  }, [boardId, refetch]);

  const tasksById = useMemo(() => {
    const map = new Map<string, TaskWithMeta>();
    const labelById = new Map(labels.map((l) => [l.id, l]));
    const byTask = new Map<string, LabelRow[]>();
    for (const tl of taskLabels) {
      const lab = labelById.get(tl.label_id);
      if (!lab) continue;
      const arr = byTask.get(tl.task_id) ?? [];
      arr.push(lab);
      byTask.set(tl.task_id, arr);
    }
    const clByTask = new Map<string, ChecklistRow[]>();
    for (const ci of checklist) {
      const arr = clByTask.get(ci.task_id) ?? [];
      arr.push(ci);
      clByTask.set(ci.task_id, arr);
    }
    for (const t of tasks) {
      map.set(t.id, {
        ...t,
        labels: byTask.get(t.id) ?? [],
        checklist: clByTask.get(t.id) ?? [],
      });
    }
    return map;
  }, [tasks, labels, taskLabels, checklist]);

  // Mutations (optimistic-lite: patch state, then persist)
  const createTask = async (input: {
    column_id: string;
    title: string;
    description?: string | null;
    priority?: Priority;
    due_date?: string | null;
    estimated_minutes?: number | null;
  }) => {
    if (!boardId) return;
    const colTasks = tasks.filter((t) => t.column_id === input.column_id);
    const maxPos = colTasks.reduce((m, t) => Math.max(m, t.position), 0);
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        board_id: boardId,
        column_id: input.column_id,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? "medium",
        due_date: input.due_date ?? null,
        estimated_minutes: input.estimated_minutes ?? null,
        position: maxPos + 1024,
      })
      .select("*")
      .single();
    if (!error && data) {
      setTasks((prev) => [...prev, data]);
      logActivity(boardId, data.id, "task_created", { title: data.title });
    }
    return data ?? null;
  };

  const updateTask = async (id: string, patch: Partial<TaskRow>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const { error } = await supabase.from("tasks").update(patch).eq("id", id);
    if (!error && boardId) logActivity(boardId, id, "task_updated", patch as Record<string, unknown>);
  };

  const deleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
  };

  const archiveTask = async (id: string) => {
    await updateTask(id, { archived: true });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Columns
  const createColumn = async (name: string, color = "blue") => {
    if (!boardId) return;
    const maxPos = columns.reduce((m, c) => Math.max(m, c.position), 0);
    const { data } = await supabase
      .from("board_columns")
      .insert({ board_id: boardId, name, color, position: maxPos + 1024 })
      .select("*")
      .single();
    if (data) setColumns((prev) => [...prev, data]);
  };

  const updateColumn = async (id: string, patch: Partial<ColumnRow>) => {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    await supabase.from("board_columns").update(patch).eq("id", id);
  };

  const deleteColumn = async (id: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== id));
    setTasks((prev) => prev.filter((t) => t.column_id !== id));
    await supabase.from("board_columns").delete().eq("id", id);
  };

  // Labels
  const createLabel = async (name: string, color: string) => {
    if (!boardId) return;
    const { data } = await supabase
      .from("labels")
      .insert({ board_id: boardId, name, color })
      .select("*")
      .single();
    if (data) setLabels((prev) => [...prev, data]);
    return data;
  };

  const toggleLabelOnTask = async (task_id: string, label_id: string) => {
    const has = taskLabels.some((x) => x.task_id === task_id && x.label_id === label_id);
    if (has) {
      setTaskLabels((p) => p.filter((x) => !(x.task_id === task_id && x.label_id === label_id)));
      await supabase.from("task_labels").delete().eq("task_id", task_id).eq("label_id", label_id);
    } else {
      setTaskLabels((p) => [...p, { task_id, label_id }]);
      await supabase.from("task_labels").insert({ task_id, label_id });
    }
  };

  // Checklist
  const addChecklistItem = async (task_id: string, text: string) => {
    const items = checklist.filter((c) => c.task_id === task_id);
    const maxPos = items.reduce((m, c) => Math.max(m, c.position), 0);
    const { data } = await supabase
      .from("checklist_items")
      .insert({ task_id, text, position: maxPos + 1024 })
      .select("*")
      .single();
    if (data) setChecklist((p) => [...p, data]);
  };
  const toggleChecklistItem = async (id: string, completed: boolean) => {
    setChecklist((p) => p.map((c) => (c.id === id ? { ...c, completed } : c)));
    await supabase.from("checklist_items").update({ completed }).eq("id", id);
  };
  const deleteChecklistItem = async (id: string) => {
    setChecklist((p) => p.filter((c) => c.id !== id));
    await supabase.from("checklist_items").delete().eq("id", id);
  };

  return {
    loading,
    columns,
    tasks,
    labels,
    tasksById,
    refetch,
    createTask,
    updateTask,
    deleteTask,
    archiveTask,
    createColumn,
    updateColumn,
    deleteColumn,
    createLabel,
    toggleLabelOnTask,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
  };
}

async function logActivity(board_id: string, task_id: string, action: string, meta: Record<string, unknown>) {
  await supabase.from("activity").insert({ board_id, task_id, action, meta: meta as never }).then(() => {});
}
