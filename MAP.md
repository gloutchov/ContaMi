# ContaMì — Mappa del repository / Repository map

## Mappa ASCII / ASCII map

```text
ContaMì/
├── .github/
│   ├── dependabot.yml                 # aggiornamenti dipendenze / dependency updates
│   └── workflows/
│       ├── ci.yml                     # qualità macOS + Windows / cross-platform quality
│       └── release.yml                # pacchetti, checksum e release / packages and release
├── assets/
│   ├── icon.ico                       # icona Windows / Windows icon
│   ├── icon.png                       # icona RGBA canonica per macOS, UI e landing
│   └── logo.png                       # logo GitHub e riferimento visivo / brand logo
├── docs/
│   ├── assets/                        # copia icona canonica, screenshot sintetici e demo MP4 IT/EN
│   ├── app.js                         # lingua, override, link manuale localizzato e media tema/lingua
│   ├── index.html                     # landing statica, CTA GitHub/manuale e CSP senza dipendenze remote
│   ├── styles.css                     # layout editoriale responsive, chiaro/scuro e reduced motion
│   └── .nojekyll                      # pubblicazione statica GitHub Pages da main + /docs
├── documents/
│   ├── import-template-spec.md        # contratti versionati degli otto template Excel
│   ├── import-guide.md                # compilazione, anteprima, errori e recupero IT/EN
│   ├── return-formulas.md             # formule, copertura e limiti dei rendimenti IT/EN
│   ├── reference-analysis.md          # analisi priva di PII del Numbers sorgente
│   └── landing-maintenance.md         # manutenzione e rigenerazione sicura dei media
├── scripts/
│   ├── build-electron.mjs             # build separata main + preload
│   ├── check-node-baseline.mjs         # coerenza baseline Node, dipendenze, CI e documentazione
│   ├── validate-renderer-csp.mjs       # CSP prod, assenza style inline e verifica app.asar
│   ├── serve-landing.mjs                # preview HTTP locale limitata alla sola landing
│   ├── validate-landing.mjs             # i18n, asset, CSP, percorsi Pages e budget media
│   ├── after-pack.mjs                  # chiude eccezioni di rete nel bundle macOS
│   ├── check-required-docs.mjs         # controllo documenti e file privati
│   ├── generate-demo-workbook.ts       # workbook sintetico per QA, mai dati reali
│   ├── inspect-packaged.mjs             # ispezione app.asar e assenza contenuti privati
│   ├── numbers-mirror.applescript      # import xlsx in Numbers su macOS
│   ├── smoke-packaged.mjs              # avvio controllato del pacchetto unpacked macOS/Windows
│   └── smoke-installed.mjs             # installazione, avvio e rimozione DMG/NSIS in area temporanea
├── sources/                            # input privati locali, esclusi da Git/build
├── src/
│   ├── config/
│   │   ├── appConfig.ts                # limiti e parametri applicativi centrali
│   │   └── rendererCsp.ts              # direttive CSP separate sviluppo/produzione
│   ├── domain/
│   │   ├── accounts.ts                # saldi di conti/Casse, compatibilità metodi e trasferimenti interni
│   │   ├── catalogDefaults.ts          # tipi investimento e tasse iniziali / default investment and tax types
│   │   ├── catalogUsage.ts             # conteggio riferimenti per cataloghi / catalog usage counts
│   │   ├── annualHistory.ts            # consuntivi annuali dettagliati per immobili, investimenti e veicoli
│   │   ├── assetReturns.ts              # Modified Dietz, rendimento locativo, copertura e portafogli aggregati puri
│   │   ├── commands.ts                 # comandi validati, inclusi bundle atomici per condivisione e ISIN/Correzione
│   │   ├── finance.ts                  # aggregazioni, KPI incluso patrimonio senza immobili, saldi Conto/Cassa e comandi
│   │   ├── investments.ts              # classificazione, correzioni, trend e aggregazioni investimenti/pensioni
│   │   ├── isin.ts                     # normalizzazione e validazione locale ISO 6166 con cifra di controllo
│   │   ├── investmentTransactionSync.ts # coppie movimento/Transazione e riconciliazione idempotente
│   │   ├── importTemplates.ts           # contratti versionati e liste chiuse dei template di importazione
│   │   ├── imports.ts                   # strategie, anteprima e piano import tipizzati
│   │   ├── linkedRecords.ts            # sincronizzazione bidirezionale, divisione condivisa e ciclo di vita delle rate
│   │   ├── operationalDataRepair.ts     # riparazione conservativa conti mancanti e piani rateali conclusi
│   │   ├── propertyMetrics.ts          # classificazione utenze/condominio per immobili
│   │   ├── propertyReport.ts           # aggregazioni mensili/annuali, previsioni e quote dei report immobili
│   │   ├── rent.ts                     # stato rate affitto da competenza e incasso effettivo
│   │   ├── recurringRates.ts           # tariffa per decorrenza, anteprima e protezione dello storico
│   │   ├── vehicleEntries.ts           # lettura precedente, percorrenza e litri suggeriti per le registrazioni Automobile
│   │   ├── vehicleInstallments.ts      # unicità, ciclo di vita e protezione dello storico dei finanziamenti auto
│   │   ├── migrations.ts               # migrazione workbook v1–v11 → v12, inclusi rendimenti e ISIN opzionale
│   │   ├── models.ts                   # schema Zod v12 e modello finanziario
│   │   ├── uuidRepair.ts               # unicità UUID e riallineamento conservativo dei collegamenti
│   │   └── rollover.ts                 # passaggio d’anno, rendimenti conservati, rate residue e affitti insoluti
│   ├── infrastructure/
│   │   ├── pdf/
│   │   │   └── PropertyReportDocument.ts # documento HTML/CSS locale e vettoriale per stampa/PDF
│   │   ├── settings/
│   │   │   └── SettingsService.ts      # preferenze locali atomiche
│   │   └── spreadsheet/
│   │       ├── ExcelImportTemplateGenerator.ts # template xlsx passivi, validati e riletti
│   │       ├── ExcelImportTemplateParser.ts # parser, riferimenti e piani per gli otto template
│   │       ├── ExcelWorkbookRepository.ts # lettura/scrittura, commit protetto, backup e verifica xlsx
│   │       ├── NumbersMirrorService.ts # adattatore nativo macOS isolato
│   │       ├── WorkbookLockManager.ts # lock cooperativo limitato, lease e recupero esplicito
│   │       ├── WorkbookRevisionGuard.ts # revisioni SHA-256 e conflitti con modifiche esterne
│   │       ├── XlsxZipPreflight.ts      # parser preventivo ZIP a lettura limitata e policy condivise
│   │       ├── XlsxWorkbookPreflight.ts # limiti e contenuto ammesso del workbook autorevole
│   │       ├── XlsxImportPreflight.ts   # policy ZIP più stretta per i template compilati
│   │       └── workbookSchema.ts       # fogli, colonne e versione schema
│   ├── main/
│   │   ├── index.ts                    # processo privilegiato Electron e hardening
│   │   ├── ipc/registerIpc.ts          # allowlist IPC e validazione confini
│   │   └── services/
│   │       ├── FinanceFileService.ts    # casi d’uso file, save e rollover
│   │       ├── ImportDataService.ts      # dialogo, anteprima opaca, conferma e scadenza
│   │       ├── ImportTemplateService.ts # dialogo nativo e generazione template isolata
│   │       └── PropertyReportService.ts # stampa/PDF locale, dialogo nativo e scrittura verificata
│   ├── preload/
│   │   └── index.ts                    # bridge minimo e congelato verso la UI
│   ├── renderer/
│   │   ├── components/                 # shell, KPI, modali, dettagli, grafici storici e stati vuoti
│   │   │   ├── EntryFilters.tsx        # filtri condivisi descrizione/mese con reset accessibile
│   │   │   ├── HistoryChart.tsx        # grafici SVG responsive, gap configurabili, media e tooltip sopra/overlay, senza style
│   │   │   ├── ReturnChart.tsx         # rendimenti mensili/annuali, linea continua, media e dettaglio componenti
│   │   │   ├── AnnualReturnComparisonChart.tsx # confronto annuale multi-serie per tipologia
│   │   │   ├── ImportPreviewDialog.tsx # riepilogo, diagnostica e conferma accessibile
│   │   │   ├── IsinField.tsx            # textbox ISIN bilingue con errore accessibile e normalizzazione
│   │   │   ├── InvestmentMovementSummary.tsx # quattro KPI/fatti e freccia di tendenza riusati da investimenti e pensioni
│   │   │   ├── PaymentAccountField.tsx # selezione coerente di conto o Cassa per metodo
│   │   │   ├── PropertyReportDialog.tsx # periodo e nomi effimeri dei proprietari, stampa/salvataggio
│   │   │   ├── RecurringRateChangesEditor.tsx # cronologia, anteprima e conferma tariffa
│   │   │   └── TrendBars.tsx           # barre SVG proporzionali compatibili con CSP rigorosa
│   │   ├── forms/                      # moduli di inserimento per ogni dominio
│   │   │   ├── AccountForm.tsx     # conti ordinari e Casse con alimentazione predefinita
│   │   │   ├── InvestmentForms.tsx  # investimenti non pensionistici e movimenti
│   │   │   ├── InvestmentCorrectionForm.tsx # correzioni senza Transazione per posizioni e comparti
│   │   │   ├── PensionForms.tsx     # pensioni-raccoglitore e comparti associati
│   │   │   ├── PropertyForms.tsx   # immobili e registrazioni generiche, incluse spese condivise automatiche
│   │   │   ├── PropertyExpenseForms.tsx # utenze/tasse, consumi e quote condivise
│   │   │   ├── CatalogForms.tsx     # categorie, metodi, tipi investimento e tasse configurabili
│   │   │   └── VehicleForms.tsx     # anagrafica automobile e costi/consumi
│   │   ├── i18n/                       # dizionari IT/EN e provider lingua
│   │   ├── services/api.ts             # bridge reale + demo locale di sviluppo
│   │   ├── theme/ThemeProvider.tsx     # tema sistema/chiaro/scuro reattivo
│   │   ├── utils/                      # formati, liste as-of-today, indicatori e serie storiche
│   │   │   ├── detailFilters.ts        # logica pura condivisa per descrizione, mese e opzioni annuali
│   │   │   ├── investmentHistory.ts    # tutte le osservazioni di investito/controvalore, inclusi i raccoglitori pensione
│   │   │   ├── investmentReturnPresentation.ts # scelta mensile/annuale delle card per anno di apertura
│   │   │   ├── overviewTransactions.ts # recenti confermati / confirmed recent records
│   │   │   ├── propertyHistory.ts      # serie, mesi e filtri delle registrazioni immobiliari
│   │   │   ├── propertyIndicators.ts   # indicatori residenza / residence indicators
│   │   │   └── vehicleHistory.ts       # serie annuali, vita intera e confronto costo/km per vettura
│   │   ├── views/                      # dashboard e liste tematiche lazy-loaded
│   │   │   ├── OverviewView.tsx     # patrimonio totale/al netto immobili, liquidità e saldo Casse
│   │   │   ├── TransactionsView.tsx # saldi filtrati puri e riepiloghi ad oggi separati tra conti e Casse
│   │   │   ├── InvestmentsView.tsx  # portafoglio, riepiloghi e confronto rendimenti Titoli/Fondi/Fogli
│   │   │   ├── PensionsView.tsx     # pensioni/comparti con quattro riepiloghi aggregati, dettagli e CRUD
│   │   │   └── VehiclesView.tsx     # dashboard automobili, confronto e registrazioni
│   │   ├── App.tsx                     # orchestrazione UI e stato applicativo
│   │   ├── main.tsx                    # entry point React
│   │   ├── linked-workflows.css        # filtri, badge, dettagli e stampa
│   │   └── styles.css                  # design system ContaMì responsive
│   ├── shared/
│   │   ├── contracts.ts                # contratti tipizzati main/preload/renderer
│   │   ├── ipc.ts                      # nomi canali IPC consentiti
│   │   ├── ipcValidation.ts            # tuple e limiti degli argomenti IPC
│   │   └── propertyReportContracts.ts  # richiesta/report result validati e testi documento IT/EN
│   └── test/setup.ts                   # ambiente comune Vitest
├── tests/
│   ├── helpers/
│   │   └── syntheticZip.ts             # corpus ZIP sintetico, mai workbook privati
│   ├── e2e/
│   │   ├── accessibility.spec.ts       # IT/EN, chiaro/scuro, focus e layout a 1080 px
│   │   ├── cash-registers.spec.ts      # Casse, trasferimenti, KPI separati e indicatori di perdita
│   │   ├── property-reports.spec.ts    # report immobili IT/EN, chiaro/scuro, periodo e azioni
│   │   ├── shared-linked-entries.spec.ts # spese Immobili/Automobile divise a metà e record collegati
│   │   └── vehicle-installments.spec.ts # creazione, modifica e riapertura finanziamento Automobile
│   ├── landing/
│   │   └── landing.spec.ts             # IT/EN, temi, demo video, focus e mobile della landing
│   ├── integration/
│   │   ├── finance-file-service.test.ts # recupero avvio e copia report con revisione verificata
│   │   ├── import-template-generator.test.ts # struttura, liste e limite dei template
│   │   ├── import-template-parser.test.ts # otto import v3, compatibilità v1/v2, ISIN, sicurezza e duplicati
│   │   ├── import-data-service.test.ts # anteprima/annullamento/conferma senza percorsi
│   │   ├── import-template-service.test.ts # dialogo e mancata esposizione del percorso
│   │   ├── property-report-service.test.ts # dialogo, stampa/PDF, verifica e percorso redatto
│   │   ├── revision-guard.test.ts      # hash e blocco modifiche concorrenti
│   │   ├── settings.test.ts            # preferenze validate e atomiche
│   │   ├── workbook-preflight.test.ts  # rifiuto prima di ExcelJS e compatibilità v1/v2
│   │   ├── workbook-lock.test.ts       # lock attivo/scaduto e recupero dopo crash
│   │   ├── workbook-save-integrity.test.ts # writer sovrapposti e gara pre-rename
│   │   └── workbook.test.ts            # round-trip e schema leggibile
│   └── unit/
│       ├── accounts.test.ts             # saldi Casse, trasferimenti interni e vincoli metodo
│       ├── finance.test.ts              # comandi e KPI finanziari
│       ├── detailFilters.test.tsx       # combinazione/reset dei filtri condivisi IT/EN
│       ├── dialogAccessibility.test.tsx # focus trap, ripristino focus e nomi accessibili
│       ├── ipcValidation.test.ts         # payload e arità dei canali privilegiati
│       ├── performance.test.ts           # budget dashboard su dataset sintetico ampio
│       ├── propertyReport.test.ts         # periodi, quote, previsioni, limiti, HTML ed escaping
│       ├── propertyReportDialog.test.tsx  # dialogo bilingue, azioni e stati disabilitati
│       ├── annualHistory.test.ts        # aggregati utenze e automobili
│       ├── assetReturns.test.ts         # formule, copertura, flussi, aggregati, valute e affitti sintetici
│       ├── returnCharts.test.tsx        # periodo card, confronto multi-serie e tooltip accessibile
│       ├── catalogUsage.test.ts         # conteggi uso categorie/metodi e protezione riferimenti
│       ├── historyViews.test.ts          # filtri immobili, serie investimenti e totali vetture
│       ├── strictCsp.test.tsx            # policy prod/dev, scanner e grafici SVG dinamici
│       ├── investments.test.ts          # separazione pensioni, aggregati e vincoli raccoglitore
│       ├── isin.test.ts                 # formato/check digit, atomicità, duplicati e rollover ISIN
│       ├── investmentTransactionSync.test.ts # sincronizzazione, riparazione e casi ambigui
│       ├── importTemplates.test.ts       # contratti e chiavi gerarchiche degli otto template
│       ├── import-preview-dialog.test.tsx # riepilogo IT/EN e conferma accessibile
│       ├── taxTypes.test.ts              # CRUD, archiviazione e vincoli del catalogo tasse
│       ├── linkedRecords.test.ts         # collegamenti, limiti e chiusura delle ricorrenze
│       ├── migrations.test.ts            # compatibilità schema v1–v11 → v12 e idempotenza
│       ├── recurringRates.test.ts        # decorrenze, storico, collegamenti e rollover tariffario
│       ├── vehicleEntries.test.ts         # contachilometri precedente, distanza e litri calcolati
│       ├── vehicleInstallments.test.ts   # comando atomico, unicità, classificazione e ciclo di vita rate auto
│       ├── xlsxZipPreflight.test.ts      # limiti, mutazioni seeded e casi ZIP ostili
│       ├── overviewTransactions.test.ts  # liste recenti alla data odierna / as-of-today lists
│       ├── propertyIndicators.test.ts    # indicatori residenza bilingui / bilingual residence indicators
│       ├── uuidRepair.test.ts             # collisioni UUID e collegamenti conservati
│       └── rollover.test.ts             # nuovo anno, riconciliazione e rate a cavallo d’anno
├── AGENTS.md                            # regole per agenti e maintainer
├── .node-version                        # baseline Node.js unica per locale e GitHub Actions
├── INSTRUCTIONS.md                     # manuale utente inglese
├── ISTRUZIONI.md                       # manuale utente italiano
├── LICENSE                              # Apache License 2.0
├── MAP.md                               # questo documento / this document
├── PLAN.md                              # milestone, branch e criteri
├── QUICK-START_Desktop.md               # avvio rapido bilingue
├── README.md                            # pagina GitHub bilingue
├── SECURITY_MODEL.md                    # controlli, minacce e limiti bilingui
├── design-qa.md                         # confronto visuale e collaudo responsive della landing
├── STARTUP_PREFERENCES.md               # preferenze progettuali del proprietario
├── index.html                           # host renderer e CSP
├── package.json / package-lock.json     # comandi, dipendenze e packaging
├── eslint.config.js                     # qualità TypeScript/React
├── playwright.config.ts                 # browser QA riproducibile a 1080 px
├── playwright.landing.config.ts         # QA landing su server statico senza live reload
├── tsconfig.json                        # compilazione e tipi
├── vite.config.ts                       # build renderer
└── vitest.config.ts                     # test unitari e integrazione

Generati, non versionati / Generated, not versioned:
├── node_modules/                        # dipendenze locali
├── dist/                                # renderer di produzione
├── dist-electron/                       # main e preload compilati
├── release/                             # DMG/ZIP/NSIS e metadata
├── coverage/                            # copertura test
├── outputs/                             # workbook personali/locali, esclusi da Git
├── output/playwright/                   # screenshot QA locali / local UI QA screenshots
├── tmp/                                 # lavorazioni temporanee locali
└── .playwright-cli/                     # snapshot del collaudo UI locale
```

