
-- Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- Restrict sessions SELECT to owners
DROP POLICY IF EXISTS "Authenticated users can read sessions" ON public.sessions;
CREATE POLICY "Users can read own sessions" ON public.sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'technician'::public.app_role));

-- Restrict signatures SELECT to admins/technicians
DROP POLICY IF EXISTS "Authenticated can read signatures" ON public.signatures;
CREATE POLICY "Staff can read signatures" ON public.signatures
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'technician'::public.app_role));

-- Ensure no INSERT/DELETE privileges on user_roles for anon/authenticated
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated, PUBLIC;

-- Explicit deny policies for clarity (no rows match)
CREATE POLICY "No self insert on user_roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "No self update on user_roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY "No self delete on user_roles" ON public.user_roles
  FOR DELETE TO authenticated USING (false);
