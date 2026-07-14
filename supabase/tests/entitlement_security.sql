-- Entitlement security regression checks (run via: psql or supabase db execute)
-- These are documentation + manual CI SQL tests for deployment verification.

-- 1) grant_listing_entitlement must NOT be executable by authenticated/anon
SELECT
  p.proname,
  array_agg(DISTINCT rp.grantee::text ORDER BY rp.grantee::text) AS grantees
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
LEFT JOIN LATERAL aclexplode(p.proacl) AS acl ON true
LEFT JOIN pg_roles rp ON rp.oid = acl.grantee
WHERE n.nspname = 'public'
  AND p.proname IN (
    'grant_listing_entitlement',
    'revoke_listing_entitlement_from_payment',
    'admin_grant_listing_entitlement'
  )
GROUP BY p.proname;

-- Expected:
-- grant_listing_entitlement -> {service_role} only
-- revoke_listing_entitlement_from_payment -> {service_role} only
-- admin_grant_listing_entitlement -> {authenticated} only

-- 2) Pre-cleanup audit view exists
SELECT COUNT(*) AS flagged_rows FROM public.unverified_entitlement_audit
WHERE cleanup_action <> 'no_action';

-- 3) Catalog prices are server-defined
SELECT entitlement_type, amount_cents, currency, duration_days
FROM public.entitlement_catalog
ORDER BY entitlement_type;
