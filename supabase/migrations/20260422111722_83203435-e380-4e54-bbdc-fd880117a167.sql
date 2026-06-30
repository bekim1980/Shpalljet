
-- ============ STEP 1: New tables ============

CREATE TABLE IF NOT EXISTS public.search_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  query text NOT NULL DEFAULT '',
  parsed_keywords text[],
  parsed_category text,
  parsed_price_min numeric,
  parsed_price_max numeric,
  parsed_condition text,
  parsed_location text,
  results_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_events_user ON public.search_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_events_created ON public.search_events(created_at DESC);

ALTER TABLE public.search_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log search events"
  ON public.search_events FOR INSERT
  TO public
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users view own search events"
  ON public.search_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all search events"
  ON public.search_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));


CREATE TABLE IF NOT EXISTS public.product_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  conversation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_messages_product ON public.product_messages(product_id);
CREATE INDEX IF NOT EXISTS idx_product_messages_user ON public.product_messages(user_id);

ALTER TABLE public.product_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can log product messages"
  ON public.product_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own product messages"
  ON public.product_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Sellers view messages on their products"
  ON public.product_messages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_messages.product_id AND p.seller_id = auth.uid()
  ));

CREATE POLICY "Admins view all product messages"
  ON public.product_messages FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));


-- ============ STEP 2: Extend products ============

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS views_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS messages_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS favorites_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS search_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_history jsonb;

