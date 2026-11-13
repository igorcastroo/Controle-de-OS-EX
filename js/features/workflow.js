import { WORKFLOW_STORAGE_KEY } from "../config.js";
import { cloneDefaultStatuses, createStatusDefinition, includeTicketStatuses, normalizeStatuses } from "../domain/statuses.js";

export function createWorkflowFeature({ state, elements, services, actions }) {
  const {
    statusInput,
    syncStatus,
    statusSettingsDialog,
    statusSettingsList,
    statusSettingsRowTemplate,
    saveStatusSettingsButton,
    whatsappStatusOptions,
  } = elements;

  const { salvarConfiguracaoFluxo } = services;

  function workflowStorageKey(userId) {
    return `${WORKFLOW_STORAGE_KEY}-${userId}`;
  }

  function loadCachedStatuses(userId) {
    try {
      const saved = JSON.parse(localStorage.getItem(workflowStorageKey(userId)) || "null");
      return normalizeStatuses(saved);
    } catch {
      return cloneDefaultStatuses();
    }
  }

  function applyStatuses(statuses, saveCache = false) {
    state.statuses = normalizeStatuses(statuses);
    if (saveCache && state.user) {
      localStorage.setItem(workflowStorageKey(state.user.uid), JSON.stringify(state.statuses));
    }
    setupStatusOptions();
    setupWhatsappStatusOptions();
    actions.render();
  }

  function getAvailableStatuses() {
    return includeTicketStatuses(state.statuses, state.tickets);
  }

  function setupStatusOptions() {
    const selectedStatus = statusInput.value;
    const statuses = getAvailableStatuses();
    statusInput.replaceChildren(...statuses.map((status) => {
      const option = document.createElement("option");
      option.value = status.id;
      option.textContent = status.label;
      return option;
    }));
    if (statuses.some((status) => status.id === selectedStatus)) statusInput.value = selectedStatus;
  }

  function setupWhatsappStatusOptions() {
    const selectedStatuses = new Set(
      [...whatsappStatusOptions.querySelectorAll("input:checked")].map((input) => input.value),
    );
    const options = getAvailableStatuses().map((status) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      const text = document.createElement("span");
      input.type = "checkbox";
      input.name = "whatsappStatus";
      input.value = status.id;
      input.checked = selectedStatuses.has(status.id);
      text.dataset.whatsappStatusLabel = status.id;
      text.textContent = `${status.label} (0)`;
      label.append(input, text);
      return label;
    });
    whatsappStatusOptions.replaceChildren(...options);
  }

  function openStatusSettings() {
    if (!state.user) return;
    state.statusDraft = state.statuses.map((status) => ({ ...status }));
    renderStatusSettings();
    statusSettingsDialog.showModal();
  }

  function renderStatusSettings() {
    const rows = state.statusDraft.map((status, index) => {
      const row = statusSettingsRowTemplate.content.firstElementChild.cloneNode(true);
      const colorInput = row.querySelector(".status-color-input");
      const labelInput = row.querySelector(".status-label-input");
      const moveUpButton = row.querySelector(".status-move-up");
      const moveDownButton = row.querySelector(".status-move-down");

      colorInput.value = status.color;
      labelInput.value = status.label;
      moveUpButton.disabled = index === 0;
      moveDownButton.disabled = index === state.statusDraft.length - 1;

      colorInput.addEventListener("input", () => {
        state.statusDraft[index].color = colorInput.value;
      });
      labelInput.addEventListener("input", () => {
        state.statusDraft[index].label = labelInput.value;
      });
      moveUpButton.addEventListener("click", () => moveStatusSetting(index, -1));
      moveDownButton.addEventListener("click", () => moveStatusSetting(index, 1));
      return row;
    });
    statusSettingsList.replaceChildren(...rows);
  }

  function moveStatusSetting(index, offset) {
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= state.statusDraft.length) return;
    const [status] = state.statusDraft.splice(index, 1);
    state.statusDraft.splice(targetIndex, 0, status);
    renderStatusSettings();
    statusSettingsList.querySelectorAll(".status-label-input")[targetIndex]?.focus();
  }

  function addStatusSetting() {
    state.statusDraft.push(createStatusDefinition(state.statusDraft));
    renderStatusSettings();
    const inputs = statusSettingsList.querySelectorAll(".status-label-input");
    inputs[inputs.length - 1]?.select();
  }

  async function saveStatusSettings(event) {
    event.preventDefault();
    const statuses = normalizeStatuses(state.statusDraft, []);
    const labels = statuses.map((status) => status.label.toLocaleLowerCase("pt-BR"));
    if (statuses.length !== state.statusDraft.length) {
      alert("Preencha o nome de todas as colunas.");
      return;
    }
    if (new Set(labels).size !== labels.length) {
      alert("Use um nome diferente para cada coluna.");
      return;
    }

    saveStatusSettingsButton.disabled = true;
    try {
      await salvarConfiguracaoFluxo(state.user.uid, {
        statuses,
        updatedAt: new Date().toISOString(),
      });
      applyStatuses(statuses, true);
      statusSettingsDialog.close();
      syncStatus.textContent = "Colunas salvas. Seus cards foram preservados.";
    } catch (error) {
      syncStatus.textContent = `Erro ao salvar colunas: ${error.message}`;
    } finally {
      saveStatusSettingsButton.disabled = false;
    }
  }

  return {
    workflowStorageKey,
    loadCachedStatuses,
    applyStatuses,
    getAvailableStatuses,
    setupStatusOptions,
    setupWhatsappStatusOptions,
    openStatusSettings,
    renderStatusSettings,
    moveStatusSetting,
    addStatusSetting,
    saveStatusSettings,
  };
}
