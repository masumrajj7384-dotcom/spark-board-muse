## Kanban Board with AI Assistant

A clean, minimal Kanban tool inspired by the reference (light surfaces, soft borders, rounded cards, colored status pills, generous whitespace).

### Columns
- To-Do, In Progress, Done — fixed three columns.

### Task card
- Title, description, due date (optional).
- Smooth drag-and-drop between columns; reorder within a column.
- Click a card to open an editor side panel.
- Hover and drag animations for an interactive, "gorgeous" feel.

### Auth & persistence (Lovable Cloud)
- Email + password and Google sign-in on a `/login` page.
- Each user has their own private board; tasks auto-save to the database on every change (create, edit, move, delete).
- `tasks` table with RLS so users only see their own rows.

### AI Assistant
- Floating chat panel on the board page.
- Board-aware: knows the user's current tasks and can answer "what's overdue?", "summarize in-progress", etc.
- Can create / update / move / delete tasks via tool-calling. Changes appear live on the board.
- Streaming responses, conversation kept in memory for the session.

### Design
- Light theme matching the reference: white canvas, subtle gray column backgrounds, colored status dots, rounded cards with soft shadow on hover.
- Header with board title, user avatar, sign-out, and "Ask AI" button.

### Technical notes
- TanStack Start routes: `/` (landing → redirects to `/board` if logged in), `/login`, `/_authenticated/board`.
- Lovable Cloud for DB + auth; Lovable AI Gateway (`google/gemini-3-flash-preview`) via a server function with tool-calling for board mutations.
- `@dnd-kit` for drag-and-drop.
- Tasks persist on every mutation — no manual save needed.

Shall I build it?