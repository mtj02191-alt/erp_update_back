/**
 * Lightweight CSV parser (quoted fields, UTF-8 BOM strip).
 * No extra dependency — suitable for admin import files.
 */

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map((v) => v.trim());
}

export function normalizeCsvHeader(header: string): string {
  return String(header || "")
    .trim()
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function parseCsvBuffer(buffer: Buffer): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const text = stripBom(buffer.toString("utf8"));
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = parseCsvLine(lines[0]);
  const headers = rawHeaders.map(normalizeCsvHeader);

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    if (values.every((v) => v === "")) continue;

    const row: Record<string, string> = {};
    headers.forEach((key, idx) => {
      row[key] = values[idx] !== undefined ? values[idx] : "";
    });
    rows.push(row);
  }

  return { headers, rows };
}
