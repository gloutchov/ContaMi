import { z } from "zod";

export const IMPORT_TEMPLATE_VERSION = 3;
export const SUPPORTED_IMPORT_TEMPLATE_VERSIONS = [1, 2, 3] as const;
export type ImportTemplateVersion = typeof SUPPORTED_IMPORT_TEMPLATE_VERSIONS[number];
export const IMPORT_TEMPLATE_DATA_SHEET = "Dati - Data";
export const IMPORT_TEMPLATE_META_SHEET = "_Meta";
export const IMPORT_TEMPLATE_LISTS_SHEET = "_Lists";

export const importTemplateTypeSchema = z.enum([
  "residence",
  "rental_properties",
  "transactions",
  "investments",
  "pension",
  "shared_expenses",
  "recurring_items",
  "vehicles",
]);

export type ImportTemplateType = z.infer<typeof importTemplateTypeSchema>;

export type ImportTemplateListKey =
  | "boolean"
  | "transaction_kind"
  | "cash_flow_direction"
  | "property_record_type"
  | "property_kind"
  | "utility_type"
  | "investment_record_type"
  | "pension_record_type"
  | "investment_frequency"
  | "frequency"
  | "recurring_kind"
  | "direction"
  | "paid_by"
  | "vehicle_record_type"
  | "fuel_type"
  | "categories"
  | "income_categories"
  | "expense_categories"
  | "payment_methods"
  | "accounts"
  | "investment_types"
  | "tax_types"
  | "properties"
  | "investments"
  | "vehicles";

export type ImportTemplateFieldKind = "text" | "date" | "money" | "decimal" | "integer" | "enum" | "catalog";

export interface ImportTemplateField {
  key: string;
  labelIt: string;
  labelEn: string;
  helpIt: string;
  helpEn: string;
  kind: ImportTemplateFieldKind;
  required?: boolean;
  requiredFor?: string[];
  list?: ImportTemplateListKey;
}

export interface ImportTemplateContract {
  type: ImportTemplateType;
  fileName: string;
  titleIt: string;
  titleEn: string;
  purposeIt: string;
  purposeEn: string;
  fields: ImportTemplateField[];
}

export const IMPORT_TEMPLATE_STATIC_LISTS: Partial<Record<ImportTemplateListKey, string[]>> = {
  boolean: ["true | vero", "false | falso"],
  transaction_kind: ["income | entrata", "expense | uscita", "transfer | trasferimento"],
  cash_flow_direction: ["inflow | entrata di cassa", "outflow | uscita di cassa", "neutral | neutro"],
  property_record_type: [
    "property | immobile",
    "valuation | valutazione",
    "income | entrata",
    "expense | uscita",
    "utility | utenza",
    "tax | tassa",
  ],
  property_kind: ["apartment | appartamento", "house | casa", "garage", "land | terreno", "commercial | commerciale", "other | altro"],
  utility_type: ["electricity | elettricità", "gas", "water | acqua", "phone_internet | telefono_internet"],
  investment_record_type: ["position | posizione", "contribution | versamento", "withdrawal | liquidazione", "valuation | valutazione"],
  pension_record_type: ["pension | pensione", "compartment | comparto", "contribution | versamento", "withdrawal | liquidazione", "valuation | valutazione"],
  investment_frequency: ["monthly | mensile", "yearly | annuale"],
  frequency: ["weekly | settimanale", "monthly | mensile", "quarterly | trimestrale", "yearly | annuale"],
  recurring_kind: ["subscription | abbonamento", "service | servizio", "installment | rata", "investment | investimento", "rent | affitto", "other | altro"],
  direction: ["income | entrata", "expense | uscita"],
  paid_by: ["owner | titolare", "partner"],
  vehicle_record_type: [
    "vehicle | automobile",
    "fuel | carburante",
    "installment | rata",
    "tax | bollo",
    "insurance | assicurazione",
    "tires | pneumatici",
    "maintenance | manutenzione",
    "repair | riparazione",
    "valuation | valutazione",
    "other | altro",
  ],
  fuel_type: ["petrol | benzina", "diesel", "lpg | gpl", "methane | metano", "hybrid | ibrido", "electric | elettrico", "other | altro"],
};

