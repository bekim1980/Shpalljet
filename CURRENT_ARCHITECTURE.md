# Current Architecture

## Stack
- **Frontend**: React 18 + Vite 5 + TypeScript 5
- **Styling**: Tailwind CSS v3 + shadcn/ui, HSL semantic tokens in
  `src/index.css` and `tailwind.config.ts`
- **State / Data**: `@tanstack/react-query`, React Context for cross-cutting
  state (`AuthProvider`, `VerticalProvider`, `LocaleProvider`)
- **Routing**: `react-router-dom` (BrowserRouter, SPA fallback handled by
  Vercel hosting)
- **i18n**: `react-i18next` (`src/locales/{sq,en}.json`)
- **PWA**: `vite-plugin-pwa` (autoUpdate, workbox precache)
- **Backend**: Supabase — Auth, Postgres + RLS, Storage,
  Edge Functions, Realtime

## App entry
```
main.tsx → App.tsx
  QueryClientProvider
    TooltipProvider
      AuthProvider
        LocaleProvider
          VerticalProvider
            BrowserRouter
              VerticalThemeWrapper  ← sets data-vertical on root div
                <Routes/>
                <AIChatWidgetGate/>
```

## Verticals
Slugs: `luxe`, `market`, `rent`, `services`, `jobs`, plus `xhiro` for rides.
- Source of truth on `/browse` is the `?vertical=` URL param.
- `LUXE_ROUTES` (`/`, `/index`, `/login`, `/install`, `/pricing`) always
  render with the brand luxe theme.
- `/rides*`, `/my-rides` render with the `xhiro` theme.
- Config lives in `src/data/verticalConfig.ts`.
- Theme tokens are flipped via `[data-vertical="..."]` blocks in
  `src/index.css`.

## Key routes
| Route | Page | Guard |
|---|---|---|
| `/` `/index` | `Homepage` | public |
| `/browse` | `Index` | public |
| `/product/:id` `/p/:slug` | `ProductDetail` | public |
| `/search` | `SearchResults` | public |
| `/login` | `Login` | public |
| `/sell` | `Sell` | `ProtectedRoute` |
| `/profile` | `Profile` | `ProtectedRoute` |
| `/messages` | `Messages` | `ProtectedRoute` |
| `/orders` | `Orders` | `ProtectedRoute` |
| `/analytics` | `Analytics` | `ProtectedRoute` |
| `/admin` | `Admin` | `AdminRoute` |
| `/insights` | `Insights` | `AdminRoute` |
| `/pricing` `/install` | static | public |
| `/rides` `/rides/new` `/rides/:id` `/my-rides` | Xhiro flow | mixed |

## Data layer (Supabase)
- Single client: `src/integrations/supabase/client.ts` (auto-generated,
  do NOT edit).
- Hooks in `src/hooks/use*.ts` wrap queries/mutations. Mutations invalidate
  related queries — no manual cache pokes.
- Roles in dedicated `user_roles` table; admin check via
  `public.has_role(uid, 'admin')` security-definer function (see
  `src/hooks/useAdmin.ts`).
- Images stored in `product-images` storage bucket; client-side
  compression to max 1920px before upload (`ImageUploader.tsx`).

## Image rendering contract
- All list/grid product thumbnails go through
  `src/components/common/ThumbImage.tsx`: placeholder → onLoad swap, single
  onError fallback, fixed dimensions, no layout jump.
- Product detail gallery uses
  `src/components/product/{ImageCarousel,FullscreenViewer,SafeImage}.tsx`.

## Edge functions
- `ai-assistant` — `verify_jwt = false` (external AI provider gateway).
- `expire-listings` — cron-style cleanup, `verify_jwt = false`.
- `saved-search-runner` — runs saved searches.

## Tests
- Unit: Vitest (`src/test/*.test.tsx`, `src/lib/*.test.ts`)
- E2E: Playwright (`tests/*.spec.ts`)
