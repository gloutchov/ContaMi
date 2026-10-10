import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import logo from "../../assets/logo.png";
import { APP_CONFIG } from "../config/appConfig";
import type { FinanceCommand } from "../domain/commands";
import type { ImportTemplateType } from "../domain/importTemplates";
import type { ImportDuplicateStrategy } from "../domain/imports";
import type { AppSettings, FinanceSnapshot, SystemCapabilities } from "../shared/contracts";
import type { PropertyReportRequest } from "../shared/propertyReportContracts";
import { OperationFeedbackContext } from "./components/OperationFeedbackContext";
import { AppShell, type AppView } from "./components/AppShell";
import { I18nProvider, useI18n } from "./i18n/I18nContext";
import { translations, type Language, type TranslationKey } from "./i18n/translations";
import { getApi } from "./services/api";
import { ThemeProvider } from "./theme/ThemeProvider";
import { runUiAction } from "./utils/save";

const OverviewView = lazy(() => import("./views/OverviewView").then((module) => ({ default: module.OverviewView })));
const TransactionsView = lazy(() => import("./views/TransactionsView").then((module) => ({ default: module.TransactionsView })));
const PropertiesView = lazy(() => import("./views/PropertiesView").then((module) => ({ default: module.PropertiesView })));
const VehiclesView = lazy(() => import("./views/VehiclesView").then((module) => ({ default: module.VehiclesView })));
const InvestmentsView = lazy(() => import("./views/InvestmentsView").then((module) => ({ default: module.InvestmentsView })));
const PensionsView = lazy(() => import("./views/PensionsView").then((module) => ({ default: module.PensionsView })));
const RecurringView = lazy(() => import("./views/RecurringView").then((module) => ({ default: module.RecurringView })));
const SharedExpensesView = lazy(() => import("./views/SharedExpensesView").then((module) => ({ default: module.SharedExpensesView })));
const SettingsView = lazy(() => import("./views/SettingsView").then((module) => ({ default: module.SettingsView })));

const api = getApi();

const defaultCapabilities: SystemCapabilities = {
  platform: "darwin",
  systemLanguage: "en",
  systemTheme: "light",
  numbersAvailable: false,
};

function errorKey(error: unknown): TranslationKey {
  const text = error instanceof Error ? error.message : "";
  if (text.includes("WORKBOOK_NOT_CONFIGURED")) return "workbookRequired";
  if (text.includes("WORKBOOK_CHANGED_EXTERNALLY")) return "workbookChangedExternally";
  if (text.includes("WORKBOOK_LOCK_STALE")) return "workbookStaleLock";
  if (text.includes("WORKBOOK_LOCKED") || text.includes("WORKBOOK_LOCK_LOST")) return "workbookLocked";
  if (text.includes("WORKBOOK_LOCK_UNAVAILABLE")) return "workbookLockUnavailable";
  if (text.includes("WORKBOOK_RESOURCE_LIMIT") || text.includes("WORKBOOK_TOO_LARGE")) return "workbookResourceLimit";
  if (text.includes("WORKBOOK_UNSAFE") || text.includes("INVALID_WORKBOOK_SCHEMA")) return "workbookUnsafe";
  if (text.includes("NUMBERS_MIRROR_FAILED")) return "mirrorWarning";
  if (text.includes("ENTITY_IN_USE")) return "entityInUse";
  if (text.includes("ACCOUNT_REQUIRED")
    || text.includes("ACCOUNT_PAYMENT_METHOD_MISMATCH")
    || text.includes("INVALID_INTERNAL_TRANSFER")
    || text.includes("INVALID_CASH_REGISTER_FUNDING_ACCOUNT")) return "invalidAccountSelection";
  if (text.includes("DUPLICATE_TAX_NAME")) return "duplicateTaxName";
  if (text.includes("VEHICLE_INSTALLMENT")) return "invalidVehicleInstallment";
  if (text.includes("RECURRING_BASE_AMOUNT_LOCKED")) return "recurringBaseLocked";
  if (text.includes("RATE_CHANGE_") || text.includes("DUPLICATE_RATE_CHANGE_MONTH") || text.includes("INVALID_RATE_CHANGE")) return "invalidRateChange";
  if (text.includes("IMPORT_PREVIEW_EXPIRED")) return "importPreviewExpired";
  if (text.includes("IMPORT_NO_VALID_ROWS")) return "importNoValidRows";
  if (text.includes("IMPORT_") || text.includes("INVALID_IMPORT")) return "importInvalidFile";
  if (text.includes("PROPERTY_REPORT")) return "propertyReportError";
  return "genericError";
}

