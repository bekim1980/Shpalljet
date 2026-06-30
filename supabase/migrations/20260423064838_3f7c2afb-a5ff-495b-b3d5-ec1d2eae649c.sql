-- Bump boost weight in rank_products to ~20%, normalize remaining weights to sum to 1.0.
-- Active boost only when is_boosted AND boost_expires_at > now() (already enforced by base CTE).
-- Weight breakdown: text 0.32 / quality 0.18 / fresh 0.15 / engagement 0.15 / promo 0.20

CREATE OR REPLACE FUNCTION public.rank_products(
  search_query text DEFAULT ''::text,
  filter_category_id uuid DEFAULT NULL::uuid,
  filter_vertical text DEFAULT NULL::text,
  filter_condition text DEFAULT NULL::text,
  filter_price_min numeric DEFAULT NULL::numeric,
  filter_price_max numeric DEFAULT NULL::numeric,
  filter_location text DEFAULT NULL::text,
  result_limit integer DEFAULT 50,
  result_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, seller_id uuid, title text, description text, price numeric, category text, condition text,
  image_urls text[], status text, vertical text, created_at timestamp with time zone, currency text,
  country text, city text, contact_method text, listing_type text, is_boosted boolean,
  boost_expires_at timestamp with time zone, expires_at timestamp with time zone, auto_renew boolean,
  views_count integer, messages_count integer, favorites_count integer, quality_score integer,
  final_score numeric
)
LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
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
      LEAST(b.text_rel, 1)::numeric AS s_text,
      (b.quality_score::numeric / 100.0) AS s_quality,
      GREATEST(0, 1 - (b.age_days / 30.0))::numeric AS s_fresh,
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
    (s.s_text * 0.32
     + s.s_quality * 0.18
     + s.s_fresh * 0.15
     + s.s_eng * 0.15
     + s.s_promo * 0.20)::numeric AS final_score
  FROM scored s
  ORDER BY final_score DESC, s.created_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$function$;