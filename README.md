# Shpalljet

Modern marketplace for Albania, Kosovo, and North Macedonia — buy, sell, rent, services, and jobs.

**Production**: https://www.shpalljet.net

## Local development

Requirements: Node.js 18+, npm 10+

```sh
git clone <YOUR_GIT_URL>
cd cozy-connect-shop-main
npm install
npm run dev    # http://localhost:8080
```

Copy environment variables from your Supabase project (see `ENV_SETUP.md`).

## Stack

- Vite 5 + React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth, Postgres, Storage, Edge Functions)
- vite-plugin-pwa

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm test` | Unit tests (Vitest) |
| `npx playwright test` | E2E tests |

## Deployment

Frontend deploys via Vercel (connected to GitHub `main`). Edge functions deploy with:

```sh
npx supabase functions deploy ai-assistant
```

Set secrets in Supabase Dashboard → Edge Functions → Secrets (`AI_PROVIDER_API_KEY`, `AI_PROVIDER_GATEWAY_URL`).

## Custom domain

Production domain: `www.shpalljet.net` (configured in Vercel).
