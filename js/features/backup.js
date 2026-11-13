import { DAILY_STORAGE_KEY } from "../config.js";
import { saveTickets } from "../storage.js";
import { parseStatusesFromBackup, parseDailyEntriesFromBackup, parseText, serializeBackup } from "../domain/backup.js";

export function createBackupFeature({ state, elements, services, actions }) {
  const { importDialog, importText, syncStatus } = elements;

  const { salvarConfiguracaoFluxo } = services;

  function exportText() {
    const content = serializeBackup({
      tickets: actions.filteredTickets(),
      dailyEntries: state.dailyEntries,
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

  return { exportText, importTickets };
}
