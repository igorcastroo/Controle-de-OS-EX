

export function createFixedNotesFeature({ state, elements, services, actions }) {
  const { fixedNotesInput, fixedNotesStatus, syncStatus, hasFixedNotesView } = elements;

  const { salvarNotasFixas } = services;

  function toggleFixedNotesView() {
    if (!hasFixedNotesView) return;
    state.view = state.view === "fixed-notes" ? "active" : "fixed-notes";
    actions.render();
  }

  function renderFixedNotesView() {
    if (!hasFixedNotesView) return;
    const enabled = Boolean(state.user);
    fixedNotesInput.disabled = !enabled;
    fixedNotesInput.placeholder = enabled
      ? "Escreva aqui as informações que precisam ficar sempre à mão..."
      : "Entre com Google para editar as notas fixas";
    if (!enabled) {
      fixedNotesStatus.textContent = "Entre com Google para salvar";
    } else if (!state.fixedNotesDirty) {
      fixedNotesStatus.textContent = "Salva automaticamente";
    }
    if (!state.fixedNotesDirty) fixedNotesInput.value = state.fixedNotes;
  }

  function scheduleFixedNotesSave() {
    if (!state.user) return;
    const text = fixedNotesInput.value;
    state.fixedNotesDirty = true;
    window.clearTimeout(state.fixedNotesSaveTimer);
    fixedNotesStatus.textContent = "Salvando...";
    state.fixedNotesSaveTimer = window.setTimeout(() => {
      state.fixedNotesSaveTimer = null;
      state.fixedNotesSaveQueue = state.fixedNotesSaveQueue
        .catch(() => undefined)
        .then(() => saveFixedNotes(text));
    }, 700);
  }

  async function saveFixedNotes(text) {
    if (!state.user) return;
    const note = {
      text,
      updatedAt: new Date().toISOString(),
    };
    try {
      await salvarNotasFixas(state.user.uid, note);
      state.fixedNotes = text;
      if (fixedNotesInput.value === text) {
        state.fixedNotesDirty = false;
        fixedNotesStatus.textContent = "Salvo automaticamente";
      }
    } catch (error) {
      fixedNotesStatus.textContent = "Erro ao salvar";
      syncStatus.textContent = `Erro ao salvar Notas Fixas: ${error.message}`;
    }
  }

  return { toggleFixedNotesView, renderFixedNotesView, scheduleFixedNotesSave, saveFixedNotes };
}
