import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Investment } from "../../src/domain/models";
import { PensionReportDialog } from "../../src/renderer/components/PensionReportDialog";
import { I18nProvider } from "../../src/renderer/i18n/I18nContext";

const pension: Investment = {
  id: "22222222-2222-4222-8222-222222222222", name: "Synthetic pension", kind: "pension",
  provider: "", currency: "EUR", active: true, openedAt: "2026-01-01", notes: "",
};
afterEach(cleanup);

describe("PensionReportDialog", () => {
  it("prints a selected pension in Italian and retains the dialog after cancellation", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onGenerate = vi.fn().mockResolvedValue({ canceled: true });
    render(<I18nProvider language="it"><PensionReportDialog pension={pension} onClose={onClose} onGenerate={onGenerate} /></I18nProvider>);
    expect(screen.getByRole("dialog", { name: /Report pensione integrativa · Synthetic pension/ })).toBeInTheDocument();
    const scope = screen.getByRole("combobox", { name: "Periodo del report" });
    expect(scope).toHaveFocus();
    await user.selectOptions(scope, "lifetime");
    await user.click(screen.getByRole("button", { name: "Stampa" }));
    expect(onGenerate).toHaveBeenCalledWith({ pensionId: pension.id, scope: "lifetime", language: "it", action: "print" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("saves an all-pension PDF in English", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onGenerate = vi.fn().mockResolvedValue({ canceled: false, fileName: "synthetic.pdf" });
    render(<I18nProvider language="en"><PensionReportDialog onClose={onClose} onGenerate={onGenerate} /></I18nProvider>);
    await user.click(screen.getByRole("button", { name: "Save PDF" }));
    expect(onGenerate).toHaveBeenCalledWith({ pensionId: undefined, scope: "current-year", language: "en", action: "save-pdf" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
