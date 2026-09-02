import {
  entrarComGoogle,
  excluirRegistroDiario,
  excluirOS,
  observarAutenticacao,
  observarDiario,
  observarOS,
  sairDaConta,
  salvarRegistroDiario,
  salvarOS,
} from "./firebase.js";
import {
  createTicket,
  needsCompanyCodeMigration,
  normalizeCompanyDetails,
  normalizeTicketDates,
} from "./js/tickets.js";
import {
  createDailyEntry,
  getDailyEntriesFor,
  getDailyEntriesForDate,
  getDailyEntriesInRange,
  normalizeDailyEntry,
} from "./js/daily.js";
import { loadTickets, saveTickets } from "./js/storage.js";

const STATUSES = [
  { id: "pendente", label: "Pendentes" },
  { id: "andamento", label: "Em Andamento" },
  { id: "conferir", label: "Conferir" },
  { id: "gerar-exe", label: "Gerar EXE" },
  { id: "aguardando", label: "Aguardando" },
  { id: "resolvido", label: "Resolvido" },
];

const STORAGE_KEY = "controle-os-kanban-v1";
const DAILY_STORAGE_KEY = "controle-os-daily-v1";
const THEME_KEY = "controle-os-theme";
const COMPANY_CODES = new Map([
  ["PONTO CELL CLJ ACESSORIOS ELETRONICOS E ASSISTENCIA LTDA", "95646"],
]);

