import { ArrowDown, ArrowDownRight, ArrowUp, ArrowUpRight, CircleDollarSign, Scale } from "lucide-react";
import type { InvestmentMovementTotals, InvestmentValueTrend } from "../../domain/investments";
import { useI18n } from "../i18n/I18nContext";
import { formatCurrency, formatPercent, formatQuantity } from "../utils/format";
import { KpiCard } from "./KpiCard";

export function InvestmentMovementKpis({ totals, currency = "EUR" }: {
  totals: InvestmentMovementTotals;
  currency?: string;
}) {
  const { t, language } = useI18n();
  return <>
    <KpiCard label={t("initialInvestedCapital")} value={formatCurrency(totals.initialCapital, language, currency)} icon={CircleDollarSign} tone="blue" />
    <KpiCard label={t("subsequentContributions")} value={formatCurrency(totals.subsequentContributions, language, currency)} icon={ArrowUpRight} tone="mint" />
    <KpiCard label={t("totalLiquidations")} value={formatCurrency(totals.liquidations, language, currency)} icon={ArrowDownRight} tone="coral" />
    <KpiCard label={t("investedLiquidatedBalance")} value={formatCurrency(totals.balance, language, currency)} icon={Scale} tone="gold" />
  </>;
}

export function InvestmentMovementFacts({ totals, currency = "EUR", result, units }: {
  totals: InvestmentMovementTotals;
  currency?: string;
  result?: { amount: number; rate?: number };
  units?: number;
}) {
  const { t, language } = useI18n();
  return <div className="investment-movement-facts">
    <span><small>{t("initialInvestedCapital")}</small><strong>{formatCurrency(totals.initialCapital, language, currency)}</strong></span>
    <span><small>{t("subsequentContributions")}</small><strong>{formatCurrency(totals.subsequentContributions, language, currency)}</strong></span>
    <span><small>{t("totalLiquidations")}</small><strong>{formatCurrency(totals.liquidations, language, currency)}</strong></span>
    <span><small>{t("investedLiquidatedBalance")}</small><strong>{formatCurrency(totals.balance, language, currency)}</strong></span>
    {result && <span><small>{t("investmentTotalResult")}</small><strong>{result.amount > 0 ? "+" : ""}{formatCurrency(result.amount, language, currency)}{result.rate !== undefined ? ` (${formatPercent(result.rate, language)})` : ""}</strong></span>}
    {units !== undefined && <span><small>{t("investmentUnitsBalance")}</small><strong>{formatQuantity(units, language)}</strong></span>}
  </div>;
}

export function InvestmentCurrentValue({ value, currency = "EUR", isLoss = false, trend }: {
  value: number;
  currency?: string;
  isLoss?: boolean;
  trend?: InvestmentValueTrend;
}) {
  const { t, language } = useI18n();
  const trendLabel = trend === "up" ? t("valueIncreased") : trend === "down" ? t("valueDecreased") : undefined;
  return <div className={`entity-value investment-current-value${isLoss ? " value-loss" : ""}`}>
    <span>{formatCurrency(value, language, currency)}</span>
    {trend && <span className={`investment-trend investment-trend-${trend}`} title={trendLabel} aria-label={trendLabel}>
      {trend === "up" ? <ArrowUp size={18} aria-hidden="true" /> : <ArrowDown size={18} aria-hidden="true" />}
    </span>}
  </div>;
}
