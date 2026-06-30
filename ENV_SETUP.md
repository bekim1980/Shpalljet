# Environment Setup

## Frontend (`.env`)

| Variable | Used by |
|---|---|
| `VITE_SUPABASE_URL` | `src/integrations/supabase/client.ts` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase client (anon key, safe in browser) |
| `VITE_SITE_URL` | OAuth + email redirect base (e.g. `https://www.shpalljet.net`) |
| `VITE_OAUTH_GOOGLE_ENABLED` | Set `true` after Google OAuth is configured in Supabase |
| `VITE_OAUTH_APPLE_ENABLED` | Set `true` after Apple OAuth is configured in Supabase |
| `VITE_SUPABASE_PROJECT_ID` | tooling (optional) |

Do not commit `.env`. Use `.env.example` as a template.

### Supabase Auth (Dashboard → Authentication → URL Configuration)

| Setting | Production value |
|---|---|
| Site URL | `https://www.shpalljet.net` |
| Redirect URLs | `https://www.shpalljet.net/**`, `https://shpalljet.net/**`, `http://localhost:5173/**`, `http://localhost:3000/**`, `http://localhost:8080/**` |

OAuth uses native **Supabase Auth** (`signInWithOAuth`). There is no Better Auth, NextAuth, or `/~oauth` handler on Vercel.

**Project ref (from `supabase/config.toml`):** `aybngrlutsfvapxtgqkg`

### Google OAuth (Supabase + Google Cloud)

1. **Supabase** → Authentication → Providers → Google:
   - Enable Google
   - Paste **Client ID** and **Client Secret** from Google Cloud Console
   - Click **Save**

2. **Google Cloud Console** → APIs & Services → Credentials → OAuth 2.0 Client:
   - Authorized JavaScript origins: `https://www.shpalljet.net`, `https://shpalljet.net`
   - Authorized redirect URI (Supabase only, not your app):
     `https://aybngrlutsfvapxtgqkg.supabase.co/auth/v1/callback`

3. **Vercel** → set `VITE_OAUTH_GOOGLE_ENABLED=true` and redeploy.

App redirect after Supabase completes: `https://www.shpalljet.net/auth/callback` (via `redirectTo` in code).

### Apple OAuth (optional)

Supabase → Authentication → Providers → Apple requires Service ID, Team ID, Key ID, and Private Key.  
Set `VITE_OAUTH_APPLE_ENABLED=true` only after all fields are saved.

**Error `400 Unsupported provider: missing OAuth secret`** means the provider toggle is on in Supabase but **Client Secret** (Google) or **Private Key** (Apple) is empty or not saved.

**Not required for this project:** `NEXT_PUBLIC_*`, `AUTH_URL`, `AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXTAUTH_URL`.

## Edge function secrets (Supabase Dashboard)

| Secret | Used by |
|---|---|
| `SUPABASE_URL` | edge functions (auto-injected) |
| `SUPABASE_SERVICE_ROLE_KEY` | edge functions (auto-injected) |
| `AI_PROVIDER_API_KEY` | `ai-assistant` — API key for the AI gateway |
| `AI_PROVIDER_GATEWAY_URL` | `ai-assistant` — full chat completions URL (OpenAI-compatible) |

The AI gateway is provider-neutral. Configure both secrets for `ai-assistant` to enable chat, search parsing, and listing suggestions.

## Vercel server env (never expose to frontend)

| Variable | Used by |
|---|---|
| `GEMINI_API_KEY` | `api/ai/generate-listing` — Google Gemini API key for AI listing generation (`gemini-3-flash-preview`) |

Set `GEMINI_API_KEY` in the **Vercel** project → Settings → Environment Variables (Production, Preview, Development). Do **not** prefix with `VITE_`. For local dev, add the same key to `.env` at the project root; Vite serves `/api/ai/generate-listing` via a dev middleware.

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
