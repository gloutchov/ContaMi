import { randomUUID } from "node:crypto";
import { lstat, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { BrowserWindow, dialog } from "electron";

const MAX_PDF_BYTES = 50 * 1024 * 1024;

export function localTodayIso(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function validPdf(buffer: Buffer): boolean {
  if (buffer.length < 16 || buffer.length > MAX_PDF_BYTES) return false;
  return buffer.subarray(0, 5).toString("ascii") === "%PDF-"
    && buffer.subarray(Math.max(0, buffer.length - 1_024)).toString("ascii").includes("%%EOF");
}

export async function savePdfAtomically(filePath: string, pdf: Buffer, failureCode = "PROPERTY_REPORT_FAILED"): Promise<void> {
  if (!path.isAbsolute(filePath) || filePath.length > 4_096 || path.extname(filePath).toLowerCase() !== ".pdf" || !validPdf(pdf)) {
    throw new Error(failureCode);
  }
  const temporaryPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${randomUUID()}.tmp`);
  const rollbackPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${randomUUID()}.rollback`);
  let movedExisting = false;
  try {
    await writeFile(temporaryPath, pdf, { flag: "wx", mode: 0o600 });
    const reread = await readFile(temporaryPath);
    if (!reread.equals(pdf) || !validPdf(reread)) throw new Error(failureCode);
    try {
      const target = await lstat(filePath);
      if (!target.isFile() || target.isSymbolicLink()) throw new Error(failureCode);
      await rename(filePath, rollbackPath);
      movedExisting = true;
    } catch (error) {
      if (!(typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")) throw error;
    }
    try {
      await rename(temporaryPath, filePath);
    } catch (error) {
      if (movedExisting) await rename(rollbackPath, filePath).catch(() => undefined);
      throw error;
    }
    if (movedExisting) await rm(rollbackPath, { force: true }).catch(() => undefined);
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
  }
}

export interface LocalPdfReportOptions {
  parentWindow: BrowserWindow;
  action: "save-pdf" | "print";
  saveTitle: string;
  defaultFileName: string;
  html: string;
  footer: { confidential: string; page: string; of: string };
  failureCode: string;
}

export async function renderLocalPdfReport(options: LocalPdfReportOptions): Promise<{ canceled: boolean; fileName?: string }> {
  let filePath: string | undefined;
  if (options.action === "save-pdf") {
    const selection = await dialog.showSaveDialog(options.parentWindow, {
      title: options.saveTitle,
      defaultPath: options.defaultFileName,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
      properties: ["createDirectory", "showOverwriteConfirmation"],
    });
    if (selection.canceled || !selection.filePath) return { canceled: true };
    filePath = path.extname(selection.filePath).toLowerCase() === ".pdf" ? selection.filePath : `${selection.filePath}.pdf`;
  }

  const reportWindow = new BrowserWindow({
    parent: options.parentWindow,
    show: false,
    width: 900,
    height: 1_200,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      navigateOnDragDrop: false,
      devTools: false,
      javascript: false,
    },
  });
  reportWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  reportWindow.webContents.on("will-attach-webview", (event) => event.preventDefault());
  reportWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("data:text/html")) event.preventDefault();
  });
  try {
    await reportWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(options.html)}`);
    if (options.action === "print") {
      const printed = await new Promise<boolean>((resolve) => {
        reportWindow.webContents.print({ silent: false, printBackground: true }, (success) => resolve(success));
      });
      return { canceled: !printed };
    }
    const footer = `<div style="box-sizing:border-box;width:100%;padding:0 12mm;color:#64777c;font-family:Arial,sans-serif;font-size:8px;display:flex;justify-content:space-between"><span>ContaMì · ${options.footer.confidential}</span><span>${options.footer.page} <span class="pageNumber"></span> ${options.footer.of} <span class="totalPages"></span></span></div>`;
    const pdf = await reportWindow.webContents.printToPDF({
      displayHeaderFooter: true,
      footerTemplate: footer,
      headerTemplate: "<span></span>",
      pageSize: "A4",
      preferCSSPageSize: true,
      printBackground: true,
    });
    await savePdfAtomically(filePath!, pdf, options.failureCode);
    return { canceled: false, fileName: path.basename(filePath!) };
  } finally {
    if (!reportWindow.isDestroyed()) reportWindow.destroy();
  }
}
