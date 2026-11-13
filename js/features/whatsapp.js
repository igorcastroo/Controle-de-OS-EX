import { getDailyEntriesInRange } from "../domain/daily.js";
import { toDateInputValue, formatDate, formatDateTime } from "../utils/dates.js";
import { parseNoteEntries } from "../domain/notes.js";

export function createWhatsappFeature({ state, elements, services, actions }) {
  const {
    whatsappDialog,
    whatsappDateInput,
    whatsappSingleDateField,
    whatsappCustomDates,
    whatsappDateFromInput,
    whatsappDateToInput,
    whatsappStatusOptions,
    whatsappSelectionInfo,
    whatsappIncludeDailyInput,
  } = elements;

  function openWhatsappDialog() {
    const today = toDateInputValue(new Date());
    whatsappDateInput.value = today;
    whatsappDateFromInput.value = today;
    whatsappDateToInput.value = today;
    state.whatsappPeriod = "today";
    if (whatsappIncludeDailyInput) whatsappIncludeDailyInput.checked = true;
    whatsappStatusOptions.querySelectorAll("input").forEach((input) => {
      input.checked = false;
    });
    updateWhatsappSelection();
    whatsappDialog.showModal();
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
    if (state.whatsappPeriod === "custom") {
      if (!whatsappDateFromInput.value || !whatsappDateToInput.value) return null;
      const [startYear, startMonth, startDay] = whatsappDateFromInput.value.split("-").map(Number);
      const [endYear, endMonth, endDay] = whatsappDateToInput.value.split("-").map(Number);
      const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
      const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
      return start <= end ? { start, end } : null;
    }
    if (!whatsappDateInput.value) return null;
    const [year, month, day] = whatsappDateInput.value.split("-").map(Number);
    const start = new Date(year, month - 1, day, state.whatsappPeriod === "afternoon" ? 12 : 0, 0, 0, 0);
    const end = new Date(year, month - 1, day, state.whatsappPeriod === "morning" ? 11 : 23, state.whatsappPeriod === "morning" ? 59 : 59, 59, 999);
    return { start, end };
  }

  function updateWhatsappSelection() {
    document.querySelectorAll("[data-whatsapp-period]").forEach((button) => {
      button.classList.toggle("active", button.dataset.whatsappPeriod === state.whatsappPeriod);
    });
    const isCustomPeriod = state.whatsappPeriod === "custom";
    whatsappSingleDateField.hidden = isCustomPeriod;
    whatsappCustomDates.hidden = !isCustomPeriod;
    const statuses = actions.getAvailableStatuses();
    const availableTickets = getWhatsappTicketsForStatuses(statuses.map((status) => status.id));
    statuses.forEach((status) => {
      const count = availableTickets.filter((item) => item.status === status.id).length;
      const label = [...whatsappStatusOptions.querySelectorAll("[data-whatsapp-status-label]")]
        .find((item) => item.dataset.whatsappStatusLabel === status.id);
      if (label) label.textContent = `${status.label} (${count})`;
    });
    const ticketCount = getWhatsappTickets().length;
    const dailyCount = getWhatsappDailyEntries().length;
    const dailyInfo = whatsappIncludeDailyInput?.checked ? ` e ${dailyCount} atividade(s) do Diário` : "";
    whatsappSelectionInfo.textContent = `${ticketCount} OS será(ão) enviada(s)${dailyInfo}.`;
  }

  function getWhatsappDailyEntries() {
    if (!whatsappIncludeDailyInput?.checked) return [];
    const dateFrom = state.whatsappPeriod === "custom" ? whatsappDateFromInput.value : whatsappDateInput.value;
    const dateTo = state.whatsappPeriod === "custom" ? whatsappDateToInput.value : whatsappDateInput.value;
    if (!dateFrom || !dateTo || dateFrom > dateTo) return [];

    const period = state.whatsappPeriod === "morning" || state.whatsappPeriod === "afternoon" ? state.whatsappPeriod : "";
    const entriesForPeriod = getDailyEntriesInRange(state.dailyEntries, dateFrom, dateTo, period);
    // O Diário é uma anotação do dia: se não houve registro no período escolhido,
    // ainda envie o memo existente daquela data em vez de bloquear o resumo.
    const entries = entriesForPeriod.length
      ? entriesForPeriod
      : getDailyEntriesInRange(state.dailyEntries, dateFrom, dateTo);
    return entries.filter((entry) => (
      entry.type === "memo" || !entries.some((item) => (
        item.type === "memo" && item.date === entry.date && item.period === entry.period
      ))
    ));
  }

  function sendWhatsappSummary(event) {
    event.preventDefault();
    const tickets = getWhatsappTickets();
    const dailyItems = getWhatsappDailyEntries();
    if (!tickets.length && !dailyItems.length) {
      alert("Nenhuma OS ou atividade do Diário foi encontrada para o período selecionado.");
      return;
    }

    const selectedDate = state.whatsappPeriod === "custom"
      ? `${formatDate(`${whatsappDateFromInput.value}T12:00:00`)} a ${formatDate(`${whatsappDateToInput.value}T12:00:00`)}`
      : formatDate(`${whatsappDateInput.value}T12:00:00`);
    const periodLabel = { today: "Hoje", morning: "Manhã (até 12h)", afternoon: "Tarde/Noite", custom: "Personalizado" }[state.whatsappPeriod];
    const groups = actions.getAvailableStatuses().map((status) => ({
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
        const linkedNumbers = actions.getEntryTicketIds(entry)
          .map((ticketId) => state.tickets.find((item) => item.id === ticketId)?.number)
          .filter(Boolean);
        const linkedTicket = linkedNumbers.length ? ` — OS ${linkedNumbers.join(", ")}` : "";
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

  return {
    openWhatsappDialog,
    getWhatsappTickets,
    getWhatsappTicketsForStatuses,
    getWhatsappPeriodRange,
    updateWhatsappSelection,
    getWhatsappDailyEntries,
    sendWhatsappSummary,
  };
}
