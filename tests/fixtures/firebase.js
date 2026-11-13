// Backend em memória, usado somente quando o Playwright intercepta js/firebase.js.
const user = { uid: "test-user", email: "teste@example.com" };
const data = { tickets: new Map(), daily: new Map(), fixed: null, workflow: null };
const watchers = { tickets: new Set(), daily: new Set(), fixed: new Set(), workflow: new Set() };
let authListener;
function snapshot(kind) {
  const value = data[kind];
  if (value instanceof Map) {
    return { size: value.size, docs: [...value].map(([id, item]) => ({ id, data: () => structuredClone(item) })) };
  }
  return { exists: () => value !== null, data: () => structuredClone(value) };
}
function notify(kind) {
  for (const listener of watchers[kind]) listener(snapshot(kind));
}
function observe(kind, callback) {
  watchers[kind].add(callback);
  queueMicrotask(() => { if (watchers[kind].has(callback)) callback(snapshot(kind)); });
  return () => watchers[kind].delete(callback);
}
function save(kind, id, item) {
  if (data[kind] instanceof Map) data[kind].set(id, structuredClone(item));
  else data[kind] = structuredClone(item);
  notify(kind);
  return Promise.resolve();
}
export function observarAutenticacao(callback) { authListener = callback; callback(null); }
export async function entrarComGoogle() { authListener(user); }
export async function sairDaConta() { authListener(null); }
export const observarOS = (_, callback) => observe("tickets", callback);
export const observarDiario = (_, callback) => observe("daily", callback);
export const observarNotasFixas = (_, callback) => observe("fixed", callback);
export const observarConfiguracaoFluxo = (_, callback) => observe("workflow", callback);
export const salvarOS = (_, item) => save("tickets", item.id, item);
export const salvarRegistroDiario = (_, item) => save("daily", item.id, item);
export const salvarNotasFixas = (_, item) => save("fixed", null, item);
export const salvarConfiguracaoFluxo = (_, item) => save("workflow", null, item);
export async function excluirOS(_, id) { data.tickets.delete(id); notify("tickets"); }
