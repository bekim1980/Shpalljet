ALTER TABLE public.products ADD COLUMN IF NOT EXISTS contact_method text NOT NULL DEFAULT 'chat';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS service_area text;