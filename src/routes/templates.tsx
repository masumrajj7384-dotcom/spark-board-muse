import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/layout/AppShell";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/templates")({
  head: () => ({ meta: [{ title: "Templates — Flow" }] }),
  component: () => (
    <AppShell>
      <div className="grid min-h-[70vh] place-items-center p-8">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><FileText className="h-6 w-6" /></div>
          <h1 className="text-xl font-semibold">Templates</h1>
          <p className="mt-2 text-sm text-muted-foreground">Prebuilt boards for planning, audits, and projects — coming next wave.</p>
        </div>
      </div>
    </AppShell>
  ),
});
