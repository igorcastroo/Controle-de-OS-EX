import test from "node:test";
import assert from "node:assert/strict";
import { createTicket, normalizeTicketDates, normalizeCompanyDetails, needsCompanyCodeMigration } from "../js/domain/tickets.js";
import { createDailyEntry, normalizeDailyEntry, getDailyEntriesFor, getDailyEntriesForDate, getDailyEntriesInRange } from "../js/domain/daily.js";
import { cloneDefaultStatuses, normalizeStatuses, createStatusDefinition, includeTicketStatuses } from "../js/domain/statuses.js";
import { parseNoteEntries, withNoteDates } from "../js/domain/notes.js";
import { toDateInputValue, toDateTimeInputValue, fromDateTimeInputValue, parseBrazilianDate, parseBrazilianDateTime, inferDateFromNumber, formatDate } from "../js/utils/dates.js";

test("OS: criação mantém datas fornecidas e gera IDs distintos", () => {
  const dates = { createdAt: "2026-11-12T12:00:00.000Z", company: "Empresa", companyCode: "42" };
  const first = createTicket("123", "Impressora", "pendente", "Observação", "Alta", dates);
  const second = createTicket("124", "Rede", "andamento");
  assert.notEqual(first.id, second.id);
  assert.equal(first.statusUpdatedAt, dates.createdAt);
  assert.equal(first.companyCode, "42");
  assert.equal(first.archivedAt, "");
  assert.equal(second.priority, "Normal");
  assert.equal(first.note, "Observação");
});

test("OS: migração de empresa antiga preserva ID, campos extras e datas", () => {
  const original = { id: "old", company: " 42 - Empresa ", updatedAt: "2026-11-12T12:00:00Z", extra: "preservado" };
  const normalized = normalizeTicketDates(original);
  assert.equal(normalized.companyCode, "42");
  assert.equal(normalized.company, "Empresa");
  assert.equal(normalized.createdAt, original.updatedAt);
  assert.equal(normalized.statusUpdatedAt, original.updatedAt);
  assert.equal(normalized.id, "old");
  assert.equal(normalized.extra, "preservado");
  assert.equal(needsCompanyCodeMigration(original, normalized), true);
  assert.equal(needsCompanyCodeMigration(normalized, normalizeTicketDates(normalized)), false);
  assert.equal(original.company, " 42 - Empresa ");
});

test("OS: código conhecido só é aplicado a registros legados sem o campo", () => {
  const codes = new Map([["EMPRESA", "99"]]);
  assert.equal(normalizeTicketDates({ company: "Empresa" }, codes).companyCode, "99");
  assert.equal(normalizeTicketDates({ company: "Empresa", companyCode: "" }, codes).companyCode, "");
  assert.deepEqual(normalizeCompanyDetails("7", "42 - Empresa"), { code: "7", name: "Empresa" });
  assert.deepEqual(normalizeCompanyDetails("", "123"), { code: "123", name: "" });
});

test("diário: registro legado recebe categoria e vínculos únicos", () => {
  const entry = normalizeDailyEntry({
    id: "daily", date: "2026-11-12", category: "Memo", period: "invalid",
    text: "  Observação  ", ticketId: "a", ticketIds: ["a", " b ", "", "b"],
    updatedAt: "2026-11-12T12:00:00Z", type: "memo",
  });
  assert.equal(entry.category, "Anotações");
  assert.equal(entry.text, "Observação");
  assert.equal(entry.period, "afternoon");
  assert.deepEqual(entry.ticketIds, ["a", "b"]);
  assert.equal(entry.createdAt, entry.updatedAt);
  assert.ok(createDailyEntry().id);
});

