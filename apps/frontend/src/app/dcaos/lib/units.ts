/**
 * Units of measure for "Abastece Aí". Quantities are stored as numbers in the
 * item's unit; these helpers give each unit a label, a sensible +/- step and
 * guess the unit/category from the item name ("2 açúcar" → 2 kg).
 */

export type Unit = 'un' | 'kg' | 'g' | 'L' | 'ml' | 'dz' | 'pct' | 'cx' | 'lata' | 'garrafa';

export const UNITS: { value: Unit; label: string; plural: string; step: number }[] = [
  { value: 'un',      label: 'unidade',  plural: 'unidades', step: 1 },
  { value: 'kg',      label: 'kg',       plural: 'kg',       step: 0.5 },
  { value: 'g',       label: 'g',        plural: 'g',        step: 100 },
  { value: 'L',       label: 'L',        plural: 'L',        step: 1 },
  { value: 'ml',      label: 'ml',       plural: 'ml',       step: 250 },
  { value: 'dz',      label: 'dúzia',    plural: 'dúzias',   step: 1 },
  { value: 'pct',     label: 'pacote',   plural: 'pacotes',  step: 1 },
  { value: 'cx',      label: 'caixa',    plural: 'caixas',   step: 1 },
  { value: 'lata',    label: 'lata',     plural: 'latas',    step: 1 },
  { value: 'garrafa', label: 'garrafa',  plural: 'garrafas', step: 1 },
];

const UNIT_MAP = new Map(UNITS.map((u) => [u.value, u]));

/** Accepts legacy free-text units ("Kg", "litro", "pct.") */
export function normalizeUnit(raw?: string | null): Unit {
  const v = (raw ?? '').trim().toLowerCase().replace(/\.$/, '');
  if (!v) return 'un';
  if (['kg', 'kilo', 'kilos', 'quilo', 'quilos'].includes(v)) return 'kg';
  if (['g', 'gr', 'grama', 'gramas'].includes(v)) return 'g';
  if (['l', 'lt', 'litro', 'litros'].includes(v)) return 'L';
  if (['ml', 'mililitro', 'mililitros'].includes(v)) return 'ml';
  if (['dz', 'duzia', 'dúzia', 'duzias', 'dúzias'].includes(v)) return 'dz';
  if (['pct', 'pc', 'pacote', 'pacotes'].includes(v)) return 'pct';
  if (['cx', 'caixa', 'caixas'].includes(v)) return 'cx';
  if (['lata', 'latas'].includes(v)) return 'lata';
  if (['garrafa', 'garrafas', 'gf'].includes(v)) return 'garrafa';
  return 'un';
}

export const unitStep = (unit?: string | null) => UNIT_MAP.get(normalizeUnit(unit))?.step ?? 1;

const fmtNum = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/** "2 kg", "1 dúzia", "3 pacotes", "1,5 L" */
export function fmtQty(n: number, unit?: string | null) {
  const u = UNIT_MAP.get(normalizeUnit(unit))!;
  const short = ['kg', 'g', 'L', 'ml'].includes(u.value);
  if (short) return `${fmtNum(n)} ${u.label}`;
  return `${fmtNum(n)} ${n === 1 ? u.label : u.plural}`;
}

/** Compact form for steppers: "2 kg", "3 un", "1 dz" */
export function fmtQtyShort(n: number, unit?: string | null) {
  return `${fmtNum(n)} ${normalizeUnit(unit)}`;
}

