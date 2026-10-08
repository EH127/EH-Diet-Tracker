export function moveItem<T>(items: T[], index: number, direction: -1 | 1): void {
  const next = index + direction;
  if (next < 0 || next >= items.length) return;
  [items[index], items[next]] = [items[next], items[index]];
}