const field = (
  key: string,
  labelIt: string,
  labelEn: string,
  helpIt: string,
  helpEn: string,
  kind: ImportTemplateFieldKind,
  options: Pick<ImportTemplateField, "required" | "requiredFor" | "list"> = {},
): ImportTemplateField => ({ key, labelIt, labelEn, helpIt, helpEn, kind, ...options });

const notes = field("notes", "Note", "Notes", "Testo facoltativo, massimo 2.000 caratteri.", "Optional text, maximum 2,000 characters.", "text");
const recordType = (list: ImportTemplateListKey) => field(
  "record_type", "Tipo riga", "Record type",
  "Scegli il tipo di record; determina quali altri campi sono obbligatori.",
  "Choose the record type; it determines which other fields are required.",
  "enum", { required: true, list },
);
const category = (requiredFor: string[], list: ImportTemplateListKey = "categories") => field(
  "category", "Categoria", "Category",
  "Scegli una categoria del catalogo; l’identificativo stabile è incluso quando disponibile.",
  "Choose a catalog category; its stable identifier is included when available.",
  "catalog", { requiredFor, list },
);
const paymentMethod = (requiredFor: string[]) => field(
  "payment_method", "Metodo di pagamento", "Payment method",
  "Scegli un metodo di pagamento del catalogo.",
  "Choose a payment method from the catalog.",
  "catalog", { requiredFor, list: "payment_methods" },
);
const account = (requiredFor: string[]) => field(
  "account", "Conto o Cassa", "Account or cash register",
  "Scegli il conto o la Cassa coerente con il metodo di pagamento.",
  "Choose the account or cash register that matches the payment method.",
  "catalog", { requiredFor, list: "accounts" },
);
const amount = (requiredFor?: string[]) => field(
  "amount", "Importo", "Amount",
  "Numero positivo; usa il separatore decimale previsto dal programma di foglio di calcolo.",
  "Positive number; use the decimal separator expected by your spreadsheet application.",
  "money", requiredFor ? { requiredFor } : { required: true },
);
const entryDate = (requiredFor?: string[]) => field(
  "date", "Data", "Date",
  "Data reale nel formato visualizzato AAAA-MM-GG / YYYY-MM-DD.",
  "Real date displayed as YYYY-MM-DD.",
  "date", requiredFor ? { requiredFor } : { required: true },
);

