/**
 * Utilidades para mostrar los archivos Python del proyecto en la web.
 *
 * Los archivos `.py` llevan marcadores `#@nombre` al final de algunas líneas.
 * `parsePython` los convierte en un mapa nombre → número de línea y los borra
 * del código visible, de modo que la traza puede anclarse a líneas reales sin
 * depender de números escritos a mano (que se desincronizan al editar).
 */

export interface ParsedPython {
  /** Código sin los marcadores, listo para mostrar. */
  code: string;
  /** Marcador → número de línea (base 1). */
  markers: Record<string, number>;
}

const MARKER = /\s*#@([a-z0-9_]+)\s*$/;

export function parsePython(raw: string): ParsedPython {
  const markers: Record<string, number> = {};
  const lines = raw.replace(/\s+$/, "").split("\n");

  const code = lines
    .map((line, index) => {
      const match = line.match(MARKER);
      if (!match) return line;
      markers[match[1]] = index + 1;
      return line.replace(MARKER, "");
    })
    .join("\n");

  return { code, markers };
}

const KEYWORDS = new Set([
  "and", "as", "assert", "break", "class", "continue", "def", "del", "elif",
  "else", "except", "False", "finally", "for", "from", "global", "if", "import",
  "in", "is", "lambda", "None", "not", "or", "pass", "raise", "return", "True",
  "try", "while", "with", "yield",
]);

const BUILTINS = new Set([
  "abs", "all", "any", "bool", "dict", "enumerate", "EOFError", "Exception",
  "float", "input", "int", "isinstance", "KeyboardInterrupt", "len", "list",
  "max", "min", "print", "range", "set", "sorted", "str", "sum", "tuple",
  "ValueError", "zip",
]);

const TOKEN =
  /("""|''')|(#.*$)|((?:[fru]{1,2})?"(?:\\.|[^"\\])*"|(?:[fru]{1,2})?'(?:\\.|[^'\\])*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|(\s+)|(.)/g;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function span(className: string, text: string): string {
  return `<span class="${className}">${escapeHtml(text)}</span>`;
}

/**
 * Resaltador mínimo de Python. Devuelve una línea HTML por línea de entrada.
 * Se hace a mano (en vez de usar Shiki) para controlar la paleta pastel en
 * modo claro y oscuro con las mismas variables CSS del resto del sitio.
 */
export function highlightPython(code: string): string[] {
  let inTriple: string | null = null;

  return code.split("\n").map((line) => {
    let out = "";
    let cursor = 0;

    // Continuación (o cierre) de una cadena triple abierta en líneas previas.
    if (inTriple) {
      const close = line.indexOf(inTriple);
      if (close === -1) {
        return span("tk-str", line) || "&nbsp;";
      }
      const end = close + inTriple.length;
      out += span("tk-str", line.slice(0, end));
      cursor = end;
      inTriple = null;
    }

    const rest = line.slice(cursor);
    TOKEN.lastIndex = 0;
    let match: RegExpExecArray | null;
    let prevWord: string | null = null;

    while ((match = TOKEN.exec(rest)) !== null) {
      const [text, triple, comment, str, numeric, word, space] = match;

      if (triple) {
        // Cadena triple: puede abrir y cerrar en la misma línea.
        const after = rest.slice(match.index + triple.length);
        const close = after.indexOf(triple);
        if (close === -1) {
          out += span("tk-str", rest.slice(match.index));
          inTriple = triple;
          break;
        }
        const end = match.index + triple.length + close + triple.length;
        out += span("tk-str", rest.slice(match.index, end));
        TOKEN.lastIndex = end;
        continue;
      }

      if (comment) {
        out += span("tk-com", comment);
        continue;
      }
      if (str) {
        out += span("tk-str", str);
        continue;
      }
      if (numeric) {
        out += span("tk-num", numeric);
        continue;
      }
      if (space) {
        out += escapeHtml(space);
        continue;
      }
      if (word) {
        if (KEYWORDS.has(word)) {
          out += span("tk-kw", word);
        } else if (prevWord === "def" || prevWord === "class") {
          out += span("tk-def", word);
        } else if (BUILTINS.has(word)) {
          out += span("tk-bi", word);
        } else if (rest[match.index + word.length] === "(") {
          out += span("tk-fn", word);
        } else {
          out += span("tk-id", word);
        }
        prevWord = word;
        continue;
      }
      out += span("tk-op", text);
    }

    return out || "&nbsp;";
  });
}
