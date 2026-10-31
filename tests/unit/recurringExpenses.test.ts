import { describe, expect, it } from "vitest";
import { applyFinanceCommand, computeDashboard, createEmptyFinanceData } from "../../src/domain/finance";
import { migrateFinanceData } from "../../src/domain/migrations";
import { financeDataSchema, type FinanceData, type RecurringItem, type SharedExpense, type Transaction } from "../../src/domain/models";
import { confirmedSharedExpenses } from "../../src/domain/recurringExpenses";
import { createRolloverFinanceData } from "../../src/domain/rollover";

function base() {
  const data = createEmptyFinanceData(2026);
  data.accounts.push({ id: crypto.randomUUID(), name: "Synthetic bank", kind: "bank", currency: "EUR", openingBalance: 1000, active: true, openedAt: "2026-01-01", notes: "" });
  return data;
}
function plan(data: FinanceData, extra: Partial<RecurringItem> = {}): RecurringItem {
  return { id: crypto.randomUUID(), name: "Synthetic service", kind: "service", direction: "expense", amount: 100.01,
    categoryId: data.categories[2].id, paymentMethodId: data.paymentMethods[0].id, accountId: data.accounts[0].id,
    frequency: "monthly", nextDueDate: "2026-10-01", active: true, notes: "", ...extra };
}
function expense(data: FinanceData): Transaction {
  const timestamp = new Date().toISOString();
  return { id: crypto.randomUUID(), description: "Synthetic service", date: "2026-10-05", amount: 100.01,
    categoryId: data.categories[2].id, paymentMethodId: data.paymentMethods[0].id, accountId: data.accounts[0].id,
    kind: "expense", currency: "EUR", shared: true, sharedPaidBy: "partner", sharedSettled: false,
    notes: "", createdAt: timestamp, updatedAt: timestamp };
}
function sharedExpense(data: FinanceData): SharedExpense {
  const transaction = expense(data);
  return { id: crypto.randomUUID(), date: transaction.date, description: transaction.description, amount: transaction.amount,
    categoryId: transaction.categoryId, paymentMethodId: transaction.paymentMethodId, accountId: transaction.accountId,
    ownerShare: 30, partnerShare: 70.01, paidBy: "partner", settled: false, notes: "" };
}
const schedule = () => ({ id: crypto.randomUUID(), frequency: "monthly" as const, nextDueDate: "2026-10-01" });

