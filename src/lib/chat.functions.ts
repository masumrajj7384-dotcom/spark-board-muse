import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const tools = [
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task on the user's kanban board.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string", enum: ["todo", "in_progress", "done"] },
          due_date: {
            type: "string",
            description: "ISO date YYYY-MM-DD, optional",
          },
        },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Update an existing task by id.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string", enum: ["todo", "in_progress", "done"] },
          due_date: { type: "string" },
        },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description: "Delete a task by id.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
];

async function runTool(
  supabase: any,
  userId: string,
  name: string,
  args: any,
): Promise<string> {
  try {
    if (name === "create_task") {
      const { data: maxRow } = await supabase
        .from("tasks")
        .select("position")
        .eq("status", args.status ?? "todo")
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextPos = (maxRow?.position ?? 0) + 1024;
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: userId,
          title: args.title,
          description: args.description ?? null,
          status: args.status ?? "todo",
          due_date: args.due_date ?? null,
          position: nextPos,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return JSON.stringify({ ok: true, task: data });
    }
    if (name === "update_task") {
      const { id, ...patch } = args;
      const { data, error } = await supabase
        .from("tasks")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return JSON.stringify({ ok: true, task: data });
    }
    if (name === "delete_task") {
      const { error } = await supabase.from("tasks").delete().eq("id", args.id);
      if (error) throw new Error(error.message);
      return JSON.stringify({ ok: true });
    }
    return JSON.stringify({ ok: false, error: "Unknown tool" });
  } catch (e) {
    return JSON.stringify({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

export const chatWithBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        messages: z.array(MessageSchema).min(1).max(50),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      console.error("[chat] LOVABLE_API_KEY not configured");
      throw new Error("The assistant is temporarily unavailable. Please try again.");
    }

    // Snapshot board for context
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id,title,description,status,due_date")
      .order("status")
      .order("position");

    const today = new Date().toISOString().slice(0, 10);
    const systemPrompt = `You are a friendly assistant inside a personal Kanban app. Today is ${today}.
You can read the user's tasks and modify them via tools (create_task, update_task, delete_task).
Status values: "todo", "in_progress", "done". When the user asks to add/move/finish/delete things, use tools.
Answer concisely in markdown. The user's current board:

${JSON.stringify(tasks ?? [], null, 2)}`;

    const convo: any[] = [
      { role: "system", content: systemPrompt },
      ...data.messages,
    ];

    let mutated = false;
    // Tool loop, max 4 rounds
    for (let i = 0; i < 4; i++) {
      const resp = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: convo,
            tools,
          }),
        },
      );
      if (resp.status === 429)
        return { reply: "Rate limit hit, try again in a moment.", mutated };
      if (resp.status === 402)
        return {
          reply: "AI credits exhausted. Please add credits in Workspace settings.",
          mutated,
        };
      if (!resp.ok) {
        const txt = await resp.text();
        console.error(`[chat] AI gateway error ${resp.status}: ${txt}`);
        throw new Error("The assistant is temporarily unavailable. Please try again.");
      }
      const json = await resp.json();
      const msg = json.choices?.[0]?.message;
      if (!msg) {
        console.error("[chat] No message in AI response", json);
        throw new Error("The assistant is temporarily unavailable. Please try again.");
      }

      convo.push(msg);

      const toolCalls = msg.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        return { reply: msg.content ?? "", mutated };
      }
      for (const tc of toolCalls) {
        const args = JSON.parse(tc.function.arguments || "{}");
        const result = await runTool(supabase, userId, tc.function.name, args);
        mutated = true;
        convo.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        });
      }
    }
    return { reply: "(stopped after too many tool calls)", mutated };
  });
