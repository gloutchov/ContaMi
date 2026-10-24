import path from "node:path";
import { app, BrowserWindow, dialog, Menu, nativeTheme, session } from "electron";
import type { MessageBoxOptions } from "electron";
import { APP_CONFIG } from "../config/appConfig";
import { SettingsService } from "../infrastructure/settings/SettingsService";
import { ExcelWorkbookRepository } from "../infrastructure/spreadsheet/ExcelWorkbookRepository";
import { ExcelImportTemplateGenerator } from "../infrastructure/spreadsheet/ExcelImportTemplateGenerator";
import { ExcelImportTemplateParser } from "../infrastructure/spreadsheet/ExcelImportTemplateParser";
import { NumbersMirrorService } from "../infrastructure/spreadsheet/NumbersMirrorService";
import { APP_COPYRIGHT, buildApplicationMenuTemplate } from "./appMenu";
import { registerIpc } from "./ipc/registerIpc";
import { FinanceFileService } from "./services/FinanceFileService";
import { ImportTemplateService } from "./services/ImportTemplateService";
import { ImportDataService } from "./services/ImportDataService";
import { PropertyReportService } from "./services/PropertyReportService";
import { InvestmentReportService } from "./services/InvestmentReportService";
import { PensionReportService } from "./services/PensionReportService";

app.enableSandbox();

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

let mainWindow: BrowserWindow | null = null;
const smokeTest = process.argv.includes("--contami-smoke-test");

function scriptPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "scripts", "numbers-mirror.applescript")
    : path.join(app.getAppPath(), "scripts", "numbers-mirror.applescript");
}

function iconPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "assets", "icon.png")
    : path.join(app.getAppPath(), "assets", "icon.png");
}

function showInfoWindow(): void {
  const options: MessageBoxOptions = {
    buttons: ["OK"],
    detail: `Version ${app.getVersion()}\n${APP_COPYRIGHT}`,
    message: "ContaMì",
    noLink: true,
    title: "Info",
    type: "info",
  };
  if (mainWindow) void dialog.showMessageBox(mainWindow, options);
  else void dialog.showMessageBox(options);
}

function installApplicationMenu(): void {
  if (!app.isPackaged) {
    Menu.setApplicationMenu(null);
    return;
  }

  const template = buildApplicationMenuTemplate({
    getFocusedWindow: () => BrowserWindow.getFocusedWindow(),
    platform: process.platform,
    quit: () => app.quit(),
    showInfo: showInfoWindow,
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: APP_CONFIG.window.width,
    height: APP_CONFIG.window.height,
    minWidth: APP_CONFIG.window.minWidth,
    minHeight: APP_CONFIG.window.minHeight,
    show: false,
    title: "ContaMì",
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#071c24" : "#f4f8f6",
    icon: iconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      navigateOnDragDrop: false,
      devTools: !app.isPackaged,
      spellcheck: false,
    },
  });
  if (!app.isPackaged) window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-attach-webview", (event) => event.preventDefault());
  window.webContents.on("will-navigate", (event, url) => {
    const current = window.webContents.getURL();
    if (url !== current) event.preventDefault();
  });
  window.webContents.session.on("will-download", (event) => event.preventDefault());
  window.once("ready-to-show", () => { if (!smokeTest) window.show(); });
  let smokeTimeout: NodeJS.Timeout | undefined;
  if (smokeTest) {
    smokeTimeout = setTimeout(() => app.exit(1), 20_000);
    window.webContents.once("did-fail-load", () => app.exit(1));
    window.webContents.once("did-finish-load", async () => {
      try {
        const healthy = await window.webContents.executeJavaScript(
          "Boolean(document.getElementById('root')?.childElementCount && window.contami && typeof window.contami.getSnapshot === 'function')",
          true,
        );
        app.exit(healthy ? 0 : 1);
      } catch {
        app.exit(1);
      }
    });
  }
  window.on("closed", () => {
    if (smokeTimeout) clearTimeout(smokeTimeout);
    if (mainWindow === window) mainWindow = null;
  });
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl === "http://127.0.0.1:5173") void window.loadURL(devUrl);
  else void window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  return window;
}

function bootstrapWindow(): void {
  mainWindow = createWindow();
  const settings = new SettingsService(app.getPath("userData"));
  const mirror = new NumbersMirrorService(scriptPath());
  const finance = new FinanceFileService(mainWindow, settings, new ExcelWorkbookRepository(), mirror);
  const importTemplates = new ImportTemplateService(mainWindow, finance, new ExcelImportTemplateGenerator());
  const imports = new ImportDataService(mainWindow, finance, new ExcelImportTemplateParser());
  const propertyReports = new PropertyReportService(mainWindow, finance);
  const investmentReports = new InvestmentReportService(mainWindow, finance);
  const pensionReports = new PensionReportService(mainWindow, finance);
  registerIpc(mainWindow, settings, finance, importTemplates, imports, propertyReports, investmentReports, pensionReports);
  installApplicationMenu();
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.webRequest.onBeforeRequest({ urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"] }, (details, callback) => {
    const isDevelopmentAsset = process.env.VITE_DEV_SERVER_URL === "http://127.0.0.1:5173" && details.url.startsWith("http://127.0.0.1:5173");
    callback({ cancel: !isDevelopmentAsset });
  });
  bootstrapWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) bootstrapWindow();
  });
});

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
