import { test as base, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/js/firebase.js", (route) => route.fulfill({
      path: fileURLToPath(new URL("../fixtures/firebase.js", import.meta.url)),
      contentType: "text/javascript",
    }));
    await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
    await page.goto("/");
    await expect(page.locator("#syncStatus")).toContainText("Entre com Google");
    await use(page);
    expect(errors, "Nenhum erro JavaScript durante o fluxo").toEqual([]);
  },
});

async function login(page) {
  await page.locator("#authButton").click();
  await expect(page.locator("#authButton")).toHaveText("Sair");
  await expect(page.locator("#headerNewButton")).toBeEnabled();
}

async function createTicket(page, { number = "123", title = "Teste de OS", status = "pendente" } = {}) {
  await page.locator("#headerNewButton").click();
  await expect(page.locator("#ticketDialog")).toBeVisible();
  await page.locator("#numberInput").fill(number);
  await page.locator("#companyCodeInput").fill("42");
  await page.locator("#companyInput").fill("Empresa Exemplo");
  await page.locator("#titleInput").fill(title);
  await page.locator("#statusInput").selectOption(status);
  await page.locator('#ticketForm button[type="submit"]').click();
  await expect(page.locator("#ticketDialog")).not.toBeVisible();
}

test("inicialização, tema, login e logout", async ({ page }) => {
  await expect(page.locator("#headerNewButton")).toBeDisabled();
  await expect(page.locator(".column")).toHaveCount(6);
  await page.locator("#themeButton").click();
  await expect(page.locator("body")).toHaveClass(/dark/);
  await login(page);
  await createTicket(page);
  await page.screenshot({ path: "test-results/kanban.png", fullPage: true });
  await page.locator("#authButton").click();
  await expect(page.locator(".ticket")).toHaveCount(0);
  await expect(page.locator("#headerNewButton")).toBeDisabled();
});

test("cadastro, edição, filtro, movimentação, arquivo e restauração", async ({ page }) => {
  await login(page);
  await createTicket(page);
  await expect(page.locator(".ticket")).toHaveCount(1);
  await page.locator(".ticket").click();
  await page.locator("#titleInput").fill("Descrição editada");
  await page.locator('#ticketForm button[type="submit"]').click();
  await expect(page.locator(".ticket p")).toHaveText("Descrição editada");
  await page.locator("#searchInput").fill("inexistente");
  await expect(page.locator(".ticket")).toHaveCount(0);
  await page.locator("#searchInput").fill("Descrição editada");
  await expect(page.locator(".ticket")).toHaveCount(1);
  await page.locator("#searchInput").fill("");
  await page.locator(".ticket").dragTo(page.locator('.dropzone[data-status="andamento"]'));
  await expect(page.locator('.dropzone[data-status="andamento"] .ticket')).toHaveCount(1);
  await page.locator(".ticket").click();
  await page.locator("#archiveTicketButton").click();
  await expect(page.locator(".ticket")).toHaveCount(0);
  await page.locator("#archiveViewButton").click();
  await page.locator(".ticket").click();
  await page.locator("#archiveTicketButton").click();
  await expect(page.locator(".ticket")).toHaveCount(0);
  await page.locator("#archiveViewButton").click();
  await expect(page.locator(".ticket")).toHaveCount(1);
  await page.locator(".ticket").click();
  await page.locator("#deleteButton").click();
  await expect(page.locator(".ticket")).toHaveCount(0);
});

test("arquivamento por período usa a data do status da OS resolvida", async ({ page }) => {
  await login(page);
  await createTicket(page, { status: "resolvido" });
  await page.locator(".ticket").click();
  await page.locator("#createdAtInput").fill("2026-11-01T10:00");
  await page.locator("#statusUpdatedAtInput").fill("2026-11-12T10:00");
  await page.locator('#ticketForm button[type="submit"]').click();
  await page.locator("#dateFromInput").fill("2026-11-12");
  await page.locator("#dateToInput").fill("2026-11-12");
  await expect(page.locator(".ticket")).toHaveCount(1);
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("1 OS resolvida(s) arquivada(s)");
    await dialog.accept();
  });
  await page.locator("#archiveRangeButton").click();
  await expect(page.locator(".ticket")).toHaveCount(0);
  await page.locator("#archiveViewButton").click();
  await expect(page.locator(".ticket")).toHaveCount(1);
});

