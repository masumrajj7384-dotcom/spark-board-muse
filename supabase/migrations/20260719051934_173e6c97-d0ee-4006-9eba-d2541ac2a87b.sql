
-- Drop old auth-scoped tasks table; the app is public and we're rebuilding.
DROP TABLE IF EXISTS public.tasks CASCADE;

-- ============ BOARDS ============
CREATE TABLE public.boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Board',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boards TO anon, authenticated;
GRANT ALL ON public.boards TO service_role;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read boards" ON public.boards FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public insert boards" ON public.boards FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public update boards" ON public.boards FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public delete boards" ON public.boards FOR DELETE TO anon, authenticated USING (true);
CREATE TRIGGER boards_touch BEFORE UPDATE ON public.boards FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ COLUMNS ============
CREATE TABLE public.board_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'blue',
  position double precision NOT NULL DEFAULT 1024,
  collapsed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX board_columns_board_idx ON public.board_columns(board_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_columns TO anon, authenticated;
GRANT ALL ON public.board_columns TO service_role;
ALTER TABLE public.board_columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all columns" ON public.board_columns FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER board_columns_touch BEFORE UPDATE ON public.board_columns FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ LABELS ============
CREATE TABLE public.labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'blue',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX labels_board_idx ON public.labels(board_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.labels TO anon, authenticated;
GRANT ALL ON public.labels TO service_role;
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all labels" ON public.labels FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ TASKS ============
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  column_id uuid NOT NULL REFERENCES public.board_columns(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  due_date timestamptz,
  estimated_minutes integer,
  position double precision NOT NULL DEFAULT 1024,
  completed boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tasks_board_idx ON public.tasks(board_id, archived);
CREATE INDEX tasks_column_idx ON public.tasks(column_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO anon, authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all tasks" ON public.tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER tasks_touch BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ TASK LABELS ============
CREATE TABLE public.task_labels (
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_labels TO anon, authenticated;
GRANT ALL ON public.task_labels TO service_role;
ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all task_labels" ON public.task_labels FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ CHECKLIST ITEMS ============
CREATE TABLE public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  text text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  position double precision NOT NULL DEFAULT 1024,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX checklist_task_idx ON public.checklist_items(task_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_items TO anon, authenticated;
GRANT ALL ON public.checklist_items TO service_role;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all checklist_items" ON public.checklist_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ COMMENTS ============
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'Anonymous',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_task_idx ON public.comments(task_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO anon, authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all comments" ON public.comments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ ACTIVITY ============
CREATE TABLE public.activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  board_id uuid REFERENCES public.boards(id) ON DELETE CASCADE,
  action text NOT NULL,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_task_idx ON public.activity(task_id, created_at DESC);
CREATE INDEX activity_board_idx ON public.activity(board_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity TO anon, authenticated;
GRANT ALL ON public.activity TO service_role;
ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all activity" ON public.activity FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
