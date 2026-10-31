import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FinanceCommand } from "../../src/domain/commands";
import { applyFinanceCommand, computeDashboard, createEmptyFinanceData } from "../../src/domain/finance";
import { confirmedSharedExpenses, summarizeSharedExpenses } from "../../src/domain/sharedExpenses";
import { I18nProvider } from "../../src/renderer/i18n/I18nContext";
import { RecurringView } from "../../src/renderer/views/RecurringView";
import { SharedExpensesView } from "../../src/renderer/views/SharedExpensesView";

afterEach(cleanup);

function fixture() {
  let data = createEmptyFinanceData(2026);
  data.accounts.push({ id: crypto.randomUUID(), name: "Synthetic bank", kind: "bank", currency: "EUR", openingBalance: 1000, active: true, openedAt: "2026-01-01", notes: "" });
  for (const entry of [
    { description: "Recorded owner expense", date: "2026-12-05", amount: 100, ownerShare: 60, partnerShare: 40, paidBy: "owner" as const, settled: false },
    { description: "Recorded partner expense", date: "2026-12-06", amount: 50, ownerShare: 20, partnerShare: 30, paidBy: "partner" as const, settled: false },
    { description: "Recorded settled expense", date: "2026-12-07", amount: 40, ownerShare: 20, partnerShare: 20, paidBy: "owner" as const, settled: true },
    { description: "November settled expense", date: "2026-11-10", amount: 25, ownerShare: 10, partnerShare: 15, paidBy: "owner" as const, settled: true },
  ]) data = applyFinanceCommand(data, { type: "addSharedExpense", value: {
    ...entry, id: crypto.randomUUID(), categoryId: data.categories[2].id, paymentMethodId: data.paymentMethods[0].id, accountId: data.accounts[0].id, notes: "",
  } });
  data = applyFinanceCommand(data, { type: "addRecurringItem", value: {
    id: crypto.randomUUID(), name: "Synthetic monthly music", kind: "subscription", direction: "expense", amount: 15.99,
    frequency: "monthly", nextDueDate: "2026-12-15", categoryId: data.categories[2].id,
    paymentMethodId: data.paymentMethods[0].id, accountId: data.accounts[0].id,
    shared: true, sharedPaidBy: "owner", sharedOwnerRatio: 0.5, active: true, notes: "",
  } });
  return data;
}
function expenseRow(name: string) { return within(document.querySelector(".data-table") as HTMLElement).getByText(name).closest("tr")!; }
function card(label: string) { return screen.getByText(label).closest("article")!; }
function change(role: "combobox" | "textbox", name: string, value: string) {
  fireEvent.change(screen.getByRole(role, { name, exact: true }), { target: { value } });
}

describe("shared expense totals", () => {
  it("separates forecasts from real debts, totals and settled counts", () => {
    const data = fixture();
    const summary = summarizeSharedExpenses(data);
    expect(summary).toMatchObject({ total: 230.99, confirmedTotal: 215, plannedTotal: 15.99, balance: 20, settledCount: 2, settledTotal: 65 });
    expect(summary.pending).toHaveLength(2);
    expect(summary.plannedIds.size).toBe(1);
    expect(computeDashboard(data).sharedBalance).toBe(summary.balance);
    expect(summarizeSharedExpenses(data, [])).toMatchObject({ total: 0, confirmedTotal: 0, plannedTotal: 0, balance: 0, settledCount: 0, settledTotal: 0 });
  });

  it("classifies planned sharing from either UUID link and never counts it as settled", () => {
    const data = fixture();
    const planned = data.transactions.find((item) => item.planned)!;
    const share = data.sharedExpenses.find((item) => item.transactionId === planned.id)!;
    share.transactionId = undefined;
    share.settled = true;
    expect(confirmedSharedExpenses(data)).toHaveLength(4);
    expect(summarizeSharedExpenses(data)).toMatchObject({ plannedTotal: 15.99, balance: 20, settledCount: 2, settledTotal: 65 });
  });

  it("rounds monetary sums to cents and preserves the direction of partner debts", () => {
    const data = fixture();
    const rows = data.sharedExpenses.filter((item) => !summarizeSharedExpenses(data).plannedIds.has(item.id)).slice(0, 3);
    rows.forEach((item) => { item.amount = 0.3; item.ownerShare = 0.1; item.partnerShare = 0.2; item.paidBy = "partner"; item.settled = false; });
    expect(summarizeSharedExpenses(data, rows)).toMatchObject({ total: 0.9, confirmedTotal: 0.9, balance: -0.3, settledCount: 0, settledTotal: 0 });
  });
});

