# Despliegue de TechConnect en producción (servidores internos del hospital)

Guía paso a paso para desplegar TechConnect en un servidor Linux de la red interna del hospital. Está pensada para producción: la aplicación guarda **datos clínicos de pacientes**, así que la seguridad, las copias de seguridad y el control de versiones no son opcionales.

> Donde veas valores de ejemplo (`techconnect.hospital.local`, `/opt/techconnect`, `proxy.hospital.local:8080`…), sustitúyelos por los reales que te dé el departamento de Sistemas del hospital.

---

## 1. Qué se despliega

El despliegue usa Docker Compose con tres contenedores, definidos en [compose.yaml](../compose.yaml):

```text
 Usuarios (navegador, red del hospital)
        │  HTTPS :443
        ▼
 ┌──────────────────────────────┐
 │ Nginx del servidor (host)    │  ← termina TLS con el certificado del hospital
 └──────────────┬───────────────┘
                │  HTTP 127.0.0.1:8080 (solo accesible desde el propio servidor)
 ┌──────────────▼───────────────────────────────────────────────┐
 │ Docker Compose                                               │
 │  web  (Nginx + Angular)  → sirve /en/ y /es/, proxy de /api  │
 │  api  (FastAPI/uvicorn)  → puerto 8000, solo red interna     │
 │  db   (PostgreSQL 17)    → puerto 5432, solo red interna     │
 │        └─ volumen persistente: postgres-data                 │
 └──────────────────────────────────────────────────────────────┘
```

