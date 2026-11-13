import test from "node:test";
import assert from "node:assert/strict";
import { createTicket } from "../js/domain/tickets.js";
import { createDailyEntry } from "../js/domain/daily.js";
import { cloneDefaultStatuses } from "../js/domain/statuses.js";
import { serializeBackup, parseText, parseBackupText, parseDailyEntriesFromBackup, parseStatusesFromBackup, parseAttendanceDetails, parseReceiptPrintingRequest } from "../js/domain/backup.js";

test("backup TXT: ida e volta preserva OS, notas, arquivo, diário, vínculos e colunas", () => {
  const ticket = createTicket("2026.1112.1.42", "Teste", "custom", "Nota\ncom acentos: çã", "Alta", {
    company: "Empresa", companyCode: "42", createdAt: "2026-11-12T12:00:00Z", archivedAt: "2026-11-12T15:00:00Z",
  });
  const data = {
    tickets: [ticket],
    dailyEntries: [createDailyEntry({ date: "2026-11-12", period: "morning", text: "Atividade", ticketIds: [ticket.id], type: "memo" })],
    statuses: [{ id: "custom", label: "Minha coluna", color: "#123abc" }],
  };
  const text = serializeBackup(data);
  assert.deepEqual(parseText(text), data.tickets);
  assert.deepEqual(parseDailyEntriesFromBackup(text), data.dailyEntries);
  assert.deepEqual(parseStatusesFromBackup(text), data.statuses);
});

test("backup antigo sem diário ou colunas continua compatível", () => {
  const text = 'CONTROLE-OS-TXT-V1\n{"tickets":[{"id":"a","company":"42 - Empresa","updatedAt":"2026-11-12T12:00:00Z"}]}';
  const [ticket] = parseText(text);
  assert.equal(ticket.id, "a");
  assert.equal(ticket.companyCode, "42");
  assert.equal(ticket.company, "Empresa");
  assert.deepEqual(parseDailyEntriesFromBackup(text), []);
  assert.deepEqual(parseStatusesFromBackup(text), []);
});

test("backup inválido não cria OS a partir de fragmentos do JSON", () => {
  for (const text of ["CONTROLE-OS-TXT-V1\n{", "CONTROLE-OS-TXT-V1\nnull", "CONTROLE-OS-TXT-V1\n{}", "CONTROLE-OS-TXT-V1\n[]"]) {
    assert.deepEqual(parseText(text), []);
    assert.deepEqual(parseDailyEntriesFromBackup(text), []);
    assert.deepEqual(parseStatusesFromBackup(text), []);
  }
  assert.equal(parseBackupText("texto comum"), null);
});

test("importação de lista respeita data e nomes das colunas personalizadas", () => {
  const text = "Minha fila\n12/11/2026\n- 123 - Corrigir tela *Testar novamente*\nResolvidos\n- 456 - Concluído";
  const tickets = parseText(text, [...cloneDefaultStatuses(), { id: "custom", label: "Minha fila" }]);
  assert.equal(tickets.length, 2);
  assert.equal(tickets[0].status, "custom");
  assert.equal(tickets[0].note, "Testar novamente");
  assert.equal(tickets[0].title, "Corrigir tela");
  assert.equal(tickets[0].createdAt, "2026-11-12T12:00:00.000Z");
  assert.equal(tickets[1].status, "resolvido");
});

test("importação de solicitação lê código da empresa e entidades HTML", () => {
  const ticket = parseReceiptPrintingRequest("2026.1112.1.42 (123) - Impress&#227;o&nbsp;de recibo");
  assert.equal(ticket.number, "2026.1112.1.42");
  assert.equal(ticket.companyCode, "123");
  assert.equal(ticket.title, "Impressão de recibo");
  assert.equal(ticket.createdAt, "2026-11-12T12:00:00.000Z");
});

test("atendimento importado mantém descrição e histórico técnico", () => {
  const text = `Ver Detalhes Atendimento
Ordem No.: 2026.1112.1.42
Status do Atendimento: Em Andamento
Data/Hora: 12/11/2026 09:30
Empresa: Empresa Exemplo
Assunto: Falha na impressão
Descrição:
Descrição inicial
HISTÓRICO DO ATENDIMENTO
Data:
12/11/2026 10:00
Descrição:
Correção aplicada`;
  const ticket = parseAttendanceDetails(text);
  assert.equal(ticket.status, "andamento");
  assert.equal(ticket.company, "Empresa Exemplo");
  assert.equal(ticket.title, "Falha na impressão");
  assert.match(ticket.note, /Descrição inicial/);
  assert.match(ticket.note, /Correção aplicada/);
});
