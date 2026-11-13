export default async function stopServer() {
  // Encerra também no Windows, sem depender de taskkill para o processo filho.
  await fetch("http://127.0.0.1:4173/__stop", {
    method: "POST", signal: AbortSignal.timeout(2000),
  }).catch(() => undefined);
}
