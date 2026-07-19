import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, X } from "lucide-react";
import type { LabelRow, Priority } from "@/lib/board-data";
import { PRIORITIES } from "@/lib/board-data";
import { cn } from "@/lib/utils";

export type BoardFilters = {
  search: string;
  priorities: Set<Priority>;
  labelIds: Set<string>;
  due: "any" | "today" | "overdue" | "week" | "none";
  completed: "any" | "yes" | "no";
};

export const emptyFilters = (): BoardFilters => ({
  search: "",
  priorities: new Set(),
  labelIds: new Set(),
  due: "any",
  completed: "any",
});

export default function FiltersBar({
  filters,
  setFilters,
  labels,
}: {
  filters: BoardFilters;
  setFilters: (f: BoardFilters) => void;
  labels: LabelRow[];
}) {
  const activeCount =
    filters.priorities.size + filters.labelIds.size + (filters.due !== "any" ? 1 : 0) + (filters.completed !== "any" ? 1 : 0);

  const togglePriority = (p: Priority) => {
    const next = new Set(filters.priorities);
    if (next.has(p)) next.delete(p); else next.add(p);
    setFilters({ ...filters, priorities: next });
  };
  const toggleLabel = (id: string) => {
    const next = new Set(filters.labelIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setFilters({ ...filters, labelIds: next });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        value={filters.search}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        placeholder="Search tasks…"
        className="h-9 flex-1 min-w-[200px] rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
      />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn(activeCount > 0 && "border-primary text-primary")}>
            <Filter className="mr-1.5 h-3.5 w-3.5" /> Filter
            {activeCount > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{activeCount}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72">
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Priority</div>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITIES.map((p) => (
                  <button key={p} onClick={() => togglePriority(p)} className={cn(
                    "rounded-full border px-2 py-0.5 text-xs capitalize",
                    filters.priorities.has(p) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
                  )}>{p}</button>
                ))}
              </div>
            </div>
            {labels.length > 0 && (
              <div>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Labels</div>
                <div className="flex flex-wrap gap-1.5">
                  {labels.map((l) => (
                    <button key={l.id} onClick={() => toggleLabel(l.id)} className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                      filters.labelIds.has(l.id) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
                    )}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", `bg-col-${l.color}`)} />
                      {l.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Due</div>
              <div className="flex flex-wrap gap-1.5">
                {(["any", "today", "week", "overdue", "none"] as const).map((v) => (
                  <button key={v} onClick={() => setFilters({ ...filters, due: v })} className={cn(
                    "rounded-full border px-2 py-0.5 text-xs capitalize",
                    filters.due === v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
                  )}>{v}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</div>
              <div className="flex gap-2">
                {(["any", "yes", "no"] as const).map((v) => (
                  <label key={v} className="flex items-center gap-1.5 text-xs">
                    <Checkbox checked={filters.completed === v} onCheckedChange={() => setFilters({ ...filters, completed: v })} />
                    {v === "any" ? "Any" : v === "yes" ? "Completed" : "Pending"}
                  </label>
                ))}
              </div>
            </div>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setFilters(emptyFilters())} className="w-full">
                <X className="mr-1.5 h-3.5 w-3.5" /> Clear all
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
