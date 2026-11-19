# Registro del despliegue: HRCBIOMODELOS (Hospital Ramón y Cajal)

Estado real del servidor de producción de TechConnect y de todo lo que se ha cambiado en él. El procedimiento general está en [despliegue-produccion-hospital.md](despliegue-produccion-hospital.md); este documento recoge **qué se hizo aquí y con qué valores**.

> Aquí no hay contraseñas ni secretos. Las credenciales de la aplicación están en `/opt/techconnect/.env.docker` (permisos `600`, solo `marcos`) y deben guardarse en el gestor de contraseñas.

Última actualización: 2026-11-19 (v1.1.0).

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
| Versión desplegada | `v1.1.0` (`/opt/techconnect/VERSION`) |
| Fecha del despliegue | 2026-11-19 |
| URL de la aplicación | `https://10.196.58.23/` en cuanto se abran los firewalls de red (certificado temporal). Nombre DNS pendiente (ver [pendientes](#6-pendiente)). Ahora solo por túnel SSH |
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
| Certificado TLS | `/etc/techconnect/tls/` (`techconnect.crt` `644`, `techconnect.key` `600`, `root`) | **Temporal autofirmado** (CN `HRCBIOMODELOS`, SAN `IP:10.196.58.23`, `DNS:HRCBIOMODELOS`), caduca 2027-11-19. Sustituir por el de la CA del hospital |

Estado de partida que **no** se ha cambiado: SELinux desactivado; `/etc/dnf/dnf.conf` usa otro proxy (`172.22.201.205:8080`) que no responde, `subscription-manager` no llega a Red Hat (403 del proxy) y por tanto `dnf` no funciona (ver pendientes); `chronyd` parado y apuntando a `2.rhel.pool.ntp.org`, que no es accesible.

No se ha instalado ningún paquete del sistema: HTTPS lo hace un contenedor Nginx ([guía, opción 6A](despliegue-produccion-hospital.md#6a-nginx-dentro-de-docker-recomendada)).

---

## 3. Aplicación

| Qué | Valor |
| --- | --- |
| Código | `/opt/techconnect` (copiado con `git -c core.autocrlf=false archive` del tag `v1.1.0`; en el servidor no hay `git`) |
| Versión anterior (rollback) | `/opt/techconnect-v1.0.0` (incluye una copia de `.env.docker`; borrar cuando ya no haga falta volver atrás) |
| Configuración | `/opt/techconnect/.env.docker` (`600`, `marcos`), con `COMPOSE_FILE=compose.yaml:compose.tls.yaml` y `TECHCONNECT_TLS_DIR=/etc/techconnect/tls` |
| Proyecto de Compose | `techconnect` → contenedores `techconnect-{db,api,web,tls}-1`, volumen `techconnect_postgres-data` |
| Puertos publicados | `tls`: `0.0.0.0:80` (redirige a HTTPS) y `0.0.0.0:443`. `web`: solo `127.0.0.1:8080`. 8000 y 5432 no están expuestos |
| Administrador inicial | `admin@techconnect.local` (contraseña en `AUTH_BOOTSTRAP_PASSWORD` de `.env.docker`) |
| `AUTH_COOKIE_SECURE` | `true` (HTTPS activo) |
| `AUTH_SESSION_TTL_MINUTES` | `480` (8 h) |

Comprobado: los cuatro contenedores sanos; `http://` redirige a `https://`; `/` redirige a `/es/` o `/en/`; `/api/health` responde por HTTPS; login del administrador correcto con cookie `Secure`; la web sigue llegando a la API después de recrear el contenedor `api`.

### Cómo entrar ahora

Los firewalls de red todavía no dejan llegar a 80/443 desde los PC ni desde la VPN (solo SSH). Mientras tanto, por túnel:

```bash
ssh -L 8443:127.0.0.1:443 marcos@10.196.58.23
```

Con esa sesión abierta: `https://localhost:8443/` en el navegador (aceptar el aviso del certificado temporal).

Cuando Sistemas abra los puertos: `https://10.196.58.23/` (con aviso mientras el certificado sea autofirmado) y, con DNS y certificado del hospital, `https://<nombre-dns>/`.

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
| 2026-11-19 | `v1.0.0` + HTTPS | Prueba del contenedor `tls` (Nginx con HTTPS) con certificado temporal autofirmado copiando los ficheros a mano; `AUTH_COOKIE_SECURE=true` |
| 2026-11-19 | `v1.1.0` | Actualización con el procedimiento de la guía (sección 9, sin git): backup previo, código nuevo con finales LF, `.env.docker` y `backup.sh` conservados, `up -d --build` y `tls` recreado. Verificado: HTTPS, login, datos intactos, backup |

Añade una fila en cada actualización, cambio de configuración o restauración.

---

## 6. Pendiente

Bloqueado por Sistemas:

- [ ] **Nombre DNS interno y certificado TLS** de la CA del hospital.
- [ ] **Abrir 443 (y 80)** hacia `10.196.58.23` en los firewalls de red, desde la red de usuarios y la VPN.
- [ ] **Servidor NTP** para `chronyd` (ahora parado y el reloj sin sincronizar).
- [ ] **Destino para la copia externa de backups** y activar el `rsync` de `backup.sh`.
- [ ] **Arreglar `dnf`** (no bloquea la aplicación, pero sin él no hay parches de seguridad del sistema): proxy `172.22.201.205:8080` sin respuesta y `subscription.rhsm.redhat.com` bloqueado.

Cuando llegue el certificado del hospital:

- [ ] Sustituir `/etc/techconnect/tls/techconnect.{crt,key}` y `docker compose --env-file .env.docker restart tls` ([guía, opción 6A](despliegue-produccion-hospital.md#6a-nginx-dentro-de-docker-recomendada)).
- [ ] Anotar la caducidad del certificado nuevo en la [tabla de cambios](#2-cambios-hechos-en-el-sistema) y poner un recordatorio de renovación.
- [ ] Completar la URL en la [tabla de datos](#1-datos-del-servidor-y-del-despliegue).

Limpieza:

- [ ] Borrar `/opt/techconnect-v1.0.0` cuando la `v1.1.0` lleve unos días funcionando sin problemas (`sudo rm -rf /opt/techconnect-v1.0.0`).

Seguridad (hacer ya):

- [ ] Cambiar la contraseña de `root`, que se compartió por correo.
- [ ] Tras el primer login, guardar la contraseña del administrador en el gestor de contraseñas, borrar `AUTH_BOOTSTRAP_PASSWORD` de `.env.docker` y recrear la API ([guía, sección 7](despliegue-produccion-hospital.md#después-del-primer-login)).
- [ ] Confirmar con el DPD del hospital que el despliegue está autorizado (datos de salud).