test("diário: filtros incluem limites, distinguem períodos e não alteram a lista", () => {
  const entries = [
    { id: "b", date: "2026-11-12", period: "afternoon", createdAt: "2026-11-12T15:00:00Z" },
    { id: "c", date: "2026-11-13", period: "morning", createdAt: "2026-11-13T10:00:00Z" },
    { id: "a", date: "2026-11-12", period: "morning", createdAt: "2026-11-12T10:00:00Z" },
  ];
  assert.deepEqual(getDailyEntriesFor(entries, "2026-11-12", "morning").map((e) => e.id), ["a"]);
  assert.deepEqual(getDailyEntriesForDate(entries, "2026-11-12").map((e) => e.id), ["a", "b"]);
  assert.deepEqual(getDailyEntriesInRange(entries, "2026-11-12", "2026-11-13").map((e) => e.id), ["a", "b", "c"]);
  assert.deepEqual(getDailyEntriesInRange(entries, "2026-11-12", "2026-11-13", "morning").map((e) => e.id), ["a", "c"]);
  assert.deepEqual(getDailyEntriesInRange(entries, "2026-11-13", "2026-11-12"), []);
  assert.deepEqual(getDailyEntriesInRange(entries, "", "2026-11-12"), []);
  assert.deepEqual(entries.map((e) => e.id), ["b", "c", "a"]);
});

test("colunas: normalização descarta duplicatas e inválidos e trata cores", () => {
  assert.deepEqual(normalizeStatuses([
    { id: " a ", label: " Testes ", color: "#ABCDEF" },
    { id: "a", label: "Duplicada" }, { id: "b", label: "" },
    { id: "c", label: "Outra", color: "red" }, null,
  ]), [
    { id: "a", label: "Testes", color: "#abcdef" },
    { id: "c", label: "Outra", color: "#64748b" },
  ]);
  assert.deepEqual(normalizeStatuses([], []), []);
  const first = cloneDefaultStatuses();
  first[0].label = "Alterada";
  assert.equal(cloneDefaultStatuses()[0].label, "Pendentes");
});

test("colunas: IDs não colidem e status antigos dos cards são recuperados", () => {
  const configured = [{ id: "revisao", label: "Revisão", color: "#123456" }];
  assert.equal(createStatusDefinition([...configured, { id: "revisao-2" }], "Revisão").id, "revisao-3");
  const all = includeTicketStatuses(configured, [{ status: "antigo-status" }, { status: "antigo-status" }]);
  assert.equal(all.length, 2);
  assert.equal(all[1].label, "Antigo status");
  assert.equal(all[1].recovered, true);
  assert.equal(configured.length, 1);
});

test("notas: múltiplas linhas permanecem na mesma observação", () => {
  const first = "[12/11/2026 10:00]:\nLinha 1\nLinha 2";
  const second = "[12/11/2026 11:00] Cadastro\nOutra nota";
  assert.deepEqual(parseNoteEntries(`${first}\n${second}`), [first, second]);
  const edited = withNoteDates("Novo conteúdo", first);
  assert.match(edited, /^\[12\/11\/2026 10:00\] Cadastro \| Ultima alteracao:/);
  assert.ok(edited.endsWith("\nNovo conteúdo"));
  assert.deepEqual(parseNoteEntries(""), []);
});

test("datas: entradas locais fazem ida e volta sem deslocar o horário", () => {
  const input = "2026-11-12T09:30";
  assert.equal(toDateTimeInputValue(fromDateTimeInputValue(input)), input);
  assert.equal(toDateInputValue(new Date(2026, 10, 12, 0, 5)), "2026-11-12");
  assert.equal(toDateInputValue("inválida"), "");
  assert.equal(formatDate("inválida"), "-");
  assert.equal(parseBrazilianDate("12/11/2026"), "2026-11-12T12:00:00.000Z");
  assert.equal(parseBrazilianDateTime("12/11/2026 09:30"), "2026-11-12T09:30:00.000Z");
  assert.equal(inferDateFromNumber("2026.1112.1.42"), "2026-11-12T12:00:00.000Z");
  assert.equal(inferDateFromNumber("2026.0230.1.42"), "");
});
