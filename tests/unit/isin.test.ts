import { describe, expect, it } from "vitest";
import { accountBalance } from "../../src/domain/accounts";
import { applyFinanceCommand, applyFinanceCommands, createEmptyFinanceData } from "../../src/domain/finance";
import { hasValidIsinChecksum, normalizeOptionalIsin, validateOptionalIsin } from "../../src/domain/isin";
import { createRolloverFinanceData } from "../../src/domain/rollover";

const SYNTHETIC_ISIN = "ZZTESTABCDE7";

function syntheticInvestment(id: string, name: string, isin?: string) {
  return {
    id, name, isin, kind: "fund" as const, provider: "", currency: "EUR",
    active: true, openedAt: "2026-01-01", notes: "",
  };
}

describe("ISIN", () => {
  it("normalizes optional input and validates ISO 6166 format and check digit", () => {
    expect(normalizeOptionalIsin("  zztestabcde7 ")).toBe(SYNTHETIC_ISIN);
    expect(normalizeOptionalIsin("   ")).toBeUndefined();
    expect(validateOptionalIsin("")).toBeUndefined();
    expect(validateOptionalIsin("  zztestabcde7 ")).toBeUndefined();
    expect(hasValidIsinChecksum(SYNTHETIC_ISIN)).toBe(true);
    expect(validateOptionalIsin("Z1TESTABCDE7")).toBe("format");
    expect(validateOptionalIsin("ZZTESTABCDE8")).toBe("checksum");
  });

  it("saves a correction and normalized ISIN atomically without changing cash or valuation data", () => {
    const data = createEmptyFinanceData(2026);
    const accountId = crypto.randomUUID();
    const investmentId = crypto.randomUUID();
    data.accounts.push({
      id: accountId, name: "Synthetic account", kind: "bank", currency: "EUR",
      openingBalance: 1_000, active: true, openedAt: "2026-01-01", notes: "",
    });
    data.investments.push(syntheticInvestment(investmentId, "Synthetic fund"));
    const balanceBefore = accountBalance(data, accountId);

    const next = applyFinanceCommand(data, {
      type: "addInvestmentCorrectionWithIsin",
      value: {
        correction: {
          id: crypto.randomUUID(), investmentId, date: "2026-06-30",
          kind: "contribution_correction", amount: 25,
          description: "Synthetic correction", notes: "",
        },
        isin: "  zztestabcde7 ",
      },
    });

    expect(next.investments[0]?.isin).toBe(SYNTHETIC_ISIN);
    expect(next.investmentEntries).toHaveLength(1);
    expect(next.transactions).toEqual(data.transactions);
    expect(next.investmentAnnualSummaries).toEqual(data.investmentAnnualSummaries);
    expect(accountBalance(next, accountId)).toBe(balanceBefore);
    expect(data.investments[0]?.isin).toBeUndefined();

    expect(() => applyFinanceCommand(data, {
      type: "addInvestmentCorrectionWithIsin",
      value: {
        correction: {
          id: crypto.randomUUID(), investmentId, date: "2026-06-30",
          kind: "contribution_correction", amount: 25,
          description: "Rejected synthetic correction", notes: "",
        },
        isin: "ZZTESTABCDE8",
      },
    })).toThrow();
    expect(data.investmentEntries).toEqual([]);

    const updated = applyFinanceCommand(next, {
      type: "updateInvestmentCorrectionWithIsin",
      value: {
        correction: {
          ...next.investmentEntries[0],
          amount: 30,
          description: "Updated synthetic correction",
        },
        isin: "",
      },
    });
    expect(updated.investments[0]?.isin).toBeUndefined();
    expect(updated.investmentEntries[0]).toMatchObject({
      amount: 30,
      description: "Updated synthetic correction",
    });
    expect(updated.transactions).toEqual(next.transactions);
    expect(accountBalance(updated, accountId)).toBe(balanceBefore);
  });

  it("allows duplicate optional ISIN values and preserves them through rollover", () => {
    const data = createEmptyFinanceData(2026);
    const withDuplicates = applyFinanceCommands(data, [
      { type: "addInvestment", value: syntheticInvestment(crypto.randomUUID(), "Synthetic fund A", SYNTHETIC_ISIN) },
      { type: "addInvestment", value: syntheticInvestment(crypto.randomUUID(), "Synthetic fund B", SYNTHETIC_ISIN) },
    ]);

    const closed = applyFinanceCommand(withDuplicates, {
      type: "updateInvestment",
      value: { ...withDuplicates.investments[0], active: false, closedAt: "2026-08-31" },
    });
    const reopened = applyFinanceCommand(closed, {
      type: "updateInvestment",
      value: { ...closed.investments[0], active: true, closedAt: undefined },
    });

    expect(reopened.investments.map((item) => item.isin)).toEqual([SYNTHETIC_ISIN, SYNTHETIC_ISIN]);
    expect(createRolloverFinanceData(reopened, 2027).investments.map((item) => item.isin)).toEqual([
      SYNTHETIC_ISIN,
      SYNTHETIC_ISIN,
    ]);
  });
});
