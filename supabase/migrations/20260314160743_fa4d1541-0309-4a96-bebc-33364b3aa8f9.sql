
-- 1. Add generated search vector column
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(brand, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(location, '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(category, '')), 'C')
) STORED;

-- 2. GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_products_search_vector ON public.products USING GIN(search_vector);

-- 3. Search RPC with filters, respects RLS via security_invoker
CREATE OR REPLACE FUNCTION public.search_products(
  search_query text DEFAULT '',
  filter_category_id uuid DEFAULT NULL,
  filter_vertical text DEFAULT NULL,
  filter_condition text DEFAULT NULL,
  filter_price_min numeric DEFAULT NULL,
  filter_price_max numeric DEFAULT NULL,
  filter_location text DEFAULT NULL,
  sort_by text DEFAULT 'newest',
  result_limit int DEFAULT 50,
  result_offset int DEFAULT 0
)
RETURNS SETOF public.products
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM public.products p
  WHERE
    -- Text search (empty = match all)
    (search_query = '' OR p.search_vector @@ to_tsquery('simple',
      array_to_string(
        array(SELECT word || ':*' FROM unnest(string_to_array(trim(search_query), ' ')) AS word WHERE word <> ''),
        ' & '
      )
    ))
    -- Filters
    AND (filter_category_id IS NULL OR p.category_id = filter_category_id)
    AND (filter_vertical IS NULL OR p.vertical = filter_vertical)
    AND (filter_condition IS NULL OR p.condition = filter_condition)
    AND (filter_price_min IS NULL OR p.price >= filter_price_min)
    AND (filter_price_max IS NULL OR p.price <= filter_price_max)
    AND (filter_location IS NULL OR p.location ILIKE '%' || filter_location || '%')
  ORDER BY
    CASE WHEN sort_by = 'relevance' AND search_query <> '' THEN
      ts_rank(p.search_vector, to_tsquery('simple',
        array_to_string(
          array(SELECT word || ':*' FROM unnest(string_to_array(trim(search_query), ' ')) AS word WHERE word <> ''),
          ' & '
        )
      ))
    ELSE 0 END DESC,
    CASE WHEN sort_by = 'newest' OR sort_by = 'relevance' THEN extract(epoch from p.created_at) ELSE 0 END DESC,
    CASE WHEN sort_by = 'oldest' THEN extract(epoch from p.created_at) ELSE 0 END ASC,
    CASE WHEN sort_by = 'price-low' THEN p.price ELSE 0 END ASC,
    CASE WHEN sort_by = 'price-high' THEN p.price * -1 ELSE 0 END ASC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;
