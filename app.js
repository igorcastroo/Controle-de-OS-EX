const STATUSES = [
  { id: "pendente", label: "Pendentes" },
  { id: "andamento", label: "Em Andamento" },
  { id: "gerar-exe", label: "Gerar EXE" },
  { id: "aguardando", label: "Aguardando" },
  { id: "resolvido", label: "Resolvido" },
];

const STORAGE_KEY = "controle-os-kanban-v1";
const THEME_KEY = "controle-os-theme";
const SEED_KEY = "controle-os-seed-v4";

const initialTickets = [];

const state = {
  tickets: loadTickets(),
  search: "",
  draggedId: null,
  view: "active",
  monthFilter: "",
};

const board = document.querySelector("#board");
const columnTemplate = document.querySelector("#columnTemplate");
const ticketTemplate = document.querySelector("#ticketTemplate");
const ticketDialog = document.querySelector("#ticketDialog");
const ticketForm = document.querySelector("#ticketForm");
const dialogTitle = document.querySelector("#dialogTitle");
const deleteButton = document.querySelector("#deleteButton");
const archiveTicketButton = document.querySelector("#archiveTicketButton");
const statusInput = document.querySelector("#statusInput");
const importDialog = document.querySelector("#importDialog");
const importForm = document.querySelector("#importForm");
const importText = document.querySelector("#importText");
const archiveViewButton = document.querySelector("#archiveViewButton");
const archiveMonthInput = document.querySelector("#archiveMonthInput");
const clearMonthFilterButton = document.querySelector("#clearMonthFilterButton");
const archiveMonthButton = document.querySelector("#archiveMonthButton");
const viewLabel = document.querySelector("#viewLabel");
const noteInput = document.querySelector("#noteInput");
const noteEntryInput = document.querySelector("#noteEntryInput");
const addNoteButton = document.querySelector("#addNoteButton");
const noteHistory = document.querySelector("#noteHistory");
const newButtons = document.querySelectorAll("#headerNewButton");
const noteViewDialog = document.querySelector("#noteViewDialog");
const noteViewText = document.querySelector("#noteViewText");
const noteViewSaveButton = document.querySelector("#noteViewSaveButton");
let editingNoteIndex = null;

document.querySelector("#themeButton").textContent = "\u25D0";
document.querySelectorAll(".icon-button[data-close]").forEach((button) => {
  button.textContent = "\u00D7";
});

newButtons.forEach((button) => {
  button.addEventListener("click", () => openTicketDialog());
});
document.querySelector("#searchInput").addEventListener("input", (event) => {
  state.search = event.target.value.trim().toLowerCase();
  render();
});
document.querySelector("#exportButton").addEventListener("click", exportText);
document.querySelector("#importButton").addEventListener("click", () => importDialog.showModal());
document.querySelector("#themeButton").addEventListener("click", toggleTheme);
archiveViewButton.addEventListener("click", toggleArchiveView);
archiveMonthInput.addEventListener("input", (event) => {
  state.monthFilter = event.target.value;
  render();
});
clearMonthFilterButton.addEventListener("click", () => {
  archiveMonthInput.value = "";
  state.monthFilter = "";
  render();
});
archiveMonthButton.addEventListener("click", archiveSelectedMonth);
document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => document.querySelector(`#${button.dataset.close}`).close());
});
statusInput.addEventListener("change", () => {
  document.querySelector("#statusUpdatedAtInput").value = nowDateTimeInputValue();
});

ticketForm.addEventListener("submit", saveTicket);
deleteButton.addEventListener("click", deleteTicket);
archiveTicketButton.addEventListener("click", toggleTicketArchive);
importForm.addEventListener("submit", importTickets);
addNoteButton.addEventListener("click", addTimestampedNote);
noteViewSaveButton.addEventListener("click", saveViewedNote);
noteEntryInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) return;
  event.preventDefault();
  addTimestampedNote();
});

