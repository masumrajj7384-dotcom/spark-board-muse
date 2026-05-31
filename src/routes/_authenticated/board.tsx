import { createFileRoute } from "@tanstack/react-router";
import Board from "@/components/kanban/Board";

export const Route = createFileRoute("/_authenticated/board")({
  component: Board,
});
