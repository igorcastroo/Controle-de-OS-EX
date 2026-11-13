import { COMPANY_CODES } from "../config.js";
import { createTicket, normalizeTicketDates } from "../domain/tickets.js";
import { normalizeDailyEntry } from "../domain/daily.js";
import { normalizeStatuses } from "../domain/statuses.js";
import { parseBrazilianDate, parseBrazilianDateTime, inferDateFromNumber, formatDateTime } from "../utils/dates.js";

export function parseStatusesFromBackup(text) {
  const source = String(text || "").trim();
  if (!source.startsWith("CONTROLE-OS-TXT-V1")) return [];
  try {
    const data = JSON.parse(source.replace(/^CONTROLE-OS-TXT-V1\s*/, ""));
    return normalizeStatuses(data.statuses, []);
  } catch {
    return [];
  }
}

export function parseDailyEntriesFromBackup(text) {
  const source = String(text || "").trim();
  if (!source.startsWith("CONTROLE-OS-TXT-V1")) return [];
  try {
    const data = JSON.parse(source.replace(/^CONTROLE-OS-TXT-V1\s*/, ""));
    return Array.isArray(data.dailyEntries) ? data.dailyEntries.map(normalizeDailyEntry) : [];
  } catch {
    return [];
  }
}

export function parseText(text, statuses = []) {
  const backupTickets = parseBackupText(text);
  if (backupTickets) return backupTickets;

  const attendanceTicket = parseAttendanceDetails(text, statuses);
  if (attendanceTicket) return [attendanceTicket];

  const receiptPrintingTicket = parseReceiptPrintingRequest(text);
  if (receiptPrintingTicket) return [receiptPrintingTicket];

  let currentStatus = "pendente";
  let currentDate = "";
  const imported = [];
  const statusByTitle = {
    pendentes: "pendente",
    pendente: "pendente",
    "em andamento": "andamento",
    andamento: "andamento",
    "gerar exe": "gerar-exe",
    conferir: "conferir",
    aguardando: "aguardando",
    resolvido: "resolvido",
    resolvidos: "resolvido",
  };
  statuses.forEach((status) => {
    statusByTitle[status.label.trim().toLocaleLowerCase("pt-BR")] = status.id;
  });

  text.split(/\r?\n/).forEach((line) => {
    const clean = line.trim();
    if (!clean) return;

    const heading = clean.replace(/^\*+\s*/, "").toLowerCase();
    if (statusByTitle[heading]) {
      currentStatus = statusByTitle[heading];
      return;
    }

    const datedTicket = clean.match(/^\d{1,2}\/\d{1,2}(?:\/\d{4})?\s+-\s+(\d{4}\..*)$/);
    const dateHeading = clean.match(/^(\d{1,2}\/\d{1,2}(?:\/\d{4})?)/);
    if (dateHeading) currentDate = dateHeading[1];
    if (!clean.startsWith("-") && !datedTicket) return;

    const body = datedTicket ? datedTicket[1] : clean.replace(/^-\s*/, "");
    const match = body.match(/^([\d.,\s]+)\s+-\s+(.*)$/);
    const number = match ? match[1].trim().replace(/,$/, "") : "";
    const description = match ? match[2].trim() : body;
    const noteMatch = description.match(/\*(.*?)\*/);
    const note = noteMatch ? noteMatch[1].trim() : "";
    const title = description.replace(/\*(.*?)\*/g, "").replace(/\s+-\s*$/, "").trim();

    const createdAt = parseBrazilianDate(currentDate) || inferDateFromNumber(number);

    imported.push(createTicket(number, title, currentStatus, note, "Normal", {
      createdAt,
      statusUpdatedAt: createdAt,
    }));
  });

  return imported;
}

export function parseBackupText(text) {
  const source = String(text || "").trim();
  if (!source.startsWith("CONTROLE-OS-TXT-V1")) return null;

  try {
    const data = JSON.parse(source.replace(/^CONTROLE-OS-TXT-V1\s*/, ""));
    if (!Array.isArray(data.tickets)) return [];
    return data.tickets.map((item) => normalizeTicketDates({
      ...item,
      id: item.id || crypto.randomUUID(),
      company: item.company || "",
    }, COMPANY_CODES));
  } catch {
    return [];
  }
}

