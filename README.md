<p align="center"><img src="assets/logo.png" alt="Logo ContaMì" width="280"></p>

# ContaMì

**Le tue finanze in un'app desktop; i tuoi dati in un foglio che puoi ancora aprire.** ContaMì collega transazioni, immobili, automobile, investimenti, pensione integrativa e spese condivise, così una registrazione compare nelle viste pertinenti senza essere inserita più volte.

**Personal finance in a desktop app, with data kept in a spreadsheet you can still open.** ContaMì connects transactions, property, vehicles, investments, private pensions, and shared expenses so a record appears where it belongs without repeated entry.

[**Sito / Website**](https://contami.glaucosilvestri.it/) · [**Release e checksum / Releases and checksums**](https://github.com/gloutchov/Contami/releases) · [**Avvio rapido / Quick start**](QUICK-START_Desktop.md) · [**Manuale IT**](ISTRUZIONI.md) · [**User manual EN**](INSTRUCTIONS.md)

> **Stato / Status:** alpha funzionante / functional alpha · **1.27.0 — versione sorgente / source version** · **Schema workbook / Workbook schema:** v16 · **Piattaforme / Platforms:** macOS 13+ e Windows x64 · **Licenza / License:** Apache-2.0. Per la versione distribuita e i pacchetti disponibili, consulta [Releases](https://github.com/gloutchov/Contami/releases).

![Panoramica di ContaMì con dati dimostrativi](docs/assets/panoramica_whi.png)

*Panoramica in italiano con dati sintetici. / Italian overview with synthetic data.*

## Perché ContaMì / Why ContaMì

L'app nasce da un'esigenza concreta: evitare di ripetere la stessa operazione in più fogli, conservando però la possibilità di leggere i propri dati fuori dall'app. Il formato canonico è `.xlsx`, portabile su macOS e Windows; su Mac, con Apple Numbers installato, si può mantenere anche una copia `.numbers`. Il workbook scelto dall'utente resta la fonte autorevole.

The app grew from a practical need: avoid entering one transaction in several sheets while retaining access to the data outside the app. The canonical format is `.xlsx`, portable across macOS and Windows; on a Mac with Apple Numbers installed, an optional `.numbers` copy is available. The user-selected workbook remains authoritative.

## Cosa puoi fare / What you can do

| Area | Funzioni / Features |
|---|---|
| **Panoramica / Overview** | Patrimonio, liquidità, Casse e andamento storico. / Net worth, liquidity, cash registers, and history. |
| **Transazioni / Transactions** | Conti e Casse distinti, trasferimenti interni, filtri e movimenti collegati. / Separate accounts and cash registers, internal transfers, filters, and linked records. |
| **Immobili / Properties** | Abitazione e affitti, utenze, condominio, letture acqua, tasse, quote condivise e rendimenti locativi. / Homes and rentals, utilities, condominium costs, water readings, taxes, shared costs, and rental yields. |
| **Automobile / Vehicles** | Spese, rifornimenti, percorrenza, Km/l, costo d'uso e complessivo per km, confronto tra mezzi e rate. / Costs, fuel, distance, efficiency, operating and overall cost per km, vehicle comparison, and financing. |
| **Investimenti / Investments** | Versamenti, liquidazioni, valutazioni, quote, risultato complessivo e rendimento periodico con copertura dichiarata. / Contributions, withdrawals, valuations, units, overall result, and period returns with stated coverage. |
| **Pensione integrativa / Private pension** | Fondi raccoglitori e comparti, con capitale, controvalore e rendimenti aggregati senza doppio conteggio. / Pension collectors and compartments, with capital, value, and returns aggregated without double counting. |
| **Ricorrenze e spese condivise / Recurring and shared expenses** | Ricorrenza e condivisione nei moduli Transazioni, Spese condivise e Ricorrenze; quote e cambi tariffa che preservano lo storico. / Recurrence and sharing in Transactions, Shared expenses, and Recurring forms; shares and rate changes that preserve history. |

I riepiloghi delle Spese condivise seguono i filtri: **Spese saldate** mostra euro e numero di spese, escludendo le previsioni. **Rate residue** conta le scadenze dell’intero piano, anche negli anni successivi; i finanziamenti Automobile mantengono il proprio stato nella scheda del mezzo. / Shared expense summaries follow the filters: **Settled expenses** shows euros and expense count, excluding forecasts. **Installments left** counts the full schedule, including later years; Vehicle financing status remains controlled by the vehicle card.

### Report stampabili / Printable reports

Dalle rispettive viste puoi scegliere **Anno corrente** o **Intera storia** e usare **Stampa** oppure **Salva PDF**. I documenti sono prodotti localmente in sola lettura, con grafici e tabelle:

- **Immobili:** entrate, uscite, consumi, previsioni dell'anno e quote dei proprietari.
- **Investimenti:** una posizione o l'intero portafoglio non pensionistico; capitale, controvalore, risultato e rendimenti.
- **Pensione integrativa:** un comparto, un fondo o tutte le pensioni; flussi per comparto, totali per valuta e due grafici. I raccoglitori non vengono sommati ai comparti.

From each area you can choose **Current year** or **Full history**, then **Print** or **Save PDF**. Reports are generated locally and read-only, with charts and tables:

- **Properties:** income, expenses, consumption, current-year forecasts, and owners' shares.
- **Investments:** one position or the whole non-pension portfolio; capital, value, overall result, and returns.
- **Private pension:** one compartment, one collector, or all pensions; compartment flows, currency-separated totals, and two charts. Collectors are not added to their compartments.

Le valute diverse non vengono convertite o sommate. I rendimenti distinguono misure complete, parziali e stimate; valutazioni assenti e periodi futuri non diventano valori inventati. / Different currencies are not converted or summed. Returns distinguish complete, partial, and estimated coverage; missing valuations and future periods are not filled with invented values.

## Installazione / Installation

Scarica il pacchetto adatto dalla pagina [Releases](https://github.com/gloutchov/Contami/releases) insieme a `SHA256SUMS.txt` e verifica il checksum prima dell'installazione. Download the matching package and `SHA256SUMS.txt` from [Releases](https://github.com/gloutchov/Contami/releases), then verify its checksum before installation.

| Sistema / System | Pacchetto / Package | Requisiti / Requirements |
|---|---|---|
| macOS Apple Silicon | DMG `arm64` | macOS 13+ |
| macOS Intel | DMG `x64` | macOS 13+ |
| Windows | installer `x64` | Windows x64 |

Le build sono **non firmate**: Gatekeeper o SmartScreen possono mostrare un avviso. Il [manuale italiano](ISTRUZIONI.md#2-requisiti-e-installazione) e l'[English manual](INSTRUCTIONS.md#2-requirements-and-installation) spiegano il primo avvio, l'aggiornamento e la rimozione. La release `v1.22.2` resta l'opzione documentata per macOS 12.

Builds are **unsigned**: Gatekeeper or SmartScreen may warn. The [Italian](ISTRUZIONI.md#2-requisiti-e-installazione) and [English](INSTRUCTIONS.md#2-requirements-and-installation) manuals cover first launch, updates, and removal. Release `v1.22.2` remains the documented option for macOS 12.

### Primo avvio / First launch

1. Scegli **Crea nuovo foglio** o **Apri foglio esistente**. / Choose **Create new workbook** or **Open existing workbook**.
2. In **Impostazioni / Settings**, crea un conto e, se usi contanti, una Cassa. / Add an account and, if you use cash, a cash register.
3. Registra un movimento da **Transazioni**: gli eventuali collegamenti aggiornano le altre viste. / Enter a transaction; its links update the relevant areas.

Lingua e tema seguono il sistema e possono essere cambiati in **Impostazioni**. Consulta l'[avvio rapido](QUICK-START_Desktop.md) per un percorso guidato. / Language and theme follow the system and can be changed under **Settings**. See the [quick start](QUICK-START_Desktop.md) for a guided path.

## Dati, configurazione e privacy / Data, settings, and privacy

`.xlsx` è il formato canonico. La copia `.numbers` è facoltativa e richiede Numbers su macOS; l'app conserva accanto a essa un sidecar `.contami.xlsx` da non eliminare. I salvataggi rileggono il file scritto, controllano le modifiche esterne con SHA-256 e mantengono fino a 10 backup in `.contami-backups`. Il passaggio d'anno crea un nuovo workbook senza cancellare quello precedente.

`.xlsx` is canonical. The optional `.numbers` copy requires Numbers on macOS and keeps a `.contami.xlsx` sidecar that must not be deleted. Saves reread the written file, detect external edits with SHA-256, and retain up to 10 backups in `.contami-backups`. Year rollover creates a new workbook without deleting the previous one.

ContaMì non richiede account, cloud, telemetria o rete durante l'uso normale. Workbook e PDF non sono cifrati dall'app: proteggili con i permessi del dispositivo, FileVault/BitLocker e backup appropriati. Le preferenze per lingua, tema, formato e percorso del workbook sono in **Impostazioni**; i dettagli dei controlli e dei limiti sono nel [modello di sicurezza](SECURITY_MODEL.md).

ContaMì needs no account, cloud, telemetry, or network during normal use. Workbooks and PDFs are not encrypted by the app: protect them with device permissions, FileVault/BitLocker, and suitable backups. Language, theme, format, and workbook path are managed under **Settings**; the [security model](SECURITY_MODEL.md) covers controls and limits.

## Sviluppo locale / Local development

Richiede Node.js 24 LTS **>=24.15.0**, npm e Git. Requires Node.js 24 LTS **>=24.15.0**, npm, and Git.

La sorgente `1.27.0` aggiunge ricorrenze condivise e creazione di un piano dai moduli Transazione e Spesa condivisa, anche in modifica. La prima spesa viene riutilizzata, le scadenze future restano pianificate e i saldi condivisi includono soltanto spese confermate. Le scadenze condivise future compaiono nella lista come Previste, il Totale filtrato ne indica la parte pianificata e Ricorrenze offre Azzera filtri. Schema v16 con migrazione conservativa e backup. / Source `1.27.0` adds shared recurring plans and plan creation from Transaction and Shared expense forms, including edits. The first expense is reused, future occurrences remain planned, and shared balances include confirmed expenses only. Future shared occurrences appear as Planned, Filtered total identifies their planned portion, and Recurring offers Reset filters. Schema v16 uses conservative migration and backups.

```bash
npm ci
npm run dev
```

Verifiche locali / Local checks:

```bash
npm run preflight
npm run test:e2e
npm audit
```

Build e pacchetti / Build and packages:

```bash
npm run build
npm run dist:mac  # su macOS / on macOS
npm run dist:win  # su Windows / on Windows
```

Il collaudo browser richiede prima `npm run test:e2e:install`; le istruzioni per packaging, smoke e landing sono nel [manuale](ISTRUZIONI.md), nel [piano](PLAN.md) e nella [mappa del repository](MAP.md). Le build e i dati locali generati, inclusi `sources/`, workbook e backup, non devono entrare in commit o artifact.

Browser checks first need `npm run test:e2e:install`. Packaging, smoke, and landing instructions are in the [English manual](INSTRUCTIONS.md), [plan](PLAN.md), and [repository map](MAP.md). Generated local output and data, including `sources/`, workbooks, and backups, must stay out of commits and artifacts.

## Documentazione / Documentation

- [Avvio rapido desktop / Desktop quick start](QUICK-START_Desktop.md)
- [Manuale utente italiano](ISTRUZIONI.md) · [English user manual](INSTRUCTIONS.md)
- [Modello di sicurezza / Security model](SECURITY_MODEL.md)
- [Mappa del repository / Repository map](MAP.md)
- [Piano delle milestone / Milestone plan](PLAN.md)
- [Regole operative / Contributor guidance](AGENTS.md)
- [Specifiche dei template / Import template specification](documents/import-template-spec.md)
- [Formule dei rendimenti / Return formulas](documents/return-formulas.md)

Se apri una issue, usa dati sintetici e non allegare workbook, PDF o backup personali. / For issues, use synthetic data and do not attach personal workbooks, PDFs, or backups.

## Licenza / License

Copyright 2026 ContaMì contributors. Distribuito secondo / Distributed under the [Apache License 2.0](LICENSE).
