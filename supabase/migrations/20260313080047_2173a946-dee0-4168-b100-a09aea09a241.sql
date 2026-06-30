ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS price_period text DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS rental_period text,
  ADD COLUMN IF NOT EXISTS availability text,
  ADD COLUMN IF NOT EXISTS service_category text,
  ADD COLUMN IF NOT EXISTS provider_profile text,
  ADD COLUMN IF NOT EXISTS location text;