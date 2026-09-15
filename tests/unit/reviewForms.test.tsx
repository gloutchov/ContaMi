import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FinanceCommand } from "../../src/domain/commands";
import { applyFinanceCommand, createEmptyFinanceData as createBaseFinanceData } from "../../src/domain/finance";
import { InvestmentForm } from "../../src/renderer/forms/InvestmentForms";
import { InvestmentCorrectionForm } from "../../src/renderer/forms/InvestmentCorrectionForm";
import { PensionEntityForm } from "../../src/renderer/forms/PensionForms";
import { TaxTypeForm } from "../../src/renderer/forms/CatalogForms";
import { PropertyExpenseForm } from "../../src/renderer/forms/PropertyExpenseForms";
import { PropertyEntryForm } from "../../src/renderer/forms/PropertyForms";
import { TransactionForm } from "../../src/renderer/forms/TransactionForm";
import { VehicleEntryForm } from "../../src/renderer/forms/VehicleForms";
import { RecurringForm } from "../../src/renderer/forms/RecurringForm";
import { I18nProvider } from "../../src/renderer/i18n/I18nContext";
import { PropertiesView } from "../../src/renderer/views/PropertiesView";

function createEmptyFinanceData(year: number) {
  const data = createBaseFinanceData(year);
  data.accounts.push({ id: "00000000-0000-4000-8000-0000000000a1", name: "Synthetic bank", kind: "bank", currency: "EUR", openingBalance: 0, active: true, openedAt: `${year}-01-01`, notes: "" });
  return data;
}

const renderIt = (component: ReactNode) => render(<I18nProvider language="it">{component}</I18nProvider>);
afterEach(cleanup);

function dataWithUnrelatedSharedExpense() {
  const data = createEmptyFinanceData(2026);
  const propertyId = crypto.randomUUID();
  data.properties.push({ id: propertyId, name: "Casa", kind: "apartment", usage: "residence", areaSqm: 100, ownershipShare: 1, purchasePrice: 0, active: true, notes: "" });
  const transactionId = crypto.randomUUID();
  const sharedId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  data.transactions.push({
    id: transactionId, date: "2026-07-01", description: "Spesa condivisa precedente",
    categoryId: data.categories[3].id, paymentMethodId: data.paymentMethods[0].id,
    kind: "expense", amount: 40, currency: "EUR", sharedExpenseId: sharedId,
    shared: true, sharedPaidBy: "owner", sharedSettled: false, notes: "",
    createdAt: timestamp, updatedAt: timestamp,
  });
  data.sharedExpenses.push({
    id: sharedId, date: "2026-07-01", description: "Spesa condivisa precedente",
    categoryId: data.categories[3].id, paymentMethodId: data.paymentMethods[0].id,
    amount: 40, ownerShare: 20, partnerShare: 20, paidBy: "owner", settled: false,
    transactionId, notes: "",
  });
  return { data, propertyId };
}

