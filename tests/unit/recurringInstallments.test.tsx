import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyFinanceCommand, createEmptyFinanceData } from "../../src/domain/finance";
import type { FinanceData, RecurringItem, Transaction } from "../../src/domain/models";
import { summarizeRecurringInstallments } from "../../src/domain/recurringInstallments";
import { I18nProvider } from "../../src/renderer/i18n/I18nContext";
import { RecurringView } from "../../src/renderer/views/RecurringView";

afterEach(cleanup);
function fixture() {
  const data = createEmptyFinanceData(2026);
  const plan: RecurringItem = { id: crypto.randomUUID(), name: "Synthetic vehicle loan", kind: "installment", direction: "expense",
    amount: 250, frequency: "monthly", nextDueDate: "2026-12-02", endDate: "2028-11-30",
    categoryId: data.categories[2].id, paymentMethodId: data.paymentMethods[0].id, active: true, notes: "" };
  data.recurringItems.push(plan);
  return { data, plan };
}
function transaction(data: FinanceData, plan: RecurringItem, dueDate: string, extra: Partial<Transaction> = {}): Transaction {
  const timestamp = new Date().toISOString();
  return { id: crypto.randomUUID(), date: dueDate, dueDate, recurringId: plan.id, description: "Synthetic installment",
    categoryId: data.categories[2].id, paymentMethodId: data.paymentMethods[0].id, kind: "expense", amount: 250, currency: "EUR",
    notes: "", createdAt: timestamp, updatedAt: timestamp, ...extra };
}

