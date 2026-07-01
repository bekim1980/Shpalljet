# Project Source of Truth

Canonical reference for the Shpalljet production stack. When docs, local tooling, or env names disagree, **this file wins**.

---

## Production identity

| Item | Value |
|------|--------|
| **Vercel project name** | `cozy-connect-shop` |
| **Production domain** | https://www.shpalljet.net |
| **GitHub repository** | https://github.com/bekim1980/Shpalljet |
| **Supabase project ref** | `aybngrlutsfvapxtgqkg` |
| **Latest good deployment commit** | `f5d616d` (`fix(vercel): remove invalid filesystem rewrite`) |

---

## Required Vercel environment variables

Set in **Vercel → Project `cozy-connect-shop` → Settings → Environment Variables**.

Apply to **Production** (and Preview/Development as needed). **`VITE_*` variables are baked in at build time** — redeploy after changing them.

| Variable | Scope | Notes |
|----------|--------|--------|
| `VITE_SUPABASE_URL` | Frontend (build) | e.g. `https://aybngrlutsfvapxtgqkg.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend (build) | Supabase anon/public key (safe in browser) |
| `GEMINI_API_KEY` | Server only | Powers `POST /api/ai/generate-listing` (`gemini-3-flash-preview`) |
| `VITE_SITE_URL` | Frontend (build) | `https://www.shpalljet.net` — OAuth/email redirect base |
| `VITE_OAUTH_GOOGLE_ENABLED` | Frontend (build) | Set `true` only after Google OAuth is fully configured in Supabase |
| `VITE_OAUTH_APPLE_ENABLED` | Frontend (build) | Set `true` **only after** Apple OAuth is fully configured in Supabase |

### Important env rules

- **Never use `VITE_GEMINI_API_KEY`.** The Gemini key must stay server-side as `GEMINI_API_KEY` only.
- **Do not commit** `.env`, `.tmp/`, lighthouse report files (e.g. `lighthouse-pwa.json`), or `supabase/.temp/` folders.
- OAuth buttons are hidden unless `VITE_OAUTH_*_ENABLED=true` at build time (see `src/config/authProviders.ts`).

---

## Related docs

- `ENV_SETUP.md` — detailed OAuth, Supabase Dashboard, and local dev setup
- `DEPLOYMENT_CHECKLIST.md` — pre-release verification checklist
- `vercel.json` — SPA fallback + static `dist/` output

---

## Quick verification

```sh
# Production API (missing GEMINI_API_KEY → 503)
curl -X POST https://www.shpalljet.net/api/ai/generate-listing \
  -H "Content-Type: application/json" -d "{}"

# Supabase project in production bundle should match ref above
# VITE_SUPABASE_URL → https://aybngrlutsfvapxtgqkg.supabase.co
```

---

*Last updated: 2026-06-30*
