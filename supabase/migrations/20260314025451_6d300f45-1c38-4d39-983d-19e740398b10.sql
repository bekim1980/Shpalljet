ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS viber_enabled boolean NOT NULL DEFAULT false;