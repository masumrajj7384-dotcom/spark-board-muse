import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/layout/AppShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2, Archive } from "lucide-react";
import { toast } from "sonner";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

export const Route = createFileRoute("/archived")({
  head: () => ({ meta: [{ title: "Archived — Flow" }] }),
  component: ArchivedPage,
});

function ArchivedPage() {
  const [items, setItems] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const boardId = typeof window !== "undefined" ? window.localStorage.getItem("flow.board_id") : null;
    if (!boardId) { setItems([]); setLoading(false); return; }
    const { data } = await supabase.from("tasks").select("*").eq("board_id", boardId).eq("archived", true).order("updated_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const restore = async (id: string) => {
    await supabase.from("tasks").update({ archived: false }).eq("id", id);
    toast.success("Restored");
    load();
  };
  const remove = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    toast.success("Deleted permanently");
    load();
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Archive className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-semibold">Archived</h1>
            <p className="text-xs text-muted-foreground">{items.length} archived task{items.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        {loading ? (
          <div className="h-40 animate-pulse rounded-xl bg-surface-2" />
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Nothing archived.</div>
        ) : (
          <ul className="space-y-2">
            {items.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  {t.description && <div className="truncate text-xs text-muted-foreground">{t.description}</div>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => restore(t.id)}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Restore</Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
