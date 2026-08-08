
CREATE TABLE public.study_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  code text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_groups TO authenticated;
GRANT ALL ON public.study_groups TO service_role;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.study_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_group_members TO authenticated;
GRANT ALL ON public.study_group_members TO service_role;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_group_member(_group uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.study_group_members m WHERE m.group_id = _group AND m.user_id = _user);
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_group uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.study_group_members m WHERE m.group_id = _group AND m.user_id = _user AND m.role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.shares_group(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.study_group_members x
    JOIN public.study_group_members y ON x.group_id = y.group_id
    WHERE x.user_id = _a AND y.user_id = _b
  );
$$;

REVOKE ALL ON FUNCTION public.is_group_member(uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.is_group_admin(uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.shares_group(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.shares_group(uuid, uuid) TO authenticated, service_role;

CREATE POLICY groups_select ON public.study_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY groups_insert ON public.study_groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY groups_update ON public.study_groups FOR UPDATE TO authenticated USING (public.is_group_admin(id, auth.uid())) WITH CHECK (public.is_group_admin(id, auth.uid()));
CREATE POLICY groups_delete ON public.study_groups FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY members_select ON public.study_group_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_group_member(group_id, auth.uid()));
CREATE POLICY members_insert ON public.study_group_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY members_delete ON public.study_group_members FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_group_admin(group_id, auth.uid()));

CREATE POLICY profiles_group_read ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.shares_group(id, auth.uid()));

CREATE TABLE public.shared_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  deadline timestamptz,
  priority task_priority NOT NULL DEFAULT 'medium',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_done boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_tasks TO authenticated;
GRANT ALL ON public.shared_tasks TO service_role;
ALTER TABLE public.shared_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY shared_tasks_select ON public.shared_tasks FOR SELECT TO authenticated USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY shared_tasks_insert ON public.shared_tasks FOR INSERT TO authenticated WITH CHECK (public.is_group_admin(group_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY shared_tasks_update ON public.shared_tasks FOR UPDATE TO authenticated USING (public.is_group_admin(group_id, auth.uid()) OR assigned_to = auth.uid()) WITH CHECK (public.is_group_admin(group_id, auth.uid()) OR assigned_to = auth.uid());
CREATE POLICY shared_tasks_delete ON public.shared_tasks FOR DELETE TO authenticated USING (public.is_group_admin(group_id, auth.uid()));
CREATE TRIGGER shared_tasks_updated_at BEFORE UPDATE ON public.shared_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_messages TO authenticated;
GRANT ALL ON public.group_messages TO service_role;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_select ON public.group_messages FOR SELECT TO authenticated USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY messages_insert ON public.group_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_group_member(group_id, auth.uid()));
CREATE POLICY messages_delete ON public.group_messages FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.study_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  room_date date NOT NULL DEFAULT current_date,
  start_time time NOT NULL DEFAULT '08:00',
  duration_minutes integer NOT NULL DEFAULT 60,
  target text NOT NULL,
  target_description text,
  is_completed boolean NOT NULL DEFAULT false,
  started_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_rooms TO authenticated;
GRANT ALL ON public.study_rooms TO service_role;
ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY rooms_select ON public.study_rooms FOR SELECT TO authenticated USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY rooms_insert ON public.study_rooms FOR INSERT TO authenticated WITH CHECK (public.is_group_member(group_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY rooms_update ON public.study_rooms FOR UPDATE TO authenticated USING (public.is_group_member(group_id, auth.uid())) WITH CHECK (public.is_group_member(group_id, auth.uid()));
CREATE POLICY rooms_delete ON public.study_rooms FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_group_admin(group_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.is_room_member(_room uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.study_rooms r
    JOIN public.study_group_members m ON m.group_id = r.group_id
    WHERE r.id = _room AND m.user_id = _user
  );
$$;
REVOKE ALL ON FUNCTION public.is_room_member(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) TO authenticated, service_role;

CREATE TABLE public.study_room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_room_members TO authenticated;
GRANT ALL ON public.study_room_members TO service_role;
ALTER TABLE public.study_room_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY room_members_select ON public.study_room_members FOR SELECT TO authenticated USING (public.is_room_member(room_id, auth.uid()));
CREATE POLICY room_members_insert ON public.study_room_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_room_member(room_id, auth.uid()));
CREATE POLICY room_members_update ON public.study_room_members FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY room_members_delete ON public.study_room_members FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.study_room_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_room_comments TO authenticated;
GRANT ALL ON public.study_room_comments TO service_role;
ALTER TABLE public.study_room_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY room_comments_select ON public.study_room_comments FOR SELECT TO authenticated USING (public.is_room_member(room_id, auth.uid()));
CREATE POLICY room_comments_insert ON public.study_room_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_room_member(room_id, auth.uid()));
CREATE POLICY room_comments_delete ON public.study_room_comments FOR DELETE TO authenticated USING (user_id = auth.uid());
