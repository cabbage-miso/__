## Architecture

This project follows [Feature-Sliced Design (FSD)](https://feature-sliced.design/).

### Layer Hierarchy (top → bottom)

```
app → pages → widgets → features → entities → shared
```

- **app**: Providers, router, global styles, entry point
- **pages**: Full page/screen compositions
- **widgets**: Large composite UI blocks (header, sidebar, etc.)
- **features**: User interactions and business actions (e.g., login, add-to-cart)
- **entities**: Core domain objects (e.g., user, product)
- **shared**: Reusable infrastructure — UI kit, utilities, API client, config, types

### Import Rules

- A module can **only import from layers strictly below it**.
- **Slices within the same layer must NOT import from each other.**
  - e.g., `entities/user` cannot import from `entities/product`.
  - If cross-slice interaction is needed, handle it in a higher layer.

### Slice Structure

Each slice uses segments organized by technical purpose:

```
features/
  auth/
    ui/          ← Components, styles
    model/       ← State, selectors, business logic
    api/         ← Server requests
    lib/         ← Helpers scoped to this slice
    config/      ← Constants, enums, feature flags
    index.ts     ← Public API (required)
```

### Public API

- Every slice **must** export through `index.ts` at its root.
- External code must import from the index only:
  - `import { LoginForm } from '@/features/auth'` ✅
  - `import { LoginForm } from '@/features/auth/ui/LoginForm'` ❌

### Project Structure

```
src/
  app/
  pages/
  widgets/
  features/
  entities/
  shared/
    ui/
    api/
    lib/
    config/
```

### Rules

- Organize code by **business domain**, not by technical type.
- Do NOT create top-level `components/`, `hooks/`, `utils/` folders.
- `shared/` has no slices — segments sit at the top level directly.
- Keep slices self-contained: co-locate UI, model, API, and lib within each slice.

## Naming Conventions

- All folder and file names must use **kebab-case**.
  - e.g., `error-boundary-provider.tsx`, `query-provider.tsx`, `root-layout.tsx`

## Tech Stack

- Vite + React + TypeScript
- Package manager: pnpm
