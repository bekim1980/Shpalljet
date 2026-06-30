
-- Add listing_type and expires_at to products
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS listing_type text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

-- Create index for expiration queries
CREATE INDEX IF NOT EXISTS idx_products_expires_at ON public.products (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_listing_type ON public.products (listing_type);
