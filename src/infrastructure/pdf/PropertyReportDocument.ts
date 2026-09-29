import type { PropertyReport, PropertyReportMovement, PropertyReportPeriod } from "../../domain/propertyReport";
import { propertyReportTranslations } from "../../shared/propertyReportContracts";

type ReportLanguage = keyof typeof propertyReportTranslations;
type ReportTranslationKey = keyof typeof propertyReportTranslations.it;

function escapeHtml(value: string | number): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function replaceTokens(value: string, values: Record<string, string | number> = {}): string {
  return Object.entries(values).reduce((text, [key, replacement]) => text.replace(`{${key}}`, String(replacement)), value);
}

function reportLocale(language: ReportLanguage): string {
  return language === "it" ? "it-IT" : "en-GB";
}

function safeFileStem(value: string): string {
  return value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "property";
}

export function propertyReportFileName(report: PropertyReport): string {
  return `ContaMi-report-${safeFileStem(report.property.name)}-${report.scope}-${report.asOf}.pdf`;
}

function trendChart(
  values: Array<{ label: string; value?: number }>,
  ariaLabel: string,
  format: (value: number) => string,
  tone: "gold" | "mint" = "gold",
): string {
  const shown = values.slice(-12);
  const numeric = shown.map((item) => item.value ?? 0);
  const maximum = Math.max(...numeric, 1);
  const width = 720;
  const height = 190;
  const top = 18;
  const bottom = 38;
  const chartHeight = height - top - bottom;
  const slot = width / Math.max(shown.length, 1);
  const barWidth = Math.max(12, Math.min(42, slot * 0.58));
  const bars = shown.map((item, index) => {
    const value = item.value;
    const barHeight = value === undefined ? 0 : (value / maximum) * chartHeight;
    const x = index * slot + (slot - barWidth) / 2;
    const y = top + chartHeight - barHeight;
    const label = item.label.length > 8 ? `${item.label.slice(0, 3)} ${item.label.slice(-2)}` : item.label;
    return `<g><rect class="chart-bar chart-bar-${tone}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${barHeight.toFixed(2)}" rx="4"><title>${escapeHtml(item.label)}: ${value === undefined ? "-" : escapeHtml(format(value))}</title></rect><text class="chart-label" x="${(x + barWidth / 2).toFixed(2)}" y="${height - 14}" text-anchor="middle">${escapeHtml(label)}</text></g>`;
  }).join("");
  return `<svg class="report-chart" role="img" aria-label="${escapeHtml(ariaLabel)}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><line class="chart-axis" x1="0" y1="${top + chartHeight}" x2="${width}" y2="${top + chartHeight}"/>${bars}</svg>`;
}

