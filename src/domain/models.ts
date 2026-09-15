import { z } from "zod";
import { optionalIsinSchema } from "./isin";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO date");
const isoTimestamp = z.string().datetime();
const id = z.string().uuid();
const money = z.number().finite().nonnegative().max(1_000_000_000_000);
const signedMoney = z.number().finite().min(-1_000_000_000_000).max(1_000_000_000_000);
const text = z.string().trim().min(1).max(240);
const notes = z.string().trim().max(2_000).default("");

export const categorySchema = z.object({
  id,
  nameIt: text,
  nameEn: text,
  kind: z.enum(["income", "expense", "both"]),
  active: z.boolean(),
});

export const paymentMethodSchema = z.object({
  id,
  name: text,
  kind: z.enum(["cash", "card", "bank_transfer", "direct_debit", "digital_wallet", "other"]),
  active: z.boolean(),
});

export const investmentTypeSchema = z.object({
  id,
  nameIt: text,
  nameEn: text,
  code: z.string().trim().min(1).max(40).regex(/^[a-z0-9_-]+$/),
  active: z.boolean(),
});

export const taxTypeSchema = z.object({
  id,
  name: text,
  appliesTo: z.enum(["all", "residence", "rental"]),
  installments: z.number().int().min(1).max(24),
  active: z.boolean(),
});

export const accountSchema = z.object({
  id,
  name: text,
  kind: z.enum(["bank", "cash", "card", "digital_wallet", "other"]),
  defaultFundingAccountId: id.optional(),
  currency: z.string().length(3).default("EUR"),
  openingBalance: signedMoney,
  active: z.boolean(),
  openedAt: isoDate,
  closedAt: isoDate.optional(),
  notes,
});

export const transactionSchema = z.object({
  id,
  date: isoDate,
  dueDate: isoDate.optional(),
  description: text,
  categoryId: id,
  paymentMethodId: id,
  accountId: id.optional(),
  destinationAccountId: id.optional(),
  kind: z.enum(["income", "expense", "transfer"]),
  cashFlowDirection: z.enum(["inflow", "outflow", "neutral"]).optional(),
  amount: money.positive(),
  currency: z.string().length(3).default("EUR"),
  recurringId: id.optional(),
  propertyId: id.optional(),
  propertyEntryId: id.optional(),
  investmentId: id.optional(),
  investmentEntryId: id.optional(),
  vehicleId: id.optional(),
  vehicleEntryId: id.optional(),
  sharedExpenseId: id.optional(),
  planned: z.boolean().optional(),
  shared: z.boolean().optional(),
  sharedPaidBy: z.enum(["owner", "partner"]).optional(),
  sharedSettled: z.boolean().optional(),
  notes,
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});

export const propertySchema = z.object({
  id,
  name: text,
  kind: z.enum(["apartment", "house", "garage", "land", "commercial", "other"]),
  usage: z.enum(["residence", "rental", "other"]).optional(),
  address: z.string().trim().max(320).optional(),
  areaSqm: z.number().finite().positive().max(1_000_000).optional(),
  ownershipShare: z.number().finite().min(0).max(1),
  cadastralValue: money.optional(),
  expectedMonthlyRent: money.optional(),
  rentDueDay: z.number().int().min(1).max(31).optional(),
  purchaseDate: isoDate.optional(),
  purchasePrice: money,
  active: z.boolean(),
  closedAt: isoDate.optional(),
  notes,
});

export const propertyEntrySchema = z.object({
  id,
  propertyId: id,
  date: isoDate,
  dueDate: isoDate.optional(),
  kind: z.enum(["income", "expense", "valuation", "consumption"]),
  category: text,
  categoryId: id.optional(),
  description: text,
  amount: money,
  quantity: z.number().finite().nonnegative().max(1_000_000_000).optional(),
  unit: z.string().trim().max(24).optional(),
  detailKind: z.enum(["utility_electricity", "utility_gas", "utility_water", "utility_phone_internet"]).optional(),
  taxTypeId: id.optional(),
  taxInstallmentNumber: z.number().int().min(1).max(24).optional(),
  valuePerSqm: money.optional(),
  electricityKwhF1: z.number().finite().nonnegative().max(1_000_000_000).optional(),
  electricityKwhF2: z.number().finite().nonnegative().max(1_000_000_000).optional(),
  electricityKwhF3: z.number().finite().nonnegative().max(1_000_000_000).optional(),
  electricityKwhF23: z.number().finite().nonnegative().max(1_000_000_000).optional(),
  paymentMethodId: id.optional(),
  accountId: id.optional(),
  transactionId: id.optional(),
  isCommonExpense: z.boolean().optional(),
  notes,
}).superRefine((value, context) => {
  if ((value.kind === "income" || value.kind === "expense") && (!value.paymentMethodId || !value.categoryId)) {
    context.addIssue({ code: "custom", message: "Category and payment method are required for monetary property entries", path: ["paymentMethodId"] });
  }
  if (value.taxTypeId && (value.kind !== "expense" || value.detailKind)) {
    context.addIssue({ code: "custom", message: "A property tax must be an expense and cannot also be a utility", path: ["taxTypeId"] });
  }
  if (value.taxInstallmentNumber && !value.taxTypeId) {
    context.addIssue({ code: "custom", message: "A tax installment requires a tax type", path: ["taxInstallmentNumber"] });
  }
});

