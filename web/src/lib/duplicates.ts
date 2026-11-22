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
