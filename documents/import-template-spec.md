# ContaMì — Contratti template di importazione / Import template contracts

Versione formato / Format version: **3** · Applicazione / Application: **1.19.0**

Questo documento specifica i file `.xlsx` v3 generati e importati da **Impostazioni → Importazione dati**. La v2 ha reso espliciti conto o Cassa su ogni registrazione monetaria e la destinazione dei trasferimenti interni; la v3 aggiunge l’ISIN facoltativo alle posizioni di investimento e ai comparti pensione.

This document specifies the v3 `.xlsx` files generated and imported under **Settings → Data import**. Version 2 made the account or cash register explicit on every monetary record and added the destination of internal transfers; version 3 adds an optional ISIN to investment positions and pension compartments.

## Struttura comune / Common structure

- Un solo foglio visibile, `Dati - Data`, con titolo e istruzioni bilingui nelle righe 1–3, descrizioni delle colonne alla riga 4, intestazioni tecniche stabili alla riga 5 e dati dalla riga 6.
- One visible `Dati - Data` sheet with a bilingual title/instructions in rows 1–3, column descriptions in row 4, stable technical headers in row 5, and data starting in row 6.
- Le intestazioni tecniche sono ASCII `snake_case` e non devono essere rinominate. Ogni template accetta fino a 5.000 righe.
- Technical headers are ASCII `snake_case` and must not be renamed. Each template accepts up to 5,000 rows.
- Giallo indica campi sempre obbligatori, verde chiaro campi obbligatori soltanto per alcuni `record_type`, grigio campi opzionali.
- Yellow marks always-required fields, pale green marks fields required only for selected `record_type` values, and grey marks optional fields.
- Date come vere date Excel visualizzate `yyyy-mm-dd`; importi e quantità come numeri, mai come stringhe preformattate.
- Dates are real Excel dates displayed as `yyyy-mm-dd`; amounts and quantities are numbers, never preformatted strings.
- I menu a discesa usano intervalli denominati su `_Lists`. I valori chiusi sono bilingui e versionati; i cataloghi del workbook mostrano l’UUID tra parentesi quadre per evitare ambiguità.
- Drop-downs use named ranges on `_Lists`. Closed values are bilingual and versioned; workbook catalog values show their UUID in square brackets to avoid ambiguity.
- `_Meta` e `_Lists` sono `veryHidden` e protetti. `_Meta` contiene firma, versione, tipo, righe strutturali, limite e modalità catalogo.
- `_Meta` and `_Lists` are protected and `veryHidden`. `_Meta` stores signature, version, type, structural rows, limit, and catalog mode.
- Non sono presenti macro, formule di cella, collegamenti esterni o contenuto attivo. Le formule delle convalide dati puntano soltanto a intervalli denominati interni.
- No macros, cell formulas, external links, or active content are present. Data-validation formulas refer only to internal named ranges.

Quando un workbook è aperto, i cataloghi attivi vengono copiati nel template come istantanea `workbook_snapshot`. Senza workbook, il file usa `system_defaults` e omette UUID instabili; durante l’importazione un nome viene accettato soltanto se corrisponde in modo esatto e univoco a un elemento attivo.

When a workbook is open, active catalogs are copied into the template as a `workbook_snapshot`. Without a workbook, the file uses `system_defaults` and omits unstable UUIDs; during import, a name is accepted only when it exactly and uniquely matches an active item.

## Token chiusi / Closed tokens

I menu mostrano token bilingui stabili come `income | entrata`, `expense | uscita`, `true | vero` e `false | falso`. Il testo completo, incluso il separatore ` | `, appartiene al contratto v3.

Drop-downs show stable bilingual tokens such as `income | entrata`, `expense | uscita`, `true | vero`, and `false | falso`. The full text, including the ` | ` separator, is part of the v3 contract.

## 1. Immobile di residenza / Residence property

File: `ContaMi-template-residence-v3.xlsx`

`record_type`: `property`, `valuation`, `income`, `expense`, `utility`, `tax`.

