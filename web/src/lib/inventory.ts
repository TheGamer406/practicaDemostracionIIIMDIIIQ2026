import type { Frame, VarView } from "./trace";

export interface DemandItem {
  product: string;
  quantity: number;
}

export interface InventoryResult {
  product: string;
  demanded: number;
  available: number;
  sufficient: boolean;
}

export interface InventoryAnalysis {
  results: InventoryResult[];
  shortCount: number;
}

export function analyzeInventory(
  stock: Record<string, number>,
  demand: DemandItem[]
): InventoryAnalysis {
  const results: InventoryResult[] = demand.map(({ product, quantity }) => {
    const available = stock[product] ?? 0;
    return {
      product,
      demanded: quantity,
      available,
      sufficient: available >= quantity,
    };
  });
  const shortCount = results.filter((r) => !r.sufficient).length;
  return { results, shortCount };
}

/**
 * Versión instrumentada de `analyzeInventory`. Cada frame corresponde a un
 * paso del argumento inductivo: el contador `faltantes` mantiene en todo
 * momento la igualdad con |D₋| restringido a las demandas ya procesadas.
 */
export function traceInventory(
  stock: Record<string, number>,
  demand: DemandItem[]
): Frame[] {
  const frames: Frame[] = [];
  const results: InventoryResult[] = [];
  let shortCount = 0;

  const snapshot = (
    cursor: number,
    extra: {
      product?: string;
      quantity?: number;
      available?: number;
      sufficient?: boolean;
    }
  ): VarView[] => {
    const views: VarView[] = [
      {
        kind: "bars",
        name: "stock",
        entries: Object.entries(stock).map(([key, value]) => ({ key, value })),
        active: extra.product,
      },
      {
        kind: "list",
        name: "demanda",
        items: demand.map((d) => `${d.product}:${d.quantity}`),
        cursor,
      },
    ];
    if (extra.product !== undefined) {
      views.push({ kind: "scalar", name: "producto", value: extra.product });
    }
    if (extra.quantity !== undefined) {
      views.push({ kind: "scalar", name: "cantidad", value: String(extra.quantity) });
    }
    if (extra.available !== undefined) {
      views.push({ kind: "scalar", name: "disponible", value: String(extra.available) });
    }
    if (extra.sufficient !== undefined) {
      views.push({
        kind: "scalar",
        name: "suficiente",
        value: extra.sufficient ? "True" : "False",
        tone: extra.sufficient ? "ok" : "bad",
      });
    }
    views.push({
      kind: "scalar",
      name: "faltantes",
      value: String(shortCount),
      tone: shortCount > 0 ? "bad" : "ok",
    });
    views.push({
      kind: "table",
      name: "resultados",
      columns: ["producto", "demanda", "disponible", "Suf(p,q)"],
      rows: results.map((r) => ({
        cells: [r.product, String(r.demanded), String(r.available), r.sufficient ? "True" : "False"],
        tone: r.sufficient ? "ok" : "bad",
      })),
    });
    return views;
  };

  frames.push({
    marker: "init_res",
    note: "Preparamos la lista de resultados vacía. Aquí se irán acumulando los pares (p, q) ya clasificados.",
    vars: snapshot(-1, {}),
    changed: ["resultados"],
  });

  frames.push({
    marker: "init_cnt",
    note: "Caso base de la inducción: con 0 demandas procesadas, faltantes = 0 = |D₋ ∩ ∅|.",
    vars: snapshot(-1, {}),
    changed: ["faltantes"],
  });

  for (let i = 0; i < demand.length; i += 1) {
    const { product, quantity } = demand[i];

    frames.push({
      marker: "loop",
      note: `Demanda ${i + 1} de ${demand.length}: desempaquetamos el par (p, q) = ("${product}", ${quantity}).`,
      vars: snapshot(i, { product, quantity }),
      changed: ["producto", "cantidad"],
    });

    const available = stock[product] ?? 0;
    const registered = product in stock;

    frames.push({
      marker: "lookup",
      note: `Buscamos "${product}" en el inventario. stock.get(p, 0) implementa la extensión total de S: devuelve 0 si el producto no está registrado.`,
      vars: snapshot(i, { product, quantity }),
      tone: "info",
    });

    frames.push({
      marker: "get",
      note: registered
        ? `S("${product}") = ${available}: el producto está registrado en el inventario.`
        : `"${product}" ∉ P, no está en el inventario. Por la extensión total de S usamos S("${product}") = 0.`,
      vars: snapshot(i, { product, quantity, available }),
      changed: ["disponible"],
      tone: registered ? "info" : "bad",
    });

    const sufficient = available >= quantity;
    frames.push({
      marker: "pred",
      note: `Evaluamos el predicado Suf(p, q) ≡ S(p) ≥ q: ${available} ≥ ${quantity} es ${
        sufficient ? "verdadero, la demanda se satisface" : "falso, el stock no alcanza"
      }.`,
      vars: snapshot(i, { product, quantity, available, sufficient }),
      changed: ["suficiente"],
      tone: sufficient ? "ok" : "bad",
    });

    results.push({ product, demanded: quantity, available, sufficient });
    frames.push({
      marker: "append",
      note: `Registramos el par en resultados. Queda clasificado en ${
        sufficient ? "D₊ (demanda satisfecha)" : "D₋ (demanda insuficiente)"
      }.`,
      vars: snapshot(i, { product, quantity, available, sufficient }),
      changed: ["resultados"],
    });

    frames.push({
      marker: "branch",
      note: sufficient
        ? "El predicado es verdadero, así que el par no pertenece a D₋ y el contador no cambia: la invariante se preserva."
        : "El predicado es falso, así que el par pertenece a D₋ y toca incrementar el contador.",
      vars: snapshot(i, { product, quantity, available, sufficient }),
      tone: sufficient ? "ok" : "bad",
    });

    if (!sufficient) {
      shortCount += 1;
      frames.push({
        marker: "incr",
        note: `faltantes pasa a ${shortCount}. Por la hipótesis de inducción, ahora vale exactamente |D₋| entre las primeras ${
          i + 1
        } demandas.`,
        vars: snapshot(i, { product, quantity, available, sufficient }),
        changed: ["faltantes"],
        tone: "bad",
      });
    }
  }

  frames.push({
    marker: "return",
    note: `Procesadas las n = ${demand.length} demandas, el principio de inducción garantiza que faltantes = |D₋| = ${shortCount}.`,
    vars: snapshot(demand.length, {}),
    tone: shortCount > 0 ? "bad" : "ok",
  });

  return frames;
}