const propertyFields = (rental: boolean): ImportTemplateField[] => [
  recordType("property_record_type"),
  field("property_key", "Chiave immobile", "Property key", "Identificativo scelto dall’utente e ripetuto su tutte le righe dello stesso immobile.", "User-defined identifier repeated on every row for the same property.", "text", { required: true }),
  field("name", "Nome immobile", "Property name", "Nome leggibile dell’immobile.", "Readable property name.", "text", { requiredFor: ["property"] }),
  field("property_kind", "Tipo immobile", "Property kind", "Tipologia dell’immobile.", "Property type.", "enum", { requiredFor: ["property"], list: "property_kind" }),
  field("address", "Indirizzo", "Address", "Indirizzo facoltativo, massimo 320 caratteri.", "Optional address, maximum 320 characters.", "text"),
  field("area_sqm", "Superficie m²", "Area sqm", "Superficie positiva in metri quadrati.", "Positive area in square metres.", "decimal"),
  field("ownership_share", "Quota proprietà", "Ownership share", "Numero da 0 a 1; ad esempio 0,5 per il 50%.", "Number from 0 to 1; for example 0.5 for 50%.", "decimal", { requiredFor: ["property"] }),
  field("cadastral_value", "Valore catastale", "Cadastral value", "Valore catastale facoltativo.", "Optional cadastral value.", "money"),
  ...(rental ? [
    field("expected_monthly_rent", "Affitto mensile atteso", "Expected monthly rent", "Canone mensile atteso.", "Expected monthly rent.", "money"),
    field("rent_due_day", "Giorno scadenza affitto", "Rent due day", "Intero da 1 a 31.", "Integer from 1 to 31.", "integer"),
  ] : []),
  field("purchase_date", "Data acquisto", "Purchase date", "Data di acquisto facoltativa.", "Optional purchase date.", "date"),
  field("purchase_price", "Prezzo acquisto", "Purchase price", "Prezzo di acquisto; può essere zero.", "Purchase price; zero is allowed.", "money", { requiredFor: ["property"] }),
  field("active", "Attivo", "Active", "Stato dell’immobile.", "Property status.", "enum", { requiredFor: ["property"], list: "boolean" }),
  field("closed_at", "Data chiusura", "Closed at", "Compila soltanto per immobili non attivi.", "Fill only for inactive properties.", "date"),
  entryDate(["valuation", "income", "expense", "utility", "tax"]),
  field("description", "Descrizione", "Description", "Descrizione della registrazione, massimo 240 caratteri.", "Record description, maximum 240 characters.", "text", { requiredFor: ["valuation", "income", "expense", "utility", "tax"] }),
  amount(["valuation", "income", "expense", "utility", "tax"]),
  category(["income", "expense", "utility", "tax"]),
  paymentMethod(["income", "expense", "utility", "tax"]),
  account(["income", "expense", "utility", "tax"]),
  field("utility_type", "Tipo utenza", "Utility type", "Obbligatorio per una riga utenza.", "Required for a utility row.", "enum", { requiredFor: ["utility"], list: "utility_type" }),
  field("quantity", "Quantità/consumo", "Quantity/consumption", "Consumo non negativo.", "Non-negative consumption.", "decimal"),
  field("unit", "Unità", "Unit", "Ad esempio kWh o m³.", "For example kWh or m³.", "text"),
  field("electricity_kwh_f1", "Elettricità F1 kWh", "Electricity F1 kWh", "Consumo elettrico in fascia F1.", "F1 electricity consumption.", "decimal"),
  field("electricity_kwh_f2", "Elettricità F2 kWh", "Electricity F2 kWh", "Consumo elettrico in fascia F2.", "F2 electricity consumption.", "decimal"),
  field("electricity_kwh_f3", "Elettricità F3 kWh", "Electricity F3 kWh", "Consumo elettrico in fascia F3.", "F3 electricity consumption.", "decimal"),
  field("electricity_kwh_f23", "Elettricità F2+F3 kWh", "Electricity F2+F3 kWh", "Alternativa alla compilazione separata di F2 e F3.", "Alternative to separate F2 and F3 values.", "decimal"),
  field("tax_type", "Tassa", "Tax", "Tassa configurata applicabile all’immobile.", "Configured tax applicable to the property.", "catalog", { requiredFor: ["tax"], list: "tax_types" }),
  field("installment_number", "Numero rata", "Instalment number", "Intero da 1 a 24, entro il numero di rate della tassa.", "Integer from 1 to 24, within the tax instalment count.", "integer"),
  field("is_common_expense", "Spesa comune", "Common expense", "Indica se includere la tassa nelle spese comuni.", "Whether to include the tax in common expenses.", "enum", { list: "boolean" }),
  field("shared", "Spesa condivisa", "Shared expense", "Crea anche una spesa condivisa collegata.", "Also create a linked shared expense.", "enum", { list: "boolean" }),
  field("owner_share", "Quota titolare", "Owner share", "Quota del titolare; le due quote devono sommare all’importo.", "Owner share; both shares must add up to the amount.", "money"),
  field("partner_share", "Quota partner", "Partner share", "Quota del partner.", "Partner share.", "money"),
  field("paid_by", "Pagato da", "Paid by", "Chi ha sostenuto la spesa condivisa.", "Who paid the shared expense.", "enum", { list: "paid_by" }),
  field("settled", "Rimborsata", "Settled", "Stato del rimborso.", "Reimbursement status.", "enum", { list: "boolean" }),
  notes,
];

