import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyFinanceData } from "../../src/domain/finance";
import { PensionReportService } from "../../src/main/services/PensionReportService";

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
  const plan = crypto.randomUUID();
  const child = crypto.randomUUID();
  data.investments.push({ id: plan, name: "Synthetic pension", kind: "pension", provider: "", currency: "EUR", active: true, openedAt: "2026-01-01", notes: "" });
  data.investments.push({ id: child, name: "Synthetic compartment", kind: "fund", provider: "", currency: "EUR", parentInvestmentId: plan, active: true, openedAt: "2026-01-01", notes: "" });
  data.investmentEntries.push({ id: crypto.randomUUID(), investmentId: child, date: "2026-02-01", kind: "contribution", amount: 1_000, description: "Synthetic contribution", notes: "" });
  return { data, plan };
}

describe("PensionReportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    electronMocks.reportWindow.loadURL.mockResolvedValue(undefined);
    electronMocks.reportWindow.isDestroyed.mockReturnValue(false);
    electronMocks.webContents.printToPDF.mockResolvedValue(Buffer.from("%PDF-1.7\nsynthetic\n%%EOF", "ascii"));
    electronMocks.webContents.print.mockImplementation((_options, callback) => callback(true));
  });

  it("saves a verified local PDF without returning its full path", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-pension-report-"));
    directories.push(directory);
    const destination = path.join(directory, "pension-statement");
    electronMocks.showSaveDialog.mockResolvedValue({ canceled: false, filePath: destination });
    const { data, plan } = reportData();
    const service = new PensionReportService({} as never, { dataForReport: vi.fn().mockResolvedValue(data) } as never);
    expect(await service.generate({ pensionId: plan, scope: "current-year", language: "it", action: "save-pdf" })).toEqual({ canceled: false, fileName: "pension-statement.pdf" });
    expect(await readFile(`${destination}.pdf`, "ascii")).toContain("%PDF-1.7");
    expect(electronMocks.reportWindow.loadURL).toHaveBeenCalledWith(expect.stringMatching(/^data:text\/html;charset=utf-8,/));
    expect(electronMocks.webContents.printToPDF).toHaveBeenCalledWith(expect.objectContaining({ pageSize: "A4" }));
    expect(electronMocks.reportWindow.destroy).toHaveBeenCalledOnce();
  });

  it("prints, cancels cleanly, and preserves an existing PDF on invalid output", async () => {
    const { data } = reportData();
    const service = new PensionReportService({} as never, { dataForReport: vi.fn().mockResolvedValue(data) } as never);
    expect(await service.generate({ scope: "lifetime", language: "en", action: "print" })).toEqual({ canceled: false });
    expect(electronMocks.webContents.print).toHaveBeenCalledWith({ silent: false, printBackground: true }, expect.any(Function));
    electronMocks.showSaveDialog.mockResolvedValueOnce({ canceled: true });
    electronMocks.BrowserWindow.mockClear();
    expect(await service.generate({ scope: "current-year", language: "en", action: "save-pdf" })).toEqual({ canceled: true });
    expect(electronMocks.BrowserWindow).not.toHaveBeenCalled();

    const directory = await mkdtemp(path.join(tmpdir(), "contami-pension-report-invalid-"));
    directories.push(directory);
    const destination = path.join(directory, "statement.pdf");
    await writeFile(destination, "existing report", "utf8");
    electronMocks.showSaveDialog.mockResolvedValue({ canceled: false, filePath: destination });
    electronMocks.webContents.printToPDF.mockResolvedValue(Buffer.from("not a PDF"));
    await expect(service.generate({ scope: "current-year", language: "en", action: "save-pdf" })).rejects.toThrow("PENSION_REPORT_FAILED");
    expect(await readFile(destination, "utf8")).toBe("existing report");
  });
});