export const investmentSchema = z.object({
  id,
  name: text,
  isin: optionalIsinSchema,
  kind: z.enum(["fund", "stock", "bond", "pension", "savings", "etf", "other"]),
  typeId: id.optional(),
  parentInvestmentId: id.optional(),
  provider: z.string().trim().max(120).default(""),
  currency: z.string().length(3).default("EUR"),
  periodicAmount: money.positive().optional(),
  periodicFrequency: z.enum(["monthly", "yearly"]).optional(),
  periodicNextDueDate: isoDate.optional(),
  periodicCategoryId: id.optional(),
  periodicPaymentMethodId: id.optional(),
  periodicAccountId: id.optional(),
  active: z.boolean(),
  openedAt: isoDate,
  closedAt: isoDate.optional(),
  notes,
}).superRefine((value, context) => {
  if (value.periodicAmount && (!value.periodicFrequency || !value.periodicNextDueDate || !value.periodicCategoryId || !value.periodicPaymentMethodId)) {
    context.addIssue({ code: "custom", message: "A periodic investment needs frequency, due date, category and payment method", path: ["periodicAmount"] });
  }
});

export const investmentEntrySchema = z.object({
  id,
  investmentId: id,
  date: isoDate,
  kind: z.enum(["contribution", "withdrawal", "valuation", "contribution_correction", "withdrawal_correction"]),
  amount: money,
  description: text,
  categoryId: id.optional(),
  paymentMethodId: id.optional(),
  accountId: id.optional(),
  transactionId: id.optional(),
  notes,
}).superRefine((value, context) => {
  const correction = value.kind === "contribution_correction" || value.kind === "withdrawal_correction";
  if (correction && value.amount <= 0) {
    context.addIssue({ code: "custom", message: "An investment correction must be positive", path: ["amount"] });
  }
  if (correction && (value.categoryId || value.paymentMethodId || value.accountId || value.transactionId)) {
    context.addIssue({ code: "custom", message: "An investment correction cannot carry transaction fields", path: ["transactionId"] });
  }
  if (!correction && value.kind !== "valuation" && (!value.paymentMethodId || !value.categoryId)) {
    context.addIssue({ code: "custom", message: "Category and payment method are required for investment movements", path: ["paymentMethodId"] });
  }
});

export const recurringItemSchema = z.object({
  id,
  name: text,
  kind: z.enum(["subscription", "service", "installment", "investment", "rent", "other"]),
  direction: z.enum(["income", "expense"]).optional(),
  amount: money.positive(),
  frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
  categoryId: id,
  paymentMethodId: id,
  accountId: id.optional(),
  investmentId: id.optional(),
  propertyId: id.optional(),
  vehicleId: id.optional(),
  nextDueDate: isoDate,
  endDate: isoDate.optional(),
  remainingInstallments: z.number().int().nonnegative().max(10_000).optional(),
  active: z.boolean(),
  closedAt: isoDate.optional(),
  notes,
});

export const recurringRateChangeSchema = z.object({
  id,
  recurringId: id,
  amount: money.positive(),
  effectiveFrom: isoDate.refine((value) => value.endsWith("-01"), "A recurring rate change must start on the first day of a month"),
});