// ── Guessing unit + category from the name ────────────────────────────────

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const RULES: { words: string[]; unit: Unit; category: string }[] = [
  { words: ['acucar', 'arroz', 'feijao', 'farinha', 'fuba', 'sal ', 'sal', 'aveia', 'lentilha', 'grao de bico', 'polvilho'], unit: 'kg', category: 'Mercearia' },
  { words: ['carne', 'patinho', 'alcatra', 'picanha', 'acem', 'musculo', 'costela', 'frango', 'peito de frango', 'coxa', 'sobrecoxa', 'linguica', 'bacon', 'peixe', 'tilapia', 'salmao', 'camarao', 'carne moida', 'file'], unit: 'kg', category: 'Açougue' },
  { words: ['banana', 'maca', 'laranja', 'tomate', 'batata', 'cebola', 'cenoura', 'abobora', 'mamao', 'manga', 'uva', 'limao', 'pera', 'melancia', 'abobrinha', 'chuchu', 'beterraba', 'mandioca', 'aipim', 'pepino', 'pimentao', 'morango'], unit: 'kg', category: 'Hortifruti' },
  { words: ['alface', 'couve', 'repolho', 'brocolis', 'rucula', 'cheiro verde', 'salsinha', 'agriao', 'espinafre'], unit: 'un', category: 'Hortifruti' },
  { words: ['alho'], unit: 'g', category: 'Hortifruti' },
  { words: ['leite', 'suco', 'refrigerante', 'agua', 'cha gelado', 'agua de coco'], unit: 'L', category: 'Bebidas' },
  { words: ['cerveja'], unit: 'lata', category: 'Bebidas' },
  { words: ['vinho', 'cachaca', 'vodka', 'whisky'], unit: 'garrafa', category: 'Bebidas' },
  { words: ['oleo', 'azeite', 'vinagre'], unit: 'garrafa', category: 'Mercearia' },
  { words: ['ovo', 'ovos'], unit: 'dz', category: 'Laticínios' },
  { words: ['queijo', 'presunto', 'mortadela', 'peito de peru', 'salame'], unit: 'g', category: 'Laticínios' },
  { words: ['iogurte', 'requeijao', 'manteiga', 'margarina', 'creme de leite', 'leite condensado'], unit: 'un', category: 'Laticínios' },
  { words: ['pao', 'pao frances', 'bisnaguinha'], unit: 'un', category: 'Padaria' },
  { words: ['pao de forma', 'torrada', 'bolacha', 'biscoito'], unit: 'pct', category: 'Padaria' },
  { words: ['cafe', 'macarrao', 'espaguete', 'massa', 'achocolatado', 'cereal', 'granola', 'gelatina', 'fermento', 'pipoca'], unit: 'pct', category: 'Mercearia' },
  { words: ['molho de tomate', 'extrato de tomate', 'milho', 'ervilha', 'atum', 'sardinha'], unit: 'lata', category: 'Mercearia' },
  { words: ['papel higienico', 'guardanapo', 'papel toalha', 'fralda', 'absorvente'], unit: 'pct', category: 'Higiene' },
  { words: ['sabonete', 'shampoo', 'condicionador', 'pasta de dente', 'creme dental', 'desodorante', 'escova de dente', 'fio dental'], unit: 'un', category: 'Higiene' },
  { words: ['sabao em po', 'sabao', 'detergente', 'amaciante', 'agua sanitaria', 'desinfetante', 'limpador', 'esponja', 'saco de lixo', 'alcool'], unit: 'un', category: 'Limpeza' },
  { words: ['racao', 'areia de gato', 'petisco'], unit: 'kg', category: 'Pets' },
];

/** Best guess for a new item; longest matching keyword wins ("leite condensado" ≠ "leite"). */
export function guessItem(name: string): { unit: Unit; category: string } | null {
  const n = ` ${strip(name).trim()} `;
  let best: { unit: Unit; category: string; len: number } | null = null;
  for (const rule of RULES) {
    for (const w of rule.words) {
      const word = strip(w).trim();
      if (!word) continue;
      const re = new RegExp(`(^|\\s)${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s|es)?(\\s|$)`);
      if (re.test(n) && (!best || word.length > best.len)) best = { unit: rule.unit, category: rule.category, len: word.length };
    }
  }
  return best ? { unit: best.unit, category: best.category } : null;
}

/**
 * Parses quick-add text: "2 kg açúcar", "3 leite", "1,5kg carne", "açúcar".
 * Returns the quantity/unit typed explicitly (if any) and the item name.
 */
export function parseQuickAdd(text: string): { name: string; quantity: number | null; unit: Unit | null } {
  const t = text.trim();
  const m = t.match(/^(\d+(?:[.,]\d+)?)\s*(kg|kilos?|quilos?|g|gr|gramas?|l|lt|litros?|ml|dz|d[uú]zias?|pct|pacotes?|cx|caixas?|latas?|garrafas?|un|unidades?)?\.?\s+(?:de\s+)?(.+)$/i);
  if (!m) return { name: t, quantity: null, unit: null };
  return {
    name: m[3].trim(),
    quantity: Number(m[1].replace(',', '.')),
    unit: m[2] ? normalizeUnit(m[2]) : null,
  };
}
