export type IntDate = number; // yyyymmdd

export function toIntDate(d: Date): IntDate {
  const y = d.getUTCFullYear();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  return parseInt(`${y}${m}${day}`, 10);
}

export function fromIntDate(yyyymmdd: IntDate): Date {
  const s = yyyymmdd.toString();
  const y = parseInt(s.slice(0, 4), 10);
  const m = parseInt(s.slice(4, 6), 10) - 1;
  const d = parseInt(s.slice(6, 8), 10);
  return new Date(Date.UTC(y, m, d));
}

export function addDaysInt(intDate: IntDate, delta: number): IntDate {
  const d = fromIntDate(intDate);
  d.setUTCDate(d.getUTCDate() + delta);
  return toIntDate(d);
}

export function todayIntUTC(): IntDate {
  return toIntDate(new Date());
}

export function daysAgoIntUTC(days: number): IntDate {
  return addDaysInt(todayIntUTC(), -days);
}
