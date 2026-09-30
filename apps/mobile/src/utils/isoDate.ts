export function todayIsoDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfIsoWeek(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1).getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  return shiftIsoDate(date, mondayOffset);
}

export function shiftIsoDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(year, (month ?? 1) - 1, (day ?? 1) + days);
  return todayIsoDate(next);
}
