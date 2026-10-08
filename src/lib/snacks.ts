import type { BankEntry, SnackCategory, SnackItem } from '../types';

export function filterSnackCatalog(catalog: SnackCategory[], { query = '', categoryId = '', quantity = 1, remaining = 0, onlyFits = false } = {}): SnackCategory[] {
  const search = query.trim().toLocaleLowerCase('he');
  return catalog.filter(c => !categoryId || c.id === categoryId).map(c => ({ ...c, items: c.items.filter(item =>
    `${item.name} ${item.portion ?? ''}`.toLocaleLowerCase('he').includes(search) && (!onlyFits || item.kcal * quantity <= remaining)) })).filter(c => c.items.length > 0);
}
export function snackSelection(item: SnackItem, quantity = 1): Pick<BankEntry, 'label' | 'kcal' | 'charge'> {
  const label = `${quantity > 1 ? `${quantity}× ` : ''}${item.name}${item.portion ? ` (${item.portion})` : ''}`;
  return { label, kcal: item.kcal * quantity, charge: item.kcal * quantity };
}
