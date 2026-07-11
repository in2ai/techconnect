# TechConnect API

FastAPI backend for the TechConnect biomedical research application.

## What it provides

- cookie-based authentication endpoints under `/api/auth`
- protected CRUD-style entity routes for the research domain
- dataset import/export endpoints for admin workflows
- a seed script for demo/sample data
- shared SQLModel persistence models from `techconnect-schemas`

## Quick Start

Run these commands from `packages/api/` unless noted otherwise.

```bash
# Install the package with dev tools
uv sync --extra dev

# Start the development server
uv run fastapi dev app/main.py
```

Default URLs:

- **API root**: <http://localhost:8000/api>
- **OpenAPI docs**: <http://localhost:8000/docs>
- **ReDoc**: <http://localhost:8000/redoc>

## Common Commands

```bash
# Development server with auto-reload
uv run fastapi dev app/main.py

# Production-style server
uv run fastapi run app/main.py

# Run the full test suite
uv run pytest

# Run a single test module
uv run pytest tests/test_auth.py

# Seed sample/demo data
uv run seed-db

# Lint and format
uv run ruff check .
uv run ruff format .

# Type checking
uv run pyrefly check .
```

From the repository root you can also run:

```bash
uv run --package techconnect-api fastapi dev packages/api/app/main.py
uv run --package techconnect-api pytest packages/api/tests
uv run --package techconnect-api seed-db
```

## API Surface

- `GET /api/health` - container and service health check
- `POST /api/auth/login` - create a browser session cookie
- `POST /api/auth/logout` - revoke the current session
- `GET /api/auth/me` - return the authenticated user profile
- entity routers from `entities.py` - protected CRUD routes for patients, tumors, biomodels, passages, samples, and related domain models
- import/export routes from `imports.py` - dataset template download, dataset export, dataset import, and legacy PDX workbook import

## Project Structure

```text
app/
├── api/
│   ├── dependencies.py
│   ├── router.py
│   ├── endpoints/
│   │   ├── auth.py
│   │   ├── entities.py
│   │   ├── health.py
│   │   └── imports.py
│   └── schemas/
│       └── auth.py
├── core/
│   ├── config.py
│   ├── database.py
│   └── security.py
├── services/
│   ├── auth.py
│   ├── crud.py
│   ├── dataset_transfer.py
│   ├── entity_catalog.py
│   └── pdx_import.py
├── main.py
└── seed.py
tests/
├── test_auth.py
├── test_crud.py
├── test_imports.py
└── test_main.py
```

## Environment Variables

- `DATABASE_URL` - database connection string, defaults to `sqlite:///techconnect.db`
- `AUTH_COOKIE_NAME` - cookie name, defaults to `techconnect_session`
- `AUTH_COOKIE_SAME_SITE` - cookie SameSite policy, defaults to `lax`
- `AUTH_COOKIE_SECURE` - set to `true` behind HTTPS/TLS
- `AUTH_SESSION_TTL_MINUTES` - session lifetime in minutes, defaults to `720`
- `AUTH_BOOTSTRAP_EMAIL` - initial admin email for non-SQLite environments
- `AUTH_BOOTSTRAP_PASSWORD` - initial admin password for non-SQLite environments
- `AUTH_BOOTSTRAP_FULL_NAME` - optional display name for the bootstrap admin

## Bootstrap Auth Behavior

- SQLite development automatically falls back to a local bootstrap admin.
- Non-SQLite deployments should provide explicit bootstrap credentials before first start.
- Protected API routers are attached centrally in `app/api/router.py` with `require_authenticated_user`.
