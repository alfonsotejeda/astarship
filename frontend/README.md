# Astarship frontend

React + TypeScript + Vite. The backend runs on `:8000`; in dev, Vite proxies `/api`, `/docs` and `/openapi.json` (see `vite.config.ts`).

## Scripts

```sh
pnpm dev      # dev server on :5173
pnpm lint     # oxlint
pnpm build    # tsc + vite build
```

Import from `src/` with the `@/` alias (`import { useTheme } from "@/app/providers/theme/ThemeContext"`).
Colors, spacing, radii and type come from `src/styles/tokens.css` (copied from the Design System).

## Structure

```text
src/
  main.tsx              mounts <App />
  app/
    App.tsx             providers + RouterProvider
    providers/          auth/ and theme/: context + hook, provider and their data
    router/             routes and per-role navigation
  pages/                one folder per page: ActivitiesPage/, ItinerariesPage/...
  components/           one folder per Design System component: Button/, DataTable/...
  lib/                  API client, formatting, PDF export
  styles/               tokens.css, index.css
```

Code is in English (identifiers, comments, roles, keys). User-facing text and URLs are in Spanish, like the rest of the UI.

Layered structure: what is specific to each entity (User, Activity, Itinerary...) lives in `pages/` and `components/`, not in per-domain folders. If one of these folders grows too much, group by domain inside it (`pages/activities/`, `components/activities/`) before moving to a feature-based structure.
