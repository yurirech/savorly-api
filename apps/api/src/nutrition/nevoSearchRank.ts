export type NevoSearchRow = {
  nevoCode: number;
  nameNl: string;
  nameEn: string;
  foodGroupNl: string;
};

export function nevoSearchRelevanceTier(row: NevoSearchRow, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) {
    return 2;
  }
  const nameNl = row.nameNl.toLowerCase();
  const nameEn = row.nameEn.toLowerCase();
  if (nameNl.startsWith(q) || nameEn.startsWith(q)) {
    return 0;
  }
  if (nameNl.includes(q) || nameEn.includes(q)) {
    return 1;
  }
  return 2;
}

export function rankNevoSearchHits<T extends NevoSearchRow>(rows: T[], query: string, limit: number): T[] {
  const trimmed = query.trim();
  return [...rows]
    .filter((row) => nevoSearchRelevanceTier(row, trimmed) < 2)
    .sort((left, right) => {
      const leftTier = nevoSearchRelevanceTier(left, trimmed);
      const rightTier = nevoSearchRelevanceTier(right, trimmed);
      if (leftTier !== rightTier) {
        return leftTier - rightTier;
      }
      return left.nameNl.localeCompare(right.nameNl, "nl");
    })
    .slice(0, limit);
}
