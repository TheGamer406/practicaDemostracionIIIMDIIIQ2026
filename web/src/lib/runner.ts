import type { Frame, Tone, VarView } from "./trace";

/** Resultado de recalcular la traza a partir de la entrada del usuario. */
export interface Computation {
  frames: Frame[];
  /** Resultado final en una línea, visible sin necesidad de ejecutar. */
  summary: string;
  tone?: Tone;
}

const SPEEDS: Record<string, number> = { slow: 1300, medium: 520, fast: 140 };

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function toneClass(tone?: Tone): string {
  return tone ? ` is-${tone}` : "";
}

function renderVar(view: VarView, changed: boolean): string {
  const flag = changed ? " is-changed" : "";
  const head = `<span class="v__name">${escapeHtml(view.name)}</span>`;

  switch (view.kind) {
    case "scalar":
      return `<div class="v${flag}">${head}<span class="v__val${toneClass(
        view.tone
      )}">${escapeHtml(view.value)}</span></div>`;

    case "list": {
      const chips = view.items
        .map((item, index) => {
          const classes = ["chip"];
          if (index === view.cursor) classes.push("is-cursor");
          else if (view.cursor !== undefined && index < view.cursor) classes.push("is-past");
          const mark = view.marks?.[index];
          if (mark) classes.push(`is-${mark}`);
          return `<span class="${classes.join(" ")}">${escapeHtml(item)}</span>`;
        })
        .join("");
      const body = view.items.length ? chips : `<span class="chip is-empty">vacío</span>`;
      return `<div class="v v--wide${flag}">${head}<div class="chips">${body}</div></div>`;
    }

    case "set": {
      const chips = view.items
        .map((item) => {
          const isNew = item === view.justAdded;
          return `<span class="chip chip--set${isNew ? " is-new" : ""}">${escapeHtml(item)}</span>`;
        })
        .join("");
      const body = view.items.length ? chips : `<span class="chip is-empty">∅</span>`;
      return `<div class="v v--wide${flag}">${head}<div class="chips">${body}</div></div>`;
    }

    case "bars": {
      const max = Math.max(1, ...view.entries.map((e) => e.value));
      const rows = view.entries
        .map((entry, index) => {
          const pct = Math.round((entry.value / max) * 100);
          const active = entry.key === view.active ? " is-active" : "";
          return `<div class="bar${active}" style="--bar-color: var(--p${(index % 6) + 1})">
            <span class="bar__key">${escapeHtml(entry.key)}</span>
            <span class="bar__track"><span class="bar__fill" style="width:${pct}%"></span></span>
            <span class="bar__val">${entry.value}</span>
          </div>`;
        })
        .join("");
      const body = view.entries.length ? rows : `<span class="chip is-empty">vacío</span>`;
      return `<div class="v v--wide${flag}">${head}<div class="bars">${body}</div></div>`;
    }

    case "table": {
      if (!view.rows.length) {
        return `<div class="v v--wide${flag}">${head}<div class="chips"><span class="chip is-empty">vacío</span></div></div>`;
      }
      const thead = view.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
      const tbody = view.rows
        .map(
          (row) =>
            `<tr class="${row.tone ? `is-${row.tone}` : ""}">${row.cells
              .map((cell) => `<td>${escapeHtml(cell)}</td>`)
              .join("")}</tr>`
        )
        .join("");
      return `<div class="v v--wide${flag}">${head}<table class="vtable"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></div>`;
    }
  }
}

/**
 * Conecta un bloque `<LiveTrace>` con su función de cálculo. Se encarga de los
 * controles (paso a paso, tres velocidades, barra de avance), del resaltado de
 * la línea Python activa y del render del panel de variables.
 */