test("notas da OS, diário e notas fixas são salvos", async ({ page }) => {
  await login(page);
  await createTicket(page);
  await page.locator(".ticket").click();
  await page.locator("#noteEntryInput").fill("Linha 1\nLinha 2");
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#addNoteButton").click();
  await expect(page.locator("#syncStatus")).toHaveText("Observação adicionada ao Diário.");
  await page.locator('#ticketForm button[type="submit"]').click();
  await expect(page.locator(".ticket-notes")).toContainText("Linha 2");
  await page.locator("#dailyViewButton").click();
  await expect(page.locator("#dailyTextInput")).toHaveValue(/Linha 1\nLinha 2/);
  await page.locator("#dailyTextInput").fill("Atividade do período");
  await expect(page.locator("#dailyMemoStatus")).toHaveText("Salvo automaticamente");
  await page.locator("#dailyPreviousButton").click();
  await page.locator("#dailyNextButton").click();
  await expect(page.locator("#dailyTextInput")).toHaveValue("Atividade do período");
  await page.locator("#fixedNotesViewButton").click();
  await page.locator("#fixedNotesInput").fill("Informação importante");
  await expect(page.locator("#fixedNotesStatus")).toHaveText("Salvo automaticamente");
  await page.locator("#fixedNotesViewButton").click();
  await page.locator("#fixedNotesViewButton").click();
  await expect(page.locator("#fixedNotesInput")).toHaveValue("Informação importante");
});

test("coluna personalizada preserva cards e aparece no formulário", async ({ page }) => {
  await login(page);
  await createTicket(page);
  await page.locator("#statusSettingsButton").click();
  await page.locator(".status-label-input").first().fill("Minha fila");
  await page.locator("#addStatusButton").click();
  await page.locator(".status-label-input").last().fill("Validação");
  await page.locator('#statusSettingsForm button[type="submit"]').click();
  await expect(page.locator(".column")).toHaveCount(7);
  await expect(page.locator('.column[data-status="pendente"] h2')).toHaveText("Minha fila");
  await expect(page.locator(".ticket")).toHaveCount(1);
  await page.locator(".ticket").click();
  await expect(page.locator("#statusInput option").last()).toHaveText("Validação");
});

test("exportação e importação TXT recuperam OS, diário e configuração", async ({ page }) => {
  await login(page);
  await createTicket(page);
  await page.locator("#dailyViewButton").click();
  await page.locator("#dailyTextInput").fill("Anotação do backup");
  await expect(page.locator("#dailyMemoStatus")).toHaveText("Salvo automaticamente");
  await page.locator("#dailyViewButton").click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#exportButton").click();
  const download = await downloadPromise;
  const content = await readFile(await download.path(), "utf8");
  const data = JSON.parse(content.replace(/^CONTROLE-OS-TXT-V1\s*/, ""));
  expect(data.tickets[0].number).toBe("123");
  expect(data.statuses).toHaveLength(6);
  expect(data.dailyEntries[0].text).toBe("Anotação do backup");
  await page.reload();
  await login(page);
  await expect(page.locator(".ticket")).toHaveCount(0);
  await page.locator("#importButton").click();
  await page.locator("#importText").fill(content);
  await page.locator('#importForm button[type="submit"]').click();
  await expect(page.locator(".ticket")).toHaveCount(1);
  await expect(page.locator(".ticket strong")).toHaveText("123");
  await page.locator("#dailyViewButton").click();
  await page.locator(`[data-daily-period="${data.dailyEntries[0].period}"]`).click();
  await expect(page.locator("#dailyTextInput")).toHaveValue("Anotação do backup");
});

test("WhatsApp seleciona período e gera mensagem com OBS", async ({ page }) => {
  await login(page);
  await createTicket(page);
  await page.locator(".ticket").click();
  await page.locator("#noteEntryInput").fill("Observação para o resumo");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.locator("#addNoteButton").click();
  await page.locator('#ticketForm button[type="submit"]').click();
  await page.evaluate(() => { window.open = (url) => { window.testWhatsappUrl = url; }; });
  await page.locator("#whatsappButton").click();
  await page.locator('[data-whatsapp-period="custom"]').click();
  await expect(page.locator("#whatsappCustomDates")).toBeVisible();
  await page.locator('#whatsappStatusOptions input[value="pendente"]').check();
  await expect(page.locator("#whatsappSelectionInfo")).toContainText("1 OS");
  await page.locator('#whatsappForm button[type="submit"]').click();
  const message = await page.evaluate(() => new URL(window.testWhatsappUrl).searchParams.get("text"));
  expect(message).toContain("123");
  expect(message).toContain("Observação para o resumo");
  expect(message).toContain("Personalizado");
});
