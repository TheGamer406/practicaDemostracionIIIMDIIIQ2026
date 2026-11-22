# Prueba de Demostración III — Matemática Discreta (FUN-03)

Sitio web que es, en sí mismo, el entregable: por cada uno de los 3 problemas
de la consigna muestra la demostración matemática formal, el código fuente en
**Python** (visible y descargable) y una ejecución interactiva paso a paso —
el código a la izquierda con la línea activa resaltada, y a la derecha el
valor de cada variable en ese instante.

```
.
├── web/                        # Sitio Astro (lo único que se despliega)
│   ├── src/python/             # Los 3 algoritmos en Python (el código que se muestra)
│   ├── scripts/demostracion3.py  # Script standalone descargable (menú por consola)
│   ├── src/lib/                # Espejo en TypeScript + motor de traza paso a paso
│   ├── src/pages/              # 1 página por problema: demostración + ejecución en vivo
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

**Python es el código; TypeScript es el motor de la animación.**
La profesora lee Python, así que el código que se muestra y se descarga es
Python (`src/python/*.py` y `scripts/demostracion3.py`). Pero un navegador no
ejecuta Python, y meter un intérprete completo (Pyodide, ~10 MB) solo para
animar tres bucles no se justificaba. La solución: cada algoritmo tiene un
espejo exacto en `src/lib/*.ts` que, además de calcular el resultado, emite la
secuencia de *frames* de la ejecución (línea activa + estado de cada
variable). Eso es lo que anima la vista lado a lado.

Para que el resaltado no se desincronice al editar el Python, las líneas
relevantes llevan un marcador `#@nombre` al final. `src/lib/pysource.ts` los
convierte en un mapa nombre → número de línea y los borra del código visible,
así que la traza nunca referencia números de línea escritos a mano.

`scripts/demostracion3.py` repite la lógica a propósito: es el entregable
"script independiente" que pide la consigna, y debe poder copiarse y correrse
solo (`python3 demostracion3.py`, sin dependencias) — por eso no importa nada
del resto del proyecto. `npm run sync:sources` copia los `.py` a
`public/download/` (quitando los marcadores) antes de cada `dev` y `build`.

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

**Diseño: pastel saturado, modo claro por defecto.**
Un único sistema de tokens CSS en `src/styles/global.css` define la paleta en
ambos temas; el modo oscuro se activa con `[data-theme="dark"]` en `<html>` y
se recuerda en `localStorage`. El resaltado de sintaxis de Python también se
hace a mano (`highlightPython`) en vez de usar Shiki, para que los colores del
código salgan de esas mismas variables y combinen en los dos temas.

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
descargable, demostración matemática escrita en cada página, y ejecución
interactiva paso a paso en lugar de un video grabado.
