export function nevoDisplayName(nameEn: string | null | undefined, nameNl: string): string {
  const english = nameEn?.trim();
  return english ? english : nameNl.trim();
}

export function nevoEnglishRenames(
  foods: Array<{ id: string; name: string; nevoCode: number | null }>,
  nameEnByCode: Map<number, string>,
): Array<{ id: string; name: string }> {
  const changes: Array<{ id: string; name: string }> = [];
  for (const food of foods) {
    if (food.nevoCode == null) continue;
    const english = nameEnByCode.get(food.nevoCode)?.trim();
    if (!english || english === food.name) continue;
    changes.push({ id: food.id, name: english });
  }
  return changes;
}
