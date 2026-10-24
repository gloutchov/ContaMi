import type { InvestmentReport, InvestmentReportCurrency, InvestmentReportPeriod } from "../../domain/investmentReport";
import { investmentReportTranslations } from "../../shared/investmentReportContracts";

type Language = keyof typeof investmentReportTranslations;
type Labels = Record<keyof typeof investmentReportTranslations.it, string>;

function escapeHtml(value: string | number): string {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function token(value: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((result, [key, replacement]) => result.replace(`{${key}}`, String(replacement)), value);
}

function safeFileStem(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 60) || "investments";
}

export function investmentReportFileName(report: InvestmentReport): string {
  const name = report.investment?.name ?? "investments";
  return `ContaMi-investment-report-${safeFileStem(name)}-${report.scope}-${report.asOf}.pdf`;
}

function valueChart(periods: readonly InvestmentReportPeriod[], format: (value: number) => string, labels: Labels): string {
  const available = periods.filter((item) => item.capital !== undefined || item.value !== undefined);
  if (!available.length) return `<p class="empty">${escapeHtml(labels.investmentReportNoData)}</p>`;
  const all = available.flatMap((item) => [item.capital, item.value]).filter((item): item is number => item !== undefined);
  const low = Math.min(0, ...all);
  const high = Math.max(1, ...all);
  const range = high - low || 1;
  const x = (index: number) => 55 + index * 620 / Math.max(periods.length - 1, 1);
  const y = (value: number) => 178 - (value - low) * 145 / range;
  const lines = (["capital", "value"] as const).map((kind) => {
    const segments: string[][] = [];
    let current: string[] = [];
    periods.forEach((period, index) => {
      const value = period[kind];
      if (value === undefined) { if (current.length) segments.push(current); current = []; return; }
      current.push(`${x(index).toFixed(1)},${y(value).toFixed(1)}`);
    });
    if (current.length) segments.push(current);
    return segments.map((segment) => segment.length > 1
      ? `<polyline class="line line-${kind}" points="${segment.join(" ")}"/>`
      : `<circle class="dot dot-${kind}" cx="${segment[0].split(",")[0]}" cy="${segment[0].split(",")[1]}" r="3"/>`).join("");
  }).join("");
  const ticks = periods.map((period, index) => index % Math.max(1, Math.ceil(periods.length / 8)) === 0 || index === periods.length - 1
    ? `<text class="axis-label" x="${x(index).toFixed(1)}" y="198" text-anchor="middle">${escapeHtml(period.key)}</text>` : "").join("");
  return `<svg role="img" aria-label="${escapeHtml(labels.investmentReportValueTrend)}" viewBox="0 0 720 210" xmlns="http://www.w3.org/2000/svg"><line class="axis" x1="55" y1="178" x2="675" y2="178"/><text class="axis-label" x="2" y="36">${escapeHtml(format(high))}</text><text class="axis-label" x="2" y="180">${escapeHtml(format(low))}</text>${lines}${ticks}</svg>`;
}

function returnChart(periods: readonly InvestmentReportPeriod[], format: (value: number) => string, labels: Labels): string {
  const rates = periods.flatMap((item) => item.returnRate === undefined ? [] : [item.returnRate]);
  if (!rates.length) return `<p class="empty">${escapeHtml(labels.investmentReportNoData)}</p>`;
  const bound = Math.max(0.01, ...rates.map((rate) => Math.abs(rate)));
  const zero = 104;
  const slot = 620 / Math.max(periods.length, 1);
  const bars = periods.map((period, index) => {
    if (period.returnRate === undefined) return "";
    const height = Math.abs(period.returnRate) / bound * 70;
    const xpos = 55 + slot * index + slot * 0.2;
    const ypos = period.returnRate >= 0 ? zero - height : zero;
    return `<rect class="return-bar ${period.returnRate < 0 ? "negative" : ""}" x="${xpos.toFixed(1)}" y="${ypos.toFixed(1)}" width="${Math.max(2, slot * 0.6).toFixed(1)}" height="${height.toFixed(1)}"><title>${escapeHtml(period.key)}: ${escapeHtml(format(period.returnRate))}</title></rect>`;
  }).join("");
  const ticks = periods.map((period, index) => index % Math.max(1, Math.ceil(periods.length / 8)) === 0 || index === periods.length - 1
    ? `<text class="axis-label" x="${(55 + slot * (index + 0.5)).toFixed(1)}" y="198" text-anchor="middle">${escapeHtml(period.key)}</text>` : "").join("");
  return `<svg role="img" aria-label="${escapeHtml(labels.investmentReportReturns)}" viewBox="0 0 720 210" xmlns="http://www.w3.org/2000/svg"><line class="axis" x1="55" y1="${zero}" x2="675" y2="${zero}"/><text class="axis-label" x="4" y="38">${escapeHtml(format(bound))}</text><text class="axis-label" x="4" y="107">0%</text><text class="axis-label" x="4" y="181">${escapeHtml(format(-bound))}</text>${bars}${ticks}</svg>`;
}

