/**
 * Tipos del motor de traza.
 *
 * Cada algoritmo expone, además de su versión directa, una función `trace*`
 * que devuelve la secuencia de *frames* por los que pasa la ejecución. Un
 * frame ancla una línea del archivo Python (vía su marcador `#@nombre`) al
 * estado completo de las variables en ese instante, de modo que la interfaz
 * pueda mostrar código y cálculo lado a lado y avanzar paso a paso.
 */

export type Tone = "ok" | "bad" | "info" | "accent";

export type VarView =
  | { kind: "scalar"; name: string; value: string; tone?: Tone }
  | {
      kind: "list";
      name: string;
      items: string[];
      cursor?: number;
      marks?: Record<number, Tone>;
    }
  | { kind: "set"; name: string; items: string[]; justAdded?: string }
  | {
      kind: "bars";
      name: string;
      entries: Array<{ key: string; value: number }>;
      active?: string;
    }
  | {
      kind: "table";
      name: string;
      columns: string[];
      rows: Array<{ cells: string[]; tone?: Tone }>;
    };

export interface Frame {
  /** Marcador `#@nombre` de la línea Python activa. */
  marker: string;
  /** Explicación en prosa de lo que ocurre en este paso. */
  note: string;
  /** Estado completo de las variables observadas tras ejecutar la línea. */
  vars: VarView[];
  /** Nombres de variables que cambiaron en este frame (se resaltan). */
  changed?: string[];
  tone?: Tone;
}
