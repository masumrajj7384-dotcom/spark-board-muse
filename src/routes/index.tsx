import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    // Only branch on the client where session is hydrated
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/board" : "/login" });
  },
  component: () => null,
});
