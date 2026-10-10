import { describe, expect, it } from "vitest";
import type { FinanceCommand } from "../../src/domain/commands";
import { applyFinanceCommand, createEmptyFinanceData } from "../../src/domain/finance";
import type { FinanceData, RecurringItem, Vehicle } from "../../src/domain/models";

function setup(): { data: FinanceData; vehicle: Vehicle; installment: RecurringItem } {
  const data = createEmptyFinanceData(2026);
  const accountId = crypto.randomUUID();
  data.accounts.push({
    id: accountId,
    name: "Synthetic account",
    kind: "bank",
    currency: "EUR",
    openingBalance: 10_000,
    active: true,
    openedAt: "2026-01-01",
    notes: "",
  });
  const vehicle: Vehicle = {
    id: crypto.randomUUID(),
    name: "Synthetic vehicle",
    manufacturer: "Example",
    model: "One",
    fuelType: "hybrid",
    purchaseDate: "2026-01-10",
    purchasePrice: 24_000,
    active: true,
    notes: "",
  };
  const installment: RecurringItem = {
    id: crypto.randomUUID(),
    name: vehicle.name,
    kind: "installment",
    direction: "expense",
    amount: 320,
    frequency: "monthly",
    categoryId: data.categories.find((item) => item.nameEn === "Transport")!.id,
    paymentMethodId: data.paymentMethods.find((item) => item.kind === "bank_transfer")!.id,
    accountId,
    vehicleId: vehicle.id,
    nextDueDate: "2026-09-15",
    remainingInstallments: 3,
    active: true,
    notes: "",
  };
  return { data, vehicle, installment };
}

function addBundle(data: FinanceData, vehicle: Vehicle, installment: RecurringItem): FinanceData {
  return applyFinanceCommand(data, {
    type: "addVehicleWithInstallment",
    value: { vehicle, installment },
  });
}