export const sharedExpenseSchema = z.object({
  id,
  date: isoDate,
  description: text,
  categoryId: id,
  paymentMethodId: id,
  accountId: id.optional(),
  amount: money.positive(),
  ownerShare: money,
  partnerShare: money,
  paidBy: z.enum(["owner", "partner"]),
  settled: z.boolean(),
  transactionId: id.optional(),
  notes,
}).superRefine((value, context) => {
  if (Math.abs(value.ownerShare + value.partnerShare - value.amount) > 0.01) {
    context.addIssue({ code: "custom", message: "The two shares must match the total amount", path: ["partnerShare"] });
  }
});

export const annualSummarySchema = z.object({
  year: z.number().int().min(1900).max(9999),
  income: money,
  expenses: money,
  netCashFlow: signedMoney,
  closingNetWorth: signedMoney,
  liquidBalance: signedMoney,
  propertyValue: money,
  investmentValue: money,
  pensionValue: money,
  monthlyRecurring: money,
  vehicleCosts: money,
});

export const vehicleSchema = z.object({
  id,
  name: text,
  manufacturer: z.string().trim().max(120).default(""),
  model: z.string().trim().max(120).default(""),
  fuelType: z.enum(["petrol", "diesel", "lpg", "methane", "hybrid", "electric", "other"]),
  purchaseDate: isoDate.optional(),
  disposalDate: isoDate.optional(),
  purchasePrice: money.optional(),
  salePrice: money.optional(),
  active: z.boolean(),
  notes,
});

export const vehicleEntrySchema = z.object({
  id,
  vehicleId: id,
  date: isoDate,
  kind: z.enum(["fuel", "installment", "tax", "insurance", "tires", "maintenance", "repair", "valuation", "other"]),
  description: text,
  amount: money,
  odometerKm: z.number().finite().nonnegative().max(100_000_000).optional(),
  distanceKm: z.number().finite().nonnegative().max(10_000_000).optional(),
  fuelLiters: z.number().finite().positive().max(1_000_000).optional(),
  fuelUnitPrice: money.optional(),
  fuelType: z.string().trim().max(80).optional(),
  vendor: z.string().trim().max(160).optional(),
  categoryId: id.optional(),
  paymentMethodId: id.optional(),
  accountId: id.optional(),
  transactionId: id.optional(),
  notes,
});

export const propertyAnnualSummarySchema = z.object({
  propertyId: id,
  year: z.number().int().min(1900).max(9999),
  income: money,
  expenses: money,
  closingValue: money,
  electricityKwh: z.number().finite().nonnegative().max(1_000_000_000),
  gasCubicMeters: z.number().finite().nonnegative().max(1_000_000_000),
  waterCubicMeters: z.number().finite().nonnegative().max(1_000_000_000),
  electricityCost: money.default(0),
  gasCost: money.default(0),
  waterCost: money.default(0),
  phoneInternetCost: money.default(0),
  condominiumCost: money.default(0),
});

export const investmentAnnualSummarySchema = z.object({
  investmentId: id,
  year: z.number().int().min(1900).max(9999),
  closingValue: money,
  contributions: money,
  withdrawals: money,
  closingValueObservedAt: isoDate.optional(),
  returnRate: z.number().finite().min(-1_000_000).max(1_000_000).optional(),
  returnMethod: z.enum(["linked_modified_dietz", "original_dietz_estimate"]).optional(),
  returnCoverage: z.enum(["complete", "partial", "estimated"]).optional(),
  returnPartialPeriod: z.boolean().optional(),
}).superRefine((value, context) => {
  const returnFields = [value.returnRate, value.returnMethod, value.returnCoverage, value.returnPartialPeriod];
  if (returnFields.some((field) => field !== undefined) && returnFields.some((field) => field === undefined)) {
    context.addIssue({
      code: "custom",
      message: "A persisted investment return requires rate, method, coverage and partial-period flag",
      path: ["returnRate"],
    });
    return;
  }
  if (value.returnMethod === "linked_modified_dietz" && value.returnCoverage === "estimated") {
    context.addIssue({ code: "custom", message: "A linked Modified Dietz return cannot have estimated coverage", path: ["returnCoverage"] });
  }
  if (value.returnMethod === "original_dietz_estimate" && value.returnCoverage !== "estimated") {
    context.addIssue({ code: "custom", message: "An Original Dietz estimate requires estimated coverage", path: ["returnCoverage"] });
  }
  if (value.returnCoverage === "complete" && value.returnPartialPeriod) {
    context.addIssue({ code: "custom", message: "Complete return coverage cannot describe a partial period", path: ["returnPartialPeriod"] });
  }
  if (value.returnCoverage === "partial" && value.returnPartialPeriod === false) {
    context.addIssue({ code: "custom", message: "Partial return coverage must describe a partial period", path: ["returnPartialPeriod"] });
  }
});

