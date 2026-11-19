FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy

# Installed from PyPI instead of ghcr.io: restricted networks often allow PyPI
# but block GitHub's container blob storage.
RUN pip install --no-cache-dir uv==0.8.22

WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY packages ./packages

RUN uv sync --package techconnect-api --no-dev --locked

ENV PATH="/app/.venv/bin:${PATH}"

WORKDIR /app/packages/api

EXPOSE 8000

CMD ["uv", "run", "--no-sync", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
