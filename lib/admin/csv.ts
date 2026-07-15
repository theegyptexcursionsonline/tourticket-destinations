export function toSafeCsvCell(value: unknown): string {
  const normalized = String(value ?? '').replace(/\r?\n|\r/g, ' ');
  const safeValue = /^\s*[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
  return `"${safeValue.replace(/"/g, '""')}"`;
}