setupTheme();
setupStatusOptions();
render();

function ticket(number, title, status, note = "", priority = "Normal", dates = {}) {
  const createdAt = dates.createdAt || new Date().toISOString();
  const statusUpdatedAt = dates.statusUpdatedAt || createdAt;

  return {
    id: crypto.randomUUID(),
    number,
    title,
    company: dates.company || "",
    status,
    note,
    priority,
    createdAt,
    statusUpdatedAt,
    archivedAt: dates.archivedAt || "",
    updatedAt: dates.updatedAt || new Date().toISOString(),
  };
}

function loadTickets() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(SEED_KEY, "true");
    return initialTickets;
  }

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return initialTickets;
    const normalized = parsed.map(normalizeTicketDates);
    if (localStorage.getItem(SEED_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    }

    const corrected = applySeedDateCorrections(normalized);
    const knownNumbers = new Set(corrected.map((item) => item.number).filter(Boolean));
    const missingTickets = initialTickets.filter((item) => !knownNumbers.has(item.number));
    const mergedTickets = [...missingTickets, ...corrected];
    localStorage.setItem(SEED_KEY, "true");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedTickets));
    return mergedTickets;
  } catch {
    return initialTickets;
  }
}

function saveAll() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tickets));
}

function setupStatusOptions() {
  statusInput.innerHTML = STATUSES.map((status) => (
    `<option value="${status.id}">${status.label}</option>`
  )).join("");
}

function render() {
  board.innerHTML = "";
  const tickets = filteredTickets();
  const isArchivedView = state.view === "archived";

  archiveViewButton.textContent = isArchivedView ? "Ver ativas" : "Ver arquivadas";
  archiveMonthButton.disabled = isArchivedView;
  newButtons.forEach((button) => {
    button.disabled = isArchivedView;
  });
  viewLabel.textContent = isArchivedView
    ? "Mostrando OS arquivadas. Abra uma OS para restaurar."
    : "";

  STATUSES.forEach((status) => {
    const column = columnTemplate.content.firstElementChild.cloneNode(true);
    const zone = column.querySelector(".dropzone");
    const columnTickets = tickets.filter((item) => item.status === status.id);

    column.dataset.status = status.id;
    column.querySelector("h2").textContent = status.label;
    column.querySelector(".counter").textContent = columnTickets.length;
    zone.dataset.status = status.id;
    setupDropzone(zone);

    columnTickets.forEach((item) => zone.appendChild(renderTicket(item)));
    board.appendChild(column);
  });
}

function filteredTickets() {
  const visibleTickets = state.tickets.filter((item) => {
    const archived = Boolean(item.archivedAt);
    const visibleByArchive = state.view === "archived" ? archived : !archived;
    return visibleByArchive && matchesMonthFilter(item);
  });

  if (!state.search) return visibleTickets;
  return visibleTickets.filter((item) => {
    const text = [
      item.number,
      item.company,
      item.title,
      item.note,
      item.priority,
      formatDate(item.createdAt),
      formatDateTime(item.createdAt),
      formatDate(item.statusUpdatedAt),
      formatDateTime(item.statusUpdatedAt),
      formatDate(item.archivedAt),
      formatDateTime(item.archivedAt),
    ].join(" ").toLowerCase();
    return text.includes(state.search);
  });
}

