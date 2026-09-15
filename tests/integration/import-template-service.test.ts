import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyFinanceData } from "../../src/domain/finance";
import type { ImportTemplateGenerator } from "../../src/infrastructure/spreadsheet/ExcelImportTemplateGenerator";
import { ImportTemplateService } from "../../src/main/services/ImportTemplateService";

const electronMocks = vi.hoisted(() => ({ showSaveDialog: vi.fn() }));
vi.mock("electron", () => ({ dialog: { showSaveDialog: electronMocks.showSaveDialog } }));

describe("ImportTemplateService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses a native save dialog and returns only the generated file name", async () => {
    const data = createEmptyFinanceData(2026);
    const generator: ImportTemplateGenerator = { save: vi.fn().mockResolvedValue(undefined) };
    const finance = { snapshot: vi.fn().mockResolvedValue({
      data, metrics: {}, workbookConfigured: true, workbookDisplayName: "private.xlsx",
    }) };
    electronMocks.showSaveDialog.mockResolvedValue({ canceled: false, filePath: path.resolve("synthetic-template") });
    const service = new ImportTemplateService({} as never, finance as never, generator);

    const result = await service.generate("transactions", "it");

    expect(result).toEqual({ canceled: false, fileName: "synthetic-template.xlsx" });
    expect(result).not.toHaveProperty("path");
    expect(electronMocks.showSaveDialog).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      title: "Salva template Excel per importazione",
      defaultPath: "ContaMi-template-transactions-v3.xlsx",
      properties: expect.arrayContaining(["showOverwriteConfirmation"]),
    }));
    expect(generator.save).toHaveBeenCalledWith(
      path.resolve("synthetic-template.xlsx"),
      "transactions",
      { data, workbookConfigured: true },
    );
  });

  it("does not read catalogs or write a file when the dialog is canceled", async () => {
    const generator: ImportTemplateGenerator = { save: vi.fn() };
    const finance = { snapshot: vi.fn() };
    electronMocks.showSaveDialog.mockResolvedValue({ canceled: true });
    const service = new ImportTemplateService({} as never, finance as never, generator);

    await expect(service.generate("vehicles", "en")).resolves.toEqual({ canceled: true });
    expect(finance.snapshot).not.toHaveBeenCalled();
    expect(generator.save).not.toHaveBeenCalled();
  });
});
