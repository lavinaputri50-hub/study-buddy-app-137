CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.study_groups(id) ON DELETE CASCADE,
  task_id uuid,
  task_kind text NOT NULL DEFAULT 'personal',
  title text NOT NULL,
  assignment_type text NOT NULL DEFAULT 'document',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'editor',
  current_page uuid,
  activity_note text,
  focus_minutes integer NOT NULL DEFAULT 0,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_workspace_member(_ws uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = _ws
      AND (
        w.owner_id = _user
        OR (w.group_id IS NOT NULL AND public.is_group_member(w.group_id, _user))
        OR EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.workspace_id = _ws AND m.user_id = _user)
      )
  );
$$;

CREATE POLICY ws_select ON public.workspaces FOR SELECT TO authenticated USING (public.is_workspace_member(id, auth.uid()));
CREATE POLICY ws_insert ON public.workspaces FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY ws_update ON public.workspaces FOR UPDATE TO authenticated USING (public.is_workspace_member(id, auth.uid())) WITH CHECK (public.is_workspace_member(id, auth.uid()));
CREATE POLICY ws_delete ON public.workspaces FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY wsm_select ON public.workspace_members FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY wsm_insert ON public.workspace_members FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY wsm_update ON public.workspace_members FOR UPDATE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid())) WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY wsm_delete ON public.workspace_members FOR DELETE TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid()));

CREATE TABLE public.workspace_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Halaman Baru',
  position integer NOT NULL DEFAULT 0,
  speaker_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_pages TO authenticated;
GRANT ALL ON public.workspace_pages TO service_role;
ALTER TABLE public.workspace_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY wsp_all ON public.workspace_pages FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid())) WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TABLE public.workspace_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  page_id uuid NOT NULL REFERENCES public.workspace_pages(id) ON DELETE CASCADE,
  type text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  position integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_elements TO authenticated;
GRANT ALL ON public.workspace_elements TO service_role;
ALTER TABLE public.workspace_elements ENABLE ROW LEVEL SECURITY;
CREATE POLICY wse_all ON public.workspace_elements FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid())) WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TABLE public.workspace_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_files TO authenticated;
GRANT ALL ON public.workspace_files TO service_role;
ALTER TABLE public.workspace_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY wsf_select ON public.workspace_files FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY wsf_insert ON public.workspace_files FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY wsf_delete ON public.workspace_files FOR DELETE TO authenticated USING (uploaded_by = auth.uid());

CREATE TABLE public.workspace_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  added_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'website',
  title text NOT NULL,
  author text,
  year text,
  url text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_references TO authenticated;
GRANT ALL ON public.workspace_references TO service_role;
ALTER TABLE public.workspace_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY wsr_select ON public.workspace_references FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY wsr_write ON public.workspace_references FOR INSERT TO authenticated WITH CHECK (added_by = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY wsr_update ON public.workspace_references FOR UPDATE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid())) WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY wsr_delete ON public.workspace_references FOR DELETE TO authenticated USING (added_by = auth.uid());

CREATE TABLE public.workspace_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  label text NOT NULL,
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'todo',
  is_done boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_checklists TO authenticated;
GRANT ALL ON public.workspace_checklists TO service_role;
ALTER TABLE public.workspace_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY wsc_all ON public.workspace_checklists FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid())) WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TABLE public.workspace_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  element_id uuid REFERENCES public.workspace_elements(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.workspace_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_comments TO authenticated;
GRANT ALL ON public.workspace_comments TO service_role;
ALTER TABLE public.workspace_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY wscm_select ON public.workspace_comments FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY wscm_insert ON public.workspace_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY wscm_update ON public.workspace_comments FOR UPDATE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid())) WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY wscm_delete ON public.workspace_comments FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.workspace_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_messages TO authenticated;
GRANT ALL ON public.workspace_messages TO service_role;
ALTER TABLE public.workspace_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY wsmsg_select ON public.workspace_messages FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY wsmsg_insert ON public.workspace_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY wsmsg_delete ON public.workspace_messages FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.workspace_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.workspace_activity TO authenticated;
GRANT ALL ON public.workspace_activity TO service_role;
ALTER TABLE public.workspace_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY wsa_select ON public.workspace_activity FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY wsa_insert ON public.workspace_activity FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER workspace_pages_updated_at BEFORE UPDATE ON public.workspace_pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER workspace_elements_updated_at BEFORE UPDATE ON public.workspace_elements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER workspace_checklists_updated_at BEFORE UPDATE ON public.workspace_checklists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_workspaces_task ON public.workspaces(task_id);
CREATE INDEX idx_ws_elements_page ON public.workspace_elements(page_id, position);
CREATE INDEX idx_ws_pages_ws ON public.workspace_pages(workspace_id, position);