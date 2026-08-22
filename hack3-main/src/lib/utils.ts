export function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return 'Dates not set';
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt(start ?? end!);
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

export function costIndexToDollars(index: number | null | undefined): string {
  if (index == null) return '$';
  const n = Math.max(1, Math.min(5, Math.round(index)));
  return '$'.repeat(n);
}

export function generateSlug(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isEndDateValid(start: string, end: string): boolean {
  if (!start || !end) return true;
  return new Date(end) >= new Date(start);
}

export function calcTripDurationDays(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
}
