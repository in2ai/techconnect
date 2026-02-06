# TechConnect Backend Monorepo

A UV workspace monorepo for the TechConnect biomedical research application api and schemas.

## Structure

```
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

# Run backend development server
uv run --package techconnect-api uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Export SQL schema
uv run --package techconnect-schemas export-schema --dialect postgresql
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
# Run FastAPI backend
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

### Building

```bash
# Build all packages
uv build --all-packages

# Build specific package
uv build --package techconnect-api
uv build --package techconnect-schemas
```

### Linting & Formatting

```bash
# Lint Python code
uv run ruff check packages/schemas packages/api

# Format Python code
uv run ruff format packages/schemas packages/api
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
```

### `packages/api`

FastAPI API that uses the schemas package.

```bash
# Start development server
uv run --package techconnect-api uvicorn app.main:app --reload
```

## Frontend

The frontend is a separate project located in the `frontend/` directory (sibling to this workspace).

```bash
cd ../frontend
pnpm install
pnpm dev
# Available at http://localhost:5173
```

## Development Workflow

1. **Make schema changes** in `packages/schemas/models/`
2. **Export and apply** DDL to your database
3. **Add API endpoints** in `packages/api/app/`
4. **Update frontend** in `frontend/src/`

## Adding a New Workspace Package

1. Create the package directory: `packages/my-package/`
2. Add a `pyproject.toml` with the package metadata
3. Update the root `pyproject.toml` to include it in members:
   ```toml
   [tool.uv.workspace]
   members = ["packages/api", "packages/schemas", "packages/my-package"]
   ```
4. Run `uv sync --all-packages`

## License

Private