export function parseAttendanceDetails(text, statuses = []) {
  const plainText = String(text || "").replace(/\*\*/g, "").replace(/\r/g, "");
  if (!/Ver Detalhes Atendimento/i.test(plainText) || !/Ordem No\.:/i.test(plainText)) return null;

  const descriptionLabel = "Descri(?:\\u00E7|c)(?:\\u00E3|a)o";
  const historyLabel = "HIST(?:\\u00D3|O)RICO DO ATENDIMENTO";
  const numberMatch = plainText.match(/Ordem No\.:\s*[\s\S]{0,120}?(\d{4}(?:\.\d+){3,})/i);
  const statusMatch = plainText.match(/Status do Atendimento:\s*([\s\S]{0,80}?)(?:\s+Alterar Status|\n|$)/i);
  const dateMatch = plainText.match(/Data\/Hora:\s*[\s\S]{0,120}?(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?)/i);
  const subjectMatch = plainText.match(new RegExp(`Assunto:\\s*\\n?\\s*([\\s\\S]*?)\\n\\s*${descriptionLabel}:`, "i"));
  const descriptionMatch = plainText.match(new RegExp(`${descriptionLabel}:\\s*\\n?\\s*([\\s\\S]*?)\\n\\s*${historyLabel}`, "i"));
  const companyMatch = plainText.match(/Empresa:\s*[\s\S]{0,120}?([^\n]+?)(?=\s+Depto\. Destino:|\n|$)/i);
  const statusByLabel = {
    pendente: "pendente",
    "em andamento": "andamento",
    aguardando: "aguardando",
    resolvido: "resolvido",
  };
  statuses.forEach((status) => {
    statusByLabel[status.label.trim().toLocaleLowerCase("pt-BR")] = status.id;
  });
  const number = numberMatch ? numberMatch[1] : "";
  const statusLabel = statusMatch ? statusMatch[1].trim().toLowerCase() : "";
  const createdAt = parseBrazilianDateTime(dateMatch ? dateMatch[1] : "") || inferDateFromNumber(number);
  const notes = [];
  const description = descriptionMatch ? descriptionMatch[1].trim() : "";

  if (description) notes.push(`[${formatDateTime(createdAt)}] Cadastro\n${description}`);

  const historyStart = plainText.search(new RegExp(historyLabel, "i"));
  const history = historyStart >= 0 ? plainText.slice(historyStart) : "";
  const descriptionPattern = new RegExp(`${descriptionLabel}:\\s*\\n?\\s*([\\s\\S]*)$`, "i");

  history.split(/(?=^\s*Data:\s*$)/m).forEach((entry) => {
    const historyDateMatch = entry.match(/Data:\s*[\s\S]{0,80}?(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?)/i);
    const entryDescriptionMatch = entry.match(descriptionPattern);
    const entryDescription = entryDescriptionMatch ? entryDescriptionMatch[1].trim() : "";
    if (!historyDateMatch || !entryDescription) return;

    notes.push(`[${formatDateTime(parseBrazilianDateTime(historyDateMatch[1]))}] Cadastro\n${entryDescription}`);
  });

  return createTicket(number, subjectMatch ? subjectMatch[1].trim() : "Atendimento importado", statusByLabel[statusLabel] || "pendente", notes.join("\n"), "Normal", {
    createdAt,
    statusUpdatedAt: createdAt,
    company: companyMatch ? companyMatch[1].trim() : "",
  });
}

export function parseReceiptPrintingRequest(text) {
  const plainText = decodeCopiedHtmlEntities(text)
    .replace(/\*\*/g, "")
    .replace(/\r/g, "")
    .trim();
  const parenthesizedMatch = plainText.match(/(\d{4}(?:\.\d+){3,})\s*\(\s*(\d+)\s*\)\s*-\s*([\s\S]+)$/);
  const labeledMatch = plainText.match(/(\d{4}(?:\.\d+){3,})\s*-\s*([\s\S]*?)\s+(\d+)\s+c[o\u00f3]digo\s+da\s+empresa\b/i);
  const simpleMatch = plainText.match(/(\d{4}(?:\.\d+){3,})\s*-\s*([\s\S]+)$/);
  if (!parenthesizedMatch && !labeledMatch && !simpleMatch) return null;

  const number = (parenthesizedMatch || labeledMatch || simpleMatch)[1];
  const title = (parenthesizedMatch ? parenthesizedMatch[3] : labeledMatch ? labeledMatch[2] : simpleMatch[2])
    .replace(/\s+/g, " ")
    .trim();
  const companyCode = parenthesizedMatch ? parenthesizedMatch[2] : labeledMatch ? labeledMatch[3] : "";
  const createdAt = inferDateFromNumber(number);

  return createTicket(number, title || "Solicitacao de impressao de recibo", "pendente", "", "Normal", {
    createdAt,
    statusUpdatedAt: createdAt,
    companyCode,
  });
}

export function decodeCopiedHtmlEntities(value) {
  return String(value || "")
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&nbsp;/gi, " ");
}

export function serializeBackup({ tickets, dailyEntries, statuses }) {
  return `CONTROLE-OS-TXT-V1\n${JSON.stringify({ tickets, dailyEntries, statuses }, null, 2)}`;
}
