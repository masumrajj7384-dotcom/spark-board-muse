import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, Plus, X, Tag, Archive } from "lucide-react";
import type { TaskWithMeta, LabelRow, Priority } from "@/lib/board-data";
import { PRIORITIES } from "@/lib/board-data";
import { cn } from "@/lib/utils";

const LABEL_STYLES: Record<string, string> = {
  slate: "bg-col-slate/15 text-col-slate",
  blue: "bg-col-blue/15 text-col-blue",
  violet: "bg-col-violet/15 text-col-violet",
  amber: "bg-col-amber/15 text-col-amber",
  rose: "bg-col-rose/15 text-col-rose",
  emerald: "bg-col-emerald/15 text-col-emerald",
};

const PRIORITY_STYLES: Record<string, string> = {
  critical: "text-priority-critical",
  high: "text-priority-high",
  medium: "text-priority-medium",
  low: "text-priority-low",
};

export default function TaskDrawer({
  task,
  labels,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  onArchive,
  onToggleLabel,
  onAddChecklist,
  onToggleChecklist,
  onDeleteChecklist,
  onCreateLabel,
}: {
  task: TaskWithMeta | null;
  labels: LabelRow[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onUpdate: (patch: Partial<TaskWithMeta>) => void;
  onDelete: () => void;
  onArchive: () => void;
  onToggleLabel: (labelId: string) => void;
  onAddChecklist: (text: string) => void;
  onToggleChecklist: (id: string, completed: boolean) => void;
  onDeleteChecklist: (id: string) => void;
  onCreateLabel: (name: string, color: string) => Promise<LabelRow | null | undefined>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [checkItem, setCheckItem] = useState("");
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("blue");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
    }
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!task) return null;
  const activeLabelIds = new Set(task.labels.map((l) => l.id));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg">
        <div className="border-b border-border p-5">
          <SheetHeader className="p-0">
            <SheetTitle className="sr-only">Edit task</SheetTitle>
          </SheetHeader>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={task.completed}
              onCheckedChange={(v) => onUpdate({ completed: Boolean(v) })}
            />
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && title !== task.title && onUpdate({ title: title.trim() })}
              className="h-10 border-0 bg-transparent px-0 text-lg font-semibold focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="space-y-6 p-5">
          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Priority</Label>
              <Select value={task.priority} onValueChange={(v) => onUpdate({ priority: v as Priority })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className={cn("capitalize font-medium", PRIORITY_STYLES[p])}>{p}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Due date</Label>
              <Input
                type="date"
                value={task.due_date ? task.due_date.slice(0, 10) : ""}
                onChange={(e) => onUpdate({ due_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Estimated minutes</Label>
              <Input
                type="number"
                min={0}
                value={task.estimated_minutes ?? ""}
                onChange={(e) => onUpdate({ estimated_minutes: e.target.value ? Number(e.target.value) : null })}
                className="h-9"
                placeholder="e.g. 60"
              />
            </div>
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Labels</Label>
            <div className="flex flex-wrap gap-1.5">
              {task.labels.map((l) => (
                <button key={l.id} onClick={() => onToggleLabel(l.id)} className={cn("group inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", LABEL_STYLES[l.color] ?? LABEL_STYLES.blue)}>
                  {l.name}
                  <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                </button>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-foreground">
                    <Tag className="h-3 w-3" /> Add label
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-2">
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {labels.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => onToggleLabel(l.id)}
                        className={cn("flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent", activeLabelIds.has(l.id) && "bg-accent")}
                      >
                        <span className={cn("h-2 w-2 rounded-full", `bg-col-${l.color}`)} />
                        <span className="flex-1 text-left">{l.name}</span>
                        {activeLabelIds.has(l.id) && <span className="text-[10px] text-primary">✓</span>}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-1 border-t border-border pt-2">
                    <Input value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)} placeholder="New label" className="h-8" />
                    <Select value={newLabelColor} onValueChange={setNewLabelColor}>
                      <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["slate", "blue", "violet", "amber", "rose", "emerald"].map((c) => (
                          <SelectItem key={c} value={c}><span className={cn("inline-block h-3 w-3 rounded-full mr-2 align-middle", `bg-col-${c}`)} />{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={async () => { if (newLabelName.trim()) { await onCreateLabel(newLabelName.trim(), newLabelColor); setNewLabelName(""); } }}>Add</Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => description !== (task.description ?? "") && onUpdate({ description: description || null })}
              rows={4}
              placeholder="Add more detail…"
            />
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Checklist {task.checklist.length > 0 && `(${task.checklist.filter((c) => c.completed).length}/${task.checklist.length})`}
            </Label>
            <div className="space-y-1">
              {task.checklist.map((c) => (
                <div key={c.id} className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-accent">
                  <Checkbox checked={c.completed} onCheckedChange={(v) => onToggleChecklist(c.id, Boolean(v))} />
                  <span className={cn("flex-1 text-sm", c.completed && "text-muted-foreground line-through")}>{c.text}</span>
                  <button onClick={() => onDeleteChecklist(c.id)} className="opacity-0 group-hover:opacity-100">
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-1">
              <Input
                value={checkItem}
                onChange={(e) => setCheckItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && checkItem.trim()) { onAddChecklist(checkItem.trim()); setCheckItem(""); } }}
                placeholder="Add checklist item…"
                className="h-8"
              />
              <Button size="sm" variant="ghost" onClick={() => { if (checkItem.trim()) { onAddChecklist(checkItem.trim()); setCheckItem(""); } }}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 border-t border-border pt-4">
            <Button variant="outline" size="sm" onClick={onArchive}>
              <Archive className="mr-1.5 h-3.5 w-3.5" /> Archive
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
            <div className="ml-auto text-[10px] text-muted-foreground">
              Updated {new Date(task.updated_at).toLocaleString()}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
