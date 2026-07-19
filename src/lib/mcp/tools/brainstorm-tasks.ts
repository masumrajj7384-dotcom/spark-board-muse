import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

type BrainstormedTask = {
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
};

export default defineTool({
  name: "brainstorm_tasks",
  title: "Brainstorm kanban tasks",
  description:
    "Given a goal or project description, return a suggested list of kanban tasks (title, description, and starting status). Uses the Lovable AI Gateway. The caller can then add these to their board.",
  inputSchema: {
    goal: z.string().min(3).describe("The goal, project, or theme to brainstorm tasks for."),
    count: z
      .number()
      .int()
      .min(1)
      .max(12)
      .optional()
      .describe("How many tasks to generate. Defaults to 5."),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async ({ goal, count }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        content: [{ type: "text", text: "AI gateway is not configured on this server." }],
        isError: true,
      };
    }
    const n = count ?? 5;
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You break goals into concrete kanban tasks. Reply with ONLY compact JSON: {\"tasks\":[{\"title\":string,\"description\":string,\"status\":\"todo\"|\"in_progress\"|\"done\"}]}. No markdown, no prose.",
          },
          {
            role: "user",
            content: `Goal: ${goal}\nGenerate exactly ${n} tasks. Most should start as "todo".`,
          },
        ],
      }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      return {
        content: [
          {
            type: "text",
            text: `AI gateway error ${resp.status}. ${detail.slice(0, 200)}`,
          },
        ],
        isError: true,
      };
    }
    const json = await resp.json();
    const raw: string = json?.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    let tasks: BrainstormedTask[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed?.tasks)) tasks = parsed.tasks;
    } catch {
      return {
        content: [{ type: "text", text: raw || "No response from model." }],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: tasks
            .map(
              (t, i) =>
                `${i + 1}. [${t.status ?? "todo"}] ${t.title}${t.description ? ` — ${t.description}` : ""}`,
            )
            .join("\n") || "No tasks generated.",
        },
      ],
      structuredContent: { tasks },
    };
  },
});
