# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

The implementation is an Astro site under `web/`, plus deployment config at
the repo root (`docker-compose.yml`, `deploy.sh`, `.env.example`). See
`README.md` for the full rationale of each piece (Astro, Docker multi-stage,
Cloudflare Tunnel, git-pull deploy flow).

- **Python sources (the deliverable)**: `web/src/python/{calificaciones,
  inventario,duplicados}.py` are the algorithms as shown on the site, and
  `web/scripts/demostracion3.py` is the standalone CLI (menu + stdin prompts,
  stdlib only) meant to be downloaded and run on its own. Python was chosen
  because the professor reads Python.
- **Line markers**: the per-problem `.py` files carry `#@name` comments at the
  end of certain lines. `web/src/lib/pysource.ts` (`parsePython`) turns them
  into a name → line-number map and strips them from the displayed code, so
  the step-through highlight never hardcodes line numbers. If you add a trace
  step, add the matching marker; if you remove a marker, remove the step.
- **Trace engine**: `web/src/lib/{grades,inventory,duplicates}.ts` hold a
  TypeScript mirror of each algorithm plus a `trace*()` function returning
  `Frame[]` (see `web/src/lib/trace.ts`): each frame is one marker + a prose
  note + the full state of the observed variables. The browser cannot run
  Python, so this mirror is what drives the live animation — keep it in sync
  with the `.py` files.
- **Runner / UI**: `web/src/lib/runner.ts` wires a trace to the controls
  (step, play at slow/medium/fast, scrub bar, reset) and renders the variable
  panel. `web/src/components/LiveTrace.astro` is the side-by-side shell
  (Python left, live state right).
- **Styling**: one design system in `web/src/styles/global.css` — saturated
  pastel tokens, light mode default, dark via `[data-theme="dark"]` on
  `<html>` persisted to `localStorage`. Python syntax highlighting is
  hand-rolled in `pysource.ts` so token colors come from the same variables.
- **Pages**: `web/src/pages/{calificaciones,inventario,duplicados}.astro` —
  formal write-up, then `<LiveTrace>` with the page's inputs and a client
  `<script>` that calls `createRunner`.
  Note: Astro drops the whitespace when a markup line *starts* with an inline
  tag (`<code>`, `<strong>`), so those lines need an explicit `{" "}` on the
  previous line. Check rendered HTML after editing prose.
- **Generated**: `web/public/download/*.py` is produced by
  `npm run sync:sources` (runs on `predev`/`prebuild`) and is gitignored.
- **Run locally**: `cd web && npm install && npm run dev`.
- **Build**: `cd web && npm run build` (Node standalone server via
  `@astrojs/node`, entry at `dist/server/entry.mjs`).
- **Docker**: `docker build -t discreta-web ./web`, or from the repo root
  `docker compose up -d --build` (brings up `web` + `cloudflared`).
- No test suite exists; correctness was verified by running the built site
  (step-through on all three pages, both themes, all speeds) and the CLI
  end-to-end.

Decision: the ZIP/document/video deliverable described in the PDF below is
NOT being submitted separately — the web app itself is the full deliverable
(code viewable + downloadable, math write-up per page, live demo instead of
a recorded video).

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
