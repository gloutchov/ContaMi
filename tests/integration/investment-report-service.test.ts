import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyFinanceData } from "../../src/domain/finance";
import { InvestmentReportService } from "../../src/main/services/InvestmentReportService";

const electronMocks = vi.hoisted(() => {
  const webContents = { setWindowOpenHandler: vi.fn(), on: vi.fn(), printToPDF: vi.fn(), print: vi.fn() };
  const reportWindow = { webContents, loadURL: vi.fn(), isDestroyed: vi.fn(() => false), destroy: vi.fn() };
  return { showSaveDialog: vi.fn(), BrowserWindow: vi.fn(function MockBrowserWindow() { return reportWindow; }), webContents, reportWindow };
});
vi.mock("electron", () => ({ BrowserWindow: electronMocks.BrowserWindow, dialog: { showSaveDialog: electronMocks.showSaveDialog } }));

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))));

function reportData() {
  const data = createEmptyFinanceData(2026);
  const id = crypto.randomUUID();
  data.investments.push({ id, name: "Synthetic fund", kind: "fund", provider: "", currency: "EUR", active: true, openedAt: "2026-01-01", notes: "" });
  data.investmentEntries.push({ id: crypto.randomUUID(), investmentId: id, date: "2026-02-01", kind: "contribution", amount: 1_000, description: "Synthetic contribution", notes: "" });
  return { data, id };
}

describe("InvestmentReportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    electronMocks.reportWindow.loadURL.mockResolvedValue(undefined);
    electronMocks.reportWindow.isDestroyed.mockReturnValue(false);
    electronMocks.webContents.printToPDF.mockResolvedValue(Buffer.from("%PDF-1.7\nsynthetic\n%%EOF", "ascii"));
    electronMocks.webContents.print.mockImplementation((_options, callback) => callback(true));
  });

  it("saves a verified local PDF and returns only the base name", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-investment-report-"));
    directories.push(directory);
    const destination = path.join(directory, "investment-statement");
    electronMocks.showSaveDialog.mockResolvedValue({ canceled: false, filePath: destination });
    const { data, id } = reportData();
    const service = new InvestmentReportService({} as never, { dataForReport: vi.fn().mockResolvedValue(data) } as never);
    const result = await service.generate({ investmentId: id, scope: "current-year", language: "it", action: "save-pdf" });
    expect(result).toEqual({ canceled: false, fileName: "investment-statement.pdf" });
    expect(await readFile(`${destination}.pdf`, "ascii")).toContain("%PDF-1.7");
    expect(electronMocks.showSaveDialog).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ title: "Salva PDF" }));
    expect(electronMocks.reportWindow.loadURL).toHaveBeenCalledWith(expect.stringMatching(/^data:text\/html;charset=utf-8,/));
    expect(electronMocks.webContents.printToPDF).toHaveBeenCalledWith(expect.objectContaining({ pageSize: "A4" }));
    expect(electronMocks.reportWindow.destroy).toHaveBeenCalledOnce();
  });

  it("prints without choosing a file and cancels before creating a window", async () => {
    const { data } = reportData();
    const service = new InvestmentReportService({} as never, { dataForReport: vi.fn().mockResolvedValue(data) } as never);
    expect(await service.generate({ scope: "lifetime", language: "en", action: "print" })).toEqual({ canceled: false });
    expect(electronMocks.showSaveDialog).not.toHaveBeenCalled();
    expect(electronMocks.webContents.print).toHaveBeenCalledWith({ silent: false, printBackground: true }, expect.any(Function));
    electronMocks.showSaveDialog.mockResolvedValue({ canceled: true });
    electronMocks.BrowserWindow.mockClear();
    expect(await service.generate({ scope: "current-year", language: "en", action: "save-pdf" })).toEqual({ canceled: true });
    expect(electronMocks.BrowserWindow).not.toHaveBeenCalled();
  });

  it("keeps an existing PDF if generation returns an invalid buffer", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-investment-report-invalid-"));
    directories.push(directory);
    const destination = path.join(directory, "statement.pdf");
    await writeFile(destination, "existing report", "utf8");
    electronMocks.showSaveDialog.mockResolvedValue({ canceled: false, filePath: destination });
    electronMocks.webContents.printToPDF.mockResolvedValue(Buffer.from("not a PDF"));
    const { data, id } = reportData();
    const service = new InvestmentReportService({} as never, { dataForReport: vi.fn().mockResolvedValue(data) } as never);
    await expect(service.generate({ investmentId: id, scope: "current-year", language: "en", action: "save-pdf" })).rejects.toThrow("INVESTMENT_REPORT_FAILED");
    expect(await readFile(destination, "utf8")).toBe("existing report");
  });
});