function renderTicket(item) {
  const card = ticketTemplate.content.firstElementChild.cloneNode(true);
  const priorityClass = item.priority.toLowerCase();
  const dates = [
    `Cadastro: ${formatDateTime(item.createdAt)}`,
    `Status: ${formatDateTime(item.statusUpdatedAt)}`,
    item.archivedAt ? `Arquivado: ${formatDateTime(item.archivedAt)}` : "",
  ].filter(Boolean).join(" | ");

  card.dataset.id = item.id;
  card.querySelector("strong").textContent = item.number || "Sem numero";
  card.querySelector("p").textContent = item.title || "Sem descricao";
  const company = card.querySelector(".ticket-company");
  company.textContent = item.company || "";
  company.hidden = !item.company;
  const notes = card.querySelector(".ticket-notes");
  renderNoteBlocks(notes, item.note);
  notes.hidden = !item.note;
  card.querySelector(".ticket-dates").textContent = dates;
  card.querySelector(".priority").textContent = item.priority;
  card.querySelector(".priority").classList.add(priorityClass);
  card.addEventListener("click", () => openTicketDialog(item));
  card.addEventListener("dragstart", () => {
    state.draggedId = item.id;
    card.classList.add("dragging");
  });
  card.addEventListener("dragend", () => {
    state.draggedId = null;
    card.classList.remove("dragging");
  });

  return card;
}

function setupDropzone(zone) {
  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("over");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("over"));
  zone.addEventListener("drop", () => {
    zone.classList.remove("over");
    const item = state.tickets.find((ticketItem) => ticketItem.id === state.draggedId);
    if (!item) return;
    if (item.status !== zone.dataset.status) {
      item.statusUpdatedAt = new Date().toISOString();
    }
    item.status = zone.dataset.status;
    item.updatedAt = new Date().toISOString();
    saveAll();
    render();
  });
}

function openTicketDialog(item = null) {
  ticketForm.reset();
  dialogTitle.textContent = item ? "Editar OS" : "Nova OS";
  deleteButton.hidden = !item;
  archiveTicketButton.hidden = !item;
  archiveTicketButton.textContent = item?.archivedAt ? "Restaurar" : "Arquivar";
  document.querySelector("#ticketId").value = item?.id || "";
  document.querySelector("#numberInput").value = item?.number || "";
  document.querySelector("#companyInput").value = item?.company || "";
  document.querySelector("#titleInput").value = item?.title || "";
  document.querySelector("#statusInput").value = item?.status || "pendente";
  document.querySelector("#priorityInput").value = item?.priority || "Normal";
  document.querySelector("#createdAtInput").value = toDateTimeInputValue(item?.createdAt) || nowDateTimeInputValue();
  document.querySelector("#statusUpdatedAtInput").value = toDateTimeInputValue(item?.statusUpdatedAt) || nowDateTimeInputValue();
  noteInput.value = item?.note || "";
  noteEntryInput.value = "";
  renderDialogNotes();
  ticketDialog.showModal();
}

function saveTicket(event) {
  event.preventDefault();
  const id = document.querySelector("#ticketId").value;
  const previous = id ? state.tickets.find((item) => item.id === id) : null;
  const selectedStatus = document.querySelector("#statusInput").value;
  const statusDateInput = document.querySelector("#statusUpdatedAtInput").value;
  const statusChanged = previous && previous.status !== selectedStatus;
  const data = {
    number: document.querySelector("#numberInput").value.trim(),
    company: document.querySelector("#companyInput").value.trim(),
    title: document.querySelector("#titleInput").value.trim(),
    status: selectedStatus,
    priority: document.querySelector("#priorityInput").value,
    note: noteInput.value.trim(),
    createdAt: fromDateTimeInputValue(document.querySelector("#createdAtInput").value) || previous?.createdAt || new Date().toISOString(),
    statusUpdatedAt: statusChanged
      ? new Date().toISOString()
      : fromDateTimeInputValue(statusDateInput) || previous?.statusUpdatedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (id) {
    const index = state.tickets.findIndex((item) => item.id === id);
    state.tickets[index] = { ...state.tickets[index], ...data };
  } else {
    state.tickets.unshift({
      id: crypto.randomUUID(),
      ...data,
    });
  }

  saveAll();
  ticketDialog.close();
  render();
}

function addTimestampedNote() {
  const text = noteEntryInput.value.trim();
  if (!text) return;

  const entry = `[${formatDateTime(new Date().toISOString())}] Cadastro\n${text}`;
  noteInput.value = noteInput.value.trim()
    ? `${noteInput.value.trim()}\n${entry}`
    : entry;
  noteEntryInput.value = "";
  renderDialogNotes();
  noteEntryInput.focus();
}

function renderDialogNotes() {
  renderNoteBlocks(noteHistory, noteInput.value, { removable: true, editable: true });
  if (noteInput.value.trim()) return;

  const empty = document.createElement("p");
  empty.className = "note-empty";
  empty.textContent = "Nenhuma observacao adicionada.";
  noteHistory.appendChild(empty);
}

function renderNoteBlocks(container, value, options = {}) {
  container.innerHTML = "";
  parseNoteEntries(value).forEach((entry, index) => {
    const block = document.createElement("div");
    const text = document.createElement("span");

    block.className = "note-entry";
    block.title = options.editable
      ? "Clique para abrir e alterar"
      : "Clique para ver a observacao completa";
    block.addEventListener("click", (event) => {
      event.stopPropagation();
      openNoteView(entry, options.editable ? index : null);
    });
    text.className = "note-entry-text";
    text.textContent = entry;
    block.appendChild(text);

    if (options.removable) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "note-remove";
      button.textContent = "Remover";
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        removeNoteAt(index);
      });
      block.appendChild(button);
    }

    container.appendChild(block);
  });
}

