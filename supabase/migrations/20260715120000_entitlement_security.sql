-- Security fix: block client-side entitlement grants (Premium, Boost, counters, auto_renew).
-- Only service_role (webhooks/cron) and admins may modify paid fields directly.
-- Authenticated sellers retain free-tier renewals (expires_at) on free listings only.

-- ============ Helpers ============

CREATE OR REPLACE FUNCTION public.is_entitlement_privileged()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    COALESCE(current_setting('request.jwt.claims', true)::json->>'role', '') = 'service_role'
    OR current_setting('shpalljet.bypass_entitlement_guard', true) = 'true'
    OR (
      auth.uid() IS NOT NULL
      AND public.has_role(auth.uid(), 'admin'::app_role)
    );
$$;

COMMENT ON FUNCTION public.is_entitlement_privileged IS
  'True for service_role JWT, internal system updates, or admin users.';

-- ============ Products: entitlement guard ============

CREATE OR REPLACE FUNCTION public.products_guard_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.is_entitlement_privileged() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Security fix: never trust client on create — free tier only, server-set expiry.
    NEW.listing_type := 'free';
    NEW.is_boosted := false;
    NEW.boost_expires_at := NULL;
    NEW.auto_renew := false;
    NEW.expires_at := now() + interval '7 days';
    RETURN NEW;
  END IF;

  -- UPDATE: block any paid/boost/counter/auto_renew tampering from authenticated sellers.
  IF NEW.listing_type IS DISTINCT FROM OLD.listing_type THEN
    RAISE EXCEPTION 'listing_type cannot be changed without verified payment'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.is_boosted IS DISTINCT FROM OLD.is_boosted
     OR NEW.boost_expires_at IS DISTINCT FROM OLD.boost_expires_at THEN
    RAISE EXCEPTION 'boost status cannot be changed without verified payment'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.auto_renew IS DISTINCT FROM OLD.auto_renew THEN
    RAISE EXCEPTION 'auto_renew cannot be changed without verified payment'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.views_count IS DISTINCT FROM OLD.views_count
     OR NEW.messages_count IS DISTINCT FROM OLD.messages_count
     OR NEW.favorites_count IS DISTINCT FROM OLD.favorites_count THEN
    RAISE EXCEPTION 'engagement counters are system-managed only'
      USING ERRCODE = '42501';
  END IF;

  -- Free renewals: allow expires_at extension only while listing stays free.
  IF NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    IF OLD.listing_type <> 'free' OR NEW.listing_type <> 'free' THEN
      RAISE EXCEPTION 'expires_at for paid listings requires verified payment'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.expires_at <= now() THEN
      RAISE EXCEPTION 'expires_at must be in the future'
        USING ERRCODE = '22000';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.products_guard_entitlements IS
  'Prevents authenticated users from self-granting Premium, Boost, counters, or paid renewals.';

DROP TRIGGER IF EXISTS trg_products_guard_entitlements ON public.products;
CREATE TRIGGER trg_products_guard_entitlements
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.products_guard_entitlements();

-- ============ Profiles: moderation field guard ============

CREATE OR REPLACE FUNCTION public.profiles_guard_moderation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- service_role and admins may update moderation fields; ordinary users may not self-unban.
  IF public.is_service_role_session()
     OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = NEW.user_id THEN
    NEW.banned_at := OLD.banned_at;
    NEW.suspended_until := OLD.suspended_until;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.profiles_guard_moderation IS
  'Prevents users from clearing banned_at or suspended_until on their own profile.';

DROP TRIGGER IF EXISTS trg_profiles_guard_moderation ON public.profiles;
CREATE TRIGGER trg_profiles_guard_moderation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_guard_moderation();

-- ============ Product views: anti-abuse ============

CREATE OR REPLACE FUNCTION public.product_views_guard_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Security fix: block sellers from inflating views on their own listings.
  IF NEW.viewer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = NEW.product_id AND p.seller_id = NEW.viewer_id
  ) THEN
    RETURN NULL;
  END IF;

  -- Security fix: dedupe logged-in viewers (24h window) to limit ranking inflation.
  IF NEW.viewer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.product_views pv
    WHERE pv.product_id = NEW.product_id
      AND pv.viewer_id = NEW.viewer_id
      AND pv.created_at > now() - interval '24 hours'
  ) THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_views_guard_insert ON public.product_views;
