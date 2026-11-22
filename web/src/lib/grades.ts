import type { Frame, VarView } from "./trace";

export type GradeRange = "A" | "B" | "C" | "D" | "F";

export const GRADE_BOUNDS: Array<{ range: GradeRange; min: number; max: number }> = [
  { range: "A", min: 90, max: 100 },
  { range: "B", min: 80, max: 89 },
  { range: "C", min: 70, max: 79 },
  { range: "D", min: 60, max: 69 },
  { range: "F", min: 0, max: 59 },
];

export function gradeRangeOf(grade: number): GradeRange {
  const bound = GRADE_BOUNDS.find((b) => grade >= b.min && grade <= b.max);
  if (!bound) {
    throw new Error(`Calificación fuera de dominio [0,100]: ${grade}`);
  }
  return bound.range;
}

export function classifyGrades(grades: number[]): Record<GradeRange, number> {
  const counts: Record<GradeRange, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const grade of grades) {
    counts[gradeRangeOf(grade)] += 1;
  }
  return counts;
}

/**
 * Reejecuta `classifyGrades` registrando cada paso intermedio para la vista
 * de ejecución en vivo. El resultado final coincide siempre con el de la
 * función directa; esta versión solo añade observabilidad.
 */
export function traceGrades(grades: number[]): Frame[] {
  const frames: Frame[] = [];
  const counts: Record<GradeRange, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };

  const snapshot = (
    cursor: number,
    extra: { grade?: number; range?: string; activeBound?: string }
  ): VarView[] => {
    const views: VarView[] = [
      {
        kind: "list",
        name: "notas",
        items: grades.map((g) => String(g)),
        cursor,
      },
      {
        kind: "bars",
        name: "conteo",
        entries: GRADE_BOUNDS.map((b) => ({ key: b.range, value: counts[b.range] })),
        active: extra.activeBound,
      },
    ];
    if (extra.grade !== undefined) {
      views.push({ kind: "scalar", name: "nota", value: String(extra.grade) });
    }
    if (extra.range !== undefined) {
      views.push({ kind: "scalar", name: "r", value: extra.range, tone: "accent" });
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    views.push({
      kind: "scalar",
      name: "Σ conteo",
      value: `${total} de n = ${grades.length}`,
      tone: total === grades.length ? "ok" : "info",
    });
    return views;
  };

  frames.push({
    marker: "init",
    note: "Inicializamos el acumulador con conteo[r] = 0 para cada rango r ∈ R = {A, B, C, D, F}.",
    vars: snapshot(-1, {}),
    changed: ["conteo"],
  });

  for (let i = 0; i < grades.length; i += 1) {
    const grade = grades[i];

    frames.push({
      marker: "loop",
      note: `Iteración ${i + 1} de ${grades.length}: tomamos nota = ${grade} de la lista.`,
      vars: snapshot(i, { grade }),
      changed: ["nota"],
    });

    frames.push({
      marker: "call",
      note: `Llamamos a rango_de(${grade}) para evaluar la función f en esta nota.`,
      vars: snapshot(i, { grade }),
    });

    frames.push({
      marker: "scan",
      note: "Recorremos los cinco intervalos de RANGOS buscando el único que contiene la nota.",
      vars: snapshot(i, { grade }),
      tone: "info",
    });

    let matched: GradeRange | null = null;
    for (const bound of GRADE_BOUNDS) {
      const hit = grade >= bound.min && grade <= bound.max;
      frames.push({
        marker: "test",
        note: `¿${bound.min} ≤ ${grade} ≤ ${bound.max}? ${
          hit ? `Sí — el intervalo del rango ${bound.range} contiene la nota.` : "No, probamos el siguiente intervalo."
        }`,
        vars: snapshot(i, { grade, activeBound: bound.range }),
        tone: hit ? "ok" : "info",
      });
      if (hit) {
        matched = bound.range;
        frames.push({
          marker: "hit",
          note: `f(${grade}) = ${bound.range}. Como los cinco intervalos son disjuntos, ninguno posterior puede coincidir: devolvemos de inmediato.`,
          vars: snapshot(i, { grade, range: bound.range, activeBound: bound.range }),
          changed: ["r"],
          tone: "accent",
        });
        break;
      }
    }

    if (matched === null) {
      frames.push({
        marker: "error",
        note: `Ningún intervalo contiene ${grade}: la nota está fuera del dominio [0,100] y la función f no está definida para ella.`,
        vars: snapshot(i, { grade }),
        tone: "bad",
      });
      return frames;
    }

    const before = counts[matched];
    counts[matched] += 1;
    frames.push({
      marker: "incr",
      note: `La nota entra en el subconjunto G_${matched}: conteo["${matched}"] pasa de ${before} a ${counts[matched]}.`,
      vars: snapshot(i, { grade, range: matched, activeBound: matched }),
      changed: ["conteo"],
      tone: "ok",
    });
  }

  frames.push({
    marker: "return",
    note: "Recorrimos las n notas exactamente una vez (complejidad O(n)) y devolvemos el mapa r ↦ |G_r|.",
    vars: snapshot(grades.length, {}),
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  frames.push({
    marker: "check",
    note: `Verificación de la invariante: Σ_r |G_r| = ${total} y |G| = ${grades.length}. ${
      total === grades.length
        ? "Coinciden, así que la partición no perdió ni duplicó estudiantes."
        : "No coinciden: habría un error en la partición."
    }`,
    vars: snapshot(grades.length, {}),
    tone: total === grades.length ? "ok" : "bad",
  });

  return frames;
}
