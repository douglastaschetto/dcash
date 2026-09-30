export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Converte "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm:ss.sssZ" em Date local à meia-noite,
 * ignorando o fuso. Datas de transação são "dia do calendário": parsear o ISO
 * (UTC) direto no fuso de Brasília desloca para o dia anterior.
 */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Data de hoje no fuso local, formato "YYYY-MM-DD" (para inputs type="date"). */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