export function createRunner(
  root: HTMLElement,
  markers: Record<string, number>,
  compute: () => Computation
) {
  const lineNodes = Array.from(root.querySelectorAll<HTMLElement>("[data-line]"));
  const codeScroll = root.querySelector<HTMLElement>("[data-code-scroll]");
  const noteEl = root.querySelector<HTMLElement>("[data-note]");
  const varsEl = root.querySelector<HTMLElement>("[data-vars]");
  const resultEl = root.querySelector<HTMLElement>("[data-result]");
  const progressEl = root.querySelector<HTMLElement>("[data-progress]");
  const scrub = root.querySelector<HTMLInputElement>("[data-scrub]");
  const playBtn = root.querySelector<HTMLButtonElement>('[data-act="play"]');
  const speedBtns = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-speed]"));

  let frames: Frame[] = [];
  let index = -1;
  let speed = "medium";
  let timer: number | null = null;

  function highlight(marker: string | null) {
    const line = marker ? markers[marker] : undefined;
    for (const node of lineNodes) {
      node.classList.toggle("is-active", line !== undefined && Number(node.dataset.line) === line);
    }
    if (line === undefined || !codeScroll) return;
    const active = lineNodes[line - 1];
    if (!active) return;
    // Se mide contra el contenedor con scroll: `offsetTop` sería relativo al
    // primer ancestro posicionado, que no es necesariamente este panel.
    const lineBox = active.getBoundingClientRect();
    const paneBox = codeScroll.getBoundingClientRect();
    const delta = lineBox.top - paneBox.top - codeScroll.clientHeight / 2 + lineBox.height / 2;
    codeScroll.scrollTo({ top: Math.max(0, codeScroll.scrollTop + delta), behavior: "smooth" });
  }

  function renderFrame() {
    const frame = frames[index];
    if (progressEl) {
      progressEl.textContent = `paso ${Math.max(0, index + 1)} / ${frames.length}`;
    }
    if (scrub) {
      scrub.max = String(Math.max(0, frames.length - 1));
      scrub.value = String(Math.max(0, index));
      scrub.disabled = frames.length === 0;
    }

    if (!frame) {
      highlight(null);
      if (noteEl) {
        noteEl.className = "state__note is-waiting";
        noteEl.textContent = frames.length
          ? "Pulsá Ejecutar o Paso para ver el algoritmo recorrer la entrada."
          : "Ingresá datos válidos para generar la traza.";
      }
      if (varsEl) varsEl.innerHTML = "";
      return;
    }

    highlight(frame.marker);
    if (noteEl) {
      noteEl.className = `state__note${toneClass(frame.tone)}`;
      noteEl.textContent = frame.note;
    }
    if (varsEl) {
      const changed = new Set(frame.changed ?? []);
      varsEl.innerHTML = frame.vars.map((v) => renderVar(v, changed.has(v.name))).join("");
    }
  }

  function stop() {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
    if (playBtn) {
      playBtn.textContent = "▶ Ejecutar";
      playBtn.dataset.playing = "false";
    }
  }

  function step(): boolean {
    if (index >= frames.length - 1) return false;
    index += 1;
    renderFrame();
    return true;
  }

  function play() {
    if (!frames.length) return;
    if (index >= frames.length - 1) index = -1;
    stop();
    if (playBtn) {
      playBtn.textContent = "⏸ Pausar";
      playBtn.dataset.playing = "true";
    }
    step();
    timer = window.setInterval(() => {
      if (!step()) stop();
    }, SPEEDS[speed]);
  }

  function refresh() {
    stop();
    index = -1;
    try {
      const result = compute();
      frames = result.frames;
      if (resultEl) {
        resultEl.className = `state__result${toneClass(result.tone)}`;
        resultEl.textContent = result.summary;
      }
    } catch (error) {
      frames = [];
      if (resultEl) {
        resultEl.className = "state__result is-bad";
        resultEl.textContent = error instanceof Error ? error.message : String(error);
      }
    }
    renderFrame();
  }

  playBtn?.addEventListener("click", () => {
    if (playBtn.dataset.playing === "true") stop();
    else play();
  });

  root.querySelector('[data-act="step"]')?.addEventListener("click", () => {
    stop();
    if (!step() && frames.length) {
      index = -1;
      renderFrame();
    }
  });

  root.querySelector('[data-act="reset"]')?.addEventListener("click", () => {
    stop();
    index = -1;
    renderFrame();
  });

  for (const btn of speedBtns) {
    btn.addEventListener("click", () => {
      speed = btn.dataset.speed ?? "medium";
      for (const other of speedBtns) {
        other.setAttribute("aria-pressed", String(other === btn));
      }
      if (timer !== null) play();
    });
  }

  scrub?.addEventListener("input", () => {
    stop();
    index = Number(scrub.value);
    renderFrame();
  });

  refresh();
  return { refresh };
}
