import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { useNavigate } from "@tanstack/react-router";
import { LayoutGrid, LayoutDashboard, Calendar, GanttChart, FileText, Archive, Plus, Sun, Moon, Zap, Bot } from "lucide-react";
import { useTheme } from "@/lib/theme";
import type { TaskWithMeta } from "@/lib/board-data";

export default function CommandPalette({
  open,
  onOpenChange,
  tasks,
  onOpenTask,
  onNewTask,
  onOpenAi,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tasks: TaskWithMeta[];
  onOpenTask: (t: TaskWithMeta) => void;
  onNewTask: () => void;
  onOpenAi: () => void;
}) {
  const navigate = useNavigate();
  const { setTheme } = useTheme();

  const go = (to: string) => { onOpenChange(false); navigate({ to }); };
  const run = (fn: () => void) => { onOpenChange(false); fn(); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(onNewTask)}><Plus className="mr-2 h-4 w-4" />New task</CommandItem>
          <CommandItem onSelect={() => run(onOpenAi)}><Bot className="mr-2 h-4 w-4" />Open AI assistant</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go("/")}><LayoutGrid className="mr-2 h-4 w-4" />Board</CommandItem>
          <CommandItem onSelect={() => go("/dashboard")}><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</CommandItem>
          <CommandItem onSelect={() => go("/calendar")}><Calendar className="mr-2 h-4 w-4" />Calendar</CommandItem>
          <CommandItem onSelect={() => go("/timeline")}><GanttChart className="mr-2 h-4 w-4" />Timeline</CommandItem>
          <CommandItem onSelect={() => go("/templates")}><FileText className="mr-2 h-4 w-4" />Templates</CommandItem>
          <CommandItem onSelect={() => go("/archived")}><Archive className="mr-2 h-4 w-4" />Archived</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => run(() => setTheme("light"))}><Sun className="mr-2 h-4 w-4" />Light</CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("dark"))}><Moon className="mr-2 h-4 w-4" />Dark</CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("amoled"))}><Zap className="mr-2 h-4 w-4" />AMOLED</CommandItem>
        </CommandGroup>
        {tasks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tasks">
              {tasks.slice(0, 30).map((t) => (
                <CommandItem key={t.id} value={`${t.title} ${t.description ?? ""}`} onSelect={() => run(() => onOpenTask(t))}>
                  <span className="truncate">{t.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