Le GIF originali sotto `docs/assets/` sono sorgenti locali ignorate da Git; il sito pubblica le sole copie MP4 ottimizzate e i poster PNG già ispezionati. La landing usa esclusivamente percorsi relativi, viene pubblicata da GitHub Pages tramite `main` + `/docs` e non entra in `app.asar` o negli artifact Electron. I documenti tecnici e di manutenzione restano separati sotto `documents/` e non fanno parte del sito pubblico.

## Dipendenze tra livelli / Layer direction

```text
Renderer UI ──typed bridge──> Preload ──validated IPC──> Main service
     │                                                    │
     └── shared contracts <── Domain rules ───────────────┤
                                                          ├── Settings
                                                          └── Spreadsheet adapters
                                                               ├── canonical .xlsx v9 + migrations
                                                               └── optional .numbers mirror
```

Il renderer non importa moduli Node/Electron privilegiati. Il dominio non dipende dalla UI. `FinanceFileService` coordina dialoghi, dominio e persistenza; i dettagli Excel/Numbers restano negli adapter.

The renderer imports no privileged Node/Electron modules. Domain code is UI-independent. `FinanceFileService` coordinates dialogs, domain rules, and persistence; Excel/Numbers details remain inside adapters.

## File da non modificare o pubblicare / Files not to edit or publish

- `sources/` e ogni `.numbers`/`.xlsx` locale possono contenere dati finanziari reali e sono esclusi da Git e packaging.
- `_Meta` dentro un workbook è gestito dall’app; non rinominare fogli o colonne.
- `outputs/` e `tmp/` contengono risultati locali o temporanei e non vanno pubblicati.
- `dist/`, `dist-electron/`, `release/` e `node_modules/` sono rigenerabili.
- `.contami-backups` è una cartella dell’utente accanto al workbook, non parte del repository.

- `sources/` and local `.numbers`/`.xlsx` files may contain real financial data and are excluded from Git and packages.
- Workbook `_Meta`, sheet names, and columns are app-managed.
- `outputs/` and `tmp/` contain local or temporary artifacts and must not be published.
- Build/dependency folders are reproducible generated output.
- `.contami-backups` belongs beside the user workbook, not in this repository.
