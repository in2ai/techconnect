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

## Importing implant measurements

The Excel template includes a `measure` sheet; the CSV ZIP template includes
`measure.csv`. Each row records one measurement, with columns `id`, `measure_date`,
`length`, `width`, and `implant_id`. Length and width are in mm; tumor volume is
calculated automatically and is not an import column.

Implants are entered in the `mouse` sheet using `implant_1_*` and `implant_2_*`
columns. To import a new implant and its measurements together, supply its UUID
in `mouse.implant_1_id` or `mouse.implant_2_id` and use that same UUID as
`measure.implant_id`. An existing implant can be referenced by its exported ID.
Mice and implants are processed before measurements regardless of sheet order.

A supplied measurement `id` creates or updates that record. Leaving it blank
generates a new ID and creates a new measurement on each import. Export the
dataset after the first import and preserve those IDs when editing and
reimporting to avoid duplicates. Multiple measurements on the same date are
allowed. Dates use `YYYY-MM-DD`.

Invalid measurement rows appear in the import error summary; valid rows can
still import. Files without a `measure` sheet or CSV remain supported.

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
