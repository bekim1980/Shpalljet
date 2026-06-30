-- Enable extensions for scheduled invocation
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Saved searches
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  query text NOT NULL DEFAULT '',
  category_id uuid,
  vertical text,
  condition text,
  price_min numeric,
  price_max numeric,
  location text,
  sort_by text DEFAULT 'relevance',
  is_active boolean NOT NULL DEFAULT true,
  last_checked_at timestamptz NOT NULL DEFAULT now(),
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Dedup: same user + same filter signature = one row
CREATE UNIQUE INDEX IF NOT EXISTS saved_searches_user_signature_idx
  ON public.saved_searches (
    user_id,
    md5(coalesce(query,'') || '|' || coalesce(category_id::text,'') || '|' || coalesce(vertical,'') || '|' || coalesce(condition,'') || '|' || coalesce(price_min::text,'') || '|' || coalesce(price_max::text,'') || '|' || coalesce(location,''))
  );

CREATE INDEX IF NOT EXISTS saved_searches_active_idx ON public.saved_searches (is_active, last_checked_at);

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own saved searches" ON public.saved_searches
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own saved searches" ON public.saved_searches
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own saved searches" ON public.saved_searches
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own saved searches" ON public.saved_searches
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all saved searches" ON public.saved_searches
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER saved_searches_updated_at
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Search alerts (which products already alerted per saved search)
CREATE TABLE IF NOT EXISTS public.search_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_search_id uuid NOT NULL REFERENCES public.saved_searches(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  final_score numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS search_alerts_unique_idx
  ON public.search_alerts (saved_search_id, product_id);

CREATE INDEX IF NOT EXISTS search_alerts_search_created_idx
  ON public.search_alerts (saved_search_id, created_at DESC);

ALTER TABLE public.search_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own search alerts" ON public.search_alerts
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.saved_searches s WHERE s.id = search_alerts.saved_search_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Service role insert search alerts" ON public.search_alerts
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Admins view all search alerts" ON public.search_alerts
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));