import { financeDataSchema, type FinanceData } from "./models";

export const UUID_COLLECTION_KEYS = [
  "categories",
  "paymentMethods",
  "investmentTypes",
  "taxTypes",
  "accounts",
  "transactions",
  "properties",
  "propertyEntries",
  "propertyWaterReadings",
  "investments",
  "investmentEntries",
  "recurringItems",
  "recurringRateChanges",
  "sharedExpenses",
  "vehicles",
  "vehicleEntries",
] as const satisfies readonly (keyof FinanceData)[];

export type UuidCollectionKey = (typeof UUID_COLLECTION_KEYS)[number];

export interface UuidRepair {
  collection: UuidCollectionKey;
  index: number;
  previousId: string;
  nextId: string;
}

export interface UuidRepairResult {
  data: FinanceData;
  repairs: UuidRepair[];
  repairedLinks: number;
}

type IdRecord = { id: string };
type TransactionLinkField = "propertyEntryId" | "investmentEntryId" | "vehicleEntryId" | "sharedExpenseId";
type LinkedEntryCollection = "propertyEntries" | "investmentEntries" | "vehicleEntries" | "sharedExpenses";

interface LinkedEntrySpec {
  collection: LinkedEntryCollection;
  transactionField: TransactionLinkField;
}

const LINKED_ENTRY_SPECS: readonly LinkedEntrySpec[] = [
  { collection: "propertyEntries", transactionField: "propertyEntryId" },
  { collection: "investmentEntries", transactionField: "investmentEntryId" },
  { collection: "vehicleEntries", transactionField: "vehicleEntryId" },
  { collection: "sharedExpenses", transactionField: "sharedExpenseId" },
];

function records(data: FinanceData, key: UuidCollectionKey): IdRecord[] {
  return data[key] as IdRecord[];
}

function duplicateIds(data: FinanceData): Map<UuidCollectionKey, Set<string>> {
  const result = new Map<UuidCollectionKey, Set<string>>();
  for (const key of UUID_COLLECTION_KEYS) {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const record of records(data, key)) {
      if (seen.has(record.id)) duplicates.add(record.id);
      seen.add(record.id);
    }
    result.set(key, duplicates);
  }
  return result;
}

function nextUniqueUuid(factory: () => string, reserved: Set<string>): string {
  for (let attempt = 0; attempt < 1_000; attempt += 1) {
    const candidate = factory();
    if (!reserved.has(candidate)) return candidate;
  }
  throw new Error("UUID_REPAIR_FAILED");
}

export function assertUniqueRecordIds(data: FinanceData): void {
  const duplicates = duplicateIds(data);
  if ([...duplicates.values()].some((ids) => ids.size > 0)) throw new Error("DUPLICATE_ID");
}

export function repairDuplicateRecordIds(
  data: FinanceData,
  uuidFactory: () => string = () => globalThis.crypto.randomUUID(),
): UuidRepairResult {
  const original = data;
  const next = structuredClone(data);
  const originalDuplicates = duplicateIds(original);
  const reserved = new Set(UUID_COLLECTION_KEYS.flatMap((key) => records(original, key).map((record) => record.id)));
  const repairs: UuidRepair[] = [];

  for (const key of UUID_COLLECTION_KEYS) {
    const seen = new Set<string>();
    records(next, key).forEach((record, index) => {
      if (!seen.has(record.id)) {
        seen.add(record.id);
        return;
      }
      const previousId = record.id;
      const nextId = nextUniqueUuid(uuidFactory, reserved);
      record.id = nextId;
      reserved.add(nextId);
      seen.add(nextId);
      repairs.push({ collection: key, index, previousId, nextId });
    });
  }

  let repairedLinks = 0;
  const transactionDuplicateIds = originalDuplicates.get("transactions")!;

  for (const spec of LINKED_ENTRY_SPECS) {
    const sourceEntries = original[spec.collection];
    const nextEntries = next[spec.collection];
    const entryRepairs = repairs.filter((repair) => repair.collection === spec.collection);
    for (const repair of entryRepairs) {
      const sourceEntry = sourceEntries[repair.index];
      const nextEntry = nextEntries[repair.index];
      const transactionId = sourceEntry?.transactionId;
      if (!sourceEntry || !nextEntry || !transactionId) continue;

      const transactionAlreadyClaimed = sourceEntries
        .slice(0, repair.index)
        .some((entry) => entry.transactionId === transactionId);
      if (transactionDuplicateIds.has(transactionId) || transactionAlreadyClaimed) {
        nextEntry.transactionId = undefined;
        repairedLinks += 1;
        continue;
      }

      const matchingTransactions = next.transactions.filter((transaction) => transaction.id === transactionId);
      if (matchingTransactions.length === 1) {
        matchingTransactions[0]![spec.transactionField] = nextEntry.id;
        repairedLinks += 1;
      }
    }
  }

  const transactionRepairs = repairs.filter((repair) => repair.collection === "transactions");
  for (const repair of transactionRepairs) {
    const sourceTransaction = original.transactions[repair.index];
    const nextTransaction = next.transactions[repair.index];
    if (!sourceTransaction || !nextTransaction) continue;

    for (const spec of LINKED_ENTRY_SPECS) {
      const linkedEntryId = sourceTransaction[spec.transactionField];
      if (!linkedEntryId) continue;
      const entryDuplicateIds = originalDuplicates.get(spec.collection)!;
      const linkAlreadyClaimed = original.transactions
        .slice(0, repair.index)
        .some((transaction) => transaction.id === repair.previousId && transaction[spec.transactionField] === linkedEntryId);

      if (entryDuplicateIds.has(linkedEntryId) || linkAlreadyClaimed) {
        nextTransaction[spec.transactionField] = undefined;
        repairedLinks += 1;
        continue;
      }

      const matchingEntries = next[spec.collection].filter((entry) => entry.id === linkedEntryId);
      if (matchingEntries.length === 1 && matchingEntries[0]!.transactionId === repair.previousId) {
        matchingEntries[0]!.transactionId = nextTransaction.id;
        repairedLinks += 1;
      }
    }
  }

  const validated = financeDataSchema.parse(next);
  assertUniqueRecordIds(validated);
  return { data: validated, repairs, repairedLinks };
}
