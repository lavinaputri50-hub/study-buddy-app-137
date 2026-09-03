
ALTER TABLE public.shared_tasks
  ADD COLUMN IF NOT EXISTS target text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'not_started';

CREATE OR REPLACE FUNCTION public.task_group(_task uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT group_id FROM public.shared_tasks WHERE id = _task;
$$;

CREATE OR REPLACE FUNCTION public.is_task_member(_task uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_group_member(public.task_group(_task), _user);
$$;

CREATE OR REPLACE FUNCTION public.is_task_admin(_task uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_group_admin(public.task_group(_task), _user);
$$;

CREATE TABLE IF NOT EXISTS public.shared_task_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.shared_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'not_started',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_task_members TO authenticated;
GRANT ALL ON public.shared_task_members TO service_role;
ALTER TABLE public.shared_task_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY stm_select ON public.shared_task_members FOR SELECT TO authenticated
  USING (public.is_task_member(task_id, auth.uid()));
CREATE POLICY stm_insert ON public.shared_task_members FOR INSERT TO authenticated
  WITH CHECK (public.is_task_member(task_id, auth.uid()) AND (user_id = auth.uid() OR public.is_task_admin(task_id, auth.uid())));
CREATE POLICY stm_update ON public.shared_task_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_task_admin(task_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_task_admin(task_id, auth.uid()));
CREATE POLICY stm_delete ON public.shared_task_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_task_admin(task_id, auth.uid()));
CREATE TRIGGER stm_updated_at BEFORE UPDATE ON public.shared_task_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.shared_tasks(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_attachments TO authenticated;
GRANT ALL ON public.task_attachments TO service_role;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY ta_select ON public.task_attachments FOR SELECT TO authenticated
  USING (public.is_task_member(task_id, auth.uid()));
CREATE POLICY ta_insert ON public.task_attachments FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND public.is_task_member(task_id, auth.uid()));
CREATE POLICY ta_delete ON public.task_attachments FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.is_task_admin(task_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.shared_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_comments TO authenticated;
GRANT ALL ON public.task_comments TO service_role;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tc_select ON public.task_comments FOR SELECT TO authenticated
  USING (public.is_task_member(task_id, auth.uid()));
CREATE POLICY tc_insert ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_task_member(task_id, auth.uid()));
CREATE POLICY tc_delete ON public.task_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_task_admin(task_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.task_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.shared_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.task_activity TO authenticated;
GRANT ALL ON public.task_activity TO service_role;
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY tact_select ON public.task_activity FOR SELECT TO authenticated
  USING (public.is_task_member(task_id, auth.uid()));
CREATE POLICY tact_insert ON public.task_activity FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_task_member(task_id, auth.uid()));

CREATE POLICY notifications_group_insert ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.shares_group(user_id, auth.uid()));

CREATE POLICY "task files readable by group members" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'task-files' AND public.is_group_member(((storage.foldername(name))[1])::uuid, auth.uid()));
CREATE POLICY "task files uploadable by group members" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-files' AND public.is_group_member(((storage.foldername(name))[1])::uuid, auth.uid()));
CREATE POLICY "task files deletable by owner" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'task-files' AND owner = auth.uid());
