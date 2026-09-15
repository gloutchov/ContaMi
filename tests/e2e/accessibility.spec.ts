import { expect, test, type Locator } from "@playwright/test";

test("supports IT/EN, light/dark and keyboard-safe dialogs at 1080 px", async ({ page }) => {
  const consoleErrors: string[] = [];
  const expectImportControlsAligned = async (root: Locator, buttonName: string) => {
    const selectBox = await root.locator(".import-controls select").boundingBox();
    const buttonBox = await root.getByRole("button", { name: buttonName }).boundingBox();
    expect(selectBox).not.toBeNull();
    expect(buttonBox).not.toBeNull();
    expect(Math.abs(selectBox!.y - buttonBox!.y)).toBeLessThanOrEqual(1);
    expect(Math.abs((selectBox!.y + selectBox!.height) - (buttonBox!.y + buttonBox!.height))).toBeLessThanOrEqual(1);
  };
  const expectProportionalCompactCharts = async (root: Locator) => {
    await expect.poll(async () => {
      const checks = await root.locator(".trend-bars").evaluateAll((charts) => charts.map((chart) => {
        const chartBox = chart.getBoundingClientRect();
        const labels = Array.from(chart.querySelectorAll(".trend-column small")).map((label) => label.getBoundingClientRect());
        const fills = Array.from(chart.querySelectorAll<SVGGraphicsElement>(".trend-fill"));
        const renderedHeights = fills.map((fill) => Math.round(fill.getBoundingClientRect().height));
        const requestedHeights = fills.map((fill) => fill.getAttribute("height"));
        const maximumTrackHeight = Math.max(0, ...Array.from(chart.querySelectorAll(".trend-track")).map((track) => track.getBoundingClientRect().height));
        return {
          barsUseTrackHeight: Math.max(0, ...renderedHeights) >= maximumTrackHeight * 0.95,
          differentValuesHaveDifferentHeights: new Set(requestedHeights).size <= 1 || new Set(renderedHeights).size > 1,
          labelsInside: labels.length > 0 && labels.every((label) => label.height > 0 && label.top >= chartBox.top && label.bottom <= chartBox.bottom - 1),
          verticalScroll: chart.scrollHeight > chart.clientHeight + 1,
        };
      }));
      return checks.length > 0 && checks.every((item) => item.barsUseTrackHeight && item.differentValuesHaveDifferentHeights && !item.verticalScroll && item.labelsInside);
    }, { timeout: 2_000 }).toBe(true);
  };
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator(".financial-chart-svg").first()).toBeVisible();
  const chartMotion = await page.locator(".financial-chart-line").first().evaluate((line) => {
    const style = getComputedStyle(line);
    return { name: style.animationName, durationSeconds: Number.parseFloat(style.animationDuration) };
  });
  expect(chartMotion.name).toBe("financial-chart-line-in");
  expect(chartMotion.durationSeconds).toBeGreaterThanOrEqual(0.8);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const activeYear = new Date().getFullYear();
  await expect(page.locator(".financial-chart-svg").first()).toBeVisible();
  const overviewCharts = await page.locator(".financial-chart-svg").evaluateAll((charts) => charts.map((chart) => {
    const box = chart.getBoundingClientRect();
    const viewBox = (chart as SVGSVGElement).viewBox.baseVal;
    const firstGridLine = chart.querySelector<SVGGraphicsElement>(".financial-chart-grid");
    const gridBox = firstGridLine?.getBoundingClientRect();
    return {
      width: box.width,
      height: box.height,
      aspectRatioDifference: Math.abs(viewBox.width / viewBox.height - box.width / box.height),
      plotWidthRatio: gridBox ? gridBox.width / box.width : 0,
    };
  }));
  expect(overviewCharts.length).toBeGreaterThanOrEqual(4);
  expect(overviewCharts.every((chart) => chart.width > 200 && chart.height > 100)).toBe(true);
  expect(overviewCharts.every((chart) => chart.aspectRatioDifference < 0.03 && chart.plotWidthRatio > 0.78)).toBe(true);
  const chartAppearance = await page.locator(".history-grid, .dashboard-grid").first().evaluate(() => {
    const linePaths = Array.from(document.querySelectorAll<SVGPathElement>(".financial-chart-line"));
    const areaPaths = Array.from(document.querySelectorAll<SVGPathElement>(".financial-chart-area"));
    const axis = document.querySelector(".financial-chart-axis");
    const legend = document.querySelector(".financial-chart-legend");
    return {
      allLinesAreSmoothPaths: linePaths.length > 0 && linePaths.every((path) => /\bC\b/.test(path.getAttribute("d") ?? "")),
      areasUseGradients: areaPaths.length > 0 && areaPaths.every((path) => path.getAttribute("fill")?.startsWith("url(#")),
      axisFontWeight: axis ? getComputedStyle(axis).fontWeight : "",
      legendFontWeight: legend ? getComputedStyle(legend).fontWeight : "",
      polylines: document.querySelectorAll(".financial-chart-svg polyline").length,
    };
  });
  expect(chartAppearance).toEqual({
    allLinesAreSmoothPaths: true,
    areasUseGradients: true,
    axisFontWeight: "400",
    legendFontWeight: "400",
    polylines: 0,
  });
  const wealthChart = page.locator('[aria-label="Wealth compared with prior years"]');
  await wealthChart.locator(".financial-chart-hit-area").nth(1).hover();
  await expect(wealthChart.locator(".financial-chart-tooltip")).toBeVisible();
  await expect(wealthChart.locator(".financial-chart-tooltip-title")).toHaveText("2025");
  const hoveredValues = await wealthChart.locator(".financial-chart-tooltip-value").allTextContents();
  expect(hoveredValues).toHaveLength(4);
  expect(hoveredValues.every((value) => /\d/.test(value))).toBe(true);
  await page.locator(".page-header").hover();
  await expect(wealthChart.locator(".financial-chart-tooltip")).toBeHidden();

  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(navigation).toBeVisible();
  const reducedTransitionMs = await navigation.getByRole("button", { name: "Overview" }).evaluate((element) => {
    const duration = getComputedStyle(element).transitionDuration;
    return Number.parseFloat(duration) * (duration.endsWith("ms") ? 1 : 1_000);
  });
  expect(reducedTransitionMs).toBeLessThanOrEqual(1);
  const reducedChartAnimationMs = await page.locator(".financial-chart-line").first().evaluate((element) => {
    const duration = getComputedStyle(element).animationDuration;
    return Number.parseFloat(duration) * (duration.endsWith("ms") ? 1 : 1_000);
  });
  expect(reducedChartAnimationMs).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Italiano" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  await page.getByRole("button", { name: "Scuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const taxCard = page.locator("article").filter({ has: page.getByRole("heading", { name: "Tasse", exact: true }) });
  await taxCard.getByRole("button", { name: "Nuova tassa" }).click();
  const taxTypeDialog = page.getByRole("dialog", { name: "Nuova tassa" });
  await taxTypeDialog.getByLabel("Nome della tassa").fill("Tassa sintetica");
  await taxTypeDialog.getByRole("spinbutton", { name: /Numero di rate/ }).fill("3");
  await taxTypeDialog.getByRole("button", { name: "Salva" }).click();
  await expect(taxCard.getByText("Tassa sintetica")).toBeVisible();
  const importCard = page.locator("article").filter({ has: page.getByRole("heading", { name: "Importazione dati", exact: true }) });
  await importCard.getByRole("button", { name: "Transazioni" }).click();
  await expect(page.getByRole("status")).toContainText("Creato il template ContaMi-template-transactions-v3.xlsx.");
  await expectImportControlsAligned(importCard, "Importa file compilato");
  await importCard.getByRole("button", { name: "Importa file compilato" }).click();
  const importDialogIt = page.getByRole("dialog", { name: "Anteprima importazione" });
  await expect(importDialogIt).toContainText("Riga 9, colonna category: riferimento non trovato");
  await expect(importDialogIt.getByRole("button", { name: "Chiudi" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(importDialogIt.getByRole("button", { name: "Conferma importazione" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(importDialogIt).toBeHidden();

  await page.getByRole("navigation").getByRole("button", { name: "Transazioni", exact: true }).click();
  const transactionFilters = page.locator(".filter-toolbar");
  const transactionReset = transactionFilters.getByRole("button", { name: "Azzera filtri" });
  await expect(transactionReset).toBeDisabled();
  await transactionFilters.getByRole("textbox", { name: "Cerca per descrizione…" }).fill("salary");
  await transactionFilters.getByRole("combobox", { name: "Tipo" }).selectOption("income");
  await transactionFilters.getByRole("combobox", { name: "Mese" }).selectOption(`${activeYear}-01`);
  await expect(transactionReset).toBeEnabled();
  await transactionReset.click();
  await expect(transactionFilters.getByRole("textbox", { name: "Cerca per descrizione…" })).toHaveValue("");
  await expect(transactionFilters.getByRole("combobox", { name: "Tipo" })).toHaveValue("all");
  await expect(transactionFilters.getByRole("combobox", { name: "Categoria" })).toHaveValue("all");
  await expect(transactionFilters.getByRole("combobox", { name: "Metodo di pagamento" })).toHaveValue("all");
  await expect(transactionFilters.getByRole("combobox", { name: "Mese" })).toHaveValue("all");
  await expect(transactionReset).toBeDisabled();
  await expect(page.getByRole("cell", { name: "Train" })).toBeVisible();
  const transactionHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(transactionHorizontalOverflow).toBeLessThanOrEqual(0);

  await page.getByRole("button", { name: "Immobili", exact: true }).click();
  await page.getByRole("button", { name: "Utenze" }).click();
  const dialog = page.getByRole("dialog", { name: "Registra utenza" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("input, select, textarea").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Tasse" }).click();
  const propertyTaxDialog = page.getByRole("dialog", { name: "Registra tassa" });
  await propertyTaxDialog.getByLabel("Tassa").selectOption({ label: "Tassa sintetica" });
  const installmentSelect = propertyTaxDialog.locator('select:has(> option[value="3"])');
  await installmentSelect.selectOption("3");
  await expect(installmentSelect).toHaveValue("3");
  await page.keyboard.press("Escape");
  await expect(propertyTaxDialog).toBeHidden();
  const commonExpensesPanel = page.locator("section.panel").filter({ has: page.getByRole("heading", { name: "Spese comuni degli immobili", exact: true }) });
  await expect(commonExpensesPanel.getByText("Condominium installment")).toBeVisible();
  await expect(commonExpensesPanel.getByText("Home internet")).toBeVisible();
  await commonExpensesPanel.getByRole("textbox", { name: "Cerca per descrizione…" }).fill("internet");
  await expect(commonExpensesPanel.getByText("Home internet")).toBeVisible();
  await expect(commonExpensesPanel.getByText("Condominium installment")).toBeHidden();
  await commonExpensesPanel.getByRole("combobox", { name: "Mese" }).selectOption(`${activeYear}-02`);
  await expect(commonExpensesPanel.getByText("Nessuna registrazione corrisponde ai filtri selezionati.")).toBeVisible();
  await commonExpensesPanel.getByRole("button", { name: "Azzera filtri" }).click();
  await expect(commonExpensesPanel.getByText("Condominium installment")).toBeVisible();
  await page.getByRole("heading", { name: "City apartment" }).click();
  const propertyDetailDialog = page.getByRole("dialog", { name: "City apartment" });
  await expect(propertyDetailDialog).toBeVisible();
  await expectProportionalCompactCharts(propertyDetailDialog);
  await page.keyboard.press("Escape");
  await expect(propertyDetailDialog).toBeHidden();
  await page.getByRole("button", { name: "Automobile" }).click();
  await page.getByRole("heading", { name: "Current demo car" }).click();
  const vehicleDetailDialog = page.getByRole("dialog", { name: "Current demo car" });
  await expect(vehicleDetailDialog).toBeVisible();
  await expectProportionalCompactCharts(vehicleDetailDialog.locator(".vehicle-history"));
  await vehicleDetailDialog.getByRole("textbox", { name: "Cerca per descrizione…" }).fill("insurance");
  await expect(vehicleDetailDialog.getByText("Demo insurance")).toBeVisible();
  await expect(vehicleDetailDialog.getByText("Demo fuel")).toBeHidden();
  await vehicleDetailDialog.getByRole("combobox", { name: "Mese" }).selectOption(`${activeYear}-05`);
  await expect(vehicleDetailDialog.getByText("Nessuna registrazione corrisponde ai filtri selezionati.")).toBeVisible();
  await vehicleDetailDialog.getByRole("button", { name: "Azzera filtri" }).click();
  await expect(vehicleDetailDialog.getByText("Demo fuel")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(vehicleDetailDialog).toBeHidden();
  await page.getByRole("button", { name: "Investimenti", exact: true }).click();
  const investmentReturnOverview = page.locator("section.panel").filter({ has: page.getByRole("heading", { name: "Rendimento annuo globale per tipologia" }) });
  await expect(investmentReturnOverview.getByRole("group", { name: "Rendimento annuo globale per tipologia" })).toBeVisible();
  await expect(investmentReturnOverview.locator(".financial-chart-line")).toHaveCount(3);
  await expect(investmentReturnOverview.getByText("Titoli", { exact: true })).toBeVisible();
  await expect(investmentReturnOverview.getByText("Fondi", { exact: true })).toBeVisible();
  await expect(investmentReturnOverview.getByText("Fogli", { exact: true })).toBeVisible();
  const newSavingsCard = page.locator("article").filter({ has: page.getByRole("heading", { name: "New savings plan" }) });
  await expect(newSavingsCard.getByText("Rendimento mensile", { exact: true })).toBeVisible();
  const establishedFundCard = page.locator("article").filter({ has: page.getByRole("heading", { name: "Balanced portfolio" }) });
  await expect(establishedFundCard.getByText("Rendimento annuo", { exact: true })).toBeVisible();
  await page.getByRole("heading", { name: "Balanced portfolio" }).click();
  const investmentDetailDialog = page.getByRole("dialog", { name: "Balanced portfolio" });
  await expect(investmentDetailDialog.getByRole("button", { name: "Aggiorna valore" })).toBeVisible();
  await investmentDetailDialog.getByRole("textbox", { name: "Cerca per descrizione…" }).fill("contribution");
  await expect(investmentDetailDialog.getByText("Contribution", { exact: true })).toBeVisible();
  await expect(investmentDetailDialog.getByText("Current value", { exact: true })).toBeHidden();
  await investmentDetailDialog.getByRole("combobox", { name: "Mese" }).selectOption(`${activeYear}-03`);
  await expect(investmentDetailDialog.getByText("Nessuna registrazione corrisponde ai filtri selezionati.")).toBeVisible();
  await investmentDetailDialog.getByRole("button", { name: "Azzera filtri" }).click();
  await investmentDetailDialog.getByRole("button", { name: "Nuovo movimento" }).click();
  const investmentMovementDialog = page.getByRole("dialog", { name: "Nuovo movimento" });
  await investmentMovementDialog.getByRole("combobox", { name: "Tipo" }).selectOption("withdrawal");
  await investmentMovementDialog.getByRole("spinbutton", { name: "Importo" }).fill("125");
  await investmentMovementDialog.getByRole("textbox", { name: "Descrizione" }).fill("Synthetic investment liquidation");
  await investmentMovementDialog.getByRole("combobox", { name: "Metodo di pagamento" }).selectOption({ index: 1 });
  await investmentMovementDialog.getByRole("button", { name: "Salva" }).click();
  await page.getByRole("heading", { name: "Balanced portfolio" }).click();
  const reopenedInvestmentDetail = page.getByRole("dialog", { name: "Balanced portfolio" });
  await reopenedInvestmentDetail.getByRole("button", { name: "Aggiorna valore" }).click();
  const valuationDialog = page.getByRole("dialog", { name: "Aggiorna valore" });
  await expect(valuationDialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(valuationDialog).toBeHidden();
  await page.getByRole("navigation").getByRole("button", { name: "Transazioni", exact: true }).click();
  const investmentTransactionFilters = page.locator(".filter-toolbar");
  await investmentTransactionFilters.getByRole("textbox", { name: "Cerca per descrizione…" }).fill("Synthetic investment liquidation");
  await investmentTransactionFilters.getByRole("combobox", { name: "Tipo" }).selectOption("transfer");
  await expect(page.getByRole("cell", { name: "Synthetic investment liquidation" })).toBeVisible();
  await investmentTransactionFilters.getByRole("button", { name: "Azzera filtri" }).click();
  await expect(page.getByRole("cell", { name: "Contribution", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Pensione Integrativa", exact: true }).click();
  await page.getByRole("heading", { name: "Linea Equilibrio" }).click();
  const compartmentDetailDialog = page.getByRole("dialog", { name: "Linea Equilibrio" });
  await compartmentDetailDialog.getByRole("textbox", { name: "Cerca per descrizione…" }).fill("pension");
  await expect(compartmentDetailDialog.getByText("Pension contribution")).toBeVisible();
  await expect(compartmentDetailDialog.getByText("Current value", { exact: true })).toBeHidden();
  await compartmentDetailDialog.getByRole("combobox", { name: "Mese" }).selectOption(`${activeYear}-06`);
  await expect(compartmentDetailDialog.getByText("Nessuna registrazione corrisponde ai filtri selezionati.")).toBeVisible();
  await compartmentDetailDialog.getByRole("button", { name: "Azzera filtri" }).click();
  await compartmentDetailDialog.getByRole("button", { name: "Nuovo movimento" }).click();
  const pensionMovementDialog = page.getByRole("dialog", { name: "Nuovo movimento" });
  await pensionMovementDialog.getByRole("combobox", { name: "Tipo" }).selectOption("withdrawal");
  await pensionMovementDialog.getByRole("spinbutton", { name: "Importo" }).fill("80");
  await pensionMovementDialog.getByRole("textbox", { name: "Descrizione" }).fill("Synthetic pension liquidation");
  await pensionMovementDialog.getByRole("combobox", { name: "Metodo di pagamento" }).selectOption({ index: 1 });
  await pensionMovementDialog.getByRole("button", { name: "Salva" }).click();
  await page.getByRole("navigation").getByRole("button", { name: "Transazioni", exact: true }).click();
  const pensionTransactionFilters = page.locator(".filter-toolbar");
  await pensionTransactionFilters.getByRole("textbox", { name: "Cerca per descrizione…" }).fill("Synthetic pension liquidation");
  await pensionTransactionFilters.getByRole("combobox", { name: "Tipo" }).selectOption("transfer");
  await expect(page.getByRole("cell", { name: "Synthetic pension liquidation" })).toBeVisible();
  await pensionTransactionFilters.getByRole("button", { name: "Azzera filtri" }).click();
  await expect(page.getByRole("cell", { name: "Pension contribution", exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Ricorrenze", exact: true }).click();
  const installmentCard = page.locator("article.kpi-card").filter({ hasText: "Rate residue" });
  const installmentTooltip = installmentCard.getByRole("tooltip");
  await expect(installmentTooltip).toBeHidden();
  await installmentCard.hover();
  await expect(installmentTooltip).toBeVisible();
  await expect(installmentTooltip).toContainText("Demo installment");
  await expect(installmentTooltip).toContainText("2 residue");
  await installmentCard.focus();
  await expect(installmentTooltip).toBeVisible();
  await page.getByRole("button", { name: "Spese condivise", exact: true }).click();
  const sharedFilters = page.locator(".entry-filters");
  await sharedFilters.getByRole("combobox", { name: "Mese" }).selectOption(`${activeYear}-07`);
  await sharedFilters.getByRole("textbox", { name: "Cerca per descrizione…" }).fill("weekend");
  await expect(page.getByRole("cell", { name: "Weekend groceries" })).toBeVisible();
  await sharedFilters.getByRole("combobox", { name: "Mese" }).selectOption(`${activeYear}-06`);
  await expect(page.getByText("Nessuna registrazione corrisponde ai filtri selezionati.")).toBeVisible();
  await sharedFilters.getByRole("button", { name: "Azzera filtri" }).click();
  await expect(page.getByRole("cell", { name: "Shared train tickets" })).toBeVisible();

  await page.getByRole("button", { name: "Impostazioni" }).click();
  await page.getByRole("button", { name: "English" }).click();
  await page.getByRole("button", { name: "Light" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("heading", { name: "Data import", exact: true })).toBeVisible();
  const englishImportCard = page.locator("article").filter({ has: page.getByRole("heading", { name: "Data import", exact: true }) });
  await expectImportControlsAligned(englishImportCard, "Import completed file");
  await englishImportCard.getByRole("button", { name: "Import completed file" }).click();
  const importDialogEn = page.getByRole("dialog", { name: "Import preview" });
  await expect(importDialogEn).toContainText("Row 9, column category: reference not found");
  await importDialogEn.getByRole("button", { name: "Confirm import" }).click();
  await expect(page.getByRole("status")).toContainText("Import complete: 2 created, 0 updated, 1 skipped.");
  await navigation.getByRole("button", { name: "Transactions", exact: true }).click();
  await expect(page.locator(".filter-toolbar").getByRole("button", { name: "Reset filters" })).toBeDisabled();
  await navigation.getByRole("button", { name: "Investments", exact: true }).click();
  const investmentReturnOverviewEn = page.locator("section.panel").filter({ has: page.getByRole("heading", { name: "Global annual return by type" }) });
  await expect(investmentReturnOverviewEn.getByRole("group", { name: "Global annual return by type" })).toBeVisible();
  await expect(investmentReturnOverviewEn.getByText("Securities", { exact: true })).toBeVisible();
  await expect(investmentReturnOverviewEn.getByText("Funds", { exact: true })).toBeVisible();
  await expect(investmentReturnOverviewEn.getByText("Savings plans", { exact: true })).toBeVisible();
  const newSavingsCardEn = page.locator("article").filter({ has: page.getByRole("heading", { name: "New savings plan" }) });
  await expect(newSavingsCardEn.getByText("Monthly return", { exact: true })).toBeVisible();
  await page.getByRole("heading", { name: "Balanced portfolio" }).click();
  const investmentDetailEn = page.getByRole("dialog", { name: "Balanced portfolio" });
  await expect(investmentDetailEn.getByRole("textbox", { name: "Search by description…" })).toBeVisible();
  await expect(investmentDetailEn.getByRole("button", { name: "Update value" })).toBeVisible();
  await expect(investmentDetailEn.getByRole("button", { name: "Reset filters" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(investmentDetailEn).toBeHidden();

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(horizontalOverflow).toBeLessThanOrEqual(0);
  expect(await page.locator("[style]").count()).toBe(0);
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute("content", /style-src-attr 'none'/);
  expect(consoleErrors).toEqual([]);
});
