import { useEffect, useState } from "react";

export type LocalTask = {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  due_date: string | null;
  position: number;
};

const KEY = "flow.tasks.v1";

function read(): LocalTask[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocalTask[]) : [];
  } catch {
    return [];
  }
}

function write(tasks: LocalTask[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(tasks));
  window.dispatchEvent(new Event("flow-tasks-change"));
}

export function useLocalTasks() {
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTasks(read());
    setHydrated(true);
    const onChange = () => setTasks(read());
    window.addEventListener("flow-tasks-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("flow-tasks-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const create = (vals: { title: string; description?: string | null; status: LocalTask["status"]; due_date?: string | null }) => {
    const current = read();
    const maxPos = current
      .filter((t) => t.status === vals.status)
      .reduce((m, t) => Math.max(m, t.position), 0);
    const task: LocalTask = {
      id: crypto.randomUUID(),
      title: vals.title,
      description: vals.description ?? null,
      status: vals.status,
      due_date: vals.due_date ?? null,
      position: maxPos + 1024,
    };
    write([...current, task]);
  };

  const update = (id: string, patch: Partial<LocalTask>) => {
    write(read().map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const remove = (id: string) => {
    write(read().filter((t) => t.id !== id));
  };

  return { tasks, hydrated, create, update, remove };
}