CREATE TRIGGER trg_product_views_guard_insert
  BEFORE INSERT ON public.product_views
  FOR EACH ROW
  EXECUTE FUNCTION public.product_views_guard_insert();

DROP POLICY IF EXISTS "Anyone can insert product views" ON public.product_views;
CREATE POLICY "Anyone can insert product views" ON public.product_views
  FOR INSERT TO public
  WITH CHECK (
    -- RLS layer: reject seller self-views before trigger (defense in depth).
    viewer_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND p.seller_id = viewer_id
    )
  );

-- ============ Engagement bump triggers: bypass entitlement guard ============

CREATE OR REPLACE FUNCTION public.bump_product_views_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('shpalljet.bypass_entitlement_guard', 'true', true);
  UPDATE public.products SET views_count = views_count + 1 WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.bump_product_messages_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('shpalljet.bypass_entitlement_guard', 'true', true);
  UPDATE public.products SET messages_count = messages_count + 1 WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.bump_product_favorites_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('shpalljet.bypass_entitlement_guard', 'true', true);
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

-- ============ Post-payment entitlement RPC (service_role / webhook only) ============

CREATE OR REPLACE FUNCTION public.grant_listing_entitlement(
  p_product_id uuid,
  p_entitlement text,
  p_duration_days integer DEFAULT NULL,
  p_payment_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_days integer;
  v_stack_base timestamptz;
BEGIN
  IF NOT public.is_entitlement_privileged() THEN
    RAISE EXCEPTION 'grant_listing_entitlement requires service_role or admin'
      USING ERRCODE = '42501';
  END IF;

  IF p_payment_id IS NOT NULL THEN
    SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;
    IF NOT FOUND OR v_payment.status <> 'succeeded'::public.payment_status THEN
      RAISE EXCEPTION 'payment not verified for entitlement grant'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN
    RAISE EXCEPTION 'product not found' USING ERRCODE = 'P0002';
  END IF;

  v_days := COALESCE(p_duration_days, 0);

  IF p_entitlement = 'premium' THEN
    v_days := COALESCE(NULLIF(v_days, 0), 30);
    UPDATE public.products
    SET listing_type = 'paid',
        expires_at = now() + (v_days || ' days')::interval,
        status = CASE WHEN status = 'expired' THEN 'active' ELSE status END
    WHERE id = p_product_id;

  ELSIF p_entitlement = 'premium_renew' THEN
    v_days := COALESCE(NULLIF(v_days, 0), 30);
    UPDATE public.products
    SET listing_type = 'paid',
        expires_at = GREATEST(COALESCE(expires_at, now()), now()) + (v_days || ' days')::interval,
        status = 'active'
    WHERE id = p_product_id;

  ELSIF p_entitlement = 'boost' THEN
    v_days := COALESCE(NULLIF(v_days, 0), 3);
    SELECT GREATEST(COALESCE(boost_expires_at, now()), now())
    INTO v_stack_base
    FROM public.products WHERE id = p_product_id;

    UPDATE public.products
    SET is_boosted = true,
        boost_expires_at = v_stack_base + (v_days || ' days')::interval
    WHERE id = p_product_id;

  ELSIF p_entitlement = 'auto_renew_on' THEN
    UPDATE public.products SET auto_renew = true WHERE id = p_product_id;

  ELSIF p_entitlement = 'auto_renew_off' THEN
    UPDATE public.products SET auto_renew = false WHERE id = p_product_id;

  ELSE
    RAISE EXCEPTION 'unknown entitlement: %', p_entitlement USING ERRCODE = '22000';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.grant_listing_entitlement IS
  'Grants Premium/Boost/auto_renew after verified payment. Callable only via service_role webhook.';

REVOKE ALL ON FUNCTION public.grant_listing_entitlement(uuid, text, integer, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_listing_entitlement(uuid, text, integer, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.grant_listing_entitlement(uuid, text, integer, uuid) FROM authenticated;