export const vehicleAnnualSummarySchema = z.object({
  vehicleId: id,
  year: z.number().int().min(1900).max(9999),
  totalCosts: money,
  fuelCosts: money,
  installments: money,
  taxes: money,
  insurance: money,
  tires: money,
  maintenance: money,
  repairs: money,
  fuelLiters: z.number().finite().nonnegative().max(1_000_000_000),
  distanceKm: z.number().finite().nonnegative().max(1_000_000_000),
  averageKmPerLiter: z.number().finite().nonnegative().max(1_000_000).optional(),
  closingOdometer: z.number().finite().nonnegative().max(100_000_000).optional(),
});

export const financeDataSchema = z.object({
  meta: z.object({
    schemaVersion: z.literal(12),
    activeYear: z.number().int().min(1900).max(9999),
    createdAt: isoTimestamp,
    updatedAt: isoTimestamp,
  }),
  categories: z.array(categorySchema).max(2_000),
  paymentMethods: z.array(paymentMethodSchema).max(500),
  investmentTypes: z.array(investmentTypeSchema).max(500),
  taxTypes: z.array(taxTypeSchema).max(500),
  accounts: z.array(accountSchema).max(500),
  transactions: z.array(transactionSchema).max(1_000_000),
  properties: z.array(propertySchema).max(10_000),
  propertyEntries: z.array(propertyEntrySchema).max(1_000_000),
  investments: z.array(investmentSchema).max(100_000),
  investmentEntries: z.array(investmentEntrySchema).max(1_000_000),
  recurringItems: z.array(recurringItemSchema).max(100_000),
  recurringRateChanges: z.array(recurringRateChangeSchema).max(500_000),
  sharedExpenses: z.array(sharedExpenseSchema).max(1_000_000),
  vehicles: z.array(vehicleSchema).max(10_000),
  vehicleEntries: z.array(vehicleEntrySchema).max(1_000_000),
  annualSummaries: z.array(annualSummarySchema).max(500),
  propertyAnnualSummaries: z.array(propertyAnnualSummarySchema).max(100_000),
  investmentAnnualSummaries: z.array(investmentAnnualSummarySchema).max(1_000_000),
  vehicleAnnualSummaries: z.array(vehicleAnnualSummarySchema).max(100_000),
}).superRefine((value, context) => {
  const recurringIds = new Set(value.recurringItems.map((item) => item.id));
  const effectiveMonths = new Set<string>();
  for (const [index, change] of value.recurringRateChanges.entries()) {
    if (!recurringIds.has(change.recurringId)) {
      context.addIssue({ code: "custom", message: "A recurring rate change must reference an existing recurring item", path: ["recurringRateChanges", index, "recurringId"] });
    }
    const key = `${change.recurringId}:${change.effectiveFrom}`;
    if (effectiveMonths.has(key)) {
      context.addIssue({ code: "custom", message: "A recurring item cannot have overlapping rate changes", path: ["recurringRateChanges", index, "effectiveFrom"] });
    }
    effectiveMonths.add(key);
  }
});

export type Category = z.infer<typeof categorySchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type InvestmentType = z.infer<typeof investmentTypeSchema>;
export type TaxType = z.infer<typeof taxTypeSchema>;
export type Account = z.infer<typeof accountSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type Property = z.infer<typeof propertySchema>;
export type PropertyEntry = z.infer<typeof propertyEntrySchema>;
export type Investment = z.infer<typeof investmentSchema>;
export type InvestmentEntry = z.infer<typeof investmentEntrySchema>;
export type RecurringItem = z.infer<typeof recurringItemSchema>;
export type RecurringRateChange = z.infer<typeof recurringRateChangeSchema>;
export type SharedExpense = z.infer<typeof sharedExpenseSchema>;
export type AnnualSummary = z.infer<typeof annualSummarySchema>;
export type Vehicle = z.infer<typeof vehicleSchema>;
export type VehicleEntry = z.infer<typeof vehicleEntrySchema>;
export type PropertyAnnualSummary = z.infer<typeof propertyAnnualSummarySchema>;
export type InvestmentAnnualSummary = z.infer<typeof investmentAnnualSummarySchema>;
export type VehicleAnnualSummary = z.infer<typeof vehicleAnnualSummarySchema>;
export type FinanceData = z.infer<typeof financeDataSchema>;
