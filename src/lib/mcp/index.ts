import { defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import brainstormTasksTool from "./tools/brainstorm-tasks";

export default defineMcp({
  name: "flow-kanban-mcp",
  title: "Flow Kanban MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Flow Kanban app. Use `echo` to verify connectivity, and `brainstorm_tasks` to turn a goal into a suggested list of kanban tasks the user can add to their board.",
  tools: [echoTool, brainstormTasksTool],
});
