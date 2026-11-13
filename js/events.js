import { nowDateTimeInputValue, toDateInputValue } from "./utils/dates.js";

export function createEventBindings({ state, elements, services, actions }) {
  const {
    ticketForm,
    deleteButton,
    archiveTicketButton,
    statusInput,
    importDialog,
    importForm,
    archiveViewButton,
    fixedNotesViewButton,
    fixedNotesInput,
    dailyViewButton,
    dailyDateInput,
    dailyTextInput,
    dailyTicketInput,
    dailyTicketIdInput,
    dailyLinkTicketButton,
    dailyWhatsappButton,
    dateFromInput,
    dateToInput,
    todayFilterButton,
    clearDateFilterButton,
    archiveRangeButton,
    noteEntryInput,
    addNoteButton,
    newButtons,
    noteViewSaveButton,
    authButton,
    migrateButton,
    statusSettingsButton,
    statusSettingsForm,
    addStatusButton,
    whatsappButton,
    whatsappForm,
    whatsappDateInput,
    whatsappDateFromInput,
    whatsappDateToInput,
    whatsappStatusOptions,
    whatsappIncludeDailyInput,
    hasDailyView,
    hasFixedNotesView,
  } = elements;

  function bindEvents() {
    document.querySelector("#themeButton").textContent = "\u25D0";
    document.querySelectorAll(".icon-button[data-close]").forEach((button) => {
      button.textContent = "\u00D7";
    });

    newButtons.forEach((button) => {
      button.addEventListener("click", actions.openNewTicket);
    });
    document.querySelector("#searchInput").addEventListener("input", (event) => {
      state.search = event.target.value.trim().toLowerCase();
      actions.render();
    });
    document.querySelector("#exportButton").addEventListener("click", actions.exportText);
    document.querySelector("#importButton").addEventListener("click", () => importDialog.showModal());
    document.querySelector("#themeButton").addEventListener("click", actions.toggleTheme);
    whatsappButton.addEventListener("click", actions.openWhatsappDialog);
    whatsappForm.addEventListener("submit", actions.sendWhatsappSummary);
    whatsappDateInput.addEventListener("input", actions.updateWhatsappSelection);
    whatsappDateFromInput.addEventListener("input", actions.updateWhatsappSelection);
    whatsappDateToInput.addEventListener("input", actions.updateWhatsappSelection);
    whatsappIncludeDailyInput?.addEventListener("change", actions.updateWhatsappSelection);
    document.querySelectorAll("[data-whatsapp-period]").forEach((button) => {
      button.addEventListener("click", () => {
        state.whatsappPeriod = button.dataset.whatsappPeriod;
        if (state.whatsappPeriod === "custom") {
          const selectedDate = whatsappDateInput.value || toDateInputValue(new Date());
          if (!whatsappDateFromInput.value) whatsappDateFromInput.value = selectedDate;
          if (!whatsappDateToInput.value) whatsappDateToInput.value = selectedDate;
        }
        actions.updateWhatsappSelection();
      });
    });
    authButton.addEventListener("click", actions.toggleAuthentication);
    migrateButton.addEventListener("click", actions.migrateLocalTickets);
    statusSettingsButton.addEventListener("click", actions.openStatusSettings);
    statusSettingsForm.addEventListener("submit", actions.saveStatusSettings);
    addStatusButton.addEventListener("click", actions.addStatusSetting);
    archiveViewButton.addEventListener("click", actions.toggleArchiveView);
    if (hasFixedNotesView) {
      fixedNotesViewButton.addEventListener("click", actions.toggleFixedNotesView);
      fixedNotesInput.addEventListener("input", actions.scheduleFixedNotesSave);
    }
    if (hasDailyView) {
      dailyViewButton.addEventListener("click", actions.toggleDailyView);
      dailyDateInput.addEventListener("change", () => {
        state.dailyDate = dailyDateInput.value || toDateInputValue(new Date());
        actions.renderDailyView();
      });
      document.querySelector("#dailyTodayButton").addEventListener("click", () => {
        state.dailyDate = toDateInputValue(new Date());
        actions.renderDailyView();
      });
      document.querySelector("#dailyPreviousButton").addEventListener("click", () => actions.changeDailyDate(-1));
      document.querySelector("#dailyNextButton").addEventListener("click", () => actions.changeDailyDate(1));
      document.querySelectorAll("[data-daily-period]").forEach((button) => {
        button.addEventListener("click", () => {
          state.dailyPeriod = button.dataset.dailyPeriod;
          actions.renderDailyView();
        });
      });
      dailyTextInput.addEventListener("input", actions.scheduleDailyMemoSave);
      dailyTicketInput.addEventListener("input", () => {
        dailyTicketIdInput.value = "";
        actions.renderDailyTicketOptions();
      });
      dailyTicketInput.addEventListener("focus", actions.renderDailyTicketOptions);
      dailyTicketInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape") actions.hideDailyTicketOptions();
      });
      dailyTicketInput.addEventListener("blur", () => {
        window.setTimeout(actions.hideDailyTicketOptions, 120);
      });
      dailyLinkTicketButton.addEventListener("click", actions.linkTicketToDailyMemo);
      dailyWhatsappButton.addEventListener("click", () => {
        actions.openWhatsappDialog();
        whatsappDateInput.value = state.dailyDate;
        state.whatsappPeriod = state.dailyPeriod;
        actions.updateWhatsappSelection();
      });
    }




    // Alguns navegadores só confirmam a digitação em campos type="date" no
    // evento "change". Escutamos os dois eventos para manter o filtro sincronizado.
    dateFromInput.addEventListener("input", actions.updateDateFrom);
    dateFromInput.addEventListener("change", actions.updateDateFrom);
    dateToInput.addEventListener("input", actions.updateDateTo);
    dateToInput.addEventListener("change", actions.updateDateTo);
    todayFilterButton.addEventListener("click", () => {
      const today = toDateInputValue(new Date());
      dateFromInput.value = today;
      dateToInput.value = today;
      state.dateFrom = today;
      state.dateTo = today;
      actions.render();
    });
    clearDateFilterButton.addEventListener("click", () => {
      dateFromInput.value = "";
      dateToInput.value = "";
      state.dateFrom = "";
      state.dateTo = "";
      actions.render();
    });
    archiveRangeButton.addEventListener("click", actions.archiveSelectedRange);
    document.querySelectorAll("[data-close]").forEach((button) => {
      button.addEventListener("click", () => document.querySelector(`#${button.dataset.close}`).close());
    });
    statusInput.addEventListener("change", () => {
      document.querySelector("#statusUpdatedAtInput").value = nowDateTimeInputValue();
    });

    ticketForm.addEventListener("submit", actions.saveTicket);
    deleteButton.addEventListener("click", actions.deleteTicket);
    archiveTicketButton.addEventListener("click", actions.toggleTicketArchive);
    importForm.addEventListener("submit", actions.importTickets);
    addNoteButton.addEventListener("click", actions.addTimestampedNote);
    noteViewSaveButton.addEventListener("click", actions.saveViewedNote);
    noteEntryInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      actions.addTimestampedNote();
    });


    whatsappStatusOptions.addEventListener("change", actions.updateWhatsappSelection);
  }

  return { bindEvents };
}
