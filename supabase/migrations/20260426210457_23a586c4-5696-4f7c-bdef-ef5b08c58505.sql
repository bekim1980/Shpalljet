-- Add Jobs/Employment fields to products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS job_type text,
  ADD COLUMN IF NOT EXISTS salary_min numeric,
  ADD COLUMN IF NOT EXISTS salary_max numeric,
  ADD COLUMN IF NOT EXISTS job_location text,
  ADD COLUMN IF NOT EXISTS experience_level text,
  ADD COLUMN IF NOT EXISTS application_email text,
  ADD COLUMN IF NOT EXISTS application_url text;

-- Seed Jobs category
INSERT INTO public.categories (name, slug)
SELECT 'Jobs / Employment', 'jobs'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'jobs');