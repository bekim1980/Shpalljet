
-- 1. Create categories table
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. Enable RLS - public read-only
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are publicly readable"
ON public.categories FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can manage categories"
ON public.categories FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Add category_id to products
ALTER TABLE public.products
ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

-- 4. Index on products(category_id)
CREATE INDEX idx_products_category_id ON public.products(category_id);

-- 5. Index on categories parent_id for subcategory lookups
CREATE INDEX idx_categories_parent_id ON public.categories(parent_id);

-- 6. Seed initial categories
INSERT INTO public.categories (name, slug) VALUES
  ('Electronics', 'electronics'),
  ('Furniture', 'furniture'),
  ('Clothing', 'clothing'),
  ('Books', 'books'),
  ('Home & Garden', 'home-garden'),
  ('Sports', 'sports');
