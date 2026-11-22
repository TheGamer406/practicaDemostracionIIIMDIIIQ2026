/**
 * Copia los archivos Python a `public/download/` para que se puedan descargar.
 *
 * Los módulos por problema llevan marcadores `#@nombre` que sirven para anclar
 * la traza de la web a líneas concretas; se eliminan al copiar para que el
 * archivo descargado quede limpio. `demostracion3.py` (el script autocontenido
 * con el menú de los tres problemas) se copia tal cual.
 */

import { mkdir, readFile, readdir, writeFile, copyFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "download");

const MARKER = /[ \t]*#@[a-z0-9_]+[ \t]*$/gm;

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

await copyFile(join(root, "scripts", "demostracion3.py"), join(outDir, "demostracion3.py"));

const moduleDir = join(root, "src", "python");
for (const name of await readdir(moduleDir)) {
  if (!name.endsWith(".py")) continue;
  const source = await readFile(join(moduleDir, name), "utf8");
  await writeFile(join(outDir, name), source.replace(MARKER, ""), "utf8");
}

console.log(`sync-sources: ${outDir} actualizado`);
