Apply a cohesive dark, vibrant color treatment to the app so the requested blue+black, green+black, and sapphire blue columns really pop.

**Design decisions (defaults)**
- Switch the overall app to a dark theme (deep black background) so the "black" in the requested palettes feels intentional and the column colors feel vibrant rather than muted on white.
- Done column: use **sapphire blue** — a deep, saturated blue — to give it a distinct, finished feel.
- Keep the existing layout, drag-and-drop, and functionality; only change colors and surfaces.

**Files to change**
1. `src/styles.css`
   - Update `:root` design tokens for dark mode: `background`, `foreground`, `card`, `surface`, `surface-2`, `border`, `muted`, `primary`.
   - Add column-specific tokens to `@theme inline`: `--color-todo`, `--color-progress`, `--color-done`, plus matching dimmed background variants (`--color-todo-bg`, `--color-progress-bg`, `--color-done-bg`) for column fills.

2. `src/components/kanban/Board.tsx`
   - Replace the `dot` values in `COLUMNS` with the new semantic tokens (e.g. `bg-todo`, `bg-progress`, `bg-done`).
   - Optionally add a subtle top-gradient or keep the header minimal in dark style.

3. `src/components/kanban/Column.tsx`
   - Use the column’s background token (`bg-todo-bg`, etc.) for the column surface.
   - Add a colored top border or header bar using the accent token.
   - Ensure text, count badge, and empty-state dashed border remain readable on dark backgrounds.

4. `src/components/kanban/TaskCard.tsx`
   - Keep cards dark but give them a subtle left-edge stripe or hover glow matching the column accent so cards feel tied to their column color.
   - Ensure overdue date styling still reads clearly on dark cards.

5. `src/components/kanban/AiChat.tsx`
   - Update message bubbles and sheet background to use the new dark surface tokens so the chat panel matches the board.

6. `src/routes/login.tsx`
   - Adjust the login page background gradient/blur colors to the new dark palette so authentication doesn’t feel like a separate light-themed app.

**Verification**
- Run the dev build and open the board preview to confirm all three columns show the correct colors and remain readable.
- Check the login page and AI chat panel for visual consistency in the new dark theme.