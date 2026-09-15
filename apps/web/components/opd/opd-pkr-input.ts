/** Keep only digits and at most one decimal point for PKR amount fields. */
export function sanitizePkrInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const dot = cleaned.indexOf('.');
  if (dot === -1) return cleaned;
  const before = cleaned.slice(0, dot + 1);
  const after = cleaned.slice(dot + 1).replace(/\./g, '');
  return before + after;
}

export function parsePkrAmount(raw: string): number {
  return Number(sanitizePkrInput(raw).replace(/,/g, ''));
}