const localTickets = loadTickets(STORAGE_KEY, (item) => normalizeTicketDates(item, COMPANY_CODES));
const state = {
  tickets: [],
  dailyEntries: [],
  localTickets,
  search: "",
  draggedId: null,
  view: "active",
  dailyDate: toDateInputValue(new Date()),
  dailyPeriod: "afternoon",
  dateFrom: "",
  dateTo: "",
  user: null,
  unsubscribeTickets: null,
  unsubscribeDailyEntries: null,
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
const dailyViewButton = document.querySelector("#dailyViewButton");
const dailyView = document.querySelector("#dailyView");
const dailyDateInput = document.querySelector("#dailyDateInput");
const dailyTitle = document.querySelector("#dailyTitle");
const dailyCount = document.querySelector("#dailyCount");
const dailyEntryForm = document.querySelector("#dailyEntryForm");
const dailyTextInput = document.querySelector("#dailyTextInput");
const dailyCategoryInput = document.querySelector("#dailyCategoryInput");
const dailyTicketInput = document.querySelector("#dailyTicketInput");
const dailyEntries = document.querySelector("#dailyEntries");
const dailyLinkedTickets = document.querySelector("#dailyLinkedTickets");
const dailySummaryText = document.querySelector("#dailySummaryText");
const dateFromInput = document.querySelector("#dateFromInput");
const dateToInput = document.querySelector("#dateToInput");
const todayFilterButton = document.querySelector("#todayFilterButton");
const clearDateFilterButton = document.querySelector("#clearDateFilterButton");
const archiveRangeButton = document.querySelector("#archiveRangeButton");
const viewLabel = document.querySelector("#viewLabel");
const noteInput = document.querySelector("#noteInput");
const noteEntryInput = document.querySelector("#noteEntryInput");
const addNoteButton = document.querySelector("#addNoteButton");
const noteHistory = document.querySelector("#noteHistory");
const newButtons = document.querySelectorAll("#headerNewButton");
const noteViewDialog = document.querySelector("#noteViewDialog");
const noteViewText = document.querySelector("#noteViewText");
const noteViewSaveButton = document.querySelector("#noteViewSaveButton");
const authButton = document.querySelector("#authButton");
const migrateButton = document.querySelector("#migrateButton");
const syncStatus = document.querySelector("#syncStatus");
const whatsappButton = document.querySelector("#whatsappButton");
const whatsappDialog = document.querySelector("#whatsappDialog");
const whatsappForm = document.querySelector("#whatsappForm");
const whatsappDateInput = document.querySelector("#whatsappDateInput");
const whatsappSingleDateField = document.querySelector("#whatsappSingleDateField");
const whatsappCustomDates = document.querySelector("#whatsappCustomDates");
const whatsappDateFromInput = document.querySelector("#whatsappDateFromInput");
const whatsappDateToInput = document.querySelector("#whatsappDateToInput");
const whatsappStatusOptions = document.querySelector("#whatsappStatusOptions");
const whatsappSelectionInfo = document.querySelector("#whatsappSelectionInfo");
const whatsappIncludeDailyInput = document.querySelector("#whatsappIncludeDailyInput");
let editingNoteIndex = null;
let whatsappPeriod = "today";

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
whatsappButton.addEventListener("click", openWhatsappDialog);
whatsappForm.addEventListener("submit", sendWhatsappSummary);
whatsappDateInput.addEventListener("input", updateWhatsappSelection);
whatsappDateFromInput.addEventListener("input", updateWhatsappSelection);
whatsappDateToInput.addEventListener("input", updateWhatsappSelection);
whatsappIncludeDailyInput.addEventListener("change", updateWhatsappSelection);
document.querySelectorAll("[data-whatsapp-period]").forEach((button) => {
  button.addEventListener("click", () => {
    whatsappPeriod = button.dataset.whatsappPeriod;
    if (whatsappPeriod === "custom") {
      const selectedDate = whatsappDateInput.value || toDateInputValue(new Date());
      if (!whatsappDateFromInput.value) whatsappDateFromInput.value = selectedDate;
      if (!whatsappDateToInput.value) whatsappDateToInput.value = selectedDate;
    }
    updateWhatsappSelection();
  });
});
authButton.addEventListener("click", toggleAuthentication);
migrateButton.addEventListener("click", migrateLocalTickets);
archiveViewButton.addEventListener("click", toggleArchiveView);
dailyViewButton.addEventListener("click", toggleDailyView);
dailyDateInput.addEventListener("change", () => {
  state.dailyDate = dailyDateInput.value || toDateInputValue(new Date());
  renderDailyView();
});
document.querySelector("#dailyTodayButton").addEventListener("click", () => {
  state.dailyDate = toDateInputValue(new Date());
  renderDailyView();
});
document.querySelector("#dailyPreviousButton").addEventListener("click", () => changeDailyDate(-1));
document.querySelector("#dailyNextButton").addEventListener("click", () => changeDailyDate(1));
document.querySelectorAll("[data-daily-period]").forEach((button) => {
  button.addEventListener("click", () => {
    state.dailyPeriod = button.dataset.dailyPeriod;
    renderDailyView();
  });
});
dailyEntryForm.addEventListener("submit", addDailyEntry);
document.querySelector("#dailyWhatsappButton").addEventListener("click", () => {
  openWhatsappDialog();
  whatsappDateInput.value = state.dailyDate;
  whatsappPeriod = state.dailyPeriod;
  updateWhatsappSelection();
});
function updateDateFrom(event) {
  state.dateFrom = event.target.value;
  render();
}

function updateDateTo(event) {
  state.dateTo = parseEndDate(event.target.value)?.value || "";
  render();
}

function parseEndDate(value) {
  const match = value.trim().match(/^(?:(\d{2})\/(\d{2})\/(\d{4})|(\d{4})-(\d{2})-(\d{2}))$/);
  if (!match) return null;

  const [, localDay, localMonth, localYear, isoYear, isoMonth, isoDay] = match;
  const day = Number(localDay || isoDay);
  const month = Number(localMonth || isoMonth);
  const year = Number(localYear || isoYear);
  if (month < 1 || month > 12 || day < 1) return null;

  const lastDay = new Date(year, month, 0).getDate();
  const adjustedDay = Math.min(day, lastDay);
  const normalizedValue = `${year}-${String(month).padStart(2, "0")}-${String(adjustedDay).padStart(2, "0")}`;

  return {
    value: normalizedValue,
    displayValue: `${String(adjustedDay).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`,
    adjusted: adjustedDay !== day,
  };
}

function normalizeEndDate() {
  const parsed = parseEndDate(dateToInput.value);
  if (!parsed) return null;

  dateToInput.value = parsed.displayValue;
  state.dateTo = parsed.value;
  return parsed;
}

// Alguns navegadores só confirmam a digitação em campos type="date" no
// evento "change". Escutamos os dois eventos para manter o filtro sincronizado.
dateFromInput.addEventListener("input", updateDateFrom);
dateFromInput.addEventListener("change", updateDateFrom);
dateToInput.addEventListener("input", updateDateTo);
dateToInput.addEventListener("change", () => {
  normalizeEndDate();
  render();
});
todayFilterButton.addEventListener("click", () => {
  const today = toDateInputValue(new Date());
  dateFromInput.value = today;
  dateToInput.value = formatDate(`${today}T12:00:00`);
  state.dateFrom = today;
  state.dateTo = today;
  render();
});
clearDateFilterButton.addEventListener("click", () => {
  dateFromInput.value = "";
  dateToInput.value = "";
  state.dateFrom = "";
  state.dateTo = "";
  render();
});
archiveRangeButton.addEventListener("click", archiveSelectedRange);
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
setupWhatsappStatusOptions();
render();
observarAutenticacao(handleAuthenticationState);

function saveAll() {
  saveTickets(STORAGE_KEY, state.tickets);
  state.tickets.forEach(saveTicketToFirestore);
}

async function toggleAuthentication() {
  try {
    if (state.user) {
      await sairDaConta();
      return;
    }
    await entrarComGoogle();
  } catch (error) {
    syncStatus.textContent = `Nao foi possivel entrar: ${error.message}`;
  }
}

function handleAuthenticationState(user) {
  state.unsubscribeTickets?.();
  state.unsubscribeDailyEntries?.();
  state.unsubscribeTickets = null;
  state.unsubscribeDailyEntries = null;
  state.user = user;
  authButton.textContent = user ? "Sair" : "Entrar com Google";

  if (!user) {
    state.tickets = [];
    state.dailyEntries = [];
    migrateButton.hidden = true;
    syncStatus.textContent = "Entre com Google para acessar suas OS na nuvem.";
    render();
    return;
  }

  syncStatus.textContent = `Conectado como ${user.email}`;
  state.unsubscribeTickets = observarOS(user.uid, (snapshot) => {
    const migrations = [];
    state.tickets = snapshot.docs.map((ticketDocument) => {
      const rawTicket = {
        ...ticketDocument.data(),
        id: ticketDocument.id,
      };
      const normalizedTicket = normalizeTicketDates(rawTicket, COMPANY_CODES);
      if (needsCompanyCodeMigration(rawTicket, normalizedTicket)) migrations.push(normalizedTicket);
      return normalizedTicket;
    });
    saveTickets(STORAGE_KEY, state.tickets);
    migrateButton.hidden = snapshot.size > 0 || state.localTickets.length === 0;
    render();
    migrations.forEach(saveTicketToFirestore);
  }, (error) => {
    syncStatus.textContent = `Erro ao sincronizar: ${error.message}`;
  });
  state.unsubscribeDailyEntries = observarDiario(user.uid, (snapshot) => {
    state.dailyEntries = snapshot.docs.map((entryDocument) => normalizeDailyEntry({
      ...entryDocument.data(),
      id: entryDocument.id,
    }));
    saveTickets(DAILY_STORAGE_KEY, state.dailyEntries);
    renderDailyView();
  }, (error) => {
    syncStatus.textContent = `Erro ao sincronizar Diário: ${error.message}`;
  });
}

async function saveTicketToFirestore(ticketItem) {
  if (!state.user) return false;
  try {
    await salvarOS(state.user.uid, ticketItem);
    return true;
  } catch (error) {
    syncStatus.textContent = `Erro ao salvar: ${error.message}`;
    return false;
  }
}

async function deleteTicketFromFirestore(ticketId) {
  if (!state.user) return;
  try {
    await excluirOS(state.user.uid, ticketId);
  } catch (error) {
    syncStatus.textContent = `Erro ao excluir: ${error.message}`;
  }
}

async function saveDailyEntryToFirestore(entry) {
  if (!state.user) return false;
  try {
    await salvarRegistroDiario(state.user.uid, entry);
    return true;
  } catch (error) {
    syncStatus.textContent = `Erro ao salvar atividade: ${error.message}`;
    return false;
  }
}

async function deleteDailyEntryFromFirestore(entryId) {
  if (!state.user) return;
  try {
    await excluirRegistroDiario(state.user.uid, entryId);
  } catch (error) {
    syncStatus.textContent = `Erro ao excluir atividade: ${error.message}`;
  }
}

async function migrateLocalTickets() {
  if (!state.user || !state.localTickets.length) return;
  migrateButton.disabled = true;
  syncStatus.textContent = "Migrando OS locais...";
  try {
    const results = await Promise.all(state.localTickets.map(saveTicketToFirestore));
    if (results.some((saved) => !saved)) return;
    state.localTickets = [];
    migrateButton.hidden = true;
    syncStatus.textContent = "OS locais migradas para o Firestore.";
  } finally {
    migrateButton.disabled = false;
  }
}

function setupStatusOptions() {
  statusInput.innerHTML = STATUSES.map((status) => (
    `<option value="${status.id}">${status.label}</option>`
  )).join("");
}

function setupWhatsappStatusOptions() {
  whatsappStatusOptions.innerHTML = STATUSES.map((status) => (
    `<label><input type="checkbox" name="whatsappStatus" value="${status.id}"> <span data-whatsapp-status-label="${status.id}">${status.label} (0)</span></label>`
  )).join("");
  whatsappStatusOptions.addEventListener("change", updateWhatsappSelection);
}

function openWhatsappDialog() {
  const today = toDateInputValue(new Date());
  whatsappDateInput.value = today;
  whatsappDateFromInput.value = today;
  whatsappDateToInput.value = today;
  whatsappPeriod = "today";
  whatsappStatusOptions.querySelectorAll("input").forEach((input) => {
    input.checked = false;
  });
  updateWhatsappSelection();
  whatsappDialog.showModal();
}

function updateWhatsappSelection() {
  document.querySelectorAll("[data-whatsapp-period]").forEach((button) => {
    button.classList.toggle("active", button.dataset.whatsappPeriod === whatsappPeriod);
  });
  const isCustomPeriod = whatsappPeriod === "custom";
  whatsappSingleDateField.hidden = isCustomPeriod;
  whatsappCustomDates.hidden = !isCustomPeriod;
  const availableTickets = getWhatsappTicketsForStatuses(STATUSES.map((status) => status.id));
  STATUSES.forEach((status) => {
    const count = availableTickets.filter((item) => item.status === status.id).length;
    const label = whatsappStatusOptions.querySelector(`[data-whatsapp-status-label="${status.id}"]`);
    if (label) label.textContent = `${status.label} (${count})`;
  });
  const count = getWhatsappTickets().length;
  whatsappSelectionInfo.textContent = `${count} OS sera(ão) enviada(s).`;
}

function getWhatsappTickets() {
  const selectedStatuses = [...whatsappStatusOptions.querySelectorAll("input:checked")]
    .map((input) => input.value);
  return getWhatsappTicketsForStatuses(selectedStatuses);
}

function getWhatsappTicketsForStatuses(selectedStatuses) {
  const range = getWhatsappPeriodRange();
  if (!selectedStatuses.length || !range) return [];

  return state.tickets
    .filter((item) => !item.archivedAt && selectedStatuses.includes(item.status))
    .filter((item) => {
      const updatedAt = new Date(item.statusUpdatedAt || item.createdAt);
      return !Number.isNaN(updatedAt.getTime()) && updatedAt >= range.start && updatedAt <= range.end;
    })
    .sort((first, second) => new Date(second.statusUpdatedAt || second.createdAt) - new Date(first.statusUpdatedAt || first.createdAt));
}

function getWhatsappPeriodRange() {
  if (whatsappPeriod === "custom") {
    if (!whatsappDateFromInput.value || !whatsappDateToInput.value) return null;
    const [startYear, startMonth, startDay] = whatsappDateFromInput.value.split("-").map(Number);
    const [endYear, endMonth, endDay] = whatsappDateToInput.value.split("-").map(Number);
    const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
    const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
    return start <= end ? { start, end } : null;
  }
  if (!whatsappDateInput.value) return null;
  const [year, month, day] = whatsappDateInput.value.split("-").map(Number);
  const start = new Date(year, month - 1, day, whatsappPeriod === "afternoon" ? 12 : 0, 0, 0, 0);
  const end = new Date(year, month - 1, day, whatsappPeriod === "morning" ? 11 : 23, whatsappPeriod === "morning" ? 59 : 59, 59, 999);
  return { start, end };
}

function render() {
  board.innerHTML = "";
  const tickets = filteredTickets();
  const isArchivedView = state.view === "archived";
  const isDailyView = state.view === "daily";

  archiveViewButton.textContent = isArchivedView ? "Ver ativas" : "Ver arquivadas";
  dailyViewButton.classList.toggle("active", isDailyView);
  dailyViewButton.setAttribute("aria-pressed", String(isDailyView));
  board.hidden = isDailyView;
  dailyView.hidden = !isDailyView;
  archiveRangeButton.disabled = isArchivedView || !state.user;
  newButtons.forEach((button) => {
    button.disabled = isArchivedView || !state.user;
  });
  viewLabel.textContent = isArchivedView
    ? "Mostrando OS arquivadas. Abra uma OS para restaurar."
    : isDailyView
      ? "Registre atividades do dia sem alterar o histórico técnico das OS."
      : "";

  if (isDailyView) {
    renderDailyView();
    return;
  }

  STATUSES.forEach((status) => {
    const column = columnTemplate.content.firstElementChild.cloneNode(true);
    const zone = column.querySelector(".dropzone");
    const columnTickets = tickets
      .filter((item) => item.status === status.id)
      .sort((first, second) => {
        const firstDate = new Date(first.statusUpdatedAt || first.createdAt).getTime();
        const secondDate = new Date(second.statusUpdatedAt || second.createdAt).getTime();
        return secondDate - firstDate;
      });

    column.dataset.status = status.id;
    column.querySelector("h2").textContent = status.label;
    column.querySelector(".counter").textContent = columnTickets.length;
    zone.dataset.status = status.id;
    setupDropzone(zone);

    columnTickets.forEach((item) => zone.appendChild(renderTicket(item)));
    board.appendChild(column);
  });
}

function toggleDailyView() {
  state.view = state.view === "daily" ? "active" : "daily";
  render();
}

function changeDailyDate(dayOffset) {
  const [year, month, day] = state.dailyDate.split("-").map(Number);
  const date = new Date(year, month - 1, day + dayOffset, 12, 0, 0, 0);
  state.dailyDate = toDateInputValue(date);
  renderDailyView();
}

function renderDailyView() {
  dailyDateInput.value = state.dailyDate;
  dailyTitle.textContent = formatDate(`${state.dailyDate}T12:00:00`);
  const dayEntries = getDailyEntriesFor(state.dailyEntries, state.dailyDate, state.dailyPeriod);
  const allDayEntries = getDailyEntriesForDate(state.dailyEntries, state.dailyDate);
  const periodLabel = state.dailyPeriod === "morning" ? "Manhã" : "Tarde/Noite";
  dailyCount.textContent = `${dayEntries.length} atividade(s) em ${periodLabel}`;
  dailySummaryText.textContent = allDayEntries.length
    ? ` ${allDayEntries.length} atividade(s) registrada(s) no dia.`
    : " Nenhuma atividade registrada neste dia.";
  document.querySelectorAll("[data-daily-period]").forEach((button) => {
    button.classList.toggle("active", button.dataset.dailyPeriod === state.dailyPeriod);
  });

  const ticketOptions = state.tickets
    .filter((ticket) => !ticket.archivedAt)
    .sort((first, second) => String(first.number).localeCompare(String(second.number), "pt-BR"));
  dailyTicketInput.innerHTML = "";
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "OS (opcional)";
  dailyTicketInput.appendChild(emptyOption);
  ticketOptions.forEach((ticket) => {
    const option = document.createElement("option");
    option.value = ticket.id;
    option.textContent = `${ticket.number || "Sem número"}${ticket.company ? ` — ${ticket.company}` : ""}`;
    dailyTicketInput.appendChild(option);
  });

  const enabled = Boolean(state.user);
  [dailyTextInput, dailyCategoryInput, dailyTicketInput, dailyEntryForm.querySelector("button")]
    .forEach((element) => { element.disabled = !enabled; });
  dailyTextInput.placeholder = enabled ? "Ex.: EXE para teste Nunes" : "Entre com Google para registrar atividades";

  dailyEntries.innerHTML = "";
  if (!dayEntries.length) {
    const empty = document.createElement("p");
    empty.className = "daily-empty";
    empty.textContent = "Nenhuma atividade registrada neste período.";
    dailyEntries.appendChild(empty);
  }
  dayEntries.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "daily-entry";
    const time = document.createElement("time");
    time.textContent = formatDateTime(entry.createdAt).split(" ")[1] || "";
    const content = document.createElement("div");
    const text = document.createElement("p");
    text.textContent = entry.text;
    const category = document.createElement("span");
    category.className = "daily-category";
    category.textContent = entry.category;
    content.append(text, category);
    const actions = document.createElement("div");
    const ticket = state.tickets.find((itemTicket) => itemTicket.id === entry.ticketId);
    if (ticket) {
      const ticketButton = document.createElement("button");
      ticketButton.type = "button";
      ticketButton.className = "daily-ticket-link";
      ticketButton.textContent = ticket.number || "Abrir OS";
      ticketButton.addEventListener("click", () => openTicketDialog(ticket));
      actions.appendChild(ticketButton);
    }
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "daily-remove";
    removeButton.textContent = "Remover";
    removeButton.addEventListener("click", () => removeDailyEntry(entry.id));
    actions.appendChild(removeButton);
    item.append(time, content, actions);
    dailyEntries.appendChild(item);
  });

  dailyLinkedTickets.innerHTML = "";
  const linkedTickets = [...new Set(allDayEntries.map((entry) => entry.ticketId).filter(Boolean))]
    .map((ticketId) => state.tickets.find((ticket) => ticket.id === ticketId))
    .filter(Boolean);
  if (!linkedTickets.length) {
    const empty = document.createElement("p");
    empty.className = "daily-empty";
    empty.textContent = "Vincule uma OS à atividade para ela aparecer aqui.";
    dailyLinkedTickets.appendChild(empty);
  }
  linkedTickets.forEach((ticket) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "daily-linked-ticket";
    item.textContent = `${ticket.number || "Sem número"} — ${ticket.title || "Sem descrição"}`;
    item.addEventListener("click", () => openTicketDialog(ticket));
    dailyLinkedTickets.appendChild(item);
  });
}