- Sempre obbligatorie / Always required: `record_type`, `property_key`.
- Anagrafica / Registry: `name`, `property_kind`, `address`, `area_sqm`, `ownership_share`, `cadastral_value`, `purchase_date`, `purchase_price`, `active`, `closed_at`.
- Registrazioni / Records: `date`, `description`, `amount`, `category`, `payment_method`, `account`.
- Utenze / Utilities: `utility_type`, `quantity`, `unit`, `electricity_kwh_f1`, `electricity_kwh_f2`, `electricity_kwh_f3`, `electricity_kwh_f23`.
- Tasse e condivisione / Taxes and sharing: `tax_type`, `installment_number`, `is_common_expense`, `shared`, `owner_share`, `partner_share`, `paid_by`, `settled`.
- Facoltativa / Optional: `notes`.

`property_key` è una chiave scelta dall’utente e ripetuta su tutte le righe della stessa residenza. / `property_key` is user-defined and repeated on every row for the same residence.

## 2. Immobili in affitto / Rental properties

File: `ContaMi-template-rental-properties-v3.xlsx`

Stesse colonne e `record_type` della residenza, più `expected_monthly_rent` e `rent_due_day`. Più immobili possono convivere nello stesso file usando `property_key` distinte.

Same columns and `record_type` values as the residence template, plus `expected_monthly_rent` and `rent_due_day`. Multiple properties can share one file through distinct `property_key` values.

## 3. Transazioni / Transactions

File: `ContaMi-template-transactions-v3.xlsx`

- Obbligatorie / Required: `date`, `description`, `kind`, `amount`, `currency`, `category`, `payment_method`, `account`, `planned`.
- Facoltative o condizionali / Optional or conditional: `destination_account`, `cash_flow_direction`, `notes`.

`kind`: `income`, `expense`, `transfer`. `cash_flow_direction` è obbligatoria per un trasferimento e vale `inflow`, `outflow` o `neutral`; per un trasferimento interno `neutral`, `destination_account` è obbligatorio e deve essere diverso da `account`.

`kind`: `income`, `expense`, `transfer`. `cash_flow_direction` is required for a transfer and is `inflow`, `outflow`, or `neutral`; an internal `neutral` transfer requires a `destination_account` different from `account`.

## 4. Investimenti / Investments

File: `ContaMi-template-investments-v3.xlsx`

`record_type`: `position`, `contribution`, `withdrawal`, `valuation`.

- Sempre obbligatorie / Always required: `record_type`, `investment_key`.
- Posizione / Position: `name`, `isin`, `investment_type`, `provider`, `currency`, `opened_at`, `active`, `closed_at`.
- Piano periodico / Recurring plan: `periodic_amount`, `periodic_frequency`, `periodic_next_due_date`, `periodic_category`, `periodic_payment_method`, `periodic_account`.
- Movimenti / Movements: `date`, `description`, `amount`, `category`, `payment_method`, `account`.
- Facoltative / Optional: `isin`, `notes`.

`investment_key` lega movimenti e valutazioni alla posizione senza richiedere un UUID ContaMì preesistente.

`investment_key` links movements and valuations to the position without requiring an existing ContaMì UUID.

`isin` è facoltativo e viene letto soltanto sulle righe `position`. Spazi esterni e minuscole vengono normalizzati; lunghezza, struttura ISO 6166 e cifra di controllo devono essere valide. Duplicati ammessi non determinano l’identità di importazione. / `isin` is optional and read only from `position` rows. Surrounding spaces and lowercase letters are normalized; length, ISO 6166 structure, and check digit must be valid. Allowed duplicates do not determine import identity.

## 5. Fondo pensione / Pension fund

File: `ContaMi-template-pension-v3.xlsx`

`record_type`: `pension`, `compartment`, `contribution`, `withdrawal`, `valuation`.

- Sempre obbligatorie / Always required: `record_type`, `pension_key`.
- Gerarchia / Hierarchy: `compartment_key`, `name`, `isin`, `provider`, `currency`, `opened_at`, `active`, `closed_at`.
- Piano periodico / Recurring plan: `periodic_amount`, `periodic_frequency`, `periodic_next_due_date`, `periodic_category`, `periodic_payment_method`, `periodic_account`.
- Movimenti / Movements: `date`, `description`, `amount`, `category`, `payment_method`, `account`.
- Facoltative / Optional: `isin`, `notes`.

`pension_key` identifica il raccoglitore; `compartment_key` identifica il comparto ed è ripetuta sui suoi movimenti.

`pension_key` identifies the collector; `compartment_key` identifies the compartment and is repeated on its movements.

`isin` è letto soltanto sulle righe `compartment`; resta vuoto per il raccoglitore `pension` e per i movimenti. / `isin` is read only from `compartment` rows; it remains blank for the `pension` collector and movement rows.