describe("remaining installment presentation", () => {
  it("counts a monthly plan through November 2028 instead of stopping at the workbook year", () => {
    const { data } = fixture();
    const before = structuredClone(data);
    expect(summarizeRecurringInstallments(data, data.recurringItems)).toMatchObject({ total: 24, unknownCount: 0 });
    expect(data).toEqual(before);
  });

  it.each([
    ["2026-12-01", 0], ["2026-12-02", 1], ["2028-11-01", 23], ["2028-11-02", 24],
  ])("includes only scheduled dates through %s", (endDate, expected) => {
    const { data, plan } = fixture(); plan.endDate = endDate;
    expect(summarizeRecurringInstallments(data, [plan]).total).toBe(expected);
  });

  it.each([
    ["weekly", "2026-12-25", "2027-01-08", 3],
    ["quarterly", "2026-01-31", "2027-04-30", 6],
    ["yearly", "2026-12-02", "2028-12-02", 3],
  ] as const)("counts %s dates across year boundaries", (frequency, nextDueDate, endDate, expected) => {
    const { data, plan } = fixture(); Object.assign(plan, { frequency, nextDueDate, endDate });
    expect(summarizeRecurringInstallments(data, [plan]).total).toBe(expected);
  });

  it("retains month-end anchors and handles leap years without monthly drift", () => {
    const { data, plan } = fixture();
    Object.assign(plan, { nextDueDate: "2027-02-28", endDate: "2027-04-30" });
    data.transactions.push(transaction(data, plan, "2027-01-31"));
    expect(summarizeRecurringInstallments(data, [plan]).total).toBe(3);
    plan.endDate = "2027-03-30";
    expect(summarizeRecurringInstallments(data, [plan]).total).toBe(1);
    Object.assign(plan, { frequency: "yearly", nextDueDate: "2025-02-28", endDate: "2028-02-29" });
    data.transactions = [transaction(data, plan, "2024-02-29")];
    expect(summarizeRecurringInstallments(data, [plan]).total).toBe(4);
    plan.endDate = "2028-02-28";
    expect(summarizeRecurringInstallments(data, [plan]).total).toBe(3);
  });

  it("excludes confirmed scheduled dates once and keeps planned dates in the count", () => {
    const { data, plan } = fixture();
    data.transactions.push(transaction(data, plan, "2026-12-02", { date: "2026-12-05" }), transaction(data, plan, "2026-12-02"),
      transaction(data, plan, "2027-01-02", { planned: true }), transaction(data, plan, "2027-01-01"));
    expect(summarizeRecurringInstallments(data, [plan]).total).toBe(23);
  });

  it("uses the explicit remaining limit without subtracting already-counted confirmations twice", () => {
    const { data, plan } = fixture();
    plan.remainingInstallments = 3;
    data.transactions.push(transaction(data, plan, "2027-01-02"));
    expect(summarizeRecurringInstallments(data, [plan]).total).toBe(3);
    plan.remainingInstallments = 100;
    expect(summarizeRecurringInstallments(data, [plan]).total).toBe(23);
    plan.endDate = undefined;
    expect(summarizeRecurringInstallments(data, [plan]).total).toBe(100);
  });

  it("excludes closed, zero and non-installment plans without guessing an unknown count", () => {
    const { data, plan } = fixture();
    const closed = { ...plan, id: crypto.randomUUID(), active: false };
    const zero = { ...plan, id: crypto.randomUUID(), remainingInstallments: 0 };
    const subscription = { ...plan, id: crypto.randomUUID(), kind: "subscription" as const };
    expect(summarizeRecurringInstallments(data, [closed, zero, subscription]).total).toBe(0);
    plan.endDate = undefined;
    expect(summarizeRecurringInstallments(data, [plan])).toMatchObject({ total: undefined, unknownCount: 1 });
  });

  it("counts long schedules arithmetically without generating Transactions", () => {
    const { data, plan } = fixture(); plan.endDate = "9999-12-31";
    expect(summarizeRecurringInstallments(data, [plan]).total).toBe(95_677);
    expect(data.transactions).toHaveLength(0);
  });

  it.each(["it", "en"] as const)("shows the derived count and preserves Vehicle lifecycle controls (%s)", (language) => {
    const { data, plan } = fixture();
    const vehicleId = crypto.randomUUID(); plan.vehicleId = vehicleId;
    data.vehicles.push({ id: vehicleId, name: "Synthetic vehicle", manufacturer: "", model: "", fuelType: "petrol", active: true, notes: "" });
    const it = language === "it";
    render(<I18nProvider language={language}><RecurringView data={data} onSave={vi.fn()} /></I18nProvider>);
    const card = screen.getByText(it ? "Rate residue" : "Installments left").closest("article")!;
    expect(card.querySelector("strong")).toHaveTextContent("24");
    expect(within(card).getByRole("tooltip")).toHaveTextContent(it ? "24 residue" : "24 left");
    expect(card).toHaveTextContent(it ? "Calcolate fino alla data di fine" : "Calculated through the end date");
    const row = screen.getByRole("heading", { name: plan.name }).closest(".recurrence-list") as HTMLElement;
    expect(within(row).queryByRole("button", { name: it ? "Chiudi" : "Close", exact: true })).toBeNull();
    expect(within(row).getByRole("button", { name: it ? "Elimina" : "Delete", exact: true })).toBeDisabled();
    expect(within(row).getByText(it ? "gestita da Automobile" : "managed by Vehicles")).toHaveAttribute("title",
      expect.stringMatching(it ? /Questo piano è gestito/ : /This plan is managed/));
    expect(() => applyFinanceCommand(data, { type: "setActive", entity: "recurringItem", id: plan.id, active: false })).toThrow("VEHICLE_INSTALLMENT_MANAGED");
  });

  it("shows an unknown residual as a gap instead of zero", () => {
    const { data, plan } = fixture(); plan.endDate = undefined;
    render(<I18nProvider language="en"><RecurringView data={data} onSave={vi.fn()} /></I18nProvider>);
    const card = screen.getByText("Installments left").closest("article")!;
    expect(card.querySelector("strong")).toHaveTextContent("—");
    expect(card).toHaveTextContent("Plans with unknown remaining count: 1");
    fireEvent.change(screen.getByRole("textbox", { name: "Search by name…" }), { target: { value: "missing plan" } });
    expect(card.querySelector("strong")).toHaveTextContent("0");
  });
});
