import { DAILY_STORAGE_KEY } from "../config.js";
import { saveTickets } from "../storage.js";
import { parseStatusesFromBackup, parseDailyEntriesFromBackup, parseText, serializeBackup } from "../domain/backup.js";
import { toDateInputValue } from "../utils/dates.js";

export function createBackupFeature({ state, elements, services, actions }) {
  const { importDialog, importText, syncStatus } = elements;

  const { salvarConfiguracaoFluxo } = services;

  function openExportDialog() {
    elements.exportForm.reset();
    elements.exportStatusInput.replaceChildren(new window.Option("Todos os status", ""), ...actions.getAvailableStatuses().map(
      (status) => new window.Option(status.label, status.id),
    ));
    updateExportSelection();
    elements.exportDialog.showModal();
  }

  function getExportSelection() {
    const from = elements.exportDateFromInput.value;
    const to = elements.exportDateToInput.value;
    const matchesDate = (date) => (!from && !to) || Boolean(date && (!from || date >= from) && (!to || date <= to));
    const tickets = state.tickets.filter((ticket) => {
      if (!elements.exportIncludeArchivedInput.checked && ticket.archivedAt) return false;
      if (elements.exportStatusInput.value && ticket.status !== elements.exportStatusInput.value) return false;
      const date = elements.exportDateFieldInput.value === "createdAt" ? ticket.createdAt : ticket.statusUpdatedAt || ticket.createdAt;
      return matchesDate(toDateInputValue(date));
    });
    const dailyEntries = elements.exportIncludeDailyInput.checked
      ? state.dailyEntries.filter((entry) => matchesDate(entry.date || toDateInputValue(entry.createdAt)))
      : [];
    return { tickets, dailyEntries };
  }

  function updateExportSelection() {
    const invalid = elements.exportDateFromInput.value && elements.exportDateToInput.value
      && elements.exportDateFromInput.value > elements.exportDateToInput.value;
    elements.exportDateToInput.setCustomValidity(invalid ? "A data final deve ser igual ou posterior à data inicial." : "");
    const { tickets, dailyEntries } = getExportSelection();
    elements.exportSelectionInfo.textContent = invalid
      ? "A data final deve ser igual ou posterior à data inicial."
      : `${tickets.length} OS e ${dailyEntries.length} registro(s) do Diário para exportar.`;
    elements.runExportButton.disabled = Boolean(invalid) || (!tickets.length && !dailyEntries.length);
  }

  function exportText(event) {
    event.preventDefault();
    updateExportSelection();
    if (!elements.exportForm.reportValidity() || elements.runExportButton.disabled) return;
    const content = serializeBackup({
      ...getExportSelection(),
      statuses: state.statuses,
    });

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `controle-os-${new Date().toISOString().slice(0, 10)}.txt`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    elements.exportDialog.close();
  }

  async function importTickets(event) {
    event.preventDefault();
    const imported = parseText(importText.value, actions.getAvailableStatuses());
    const importedDailyEntries = parseDailyEntriesFromBackup(importText.value);
    const importedStatuses = parseStatusesFromBackup(importText.value);
    if (!imported.length && !importedDailyEntries.length && !importedStatuses.length) {
      alert("Nenhuma OS ou atividade do Diário foi identificada no texto importado.");
      return;
    }

    state.tickets = [...imported, ...state.tickets];
    if (importedDailyEntries.length) {
      state.dailyEntries = [...importedDailyEntries, ...state.dailyEntries];
      saveTickets(DAILY_STORAGE_KEY, state.dailyEntries);
      importedDailyEntries.forEach(actions.saveDailyEntryToFirestore);
    }
    if (importedStatuses.length) {
      try {
        await salvarConfiguracaoFluxo(state.user.uid, {
          statuses: importedStatuses,
          updatedAt: new Date().toISOString(),
        });
        actions.applyStatuses(importedStatuses, true);
      } catch (error) {
        syncStatus.textContent = `As OS foram importadas, mas as colunas nao foram salvas: ${error.message}`;
      }
    }
    actions.saveAll();
    importText.value = "";
    importDialog.close();
    actions.render();
  }

  return { openExportDialog, getExportSelection, updateExportSelection, exportText, importTickets };
}
