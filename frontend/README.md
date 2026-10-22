# Astarship frontend

React + TypeScript + Vite. El backend corre en `:8000`; en dev, Vite hace proxy de `/api`, `/docs` y `/openapi.json` (ver `vite.config.ts`).

## Scripts

```sh
pnpm dev      # servidor de desarrollo en :5173
pnpm lint     # oxlint
pnpm build    # tsc + vite build
```

Importa desde `src/` con el alias `@/` (`import { useTheme } from "@/providers/theme"`).
Los colores, espacios, radios y tipografía salen de `src/styles/tokens.css` (copiado del Design System).

## Estructura

```
src/
  main.tsx
  app/
  pages/
  components/
  providers/
  lib/
  styles/
```

Estructura por capas: lo específico de cada entidad (User, Activity, Itinerary...) vive en `pages/` y `components/`, no en carpetas separadas por dominio. Si alguna de estas carpetas crece demasiado, subagrupar por dominio dentro de ella (`pages/activities/`, `components/activities/`) antes que migrar a una estructura por features.
