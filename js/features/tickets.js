import { STORAGE_KEY, COMPANY_CODES } from "../config.js";
import { saveTickets } from "../storage.js";
import { normalizeCompanyDetails } from "../domain/tickets.js";
import { nowDateTimeInputValue, toDateTimeInputValue, fromDateTimeInputValue, formatDateTime } from "../utils/dates.js";
import { parseNoteEntries, withNoteDates } from "../domain/notes.js";

export function createTicketsFeature({ state, elements, services, actions }) {
  const {
    ticketDialog,
    ticketForm,
    dialogTitle,
    deleteButton,
    archiveTicketButton,
    noteInput,
    noteEntryInput,
    noteHistory,
    noteViewDialog,
    noteViewText,
    noteViewSaveButton,
  } = elements;

  let editingNoteIndex = null;

  function openNewTicket() {
    if (state.view !== "active") {
      state.view = "active";
      actions.render();
      return;
    }
    openTicketDialog();
  }

  function openTicketDialog(item = null) {
    ticketForm.reset();
    dialogTitle.textContent = item ? "Editar OS" : "Nova OS";
    deleteButton.hidden = !item;
    archiveTicketButton.hidden = !item;
    archiveTicketButton.textContent = item?.archivedAt ? "Restaurar" : "Arquivar";
    // A OS nova ja recebe um id para que uma observacao enviada ao Diario
    // possa ficar vinculada a ela antes do salvamento do formulario.
    document.querySelector("#ticketId").value = item?.id || crypto.randomUUID();
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
    const id = document.querySelector("#ticketId").value || crypto.randomUUID();
    const previous = id ? state.tickets.find((item) => item.id === id) : null;
    const numberInput = document.querySelector("#numberInput");
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
      number: numberInput.value.trim(),
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

    const duplicateTicket = !previous && data.number
      ? state.tickets.find((item) => String(item.number || "").trim().toLocaleLowerCase("pt-BR") === data.number.toLocaleLowerCase("pt-BR"))
      : null;
    if (duplicateTicket && !confirm(`A OS ${data.number} já existe. Deseja adicionar outra OS com este mesmo número?`)) {
      numberInput.focus();
      return;
    }

    // O dialogo gera o ID antes da OS ser salva para permitir que notas do
    // Diario sejam vinculadas a ela. Portanto, a existencia do ID nao indica
    // que a OS ja esteja na lista: use o registro anterior como referencia.
    if (previous) {
      const index = state.tickets.findIndex((item) => item.id === id);
      state.tickets[index] = { ...previous, ...data };
    } else {
      state.tickets.unshift({ id, ...data });
    }

    actions.saveAll();
    ticketDialog.close();
    actions.render();
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
    persistDialogNotes();
    noteEntryInput.focus();

    if (confirm("Deseja adicionar esta observacao ao Diario?")) {
      void actions.addNoteToDaily(text);
    }
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
    persistDialogNotes();

    noteViewDialog.close();
    editingNoteIndex = null;
  }

  function persistDialogNotes() {
    const ticketId = document.querySelector("#ticketId").value;
    const ticketIndex = state.tickets.findIndex((item) => item.id === ticketId);
    if (ticketIndex !== -1) {
      state.tickets[ticketIndex] = {
        ...state.tickets[ticketIndex],
        note: noteInput.value.trim(),
        updatedAt: new Date().toISOString(),
      };
      saveTickets(STORAGE_KEY, state.tickets);
      void actions.saveTicketToFirestore(state.tickets[ticketIndex]);
      actions.render();
    }
  }

  function removeNoteAt(index) {
    const entries = parseNoteEntries(noteInput.value);
    entries.splice(index, 1);
    noteInput.value = entries.join("\n");
    renderDialogNotes();
  }

  function deleteTicket() {
    const id = document.querySelector("#ticketId").value;
    state.tickets = state.tickets.filter((item) => item.id !== id);
    actions.saveAll();
    actions.deleteTicketFromFirestore(id);
    ticketDialog.close();
    actions.render();
  }

  function toggleTicketArchive() {
    const id = document.querySelector("#ticketId").value;
    const item = state.tickets.find((ticketItem) => ticketItem.id === id);
    if (!item) return;

    item.archivedAt = item.archivedAt ? "" : new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    actions.saveAll();
    ticketDialog.close();
    actions.render();
  }

  function archiveSelectedRange() {
    const range = actions.getSelectedDateRange();
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

    if (archivedCount > 0) actions.saveAll();
    actions.render();
    alert(`${archivedCount} OS resolvida(s) arquivada(s) no periodo selecionado.`);
  }

  return {
    openNewTicket,
    openTicketDialog,
    saveTicket,
    addTimestampedNote,
    renderDialogNotes,
    renderNoteBlocks,
    openNoteView,
    saveViewedNote,
    persistDialogNotes,
    removeNoteAt,
    deleteTicket,
    toggleTicketArchive,
    archiveSelectedRange,
  };
}
