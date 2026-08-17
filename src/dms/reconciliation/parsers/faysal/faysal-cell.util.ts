/** Strip Excel formula wrappers like ="TEXT" from Faysal export cells. */
export function cleanFaysalCell(value: unknown): string {
  if (value == null) return "";
  let text = String(value).trim();
  if (text.startsWith('="') && text.endsWith('"')) {
    text = text.slice(2, -1);
  }
  return text.trim();
}

export function parseFaysalAmount(value: unknown): number | null {
  const text = cleanFaysalCell(value).replace(/,/g, "");
  if (!text) return null;
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
}

/** Parse dates like 6/10/26 or 15-Jun-2026 */
export function parseFaysalDate(value: unknown): Date | null {
  const text = cleanFaysalCell(value);
  if (!text) return null;

  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const month = Number(slash[1]);
    const day = Number(slash[2]);
    let year = Number(slash[3]);
    if (year < 100) year += 2000;
    const d = new Date(year, month - 1, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