export function buildInvestmentReportHtml(report: InvestmentReport, language: Language): string {
  const labels = investmentReportTranslations[language];
  const locale = language === "it" ? "it-IT" : "en-GB";
  const money = (value: number, currency: string) => new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
  const percent = (value: number) => new Intl.NumberFormat(locale, { style: "percent", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
  const heading = report.investment?.name ?? labels.investmentReportAll;
  const period = report.scope === "current-year" ? `${labels.investmentReportCurrentYear} ${report.activeYear}` : labels.investmentReportLifetime;
  const card = (title: string, value: string) => `<div class="card"><span>${escapeHtml(title)}</span><strong>${escapeHtml(value)}</strong></div>`;
  const currencySection = (section: InvestmentReportCurrency) => {
    const amount = (value: number) => money(value, section.currency);
    const summary = `<div class="cards">${card(labels.investmentReportInitialCapital, amount(section.totals.initialCapital))}${card(labels.investmentReportContributions, amount(section.totals.subsequentContributions))}${card(labels.investmentReportWithdrawals, amount(section.totals.liquidations))}${card(labels.investmentReportNetCapital, amount(section.totals.balance))}${card(labels.investmentReportValue, amount(section.value))}${card(labels.investmentReportOverallResult, amount(section.result))}${card(labels.investmentReportOverallRate, section.resultRate === undefined ? "-" : percent(section.resultRate))}</div>`;
    const rows = section.periods.map((item) => {
      const observed = item.firstValuationAt && item.lastValuationAt
        ? `${date(item.firstValuationAt)}${item.firstValuationAt === item.lastValuationAt ? "" : ` – ${date(item.lastValuationAt)}`}` : "-";
      return `<tr><td>${escapeHtml(item.key)}${item.historicalAggregate ? `<small>${escapeHtml(labels.investmentReportHistorical)}</small>` : ""}</td><td class="num">${item.capital === undefined ? "-" : escapeHtml(amount(item.capital))}</td><td class="num">${item.value === undefined ? "-" : escapeHtml(amount(item.value))}</td><td>${escapeHtml(observed)}</td><td class="num">${item.returnRate === undefined ? "-" : escapeHtml(percent(item.returnRate))}</td><td>${escapeHtml(labels[`investmentReport${item.returnCoverage[0].toUpperCase()}${item.returnCoverage.slice(1)}` as keyof Labels] ?? labels.investmentReportMissing)}${item.returnPartial ? `<small>${escapeHtml(labels.investmentReportPartialPeriod)}</small>` : ""}</td></tr>`;
    }).join("");
    const positionRows = section.positions.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td class="num">${escapeHtml(amount(item.totals.balance))}</td><td class="num">${escapeHtml(amount(item.value))}</td><td class="num">${escapeHtml(amount(item.result))}</td><td class="num">${item.resultRate === undefined ? "-" : escapeHtml(percent(item.resultRate))}</td></tr>`).join("");
    const kindLabel = (kind: string) => kind === "contribution" ? labels.investmentReportContribution
      : kind === "withdrawal" ? labels.investmentReportWithdrawal
      : kind === "valuation" ? labels.investmentReportValuation : labels.investmentReportCorrection;
    const movementRows = section.movements.map((item) => `<tr><td>${escapeHtml(date(item.date))}</td><td>${escapeHtml(item.position)}</td><td>${escapeHtml(kindLabel(item.kind))}</td><td>${escapeHtml(item.description)}</td><td class="num">${escapeHtml(amount(item.amount))}</td></tr>`).join("");
    const empty = (columns: number) => `<tr><td colspan="${columns}" class="empty">${escapeHtml(labels.investmentReportNoData)}</td></tr>`;
    return `<section class="currency-section"><h2>${escapeHtml(labels.investmentReportCurrency)} · ${escapeHtml(section.currency)}</h2><h3>${escapeHtml(labels.investmentReportSummary)}</h3>${summary}
      <h3>${escapeHtml(labels.investmentReportValueTrend)}</h3><div class="chart-legend"><span class="capital-key">${escapeHtml(labels.investmentReportNetCapital)}</span><span class="value-key">${escapeHtml(labels.investmentReportValue)}</span></div>${valueChart(section.periods, amount, labels)}
      <h3>${escapeHtml(labels.investmentReportReturns)}</h3>${returnChart(section.periods, percent, labels)}
      <p class="note">${escapeHtml(labels.investmentReportReturnNote)}</p><p class="note">${escapeHtml(labels.investmentReportValueNote)}</p>
      <table><thead><tr><th>${escapeHtml(labels.investmentReportPeriod)}</th><th class="num">${escapeHtml(labels.investmentReportNetCapital)}</th><th class="num">${escapeHtml(labels.investmentReportValue)}</th><th>${escapeHtml(labels.investmentReportLastValuation)}</th><th class="num">${escapeHtml(labels.investmentReportReturns)}</th><th>${escapeHtml(labels.investmentReportCoverage)}</th></tr></thead><tbody>${rows || empty(6)}</tbody></table>
      <h3>${escapeHtml(labels.investmentReportPositions)}</h3><table><thead><tr><th>${escapeHtml(labels.investmentReportPosition)}</th><th class="num">${escapeHtml(labels.investmentReportNetCapital)}</th><th class="num">${escapeHtml(labels.investmentReportValue)}</th><th class="num">${escapeHtml(labels.investmentReportOverallResult)}</th><th class="num">%</th></tr></thead><tbody>${positionRows || empty(5)}</tbody></table>
      <h3>${escapeHtml(labels.investmentReportMovements)}</h3><table><thead><tr><th>${escapeHtml(labels.investmentReportDate)}</th><th>${escapeHtml(labels.investmentReportPosition)}</th><th>${escapeHtml(labels.investmentReportKind)}</th><th>${escapeHtml(labels.investmentReportDescriptionLabel)}</th><th class="num">${escapeHtml(labels.investmentReportAmount)}</th></tr></thead><tbody>${movementRows || empty(5)}</tbody></table>
      ${section.movementsTruncated ? `<p class="note">${escapeHtml(token(labels.investmentReportTruncated, { shown: section.movements.length, total: section.movementCount }))}</p>` : ""}</section>`;
  };
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'"><title>${escapeHtml(labels.investmentReportTitle)} - ${escapeHtml(heading)}</title><style>
@page{size:A4;margin:15mm 12mm 18mm}*{box-sizing:border-box}html{color:#17313a;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;font-size:10px;line-height:1.45}body{margin:0}.header{background:#082a36;color:#fff;border-radius:15px;padding:22px 25px;margin-bottom:18px}.brand{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#ffb842}.header h1{font-size:25px;margin:5px 0 2px}.header p{margin:0;color:#d4e6e5}.header-meta{display:flex;gap:25px;margin-top:13px}.header-meta span{font-size:8px;text-transform:uppercase;letter-spacing:.08em;display:block;color:#a8c7c7}.header-meta strong{display:block;font-size:10px}.currency-section{margin-bottom:20px}.currency-section h2{font-size:17px;color:#0a5661;border-bottom:2px solid #ffb842;padding-bottom:5px;break-after:avoid}.currency-section h3{font-size:12px;color:#173e45;margin:15px 0 6px;break-after:avoid}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.card{border:1px solid #dce9e7;border-top:3px solid #64c8aa;border-radius:8px;padding:8px;break-inside:avoid}.card span{display:block;font-size:7px;color:#61777b;text-transform:uppercase}.card strong{display:block;font-size:11px;margin-top:3px}.currency-section svg{width:100%;height:auto;max-height:210px;background:#f7fbfa;border:1px solid #e0ecea;border-radius:9px;break-inside:avoid}.axis{stroke:#a9c0be;stroke-width:1}.axis-label{fill:#506b70;font-size:9px}.line{fill:none;stroke-width:3;stroke-linejoin:round}.line-capital{stroke:#4e94a7}.line-value{stroke:#50b692}.dot-capital{fill:#4e94a7}.dot-value{fill:#50b692}.return-bar{fill:#50b692}.return-bar.negative{fill:#df7668}.chart-legend{display:flex;gap:15px;font-size:8px;color:#526a6e;margin-bottom:5px}.chart-legend span:before{content:"";display:inline-block;width:8px;height:8px;margin-right:5px;border-radius:50%}.capital-key:before{background:#4e94a7}.value-key:before{background:#50b692}table{border-collapse:collapse;width:100%;font-size:8px;margin-top:6px}thead{display:table-header-group}tr{break-inside:avoid}th{text-align:left;background:#eaf3f2;color:#24484e;border-bottom:1px solid #c8dcda;padding:6px}td{border-bottom:1px solid #e0e9e8;padding:5px 6px;vertical-align:top;overflow-wrap:anywhere}td small{display:block;color:#71858a;font-size:7px}.num{text-align:right;white-space:nowrap}.note{font-size:8px;color:#607378;border-left:3px solid #c6ddda;padding-left:8px;margin:8px 0}.empty{text-align:center;color:#6d7f83;padding:12px!important}@media print{.header,.card,th{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><header class="header"><div class="brand">ContaMì</div><h1>${escapeHtml(labels.investmentReportTitle)}</h1><p>${escapeHtml(heading)}</p><div class="header-meta"><div><span>${escapeHtml(labels.investmentReportPeriod)}</span><strong>${escapeHtml(period)}</strong></div><div><span>${escapeHtml(labels.investmentReportAsOf)}</span><strong>${escapeHtml(date(report.asOf))}</strong></div></div></header>${report.currencies.length > 1 ? `<p class="note">${escapeHtml(labels.investmentReportMixedCurrencies)}</p>` : ""}${report.scope === "lifetime" ? `<p class="note">${escapeHtml(labels.investmentReportHistoricalNote)}</p>` : ""}${report.currencies.map(currencySection).join("") || `<p class="empty">${escapeHtml(labels.investmentReportNoData)}</p>`}</body></html>`;
}