describe("vehicle installment plans", () => {
  it("updates vehicle metadata without regenerating legacy duplicate financing plans", () => {
    const initial = setup();
    const data = addBundle(initial.data, initial.vehicle, initial.installment);
    data.recurringItems.push({ ...data.recurringItems[0], id: crypto.randomUUID() });
    const next = applyFinanceCommand(data, {
      type: "updateVehicle", value: { ...data.vehicles[0], purchasePrice: 25_000 },
    });
    expect(next.vehicles[0].purchasePrice).toBe(25_000);
    expect(next.recurringItems).toEqual(data.recurringItems);
    expect(next.transactions).toEqual(data.transactions);
    expect(next.vehicleEntries).toEqual(data.vehicleEntries);
    expect(data.vehicles[0].purchasePrice).toBe(24_000);
  });

  it("creates one vehicle, one recurrence and one installment entry per planned transaction atomically", () => {
    const { data, vehicle, installment } = setup();
    const next = addBundle(data, vehicle, installment);

    expect(next.vehicles).toEqual([vehicle]);
    expect(next.recurringItems).toHaveLength(1);
    expect(next.recurringItems[0]).toMatchObject({
      id: installment.id,
      vehicleId: vehicle.id,
      name: vehicle.name,
      kind: "installment",
      direction: "expense",
      remainingInstallments: 3,
    });
    expect(next.transactions).toHaveLength(3);
    expect(next.vehicleEntries).toHaveLength(3);
    next.transactions.forEach((transaction) => {
      const entry = next.vehicleEntries.find((item) => item.id === transaction.vehicleEntryId);
      expect(transaction).toMatchObject({
        recurringId: installment.id,
        vehicleId: vehicle.id,
        planned: true,
        amount: 320,
      });
      expect(entry).toMatchObject({
        transactionId: transaction.id,
        vehicleId: vehicle.id,
        kind: "installment",
        amount: 320,
      });
    });
  });

  it("updates the same plan repeatedly and keeps the M19 base rate and confirmed history stable", () => {
    const initial = setup();
    let data = addBundle(initial.data, initial.vehicle, initial.installment);
    const confirmed = data.transactions.find((item) => item.dueDate === "2026-09-15")!;
    data = applyFinanceCommand(data, {
      type: "updateTransaction",
      value: { ...confirmed, planned: false },
    });
    data = applyFinanceCommand(data, {
      type: "addRecurringRateChange",
      value: { id: crypto.randomUUID(), recurringId: initial.installment.id, amount: 350, effectiveFrom: "2026-10-01" },
    });
    const renamedVehicle = { ...initial.vehicle, name: "Renamed synthetic vehicle", model: "Two" };
    const updatedInstallment = {
      ...data.recurringItems[0]!,
      name: "Ignored custom name",
      frequency: "monthly" as const,
    };
    const command: FinanceCommand = {
      type: "updateVehicleWithInstallment",
      value: { vehicle: renamedVehicle, installment: updatedInstallment },
    };
    data = applyFinanceCommand(data, command);
    data = applyFinanceCommand(data, command);

    expect(data.recurringItems).toHaveLength(1);
    expect(data.recurringItems[0]).toMatchObject({ id: initial.installment.id, name: renamedVehicle.name, amount: 320 });
    expect(data.transactions.filter((item) => item.recurringId === initial.installment.id && !item.planned)).toHaveLength(1);
    expect(data.transactions.find((item) => item.id === confirmed.id)).toMatchObject({ amount: 320, planned: false });
    expect(data.transactions.filter((item) => item.recurringId === initial.installment.id && item.planned)).toHaveLength(2);
    expect(data.transactions.filter((item) => item.recurringId === initial.installment.id && item.planned).every((item) => item.amount === 350)).toBe(true);
    expect(() => applyFinanceCommand(data, {
      type: "updateVehicleWithInstallment",
      value: { vehicle: renamedVehicle, installment: { ...updatedInstallment, amount: 400 } },
    })).toThrow("RECURRING_BASE_AMOUNT_LOCKED");
  });

  it("rejects a second active plan for the same vehicle", () => {
    const initial = setup();
    const data = addBundle(initial.data, initial.vehicle, initial.installment);
    expect(() => applyFinanceCommand(data, {
      type: "addRecurringItem",
      value: { ...initial.installment, id: crypto.randomUUID() },
    })).toThrow("VEHICLE_INSTALLMENT_PLAN_EXISTS");
  });

  it("closes and reopens the vehicle and plan together without losing confirmed installments", () => {
    const initial = setup();
    let data = addBundle(initial.data, initial.vehicle, initial.installment);
    const confirmed = data.transactions[0]!;
    const confirmedEntryId = confirmed.vehicleEntryId!;
    data = applyFinanceCommand(data, { type: "updateTransaction", value: { ...confirmed, planned: false } });

    data = applyFinanceCommand(data, {
      type: "setActive",
      entity: "vehicle",
      id: initial.vehicle.id,
      active: false,
      closedAt: "2026-09-20",
    });
    expect(data.vehicles[0]).toMatchObject({ active: false, disposalDate: "2026-09-20" });
    expect(data.recurringItems[0]).toMatchObject({ active: false, closedAt: "2026-09-20", remainingInstallments: 2 });
    expect(data.transactions.filter((item) => item.planned)).toHaveLength(0);
    expect(data.transactions.find((item) => item.id === confirmed.id)).toBeDefined();
    expect(data.vehicleEntries.find((item) => item.id === confirmedEntryId)).toMatchObject({ kind: "installment" });

    data = applyFinanceCommand(data, {
      type: "setActive",
      entity: "vehicle",
      id: initial.vehicle.id,
      active: true,
    });
    expect(data.vehicles[0]).toMatchObject({ active: true, disposalDate: undefined });
    expect(data.recurringItems[0]).toMatchObject({ active: true, closedAt: undefined, remainingInstallments: 2 });
    expect(data.transactions.filter((item) => item.planned)).toHaveLength(2);
    expect(data.vehicleEntries.filter((item) => item.kind === "installment")).toHaveLength(3);
  });

  it("preserves confirmed history on financing cancellation and blocks destructive vehicle deletion", () => {
    const initial = setup();
    let data = addBundle(initial.data, initial.vehicle, initial.installment);
    const confirmed = data.transactions[0]!;
    data = applyFinanceCommand(data, { type: "updateTransaction", value: { ...confirmed, planned: false } });

    data = applyFinanceCommand(data, {
      type: "updateVehicleWithInstallment",
      value: { vehicle: data.vehicles[0]!, installment: undefined },
    });
    expect(data.recurringItems[0]).toMatchObject({ active: false, remainingInstallments: 0 });
    expect(data.transactions.filter((item) => item.planned)).toHaveLength(0);
    expect(data.transactions.find((item) => item.id === confirmed.id)).toBeDefined();
    expect(() => applyFinanceCommand(data, {
      type: "deleteEntity",
      entity: "vehicle",
      id: initial.vehicle.id,
    })).toThrow("ENTITY_IN_USE");
  });

  it("deletes an unused vehicle plan without leaving planned transactions or entries", () => {
    const initial = setup();
    let data = addBundle(initial.data, initial.vehicle, initial.installment);
    data = applyFinanceCommand(data, {
      type: "deleteEntity",
      entity: "vehicle",
      id: initial.vehicle.id,
    });
    expect(data.vehicles).toHaveLength(0);
    expect(data.recurringItems).toHaveLength(0);
    expect(data.transactions).toHaveLength(0);
    expect(data.vehicleEntries).toHaveLength(0);
  });

  it("keeps recurring-generated vehicle entries classified as installments when edited", () => {
    const initial = setup();
    let data = addBundle(initial.data, initial.vehicle, initial.installment);
    const entry = data.vehicleEntries[0]!;
    data = applyFinanceCommand(data, {
      type: "updateVehicleEntry",
      value: { ...entry, kind: "other" },
    });
    expect(data.vehicleEntries.find((item) => item.id === entry.id)).toMatchObject({ kind: "installment" });
  });
});
