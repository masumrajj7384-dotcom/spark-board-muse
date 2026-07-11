import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Send } from "lucide-react";
import { chatWithBoard } from "@/lib/chat.functions";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

export default function AiChat({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const chat = useServerFn(chatWithBoard);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I can answer questions about your board and create or update tasks. What would you like to do?" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res: any = await chat({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: res?.reply ?? "Done." }]);
      qc.invalidateQueries({ queryKey: ["tasks"] });
    } catch (e: any) {
      setMessages([...next, { role: "assistant", content: `Error: ${e?.message ?? "unknown"}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col border-l-border bg-card text-card-foreground sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <Sparkles className="h-4 w-4 text-primary" /> Board assistant
          </SheetTitle>
        </SheetHeader>
        <div className="-mx-6 flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-surface text-foreground"
                }`}>
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-1">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {busy && <div className="text-xs text-muted-foreground">Thinking…</div>}
          </div>
        </div>
        <div className="flex gap-2 border-t border-border bg-card pt-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask anything about your board…"
            disabled={busy}
          />
          <Button onClick={send} disabled={busy || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
