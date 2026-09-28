import type { InvestmentUnitPoint } from "../../domain/investments";
import { useI18n } from "../i18n/I18nContext";
import { formatDate, formatQuantity } from "../utils/format";
import { HistoryChart } from "./HistoryChart";

export function InvestmentUnitChart({ points }: { points: InvestmentUnitPoint[] }) {
  const { t, language } = useI18n();
  return <section className="detail-history-section">
    <h3>{t("investmentUnitsHistory")}</h3>
    {points.length ? <HistoryChart
      ariaLabel={t("investmentUnitsHistory")}
      data={points.map((point) => ({ date: point.date, quantity: point.quantity, variation: point.variation }))}
      xKey="date"
      xTickFormatter={(value) => formatDate(String(value), language)}
      series={[{ key: "quantity", label: t("investmentUnitsBalance"), color: "#4e94a7" }]}
      format={(value) => formatQuantity(value, language)}
      tooltipDetails={(item) => [{
        label: t("investmentUnitsVariation"),
        value: item.variation === null || item.variation === undefined
          ? "—" : formatQuantity(Number(item.variation), language, true),
      }]}
    /> : <p className="empty-inline">{t("noInvestmentUnits")}</p>}
  </section>;
}
