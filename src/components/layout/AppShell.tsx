import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, LayoutDashboard, Calendar, GanttChart, FileText, Archive, Sparkles, Search, Sun, Moon, Zap, Bot, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTheme, type Theme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Board", icon: LayoutGrid },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/timeline", label: "Timeline", icon: GanttChart },
  { to: "/templates", label: "Templates", icon: FileText },
  { to: "/archived", label: "Archived", icon: Archive },
] as const;

export default function AppShell({
  children,
  onOpenSearch,
  onOpenCommand,
  onOpenAi,
}: {
  children: ReactNode;
  onOpenSearch?: () => void;
  onOpenCommand?: () => void;
  onOpenAi?: () => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 items-center gap-3 px-3 sm:px-6">
          <button
            className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent md:hidden"
            onClick={() => setSidebarOpen((s) => !s)}
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold tracking-tight">Masum Raj Automation</div>
              <div className="text-[10px] leading-none text-muted-foreground">Productivity, quietly</div>
            </div>
          </Link>

          <button
            onClick={onOpenSearch}
            className="ml-2 hidden min-w-0 max-w-md flex-1 items-center gap-2 rounded-lg border border-border/60 bg-surface px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-accent md:flex"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="truncate">Search tasks…</span>
            <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">/</kbd>
          </button>

          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={onOpenCommand} className="hidden sm:inline-flex">
              <Zap className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Commands</span>
              <kbd className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px]">⌘K</kbd>
            </Button>
            <Button variant="ghost" size="sm" onClick={onOpenAi}>
              <Bot className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Assistant</span>
            </Button>
            <ThemeMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        {/* Sidebar */}
        <aside
          className={cn(
            "border-r border-border/60 bg-sidebar text-sidebar-foreground transition-all",
            "hidden md:block",
            "w-56 shrink-0",
          )}
        >
          <SidebarNav pathname={pathname} />
        </aside>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden" onClick={() => setSidebarOpen(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <aside className="absolute left-0 top-0 h-full w-64 border-r border-border bg-sidebar p-1" onClick={(e) => e.stopPropagation()}>
              <SidebarNav pathname={pathname} onNavigate={() => setSidebarOpen(false)} />
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5 p-3">
      <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Workspace</div>
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition",
              active
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className={cn("h-4 w-4", active && "text-primary")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const Icon = theme === "light" ? Sun : theme === "amoled" ? Zap : Moon;
  const items: { key: Theme; label: string; icon: typeof Sun }[] = [
    { key: "light", label: "Light", icon: Sun },
    { key: "dark", label: "Dark", icon: Moon },
    { key: "amoled", label: "AMOLED", icon: Zap },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Theme">
          <Icon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {items.map(({ key, label, icon: I }) => (
          <DropdownMenuItem key={key} onClick={() => setTheme(key)} className={cn(theme === key && "bg-accent")}>
            <I className="mr-2 h-3.5 w-3.5" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