CREATE INDEX IF NOT EXISTS idx_products_quality_score ON public.products(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_products_status_created ON public.products(status, created_at DESC);


-- ============ STEP 3: Quality score ============

CREATE OR REPLACE FUNCTION public.compute_product_quality_score(
  p_image_count int,
  p_title text,
  p_description text,
  p_category text,
  p_price numeric
) RETURNS int
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s int := 0;
  title_len int := coalesce(length(p_title), 0);
  desc_len int := coalesce(length(p_description), 0);
BEGIN
  -- Images (max 30)
  s := s + LEAST(coalesce(p_image_count, 0) * 6, 30);
  -- Title quality (max 20): 20-60 chars sweet spot
  IF title_len BETWEEN 20 AND 60 THEN s := s + 20;
  ELSIF title_len BETWEEN 10 AND 80 THEN s := s + 12;
  ELSIF title_len > 0 THEN s := s + 5;
  END IF;
  -- Description (max 25)
  IF desc_len >= 200 THEN s := s + 25;
  ELSIF desc_len >= 80 THEN s := s + 15;
  ELSIF desc_len >= 30 THEN s := s + 8;
  END IF;
  -- Category present and not 'other' (max 15)
  IF p_category IS NOT NULL AND lower(p_category) NOT IN ('', 'other') THEN
    s := s + 15;
  ELSIF p_category IS NOT NULL THEN
    s := s + 5;
  END IF;
  -- Price set and positive (max 10)
  IF p_price IS NOT NULL AND p_price > 0 THEN s := s + 10; END IF;

  RETURN LEAST(s, 100);
END;
$$;

CREATE OR REPLACE FUNCTION public.products_set_quality_score()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.quality_score := public.compute_product_quality_score(
    coalesce(array_length(NEW.image_urls, 1), 0),
    NEW.title,
    NEW.description,
    NEW.category,
    NEW.price
  );
  -- Track price changes
  IF TG_OP = 'UPDATE' AND OLD.price IS DISTINCT FROM NEW.price THEN
    NEW.price_history := coalesce(OLD.price_history, '[]'::jsonb)
      || jsonb_build_object('price', OLD.price, 'changed_at', now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_quality_score ON public.products;
CREATE TRIGGER trg_products_quality_score
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_set_quality_score();

-- Backfill quality_score for existing rows
UPDATE public.products SET updated_at = updated_at;


-- ============ STEP 4: Engagement counter triggers ============

CREATE OR REPLACE FUNCTION public.bump_product_views_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products SET views_count = views_count + 1 WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_product_views ON public.product_views;
CREATE TRIGGER trg_bump_product_views
  AFTER INSERT ON public.product_views
  FOR EACH ROW EXECUTE FUNCTION public.bump_product_views_count();

CREATE OR REPLACE FUNCTION public.bump_product_messages_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products SET messages_count = messages_count + 1 WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_product_messages ON public.product_messages;
CREATE TRIGGER trg_bump_product_messages
  AFTER INSERT ON public.product_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_product_messages_count();

CREATE OR REPLACE FUNCTION public.bump_product_favorites_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.products SET favorites_count = favorites_count + 1 WHERE id = NEW.product_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.products SET favorites_count = GREATEST(favorites_count - 1, 0) WHERE id = OLD.product_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_product_favorites ON public.wishlist;
CREATE TRIGGER trg_bump_product_favorites
  AFTER INSERT OR DELETE ON public.wishlist
  FOR EACH ROW EXECUTE FUNCTION public.bump_product_favorites_count();


-- ============ STEP 5: rank_products RPC ============

CREATE OR REPLACE FUNCTION public.rank_products(
  search_query text DEFAULT '',
  filter_category_id uuid DEFAULT NULL,
  filter_vertical text DEFAULT NULL,
  filter_condition text DEFAULT NULL,
  filter_price_min numeric DEFAULT NULL,
  filter_price_max numeric DEFAULT NULL,
  filter_location text DEFAULT NULL,
  result_limit int DEFAULT 50,
  result_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid, seller_id uuid, title text, description text, price numeric,
  category text, condition text, image_urls text[], status text,
  vertical text, created_at timestamptz, currency text, country text, city text,
  contact_method text, listing_type text, is_boosted boolean,
  boost_expires_at timestamptz, expires_at timestamptz, auto_renew boolean,
  views_count int, messages_count int, favorites_count int, quality_score int,
  final_score numeric
)
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
DECLARE
  ts_query tsquery;
  has_query boolean := coalesce(trim(search_query), '') <> '';
BEGIN
  IF has_query THEN
    ts_query := to_tsquery('simple',
      array_to_string(
        array(SELECT word || ':*' FROM unnest(string_to_array(trim(search_query), ' ')) AS word WHERE word <> ''),
        ' & '
      )
    );
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT p.*,
      CASE WHEN has_query THEN ts_rank(p.search_vector, ts_query) ELSE 0 END AS text_rel,
      EXTRACT(EPOCH FROM (now() - p.created_at)) / 86400.0 AS age_days,
      (p.is_boosted AND p.boost_expires_at IS NOT NULL AND p.boost_expires_at > now()) AS is_promoted
    FROM public.products p
    WHERE p.status = 'active'
      AND (NOT has_query OR p.search_vector @@ ts_query)
      AND (filter_category_id IS NULL OR p.category_id = filter_category_id)
      AND (filter_vertical IS NULL OR p.vertical = filter_vertical)
      AND (filter_condition IS NULL OR p.condition = filter_condition)
      AND (filter_price_min IS NULL OR p.price >= filter_price_min)
      AND (filter_price_max IS NULL OR p.price <= filter_price_max)
      AND (filter_location IS NULL OR p.location ILIKE '%' || filter_location || '%' OR p.city ILIKE '%' || filter_location || '%')
  ),
  scored AS (
    SELECT b.*,
      -- text_relevance normalized 0..1 (ts_rank rarely above ~1)
      LEAST(b.text_rel, 1)::numeric AS s_text,
      (b.quality_score::numeric / 100.0) AS s_quality,
      -- freshness: 1 at 0d, ~0 at 30d
      GREATEST(0, 1 - (b.age_days / 30.0))::numeric AS s_fresh,
      -- engagement: log-scale combo
      LEAST(1.0,
        (ln(1 + b.views_count) * 0.4
         + ln(1 + b.messages_count) * 0.4
         + ln(1 + b.favorites_count) * 0.2) / 5.0
      )::numeric AS s_eng,
      CASE WHEN b.is_promoted THEN 1.0 ELSE 0.0 END::numeric AS s_promo
    FROM base b
  )
  SELECT
    s.id, s.seller_id, s.title, s.description, s.price, s.category, s.condition,
    s.image_urls, s.status, s.vertical, s.created_at, s.currency, s.country, s.city,
    s.contact_method, s.listing_type, s.is_boosted, s.boost_expires_at, s.expires_at,
    s.auto_renew, s.views_count, s.messages_count, s.favorites_count, s.quality_score,
    (s.s_text * 0.40
     + s.s_quality * 0.20
     + s.s_fresh * 0.15
     + s.s_eng * 0.15
     + s.s_promo * 0.05)::numeric AS final_score
  FROM scored s
  ORDER BY final_score DESC, s.created_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rank_products(text, uuid, text, text, numeric, numeric, text, int, int) TO anon, authenticated;