describe("shared expense view", () => {
  it.each(["it", "en"] as const)("shows a December recurring expense immediately and reconciles filtered KPIs (%s)", (language) => {
    const data = fixture();
    const it = language === "it";
    const { container } = render(<I18nProvider language={language}><SharedExpensesView data={data} onSave={vi.fn()} /></I18nProvider>);
    expect(screen.getByRole("combobox", { name: it ? "Mese" : "Month" })).toHaveValue("");
    const plannedRow = expenseRow("Synthetic monthly music");
    expect(plannedRow).toHaveTextContent(it ? "Prevista" : "Planned");
    expect(within(plannedRow).getByRole("button", { name: it ? "Conferma" : "Confirm", exact: true })).toBeEnabled();
    expect(within(plannedRow).queryByRole("button", { name: it ? "Segna saldata" : "Mark settled" })).toBeNull();
    expect(card(it ? "Saldo condiviso" : "Shared balance").querySelector("strong")).toHaveTextContent(/20[,.]00/);
    expect(card(it ? "Totale filtrato" : "Filtered total").querySelector("strong")).toHaveTextContent(/230[,.]99/);
    expect(card(it ? "Spese saldate" : "Settled expenses").querySelector("strong")).toHaveTextContent(/65[,.]00/);
    expect(card(it ? "Spese saldate" : "Settled expenses").querySelector("small")).toHaveTextContent(it ? "Numero di spese: 2" : "Number of expenses: 2");
    change("combobox", it ? "Mese" : "Month", "2026-12");
    expect(card(it ? "Totale filtrato" : "Filtered total").querySelector("strong")).toHaveTextContent(/205[,.]99/);
    expect(card(it ? "Spese saldate" : "Settled expenses").querySelector("strong")).toHaveTextContent(/40[,.]00/);
    change("textbox", it ? "Cerca per descrizione…" : "Search by description…", "monthly music");
    expect(card(it ? "Totale filtrato" : "Filtered total").querySelector("strong")).toHaveTextContent(/15[,.]99/);
    expect(card(it ? "Saldo condiviso" : "Shared balance").querySelector("strong")).toHaveTextContent(/0[,.]00/);
    expect(card(it ? "Spese saldate" : "Settled expenses").querySelector("strong")).toHaveTextContent(/0[,.]00/);
    expect(screen.getByRole("button", { name: it ? "Stampa non saldate" : "Print pending", exact: true })).toBeDisabled();
    expect(container.querySelector(".print-report")).not.toHaveTextContent("Synthetic monthly music");
    fireEvent.click(screen.getByRole("button", { name: it ? "Azzera filtri" : "Reset filters" }));
    expect(container.querySelectorAll(".data-table tbody tr")).toHaveLength(5);
    expect(screen.getByRole("combobox", { name: it ? "Mese" : "Month" })).toHaveValue("");
  });

  it("confirms a planned shared occurrence in place, then settles its debt separately", async () => {
    const original = fixture();
    let current = original;
    function Harness() {
      const [data, setData] = useState(original);
      return <I18nProvider language="en"><SharedExpensesView data={data} onSave={async (command: FinanceCommand) => {
        current = applyFinanceCommand(data, command); setData(current);
      }} /></I18nProvider>;
    }
    render(<Harness />);
    const row = expenseRow("Synthetic monthly music");
    fireEvent.click(within(row).getByRole("button", { name: "Confirm", exact: true }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Actual payment date"), { target: { value: "2026-12-15" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save", exact: true }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(current.transactions).toHaveLength(original.transactions.length);
    expect(current.sharedExpenses).toHaveLength(original.sharedExpenses.length);
    expect(summarizeSharedExpenses(current)).toMatchObject({ total: 230.99, plannedTotal: 0, balance: 27.99, settledCount: 2, settledTotal: 65 });
    fireEvent.click(within(expenseRow("Synthetic monthly music")).getByRole("button", { name: "Mark settled", exact: true }));
    await waitFor(() => expect(card("Settled expenses").querySelector("strong")).toHaveTextContent(/80[,.]99/));
    expect(card("Settled expenses").querySelector("small")).toHaveTextContent("Number of expenses: 3");
    expect(summarizeSharedExpenses(current).balance).toBe(20);
  });
});

describe("recurring filters", () => {
  it.each(["it", "en"] as const)("resets search, type and month together and restores KPI totals (%s)", (language) => {
    const data = fixture();
    data.recurringItems.push({ ...data.recurringItems[0], id: crypto.randomUUID(), name: "Synthetic service", kind: "service", amount: 20, shared: false, nextDueDate: "2026-03-01" });
    const it = language === "it";
    render(<I18nProvider language={language}><RecurringView data={data} onSave={vi.fn()} /></I18nProvider>);
    const reset = screen.getByRole("button", { name: it ? "Azzera filtri" : "Reset filters" });
    expect(reset).toBeDisabled();
    change("textbox", it ? "Cerca per nome…" : "Search by name…", "monthly music");
    change("combobox", it ? "Tipo" : "Type", "subscription");
    change("combobox", it ? "Mese" : "Month", "2026-12");
    expect(screen.queryByRole("heading", { name: "Synthetic service" })).toBeNull();
    expect(card(it ? "Uscite mensili filtrate" : "Filtered monthly expenses").querySelector("strong")).toHaveTextContent(/15[,.]99/);
    fireEvent.click(reset);
    expect(screen.getByRole("textbox", { name: it ? "Cerca per nome…" : "Search by name…" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: it ? "Tipo" : "Type" })).toHaveValue("all");
    expect(screen.getByRole("combobox", { name: it ? "Mese" : "Month" })).toHaveValue("all");
    expect(screen.getByRole("heading", { name: "Synthetic service" })).toBeVisible();
    expect(card(it ? "Uscite mensili filtrate" : "Filtered monthly expenses").querySelector("strong")).toHaveTextContent(/35[,.]99/);
    expect(reset).toBeDisabled();
  });
});
