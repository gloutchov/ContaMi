import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InvestmentUnitChart } from "../../src/renderer/components/InvestmentUnitChart";
import { I18nProvider } from "../../src/renderer/i18n/I18nContext";

afterEach(cleanup);

describe("investment unit chart", () => {
  it("shows the reconstructed 75 + 25 unit history in Italian", () => {
    render(<I18nProvider language="it"><InvestmentUnitChart hasRecordedUnits points={[
      { date: "2026-01-01", quantity: 75, variation: 75 },
      { date: "2026-09-28", quantity: 100, variation: 25 },
    ]} /></I18nProvider>);
    expect(screen.getByRole("group", { name: "Quote detenute nel tempo" })).toBeInTheDocument();
    expect(screen.getByLabelText(/100.*25/s)).toBeInTheDocument();
  });

  it("explains an unknown balance in English when purchases recorded units", () => {
    render(<I18nProvider language="en"><InvestmentUnitChart hasRecordedUnits points={[]} /></I18nProvider>);
    expect(screen.getByText(/balance cannot be reconstructed from history/)).toBeInTheDocument();
  });
});
