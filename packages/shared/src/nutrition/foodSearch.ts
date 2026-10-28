export function foodMatchesQuery(
  food: { name: string; originalName: string; category?: string | null },
  query: string,
): boolean {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return (
    food.name.toLowerCase().includes(term) ||
    food.originalName.toLowerCase().includes(term) ||
    (food.category ?? "").toLowerCase().includes(term)
  );
}