const contracts: ImportTemplateContract[] = [
  {
    type: "residence",
    fileName: "ContaMi-template-residence-v3.xlsx",
    titleIt: "Immobile di residenza",
    titleEn: "Residence property",
    purposeIt: "Anagrafica della residenza e registrazioni collegate: valutazioni, entrate, uscite, utenze e tasse.",
    purposeEn: "Residence registry and linked records: valuations, income, expenses, utilities, and taxes.",
    fields: propertyFields(false),
  },
  {
    type: "rental_properties",
    fileName: "ContaMi-template-rental-properties-v3.xlsx",
    titleIt: "Immobili in affitto",
    titleEn: "Rental properties",
    purposeIt: "Anagrafiche degli immobili locati e registrazioni collegate, inclusi canoni, costi, utenze e tasse.",
    purposeEn: "Rental-property registries and linked records, including rent, costs, utilities, and taxes.",
    fields: propertyFields(true),
  },
  {
    type: "transactions",
    fileName: "ContaMi-template-transactions-v3.xlsx",
    titleIt: "Transazioni",
    titleEn: "Transactions",
    purposeIt: "Entrate, uscite e trasferimenti non già creati da altri template collegati.",
    purposeEn: "Income, expenses, and transfers not already created by other linked templates.",
    fields: [
      entryDate(),
      field("description", "Descrizione", "Description", "Descrizione della transazione.", "Transaction description.", "text", { required: true }),
      field("kind", "Tipo", "Kind", "Entrata, uscita o trasferimento.", "Income, expense, or transfer.", "enum", { required: true, list: "transaction_kind" }),
      amount(),
      field("currency", "Valuta", "Currency", "Codice ISO di tre lettere, ad esempio EUR.", "Three-letter ISO code, for example EUR.", "text", { required: true }),
      category(["all"]),
      paymentMethod(["all"]),
      account(["all"]),
      field("destination_account", "Conto o Cassa di destinazione", "Destination account or cash register", "Obbligatorio per un trasferimento interno neutro.", "Required for a neutral internal transfer.", "catalog", { list: "accounts" }),
      field("cash_flow_direction", "Direzione di cassa", "Cash-flow direction", "Obbligatoria per i trasferimenti: entrata, uscita o neutra.", "Required for transfers: inflow, outflow, or neutral.", "enum", { requiredFor: ["transfer"], list: "cash_flow_direction" }),
      field("planned", "Pianificata", "Planned", "Indica una transazione non ancora confermata.", "Marks a transaction that is not yet confirmed.", "enum", { required: true, list: "boolean" }),
      notes,
    ],
  },
  {
    type: "investments",
    fileName: "ContaMi-template-investments-v3.xlsx",
    titleIt: "Investimenti",
    titleEn: "Investments",
    purposeIt: "Posizioni non pensionistiche, versamenti, liquidazioni e valutazioni.",
    purposeEn: "Non-pension positions, contributions, withdrawals, and valuations.",
    fields: [
      recordType("investment_record_type"),
      field("investment_key", "Chiave investimento", "Investment key", "Identificativo scelto dall’utente e ripetuto per posizione e movimenti.", "User-defined identifier repeated for the position and its movements.", "text", { required: true }),
      field("name", "Nome", "Name", "Nome della posizione.", "Position name.", "text", { requiredFor: ["position"] }),
      field("isin", "Codice ISIN", "ISIN code", "Facoltativo per la posizione: 12 caratteri ISO 6166 con cifra di controllo.", "Optional for the position: 12 ISO 6166 characters with a check digit.", "text"),
      field("investment_type", "Tipo investimento", "Investment type", "Tipologia configurata non pensionistica.", "Configured non-pension investment type.", "catalog", { requiredFor: ["position"], list: "investment_types" }),
      field("provider", "Intermediario", "Provider", "Banca, piattaforma o gestore.", "Bank, platform, or manager.", "text"),
      field("currency", "Valuta", "Currency", "Codice ISO di tre lettere.", "Three-letter ISO code.", "text", { requiredFor: ["position"] }),
      field("opened_at", "Data apertura", "Opened at", "Data di apertura della posizione.", "Position opening date.", "date", { requiredFor: ["position"] }),
      field("active", "Attivo", "Active", "Stato della posizione.", "Position status.", "enum", { requiredFor: ["position"], list: "boolean" }),
      field("closed_at", "Data chiusura", "Closed at", "Compila soltanto per posizioni chiuse.", "Fill only for closed positions.", "date"),
      field("periodic_amount", "Importo periodico", "Periodic amount", "Versamento periodico facoltativo.", "Optional periodic contribution.", "money"),
      field("periodic_frequency", "Frequenza periodica", "Periodic frequency", "Mensile o annuale per il piano periodico.", "Monthly or yearly for a periodic plan.", "enum", { list: "investment_frequency" }),
      field("periodic_next_due_date", "Prossima scadenza", "Next due date", "Prossima scadenza del piano periodico.", "Next periodic-plan due date.", "date"),
      field("periodic_category", "Categoria periodica", "Periodic category", "Categoria per le transazioni del piano.", "Category for plan transactions.", "catalog", { list: "expense_categories" }),
      field("periodic_payment_method", "Metodo periodico", "Periodic payment method", "Metodo di pagamento del piano.", "Plan payment method.", "catalog", { list: "payment_methods" }),
      field("periodic_account", "Conto o Cassa periodica", "Periodic account or cash register", "Conto o Cassa del piano periodico.", "Account or cash register used by the periodic plan.", "catalog", { list: "accounts" }),
      entryDate(["contribution", "withdrawal", "valuation"]),
      field("description", "Descrizione movimento", "Movement description", "Descrizione di versamento, liquidazione o valutazione.", "Contribution, withdrawal, or valuation description.", "text", { requiredFor: ["contribution", "withdrawal", "valuation"] }),
      amount(["contribution", "withdrawal", "valuation"]),
      category(["contribution", "withdrawal"]),
      paymentMethod(["contribution", "withdrawal"]),
      account(["contribution", "withdrawal"]),
      notes,
    ],
  },
  {
    type: "pension",
    fileName: "ContaMi-template-pension-v3.xlsx",
    titleIt: "Fondo pensione",
    titleEn: "Pension fund",
    purposeIt: "Pensioni-raccoglitore, comparti associati e relativi movimenti e valutazioni.",
    purposeEn: "Pension collectors, linked compartments, and their movements and valuations.",
    fields: [
      recordType("pension_record_type"),
      field("pension_key", "Chiave pensione", "Pension key", "Identificativo scelto dall’utente per la pensione-raccoglitore.", "User-defined identifier for the pension collector.", "text", { required: true }),
      field("compartment_key", "Chiave comparto", "Compartment key", "Identificativo del comparto, ripetuto sui relativi movimenti.", "Compartment identifier, repeated on its movements.", "text", { requiredFor: ["compartment", "contribution", "withdrawal", "valuation"] }),
      field("name", "Nome", "Name", "Nome della pensione o del comparto.", "Pension or compartment name.", "text", { requiredFor: ["pension", "compartment"] }),
      field("isin", "Codice ISIN comparto", "Compartment ISIN code", "Facoltativo per il comparto; lascia vuoto per pensione-raccoglitore e movimenti.", "Optional for the compartment; leave blank for the pension collector and movements.", "text"),
      field("provider", "Gestore", "Provider", "Gestore della pensione.", "Pension provider.", "text"),
      field("currency", "Valuta", "Currency", "Codice ISO di tre lettere.", "Three-letter ISO code.", "text", { requiredFor: ["pension", "compartment"] }),
      field("opened_at", "Data apertura", "Opened at", "Data di apertura.", "Opening date.", "date", { requiredFor: ["pension", "compartment"] }),
      field("active", "Attivo", "Active", "Stato della pensione o comparto.", "Pension or compartment status.", "enum", { requiredFor: ["pension", "compartment"], list: "boolean" }),
      field("closed_at", "Data chiusura", "Closed at", "Compila soltanto per elementi chiusi.", "Fill only for closed items.", "date"),
      field("periodic_amount", "Importo periodico", "Periodic amount", "Versamento periodico facoltativo del comparto.", "Optional compartment periodic contribution.", "money"),
      field("periodic_frequency", "Frequenza periodica", "Periodic frequency", "Mensile o annuale.", "Monthly or yearly.", "enum", { list: "investment_frequency" }),
      field("periodic_next_due_date", "Prossima scadenza", "Next due date", "Prossima data del piano.", "Next plan date.", "date"),
      field("periodic_category", "Categoria periodica", "Periodic category", "Categoria del versamento periodico.", "Periodic contribution category.", "catalog", { list: "expense_categories" }),
      field("periodic_payment_method", "Metodo periodico", "Periodic payment method", "Metodo di pagamento del piano.", "Plan payment method.", "catalog", { list: "payment_methods" }),
      field("periodic_account", "Conto o Cassa periodica", "Periodic account or cash register", "Conto o Cassa del piano periodico.", "Account or cash register used by the periodic plan.", "catalog", { list: "accounts" }),
      entryDate(["contribution", "withdrawal", "valuation"]),
      field("description", "Descrizione movimento", "Movement description", "Descrizione del movimento o della valutazione.", "Movement or valuation description.", "text", { requiredFor: ["contribution", "withdrawal", "valuation"] }),
      amount(["contribution", "withdrawal", "valuation"]),
      category(["contribution", "withdrawal"]),
      paymentMethod(["contribution", "withdrawal"]),
      account(["contribution", "withdrawal"]),
      notes,
    ],
  },
  {
    type: "shared_expenses",
    fileName: "ContaMi-template-shared-expenses-v3.xlsx",
    titleIt: "Spese condivise",
    titleEn: "Shared expenses",
    purposeIt: "Spese ripartite tra titolare e partner con transazione collegata.",
    purposeEn: "Expenses split between owner and partner with a linked transaction.",
    fields: [
      entryDate(),
      field("description", "Descrizione", "Description", "Descrizione della spesa condivisa.", "Shared-expense description.", "text", { required: true }),
      amount(),
      field("owner_share", "Quota titolare", "Owner share", "Quota del titolare.", "Owner share.", "money", { required: true }),
      field("partner_share", "Quota partner", "Partner share", "Quota del partner; le quote devono sommare all’importo.", "Partner share; both shares must add up to the amount.", "money", { required: true }),
      field("paid_by", "Pagato da", "Paid by", "Titolare o partner.", "Owner or partner.", "enum", { required: true, list: "paid_by" }),
      field("settled", "Rimborsata", "Settled", "Stato del rimborso.", "Reimbursement status.", "enum", { required: true, list: "boolean" }),
      category(["all"], "expense_categories"),
      paymentMethod(["all"]),
      account(["all"]),
      notes,
    ],
  },
  {
    type: "recurring_items",
    fileName: "ContaMi-template-recurring-items-v3.xlsx",
    titleIt: "Spese ricorrenti",
    titleEn: "Recurring items",
    purposeIt: "Abbonamenti, servizi, rate, affitti e altri impegni periodici.",
    purposeEn: "Subscriptions, services, instalments, rent, and other recurring commitments.",
    fields: [
      field("name", "Nome", "Name", "Nome dell’elemento ricorrente.", "Recurring-item name.", "text", { required: true }),
      field("kind", "Tipo", "Kind", "Tipologia dell’impegno.", "Commitment type.", "enum", { required: true, list: "recurring_kind" }),
      field("direction", "Direzione", "Direction", "Entrata o uscita.", "Income or expense.", "enum", { required: true, list: "direction" }),
      amount(),
      field("frequency", "Frequenza", "Frequency", "Frequenza dell’impegno.", "Commitment frequency.", "enum", { required: true, list: "frequency" }),
      category(["all"]),
      paymentMethod(["all"]),
      account(["all"]),
      field("next_due_date", "Prossima scadenza", "Next due date", "Prima scadenza futura da pianificare.", "First future due date to schedule.", "date", { required: true }),
      field("end_date", "Data fine", "End date", "Data finale facoltativa.", "Optional final date.", "date"),
      field("remaining_installments", "Rate residue", "Remaining instalments", "Intero non negativo, massimo 10.000.", "Non-negative integer, maximum 10,000.", "integer"),
      field("active", "Attivo", "Active", "Stato dell’elemento.", "Item status.", "enum", { required: true, list: "boolean" }),
      field("property", "Immobile collegato", "Linked property", "Collegamento facoltativo a un immobile esistente.", "Optional link to an existing property.", "catalog", { list: "properties" }),
      field("investment", "Investimento collegato", "Linked investment", "Collegamento facoltativo a un investimento esistente.", "Optional link to an existing investment.", "catalog", { list: "investments" }),
      field("vehicle", "Automobile collegata", "Linked vehicle", "Collegamento facoltativo a un’automobile esistente.", "Optional link to an existing vehicle.", "catalog", { list: "vehicles" }),
      notes,
    ],
  },
  {
    type: "vehicles",
    fileName: "ContaMi-template-vehicles-v3.xlsx",
    titleIt: "Automobile",
    titleEn: "Vehicles",
    purposeIt: "Anagrafica delle automobili e registrazioni di costi, consumi e valutazioni.",
    purposeEn: "Vehicle registry and cost, consumption, and valuation records.",
    fields: [
      recordType("vehicle_record_type"),
      field("vehicle_key", "Chiave automobile", "Vehicle key", "Identificativo scelto dall’utente e ripetuto sulle registrazioni.", "User-defined identifier repeated on vehicle records.", "text", { required: true }),
      field("name", "Nome automobile", "Vehicle name", "Nome leggibile dell’automobile.", "Readable vehicle name.", "text", { requiredFor: ["vehicle"] }),
      field("manufacturer", "Marca", "Manufacturer", "Marca del veicolo.", "Vehicle manufacturer.", "text"),
      field("model", "Modello", "Model", "Modello del veicolo.", "Vehicle model.", "text"),
      field("fuel_type", "Alimentazione", "Fuel type", "Alimentazione principale.", "Primary fuel type.", "enum", { requiredFor: ["vehicle"], list: "fuel_type" }),
      field("purchase_date", "Data acquisto", "Purchase date", "Data di acquisto facoltativa.", "Optional purchase date.", "date"),
      field("disposal_date", "Data cessione", "Disposal date", "Data di cessione facoltativa.", "Optional disposal date.", "date"),
      field("purchase_price", "Prezzo acquisto", "Purchase price", "Prezzo di acquisto.", "Purchase price.", "money"),
      field("sale_price", "Prezzo vendita", "Sale price", "Prezzo di vendita.", "Sale price.", "money"),
      field("active", "Attiva", "Active", "Stato dell’automobile.", "Vehicle status.", "enum", { requiredFor: ["vehicle"], list: "boolean" }),
      entryDate(["fuel", "installment", "tax", "insurance", "tires", "maintenance", "repair", "valuation", "other"]),
      field("description", "Descrizione", "Description", "Descrizione della registrazione.", "Record description.", "text", { requiredFor: ["fuel", "installment", "tax", "insurance", "tires", "maintenance", "repair", "valuation", "other"] }),
      amount(["fuel", "installment", "tax", "insurance", "tires", "maintenance", "repair", "valuation", "other"]),
      field("odometer_km", "Contachilometri km", "Odometer km", "Lettura non negativa del contachilometri.", "Non-negative odometer reading.", "decimal"),
      field("distance_km", "Distanza km", "Distance km", "Distanza percorsa dalla registrazione precedente.", "Distance since the previous record.", "decimal"),
      field("fuel_liters", "Carburante litri", "Fuel litres", "Litri positivi per un rifornimento.", "Positive litres for a fuel record.", "decimal"),
      field("fuel_unit_price", "Prezzo carburante/unità", "Fuel unit price", "Prezzo unitario del carburante.", "Fuel unit price.", "money"),
      field("entry_fuel_type", "Carburante registrazione", "Record fuel type", "Descrizione facoltativa del carburante.", "Optional fuel description.", "text"),
      field("vendor", "Fornitore", "Vendor", "Distributore, officina o altro fornitore.", "Fuel station, workshop, or other vendor.", "text"),
      category(["fuel", "installment", "tax", "insurance", "tires", "maintenance", "repair", "other"], "expense_categories"),
      paymentMethod(["fuel", "installment", "tax", "insurance", "tires", "maintenance", "repair", "other"]),
      account(["fuel", "installment", "tax", "insurance", "tires", "maintenance", "repair", "other"]),
      notes,
    ],
  },
];

export const IMPORT_TEMPLATE_CONTRACTS: Readonly<Record<ImportTemplateType, ImportTemplateContract>> = Object.freeze(
  Object.fromEntries(contracts.map((contract) => [contract.type, Object.freeze(contract)])) as Record<ImportTemplateType, ImportTemplateContract>,
);

export const IMPORT_TEMPLATE_TYPES = Object.freeze(contracts.map((contract) => contract.type));

export function importTemplateContract(type: ImportTemplateType): ImportTemplateContract {
  return IMPORT_TEMPLATE_CONTRACTS[type];
}

export function importTemplateContractForVersion(
  type: ImportTemplateType,
  version: ImportTemplateVersion,
): ImportTemplateContract {
  const current = IMPORT_TEMPLATE_CONTRACTS[type];
  const fields = current.fields.filter((item) => {
    if (version < 3 && item.key === "isin") return false;
    if (version < 2 && (item.key === "account" || item.key === "periodic_account" || item.key === "destination_account")) return false;
    return true;
  });
  return { ...current, fields };
}
