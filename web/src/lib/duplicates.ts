import type { Frame, Tone, VarView } from "./trace";

export type DuplicateCheckResult =
  | { hasDuplicates: true; duplicates: number[] }
  | { hasDuplicates: false; message: string };

export function findDuplicates(numbers: number[]): DuplicateCheckResult {
  const seen = new Set<number>();
  const duplicates = new Set<number>();
  for (const n of numbers) {
    if (seen.has(n)) {
      duplicates.add(n);
    }
    seen.add(n);
  }
  if (duplicates.size === 0) {
    return {
      hasDuplicates: false,
      message: "Todos los números de la lista son únicos.",
    };
  }
  return { hasDuplicates: true, duplicates: [...duplicates] };
}

/**
 * Versión instrumentada. El conjunto `vistos` es la materialización de los
 * nidos ya ocupados del principio del palomar: cada vez que una "paloma" cae
 * en un nido ocupado, hemos encontrado un duplicado.
 */
export function traceDuplicates(numbers: number[]): Frame[] {
  const frames: Frame[] = [];
  const seen = new Set<number>();
  const duplicates: number[] = [];

  const snapshot = (
    cursor: number,
    extra: { current?: number; justAdded?: number } = {}
  ): VarView[] => {
    const marks: Record<number, Tone> = {};
    numbers.forEach((value, index) => {
      if (index <= cursor && duplicates.includes(value)) {
        marks[index] = "bad";
      }
    });
    const views: VarView[] = [
      {
        kind: "list",
        name: "numeros",
        items: numbers.map((n) => String(n)),
        cursor,
        marks,
      },
      {
        kind: "set",
        name: "vistos",
        items: [...seen].map((n) => String(n)),
        justAdded: extra.justAdded !== undefined ? String(extra.justAdded) : undefined,
      },
      {
        kind: "list",
        name: "duplicados",
        items: duplicates.map((n) => String(n)),
      },
    ];
    if (extra.current !== undefined) {
      views.push({ kind: "scalar", name: "x", value: String(extra.current), tone: "accent" });
    }
    views.push({
      kind: "scalar",
      name: "n vs |V|",
      value: `n = ${numbers.length}, |V| = ${seen.size}`,
      tone: numbers.length > seen.size ? "bad" : "ok",
    });
    return views;
  };

  frames.push({
    marker: "init_seen",
    note: "Creamos el conjunto vistos, vacío. Representa los nidos del palomar que ya tienen una paloma.",
    vars: snapshot(-1),
    changed: ["vistos"],
  });

  frames.push({
    marker: "init_dup",
    note: "Creamos la lista de duplicados, vacía.",
    vars: snapshot(-1),
    changed: ["duplicados"],
  });

  for (let i = 0; i < numbers.length; i += 1) {
    const x = numbers[i];

    frames.push({
      marker: "loop",
      note: `Posición ${i + 1}: la paloma x = ${x} busca su nido. Esto es evaluar f(${i + 1}) = ${x}.`,
      vars: snapshot(i, { current: x }),
      changed: ["x"],
    });

    const alreadySeen = seen.has(x);
    frames.push({
      marker: "test",
      note: alreadySeen
        ? `¿${x} ∈ vistos? Sí: el nido ya estaba ocupado, así que f no es inyectiva y ${x} es un duplicado.`
        : `¿${x} ∈ vistos? No: el nido está libre, por ahora f sigue siendo inyectiva.`,
      vars: snapshot(i, { current: x }),
      tone: alreadySeen ? "bad" : "ok",
    });

    if (alreadySeen) {
      const isNew = !duplicates.includes(x);
      frames.push({
        marker: "dedup",
        note: isNew
          ? `¿${x} ya está en duplicados? No, hay que agregarlo.`
          : `¿${x} ya está en duplicados? Sí, no lo repetimos en la salida.`,
        vars: snapshot(i, { current: x }),
        tone: "info",
      });
      if (isNew) {
        duplicates.push(x);
        frames.push({
          marker: "add_dup",
          note: `duplicados ahora contiene ${x}.`,
          vars: snapshot(i, { current: x }),
          changed: ["duplicados"],
          tone: "bad",
        });
      }
    }

    seen.add(x);
    frames.push({
      marker: "add_seen",
      note: `Marcamos el nido: vistos tiene ahora ${seen.size} valor${seen.size === 1 ? "" : "es"} distinto${
        seen.size === 1 ? "" : "s"
      }.`,
      vars: snapshot(i, { current: x, justAdded: x }),
      changed: ["vistos"],
    });
  }

  const hasDuplicates = duplicates.length > 0;
  frames.push({
    marker: "final",
    note: hasDuplicates
      ? "La lista de duplicados no está vacía, así que existe al menos un valor repetido."
      : "La lista de duplicados quedó vacía: ninguna paloma encontró un nido ocupado.",
    vars: snapshot(numbers.length),
    tone: hasDuplicates ? "bad" : "ok",
  });

  frames.push({
    marker: hasDuplicates ? "found" : "unique",
    note: hasDuplicates
      ? `Devolvemos [${duplicates.join(", ")}]. Se confirma el palomar: n = ${numbers.length} > |V| = ${seen.size}, por lo que f no puede ser inyectiva.`
      : `Devolvemos el mensaje de unicidad. Aquí n = ${numbers.length} = |V|, es decir f es inyectiva — la contrapositiva del palomar.`,
    vars: snapshot(numbers.length),
    tone: hasDuplicates ? "bad" : "ok",
  });

  // Cierre: `palomar()` comprueba el enunciado sobre la entrada concreta.
  const n = numbers.length;
  const v = seen.size;
  // En el cierre se muestran n y |V| por separado, así que se omite el
  // resumen combinado que acompaña a las iteraciones del bucle.
  const tail = snapshot(numbers.length).filter((view) => view.name !== "n vs |V|");

  frames.push({
    marker: "n",
    note: `Contamos las palomas: n = |L| = ${n} posiciones en la lista.`,
    vars: [...tail, { kind: "scalar", name: "n", value: String(n), tone: "accent" }],
    changed: ["n"],
  });

  frames.push({
    marker: "v",
    note: `Contamos los nidos: |V| = ${v} valores distintos.`,
    vars: [
      ...tail,
      { kind: "scalar", name: "n", value: String(n) },
      { kind: "scalar", name: "|V|", value: String(v), tone: "accent" },
    ],
    changed: ["|V|"],
  });

  frames.push({
    marker: "compare",
    note: hasDuplicates
      ? `${n} > ${v} es verdadero: por el principio del palomar f no puede ser inyectiva, y efectivamente encontramos duplicados.`
      : `${n} > ${v} es falso, de hecho n = |V|: f es inyectiva y por lo tanto no hay duplicados.`,
    vars: [
      ...tail,
      { kind: "scalar", name: "n", value: String(n) },
      { kind: "scalar", name: "|V|", value: String(v) },
      {
        kind: "scalar",
        name: "n > |V|",
        value: n > v ? "True" : "False",
        tone: n > v ? "bad" : "ok",
      },
    ],
    changed: ["n > |V|"],
    tone: hasDuplicates ? "bad" : "ok",
  });

  return frames;
}
