import { formatDateTime } from "../utils/dates.js";

export function createBoardFeature({ state, elements, services, actions }) {
  const {
    board,
    columnTemplate,
    ticketTemplate,
    archiveViewButton,
    fixedNotesViewButton,
    fixedNotesView,
    dailyViewButton,
    dailyView,
    archiveRangeButton,
    viewLabel,
    newButtons,
    statusSettingsButton,
    hasDailyView,
    hasFixedNotesView,
  } = elements;

  function render() {
    board.innerHTML = "";
    const tickets = actions.filteredTickets();
    const isArchivedView = state.view === "archived";
    const isDailyView = hasDailyView && state.view === "daily";
    const isFixedNotesView = hasFixedNotesView && state.view === "fixed-notes";

    archiveViewButton.textContent = isArchivedView ? "Ver ativas" : "Ver arquivadas";
    dailyViewButton?.classList.toggle("active", isDailyView);
    dailyViewButton?.setAttribute("aria-pressed", String(isDailyView));
    fixedNotesViewButton?.classList.toggle("active", isFixedNotesView);
    fixedNotesViewButton?.setAttribute("aria-pressed", String(isFixedNotesView));
    board.hidden = isDailyView || isFixedNotesView;
    if (dailyView) dailyView.hidden = !isDailyView;
    if (fixedNotesView) fixedNotesView.hidden = !isFixedNotesView;
    archiveRangeButton.disabled = isArchivedView || !state.user;
    statusSettingsButton.disabled = !state.user;
    newButtons.forEach((button) => {
      button.disabled = isArchivedView || !state.user;
      button.classList.toggle("primary", !isDailyView && !isFixedNotesView);
    });
    viewLabel.textContent = isArchivedView
      ? "Mostrando OS arquivadas. Abra uma OS para restaurar."
      : isDailyView
        ? "Registre atividades do dia sem alterar o histórico técnico das OS."
        : isFixedNotesView
          ? "Mantenha informações importantes sempre disponíveis."
        : "";

    if (isFixedNotesView) {
      actions.renderFixedNotesView();
      return;
    }

    if (isDailyView) {
      actions.renderDailyView();
      return;
    }

    actions.getAvailableStatuses().forEach((status) => {
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
      column.style.setProperty("--status-color", status.color);
      column.style.setProperty("--status-bg", `color-mix(in srgb, ${status.color} 12%, transparent)`);
      column.querySelector("h2").textContent = status.label;
      column.querySelector(".counter").textContent = columnTickets.length;
      zone.dataset.status = status.id;
      setupDropzone(zone);

      columnTickets.forEach((item) => zone.appendChild(renderTicket(item)));
      board.appendChild(column);
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
    actions.renderNoteBlocks(notes, item.note);
    notes.hidden = !item.note;
    card.querySelector(".ticket-dates").textContent = dates;
    card.querySelector(".priority").textContent = item.priority;
    card.querySelector(".priority").classList.add(priorityClass);
    card.addEventListener("click", () => actions.openTicketDialog(item));
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
      actions.saveAll();
      render();
    });
  }

  function toggleArchiveView() {
    state.view = state.view === "archived" ? "active" : "archived";
    render();
  }


  return { render, renderTicket, setupDropzone, toggleArchiveView };
}
