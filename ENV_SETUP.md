# Environment Setup

## Frontend (`.env`)

| Variable | Used by |
|---|---|
| `VITE_SUPABASE_URL` | `src/integrations/supabase/client.ts` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase client (anon key, safe in browser) |
| `VITE_SITE_URL` | OAuth + email redirect base (e.g. `https://www.shpalljet.net`) |
| `VITE_SUPABASE_PROJECT_ID` | tooling (optional) |

Do not commit `.env`. Use `.env.example` as a template.

### Supabase Auth (Dashboard → Authentication → URL Configuration)

| Setting | Production value |
|---|---|
| Site URL | `https://www.shpalljet.net` |
| Redirect URLs | `https://www.shpalljet.net/**`, `https://shpalljet.net/**` |

OAuth uses native **Supabase Auth** (`signInWithOAuth`). There is no Better Auth, NextAuth, or `/~oauth` handler on Vercel.

**Not required for this project:** `NEXT_PUBLIC_*`, `AUTH_URL`, `AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXTAUTH_URL`.

## Edge function secrets (Supabase Dashboard)

| Secret | Used by |
|---|---|
| `SUPABASE_URL` | edge functions (auto-injected) |
| `SUPABASE_SERVICE_ROLE_KEY` | edge functions (auto-injected) |
| `AI_PROVIDER_API_KEY` | `ai-assistant` — API key for the AI gateway |
| `AI_PROVIDER_GATEWAY_URL` | `ai-assistant` — full chat completions URL (OpenAI-compatible) |

The AI gateway is provider-neutral. Configure both secrets for `ai-assistant` to enable chat, search parsing, listing suggestions, and photo analysis.

## Local dev

```sh
npm install
npm run dev        # vite on :8080
```

## Storage buckets

- `product-images` (public read) — listing photos
- `avatars` (public read) — profile pictures

Bucket policies are defined in migrations.

## Tooling

- Node ≥ 18
- npm ≥ 10
- TypeScript 5, Vite 5