## 6. Spese condivise / Shared expenses

File: `ContaMi-template-shared-expenses-v3.xlsx`

- Obbligatorie / Required: `date`, `description`, `amount`, `owner_share`, `partner_share`, `paid_by`, `settled`, `category`, `payment_method`, `account`.
- Facoltativa / Optional: `notes`.

`owner_share + partner_share` deve coincidere con `amount` al centesimo. La futura importazione creerà una sola Transazione collegata.

`owner_share + partner_share` must equal `amount` to the cent. Future import will create one linked Transaction.

## 7. Spese ricorrenti / Recurring items

File: `ContaMi-template-recurring-items-v3.xlsx`

- Obbligatorie / Required: `name`, `kind`, `direction`, `amount`, `frequency`, `category`, `payment_method`, `account`, `next_due_date`, `active`.
- Facoltative / Optional: `end_date`, `remaining_installments`, `property`, `investment`, `vehicle`, `notes`.

`kind`: `subscription`, `service`, `installment`, `investment`, `rent`, `other`. I collegamenti facoltativi usano soltanto cataloghi già presenti nel workbook.

Quando `vehicle` è valorizzato, `kind` deve essere `installment`, `direction` deve essere `expense` e occorre indicare almeno `remaining_installments` o `end_date`. Il nome viene sincronizzato con quello dell’automobile e l’importazione è rifiutata se esiste già un altro piano attivo collegato allo stesso mezzo.

`kind`: `subscription`, `service`, `installment`, `investment`, `rent`, `other`. Optional links use catalogs already present in the workbook.

When `vehicle` is set, `kind` must be `installment`, `direction` must be `expense`, and either `remaining_installments` or `end_date` is required. The name is synchronized with the Vehicle, and import is rejected when another active plan already links to the same vehicle.

## 8. Automobile / Vehicles

File: `ContaMi-template-vehicles-v3.xlsx`

`record_type`: `vehicle`, `fuel`, `installment`, `tax`, `insurance`, `tires`, `maintenance`, `repair`, `valuation`, `other`.

- Sempre obbligatorie / Always required: `record_type`, `vehicle_key`.
- Anagrafica / Registry: `name`, `manufacturer`, `model`, `fuel_type`, `purchase_date`, `disposal_date`, `purchase_price`, `sale_price`, `active`.
- Registrazioni / Records: `date`, `description`, `amount`, `odometer_km`, `distance_km`, `fuel_liters`, `fuel_unit_price`, `entry_fuel_type`, `vendor`, `category`, `payment_method`, `account`.
- Facoltativa / Optional: `notes`.

`vehicle_key` collega costi, rifornimenti e valutazioni all’automobile senza richiedere un UUID ContaMì.

`vehicle_key` links costs, refuelling, and valuations to the vehicle without requiring a ContaMì UUID.

## Compatibilità e modifica / Compatibility and editing

I file sono `.xlsx` passivi e possono essere compilati in Excel, LibreOffice o Numbers per quanto ciascun programma conserva convalide, intervalli denominati e fogli `veryHidden`. Non rinominare il foglio visibile, le intestazioni o i fogli tecnici; non aggiungere macro, formule, collegamenti esterni o altri fogli.

L’importatore riconosce i contratti v1, v2 e v3 tramite versione e intestazioni esatte. I template v1 non contengono `account`, `periodic_account` o `destination_account`: per le righe compatibili ContaMì assegna il conto soltanto quando ne esiste uno solo coerente con metodo, valuta e data; in caso contrario l’importazione viene rifiutata senza scritture. I template v1/v2 non contengono `isin` e non ne inventano alcuno. Per usufruire di tutti i campi genera un nuovo template v3 dall’app.

Files are passive `.xlsx` workbooks and can be filled in Excel, LibreOffice, or Numbers to the extent each program preserves validations, named ranges, and `veryHidden` sheets. Do not rename the visible sheet, headers, or technical sheets; do not add macros, formulas, external links, or extra sheets.

The importer recognizes v1, v2, and v3 contracts through exact version and header matching. Version 1 templates have no `account`, `periodic_account`, or `destination_account`: for compatible rows ContaMì assigns an account only when exactly one matches method, currency, and date; otherwise import is rejected without writes. Version 1/2 templates have no `isin` and do not invent one. Generate a new v3 template in the app to use every field.
