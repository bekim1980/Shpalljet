-- Harden entitlement payment pipeline: mandatory payment verification, idempotency ledger,
-- scoped counter bumps (no client-set_config bypass), admin-only manual grants with audit.

-- ============ Payment status extensions ============

ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'disputed';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'cancelled';

-- ============ Server-controlled entitlement catalog ============

CREATE TABLE IF NOT EXISTS public.entitlement_catalog (
  entitlement_type text PRIMARY KEY,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'eur' CHECK (char_length(currency) = 3),
  duration_days integer CHECK (duration_days IS NULL OR duration_days > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.entitlement_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read entitlement catalog" ON public.entitlement_catalog;
CREATE POLICY "Anyone can read entitlement catalog"
  ON public.entitlement_catalog FOR SELECT
  TO authenticated, anon
  USING (active = true);

INSERT INTO public.entitlement_catalog (entitlement_type, amount_cents, currency, duration_days)
VALUES
  ('premium', 999, 'eur', 30),
  ('premium_renew', 999, 'eur', 30),
  ('boost_1', 200, 'eur', 1),
  ('boost_3', 500, 'eur', 3),
  ('boost_7', 1000, 'eur', 7),
  ('auto_renew_on', 999, 'eur', NULL)
ON CONFLICT (entitlement_type) DO NOTHING;

-- ============ Listing entitlement payments (separate from marketplace orders) ============

CREATE TABLE IF NOT EXISTS public.listing_entitlement_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  entitlement_type text NOT NULL REFERENCES public.entitlement_catalog(entitlement_type),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'eur',
  status public.payment_status NOT NULL DEFAULT 'pending',
  provider text NOT NULL DEFAULT 'stripe',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  checkout_expires_at timestamptz,
  refunded_at timestamptz,
  disputed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_entitlement_payments_currency_lower CHECK (currency = lower(currency))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_listing_entitlement_payments_checkout_session
  ON public.listing_entitlement_payments (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_listing_entitlement_payments_payment_intent
  ON public.listing_entitlement_payments (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listing_entitlement_payments_product
  ON public.listing_entitlement_payments (product_id);

CREATE INDEX IF NOT EXISTS idx_listing_entitlement_payments_user
  ON public.listing_entitlement_payments (user_id);

ALTER TABLE public.listing_entitlement_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own listing entitlement payments" ON public.listing_entitlement_payments;
CREATE POLICY "Users can view own listing entitlement payments"
  ON public.listing_entitlement_payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all listing entitlement payments" ON public.listing_entitlement_payments;
CREATE POLICY "Admins can view all listing entitlement payments"
  ON public.listing_entitlement_payments FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- No INSERT/UPDATE for authenticated — records created only by service_role webhook/checkout API.

-- ============ Idempotent entitlement grant ledger ============

CREATE TABLE IF NOT EXISTS public.listing_entitlement_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL UNIQUE REFERENCES public.listing_entitlement_payments(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entitlement_type text NOT NULL,
  provider text NOT NULL DEFAULT 'stripe',
  webhook_event_id text NOT NULL,
  provider_payment_intent_id text,
  granted_duration_days integer,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoke_reason text
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_listing_entitlement_grants_webhook_event
  ON public.listing_entitlement_grants (webhook_event_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_listing_entitlement_grants_provider_intent
  ON public.listing_entitlement_grants (provider, provider_payment_intent_id)
  WHERE provider_payment_intent_id IS NOT NULL AND revoked_at IS NULL;

ALTER TABLE public.listing_entitlement_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own entitlement grants" ON public.listing_entitlement_grants;
CREATE POLICY "Users can view own entitlement grants"
  ON public.listing_entitlement_grants FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all entitlement grants" ON public.listing_entitlement_grants;
CREATE POLICY "Admins can view all entitlement grants"
  ON public.listing_entitlement_grants FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ Session helpers (no admin bypass on payment grants) ============

CREATE OR REPLACE FUNCTION public.is_service_role_session()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(current_setting('request.jwt.claims', true)::json->>'role', '') = 'service_role';
$$;

COMMENT ON FUNCTION public.is_service_role_session IS
  'True only when the current JWT role is service_role (webhooks, trusted server jobs).';

CREATE OR REPLACE FUNCTION public.is_entitlement_privileged()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.is_service_role_session();
$$;

COMMENT ON FUNCTION public.is_entitlement_privileged IS
  'Privileged entitlement writes: service_role only. Admins use admin_grant_listing_entitlement.';

CREATE OR REPLACE FUNCTION public.is_admin_entitlement_grant_active()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT current_setting('shpalljet.admin_entitlement_grant', true) = 'active'
    AND auth.uid() IS NOT NULL
    AND public.has_role(auth.uid(), 'admin'::app_role);
$$;

-- ============ Counter increment detection (nested trigger path only) ============

CREATE OR REPLACE FUNCTION public.products_is_single_counter_increment(
  old_row public.products,
  new_row public.products
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT
    old_row.listing_type IS NOT DISTINCT FROM new_row.listing_type
    AND old_row.is_boosted IS NOT DISTINCT FROM new_row.is_boosted
    AND old_row.boost_expires_at IS NOT DISTINCT FROM new_row.boost_expires_at
    AND old_row.auto_renew IS NOT DISTINCT FROM new_row.auto_renew
    AND old_row.expires_at IS NOT DISTINCT FROM new_row.expires_at
    AND old_row.quality_score IS NOT DISTINCT FROM new_row.quality_score
    AND old_row.image_urls IS NOT DISTINCT FROM new_row.image_urls
    AND old_row.status IS NOT DISTINCT FROM new_row.status
    AND (
      (new_row.views_count = old_row.views_count + 1
        AND new_row.messages_count IS NOT DISTINCT FROM old_row.messages_count
        AND new_row.favorites_count IS NOT DISTINCT FROM old_row.favorites_count)
      OR
      (new_row.messages_count = old_row.messages_count + 1
        AND new_row.views_count IS NOT DISTINCT FROM old_row.views_count
        AND new_row.favorites_count IS NOT DISTINCT FROM old_row.favorites_count)
      OR
      (new_row.favorites_count = old_row.favorites_count + 1
        AND new_row.views_count IS NOT DISTINCT FROM old_row.views_count
        AND new_row.messages_count IS NOT DISTINCT FROM old_row.messages_count)
      OR
      (new_row.favorites_count = old_row.favorites_count - 1
        AND new_row.favorites_count >= 0
        AND new_row.views_count IS NOT DISTINCT FROM old_row.views_count
        AND new_row.messages_count IS NOT DISTINCT FROM old_row.messages_count)
    );
$$;

-- ============ Verified premium helper ============

CREATE OR REPLACE FUNCTION public.product_has_verified_premium(p_product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listing_entitlement_grants g
    INNER JOIN public.listing_entitlement_payments pay ON pay.id = g.payment_id
    WHERE g.product_id = p_product_id
      AND g.revoked_at IS NULL
      AND pay.status = 'succeeded'::public.payment_status
      AND pay.entitlement_type IN ('premium', 'premium_renew')
  )
  OR EXISTS (
    SELECT 1
    FROM public.audit_logs al
    WHERE al.action = 'admin_grant_entitlement'
      AND al.target_type = 'product'
      AND al.target_id = p_product_id::text
      AND al.metadata->>'entitlement_type' IN ('premium', 'premium_renew')
  );
$$;

REVOKE ALL ON FUNCTION public.product_has_verified_premium(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.product_has_verified_premium(uuid) TO authenticated, anon, service_role;

-- ============ Products entitlement guard (hardened) ============

CREATE OR REPLACE FUNCTION public.products_guard_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- service_role: webhook / cron may apply paid entitlements.
  IF public.is_service_role_session() THEN
    RETURN NEW;
  END IF;

  -- Audited admin manual grant (scoped flag set only inside admin_grant_listing_entitlement).
  IF public.is_admin_entitlement_grant_active() THEN
    RETURN NEW;
  END IF;

  -- Internal engagement counters: only via nested trigger (+1/-1), never direct API depth=1.
  IF TG_OP = 'UPDATE'
     AND pg_trigger_depth() > 1
     AND public.products_is_single_counter_increment(OLD, NEW) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.listing_type := 'free';
    NEW.is_boosted := false;
    NEW.boost_expires_at := NULL;
    NEW.auto_renew := false;
    NEW.expires_at := now() + interval '7 days';
    NEW.views_count := COALESCE(NEW.views_count, 0);
    NEW.messages_count := COALESCE(NEW.messages_count, 0);
    NEW.favorites_count := COALESCE(NEW.favorites_count, 0);
    RETURN NEW;
  END IF;

  -- UPDATE from authenticated users: block all entitlement / counter tampering.
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

  IF NEW.quality_score IS DISTINCT FROM OLD.quality_score THEN
    RAISE EXCEPTION 'quality_score is system-managed only'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    IF OLD.listing_type IS DISTINCT FROM 'free' OR NEW.listing_type IS DISTINCT FROM 'free' THEN
      RAISE EXCEPTION 'expires_at for paid listings requires verified payment'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.expires_at IS NULL OR NEW.expires_at <= now() THEN
      RAISE EXCEPTION 'expires_at must be in the future'
        USING ERRCODE = '22000';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ============ Premium photo limit (server-enforced) ============

CREATE OR REPLACE FUNCTION public.products_guard_image_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_max integer := 5;
  v_len integer;
  v_has_premium boolean;
BEGIN
  IF public.is_service_role_session() OR public.is_admin_entitlement_grant_active() THEN
    RETURN NEW;
  END IF;

  v_len := COALESCE(array_length(NEW.image_urls, 1), 0);

  IF TG_OP = 'UPDATE' THEN
    v_has_premium := (
      NEW.listing_type = 'paid'
      AND NEW.expires_at IS NOT NULL
      AND NEW.expires_at > now()
      AND public.product_has_verified_premium(NEW.id)
    );
    IF v_has_premium THEN
      v_max := 10;
    END IF;
  END IF;

  IF v_len > v_max THEN
    RAISE EXCEPTION 'image_urls exceeds allowed limit (%) for listing tier', v_max
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_guard_image_limit ON public.products;
CREATE TRIGGER trg_products_guard_image_limit
  BEFORE INSERT OR UPDATE OF image_urls ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.products_guard_image_limit();

-- ============ Engagement bump triggers (no session bypass flag) ============

CREATE OR REPLACE FUNCTION public.bump_product_views_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET views_count = views_count + 1
  WHERE id = NEW.product_id;
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
  UPDATE public.products
  SET messages_count = messages_count + 1
  WHERE id = NEW.product_id;
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
  IF TG_OP = 'INSERT' THEN
    UPDATE public.products
    SET favorites_count = favorites_count + 1
    WHERE id = NEW.product_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.products
    SET favorites_count = GREATEST(favorites_count - 1, 0)
    WHERE id = OLD.product_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_product_views_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bump_product_messages_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bump_product_favorites_count() FROM PUBLIC;

-- ============ Mandatory payment verification grant (service_role only) ============

CREATE OR REPLACE FUNCTION public.grant_listing_entitlement(
  p_payment_id uuid,
  p_webhook_event_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.listing_entitlement_payments%ROWTYPE;
  v_product public.products%ROWTYPE;
  v_catalog public.entitlement_catalog%ROWTYPE;
  v_existing public.listing_entitlement_grants%ROWTYPE;
  v_days integer;
  v_stack_base timestamptz;
  v_grant_id uuid;
BEGIN
  IF NOT public.is_service_role_session() THEN
    RAISE EXCEPTION 'grant_listing_entitlement requires service_role'
      USING ERRCODE = '42501';
  END IF;

  IF p_payment_id IS NULL OR p_webhook_event_id IS NULL OR btrim(p_webhook_event_id) = '' THEN
    RAISE EXCEPTION 'payment_id and webhook_event_id are required'
      USING ERRCODE = '22000';
  END IF;

  -- Idempotency: duplicate webhook delivery returns success without re-granting.
  SELECT * INTO v_existing
  FROM public.listing_entitlement_grants
  WHERE webhook_event_id = p_webhook_event_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'already_granted',
      'grant_id', v_existing.id,
      'payment_id', v_existing.payment_id
    );
  END IF;

  SELECT * INTO v_payment
  FROM public.listing_entitlement_payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment.status IS DISTINCT FROM 'succeeded'::public.payment_status THEN
    RAISE EXCEPTION 'payment status must be succeeded'
      USING ERRCODE = '42501';
  END IF;

  IF v_payment.refunded_at IS NOT NULL
     OR v_payment.disputed_at IS NOT NULL
     OR v_payment.cancelled_at IS NOT NULL THEN
    RAISE EXCEPTION 'payment is refunded, disputed, or cancelled'
      USING ERRCODE = '42501';
  END IF;

  IF v_payment.checkout_expires_at IS NOT NULL
     AND v_payment.checkout_expires_at < now()
     AND v_payment.stripe_payment_intent_id IS NULL THEN
    RAISE EXCEPTION 'checkout session expired before payment'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.listing_entitlement_grants g
    WHERE g.payment_id = p_payment_id AND g.revoked_at IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'status', 'already_granted',
      'payment_id', p_payment_id
    );
  END IF;

  SELECT * INTO v_product
  FROM public.products
  WHERE id = v_payment.product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing not found for payment' USING ERRCODE = 'P0002';
  END IF;

  IF v_product.seller_id IS DISTINCT FROM v_payment.user_id THEN
    RAISE EXCEPTION 'payment user does not own listing'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_catalog
  FROM public.entitlement_catalog
  WHERE entitlement_type = v_payment.entitlement_type
    AND active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown or inactive entitlement type on payment'
      USING ERRCODE = '22000';
  END IF;

  IF v_payment.amount_cents IS DISTINCT FROM v_catalog.amount_cents
     OR lower(v_payment.currency) IS DISTINCT FROM lower(v_catalog.currency) THEN
    RAISE EXCEPTION 'payment amount/currency does not match server catalog'
      USING ERRCODE = '42501';
  END IF;

  v_days := v_catalog.duration_days;

  IF v_payment.entitlement_type IN ('premium', 'premium_renew') THEN
    v_days := COALESCE(v_days, 30);
    UPDATE public.products
    SET listing_type = 'paid',
        expires_at = CASE
          WHEN v_payment.entitlement_type = 'premium_renew' THEN
            GREATEST(COALESCE(expires_at, now()), now()) + (v_days || ' days')::interval
          ELSE
            now() + (v_days || ' days')::interval
        END,
        status = CASE WHEN status = 'expired' THEN 'active' ELSE status END
    WHERE id = v_payment.product_id;

  ELSIF v_payment.entitlement_type LIKE 'boost_%' THEN
    v_days := COALESCE(v_days, 3);
    SELECT GREATEST(COALESCE(boost_expires_at, now()), now())
    INTO v_stack_base
    FROM public.products WHERE id = v_payment.product_id;

    UPDATE public.products
    SET is_boosted = true,
        boost_expires_at = v_stack_base + (v_days || ' days')::interval
    WHERE id = v_payment.product_id;

  ELSIF v_payment.entitlement_type = 'auto_renew_on' THEN
    UPDATE public.products SET auto_renew = true WHERE id = v_payment.product_id;

  ELSE
    RAISE EXCEPTION 'unsupported entitlement type: %', v_payment.entitlement_type
      USING ERRCODE = '22000';
  END IF;

  INSERT INTO public.listing_entitlement_grants (
    payment_id, product_id, user_id, entitlement_type,
    provider, webhook_event_id, provider_payment_intent_id, granted_duration_days
  ) VALUES (
    v_payment.id, v_payment.product_id, v_payment.user_id, v_payment.entitlement_type,
    v_payment.provider, p_webhook_event_id, v_payment.stripe_payment_intent_id, v_days
  )
  RETURNING id INTO v_grant_id;

  RETURN jsonb_build_object(
    'status', 'granted',
    'grant_id', v_grant_id,
    'payment_id', v_payment.id,
    'entitlement_type', v_payment.entitlement_type
  );
END;
$$;

COMMENT ON FUNCTION public.grant_listing_entitlement(uuid, text) IS
  'Grants entitlements from a verified listing_entitlement_payments row. service_role + idempotent.';

REVOKE ALL ON FUNCTION public.grant_listing_entitlement(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_listing_entitlement(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.grant_listing_entitlement(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.grant_listing_entitlement(uuid, text) TO service_role;

-- Drop legacy overload that accepted client-controlled entitlement parameters.
DROP FUNCTION IF EXISTS public.grant_listing_entitlement(uuid, text, integer, uuid);

-- ============ Revoke entitlement on refund/dispute ============

CREATE OR REPLACE FUNCTION public.revoke_listing_entitlement_from_payment(
  p_payment_id uuid,
  p_webhook_event_id text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.listing_entitlement_payments%ROWTYPE;
  v_grant public.listing_entitlement_grants%ROWTYPE;
BEGIN
  IF NOT public.is_service_role_session() THEN
    RAISE EXCEPTION 'revoke_listing_entitlement_from_payment requires service_role'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_payment
  FROM public.listing_entitlement_payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_grant
  FROM public.listing_entitlement_grants
  WHERE payment_id = p_payment_id AND revoked_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'no_active_grant', 'payment_id', p_payment_id);
  END IF;

  IF v_payment.entitlement_type IN ('premium', 'premium_renew') THEN
    UPDATE public.products
    SET listing_type = 'free',
        auto_renew = false
    WHERE id = v_payment.product_id;
  ELSIF v_payment.entitlement_type LIKE 'boost_%' THEN
    UPDATE public.products
    SET is_boosted = false,
        boost_expires_at = NULL
    WHERE id = v_payment.product_id;
  ELSIF v_payment.entitlement_type = 'auto_renew_on' THEN
    UPDATE public.products SET auto_renew = false WHERE id = v_payment.product_id;
  END IF;

  UPDATE public.listing_entitlement_grants
  SET revoked_at = now(),
      revoke_reason = COALESCE(p_reason, 'payment_reversed')
  WHERE id = v_grant.id;

  RETURN jsonb_build_object(
    'status', 'revoked',
    'grant_id', v_grant.id,
    'payment_id', p_payment_id,
    'webhook_event_id', p_webhook_event_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_listing_entitlement_from_payment(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_listing_entitlement_from_payment(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.revoke_listing_entitlement_from_payment(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_listing_entitlement_from_payment(uuid, text, text) TO service_role;

-- ============ Audited admin manual grant (separate from payment webhook path) ============

CREATE OR REPLACE FUNCTION public.admin_grant_listing_entitlement(
  p_product_id uuid,
  p_entitlement_type text,
  p_reason text,
  p_duration_days integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_product public.products%ROWTYPE;
  v_catalog public.entitlement_catalog%ROWTYPE;
  v_days integer;
  v_stack_base timestamptz;
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin role required' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'reason is required for admin entitlement grants'
      USING ERRCODE = '22000';
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'product not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_catalog
  FROM public.entitlement_catalog
  WHERE entitlement_type = p_entitlement_type AND active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid entitlement type' USING ERRCODE = '22000';
  END IF;

  v_days := COALESCE(p_duration_days, v_catalog.duration_days);

  PERFORM set_config('shpalljet.admin_entitlement_grant', 'active', true);

  IF p_entitlement_type IN ('premium', 'premium_renew') THEN
    v_days := COALESCE(v_days, 30);
    UPDATE public.products
    SET listing_type = 'paid',
        expires_at = now() + (v_days || ' days')::interval,
        status = CASE WHEN status = 'expired' THEN 'active' ELSE status END
    WHERE id = p_product_id;
  ELSIF p_entitlement_type LIKE 'boost_%' THEN
    v_days := COALESCE(v_days, 3);
    SELECT GREATEST(COALESCE(boost_expires_at, now()), now())
    INTO v_stack_base FROM public.products WHERE id = p_product_id;
    UPDATE public.products
    SET is_boosted = true,
        boost_expires_at = v_stack_base + (v_days || ' days')::interval
    WHERE id = p_product_id;
  ELSIF p_entitlement_type = 'auto_renew_on' THEN
    UPDATE public.products SET auto_renew = true WHERE id = p_product_id;
  ELSE
    RAISE EXCEPTION 'unsupported admin entitlement type' USING ERRCODE = '22000';
  END IF;

  PERFORM set_config('shpalljet.admin_entitlement_grant', '', true);

  INSERT INTO public.audit_logs (admin_id, action, target_type, target_id, metadata)
  VALUES (
    v_actor,
    'admin_grant_entitlement',
    'product',
    p_product_id::text,
    jsonb_build_object(
      'entitlement_type', p_entitlement_type,
      'duration_days', v_days,
      'reason', p_reason,
      'seller_id', v_product.seller_id
    )
  );

  RETURN jsonb_build_object(
    'status', 'admin_granted',
    'product_id', p_product_id,
    'entitlement_type', p_entitlement_type,
    'duration_days', v_days
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_listing_entitlement(uuid, text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_grant_listing_entitlement(uuid, text, text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_listing_entitlement(uuid, text, text, integer) TO authenticated;

-- ============ Premium ranking weight in rank_products ============

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
    ts_query := plainto_tsquery('simple', unaccent(lower(trim(search_query))));
    has_query := ts_query IS NOT NULL AND ts_query::text <> '';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      p.*,
      (p.is_boosted AND p.boost_expires_at IS NOT NULL AND p.boost_expires_at > now()) AS is_promoted,
      (
        p.listing_type = 'paid'
        AND p.expires_at IS NOT NULL
        AND p.expires_at > now()
        AND public.product_has_verified_premium(p.id)
      ) AS is_premium_active
    FROM public.products p
    WHERE p.status = 'active'
      AND (p.expires_at IS NULL OR p.expires_at > now())
      AND (filter_vertical IS NULL OR p.vertical = filter_vertical)
      AND (filter_condition IS NULL OR p.condition = filter_condition)
      AND (filter_price_min IS NULL OR p.price >= filter_price_min)
      AND (filter_price_max IS NULL OR p.price <= filter_price_max)
      AND (filter_location IS NULL OR p.city ILIKE '%' || filter_location || '%' OR p.location ILIKE '%' || filter_location || '%')
      AND (filter_category_id IS NULL OR p.category_id = filter_category_id)
  ),
  scored AS (
    SELECT
      b.*,
      CASE WHEN has_query THEN ts_rank_cd(to_tsvector('simple', unaccent(lower(b.title || ' ' || b.description))), ts_query) ELSE 0 END AS s_text,
      (b.quality_score::numeric / 100.0) AS s_quality,
      GREATEST(0, 1.0 - EXTRACT(EPOCH FROM (now() - b.created_at)) / (30 * 86400)) AS s_fresh,
      LEAST(1.0, (b.views_count * 0.01 + b.messages_count * 0.1 + b.favorites_count * 0.05)) AS s_eng,
      CASE WHEN b.is_promoted THEN 0.20 ELSE 0 END AS s_promo,
      CASE WHEN b.is_premium_active THEN 0.08 ELSE 0 END AS s_premium
    FROM base b
    WHERE NOT has_query OR to_tsvector('simple', unaccent(lower(b.title || ' ' || b.description))) @@ ts_query
  )
  SELECT
    s.id, s.seller_id, s.title, s.description, s.price, s.category, s.condition,
    s.image_urls, s.status, s.vertical, s.created_at, s.currency, s.country, s.city,
    s.contact_method, s.listing_type, s.is_boosted, s.boost_expires_at, s.expires_at,
    s.auto_renew, s.views_count, s.messages_count, s.favorites_count, s.quality_score,
    (s.s_text * 0.28 + s.s_quality * 0.16 + s.s_fresh * 0.13 + s.s_eng * 0.13 + s.s_promo + s.s_premium)::numeric AS final_score
  FROM scored s
  ORDER BY final_score DESC, s.created_at DESC
  LIMIT result_limit OFFSET result_offset;
END;
$function$;

REVOKE ALL ON FUNCTION public.rank_products(text, uuid, text, text, numeric, numeric, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rank_products(text, uuid, text, text, numeric, numeric, text, integer, integer) TO anon, authenticated, service_role;

-- ============ Profiles guard: admins may ban; users may not self-unban ============

CREATE OR REPLACE FUNCTION public.profiles_guard_moderation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
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
