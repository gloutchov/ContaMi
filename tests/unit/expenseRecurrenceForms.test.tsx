import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FinanceCommand } from "../../src/domain/commands";
import { applyFinanceCommand, createEmptyFinanceData } from "../../src/domain/finance";
import type { RecurringItem } from "../../src/domain/models";
import { RecurringForm } from "../../src/renderer/forms/RecurringForm";
import { SharedExpenseForm } from "../../src/renderer/forms/SharedExpenseForm";
import { TransactionForm } from "../../src/renderer/forms/TransactionForm";
import { I18nProvider } from "../../src/renderer/i18n/I18nContext";

afterEach(cleanup);
function base() {
  const data = createEmptyFinanceData(2026);
  data.accounts.push({ id: crypto.randomUUID(), name: "Synthetic bank", kind: "bank", currency: "EUR", openingBalance: 1000, active: true, openedAt: "2026-01-01", notes: "" });
  return data;
}
function recurring(data: ReturnType<typeof base>): RecurringItem {
  return { id: crypto.randomUUID(), name: "Synthetic service", kind: "service", direction: "expense", amount: 100.01,
    frequency: "monthly", nextDueDate: "2026-10-01", active: true, shared: true, sharedPaidBy: "partner", sharedOwnerRatio: 0.3,
    categoryId: data.categories[2].id, paymentMethodId: data.paymentMethods[0].id, accountId: data.accounts[0].id, notes: "" };
}
const show = (language: "it" | "en", node: ReactNode) => render(<I18nProvider language={language}>{node}</I18nProvider>);
const change = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("expense recurrence entry forms", () => {
  it.each(["it", "en"] as const)("creates a shared schedule in the new recurring form (%s)", async (language) => {
    const data = base();
    const save = vi.fn<(command: FinanceCommand) => Promise<void>>().mockResolvedValue(undefined);
    show(language, <RecurringForm data={data} onClose={vi.fn()} onSave={save} />);
    change(language === "it" ? "Nome" : "Name", "Synthetic service");
    change(language === "it" ? "Importo" : "Amount", "100.01");
    fireEvent.click(screen.getByRole("checkbox", { name: language === "it" ? /Condividi ogni scadenza/ : /Share every occurrence/ }));
    change(language === "it" ? "La tua quota (%)" : "Your share (%)", "30");
    change(language === "it" ? "Pagato da" : "Paid by", "partner");
    fireEvent.click(screen.getByRole("button", { name: language === "it" ? "Salva" : "Save", exact: true }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0]).toMatchObject({ type: "addRecurringItem", value: { shared: true, sharedOwnerRatio: 0.3, sharedPaidBy: "partner" } });
  });

  it("loads and edits sharing in an existing recurring form", async () => {
    const data = base();
    const save = vi.fn().mockResolvedValue(undefined);
    show("it", <RecurringForm data={data} value={recurring(data)} onClose={vi.fn()} onSave={save} />);
    expect(screen.getByRole("checkbox", { name: /Condividi ogni scadenza/ })).toBeChecked();
    expect(screen.getByLabelText("La tua quota (%)")).toHaveValue(30);
    fireEvent.click(screen.getByRole("checkbox", { name: /Condividi ogni scadenza/ }));
    fireEvent.click(screen.getByRole("button", { name: "Salva", exact: true }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0]).toMatchObject({ type: "updateRecurringItem", value: { shared: false } });
  });

  it("creates a new shared recurring Transaction with a due date distinct from the payment", async () => {
    const data = base();
    const save = vi.fn<(command: FinanceCommand) => Promise<void>>().mockResolvedValue(undefined);
    show("it", <TransactionForm data={data} onClose={vi.fn()} onSave={save} />);
    change("Data", "2026-10-05");
    change("Descrizione", "Synthetic service");
    change("Importo", "100.01");
    change("Categoria", data.categories[2].id);
    fireEvent.click(screen.getByRole("checkbox", { name: /Rendi ricorrente la spesa/ }));
    expect(screen.getByLabelText("Prima scadenza")).toHaveValue("2026-10-05");
    change("Prima scadenza", "2026-10-01");
    fireEvent.click(screen.getByRole("checkbox", { name: /Dividi automaticamente a metà/ }));
    fireEvent.click(screen.getByRole("button", { name: "Salva", exact: true }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    const command = save.mock.calls[0][0];
    expect(command).toMatchObject({ type: "addTransactionWithRecurring", value: { transaction: { date: "2026-10-05", shared: true }, recurring: { frequency: "monthly", nextDueDate: "2026-10-01" } } });
    expect(applyFinanceCommand(data, command).transactions).toHaveLength(3);
  });

  it("can make an existing Transaction recurring and can unlink an existing occurrence", async () => {
    let data = base();
    data = applyFinanceCommand(data, { type: "addRecurringItem", value: recurring(data) });
    const save = vi.fn().mockResolvedValue(undefined);
    const transaction = { ...data.transactions[0], recurringId: undefined, planned: false };
    const view = show("en", <TransactionForm data={data} value={transaction} onClose={vi.fn()} onSave={save} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Make this expense recurring/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0]).toMatchObject({ type: "updateTransactionWithRecurring" });
    view.unmount(); save.mockClear();
    show("en", <TransactionForm data={data} value={data.transactions[0]} onClose={vi.fn()} onSave={save} />);
    expect(screen.getByRole("checkbox", { name: /Make this expense recurring/ })).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: /Make this expense recurring/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0]).toMatchObject({ type: "updateTransaction", value: { recurringId: undefined } });
  });

  it("creates a recurring shared expense with cent-correct initial halves", async () => {
    const data = base();
    const save = vi.fn<(command: FinanceCommand) => Promise<void>>().mockResolvedValue(undefined);
    show("en", <SharedExpenseForm data={data} onClose={vi.fn()} onSave={save} />);
    change("Description", "Synthetic service");
    change("Date", "2026-10-05");
    change("Amount", "100.01");
    fireEvent.click(screen.getByRole("checkbox", { name: /Make this expense recurring/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    const command = save.mock.calls[0][0];
    expect(command).toMatchObject({ type: "addSharedExpenseWithRecurring", value: { expense: { ownerShare: 50.01, partnerShare: 50 }, recurring: { nextDueDate: "2026-10-05" } } });
    expect(applyFinanceCommand(data, command).sharedExpenses).toHaveLength(3);
  });

  it("edits recurrence on an existing shared expense without losing custom shares", async () => {
    let data = base();
    data = applyFinanceCommand(data, { type: "addRecurringItem", value: recurring(data) });
    const save = vi.fn().mockResolvedValue(undefined);
    show("it", <SharedExpenseForm data={data} value={data.sharedExpenses[0]} onClose={vi.fn()} onSave={save} />);
    expect(screen.getByRole("checkbox", { name: /Rendi ricorrente la spesa/ })).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: /Rendi ricorrente la spesa/ }));
    fireEvent.click(screen.getByRole("button", { name: "Salva", exact: true }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0]).toMatchObject({ type: "updateSharedExpenseWithRecurring", value: { expense: { ownerShare: 30, partnerShare: 70.01 }, recurringId: undefined, recurring: undefined } });
  });

  it("hides sharing for income and prevents an inverted schedule", () => {
    const data = base();
    show("en", <RecurringForm data={data} onClose={vi.fn()} onSave={vi.fn()} />);
    change("Name", "Synthetic service"); change("Amount", "10");
    change("Next due date", "2026-10-01"); change("End date", "2026-09-01");
    expect(screen.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
    change("Direction", "income");
    expect(screen.queryByRole("checkbox", { name: /Share every occurrence/ })).toBeNull();
  });
});
