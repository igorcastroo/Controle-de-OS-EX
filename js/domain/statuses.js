export const DEFAULT_STATUSES = Object.freeze([
  { id: "pendente", label: "Pendentes", color: "#d89b0d" },
  { id: "andamento", label: "Em Andamento", color: "#2563eb" },
  { id: "conferir", label: "Conferir", color: "#0f766e" },
  { id: "gerar-exe", label: "Gerar EXE", color: "#7c3aed" },
  { id: "aguardando", label: "Aguardando", color: "#c05621" },
  { id: "resolvido", label: "Resolvido", color: "#16803c" },
]);

const DEFAULT_COLOR = "#64748b";

export function cloneDefaultStatuses() {
  return DEFAULT_STATUSES.map((status) => ({ ...status }));
}

export function normalizeStatuses(value, fallback = DEFAULT_STATUSES) {
  if (!Array.isArray(value)) return fallback.map((status) => ({ ...status }));

  const usedIds = new Set();
  const statuses = value.flatMap((status) => {
    const id = String(status?.id || "").trim();
    const label = String(status?.label || "").trim();
    if (!id || !label || usedIds.has(id)) return [];
    usedIds.add(id);
    return [{
      id,
      label,
      color: normalizeColor(status?.color),
    }];
  });

  return statuses.length ? statuses : fallback.map((status) => ({ ...status }));
}

export function createStatusDefinition(existingStatuses, label = "Nova coluna") {
  const existingIds = new Set(existingStatuses.map((status) => status.id));
  const baseId = slugify(label) || "coluna";
  let id = baseId;
  let suffix = 2;

  while (existingIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return { id, label, color: DEFAULT_COLOR };
}

export function includeTicketStatuses(configuredStatuses, tickets) {
  const statuses = configuredStatuses.map((status) => ({ ...status }));
  const knownIds = new Set(statuses.map((status) => status.id));

  tickets.forEach((ticket) => {
    const id = String(ticket?.status || "").trim();
    if (!id || knownIds.has(id)) return;
    knownIds.add(id);
    statuses.push({
      id,
      label: humanizeStatusId(id),
      color: DEFAULT_COLOR,
      recovered: true,
    });
  });

  return statuses;
}

function normalizeColor(value) {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : DEFAULT_COLOR;
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function humanizeStatusId(value) {
  const label = String(value).replace(/[-_]+/g, " ").trim();
  return label ? label.replace(/^./, (letter) => letter.toUpperCase()) : "Coluna recuperada";
}
