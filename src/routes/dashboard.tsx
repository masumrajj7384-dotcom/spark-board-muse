import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/layout/AppShell";
import { LayoutDashboard } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Flow" }, { name: "description", content: "Productivity analytics for your Flow board." }] }),
  component: () => (
    <AppShell>
      <Placeholder title="Dashboard" desc="Analytics and charts land here in the next wave." />
    </AppShell>
  ),
});

function Placeholder({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="grid min-h-[70vh] place-items-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><LayoutDashboard className="h-6 w-6" /></div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