function openNoteView(entry, index = null) {
  editingNoteIndex = index;
  noteViewText.value = entry;
  noteViewText.readOnly = index === null;
  noteViewSaveButton.hidden = index === null;
  noteViewDialog.showModal();
  noteViewText.focus();
}

function saveViewedNote() {
  if (editingNoteIndex === null) return;

  const entries = parseNoteEntries(noteInput.value);
  const nextValue = noteViewText.value.trim();

  if (nextValue) {
    entries[editingNoteIndex] = withNoteDates(nextValue, entries[editingNoteIndex]);
  } else {
    entries.splice(editingNoteIndex, 1);
  }

  noteInput.value = entries.join("\n");
  renderDialogNotes();

  const ticketId = document.querySelector("#ticketId").value;
  const ticketIndex = state.tickets.findIndex((item) => item.id === ticketId);
  if (ticketIndex !== -1) {
    state.tickets[ticketIndex] = {
      ...state.tickets[ticketIndex],
      note: noteInput.value.trim(),
      updatedAt: new Date().toISOString(),
    };
    saveAll();
    render();
  }

  noteViewDialog.close();
  editingNoteIndex = null;
}

function removeNoteAt(index) {
  const entries = parseNoteEntries(noteInput.value);
  entries.splice(index, 1);
  noteInput.value = entries.join("\n");
  renderDialogNotes();
}

function parseNoteEntries(value) {
  return String(value || "")
    // Uma nova observacao sempre comeca pelo carimbo criado no botao.
    // Quebras de linha comuns fazem parte da mesma observacao.
    .split(/\n(?=\[\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\]\s)/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function withNoteDates(value, previousEntry) {
  const createdMatch = String(previousEntry || "").match(/^\[([^\]]+)\](?:\s+Cadastro)?(?:\s+\|\s+Ultima alteracao:\s*[^\n]+)?\s*/i);
  const createdAt = createdMatch ? createdMatch[1] : formatDateTime(new Date().toISOString());
  const content = String(value || "")
    .replace(/^\[[^\]]+\](?:\s+Cadastro)?(?:\s+\|\s+Ultima alteracao:\s*[^\n]+)?\s*/i, "")
    .trim();
  const changedAt = formatDateTime(new Date().toISOString());

  return `[${createdAt}] Cadastro | Ultima alteracao: ${changedAt}\n${content}`;
}

function deleteTicket() {
  const id = document.querySelector("#ticketId").value;
  state.tickets = state.tickets.filter((item) => item.id !== id);
  saveAll();
  ticketDialog.close();
  render();
}

