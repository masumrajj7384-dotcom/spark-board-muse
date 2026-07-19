import { useDroppable } from "@dnd-kit/core";
import { ChevronDown, MoreHorizontal, Plus, Trash2, Pencil, Inbox, ListTodo, Loader2, Eye, Ban, CheckCircle2, Circle, type LucideIcon } from "lucide-react";

const COLOR_ICON: Record<string, LucideIcon> = {
  slate: Inbox,
  blue: ListTodo,
  violet: Loader2,
  amber: Eye,
  rose: Ban,
  emerald: CheckCircle2,
};

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TaskCard from "./TaskCard";
import type { TaskWithMeta, ColumnRow } from "@/lib/board-data";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export default function Column({
  column,
  items,
  onAdd,
  onOpen,
  onRename,
  onDelete,
  onToggleCollapse,
}: {
  column: ColumnRow;
  items: TaskWithMeta[];
  onAdd: () => void;
  onOpen: (t: TaskWithMeta) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onToggleCollapse: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(column.name);

  const textColor = `text-col-${column.color}`;

  const tintVar = { ["--tint" as never]: `var(--color-col-${column.color})` } as React.CSSProperties;
  const Icon = COLOR_ICON[column.color] ?? Circle;

  if (column.collapsed) {
    return (
      <div className="glass flex h-fit w-12 shrink-0 flex-col items-center gap-3 rounded-2xl px-1 py-3">
        <button onClick={onToggleCollapse} className="grid h-6 w-6 place-items-center rounded hover:bg-accent">
          <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
        </button>
        <Icon className={cn("h-4 w-4", textColor)} />
        <div className="[writing-mode:vertical-rl] rotate-180 text-xs font-medium tracking-wide">{column.name}</div>
        <div className="text-[10px] text-muted-foreground">{items.length}</div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={tintVar}
      className={cn(
        "glass-panel col-tinted relative flex w-[300px] shrink-0 flex-col self-stretch rounded-2xl transition-all",
        isOver && "ring-2 ring-primary/60 scale-[1.01]",
      )}
    >
      <div
        className="relative z-10 flex items-center gap-2 rounded-t-2xl border-b px-3 py-3"
        style={{
          background: `linear-gradient(180deg, color-mix(in oklab, var(--tint) 28%, transparent), color-mix(in oklab, var(--tint) 8%, transparent))`,
          borderBottomColor: `color-mix(in oklab, var(--tint) 35%, transparent)`,
        }}
      >
        <div
          className={cn(
            "grid h-7 w-7 place-items-center rounded-lg shadow-inner",
            textColor,
          )}
          style={{
            background: `color-mix(in oklab, var(--tint) 22%, transparent)`,
            boxShadow: `inset 0 1px 0 color-mix(in oklab, #fff 25%, transparent), 0 0 0 1px color-mix(in oklab, var(--tint) 45%, transparent), 0 6px 18px -6px color-mix(in oklab, var(--tint) 60%, transparent)`,
          }}
        >
          <Icon className={cn("h-3.5 w-3.5", column.color === "violet" && "animate-spin [animation-duration:6s]")} />
        </div>
        {editingName ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => { onRename(name.trim() || column.name); setEditingName(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { onRename(name.trim() || column.name); setEditingName(false); } if (e.key === "Escape") { setName(column.name); setEditingName(false); } }}
            className="h-6 flex-1 border-0 bg-transparent p-0 text-sm font-semibold focus-visible:ring-0"
          />
        ) : (
          <button onDoubleClick={() => setEditingName(true)} className="flex min-w-0 flex-1 flex-col items-start text-left">
            <span className="truncate text-sm font-semibold tracking-tight">{column.name}</span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
              {items.length === 1 ? "1 task" : `${items.length} tasks`}
            </span>
          </button>
        )}
        <span
          className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums", textColor)}
          style={{
            background: `color-mix(in oklab, var(--tint) 18%, transparent)`,
            boxShadow: `inset 0 0 0 1px color-mix(in oklab, var(--tint) 40%, transparent)`,
          }}
        >
          {items.length}
        </span>
        <button onClick={onAdd} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Add task">
          <Plus className="h-3.5 w-3.5" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Column menu">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditingName(true)}><Pencil className="mr-2 h-3.5 w-3.5" />Rename</DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleCollapse}><ChevronDown className="mr-2 h-3.5 w-3.5" />Collapse</DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" />Delete column</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative z-10 flex flex-1 min-h-[120px] flex-col gap-2 p-2">
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div key={t.id} layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <TaskCard task={t} onOpen={() => onOpen(t)} columnColor={column.color} />
            </motion.div>
          ))}
        </AnimatePresence>
        {items.length === 0 && (
          <button
            onClick={onAdd}
            className="rounded-lg border border-dashed border-border/60 bg-transparent px-3 py-6 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            + Add task
          </button>
        )}
      </div>
    </div>
  );
}
