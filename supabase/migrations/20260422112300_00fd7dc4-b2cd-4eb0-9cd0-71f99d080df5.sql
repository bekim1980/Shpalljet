UPDATE public.products p
SET favorites_count = COALESCE(w.cnt, 0)
FROM (
  SELECT product_id, COUNT(*)::int AS cnt
  FROM public.wishlist
  GROUP BY product_id
) w
WHERE w.product_id = p.id;

UPDATE public.products
SET favorites_count = 0
WHERE favorites_count IS NULL OR id NOT IN (SELECT product_id FROM public.wishlist);