function warningKey(code: string | undefined): TranslationKey | undefined {
  if (code === "NUMBERS_MIRROR_FAILED") return "mirrorWarning";
  if (code === "WORKBOOK_MISSING") return "workbookMissing";
  if (code === "WORKBOOK_UNSAFE") return "workbookUnsafe";
  if (code === "WORKBOOK_RESOURCE_LIMIT") return "workbookResourceLimit";
  if (code === "WORKBOOK_CHANGED_EXTERNALLY") return "workbookChangedExternally";
  if (code === "WORKBOOK_LOCK_STALE") return "workbookStaleLock";
  if (code === "WORKBOOK_LOCKED") return "workbookLocked";
  if (code === "WORKBOOK_LOCK_UNAVAILABLE") return "workbookLockUnavailable";
  if (code === "DUPLICATE_UUIDS_REPAIRED") return "duplicateUuidsRepaired";
  if (code === "INVESTMENT_TRANSACTIONS_REPAIRED") return "investmentTransactionsRepaired";
  if (code === "INVESTMENT_TRANSACTION_LINKS_AMBIGUOUS") return "investmentTransactionLinksAmbiguous";
  if (code === "TRANSACTION_ACCOUNTS_REPAIRED") return "transactionAccountsRepaired";
  if (code === "TRANSACTIONS_WITHOUT_ACCOUNT") return "transactionsWithoutAccount";
  if (code === "FINISHED_INSTALLMENTS_CLOSED") return "finishedInstallmentsClosed";
  if (code === "WORKBOOK_SCHEMA_UPGRADED") return "workbookSchemaUpgraded";
  return undefined;
}

