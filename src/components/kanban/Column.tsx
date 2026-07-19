import { useDroppable } from "@dnd-kit/core";
import { ChevronDown, MoreHorizontal, Plus, Trash2, Pencil } from "lucide-react";
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

  const colorClass = `bg-col-${column.color}`;

  if (column.collapsed) {
    return (
      <div className="flex h-fit w-12 shrink-0 flex-col items-center gap-3 rounded-xl border border-border/60 bg-surface px-1 py-3">
        <button onClick={onToggleCollapse} className="grid h-6 w-6 place-items-center rounded hover:bg-accent">
          <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
        </button>
        <div className={cn("h-2 w-2 rounded-full", colorClass)} />
        <div className="[writing-mode:vertical-rl] rotate-180 text-xs font-medium tracking-wide">{column.name}</div>
        <div className="text-[10px] text-muted-foreground">{items.length}</div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "glass-panel flex w-[300px] shrink-0 flex-col rounded-2xl transition-all",
        isOver && "ring-2 ring-primary/40 scale-[1.01]",
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2.5">
        <div className={cn("h-2 w-2 rounded-full", colorClass)} />
        {editingName ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => { onRename(name.trim() || column.name); setEditingName(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { onRename(name.trim() || column.name); setEditingName(false); } if (e.key === "Escape") { setName(column.name); setEditingName(false); } }}
            className="h-6 flex-1 border-0 bg-transparent p-0 text-sm font-medium focus-visible:ring-0"
          />
        ) : (
          <button onDoubleClick={() => setEditingName(true)} className="flex-1 truncate text-left text-sm font-semibold tracking-tight">
            {column.name}
          </button>
        )}
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{items.length}</span>
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

      <div className="flex min-h-[100px] flex-col gap-2 p-2">
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