export function buildPropertyReportHtml(report: PropertyReport, language: ReportLanguage): string {
  const labels = propertyReportTranslations[language];
  const locale = reportLocale(language);
  const t = (key: ReportTranslationKey, values?: Record<string, string | number>) => replaceTokens(labels[key], values);
  const currency = (value: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(value);
  const quantity = (value: number, unit: string) => `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)} ${unit}`;
  const percent = (value: number) => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 }).format(value);
  const date = (value?: string) => value ? new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : "-";
  const periodLabel = (period: PropertyReportPeriod) => report.periodGranularity === "month"
    ? new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${period.key}-01T00:00:00Z`))
    : period.key;
  const section = (title: string, body: string, note = "") => `<section class="report-section"><h2>${escapeHtml(title)}</h2>${body}${note ? `<p class="section-note">${escapeHtml(note)}</p>` : ""}</section>`;
  const emptyRow = (columns: number) => `<tr><td class="empty-cell" colspan="${columns}">${escapeHtml(t("propertyReportNoData"))}</td></tr>`;
  const movementRows = (movements: readonly PropertyReportMovement[]) => movements.length ? movements.map((item) => `<tr><td>${escapeHtml(date(item.date))}</td><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.description)}</td><td><span class="type-badge type-${item.kind}">${escapeHtml(t(item.kind === "income" ? "propertyReportIncomeType" : "propertyReportExpenseType"))}</span></td><td class="numeric">${escapeHtml(currency(item.amount))}</td></tr>`).join("") : emptyRow(5);

  const ownerChips = report.ownerAllocations.map((owner) => `<span class="owner-chip"><strong>${escapeHtml(owner.name)}</strong>${escapeHtml(percent(owner.share))}</span>`).join("");
  const ownerRows = report.ownerAllocations.map((owner) => `<tr><td><strong>${escapeHtml(owner.name)}</strong></td><td class="numeric">${escapeHtml(percent(owner.share))}</td><td class="numeric">${escapeHtml(currency(owner.actualExpenses))}</td><td class="numeric">${escapeHtml(currency(owner.forecastExpenses))}</td><td class="numeric"><strong>${escapeHtml(currency(owner.projectedExpenses))}</strong></td><td class="numeric">${escapeHtml(currency(owner.marketValue))}</td></tr>`).join("");
  const summaryCards = [
    [t("propertyReportActualIncome"), currency(report.actualIncome), "mint"],
    [t("propertyReportActualExpenses"), currency(report.actualExpenses), "coral"],
    [t("propertyReportForecastExpenses"), currency(report.forecastExpenseTotal), "gold"],
    [t("propertyReportProjectedExpenses"), currency(report.projectedExpenseTotal), "ink"],
    [t("propertyReportCurrentMarketValue"), currency(report.currentMarketValue), "blue"],
  ].map(([label, value, tone]) => `<article class="summary-card summary-${tone}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join("");

  const flowRows = report.periods.map((period) => `<tr><td>${escapeHtml(periodLabel(period))}${period.historicalAggregate ? `<small class="aggregate-label">${escapeHtml(t("propertyReportAggregate"))}</small>` : ""}</td><td class="numeric income">${escapeHtml(currency(period.income))}</td><td class="numeric expense">${escapeHtml(currency(period.expenses))}</td><td class="numeric">${escapeHtml(currency(period.income - period.expenses))}</td></tr>`).join("");
  const costChart = trendChart(report.costTrend.map((item) => ({ label: String(item.year), value: item.expenses })), t("propertyReportCostTrend"), currency);
  const costRows = report.costTrend.map((item) => `<tr><td>${item.year}</td><td class="numeric expense">${escapeHtml(currency(item.expenses))}</td></tr>`).join("");
  const condominiumPeriodRows = report.periods.map((period) => `<tr><td>${escapeHtml(periodLabel(period))}</td><td class="numeric">${escapeHtml(currency(period.condominiumCost))}</td></tr>`).join("");
  const utilityRows = report.periods.map((period) => `<tr><td>${escapeHtml(periodLabel(period))}</td><td class="numeric">${escapeHtml(currency(period.electricityCost))}</td><td class="numeric">${escapeHtml(quantity(period.electricityConsumption, "kWh"))}</td><td class="numeric">${escapeHtml(currency(period.gasCost))}</td><td class="numeric">${escapeHtml(quantity(period.gasConsumption, "m³"))}</td><td class="numeric">${escapeHtml(currency(period.waterCost))}</td><td class="numeric">${escapeHtml(quantity(period.waterConsumption, "m³"))}</td><td class="numeric">${escapeHtml(currency(period.phoneInternetCost))}</td></tr>`).join("");
  const condominiumWaterRows = report.periods.map((period) => `<tr><td>${escapeHtml(periodLabel(period))}</td><td class="numeric">${escapeHtml(quantity(period.condominiumColdWaterConsumption, "m³"))}</td><td class="numeric">${escapeHtml(quantity(period.condominiumHotWaterConsumption, "m³"))}</td><td class="numeric">${escapeHtml(currency(period.condominiumWaterCost))}</td></tr>`).join("");
  const forecastRows = report.forecastExpenses.length ? report.forecastExpenses.map((item) => `<tr><td>${escapeHtml(date(item.date))}</td><td>${escapeHtml(item.description)}</td><td class="numeric">${escapeHtml(currency(item.amount))}</td></tr>`).join("") : emptyRow(3);
  const marketRows = report.periods.map((period) => `<tr><td>${escapeHtml(periodLabel(period))}</td><td class="numeric">${period.marketValue === undefined ? "-" : escapeHtml(currency(period.marketValue))}</td></tr>`).join("");
  const marketChart = trendChart(report.periods.map((period) => ({ label: periodLabel(period), value: period.marketValue })), t("propertyReportMarketHistory"), currency, "mint");
  const reportPeriod = report.scope === "current-year" ? `${t("propertyReportCurrentYear")} ${report.activeYear}` : t("propertyReportLifetime");

  return `<!doctype html>
<html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'"><title>${escapeHtml(t("propertyReportTitle"))} - ${escapeHtml(report.property.name)}</title><style>
@page{size:A4;margin:15mm 12mm 18mm}*{box-sizing:border-box}html{color:#17313a;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;font-size:10px;line-height:1.45}body{margin:0}.report-header{background:#082a36;color:#fff;border-radius:16px;padding:24px 26px;margin-bottom:18px;position:relative;overflow:hidden}.report-header:after{content:"";position:absolute;right:-30px;top:-60px;width:170px;height:170px;border-radius:50%;background:#ffb842;opacity:.18}.brand{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#ffca67}.report-header h1{font-size:27px;line-height:1.1;margin:9px 0 5px}.report-header .property-name{font-size:15px;color:#cfe9e5;margin:0}.header-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:20px}.header-meta span{display:block;color:#acd0cc;font-size:8px;text-transform:uppercase;letter-spacing:.05em}.header-meta strong{display:block;color:#fff;font-size:10px;margin-top:3px}.property-facts{display:grid;grid-template-columns:1.4fr 2fr .8fr;gap:10px;margin:0 0 14px}.fact{border:1px solid #dce9e7;border-radius:10px;padding:10px 12px;background:#f7fbfa}.fact span{display:block;color:#64777c;font-size:8px;text-transform:uppercase}.fact strong{display:block;margin-top:2px}.owner-row{display:flex;gap:8px;flex-wrap:wrap}.owner-chip{display:inline-flex;gap:8px;border-radius:999px;padding:6px 10px;background:#e9f5f2;color:#16463f}.report-section{margin:0 0 20px;break-inside:auto}.report-section h2{font-size:16px;color:#0a5661;border-bottom:2px solid #ffb842;padding-bottom:6px;margin:0 0 11px;break-after:avoid}.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.summary-card{border:1px solid #dce9e7;border-top-width:4px;border-radius:10px;padding:11px;break-inside:avoid}.summary-card span{display:block;color:#5c7075;font-size:8px;text-transform:uppercase}.summary-card strong{font-size:14px;display:block;margin-top:3px}.summary-mint{border-top-color:#64c8aa}.summary-coral{border-top-color:#ec7e68}.summary-gold{border-top-color:#ffb842}.summary-ink{border-top-color:#17313a}.summary-blue{border-top-color:#4a9eb0}.report-table{border-collapse:collapse;width:100%;font-size:8.5px;margin-top:8px}.report-table thead{display:table-header-group}.report-table tr{break-inside:avoid}.report-table th{background:#eaf3f2;color:#24484e;font-weight:700;text-align:left;border-bottom:1px solid #c8dcda;padding:6px}.report-table td{border-bottom:1px solid #e0e9e8;padding:5px 6px;vertical-align:top}.report-table .numeric{text-align:right;white-space:nowrap}.income{color:#1a765f}.expense{color:#ad4938}.aggregate-label{display:block;color:#71858a;font-size:7px}.type-badge{display:inline-block;border-radius:999px;padding:2px 6px;font-size:7px;font-weight:700}.type-income{background:#dff4ec;color:#17654f}.type-expense{background:#fde8e3;color:#963e31}.empty-cell{text-align:center;color:#6d7f83;padding:12px!important}.section-note{color:#607378;font-size:8px;margin:8px 0 0;border-left:3px solid #c6ddda;padding-left:8px}.report-chart{width:100%;height:auto;max-height:190px;background:#f7fbfa;border:1px solid #e0ecea;border-radius:10px}.chart-axis{stroke:#acc3c0;stroke-width:1}.chart-bar{fill:#ffb842}.chart-bar-mint{fill:#64c8aa}.chart-label{fill:#526a6e;font-size:10px}.two-columns{display:grid;grid-template-columns:1fr 1.35fr;gap:12px;align-items:start}.report-footer-note{margin-top:24px;border-top:1px solid #dce8e6;padding-top:9px;color:#6b7d81;font-size:7.5px;text-align:center}.totals-row td{font-weight:800;background:#f7fbfa}.nowrap{white-space:nowrap}@media print{.report-header,.summary-card,.fact{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<header class="report-header"><div class="brand">ContaMì</div><h1>${escapeHtml(t("propertyReportTitle"))}</h1><p class="property-name">${escapeHtml(report.property.name)}</p><div class="header-meta"><div><span>${escapeHtml(t("propertyReportPeriod"))}</span><strong>${escapeHtml(reportPeriod)}</strong></div><div><span>${escapeHtml(t("propertyReportAsOf"))}</span><strong>${escapeHtml(date(report.asOf))}</strong></div><div><span>${escapeHtml(t("propertyReportGeneratedOn"))}</span><strong>${escapeHtml(date(report.asOf))}</strong></div></div></header>
<div class="property-facts"><div class="fact"><span>${escapeHtml(t("propertyReportProperty"))}</span><strong>${escapeHtml(report.property.name)}</strong></div><div class="fact"><span>${escapeHtml(t("propertyReportAddress"))}</span><strong>${escapeHtml(report.property.address || "-")}</strong></div><div class="fact"><span>${escapeHtml(t("propertyReportArea"))}</span><strong>${report.property.areaSqm ? `${escapeHtml(quantity(report.property.areaSqm, "m²"))}` : "-"}</strong></div></div>
<div class="property-facts"><div class="fact"><span>${escapeHtml(t("propertyReportOwnership"))}</span><div class="owner-row">${ownerChips}</div></div><div class="fact"><span>${escapeHtml(t("propertyReportCurrentMarketValue"))}</span><strong>${escapeHtml(currency(report.currentMarketValue))}</strong></div><div class="fact"><span>${escapeHtml(t("propertyReportPeriod"))}</span><strong>${escapeHtml(reportPeriod)}</strong></div></div>
${section(t("propertyReportExecutiveSummary"), `<div class="summary-grid">${summaryCards}</div>`)}
${section(t("propertyReportOwnerAllocation"), `<table class="report-table"><thead><tr><th>${escapeHtml(t("propertyReportOwner"))}</th><th class="numeric">${escapeHtml(t("propertyReportShare"))}</th><th class="numeric">${escapeHtml(t("propertyReportActual"))}</th><th class="numeric">${escapeHtml(t("propertyReportForecastShort"))}</th><th class="numeric">${escapeHtml(t("propertyReportProjected"))}</th><th class="numeric">${escapeHtml(t("propertyReportMarketValueShare"))}</th></tr></thead><tbody>${ownerRows}</tbody></table>`)}
${section(t("propertyReportIncomeExpenses"), `<table class="report-table"><thead><tr><th>${escapeHtml(t(report.periodGranularity === "month" ? "propertyReportMonth" : "propertyReportYear"))}</th><th class="numeric">${escapeHtml(t("propertyReportIncome"))}</th><th class="numeric">${escapeHtml(t("propertyReportExpenses"))}</th><th class="numeric">${escapeHtml(t("propertyReportNet"))}</th></tr></thead><tbody>${flowRows}<tr class="totals-row"><td>${escapeHtml(t("propertyReportActual"))}</td><td class="numeric">${escapeHtml(currency(report.actualIncome))}</td><td class="numeric">${escapeHtml(currency(report.actualExpenses))}</td><td class="numeric">${escapeHtml(currency(report.actualIncome - report.actualExpenses))}</td></tr></tbody></table>`, report.hasHistoricalAggregates ? t("propertyReportHistoricalNote") : "")}
${section(t("propertyReportCostTrend"), `<div class="two-columns">${costChart}<table class="report-table"><thead><tr><th>${escapeHtml(t("propertyReportYear"))}</th><th class="numeric">${escapeHtml(t("propertyReportExpenses"))}</th></tr></thead><tbody>${costRows}</tbody></table></div>`)}
${section(t("propertyReportCondominium"), `<div class="two-columns"><table class="report-table"><thead><tr><th>${escapeHtml(t(report.periodGranularity === "month" ? "propertyReportMonth" : "propertyReportYear"))}</th><th class="numeric">${escapeHtml(t("propertyReportCondominiumCost"))}</th></tr></thead><tbody>${condominiumPeriodRows}</tbody></table><table class="report-table"><thead><tr><th>${escapeHtml(t("propertyReportDate"))}</th><th>${escapeHtml(t("propertyReportCategory"))}</th><th>${escapeHtml(t("propertyReportDescriptionLabel"))}</th><th>${escapeHtml(t("propertyReportType"))}</th><th class="numeric">${escapeHtml(t("propertyReportAmount"))}</th></tr></thead><tbody>${movementRows(report.condominiumMovements)}</tbody></table></div>`, [report.hasHistoricalAggregates ? t("propertyReportHistoricalNote") : "", report.condominiumMovementsTruncated ? t("propertyReportTruncated", { shown: report.condominiumMovements.length, total: report.totalCondominiumMovementCount }) : ""].filter(Boolean).join(" "))}
${section(t("propertyReportUtilities"), `<table class="report-table"><thead><tr><th rowspan="2">${escapeHtml(t(report.periodGranularity === "month" ? "propertyReportMonth" : "propertyReportYear"))}</th><th colspan="2">${escapeHtml(t("propertyReportElectricity"))}</th><th colspan="2">${escapeHtml(t("propertyReportGas"))}</th><th colspan="2">${escapeHtml(t("propertyReportWater"))}</th><th>${escapeHtml(t("propertyReportPhoneInternet"))}</th></tr><tr><th class="numeric">${escapeHtml(t("propertyReportCost"))}</th><th class="numeric">${escapeHtml(t("propertyReportConsumption"))}</th><th class="numeric">${escapeHtml(t("propertyReportCost"))}</th><th class="numeric">${escapeHtml(t("propertyReportConsumption"))}</th><th class="numeric">${escapeHtml(t("propertyReportCost"))}</th><th class="numeric">${escapeHtml(t("propertyReportConsumption"))}</th><th class="numeric">${escapeHtml(t("propertyReportCost"))}</th></tr></thead><tbody>${utilityRows}</tbody></table>`)}
${section(t("propertyReportCondominiumWater"), `<table class="report-table"><thead><tr><th>${escapeHtml(t(report.periodGranularity === "month" ? "propertyReportMonth" : "propertyReportYear"))}</th><th class="numeric">${escapeHtml(t("propertyReportColdWater"))}</th><th class="numeric">${escapeHtml(t("propertyReportHotWater"))}</th><th class="numeric">${escapeHtml(t("propertyReportInformationalCost"))}</th></tr></thead><tbody>${condominiumWaterRows}</tbody></table>`, t("propertyReportCondominiumWaterNote"))}
${section(t("propertyReportForecast"), `<table class="report-table"><thead><tr><th>${escapeHtml(t("propertyReportDueDate"))}</th><th>${escapeHtml(t("propertyReportDescriptionLabel"))}</th><th class="numeric">${escapeHtml(t("propertyReportAmount"))}</th></tr></thead><tbody>${forecastRows}${report.forecastExpenses.length ? `<tr class="totals-row"><td colspan="2">${escapeHtml(t("propertyReportForecastShort"))}</td><td class="numeric">${escapeHtml(currency(report.forecastExpenseTotal))}</td></tr>` : ""}</tbody></table>`, [t("propertyReportForecastNote"), report.forecastExpensesTruncated ? t("propertyReportTruncated", { shown: report.forecastExpenses.length, total: report.totalForecastExpenseCount }) : ""].filter(Boolean).join(" "))}
${section(t("propertyReportMarketHistory"), `<div class="two-columns">${marketChart}<table class="report-table"><thead><tr><th>${escapeHtml(t(report.periodGranularity === "month" ? "propertyReportMonth" : "propertyReportYear"))}</th><th class="numeric">${escapeHtml(t("propertyReportMarketValue"))}</th></tr></thead><tbody>${marketRows}</tbody></table></div>`, report.periodGranularity === "month" ? t("propertyReportValueNote") : "")}
${section(t("propertyReportMovements"), `<table class="report-table"><thead><tr><th>${escapeHtml(t("propertyReportDate"))}</th><th>${escapeHtml(t("propertyReportCategory"))}</th><th>${escapeHtml(t("propertyReportDescriptionLabel"))}</th><th>${escapeHtml(t("propertyReportType"))}</th><th class="numeric">${escapeHtml(t("propertyReportAmount"))}</th></tr></thead><tbody>${movementRows(report.movements)}</tbody></table>`, report.movementsTruncated ? t("propertyReportTruncated", { shown: report.movements.length, total: report.totalMovementCount }) : "")}
</body></html>`;
}
