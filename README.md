# TechConnect Backend Monorepo

A UV workspace monorepo for the TechConnect biomedical research application api and schemas.

## Structure

```text
.
├── packages/
│   ├── schemas/      # Python - SQLModel schemas & SQL export
│   └── api/      # Python - FastAPI backend
├── frontend/         # React Admin frontend (separate project, not in workspace)
└── pyproject.toml    # UV workspace root
```

## Prerequisites

- **[uv](https://github.com/astral-sh/uv)** - Python package manager (only requirement!)

> **Note**: You don't even need Python installed! uv can download and manage Python versions for you automatically.

### Install uv

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or with pip
pip install uv

# Or with Homebrew
brew install uv
```

## Quick Start

```bash
# Install all Python dependencies (creates .venv automatically)
uv sync --all-packages

# Run backend development server (from workspace root)
uv run --package techconnect-api fastapi dev packages/api/app/main.py

# Or run from the package directory
cd packages/api && uv run fastapi dev app/main.py

# Export SQL schema
uv run --package techconnect-schemas export-schema --dialect postgresql

# Initialize database tables
uv run --package techconnect-schemas init-db
```

## Common Commands

### Installation

```bash
# Sync all workspace packages
uv sync --all-packages

# Sync a specific package
uv sync --package techconnect-api
uv sync --package techconnect-schemas
```

### Development

```bash
# Run FastAPI backend (development mode with auto-reload)
uv run --package techconnect-api fastapi dev packages/api/app/main.py

# Or from the package directory (simpler)
cd packages/api
uv run fastapi dev app/main.py

# Production mode
uv run --package techconnect-api fastapi run packages/api/app/main.py

# Using uvicorn directly (alternative)
uv run --package techconnect-api uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Backend will be available at:
# - API: http://localhost:8000
# - Docs: http://localhost:8000/docs
```

### Schema Export

```bash
# Export SQLite schema (default)
uv run --package techconnect-schemas export-schema

# Export PostgreSQL schema
uv run --package techconnect-schemas export-schema --dialect postgresql

# Export MySQL schema
uv run --package techconnect-schemas export-schema --dialect mysql
```

### Database Initialization

```bash
# Initialize tables directly in the database (uses DATABASE_URL in the root .env)
uv run --package techconnect-schemas init-db
```

### Building

```bash
# Build all packages
uv build --all-packages

# Build specific package
uv build --package techconnect-api
uv build --package techconnect-schemas
```

### Linting & Formatting (Ruff)

Ruff is used for linting and formatting Python code. It's included in the dev dependencies.

```bash
# Install dev dependencies (includes ruff)
uv sync --all-packages --extra dev

# Check for linting errors
uv run ruff check packages/schemas packages/api

# Check and auto-fix linting errors
uv run ruff check --fix packages/schemas packages/api

# Format Python code
uv run ruff format packages/schemas packages/api

# Check formatting without making changes
uv run ruff format --check packages/schemas packages/api
```

### Type Checking (Pyrefly)

Pyrefly is a fast type checker for Python. It's included in the dev dependencies.

```bash
# Install dev dependencies (includes pyrefly)
uv sync --all-packages --extra dev

# Type check the schemas package
uv run --directory packages/schemas pyrefly check .

# Type check the api package
uv run --directory packages/api pyrefly check .

# Type check from workspace root (run in each package directory)
cd packages/schemas && uv run pyrefly check . && cd ../..
cd packages/api && uv run pyrefly check . && cd ../..
```

### Testing

```bash
# Run API tests
uv run --package techconnect-api pytest

# Run tests with coverage
uv run --package techconnect-api pytest --cov
```

## Packages

### `packages/schemas`

SQLModel schemas for the TechConnect application. Can be used standalone to generate SQL DDL.

```bash
# Export schema to stdout
uv run --package techconnect-schemas export-schema --dialect postgresql

# Initialize database tables
uv run --package techconnect-schemas init-db
```

### `packages/api`

FastAPI API that uses the schemas package.

```bash
# Start development server (with auto-reload)
cd packages/api
uv run fastapi dev app/main.py

# Or from workspace root
uv run --package techconnect-api fastapi dev packages/api/app/main.py
```

## Docker Compose Deployment

A production-oriented Docker Compose stack is available for VPS deployments with multiple services running on the host. It builds the Angular frontend into an Nginx container, runs the FastAPI backend in a separate container, and persists PostgreSQL data in a named volume.

The web container is published on `127.0.0.1:${TECHCONNECT_HTTP_PORT}` so a host-level Nginx instance can front it without exposing the container port directly.

See `docs/docker-compose-deployment.md` for setup and operations.

## Development Workflow

1. **Make schema changes** in `packages/schemas/models/`
2. **Export and apply** DDL to your database or run `uv run --package techconnect-schemas init-db`
3. **Add API endpoints** in `packages/api/app/`

## Adding a New Workspace Package

1. Create the package directory: `packages/my-package/`
2. Add a `pyproject.toml` with the package metadata
3. Update the root `pyproject.toml` to include it in members:

   ```toml
   [tool.uv.workspace]
   members = ["packages/api", "packages/schemas", "packages/my-package"]
   ```

4. Run `uv sync --all-packages`
