
-- 4. Service-role insert policy for notifications
CREATE POLICY "Service role insert notifications"
ON public.notifications
FOR INSERT
TO service_role
WITH CHECK (true);