export default function App() {
  const [view, setView] = useState<AppView>("overview");
  const [settings, setSettings] = useState<AppSettings>({ language: "system", theme: "system", workbookFormat: "excel" });
  const [capabilities, setCapabilities] = useState<SystemCapabilities>(defaultCapabilities);
  const [snapshot, setSnapshot] = useState<FinanceSnapshot>();
  const [busy, setBusy] = useState(true);
  const [operationError, setOperationError] = useState<TranslationKey>();
  const [notice, setNotice] = useState<TranslationKey>();
  const [noticeValues, setNoticeValues] = useState<Record<string, string | number>>();
  const language: Language = settings.language === "system" ? capabilities.systemLanguage : settings.language;

  useEffect(() => {
    let current = true;
    Promise.all([api.getSettings(), api.getCapabilities(), api.getSnapshot()]).then(([nextSettings, nextCapabilities, nextSnapshot]) => {
      if (!current) return;
      setSettings(nextSettings); setCapabilities(nextCapabilities); setSnapshot(nextSnapshot);
      const warning = warningKey(nextSnapshot.warningCode);
      if (warning) setNotice(warning);
    }).catch(() => setNotice("genericError")).finally(() => { if (current) setBusy(false); });
    return () => { current = false; };
  }, []);

  const run = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    setBusy(true); setNotice(undefined); setOperationError(undefined);
    try { return await operation(); }
    catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("WORKBOOK_LOCK_STALE") && window.confirm(translations[language].staleLockRecoveryConfirm)) {
        try {
          await api.recoverStaleWorkbookLock();
          return await operation();
        } catch (recoveryError) {
          setNotice(errorKey(recoveryError));
          setOperationError(errorKey(recoveryError));
          throw recoveryError;
        }
      }
      setNotice(errorKey(error));
      setOperationError(errorKey(error));
      throw error;
    }
    finally { setBusy(false); }
  }, [language]);

  const updateSettings = useCallback(async (patch: Pick<Partial<AppSettings>, "language" | "theme" | "workbookFormat">) => {
    await run(async () => { const next = await api.updateSettings(patch); setSettings(next); });
  }, [run]);

  const createWorkbook = useCallback(async () => {
    await run(async () => {
      const result = await api.createWorkbook(settings.workbookFormat);
      if (!result.canceled) { setSnapshot(await api.getSnapshot()); setSettings(await api.getSettings()); }
    });
  }, [run, settings.workbookFormat]);

  const openWorkbook = useCallback(async () => {
    await run(async () => {
      const result = await api.openWorkbook();
      if (!result.canceled) {
        const next = await api.getSnapshot();
        setSnapshot(next);
        setSettings(await api.getSettings());
        const warning = warningKey(next.warningCode);
        if (warning) setNotice(warning);
      }
    });
  }, [run]);

  const execute = useCallback(async (command: FinanceCommand) => {
    await run(async () => {
      const next = await api.execute(command);
      setSnapshot(next);
      if (next.warningCode === "NUMBERS_MIRROR_FAILED") setNotice("mirrorWarning");
    });
  }, [run]);

  const rollover = useCallback(async () => {
    if (!window.confirm(language === "it" ? "Vuoi creare il foglio del nuovo anno? Il file corrente resterà intatto." : "Create the next year workbook? The current file will remain intact.")) return;
    await run(async () => {
      const result = await api.rolloverYear();
      if (!result.canceled) { setSnapshot(await api.getSnapshot()); setNotice("createdYear"); setNoticeValues({ year: result.year ?? "" }); }
    });
  }, [language, run]);

  const reveal = useCallback(async () => { await run(() => api.revealWorkbook()); }, [run]);
  const generateImportTemplate = useCallback(async (type: ImportTemplateType) => {
    await run(async () => {
      const result = await api.generateImportTemplate(type, language);
      if (!result.canceled) {
        setNotice("templateGenerated");
        setNoticeValues({ fileName: result.fileName ?? "" });
      }
    });
  }, [language, run]);
  const previewImport = useCallback((strategy: ImportDuplicateStrategy) => run(() => api.previewImport(strategy, language)), [language, run]);
  const confirmImport = useCallback(async (previewId: string) => {
    await run(async () => {
      const result = await api.confirmImport(previewId);
      setSnapshot(await api.getSnapshot());
      setNotice("importCompleted");
      setNoticeValues({
        create: result.actions.create,
        update: result.actions.update,
        skip: result.actions.skip,
      });
    });
  }, [run]);
  const discardImport = useCallback(async (previewId: string) => { await api.discardImport(previewId); }, []);
  const generatePropertyReport = useCallback(async (request: PropertyReportRequest) => run(async () => {
    const result = await api.generatePropertyReport(request);
    if (!result.canceled) {
      setNotice(request.action === "save-pdf" ? "propertyReportSaved" : "propertyReportPrintOpened");
      setNoticeValues(request.action === "save-pdf" ? { fileName: result.fileName ?? "" } : undefined);
    }
    return result;
  }), [run]);
  const dismissNotice = useCallback(() => setNotice(undefined), []);

  const content = useMemo(() => {
    if (!snapshot) return null;
    switch (view) {
      case "overview": return <OverviewView snapshot={snapshot} onCreate={() => runUiAction(createWorkbook)} onOpen={() => runUiAction(openWorkbook)} />;
      case "transactions": return <TransactionsView data={snapshot.data} onSave={execute} />;
      case "properties": return <PropertiesView data={snapshot.data} onSave={execute} onGenerateReport={generatePropertyReport} />;
      case "vehicles": return <VehiclesView data={snapshot.data} onSave={execute} />;
      case "investments": return <InvestmentsView data={snapshot.data} onSave={execute} />;
      case "pensions": return <PensionsView data={snapshot.data} onSave={execute} />;
      case "recurring": return <RecurringView data={snapshot.data} onSave={execute} />;
      case "shared": return <SharedExpensesView data={snapshot.data} onSave={execute} />;
      case "settings": return <SettingsView settings={settings} capabilities={capabilities} snapshot={snapshot} onUpdate={updateSettings} onCreate={createWorkbook} onOpen={openWorkbook} onReveal={reveal} onRollover={rollover} onGenerateImportTemplate={generateImportTemplate} onPreviewImport={previewImport} onConfirmImport={confirmImport} onDiscardImport={discardImport} onSave={execute} />;
    }
  }, [snapshot, view, createWorkbook, openWorkbook, execute, settings, capabilities, updateSettings, reveal, rollover, generateImportTemplate, previewImport, confirmImport, discardImport, generatePropertyReport]);

  if (!snapshot) return <ThemeProvider theme={settings.theme} capabilities={capabilities}><div className="splash"><div><img src={logo} alt="ContaMì" /><p>{translations[language].loading}</p></div></div></ThemeProvider>;

  return <I18nProvider language={language}><ThemeProvider theme={settings.theme} capabilities={capabilities}><OperationFeedbackContext.Provider value={{ busy, error: operationError }}><AppShell view={view} onNavigate={setView} workbookName={snapshot.workbookDisplayName} busy={busy}>{notice && <Notice messageKey={notice} values={noticeValues} onClose={dismissNotice} />}<Suspense fallback={<div className="empty-state">{translations[language].loading}</div>}>{content}</Suspense></AppShell></OperationFeedbackContext.Provider></ThemeProvider></I18nProvider>;
}

function Notice({ messageKey, values, onClose }: { messageKey: TranslationKey; values?: Record<string, string | number>; onClose: () => void }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const timeout = window.setTimeout(() => { setVisible(false); onClose(); }, APP_CONFIG.ui.noticeDurationMs); return () => window.clearTimeout(timeout); }, [onClose]);
  if (!visible) return null;
  return <NoticeText messageKey={messageKey} values={values} />;
}

function NoticeText({ messageKey, values }: { messageKey: TranslationKey; values?: Record<string, string | number> }) {
  const { t } = useI18n();
  return <div className={messageKey === "genericError" || messageKey === "entityInUse" || messageKey === "duplicateTaxName" || messageKey === "workbookRequired" || messageKey === "workbookChangedExternally" || messageKey === "workbookMissing" || messageKey === "workbookUnsafe" || messageKey === "workbookResourceLimit" || messageKey === "importInvalidFile" || messageKey === "importPreviewExpired" || messageKey === "importNoValidRows" || messageKey === "invalidRateChange" || messageKey === "recurringBaseLocked" || messageKey === "propertyReportError" ? "notice error-notice" : "notice"} role="status">{t(messageKey, values)}</div>;
}
