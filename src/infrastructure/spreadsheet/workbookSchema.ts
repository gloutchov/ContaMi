import type { FinanceData } from "../../domain/models";

export interface WorkbookTableDefinition {
  key: Exclude<keyof FinanceData, "meta">;
  sheet: string;
  columns: string[];
  dateColumns?: string[];
}

export const WORKBOOK_TABLES_V3: WorkbookTableDefinition[] = [
  { key: "categories", sheet: "Categories", columns: ["id", "nameIt", "nameEn", "kind", "active"] },
  { key: "paymentMethods", sheet: "Payment Methods", columns: ["id", "name", "kind", "active"] },
  { key: "investmentTypes", sheet: "Investment Types", columns: ["id", "nameIt", "nameEn", "code", "active"] },
  { key: "accounts", sheet: "Accounts", columns: ["id", "name", "kind", "currency", "openingBalance", "active", "openedAt", "closedAt", "notes"], dateColumns: ["openedAt", "closedAt"] },
  { key: "transactions", sheet: "Transactions", columns: ["id", "date", "description", "categoryId", "paymentMethodId", "accountId", "kind", "amount", "currency", "recurringId", "propertyId", "propertyEntryId", "investmentId", "investmentEntryId", "vehicleId", "vehicleEntryId", "sharedExpenseId", "planned", "shared", "sharedPaidBy", "sharedSettled", "notes", "createdAt", "updatedAt", "cashFlowDirection"], dateColumns: ["date"] },
  { key: "properties", sheet: "Properties", columns: ["id", "name", "kind", "usage", "address", "areaSqm", "ownershipShare", "cadastralValue", "expectedMonthlyRent", "rentDueDay", "purchaseDate", "purchasePrice", "active", "closedAt", "notes"], dateColumns: ["purchaseDate", "closedAt"] },
  { key: "propertyEntries", sheet: "Property Entries", columns: ["id", "propertyId", "date", "kind", "category", "categoryId", "description", "amount", "quantity", "unit", "paymentMethodId", "transactionId", "isCommonExpense", "notes", "detailKind", "valuePerSqm", "electricityKwhF1", "electricityKwhF2", "electricityKwhF3", "electricityKwhF23", "taxInstallment"], dateColumns: ["date"] },
  { key: "investments", sheet: "Investments", columns: ["id", "name", "kind", "typeId", "parentInvestmentId", "provider", "currency", "periodicAmount", "periodicFrequency", "periodicNextDueDate", "periodicCategoryId", "periodicPaymentMethodId", "active", "openedAt", "closedAt", "notes"], dateColumns: ["periodicNextDueDate", "openedAt", "closedAt"] },
  { key: "investmentEntries", sheet: "Investment Entries", columns: ["id", "investmentId", "date", "kind", "amount", "description", "categoryId", "paymentMethodId", "transactionId", "notes"], dateColumns: ["date"] },
  { key: "recurringItems", sheet: "Recurring Items", columns: ["id", "name", "kind", "direction", "amount", "frequency", "categoryId", "paymentMethodId", "investmentId", "propertyId", "vehicleId", "nextDueDate", "endDate", "remainingInstallments", "active", "closedAt", "notes"], dateColumns: ["nextDueDate", "endDate", "closedAt"] },
  { key: "sharedExpenses", sheet: "Shared Expenses", columns: ["id", "date", "description", "categoryId", "paymentMethodId", "amount", "ownerShare", "partnerShare", "paidBy", "settled", "transactionId", "notes"], dateColumns: ["date"] },
  { key: "vehicles", sheet: "Vehicles", columns: ["id", "name", "manufacturer", "model", "fuelType", "purchaseDate", "disposalDate", "purchasePrice", "salePrice", "active", "notes"], dateColumns: ["purchaseDate", "disposalDate"] },
  { key: "vehicleEntries", sheet: "Vehicle Entries", columns: ["id", "vehicleId", "date", "kind", "description", "amount", "odometerKm", "distanceKm", "fuelLiters", "fuelUnitPrice", "fuelType", "vendor", "categoryId", "paymentMethodId", "transactionId", "notes"], dateColumns: ["date"] },
  { key: "annualSummaries", sheet: "Annual Summaries", columns: ["year", "income", "expenses", "netCashFlow", "closingNetWorth", "liquidBalance", "propertyValue", "investmentValue", "pensionValue", "monthlyRecurring", "vehicleCosts"] },
  { key: "propertyAnnualSummaries", sheet: "Property History", columns: ["propertyId", "year", "income", "expenses", "closingValue", "electricityKwh", "gasCubicMeters", "waterCubicMeters", "electricityCost", "gasCost", "waterCost"] },
  { key: "investmentAnnualSummaries", sheet: "Investment History", columns: ["investmentId", "year", "closingValue", "contributions", "withdrawals"] },
  { key: "vehicleAnnualSummaries", sheet: "Vehicle History", columns: ["vehicleId", "year", "totalCosts", "fuelCosts", "installments", "taxes", "insurance", "tires", "maintenance", "repairs", "fuelLiters", "distanceKm", "averageKmPerLiter", "closingOdometer"] },
];

