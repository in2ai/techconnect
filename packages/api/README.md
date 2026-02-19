# TechConnect API

FastAPI backend for the TechConnect biomedical research application.

## Quick Start

```bash
# From this directory
uv run fastapi dev app/main.py
```

The server will start at:

- **API**: <http://localhost:8000>
- **Interactive Docs**: <http://localhost:8000/docs>
- **ReDoc**: <http://localhost:8000/redoc>

## Commands

### Development Server

```bash
# Development mode (with auto-reload)
uv run fastapi dev app/main.py

# Custom port
uv run fastapi dev app/main.py --port 8001

# Bind to all interfaces
uv run fastapi dev app/main.py --host 0.0.0.0
```

### Production Server

```bash
# Production mode
uv run fastapi run app/main.py

# Using uvicorn directly
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Testing

> **Note**: Testing, linting, and type-checking require dev dependencies. Install them first:
>
> ```bash
> uv sync --extra dev
> ```

```bash
# Run tests
uv run pytest

# Run tests with verbose output
uv run pytest -v

# Run tests with coverage
uv run pytest --cov
```

### Linting & Formatting

```bash
# Check for linting errors
uv run ruff check .

# Auto-fix linting errors
uv run ruff check --fix .

# Format code
uv run ruff format .
```

### Type Checking

```bash
# Type check with pyrefly
uv run pyrefly check .
```

## Project Structure

```text
app/
├── __init__.py
├── api/
│   ├── dependencies.py
│   ├── endpoints/
│   │   ├── entities.py
│   │   └── health.py
│   └── router.py
├── core/
│   ├── config.py
│   └── database.py
├── services/
│   └── crud.py
└── main.py
tests/
└── test_main.py     # API tests
```

## Environment Variables

- `DATABASE_URL`: SQLAlchemy URL (defaults to `sqlite:///techconnect.db`)