- Solo el contenedor `web` publica un puerto, y únicamente en `127.0.0.1`. La API y la base de datos **no** son accesibles desde fuera de Docker.
- Toda la información vive en el volumen Docker `techconnect_postgres-data`. No hay ficheros subidos en disco: las importaciones Excel/CSV se procesan y se guardan en la base de datos.
- Las tablas se crean automáticamente al arrancar la API (no hay sistema de migraciones; ver [sección 9](#9-actualizar-a-una-nueva-versión)).

Ficheros relevantes del repositorio:

| Fichero | Para qué sirve |
| --- | --- |
| [compose.yaml](../compose.yaml) | Definición de los tres servicios |
| [docker/api.Dockerfile](../docker/api.Dockerfile) | Imagen de la API (Python 3.14 + uv) |
| [docker/web.Dockerfile](../docker/web.Dockerfile) | Compila Angular y lo sirve con Nginx |
| [docker/nginx/default.conf](../docker/nginx/default.conf) | Nginx interno: idiomas, SPA y proxy `/api` |
| [.env.docker.example](../.env.docker.example) | Plantilla de variables de entorno |
| [docs/examples/techconnect.nginx.site.conf](examples/techconnect.nginx.site.conf) | Ejemplo de Nginx del host (versión VPS con Let's Encrypt) |

---

## 2. Antes de empezar: qué pedir a Sistemas del hospital

Resuelve esto **antes** del día del despliegue; casi todos los bloqueos vienen de aquí.

- [ ] **Servidor**: Linux x86_64 (Ubuntu 22.04/24.04, Debian 12 o RHEL/Rocky 9). Mínimo recomendado: 2 vCPU, 4 GB de RAM (compilar Angular consume bastante memoria), 30 GB de disco más el espacio para backups.
- [ ] **Usuario con sudo** y acceso SSH al servidor.
- [ ] **Docker Engine ≥ 24 con el plugin Compose v2** (`docker compose`, no `docker-compose`). Si solo permiten Podman, avísanos: el stack no está validado con Podman.
- [ ] **Nombre DNS interno** para la aplicación (p. ej. `techconnect.hospital.local`) apuntando a la IP del servidor.
- [ ] **Certificado TLS** para ese nombre, emitido por la CA interna del hospital (fichero `.crt` con la cadena intermedia + fichero `.key`). En una red interna **Let's Encrypt/Certbot no funciona**, no uses el ejemplo de Certbot del repo tal cual.
- [ ] **Acceso a Internet de salida** desde el servidor, o en su defecto el proxy corporativo. Para construir las imágenes hace falta llegar a: Docker Hub (`registry-1.docker.io`), `ghcr.io`, `registry.npmjs.org`, `pypi.org` y `files.pythonhosted.org`. Si no hay salida, usa la [sección 4B](#4b-servidor-sin-acceso-a-internet-construir-fuera-y-trasladar-imágenes).
- [ ] **Firewall**: abrir 443/TCP (y 80/TCP solo para redirigir a HTTPS) desde la red de usuarios. SSH solo desde la red de administración. **Nunca** exponer 5432 ni 8000.
- [ ] **Política de backups**: dónde se deben copiar los volcados de base de datos fuera del servidor (NAS, almacenamiento de backup del hospital) y cuánto tiempo se retienen.
- [ ] **Protección de datos**: confirmar con el DPD/Seguridad de la Información del hospital que el despliegue está autorizado. Son datos de salud (categoría especial, art. 9 RGPD / LOPDGDD).
- [ ] **Hora del servidor sincronizada (NTP)**: las sesiones de usuario caducan según la hora del sistema.

---

## 3. Preparar el servidor

Instala Docker siguiendo la guía oficial para la distribución (<https://docs.docker.com/engine/install/>) y comprueba:

```bash
docker --version          # >= 24
docker compose version    # v2.x
sudo systemctl enable --now docker
```

Añade tu usuario al grupo `docker` (cierra sesión y vuelve a entrar después):

```bash
sudo usermod -aG docker $USER
```

### Rotación de logs de Docker (importante)

Por defecto Docker guarda los logs de los contenedores sin límite y acaban llenando el disco. Crea o edita `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "20m", "max-file": "5" }
}
```

```bash
sudo systemctl restart docker
```

### Si el hospital usa proxy de salida

1. **Para que Docker pueda descargar imágenes** (`postgres`, `node`, `python`, `nginx`…), configura el proxy del demonio:

   ```bash
   sudo mkdir -p /etc/systemd/system/docker.service.d
   sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf >/dev/null <<'EOF'
   [Service]
   Environment="HTTP_PROXY=http://proxy.hospital.local:8080"
   Environment="HTTPS_PROXY=http://proxy.hospital.local:8080"
   Environment="NO_PROXY=localhost,127.0.0.1"
   EOF
   sudo systemctl daemon-reload && sudo systemctl restart docker
   ```

2. **Para que `npm` y `uv` puedan descargar dependencias durante el build**, crea `~/.docker/config.json` en el usuario que vaya a lanzar el build:

   ```json
   {
     "proxies": {
       "default": {
         "httpProxy": "http://proxy.hospital.local:8080",
         "httpsProxy": "http://proxy.hospital.local:8080",
         "noProxy": "localhost,127.0.0.1,db,api,web"
       }
     }
   }
   ```

   `db,api,web` en `noProxy` es **obligatorio**: esta configuración también se inyecta en los contenedores y, sin ella, la API intentaría llegar a la base de datos a través del proxy.

3. Si el proxy hace **inspección TLS** (sustituye certificados), `npm ci` y `uv sync` fallarán con errores tipo `SELF_SIGNED_CERT_IN_CHAIN` o `certificate verify failed`. En ese caso lo más sencillo es construir las imágenes fuera ([sección 4B](#4b-servidor-sin-acceso-a-internet-construir-fuera-y-trasladar-imágenes)) o pedir a Sistemas una excepción del proxy para esos dominios.

---

## 4. Configurar y construir

### 4.1 Fichero de entorno `.env.docker`

```bash
cd /opt/techconnect
cp .env.docker.example .env.docker
chmod 600 .env.docker
```

Genera contraseñas fuertes. Usa formato hexadecimal para la de PostgreSQL: va dentro de una URL y los caracteres especiales (`@`, `:`, `/`, `#`…) la romperían.

```bash
openssl rand -hex 24     # contraseña de PostgreSQL
openssl rand -base64 18  # contraseña inicial del administrador
```

Edita `.env.docker`:

```bash
TECHCONNECT_HTTP_PORT=8080

POSTGRES_DB=techconnect
POSTGRES_USER=techconnect
POSTGRES_PASSWORD=<contraseña-hex-generada>

# Debe usar LA MISMA contraseña que POSTGRES_PASSWORD. El host es "db" (nombre del servicio).
DATABASE_URL=postgresql://techconnect:<contraseña-hex-generada>@db:5432/techconnect

# Administrador inicial (se crea en el primer arranque)
AUTH_BOOTSTRAP_EMAIL=<email-del-responsable>@hospital.es
AUTH_BOOTSTRAP_PASSWORD=<contraseña-admin-generada>
AUTH_BOOTSTRAP_FULL_NAME="Administrador TechConnect"

# Producción: cookies de sesión solo por HTTPS
AUTH_COOKIE_SECURE=true
# Duración de la sesión en minutos (por defecto 720 = 12 h). Ajustar a la política del hospital.
AUTH_SESSION_TTL_MINUTES=480
```

Referencia de todas las variables:

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `TECHCONNECT_HTTP_PORT` | No (8080) | Puerto de `127.0.0.1` donde escucha el contenedor `web`. Cámbialo si el 8080 ya está ocupado en el servidor. |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | Sí | Credenciales de PostgreSQL. **Solo se aplican la primera vez** que se crea el volumen (ver [problemas comunes](#11-problemas-comunes)). |
| `DATABASE_URL` | Sí | Cadena de conexión que usa la API. Si falta, la API usa SQLite dentro del contenedor y **se perderían los datos**. |
| `AUTH_BOOTSTRAP_EMAIL` / `AUTH_BOOTSTRAP_PASSWORD` | Sí (primer arranque) | Crea el primer usuario administrador si no existe. |
| `AUTH_BOOTSTRAP_FULL_NAME` | No | Nombre visible del administrador inicial. |
| `AUTH_COOKIE_SECURE` | Sí en producción | `true`: la cookie de sesión solo viaja por HTTPS. |
| `AUTH_SESSION_TTL_MINUTES` | No (720) | Caducidad de las sesiones. |
| `AUTH_COOKIE_SAME_SITE` | No (`lax`) | No cambiar salvo indicación nuestra. |

`.env.docker` contiene secretos: no lo subas a git (ya está en `.gitignore`), no lo mandes por correo ni chat, y guarda las contraseñas en el gestor de contraseñas que use el hospital.

### 4A. Construir en el propio servidor (con acceso a Internet o proxy)

```bash
cd /opt/techconnect
docker compose --env-file .env.docker build
```

El primer build tarda varios minutos (sobre todo la compilación de Angular).

### 4B. Servidor sin acceso a Internet: construir fuera y trasladar imágenes

En un equipo con Internet y **la misma arquitectura** (x86_64), con el repositorio clonado también en un directorio llamado `techconnect` y en el mismo tag:

```bash
cd techconnect
git checkout v1.0.0
docker compose build
docker pull postgres:17-alpine
docker save techconnect-api:latest techconnect-web:latest postgres:17-alpine \
  | gzip > techconnect-v1.0.0-images.tar.gz
sha256sum techconnect-v1.0.0-images.tar.gz > techconnect-v1.0.0-images.tar.gz.sha256
```

Copia el `.tar.gz` y su `.sha256` al servidor por el canal que autorice Sistemas y cárgalo:

```bash
sha256sum -c techconnect-v1.0.0-images.tar.gz.sha256
gunzip -c techconnect-v1.0.0-images.tar.gz | docker load
```

En el servidor también hace falta el repositorio (al menos `compose.yaml` y `docker/`) en `/opt/techconnect`, en el mismo tag. A partir de aquí, arranca siempre con `--no-build` para que Compose no intente construir:

```bash
docker compose --env-file .env.docker up -d --no-build
```

---

## 5. Primer arranque

```bash
cd /opt/techconnect
docker compose --env-file .env.docker up -d
docker compose --env-file .env.docker ps
```

Los tres servicios deben aparecer como `running` y `db` y `api` como `(healthy)`. El orden de arranque es automático: `db` → `api` (espera a que la base de datos esté sana) → `web` (espera a la API).

Comprobaciones desde el propio servidor:

```bash
curl -s http://127.0.0.1:8080/healthz           # → ok          (Nginx interno)
curl -s http://127.0.0.1:8080/api/health        # → {"status":"healthy"}  (API + base de datos)
docker compose --env-file .env.docker logs --tail=50 api
```

Al arrancar, la API crea las tablas y el usuario administrador definido en `AUTH_BOOTSTRAP_*`.

> Usa siempre `--env-file .env.docker` en los comandos de Compose. Sin él, Compose no lee `TECHCONNECT_HTTP_PORT` y usa el puerto por defecto.

---

## 6. Nginx del servidor y HTTPS

El contenedor `web` solo escucha en `127.0.0.1:8080`. Los usuarios entran por un Nginx instalado en el propio servidor, que termina HTTPS con el certificado del hospital.

```bash
# Ubuntu/Debian
sudo apt install nginx
# RHEL/Rocky
sudo dnf install nginx
```

Copia el certificado y la clave:

```bash
sudo mkdir -p /etc/nginx/ssl
sudo cp techconnect.crt /etc/nginx/ssl/   # certificado + cadena intermedia concatenados
sudo cp techconnect.key /etc/nginx/ssl/
sudo chmod 600 /etc/nginx/ssl/techconnect.key
```

Crea el sitio (`/etc/nginx/sites-available/techconnect.conf` en Debian/Ubuntu, o `/etc/nginx/conf.d/techconnect.conf` en RHEL):

```nginx
server {
    listen 80;
    server_name techconnect.hospital.local;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name techconnect.hospital.local;

    ssl_certificate     /etc/nginx/ssl/techconnect.crt;
    ssl_certificate_key /etc/nginx/ssl/techconnect.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # Importaciones de Excel/ZIP desde Admin → Transferencia de datos
    client_max_body_size 50m;

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy same-origin always;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Las importaciones grandes pueden tardar
        proxy_read_timeout 300s;
    }
}
```

Actívalo y recarga:

```bash
# Solo Debian/Ubuntu:
sudo ln -s /etc/nginx/sites-available/techconnect.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t && sudo systemctl reload nginx
sudo systemctl enable nginx
```

En **RHEL/Rocky con SELinux activo**, Nginx no puede conectar con `127.0.0.1:8080` hasta que lo permitas:

```bash
sudo setsebool -P httpd_can_network_connect 1
```

Si el servidor tiene firewall local:

```bash
# Ubuntu (ufw)
sudo ufw allow 443/tcp && sudo ufw allow 80/tcp
# RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=https --add-service=http && sudo firewall-cmd --reload
```

---

## 7. Verificación final y primeros pasos

Desde un PC de la red del hospital:

- [ ] `https://techconnect.hospital.local/` redirige a `/es/` o `/en/` según el idioma del navegador, y el certificado aparece como válido (sin aviso).
- [ ] `http://techconnect.hospital.local/` redirige a HTTPS.
- [ ] El login funciona con el administrador inicial y, al recargar la página, **la sesión se mantiene** (si se pierde, revisa `AUTH_COOKIE_SECURE` y que estés entrando por HTTPS).
- [ ] Se pueden crear y ver registros (paciente, tumor…).
- [ ] *Admin → Transferencia de datos*: descargar la plantilla y la exportación funcionan; una importación de prueba de más de 1 MB no da error 413.
- [ ] Desde otro equipo, los puertos 8080, 8000 y 5432 del servidor **no** responden.
- [ ] Reinicia el servidor (`sudo reboot`) y comprueba que todo vuelve a arrancar solo (los servicios tienen `restart: unless-stopped`).
- [ ] El backup automático está programado y has probado una restauración ([sección 8](#8-copias-de-seguridad)).

### Después del primer login

1. **Cambia de sitio las credenciales iniciales.** Cuando hayas comprobado que el administrador entra, borra `AUTH_BOOTSTRAP_PASSWORD` de `.env.docker` y recrea la API (`docker compose --env-file .env.docker up -d api`). Ten en cuenta que en cada arranque la API vuelve a dar permisos de administrador y a reactivar el usuario de `AUTH_BOOTSTRAP_EMAIL`. Si algún día hay que desactivar esa cuenta, quita también esa variable.
2. **Crear usuarios.** La aplicación todavía no tiene pantalla de gestión de usuarios; se crean desde el servidor con este comando (pide los datos de forma interactiva y la contraseña no se muestra):

   ```bash
   cd /opt/techconnect
   docker compose --env-file .env.docker exec -it api python -c '
   import getpass
   from sqlmodel import Session, select
   from app.core.database import get_engine
   from app.core.security import hash_password, normalize_email
   from models import AuthUser
   email = normalize_email(input("Email: "))
   nombre = input("Nombre completo: ")
   admin = input("¿Administrador? (s/N): ").strip().lower() == "s"
   pwd = getpass.getpass("Contraseña: ")
   with Session(get_engine()) as s:
       if s.exec(select(AuthUser).where(AuthUser.email == email)).first():
           raise SystemExit(f"Ya existe un usuario con email {email}")
       s.add(AuthUser(email=email, password_hash=hash_password(pwd), full_name=nombre, is_active=True, is_admin=admin))
       s.commit()
   print("Usuario creado:", email)
   '
   ```

   En la interfaz, los usuarios no administradores solo pueden consultar datos. Crear, editar e importar/exportar queda reservado a los administradores.

3. **Cambiar la contraseña de un usuario** (por ejemplo, si la olvida):

   ```bash
   docker compose --env-file .env.docker exec -it api python -c '
   import getpass
   from sqlmodel import Session, select
   from app.core.database import get_engine
   from app.core.security import hash_password, normalize_email
   from models import AuthUser
   email = normalize_email(input("Email: "))
   with Session(get_engine()) as s:
       user = s.exec(select(AuthUser).where(AuthUser.email == email)).first()
       if user is None:
           raise SystemExit(f"No existe {email}")
       user.password_hash = hash_password(getpass.getpass("Nueva contraseña: "))
       s.add(user)
       s.commit()
   print("Contraseña actualizada:", email)
   '
   ```

### Lo que NUNCA se debe ejecutar en producción

- `seed-db` (`docker compose exec api uv run --no-sync seed-db`): carga datos de demostración **y crea usuarios con contraseñas conocidas** (`admin@techconnect.local` / `techconnect-dev-password` y `viewer@techconnect.local` / `viewerpassword`). Si alguien lo ejecuta por error, borra o desactiva esos usuarios de inmediato.
- `packages/api/create_viewer.py`: script de pruebas, crea un usuario con contraseña conocida.
- Copiar el fichero `techconnect.db` del repositorio: es una base de datos SQLite de desarrollo.
- `docker compose down -v`: la opción `-v` **borra el volumen con todos los datos**.

---

## 8. Copias de seguridad

Todos los datos están en PostgreSQL. Haz un volcado diario con `pg_dump` y copia el fichero **fuera del servidor**.

Script `/opt/techconnect/backup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /opt/techconnect
DEST=/var/backups/techconnect
RETENTION_DAYS=30
STAMP=$(date +%F_%H%M)

mkdir -p "$DEST"
docker compose --env-file .env.docker exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "$DEST/techconnect_$STAMP.dump"

# Un volcado vacío o muy pequeño indica un error
test "$(stat -c %s "$DEST/techconnect_$STAMP.dump")" -gt 1024

find "$DEST" -name 'techconnect_*.dump' -mtime +"$RETENTION_DAYS" -delete

# Copia fuera del servidor (adaptar al destino que indique Sistemas):
# rsync -a "$DEST/" backup@nas.hospital.local:/backups/techconnect/
```

```bash
chmod 700 /opt/techconnect/backup.sh
sudo mkdir -p /var/backups/techconnect && sudo chown $USER:$USER /var/backups/techconnect
chmod 700 /var/backups/techconnect
crontab -e
# Añadir (todos los días a las 02:30):
30 2 * * * /opt/techconnect/backup.sh >> /var/log/techconnect-backup.log 2>&1
```

Los volcados contienen datos de pacientes: el directorio debe tener permisos restringidos y la copia externa tiene que cumplir la política de cifrado del hospital.

### Restaurar un backup

Prueba la restauración **al menos una vez antes de dar el sistema por terminado** (un backup que nunca se ha restaurado no es un backup):

```bash
cd /opt/techconnect
docker compose --env-file .env.docker stop web api
docker compose --env-file .env.docker exec -T db \
  sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' \
  < /var/backups/techconnect/techconnect_AAAA-MM-DD_HHMM.dump
docker compose --env-file .env.docker start api web
```

Como complemento (no sustituto), un administrador puede descargar el dataset completo en Excel o CSV desde *Admin → Transferencia de datos*.

---

## 9. Actualizar a una nueva versión

1. **Avisa a los usuarios** de la ventana de mantenimiento (unos minutos sin servicio).
2. **Haz un backup manual** justo antes:

   ```bash
   /opt/techconnect/backup.sh
   ```

3. Anota la versión actual para poder volver atrás: `git describe --tags`.
4. Actualiza el código y reconstruye:

   ```bash
   cd /opt/techconnect
   git fetch --tags
   git checkout v1.1.0
   docker compose --env-file .env.docker up -d --build
   # (Sin Internet: cargar las imágenes nuevas como en la sección 4B y usar --no-build)
   docker compose --env-file .env.docker ps
   ```

5. Repite las comprobaciones de la [sección 7](#7-verificación-final-y-primeros-pasos).
6. Limpia imágenes antiguas cuando todo funcione: `docker image prune`.

### Cambios en la base de datos: leer antes de cada actualización

La API solo **crea tablas nuevas** al arrancar; **no modifica tablas existentes** (no añade ni cambia columnas). Si una versión nueva cambia columnas de una tabla existente, la aplicación fallará con errores de base de datos hasta aplicar el cambio a mano. Por eso:

- Antes de actualizar, pregúntanos si la versión incluye cambios de esquema. Puedes comprobarlo tú misma con `git diff v1.0.0 v1.1.0 -- packages/schemas/models/`.
- Si los hay, te pasaremos el SQL a aplicar y se ejecutará después del backup:

  ```bash
  docker compose --env-file .env.docker exec -T db \
    sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' < cambios.sql
  ```

### Volver atrás (rollback)

```bash
cd /opt/techconnect
git checkout v1.0.0     # versión anterior
docker compose --env-file .env.docker up -d --build
```

Si la versión nueva había modificado la base de datos, restaura además el backup previo a la actualización ([sección 8](#restaurar-un-backup)).

---

## 10. Operación diaria

| Tarea | Comando (desde `/opt/techconnect`) |
| --- | --- |
| Estado de los servicios | `docker compose --env-file .env.docker ps` |
| Logs en directo | `docker compose --env-file .env.docker logs -f` |
| Logs de un servicio | `docker compose --env-file .env.docker logs --tail=200 api` |
| Reiniciar la API | `docker compose --env-file .env.docker restart api` |
| Aplicar cambios de `.env.docker` | `docker compose --env-file .env.docker up -d` (`restart` **no** relee el fichero) |
| Parar todo (conserva datos) | `docker compose --env-file .env.docker down` |
| Arrancar todo | `docker compose --env-file .env.docker up -d` |
| Espacio en disco de Docker | `docker system df` |
| Consola de PostgreSQL | `docker compose --env-file .env.docker exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'` |

Monitorización mínima recomendada: que el sistema de monitorización del hospital (Zabbix, Nagios, etc.) compruebe cada pocos minutos `https://techconnect.hospital.local/api/health` (debe devolver HTTP 200) y el espacio libre en disco.

---

## 11. Problemas comunes

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| `413 Request Entity Too Large` al importar | Falta `client_max_body_size` en el Nginx del host (el interno ya admite 50 MB) | Revisar la configuración de la [sección 6](#6-nginx-del-servidor-y-https) |
| El login parece funcionar, pero vuelve a la pantalla de login | `AUTH_COOKIE_SECURE=true` y se está entrando por HTTP | Entrar por `https://`; comprobar la redirección 80 → 443 |
| `502 Bad Gateway` | La API o `web` no están levantados o no están sanos | `docker compose ps` y `docker compose logs api` |
| `502` en RHEL con los contenedores sanos | SELinux bloquea a Nginx | `sudo setsebool -P httpd_can_network_connect 1` |
| `api` en bucle de reinicio con `password authentication failed` | Se cambió `POSTGRES_PASSWORD` después de crear el volumen (Postgres solo la aplica la primera vez) | Volver a poner la contraseña original, o cambiarla dentro de Postgres: `ALTER USER techconnect PASSWORD '...';` y actualizar `DATABASE_URL` |
| Los datos "desaparecen" tras redesplegar | Se ha usado otro directorio (otro nombre de proyecto, otro volumen) o se ejecutó `down -v` | Comprobar `docker volume ls`; restaurar el último backup |
| Falta `DATABASE_URL` y la API arranca igual | La API usa SQLite dentro del contenedor | Corregir `.env.docker`; nunca operar así en producción |
| `npm ci` / `uv sync` fallan en el build con errores de certificado | Proxy con inspección TLS | Excepción en el proxy o construir fuera ([sección 4B](#4b-servidor-sin-acceso-a-internet-construir-fuera-y-trasladar-imágenes)) |
| `bind: address already in use` al arrancar | El puerto 8080 ya lo usa otro servicio del servidor | Cambiar `TECHCONNECT_HTTP_PORT` y el `proxy_pass` del Nginx del host |
| El build de `web` se corta sin error claro | Falta de memoria al compilar Angular | Más RAM/swap en el servidor o construir fuera |

---

## 12. Resumen de seguridad

- Solo 443 (y 80 para redirigir) abiertos a los usuarios; 5432, 8000 y 8080 nunca expuestos.
- HTTPS con certificado del hospital y `AUTH_COOKIE_SECURE=true`.
- `.env.docker` con permisos `600`; contraseñas generadas aleatoriamente y guardadas en el gestor del hospital.
- Credenciales iniciales retiradas de `.env.docker` después del primer login.
- Nada de datos de demostración (`seed-db`) ni usuarios de prueba.
- Backups diarios, copiados fuera del servidor, con permisos restringidos y restauración probada.
- Versiones desplegadas siempre desde un tag de git, con backup antes de cada actualización.
- Sistema operativo y Docker actualizados con los parches de seguridad según la política del hospital.

---

## 13. Datos del despliegue (rellenar)

| Dato | Valor |
| --- | --- |
| Servidor (nombre / IP) | |
| URL de la aplicación | |
| Versión (tag) desplegada | |
| Fecha del despliegue | |
| Ubicación de los backups externos | |
| Contacto de Sistemas del hospital | |
| Contacto técnico de in2ai | |
