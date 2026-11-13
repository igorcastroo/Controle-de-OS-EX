import { STORAGE_KEY, DAILY_STORAGE_KEY, COMPANY_CODES } from "../config.js";
import { saveTickets } from "../storage.js";
import { needsCompanyCodeMigration, normalizeTicketDates } from "../domain/tickets.js";
import { normalizeDailyEntry } from "../domain/daily.js";
import { cloneDefaultStatuses } from "../domain/statuses.js";

export function createAuthFeature({ state, elements, services, actions }) {
  const { fixedNotesInput, authButton, migrateButton, syncStatus, hasDailyView, hasFixedNotesView } = elements;

  const {
    entrarComGoogle,
    excluirOS,
    observarConfiguracaoFluxo,
    observarDiario,
    observarNotasFixas,
    observarOS,
    sairDaConta,
    salvarRegistroDiario,
    salvarOS,
  } = services;

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
    state.unsubscribeFixedNotes?.();
    state.unsubscribeWorkflow?.();
    state.unsubscribeTickets = null;
    state.unsubscribeDailyEntries = null;
    state.unsubscribeFixedNotes = null;
    state.unsubscribeWorkflow = null;
    state.user = user;
    authButton.textContent = user ? "Sair" : "Entrar com Google";

    if (!user) {
      actions.applyStatuses(cloneDefaultStatuses());
      state.tickets = [];
      state.dailyEntries = [];
      state.fixedNotes = "";
      state.fixedNotesDirty = false;
      window.clearTimeout(state.fixedNotesSaveTimer);
      state.fixedNotesSaveTimer = null;
      if (hasFixedNotesView) fixedNotesInput.value = "";
      migrateButton.hidden = true;
      syncStatus.textContent = "Entre com Google para acessar suas OS na nuvem.";
      actions.render();
      return;
    }

    syncStatus.textContent = `Conectado como ${user.email}`;
    actions.applyStatuses(actions.loadCachedStatuses(user.uid));
    state.unsubscribeWorkflow = observarConfiguracaoFluxo(user.uid, (snapshot) => {
      const savedStatuses = snapshot.exists() ? snapshot.data().statuses : cloneDefaultStatuses();
      actions.applyStatuses(savedStatuses, true);
    }, (error) => {
      syncStatus.textContent = `Erro ao sincronizar colunas: ${error.message}`;
    });
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
      actions.render();
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
      if (hasDailyView) actions.renderDailyView();
    }, (error) => {
      syncStatus.textContent = `Erro ao sincronizar Diário: ${error.message}`;
    });
    state.unsubscribeFixedNotes = observarNotasFixas(user.uid, (snapshot) => {
      state.fixedNotes = snapshot.exists() ? String(snapshot.data().text || "") : "";
      if (hasFixedNotesView && !state.fixedNotesDirty) {
        fixedNotesInput.value = state.fixedNotes;
      }
      actions.renderFixedNotesView();
    }, (error) => {
      syncStatus.textContent = `Erro ao sincronizar Notas Fixas: ${error.message}`;
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

  return {
    saveAll,
    toggleAuthentication,
    handleAuthenticationState,
    saveTicketToFirestore,
    deleteTicketFromFirestore,
    saveDailyEntryToFirestore,
    migrateLocalTickets,
  };
}