export const WORKBOOK_TABLES_V4: WorkbookTableDefinition[] = WORKBOOK_TABLES_V3.flatMap((definition) => {
  const current = definition.key === "propertyEntries"
    ? {
        ...definition,
        columns: ["id", "propertyId", "date", "kind", "category", "categoryId", "description", "amount", "quantity", "unit", "paymentMethodId", "transactionId", "isCommonExpense", "notes", "detailKind", "taxTypeId", "taxInstallmentNumber", "valuePerSqm", "electricityKwhF1", "electricityKwhF2", "electricityKwhF3", "electricityKwhF23"],
      }
    : definition;
  return definition.key === "investmentTypes"
    ? [current, { key: "taxTypes", sheet: "Tax Types", columns: ["id", "name", "appliesTo", "installments", "active"] }]
    : [current];
});

export const WORKBOOK_TABLES_V5: WorkbookTableDefinition[] = WORKBOOK_TABLES_V4.map((definition) => definition.key === "propertyAnnualSummaries"
  ? {
      ...definition,
      columns: [...definition.columns, "phoneInternetCost", "condominiumCost"],
    }
  : definition);

export const WORKBOOK_TABLES_V6: WorkbookTableDefinition[] = WORKBOOK_TABLES_V5.map((definition) => {
  if (definition.key === "investments") {
    return {
      ...definition,
      columns: definition.columns.flatMap((column) => column === "periodicPaymentMethodId"
        ? [column, "periodicAccountId"]
        : [column]),
    };
  }
  if (definition.key === "investmentEntries" || definition.key === "recurringItems") {
    return {
      ...definition,
      columns: definition.columns.flatMap((column) => column === "paymentMethodId"
        ? [column, "accountId"]
        : [column]),
    };
  }
  return definition;
});

export const WORKBOOK_TABLES_V7: WorkbookTableDefinition[] = WORKBOOK_TABLES_V6.map((definition) => {
  if (definition.key === "accounts") {
    return {
      ...definition,
      columns: definition.columns.flatMap((column) => column === "kind"
        ? [column, "defaultFundingAccountId"]
        : [column]),
    };
  }
  if (definition.key === "transactions") {
    return {
      ...definition,
      columns: definition.columns.flatMap((column) => column === "accountId"
        ? [column, "destinationAccountId"]
        : [column]),
    };
  }
  if (definition.key === "propertyEntries" || definition.key === "sharedExpenses" || definition.key === "vehicleEntries") {
    return {
      ...definition,
      columns: definition.columns.flatMap((column) => column === "paymentMethodId"
        ? [column, "accountId"]
        : [column]),
    };
  }
  return definition;
});

export const WORKBOOK_TABLES_V8: WorkbookTableDefinition[] = WORKBOOK_TABLES_V7.map((definition) => {
  if (definition.key === "transactions" || definition.key === "propertyEntries") {
    return {
      ...definition,
      columns: definition.columns.flatMap((column) => column === "date" ? [column, "dueDate"] : [column]),
      dateColumns: [...(definition.dateColumns ?? []), "dueDate"],
    };
  }
  return definition;
});

export const WORKBOOK_TABLES_V9: WorkbookTableDefinition[] = [
  ...WORKBOOK_TABLES_V8,
  {
    key: "recurringRateChanges",
    sheet: "Recurring Rate Changes",
    columns: ["id", "recurringId", "amount", "effectiveFrom"],
    dateColumns: ["effectiveFrom"],
  },
];

export const WORKBOOK_TABLES_V10: WorkbookTableDefinition[] = WORKBOOK_TABLES_V9;

export const WORKBOOK_TABLES_V11: WorkbookTableDefinition[] = WORKBOOK_TABLES_V10.map((definition) => definition.key === "investmentAnnualSummaries"
  ? {
      ...definition,
      columns: [...definition.columns, "closingValueObservedAt", "returnRate", "returnMethod", "returnCoverage", "returnPartialPeriod"],
      dateColumns: [...(definition.dateColumns ?? []), "closingValueObservedAt"],
  }
  : definition);

export const WORKBOOK_TABLES: WorkbookTableDefinition[] = WORKBOOK_TABLES_V11.map((definition) => definition.key === "investments"
  ? {
      ...definition,
      columns: definition.columns.flatMap((column) => column === "name" ? [column, "isin"] : [column]),
    }
  : definition);

