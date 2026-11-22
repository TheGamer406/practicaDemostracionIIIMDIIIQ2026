# Prueba de Demostración III — Matemática Discreta (FUN-03)

Sitio web que es, en sí mismo, el entregable: por cada uno de los 3 problemas
de la consigna muestra la demostración matemática formal, el código fuente
(descargable) y una demo interactiva en vivo para correr el algoritmo con
cualquier lista que se le dé.

```
.
├── web/                  # Sitio Astro (lo único que se despliega)
│   ├── src/lib/          # Lógica de los 3 problemas (TypeScript, una fuente de verdad)
│   ├── src/pages/        # 1 página por problema: demostración + código + demo
│   ├── scripts/cli.mjs   # Script standalone descargable (menú por consola)
│   └── Dockerfile
├── docker-compose.yml    # web (interno) + cloudflared (expone al dominio)
├── deploy.sh             # git pull + docker compose up --build -d
└── .env.example          # CLOUDFLARE_TUNNEL_TOKEN
```

## Por qué cada pieza (el "para qué y por qué")

**Astro, no un framework tipo Next/React completo.**
Las 3 páginas son mayormente contenido estático (el texto de la
demostración); lo único que necesita interactividad es el formulario de
"demo en vivo". Astro renderiza todo a HTML plano y solo envía JavaScript al
navegador para los `<script type="module">` de cada página — no hay runtime
de framework que cargar. Eso significa una imagen Docker más liviana y un
sitio más rápido, sin sacrificar poder correr lógica real en el navegador.

**La lógica vive una sola vez, en `src/lib/*.ts`.**
`calificaciones.astro`, `inventario.astro` y `duplicados.astro` importan esas
funciones tanto para renderizar el código fuente (`import x from "./lib/y.ts?raw"`,
que Vite convierte en el texto del archivo) como para ejecutarlas en vivo en
el navegador. El único sitio donde la lógica se repite intencionalmente es
`scripts/cli.mjs`: es el entregable "script independiente" que pide la
consigna académica, y debe poder copiarse y correrse solo, sin el resto del
proyecto — por eso no importa nada del sitio.

**`@astrojs/node` en modo `standalone`.**
Convierte el sitio en un servidor Node autocontenido (`dist/server/entry.mjs`)
que no depende de una plataforma serverless (Vercel/Netlify) ni de Nginx para
servir — ideal para meterlo en un contenedor Docker simple y correrlo en
cualquier servidor propio.

**Dockerfile multi-stage.**
- `deps`: instala *todas* las dependencias (incluye las de build) y compila (`astro build`).
- `deps-prod`: instala solo dependencias de producción, en paralelo, para la imagen final.
- `runner`: imagen final que **no** contiene el código fuente TypeScript, herramientas de build, ni devDependencies — solo `dist/` + `node_modules` de producción. Esto reduce tamaño de imagen y superficie de ataque, y hace que reconstruir sea más rápido porque Docker cachea las capas de dependencias por separado del código.
- Corre como usuario `node` (no root) dentro del contenedor, por buena práctica de seguridad en contenedores.

**`docker-compose.yml` con 2 servicios, y `web` sin puerto publicado al host.**
`web` usa `expose` (solo visible dentro de la red interna de Docker), no
`ports` (que lo publicaría en el host). El único servicio con salida al
exterior es `cloudflared`. Esto significa que **no hay que abrir ningún
puerto en el firewall del servidor** ni exponer su IP — el tráfico público
entra siempre por el túnel saliente de Cloudflare hacia tu dominio. Es el
modelo de "Cloudflare Tunnel" (zero trust): el servidor nunca escucha
conexiones entrantes de internet.

**Por qué Cloudflare Tunnel y no simplemente abrir el puerto 4321.**
- No necesitas IP pública fija, ni redirigir puertos en el router/firewall.
- El dominio queda protegido detrás de Cloudflare (TLS automático, DDoS, cache).
- Si cambias de servidor o de IP, el túnel sigue funcionando sin tocar DNS.

**`git pull` + `docker compose up --build -d` como flujo de despliegue
(`deploy.sh`), en vez de un pipeline de CI/CD completo.**
Dado el tamaño del proyecto (un sitio estático con una demo cliente, sin
base de datos ni estado), un pipeline de CI/CD agrega complejidad sin
beneficio real. El flujo es: commiteas y pusheas desde tu máquina → en el
servidor corres `./deploy.sh` (o se lo pides a la instancia de Claude Code
que tienes ahí) → hace `git pull --ff-only` seguido de
`docker compose up -d --build`, que reconstruye solo si el código cambió.

## Cómo correr en local

```bash
cd web
npm install
npm run dev        # http://localhost:4321
```

## Cómo desplegar en tu servidor (resumen para la instancia de Claude Code allá)

1. Clonar el repo en el servidor y copiar `.env.example` a `.env`, dejando
   `CLOUDFLARE_TUNNEL_TOKEN` vacío por ahora.
2. En el dashboard de Cloudflare → **Zero Trust → Networks → Tunnels** → crear
   un túnel nuevo, elegir el conector **Docker**, y copiar el token que te da
   (es el valor de `TUNNEL_TOKEN=...` en el comando que muestra Cloudflare).
   Pegarlo en `.env` como `CLOUDFLARE_TUNNEL_TOKEN=<token>`.
3. En la configuración del túnel, agregar un **Public Hostname**: el
   subdominio que quieras (ej. `discreta.tudominio.com`) apuntando al
   servicio `http://web:4321` (ese es el nombre del servicio Docker, no
   `localhost`, porque `cloudflared` y `web` están en la misma red de
   `docker compose`).
4. Correr `./deploy.sh` en el servidor. Esto deja `web` escuchando solo
   internamente y `cloudflared` abriendo el túnel hacia Cloudflare, que lo
   expone en el subdominio configurado.
5. Para actualizar después de un nuevo commit: volver a correr `./deploy.sh`.

## Relación con el entregable académico

La consigna original (`Prueba de demostración 3.pdf`) pedía subir a Moodle un
ZIP/RAR con código + documento + video. Se decidió no hacer esa entrega por
separado: el sitio web **es** el entregable completo — código visible y
descargable, demostración matemática escrita en cada página, y demo en vivo
en lugar de un video grabado.
