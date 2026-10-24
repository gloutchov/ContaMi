import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Investment } from "../../src/domain/models";
import { InvestmentReportDialog } from "../../src/renderer/components/InvestmentReportDialog";
import { I18nProvider } from "../../src/renderer/i18n/I18nContext";

const investment: Investment = {
  id: "22222222-2222-4222-8222-222222222222", name: "Synthetic fund", kind: "fund",
  provider: "", currency: "EUR", active: true, openedAt: "2026-01-01", notes: "",
};
afterEach(cleanup);

describe("InvestmentReportDialog", () => {
  it("prints a single-position full-history report in Italian", async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn().mockResolvedValue({ canceled: true });
    render(<I18nProvider language="it"><InvestmentReportDialog investment={investment} onClose={() => undefined} onGenerate={onGenerate} /></I18nProvider>);
    expect(screen.getByRole("dialog", { name: /Report investimenti · Synthetic fund/ })).toBeInTheDocument();
    const scope = screen.getByRole("combobox", { name: "Periodo del report" });
    expect(scope).toHaveFocus();
    await user.selectOptions(scope, "lifetime");
    await user.click(screen.getByRole("button", { name: "Stampa" }));
    expect(onGenerate).toHaveBeenCalledWith({ investmentId: investment.id, scope: "lifetime", language: "it", action: "print" });
  });

  it("saves an all-investments PDF in English and closes only on success", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onGenerate = vi.fn().mockResolvedValue({ canceled: false, fileName: "synthetic.pdf" });
    render(<I18nProvider language="en"><InvestmentReportDialog onClose={onClose} onGenerate={onGenerate} /></I18nProvider>);
    await user.click(screen.getByRole("button", { name: "Save PDF" }));
    expect(onGenerate).toHaveBeenCalledWith({ investmentId: undefined, scope: "current-year", language: "en", action: "save-pdf" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps the dialog available after a generation error", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onGenerate = vi.fn().mockRejectedValue(new Error("INVESTMENT_REPORT_FAILED"));
    render(<I18nProvider language="en"><InvestmentReportDialog investment={investment} onClose={onClose} onGenerate={onGenerate} /></I18nProvider>);
    await user.click(screen.getByRole("button", { name: "Save PDF" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save PDF" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Print" })).toBeEnabled();
  });
});
