import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { loadTickets, saveTickets } from "../js/storage.js";
import { createState } from "../js/state.js";
import { STORAGE_KEY } from "../js/config.js";

beforeEach(() => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
});

test("cache local ignora JSON corrompido ou conteúdo que não seja lista", () => {
  for (const value of ["{", "null", "{}", "123"]) {
    localStorage.setItem("test", value);
    assert.deepEqual(loadTickets("test", (item) => item), []);
  }
});

test("cache local aplica normalização na leitura sem perder registros", () => {
  saveTickets("test", [{ id: "a" }, { id: "b" }]);
  assert.deepEqual(loadTickets("test", (item) => ({ ...item, migrated: true })), [
    { id: "a", migrated: true }, { id: "b", migrated: true },
  ]);
});

test("estado inicial mantém cache disponível para migração e listas independentes", () => {
  saveTickets(STORAGE_KEY, [{ id: "old", company: "42 - Empresa" }]);
  const first = createState();
  const second = createState();
  assert.equal(first.user, null);
  assert.deepEqual(first.tickets, []);
  assert.equal(first.localTickets[0].companyCode, "42");
  first.statuses[0].label = "Mudou";
  first.dailyMemoSaveTimers.set("test", 1);
  assert.equal(second.statuses[0].label, "Pendentes");
  assert.equal(second.dailyMemoSaveTimers.size, 0);
});
