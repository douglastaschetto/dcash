import type { Unit } from './units';

/**
 * Starter catalog for the pantry "vitrine": common Brazilian household items
 * with a typical amount to keep at home, the level that should trigger the
 * shopping-list warning and an average shelf life (days, closed package /
 * fridge where applicable). Values are sensible defaults the user can edit.
 */
export type CatalogItem = {
  name: string;
  emoji: string;
  category: string;
  unit: Unit;
  qty: number;
  min: number;
  shelfDays: number;
};

export const PANTRY_CATALOG: CatalogItem[] = [
  // Hortifruti
  { name: 'Banana', emoji: '🍌', category: 'Hortifruti', unit: 'dz', qty: 1, min: 0.5, shelfDays: 6 },
  { name: 'Maçã', emoji: '🍎', category: 'Hortifruti', unit: 'un', qty: 6, min: 2, shelfDays: 21 },
  { name: 'Laranja', emoji: '🍊', category: 'Hortifruti', unit: 'kg', qty: 2, min: 0.5, shelfDays: 14 },
  { name: 'Limão', emoji: '🍋', category: 'Hortifruti', unit: 'un', qty: 6, min: 2, shelfDays: 21 },
  { name: 'Tomate', emoji: '🍅', category: 'Hortifruti', unit: 'kg', qty: 1, min: 0.5, shelfDays: 7 },
  { name: 'Cebola', emoji: '🧅', category: 'Hortifruti', unit: 'kg', qty: 1, min: 0.5, shelfDays: 30 },
  { name: 'Alho', emoji: '🧄', category: 'Hortifruti', unit: 'g', qty: 200, min: 50, shelfDays: 60 },
  { name: 'Batata', emoji: '🥔', category: 'Hortifruti', unit: 'kg', qty: 2, min: 0.5, shelfDays: 30 },
  { name: 'Cenoura', emoji: '🥕', category: 'Hortifruti', unit: 'kg', qty: 1, min: 0.5, shelfDays: 21 },
  { name: 'Alface', emoji: '🥬', category: 'Hortifruti', unit: 'un', qty: 1, min: 1, shelfDays: 5 },
  { name: 'Brócolis', emoji: '🥦', category: 'Hortifruti', unit: 'un', qty: 1, min: 1, shelfDays: 5 },
  { name: 'Abacate', emoji: '🥑', category: 'Hortifruti', unit: 'un', qty: 2, min: 1, shelfDays: 5 },
  // Açougue
  { name: 'Carne moída', emoji: '🥩', category: 'Açougue', unit: 'kg', qty: 1, min: 0.5, shelfDays: 90 },
  { name: 'Peito de frango', emoji: '🍗', category: 'Açougue', unit: 'kg', qty: 2, min: 0.5, shelfDays: 90 },
  { name: 'Bife', emoji: '🥩', category: 'Açougue', unit: 'kg', qty: 1, min: 0.5, shelfDays: 90 },
  { name: 'Linguiça', emoji: '🌭', category: 'Açougue', unit: 'kg', qty: 1, min: 0.5, shelfDays: 60 },
  { name: 'Peixe', emoji: '🐟', category: 'Açougue', unit: 'kg', qty: 1, min: 0.5, shelfDays: 90 },
  { name: 'Bacon', emoji: '🥓', category: 'Açougue', unit: 'g', qty: 250, min: 100, shelfDays: 30 },
  // Laticínios
  { name: 'Leite', emoji: '🥛', category: 'Laticínios', unit: 'L', qty: 6, min: 2, shelfDays: 120 },
  { name: 'Ovos', emoji: '🥚', category: 'Laticínios', unit: 'dz', qty: 1, min: 0.5, shelfDays: 30 },
  { name: 'Queijo mussarela', emoji: '🧀', category: 'Laticínios', unit: 'g', qty: 300, min: 100, shelfDays: 20 },
  { name: 'Manteiga', emoji: '🧈', category: 'Laticínios', unit: 'un', qty: 1, min: 1, shelfDays: 90 },
  { name: 'Iogurte', emoji: '🥣', category: 'Laticínios', unit: 'un', qty: 4, min: 1, shelfDays: 30 },
  { name: 'Requeijão', emoji: '🫙', category: 'Laticínios', unit: 'un', qty: 1, min: 1, shelfDays: 60 },
  // Padaria
  { name: 'Pão de forma', emoji: '🍞', category: 'Padaria', unit: 'pct', qty: 1, min: 1, shelfDays: 7 },
  { name: 'Pão francês', emoji: '🥖', category: 'Padaria', unit: 'un', qty: 6, min: 2, shelfDays: 2 },
  { name: 'Bolo', emoji: '🍰', category: 'Padaria', unit: 'un', qty: 1, min: 1, shelfDays: 5 },
  { name: 'Torrada', emoji: '🥪', category: 'Padaria', unit: 'pct', qty: 1, min: 1, shelfDays: 90 },
  // Mercearia
  { name: 'Arroz', emoji: '🍚', category: 'Mercearia', unit: 'kg', qty: 5, min: 1, shelfDays: 365 },
  { name: 'Feijão', emoji: '🫘', category: 'Mercearia', unit: 'kg', qty: 2, min: 1, shelfDays: 365 },
  { name: 'Macarrão', emoji: '🍝', category: 'Mercearia', unit: 'pct', qty: 3, min: 1, shelfDays: 540 },
  { name: 'Açúcar', emoji: '🍬', category: 'Mercearia', unit: 'kg', qty: 2, min: 1, shelfDays: 730 },
  { name: 'Sal', emoji: '🧂', category: 'Mercearia', unit: 'kg', qty: 1, min: 0.5, shelfDays: 1095 },
  { name: 'Café', emoji: '☕', category: 'Mercearia', unit: 'pct', qty: 2, min: 1, shelfDays: 180 },
  { name: 'Óleo', emoji: '🫗', category: 'Mercearia', unit: 'garrafa', qty: 2, min: 1, shelfDays: 365 },
  { name: 'Azeite', emoji: '🫒', category: 'Mercearia', unit: 'garrafa', qty: 1, min: 1, shelfDays: 540 },
  { name: 'Farinha de trigo', emoji: '🌾', category: 'Mercearia', unit: 'kg', qty: 1, min: 0.5, shelfDays: 180 },
  { name: 'Molho de tomate', emoji: '🥫', category: 'Mercearia', unit: 'un', qty: 3, min: 1, shelfDays: 365 },
  { name: 'Biscoito', emoji: '🍪', category: 'Mercearia', unit: 'pct', qty: 3, min: 1, shelfDays: 180 },
  { name: 'Achocolatado', emoji: '🍫', category: 'Mercearia', unit: 'un', qty: 1, min: 1, shelfDays: 365 },
  { name: 'Aveia', emoji: '🥣', category: 'Mercearia', unit: 'un', qty: 1, min: 1, shelfDays: 270 },
  { name: 'Milho em lata', emoji: '🌽', category: 'Mercearia', unit: 'lata', qty: 2, min: 1, shelfDays: 730 },
  // Bebidas
  { name: 'Água mineral', emoji: '💧', category: 'Bebidas', unit: 'garrafa', qty: 6, min: 2, shelfDays: 365 },
  { name: 'Refrigerante', emoji: '🥤', category: 'Bebidas', unit: 'garrafa', qty: 2, min: 1, shelfDays: 180 },
  { name: 'Suco', emoji: '🧃', category: 'Bebidas', unit: 'L', qty: 2, min: 1, shelfDays: 180 },
  { name: 'Cerveja', emoji: '🍺', category: 'Bebidas', unit: 'lata', qty: 12, min: 4, shelfDays: 180 },
  { name: 'Vinho', emoji: '🍷', category: 'Bebidas', unit: 'garrafa', qty: 1, min: 1, shelfDays: 730 },
  // Limpeza
  { name: 'Detergente', emoji: '🧴', category: 'Limpeza', unit: 'un', qty: 2, min: 1, shelfDays: 730 },
  { name: 'Sabão em pó', emoji: '🧺', category: 'Limpeza', unit: 'cx', qty: 1, min: 1, shelfDays: 730 },
  { name: 'Amaciante', emoji: '🫧', category: 'Limpeza', unit: 'un', qty: 1, min: 1, shelfDays: 730 },
  { name: 'Água sanitária', emoji: '🧪', category: 'Limpeza', unit: 'L', qty: 2, min: 1, shelfDays: 180 },
  { name: 'Esponja', emoji: '🧽', category: 'Limpeza', unit: 'un', qty: 4, min: 1, shelfDays: 1095 },
  { name: 'Saco de lixo', emoji: '🗑️', category: 'Limpeza', unit: 'pct', qty: 2, min: 1, shelfDays: 1095 },
  { name: 'Papel toalha', emoji: '🧻', category: 'Limpeza', unit: 'pct', qty: 1, min: 1, shelfDays: 1095 },
  // Higiene
  { name: 'Papel higiênico', emoji: '🧻', category: 'Higiene', unit: 'pct', qty: 2, min: 1, shelfDays: 1095 },
  { name: 'Sabonete', emoji: '🧼', category: 'Higiene', unit: 'un', qty: 4, min: 2, shelfDays: 1095 },
  { name: 'Shampoo', emoji: '🧴', category: 'Higiene', unit: 'un', qty: 1, min: 1, shelfDays: 730 },
  { name: 'Pasta de dente', emoji: '🪥', category: 'Higiene', unit: 'un', qty: 2, min: 1, shelfDays: 730 },
  { name: 'Desodorante', emoji: '🌬️', category: 'Higiene', unit: 'un', qty: 2, min: 1, shelfDays: 730 },
  // Pets
  { name: 'Ração', emoji: '🐶', category: 'Pets', unit: 'kg', qty: 3, min: 1, shelfDays: 180 },
  { name: 'Areia de gato', emoji: '🐱', category: 'Pets', unit: 'kg', qty: 4, min: 1, shelfDays: 1095 },
  { name: 'Petisco pet', emoji: '🦴', category: 'Pets', unit: 'pct', qty: 1, min: 1, shelfDays: 180 },
];

/** Soft tint behind each illustration (semantic tokens, both themes). */
export const CATEGORY_TINT: Record<string, string> = {
  Hortifruti: 'bg-primary-soft',
  Açougue: 'bg-danger-soft',
  Laticínios: 'bg-info-soft',
  Padaria: 'bg-warning-soft',
  Mercearia: 'bg-warning-soft',
  Bebidas: 'bg-info-soft',
  Limpeza: 'bg-primary-soft',
  Higiene: 'bg-info-soft',
  Pets: 'bg-warning-soft',
  Outros: 'bg-surface-2',
};

export const fmtShelf = (days: number) =>
  days >= 365 ? `${Math.round((days / 365) * 10) / 10} ano${days >= 730 ? 's' : ''}`.replace('.', ',')
    : days >= 60 ? `${Math.round(days / 30)} meses`
    : `${days} dia${days === 1 ? '' : 's'}`;
