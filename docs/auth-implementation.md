# Authentication Implementation

This document explains how authentication was added to TechConnect, which files are responsible for each part of the flow, and why the implementation uses this shape.

## Goals

The first implementation phase was intentionally narrow:

- Require authentication for the Angular application and the existing domain API routes.
- Support local email/password sign-in.
- Use a browser-friendly session model that fits the current deployment.
- Avoid exposing sensitive auth fields in the shared schema export.
- Keep the solution small enough to extend later with admin user management or RBAC.

This phase does not include self-service registration, password reset, invitations, MFA, or role-based authorization.

## Why This Approach

### Why cookie-based sessions instead of browser-stored JWTs

The repository already serves the frontend and API behind the same host in production:

- `docker/nginx/default.conf` serves the Angular build.
- `docker/nginx/default.conf` proxies `/api` to the FastAPI backend.
- `frontend/proxy.conf.json` already proxies `/api` during local development.

That makes an HTTP-only cookie the best first choice because:

- the browser automatically sends the session on same-origin requests
- the frontend does not need to store tokens in `localStorage` or `sessionStorage`
- logout is simple because the session can be revoked server-side
- revocation and expiration are controlled centrally in the backend

JWT access tokens plus refresh tokens would add more complexity than this deployment currently needs.

### Why auth models are separate from auth API schemas

TechConnect uses the shared `packages/schemas` package for two different jobs:

- SQLModel table definitions for the backend database
- generated TypeScript interfaces for the frontend via `packages/schemas/export_schema.py`

The existing entity CRUD pattern exposes SQLModel classes directly as API request and response models. That works for the research entities in this project, but it is unsafe for auth because a persistence model would contain fields such as `password_hash`.

To avoid leaking auth persistence fields:

- auth database tables are defined in `packages/schemas/models/auth.py`
- those models are imported in `packages/schemas/models/__init__.py` so SQLModel metadata registers them
- those models are intentionally not added to `__all__`
- auth request and response payloads are defined separately in `packages/api/app/api/schemas/auth.py`

That separation is the main guardrail that keeps the frontend code generator from exporting sensitive auth fields.

## Backend Design

### Persistence models

Auth storage lives in `packages/schemas/models/auth.py`.

It defines two tables:

- `AuthUser`: email, password hash, basic account state, timestamps, and admin flag
- `AuthSession`: server-side browser session with a hashed cookie token and expiration time

Important details:

- Email is normalized before lookup so login and uniqueness checks are stable.
- Session tokens are never stored in plaintext. The browser gets the raw token, and the database stores only a SHA-256 hash.
- Passwords are never stored in plaintext and are hashed with Argon2.

### Settings and bootstrap behavior

Runtime auth settings were added to `packages/api/app/core/config.py`.

These cover:

- cookie name
- cookie `SameSite` behavior
- secure-cookie toggle
- session TTL
- bootstrap admin credentials

The implementation includes a practical first-run path:

- If the app runs against SQLite, a default local admin is created automatically.
- If the app runs against a non-SQLite database, bootstrap credentials should be provided through environment variables.

This keeps local development friction low while still allowing explicit configuration for deployed environments.

### Security helpers

`packages/api/app/core/security.py` contains the low-level security primitives:

- email normalization
- Argon2 password hashing and verification
- optional password hash rehashing
- session token generation
- session token hashing
- UTC timestamp helper

Keeping these helpers isolated makes the auth service easier to test and avoids mixing cryptographic details into route handlers.

### Auth service

`packages/api/app/services/auth.py` contains the backend business logic.

This service is responsible for:

- creating the bootstrap user on startup
- authenticating an email/password pair
- creating a server-side session record
- resolving a user from the cookie token
- deleting expired or invalid sessions
- revoking a session on logout

The service layer was chosen to match the existing separation in the repo, where reusable business logic already lives under `packages/api/app/services/`.

### FastAPI dependencies and route protection

`packages/api/app/api/dependencies.py` now exposes `require_authenticated_user` and `CurrentUserDep`.

The dependency reads the configured cookie from the request, resolves the session through the auth service, and returns `401` when the session is missing, expired, or inactive.

Route protection is applied centrally in `packages/api/app/api/router.py`:

- `health` remains public
- `auth` remains public
- existing entity routers are wrapped with `Depends(require_authenticated_user)`

This approach was chosen because it protects the whole entity API without rewriting the generic CRUD builder.

### Auth endpoints

`packages/api/app/api/endpoints/auth.py` introduces three endpoints:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Their responsibilities are straightforward:

- `login` verifies credentials, creates a session, and sets the HTTP-only cookie
- `logout` removes the server-side session and clears the cookie
- `me` returns the authenticated user profile needed by the frontend

The response model is `CurrentUserResponse`, which intentionally exposes only safe fields.

### Startup behavior

`packages/api/app/main.py` now ensures the bootstrap admin exists during app startup, after tables are created.

This is a deliberate tradeoff for the first phase:

- it gives local development and fresh deployments an immediate login path
- it avoids adding a separate admin setup CLI before the system is usable

For a larger production rollout, this could later move into a more explicit initialization command.

## Frontend Design

### Route and layout split

Before auth, the root Angular component always rendered the app shell. That would force the login page to appear inside the authenticated navigation frame, which is the wrong UX.

The fix was:

