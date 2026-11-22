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
