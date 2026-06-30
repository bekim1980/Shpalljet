
-- 1. Add missing RLS policy: sellers can view their own products regardless of status
CREATE POLICY "Users can view own products"
ON public.products FOR SELECT
TO authenticated
USING (auth.uid() = seller_id);

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products (seller_id);
CREATE INDEX IF NOT EXISTS idx_products_status_vertical ON public.products (status, vertical);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_product ON public.wishlist (user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_reviews_seller_id ON public.reviews (seller_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id ON public.conversations (buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id ON public.conversations (seller_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status);

-- 3. Ensure handle_new_user trigger exists
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Ensure updated_at trigger on products
CREATE OR REPLACE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Ensure updated_at trigger on profiles
CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Create audit_logs table for admin actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
