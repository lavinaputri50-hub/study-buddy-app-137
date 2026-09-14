DROP POLICY IF EXISTS ws_select ON public.workspaces;
CREATE POLICY ws_select ON public.workspaces FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR public.is_workspace_member(id, auth.uid()));

DROP POLICY IF EXISTS ws_update ON public.workspaces;
CREATE POLICY ws_update ON public.workspaces FOR UPDATE TO authenticated
USING (owner_id = auth.uid() OR public.is_workspace_member(id, auth.uid()))
WITH CHECK (owner_id = auth.uid() OR public.is_workspace_member(id, auth.uid()));