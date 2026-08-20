export function loadTickets(storageKey, normalizeTicket) {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeTicket);
  } catch {
    return [];
  }
}

export function saveTickets(storageKey, tickets) {
  localStorage.setItem(storageKey, JSON.stringify(tickets));
}
