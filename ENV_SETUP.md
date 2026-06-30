# Environment Setup

## Required runtime env vars
The `.env` file is **auto-managed by Lovable Cloud** — do not edit by hand.
It is regenerated from the connected backend and overwriting it will break
the build.

| Variable | Source | Used by |
|---|---|---|
| `VITE_SUPABASE_URL` | auto | `src/integrations/supabase/client.ts` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | auto | client (anon key, safe in browser) |
| `VITE_SUPABASE_PROJECT_ID` | auto | tooling |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | auto | scripts / edge fn local dev |

No private API keys are required for the current feature set. Lovable AI
Gateway is wired through the `ai-assistant` edge function and needs no
client-side key.

## Local dev (outside Lovable)
```sh
nvm use            # Node 18+ recommended
npm install
npm run dev        # vite on :8080
```
The dev server proxies to the live Lovable Cloud backend using the keys in
`.env`. Do not commit a different `.env`.

## Edge function secrets
Configured via the Lovable Cloud → Secrets panel. Current functions
(`ai-assistant`, `expire-listings`, `saved-search-runner`) rely only on the
default `SUPABASE_*` and `LOVABLE_API_KEY` secrets provided by the
platform.

## Storage buckets
- `product-images` (public read) — listing photos.
- `avatars` (public read) — profile pictures.
Bucket policies are defined in migrations; do not edit via the dashboard.

## Tooling versions
- Node ≥ 18
- npm ≥ 10
- TypeScript 5 (via project)
- Vite 5