- `frontend/src/app/app.ts` now renders a plain `router-outlet`
- `frontend/src/app/app.routes.ts` defines a public `/login` route
- `frontend/src/app/app.routes.ts` uses `AppShellComponent` as the protected layout route for the rest of the app

This layout split is important because it keeps the authenticated workspace UI separate from the public login experience.

### Auth state management

`frontend/src/app/core/services/auth.service.ts` manages auth state with Angular signals.

It provides:

- `currentUser`
- `initialized`
- `isAuthenticated`
- `login()`
- `logout()`
- `restoreSession()`
- redirect-memory helpers for protected-route navigation

Signals were used because the repo already follows Angular signal-based patterns and because auth state is local app state, not shared server cache.

The frontend intentionally does not store credentials or session tokens in browser storage.

### Guards

`frontend/src/app/core/guards/auth.guard.ts` adds three functional guards:

- `authGuard` for entering the protected shell
- `authChildGuard` for child routes under the shell
- `anonymousOnlyGuard` so authenticated users do not stay on the login page

The guards call `restoreSession()` so a page refresh on a protected route can recover the session cleanly.

### HTTP interceptors

Two auth-related interceptors were added and registered in `frontend/src/app/app.config.ts`:

- `credentialsInterceptor`: ensures requests include cookies with `withCredentials: true`
- `authInterceptor`: listens for `401` responses and resets frontend auth state when appropriate

The existing `errorInterceptor` was also adjusted so `401` responses are not shown as generic snack-bar errors.

This split keeps responsibilities clear:

- credential transport is one concern
- auth state reset is another
- user-facing generic error messaging stays in the existing interceptor

### Login page

`frontend/src/app/features/auth/pages/login/login.page.ts` contains the login UI.

It uses:

- Reactive Forms
- Angular Material inputs and buttons
- a small loading state during submit
- the existing notification service for success and failure feedback

The page was built as a standalone route outside the main shell so it can act as a focused entry point for the workspace.

### Shell integration

`frontend/src/app/shared/layout/app-shell.component.ts` now reads the authenticated user from `AuthService` and adds:

- current-user display in the toolbar
- account menu
- logout action

This keeps auth visible in the application frame without introducing a separate global state framework.

## Test and Validation Strategy

### Backend tests

`packages/api/tests/test_auth.py` covers the new backend behavior:

- protected routes reject unauthenticated requests
- valid login sets a session cookie
- invalid login returns `401`
- `me` returns the current user
- logout revokes the session

The backend test suite passes with:

```bash
uv run --package techconnect-api pytest packages/api/tests
```

### Frontend validation

Frontend validation was done in two ways:

- the Angular application builds successfully with `npm run build`
- auth-related service and route integration code was added and checked through the compiler/build path

The full Angular unit test command is currently blocked by an unrelated pre-existing issue in `frontend/src/app/features/biomodels/components/biomodel-form/biomodel-form.component.spec.ts`, where the fixture shape does not match the generated `Biomodel` interface. That failure is outside the auth implementation.

### E2E helpers

The Playwright helpers in `frontend/e2e/helpers/` were updated so future end-to-end tests can authenticate before touching protected pages or API fixtures.

## Security Notes

This first implementation improves the baseline substantially, but it is still a first phase.

Current strengths:

- HTTP-only session cookie
- server-side session revocation
- Argon2 password hashing
- no plaintext token storage in the browser
- auth persistence models are not exported to frontend TypeScript codegen

Known future improvements:

- add CSRF protection if the app expands beyond the current same-origin model
- add account lockout or rate limiting for repeated failed logins
- add explicit migration tooling for auth schema changes in production
- add admin user management flows instead of relying only on bootstrap credentials
- add RBAC when the application needs permission boundaries between users

## Files Added or Changed

Backend:

- `packages/schemas/models/auth.py`
- `packages/api/app/core/config.py`
- `packages/api/app/core/security.py`
- `packages/api/app/services/auth.py`
- `packages/api/app/api/schemas/auth.py`
- `packages/api/app/api/dependencies.py`
- `packages/api/app/api/endpoints/auth.py`
- `packages/api/app/api/router.py`
- `packages/api/app/main.py`
- `packages/api/tests/test_auth.py`

Frontend:

- `frontend/src/app/app.ts`
- `frontend/src/app/app.routes.ts`
- `frontend/src/app/app.config.ts`
- `frontend/src/app/core/models/auth.models.ts`
- `frontend/src/app/core/services/auth.service.ts`
- `frontend/src/app/core/guards/auth.guard.ts`
- `frontend/src/app/core/interceptors/credentials.interceptor.ts`
- `frontend/src/app/core/interceptors/auth.interceptor.ts`
- `frontend/src/app/core/interceptors/error.interceptor.ts`
- `frontend/src/app/features/auth/pages/login/login.page.ts`
- `frontend/src/app/shared/layout/app-shell.component.ts`
- `frontend/e2e/helpers/ui-helpers.ts`
- `frontend/e2e/helpers/api-fixtures.ts`

Documentation:

- `README.md`
- `docs/auth-implementation.md`

## Summary

The auth implementation is intentionally conservative:

- cookie-based because the deployment is same-origin
- server-side sessions because revocation matters and complexity should stay low
- separate auth DTOs because the repo’s schema export system would otherwise leak persistence fields
- route-level layout split in Angular because login should not live inside the authenticated shell

That gives the project a secure, understandable base that can later grow into broader user management without needing to undo the current design.