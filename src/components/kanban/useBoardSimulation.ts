import { useCallback, useEffect, useRef, useState } from "react";
import type { ColumnRow, TaskRow, TaskWithMeta } from "@/lib/board-data";

export type SimEvent = {
  id: string;
  icon: string;
  actor: string;
  text: string;
  tone: "auto" | "user" | "system";
};

const DEMO_TITLE = "API Gateway Setup";
const PAUSE_MS = 15_000;
export const SIM_MIN_MS = 1000;
export const SIM_MAX_MS = 10_000;
export const SIM_DEFAULT_MS = 4500;

type BoardApi = {
  columns: ColumnRow[];
  createTask: (input: {
    column_id: string;
    title: string;
    description?: string | null;
    priority?: "critical" | "high" | "medium" | "low";
  }) => Promise<TaskRow | null | undefined>;
  updateTask: (id: string, patch: Partial<TaskRow>) => Promise<void> | Promise<unknown>;
  deleteTask: (id: string) => Promise<void> | Promise<unknown>;
  onComplete: () => void;
};

export function useBoardSimulation(api: BoardApi, enabled: boolean, intervalMs: number = SIM_DEFAULT_MS) {
  const [events, setEvents] = useState<SimEvent[]>([]);
  const pauseUntil = useRef(0);
  const stepRef = useRef(0);
  const demoId = useRef<string | null>(null);
  const idc = useRef(0);
  const apiRef = useRef(api);
  apiRef.current = api;

  const pause = useCallback((ms: number = PAUSE_MS) => {
    pauseUntil.current = Math.max(pauseUntil.current, Date.now() + ms);
  }, []);

  const push = useCallback((e: Omit<SimEvent, "id">) => {
    setEvents((prev) =>
      [{ ...e, id: `sim-${Date.now()}-${idc.current++}` }, ...prev].slice(0, 8),
    );
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const findCol = (color: string) =>
      apiRef.current.columns.find((c) => c.color === color);

    const runStep = async () => {
      if (cancelled) return;
      if (Date.now() < pauseUntil.current) return;
      const { createTask, updateTask, deleteTask, onComplete } = apiRef.current;
      if (!apiRef.current.columns.length) return;

      const step = stepRef.current;
      try {
        if (step === 0) {
          const backlog = findCol("slate");
          if (!backlog) return;
          const t = await createTask({
            column_id: backlog.id,
            title: DEMO_TITLE,
            priority: "medium",
            description: "AI-suggested breakdown: routes, auth, ratelimits, docs.",
          });
          if (t) demoId.current = t.id;
          push({
            icon: "✦",
            actor: "👤 Aarav Mehta",
            text: `AI suggested breakdown for “${DEMO_TITLE}”`,
            tone: "system",
          });
        } else if (step === 1 && demoId.current) {
          const todo = findCol("blue");
          if (!todo) return;
          await updateTask(demoId.current, {
            priority: "high",
            column_id: todo.id,
          });
          push({
            icon: "▲",
            actor: "👤 Diego Rossi",
            text: `escalated “${DEMO_TITLE}” to high priority`,
            tone: "auto",
          });
        } else if (step === 2 && demoId.current) {
          const blocked = findCol("rose");
          if (!blocked) return;
          await updateTask(demoId.current, {
            column_id: blocked.id,
            priority: "critical",
            description: "🚨 Blocked: Token Mismatch",
          });
          push({
            icon: "⚑",
            actor: "👤 Diego Rossi",
            text: `added a blocker tag to “${DEMO_TITLE}”`,
            tone: "user",
          });
        } else if (step === 3 && demoId.current) {
          const review = findCol("amber");
          if (!review) return;
          await updateTask(demoId.current, {
            column_id: review.id,
            priority: "high",
            description: "Resolved token mismatch — ready for review.",
          });
          push({
            icon: "→",
            actor: "👤 Rashi Priya",
            text: `moved “${DEMO_TITLE}” to Review`,
            tone: "auto",
          });
        } else if (step === 4 && demoId.current) {
          const done = findCol("emerald");
          if (!done) return;
          await updateTask(demoId.current, {
            column_id: done.id,
            completed: true,
          });
          push({
            icon: "✓",
            actor: "👤 Kenji Sato",
            text: `completed “${DEMO_TITLE}”`,
            tone: "user",
          });
          onComplete();
        } else if (step === 5) {
          if (demoId.current) {
            try { await deleteTask(demoId.current); } catch {}
            demoId.current = null;
          }
        }
        stepRef.current = (step + 1) % 6;
      } catch {
        // swallow — simulation is best-effort
      }
    };

    const loop = () => {
      const delay = STEP_MIN + Math.random() * STEP_JITTER;
      timer = setTimeout(async () => {
        await runStep();
        if (!cancelled) loop();
      }, delay);
    };
    loop();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, push]);

  // Cleanup demo task on unmount
  useEffect(() => {
    return () => {
      const id = demoId.current;
      if (id) {
        apiRef.current.deleteTask(id).catch(() => {});
      }
    };
  }, []);

  return { events, pause };
}

export type { TaskWithMeta };
