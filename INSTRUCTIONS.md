# Foreword

I am not an expert at writing code. At least, that is how I see myself. But neither am I someone who discovered that ChatGPT can build apps and immediately set out to have it create the must-have application everyone has wanted forever.

ContaMì grew out of a practical need. Until now, I kept track of my personal finances in a spreadsheet, which forced me to enter the same transaction repeatedly across several sheets so that I could also manage expenses shared with my family, as well as other activities that could affect more than one of the areas I monitor. To avoid all this, I decided to build an application.
I believe there are already many applications of this kind, but I wanted to be able to import my old data and, at any time, review everything in Excel or Numbers as well. So, instead of a database, I used an Excel file as the data store.

ContaMì does exactly that. It manages personal finances and minimizes data-entry time by automatically filling in all the required records.

ContaMì can manage multiple bank accounts and multiple cash registers. In addition to normal transactions, it can manage investments, pension funds, a primary residence, and any additional rental properties. It keeps track of recurring expenses as well as shared expenses, such as costs split with a partner. It also has a section that tracks vehicle expenses and, if desired, compares one vehicle with others, including previous ones, to provide useful benchmarks.

The application was built entirely with AI assistance. The interface is simple and, although it handles many different kinds of data, it offers a consistent approach to reading and entering information, reducing the time users need to learn how it works.

Is it perfect?
Let us say that it works, and I have not noticed any obvious bugs. At present, the project is maintained with builds verified locally on macOS and Windows, keeping declared support aligned with support that has actually been tested. A professional developer might find many flaws, and perhaps some vulnerability I have missed. I leave them the burden and the honor of fixing what my inexperienced eyes have failed to spot. It remains, in every sense, an app built through vibe coding.


# ContaMì — User manual

> This app was built through vibe coding with Codex CLI. It should currently be regarded as a functional alpha. It may need optimization, orphaned-code cleanup, security improvements, and much more...

## 1. What ContaMì is

ContaMì organizes detailed personal finances through a simple interface while keeping the data in a spreadsheet that remains readable without the app. It covers transactions, accounts, properties and consumption, investments and savings, recurring/installment payments, shared expenses, and yearly summaries.

The app is local-first: it requires no account, uses no cloud service, and sends no telemetry.

## 2. Requirements and installation

- 64-bit macOS or Windows;
- enough space for the app, workbook, and backups;
- Apple Numbers only if you want a native `.numbers` mirror;
- Excel is not required: ContaMì reads and writes `.xlsx` directly.

Release builds are produced by GitHub Actions without certificates and without a bundle-level ad-hoc signature. Always verify the SHA-256 checksum shipped with the release. macOS Gatekeeper or Windows SmartScreen may warn: proceed only when the file comes from the official private release.

### Unsigned macOS installation

1. Download the DMG for your processor: `arm64` for Apple Silicon or `x64` for an Intel Mac.
2. Verify its checksum, open the DMG, and drag `Contami` to **Applications**.
3. Try to open `Contami`. If macOS says it cannot verify the developer, close the warning.
4. Open **System Settings → Privacy & Security**, scroll to Security, and choose **Open Anyway** beside `Contami`.
5. Confirm with your password or Touch ID. macOS remembers the exception for future launches.

