const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function toDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  return new Date(value);
}

export function formatDate(value: Date | string): string {
  const date = toDate(value);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatShortDate(value: Date | string): string {
  const date = toDate(value);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

// "martes 14 oct", or "mar 14" when short
export function formatWeekday(value: Date | string, short = false): string {
  const date = toDate(value);
  const weekday = WEEKDAYS[date.getDay()];
  return short ? `${weekday.slice(0, 3)} ${date.getDate()}` : `${weekday} ${formatShortDate(date)}`;
}

// "13 – 15 oct 2026", or "30 sep – 2 oct 2026" across months
export function formatDateRange(start: Date | string, end: Date | string): string {
  const from = toDate(start);
  const to = toDate(end);
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  const first = sameMonth ? String(from.getDate()) : from.getFullYear() === to.getFullYear() ? formatShortDate(from) : formatDate(from);
  return `${first} – ${formatDate(to)}`;
}

export function isToday(value: Date | string): boolean {
  return toDate(value).toDateString() === new Date().toDateString();
}

export function formatItineraryCode(id: number): string {
  return `IT-${String(id).padStart(4, "0")}`;
}

export function formatTime(value: Date | string): string {
  if (typeof value === "string" && /^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  const date = toDate(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

export function formatDecimal(value: number, digits = 1): string {
  return value.toFixed(digits).replace(".", ",");
}
