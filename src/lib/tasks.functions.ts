import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function safeError(context: string, error: unknown): Error {
  console.error(`[tasks.functions] ${context}:`, error);
  return new Error("Something went wrong, please try again.");
}


const StatusEnum = z.enum(["todo", "in_progress", "done"]);

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("status")
      .order("position");
    if (error) throw safeError("db error", error);
    return { tasks: data ?? [] };
  });

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional().nullable(),
        status: StatusEnum.default("todo"),
        due_date: z.string().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: maxRow } = await supabase
      .from("tasks")
      .select("position")
      .eq("status", data.status)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPos = (maxRow?.position ?? 0) + 1024;
    const { data: row, error } = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        title: data.title,
        description: data.description ?? null,
        status: data.status,
        due_date: data.due_date ?? null,
        position: nextPos,
      })
      .select("*")
      .single();
    if (error) throw safeError("db error", error);
    return { task: row };
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).nullable().optional(),
        status: StatusEnum.optional(),
        due_date: z.string().nullable().optional(),
        position: z.number().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { id, ...patch } = data;
    const { data: row, error } = await supabase
      .from("tasks")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw safeError("db error", error);
    return { task: row };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("tasks").delete().eq("id", data.id);
    if (error) throw safeError("db error", error);
    return { ok: true };
  });

export const reorderTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: StatusEnum,
        position: z.number(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("tasks")
      .update({ status: data.status, position: data.position })
      .eq("id", data.id);
    if (error) throw safeError("db error", error);
    return { ok: true };
  });
