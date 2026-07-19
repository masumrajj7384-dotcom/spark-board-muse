import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServerFn } from "@tanstack/react-start";
import { aiChat } from "@/lib/ai.functions";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskWithMeta, ColumnRow } from "@/lib/board-data";

type Msg = { role: "user" | "assistant"; content: string };

export default function AiChat({
  open,
  onOpenChange,
  columns,
  tasks,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  columns: ColumnRow[];
  tasks: TaskWithMeta[];
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chat = useServerFn(aiChat);

  const boardContext = [
    ...columns.map((c) => {
      const cts = tasks.filter((t) => t.column_id === c.id);
      const lines = cts.slice(0, 20).map((t) => `  - [${t.priority}] ${t.title}${t.due_date ? ` (due ${t.due_date.slice(0, 10)})` : ""}`);
      return `${c.name} (${cts.length}):\n${lines.join("\n") || "  (empty)"}`;
    }),
  ].join("\n\n");

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await chat({ data: { messages: next, boardContext } });
      setMessages([...next, { role: "assistant", content: res.text || "…" }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "The assistant is temporarily unavailable." }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Summarize today's work",
    "What's overdue?",
    "Suggest priorities",
    "Break down my biggest task",
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle className="flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /> Flow Assistant</SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border/60 bg-surface p-3 text-sm text-muted-foreground">
                <Sparkles className="mb-1 inline h-3.5 w-3.5 text-primary" /> Ask me anything about your board.
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => setInput(s)} className="rounded-md border border-border/60 bg-card px-3 py-2 text-left text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn("rounded-lg px-3 py-2 text-sm", m.role === "user" ? "ml-8 bg-primary/10 text-foreground" : "mr-8 bg-surface text-foreground")}>
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          ))}
          {loading && <div className="mr-8 rounded-lg bg-surface px-3 py-2 text-sm text-muted-foreground">Thinking…</div>}
        </div>
        <div className="border-t border-border p-3">
          <div className="flex gap-1.5">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask about your board…"
              disabled={loading}
            />
            <Button onClick={send} disabled={loading || !input.trim()} size="icon"><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
