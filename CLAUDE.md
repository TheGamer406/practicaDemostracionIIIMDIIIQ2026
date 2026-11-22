# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

The implementation is an Astro site under `web/`, plus deployment config at
the repo root (`docker-compose.yml`, `deploy.sh`, `.env.example`). See
`README.md` for the full rationale of each piece (Astro, Docker multi-stage,
Cloudflare Tunnel, git-pull deploy flow).

- **Shared logic**: `web/src/lib/{grades,inventory,duplicates}.ts` — one file
  per problem, pure TypeScript functions, no framework dependency. This is
  the single source of truth for the algorithms.
- **Pages**: `web/src/pages/{calificaciones,inventario,duplicados}.astro` —
  each renders the formal math write-up, the problem's source file (via
  `?raw` import), and a client-side `<script type="module">` that imports
  the lib functions directly to run a live, interactive demo in the browser.
- **Standalone CLI**: `web/scripts/cli.mjs` is an intentionally
  self-contained duplicate of the three algorithms (menu + stdin prompts,
  zero dependencies) — it is the literal "script" deliverable the rubric
  asks for, meant to be downloaded and run on its own, so it does not import
  from `src/lib`. It's synced into `web/public/download/cli.mjs` via
  `npm run sync:cli` (runs automatically on `predev`/`prebuild`).
- **Run locally**: `cd web && npm install && npm run dev`.
- **Build**: `cd web && npm run build` (outputs a Node standalone server via
  `@astrojs/node`, entry at `dist/server/entry.mjs`).
- **Docker**: `docker build -t discreta-web ./web`, or from the repo root
  `docker compose up -d --build` (brings up `web` + `cloudflared`).
- No test suite exists; correctness was verified manually by running the
  built site and the CLI end-to-end (see commit history / README).

This web app is a presentation/demo layer, not a replacement for the
academic deliverable below — the ZIP still needs the source code, written
document, and video per the assignment's own format.

## Assignment context

This is "Prueba de Demostración III" for the course FUN-03 (Matemática Discreta), Universidad CENFOTEC, due 2026-11-21 (Week 12), worth 10% / 40 points. Work may be done individually or in groups.

The task: build one program (any language — Python, Java, C++, JS, etc.) that receives list-based input from the user, processes it per the problem's rules, and returns/prints results. It must implement solutions to three problems:

1. **Clasificación de Estudiantes por Calificaciones** — given a list of student grades, bucket each into a letter-grade range (90-100: A, 80-89: B, 70-79: C, 60-69: D, 0-59: F) and return a dictionary/map counting students per range.
2. **Análisis de Productos en Inventario** — given a dict of product name → available quantity, and a list of demanded quantities per product, determine for each demanded product whether stock is sufficient, and count how many products fall short.
3. **Juego de Secuencias Numéricas** — given a list of numbers, detect duplicates (pigeonhole principle). Return the list of duplicated values if any exist, otherwise a message stating all numbers are unique.

## Deliverable format

Final submission is a single compressed archive (ZIP or RAR) containing:
- The source code (script in the language of choice).
- A written document walking through how each problem was solved mathematically/algorithmically (formal demonstration method, e.g. induction, set theory, pigeonhole) and how the code was refined based on results.
- A video demonstrating the code running.

## Grading emphasis

The rubric (see page 5 of the PDF) grades on: use of a formal mathematical demonstration method with full justifications, correctness/rigor of mathematical results, correctness of the mathematical process behind each solution, and complete/adequate delivery of all three problems — not just working code. When implementing or reviewing solutions, prioritize making the underlying mathematical reasoning (induction, set operations, pigeonhole principle) explicit and well-justified, not just producing correct output.
