export function foodMatchesQuery(
  food: { name: string; originalName: string },
  query: string,
): boolean {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return food.name.toLowerCase().includes(term) || food.originalName.toLowerCase().includes(term);
}
