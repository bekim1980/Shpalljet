
-- Add currency, country, city columns to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EUR';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS city text;

-- Add region column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region text;
