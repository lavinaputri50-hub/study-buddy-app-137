
REVOKE EXECUTE ON FUNCTION public.task_group(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_task_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_task_admin(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.task_group(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_task_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_task_admin(uuid, uuid) TO authenticated;
