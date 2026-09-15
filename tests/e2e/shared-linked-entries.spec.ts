import { expect, test, type Page } from "@playwright/test";

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}

test("creates a shared property entry in Italian dark mode", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Italiano" }).click();
  await page.getByRole("button", { name: "Scuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("navigation").getByRole("button", { name: "Immobili", exact: true }).click();
  await page.locator(".page-header").getByRole("button", { name: "Nuova registrazione" }).click();
  const dialog = page.getByRole("dialog", { name: "Nuova registrazione" });
  await dialog.getByRole("combobox", { name: "Categoria" }).selectOption({ label: "Casa" });
  await dialog.getByRole("textbox", { name: "Descrizione" }).fill("Manutenzione immobile condivisa");
  await dialog.getByRole("spinbutton", { name: "Importo" }).fill("80");
  await dialog.getByRole("combobox", { name: "Metodo di pagamento" }).selectOption({ label: "Carta" });
  await dialog.getByRole("combobox", { name: "Conto" }).selectOption({ label: "Main account" });
  await dialog.getByRole("checkbox", { name: "Dividi automaticamente a metà" }).check();
  await dialog.getByRole("button", { name: "Salva" }).click();

  await page.getByRole("navigation").getByRole("button", { name: "Spese condivise", exact: true }).click();
  const sharedRow = page.getByRole("row").filter({ hasText: "Manutenzione immobile condivisa" });
  await expect(sharedRow).toBeVisible();
  await expect(sharedRow).toContainText("40");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  expect(consoleErrors).toEqual([]);
});

test("creates a shared vehicle cost in English light mode", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "English" }).click();
  await page.getByRole("button", { name: "Light" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByRole("navigation").getByRole("button", { name: "Vehicles", exact: true }).click();
  await page.locator(".page-header").getByRole("button", { name: "New cost / reading" }).click();
  const dialog = page.getByRole("dialog", { name: "New cost / reading" });
  await dialog.getByRole("combobox", { name: "Type", exact: true }).selectOption("insurance");
  await dialog.getByRole("spinbutton", { name: "Amount" }).fill("60");
  await dialog.getByRole("textbox", { name: "Description" }).fill("Shared vehicle insurance");
  await dialog.getByRole("combobox", { name: "Category" }).selectOption({ label: "Transport" });
  await dialog.getByRole("combobox", { name: "Payment method" }).selectOption({ label: "Carta" });
  await dialog.getByRole("combobox", { name: "Account" }).selectOption({ label: "Main account" });
  await dialog.getByRole("checkbox", { name: "Split automatically in half" }).check();
  await dialog.getByRole("combobox", { name: "Paid by" }).selectOption("partner");
  await dialog.getByRole("button", { name: "Save" }).click();

  await page.getByRole("navigation").getByRole("button", { name: "Shared expenses", exact: true }).click();
  const sharedRow = page.getByRole("row").filter({ hasText: "Shared vehicle insurance" });
  await expect(sharedRow).toBeVisible();
  await expect(sharedRow).toContainText("Partner");
  await expect(sharedRow).toContainText("30");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  expect(consoleErrors).toEqual([]);
});
