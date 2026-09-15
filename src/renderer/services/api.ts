import { applyFinanceCommand, computeDashboard, createEmptyFinanceData } from "../../domain/finance";
import { reconcileInvestmentTransactions } from "../../domain/investmentTransactionSync";
import type { FinanceData } from "../../domain/models";
import type { AppSettings, ContaMiApi, FinanceSnapshot } from "../../shared/contracts";

function demoData(): FinanceData {
  const data = createEmptyFinanceData(new Date().getFullYear());
  const now = new Date().toISOString();
  const category = (name: string) => data.categories.find((item) => item.nameEn === name)!.id;
  const payment = data.paymentMethods[1].id;
  const accountId = crypto.randomUUID();
  const recurringId = crypto.randomUUID();
  data.accounts.push({ id: accountId, name: "Main account", kind: "bank", currency: "EUR", openingBalance: 32_800, active: true, openedAt: `${data.meta.activeYear}-01-01`, notes: "" });
  data.transactions.push(
    { id: crypto.randomUUID(), date: `${data.meta.activeYear}-01-04`, description: "Salary", categoryId: category("Salary"), paymentMethodId: payment, accountId, kind: "income", amount: 3_250, currency: "EUR", notes: "", createdAt: now, updatedAt: now },
    { id: crypto.randomUUID(), date: `${data.meta.activeYear}-01-07`, description: "Groceries", categoryId: category("Groceries"), paymentMethodId: payment, accountId, kind: "expense", amount: 138.40, currency: "EUR", notes: "", createdAt: now, updatedAt: now },
    { id: crypto.randomUUID(), date: `${data.meta.activeYear}-02-04`, description: "Salary", categoryId: category("Salary"), paymentMethodId: payment, accountId, kind: "income", amount: 3_250, currency: "EUR", notes: "", createdAt: now, updatedAt: now },
    { id: crypto.randomUUID(), date: `${data.meta.activeYear}-02-13`, description: "Train", categoryId: category("Transport"), paymentMethodId: payment, accountId, kind: "expense", amount: 84, currency: "EUR", notes: "", createdAt: now, updatedAt: now },
    { id: crypto.randomUUID(), date: `${data.meta.activeYear}-03-04`, description: "Salary", categoryId: category("Salary"), paymentMethodId: payment, accountId, kind: "income", amount: 3_250, currency: "EUR", notes: "", createdAt: now, updatedAt: now },
    { id: crypto.randomUUID(), date: `${data.meta.activeYear}-03-18`, description: "Electricity", categoryId: category("Home"), paymentMethodId: payment, accountId, kind: "expense", amount: 126.90, currency: "EUR", notes: "", createdAt: now, updatedAt: now },
    { id: crypto.randomUUID(), date: `${data.meta.activeYear}-06-01`, description: "Music", categoryId: category("Services & subscriptions"), paymentMethodId: payment, accountId, kind: "expense", amount: 10.99, currency: "EUR", recurringId, notes: "", createdAt: now, updatedAt: now },
    { id: crypto.randomUUID(), date: `${data.meta.activeYear}-12-01`, description: "Music", categoryId: category("Services & subscriptions"), paymentMethodId: payment, accountId, kind: "expense", amount: 10.99, currency: "EUR", recurringId, planned: true, notes: "", createdAt: now, updatedAt: now },
  );
  const propertyId = crypto.randomUUID();
  data.properties.push({ id: propertyId, name: "City apartment", kind: "apartment", usage: "residence", address: "Via Esempio 12, Milano", areaSqm: 92, ownershipShare: 1, cadastralValue: 124_000, purchasePrice: 245_000, active: true, notes: "" });
  data.propertyEntries.push(
    { id: crypto.randomUUID(), propertyId, date: `${data.meta.activeYear}-01-01`, kind: "valuation", category: "Market value", description: "Annual valuation", amount: 278_000, notes: "" },
    { id: crypto.randomUUID(), propertyId, date: `${data.meta.activeYear}-03-18`, kind: "consumption", category: "Electricity", description: "Electricity consumption", amount: 0, quantity: 412, unit: "kWh", notes: "" },
    { id: crypto.randomUUID(), propertyId, date: `${data.meta.activeYear}-03-18`, kind: "consumption", category: "Gas", description: "Gas consumption", amount: 0, quantity: 286, unit: "m³", notes: "" },
    { id: crypto.randomUUID(), propertyId, date: `${data.meta.activeYear}-03-18`, kind: "consumption", category: "Water", description: "Water consumption", amount: 0, quantity: 58, unit: "m³", notes: "" },
    { id: crypto.randomUUID(), propertyId, date: `${data.meta.activeYear}-03-18`, kind: "expense", category: "Electricity", categoryId: category("Home"), description: "Electricity bill", amount: 126.90, paymentMethodId: payment, notes: "" },
    { id: crypto.randomUUID(), propertyId, date: `${data.meta.activeYear}-03-19`, kind: "expense", category: "Gas", categoryId: category("Home"), description: "Gas bill", amount: 98.40, paymentMethodId: payment, notes: "" },
    { id: crypto.randomUUID(), propertyId, date: `${data.meta.activeYear}-03-20`, kind: "expense", category: "Water", categoryId: category("Home"), description: "Water bill", amount: 42.50, paymentMethodId: payment, notes: "" },
    { id: crypto.randomUUID(), propertyId, date: `${data.meta.activeYear}-02-15`, kind: "expense", category: "Condominium", categoryId: category("Home"), description: "Condominium installment", amount: 540, paymentMethodId: payment, isCommonExpense: true, notes: "" },
    { id: crypto.randomUUID(), propertyId, date: `${data.meta.activeYear}-04-01`, kind: "expense", category: "Internet", categoryId: category("Home"), description: "Home internet", amount: 180, paymentMethodId: payment, isCommonExpense: true, notes: "" },
    { id: crypto.randomUUID(), propertyId, date: `${data.meta.activeYear}-01-31`, kind: "expense", category: "Canone TV", categoryId: category("Home"), description: "Canone TV", amount: 90, paymentMethodId: payment, notes: "" },
  );
  data.propertyAnnualSummaries.push(
    { propertyId, year: data.meta.activeYear - 2, income: 0, expenses: 1_850, closingValue: 260_000, electricityKwh: 1_280, gasCubicMeters: 920, waterCubicMeters: 104, electricityCost: 520, gasCost: 610, waterCost: 145, phoneInternetCost: 210, condominiumCost: 540 },
    { propertyId, year: data.meta.activeYear - 1, income: 0, expenses: 1_920, closingValue: 270_000, electricityKwh: 1_210, gasCubicMeters: 860, waterCubicMeters: 98, electricityCost: 495, gasCost: 570, waterCost: 138, phoneInternetCost: 216, condominiumCost: 560 },
  );
  const rentalId = crypto.randomUUID();
  const rentRecurringId = crypto.randomUUID();
  data.properties.push({ id: rentalId, name: "Rental apartment", kind: "apartment", usage: "rental", address: "Via Demo 8, Milano", areaSqm: 68, ownershipShare: 0.5, cadastralValue: 88_000, expectedMonthlyRent: 750, rentDueDay: 5, purchasePrice: 180_000, active: true, notes: "" });
  const rentPayments = [
    { dueDate: `${data.meta.activeYear}-05-05`, date: `${data.meta.activeYear}-05-05`, planned: false },
    { dueDate: `${data.meta.activeYear}-06-05`, date: `${data.meta.activeYear}-07-04`, planned: false },
    { dueDate: `${data.meta.activeYear}-07-05`, date: `${data.meta.activeYear}-07-05`, planned: true },
    { dueDate: `${data.meta.activeYear}-08-05`, date: `${data.meta.activeYear}-08-05`, planned: true },
    { dueDate: `${data.meta.activeYear}-09-05`, date: `${data.meta.activeYear}-09-05`, planned: true },
    { dueDate: `${data.meta.activeYear}-10-05`, date: `${data.meta.activeYear}-10-05`, planned: true },
    { dueDate: `${data.meta.activeYear}-11-05`, date: `${data.meta.activeYear}-11-05`, planned: true },
    { dueDate: `${data.meta.activeYear}-12-05`, date: `${data.meta.activeYear}-12-05`, planned: true },
  ].map((item) => ({ ...item, transactionId: crypto.randomUUID(), entryId: crypto.randomUUID() }));
  data.propertyEntries.push(
    { id: crypto.randomUUID(), propertyId: rentalId, date: `${data.meta.activeYear}-01-01`, kind: "valuation", category: "Market value", description: "Annual valuation", amount: 210_000, notes: "" },
    ...rentPayments.map((item) => ({ id: item.entryId, propertyId: rentalId, date: item.date, dueDate: item.dueDate, kind: "income" as const, category: "Rent", categoryId: category("Rent income"), description: "Synthetic rent", amount: 750, paymentMethodId: payment, accountId, transactionId: item.transactionId, notes: "" })),
    { id: crypto.randomUUID(), propertyId: rentalId, date: `${data.meta.activeYear}-06-18`, kind: "expense", category: "Home", categoryId: category("Home"), description: "Routine maintenance", amount: 180, paymentMethodId: payment, notes: "" },
  );
  data.transactions.push(...rentPayments.map((item) => ({
    id: item.transactionId, date: item.date, dueDate: item.dueDate, description: "Synthetic rent",
    categoryId: category("Rent income"), paymentMethodId: payment, accountId, kind: "income" as const,
    amount: 750, currency: "EUR", recurringId: rentRecurringId, propertyId: rentalId,
    propertyEntryId: item.entryId, planned: item.planned, notes: "", createdAt: now, updatedAt: now,
  })));
  data.recurringItems.push({
    id: rentRecurringId, name: "Synthetic rent", kind: "rent", direction: "income", amount: 750,
    frequency: "monthly", categoryId: category("Rent income"), paymentMethodId: payment, accountId,
    propertyId: rentalId, nextDueDate: `${data.meta.activeYear}-07-05`, active: true, notes: "",
  });
  data.propertyAnnualSummaries.push(
    { propertyId: rentalId, year: data.meta.activeYear - 2, income: 8_400, expenses: 1_250, closingValue: 195_000, electricityKwh: 0, gasCubicMeters: 0, waterCubicMeters: 0, electricityCost: 0, gasCost: 0, waterCost: 0, phoneInternetCost: 0, condominiumCost: 0 },
    { propertyId: rentalId, year: data.meta.activeYear - 1, income: 8_700, expenses: 980, closingValue: 202_000, electricityKwh: 0, gasCubicMeters: 0, waterCubicMeters: 0, electricityCost: 0, gasCost: 0, waterCost: 0, phoneInternetCost: 0, condominiumCost: 0 },
  );
  const investmentId = crypto.randomUUID();
  data.investments.push({ id: investmentId, name: "Balanced portfolio", kind: "fund", typeId: data.investmentTypes.find((item) => item.code === "fund")?.id, provider: "", currency: "EUR", active: true, openedAt: `${data.meta.activeYear - 4}-01-01`, notes: "" });
  data.investmentEntries.push(
    { id: crypto.randomUUID(), investmentId, date: `${data.meta.activeYear}-01-31`, kind: "valuation", amount: 86_000, description: "January value", notes: "" },
    { id: crypto.randomUUID(), investmentId, date: `${data.meta.activeYear}-02-01`, kind: "contribution", amount: 5_000, description: "Contribution", categoryId: category("Investments"), paymentMethodId: payment, accountId, notes: "" },
    { id: crypto.randomUUID(), investmentId, date: `${data.meta.activeYear}-02-28`, kind: "valuation", amount: 91_600, description: "February value", notes: "" },
    { id: crypto.randomUUID(), investmentId, date: `${data.meta.activeYear}-03-01`, kind: "valuation", amount: 92_450, description: "Current value", notes: "" },
  );
  data.investmentAnnualSummaries.push(
    { investmentId, year: data.meta.activeYear - 2, closingValue: 79_000, contributions: 70_000, withdrawals: 0, closingValueObservedAt: `${data.meta.activeYear - 2}-12-31` },
    {
      investmentId, year: data.meta.activeYear - 1, closingValue: 85_000, contributions: 5_000, withdrawals: 0,
      closingValueObservedAt: `${data.meta.activeYear - 1}-12-31`, returnRate: 1_000 / 81_500,
      returnMethod: "original_dietz_estimate", returnCoverage: "estimated", returnPartialPeriod: false,
    },
  );
  const stockId = crypto.randomUUID();
  const savingsId = crypto.randomUUID();
  data.investments.push(
    { id: stockId, name: "Equity basket", kind: "stock", typeId: data.investmentTypes.find((item) => item.code === "stock")?.id, provider: "", currency: "EUR", active: true, openedAt: `${data.meta.activeYear - 2}-01-10`, notes: "" },
    { id: savingsId, name: "New savings plan", kind: "savings", typeId: data.investmentTypes.find((item) => item.code === "savings")?.id, provider: "", currency: "EUR", active: true, openedAt: `${data.meta.activeYear}-01-10`, notes: "" },
  );
  data.investmentAnnualSummaries.push(
    { investmentId: stockId, year: data.meta.activeYear - 2, closingValue: 22_000, contributions: 20_000, withdrawals: 0, closingValueObservedAt: `${data.meta.activeYear - 2}-12-31` },
    { investmentId: stockId, year: data.meta.activeYear - 1, closingValue: 24_500, contributions: 1_000, withdrawals: 0, closingValueObservedAt: `${data.meta.activeYear - 1}-12-31` },
  );
  data.investmentEntries.push(
    ...[25_000, 25_500, 26_200, 25_900, 26_600, 27_000].map((amount, index) => ({
      id: crypto.randomUUID(), investmentId: stockId,
      date: `${data.meta.activeYear}-${String(index + 1).padStart(2, "0")}-${[31, 28, 31, 30, 31, 30][index]}`,
      kind: "valuation" as const, amount, description: "Monthly equity value", notes: "",
    })),
    { id: crypto.randomUUID(), investmentId: savingsId, date: `${data.meta.activeYear}-01-10`, kind: "contribution", amount: 8_000, description: "Initial savings contribution", categoryId: category("Investments"), paymentMethodId: payment, accountId, notes: "" },
    ...[
      { date: "01-31", amount: 8_080 },
      { date: "02-28", amount: 8_150 },
      { date: "03-31", amount: 8_300 },
      { date: "05-31", amount: 8_400 },
      { date: "08-31", amount: 8_650 },
    ].map((item) => ({
      id: crypto.randomUUID(), investmentId: savingsId, date: `${data.meta.activeYear}-${item.date}`,
      kind: "valuation" as const, amount: item.amount, description: "Savings plan value", notes: "",
    })),
  );
  const pensionTypeId = data.investmentTypes.find((item) => item.code === "pension")?.id;
  const pensionId = crypto.randomUUID();
  const pensionComponents = ["Linea Equilibrio", "Linea Crescita", "Linea Valore"].map((name) => ({ id: crypto.randomUUID(), name }));
  data.investments.push(
    { id: pensionId, name: "Fondo Pensione Fideuram", kind: "pension", typeId: pensionTypeId, provider: "Fideuram", currency: "EUR", active: true, openedAt: `${data.meta.activeYear - 6}-01-01`, notes: "" },
    ...pensionComponents.map((item) => ({ id: item.id, name: item.name, kind: "pension" as const, typeId: pensionTypeId, parentInvestmentId: pensionId, provider: "Fideuram", currency: "EUR", active: true, openedAt: `${data.meta.activeYear - 6}-01-01`, notes: "" })),
  );
  pensionComponents.forEach((item, index) => {
    const observedValues = [
      [17_500, 17_680, 17_910, 18_120, 18_300, 18_450],
      [11_300, 11_540, 11_790, 12_060, 12_410, 12_780],
      [8_750, 8_910, 9_070, 9_240, 9_430, 9_620],
    ][index];
    data.investmentEntries.push(
      { id: crypto.randomUUID(), investmentId: item.id, date: `${data.meta.activeYear}-01-31`, kind: "contribution", amount: 600, description: "Pension contribution", categoryId: category("Investments"), paymentMethodId: payment, accountId, notes: "" },
      ...observedValues.map((amount, monthIndex) => ({
        id: crypto.randomUUID(), investmentId: item.id,
        date: `${data.meta.activeYear}-${String(monthIndex + 1).padStart(2, "0")}-${[31, 28, 31, 30, 31, 30][monthIndex]}`,
        kind: "valuation" as const, amount,
        description: monthIndex === observedValues.length - 1
          ? index === 0 ? "June value" : "Current value"
          : "Monthly pension value",
        notes: "",
      })),
      ...(index === 0 ? [{
        id: crypto.randomUUID(), investmentId: item.id, date: `${data.meta.activeYear}-08-31`,
        kind: "valuation" as const, amount: 18_450, description: "Current value", notes: "",
      }] : []),
    );
    data.investmentAnnualSummaries.push(
      {
        investmentId: item.id, year: data.meta.activeYear - 2, closingValue: [15_000, 9_000, 7_000][index],
        contributions: 4_800, withdrawals: 0, closingValueObservedAt: `${data.meta.activeYear - 2}-12-31`,
      },
      {
        investmentId: item.id, year: data.meta.activeYear - 1, closingValue: [16_800, 10_600, 8_100][index],
        contributions: 1_200, withdrawals: 0, closingValueObservedAt: `${data.meta.activeYear - 1}-12-31`,
        returnRate: ([16_800, 10_600, 8_100][index] - [15_000, 9_000, 7_000][index] - 1_200)
          / ([15_000, 9_000, 7_000][index] + 600),
        returnMethod: "original_dietz_estimate", returnCoverage: "estimated", returnPartialPeriod: false,
      },
    );
  });
  const previousVehicleId = crypto.randomUUID(); const currentVehicleId = crypto.randomUUID();
  data.vehicles.push(
    { id: previousVehicleId, name: "Previous demo car", manufacturer: "Example", model: "Classic", fuelType: "petrol", purchaseDate: `${data.meta.activeYear - 8}-01-01`, disposalDate: `${data.meta.activeYear - 2}-12-31`, purchasePrice: 18_000, salePrice: 6_000, active: false, notes: "" },
    { id: currentVehicleId, name: "Current demo car", manufacturer: "Example", model: "Hybrid", fuelType: "hybrid", purchaseDate: `${data.meta.activeYear - 1}-01-01`, purchasePrice: 27_000, active: true, notes: "" },
  );
  data.vehicleAnnualSummaries.push(
    { vehicleId: previousVehicleId, year: data.meta.activeYear - 2, totalCosts: 14_500, fuelCosts: 8_200, installments: 0, taxes: 1_050, insurance: 2_300, tires: 900, maintenance: 1_350, repairs: 700, fuelLiters: 0, distanceKm: 86_000, closingOdometer: 86_000 },
    { vehicleId: currentVehicleId, year: data.meta.activeYear - 1, totalCosts: 4_200, fuelCosts: 1_150, installments: 1_800, taxes: 220, insurance: 620, tires: 0, maintenance: 410, repairs: 0, fuelLiters: 620, distanceKm: 12_400, averageKmPerLiter: 20, closingOdometer: 12_400 },
  );
  data.vehicleEntries.push(
    { id: crypto.randomUUID(), vehicleId: currentVehicleId, date: `${data.meta.activeYear}-05-10`, kind: "fuel", description: "Demo fuel", amount: 64, distanceKm: 720, fuelLiters: 36, odometerKm: 18_200, categoryId: category("Transport"), paymentMethodId: payment, notes: "" },
    { id: crypto.randomUUID(), vehicleId: currentVehicleId, date: `${data.meta.activeYear}-06-20`, kind: "insurance", description: "Demo insurance", amount: 620, categoryId: category("Transport"), paymentMethodId: payment, notes: "" },
  );
  data.recurringItems.push({ id: recurringId, name: "Music", kind: "subscription", amount: 10.99, frequency: "monthly", categoryId: category("Services & subscriptions"), paymentMethodId: payment, nextDueDate: `${data.meta.activeYear}-08-01`, active: true, notes: "" });
  data.recurringItems.push({
    id: crypto.randomUUID(), name: "Demo installment", kind: "installment", direction: "expense",
    amount: 45, frequency: "monthly", categoryId: category("Services & subscriptions"),
    paymentMethodId: payment, nextDueDate: `${data.meta.activeYear}-08-15`,
    remainingInstallments: 2, active: true, notes: "",
  });
  data.sharedExpenses.push(
    { id: crypto.randomUUID(), date: `${data.meta.activeYear}-06-08`, description: "Shared train tickets", categoryId: category("Transport"), paymentMethodId: payment, amount: 120, ownerShare: 60, partnerShare: 60, paidBy: "partner", settled: true, notes: "" },
    { id: crypto.randomUUID(), date: `${data.meta.activeYear}-07-12`, description: "Weekend groceries", categoryId: category("Groceries"), paymentMethodId: payment, amount: 86, ownerShare: 43, partnerShare: 43, paidBy: "owner", settled: false, notes: "" },
  );
  data.annualSummaries.push(
    { year: data.meta.activeYear - 2, income: 37_800, expenses: 29_400, netCashFlow: 8_400, closingNetWorth: 367_000, liquidBalance: 28_000, propertyValue: 260_000, investmentValue: 79_000, pensionValue: 0, monthlyRecurring: 245, vehicleCosts: 0 },
    { year: data.meta.activeYear - 1, income: 39_600, expenses: 31_200, netCashFlow: 8_400, closingNetWorth: 386_500, liquidBalance: 31_500, propertyValue: 270_000, investmentValue: 85_000, pensionValue: 0, monthlyRecurring: 230, vehicleCosts: 0 },
  );
  return reconcileInvestmentTransactions(data).data;
}
function createDevelopmentApi(): ContaMiApi {
  const qaScenario = new URLSearchParams(window.location.search).get("qa");
  const missingWorkbookScenario = qaScenario === "missing-workbook";
  let staleLockScenario = qaScenario === "stale-lock";
  let settings: AppSettings = { language: "system", theme: "system", workbookFormat: "excel" };
  let data = missingWorkbookScenario ? createEmptyFinanceData(new Date().getFullYear()) : demoData();
  let configured = !missingWorkbookScenario;
  let warningCode = missingWorkbookScenario ? "WORKBOOK_MISSING" : undefined;
  const snapshot = (): FinanceSnapshot => ({ data: structuredClone(data), metrics: computeDashboard(data), workbookConfigured: configured, workbookDisplayName: configured ? "ContaMi-demo.xlsx" : undefined, lastSavedAt: configured ? data.meta.updatedAt : undefined, warningCode });
  return {
    getSettings: async () => settings,
    updateSettings: async (patch) => { settings = { ...settings, ...patch }; return settings; },
    getCapabilities: async () => ({ platform: "darwin", systemLanguage: navigator.language.startsWith("it") ? "it" : "en", systemTheme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light", numbersAvailable: false }),
    getSnapshot: async () => snapshot(),
    createWorkbook: async () => { configured = true; warningCode = undefined; return { canceled: false, path: "ContaMi-demo.xlsx" }; },
    openWorkbook: async () => { configured = true; warningCode = undefined; return { canceled: false, path: "ContaMi-demo.xlsx" }; },
    execute: async (command) => {
      if (staleLockScenario) throw new Error("WORKBOOK_LOCK_STALE");
      data = applyFinanceCommand(data, command);
      return snapshot();
    },
    rolloverYear: async () => ({ canceled: false, year: data.meta.activeYear + 1, newWorkbookPath: "ContaMi-next.xlsx" }),
    revealWorkbook: async () => true,
    recoverStaleWorkbookLock: async () => { staleLockScenario = false; return true; },
    generateImportTemplate: async (type) => ({ canceled: false, fileName: `ContaMi-template-${type.replaceAll("_", "-")}-v3.xlsx` }),
    previewImport: async () => ({
      canceled: false,
      previewId: crypto.randomUUID(),
      fileName: "ContaMi-template-transactions-v3.xlsx",
      templateType: "transactions",
      validRows: 3,
      rejectedRows: 1,
      conflictRows: 1,
      totalRows: 4,
      amountTotal: 345.67,
      actions: { create: 2, update: 0, skip: 1 },
      errors: [{ row: 9, column: "category", code: "MISSING_REFERENCE" }],
      errorsTruncated: false,
    }),
    confirmImport: async () => ({
      snapshotUpdated: true,
      templateType: "transactions",
      fileName: "ContaMi-template-transactions-v3.xlsx",
      validRows: 3,
      rejectedRows: 1,
      amountTotal: 345.67,
      actions: { create: 2, update: 0, skip: 1 },
    }),
    discardImport: async () => true,
    generatePropertyReport: async (request) => request.action === "save-pdf"
      ? ({ canceled: false, fileName: `ContaMi-report-demo-${request.scope}.pdf` })
      : ({ canceled: false }),
  };
}

let developmentApi: ContaMiApi | undefined;

export function getApi(): ContaMiApi {
  if (window.contami) return window.contami;
  if (import.meta.env.DEV) {
    developmentApi ??= createDevelopmentApi();
    return developmentApi;
  }
  throw new Error("ContaMì secure bridge is unavailable");
}