export const WORKBOOK_TABLES_V2: WorkbookTableDefinition[] = [
  { key: "categories", sheet: "Categories", columns: ["id", "nameIt", "nameEn", "kind", "active"] },
  { key: "paymentMethods", sheet: "Payment Methods", columns: ["id", "name", "kind", "active"] },
  { key: "investmentTypes", sheet: "Investment Types", columns: ["id", "nameIt", "nameEn", "code", "active"] },
  { key: "accounts", sheet: "Accounts", columns: ["id", "name", "kind", "currency", "openingBalance", "active", "openedAt", "closedAt", "notes"], dateColumns: ["openedAt", "closedAt"] },
  { key: "transactions", sheet: "Transactions", columns: ["id", "date", "description", "categoryId", "paymentMethodId", "accountId", "kind", "amount", "currency", "recurringId", "propertyId", "propertyEntryId", "investmentId", "investmentEntryId", "sharedExpenseId", "planned", "shared", "sharedPaidBy", "sharedSettled", "notes", "createdAt", "updatedAt"], dateColumns: ["date"] },
  { key: "properties", sheet: "Properties", columns: ["id", "name", "kind", "usage", "address", "areaSqm", "ownershipShare", "cadastralValue", "expectedMonthlyRent", "rentDueDay", "purchaseDate", "purchasePrice", "active", "closedAt", "notes"], dateColumns: ["purchaseDate", "closedAt"] },
  { key: "propertyEntries", sheet: "Property Entries", columns: ["id", "propertyId", "date", "kind", "category", "categoryId", "description", "amount", "quantity", "unit", "paymentMethodId", "transactionId", "isCommonExpense", "notes"], dateColumns: ["date"] },
  { key: "investments", sheet: "Investments", columns: ["id", "name", "kind", "typeId", "parentInvestmentId", "provider", "currency", "periodicAmount", "periodicFrequency", "periodicNextDueDate", "periodicCategoryId", "periodicPaymentMethodId", "active", "openedAt", "closedAt", "notes"], dateColumns: ["periodicNextDueDate", "openedAt", "closedAt"] },
  { key: "investmentEntries", sheet: "Investment Entries", columns: ["id", "investmentId", "date", "kind", "amount", "description", "categoryId", "paymentMethodId", "transactionId", "notes"], dateColumns: ["date"] },
  { key: "recurringItems", sheet: "Recurring Items", columns: ["id", "name", "kind", "direction", "amount", "frequency", "categoryId", "paymentMethodId", "investmentId", "propertyId", "nextDueDate", "endDate", "remainingInstallments", "active", "closedAt", "notes"], dateColumns: ["nextDueDate", "endDate", "closedAt"] },
  { key: "sharedExpenses", sheet: "Shared Expenses", columns: ["id", "date", "description", "categoryId", "paymentMethodId", "amount", "ownerShare", "partnerShare", "paidBy", "settled", "transactionId", "notes"], dateColumns: ["date"] },
  { key: "annualSummaries", sheet: "Annual Summaries", columns: ["year", "income", "expenses", "netCashFlow", "closingNetWorth", "liquidBalance", "propertyValue", "investmentValue", "monthlyRecurring"] },
];

export const WORKBOOK_TABLES_V1: WorkbookTableDefinition[] = [
  { key: "categories", sheet: "Categories", columns: ["id", "nameIt", "nameEn", "kind", "active"] },
  { key: "paymentMethods", sheet: "Payment Methods", columns: ["id", "name", "kind", "active"] },
  { key: "accounts", sheet: "Accounts", columns: ["id", "name", "kind", "currency", "openingBalance", "active", "openedAt", "closedAt", "notes"], dateColumns: ["openedAt", "closedAt"] },
  { key: "transactions", sheet: "Transactions", columns: ["id", "date", "description", "categoryId", "paymentMethodId", "accountId", "kind", "amount", "currency", "recurringId", "notes", "createdAt", "updatedAt"], dateColumns: ["date"] },
  { key: "properties", sheet: "Properties", columns: ["id", "name", "kind", "ownershipShare", "purchaseDate", "purchasePrice", "active", "closedAt", "notes"], dateColumns: ["purchaseDate", "closedAt"] },
  { key: "propertyEntries", sheet: "Property Entries", columns: ["id", "propertyId", "date", "kind", "category", "description", "amount", "quantity", "unit", "paymentMethodId", "notes"], dateColumns: ["date"] },
  { key: "investments", sheet: "Investments", columns: ["id", "name", "kind", "provider", "currency", "active", "openedAt", "closedAt", "notes"], dateColumns: ["openedAt", "closedAt"] },
  { key: "investmentEntries", sheet: "Investment Entries", columns: ["id", "investmentId", "date", "kind", "amount", "description", "paymentMethodId", "notes"], dateColumns: ["date"] },
  { key: "recurringItems", sheet: "Recurring Items", columns: ["id", "name", "kind", "amount", "frequency", "categoryId", "paymentMethodId", "nextDueDate", "endDate", "remainingInstallments", "active", "closedAt", "notes"], dateColumns: ["nextDueDate", "endDate", "closedAt"] },
  { key: "sharedExpenses", sheet: "Shared Expenses", columns: ["id", "date", "description", "categoryId", "paymentMethodId", "amount", "ownerShare", "partnerShare", "paidBy", "settled", "notes"], dateColumns: ["date"] },
  { key: "annualSummaries", sheet: "Annual Summaries", columns: ["year", "income", "expenses", "netCashFlow", "closingNetWorth"] },
];

export const WORKBOOK_SCHEMA_VERSION = 12;
