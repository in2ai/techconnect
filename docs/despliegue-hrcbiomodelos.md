# Registro del despliegue: HRCBIOMODELOS (Hospital Ramón y Cajal)

Estado real del servidor de producción de TechConnect y de todo lo que se ha cambiado en él. El procedimiento general está en [despliegue-produccion-hospital.md](despliegue-produccion-hospital.md); este documento recoge **qué se hizo aquí y con qué valores**.

> Aquí no hay contraseñas ni secretos. Las credenciales de la aplicación están en `/opt/techconnect/.env.docker` (permisos `600`, solo `marcos`) y deben guardarse en el gestor de contraseñas.

Última actualización: 2026-11-19.

---

## 1. Datos del servidor y del despliegue

| Dato | Valor |
| --- | --- |
| Servidor | `HRCBIOMODELOS`, RHEL 9.7 (Plow), 2 vCPU, 3,6 GB RAM, 4 GB swap |
| IP | `10.196.58.23` (interfaz `ens192`, red `10.196.58.0/25`) |
| Acceso | SSH desde las IP del hospital o por la VPN del hospital |
| Usuario de trabajo | `marcos` (grupos `wheel` y `docker`), acceso por clave SSH |
| Discos | `/dev/sda` 50 GB (sistema) · `/dev/sdb` 100 GB (datos, montado en `/data`) |
| Proxy de salida | `proxyserviciosjc.madrid.org` (`172.22.201.195`), puerto 80, sin autenticación |
| Docker | Engine 29.10.0 · Compose 5.7.2 · containerd 2.4.2 (almacén de imágenes de containerd) |
| Versión desplegada | `v1.0.0` (`/opt/techconnect/VERSION`) |
| Fecha del despliegue | 2026-11-19 |
| URL de la aplicación | Pendiente de DNS y certificado (ver [pendientes](#6-pendiente)). Ahora solo por túnel SSH |
| Ubicación de los backups | `/data/backups/techconnect` (en el propio servidor; copia externa pendiente) |
| Contacto de Sistemas | Informática GAE Ramón y Cajal Área 4 |
| Contacto técnico de in2ai | Marcos Javier Magni Mattoni |

### Dominios autorizados en el proxy

Pedidos a Sistemas y comprobados desde el servidor:

`registry-1.docker.io`, `auth.docker.io`, `production.cloudflare.docker.com`, `production.cloudfront.docker.com`, `registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org`.

Bloqueados (no hacen falta): `github.com`, `ghcr.io`, `pkg-containers.githubusercontent.com`, `fonts.googleapis.com`, `fonts.gstatic.com`. `download.docker.com` sí responde.

---

## 2. Cambios hechos en el sistema

Copias de los ficheros originales antes de tocarlos: `/root/pre-techconnect-backup/` (`fstab.*`, `daemon.json.*` y la lista de imágenes previa).

| Qué | Dónde | Detalle |
| --- | --- | --- |
| Usuario | `marcos` | `useradd -m -G wheel,docker`; `~/.ssh/authorized_keys` copiado de `root` |
| Disco de datos | `/dev/sdb` → `/data` (XFS, etiqueta `techdata`) | En `/etc/fstab`: `UUID=a6f767b8-6363-4267-bd63-fec176bed549 /data xfs defaults 0 0` |
| Datos de Docker en el disco de datos | `/etc/fstab` | Bind mounts `/data/docker → /var/lib/docker` y `/data/containerd → /var/lib/containerd` |
| Arranque ordenado | `/etc/systemd/system/{docker,containerd}.service.d/data-mounts.conf` | `RequiresMountsFor=/var/lib/docker /var/lib/containerd` |
| Proxy de los demonios | `/etc/systemd/system/{docker,containerd}.service.d/http-proxy.conf` | `HTTP_PROXY`/`HTTPS_PROXY=http://172.22.201.195:80`, `NO_PROXY=localhost,127.0.0.1,::1,10.196.58.0/25` |
| Proxy del cliente `docker` | `/etc/profile.d/docker-proxy.sh` | Mismas variables; solo se carga en sesiones interactivas |
| Proxy dentro de los contenedores de build | `~/.docker/config.json` de `root` y de `marcos` | `noProxy: localhost,127.0.0.1,db,api,web` |
| `daemon.json` | `/etc/docker/daemon.json` | Ya tenía `proxies` (configurado antes de este despliegue); se añadió rotación de logs `json-file`, `20m` × 5 |
| Firewall | firewalld, zona `public` | Añadidos `http` y `https` (había `ssh`, `cockpit`, `dhcpv6-client`) |

Estado de partida que **no** se ha cambiado: SELinux desactivado; `/etc/dnf/dnf.conf` usa otro proxy (`172.22.201.205:8080`) y `dnf` no funciona (ver pendientes); `chronyd` parado.

---

## 3. Aplicación

| Qué | Valor |
| --- | --- |
| Código | `/opt/techconnect` (copiado con `git archive` del tag `v1.0.0`; en el servidor no hay `git`) |
| Configuración | `/opt/techconnect/.env.docker` (`600`, `marcos`) |
| Proyecto de Compose | `techconnect` → contenedores `techconnect-{db,api,web}-1`, volumen `techconnect_postgres-data` |
| Puerto publicado | Solo `127.0.0.1:8080` (contenedor `web`). 8000 y 5432 no están expuestos |
| Administrador inicial | `admin@techconnect.local` (contraseña en `AUTH_BOOTSTRAP_PASSWORD` de `.env.docker`) |
| `AUTH_COOKIE_SECURE` | `false` **temporalmente**, mientras se accede por HTTP con túnel SSH |
| `AUTH_SESSION_TTL_MINUTES` | `480` (8 h) |

Comprobado tras el despliegue: `db` y `api` sanos, `/healthz` y `/api/health` responden, `/` redirige a `/es/` o `/en/`, login del administrador correcto.

### Cómo entrar ahora (sin HTTPS)

```bash
ssh -L 8080:127.0.0.1:8080 marcos@10.196.58.23
```

Con esa sesión abierta: `http://localhost:8080/` en el navegador.

---

## 4. Backups

| Qué | Valor |
| --- | --- |
| Script | `/opt/techconnect/backup.sh` (`700`, `marcos`), igual al de la [sección 8 de la guía](despliegue-produccion-hospital.md#8-copias-de-seguridad) |
| Destino | `/data/backups/techconnect` (`700`); volcados `techconnect_AAAA-MM-DD_HHMM.dump` con permisos `600` |
| Retención | 30 días |
| Programación | crontab de `marcos`: `30 2 * * *` |
| Log | `/var/log/techconnect-backup.log` (`600`, `marcos`); una línea `OK` por volcado |
| Copia fuera del servidor | **Pendiente**: falta el destino de Sistemas |
| Prueba de restauración | 2026-11-19: volcado restaurado en una base temporal, mismas 21 tablas y mismos usuarios que producción |

---

## 5. Historial

| Fecha | Versión | Qué se hizo |
| --- | --- | --- |
| 2026-11-19 | `v1.0.0` | Preparación del servidor (usuario, disco de datos, proxy, logs, firewall), primer despliegue, backups programados y restauración probada |

Añade una fila en cada actualización, cambio de configuración o restauración.

---

## 6. Pendiente

Bloqueado por Sistemas:

- [ ] **Nombre DNS interno y certificado TLS** de la CA del hospital.
- [ ] **Arreglar `dnf`**: la suscripción de RHEL "is not receiving updates" y el repositorio `docker-ce-stable` no descarga. Hace falta para instalar Nginx y aplicar parches.
- [ ] **Servidor NTP** para `chronyd` (ahora parado y el reloj sin sincronizar).
- [ ] **Destino para la copia externa de backups** y activar el `rsync` de `backup.sh`.
- [ ] **Abrir 443 (y 80)** hacia `10.196.58.23` en los firewalls de red, desde la red de usuarios.

Cuando lo anterior esté:

- [ ] Instalar Nginx en el servidor con el certificado ([guía, sección 6](despliegue-produccion-hospital.md#6-nginx-del-servidor-y-https)).
- [ ] Poner `AUTH_COOKIE_SECURE=true` en `.env.docker` y `docker compose --env-file .env.docker up -d`.
- [ ] Completar la URL en la [tabla de datos](#1-datos-del-servidor-y-del-despliegue).

Seguridad (hacer ya):

- [ ] Cambiar la contraseña de `root`, que se compartió por correo.
- [ ] Tras el primer login, guardar la contraseña del administrador en el gestor de contraseñas, borrar `AUTH_BOOTSTRAP_PASSWORD` de `.env.docker` y recrear la API ([guía, sección 7](despliegue-produccion-hospital.md#después-del-primer-login)).
- [ ] Confirmar con el DPD del hospital que el despliegue está autorizado (datos de salud).