describe("recurring shared expenses", () => {
  it.each([false, true])("creates a plan atomically from a transaction, existing=%s", (existing) => {
    let data = base();
    let transaction = expense(data);
    if (existing) {
      data = applyFinanceCommand(data, { type: "addTransaction", value: transaction });
      transaction = data.transactions[0];
    }
    data = applyFinanceCommand(data, { type: existing ? "updateTransactionWithRecurring" : "addTransactionWithRecurring",
      value: { transaction, recurring: schedule() } });
    expect(data.transactions).toHaveLength(3);
    expect(data.sharedExpenses).toHaveLength(3);
    expect(data.transactions.filter((item) => !item.planned)).toHaveLength(1);
    expect(data.transactions.find((item) => item.id === transaction.id)).toMatchObject({ date: "2026-10-05", dueDate: "2026-10-01" });
    expect(data.recurringItems[0]).toMatchObject({ shared: true, sharedPaidBy: "partner", sharedOwnerRatio: 50.01 / 100.01, nextDueDate: "2026-11-01" });
    expect(computeDashboard(data).sharedBalance).toBe(-50.01);
  });

  it.each([false, true])("keeps custom shares and the first record when a shared expense becomes recurring, existing=%s", (existing) => {
    let data = base();
    let entry = sharedExpense(data);
    if (existing) {
      data = applyFinanceCommand(data, { type: "addSharedExpense", value: entry });
      entry = data.sharedExpenses[0];
    }
    data = applyFinanceCommand(data, { type: existing ? "updateSharedExpenseWithRecurring" : "addSharedExpenseWithRecurring",
      value: { expense: entry, recurring: schedule() } });
    expect(data.transactions).toHaveLength(3);
    expect(data.sharedExpenses).toHaveLength(3);
    expect(data.sharedExpenses.find((item) => item.id === entry.id)).toMatchObject({ ownerShare: 30, partnerShare: 70.01 });
    expect(data.sharedExpenses.every((item) => item.ownerShare === 30 && item.partnerShare === 70.01 && item.paidBy === "partner")).toBe(true);
    expect(confirmedSharedExpenses(data)).toHaveLength(1);
  });

  it("updates only planned sharing and retains IDs and confirmed settlements", () => {
    let data = base();
    const recurring = plan(data, { shared: true, sharedPaidBy: "partner", sharedOwnerRatio: 0.3 });
    data = applyFinanceCommand(data, { type: "addRecurringItem", value: recurring });
    expect(computeDashboard(data).sharedBalance).toBe(0);
    const first = data.transactions[0];
    data = applyFinanceCommand(data, { type: "updateTransaction", value: { ...first, planned: false, date: "2026-10-05", sharedSettled: true } });
    const confirmed = structuredClone(data.transactions.find((item) => item.id === first.id));
    const confirmedShare = structuredClone(data.sharedExpenses.find((item) => item.transactionId === first.id));
    const ids = data.sharedExpenses.map((item) => item.id);
    data = applyFinanceCommand(data, { type: "updateRecurringItem", value: { ...data.recurringItems[0], sharedOwnerRatio: 0.6, sharedPaidBy: "owner" } });
    expect(data.transactions.find((item) => item.id === first.id)).toEqual(confirmed);
    expect(data.sharedExpenses.find((item) => item.transactionId === first.id)).toEqual(confirmedShare);
    expect(data.sharedExpenses.map((item) => item.id)).toEqual(ids);
    expect(data.sharedExpenses.filter((item) => item.transactionId !== first.id).every((item) => item.ownerShare === 60.01 && item.partnerShare === 40 && item.paidBy === "owner")).toBe(true);
    const before = structuredClone(data);
    data = applyFinanceCommand(data, { type: "updateRecurringItem", value: data.recurringItems[0] });
    expect(data.transactions).toEqual(before.transactions);
    expect(data.sharedExpenses).toEqual(before.sharedExpenses);
  });

  it("scales the configured ratio with future rates and removes only planned shares when disabled", () => {
    let data = base();
    data = applyFinanceCommand(data, { type: "addRecurringItem", value: plan(data, { shared: true, sharedOwnerRatio: 0.4 }) });
    const firstId = data.transactions[0].id;
    data = applyFinanceCommand(data, { type: "updateTransaction", value: { ...data.transactions[0], planned: false } });
    const firstShare = structuredClone(data.sharedExpenses.find((item) => item.transactionId === firstId));
    data = applyFinanceCommand(data, { type: "addRecurringRateChange", value: { id: crypto.randomUUID(), recurringId: data.recurringItems[0].id, amount: 110, effectiveFrom: "2026-11-01" } });
    expect(data.sharedExpenses.filter((item) => item.transactionId !== firstId).every((item) => item.ownerShare === 44 && item.partnerShare === 66)).toBe(true);
    data = applyFinanceCommand(data, { type: "updateRecurringItem", value: { ...data.recurringItems[0], shared: false } });
    expect(data.sharedExpenses).toEqual([firstShare]);
    expect(data.transactions.filter((item) => item.planned).every((item) => !item.shared && !item.sharedExpenseId)).toBe(true);
  });

  it("excludes planned debts from settlement and preserves next-year generated shares on rollover", () => {
    let data = base();
    data = applyFinanceCommand(data, { type: "addRecurringItem", value: plan(data, { shared: true }) });
    data = applyFinanceCommand(data, { type: "settleSharedExpenseMonth", month: "2026-11", settled: true });
    expect(data.sharedExpenses.every((item) => !item.settled)).toBe(true);
    data = applyFinanceCommand(data, { type: "updateTransaction", value: { ...data.transactions[0], planned: false } });
    const next = financeDataSchema.parse(createRolloverFinanceData(data));
    expect(next.transactions).toHaveLength(12);
    expect(next.sharedExpenses).toHaveLength(13);
    expect(confirmedSharedExpenses(next)).toHaveLength(1);
    expect(confirmedSharedExpenses(next)[0].transactionId).toBeUndefined();
    expect(computeDashboard(next).sharedBalance).toBe(50);
    expect(next.sharedExpenses.filter((item) => item.transactionId).every((item) => next.transactions.some((transaction) => transaction.id === item.transactionId))).toBe(true);
  });

  it("replaces an existing planned placeholder when explicitly linking a recorded expense", () => {
    let data = base();
    data = applyFinanceCommand(data, { type: "addRecurringItem", value: plan(data, { shared: true }) });
    const placeholder = data.transactions[0];
    const transaction = { ...expense(data), recurringId: data.recurringItems[0].id, dueDate: placeholder.dueDate };
    data = applyFinanceCommand(data, { type: "addTransaction", value: transaction });
    expect(data.transactions).toHaveLength(3);
    expect(data.transactions.some((item) => item.id === placeholder.id)).toBe(false);
    expect(data.recurringItems[0].nextDueDate).toBe("2026-11-01");
    expect(data.sharedExpenses).toHaveLength(3);
    const before = structuredClone(data);
    expect(() => applyFinanceCommand(data, { type: "addTransaction", value: { ...transaction, id: crypto.randomUUID() } })).toThrow("DUPLICATE_RECURRING_OCCURRENCE");
    expect(data).toEqual(before);
  });

  it("counts an explicitly linked payment against remaining installments exactly once", () => {
    let data = base();
    data = applyFinanceCommand(data, { type: "addRecurringItem", value: plan(data, { kind: "installment", remainingInstallments: 2, shared: true }) });
    data = applyFinanceCommand(data, { type: "addSharedExpenseWithRecurring", value: {
      expense: sharedExpense(data), recurringId: data.recurringItems[0].id, dueDate: "2026-10-01",
    } });
    expect(data.recurringItems[0]).toMatchObject({ remainingInstallments: 1, nextDueDate: "2026-11-01" });
    expect(data.transactions).toHaveLength(2);
    const entry = confirmedSharedExpenses(data)[0];
    data = applyFinanceCommand(data, { type: "updateSharedExpenseWithRecurring", value: {
      expense: { ...entry, description: "Synthetic corrected description" }, recurringId: data.recurringItems[0].id, dueDate: "2026-10-01",
    } });
    expect(data.recurringItems[0].remainingInstallments).toBe(1);
    expect(data.transactions).toHaveLength(2);
  });

  it("moves the due period of a confirmed installment without counting a second payment", () => {
    let data = base();
    data = applyFinanceCommand(data, { type: "addRecurringItem", value: plan(data, { kind: "installment", remainingInstallments: 2, shared: true }) });
    const transactionId = data.transactions[0].id;
    data = applyFinanceCommand(data, { type: "updateTransaction", value: { ...data.transactions[0], planned: false } });
    expect(data.recurringItems[0].remainingInstallments).toBe(1);
    data = applyFinanceCommand(data, { type: "updateTransaction", value: { ...data.transactions.find((item) => item.id === transactionId)!, dueDate: "2026-11-01" } });
    expect(data.recurringItems[0]).toMatchObject({ remainingInstallments: 1, active: true });
    expect(data.transactions).toHaveLength(2);
    expect(data.transactions.filter((item) => !item.planned)).toHaveLength(1);
    expect(data.transactions.find((item) => item.planned)?.dueDate).toBe("2026-10-01");
    expect(confirmedSharedExpenses(data)).toHaveLength(1);
  });

  it("detaches one shared expense without closing the plan or relinking it by description", () => {
    let data = base();
    data = applyFinanceCommand(data, { type: "addSharedExpenseWithRecurring", value: { expense: sharedExpense(data), recurring: schedule() } });
    const entry = confirmedSharedExpenses(data)[0];
    data = applyFinanceCommand(data, { type: "updateSharedExpenseWithRecurring", value: { expense: entry } });
    expect(data.transactions.find((item) => item.id === entry.transactionId)?.recurringId).toBeUndefined();
    data = applyFinanceCommand(data, { type: "updateRecurringItem", value: { ...data.recurringItems[0], nextDueDate: "2026-10-01" } });
    expect(data.transactions.find((item) => item.id === entry.transactionId)?.recurringId).toBeUndefined();
    expect(data.recurringItems[0].active).toBe(true);
  });

  it("preserves legacy schedules and amounts in an idempotent v15 migration", () => {
    const data = base();
    data.recurringItems.push(plan(data));
    const legacy = { ...data, meta: { ...data.meta, schemaVersion: 15 } };
    const migrated = migrateFinanceData(legacy);
    expect(migrated.meta.schemaVersion).toBe(16);
    expect(migrated.recurringItems).toEqual(data.recurringItems);
    expect(migrateFinanceData(migrated)).toEqual(migrated);
    expect(legacy.meta.schemaVersion).toBe(15);
  });

  it("rejects invalid sharing and schedules atomically", () => {
    const data = base();
    const before = structuredClone(data);
    for (const extra of [{ sharedOwnerRatio: 1.1 }, { sharedOwnerRatio: -0.1 }, { shared: true, direction: "income" as const }, { shared: true, kind: "investment" as const }]) {
      expect(() => applyFinanceCommand(data, { type: "addRecurringItem", value: plan(data, extra) })).toThrow();
    }
    expect(() => applyFinanceCommand(data, { type: "addTransactionWithRecurring", value: { transaction: expense(data), recurring: { ...schedule(), endDate: "2026-09-01" } } })).toThrow();
    expect(() => applyFinanceCommand(data, { type: "addTransactionWithRecurring", value: { transaction: { ...expense(data), kind: "income" }, recurring: schedule() } })).toThrow();
    expect(() => applyFinanceCommand(data, { type: "addSharedExpenseWithRecurring", value: { expense: sharedExpense(data), recurring: { ...schedule(), nextDueDate: "2025-01-01" } } })).toThrow("ACCOUNT_REQUIRED");
    expect(data).toEqual(before);
  });

  it.each(["weekly", "monthly", "quarterly", "yearly"] as const)("creates bounded %s occurrences with cent reconciliation", (frequency) => {
    let data = base();
    data = applyFinanceCommand(data, { type: "addRecurringItem", value: plan(data, { frequency, shared: true, endDate: "2026-12-01" }) });
    expect(data.transactions.length).toBeGreaterThan(0);
    expect(data.transactions.length).toBeLessThan(10);
    expect(data.transactions.every((item) => item.date <= "2026-12-01")).toBe(true);
    for (const item of data.sharedExpenses) expect(Math.round((item.ownerShare + item.partnerShare) * 100)).toBe(10001);
  });
});
