# Environment Setup

## Frontend (`.env`)

| Variable | Used by |
|---|---|
| `VITE_SUPABASE_URL` | `src/integrations/supabase/client.ts` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase client (anon key, safe in browser) |
| `VITE_SITE_URL` | OAuth + email redirect base (e.g. `https://www.shpalljet.net`) |
| `VITE_OAUTH_GOOGLE_ENABLED` | Set `true` after Google OAuth is configured in Supabase |
| `VITE_OAUTH_APPLE_ENABLED` | Set `true` after Apple OAuth is configured in Supabase |
| `VITE_GOOGLE_AUTH_MODE` | `supabase` (default, rollback) or `nextauth` for Auth.js Google on `/api/auth/callback/google` |
| `VITE_SUPABASE_PROJECT_ID` | tooling (optional) |

Do not commit `.env`. Use `.env.example` as a template.

### Supabase Auth (Dashboard → Authentication → URL Configuration)

| Setting | Production value |
|---|---|
| Site URL | `https://www.shpalljet.net` |
| Redirect URLs | `https://www.shpalljet.net/**`, `https://shpalljet.net/**`, `http://localhost:5173/**`, `http://localhost:3000/**`, `http://localhost:8080/**` |

OAuth uses **Supabase Auth** for email/password and (by default) Google. Optional **Auth.js** Google mode (`VITE_GOOGLE_AUTH_MODE=nextauth`) adds `/api/auth/callback/google` while bridging to Supabase via `signInWithIdToken`.

**Project ref (from `supabase/config.toml`):** `aybngrlutsfvapxtgqkg`

### Google OAuth — Auth.js mode (Bazaar-style, optional)

When `VITE_GOOGLE_AUTH_MODE=nextauth`:

1. **Vercel server env** (never `VITE_`):
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `AUTH_URL` — `https://www.shpalljet.net`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — same Web client as Supabase (or dedicated client with both redirect URIs)

2. **Google Cloud** → Authorized redirect URIs (add, keep Supabase URI for rollback):
   - `https://www.shpalljet.net/api/auth/callback/google`
   - `https://xbignrigchholsrbnvhl.supabase.co/auth/v1/callback` (legacy)

3. **Supabase** → URL Configuration → add redirect:
   - `https://www.shpalljet.net/auth/google-callback`

4. **Supabase Google provider** must stay **enabled** (bridge uses `signInWithIdToken`).

5. **Rollback:** unset `VITE_GOOGLE_AUTH_MODE` or set `supabase`, redeploy.

### Google OAuth — Supabase mode (default)

1. **Supabase** → Authentication → Providers → Google:
   - Enable Google
   - Paste **Client ID** and **Client Secret** from Google Cloud Console
   - Click **Save**

2. **Google Cloud Console** → APIs & Services → Credentials → OAuth 2.0 Client:
   - Authorized JavaScript origins: `https://www.shpalljet.net`, `https://shpalljet.net`
   - Authorized redirect URI (Supabase callback):
     `https://xbignrigchholsrbnvhl.supabase.co/auth/v1/callback`

3. **Vercel** → set `VITE_OAUTH_GOOGLE_ENABLED=true` and redeploy.

App redirect after Supabase completes: `https://www.shpalljet.net/auth/callback` (via `redirectTo` in code).

### Apple OAuth (optional)

Supabase → Authentication → Providers → Apple requires Service ID, Team ID, Key ID, and Private Key.  
Set `VITE_OAUTH_APPLE_ENABLED=true` only after all fields are saved.

**Error `400 Unsupported provider: missing OAuth secret`** means the provider toggle is on in Supabase but **Client Secret** (Google) or **Private Key** (Apple) is empty or not saved.

**Not required for Supabase-only mode:** `AUTH_URL`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID` on Vercel (those are for Auth.js server routes).

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
