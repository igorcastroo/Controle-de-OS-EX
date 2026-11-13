import { formatDate, formatDateTime } from "../utils/dates.js";

export function createFiltersFeature({ state, elements, services, actions }) {
  const { dateFromInput, dateToInput } = elements;

  function updateDateFrom(event) {
    state.dateFrom = event.target.value;
    actions.render();
  }

  function updateDateTo(event) {
    state.dateTo = event.target.value;
    actions.render();
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
    const dateTo = dateToInput.value || state.dateTo;

    return {
      start: dateFrom ? new Date(`${dateFrom}T00:00:00`) : null,
      end: dateTo ? new Date(`${dateTo}T23:59:59.999`) : null,
    };
  }

  return { updateDateFrom, updateDateTo, filteredTickets, matchesDateRange, getSelectedDateRange };
}