describe("v0.8 review forms", () => {
  it("previews and confirms a recurring rate change from the keyboard in Italian and English", async () => {
    let data = createEmptyFinanceData(2026);
    const recurringId = crypto.randomUUID();
    data = applyFinanceCommand(data, { type: "addRecurringItem", value: {
      id: recurringId, name: "Servizio sintetico", kind: "service", direction: "expense", amount: 50,
      frequency: "monthly", categoryId: data.categories.find((item) => item.kind === "expense")!.id,
      paymentMethodId: data.paymentMethods[0].id, accountId: data.accounts[0].id,
      nextDueDate: "2026-08-15", active: true, notes: "",
    } });
    const onSave = vi.fn<(command: FinanceCommand) => Promise<void>>().mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    const view = renderIt(<RecurringForm data={data} value={data.recurringItems[0]} onClose={() => undefined} onSave={onSave} />);

    expect(screen.getByRole("spinbutton", { name: /Tariffa base/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Cambia tariffa" }));
    await user.clear(screen.getByLabelText("Nuovo importo"));
    await user.type(screen.getByLabelText("Nuovo importo"), "65");
    fireEvent.change(screen.getByLabelText("Mese di decorrenza"), { target: { value: "2026-10" } });
    expect(screen.getByText("Scadenze pianificate da aggiornare: 3.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Mese di decorrenza"), "{Enter}");

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("3 scadenze pianificate"));
    expect(onSave).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await user.type(screen.getByLabelText("Mese di decorrenza"), "{Enter}");

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      type: "addRecurringRateChange",
      value: { recurringId, amount: 65, effectiveFrom: "2026-10-01" },
    });
    expect(confirm).toHaveBeenLastCalledWith(expect.stringContaining("3 scadenze pianificate"));

    view.unmount();
    render(<I18nProvider language="en"><RecurringForm data={data} value={data.recurringItems[0]} onClose={() => undefined} onSave={onSave} /></I18nProvider>);
    expect(screen.getByRole("button", { name: "Change rate" })).toBeInTheDocument();
    confirm.mockRestore();
  });

  it("requires an account for a cash-affecting transaction", async () => {
    const data = createBaseFinanceData(2026);
    const onSave = vi.fn<(command: FinanceCommand) => Promise<void>>().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderIt(<TransactionForm data={data} onClose={() => undefined} onSave={onSave} />);

    await user.type(screen.getByLabelText("Descrizione"), "Spesa sintetica");
    await user.selectOptions(screen.getByLabelText("Categoria"), data.categories.find((item) => item.kind === "expense")!.id);
    await user.type(screen.getByLabelText("Importo"), "25");

    expect(screen.getByLabelText("Conto")).toBeRequired();
    expect(screen.getByRole("button", { name: "Salva" })).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("edits a linked investment movement with the standard income and expense choices", async () => {
    const data = createEmptyFinanceData(2026);
    const investmentId = crypto.randomUUID();
    const entryId = crypto.randomUUID();
    const transactionId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    data.investments.push({
      id: investmentId, name: "Fondo sintetico", kind: "fund", provider: "", currency: "EUR",
      active: true, openedAt: "2026-01-01", notes: "",
    });
    data.investmentEntries.push({
      id: entryId, investmentId, date: "2026-03-01", kind: "contribution", amount: 200,
      description: "Versamento sintetico", categoryId: data.categories[8].id,
      paymentMethodId: data.paymentMethods[0].id, accountId: data.accounts[0].id,
      transactionId, notes: "",
    });
    data.transactions.push({
      id: transactionId, date: "2026-03-01", description: "Versamento sintetico",
      categoryId: data.categories[8].id, paymentMethodId: data.paymentMethods[0].id,
      accountId: data.accounts[0].id, kind: "transfer", cashFlowDirection: "outflow", amount: 200,
      currency: "EUR", investmentId, investmentEntryId: entryId, notes: "",
      createdAt: timestamp, updatedAt: timestamp,
    });
    const onSave = vi.fn<(command: FinanceCommand) => Promise<void>>().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderIt(<TransactionForm data={data} value={data.transactions[0]} onClose={() => undefined} onSave={onSave} />);

    expect(screen.getByLabelText("Tipo")).toHaveValue("expense");
    expect(screen.queryByLabelText("Effetto sulla liquidità")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Investimento o comparto pensione")).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Tipo"), "income");
    await user.selectOptions(screen.getByLabelText("Categoria"), data.categories[8].id);
    await user.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      type: "updateTransaction",
      value: {
        id: transactionId, kind: "transfer", cashFlowDirection: "inflow",
        investmentId, investmentEntryId: entryId, destinationAccountId: undefined,
      },
    });
  });

  it("creates an investment correction without transaction fields", async () => {
    const data = createEmptyFinanceData(2026);
    const investmentId = crypto.randomUUID();
    data.investments.push({
      id: investmentId, name: "Fondo ereditato", kind: "fund", provider: "", currency: "EUR",
      active: true, openedAt: "2025-01-01", notes: "",
    });
    const onSave = vi.fn<(command: FinanceCommand) => Promise<void>>().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderIt(<InvestmentCorrectionForm data={data} investmentId={investmentId} onClose={() => undefined} onSave={onSave} />);

    expect(screen.getByText(/Non crea una Transazione/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Metodo di pagamento")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Codice ISIN"), "zztestabcde8");
    expect(screen.getByText("La cifra di controllo del codice ISIN non è valida.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salva" })).toBeDisabled();
    await user.clear(screen.getByLabelText("Codice ISIN"));
    await user.type(screen.getByLabelText("Codice ISIN"), "  zztestabcde7 ");
    await user.selectOptions(screen.getByLabelText("Direzione della correzione"), "withdrawal_correction");
    await user.type(screen.getByLabelText("Importo"), "35");
    await user.type(screen.getByLabelText("Descrizione"), "Differenza liquidazioni importate");
    await user.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      type: "addInvestmentCorrectionWithIsin",
      value: {
        isin: "ZZTESTABCDE7",
        correction: {
          investmentId, kind: "withdrawal_correction", amount: 35,
          categoryId: undefined, paymentMethodId: undefined, accountId: undefined, transactionId: undefined,
        },
      },
    });
  });

  it("updates an existing correction and the position ISIN through one command", async () => {
    const data = createEmptyFinanceData(2026);
    const investmentId = crypto.randomUUID();
    data.investments.push({
      id: investmentId, name: "Synthetic corrected fund", isin: "ZZTESTABCDE7", kind: "fund",
      provider: "", currency: "EUR", active: true, openedAt: "2025-01-01", notes: "",
    });
    const correction = {
      id: crypto.randomUUID(), investmentId, date: "2026-05-01" as const,
      kind: "contribution_correction" as const, amount: 20,
      description: "Synthetic existing correction", notes: "",
    };
    data.investmentEntries.push(correction);
    const onSave = vi.fn<(command: FinanceCommand) => Promise<void>>().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<I18nProvider language="en"><InvestmentCorrectionForm data={data} investmentId={investmentId} value={correction} onClose={() => undefined} onSave={onSave} /></I18nProvider>);

    expect(screen.getByLabelText("ISIN code")).toHaveValue("ZZTESTABCDE7");
    await user.clear(screen.getByLabelText("ISIN code"));
    await user.type(screen.getByLabelText("ISIN code"), "zztestabcdf4");
    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), "30");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      type: "updateInvestmentCorrectionWithIsin",
      value: {
        isin: "ZZTESTABCDF4",
        correction: { id: correction.id, investmentId, amount: 30 },
      },
    });
  });

  it("creates a new investment together with its initial contribution", async () => {
    const data = createEmptyFinanceData(2026);
    const accountId = data.accounts[0].id;
    const onSave = vi.fn<(command: FinanceCommand) => Promise<void>>().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderIt(<InvestmentForm data={data} onClose={() => undefined} onSave={onSave} />);

    await user.type(screen.getByLabelText("Nome"), "Fondo sintetico");
    await user.type(screen.getByLabelText("Codice ISIN"), "zztestabcde7");
    await user.type(screen.getByLabelText(/^Versamento iniziale/), "2500");
    await user.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const command = onSave.mock.calls[0][0];
    expect(command.type).toBe("addInvestmentWithInitialContribution");
    if (command.type === "addInvestmentWithInitialContribution") {
      expect(command.value.investment.isin).toBe("ZZTESTABCDE7");
      expect(command.value.initialContribution).toMatchObject({ amount: 2_500, kind: "contribution", accountId });
      expect(command.value.initialContribution.investmentId).toBe(command.value.investment.id);
    }
  });

  it("supports an optional ISIN for pension compartments but not for the collector", async () => {
    const data = createEmptyFinanceData(2026);
    const pensionId = crypto.randomUUID();
    const pensionTypeId = data.investmentTypes.find((item) => item.code === "pension")!.id;
    data.investments.push({
      id: pensionId, name: "Synthetic pension", kind: "pension", typeId: pensionTypeId,
      provider: "", currency: "EUR", active: true, openedAt: "2020-01-01", notes: "",
    });
    const onSave = vi.fn<(command: FinanceCommand) => Promise<void>>().mockResolvedValue(undefined);
    const user = userEvent.setup();
    const view = render(<I18nProvider language="en"><PensionEntityForm data={data} mode="compartment" initialPensionId={pensionId} onClose={() => undefined} onSave={onSave} /></I18nProvider>);

    await user.type(screen.getByLabelText("Name"), "Synthetic compartment");
    await user.type(screen.getByLabelText("ISIN code"), "Z1TESTABCDE7");
    expect(screen.getByText(/Enter a 12-character ISIN/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    await user.clear(screen.getByLabelText("ISIN code"));
    await user.type(screen.getByLabelText("ISIN code"), "zztestabcde7");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      type: "addInvestment",
      value: { parentInvestmentId: pensionId, isin: "ZZTESTABCDE7" },
    });

    view.unmount();
    render(<I18nProvider language="en"><PensionEntityForm data={data} mode="pension" onClose={() => undefined} onSave={onSave} /></I18nProvider>);
    expect(screen.queryByLabelText("ISIN code")).not.toBeInTheDocument();
  });

  it("calculates a property valuation from the value per square metre", async () => {
    const data = createEmptyFinanceData(2026);
    const propertyId = crypto.randomUUID();
    data.properties.push({ id: propertyId, name: "Casa", kind: "apartment", usage: "residence", areaSqm: 100, ownershipShare: 1, purchasePrice: 0, active: true, notes: "" });
    const onSave = vi.fn<(command: FinanceCommand) => Promise<void>>().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderIt(<PropertyEntryForm data={data} initialPropertyId={propertyId} onClose={() => undefined} onSave={onSave} />);

    await user.selectOptions(screen.getByLabelText("Tipo"), "valuation");
    await user.type(screen.getByLabelText("Descrizione"), "Valutazione sintetica");
    await user.selectOptions(screen.getByLabelText("Metodo di valutazione"), "sqm");
    await user.type(screen.getByLabelText(/^Valore per m²/), "3000");
    expect(screen.getByText("300000.00")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const command = onSave.mock.calls[0][0];
    expect(command.type).toBe("addPropertyEntry");
    if (command.type === "addPropertyEntry") expect(command.value).toMatchObject({ amount: 300_000, valuePerSqm: 3_000 });
  });

  it("can register a rental income entry as recurring rent", async () => {
    const data = createEmptyFinanceData(2026);
    const propertyId = crypto.randomUUID();
    const rentCategory = data.categories.find((item) => item.nameIt === "Affitti")!;
    data.properties.push({ id: propertyId, name: "Bilocale", kind: "apartment", usage: "rental", ownershipShare: 1, purchasePrice: 0, active: true, notes: "" });
    const onSave = vi.fn<(command: FinanceCommand) => Promise<void>>().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderIt(<PropertyEntryForm data={data} initialPropertyId={propertyId} onClose={() => undefined} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Data"), { target: { value: "2026-07-25" } });
    await user.selectOptions(screen.getByLabelText("Tipo"), "income");
    await user.selectOptions(screen.getByLabelText("Categoria"), rentCategory.id);
    await user.type(screen.getByLabelText("Descrizione"), "Affitto luglio");
    await user.type(screen.getByLabelText("Importo"), "750");
    await user.selectOptions(screen.getByLabelText("Metodo di pagamento"), data.paymentMethods[0].id);
    await user.click(screen.getByRole("checkbox", { name: "Registra come affitto ricorrente" }));
    expect(screen.getByLabelText("Frequenza")).toHaveValue("monthly");
    expect(screen.getByLabelText("Prossima scadenza")).toHaveValue("2026-07-25");
    await user.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const command = onSave.mock.calls[0][0];
    expect(command.type).toBe("addPropertyRentRecurring");
    if (command.type === "addPropertyRentRecurring") {
      expect(command.value.entry).toMatchObject({ kind: "income", propertyId, categoryId: rentCategory.id, amount: 750 });
      expect(command.value.recurring).toMatchObject({ kind: "rent", direction: "income", propertyId, amount: 750, frequency: "monthly" });
    }
  });

  it("offers the automatic half split in a generic property expense", async () => {
    let data = createEmptyFinanceData(2026);
    const propertyId = crypto.randomUUID();
    data.properties.push({ id: propertyId, name: "Casa", kind: "apartment", usage: "residence", ownershipShare: 1, purchasePrice: 0, active: true, notes: "" });
    const onSave = vi.fn<(command: FinanceCommand) => Promise<void>>().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderIt(<PropertyEntryForm data={data} initialPropertyId={propertyId} onClose={() => undefined} onSave={onSave} />);

    await user.selectOptions(screen.getByLabelText("Categoria"), data.categories.find((item) => item.nameIt === "Casa")!.id);
    await user.type(screen.getByLabelText("Descrizione"), "Manutenzione condivisa");
    await user.type(screen.getByLabelText("Importo"), "81");
    await user.selectOptions(screen.getByLabelText("Metodo di pagamento"), data.paymentMethods[0].id);
    await user.click(screen.getByRole("checkbox", { name: "Dividi automaticamente a metà" }));
    await user.selectOptions(screen.getByLabelText("Pagato da"), "partner");
    await user.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const command = onSave.mock.calls[0][0];
    expect(command).toMatchObject({
      type: "addPropertyEntryWithSharedExpense",
      value: { entry: { propertyId, amount: 81, accountId: data.accounts[0].id }, shared: { paidBy: "partner", settled: false } },
    });
    data = applyFinanceCommand(data, command);
    expect(data.sharedExpenses[0]).toMatchObject({ ownerShare: 40.5, partnerShare: 40.5, paidBy: "partner" });
  });

  it("offers the automatic half split in a vehicle cost in English", async () => {
    let data = createEmptyFinanceData(2026);
    const vehicleId = crypto.randomUUID();
    data.vehicles.push({ id: vehicleId, name: "Synthetic car", manufacturer: "Example", model: "Three", fuelType: "electric", active: true, notes: "" });
    const onSave = vi.fn<(command: FinanceCommand) => Promise<void>>().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<I18nProvider language="en"><VehicleEntryForm data={data} initialVehicleId={vehicleId} onClose={() => undefined} onSave={onSave} /></I18nProvider>);

    await user.selectOptions(screen.getByLabelText("Type"), "insurance");
    await user.type(screen.getByLabelText("Amount"), "60");
    await user.type(screen.getByLabelText("Description"), "Shared synthetic insurance");
    await user.selectOptions(screen.getByLabelText("Category"), data.categories.find((item) => item.nameEn === "Transport")!.id);
    await user.selectOptions(screen.getByLabelText("Payment method"), data.paymentMethods[0].id);
    await user.click(screen.getByRole("checkbox", { name: "Split automatically in half" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const command = onSave.mock.calls[0][0];
    expect(command).toMatchObject({
      type: "addVehicleEntryWithSharedExpense",
      value: { entry: { vehicleId, kind: "insurance", amount: 60, accountId: data.accounts[0].id }, shared: { paidBy: "owner", settled: false } },
    });
    data = applyFinanceCommand(data, command);
    expect(data.sharedExpenses[0]).toMatchObject({ ownerShare: 30, partnerShare: 30 });
  });

  it("calculates vehicle distance and fuel litres while preserving manual overrides", async () => {
    const data = createEmptyFinanceData(2026);
    const vehicleId = crypto.randomUUID();
    data.vehicles.push({ id: vehicleId, name: "Auto sintetica", manufacturer: "Example", model: "Four", fuelType: "petrol", active: true, notes: "" });
    data.vehicleEntries.push({
      id: crypto.randomUUID(), vehicleId, date: "2026-05-10", kind: "fuel", description: "Lettura sintetica precedente",
      amount: 50, odometerKm: 10_000, distanceKm: 600, fuelLiters: 25, notes: "",
    });
    const onSave = vi.fn<(command: FinanceCommand) => Promise<void>>().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderIt(<VehicleEntryForm data={data} initialVehicleId={vehicleId} onClose={() => undefined} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Data"), { target: { value: "2026-06-10" } });
    fireEvent.change(screen.getByLabelText("Chilometri totali"), { target: { value: "10750" } });
    await waitFor(() => expect(screen.getByLabelText(/^Chilometri percorsi/)).toHaveValue(750));
    expect(screen.getByText("Calcolati dall’ultima lettura disponibile: 10.000 km.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Importo"), { target: { value: "60" } });
    fireEvent.change(screen.getByLabelText("Prezzo al litro"), { target: { value: "2" } });
    await waitFor(() => expect(screen.getByLabelText(/^Litri/)).toHaveValue(30));
    expect(screen.getByText("Calcolati automaticamente dall’importo e dal prezzo al litro; puoi correggerli.")).toBeInTheDocument();

    const distance = screen.getByLabelText(/^Chilometri percorsi/);
    fireEvent.change(distance, { target: { value: "700" } });
    fireEvent.change(screen.getByLabelText("Chilometri totali"), { target: { value: "10800" } });
    expect(distance).toHaveValue(700);
    fireEvent.change(distance, { target: { value: "" } });
    fireEvent.blur(distance);
    await waitFor(() => expect(distance).toHaveValue(800));
    fireEvent.change(screen.getByLabelText("Chilometri totali"), { target: { value: "9900" } });
    await waitFor(() => expect(distance).toHaveValue(null));
    expect(screen.getByText(/La lettura è inferiore ai 10\.000 km precedenti/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Chilometri totali"), { target: { value: "10800" } });
    await waitFor(() => expect(distance).toHaveValue(800));

    const liters = screen.getByLabelText(/^Litri/);
    fireEvent.change(liters, { target: { value: "29" } });
    fireEvent.change(screen.getByLabelText("Importo"), { target: { value: "62" } });
    expect(liters).toHaveValue(29);
    fireEvent.change(liters, { target: { value: "" } });
    fireEvent.blur(liters);
    await waitFor(() => expect(liters).toHaveValue(31));

    const fuelType = screen.getByLabelText("Alimentazione") as HTMLSelectElement;
    expect(Array.from(fuelType.options).map((option) => option.text)).toEqual(["—", "Benzina", "Diesel", "GPL", "Metano", "Elettricità", "Idrogeno"]);
    await user.selectOptions(fuelType, "hydrogen");
    await user.type(screen.getByLabelText("Descrizione"), "Rifornimento sintetico");
    await user.selectOptions(screen.getByLabelText("Categoria"), data.categories.find((item) => item.nameIt === "Trasporti")!.id);
    await waitFor(() => expect(screen.getByLabelText("Conto")).toHaveValue(data.accounts[0].id));
    await user.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      type: "addVehicleEntryWithSharedExpense",
      value: { entry: { vehicleId, distanceKm: 800, fuelLiters: 31, fuelUnitPrice: 2, fuelType: "hydrogen" } },
    });
  });

  it("shows the vehicle fuel dropdown in English and preserves a legacy current value", () => {
    const data = createEmptyFinanceData(2026);
    const vehicleId = crypto.randomUUID();
    data.vehicles.push({ id: vehicleId, name: "Synthetic car", manufacturer: "Example", model: "Five", fuelType: "petrol", active: true, notes: "" });
    const value = {
      id: crypto.randomUUID(), vehicleId, date: "2026-06-10", kind: "fuel" as const, description: "Synthetic legacy fuel",
      amount: 60, fuelLiters: 30, fuelUnitPrice: 2, fuelType: "legacy synthetic value", notes: "",
    };

    render(<I18nProvider language="en"><VehicleEntryForm data={data} value={value} onClose={() => undefined} onSave={async () => undefined} /></I18nProvider>);

    const fuelType = screen.getByLabelText("Fuel type") as HTMLSelectElement;
    expect(fuelType).toHaveValue("legacy synthetic value");
    expect(Array.from(fuelType.options).map((option) => option.text)).toEqual([
      "—", "legacy synthetic value", "Petrol", "Diesel", "LPG", "Methane", "Electricity", "Hydrogen",
    ]);
  });

  it("creates an electricity expense with bands and a shared split", async () => {
    const data = createEmptyFinanceData(2026);
    const propertyId = crypto.randomUUID();
    data.properties.push({ id: propertyId, name: "Casa", kind: "apartment", usage: "residence", areaSqm: 100, ownershipShare: 1, purchasePrice: 0, active: true, notes: "" });
    const onSave = vi.fn<(command: FinanceCommand) => Promise<void>>().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderIt(<PropertyExpenseForm data={data} mode="utility" initialPropertyId={propertyId} onClose={() => undefined} onSave={onSave} />);

    await user.type(screen.getByLabelText("Descrizione"), "Bolletta elettrica");
    await user.type(screen.getByLabelText("Importo"), "180");
    await user.type(screen.getByLabelText("Elettricità F1 (kWh)"), "100");
    await user.type(screen.getByLabelText(/^Elettricità F2 \+ F3 \(kWh\)/), "210");
    await user.click(screen.getByRole("checkbox", { name: /Mostra anche nelle Spese condivise/ }));
    await user.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const command = onSave.mock.calls[0][0];
    expect(command.type).toBe("addPropertyExpense");
    if (command.type === "addPropertyExpense") {
      expect(command.value.entry).toMatchObject({ detailKind: "utility_electricity", quantity: 310, electricityKwhF1: 100, electricityKwhF23: 210 });
      expect(command.value.shared).toMatchObject({ ownerShare: 90, partnerShare: 90 });
    }
  });

  it("offers configured tax installments in English", async () => {
    const data = createEmptyFinanceData(2026);
    const propertyId = crypto.randomUUID();
    const imu = data.taxTypes.find((item) => item.name === "IMU")!;
    const tari = data.taxTypes.find((item) => item.name === "TARI")!;
    data.properties.push({ id: propertyId, name: "Home", kind: "apartment", usage: "residence", ownershipShare: 1, purchasePrice: 0, active: true, notes: "" });
    render(<I18nProvider language="en"><PropertyExpenseForm data={data} mode="tax" initialPropertyId={propertyId} onClose={() => undefined} onSave={async () => undefined} /></I18nProvider>);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText("Tax"), imu.id);
    expect(screen.getByRole("option", { name: "Instalment 1 of 2" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Instalment 2 of 2" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Tax"), tari.id);
    expect((screen.getByRole("option", { name: "TARI" }) as HTMLOptionElement).selected).toBe(true);
  });

  it("keeps utility and tax controls interactive when opened from the properties view", async () => {
    const data = createEmptyFinanceData(2026);
    const propertyId = crypto.randomUUID();
    const imu = data.taxTypes.find((item) => item.name === "IMU")!;
    data.properties.push({ id: propertyId, name: "Casa", kind: "apartment", usage: "residence", areaSqm: 100, ownershipShare: 1, purchasePrice: 0, active: true, notes: "" });
    const user = userEvent.setup();
    renderIt(<PropertiesView data={data} onSave={async () => undefined} onGenerateReport={async () => ({ canceled: true })} />);

    await user.click(screen.getByRole("button", { name: "Utenze" }));
    const utilitySelect = screen.getByLabelText("Utenza");
    const description = screen.getByLabelText("Descrizione");
    expect(utilitySelect).toBeEnabled();
    expect(description).toBeEnabled();
    await user.selectOptions(utilitySelect, "utility_gas");
    await user.type(description, "Bolletta gas modificabile");
    expect((utilitySelect as HTMLSelectElement).value).toBe("utility_gas");
    expect(description).toHaveValue("Bolletta gas modificabile");

    await user.click(screen.getByRole("button", { name: "Annulla" }));
    await user.click(screen.getByRole("button", { name: "Tasse" }));
    const taxSelect = screen.getByLabelText("Tassa");
    expect(taxSelect).toBeEnabled();
    await user.selectOptions(taxSelect, imu.id);
    expect((taxSelect as HTMLSelectElement).value).toBe(imu.id);
    expect(screen.getByLabelText("Rata")).toBeEnabled();
  });

  it("does not reuse an unrelated shared expense id for a new utility", async () => {
    const fixture = dataWithUnrelatedSharedExpense();
    let data = fixture.data;
    const { propertyId } = fixture;
    const onSave = vi.fn<(command: FinanceCommand) => Promise<void>>().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderIt(<PropertyExpenseForm data={data} mode="utility" initialPropertyId={propertyId} onClose={() => undefined} onSave={onSave} />);

    expect(screen.getByRole("checkbox", { name: /Mostra anche nelle Spese condivise/ })).not.toBeChecked();
    await user.type(screen.getByLabelText("Descrizione"), "Nuova bolletta gas");
    await user.type(screen.getByLabelText("Importo"), "80");
    await user.selectOptions(screen.getByLabelText("Utenza"), "utility_gas");
    await user.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const command = onSave.mock.calls[0][0];
    expect(command.type).toBe("addPropertyExpense");
    if (command.type === "addPropertyExpense") {
      expect(command.value.shared).toBeUndefined();
      expect(() => { data = applyFinanceCommand(data, command); }).not.toThrow();
      expect(data.propertyEntries).toHaveLength(1);
      expect(data.sharedExpenses).toHaveLength(1);
    }
  });

  it("does not reuse an unrelated shared expense id for a new property tax", async () => {
    const fixture = dataWithUnrelatedSharedExpense();
    let data = fixture.data;
    const { propertyId } = fixture;
    const imu = data.taxTypes.find((item) => item.name === "IMU")!;
    const onSave = vi.fn<(command: FinanceCommand) => Promise<void>>().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderIt(<PropertyExpenseForm data={data} mode="tax" initialPropertyId={propertyId} onClose={() => undefined} onSave={onSave} />);

    expect(screen.getByRole("checkbox", { name: /Mostra anche nelle Spese condivise/ })).not.toBeChecked();
    await user.selectOptions(screen.getByLabelText("Tassa"), imu.id);
    await user.selectOptions(screen.getByLabelText("Rata"), "1");
    await user.type(screen.getByLabelText("Descrizione"), "Prima rata IMU");
    await user.type(screen.getByLabelText("Importo"), "350");
    await user.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const command = onSave.mock.calls[0][0];
    expect(command.type).toBe("addPropertyExpense");
    if (command.type === "addPropertyExpense") {
      expect(command.value.entry).toMatchObject({ taxTypeId: imu.id, taxInstallmentNumber: 1, amount: 350 });
      expect(command.value.entry.detailKind).toBeUndefined();
      expect(command.value.shared).toBeUndefined();
      expect(() => { data = applyFinanceCommand(data, command); }).not.toThrow();
      expect(data.propertyEntries).toHaveLength(1);
      expect(data.transactions).toHaveLength(2);
      expect(data.sharedExpenses).toHaveLength(1);
    }
  });

  it("can include an IMU payment in the common property-expense summary", async () => {
    const data = createEmptyFinanceData(2026);
    const propertyId = crypto.randomUUID();
    const imu = data.taxTypes.find((item) => item.name === "IMU")!;
    data.properties.push({ id: propertyId, name: "Casa", kind: "apartment", usage: "residence", ownershipShare: 1, purchasePrice: 0, active: true, notes: "" });
    const onSave = vi.fn<(command: FinanceCommand) => Promise<void>>().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderIt(<PropertyExpenseForm data={data} mode="tax" initialPropertyId={propertyId} onClose={() => undefined} onSave={onSave} />);

    await user.selectOptions(screen.getByLabelText("Tassa"), imu.id);
    await user.selectOptions(screen.getByLabelText("Rata"), "1");
    await user.click(screen.getByRole("checkbox", { name: /Mostra questa voce anche nel riepilogo delle spese comuni/ }));
    await user.type(screen.getByLabelText("Descrizione"), "Prima rata IMU comune");
    await user.type(screen.getByLabelText("Importo"), "350");
    await user.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const command = onSave.mock.calls[0][0];
    expect(command.type).toBe("addPropertyExpense");
    if (command.type === "addPropertyExpense") {
      expect(command.value.entry).toMatchObject({ taxTypeId: imu.id, taxInstallmentNumber: 1, category: "IMU", isCommonExpense: true });
    }
  });

  it("creates a configurable property tax type", async () => {
    const onSave = vi.fn<(command: FinanceCommand) => Promise<void>>().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderIt(<TaxTypeForm onClose={() => undefined} onSave={onSave} />);

    await user.type(screen.getByLabelText("Nome della tassa"), "Tassa sintetica");
    await user.selectOptions(screen.getByLabelText("Immobili applicabili"), "rental");
    const installmentCount = screen.getByRole("spinbutton", { name: /Numero di rate/ });
    await user.clear(installmentCount);
    await user.type(installmentCount, "4");
    await user.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      type: "addTaxType",
      value: { name: "Tassa sintetica", appliesTo: "rental", installments: 4, active: true },
    });
  });
});