Do not disable Gatekeeper globally or run commands that broadly remove security attributes. If the checksum differs or the alert says the file is damaged, do not launch it: download it again from the official release. See [Apple’s procedure](https://support.apple.com/guide/mac-help/mh40616/mac).

The bundle and executable use the ASCII technical name `Contami` for unsigned macOS-build compatibility. The logo, window title, and UI display the **ContaMì** product name.

### Unsigned Windows installation

1. Download `Contami-…-win-x64.exe` and verify its checksum.
2. Run the installer. If SmartScreen displays **Windows protected your PC**, choose **More info**.
3. Confirm that the named file is `Contami`, then choose **Run anyway**.

Smart App Control can block an app without offering a per-app exception. In that case, do not disable it to install ContaMì: run from source with Node.js 24 LTS from 24.15.0 onward, or wait for a signed build. Keep Microsoft Defender enabled. See Microsoft guidance on [unrecognized apps](https://support.microsoft.com/en-us/office/protect-my-pc-from-viruses) and [Smart App Control](https://support.microsoft.com/windows/smart-app-control-frequently-asked-questions-285ea03d-fa88-4d56-882e-6698afdb7003).

## 3. First launch

1. Launch ContaMì: it uses Italian when the system language is Italian, otherwise English.
2. Light/dark mode follows the system.
3. From Overview choose **Create new workbook** or **Open existing workbook**.
4. Under **Settings → Account**, add the bank account; if you use cash, create one or more **Cash registers** and optionally associate each with its default funding account.
5. Review categories, payment methods, and investment types; add or adapt them to your habits.

### Excel or Numbers

- **Excel (.xlsx)**: recommended and portable across macOS and Windows.
- **Numbers (.numbers)**: macOS only and requires Numbers, including the version installed through **Apple Creator Studio**. ContaMì also keeps a `.contami.xlsx` file beside the Numbers copy; do not delete it, because it is the interoperable copy used by the app.

The format preference applies to the next workbook you create. Opening an existing `.xlsx` makes that file active.

## 4. Overview

The home page shows:

- net worth: liquidity + active property value + active investments + private pensions; beneath the total, **Excluding properties** shows the same net worth minus the property share;
- liquidity: opening balances for accounts and cash registers plus confirmed linked movements; internal transfers move value between two balances without changing the total, and movements before opening or after closure do not affect it;
- cash-register balance: the share of liquidity held across cash registers, calculated from their opening balances and confirmed movements;
- property value: latest valuation, or purchase price, multiplied by ownership share;
- investment value: latest valuation for active non-pension investments;
- pension value: latest active-compartment valuations, without double-counting their pension collector;
- current-year income and expenses;
- monthly equivalent of active recurring commitments;
- outstanding shared balance;
- monthly trend and spending categories;
- recent transactions and recent recurring expenses, limited to confirmed records through today (future or planned rows are excluded);
- three yearly comparisons: asset composition, income/expenses, and monthly commitments;
- total property-related income and expenses.

Closed-year points come from `Annual Summaries`; the current-year point is recalculated from live records. Year rollover preserves the totals required for these comparisons.

Transfers do not count as current income or expense. They may be internal and neutral for total liquidity, or carry an inflow/outflow from liquid assets. An ATM withdrawal, for example, is one Transaction from the source account to the destination cash register: the bank balance decreases and the cash-register balance increases by the same amount. Investment contributions, purchases, liquidations, and sales use their applicable cash-flow direction. Currency is recorded, but the initial version does not convert currencies automatically.

## 5. Transactions

Choose **New transaction** and enter:

- income, expense, or transfer;
- for a transfer, its cash effect (outflow, inflow, or neutral between accounts);
- date and description;
- category and payment method;
- a matching account or cash register is required for income, expenses, and cash-directed transfers; internal transfers require distinct source and destination accounts in the same currency; property, investment, and recurring-item links remain optional;
- whether an expense is shared and who paid it;
- amount, EUR currency, and optional notes.

Filter by text, type, category, payment method, and month. **Reset filters** clears every criterion together and restores the complete list. The first card row shows inflows, outflows, and balance for non-cash accounts; the second shows the same three values for cash registers only. With no active filters, each balance includes its group’s opening balances. When any filter is active, opening balances are excluded and the card shows the pure net of matching rows only; an internal account→cash-register transfer is therefore an account outflow and a cash-register inflow while remaining neutral for total liquidity. **Totals as of today** contains separate Account and Cash register rows: both always use every confirmed record from the beginning of the year through today, ignore the filters, and show inflows, outflows, and balance including their respective opening balances. A persistent notice reports current-year movements without an account or cash register. On loading an older workbook, ContaMì fills a missing reference only when exactly one compatible choice exists and never automatically reclassifies historical cash movements. Recurring rows are highlighted, while future rows are marked as planned. **Confirm** records non-rent movements directly while keeping their planned date. Rent installments instead ask for the actual receipt date and preserve the original due date separately.

Example: for groceries paid in cash, choose **Expense**, category **Groceries**, payment method **Cash**, and the affected cash register. The bank account is not changed.

Linking a transaction to a property, investment, or shared expense creates/updates the corresponding record automatically. For investments and pension compartments, an outflow transfer becomes a Contribution and an inflow transfer becomes a Liquidation. Editing, confirmation, and deletion stay synchronized to prevent double counting.

## 6. Properties

Use **New property** for name, type, use (residence, rental, or other), address, area, ownership share, cadastral value, purchase date/price, and notes. A rental can also define expected rent and due day.

Open a property and choose **New entry** for income, expense, valuation, or consumption. A valuation accepts either the total value or a per-square-metre value calculated against the property floor area. Monetary entries use the same categories and payment methods as Transactions and are mirrored there automatically; the reverse direction works too. For an Expense, select **Split automatically in half** and choose who paid to create the linked Shared Expense without re-entering the movement. This is separate from **Common expense**, which includes an item in the common property-expense summary.

Use **Utilities** for Electricity, Gas, Water, and Phone/Internet. Electricity accepts F1, F2, F3, or combined F2+F3 readings; gas and water accept cubic metres. The **Taxes** catalog starts with TV licence, IMU, and TARI but can be changed under Settings. Each tax can apply to all properties, the residence only, or rental properties only and can define 1–24 instalments. A tax can be included in the common property-expense summary through its dedicated checkbox. Separately, every cost is mirrored to Transactions and can optionally create a Shared expense between people with payer and split details.

Details can be filtered across all twelve months of the active year and by description, with matching subtotals. The **Common property expenses** summary provides the same combinable filters and recalculates its total from visible rows only. A residence shows electricity, gas, and water quantities and costs, condominium, Phone/Internet, and TV licence, plus separate yearly consumption and spending charts. Every property plots commercial values on the actual valuation dates; rentals plot income and expenses on actual receipt dates. Their **Rent instalments** table instead follows the due date/period and distinguishes Paid, Paid late, Overdue, and Awaiting payment: a June rent received in July remains assigned to June and does not settle July. Planned rent rows stay out of ordinary property entries and subtotals; if still overdue at year rollover, they retain their original due period. When adding a new rental-property income entry with the Rent category, you can also create the monthly recurring rent and link the current instalment to it.

For a rental property, the card also shows an **annual return** chart and the detail adds the **monthly percentage return** below commercial value. Monthly yield is `(confirmed rent income for the due period − confirmed property expenses) / reference commercial value`; it is not annualized. Late rent therefore remains in its due month. Planned rows and missing or zero property values do not create points. The tooltip exposes income, expenses, and the value used by the calculation; applying the same ownership share to numerator and denominator does not change the percentage.

### Owner reports

Open the property details and choose **Property report**. Select **Current year** or **Full history**, enter the two owners’ names, and choose **Print** or **Save PDF**. Names are used only in the document and are not saved to the workbook; percentages come from the property’s ownership share and its complement.

The report separates actual income and expenses, forecast expenses, projected total, and cent-reconciled owner shares. It includes annual cost trends, condominium movements and totals, electricity/gas/water costs and consumption, Phone/Internet cost, and market value. Current-year tables are monthly; full-history tables are yearly. Closed years use the aggregate actuals preserved by rollover, while the active year also shows the individual records still available. Forecasts include only planned expenses linked to the property from today through 31 December.

Printing uses the system dialog. **Save PDF** opens a native dialog and does not add the document to the workbook or its backups. The report contains financial data; store and share it with the same care as the ContaMì workbook.

## 7. Vehicles

Use **New vehicle** to record its name, make, model, fuel type, and purchase/sale dates and prices. Disposed vehicles remain available for historical comparisons.

In the same form, enable **Manage financing** and enter installment amount, frequency, next due date, remaining installments or an end date, category, payment method, and account/cash register. The vehicle and plan are saved together: ContaMì creates one linked Recurring Item and one Transaction↔Vehicle record pair classified as **Installment** for each occurrence. Repeated edits do not duplicate the plan. Use **Change rate** in the same section for future amount changes; the base rate and confirmed installments remain unchanged.

**Close** and **Reopen** act on both the vehicle and its plan, removing or regenerating planned occurrences only. A vehicle with confirmed records cannot be permanently deleted: close it to preserve its history. Disabling financing removes an unused plan or closes it while retaining confirmed installments.

**New cost / reading** records fuel, installments, road tax, insurance, tyres, routine maintenance, repairs/extraordinary maintenance, valuations, and other costs. Every cost requires date, description, category, and payment method and is mirrored to Transactions. For every non-valuation entry, select **Split automatically in half** and choose who paid: ContaMì keeps exactly one linked Vehicle entry, Transaction, and Shared Expense.

When you enter the **Odometer**, ContaMì suggests **Distance travelled** by subtracting the latest certain earlier reading for the same vehicle; at the start of a year it can use the closing odometer retained in history. The suggestion remains editable, for example after an odometer replacement. For fuel records, entering the amount and **Price per litre** automatically calculates **Litres**, which you can still adjust. **Fuel type** offers Petrol, Diesel, LPG, Methane, Electricity, and Hydrogen; choosing `—` leaves the field empty.

The dashboard shows current-year costs, fuel, and distance. Each vehicle card shows lifetime ownership costs; opening it shows the category breakdown, combinable description/month filters with a filtered total, and yearly comparison. The comparison chart places vehicle names on the horizontal axis and cost per kilometre on the vertical axis, combining detailed current-vehicle records with prior-vehicle actuals.

## 8. Investments and savings

**New investment** supports stocks, funds, savings sheets, ETFs, bonds, and other non-pension savings. Enter type, provider, opening date, optional parent/group, and an optional initial contribution with its affected account. You can also enter an optional ISIN: ContaMì trims surrounding spaces, converts it to uppercase, and checks its format and check digit without contacting external services. The initial contribution immediately establishes countervalue and creates its linked Transaction. Investments are grouped by customizable type, with a subtotal for each group.

Open an investment for its detail. Movements can be filtered together by description and month, with Contribution and Liquidation subtotals following the visible rows. **New movement** records only **Contribution** or **Liquidation**; **Update value**, also available beside **Edit investment** in the detail dialog, adds a valuation used by dashboards and net worth. Investments and movements can be edited or deleted with confirmation.

The investment card displays its countervalue in red when it is below net invested capital, calculated as confirmed Contributions minus confirmed Liquidations. Valuations and planned operations do not change that comparison capital.

The Investments page, every card, and its detail expose four lifetime values: **Initial invested capital**, **Subsequent contributions**, **Total liquidations**, and **Invested/liquidated balance**. The balance is initial capital + subsequent contributions − liquidations. ContaMì uses confirmed movements only and does not count valuations; for years closed by rollover it uses the `Investment History` annual aggregates without adding any overlapping detailed row a second time. The earliest available annual Contribution total represents initial capital when no earlier detail exists; manual corrections always count as subsequent contributions or liquidations instead.

Every leaf-position card offers **Correction**. Enter a date, choose whether to increase Contributions or Liquidations, and provide amount, description, and notes; the same dialog can add, change, or remove the position’s ISIN. The Correction and ISIN are saved together: cancellation, validation failure, or an external conflict applies neither change. The record aligns inherited data, creates no Transaction, and changes no account/cash register, liquidity, or current value. It remains visible and editable in the detail and survives year rollover. An up/down arrow beside current value compares the latest available valuation with the previous one; equal values or fewer than two observations show no arrow.

During its opening calendar year, each card contains a compact **monthly return** chart; from later years it shows the **annual return** chart. In the detail, the monthly percentage return always remains below the invested-amount/countervalue chart. Below the Investments-page summaries, a global annual chart compares **Securities**, **Funds**, and **Savings plans**: for each type, ContaMì first aggregates leaf-position values and flows and then applies the formula, without averaging individual returns. Each monthly point compares the month’s latest confirmed valuation with the previous observation and applies Modified Dietz over the actual interval between those dates. The first Contribution at opening is initial capital and is not treated as a gain or as a mid-period flow; later Contributions and Liquidations are separated from performance, while Corrections and planned rows are excluded. A month without a valuation keeps no point, but the line reaches the next available observation, whose multi-month interval is marked partial. The dashed line shows the arithmetic mean of visible returns; the tooltip stays above the plot and shows observation dates, opening value, ending value, net flows, and weighted base. Complete years geometrically link twelve covered intervals; summaries from two consecutive years instead produce a labelled **estimate** from prior and current closing values, assuming only later flows occur halfway through the period. A first year without a prior summary is calculable only when opening capital can be derived from the opening Contribution.

A Contribution/Liquidation requires the affected account and creates exactly one linked cash-outflow/inflow transfer; a Transaction assigned to an investment creates or updates that same movement and account. Editing it from Transactions shows the standard **Expense** and **Income** types and never exposes the technical **Neutral between accounts** option. The rule applies to one-off operations, initial contributions, imports, and recurring plans; confirming a planned occurrence and every later edit preserve the existing pair and its UUIDs without duplicating it. If an imported historical movement predates the opening interval of the account/cash register now carried by the workbook, its amount, description, category, or type can be corrected while retaining the original date, method, and account/cash register: capital uses the corrected value while the movement remains outside current-year liquidity. Moving it to another invalid date or association is still rejected. Countervalue starts from contributions, resets at each valuation, and then incorporates later confirmed movements; planned Transactions and Corrections change neither countervalue nor current liquidity. The **Recurring** badge appears only on Transactions explicitly linked to a recurring item. Declaring a periodic contribution requires the account and also creates or updates the Recurring Item and the year’s planned transactions.

When an existing workbook is opened, ContaMì automatically reconciles asset movements that lack a link. It uses only explicit references or exact unique matches, keeps a recoverable backup, and reports ambiguous cases without changing them.

ContaMì is a record-keeping tool. It does not provide financial advice or market prices.

## 9. Private pension

The **Private pension** section is separate from other investments and uses two levels:

- **Create pension** adds the main collector, such as **Fondo Pensione Fideuram**;
- **Create compartment** adds a position associated with an existing pension, such as **Linea Equilibrio**, **Linea Crescita**, or **Linea Valore**, with an optional ISIN; the pension collector does not require one.

The pension card totals its active compartments without duplication. The page, collector, compartment cards, and their details also show Initial invested capital, Subsequent contributions, Total liquidations, and Invested/liquidated balance; collectors sum active compartments only. Its value turns red when it is below the total net capital invested in active compartments. Every compartment card also offers Correction, which creates no Transaction and changes only those summaries, plus an arrow comparing its latest two valuations. Each compartment dialog filters records together by description and month and shows the matching subtotals. One-off and recurring real Contributions and Liquidations each keep exactly one linked Transaction with the correct cash effect. Countervalue includes confirmed movements, with each valuation establishing a new reference value; the collector aggregates those compartment series without duplication.

Monthly and annual return charts follow the same rules as investments. For a pension collector, ContaMì aggregates the values and flows of compartments applicable to each period before calculating the percentage; it never adds or arithmetically averages child returns. If compartments use different currencies and no conversion rate exists, the aggregate return is hidden while individual returns remain available.

In the workbook, pensions and compartments remain in the `Investments` table, identified by the reserved pension type and parent/child relationship. Corrections use explicit kinds in `Investment Entries`; older files migrate deterministically without changing existing columns.

## 10. Recurring items and installments

**New recurring item** covers subscriptions, services, standalone installments, rental income, and periodic investments. Enter direction, amount, frequency (including monthly or yearly one-off), category, payment method, matching account or cash register, next due date, and optional end date/installments left. A periodic investment can link to an existing investment or pension compartment, and rental income can link to its property. Vehicle financing is created from the **New/Edit vehicle** form instead.

The view shows monthly equivalent, active item count, and known installments left. Hover or keyboard-focus the **Installments left** card to see each plan name, remaining count, and next due date. Filters by name, type, and month update both totals and card details. Editing, deletion, close, and reopen are available; for a vehicle-managed plan, status and deletion remain controlled by its Vehicle card, while schedule editing and **Change rate** remain available.

To change an amount without rewriting history, open **Edit recurring item** and choose **Change rate**. Enter the new amount and effective month: ContaMì normalizes it to the first day of that month and previews how many planned occurrences will change before confirmation. You can add multiple changes and edit or cancel them until they are part of confirmed operations. For example, a synthetic base rate of €50 with a €65 change effective in October remains €50 through September and becomes €65 only for unconfirmed occurrences from October onward. The base amount, confirmed operations, UUIDs, and links remain unchanged; installment plans also retain their remaining count, next due date, and end date. The history is applied deterministically after close/reopen, schedule regeneration, and year rollover.

If an installment plan began before the current workbook, enter the first unpaid installment under **Next due date** and only the payments still due under **Installments left**, not the plan’s original total. For example, for a 12-payment plan started last year with 4 payments still due, enter the actual next due date and `4`.

For non-installment recurring items, ContaMì generates **planned** transactions through the end date or year end. For installment plans, it generates only the remaining number of payments, always within the optional end date. Confirming an installment makes it effective, reduces the remaining count, and automatically closes the recurring item after the final payment while retaining confirmed rows in history. Loading also closes any installment plan that is still active after already reaching zero, removing only its obsolete planned rows. During year rollover, the new workbook keeps the updated balance and regenerates only the installments still due in the new year. The app never executes payments.

## 11. Shared expenses

Create a shared expense in its dedicated view, select **Shared expense** on a Transaction, or choose **Split automatically in half** while entering a Property or Vehicle expense. Every route keeps exactly one record in each linked view. The default split is 50/50; the dedicated form can adjust the two shares.

- When you paid, a positive balance is owed to you by the partner.
- When the partner paid, a negative balance is what you owe.
- **Mark settled** closes one balance; **Reopen balance** makes it pending again.
- Combinable description and month filters show subtotals for visible rows only; when a month is selected it can be settled with one action.
- **Print unsettled** prepares a printable list of pending rows for the selected month.
- Editing or deleting updates the linked Transaction automatically.

## 12. Accounts, categories, methods, and taxes

Under **Settings** you can add bank or other accounts; create one or more personal, family, or business cash registers with an optional default funding account; inspect each current balance; and close or reopen them independently. You can also create, edit, and delete bilingual categories with distinct income/expense/both badges; create, edit, and delete payment methods; manage custom investment types; and create or edit property taxes with their scope and number of instalments. A usage counter is shown for catalogs. Referenced taxes can be archived and reopened but can be permanently deleted only when their usage count is zero. Other catalog items already referenced by financial history cannot be deleted, preventing orphaned records.

## 13. Excel templates for previous data

Under **Settings → Data import** you can generate and import eight `.xlsx` templates: residence, rental properties, transactions, investments, pension fund, shared expenses, recurring items, and vehicles.

Each v3 file has one visible `Dati - Data` sheet, stable technical headers, bilingual descriptions, colors distinguishing required, conditional, and optional fields, and up to 5,000 rows. Dates and amounts remain real Excel values. Closed fields provide drop-down lists; when a workbook is open, active categories, methods, accounts, cash registers, investment types, and taxes are embedded with unambiguous UUIDs. Every monetary row identifies its account or cash register; an internal transfer also identifies its destination. The Investments and Pension fund templates include an optional `isin` column; the importer continues to recognize v1 and v2 templates without inventing a missing value.

Templates can also be generated without a workbook: available system values are included without temporary UUIDs. During import, a textual reference is accepted only when it exactly and uniquely matches an active workbook item.

To import, first open the destination workbook, choose **Skip**, **Create new copies**, or **Update** for exact matches only, then select **Import completed file**. The preview shows valid and rejected rows, conflicts, planned actions, aggregate amounts, and row/column errors. No data is written until you choose **Confirm import**; closing the preview leaves the workbook unchanged. Confirmation performs one save with external-change detection and a recoverable backup.

Do not rename sheets or headers and do not add formulas, macros, external links, embedded objects, or extra sheets: these are rejected. Correct the file and preview it again when a row reports a missing or ambiguous reference. See [documents/import-template-spec.md](documents/import-template-spec.md) for the contract and [documents/import-guide.md](documents/import-guide.md) for error recovery.

## 14. Language, theme, and preferences

- **Language → Automatic**: Italian only on an Italian system, English otherwise.
- **Theme → Automatic**: follows system theme changes in real time.
- Manual Italian/English and Light/Dark overrides are immediate and persistent.
- User-authored content is never translated.

## 15. Year rollover

1. Ensure another application is not editing the workbook.
2. In **Settings**, select **Close year** and confirm.
3. Choose the next-year file location.
4. Keep and archive the prior file yourself; ContaMì never deletes or moves it.

The new workbook contains categories, methods, investment types, the complete tax catalog including archived taxes needed by history, active accounts and cash registers with closing balance as opening balance and still-valid funding associations, active properties/vehicles/investments, latest property and investment valuations, valid active recurring items with the next applicable due date and their rate histories (including changes effective in the new year), and unsettled shared expenses. A vehicle-financing recurrence is carried only together with its active vehicle. It also carries aggregate yearly history plus detailed annual actuals for each property (income, expenses, value, and utilities), investment/compartment (value, contributions, and withdrawals), and vehicle (cost categories, distance, and consumption), plus manual investment Corrections kept separately because annual actuals exclude them.

Except for manual Corrections, it does not contain prior-year individual transactions/movements, closed items, or settled shared expenses. The prior workbook remains the detailed source for that year.

## 16. Workbook and backups

Main sheets are `Overview`, `Schema`, `Categories`, `Payment Methods`, `Investment Types`, `Tax Types`, `Accounts`, `Transactions`, `Properties`, `Property Entries`, `Investments`, `Investment Entries`, `Recurring Items`, `Recurring Rate Changes`, `Shared Expenses`, `Vehicles`, `Vehicle Entries`, `Annual Summaries`, `Property History`, `Investment History`, and `Vehicle History`. Hidden `_Meta` stores schema version and active year. The current schema is v12; v1–v11 workbooks migrate on opening. Version 7 stores each cash register’s default funding account, internal-transfer source and destination, and the account/cash-register reference of linked records; version 8 adds `dueDate` to Transactions and Property Entries so due period and actual date remain separate. Migration assigns due dates automatically only to still-planned rows, whose former date is unambiguous; it does not guess the period of confirmed historical receipts. Version 9 adds rate history by recurring-item UUID, amount, and first day of the effective month. Version 10 adds explicit Contribution/Liquidation correction kinds without adding workbook columns. Version 11 adds the last observed closing date and annual return, method, coverage, and partial-period status to `Investment History`; migration leaves non-reconstructible historical results absent rather than inventing percentages. Version 12 adds the optional `isin` column to `Investments`; migration leaves it empty for existing positions. `Property History` also keeps yearly aggregated Phone/Internet and Condominium costs.

Do not rename sheets or columns if you want ContaMì to reopen the file. You may freely read, copy, and archive it.

Before passing a file to the Excel parser, ContaMì checks its ZIP structure without expanding its contents. A workbook may contain at most 4,096 entries; its central directory may not exceed 4 MiB, one expanded entry 128 MiB, or all expanded entries 256 MiB; the maximum expanded-to-compressed ratio is 200:1. Entry names are limited to 1,024 bytes, extra fields to 16 KiB, and comments to 4 KiB. The 250 MiB file limit and post-open schema limits also remain in force.

Truncated, encrypted, or ZIP64 archives, duplicate or overlapping entries, abnormal paths, inconsistent local/central metadata, unsupported compression, nested archives, macros, ActiveX, embedded objects, and external links are rejected before parsing. Rejection does not modify the file, and its message contains no path or financial content.

Before replacing an existing workbook, ContaMì creates a backup in the adjacent hidden `.contami-backups` folder and retains the latest 10. It first writes and verifies a temporary file, then replaces the active file. A backup is accepted only when its SHA-256 fingerprint matches the loaded revision.

On opening and after every save, ContaMì captures the workbook’s size, modification time, and SHA-256 fingerprint. It checks them twice before commit, with the final check immediately after backup; even an external edit that preserves size and timestamp blocks the save. During this phase, a small cooperative lock with random identifiers and a five-minute expiry is created beside the workbook; it contains no path or financial data. Two overlapping ContaMì saves therefore cannot both replace the same revision. Excel and Numbers do not honor this lock, so continue to avoid concurrent edits.

If a manual edit creates duplicate UUIDs in workbook tables, ContaMì keeps the first occurrence and assigns new UUIDs to later occurrences when the file is reopened. No row or financial information is deleted, and unambiguous links are realigned. The repair changes only the required cells, is verified before replacement, and preserves the previous version in `.contami-backups`. The app displays a notice after performing this repair.

## 17. Troubleshooting

### The configured file was moved or deleted

ContaMì still opens and returns to the **Not configured** state without creating a replacement automatically. Use **Open existing workbook** to select its new location or **Create new workbook**. The stale path is removed from preferences; existing backups are not deleted.

### “Another app changed the workbook”

Close Excel/Numbers and use **Open existing workbook** to reload the on-disk version. ContaMì blocks the save instead of overwriting external changes.

### Active or expired save lock

An active lock means another ContaMì operation is completing its commit; wait and try again. If a crash leaves the lock expired, ContaMì asks for confirmation on the next attempt before removing only the lock file and retrying the operation. Confirm only after closing other instances or copies of the app; the workbook and backups are not deleted. Do not manually remove an active lock.

### Numbers mirror is not updating

The `.xlsx` sidecar is already safe. Close Numbers windows and confirm Numbers is installed, including as `/Applications/Numbers Creator Studio.app`; ContaMì identifies it through Apple bundle id `com.apple.Numbers`. Retry without deleting the sidecar.

### Invalid or oversized file

ContaMì accepts only ContaMì-schema `.xlsx` files up to 250 MiB whose ZIP structure stays within the limits above. If the message reports an unsafe structure, verify the file’s source and do not bypass the check; if it reports an opening limit, use a smaller valid copy. In both cases the file remains unchanged and the app returns to **Not configured** without saving empty data over the rejected file. The remembered path stays in preferences for diagnosis: select the correct workbook or restore a copy from `.contami-backups`.

### Preferences reset to Automatic

The local settings file may be missing or invalid. Financial data remains in the workbook; reopen it and choose preferences again.

### Unexpected dashboard value

Check transaction account links, recent valuations, active/closed state, workbook year, and consistent currency usage.

## 18. Security and limitations

- Protect workbooks with operating-system permissions, FileVault/BitLocker, and encrypted backups when appropriate.
- ContaMì does not encrypt workbooks or manage spreadsheet passwords.
- Do not place sensitive workbooks in cloud-synced folders unless you accept that provider’s terms.
- The renderer uses a strict CSP: production accepts only local scripts and stylesheets, rejects style attributes and connections, and keeps network access blocked.
- Unsigned builds can trigger operating-system warnings.
- Native Numbers mirroring depends on Apple automation and may require macOS consent.

See [SECURITY_MODEL.md](SECURITY_MODEL.md) for technical controls and residual risks.

## 19. Updates and removal

Close ContaMì and keep a workbook copy before updating, then install the new release over the old one.

To remove the app on macOS, close ContaMì and move `Contami` from **Applications** to the Trash. On Windows open **Settings → Apps → Installed apps**, find `Contami`, and choose **Uninstall**. Removing the app does not delete user-selected workbooks or `.contami-backups`; they stay in their folders and should be removed only manually after reviewing their contents.
