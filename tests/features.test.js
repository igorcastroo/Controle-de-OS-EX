import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createState } from "../js/state.js";
import { createFiltersFeature } from "../js/features/filters.js";
import { createTicketsFeature } from "../js/features/tickets.js";
import { createWhatsappFeature } from "../js/features/whatsapp.js";
import { createFixedNotesFeature } from "../js/features/fixed-notes.js";
import { createAuthFeature } from "../js/features/auth.js";

beforeEach(() => {
  globalThis.localStorage = { getItem: () => null, setItem() {} };
  globalThis.alert = () => {};
});

function context() {
  return {
    state: createState(),
    elements: { dateFromInput: { value: "" }, dateToInput: { value: "" }, syncStatus: { textContent: "" } },
    services: {}, actions: { render() {} },
  };
}

test("filtro combina arquivo, texto e data de alteração do status", () => {
  const ctx = context();
  ctx.state.tickets = [
    { id: "a", title: "Impressora", companyCode: "42", createdAt: "2026-11-01T12:00:00Z", statusUpdatedAt: "2026-11-12T12:00:00Z" },
    { id: "b", title: "Impressora", archivedAt: "2026-11-12T12:00:00Z" },
    { id: "c", title: "Rede", createdAt: "2026-11-01T12:00:00Z" },
  ];
  ctx.state.dateFrom = "2026-11-12";
  ctx.state.dateTo = "2026-11-12";
  const filters = createFiltersFeature(ctx);
  assert.deepEqual(filters.filteredTickets().map((item) => item.id), ["a"]);
  ctx.state.search = "42";
  assert.deepEqual(filters.filteredTickets().map((item) => item.id), ["a"]);
  ctx.state.search = "rede";
  assert.deepEqual(filters.filteredTickets(), []);
  ctx.state.search = "";
  ctx.state.view = "archived";
  assert.deepEqual(filters.filteredTickets().map((item) => item.id), ["b"]);
});

test("arquivamento por período usa data do status e lê os campos antes do evento change", () => {
  const ctx = context();
  ctx.elements.dateFromInput.value = "2026-11-12";
  ctx.elements.dateToInput.value = "2026-11-12";
  ctx.state.tickets = [
    { id: "a", status: "resolvido", createdAt: "2026-11-01T12:00:00Z", statusUpdatedAt: "2026-11-12T12:00:00Z" },
    { id: "b", status: "resolvido", createdAt: "2026-11-12T12:00:00Z", statusUpdatedAt: "2026-11-01T12:00:00Z" },
    { id: "c", status: "pendente", statusUpdatedAt: "2026-11-12T12:00:00Z" },
    { id: "d", status: "resolvido", statusUpdatedAt: "inválida" },
    { id: "e", status: "resolvido", statusUpdatedAt: "2026-11-12T12:00:00Z", archivedAt: "anterior" },
  ];
  let saves = 0;
  Object.assign(ctx.actions, createFiltersFeature(ctx), { saveAll: () => { saves += 1; } });
  createTicketsFeature(ctx).archiveSelectedRange();
  assert.ok(ctx.state.tickets[0].archivedAt);
  assert.equal(ctx.state.tickets[1].archivedAt, undefined);
  assert.equal(ctx.state.tickets[2].archivedAt, undefined);
  assert.equal(ctx.state.tickets[3].archivedAt, undefined);
  assert.equal(ctx.state.tickets[4].archivedAt, "anterior");
  assert.equal(saves, 1);
});

test("arquivamento sem período não altera nem salva os cards", () => {
  const ctx = context();
  ctx.actions.saveAll = () => assert.fail("Não deveria salvar");
  const ticket = { status: "resolvido", statusUpdatedAt: "2026-11-12T12:00:00Z" };
  ctx.state.tickets = [ticket];
  Object.assign(ctx.actions, createFiltersFeature(ctx));
  createTicketsFeature(ctx).archiveSelectedRange();
  assert.equal(ticket.archivedAt, undefined);
});

