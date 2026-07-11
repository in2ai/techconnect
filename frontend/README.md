# TechConnect Frontend

Angular 21 frontend for the TechConnect biomedical research workspace.

## What lives here

- authenticated workspace UI with a dedicated login route
- feature areas for dashboard, patients, tumors, biomodels, passages, samples, and admin data transfer
- Angular Material components with Tailwind CSS utilities
- generated TypeScript models from `packages/schemas`
- localized builds for English (`/en/`) and Spanish (`/es/`)
- Vitest unit tests and Playwright end-to-end tests

## Scripts

Run all commands from `frontend/`.

```bash
# Install dependencies
npm install

# Start the localized development server
npm start

# Start a Spanish-only localized development server
npm run start:es

# Build the localized production bundles
npm run build

# Run unit tests
npm run test

# Run Playwright end-to-end tests
npm run test:e2e

# Extract translation source messages
npm run extract-i18n
```

## Generated models

Frontend scripts run `codegen:models` before `start`, `build`, `test`, `test:e2e`, and `extract-i18n`.
That command regenerates `src/app/generated/models.ts` from the SQLModel definitions in `packages/schemas`.

If you only need to regenerate the models manually, run:

```bash
npm run codegen:models
```

## Application structure

- `src/app/core/` - auth guards, interceptors, shared services, tokens, and app-wide models
- `src/app/features/` - route-level feature areas
- `src/app/shared/` - reusable UI, directives, layout, forms, and pipes
- `src/app/generated/` - generated TypeScript interfaces from the shared schema package
- `src/locale/` - translation files used by Angular localization
- `e2e/` - Playwright coverage for auth and CRUD flows

## Notes

- The app uses route-level lazy loading through `loadComponent` entries in `src/app/app.routes.ts`.
- Authenticated routes render inside `AppShellComponent`; `/login` stays outside the shell.
- The production build is localized, and the Docker/Nginx deployment serves language-aware paths.
