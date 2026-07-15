-- One-time cleanup: reset unverified paid/boost entitlements.
-- Run AFTER 20260715130000_entitlement_payment_hardening.sql.
-- Preserves listings with active listing_entitlement_grants tied to succeeded payments.

-- ============ Audit view (pre-cleanup report) ============

CREATE OR REPLACE VIEW public.unverified_entitlement_audit AS
SELECT
  p.id AS listing_id,
  p.seller_id AS owner_id,
  p.listing_type,
  p.is_boosted,
  p.boost_expires_at,
  p.auto_renew,
  p.expires_at,
  p.views_count,
  p.messages_count,
  p.favorites_count,
  p.created_at AS listing_created_at,
  EXISTS (
    SELECT 1
    FROM public.listing_entitlement_grants g
    INNER JOIN public.listing_entitlement_payments pay ON pay.id = g.payment_id
    WHERE g.product_id = p.id
      AND g.revoked_at IS NULL
      AND pay.status = 'succeeded'::public.payment_status
  ) AS has_verified_payment,
  CASE
    WHEN p.listing_type = 'paid'
      AND NOT EXISTS (
        SELECT 1
        FROM public.listing_entitlement_grants g
        INNER JOIN public.listing_entitlement_payments pay ON pay.id = g.payment_id
        WHERE g.product_id = p.id
          AND g.revoked_at IS NULL
          AND pay.status = 'succeeded'::public.payment_status
          AND pay.entitlement_type IN ('premium', 'premium_renew')
      ) THEN 'reset_premium'
    WHEN p.is_boosted = true
      AND (p.boost_expires_at IS NULL OR p.boost_expires_at > now())
      AND NOT EXISTS (
        SELECT 1
        FROM public.listing_entitlement_grants g
        INNER JOIN public.listing_entitlement_payments pay ON pay.id = g.payment_id
        WHERE g.product_id = p.id
          AND g.revoked_at IS NULL
          AND pay.status = 'succeeded'::public.payment_status
          AND pay.entitlement_type LIKE 'boost_%'
      ) THEN 'reset_boost'
    WHEN p.auto_renew = true
      AND p.listing_type = 'paid'
      AND NOT EXISTS (
        SELECT 1
        FROM public.listing_entitlement_grants g
        INNER JOIN public.listing_entitlement_payments pay ON pay.id = g.payment_id
        WHERE g.product_id = p.id
          AND g.revoked_at IS NULL
          AND pay.status = 'succeeded'::public.payment_status
          AND pay.entitlement_type = 'auto_renew_on'
      ) THEN 'reset_auto_renew'
    WHEN p.views_count > 5000 OR p.messages_count > 500 OR p.favorites_count > 500 THEN 'flag_suspicious_counters'
    ELSE 'no_action'
  END AS cleanup_action
FROM public.products p
WHERE
  (p.listing_type = 'paid')
  OR (p.is_boosted = true AND (p.boost_expires_at IS NULL OR p.boost_expires_at > now()))
  OR (p.auto_renew = true AND p.listing_type = 'paid')
  OR p.views_count > 5000
  OR p.messages_count > 500
  OR p.favorites_count > 500;

COMMENT ON VIEW public.unverified_entitlement_audit IS
  'Pre-cleanup report: listing entitlements without verified succeeded payments.';

-- ============ Cleanup (service_role / migration only) ============

DO $$
DECLARE
  v_premium_reset integer := 0;
  v_boost_reset integer := 0;
  v_auto_renew_reset integer := 0;
BEGIN
  -- Reset unverified premium listings to free tier.
  UPDATE public.products p
  SET
    listing_type = 'free',
    expires_at = CASE
      WHEN p.expires_at IS NULL OR p.expires_at <= now() THEN now() + interval '7 days'
      ELSE p.expires_at
    END
  WHERE p.listing_type = 'paid'
    AND NOT EXISTS (
      SELECT 1
      FROM public.listing_entitlement_grants g
      INNER JOIN public.listing_entitlement_payments pay ON pay.id = g.payment_id
      WHERE g.product_id = p.id
        AND g.revoked_at IS NULL
        AND pay.status = 'succeeded'::public.payment_status
        AND pay.entitlement_type IN ('premium', 'premium_renew')
    );
  GET DIAGNOSTICS v_premium_reset = ROW_COUNT;

  -- Reset unverified active boosts.
  UPDATE public.products p
  SET is_boosted = false, boost_expires_at = NULL
  WHERE p.is_boosted = true
    AND (p.boost_expires_at IS NULL OR p.boost_expires_at > now())
    AND NOT EXISTS (
      SELECT 1
      FROM public.listing_entitlement_grants g
      INNER JOIN public.listing_entitlement_payments pay ON pay.id = g.payment_id
      WHERE g.product_id = p.id
        AND g.revoked_at IS NULL
        AND pay.status = 'succeeded'::public.payment_status
        AND pay.entitlement_type LIKE 'boost_%'
    );
  GET DIAGNOSTICS v_boost_reset = ROW_COUNT;

  -- Disable paid auto_renew without verified payment.
  UPDATE public.products p
  SET auto_renew = false
  WHERE p.auto_renew = true
    AND p.listing_type = 'paid'
    AND NOT EXISTS (
      SELECT 1
      FROM public.listing_entitlement_grants g
      INNER JOIN public.listing_entitlement_payments pay ON pay.id = g.payment_id
      WHERE g.product_id = p.id
        AND g.revoked_at IS NULL
        AND pay.status = 'succeeded'::public.payment_status
        AND pay.entitlement_type = 'auto_renew_on'
    );
  GET DIAGNOSTICS v_auto_renew_reset = ROW_COUNT;

  RAISE NOTICE 'entitlement_cleanup: premium_reset=%, boost_reset=%, auto_renew_reset=%',
    v_premium_reset, v_boost_reset, v_auto_renew_reset;
END;
$$;

-- Suspicious counters: cap without deleting organic history (conservative reset threshold).
UPDATE public.products
SET
  views_count = LEAST(views_count, 5000),
  messages_count = LEAST(messages_count, 500),
  favorites_count = LEAST(favorites_count, 500)
WHERE views_count > 5000 OR messages_count > 500 OR favorites_count > 500;
