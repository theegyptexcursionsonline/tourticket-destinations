const LABELS: Record<string, string> = {
  'per person': 'per person',
  'per couple': 'per couple',
  'per group': 'per group',
  'per family': 'per family',
};

export function bookingOptionUnitLabel(type?: string | null): string {
  return LABELS[String(type || '').trim().toLowerCase()] || 'per booking';
}