function toggleTicketArchive() {
  const id = document.querySelector("#ticketId").value;
  const item = state.tickets.find((ticketItem) => ticketItem.id === id);
  if (!item) return;

  item.archivedAt = item.archivedAt ? "" : new Date().toISOString();
  item.updatedAt = new Date().toISOString();
  saveAll();
  ticketDialog.close();
  render();
}

function toggleArchiveView() {
  state.view = state.view === "archived" ? "active" : "archived";
  render();
}

function archiveSelectedMonthLegacy() {
  const monthValue = archiveMonthInput.value;
  if (!monthValue) {
    alert("Selecione o mês que deseja arquivar.");
    return;
  }

  const range = getMonthRange(monthValue);
  const now = new Date().toISOString();
  let archivedCount = 0;

  state.tickets.forEach((item) => {
    if (item.archivedAt || item.status !== "resolvido") return;
    const statusDate = new Date(item.statusUpdatedAt);
    if (Number.isNaN(statusDate.getTime())) return;
    if (statusDate < range.start || statusDate > range.end) return;

    item.archivedAt = now;
    item.updatedAt = now;
    archivedCount += 1;
  });

  if (archivedCount > 0) saveAll();
  render();
  alert(`${archivedCount} OS resolvida(s) arquivada(s) no mês selecionado.`);
}

function archiveSelectedMonth() {
  const monthValue = archiveMonthInput.value;
  if (!monthValue) {
    alert("Selecione o mes que deseja arquivar.");
    return;
  }

  const range = getMonthRange(monthValue);
  const now = new Date().toISOString();
  let archivedCount = 0;

  state.tickets.forEach((item) => {
    if (item.archivedAt || item.status !== "resolvido") return;
    const statusDate = new Date(item.statusUpdatedAt);
    if (Number.isNaN(statusDate.getTime()) || statusDate < range.start || statusDate > range.end) return;

    item.archivedAt = now;
    item.updatedAt = now;
    archivedCount += 1;
  });

  if (archivedCount > 0) saveAll();
  render();
  alert(`${archivedCount} OS resolvida(s) arquivada(s) no mes selecionado.`);
}

function exportText() {
  const content = `CONTROLE-OS-TXT-V1\n${JSON.stringify({ tickets: state.tickets }, null, 2)}`;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `controle-os-${new Date().toISOString().slice(0, 10)}.txt`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function importTickets(event) {
  event.preventDefault();
  const imported = parseText(importText.value);
  if (!imported.length) return;

  state.tickets = [...imported, ...state.tickets];
  saveAll();
  importText.value = "";
  importDialog.close();
  render();
}

function parseText(text) {
  const backupTickets = parseBackupText(text);
  if (backupTickets) return backupTickets;

  const attendanceTicket = parseAttendanceDetails(text);
  if (attendanceTicket) return [attendanceTicket];

  let currentStatus = "pendente";
  let currentDate = "";
  const imported = [];
  const statusByTitle = {
    pendentes: "pendente",
    pendente: "pendente",
    "em andamento": "andamento",
    andamento: "andamento",
    "gerar exe": "gerar-exe",
    aguardando: "aguardando",
    resolvido: "resolvido",
    resolvidos: "resolvido",
  };

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

    imported.push(ticket(number, title, currentStatus, note, "Normal", {
      createdAt,
      statusUpdatedAt: createdAt,
    }));
  });

  return imported;
}

function parseBackupText(text) {
  const source = String(text || "").trim();
  if (!source.startsWith("CONTROLE-OS-TXT-V1")) return null;

  try {
    const data = JSON.parse(source.replace(/^CONTROLE-OS-TXT-V1\s*/, ""));
    if (!Array.isArray(data.tickets)) return [];
    return data.tickets.map((item) => normalizeTicketDates({
      ...item,
      id: item.id || crypto.randomUUID(),
      company: item.company || "",
    }));
  } catch {
    return [];
  }
}

