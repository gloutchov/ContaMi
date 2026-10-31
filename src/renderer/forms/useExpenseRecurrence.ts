import { useState } from "react";
import type { ExpenseSchedule } from "../../domain/commands";
import type { RecurringItem } from "../../domain/models";

export function useExpenseRecurrence(recurringId: string | undefined, dueDate: string) {
  const [enabled, setEnabled] = useState(Boolean(recurringId));
  const [selection, setSelection] = useState(recurringId ?? "new");
  const [frequency, setFrequency] = useState<RecurringItem["frequency"]>("monthly");
  const [chosenDueDate, setFirstDueDate] = useState<string>();
  const firstDueDate = chosenDueDate ?? dueDate;
  const [endDate, setEndDate] = useState("");
  return {
    enabled, setEnabled, selection, setSelection, frequency, setFrequency,
    firstDueDate, setFirstDueDate, endDate, setEndDate,
    valid: !enabled || Boolean(firstDueDate && (selection !== "new" || !endDate || endDate >= firstDueDate)),
    recurringId: enabled && selection !== "new" ? selection : undefined,
    newSchedule: (): ExpenseSchedule | undefined => enabled && selection === "new"
      ? { id: crypto.randomUUID(), frequency, nextDueDate: firstDueDate, endDate: endDate || undefined }
      : undefined,
  };
}
