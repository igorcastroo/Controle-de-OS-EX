function toDateInputValue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function normalizeDailyEntry(entry) {
  const createdAt = entry.createdAt || entry.updatedAt || new Date().toISOString();
  return {
    id: entry.id || crypto.randomUUID(),
    date: /^\d{4}-\d{2}-\d{2}$/.test(entry.date || "") ? entry.date : toDateInputValue(createdAt),
    period: entry.period === "morning" ? "morning" : "afternoon",
    text: String(entry.text || "").trim(),
    category: String(entry.category || "Atividade").trim() || "Atividade",
    ticketId: String(entry.ticketId || ""),
    createdAt,
    updatedAt: entry.updatedAt || createdAt,
  };
}

export function createDailyEntry(data = {}) {
  const now = new Date().toISOString();
  return normalizeDailyEntry({
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...data,
  });
}

export function getDailyEntriesFor(entries, date, period) {
  return entries
    .filter((entry) => entry.date === date && entry.period === period)
    .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));
}

export function getDailyEntriesForDate(entries, date) {
  return entries
    .filter((entry) => entry.date === date)
    .sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt));
}

export function getDailyEntriesInRange(entries, dateFrom, dateTo, period = "") {
  if (!dateFrom || !dateTo || dateFrom > dateTo) return [];

  return entries
    .filter((entry) => entry.date >= dateFrom && entry.date <= dateTo)
    .filter((entry) => !period || entry.period === period)
    .sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt));
}
