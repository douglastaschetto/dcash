/**
 * Minimal RFC4180-ish CSV line splitter: handles quoted fields containing
 * commas/newlines-within-quotes and doubled-quote escaping (`""` -> `"`).
 * Replaces a plain `line.split(',')`, which breaks on any bank export that
 * quotes its description field (very common — e.g. "Supermercado, ABC").
 */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out;
}
