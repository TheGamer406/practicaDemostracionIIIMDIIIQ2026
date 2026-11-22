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
