import { z } from "zod";
import { optionalIsinSchema } from "./isin";
import {
  accountSchema,
  categorySchema,
  investmentEntrySchema,
  investmentSchema,
  investmentTypeSchema,
  paymentMethodSchema,
  propertyEntrySchema,
  propertySchema,
  recurringItemSchema,
  recurringRateChangeSchema,
  sharedExpenseSchema,
  taxTypeSchema,
  transactionSchema,
  vehicleEntrySchema,
  vehicleSchema,
} from "./models";

const entityId = z.string().uuid();
const month = z.string().regex(/^\d{4}-\d{2}$/);
const commandMoney = z.number().finite().nonnegative().max(1_000_000_000_000);
const sharedSplitSchema = z.object({
  id: entityId,
  ownerShare: commandMoney,
  partnerShare: commandMoney,
  paidBy: z.enum(["owner", "partner"]),
  settled: z.boolean(),
});
const automaticSharedExpenseSchema = z.object({
  paidBy: z.enum(["owner", "partner"]),
  settled: z.boolean(),
});
const propertyEntryWithSharedExpenseSchema = z.object({
  entry: propertyEntrySchema,
  shared: automaticSharedExpenseSchema.optional(),
}).superRefine((value, context) => {
  if (value.shared && (value.entry.kind !== "expense" || value.entry.amount <= 0)) {
    context.addIssue({ code: "custom", message: "An automatically shared property entry must be a positive expense", path: ["entry", "amount"] });
  }
});
const vehicleEntryWithSharedExpenseSchema = z.object({
  entry: vehicleEntrySchema,
  shared: automaticSharedExpenseSchema.optional(),
}).superRefine((value, context) => {
  if (value.shared && (value.entry.kind === "valuation" || value.entry.amount <= 0)) {
    context.addIssue({ code: "custom", message: "An automatically shared vehicle entry must be a positive expense", path: ["entry", "amount"] });
  }
});
const propertyExpenseBundleSchema = z.object({
  entry: propertyEntrySchema,
  shared: sharedSplitSchema.optional(),
}).superRefine((value, context) => {
  if (value.entry.kind !== "expense" || value.entry.amount <= 0) {
    context.addIssue({ code: "custom", message: "A bundled property expense must be a positive expense", path: ["entry", "amount"] });
  }
  if (value.shared && Math.abs(value.shared.ownerShare + value.shared.partnerShare - value.entry.amount) > 0.01) {
    context.addIssue({ code: "custom", message: "The two shares must match the property expense", path: ["shared", "partnerShare"] });
  }
});
const propertyRentRecurringBundleSchema = z.object({
  entry: propertyEntrySchema,
  recurring: recurringItemSchema,
}).superRefine((value, context) => {
  if (value.entry.kind !== "income" || value.entry.amount <= 0) {
    context.addIssue({ code: "custom", message: "A rent recurrence needs a positive property income entry", path: ["entry", "amount"] });
  }
  if (value.recurring.kind !== "rent" || value.recurring.direction !== "income") {
    context.addIssue({ code: "custom", message: "The recurring item must be an income rent recurrence", path: ["recurring", "kind"] });
  }
  if (value.recurring.propertyId !== value.entry.propertyId) {
    context.addIssue({ code: "custom", message: "The recurring rent must reference the same property", path: ["recurring", "propertyId"] });
  }
  if (value.recurring.categoryId !== value.entry.categoryId
    || value.recurring.paymentMethodId !== value.entry.paymentMethodId
    || value.recurring.accountId !== value.entry.accountId) {
    context.addIssue({ code: "custom", message: "The recurring rent must use the same category and payment method", path: ["recurring", "categoryId"] });
  }
  if (Math.abs(value.recurring.amount - value.entry.amount) > 0.01) {
    context.addIssue({ code: "custom", message: "The recurring rent amount must match the entry amount", path: ["recurring", "amount"] });
  }
});
const investmentWithInitialContributionSchema = z.object({
  investment: investmentSchema,
  initialContribution: investmentEntrySchema,
}).superRefine((value, context) => {
  if (value.initialContribution.investmentId !== value.investment.id || value.initialContribution.kind !== "contribution" || value.initialContribution.amount <= 0) {
    context.addIssue({ code: "custom", message: "The initial contribution must be positive and linked to the new investment", path: ["initialContribution"] });
  }
});
const standardInvestmentEntrySchema = investmentEntrySchema.refine(
  (value) => value.kind !== "contribution_correction" && value.kind !== "withdrawal_correction",
  { message: "A regular investment entry cannot be a correction", path: ["kind"] },
);
const investmentCorrectionSchema = investmentEntrySchema.refine(
  (value) => value.kind === "contribution_correction" || value.kind === "withdrawal_correction",
  { message: "An investment correction needs a correction kind", path: ["kind"] },
);
const investmentCorrectionWithIsinSchema = z.object({
  correction: investmentCorrectionSchema,
  isin: optionalIsinSchema,
});
const vehicleWithInstallmentSchema = z.object({
  vehicle: vehicleSchema,
  installment: recurringItemSchema.optional(),
}).superRefine((value, context) => {
  if (!value.installment) return;
  if (value.installment.vehicleId !== value.vehicle.id
    || value.installment.kind !== "installment"
    || value.installment.direction !== "expense"
    || value.installment.propertyId
    || value.installment.investmentId) {
    context.addIssue({ code: "custom", message: "The installment must be an expense linked only to the bundled vehicle", path: ["installment"] });
  }
  if (value.installment.remainingInstallments === undefined && !value.installment.endDate) {
    context.addIssue({ code: "custom", message: "A vehicle installment needs remaining installments or an end date", path: ["installment", "remainingInstallments"] });
  }
  if (value.installment.endDate && value.installment.endDate < value.installment.nextDueDate) {
    context.addIssue({ code: "custom", message: "The installment end date cannot precede its next due date", path: ["installment", "endDate"] });
  }
});

