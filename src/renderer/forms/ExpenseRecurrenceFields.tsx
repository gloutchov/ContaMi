import type { RecurringItem } from "../../domain/models";
import { Field } from "../components/Modal";
import { useI18n } from "../i18n/I18nContext";
import type { useExpenseRecurrence } from "./useExpenseRecurrence";

export function ExpenseRecurrenceFields({ state, items, allowCreate = true }: {
  state: ReturnType<typeof useExpenseRecurrence>;
  items: RecurringItem[];
  allowCreate?: boolean;
}) {
  const { t } = useI18n();
  return <>
    <Field label={t("recurringExpense")} wide hint={t("singleRecurrenceHelp")}>
      <span className="check-field"><input type="checkbox" checked={state.enabled}
        onChange={(event) => state.setEnabled(event.target.checked)} />{t("makeRecurring")}</span>
    </Field>
    {state.enabled && <>
      <Field label={t("recurring")}><select value={state.selection} onChange={(event) => state.setSelection(event.target.value)}>
        {allowCreate && <option value="new">{t("createRecurringPlan")}</option>}
        {!allowCreate && state.selection === "new" && <option value="">—</option>}
        {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></Field>
      {state.selection === "new" && allowCreate && <Field label={t("frequency")}><select value={state.frequency}
        onChange={(event) => state.setFrequency(event.target.value as RecurringItem["frequency"])}>
        {(["weekly", "monthly", "quarterly", "yearly"] as const).map((item) => <option key={item} value={item}>{t(item)}</option>)}
      </select></Field>}
      <Field label={t(state.selection === "new" ? "firstDueDate" : "dueDate")}>
        <input required type="date" value={state.firstDueDate} onChange={(event) => state.setFirstDueDate(event.target.value)} />
      </Field>
      {state.selection === "new" && allowCreate && <Field label={t("endDate")}>
        <input type="date" min={state.firstDueDate} value={state.endDate} onChange={(event) => state.setEndDate(event.target.value)} />
      </Field>}
    </>}
  </>;
}