function parseAttendanceDetails(text) {
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

  return ticket(number, subjectMatch ? subjectMatch[1].trim() : "Atendimento importado", statusByLabel[statusLabel] || "pendente", notes.join("\n"), "Normal", {
    createdAt,
    statusUpdatedAt: createdAt,
    company: companyMatch ? companyMatch[1].trim() : "",
  });
}

function parseAttendanceDetailsLegacy(text) {
  const plainText = String(text || "").replace(/\*\*/g, "").replace(/\r/g, "");
  if (!/Ver Detalhes Atendimento/i.test(plainText) || !/Ordem No\.:/i.test(plainText)) return null;

  const valueAfter = (label, source = plainText) => {
    const match = source.match(new RegExp(`${label}\\s*\\n?\\s*([^\\n]+)`, "i"));
    return match ? match[1].trim() : "";
  };
  const statusByLabel = {
    pendente: "pendente",
    "em andamento": "andamento",
    aguardando: "aguardando",
    resolvido: "resolvido",
  };
  const numberMatch = plainText.match(/Ordem No\.:\s*[\s\S]{0,120}?(\d{4}(?:\.\d+){3,})/i);
  const statusMatch = plainText.match(/Status do Atendimento:\s*([\s\S]{0,80}?)(?:\s+Alterar Status|\n|$)/i);
  const dateMatch = plainText.match(/Data\/Hora:\s*[\s\S]{0,120}?(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?)/i);
  const number = numberMatch ? numberMatch[1] : "";
  const statusLabel = statusMatch ? statusMatch[1].trim().toLowerCase() : "";
  const createdAt = parseBrazilianDateTime(dateMatch ? dateMatch[1] : "") || inferDateFromNumber(number);
  const subjectMatch = plainText.match(/Assunto:\s*\n?\s*([\s\S]*?)\n\s*Descri[cç][aã]o:/i);
  const descriptionMatch = plainText.match(/Descri[cç][aã]o:\s*\n?\s*([\s\S]*?)\n\s*HIST[ÓO]RICO DO ATENDIMENTO/i);
  const subject = subjectMatch ? subjectMatch[1].trim() : "Atendimento importado";
  const companyMatch = plainText.match(/Empresa:\s*[\s\S]{0,120}?([^\n]+?)(?=\s+Depto\. Destino:|\n|$)/i);
  const company = companyMatch ? companyMatch[1].trim() : "";
  const description = descriptionMatch ? descriptionMatch[1].trim() : "";
  const notes = [];

  if (description) {
    notes.push(`[${formatDateTime(createdAt)}] Descricao inicial:\n${description}`);
  }

  const historyStart = plainText.search(/HIST[ÓO]RICO DO ATENDIMENTO/i);
  const history = historyStart >= 0 ? plainText.slice(historyStart) : "";
  history.split(/(?=^\s*Data:\s*$)/m).forEach((entry) => {
    const dateMatch = entry.match(/Data:\s*[\s\S]{0,80}?(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?)/i);
    const date = dateMatch ? dateMatch[1] : "";
    const action = valueAfter("A[cç][aã]o:", entry).replace(/\s+Respons[aá]vel:.*$/i, "").trim();
    const responsible = valueAfter("Respons[aá]vel:", entry);
    const descriptionMatch = entry.match(/Descri[cç][aã]o:\s*\n?\s*([\s\S]*)$/i);
    const entryDescription = descriptionMatch ? descriptionMatch[1].trim() : "";
    if (!date || !entryDescription) return;

    const details = [action && `Acao: ${action}`, responsible && `Responsavel: ${responsible}`, entryDescription]
      .filter(Boolean)
      .join("\n");
    notes.push(`[${formatDateTime(parseBrazilianDateTime(date))}] ${details}`);
  });

  return ticket(number, subject, statusByLabel[statusLabel] || "pendente", notes.join("\n"), "Normal", {
    createdAt,
    statusUpdatedAt: createdAt,
    company,
  });
}

