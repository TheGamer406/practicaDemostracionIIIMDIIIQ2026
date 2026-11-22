#!/usr/bin/env node
// Script independiente (sin dependencias) para la Prueba de Demostración III.
// Menú interactivo: el usuario ingresa las listas y elige el problema a resolver.

import readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";

const rl = readline.createInterface({ input, output });
const lineIterator = rl[Symbol.asyncIterator]();

async function ask(promptText) {
  output.write(promptText);
  const { value, done } = await lineIterator.next();
  if (done) return null;
  return value;
}

function gradeRangeOf(grade) {
  if (grade >= 90 && grade <= 100) return "A";
  if (grade >= 80 && grade <= 89) return "B";
  if (grade >= 70 && grade <= 79) return "C";
  if (grade >= 60 && grade <= 69) return "D";
  if (grade >= 0 && grade <= 59) return "F";
  throw new Error(`Calificación fuera de dominio [0,100]: ${grade}`);
}

function classifyGrades(grades) {
  const counts = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const grade of grades) counts[gradeRangeOf(grade)] += 1;
  return counts;
}

function analyzeInventory(stock, demand) {
  const results = demand.map(({ product, quantity }) => {
    const available = stock[product] ?? 0;
    return { product, demanded: quantity, available, sufficient: available >= quantity };
  });
  const shortCount = results.filter((r) => !r.sufficient).length;
  return { results, shortCount };
}

function findDuplicates(numbers) {
  const seen = new Set();
  const duplicates = new Set();
  for (const n of numbers) {
    if (seen.has(n)) duplicates.add(n);
    seen.add(n);
  }
  if (duplicates.size === 0) {
    return { hasDuplicates: false, message: "Todos los números de la lista son únicos." };
  }
  return { hasDuplicates: true, duplicates: [...duplicates] };
}

function parseNumberList(raw) {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(Number)
    .filter((n) => !Number.isNaN(n));
}

async function runGrades() {
  const raw = await ask("Ingrese las calificaciones separadas por coma (ej. 95,82,60,45): ");
  if (raw === null) return;
  const grades = parseNumberList(raw);
  console.log("\nResultado:", classifyGrades(grades), "\n");
}

async function runInventory() {
  const stock = {};
  console.log("Ingrese el inventario. Línea vacía para terminar.");
  while (true) {
    const line = await ask("producto,cantidad_disponible (o vacío para continuar): ");
    if (line === null || line.trim() === "") break;
    const [product, qty] = line.split(",").map((s) => s.trim());
    stock[product] = Number(qty);
  }

  const demand = [];
  console.log("Ingrese la demanda. Línea vacía para terminar.");
  while (true) {
    const line = await ask("producto,cantidad_demandada (o vacío para finalizar): ");
    if (line === null || line.trim() === "") break;
    const [product, qty] = line.split(",").map((s) => s.trim());
    demand.push({ product, quantity: Number(qty) });
  }

  const analysis = analyzeInventory(stock, demand);
  console.log("\nResultado:");
  for (const r of analysis.results) {
    const estado = r.sufficient ? "OK" : "INSUFICIENTE";
    console.log(`  ${r.product}: demanda=${r.demanded} disponible=${r.available} -> ${estado}`);
  }
  console.log(`Productos con faltante: ${analysis.shortCount}\n`);
}

async function runDuplicates() {
  const raw = await ask("Ingrese la lista de números separados por coma (ej. 3,7,3,9,1,7): ");
  if (raw === null) return;
  const numbers = parseNumberList(raw);
  const result = findDuplicates(numbers);
  if (result.hasDuplicates) {
    console.log("\nNúmeros duplicados:", result.duplicates, "\n");
  } else {
    console.log("\n" + result.message + "\n");
  }
}

async function main() {
  console.log("=== Prueba de Demostración III — Matemática Discreta ===");
  while (true) {
    console.log("\nSeleccione un problema:");
    console.log("  1) Clasificación de estudiantes por calificaciones");
    console.log("  2) Análisis de productos en inventario");
    console.log("  3) Juego de secuencias numéricas (duplicados)");
    console.log("  0) Salir");
    const choice = await ask("> ");
    if (choice === null || choice.trim() === "0") break;

    const opt = choice.trim();
    if (opt === "1") await runGrades();
    else if (opt === "2") await runInventory();
    else if (opt === "3") await runDuplicates();
    else console.log("Opción inválida.");
  }
  rl.close();
}

main();
