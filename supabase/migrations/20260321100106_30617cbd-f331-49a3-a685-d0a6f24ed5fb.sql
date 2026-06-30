-- Product views tracking table
CREATE TABLE public.product_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  viewer_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast aggregation
CREATE INDEX idx_product_views_product_id ON public.product_views (product_id);
CREATE INDEX idx_product_views_created_at ON public.product_views (created_at);

-- RLS
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a view (anonymous tracking)
CREATE POLICY "Anyone can insert product views" ON public.product_views
  FOR INSERT TO public WITH CHECK (true);

-- Sellers can see views on their own products
CREATE POLICY "Sellers can view their product views" ON public.product_views
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_views.product_id AND p.seller_id = auth.uid()
  ));

-- Admins can see all views
CREATE POLICY "Admins can view all product views" ON public.product_views
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add is_boosted and auto_renew to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_boosted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS boost_expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_is_boosted ON public.products (is_boosted) WHERE is_boosted = true;