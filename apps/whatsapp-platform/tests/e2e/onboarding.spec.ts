import { test, expect } from "@playwright/test";

const email = process.env.E2E_WHATSAPP_ADMIN_EMAIL?.trim() ?? "";
const password = process.env.E2E_WHATSAPP_ADMIN_PASSWORD?.trim() ?? "";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login?next=/onboarding");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/onboarding/, { timeout: 45_000 });
}

test.describe("Onboarding", () => {
  test.skip(!email || !password, "Defina E2E_WHATSAPP_ADMIN_EMAIL e E2E_WHATSAPP_ADMIN_PASSWORD no ambiente");

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("falha na validação WhatsApp bloqueia avanço", async ({ page }) => {
    await login(page);
    await page.goto("/onboarding");

    if (await page.getByRole("heading", { name: "Está pronto para começar" }).isVisible()) {
      test.skip(true, "Conta já concluiu o onboarding — execute com tenant em passo 2 ou base limpa");
    }

    if (await page.getByRole("heading", { name: "Vamos configurar o assistente" }).isVisible()) {
      await page.getByRole("button", { name: "Continuar" }).click();
    }

    await expect(page.getByRole("heading", { name: "Ligue o WhatsApp Business" })).toBeVisible();
    await page.locator("#phoneNumberId").fill("123456789012345");
    await page.locator("#accessToken").fill("__E2E_WHATSAPP_FORCE_INVALID__");
    await page.getByRole("button", { name: /Guardar e concluir ligação/ }).click();
    await expect(page.getByText(/Access Token inválido|sem permissão para este número/i)).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("heading", { name: "Está pronto para começar" })).not.toBeVisible();
  });

  test("fluxo feliz e reentrada no passo correto", async ({ page }) => {
    await login(page);
    await page.goto("/onboarding");

    if (await page.getByRole("heading", { name: "Está pronto para começar" }).isVisible()) {
      await page.reload();
      await expect(page.getByRole("heading", { name: "Está pronto para começar" })).toBeVisible();
      return;
    }

    if (await page.getByRole("heading", { name: "Vamos configurar o assistente" }).isVisible()) {
      await page.getByRole("button", { name: "Continuar" }).click();
    }

    await expect(page.getByRole("heading", { name: "Ligue o WhatsApp Business" })).toBeVisible();
    const phoneId = `e2e${Date.now()}`;
    await page.locator("#phoneNumberId").fill(phoneId);
    await page.locator("#accessToken").fill("EAA_E2E_SKIP_VALIDATE");
    await page.getByRole("button", { name: /Guardar e concluir ligação/ }).click();
    await expect(page.getByText(/Ligação confirmada com a Meta/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Está pronto para começar" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Ir para o painel" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

    await page.goto("/onboarding");
    await expect(page.getByRole("heading", { name: "Está pronto para começar" })).toBeVisible({ timeout: 15_000 });
  });
});
