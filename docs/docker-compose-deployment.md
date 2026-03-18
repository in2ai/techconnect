# Docker Compose Deployment

This repository includes a production-oriented Docker Compose stack for a VPS with multiple services.

## Services

- `web`: Nginx container that serves the Angular production build and proxies `/api` to the backend.
- `api`: FastAPI container built from the monorepo with `uv`.
- `db`: PostgreSQL container with a named persistent volume.

Only the `web` service publishes a host port. The database and API stay on the internal Compose network.
The published web port is bound to `127.0.0.1` so it is only reachable from the VPS itself. This is intentional for servers that already use host-level Nginx.

## Files

- `compose.yaml`
- `docker/web.Dockerfile`
- `docker/api.Dockerfile`
- `docker/nginx/default.conf`
- `.env.docker.example`

## First Run

1. Copy the example environment file.

   ```bash
   cp .env.docker.example .env.docker
   ```

2. Set a strong database password in `.env.docker`.

3. Build and start the stack.

   ```bash
   docker compose --env-file .env.docker up -d --build
   ```

4. Either:

   - test locally on the VPS with `curl http://127.0.0.1:${TECHCONNECT_HTTP_PORT}/healthz`
   - or put host-level Nginx in front of the stack using the example below

## Managing the Stack

Start or rebuild:

```bash
docker compose --env-file .env.docker up -d --build
```

Stop:

```bash
docker compose down
```

Show logs:

```bash
docker compose logs -f
```

Seed the database with sample data:

```bash
docker compose --env-file .env.docker exec api uv run --no-sync seed-db
```

## Host Nginx Integration

This VPS already follows the common pattern of one host-level Nginx instance terminating TLS and proxying to local services on `127.0.0.1`. Use the same model here.

1. Keep the Compose stack on an internal loopback port such as `8080`.
2. Create a host-level Nginx site that proxies the public hostname to `127.0.0.1:${TECHCONNECT_HTTP_PORT}`.
3. Let Certbot manage TLS on the host Nginx instance.

Example site file for `/etc/nginx/sites-available/techconnect.in2ai.com`:

```nginx
server {
   server_name techconnect.in2ai.com;

   location / {
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_set_header Host $http_host;
      proxy_set_header X-NginX-Proxy true;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "Upgrade";

      proxy_pass http://127.0.0.1:8080;
      proxy_redirect off;
   }

   listen 443 ssl; # managed by Certbot
   ssl_certificate /etc/letsencrypt/live/techconnect.in2ai.com/fullchain.pem; # managed by Certbot
   ssl_certificate_key /etc/letsencrypt/live/techconnect.in2ai.com/privkey.pem; # managed by Certbot
   include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
   ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
   if ($host = techconnect.in2ai.com) {
      return 301 https://$host$request_uri;
   }

   server_name techconnect.in2ai.com;
   listen 80;
   return 404;
}
```

Then enable the site and issue the certificate:

```bash
sudo ln -s /etc/nginx/sites-available/techconnect.in2ai.com /etc/nginx/sites-enabled/techconnect.in2ai.com
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d techconnect.in2ai.com
```

## Notes

- The backend currently creates tables on startup. That is convenient for bootstrapping but is not a replacement for schema migrations.
- The default frontend API URL is `/api`, so the single-domain Nginx setup works without frontend environment rewrites.
- For production data, back up the `postgres-data` Docker volume.
