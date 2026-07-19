import { createServerFn } from "@tanstack/react-start";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

export const aiChat = createServerFn({ method: "POST" })
  .inputValidator((data: { messages: ChatMessage[]; boardContext?: string }) => {
    if (!Array.isArray(data?.messages)) throw new Error("messages required");
    return data;
  })
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { text: "AI is not configured on this server." };
    const system = `You are Flow, a helpful Kanban productivity assistant. Answer concisely in Markdown.
Use the user's board data below when relevant.

${data.boardContext ? `BOARD CONTEXT:\n${data.boardContext}` : ""}`;
    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: system }, ...data.messages],
        }),
      });
      if (!resp.ok) {
        console.error("[ai] gateway error", resp.status, await resp.text().catch(() => ""));
        if (resp.status === 429) return { text: "Rate limit hit — please retry in a moment." };
        if (resp.status === 402) return { text: "AI credits exhausted for this workspace." };
        return { text: "The assistant is temporarily unavailable." };
      }
      const json = await resp.json();
      const text = json?.choices?.[0]?.message?.content ?? "";
      return { text };
    } catch (e) {
      console.error("[ai] error", e);
      return { text: "The assistant is temporarily unavailable." };
    }
  });
