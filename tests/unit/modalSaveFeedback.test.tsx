import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal } from "../../src/renderer/components/Modal";
import { OperationFeedbackContext } from "../../src/renderer/components/OperationFeedbackContext";
import { I18nProvider } from "../../src/renderer/i18n/I18nContext";
import type { TranslationKey } from "../../src/renderer/i18n/translations";

afterEach(cleanup);

describe("modal save feedback", () => {
  it.each(["it", "en"] as const)("shows a sanitized save error inside the open form in %s", (language) => {
    const close = vi.fn();
    function Harness() {
      const [error, setError] = useState<TranslationKey>();
      return <OperationFeedbackContext.Provider value={{ busy: false, error }}><Modal title="Synthetic form" onClose={close} onSubmit={(event) => { event.preventDefault(); setError("workbookChangedExternally"); }}><label>Amount<input defaultValue="120" /></label></Modal></OperationFeedbackContext.Provider>;
    }
    render(<I18nProvider language={language}><Harness /></I18nProvider>);
    fireEvent.click(screen.getByRole("button", { name: language === "it" ? "Salva" : "Save", exact: true }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toContainElement(screen.getByRole("alert"));
    expect(screen.getByRole("alert")).toHaveTextContent(language === "it" ? "Riapri" : "Reopen");
    expect(screen.getByLabelText("Amount")).toHaveValue("120");
    expect(close).not.toHaveBeenCalled();
  });

  it("disables duplicate submissions while a save is pending", () => {
    const submit = vi.fn();
    render(<I18nProvider language="en"><OperationFeedbackContext.Provider value={{ busy: true }}><Modal title="Synthetic form" onClose={vi.fn()} onSubmit={submit}>Synthetic fields</Modal></OperationFeedbackContext.Provider></I18nProvider>);
    expect(screen.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
    expect(submit).not.toHaveBeenCalled();
  });
});
