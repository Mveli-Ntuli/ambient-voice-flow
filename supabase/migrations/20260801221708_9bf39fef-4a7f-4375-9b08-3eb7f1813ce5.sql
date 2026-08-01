-- Sessions: require owner on insert
UPDATE public.sessions SET user_id = user_id WHERE false;

DROP POLICY IF EXISTS "Authenticated users can create sessions" ON public.sessions;
CREATE POLICY "Authenticated users can create own sessions"
ON public.sessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Signatures: explicit deny for client writes (system/service-role only)
CREATE POLICY "No client insert on signatures"
ON public.signatures FOR INSERT TO authenticated
WITH CHECK (false);

CREATE POLICY "No client update on signatures"
ON public.signatures FOR UPDATE TO authenticated
USING (false);

CREATE POLICY "No client delete on signatures"
ON public.signatures FOR DELETE TO authenticated
USING (false);