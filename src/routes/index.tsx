import { createFileRoute } from "@tanstack/react-router";
import Board from "@/components/kanban/Board";

export const Route = createFileRoute("/")({
  component: Board,
});