test("WhatsApp divide manhã e tarde ao meio-dia e ignora arquivo e datas inválidas", () => {
  const ctx = context();
  ctx.elements.whatsappDateInput = { value: "2026-11-12" };
  ctx.state.tickets = [
    { id: "a", status: "pendente", statusUpdatedAt: new Date(2026, 10, 12, 11, 59, 59).toISOString() },
    { id: "b", status: "pendente", statusUpdatedAt: new Date(2026, 10, 12, 12).toISOString() },
    { id: "c", status: "pendente", statusUpdatedAt: new Date(2026, 10, 12, 12).toISOString(), archivedAt: "yes" },
    { id: "d", status: "pendente", statusUpdatedAt: "inválida" },
  ];
  const whatsapp = createWhatsappFeature(ctx);
  ctx.state.whatsappPeriod = "morning";
  assert.deepEqual(whatsapp.getWhatsappTicketsForStatuses(["pendente"]).map((item) => item.id), ["a"]);
  ctx.state.whatsappPeriod = "afternoon";
  assert.deepEqual(whatsapp.getWhatsappTicketsForStatuses(["pendente"]).map((item) => item.id), ["b"]);
  assert.deepEqual(whatsapp.getWhatsappTicketsForStatuses([]), []);
});

test("WhatsApp rejeita período personalizado invertido", () => {
  const ctx = context();
  ctx.state.whatsappPeriod = "custom";
  ctx.elements.whatsappDateFromInput = { value: "2026-11-13" };
  ctx.elements.whatsappDateToInput = { value: "2026-11-12" };
  assert.equal(createWhatsappFeature(ctx).getWhatsappPeriodRange(), null);
});

test("WhatsApp usa memo do dia como alternativa e evita atividades duplicadas", () => {
  const ctx = context();
  ctx.state.whatsappPeriod = "morning";
  ctx.elements.whatsappDateInput = { value: "2026-11-12" };
  ctx.elements.whatsappIncludeDailyInput = { checked: true };
  ctx.state.dailyEntries = [
    { id: "memo", date: "2026-11-12", period: "afternoon", type: "memo", createdAt: "2026-11-12T15:00:00Z" },
    { id: "old", date: "2026-11-12", period: "afternoon", type: "activity", createdAt: "2026-11-12T14:00:00Z" },
  ];
  const whatsapp = createWhatsappFeature(ctx);
  assert.deepEqual(whatsapp.getWhatsappDailyEntries().map((item) => item.id), ["memo"]);
  ctx.elements.whatsappIncludeDailyInput.checked = false;
  assert.deepEqual(whatsapp.getWhatsappDailyEntries(), []);
});

test("notas fixas: falha no backend mantém edição pendente e mostra erro", async () => {
  const ctx = context();
  ctx.state.user = { uid: "test" };
  ctx.state.fixedNotes = "Original";
  ctx.state.fixedNotesDirty = true;
  ctx.elements.fixedNotesInput = { value: "Novo texto" };
  ctx.elements.fixedNotesStatus = { textContent: "" };
  ctx.services.salvarNotasFixas = async () => { throw new Error("Sem conexão"); };
  await createFixedNotesFeature(ctx).saveFixedNotes("Novo texto");
  assert.equal(ctx.state.fixedNotes, "Original");
  assert.equal(ctx.state.fixedNotesDirty, true);
  assert.equal(ctx.elements.fixedNotesStatus.textContent, "Erro ao salvar");
  assert.match(ctx.elements.syncStatus.textContent, /Sem conexão/);
});

test("notas fixas: confirmação antiga não marca uma edição mais recente como salva", async () => {
  const ctx = context();
  ctx.state.user = { uid: "test" };
  ctx.state.fixedNotesDirty = true;
  ctx.elements.fixedNotesInput = { value: "Edição mais recente" };
  ctx.elements.fixedNotesStatus = { textContent: "Salvando..." };
  ctx.services.salvarNotasFixas = async () => {};
  await createFixedNotesFeature(ctx).saveFixedNotes("Edição anterior");
  assert.equal(ctx.state.fixedNotesDirty, true);
  assert.equal(ctx.elements.fixedNotesStatus.textContent, "Salvando...");
});

test("persistência de OS não informa sucesso sem login ou quando o backend falha", async () => {
  const ctx = context();
  ctx.services.salvarOS = async () => { throw new Error("Falha simulada"); };
  const auth = createAuthFeature(ctx);
  assert.equal(await auth.saveTicketToFirestore({ id: "a" }), false);
  ctx.state.user = { uid: "test" };
  assert.equal(await auth.saveTicketToFirestore({ id: "a" }), false);
  assert.match(ctx.elements.syncStatus.textContent, /Falha simulada/);
});
