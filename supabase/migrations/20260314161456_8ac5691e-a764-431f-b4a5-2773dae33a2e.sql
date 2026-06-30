
-- 1. Fix target_id: make nullable, convert to text (keep as text for flexibility with different ID types)
ALTER TABLE public.audit_logs ALTER COLUMN target_id DROP NOT NULL;

-- 2. Rename details -> metadata
ALTER TABLE public.audit_logs RENAME COLUMN details TO metadata;

-- 3. Add missing indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 4. Add service-role insert policy (admin insert already exists)
CREATE POLICY "Service role insert audit logs"
ON public.audit_logs FOR INSERT
TO service_role
WITH CHECK (true);