export const financeCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("addTransaction"), value: transactionSchema }),
  z.object({ type: z.literal("updateTransaction"), value: transactionSchema }),
  z.object({ type: z.literal("addAccount"), value: accountSchema }),
  z.object({ type: z.literal("updateAccount"), value: accountSchema }),
  z.object({ type: z.literal("addProperty"), value: propertySchema }),
  z.object({ type: z.literal("updateProperty"), value: propertySchema }),
  z.object({ type: z.literal("addPropertyEntry"), value: propertyEntrySchema }),
  z.object({ type: z.literal("updatePropertyEntry"), value: propertyEntrySchema }),
  z.object({ type: z.literal("addPropertyEntryWithSharedExpense"), value: propertyEntryWithSharedExpenseSchema }),
  z.object({ type: z.literal("updatePropertyEntryWithSharedExpense"), value: propertyEntryWithSharedExpenseSchema }),
  z.object({ type: z.literal("addPropertyRentRecurring"), value: propertyRentRecurringBundleSchema }),
  z.object({ type: z.literal("addPropertyExpense"), value: propertyExpenseBundleSchema }),
  z.object({ type: z.literal("updatePropertyExpense"), value: propertyExpenseBundleSchema }),
  z.object({ type: z.literal("addInvestment"), value: investmentSchema }),
  z.object({ type: z.literal("addInvestmentWithInitialContribution"), value: investmentWithInitialContributionSchema }),
  z.object({ type: z.literal("updateInvestment"), value: investmentSchema }),
  z.object({ type: z.literal("addInvestmentEntry"), value: standardInvestmentEntrySchema }),
  z.object({ type: z.literal("updateInvestmentEntry"), value: standardInvestmentEntrySchema }),
  z.object({ type: z.literal("addInvestmentCorrection"), value: investmentCorrectionSchema }),
  z.object({ type: z.literal("updateInvestmentCorrection"), value: investmentCorrectionSchema }),
  z.object({ type: z.literal("addInvestmentCorrectionWithIsin"), value: investmentCorrectionWithIsinSchema }),
  z.object({ type: z.literal("updateInvestmentCorrectionWithIsin"), value: investmentCorrectionWithIsinSchema }),
  z.object({ type: z.literal("addRecurringItem"), value: recurringItemSchema }),
  z.object({ type: z.literal("updateRecurringItem"), value: recurringItemSchema }),
  z.object({ type: z.literal("addRecurringRateChange"), value: recurringRateChangeSchema }),
  z.object({ type: z.literal("updateRecurringRateChange"), value: recurringRateChangeSchema }),
  z.object({ type: z.literal("deleteRecurringRateChange"), id: entityId }),
  z.object({ type: z.literal("addSharedExpense"), value: sharedExpenseSchema }),
  z.object({ type: z.literal("updateSharedExpense"), value: sharedExpenseSchema }),
  z.object({ type: z.literal("addVehicle"), value: vehicleSchema }),
  z.object({ type: z.literal("updateVehicle"), value: vehicleSchema }),
  z.object({ type: z.literal("addVehicleWithInstallment"), value: vehicleWithInstallmentSchema }),
  z.object({ type: z.literal("updateVehicleWithInstallment"), value: vehicleWithInstallmentSchema }),
  z.object({ type: z.literal("addVehicleEntry"), value: vehicleEntrySchema }),
  z.object({ type: z.literal("updateVehicleEntry"), value: vehicleEntrySchema }),
  z.object({ type: z.literal("addVehicleEntryWithSharedExpense"), value: vehicleEntryWithSharedExpenseSchema }),
  z.object({ type: z.literal("updateVehicleEntryWithSharedExpense"), value: vehicleEntryWithSharedExpenseSchema }),
  z.object({ type: z.literal("addCategory"), value: categorySchema }),
  z.object({ type: z.literal("updateCategory"), value: categorySchema }),
  z.object({ type: z.literal("addPaymentMethod"), value: paymentMethodSchema }),
  z.object({ type: z.literal("updatePaymentMethod"), value: paymentMethodSchema }),
  z.object({ type: z.literal("addInvestmentType"), value: investmentTypeSchema }),
  z.object({ type: z.literal("updateInvestmentType"), value: investmentTypeSchema }),
  z.object({ type: z.literal("addTaxType"), value: taxTypeSchema }),
  z.object({ type: z.literal("updateTaxType"), value: taxTypeSchema }),
  z.object({
    type: z.literal("deleteEntity"),
    entity: z.enum(["transaction", "account", "property", "propertyEntry", "investment", "investmentEntry", "recurringItem", "sharedExpense", "vehicle", "vehicleEntry", "category", "paymentMethod", "investmentType", "taxType"]),
    id: entityId,
  }),
  z.object({
    type: z.literal("setActive"),
    entity: z.enum(["account", "property", "investment", "recurringItem", "vehicle", "taxType"]),
    id: entityId,
    active: z.boolean(),
    closedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
  z.object({ type: z.literal("setSharedExpenseSettled"), id: entityId, settled: z.boolean() }),
  z.object({ type: z.literal("settleSharedExpenseMonth"), month, settled: z.boolean() }),
]);

export type FinanceCommand = z.infer<typeof financeCommandSchema>;