function addDailyEntry(event) {
  event.preventDefault();
  if (!state.user) return;
  const text = dailyTextInput.value.trim();
  if (!text) return;
  const entry = createDailyEntry({
    date: state.dailyDate,
    period: state.dailyPeriod,
    text,
    category: dailyCategoryInput.value,
    ticketId: dailyTicketInput.value,
  });
  state.dailyEntries.unshift(entry);
  saveTickets(DAILY_STORAGE_KEY, state.dailyEntries);
  saveDailyEntryToFirestore(entry);
  dailyEntryForm.reset();
  renderDailyView();
  dailyTextInput.focus();
}

function removeDailyEntry(entryId) {
  state.dailyEntries = state.dailyEntries.filter((entry) => entry.id !== entryId);
  saveTickets(DAILY_STORAGE_KEY, state.dailyEntries);
  deleteDailyEntryFromFirestore(entryId);
  renderDailyView();
}

function filteredTickets() {
  const visibleTickets = state.tickets.filter((item) => {
    const archived = Boolean(item.archivedAt);
    const visibleByArchive = state.view === "archived" ? archived : !archived;
    return visibleByArchive && matchesDateRange(item);
  });

  if (!state.search) return visibleTickets;
  return visibleTickets.filter((item) => {
    const text = [
      item.number,
      item.companyCode,
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
  document.querySelector("#companyCodeInput").value = item?.companyCode || "";
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
  const companyDetails = normalizeCompanyDetails(
    document.querySelector("#companyCodeInput").value,
    document.querySelector("#companyInput").value,
    false,
    COMPANY_CODES,
  );
  const data = {
    number: document.querySelector("#numberInput").value.trim(),
    companyCode: companyDetails.code,
    company: companyDetails.name,
    title: document.querySelector("#titleInput").value.trim(),
    status: selectedStatus,
    priority: document.querySelector("#priorityInput").value,
    note: noteInput.value.trim(),
    createdAt: fromDateTimeInputValue(document.querySelector("#createdAtInput").value) || previous?.createdAt || new Date().toISOString(),
    // A data do status é a referência para arquivamento por período. Quando o
    // status mudar, respeite a data informada no formulário (preenchida com
    // "agora" por padrão), em vez de sempre substituí-la no momento de salvar.
    statusUpdatedAt: statusChanged
      ? fromDateTimeInputValue(statusDateInput) || new Date().toISOString()
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

  const entry = `[${formatDateTime(new Date().toISOString())}]:\n${text}`;
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
    .split(/\n(?=\[\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\](?::|\s))/)
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
  deleteTicketFromFirestore(id);
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

function archiveSelectedRange() {
  const range = getSelectedDateRange();
  if (!range.start || !range.end) {
    alert("Informe a data inicial e final para arquivar.");
    return;
  }

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
  alert(`${archivedCount} OS resolvida(s) arquivada(s) no periodo selecionado.`);
}

function exportText() {
  const content = `CONTROLE-OS-TXT-V1\n${JSON.stringify({ tickets: state.tickets, dailyEntries: state.dailyEntries }, null, 2)}`;

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
  const importedDailyEntries = parseDailyEntriesFromBackup(importText.value);
  if (!imported.length && !importedDailyEntries.length) {
    alert("Nenhuma OS ou atividade do Diário foi identificada no texto importado.");
    return;
  }

  state.tickets = [...imported, ...state.tickets];
  if (importedDailyEntries.length) {
    state.dailyEntries = [...importedDailyEntries, ...state.dailyEntries];
    saveTickets(DAILY_STORAGE_KEY, state.dailyEntries);
    importedDailyEntries.forEach(saveDailyEntryToFirestore);
  }
  saveAll();
  importText.value = "";
  importDialog.close();
  render();
}

function parseDailyEntriesFromBackup(text) {
  const source = String(text || "").trim();
  if (!source.startsWith("CONTROLE-OS-TXT-V1")) return [];
  try {
    const data = JSON.parse(source.replace(/^CONTROLE-OS-TXT-V1\s*/, ""));
    return Array.isArray(data.dailyEntries) ? data.dailyEntries.map(normalizeDailyEntry) : [];
  } catch {
    return [];
  }
}

function parseText(text) {
  const backupTickets = parseBackupText(text);
  if (backupTickets) return backupTickets;

  const attendanceTicket = parseAttendanceDetails(text);
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
    }, COMPANY_CODES));
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

  return createTicket(number, subjectMatch ? subjectMatch[1].trim() : "Atendimento importado", statusByLabel[statusLabel] || "pendente", notes.join("\n"), "Normal", {
    createdAt,
    statusUpdatedAt: createdAt,
    company: companyMatch ? companyMatch[1].trim() : "",
  });
}

function parseReceiptPrintingRequest(text) {
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

function decodeCopiedHtmlEntities(value) {
  return String(value || "")
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&nbsp;/gi, " ");
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

function matchesDateRange(item) {
  if (!state.dateFrom && !state.dateTo) return true;
  const range = getSelectedDateRange();

  return [item.createdAt, item.statusUpdatedAt, item.archivedAt].some((value) => {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return (!range.start || date >= range.start) && (!range.end || date <= range.end);
  });
}

function getSelectedDateRange() {
  // Leia os campos diretamente: ao clicar em "Arquivar resolvidas" a data
  // digitada precisa valer mesmo se o navegador ainda não disparou "input".
  const dateFrom = dateFromInput.value || state.dateFrom;
  const endDate = normalizeEndDate();
  const dateTo = endDate?.value || (dateToInput.value.trim() ? "" : state.dateTo);

  return {
    start: dateFrom ? new Date(`${dateFrom}T00:00:00`) : null,
    end: dateTo ? new Date(`${dateTo}T23:59:59.999`) : null,
  };
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

function updateWhatsappSelection() {
  document.querySelectorAll("[data-whatsapp-period]").forEach((button) => {
    button.classList.toggle("active", button.dataset.whatsappPeriod === whatsappPeriod);
  });
  const isCustomPeriod = whatsappPeriod === "custom";
  whatsappSingleDateField.hidden = isCustomPeriod;
  whatsappCustomDates.hidden = !isCustomPeriod;
  const availableTickets = getWhatsappTicketsForStatuses(STATUSES.map((status) => status.id));
  STATUSES.forEach((status) => {
    const count = availableTickets.filter((item) => item.status === status.id).length;
    const label = whatsappStatusOptions.querySelector(`[data-whatsapp-status-label="${status.id}"]`);
    if (label) label.textContent = `${status.label} (${count})`;
  });
  const ticketCount = getWhatsappTickets().length;
  const dailyCount = getWhatsappDailyEntries().length;
  const dailyInfo = whatsappIncludeDailyInput.checked ? ` e ${dailyCount} atividade(s) do Diário` : "";
  whatsappSelectionInfo.textContent = `${ticketCount} OS será(ão) enviada(s)${dailyInfo}.`;
}

function getWhatsappDailyEntries() {
  if (!whatsappIncludeDailyInput.checked) return [];
  const dateFrom = whatsappPeriod === "custom" ? whatsappDateFromInput.value : whatsappDateInput.value;
  const dateTo = whatsappPeriod === "custom" ? whatsappDateToInput.value : whatsappDateInput.value;
  if (!dateFrom || !dateTo || dateFrom > dateTo) return [];

  const period = whatsappPeriod === "morning" || whatsappPeriod === "afternoon" ? whatsappPeriod : "";
  return getDailyEntriesInRange(state.dailyEntries, dateFrom, dateTo, period);
}

function sendWhatsappSummary(event) {
  event.preventDefault();
  const tickets = getWhatsappTickets();
  const dailyItems = getWhatsappDailyEntries();
  if (!tickets.length && !dailyItems.length) {
    alert("Nenhuma OS ou atividade do Diário foi encontrada para o período selecionado.");
    return;
  }

  const selectedDate = whatsappPeriod === "custom"
    ? `${formatDate(`${whatsappDateFromInput.value}T12:00:00`)} a ${formatDate(`${whatsappDateToInput.value}T12:00:00`)}`
    : formatDate(`${whatsappDateInput.value}T12:00:00`);
  const periodLabel = { today: "Hoje", morning: "Manhã (até 12h)", afternoon: "Tarde/Noite", custom: "Personalizado" }[whatsappPeriod];
  const groups = STATUSES.map((status) => ({
    ...status,
    tickets: tickets.filter((item) => item.status === status.id),
  })).filter((group) => group.tickets.length);
  const ticketMessage = groups.flatMap((group) => [
    `*${group.label} (${group.tickets.length})*`,
    ...group.tickets.flatMap((item, index) => {
      const ticketLine = `• ${item.number || "Sem número"} — ${item.company ? `${item.company}: ` : ""}${item.title}`;
      const note = parseNoteEntries(item.note)
        .map((entry) => entry.replace(/\s*\r?\n\s*/g, " "))
        .join("\n\n");
      const separator = index < group.tickets.length - 1 ? [""] : [];
      return [ticketLine, ...(note ? [`  *OBS:*\n${note}`] : []), ...separator];
    }),
    "",
  ]);
  const dailyMessage = dailyItems.length ? [
    "*Atividades do Diário*",
    ...dailyItems.flatMap((entry) => {
      const ticket = state.tickets.find((item) => item.id === entry.ticketId);
      const linkedTicket = ticket ? ` — OS ${ticket.number || "sem número"}` : "";
      return [`• ${formatDateTime(entry.createdAt).split(" ")[1]} — ${entry.text}${linkedTicket}`, `  _${entry.category}_`];
    }),
  ] : [];
  const message = [
    `*Controle de OS — ${selectedDate}*`,
    `*Período:* ${periodLabel}`,
    "",
    ...ticketMessage,
    ...(ticketMessage.length && dailyMessage.length ? [""] : []),
    ...dailyMessage,
  ].join("\n").trim();

  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  whatsappDialog.close();
}
