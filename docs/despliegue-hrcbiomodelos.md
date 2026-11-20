# Registro del despliegue: HRCBIOMODELOS (Hospital Ramón y Cajal)

Estado real del servidor de producción de TechConnect y de todo lo que se ha cambiado en él. El procedimiento general está en [despliegue-produccion-hospital.md](despliegue-produccion-hospital.md); este documento recoge **qué se hizo aquí y con qué valores**.

> Aquí no hay contraseñas ni secretos. Las credenciales de la aplicación están en `/opt/techconnect/.env.docker` (permisos `600`, solo `marcos`) y deben guardarse en el gestor de contraseñas.

Última actualización: 2026-11-20 (v1.1.0; DNS creado y CSR enviada a Sistemas).

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
| URL de la aplicación | `https://techconnect.ryc/` (con aviso del navegador hasta que se instale el certificado de CA-RYC). Desde las redes de usuarios del hospital ya hay acceso; desde la VPN solo SSH (túnel) hasta que se amplíe el GAR (ver [pendientes](#6-pendiente)) |
| Nombres DNS (servidores `.ryc` de Sistemas) | `hrcbiomodelos.ryc` (registro A → `10.196.58.23`), `in2aihrc01.ryc` (alias para Sistemas), `techconnect.ryc` (alias funcional de la aplicación, CNAME). Búsqueda DNS del servidor: `salud.madrid.org`; servidores `10.128.66.28`, `10.128.4.45` |
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
| Clave y CSR para CA-RYC | `/etc/techconnect/tls/techconnect-ryc.key` (`600`, RSA 2048) y `techconnect-ryc.csr` | Generadas el 2026-11-20 en el servidor (la clave no ha salido de él). Subject `C=ES, ST=Madrid, L=Madrid, O=IN2AI, OU=ryc, CN=techconnect.ryc`, SAN `DNS:techconnect.ryc`, firma SHA-256. CSR enviada a Sistemas para que la firme CA-RYC |

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
| 2026-11-20 | `v1.1.0` | Sistemas confirma DNS (`techconnect.ryc`) y acceso abierto desde las redes de usuarios. Generadas en el servidor la clave y la CSR para CA-RYC |

Añade una fila en cada actualización, cambio de configuración o restauración.

---

## 6. Pendiente

Bloqueado por Sistemas:

- [x] **Nombre DNS interno**: `techconnect.ryc` (2026-11-20).
- [x] **Acceso desde las redes de usuarios del hospital**: ya permitido por defecto en los firewalls perimetrales.
- [ ] **Certificado TLS de CA-RYC**: CSR enviada el 2026-11-20; falta que Sistemas devuelva el certificado firmado.
- [ ] **Acceso por la VPN a 443 y 80**: hay que pedir la ampliación de destinos del Grupo de Acceso Remoto (GAR) rellenando de nuevo el formulario de acceso a la VPN, solo los Anexos I (modificación, datos y firma del responsable de la empresa) y IV (una línea por destino: `10.196.58.23` TCP `443` y `10.196.58.23` TCP `80`).
- [ ] **Servidor NTP** para `chronyd` (ahora parado y el reloj sin sincronizar).
- [ ] **Destino para la copia externa de backups** y activar el `rsync` de `backup.sh`.
- [ ] **Arreglar `dnf`** (no bloquea la aplicación, pero sin él no hay parches de seguridad del sistema): proxy `172.22.201.205:8080` sin respuesta y `subscription.rhsm.redhat.com` bloqueado.

Cuando llegue el certificado del hospital:

- [ ] Comprobar que el certificado corresponde a `techconnect-ryc.key`, guardar el autofirmado (`techconnect.{crt,key}` → `*.autofirmado`), instalar el nuevo como `techconnect.crt` y `techconnect-ryc.key` como `techconnect.key`, y `docker compose --env-file .env.docker restart tls` ([guía, opción 6A](despliegue-produccion-hospital.md#6a-nginx-dentro-de-docker-recomendada)). CA-RYC firma directamente, sin intermedia.
- [ ] Anotar la caducidad del certificado nuevo en la [tabla de cambios](#2-cambios-hechos-en-el-sistema) y poner un recordatorio de renovación.
- [x] Completar la URL en la [tabla de datos](#1-datos-del-servidor-y-del-despliegue).

Limpieza:

- [ ] Borrar `/opt/techconnect-v1.0.0` cuando la `v1.1.0` lleve unos días funcionando sin problemas (`sudo rm -rf /opt/techconnect-v1.0.0`).

Seguridad (hacer ya):

- [ ] Cambiar la contraseña de `root`, que se compartió por correo.
- [ ] Tras el primer login, guardar la contraseña del administrador en el gestor de contraseñas, borrar `AUTH_BOOTSTRAP_PASSWORD` de `.env.docker` y recrear la API ([guía, sección 7](despliegue-produccion-hospital.md#después-del-primer-login)).
- [ ] Confirmar con el DPD del hospital que el despliegue está autorizado (datos de salud).