function normalizeTicketDates(item) {
  const createdAt = item.createdAt || item.updatedAt || new Date().toISOString();
  return {
    ...item,
    createdAt,
    statusUpdatedAt: item.statusUpdatedAt || item.updatedAt || createdAt,
    archivedAt: item.archivedAt || "",
  };
}

function applySeedDateCorrections(tickets) {
  const seedDates = new Map();
  initialTickets.forEach((item) => {
    if (!item.number) return;
    seedDates.set(item.number, {
      status: item.status,
      createdAt: item.createdAt,
      statusUpdatedAt: item.statusUpdatedAt,
    });
  });

  return tickets.map((item) => {
    const seed = seedDates.get(item.number);
    if (!seed) return item;

    return {
      ...item,
      createdAt: seed.createdAt || item.createdAt,
      statusUpdatedAt: item.status === seed.status
        ? seed.statusUpdatedAt || item.statusUpdatedAt
        : item.statusUpdatedAt,
    };
  });
}

function todayInputValue() {
  return toDateInputValue(new Date().toISOString());
}

function nowDateTimeInputValue() {
  return toDateTimeInputValue(new Date().toISOString());
}

function toDateInputValue(value) {
  if (!value) return "";
  const parts = getDateParts(value);
  if (!parts) return "";
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function toDateTimeInputValue(value) {
  if (!value) return "";
  const parts = getDateParts(value);
  if (!parts) return "";
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function fromDateInputValue(value) {
  if (!value) return "";
  return `${value}T12:00:00.000Z`;
}

function fromDateTimeInputValue(value) {
  if (!value) return "";
  return new Date(value).toISOString();
}

function parseBrazilianDate(value) {
  if (!value) return "";
  const match = value.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (!match) return "";

  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3] || String(new Date().getFullYear());
  return `${year}-${month}-${day}T12:00:00.000Z`;
}

function parseBrazilianDateTime(value) {
  if (!value) return "";
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return "";

  const [, rawDay, rawMonth, year, rawHour, minute] = match;
  const day = rawDay.padStart(2, "0");
  const month = rawMonth.padStart(2, "0");
  const hour = rawHour.padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}:00.000Z`;
}

function inferDateFromNumber(number) {
  const firstNumber = String(number || "").split(",")[0].trim();
  const match = firstNumber.match(/^(\d{4})\.(\d{2,4})\./);
  if (!match) return "";

  const year = match[1];
  const monthDay = match[2];
  let month = "";
  let day = "";

  if (monthDay.length === 2) {
    month = monthDay.slice(0, 1);
    day = monthDay.slice(1);
  } else if (monthDay.length === 3) {
    month = monthDay.slice(0, 1);
    day = monthDay.slice(1);
  } else {
    month = monthDay.slice(0, 2);
    day = monthDay.slice(2);
  }

  const parsed = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day)
  ) {
    return "";
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T12:00:00.000Z`;
}

function toMonthInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function matchesMonthFilter(item) {
  if (!state.monthFilter) return true;
  return [item.createdAt, item.statusUpdatedAt, item.archivedAt].some((value) => {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return toMonthInputValue(date) === state.monthFilter;
  });
}

function getMonthRange(value) {
  const [year, month] = value.split("-").map(Number);
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function formatDate(value) {
  if (!value) return "-";
  const parts = getDateParts(value);
  if (!parts) return "-";
  return `${parts.day}/${parts.month}/${parts.year}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const parts = getDateParts(value);
  if (!parts) return "-";
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

function getDateParts(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: String(date.getMonth() + 1).padStart(2, "0"),
    year: String(date.getFullYear()),
    hour: String(date.getHours()).padStart(2, "0"),
    minute: String(date.getMinutes()).padStart(2, "0"),
  };
}

function setupTheme() {
  const theme = localStorage.getItem(THEME_KEY);
  if (theme === "dark") document.body.classList.add("dark");
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, document.body.classList.contains("dark") ? "dark" : "light");
}
