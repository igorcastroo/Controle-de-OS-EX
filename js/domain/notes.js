import { formatDateTime } from "../utils/dates.js";

export function parseNoteEntries(value) {
  return String(value || "")
    // Uma nova observacao sempre comeca pelo carimbo criado no botao.
    // Quebras de linha comuns fazem parte da mesma observacao.
    .split(/\n(?=\[\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\](?::|\s))/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function withNoteDates(value, previousEntry) {
  const createdMatch = String(previousEntry || "").match(/^\[([^\]]+)\](?:\s+Cadastro)?(?:\s+\|\s+Ultima alteracao:\s*[^\n]+)?\s*/i);
  const createdAt = createdMatch ? createdMatch[1] : formatDateTime(new Date().toISOString());
  const content = String(value || "")
    .replace(/^\[[^\]]+\](?:\s+Cadastro)?(?:\s+\|\s+Ultima alteracao:\s*[^\n]+)?\s*/i, "")
    .trim();
  const changedAt = formatDateTime(new Date().toISOString());

  return `[${createdAt}] Cadastro | Ultima alteracao: ${changedAt}\n${content}`;
}
