# ContaMì — Piano di sviluppo / Development plan

Questo documento governa lo sviluppo di ContaMì. Va aggiornato alla chiusura di ogni milestone. Il progetto procede in autonomia tra le milestone; sono richieste conferme soltanto per operazioni che richiedono credenziali, autorizzazioni del sistema operativo o altre azioni sensibili non già autorizzate.

## Visione del prodotto

ContaMì è un’app desktop bilingue (italiano/inglese) per macOS e Windows che rende semplice registrare e comprendere finanze personali complesse mantenendo un foglio di calcolo leggibile e archiviabile come fonte dati durevole. L’interfaccia è organizzata per viste — quadro generale, transazioni, immobili, automobile, investimenti, pensione integrativa, ricorrenze e spese condivise — con dashboard e inserimenti guidati.

## Decisioni architetturali iniziali

- Desktop: Electron, React e TypeScript, con renderer isolato dal sistema operativo.
- Struttura: moduli separati per dominio, casi d’uso, persistenza, adattatori spreadsheet, IPC, configurazione, i18n, tema e UI.
- Fonte dati: workbook progettato per ContaMì, semplice, tabellare, documentato e auditabile.
- Formato Excel: `.xlsx`, supportato su macOS e Windows e apribile anche con Apple Numbers.
- Formato Numbers: sincronizzazione nativa `.numbers` disponibile su macOS tramite un adattatore separato e Numbers installato; un workbook `.xlsx` interoperabile resta sempre disponibile come formato di scambio/recupero. Windows non può creare file `.numbers` nativi.
- Privacy: local-first, senza account, telemetria o servizi remoti nella prima versione.
- Distribuzione: repository GitHub privato, licenza Apache-2.0, build non firmate per macOS e Windows finché non saranno fornite credenziali di firma/notarizzazione.
- Versionamento: SemVer; prima release stabile prevista `v1.0.0`.

## Strategia Git e versioni

Le versioni pre-1.0 indicano un **checkpoint di maturità verificato**, non il numero della milestone né la percentuale aritmetica di codice scritto. Una versione viene promossa soltanto dopo la revisione dei criteri di accettazione pertinenti; le correzioni che non cambiano checkpoint incrementano la patch. La `v1.0.0` resta la prima release stabile installabile e verificata su macOS e Windows.

La milestone M8 è stata aggiunta dopo la prima stesura del piano, ma completa ed estende i flussi applicativi prima dell’hardening finale; per maturità si colloca quindi tra M5 e M6. Il tag `v0.2.0` resta la **preview storica** precedente. La revisione applicativa ha confermato il codice completato fino a M8 come checkpoint funzionale `v0.8.0`; il lavoro successivo riparte dal gate di hardening `v0.9.0`.

**Stato corrente:** M27 e M28 sono completate e pubblicate rispettivamente come `v1.17.0` e `v1.18.0`; per M28 CI su `main` e tag e workflow Release sono verdi, con artifact macOS/Windows e `SHA256SUMS.txt` pubblicati. M29 è implementata e verificata localmente sul branch `milestone/29-investment-isin`, con versione sorgente `1.19.0`; commit, integrazione, CI, tag e release restano da eseguire. L'ultimo checkpoint desktop rilasciato è `v1.18.0`. Le sezioni **Attività pianificate** delle milestone già chiuse conservano il perimetro originario e non rappresentano lavoro ancora da eseguire.

| Milestone | Branch previsto | Checkpoint di maturità | Stato |
|---|---|---:|---|
| M0 — Piano e analisi | `milestone/00-plan-and-discovery` | `0.0.0` | Completata |
| M1 — Fondazioni dell’app | `milestone/01-foundation` | `0.1.0` | Completata; CI macOS/Windows verde |
| M2 — Motore dati spreadsheet-first | `milestone/02-spreadsheet-engine` | `0.2.0` | Completata; adattatore Numbers collaudato |
| M3 — Flussi finanziari principali | `milestone/03-finance-workflows` | `0.4.0` | Completata |
| M4 — Dashboard e reporting | `milestone/04-dashboards` | `0.6.0` | Completata |
| M5 — Archiviazione annuale e resilienza | `milestone/05-year-rollover` | confluisce in `0.8.0` | Completata e testata |
| M8 — Dati collegati, automobile, CRUD e confronti storici | `milestone/08-linked-finance-workflows` | `0.8.0` | Completata, revisionata e promossa al checkpoint funzionale |
| M6 — Sicurezza, qualità e accessibilità | `milestone/06-hardening` | `0.9.0` | Completata; CI/release macOS e Windows verdi |
| M7 — Packaging e prima release | `milestone/07-release` | `1.0.0` | Completata; release stabile macOS/Windows verificata |
| M13 — Catalogo tasse configurabile | `milestone/13-configurable-taxes` | `1.1.0` | Completata; CI/release macOS e Windows verdi |
| M14 — Template Excel per importazione | `milestone/14-import-templates` | `1.2.0` | Rilasciata |
| M15 — Importazione guidata e atomica | `milestone/15-guided-import` | `1.3.0` | Rilasciata; CI/release macOS e Windows verdi |
| Patch residenza e storico immobili | `patch/1.3.1-residence-property-history` | `1.3.1` | Rilasciata; CI/release macOS e Windows verdi |
| Patch grafici, menu e integrità UUID | `patch/1.3.2-property-charts-app-menu` | `1.3.2` | Rilasciata; CI/release macOS e Windows verdi |
| Patch limiti e chiusura rate | `patch/1.3.3-installment-limits` | `1.3.3` | Rilasciata; CI/release macOS e Windows verdi |
| M17 — Filtri e azioni nelle viste di dettaglio | `milestone/17-detail-filters` | `1.4.0` | Rilasciata; CI/release macOS e Windows verdi |
| M18 — Movimenti di investimenti e pensioni nelle Transazioni | `milestone/18-investment-transaction-sync` | `1.5.0` | Completata e rilasciata |
| Patch conti e flussi di cassa investimenti | `patch/1.5.1-investment-cash-accounts` | `1.5.1` | Rilasciata; CI/release macOS e Windows verdi |
| M20 — Casse, trasferimenti interni e indicatori di perdita | `milestone/20-cash-registers` | `1.6.0` | Rilasciata; CI/release macOS e Windows verdi |
| M21 — Competenza e incasso delle rate di affitto | `milestone/21-rent-payment-allocation` | `1.7.0` | Rilasciata; CI/release macOS e Windows verdi |
| M19 — Cambio tariffa delle ricorrenze | `milestone/19-recurring-rate-changes` | `1.8.0` | Completata e rilasciata; collaudo del proprietario superato |
| M16 — Pagamenti rateali dell’Automobile | `milestone/16-vehicle-installments` | `1.9.0` | Completata e rilasciata; CI/release macOS e Windows verdi |
| M22 — Aggiornamento Node.js e toolchain | `milestone/22-node-toolchain-refresh` | `1.10.0` | Completata e rilasciata; CI/release macOS e Windows verdi |
| M9 — Hardening apertura workbook | `milestone/09-workbook-hardening` | `1.11.0` | Completata e rilasciata; CI/release macOS e Windows verdi |
| Patch conferma ricorrenze non-affitto | `patch/1.11.1-recurring-confirmation` | `1.11.1` | Completata e rilasciata; CI/release macOS e Windows verdi |
| M10 — Integrità e concorrenza dei salvataggi | `milestone/10-save-integrity` | `1.12.0` | Completata e rilasciata; CI/release macOS e Windows verdi |
| Patch spese condivise Immobili/Automobile | `patch/1.12.1-shared-property-vehicle-expenses` | `1.12.1` | Rilasciata; CI/release macOS e Windows verdi |
| M11 — CSP senza stili inline | `milestone/11-strict-csp` | `1.13.0` | Completata e rilasciata; CI/release macOS e Windows verdi |
| M23 — Landing page bilingue | `milestone/23-landing-page` | web `landing-v1.0.1` | Completata e pubblicata; Pages da `main/docs` verdi |
| M24 — Saldi filtrati e totali odierni | `milestone/24-transaction-balance-summaries` | `1.14.0` | Completata e rilasciata; CI/release macOS e Windows verdi |
| Patch trasparenza icona | `patch/1.14.1-transparent-icons` | desktop `1.14.1` / web `landing-v1.0.3` | Rilasciata; CI/release macOS e Windows e Pages verdi |
| M25 — Report immobili per proprietari | `milestone/25-property-owner-reports` | `1.15.0` | Completata e rilasciata; CI/release macOS e Windows verdi |
| M26 — Riconciliazione capitale investito e riepiloghi | `milestone/26-investment-capital-reconciliation` | `1.16.0` | Completata e rilasciata; CI/release macOS e Windows verdi |
| M27 — Rendimenti percentuali patrimoniali | `milestone/27-asset-return-charts` | `1.17.0` | Completata e rilasciata |
| M28 — Inserimento assistito delle registrazioni Automobile | `milestone/28-vehicle-entry-assistance` | `1.18.0` | Completata e rilasciata; CI/release macOS e Windows verdi |
| M29 — Codice ISIN opzionale per investimenti | `milestone/29-investment-isin` | `1.19.0` | Implementata e verificata localmente; commit/CI/release da eseguire |

**Sequenza delle promozioni desktop completate:** `v0.2.0` preview storica → `v0.8.0` checkpoint funzionale → hardening `v0.9.0` → stabile `v1.0.0` → catalogo tasse `v1.1.0` → template Excel `v1.2.0` → importazione guidata `v1.3.0` → patch residenza/storico immobili `v1.3.1` → patch grafici immobili/menu release `v1.3.2` → patch limiti rate `v1.3.3` → filtri e azioni di dettaglio `v1.4.0` → sincronizzazione patrimoniale `v1.5.0` → correzione conti/flussi di cassa `v1.5.1` → casse e trasferimenti interni `v1.6.0` → competenza/incasso affitti `v1.7.0` → cambio tariffa `v1.8.0` → rate automobile `v1.9.0` → aggiornamento Node.js e toolchain `v1.10.0` → apertura workbook `v1.11.0` → conferma ricorrenze non-affitto `v1.11.1` → integrità salvataggi `v1.12.0` → spese condivise Immobili/Automobile `v1.12.1` → CSP rigorosa `v1.13.0` → saldi filtrati e totali odierni `v1.14.0` → trasparenza icona `v1.14.1` → report immobili per proprietari `v1.15.0` → riconciliazione capitale investito `v1.16.0` → rendimenti percentuali patrimoniali `v1.17.0` → inserimento assistito Automobile `v1.18.0`. La landing segue la sequenza web separata `landing-v1.0.0` → `landing-v1.0.1` → `landing-v1.0.2` → `landing-v1.0.3`.

**Checkpoint desktop rilasciato:** `v1.18.0` con M28. Il checkpoint successivo previsto è `v1.19.0` con M29, attualmente verificata soltanto sul branch di milestone.

## M0 — Piano, inventario e analisi del riferimento

**Obiettivo:** trasformare la richiesta e il file Numbers esistente in requisiti verificabili prima di implementare.

**Attività principali**

- Inventariare `assets/`, `sources/` e `STARTUP_PREFERENCES.md` senza modificare la fonte originale.
- Analizzare fogli, tabelle, categorie e relazioni del file Numbers; esportare una copia tecnica soltanto se necessario.
- Definire requisiti funzionali, schema dati iniziale, limiti del supporto Numbers e criteri privacy.
- Creare `PLAN.md` prima del codice.
- Inizializzare Git e collegare il repository GitHub privato `Contamì` (o la variante tecnicamente valida più vicina se GitHub rifiuta il carattere accentato).

**Criteri di accettazione**

- Il piano copre tutte le funzionalità richieste e distingue comportamento multipiattaforma e specifico macOS.
- La fonte Numbers rimane intatta.
- Le decisioni emerse dall’analisi sono riportate nel piano o in una nota di progetto versionata.

**Test/verifiche:** controllo inventario, hash della fonte prima/dopo l’analisi, verifica repository privato.

**Documentazione:** `PLAN.md`.

## M1 — Fondazioni applicative e design system

**Obiettivo:** consegnare un’app desktop avviabile, riconoscibile come ContaMì e pronta a ospitare funzionalità senza diventare monolitica.

**Attività principali**

- Scaffold Electron + React + TypeScript con processi main/preload/renderer separati.
- Configurare lint, typecheck, test unitari e build.
- Integrare logo e icone; derivare palette, tipografia, spaziature e stati UI dagli asset.
- Creare shell con navigazione per Overview, Transazioni, Immobili, Automobile, Investimenti, Pensione Integrativa, Ricorrenze, Spese condivise e Impostazioni.
- Implementare dizionari italiano/inglese, rilevamento lingua di sistema e override persistente.
- Implementare tema sistema/chiaro/scuro con override persistente.
- Creare configurazione centrale validata e stati di errore/vuoto/caricamento.
- Creare `README.md`, `ISTRUZIONI.md`, `INSTRUCTIONS.md`, `MAP.md`, `SECURITY_MODEL.md`, `AGENTS.md`, `LICENSE` e `QUICK-START_Desktop.md`.

**Criteri di accettazione**

- L’app si avvia direttamente nella dashboard e tutte le viste sono navigabili.
- Lingua e tema seguono il sistema per default e possono essere cambiati senza riavvio.
- Nessuna stringa utente è hardcoded fuori dai dizionari.
- Main, preload e renderer sono separati; il renderer non ha accesso diretto a Node.js.

**Test richiesti:** lint, typecheck, unit test i18n/tema/configurazione, smoke test Electron, verifica visiva chiaro/scuro e IT/EN.

**Documentazione:** tutti i documenti obbligatori, con MAP iniziale e controlli di sicurezza effettivi.

## M2 — Modello finanziario e motore spreadsheet-first

**Obiettivo:** rendere il workbook ContaMì la fonte dati autorevole, con scritture atomiche, schema versionato e recupero verificabile.

**Attività principali**

- Definire entità e value object per transazioni, categorie, metodi di pagamento, conti, immobili, consumi domestici, veicoli e relativi costi/consumi, investimenti, pensioni integrative/comparti, ricorrenze, rate e quote condivise.
- Definire tabelle del workbook con identificativi UUID, date ISO, importi numerici, valuta e stato attivo/chiuso.
- Implementare repository di dominio e casi d’uso indipendenti dal formato file.
- Implementare adattatore `.xlsx` multipiattaforma con lettura, validazione, migrazione e scrittura atomica.
- Implementare adattatore `.numbers` per macOS con capability detection, consenso esplicito e gestione sicura degli errori; mantenere un `.xlsx` interoperabile.
- Creare workbook iniziale pulito, foglio `Schema`, tabelle dati e fogli consuntivi leggibili manualmente.
- Implementare selezione/creazione file al primo avvio e preferenza di formato nelle impostazioni.
- Implementare lock, backup prima della sostituzione e rilevamento modifiche concorrenti.

**Criteri di accettazione**

- Un utente può creare/aprire un workbook, riavviare l’app e ritrovare gli stessi dati.
- Il file è apribile e comprensibile senza ContaMì.
- Un salvataggio interrotto non corrompe l’ultima copia valida.
- Formati o versioni non supportati producono un errore guidato senza sovrascrittura.

**Test richiesti:** unit test dominio, round-trip, migrazioni, file corrotto, path traversal, lock/concorrenza, salvataggio atomico, fixture workbook, apertura con Excel/LibreOffice e Numbers dove disponibile.

**Documentazione:** manuali, schema workbook, MAP, SECURITY_MODEL.

## M3 — Inserimento e gestione dei flussi finanziari

**Obiettivo:** coprire le attività quotidiane e patrimoniali attraverso moduli guidati e coerenti.

**Attività principali**

- CRUD e archiviazione logica per categorie, metodi di pagamento e conti.
- Transazioni con data, descrizione, categoria, metodo di pagamento, importo, valuta, note e collegamenti opzionali.
- Immobili: valore commerciale, entrate, uscite, consumi, mutui/costi e storico valutazioni.
- Automobile: anagrafica delle vetture attuali e precedenti, rifornimenti e consumi, rate, bollo, assicurazione, pneumatici, manutenzione ordinaria e straordinaria.
- Investimenti: titoli, fondi e altre forme di risparmio; versamenti, liquidazioni, valore corrente e stato.
- Pensione Integrativa: pensioni usate come raccoglitori, comparti associati, totale aggregato senza doppio conteggio, versamenti, liquidazioni, valutazioni e piani periodici.
- Ricorrenze: abbonamenti, servizi, rate auto/prestiti, frequenza, prossima scadenza, fine e stato.
- Spese condivise: partecipanti, quota personale/partner, pagante, saldo e stato del rimborso.
- Chiusura/riapertura controllata degli elementi conclusi; cancellazione definitiva solo con conferma e quando sicura.
- Ricerca, filtri, ordinamento, validazione in tempo reale e feedback di salvataggio.

**Criteri di accettazione**

- Ogni inserimento richiesto arriva nel workbook con campi obbligatori e categoria corretta.
- Gli elementi chiusi restano nello storico ma non compaiono tra gli attivi per default.
- I moduli gestiscono importi negativi, date limite, campi mancanti e annullamento senza perdita dati.

**Test richiesti:** test casi d’uso e validazioni, integrazione UI/workbook, e2e dei principali inserimenti, modifica, chiusura e ripristino.

**Documentazione:** flussi utente IT/EN, esempi, troubleshooting, MAP.

## M4 — Dashboard e reporting

**Obiettivo:** offrire un quadro finanziario immediato, con numeri riconciliabili con il workbook.

**Attività principali**

- Dashboard iniziale: patrimonio netto, liquidità, investimenti, immobili, entrate/uscite, ricorrenze imminenti e saldo condiviso.
- Dashboard per Transazioni, Immobili, Automobile, Investimenti, Pensione Integrativa, Ricorrenze e Spese condivise.
- Grafici accessibili, filtri temporali e confronto con periodo precedente.
- Indicatori con definizioni visibili e drill-down fino alle righe origine.
- Report mensile/annuale e riepiloghi esportati nel workbook tramite formule semplici e tabelle consuntive.
- Gestione esplicita di dati mancanti, valute multiple non convertite e valori stimati.

**Criteri di accettazione**

- Ogni KPI è riconciliato con le righe dati e ha una definizione documentata.
- Le dashboard funzionano in IT/EN e chiaro/scuro, anche con dataset vuoti o ampi.
- I dati non vengono inviati fuori dal dispositivo.

**Test richiesti:** unit test aggregazioni, dataset golden, riconciliazione workbook/UI, accessibilità di base, e2e filtri e drill-down, verifica visiva.

**Documentazione:** glossario KPI, manuali, README, MAP.

## M5 — Chiusura anno, archiviazione e resilienza

**Obiettivo:** automatizzare il passaggio annuale senza perdere storia e mantenendo file indipendenti e archiviabili.

**Attività principali**

- Procedura guidata “Chiudi anno” con anteprima e conferma esplicita.
- Creare un nuovo workbook per l’anno successivo includendo anagrafiche e situazioni attive.
- Conservare nel nuovo workbook i consuntivi aggregati dell’anno precedente necessari ai confronti, con dettaglio annuale per singolo immobile/utenza, investimento/comparto pensione e veicolo/categoria di costo.
- Rendere il vecchio workbook non più attivo, senza eliminarlo; proporre un percorso di archivio.
- Verificare hash, totali di controllo, backup e possibilità di rollback prima di cambiare file attivo.
- Gestire apertura di anni storici in sola lettura e recupero da backup.

**Criteri di accettazione**

- Il vecchio documento è intatto e archiviabile.
- Il nuovo documento contiene gli elementi ancora attivi e i soli consuntivi storici previsti.
- Totali di chiusura e apertura si riconciliano; un errore lascia il file attivo invariato.

**Test richiesti:** rollover con casi limite (ricorrenze, rate, investimenti, rimborsi, date), rollback, hash e riconciliazione, e2e procedura guidata.

**Documentazione:** guide chiusura anno e recupero IT/EN, SECURITY_MODEL, MAP.

## M6 — Hardening, qualità, accessibilità e prestazioni

**Obiettivo:** rendere la release affidabile per dati finanziari reali e verificare i confini di sicurezza dell’app locale.

**Attività principali**

- Applicare Electron hardening: `contextIsolation`, `nodeIntegration: false`, sandbox, preload minimo, CSP, blocco popup/navigazioni e IPC allowlist validato.
- Validare percorsi, estensioni, dimensioni, schema e payload; redigere errori e log.
- Implementare log locali minimali senza contenuti finanziari completi e rotazione limitata.
- Testare assenza di telemetria/rete inattesa e dipendenze vulnerabili.
- Accessibilità tastiera, focus, contrasto, etichette e riduzione movimento.
- Testare dataset ampi, avvio, salvataggio e dashboard; correggere colli di bottiglia.
- Eseguire revisione finale di sicurezza e allineare `SECURITY_MODEL.md` al codice.

**Criteri di accettazione**

- Nessun accesso diretto al filesystem dal renderer e nessun canale IPC generico.
- Nessun dato finanziario o segreto nei log e nessuna richiesta di rete in uso normale.
- Tutti i controlli automatici e gli e2e critici passano.
- Le limitazioni residue sono documentate chiaramente.

**Test richiesti:** suite completa, test IPC/CSP/path traversal/payload, audit dipendenze, smoke pacchettizzato, accessibilità e prestazioni.

**Documentazione:** SECURITY_MODEL definitivo, manuali, README, MAP, piano.

## M7 — Packaging multipiattaforma e release `v1.0.0`

**Obiettivo:** pubblicare una prima versione installabile e riproducibile per macOS e Windows nel repository GitHub privato.

**Attività principali**

- Configurare build macOS (`arm64` e, se sostenibile, `x64`/universal) e Windows (`x64`).
- Applicare icone e metadati, escludere fonti private, fixture sensibili e file locali.
- Configurare GitHub Actions per lint, typecheck, test, build, controlli documentali e packaging su macOS/Windows.
- Configurare workflow release su tag con artifact e checksum SHA-256.
- Verificare installazione/avvio fuori dal checkout; documentare Gatekeeper/SmartScreen per build non firmate.
- Aggiornare versione e documentazione, creare tag `v1.0.0` e GitHub Release privata.

**Criteri di accettazione**

- Artifact macOS e Windows sono prodotti dalla CI, hanno checksum e superano smoke test documentati.
- La release non contiene il file finanziario di esempio dell’utente né altri dati privati.
- Repository, workflow, tag e release restano privati.
- README e manuali permettono installazione, primo avvio, uso e recupero senza conoscenza del codice.

**Test richiesti:** CI completa, packaging smoke su entrambi i sistemi, controllo contenuto artifact, checksum, prova installazione e disinstallazione.

**Documentazione:** documenti obbligatori finali e note release bilingui.

## M8 — Dati collegati, automobile, CRUD e confronti storici

**Obiettivo:** eliminare gli inserimenti duplicati, completare la gestione delle anagrafiche e rendere confrontabili situazione e flussi con gli anni precedenti.

**Attività principali**

- Migrare il workbook allo schema v3 mantenendo la lettura/migrazione dei file v1 e v2 e aggiungendo collegamenti espliciti tra transazioni, immobili, investimenti, automobile, ricorrenze e spese condivise.
- Implementare creazione, modifica e cancellazione controllata per categorie, metodi di pagamento, immobili, investimenti, movimenti, ricorrenze e spese condivise; aggiungere la gestione dei tipi di investimento.
- Mostrare accanto a categorie e metodi di pagamento il numero di utilizzi effettivi in tutte le sezioni collegate, usando lo stesso conteggio completo per impedire cancellazioni che lascerebbero riferimenti orfani.
- Rendere bidirezionale la registrazione dei movimenti collegati: una sola riga economica autorevole, riflessa automaticamente nelle viste pertinenti senza doppio conteggio.
- Estendere le transazioni con filtri per testo, categoria, metodo di pagamento e mese, parziali filtrati, totali assoluti e alla data odierna, più evidenza visiva delle registrazioni ricorrenti.
- Estendere gli immobili con scheda anagrafica, destinazione residenza/locazione, indirizzo, superficie, quota di proprietà, valore catastale, movimenti, consumi, spese comuni e controllo degli affitti attesi.
- Aggiungere alla scheda dell’abitazione grafici annuali separati per consumi di elettricità, gas e acqua, ottenuti dalle registrazioni correnti e dai consuntivi ereditati.
- Aggiungere alla residenza i consuntivi monetari e i grafici annuali di spesa per elettricità, gas e acqua; aggiungere a ogni immobile il grafico del valore commerciale, ai locati il confronto entrate/uscite e al dettaglio i filtri per mese e descrizione.
- Aggiungere la sezione Automobile con CRUD di vetture e registrazioni, rifornimenti/consumi, rate, bollo, assicurazione, pneumatici, manutenzione ordinaria/straordinaria, dettaglio costi e confronto con vetture precedenti.
- Confrontare le vetture per nome sull’asse orizzontale e costo per chilometro sull’asse verticale, ricavando percorrenza e costi della vettura attuale dalle registrazioni di dettaglio e i consuntivi delle precedenti dai dati storici.
- Estendere gli investimenti non pensionistici con raggruppamento per tipologia, dettaglio movimenti, totali parziali, soli movimenti Versamento/Liquidazione e piani periodici collegati alle ricorrenze.
- Mostrare per ogni investimento e comparto pensione il confronto storico tra cifra investita e controvalore, aggregando i comparti nel raccoglitore senza perdere i valori individuali.
- Portare nei grafici finanziari tutte le osservazioni datate disponibili, non soltanto un punto annuale, mantenendo i consuntivi annuali come continuità per gli anni privi di registrazioni di dettaglio.
- Separare la Pensione Integrativa dagli Investimenti: consentire la creazione di pensioni-raccoglitore e comparti associati, con CRUD, dettaglio, movimenti, valutazioni e piani periodici collegati. Rappresentare il Fondo Pensione Fideuram come pensione e Linea Equilibrio, Linea Crescita e Linea Valore come comparti, aggregando il totale senza duplicazioni.
- Estendere le ricorrenze con direzione entrata/uscita, frequenza mensile o annuale, filtri e collegamento opzionale a un investimento o immobile.
- Estendere le spese condivise con collegamento alle transazioni, filtri mensili, saldo massivo del mese e stampa delle voci non saldate.
- Riconciliare le spese condivise del workbook privato con tutte le righe mensili del foglio sorgente `SPESE ORDINARIE`, conservando quote, pagante e stato e collegando una transazione soltanto quando la corrispondenza è non ambigua.
- Aggiungere alla Panoramica tre grafici storici: patrimonio/liquidità/immobili/investimenti, entrate/uscite e impegni mensili; conservare i valori nei consuntivi annuali durante il rollover.
- Estendere il rollover con `Property History`, `Investment History` e `Vehicle History`, mantenendo il nuovo workbook pulito senza perdere le serie necessarie ai confronti.
- Limitare le liste recenti della Panoramica ai movimenti confermati fino alla data odierna e aggiungere il riepilogo separato delle spese ricorrenti recenti.
- Uniformare i filtri di Transazioni, Ricorrenze e Spese condivise; completare la scheda residenza con Telefono/Internet e Canone TV.
- Correggere il rilevamento di Apple Numbers quando installato tramite Apple Creator Studio e uniformare la splash screen al logo.
- Integrare nel workbook ContaMì 2026 i dati mancanti ricavati localmente dal documento Numbers di esempio, senza versionare o distribuire dati personali.
- Riconciliare l’importazione privata con le transazioni sorgente come unica lista autorevole, importi unitari delle ricorrenze, investimenti cumulativi convertiti in variazioni, consuntivi immobiliari/utenze e totali storici delle vetture; rappresentare acquisti e liquidazioni finanziarie come trasferimenti direzionati che incidono sulla liquidità ma non sulle entrate/uscite correnti.

**Criteri di accettazione**

- Un movimento collegato inserito o modificato da una vista è immediatamente coerente in tutte le altre viste coinvolte e viene contabilizzato una sola volta.
- Investimenti e Pensione Integrativa hanno viste e totali distinti; i comparti sono associati a una sola pensione-raccoglitore e il patrimonio complessivo li conta una sola volta.
- Tutte le anagrafiche richieste sono modificabili e cancellabili con conferma; i riferimenti esistenti non possono restare orfani.
- Filtri, parziali e grafici storici sono riconciliabili con le righe e i consuntivi del workbook.
- I file v1 e v2 si aprono senza perdita dati e vengono salvati come v3 soltanto dopo validazione e backup.
- Consumi domestici, posizioni finanziarie/comparti e costi delle automobili restano confrontabili dopo il cambio d’anno tramite consuntivi annuali dettagliati.
- Il workbook personale completato resta escluso da Git, CI e pacchetti di distribuzione.

**Test richiesti:** migrazione v1/v2→v3, sincronizzazione bidirezionale e cancellazione, aggregazioni storiche di utenze/veicoli/investimenti, filtri, rollover, round-trip workbook, e2e dei flussi principali, verifica visiva chiaro/scuro e IT/EN, apertura del workbook con strumento indipendente.

**Documentazione:** aggiornamento di manuali, README, MAP, SECURITY_MODEL e schema del workbook.

## M9 — Hardening dell’apertura dei workbook

**Obiettivo:** respingere file `.xlsx` con espansione ZIP o struttura ostile prima che il parser possa consumare quantità eccessive di memoria o tempo.

**Attività pianificate**

- Introdurre un preflight ZIP isolato dall’adapter Excel che controlli numero di entry, dimensione totale e per-entry non compressa, rapporto di compressione, duplicati e percorsi anomali prima del parsing del workbook.
- Definire limiti espliciti, centralizzati e documentati, con errori sicuri che non espongano percorsi completi o contenuti finanziari.
- Conservare i limiti di schema e collezione già applicati dopo l’apertura, evitando che il preflight sostituisca la validazione del dominio.
- Valutare l’esecuzione del parsing in un worker/processo terminabile con budget di tempo e memoria, se il solo preflight non offre un confine sufficiente sulle piattaforme supportate.
- Aggiungere corpus e generatori esclusivamente sintetici per workbook troncati, archivi annidati, rapporti di compressione estremi, entry duplicate e metadati incoerenti.

**Criteri di accettazione**

- I workbook ContaMì validi e i file v1/v2 migrabili continuano ad aprirsi senza regressioni su macOS e Windows.
- I casi ostili noti vengono rifiutati prima del caricamento completo, entro budget riproducibili di tempo e memoria.
- Nessun workbook privato entra in fixture, log, Git, CI o artifact.

**Test richiesti:** unit test del preflight, fuzz/property test con seed riproducibili, integrazione con l’adapter, regressione round-trip/migrazioni, file troncati e zip bomb sintetiche, budget di risorse in CI.

**Documentazione:** limiti workbook, messaggi di recupero, SECURITY_MODEL, MAP e note di rilascio.

**Esito e rilascio 2026-08-03:** introdotto un preflight ZIP condiviso e a lettura limitata, eseguito prima di ExcelJS sia per il workbook autorevole sia, con un profilo più restrittivo, per i template di importazione. I limiti centralizzati coprono dimensione compressa, numero di entry, directory centrale, nomi e metadati, espansione totale/per-entry e rapporto di compressione; vengono rifiutati troncamenti, ZIP64/multidisco, cifratura, flag o metodi non supportati, percorsi anomali o duplicati dopo normalizzazione Unicode, offset sovrapposti, metadati e data descriptor incoerenti, parti OOXML obbligatorie mancanti, archivi annidati e contenuto attivo. Il corpus usa esclusivamente dati sintetici e include zip bomb, mutazioni con seed riproducibile, integrazione prima del parser e regressione dei workbook storici. Gli errori esposti al renderer sono codici redatti con messaggi di recupero IT/EN; un workbook ricordato ma rifiutato porta l’app nello stato non configurato senza modificare il file o la preferenza e senza permettere che dati vuoti lo sovrascrivano. Lo schema resta v9. L’isolamento del parser in un processo terminabile è stato valutato e rinviato: i limiti preventivi coprono gli attacchi ZIP noti, mentre il rischio residuo di amplificazione XML entro i limiti ammessi resta documentato e dovrà essere riesaminato se i benchmark multipiattaforma superano il budget. Versione applicativa `1.11.0`. Gate macOS integrato verde sulla baseline Node.js 24.15.0: lint, typecheck, build renderer/Electron, 182 test Vitest, controllo documentale, `npm audit` con 0 vulnerabilità dopo gli override compatibili di `brace-expansion` e `postcss`, 5 test Playwright automatici e collaudo Playwright CLI IT/EN chiaro/scuro a 1080 px senza errori console. Packaging macOS ARM64, ispezione `app.asar`, smoke unpacked e ciclo DMG installazione/avvio/rimozione superati. La PR `#48` è stata integrata in `main` dal merge commit `335bf08`. I gate CI Node.js 24.15.0 sono verdi su macOS e Windows per il push (`30837915056`), la PR (`30837916430`), `main` (`30838854456`) e il tag annotato `v1.11.0` (`30839556356`). Il workflow Release `30839556205` ha superato packaging, ispezione e smoke installato su macOS ARM64/x64 e Windows x64 e ha pubblicato sei artifact applicativi più `SHA256SUMS.txt`; tutti i digest sono stati ricalcolati dai file pubblicati e riconciliati sia con il manifest sia con i digest GitHub.

## Patch 1.11.1 — Conferma diretta delle ricorrenze non-affitto

**Obiettivo:** correggere la regressione per cui la conferma di qualsiasi movimento pianificato apriva il modulo completo e sostituiva la data prevista con la data odierna, facendo apparire scomparse soprattutto le ricorrenze annuali dal mese filtrato.

**Comportamento previsto**

- Le ricorrenze non-affitto e gli altri movimenti pianificati vengono confermati direttamente, conservando data, mese, UUID, scadenza e collegamenti originari.
- Le sole rate di affitto continuano a chiedere la data effettiva di incasso, perché la M21 deve distinguere liquidità e competenza.
- Una ricorrenza annuale confermata resta visibile nel mese della propria scadenza e la successiva occorrenza avanza di un anno senza duplicati.

**Test richiesti:** regressione renderer con filtro mensile e ricorrenza annuale non-affitto; conferma affitto con data effettiva separata; test di dominio su conservazione della scadenza e avanzamento annuale; Playwright IT/EN, chiaro/scuro e 1080 px sui due percorsi.

**Esito e rilascio 2026-08-03:** implementata la distinzione in Transazioni tra rate di affitto e tutti gli altri movimenti pianificati. Le regressioni mirate confermano che l’annuale non apre il modulo, conserva la data prevista e avanza all’anno successivo, mentre l’affitto mantiene il dialogo e la scadenza separata. Versione applicativa `1.11.1`; non cambiano schema workbook, IPC, persistenza o modello di sicurezza. Gate locali verdi sulla baseline Node.js 24.15.0: lint, typecheck, build renderer/Electron, 184 test Vitest, controllo documentale, `npm audit` con 0 vulnerabilità e 5 test Playwright automatici. Il collaudo Playwright CLI con dati sintetici ha confermato il percorso annuale diretto e il dialogo dedicato all’affitto in IT/EN, chiaro/scuro e a 1080 px senza errori console. Packaging macOS ARM64 non firmato, ispezione `app.asar`, smoke del pacchetto e ciclo DMG installazione/avvio/rimozione superati. La PR `#50` è stata integrata in `main` dal merge commit `25acdb7`. I gate CI sono verdi su macOS e Windows per il push definitivo (`30848600822`), la PR (`30848605990`), `main` (`30849002500`) e il tag annotato `v1.11.1` (`30849348523`). Il workflow Release `30849348650` ha superato packaging, ispezione e smoke installato su macOS ARM64/x64 e Windows x64 e ha pubblicato sei artifact applicativi più `SHA256SUMS.txt`; tutti i digest sono stati ricalcolati dai file pubblicati e riconciliati sia con il manifest sia con i digest GitHub.

## M10 — Integrità e concorrenza dei salvataggi

**Obiettivo:** ridurre ulteriormente il rischio di sovrascrivere modifiche esterne o concorrenti, senza compromettere backup, rollback e compatibilità con Excel/Numbers.

**Attività pianificate**

- Affiancare a dimensione e timestamp un hash crittografico del contenuto acquisito dopo apertura e dopo ogni salvataggio verificato.
- Ricontrollare l’impronta immediatamente prima della sostituzione atomica e bloccare il salvataggio quando la copia su disco non corrisponde alla revisione caricata.
- Introdurre un lock cooperativo con identità non sensibile, lease/scadenza e recupero guidato dei lock obsoleti; non assumere che applicazioni esterne rispettino il lock.
- Definire in modo deterministico i casi di crash, doppia istanza, file spostato, filesystem senza primitive attese e modifica durante la finestra tra verifica e rename.
- Mantenere copie recuperabili e richiedere conferma prima di ogni eventuale recupero distruttivo.

**Criteri di accettazione**

- Una modifica esterna viene rilevata anche quando dimensione e timestamp non cambiano.
- Due istanze o due salvataggi sovrapposti non producono una perdita silenziosa di dati.
- Lock obsoleti e crash hanno un percorso di recupero documentato e testato; l’ultima copia valida resta recuperabile.

**Test richiesti:** hash e revision guard, gare controllate tra writer, lock attivo/obsoleto, crash recovery, modifica con stesso timestamp/dimensione, filesystem macOS/Windows, backup e rollback.

**Documentazione:** flussi di conflitto e recupero IT/EN, SECURITY_MODEL, MAP e note di rilascio.

**Esito e rilascio 2026-08-05:** introdotta una revisione del workbook basata su dimensione, timestamp e SHA-256, acquisita tramite handle stabile dopo apertura e salvataggio. Ogni commit ricontrolla la revisione prima del backup e immediatamente prima della sostituzione; il backup viene accettato soltanto se il suo hash coincide con la copia caricata. Un lock cooperativo laterale, creato in esclusiva e limitato a 4 KiB, conserva soltanto UUID casuali e una lease di cinque minuti: writer ContaMì sovrapposti non possono committare la stessa revisione, i lock recenti o attivi bloccano la scrittura e quelli scaduti richiedono conferma bilingue prima della rimozione mirata e del caricamento aggiornato. File spostati, destinazioni create in concorrenza, filesystem privi delle primitive necessarie e interferenze nella finestra pre-`rename` falliscono senza sostituire silenziosamente i dati; resta documentata la gara minima con applicazioni esterne che non rispettano il lock. Il presidio è unico per CRUD, import, migrazioni, riparazioni UUID e rollover e aggiunge un solo canale IPC senza argomenti o percorsi, vincolato al workbook configurato. Versione applicativa portata a `1.12.0`; aggiornati README, guide IT/EN, quick start, MAP e modello di sicurezza. Gate locali Windows verdi con Node.js `24.18.1`: baseline Node, validazione landing, lint, typecheck, build renderer/Electron, 193 test Vitest, controllo documentale, `npm audit` con 0 vulnerabilità e 7 test Playwright a 1080 px, inclusi recupero lock in IT/scuro ed EN/chiaro senza errori console o overflow. La PR `#53` è stata integrata in `main` dal merge commit `1b444d1`; i gate CI sono verdi sul branch (`30989231551`), sulla PR (`30989256181`), su `main` (`30989765945`) e sul tag annotato `v1.12.0` (`30990295281`, con rerun del solo job Windows dopo un errore transitorio dell'endpoint `npm audit`). Il workflow Release `30990295310` ha superato packaging, ispezione e smoke installato su macOS ARM64/x64 e Windows x64 e ha pubblicato sei artifact applicativi più `SHA256SUMS.txt`; tutti i digest del manifest coincidono con quelli registrati da GitHub.

## Patch 1.12.1 — Spese condivise da Immobili e Automobile

**Obiettivo:** rendere disponibile la divisione automatica a metà anche nelle modali generiche **Nuova registrazione** degli Immobili e **Nuova spesa / rilevazione** dell’Automobile, riusando lo stesso flusso collegato delle Transazioni.

**Comportamento previsto**

- Una spesa immobiliare generica positiva espone **Dividi automaticamente a metà** e la scelta del pagante; entrate, valutazioni e consumi senza costo condivisibile non creano Spese condivise.
- Ogni costo Automobile positivo diverso da una valutazione espone la stessa opzione e la scelta del pagante.
- Il salvataggio crea o aggiorna atomicamente una sola registrazione di dominio, una sola Transazione e una sola Spesa condivisa collegate tramite UUID. Deselezionare l’opzione rimuove soltanto la Spesa condivisa collegata; modifica e cancellazione restano sincronizzate.
- Il totale iniziale viene diviso al centesimo con lo stesso criterio delle Transazioni; eventuali quote personalizzate restano modificabili dalla vista Spese condivise.
- Non cambiano schema workbook, canali IPC, capacità del renderer o accesso a rete e filesystem.

**Test richiesti:** dominio su creazione, aggiornamento, arrotondamento e rimozione dei tre record collegati; modali renderer IT/EN; Playwright a 1080 px in IT/scuro ed EN/chiaro, inclusi salvataggio, visibilità nella vista Spese condivise, assenza di overflow ed errori console.

**Documentazione:** README, guide IT/EN, quick start, MAP e SECURITY_MODEL.

**Esito e rilascio 2026-08-05:** implementazione completata sul branch dedicato; versione applicativa `1.12.1`. Gate Windows locale verde con Node.js 24: baseline Node, validazione landing, lint, typecheck, build renderer/Electron, 197 test Vitest, controllo documentale, `npm audit` con 0 vulnerabilità, 9 test Playwright dell’app e 7 test Playwright della landing. I due nuovi scenari verificano con dati sintetici Immobili in IT/scuro e Automobile in EN/chiaro a 1080 px, inclusi record collegati, pagante, quota, assenza di overflow ed errori console. Una prima esecuzione concorrente del benchmark prestazionale ha superato il budget di 27 ms per contesa con la build; la suite completa rilanciata da sola è verde. Il collaudo aggiuntivo nel Browser integrato non è stato eseguibile perché la sessione non esponeva browser collegati; la copertura Playwright CLI richiesta è completa e verde. La PR `#55` è stata integrata in `main` dal merge commit `fe0bdf7`; i gate CI sono verdi sul push del branch (`30996173849`), sulla PR (`30996199679`), su `main` (`30996570211`) e sul tag annotato `v1.12.1` (`30996946423`). Il workflow Release `30996946105` ha superato packaging, ispezione e smoke installato su macOS ARM64/x64 e Windows x64 e ha pubblicato sei artifact applicativi più `SHA256SUMS.txt`; tutti i digest del manifest coincidono con quelli registrati da GitHub.

## M11 — CSP senza stili inline

**Obiettivo:** rimuovere `style-src 'unsafe-inline'` dalla Content Security Policy del renderer senza regressioni visive o di accessibilità.

**Attività pianificate**

- Inventariare attributi `style`, stili React dinamici e dipendenze che iniettano CSS nel renderer.
- Migrare gli stili applicativi verso classi e fogli locali; sostituire le varianti dinamiche con un insieme limitato e validato di classi o attributi sicuri.
- Definire una CSP di produzione che neghi gli stili inline e mantenere separata la sola eccezione strettamente necessaria allo sviluppo locale.
- Aggiungere controlli automatici che falliscano in presenza di nuove violazioni o di un allargamento non autorizzato della policy.

**Criteri di accettazione**

- La build pacchettizzata funziona con stili inline negati e senza errori CSP.
- Tutte le viste restano leggibili in IT/EN, chiaro/scuro e a 1080 px, inclusi grafici, modali, focus e stati vuoti/errore/disabilitato.
- Il renderer non acquisisce nuove capacità di rete, script o contenuto attivo.

**Test richiesti:** unit/integration test per le varianti dinamiche, verifica CSP in build, Playwright IT/EN e chiaro/scuro, focus tastiera, screenshot/overflow e smoke Electron pacchettizzato.

**Documentazione:** SECURITY_MODEL, MAP, manuali se cambia la resa visibile e note di rilascio.

**Esito e rilascio 2026-08-05:** la CSP di produzione consente soltanto risorse locali, imposta `style-src-attr 'none'` e `connect-src 'none'` e disabilita oggetti, base URL, invii form e frame; non contiene `unsafe-inline`. Lo sviluppo conserva una sola eccezione `style-src-elem 'unsafe-inline'` per i fogli iniettati da Vite e la connessione al server locale, mantenendo comunque negati gli attributi `style`. Tema, barre proporzionali e grafici dinamici sono stati migrati a classi locali e SVG con attributi geometrici/presentazionali validati; curve monotone, sfumature, spessori, legende e tipografia preservano la resa precedente senza stili inline. I grafici misurano il pannello con `ResizeObserver`, usano tutta l’area disponibile e si animano localmente all’ingresso o alla variazione dei dati, disattivando di fatto il movimento quando è richiesto `prefers-reduced-motion`; al passaggio del mouse un tooltip SVG mostra periodo, guida, punti e valori formattati di tutte le serie. Recharts e le sue 38 dipendenze transitive sono stati rimossi senza cambiare dominio, workbook, IPC o capacità del renderer. Un nuovo controllo scansiona i sorgenti, verifica l’HTML di produzione e viene riutilizzato nell’ispezione di `app.asar`; i test coprono policy produzione/sviluppo, tema e varianti SVG linea/area/barre, inclusi resa curva, adattamento al pannello, animazione, tooltip e peso regolare dei testi. Versione applicativa `1.13.0`. Gate locale Windows verde con Node.js `24.18.1`: baseline Node, validazione landing, lint, typecheck, build renderer/Electron, 202 test Vitest, controllo CSP, 9 test Playwright dell’app e 7 della landing in IT/EN, chiaro/scuro e a 1080 px, inclusi dimensioni dei grafici, proporzioni, focus, assenza di overflow, attributi `style` ed errori console/CSP. `npm audit` non rileva vulnerabilità. Il packaging Windows ha incontrato inizialmente un lock `EPERM` sulla sola rinomina della distribuzione Electron appena estratta; dopo il rilascio del lock, la stessa distribuzione locale è stata usata come input verificato e il pacchetto finale ha superato ispezione `app.asar`, assenza di dati sensibili, smoke unpacked e ciclo NSIS di installazione, avvio e rimozione. La PR `#58` è stata integrata in `main` dal merge commit `587250e`; i gate CI sono verdi sul branch (`31015934807`), sulla PR (`31015961720`), su `main` (`31016227592`) e sul tag annotato `v1.13.0` (`31016524135`). Il workflow Release `31016523824` ha superato packaging, ispezione e smoke installato su macOS ARM64/x64 e Windows x64 e ha pubblicato sei artifact applicativi più `SHA256SUMS.txt`; tutti i digest del manifest coincidono con quelli registrati da GitHub.

## M13 — Catalogo tasse configurabile

**Obiettivo:** sostituire le tasse immobiliari codificate nell’app con un catalogo modificabile dall’utente, mantenendo integre le registrazioni storiche e i collegamenti con Transazioni e Spese condivise.

**Attività pianificate**

- Introdurre nel dominio un’entità `TaxType` con UUID stabile, nome, ambito di applicazione (residenza, immobile locato o entrambi), stato attivo/archiviato e configurazione opzionale delle rate; limiti e unicità sono validati centralmente.
- Migrare lo schema workbook dalla v3 alla v4 aggiungendo il catalogo tasse e il riferimento `taxTypeId` nelle registrazioni immobiliari. La migrazione crea le voci iniziali Canone TV, IMU e TARI e riconcilia deterministicamente i precedenti `detailKind` senza perdere dati.
- Rimuovere dal dominio e dai moduli immobiliari le scelte fiscali hardcoded; i selettori usano soltanto tasse attive provenienti dal catalogo del workbook.
- Aggiungere in Impostazioni una sezione bilingue **Tasse / Taxes** con creazione, modifica, archiviazione/riattivazione, conteggio utilizzi e cancellazione definitiva con conferma quando la voce non è referenziata.
- Per una tassa già usata, impedire riferimenti orfani: può essere archiviata affinché non sia più proposta, mentre la cancellazione definitiva resta disponibile soltanto per voci mai utilizzate.
- Generalizzare la gestione delle rate senza assumere che ogni tassa abbia soltanto pagamento unico, prima rata o seconda rata; conservare comunque la lettura e la resa delle registrazioni esistenti.
- Mantenere atomica la creazione o modifica di una tassa immobiliare, della Transazione collegata e dell’eventuale Spesa condivisa, senza duplicare importi nei consuntivi.
- Conservare il catalogo nel workbook autorevole, non nel file locale `settings.json`, affinché tasse e registrazioni restino portabili insieme tra macOS, Windows, Excel e Numbers.

**Criteri di accettazione**

- L’utente può aggiungere, rinominare, archiviare, riattivare e rimuovere in sicurezza le tasse dalla Configurazione senza modificare codice o file manualmente.
- I nuovi inserimenti immobiliari mostrano immediatamente il catalogo aggiornato; una tassa archiviata non è più selezionabile ma resta leggibile nello storico.
- I workbook v1, v2 e v3 continuano ad aprirsi e vengono salvati in v4 soltanto dopo migrazione, validazione completa e backup.
- Modifica e cancellazione non producono riferimenti orfani, non alterano gli importi storici e non interrompono i collegamenti bidirezionali.
- La sezione è accessibile da tastiera, leggibile in IT/EN, tema chiaro/scuro e a larghezza minima 1080 px.

**Test richiesti:** unit test CRUD, unicità, limiti, conteggio utilizzi e archiviazione; migrazione v1/v2/v3→v4; round-trip workbook; collegamenti tassa/Transazione/Spesa condivisa; rollover; errori `ENTITY_IN_USE`; e2e Impostazioni e inserimento immobile in IT/EN e chiaro/scuro.

**Documentazione:** schema workbook, manuali IT/EN, README, MAP, SECURITY_MODEL, messaggi di migrazione e note di rilascio.

## M14 — Template Excel per importazione da sistemi precedenti

**Obiettivo:** permettere all’utente di generare da Impostazioni file `.xlsx` autoesplicativi e conformi ai contratti di importazione di ContaMì, uno per ciascuna area gestita.

**Dipendenza:** M13 deve essere completata affinché i template immobiliari possano usare anche il catalogo tasse configurabile.

**Attività pianificate**

- Definire e versionare contratti di importazione distinti per: immobile di residenza, immobili in affitto, transazioni, investimenti, fondo pensione, spese condivise, spese ricorrenti e automobile.
- Generare per ogni tipologia un file `.xlsx` separato con un solo foglio visibile di compilazione, intestazioni stabili, campi obbligatori evidenziati, formati di data/importo documentati e istruzioni sintetiche bilingui.
- Aggiungere fogli tecnici nascosti e protetti per versione del template, tipo di importazione e liste di convalida; non usare macro, collegamenti esterni, formule ottenute da testo utente o contenuto attivo.
- Predisporre menu a discesa Excel per valori chiusi ed enum, inclusi entrata/uscita/trasferimento, stato, frequenza, valuta, tipo di movimento, destinazione immobile e categorie applicabili.
- Quando esiste un workbook aperto, popolare le scelte con i cataloghi correnti validati — conti, categorie, metodi di pagamento, tipi di investimento e tasse — usando identificatori non ambigui. Senza workbook configurato, generare comunque il template con i valori di sistema disponibili e indicare quali riferimenti dovranno essere risolti all’importazione.
- Rappresentare in modo esplicito relazioni e gerarchie tramite chiavi esterne definite dall’utente, ad esempio immobile/registrazioni, investimento/movimenti, pensione/comparti e automobile/costi, senza richiedere UUID ContaMì preesistenti.
- Aggiungere in Impostazioni una sezione **Importazione dati / Data import** con otto azioni di generazione, dialogo nativo di salvataggio e conferma del percorso tramite solo nome file, senza esporre percorsi arbitrari al renderer.
- Mantenere il generatore separato dal repository del workbook autorevole: produce soltanto modelli vuoti e non modifica il file finanziario attivo.

**Criteri di accettazione**

- Dalla Configurazione è possibile generare ciascuno degli otto template anche senza dati personali o connessione di rete.
- Ogni file si apre correttamente in Excel su macOS/Windows e, per quanto supportato, in LibreOffice e Numbers; intestazioni, formati e menu a discesa restano utilizzabili.
- I template contengono tutti i campi necessari al relativo import, distinguono obbligatori e opzionali e includono una versione verificabile dalla futura procedura di importazione.
- I valori selezionabili corrispondono ai cataloghi del workbook al momento della generazione e valori duplicati o ambigui vengono impediti o identificati in modo stabile.
- Template, fixture e documentazione usano esclusivamente dati vuoti o sintetici e non incorporano contenuti del workbook personale.

**Test richiesti:** snapshot strutturali e round-trip Excel per tutti gli otto tipi, convalide dati e menu a discesa, metadati/versione, cataloghi vuoti e popolati, caratteri IT/EN, date e numeri locali, apertura indipendente con Excel/LibreOffice/Numbers dove disponibile, controllo assenza macro/formule/link esterni e test IPC/dialoghi.

**Documentazione:** specifica versionata delle colonne per ciascun template, esempi esclusivamente sintetici, manuali IT/EN, README, MAP, SECURITY_MODEL e note di rilascio.

## M15 — Importazione guidata, validata e atomica

**Obiettivo:** importare automaticamente i template compilati con anteprima, diagnostica per riga e conferma esplicita, senza lasciare il workbook in uno stato parziale o incoerente.

**Dipendenze:** M13 per il catalogo tasse e M14 per i contratti/template versionati. Il preflight limitato introdotto per i file di importazione è stato riusato ed esteso da M9 anche ai workbook autorevoli.

**Attività pianificate**

- Aggiungere per ciascuno degli otto tipi un parser isolato dal dominio che accetta soltanto template supportati, legge valori passivi e valida versione, intestazioni, tipi, limiti, enum, riferimenti e relazioni prima di costruire comandi di dominio.
- Rifiutare macro, collegamenti esterni, formule, fogli inattesi e contenuto attivo; applicare gli stessi limiti preventivi e di schema previsti per l’apertura dei workbook, con errori redatti.
- Presentare un’anteprima senza scritture con numero di righe valide, scartate e in conflitto, più errori localizzati per foglio/riga/colonna e istruzioni correggibili.
- Risolvere cataloghi e chiavi esterne in modo deterministico; valori mancanti, duplicati o ambigui richiedono correzione o mappatura esplicita e non vengono indovinati.
- Definire strategie esplicite per duplicati e record esistenti — ignora, crea nuovo o aggiorna quando l’identità è certa — mostrando l’effetto prima della conferma.
- Convertire l’intero import valido in un’unica trasformazione atomica di `FinanceData`, riusando comandi e regole del dominio per creare collegamenti bidirezionali e impedire doppio conteggio.
- Prima della sostituzione creare backup e verificare la revisione del workbook; in caso di errore nessuna riga viene applicata e l’ultima copia valida resta attiva.
- Mostrare un riepilogo finale riconciliabile per entità create, aggiornate, ignorate e importi principali, senza scrivere dati finanziari nei log.

**Criteri di accettazione**

- Un template valido di ciascuna tipologia può essere importato da Impostazioni e produce gli stessi dati che si otterrebbero tramite inserimenti manuali equivalenti.
- Nessun dato viene scritto prima dell’anteprima e della conferma; annullamento, errore o conflitto lasciano invariato il workbook.
- Righe non valide, riferimenti mancanti e duplicati sono indicati con posizione e motivo, senza importazioni parziali silenziose.
- Le registrazioni collegate compaiono una sola volta nei consuntivi e rispettano liquidità, entrate/uscite, quote condivise, gerarchie pensione/comparti e storico dei beni.
- L’importazione funziona in IT/EN, chiaro/scuro, a 1080 px e con sola tastiera, mantenendo rete bloccata e renderer privo di accesso al filesystem.

**Test richiesti:** import end-to-end sintetico per tutti gli otto tipi; equivalenza con comandi manuali; template vecchio/nuovo o errato; righe duplicate e riferimenti ambigui; formule/macro/link esterni; limiti di dimensione e cardinalità; anteprima/annullamento/conferma; atomicità, backup, rollback e conflitto esterno; round-trip con rollover; Playwright IT/EN e chiaro/scuro.

**Documentazione:** guida di compilazione e importazione IT/EN, matrice errori e recupero, contratti dei template, README, MAP, SECURITY_MODEL, modello di minaccia e note di rilascio.

**Esito implementazione:** completati preflight ZIP limitato, parser per gli otto contratti v1, riferimenti deterministici, tre strategie esplicite per le corrispondenze esatte, anteprima senza scritture con errori riga/colonna e piano opaco mantenuto nel main. La conferma applica una sola trasformazione `FinanceData` tramite comandi di dominio e un solo salvataggio verificato con revisione, backup e rollback; annullamento ed errore non modificano il workbook. Formule, macro, link esterni, oggetti incorporati, fogli o intestazioni inattesi, archivi cifrati/anomali e limiti superati vengono rifiutati prima della scrittura.

## M17 — Filtri e azioni nelle viste di dettaglio

**Obiettivo:** rendere omogenea e più rapida la consultazione delle registrazioni nelle modali di dettaglio e portare l’aggiornamento del valore degli investimenti nel punto in cui l’utente consulta la singola posizione.

**Attività pianificate**

- Aggiungere nella sezione Spese comuni della vista Immobili un filtro testuale per descrizione e un filtro per mese con tutti i dodici mesi e l’opzione per mostrare l’intero anno.
- Aggiungere in Transazioni un pulsante **Azzera filtri / Reset filters** che ripristini insieme descrizione, tipo, categoria, metodo di pagamento e mese.
- Aggiungere nelle modali delle singole automobili i filtri combinabili per descrizione e mese.
- Aggiungere nelle modali dei singoli investimenti i filtri combinabili per descrizione e mese.
- Aggiungere nelle modali dei comparti di Pensione Integrativa i filtri combinabili per descrizione e mese; i raccoglitori pensione continuano ad aggregare i comparti senza duplicarne i movimenti.
- Aggiungere in Spese condivise il filtro per descrizione accanto al filtro per mese già esistente.
- Applicare in tutte le viste la stessa semantica: ricerca testuale senza distinzione tra maiuscole e minuscole, selezione esplicita di tutti i mesi, combinazione dei criteri, reset prevedibile e stato vuoto dedicato quando nessuna registrazione corrisponde.
- Ricalcolare elenchi, conteggi, parziali e totali visibili sul solo insieme filtrato, senza alterare i dati autorevoli o i totali finanziari non filtrati.
- Aggiungere nella modale del singolo investimento il pulsante bilingue **Aggiorna valore / Update value** accanto a **Modifica investimento / Edit investment**, riusando lo stesso comando, la stessa validazione e lo stesso flusso di salvataggio verificato dell’azione già disponibile nella vista principale.
- Conservare leggibilità, ordine del focus e layout in IT/EN, tema chiaro/scuro e alla larghezza minima di 1080 px, inclusi reset, stato disabilitato e assenza di risultati.

**Criteri di accettazione**

- Ogni area prevista filtra correttamente per descrizione, per uno dei dodici mesi o per entrambi i criteri e ripristina l’elenco completo tramite reset; Transazioni azzera in una sola azione tutti e cinque i propri criteri.
- Spese comuni, automobili, investimenti, comparti pensione e Spese condivise mostrano risultati, parziali e stati vuoti coerenti con i filtri attivi.
- **Aggiorna valore** è raggiungibile dalla modale dell’investimento, registra una valutazione tramite il flusso esistente e aggiorna immediatamente controvalore, grafico e riepiloghi senza creare movimenti economici impropri.
- I controlli sono accessibili da tastiera, tradotti e privi di overflow nelle combinazioni IT/EN e chiaro/scuro a 1080 px.

**Test richiesti:** unit test delle funzioni di filtro e dei parziali; test renderer delle cinque aree; regressione dell’aggiornamento valore; Playwright con filtri singoli/combinati/reset, assenza di risultati, focus tastiera e azione **Aggiorna valore** in IT/EN e chiaro/scuro.

**Documentazione:** manuali IT/EN, README se cambia la descrizione delle funzioni e MAP soltanto se vengono introdotti nuovi moduli.

**Esito 2026-07-30:** implementati filtri condivisi e combinabili per descrizione/mese con reset, stato vuoto e parziali coerenti nelle Spese comuni degli immobili, nelle modali di automobili, investimenti e comparti pensione e nelle Spese condivise; in Transazioni **Azzera filtri** ripristina insieme descrizione, tipo, categoria, metodo di pagamento e mese. **Aggiorna valore** è disponibile accanto a **Modifica investimento** nelle modali delle posizioni finali e riusa il flusso di valutazione esistente. Versione applicativa portata a `1.4.0`; aggiornati dizionari IT/EN, demo e test esclusivamente sintetici, README, manuali, MAP e intestazione del modello di sicurezza. La milestone è stata implementata nel commit `9a5b22a` e integrata in `main` dal merge commit `17daf7b`. Gate locale verde: lint, typecheck, 96 test Vitest, build renderer/Electron, controllo documentale, `npm audit` con 0 vulnerabilità e Playwright IT/EN chiaro/scuro a 1080 px con filtri singoli/combinati/reset, stato senza risultati, focus e assenza di overflow. CI verdi sul branch (`30545824846`), su `main` (`30546815701`) e sul tag `v1.4.0` (`30547431560`). Il workflow Release `30547431211` ha completato packaging, ispezione, smoke installato e pubblicazione per macOS ARM64/x64 e Windows x64; gli asset includono DMG, ZIP, installer Windows e `SHA256SUMS.txt`. Il browser integrato non era disponibile nella sessione; il collaudo visuale automatizzato e geometrico Playwright è stato completato.

## M18 — Movimenti di investimenti e pensioni nelle Transazioni

**Obiettivo:** garantire che ogni Versamento o Liquidazione confermato, una tantum o derivato da una ricorrenza, sia rappresentato anche nelle Transazioni tramite un solo collegamento autorevole e senza alterare impropriamente i consuntivi di entrate e uscite.

**Attività pianificate**

- Verificare separatamente i flussi di Versamento e Liquidazione per investimenti ordinari, comparti di Pensione Integrativa, movimenti una tantum e movimenti generati o confermati da piani periodici.
- Correggere il dominio affinché un Versamento crei o aggiorni una Transazione collegata con effetto di cassa `outflow` e una Liquidazione con effetto `inflow`; entrambi restano trasferimenti patrimoniali esclusi dai consuntivi di entrate/uscite correnti.
- Mantenere bidirezionali creazione, modifica, conferma, chiusura e cancellazione: importo, data, descrizione, conto e collegamenti devono restare coerenti senza duplicare il movimento.
- Assicurare che la conferma di una Transazione pianificata da una ricorrenza produca o aggiorni il movimento dell’investimento o del comparto corretto e non una seconda Transazione.
- Verificare il versamento iniziale, i movimenti successivi e le liquidazioni parziali o totali, preservando il calcolo cronologico di cifra investita e controvalore.
- Introdurre una riconciliazione idempotente e coperta da backup per i workbook esistenti che contengono movimenti confermati privi della Transazione collegata; i casi ambigui devono essere segnalati e lasciati invariati, mai indovinati.
- Conservare lo schema v5 se i collegamenti esistenti sono sufficienti; qualunque migrazione o nuovo campo necessario deve essere versionato, validato e documentato prima del salvataggio.

**Criteri di accettazione**

- Ogni nuovo Versamento o Liquidazione di un investimento o comparto compare una sola volta nelle Transazioni e nella relativa vista patrimoniale.
- Movimenti una tantum e periodici seguono la stessa regola; conferma, modifica o cancellazione da una vista mantengono coerente l’altra.
- Liquidità e saldo del conto riflettono correttamente `outflow` e `inflow`, mentre entrate e uscite correnti non vengono gonfiate.
- La riconciliazione dei dati esistenti non modifica importi, date o descrizioni, non crea duplicati ed è ripetibile senza ulteriori scritture.
- Rollover, importazione e round-trip workbook preservano collegamenti e storico.

**Test richiesti:** unit test di dominio per tutte le combinazioni investimento/comparto, Versamento/Liquidazione e una tantum/periodico; test di sincronizzazione bidirezionale, idempotenza e casi ambigui; integration test workbook, backup e round-trip; regressione KPI/liquidità/rollover/importazione; e2e dalle viste Investimenti, Pensione Integrativa, Ricorrenze e Transazioni.

**Documentazione:** manuali IT/EN, README, schema workbook se modificato, MAP e SECURITY_MODEL per ogni cambiamento a persistenza, migrazione o confini di salvataggio.

**Esito 2026-07-30:** implementata una trasformazione di dominio unica per le coppie movimento patrimoniale/Transazione, usata in entrambe le direzioni da investimenti ordinari e comparti pensione. Versamenti e Liquidazioni una tantum, iniziali, importati o derivati da ricorrenze sono trasferimenti con effetto di cassa `outflow`/`inflow`, restano esclusi dai consuntivi correnti e conservano UUID e collegamenti durante modifica, conferma e cancellazione. All’apertura dei workbook v5, una riconciliazione idempotente collega le corrispondenze esatte univoche, crea il solo record mancante, salva con verifica e backup e segnala senza modificare i casi ambigui; non è stata necessaria alcuna migrazione di schema. Versione applicativa portata a `1.5.0`; aggiornati demo sintetica, dizionari IT/EN, manuali, README, MAP, modello di sicurezza e test di dominio, importazione, workbook, rollover e Playwright. La milestone è stata implementata nel commit `a180618` e integrata in `main` dal merge commit `ad57bb0` tramite la PR `#29`. Gate locale verde: lint, typecheck, 109 test Vitest, build renderer/Electron, controllo documentale, `npm audit` con 0 vulnerabilità e Playwright IT/EN chiaro/scuro a 1080 px con verifica dei movimenti una tantum e periodici di investimenti e comparti nelle Transazioni. CI verdi sul branch (`30554793632`), sulla PR (`30554813762`), su `main` (`30555433619`) e sul tag `v1.5.0` (`30556082613`). Il workflow Release `30556082598` ha completato packaging, ispezione, smoke installato e pubblicazione per macOS ARM64/x64 e Windows x64; gli asset includono DMG, ZIP, installer Windows e `SHA256SUMS.txt`, i cui sei checksum corrispondono ai digest pubblicati.

## Patch `1.5.1` — Conti e flussi di cassa degli investimenti

**Obiettivo:** garantire che Versamenti e Liquidazioni incidano sempre sul conto interessato e sui totalizzatori di cassa, restando separati dai consuntivi di redditi e spese correnti.

**Attività**

- Portare il workbook allo schema v6 aggiungendo il conto ai movimenti e ai piani periodici di investimenti/comparti.
- Richiedere il conto nei moduli di Versamento, Liquidazione, versamento iniziale e contribuzione periodica, propagandolo alla Transazione e alla Ricorrenza collegate.
- Migrare i workbook v5 completando i riferimenti mancanti soltanto quando esiste un unico conto attivo; con più conti conservare il dato non assegnato senza indovinare.
- Mostrare in Transazioni Entrate di cassa, Uscite di cassa e saldo includendo i trasferimenti direzionati, mantenendo separati redditi e spese correnti nelle dashboard annuali.
- Includere i saldi iniziali nel saldo filtrato e nel saldo alla data odierna di Transazioni; ignorare nella liquidità e nel rollover i movimenti fuori dall’intervallo di apertura/chiusura del conto.
- Richiedere il conto per i nuovi movimenti di cassa; all’apertura completare i riferimenti storici soltanto quando il conto compatibile con la data è univoco e segnalare gli altri casi.
- Escludere ogni Transazione pianificata dalla liquidità corrente e dal saldo di apertura del rollover.
- Chiudere in modo idempotente i piani rateali attivi già arrivati a zero e mostrare, al passaggio del mouse o al focus sul KPI Rate residue, i piani ancora aperti con conteggio e prossima scadenza.
- Aggiornare con backup e rilettura la copia workbook privata usata per la verifica, senza inserirla in Git o nei test.

**Test richiesti:** migrazione v5→v6 con conto unico e casi non ambigui, propagazione bidirezionale una tantum/periodica, totalizzatori di cassa, saldo iniziale e confini temporali dei conti, riparazione conservativa dei conti mancanti e delle rate a zero, esclusione delle pianificazioni da liquidità e rollover, round-trip workbook, popup accessibile UI IT/EN chiaro/scuro e gate completo.

**Esito 2026-07-31:** implementato lo schema workbook v6 con conto sui movimenti e sui piani periodici di investimenti e comparti pensione. La migrazione v5 e la riparazione all’apertura completano i riferimenti soltanto quando il conto compatibile è univoco, mentre gli altri casi restano esplicitamente non assegnati e vengono segnalati. I trasferimenti direzionati partecipano ai totalizzatori Entrate/Uscite di cassa e alla liquidità del conto senza essere riclassificati come redditi o spese correnti; la liquidità e il rollover ignorano i movimenti fuori dall’intervallo di validità del conto e le pianificazioni. I saldi di Transazioni comprendono il saldo iniziale. I piani rateali attivi già a zero vengono chiusi all’apertura e il KPI Rate residue espone un dettaglio accessibile dei piani aperti. Aggiornati moduli, importazione, demo sintetica, manuali IT/EN, README, MAP e modello di sicurezza. La copia workbook privata è stata migrata con backup, rilettura strutturale e seconda apertura idempotente, senza inserirla in Git o nei test permanenti. Gate locale verde: lint, typecheck, 124 test Vitest, build renderer/Electron, controllo documentale, `npm audit` con 0 vulnerabilità e Playwright IT/EN chiaro/scuro a 1080 px.

**Esito pubblicazione 2026-07-31:** la patch è stata integrata in `main` dal merge commit `57769cb`, taggata come `v1.5.1` e pubblicata tramite il workflow Release `30616791317`; i run CI `30616791362` e `30616791565` sono verdi. La release comprende sei artifact applicativi per macOS ARM64/x64 e Windows x64 più `SHA256SUMS.txt`, tutti accompagnati dai digest SHA-256 registrati da GitHub.

## M20 — Casse, trasferimenti interni e indicatori di perdita

**Obiettivo:** distinguere il denaro contante dai saldi bancari mediante una o più Casse, rappresentare i prelievi come trasferimenti interni e rendere immediatamente visibili le posizioni di investimento o pensione in perdita.

**Attività pianificate**

- Riutilizzare il tipo conto `cash` come Cassa applicativa, separandone creazione, elenco e stato nella vista Impostazioni e consentendo più Casse personali, familiari o aziendali.
- Associare facoltativamente a ogni Cassa un conto di alimentazione predefinito, inteso come preferenza operativa e non come vincolo esclusivo; validare riferimenti, stato e valuta senza introdurre automatismi irreversibili.
- Portare il workbook allo schema v7 aggiungendo il conto destinazione ai trasferimenti interni e il conto di alimentazione alle Casse, con migrazione deterministica dei workbook v6 che non riclassifica né sposta movimenti storici in modo euristico.
- Rappresentare un prelievo o versamento di contante con una sola Transazione di trasferimento: uscita dal conto sorgente ed entrata nella Cassa destinazione, o percorso inverso, senza alterare la liquidità complessiva né i consuntivi di redditi e spese.
- Richiedere una Cassa per i nuovi movimenti con metodo di pagamento Contanti; quando ne esiste una sola può essere proposta automaticamente, mentre con più Casse la scelta resta esplicita.
- Rendere esplicito il conto o la Cassa interessati anche nei flussi collegati di Immobili, Automobile e Spese condivise, preservando la sincronizzazione bidirezionale con le Transazioni.
- Mostrare in Impostazioni il saldo corrente di ciascun conto e Cassa, includendo saldi iniziali, movimenti ordinari, trasferimenti direzionati e trasferimenti interni; applicare la stessa semantica al rollover annuale.
- Mostrare in Panoramica il saldo complessivo delle Casse e dividere i KPI filtrati di Transazioni in due file da tre: Entrate, Uscite e Saldo per i conti, poi gli stessi valori per le Casse.
- Colorare in rosso il controvalore mostrato nei box delle viste Investimenti e Pensione Integrativa quando è inferiore al capitale netto investito, calcolato nel dominio e aggregato correttamente per collettori e comparti.
- Correggere fuori da Git la copia workbook privata indicata dal proprietario, associando alla Cassa unica i soli movimenti in contanti e trasformando gli eventuali prelievi riconoscibili in trasferimenti interni; creare prima una copia recuperabile, verificare rilettura e seconda apertura idempotente e non introdurre nell’app una migrazione automatica di questi dati storici.

**Criteri di accettazione**

- Un movimento in contanti modifica esclusivamente il saldo della Cassa selezionata e non quello del conto bancario associato.
- Un trasferimento conto→Cassa riduce e aumenta dello stesso importo i rispettivi saldi, lasciando invariata la liquidità totale; sorgente e destinazione sono distinte, attive nella data e nella stessa valuta.
- Più Casse possono essere create, chiuse, riaperte e collegate a conti di alimentazione differenti senza perdere lo storico o impedire trasferimenti legittimi da altri conti.
- Il saldo Cassa della Panoramica coincide con la quota di liquidità attribuita alle Casse; i sei KPI di Transazioni applicano gli stessi filtri ma non mescolano saldi iniziali o movimenti tra conti e Casse.
- Workbook v6 e v7 si aprono, migrano e completano il round-trip senza perdita di dati; i movimenti storici ambigui restano invariati e vengono segnalati.
- I valori in perdita sono rossi soltanto quando il controvalore è strettamente minore del capitale netto investito e restano leggibili in italiano/inglese, tema chiaro/scuro e larghezza minima 1080 px.
- La copia workbook privata corretta resta esclusa da Git, fixture, log e servizi remoti ed è accompagnata da backup locale e verifica strutturale.

**Test richiesti:** unit test per effetti sui saldi, KPI filtrati separati, trasferimenti interni, validazione Cassa/metodo, capitale netto e aggregazioni; integration test per migrazione v6→v7, collegamenti, filesystem, backup, rollover e round-trip workbook con soli dati sintetici; regressione importazione e movimenti investimenti/pensione; Playwright IT/EN, chiaro/scuro e 1080 px per creazione Cassa, movimento contante, prelievo, due file di KPI e indicatori di perdita.

**Documentazione:** manuali IT/EN, README, schema workbook, MAP, SECURITY_MODEL, messaggi di migrazione e note di rilascio.

**Esito applicativo 2026-08-01:** implementate Casse multiple separate dai conti, conto di alimentazione predefinito facoltativo, saldi individuali, compatibilità tra metodo di pagamento e conto/Cassa e trasferimenti interni sorgente→destinazione neutrali per la liquidità complessiva. Lo schema workbook è v7 con migrazione conservativa v1–v6; i template di importazione sono v2 e rendono espliciti conto/Cassa e destinazione. Immobili, automobile, ricorrenze, spese condivise, investimenti e comparti propagano il riferimento coerente alle Transazioni. La Panoramica espone il Saldo Cassa; Transazioni separa in due righe i flussi e i saldi filtrati di Conto e Cassa, escludendo dai saldi le righe non assegnate. I box di investimenti, comparti e raccoglitori pensione mostrano in rosso il controvalore inferiore al capitale netto investito. Verifica locale completata con lint, typecheck, 132 test Vitest, build renderer/Electron, controllo documentale, `npm audit` senza vulnerabilità e 3 test Playwright a 1080 px; il collaudo interattivo ha coperto IT/EN e chiaro/scuro, creazione Cassa, prelievo, spesa contanti, riepiloghi separati e indicatori di perdita senza overflow o errori console.

**Esito conversione privata 2026-08-01:** dopo autorizzazione esplicita del proprietario a usare l'adapter Excel locale di ContaMì come fallback, il workbook originale è rimasto intatto ed è stata prodotta una copia separata in schema v7, esclusa da Git. La conversione ha creato la Cassa unica associata all'unico conto bancario, assegnato alla Cassa i movimenti contanti e i relativi record collegati e trasformato soltanto i prelievi riconoscibili in trasferimenti interni. Nessun movimento mancante è stato inventato. Superati rilettura strutturale e seconda apertura idempotente, conservazione dei conteggi, controllo riferimenti e saldi, scansione degli errori formula e verifica visiva locale dei 20 fogli tramite Quick Look e Playwright; dati e anteprime private non sono entrati in fixture, Git o servizi remoti.

**Esito pubblicazione 2026-08-01:** commit `bc9359b` integrato con fast-forward in `main`; CI su `main` (`30704258252`) e sul tag `v1.6.0` (`30704420829`) verdi su macOS e Windows. Il workflow Release `30704420835` ha completato packaging, ispezione, smoke del pacchetto e dell'installazione su entrambe le piattaforme e ha pubblicato sei artifact con `SHA256SUMS.txt`; i digest pubblicati coincidono con il manifesto. Il branch M20 è stato rimosso dopo le verifiche.

## M21 — Competenza e incasso delle rate di affitto

**Obiettivo:** rappresentare separatamente il mese di competenza di una rata di affitto e la data del suo incasso, affinché un pagamento tardivo saldi la rata corretta senza nascondere o anticipare le altre scadenze.

**Attività pianificate**

- Tracciare il flusso completo tra Ricorrenza, Transazione pianificata, registrazione immobile e riepilogo affitti, verificando localmente il caso Pasteur senza inserire dati privati in Git, log o test.
- Definire nel dominio un'identità stabile della rata e distinguere, dove necessario, data di competenza/scadenza e data effettiva di incasso; la liquidità segue l'incasso, mentre lo stato dell'affitto segue la rata di competenza.
- Correggere conferma, modifica, rigenerazione e riconciliazione delle rate affitto affinché un incasso tardivo aggiorni la scadenza originaria invece di consumare o marcare come pagata la rata del mese corrente.
- Conservare UUID e collegamenti bidirezionali tra immobile, ricorrenza e Transazione; impedire duplicati, salti mensili e riassociazione implicita in presenza di casi ambigui.
- Versionare schema e migrazione soltanto se servono nuovi campi persistenti; ogni riparazione automatica deve essere deterministica, idempotente, preceduta da backup e lasciare invariati i casi non univoci.
- Correggere su una copia separata il workbook privato indicato dal proprietario, mantenendo intatto l'originale e verificando rilettura, conteggi, collegamenti, seconda apertura idempotente e resa dei fogli interessati.
- Aggiornare la vista Immobili e gli eventuali dettagli affitto per rendere distinguibili rata dovuta, pagata puntualmente, pagata in ritardo e insoluta, con stringhe IT/EN e accessibilità invariata.

**Criteri di accettazione**

- Nel caso maggio pagato, giugno incassato ai primi di luglio e luglio non pagato, giugno resta visibile come rata saldata in ritardo e luglio resta visibile come insoluta.
- La data dell'incasso tardivo incide sulla liquidità del giorno effettivo senza spostare il mese di competenza della rata né alterare entrate storiche già confermate.
- Conferma, modifica, riapertura, rigenerazione delle pianificazioni e rollover non producono rate mancanti, doppie o associate al mese sbagliato.
- Workbook precedenti continuano ad aprirsi senza perdita dati; riparazioni e migrazioni non indovinano corrispondenze ambigue e una seconda apertura non riscrive il file.
- La copia privata corretta resta esclusa da Git, fixture, log, CI, artifact e servizi remoti ed è accompagnata da una copia recuperabile.

**Test richiesti:** unit test sintetici per pagamenti puntuali, tardivi, anticipati e mancati, confini di mese/anno e più insoluti; test di collegamento Ricorrenza/Transazione/Immobile, idempotenza, migrazione o riparazione, backup, round-trip e rollover; regressione liquidità e dashboard; Playwright IT/EN, chiaro/scuro e 1080 px sul caso giugno/luglio.

**Documentazione:** manuali IT/EN, README, schema workbook se modificato, MAP, SECURITY_MODEL per persistenza/riparazione e note di rilascio.

**Esito applicativo 2026-08-01:** individuata la causa nella precedente sovrapposizione tra data di scadenza/competenza e data effettiva del movimento: un incasso registrato a luglio veniva quindi interpretato come rata di luglio e non lasciava una rata distinta per giugno. Lo schema workbook è stato portato a v8 aggiungendo `dueDate` a Transazioni e Registrazioni immobiliari; la migrazione v1–v7 assegna il campo soltanto alle pianificazioni ancora aperte, per le quali la data precedente è univoca, e non indovina la competenza degli incassi storici confermati. La conferma di un movimento pianificato richiede ora la data effettiva, conserva scadenza, UUID e collegamenti e fa avanzare la ricorrenza alla prima rata ancora aperta. Modificare la competenza riapre la vecchia rata e riconcilia la nuova senza duplicati; le cadenze di fine mese restano ancorate anche attraverso febbraio e il rollover conserva le rate d'affitto insolute con la competenza originaria. La scheda dell'immobile mostra rate pagate, pagate in ritardo, insolute, future o con competenza storica non assegnata; pianificazioni e insoluti restano esclusi da liquidità, consuntivi e grafici degli incassi. Aggiornati demo sintetica, stringhe IT/EN, manuali, README, MAP e modello di sicurezza. Gate locale verde: lint, typecheck, 138 test Vitest, build renderer/Electron, controllo documentale e `npm audit` con 0 vulnerabilità; collaudo Playwright completato a 1080 px in IT/chiaro ed EN/scuro, inclusa la conferma con data effettiva e senza errori console.

**Esito correzione privata 2026-08-01:** il workbook originale è rimasto intatto ed è stata prodotta una copia separata in schema v8, con backup pre-correzione. Applicando esclusivamente la situazione confermata dal proprietario, l'incasso dei primi di luglio è stato associato alla competenza di giugno e la rata di luglio è stata ricostruita come pianificata e insoluta, senza alterare importi o inventare incassi. Dopo un'ulteriore conferma esplicita, i restanti bonifici storici d'affitto privi di competenza sono stati assegnati alla rata dello stesso mese dell'incasso; il caso giugno/luglio è rimasto separato. Superati rilettura strutturale, controllo dei collegamenti, assenza di competenze duplicate o non assegnate, seconda apertura idempotente, scansione degli errori formula e verifica visiva locale; workbook, backup e anteprime private restano esclusi da Git, fixture, CI, artifact e servizi remoti.

## M19 — Cambio tariffa delle ricorrenze

**Obiettivo:** consentire una variazione di importo con decorrenza esplicita, mantenendo immutati lo storico e le scadenze precedenti e aggiornando in modo deterministico tutte le Transazioni ancora programmate dal mese scelto in avanti.

**Attività pianificate**

- Aggiungere alla modifica di una ricorrenza l’azione **Cambia tariffa / Change rate**, con nuovo importo e mese di decorrenza obbligatori; la decorrenza è normalizzata al primo giorno del mese selezionato.
- Persistire una cronologia tariffaria versionata con importo e decorrenza, mantenendo l’importo originario come base, affinché riapertura, rigenerazione delle scadenze e rollover applichino sempre la tariffa corretta.
- Applicare la nuova tariffa soltanto alle Transazioni pianificate e non confermate con data uguale o successiva alla decorrenza; le Transazioni confermate e tutte le occorrenze precedenti restano immutate.
- Aggiornare in posto le Transazioni pianificate già esistenti e rigenerare soltanto quelle mancanti, preservando UUID e collegamenti quando possibile ed evitando duplicati.
- Applicare la stessa regola a servizi, entrate ricorrenti, investimenti periodici, comparti pensione, rate e ogni altro tipo di ricorrenza supportato.
- Per i piani rateali modificare l’importo delle sole rate future senza cambiare il numero di rate residue, la prossima scadenza, la data di fine o lo stato delle rate già confermate.
- Propagare l’importo aggiornato ai record collegati che nasceranno dalla futura conferma, inclusi movimenti di investimento/comparto e spese condivise, senza riscrivere record storici.
- Consentire più cambi tariffa successivi, validandone ordine, importi, date e sovrapposizioni; modifica o annullamento di un cambio futuro deve ricalcolare soltanto le occorrenze non confermate interessate.
- Eseguire ogni cambio in una sola trasformazione atomica con controllo della revisione, backup, rilettura e rollback, mostrando prima della conferma il numero di scadenze future che verranno aggiornate.
- Aggiornare lo schema workbook con una migrazione deterministica dalla v8 alla nuova versione necessaria; i workbook precedenti mantengono l’importo esistente come tariffa base e tutti i record già presenti restano invariati.

**Criteri di accettazione**

- Impostando un nuovo importo da un mese scelto, tutte e sole le scadenze non confermate da quel mese in avanti assumono la nuova tariffa.
- Le scadenze precedenti e ogni Transazione già confermata mantengono l’importo storico, anche dopo riapertura, modifica successiva, rollover o rigenerazione delle pianificazioni.
- Più cambi tariffa vengono applicati in ordine cronologico senza sovrapposizioni, duplicati o salti; la tariffa visibile per ciascuna scadenza è riconciliabile con la cronologia.
- Servizi, investimenti/comparti periodici, entrate, spese condivise e piani rateali conservano collegamenti e semantica finanziaria.
- Annullamento, errore o conflitto esterno lasciano invariato il workbook e l’ultima copia valida resta recuperabile.

**Test richiesti:** unit test su decorrenza mensile, confini anno, più variazioni, modifica/annullamento, importi invalidi e rate residue; integrazione su pianificazione, UUID, collegamenti, migrazione, backup, rollback, riapertura e rollover; regressione M18 per investimenti/pensioni; Playwright IT/EN e chiaro/scuro con anteprima e conferma da tastiera.

**Documentazione:** manuali IT/EN con esempi sintetici prima/dopo la decorrenza, README, schema workbook, MAP, SECURITY_MODEL, messaggi di migrazione e note di rilascio.

**Esito applicativo 2026-08-01:** introdotta la cronologia tariffaria persistente con tariffa base immutabile e una o più variazioni ordinate per mese di decorrenza. **Cambia tariffa / Change rate** mostra il numero di scadenze coinvolte e richiede conferma anche da tastiera; annullamento e validazioni non inviano modifiche. La trasformazione aggiorna in posto soltanto le Transazioni pianificate interessate, conserva UUID, operazioni confermate, rate residue, prossima scadenza e data di fine, e riallinea i record collegati di affitti, investimenti/comparti e spese condivise. Chiusura/riapertura, rigenerazione e rollover riapplicano la cronologia senza duplicati. Lo schema workbook è v9 con il foglio `Recurring Rate Changes`; la migrazione v8→v9 aggiunge una cronologia vuota senza modificare le raccolte esistenti e usa il normale flusso verificato con backup e rollback. Gate locale verde: lint, typecheck, 150 test Vitest, build renderer/Electron, controllo documentale, `npm audit` con 0 vulnerabilità e 4 test Playwright a 1080 px; collaudo UI completato in IT/chiaro ed EN/scuro, inclusi anteprima, conferma da tastiera e assenza di errori console.

## M16 — Pagamenti rateali dell’Automobile

**Obiettivo:** completare il collegamento già abbozzato tra Automobile e Ricorrenze, mantenendo le denominazioni visibili **Automobile / Vehicles** e facendo sì che un eventuale finanziamento del mezzo sia un unico piano rateale coerente, senza duplicati, riferimenti orfani o perdita dello storico.

**Attività pianificate**

- Aggiungere al modulo di creazione/modifica dell’Automobile una sezione facoltativa per il finanziamento con importo rata, frequenza, prossima scadenza, rate residue o data di fine, categoria, metodo di pagamento e conto/Cassa.
- Creare o aggiornare Automobile e relativa Ricorrenza con un solo comando atomico validato; riutilizzare il collegamento `vehicleId` già presente e garantire al massimo un piano rateale attivo gestito dal mezzo.
- Mantenere sincronizzati nome, frequenza, scadenze, rate residue, stato e riferimenti finanziari. Le variazioni successive dell’importo devono riusare la cronologia tariffaria della M19, senza modificare tariffa base o rate confermate.
- Classificare come `installment` le registrazioni Automobile generate dalle scadenze del piano, conservando UUID e collegamenti bidirezionali con le Transazioni durante modifica e conferma.
- Chiudere e riaprire insieme mezzo e piano collegato, eliminando o rigenerando soltanto le pianificazioni pertinenti; definire una cancellazione esplicita che preservi le operazioni confermate e rimuova ogni riferimento orfano.
- Rendere rollover e importazione conservativi: copiare il piano soltanto insieme al mezzo attivo, mantenere rate residue e cronologia tariffaria ed evitare ricorrenze riferite a mezzi assenti.

**Criteri di accettazione**

- Navigazione, titoli e manuali continuano a usare **Automobile** in italiano e **Vehicles** in inglese; non è prevista alcuna rinomina dello schema tecnico o dei fogli esistenti.
- Salvare un mezzo con finanziamento produce una sola Ricorrenza collegata e immediatamente visibile; modifiche ripetute e cambio tariffa non creano duplicati né riscrivono rate confermate.
- Ogni scadenza pianificata o confermata conserva una sola coppia Transazione↔registrazione Automobile classificata come rata, con importo e UUID coerenti.
- Chiusura, riapertura, cancellazione, importazione e rollover preservano lo storico confermato e non lasciano Ricorrenze, Transazioni o registrazioni con riferimenti orfani.
- Il flusso resta accessibile da tastiera e leggibile in tema chiaro/scuro, IT/EN e alla larghezza minima di 1080 px.

**Test richiesti:** unit test del comando atomico mezzo/ricorrenza, unicità del piano, classificazione `installment` e transizioni chiusura/riapertura/cancellazione; integrazione e round-trip workbook; regressione importazione, cambio tariffa M19, rate residue e rollover senza orfani; Playwright di creazione, modifica e riapertura del finanziamento in IT/EN e chiaro/scuro.

**Documentazione:** aggiornamento di manuali IT/EN, README, MAP, schema workbook se necessario, SECURITY_MODEL se cambia il comando persistito e note di rilascio.

**Esito 2026-08-01:** aggiunta nel modulo Automobile la sezione facoltativa per il finanziamento con importo, frequenza, prossima scadenza, rate residue o data di fine, categoria, metodo e Conto/Cassa. Il nuovo comando atomico salva mezzo e piano in un’unica trasformazione, sincronizza il nome, mantiene un solo piano attivo per `vehicleId` e riusa la cronologia tariffaria M19 senza modificare tariffa base o rate confermate. Ogni scadenza genera una sola coppia Transazione↔registrazione Automobile classificata `installment`; chiusura e riapertura agiscono su entrambi, la cancellazione definitiva è bloccata in presenza di storico e la disattivazione del finanziamento conserva le operazioni confermate. Importazione e rollover non mantengono piani riferiti a mezzi assenti o esclusi. Lo schema workbook resta v9 perché i collegamenti persistenti necessari erano già disponibili. Versione applicativa portata a `1.9.0`; aggiornati UI IT/EN, manuali, README, quick start, MAP, modello di sicurezza e specifica import. Gate locale verde: lint, typecheck, 161 test Vitest, build renderer/Electron, controllo documentale, `npm audit` con 0 vulnerabilità e 5 test Playwright a 1080 px, inclusi creazione, modifica, chiusura/riapertura in IT/scuro ed EN/chiaro senza errori console o overflow. Collaudo del proprietario superato. La milestone è stata implementata nel commit `213abbd` e integrata in `main` con fast-forward. CI verdi sul branch (`30716282002`), su `main` (`30716477387`) e sul tag `v1.9.0` (`30716648185`). Il workflow Release `30716648199` ha completato packaging, ispezione e smoke test del pacchetto e dell’installazione su macOS ARM64/x64 e Windows x64; la release pubblicata contiene sei artifact applicativi e `SHA256SUMS.txt`, verificato rispetto ai digest SHA-256 esposti da GitHub.

## M22 — Aggiornamento Node.js e toolchain

**Obiettivo:** aggiornare e rendere coerente la versione minima di Node.js usata da sviluppo, CI e documentazione, così da rimuovere il blocco ricorrente degli aggiornamenti della toolchain e integrare in sicurezza `jsdom` 30.

**Contesto:** la PR automatica Dependabot #45 proponeva `jsdom` da `29.1.1` a `30.0.1`, ma è stata chiusa senza merge perché `jsdom` 30 richiede Node.js `^22.22.2 || ^24.15.0 || >=26`, mentre ContaMì dichiara ancora Node.js `>=22.12.0`. La stessa incompatibilità di versione è già emersa più volte e deve essere risolta alla radice, non rimandata al successivo avviso automatico.

**Attività pianificate**

- Scegliere una baseline Node.js LTS supportata che soddisfi i requisiti delle dipendenze dirette, di Electron e degli strumenti di build su macOS e Windows.
- Allineare `package.json`, lockfile, workflow GitHub Actions, istruzioni operative e ogni altro punto che dichiara o installa Node.js, evitando versioni divergenti tra locale e CI.
- Aggiornare `jsdom` alla versione 30 e revisionare gli aggiornamenti transitivi del lockfile senza incorporare modifiche applicative estranee.
- Verificare compatibilità di Vitest, Playwright, Electron, moduli nativi, packaging e script di release con la nuova baseline.
- Aggiungere un controllo automatico che rilevi quando la versione Node.js configurata nella CI non soddisfa più `engines` o i requisiti delle dipendenze dirette, così da prevenire il ripetersi del problema.
- Riesaminare gli avvisi Dependabot rimasti dopo l’aggiornamento e documentare eventuali blocchi reali invece di lasciare PR automatiche ricorrenti senza una decisione esplicita.

**Criteri di accettazione**

- Installazione pulita e comandi di sviluppo funzionano con la nuova versione minima documentata di Node.js su macOS e Windows.
- `jsdom` 30 è integrato senza errori di engine, regressioni dei test o vulnerabilità introdotte.
- Configurazione locale, CI e manuali indicano la stessa baseline; un disallineamento futuro viene intercettato automaticamente.
- Build e pacchetti conservano sandbox, CSP, blocchi di rete e separazione renderer/main esistenti.

**Test richiesti:** installazione pulita, lint, typecheck, test unitari e di integrazione, build, Playwright, packaging/smoke macOS e Windows, controllo documentale e `npm audit`.

**Documentazione:** aggiornamento di `AGENTS.md`, README, manuali IT/EN, workflow e note di rilascio; `MAP.md` e `SECURITY_MODEL.md` soltanto se cambiano struttura o confini di sicurezza.

**Esito 2026-08-03:** scelta come baseline unica Node.js 24 LTS `24.15.0`, prima versione della linea 24 compatibile con `jsdom` 30; `package.json` limita lo sviluppo alla linea `^24.15.0`, `.node-version` alimenta sia gli ambienti locali sia `actions/setup-node` in CI e i riferimenti IT/EN sono stati allineati. `jsdom` è stato aggiornato a `30.0.1`; un nuovo controllo di preflight usa `semver` per verificare baseline, `engines`, requisiti Node delle dipendenze dirette, workflow e documentazione, impedendo future divergenze. La versione applicativa è `1.10.0`. Installazione pulita e gate Windows con Node `24.15.0` verdi: controllo baseline, lint, typecheck, 161 test Vitest, build renderer/Electron, controllo documentale, 5 test Playwright IT/EN e chiaro/scuro a 1080 px, `npm audit` con 0 vulnerabilità, packaging Windows x64, ispezione `app.asar`, smoke unpacked e ciclo installazione/avvio/rimozione NSIS. Non risultano PR Dependabot aperte; la PR #45 è assorbita dalla milestone. Commit funzionale `89920d6`, PR `#46` e merge commit `22093a7`; CI verdi sul branch e sulla PR (`30802370343`, `30802386874`), su `main` (`30802735364`) e sul tag `v1.10.0` (`30803086034`). Il workflow Release `30803085947` ha completato packaging, ispezione e smoke unpacked/installato su macOS ARM64/x64 e Windows x64; la release stabile pubblicata contiene sei artifact applicativi e `SHA256SUMS.txt`, riconciliato con tutti i digest SHA-256 esposti da GitHub.

## M23 — Landing page bilingue per GitHub Pages

**Obiettivo:** mantenere nella directory pubblicabile `docs/` una presentazione pubblica, statica e bilingue di ContaMì, coerente con l’identità visiva dell’applicazione e distribuibile tramite GitHub Pages.

**Attività pianificate**

- Realizzare una landing page responsive in italiano e inglese, con selettore lingua chiaro e contenuti equivalenti nelle due versioni.
- Riutilizzare la stessa icona di ContaMì e la palette del programma, mantenendo leggibilità, focus tastiera, contrasto e supporto al tema chiaro/scuro.
- Presentare in modo sintetico le funzionalità principali: Panoramica, Transazioni, Immobili, Automobile, Investimenti, Pensione Integrativa, Ricorrenze, Spese condivise, Casse e workbook locale.
- Preparare screenshot e brevi GIF dimostrative esclusivamente con dati sintetici, senza workbook, percorsi o informazioni personali; ottimizzare peso, testo alternativo e fallback statici, rispettando `prefers-reduced-motion`.
- Inserire collegamenti evidenti alla pagina dei download/release e al repository GitHub, con gestione comprensibile del caso in cui una risorsa richieda ancora autenticazione.
- Rendere tutti gli asset e i percorsi compatibili con GitHub Project Pages, senza dipendenze da CDN, font remoti, telemetria, cookie o servizi di terze parti.
- Configurare la pubblicazione GitHub Pages da `main` + `/docs`, mantenendo anteprima e verifica automatica nella CI generale.

**Criteri di accettazione**

- La pagina viene pubblicata correttamente dal contenuto di `docs/` e funziona anche sotto il percorso del progetto GitHub Pages, senza link o asset assoluti rotti.
- Italiano e inglese descrivono le stesse funzionalità; navigazione, cambio lingua, immagini, GIF e link restano utilizzabili da tastiera e su desktop/mobile.
- Icona, colori e tono visivo sono riconoscibili come ContaMì e non richiedono asset remoti.
- I link a download e repository puntano alle destinazioni GitHub corrette; nessun dato reale compare nel codice, nei media o nella cronologia Git.
- Il sito non modifica il modello local-first dell’app e non introduce telemetria, profilazione o capacità di rete nel pacchetto Electron.

**Test richiesti:** build o validazione statica, controllo link e percorsi GitHub Pages, verifica IT/EN, responsive e chiaro/scuro, navigazione tastiera, accessibilità, `prefers-reduced-motion` e ispezione dei media sintetici prima del commit.

**Documentazione:** README con link alla landing e istruzioni di pubblicazione, `MAP.md` per le directory `docs/` e `documents/`, note di manutenzione dei media e aggiornamento di `SECURITY_MODEL.md` per distinguere chiaramente il sito pubblico dall’app desktop senza rete.

**Completamento anticipato 2026-08-04:** creato il branch `milestone/23-landing-page` dalla `main` pulita `1.11.1`, separando fin dall’inizio la consegna web dal versionamento dell’applicazione desktop. La direzione visiva selezionata usa un impianto editoriale coerente con i temi chiaro/scuro e la palette di ContaMì; la pagina statica rileva italiano soltanto quando la lingua del browser inizia con `it`, usa inglese in ogni altro caso e permette un override manuale locale. I collegamenti puntano sempre alla release GitHub più recente e al repository. I media rimangono relativi e locali: screenshot IT/EN chiaro/scuro come poster e dimostrazioni MP4 H.264 ottimizzate, derivate dalle GIF sorgente mantenute fuori da Git. La pubblicazione GitHub Pages usa il contenuto di `docs/` su `main`, mentre la validazione statica resta nel preflight generale. Il collaudo dedicato usa un server HTTP che espone soltanto `docs/`, senza live reload incompatibile con la CSP, e copre rilevamento/persistenza lingua, temi e media localizzati, riproduzione delle demo, focus da tastiera e assenza di overflow mobile. Il confronto visuale con il concept editoriale approvato è stato completato a desktop, tema scuro e mobile: identità, gerarchia e ritmo risultano coerenti; la maggiore estensione verticale è intenzionale per dare a ciascuna delle nove aree una descrizione e una demo completa. La hero usa prospettiva CSS tridimensionale e i media ritagliano a runtime la cornice del sistema operativo senza alterare gli asset sorgente. L’ispezione locale con contact sheet di tutti i 36 poster e di fotogrammi delle 18 demo non ha rilevato nomi personali, percorsi privati o dati finanziari dell’utente. L’ambiente locale Windows del proprietario è aggiornato a Node.js `24.18.1`; i gate locali sono verdi: validazione dei nove set bilingui, lint, typecheck, build renderer/Electron, 184 test Vitest, controllo documentale, `npm audit` con 0 vulnerabilità e 7 test Playwright dedicati alla landing senza errori console, richieste runtime remote o overflow a 1080/1536 px e mobile. La consegna web iniziale è identificata dal tag separato `landing-v1.0.0`, che non attiva il workflow Release desktop. La pubblicazione effettiva viene verificata in CI/Pages dopo l’integrazione in `main`.

**Adeguamento sorgente Pages 2026-08-05:** sul branch `patch/landing-v1.0.1-docs-source` la landing è stata spostata integralmente da `landing/` a `docs/`, con `.nojekyll`; i tre documenti tecnici preesistenti e le note di manutenzione sono stati separati in `documents/`. Il workflow Pages personalizzato è stato rimosso in favore della modalità GitHub **Deploy from a branch**, configurata su `main` + `/docs`; validazione statica e Playwright restano nella CI multipiattaforma. Gate locali Windows verdi con Node.js `24.18.1`: baseline Node, validazione dei nove set bilingui, lint, typecheck, build renderer/Electron, 197 test Vitest, controllo documentale, `npm audit` con 0 vulnerabilità e 7 test Playwright dedicati alla landing in IT/EN e chiaro/scuro, inclusi media, tastiera, mobile e apertura diretta da `docs/index.html`. Il commit `aa5b880` è stato integrato tramite PR `#57` nel merge commit `5fb4314`; CI verdi sul branch (`31014448725`), sulla PR (`31014481205`), su `main` (`31014785080`) e sul tag annotato `landing-v1.0.1` (`31015096299`). La pubblicazione Pages da `main/docs` è verde (`31015833448`) ed è stata riconfermata dopo M11 (`31016224632`); il tag web non ha avviato la Release desktop. Con la successiva chiusura di M10 e M11, la previsione desktop `v1.14.0` è stata ritirata: M23 è completa come release web separata e l’ultima release dell’app resta `v1.13.0`.

**Patch collegamenti ai manuali 2026-08-08:** assegnata la revisione web `landing-v1.0.2` al branch `patch/landing-v1.0.2-manual-links`. La hero e la fascia finale aggiungono una terza CTA che apre `ISTRUZIONI.md` quando la lingua attiva è italiana e `INSTRUCTIONS.md` in inglese. Nella hero, prezzo/piattaforme/licenza e le CTA sono raccolti in una fascia inferiore: i pulsanti seguono l'ordine Download, Istruzioni, GitHub sulla stessa riga a desktop e tornano a capo in modo responsive sotto 981 px. Poiché GitHub Pages pubblica soltanto `docs/`, i link usano destinazioni assolute `blob/main` nello stesso repository e vengono aggiornati localmente insieme alle stringhe, senza fetch automatici, nuove origini di asset, telemetria o modifiche all’app Electron. Validazione statica ed E2E coprono entrambe le destinazioni, ordine e geometria desktop della fascia hero, cambio lingua persistito, temi, tastiera, mobile e assenza di richieste runtime remote. Gate locale verde con Node.js `24.18.1`: preflight completo, 202 test Vitest, build renderer/Electron, CSP rigorosa, controllo di 15 documenti, 7 test Playwright della landing e `npm audit` con 0 vulnerabilità. Il collaudo Playwright CLI ha verificato la fascia in IT/chiaro a 1080 px, EN/scuro a 1080 e 1536 px e mobile a 390 px: nessuna sovrapposizione o eccedenza orizzontale e zero errori/warning console. Il commit `75b1591` è stato integrato tramite PR `#63` nel merge commit `592cc58`; CI verdi sulla PR (`31260886044`), sul branch dopo il rerun di un timeout E2E Windows transitorio e non correlato alla landing (`31260869612`), su `main` (`31261162470`) e sul tag annotato `landing-v1.0.2` (`31261312964`). GitHub Pages ha pubblicato correttamente `main/docs` (`31261162038`); il tag web non ha avviato il workflow Release desktop.

## M24 — Saldi filtrati puri e totali odierni separati

**Obiettivo:** rendere immediatamente confrontabili sia il risultato economico del sottoinsieme filtrato sia la situazione assoluta di Conto e Cassa alla data odierna, evitando che i saldi iniziali alterino il significato di un filtro.

**Comportamento previsto**

- Senza filtri attivi, i KPI **Saldo Conto** e **Saldo Cassa** comprendono i rispettivi saldi iniziali e tutti gli effetti delle righe dell’anno mostrate dalla vista, incluse le pianificazioni come già previsto dai KPI superiori.
- Quando è attivo almeno uno tra testo, tipo, categoria, metodo di pagamento o mese, gli stessi KPI escludono ogni saldo iniziale e mostrano il netto puro delle sole righe corrispondenti.
- **Entrate** e **Uscite** filtrate continuano a usare lo stesso insieme visibile e i trasferimenti interni restano attribuiti in modo opposto a Conto e Cassa.
- **Totali alla data odierna** usa sempre tutte le Transazioni confermate dall’inizio dell’anno fino a oggi, senza dipendere dai filtri, dalle righe future o dalle pianificazioni.
- La fascia odierna espone due righe distinte, Conto e Cassa, ciascuna con entrate, uscite e saldo comprensivo dei saldi iniziali disponibili entro la data odierna.
- La trasformazione resta nel dominio puro; non cambiano schema workbook, migrazioni, persistenza, IPC, preload, rete o capacità del renderer.

**Criteri di accettazione**

- Applicando qualunque filtro, il saldo mostrato coincide con entrate meno uscite del solo sottoinsieme e non incorpora saldi iniziali di Conto o Cassa.
- Azzerando tutti i filtri, i saldi iniziali tornano inclusi nei KPI e sono indicati nel dettaglio del riquadro.
- Modificare o azzerare i filtri non cambia nessuno dei sei valori odierni; i due saldi odierni si riconciliano con saldo iniziale più movimenti confermati attribuiti al rispettivo gruppo.
- Italiano/inglese, tema chiaro/scuro e larghezza minima 1080 px restano leggibili, senza overflow e con gruppi accessibili separati.

**Test richiesti:** unit test di dominio per inclusione/esclusione esplicita dei saldi iniziali; regressione renderer su filtro attivo/azzerato e invarianza dei totali odierni; suite completa; Playwright CLI IT/EN, chiaro/scuro e 1080 px con dati sintetici; lint, typecheck, build, controllo documentale e `npm audit`.

**Documentazione:** `PLAN.md`, README, manuali IT/EN, quick start, MAP e SECURITY_MODEL; versione applicativa sorgente `1.14.0`. Nessun workbook privato, screenshot allegato o dato reale viene copiato in test, fixture o artifact.

**Esito locale 2026-08-08:** creato il branch `milestone/24-transaction-balance-summaries` dalla `main` pulita e portata la versione sorgente a `1.14.0`. Il dominio espone la scelta esplicita di includere il saldo iniziale nel saldo calcolato; la vista la disattiva quando esiste almeno un filtro e usa invece tutte le righe non filtrate, confermate e comprese tra inizio anno e data odierna per i due riepiloghi assoluti Conto/Cassa. Aggiunte stringhe IT/EN, layout accessibile e regressioni sintetiche di dominio e renderer; README, manuali, quick start, MAP e modello di sicurezza sono allineati. Durante il gate `npm audit` ha segnalato due nuove vulnerabilità high transitive, risolte con i soli aggiornamenti compatibili `js-yaml 4.3.1` e `nanoid 3.3.18`; l’audit finale è a 0 vulnerabilità. Gate locale verde su Node.js `24.18.1`: lint, typecheck, 202 test Vitest, build renderer/Electron, controllo documentale, CSP rigorosa e 9 test Playwright automatici. Il collaudo Playwright CLI con dati sintetici ha verificato filtro Carta+agosto, reset, invarianza dei sei totali odierni, IT/chiaro ed EN/scuro a 1080 px, assenza di overflow orizzontale ed errori/warning console. Non sono stati usati né modificati workbook o screenshot privati. Al termine del gate locale restavano da eseguire CI macOS/Windows, packaging, checksum e release, successivamente completati come registrato di seguito.

**Pubblicazione 2026-08-08:** commit funzionale `9970652`, PR `#61` e merge commit `556bad1`. CI macOS/Windows verdi sul branch (`31254922399`), sulla PR (`31254932709`), su `main` (`31255066780`) e sul tag annotato `v1.14.0` (`31255255530`); Pages da `main/docs` verde (`31255066437`). Il workflow Release `31255255533` ha completato preflight, packaging, ispezione e smoke installato su macOS e Windows, pubblicando sei artifact applicativi non firmati e `SHA256SUMS.txt`. I sei checksum del file sono stati riconciliati con i digest SHA-256 calcolati da GitHub. M24 e la release desktop `v1.14.0` sono completate.

## Patch 1.14.1 / landing-v1.0.3 — Trasparenza dell’icona

**Obiettivo:** eliminare gli angoli neri visibili quando l’icona ContaMì viene mostrata senza la maschera applicata dal sistema operativo, in particolare nella landing pubblica e nel DMG macOS.

**Comportamento previsto**

- `assets/icon.png` resta la sorgente canonica condivisa dal packaging macOS e conserva dimensioni e contenuto grafico, ma usa un canale alpha reale con angoli completamente trasparenti.
- `docs/assets/contami-icon.png` resta una copia byte-identica della sorgente canonica, così favicon, testata e footer della landing non possono divergere dall’icona distribuita.
- L’ICO Windows già trasparente e l’aspetto dell’icona dell’app restano invariati.
- La validazione statica decodifica il PNG senza dipendenze esterne, verifica formato RGBA, dimensioni, centro opaco, quattro angoli trasparenti e identità tra copia pubblica e sorgente.

**Test richiesti:** validazione landing, lint, typecheck, suite Vitest, build, controllo documentale, `npm audit`, Playwright landing IT/EN chiaro/scuro e packaging DMG macOS con ispezione dell’asset generato.

**Esito locale 2026-08-08:** sostituito il PNG RGB opaco condiviso da landing e packaging macOS con una versione RGBA delle stesse dimensioni e con angoli trasparenti; l’ICO Windows, già corretto, è rimasto invariato. La validazione statica rifiuta ora copie landing diverse dalla sorgente canonica, PNG senza RGBA, dimensioni inattese, centro non opaco o uno dei quattro angoli non trasparente. Gate locale verde su Node.js `24.18.1`: lint, typecheck, 202 test Vitest, build renderer/Electron, controllo di 15 documenti, `npm audit` con 0 vulnerabilità e 7 test Playwright della landing. Il collaudo Playwright CLI ha verificato IT/chiaro ed EN/scuro a 1080 px senza spigoli neri, warning console o richieste remote. Dopo un’installazione pulita delle dipendenze per rimuovere copie locali duplicate dentro `node_modules`, il packaging macOS ARM64 non firmato ha prodotto ZIP e DMG; il volume montato in sola lettura contiene una copia byte-identica del PNG canonico e usa lo stesso `icon.icns` trasparente per volume e applicazione, con angoli alpha zero nella variante 1024 px.

**Pubblicazione 2026-08-08:** i commit `eb94ba6` e `c594dff` sono stati integrati con fast-forward in `main`; la CI `31264986444` è verde su macOS e Windows e il deploy Pages `31264985917` è completato. I tag annotati `v1.14.1` e `landing-v1.0.3` puntano a `c594dff`. Il workflow Release `31265133645` ha completato preflight, packaging, ispezione e smoke del pacchetto e dell'installazione su entrambe le piattaforme, pubblicando sei artifact applicativi non firmati e `SHA256SUMS.txt`. I sei checksum del manifesto coincidono riga per riga con i digest SHA-256 calcolati da GitHub sugli asset pubblicati.

## M25 — Report immobili per proprietari

**Obiettivo:** produrre per ogni immobile un resoconto bilingue, chiaro e riconciliabile con il workbook, stampabile tramite il dialogo di sistema o salvabile localmente in PDF per la condivisione con il comproprietario.

**Comportamento previsto**

- Dalla scheda del singolo immobile l’utente sceglie **Anno corrente** oppure **Intera storia**, indica i nomi dei due proprietari e avvia **Stampa** o **Salva PDF**. Le quote percentuali derivano sempre da `ownershipShare` e dal suo complemento, senza duplicare o modificare i dati autorevoli.
- Il report è diviso in sezioni autonome: immobile e periodo, sintesi entrate/uscite, ripartizione per proprietario, andamento dei costi, movimenti di condominio, utenze, previsioni fino a fine anno, valore di mercato e movimenti economici inclusi.
- Per l’anno corrente entrate, uscite, condominio, costi/consumi di elettricità, gas, telefono/internet e acqua e valore di mercato sono raggruppati mese per mese. Il valore di mercato mensile usa l’ultima valutazione disponibile alla fine del mese e non inventa variazioni future.
- Per l’intera storia le stesse grandezze sono raggruppate anno per anno, riusando i consuntivi `Property History` per gli anni archiviati e le registrazioni confermate per l’anno attivo. Il documento distingue esplicitamente aggregati storici e righe puntuali ancora disponibili.
- Le spese previste comprendono soltanto Transazioni `expense` pianificate e collegate all’immobile, con scadenza dalla data locale odierna al 31 dicembre dell’anno attivo; righe confermate, entrate e movimenti non collegati sono esclusi. Il totale previsto resta separato dal consuntivo e confluisce anche nel totale proiettato di fine anno.
- Totale consuntivo, totale previsto e totale proiettato mostrano al centesimo la quota personale e quella del comproprietario. Importi e percentuali restano riconciliabili con i totali di sezione.
- Il PDF usa solo HTML/CSS e grafica vettoriale generati localmente, senza script, font o asset remoti. Ogni testo proveniente dal workbook o dal modulo viene sottoposto a escaping; il renderer invia soltanto UUID immobile, periodo, lingua, azione e nomi limitati, mai percorsi.
- Il percorso PDF viene scelto esclusivamente da un dialogo nativo nel main process; al renderer torna soltanto annullamento o nome base del file. La stampa usa il dialogo di sistema e lo stesso documento già validato. Nessun report viene inserito nel workbook, nei backup o nei log.
- Per mantenere un budget esplicito, ciascuna tabella di dettaglio include al massimo 2.000 righe ordinate cronologicamente e segnala l’eventuale troncamento; aggregazioni e totali continuano a usare l’intero insieme validato.
- Non cambiano schema workbook, migrazioni o adapter Excel/Numbers. Il dominio espone soltanto trasformazioni pure; servizio PDF, IPC/preload e renderer restano separati.

**Criteri di accettazione**

- Con dati sintetici, i totali di entrate, uscite, condominio, utenze, consumi, previsioni e quote coincidono con le righe/aggregati origine, senza doppio conteggio delle coppie Property Entry↔Transaction.
- Anno corrente produce dodici periodi mensili; intera storia produce un periodo per ogni anno disponibile e non perde i consuntivi ereditati dal rollover.
- Elettricità usa kWh, gas e acqua m³, telefono/internet il solo costo; periodi privi di dati restano leggibili e non vengono rappresentati come misurazioni inventate.
- Il valore di mercato usa acquisto, valutazioni e valori annuali disponibili in ordine temporale; la quota patrimoniale dei proprietari resta distinta dal valore totale dell’immobile.
- Stampa e salvataggio PDF funzionano su macOS e Windows, mantengono intestazione, piè di pagina, numeri pagina, tabelle e grafici leggibili e non espongono percorsi al renderer.
- Dialogo, stati caricamento/disabilitato/errore, focus tastiera e azioni sono leggibili in IT/EN, tema chiaro/scuro e a larghezza minima 1080 px.
- Nessun workbook, report o dato privato entra in Git, test, screenshot, log o artifact.

**Test richiesti:** unit test delle aggregazioni mensili/annuali, quote, carry-forward del valore, consuntivi storici, previsioni e limiti; test HTML per escaping e sezioni IT/EN; test IPC e servizio main per dialoghi, nomi file redatti, stampa/salvataggio e cancellazione; rendering di PDF sintetici con estrazione testo e ispezione visuale delle pagine; test renderer e Playwright CLI IT/EN, chiaro/scuro e 1080 px; lint, typecheck, suite completa, build, controllo documentale e `npm audit`.

**Documentazione:** `PLAN.md`, README, manuali IT/EN, quick start, MAP e SECURITY_MODEL; versione applicativa sorgente `1.15.0`. La milestone non autorizza pubblicazione di report reali né modifica dei dati utente.

**Avvio 2026-08-22:** creato il branch `milestone/25-property-owner-reports` dalla `main` pulita `v1.14.1`. Il perimetro è read-only rispetto al workbook e non introduce rete, telemetria, servizi remoti o persistenza di nomi dei proprietari.

**Esito locale 2026-08-22:** implementati trasformazione di dominio, documento HTML/CSS bilingue, finestra Electron isolata, stampa, salvataggio PDF atomico, canale IPC ristretto, dialogo renderer e documentazione. La verifica con soli dati sintetici ha superato `npm run lint`, `npm run typecheck`, 215 test Vitest in 43 file, `npm run build`, `node scripts/check-required-docs.mjs`, `npm audit` con zero vulnerabilità e tutti gli 11 test Playwright a 1080 px. Il workflow Playwright CLI ha controllato manualmente IT/EN e chiaro/scuro. Due PDF A4 sintetici, corrente IT e storico EN, sono stati estratti e ispezionati pagina per pagina: entrambi hanno tre pagine, nessun JavaScript e nessuna pagina bianca residua. Restano intenzionalmente esterni a questo esito locale packaging su macOS/Windows, ispezione `app.asar`, smoke degli artifact, firma, tag e pubblicazione della release.

**CI 2026-08-22:** aperta la PR `#71`; le esecuzioni definitive `32589662261` e `32589664386`, attivate rispettivamente da push e pull request sull'ultimo commit del branch, hanno completato con esito verde i job Quality su macOS e Windows, inclusi preflight, Playwright applicazione/landing e audit.

**Pubblicazione 2026-08-23:** la PR `#71` è stata integrata in `main` dal merge commit `f8db441`; la CI `32601241937` è verde su macOS e Windows e Pages `32601241838` è completato. Il tag annotato `v1.15.0` punta allo stesso merge e la relativa CI `32601428740` è verde su entrambe le piattaforme. Il workflow Release `32601428746` ha completato preflight, packaging, ispezione di `app.asar`, smoke del pacchetto e smoke installato su macOS ARM64/x64 e Windows x64, pubblicando sei artifact applicativi non firmati più `SHA256SUMS.txt`. Tutti i sei digest ricalcolati dai file pubblicati coincidono con il manifesto e tutti i sette file, manifesto incluso, coincidono con i digest SHA-256 registrati da GitHub. M25 e la release desktop `v1.15.0` sono completate.

## M26 — Riconciliazione del capitale investito e riepiloghi dei movimenti

**Obiettivo:** rendere affidabile e auditabile la modifica di Versamenti e Liquidazioni e mostrare separatamente le componenti che determinano il capitale netto di investimenti e pensioni integrative.

**Attività pianificate**

- Riprodurre localmente il problema segnalato usando il workbook privato soltanto in lettura e copie tecniche temporanee, senza inserirlo in Git, fixture, log, screenshot, servizi remoti o artifact.
- Tracciare il flusso completo di creazione e modifica tra `Investment Entry` e `Transaction`, incluse posizioni ordinarie, comparti pensione, versamento iniziale, movimenti successivi e liquidazioni.
- Correggere la trasformazione di dominio affinché ogni modifica aggiorni in posto la stessa coppia UUID bidirezionale, senza creare righe aggiuntive, lasciare il vecchio effetto di cassa o moltiplicare il capitale investito.
- Rendere conservativa e idempotente la gestione di collegamenti storici mancanti o incoerenti: riutilizzare soltanto corrispondenze esplicite o esatte e univoche, segnalare le ambiguità e non indovinare associazioni.
- Definire una trasformazione pura unica per quattro grandezze: capitale iniziale, versamenti successivi, liquidazioni e saldo netto tra capitale versato e liquidato. Le sole righe confermate partecipano ai totali; valutazioni e pianificazioni restano escluse.
- Mostrare i quattro riepiloghi nella pagina Investimenti e nel dettaglio di ogni posizione finale; aggregare senza doppio conteggio eventuali gruppi di investimento.
- Mostrare gli stessi quattro riepiloghi nella pagina Pensione Integrativa, nel dettaglio di ogni comparto e, per i raccoglitori, come somma dei soli comparti finali.
- Mostrare nel box Patrimonio netto della Panoramica anche il valore al netto degli immobili, calcolato sottraendo la quota immobiliare già inclusa nel totale.
- Aggiungere tutte le nuove stringhe in italiano e inglese, mantenendo stati vuoto/errore/caricamento/disabilitato, focus tastiera, temi chiaro/scuro e leggibilità a 1080 px.
- Conservare schema workbook v9, IPC, preload, rete e confini del renderer se i campi persistenti esistenti risultano sufficienti; qualsiasi migrazione necessaria dovrà essere prima versionata e documentata.

**Criteri di accettazione**

- Modificare ripetutamente importo, data, descrizione, tipo, categoria, metodo o Conto/Cassa di un Versamento o di una Liquidazione conserva una sola `Investment Entry` e una sola `Transaction` collegate dagli stessi UUID.
- Dopo ogni modifica, il capitale investito e il saldo del Conto/Cassa cambiano soltanto per il delta tra vecchio e nuovo movimento; redditi e spese correnti restano invariati perché il movimento continua a essere un trasferimento patrimoniale.
- Il capitale iniziale corrisponde al primo Versamento confermato disponibile per data della posizione, con ordinamento deterministico. Quando un anno chiuso conserva soltanto il consuntivo aggregato di `Investment History`, il totale Versamenti del primo consuntivo disponibile è l'unica granularità storica autorevole e costituisce il capitale iniziale; gli altri Versamenti confluiscono nei versamenti successivi, le Liquidazioni sono mostrate positive e il saldo netto coincide con capitale iniziale più versamenti successivi meno liquidazioni, senza azzeramenti intermedi impliciti.
- I totali della pagina Investimenti coincidono con la somma delle sole posizioni finali non pensionistiche; i totali pensione coincidono con la somma dei comparti finali e i raccoglitori non duplicano i figli.
- Il valore secondario del box Patrimonio netto coincide con patrimonio netto meno valore immobili e non modifica alcun dato persistito.
- I movimenti pianificati e le valutazioni non alterano le quattro grandezze. Casi storici ambigui restano invariati e producono una segnalazione redatta.
- Il workbook privato usato per la diagnosi rimane intatto; eventuali correzioni dei dati reali richiedono una copia recuperabile, rilettura, controllo conteggi/collegamenti e seconda apertura idempotente.

**Test richiesti:** unit test sintetici per modifiche ripetute da entrambe le viste, cambio Versamento↔Liquidazione, delta di capitale e liquidità, pianificazioni e aggregazioni investimento/pensione; integration test di round-trip workbook e riconciliazione idempotente; regressione rollover e importazione; Playwright CLI IT/EN, chiaro/scuro e 1080 px su pagina e dettagli; `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `node scripts/check-required-docs.mjs` e `npm audit`.

**Documentazione:** `PLAN.md`, README, manuali IT/EN, quick start e MAP se viene introdotto un nuovo modulo; `SECURITY_MODEL.md` soltanto per cambi a schema, salvataggio, riconciliazione, IPC o altri confini di sicurezza. Versione applicativa prevista `1.16.0`.

**Avvio 2026-08-29:** creato il branch `milestone/26-investment-capital-reconciliation` dalla `main` pulita. La prima attività in corso è la diagnosi e correzione della modifica dei movimenti collegati; i quattro riepiloghi saranno implementati dopo la regressione sul capitale e sui saldi.

**Diagnosi e prima correzione 2026-08-29:** il workbook privato è stato analizzato localmente in sola lettura tramite una copia tecnica temporanea, senza inserirne dati, percorsi o valori nelle fixture permanenti. Le coppie Movimento investimento↔Transazione risultano univoche, reciproche e prive di duplicati o collegamenti orfani. La causa operativa riprodotta è nei movimenti storici importati anteriori all'intervallo del Conto/Cassa conservato nel workbook: ogni correzione veniva rifiutata dalla validazione temporale, inducendo a ridatare o reinserire il movimento e quindi a sommare nuovamente capitale ed effetto di cassa. La trasformazione di dominio consente ora di correggere in posto questi record soltanto mantenendo invariati investimento, data, metodo e Conto/Cassa originari; esistenza del metodo, valuta e compatibilità del conto vengono ricontrollate, mentre riferimenti nuovi o spostati fuori intervallo restano vietati. Test unitari sintetici coprono correzioni ripetute, UUID e conteggi stabili, inversione Versamento↔Liquidazione, delta di capitale/liquidità e rifiuto dei nuovi riferimenti storici invalidi; un test d'integrazione copre salvataggio, backup e round-trip `.xlsx`. Il workbook privato originale non è stato modificato. I quattro riepiloghi restano la seconda fase di M26.

**Verifica prima fase 2026-08-29:** completati con esito verde `npm run lint`, `npm run typecheck`, 219 test Vitest in 43 file, `npm run build`, `node scripts/check-required-docs.mjs` e `npm audit` con zero vulnerabilità. Non essendoci modifiche UI in questa prima fase, il collaudo Playwright IT/EN e chiaro/scuro resta associato alla seconda fase dei quattro riepiloghi.

**Esito seconda fase 2026-08-29:** implementata una trasformazione pura condivisa per capitale iniziale, versamenti successivi, liquidazioni e saldo, con continuità sui consuntivi annuali e aggregazione delle sole posizioni finali attive. I quattro valori sono visibili nella pagina, nelle schede e nei dettagli di Investimenti e Pensione Integrativa, inclusi raccoglitori e comparti; il box Patrimonio netto mostra inoltre il valore esclusi gli immobili. La correzione di un dettaglio storico aggiorna per delta anche l'eventuale consuntivo `Investment History`, mentre schema workbook v9, IPC, preload e rete restano invariati. Con soli dati sintetici sono verdi `npm run lint`, `npm run typecheck`, 224 test Vitest in 43 file, `npm run build`, `node scripts/check-required-docs.mjs` e `npm audit` con zero vulnerabilità. Il workflow Playwright CLI ha verificato Panoramica, Investimenti, dettaglio investimento, Pensione Integrativa e comparti a 1080 px in italiano/tema chiaro e inglese/tema scuro, senza overflow orizzontale o errori console. Il workbook privato originale non è stato modificato.

**Estensione richiesta 2026-08-29 — correzioni manuali e andamento:**

- Nella modifica da Transazioni di un Versamento o di una Liquidazione collegati, presentare il normale tipo Uscita/Entrata e nascondere la scelta tecnica dell'effetto di cassa. Il dominio continua a salvarli come trasferimenti patrimoniali `outflow`/`inflow`, quindi restano esclusi da redditi e spese correnti e non possono diventare per errore trasferimenti interni neutri.
- Aggiungere nei blocchi delle singole posizioni finali di Investimenti e dei comparti pensione un'azione **Correzione** con data, direzione, importo, descrizione e note. Una correzione aumenta soltanto Versamenti successivi oppure Liquidazioni e il relativo saldo; non crea Transazioni, non modifica liquidità o controvalore e resta riconoscibile nel dettaglio.
- Distinguere persistentemente le correzioni dai movimenti reali, validarle come record privi di categoria, metodo, Conto/Cassa e `transactionId`, conservarle nel passaggio d'anno senza incorporarle una seconda volta nei consuntivi e migrare in modo deterministico i workbook precedenti.
- Mostrare accanto al valore attuale delle singole posizioni una freccia verso l'alto o verso il basso quando l'ultima valutazione disponibile è rispettivamente maggiore o minore della precedente; valori uguali o meno di due rilevazioni non mostrano indicatori.
- Conservare l'unico canale IPC `execute`, il renderer isolato e i blocchi di rete; aggiornare schema workbook, manuali IT/EN, README, quick start, MAP e SECURITY_MODEL.

**Criteri di accettazione dell'estensione:** una correzione non produce né riconcilia una Transazione, non cambia saldi o controvalore, confluisce soltanto nei quattro riepiloghi ed è preservata da salvataggio, riapertura e rollover. La modifica di una Transazione collegata non espone più l'opzione Neutro tra conti e conserva UUID, investimento, verso di cassa e validazioni del conto. Le frecce confrontano soltanto valutazioni confermate e consuntivi storici canonici, sono accompagnate da testo accessibile e restano leggibili in IT/EN, chiaro/scuro e a 1080 px.

**Test dell'estensione:** unit test per validazione, assenza della Transazione, totali, controvalore, liquidità, cancellazione, trend e rollover; migrazione e round-trip workbook sintetico; regressione della modifica da Transazioni; Playwright CLI sui tre flussi e preflight completo previsto da `AGENTS.md`.

**Esito dell'estensione 2026-08-29:** la modifica da Transazioni di Versamenti e Liquidazioni usa ora il modulo standard Uscita/Entrata, mantiene fisso l'investimento collegato e traduce il dato nel trasferimento patrimoniale corretto senza esporre l'effetto neutro. Le singole posizioni e i comparti pensione dispongono dell'azione Correzione: i nuovi record espliciti incrementano soltanto Versamenti successivi o Liquidazioni, non hanno campi di pagamento o collegamenti a Transazioni e non cambiano liquidità, controvalore o grafico del valore. Le correzioni restano distinguibili, modificabili e cancellabili nel dettaglio e sono preservate una sola volta dal rollover. Lo schema corrente è v10, senza nuove colonne; la migrazione v9→v10 conserva integralmente record e cronologia tariffaria. Le schede delle posizioni finali mostrano inoltre una freccia accessibile in aumento o diminuzione confrontando le ultime due osservazioni canoniche, mentre raccoglitori, valori invariati e serie insufficienti non mostrano indicatori. Con soli dati sintetici sono verdi `npm run lint`, `npm run typecheck`, 234 test Vitest in 43 file, `npm run build`, `node scripts/check-required-docs.mjs`, `npm audit` con zero vulnerabilità e tutti gli 11 test Playwright automatici. Il workflow Playwright CLI ha verificato in italiano/tema chiaro e inglese/tema scuro, a 1080 px, il modulo standard della Transazione collegata, entrambe le direzioni di Correzione, Investimenti, comparti pensione e frecce sia in salita sia in discesa; non sono emersi overflow orizzontali o errori console. Il workbook privato originale non è stato modificato.

**Correzione di riconciliazione 2026-08-29:** la verifica locale in sola lettura ha rilevato un comparto con Versamento storico confermato ma componente Versamenti pari a zero nel consuntivo annuale dello stesso anno. La trasformazione scartava l'intero dettaglio in presenza di qualsiasi consuntivo e mostrava quindi capitale investito zero. La riconciliazione è ora distinta per direzione: una componente annuale positiva resta autorevole e sopprime i dettagli omologhi, mentre una componente assente o zero usa i movimenti confermati disponibili senza influire sull'altra direzione. Una regressione interamente sintetica copre il caso su comparto e raccoglitore pensione, inclusa la prevenzione del doppio conteggio. Sono verdi lint, typecheck, build, controllo documentale, audit senza vulnerabilità, 235 test Vitest in 43 file e tutti gli 11 test Playwright automatici. Il workbook privato è rimasto invariato.

**Integrazione e pubblicazione 2026-08-29:** il commit funzionale `98fbbb4` è stato verificato sul branch dalla CI `33256948662` e nella PR `#73` dalla CI `33257122548`, entrambe verdi su macOS e Windows. La PR è stata integrata in `main` dal merge commit `6e5b66c`; Pages `33257292251` e la CI di `main` `33257292723` sono verdi. Il tag annotato `v1.16.0` punta allo stesso merge; la CI del tag `33257447026` e il workflow Release `33257446996` hanno completato con successo qualità, packaging, ispezione e smoke test su macOS ARM64/x64 e Windows x64. La release pubblicata contiene sei artifact applicativi più `SHA256SUMS.txt`: tutti i file sono stati scaricati in streaming, i digest SHA-256 sono stati ricalcolati senza conservarne copie locali e coincidono sia con il manifesto sia con i digest registrati da GitHub. M26 e la release desktop `v1.16.0` sono completate.

## M27 — Rendimenti percentuali di investimenti, pensioni e immobili locati

**Obiettivo:** mostrare rendimenti percentuali mensili e annuali riconciliabili con i dati locali per ogni investimento, comparto di pensione integrativa e immobile in affitto, distinguendo la performance finanziaria depurata dai flussi dal rendimento locativo netto.

**Definizioni di calcolo**

- Per investimenti e comparti, calcolare il rendimento mensile con il metodo Modified Dietz: `R = (Vf - Vi - ΣF) / (Vi + Σ(w × F))`, dove i Versamenti sono flussi positivi, le Liquidazioni flussi negativi e il peso `w` rappresenta la quota di periodo per cui ciascun flusso è rimasto investito. Il risultato è una stima del rendimento time-weighted che non trasforma nuovi Versamenti o Liquidazioni in guadagni o perdite.
- Usare soltanto movimenti e valorizzazioni confermati. Pianificazioni e Correzioni M26 sono escluse dai flussi di rendimento: le prime non sono ancora avvenute, le seconde rettificano la base contabile ma non rappresentano denaro entrato o uscito né modificano il controvalore.
- Calcolare ogni punto mensile fra l’ultima valorizzazione confermata del mese e l’osservazione precedente, applicando Modified Dietz all’intervallo effettivo fra le due date. Il primo Versamento all’apertura costituisce capitale iniziale con peso pieno e non un flusso di rendimento. Due mesi consecutivi con osservazioni producono un punto coperto anche se le date non coincidono con il fine mese. Mesi privi di valutazione restano lacune esplicite e l’eventuale intervallo successivo su più mesi è parziale; la linea può collegare i punti disponibili ai lati senza interpolare prezzi, assegnare un valore al mese mancante, annualizzare o mostrare `0%` in assenza di misurazione.
- Ottenere il rendimento annuale di investimenti e comparti collegando geometricamente i rendimenti mensili coperti: `(Π(1 + Rm)) - 1`. Un anno incompleto deve essere indicato come parziale/YTD; un anno con lacune non può apparire come rendimento completo. Quando il dettaglio non è più disponibile, ricavare una stima Original Dietz dai consuntivi di due anni consecutivi, usando il valore di chiusura precedente come apertura e dichiarando l’ipotesi dei soli flussi successivi a metà periodo. Nel primo anno, in assenza di una chiusura precedente, riclassificare il primo Versamento dettagliato come capitale iniziale o, se resta soltanto l’aggregato, usare il totale Versamenti del consuntivo come migliore base ricostruibile; il risultato resta una stima anche sui workbook migrati e non ne riscrive retroattivamente lo storico.
- Per gli immobili con `usage = rental`, calcolare il rendimento locativo netto non annualizzato del mese come `(entrate da affitto confermate - spese immobiliari confermate) / valore di mercato di riferimento`. Le entrate periodiche seguono il mese di competenza `dueDate` quando disponibile, non il giorno dell'incasso; le spese seguono la propria data. Il rendimento annuale usa gli stessi componenti aggregati per anno. Valore assente o nullo produce dato non disponibile.
- Applicare numeratore e denominatore all'intero immobile oppure alla medesima quota di proprietà: la percentuale deve restare invariata. Tooltip e documentazione devono rendere visibili entrate, spese, valore di riferimento, periodo, formula e qualità della copertura.
- Per gruppi di investimento e pensioni-raccoglitore, aggregare prima valori e flussi delle sole posizioni finali applicabili e calcolare poi la percentuale; non sommare né mediare aritmeticamente percentuali dei figli. In presenza di valute diverse senza tasso di conversione, omettere l'aggregato percentuale e mantenere disponibili i rendimenti delle singole posizioni.

**Attività pianificate**

- Introdurre nel dominio una trasformazione pura e condivisa per periodi, Modified Dietz, collegamento geometrico, copertura del dato e aggregazione gerarchica, separata dai componenti React e riusabile da investimenti e pensioni.
- Introdurre una trasformazione pura distinta per il rendimento locativo netto, riusando le regole esistenti su registrazioni confermate, competenza degli affitti, consuntivi annuali e valore commerciale.
- Aggiungere nel dettaglio di ogni investimento e comparto, immediatamente sotto il grafico cifra investita/controvalore, un grafico cartesiano mensile con mesi sull'asse X, percentuale con segno sull'asse Y, linea dello zero, tooltip accessibile e lacune riconoscibili.
- Aggiungere nel dettaglio di ogni immobile locato, sotto il grafico del valore commerciale, lo stesso tipo di grafico mensile per il rendimento locativo netto. Residenze e immobili non locati non mostrano il grafico.
- Inserire in ogni box riassuntivo applicabile un grafico compatto dotato di assi e percentuale sulla Y: nell’anno solare di apertura investimenti finali e comparti mostrano i mesi sulla X, dagli anni successivi gli anni; gli immobili locati mantengono l’annuale. Gruppi e pensioni-raccoglitore mostrano l'aggregato soltanto quando calcolabile senza doppio conteggio o conversioni implicite.
- Aggiungere tra i riepiloghi e le singole posizioni della pagina Investimenti un confronto annuale globale Titoli/Fondi/Fogli, ottenuto aggregando valori e flussi delle posizioni finali di ciascuna tipologia prima della formula e non mediando i rendimenti individuali.
- Estendere `HistoryChart` o introdurre un componente specializzato senza stili inline, mantenendo CSP rigorosa, riduzione movimento, navigazione/focus da tastiera, collegamento configurabile attraverso i nulli, linea della media aritmetica, tooltip sopra l’area tracciata e resa corretta di valori positivi, negativi e nulli.
- Aggiungere formattazione percentuale localizzata IT/EN e stringhe per rendimento mensile/annuale, YTD, stima, copertura insufficiente, formula e componenti del calcolo.
- Portare lo schema workbook a v11 se necessario per conservare dopo il rollover rendimento annuale, metodo e copertura calcolati mentre il dettaglio è ancora disponibile. La migrazione v10→v11 deve lasciare assenti i valori storici non ricostruibili, senza inventarli; salvataggio, backup, verifica e rollback restano quelli esistenti.
- Conservare invariati IPC, preload, blocco rete e capacità del renderer: tutti i rendimenti derivano dalla copia `FinanceData` già validata e non richiedono quotazioni, servizi remoti o nuove fonti dati.

**Criteri di accettazione**

- Il primo Versamento di una posizione costituisce capitale iniziale e non viene dimezzato come flusso a metà periodo; un Versamento successivo o una Liquidazione, a parità di valore di mercato, non genera da solo un rendimento positivo o negativo e la sua data incide soltanto sul peso Modified Dietz. Correzioni e pianificazioni non alterano i rendimenti.
- Ogni punto percentuale è riconciliabile con valori e flussi origine; denominatore nullo/non finito, copertura insufficiente e valute incompatibili producono uno stato esplicito, mai `NaN`, infinito o `0%` fittizio.
- I rendimenti annuali completi coincidono con il collegamento geometrico dei mesi coperti. YTD, stime storiche e anni incompleti sono distinguibili visivamente e tramite testo accessibile.
- Il rendimento locativo usa soltanto immobili in affitto e righe confermate, assegna il canone alla competenza corretta e non cambia quando numeratore e valore sono entrambi riportati dalla quota intera alla stessa quota di proprietà.
- Pensioni-raccoglitore, gruppi e serie globali Titoli/Fondi/Fogli non duplicano le posizioni finali; ogni aggregato percentuale è ottenuto da valori e flussi aggregati e non dalla media delle percentuali individuali.
- Nell’anno solare di apertura, la card di una posizione o di un comparto mostra l’andamento mensile; dagli anni successivi mostra quello annuale, mentre il dettaglio conserva sempre il mensile.
- Grafici mensili di dettaglio e annuali compatti restano leggibili in italiano/inglese, tema chiaro/scuro e alla larghezza minima di 1080 px, inclusi serie vuota, un solo punto, valori negativi, intervalli lunghi, linea media, collegamento visivo attraverso una lacuna, tooltip esterno al tracciato, focus e `prefers-reduced-motion`.
- Rollover e round-trip preservano i soli dati di rendimento eventualmente necessari alla continuità; workbook precedenti si aprono senza perdita e nessuna percentuale derivata modifica movimenti, liquidità, controvalori o consuntivi economici.

**Test richiesti:** unit test sintetici per formula Modified Dietz, pesi giornalieri, anni bisestili, più flussi nello stesso giorno, Versamenti/Liquidazioni, Correzioni, pianificazioni, denominatore nullo, lacune, YTD e collegamento geometrico; aggregazioni di gruppi/pensioni e valute incompatibili; rendimento locativo mensile/annuale con competenza e incasso separati, spese, quote e valori mancanti; migrazione v10→v11 se necessaria, rollover e round-trip; test renderer e Playwright CLI su investimenti, comparti e immobili locati in IT/EN, chiaro/scuro e 1080 px; `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `node scripts/check-required-docs.mjs` e `npm audit`.

**Documentazione:** `PLAN.md`, README, manuali IT/EN, quick start, glossario delle formule e MAP per gli eventuali moduli nuovi; `SECURITY_MODEL.md` per ogni cambiamento a schema, rollover o persistenza. Versione applicativa prevista `1.17.0`. Nessun workbook privato, valore reale o screenshot dell'utente entra in test, Git, CI, documentazione o artifact.

**Avvio 2026-09-05:** creato il branch `milestone/27-asset-return-charts` dalla `main` pulita e allineata al commit `d81d7db`. L'analisi di fattibilità conferma che movimenti, valorizzazioni, competenza degli affitti e consuntivi annuali esistenti costituiscono una base sufficiente; l'implementazione deve prima consolidare formula, copertura e continuità del rollover con dati esclusivamente sintetici.

**Esito locale 2026-09-05:** implementate trasformazioni pure di dominio per Modified Dietz mensile, collegamento geometrico annuale, stime annuali Original Dietz dichiarate, copertura completa/parziale/mancante e aggregazione di gruppi e pensioni-raccoglitore prima del calcolo. Ogni punto mensile confronta due valutazioni osservate consecutive sull’intervallo effettivo fra le date e include i soli flussi intercorsi; il primo Versamento all’apertura è ora capitale iniziale con peso pieno, eliminando le percentuali abnormi prodotte dal precedente peso `0,5`. Osservazioni in mesi consecutivi producono punti consecutivi anche senza date di fine mese; una valutazione assente resta una lacuna senza valore, il successivo intervallo su più mesi è parziale e la linea collega comunque i punti disponibili. I consuntivi di chiusura di due anni consecutivi generano in memoria una stima annuale anche sui workbook migrati v10 e nei singoli comparti pensionistici; nel primo anno il Versamento di apertura dettagliato, o il totale Versamenti del consuntivo quando resta solo l’aggregato, fornisce la base iniziale senza riscrivere lo storico. Investimenti e comparti mostrano il grafico mensile sotto cifra investita/controvalore; nell’anno solare di apertura anche la card mostra il mensile, mentre dagli anni successivi passa all’annuale. La pagina Investimenti aggiunge fra riepiloghi e posizioni il confronto annuale globale Titoli/Fondi/Fogli: ogni serie deduplica le posizioni finali e aggrega valori e flussi prima della formula, senza medie di percentuali. Gli immobili locati applicano lo stesso layout al rendimento netto, usando competenza dei canoni, spese confermate e valore commerciale. Ogni grafico di rendimento mostra una linea tratteggiata con la media aritmetica dei punti disponibili e colloca il tooltip sopra l’area tracciata per non ostacolare il passaggio fra punti. Lacune, valute miste, denominatori non validi, stime e YTD sono espliciti; i tooltip espongono anche le date osservate, oltre a copertura e componenti origine, e ogni periodo è raggiungibile da tastiera. Un affitto pagato dopo il passaggio d'anno viene attribuito al consuntivo dell'anno di competenza e conservato al rollover successivo. Lo schema workbook è v11: `Investment History` conserva il rendimento annuale già calcolato, metodo, copertura, stato parziale e data dell’ultima osservazione; un valore iniziale trascinato non diventa uno `0%` misurato. I punti mensili restano derivati e non cambiano IPC, preload o rete. Versione portata a `1.17.0`, documentazione e glossario bilingue aggiornati. Con dati esclusivamente sintetici sono verdi lint, typecheck, 257 test Vitest in 45 file, build renderer/Electron, controllo dei 15 documenti obbligatori, baseline Node.js, CSP rigorosa, `npm audit` con zero vulnerabilità e tutti gli 11 test Playwright automatici. Il workflow Playwright CLI ha verificato investimenti e comparti in italiano/tema chiaro e inglese/tema scuro a 1080 px, inclusi una lacuna luglio collegata visivamente tra giugno e agosto senza punto inventato, linea media, tooltip sopra il tracciato, stime annuali, card mensile nell’anno di apertura, confronto globale Titoli/Fondi/Fogli, focus, assenza di overflow e assenza di errori console; il collaudo M27 precedente copriva inoltre immobili locati e badge stima/parziale. Nessun workbook privato è stato aperto, modificato o usato come fixture.

## M28 — Inserimento assistito delle registrazioni Automobile

**Obiettivo:** ridurre gli inserimenti duplicati e gli errori di calcolo nella modale **Nuova spesa / rilevazione** dell’Automobile, ricavando percorrenza e litri dai dati già disponibili e rendendo chiusa e coerente la scelta dell’alimentazione del singolo rifornimento.

**Comportamento previsto**

- Quando l’utente indica **Chilometri totali**, proporre automaticamente **Chilometri percorsi** sottraendo l’ultima lettura del contachilometri della stessa automobile con data strettamente precedente. In modifica, escludere dal confronto la registrazione corrente; registrazioni di altre automobili e letture dello stesso giorno, prive di un ordine certo, non possono diventare la base implicita.
- Se nel workbook attivo non esiste una lettura dettagliata precedente, usare come continuità soltanto il `closingOdometer` più recente e antecedente disponibile in `Vehicle History`. Se non esiste una base certa, lasciare il campo vuoto e modificabile senza inventare una percorrenza.
- Non generare mai distanze negative o non finite. Una lettura totale inferiore alla base mostra un messaggio bilingue e non produce un valore automatico; una differenza pari a zero resta valida. Il valore proposto rimane correggibile per gestire letture mancanti o sostituzioni del contachilometri.
- Ricalcolare il suggerimento quando cambiano automobile, data o chilometri totali finché l’utente non modifica manualmente **Chilometri percorsi**; svuotare il campo riattiva il calcolo automatico. Il salvataggio conserva il solo numero finale, senza aggiungere stato UI o provenienza al workbook.
- Per una registrazione di tipo **Carburante**, quando importo pagato e **Prezzo al litro** sono positivi e finiti, proporre **Litri** come `importo / prezzo al litro`, arrotondato alla precisione di inserimento già usata dal modulo. Variazioni di importo o prezzo aggiornano il suggerimento con la stessa regola di override manuale; dati mancanti o prezzo zero non producono `NaN`, infinito o un valore fittizio.
- Sostituire la textbox facoltativa **Alimentazione** della registrazione di rifornimento con un menu a discesa contenente Benzina, Diesel, GPL, Metano, Elettricità e Idrogeno. La prima scelta usa la convenzione già presente nei selettori opzionali dell’app, `—`, equivalente a **Nessuno / None**: salva `undefined` e una cella vuota, mai il testo dell’etichetta.
- Usare codici persistenti stabili e stringhe visibili in italiano e inglese. Eventuali valori legacy non compresi nel nuovo elenco restano leggibili e vengono preservati durante apertura e round-trip; in modifica sono mostrati come valore corrente finché l’utente non sceglie una voce supportata o il campo vuoto.
- Implementare selezione della lettura precedente, sottrazione, divisione e arrotondamento come trasformazioni pure e limitate nel dominio, lasciando al componente React la sola gestione dell’interazione. Riutilizzare campi, comando `execute`, salvataggio, backup e rollback esistenti; non cambiano schema workbook, IPC, preload, rete o capacità del renderer.

**Criteri di accettazione**

- Con due letture cronologiche della stessa automobile, l’inserimento della seconda calcola esattamente la differenza; cambio di automobile/data, modifica di una riga storica, prima lettura dell’anno e fallback al consuntivo precedente usano sempre la base deterministica corretta.
- Assenza di letture precedenti, più letture nello stesso giorno o contachilometri inferiore non generano una distanza implicita errata. Un valore inserito manualmente non viene sovrascritto da modifiche non pertinenti e può essere riportato alla modalità automatica svuotandolo.
- Con importo `60,00` e prezzo `2,000` il modulo propone `30,000` litri; cambio di uno dei due valori, override manuale, campo incompleto e prezzo zero seguono le regole dichiarate senza blocchi o risultati non finiti.
- **Alimentazione** è un dropdown in IT/EN; la scelta vuota persiste come campo assente, mentre le sei alimentazioni previste sopravvivono a salvataggio, riapertura e round-trip senza trasformarsi in testo localizzato.
- I calcoli non modificano registrazioni precedenti o successive, Transazioni collegate, Spese condivise, consuntivi o altre automobili e restano leggibili da tastiera, in tema chiaro/scuro e alla larghezza minima di 1080 px.

**Test richiesti:** unit test sintetici per scelta della lettura precedente, esclusione della riga in modifica, date uguali, fallback `Vehicle History`, differenza zero/negativa e limiti numerici; unit test per divisione, precisione, prezzo zero, override e riattivazione automatica; test renderer del dropdown e dei ricalcoli; regressione dei record collegati e del round-trip workbook; Playwright CLI in IT/EN, tema chiaro/scuro e 1080 px; `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `node scripts/check-required-docs.mjs` e `npm audit`.

**Documentazione:** `PLAN.md`, README, manuali IT/EN e quick start; MAP se viene aggiunto un nuovo modulo di dominio. Riesaminare `SECURITY_MODEL.md` e aggiornarlo soltanto se l’implementazione cambia i confini descritti. Versione applicativa prevista `1.18.0`; tutti i test e gli screenshot usano esclusivamente dati sintetici.

**Esito locale 2026-09-15:** aggiunto un modulo di dominio puro e limitato che seleziona soltanto l’ultima lettura univoca e strettamente precedente della stessa automobile, esclude la riga in modifica e le pianificazioni e usa `Vehicle History` solo come fallback annuale deterministico. La modale propone la differenza del contachilometri e i litri ottenuti da importo/prezzo al litro, mantiene gli override manuali e riattiva il calcolo quando il campo viene svuotato; una lettura inferiore mostra un avviso senza generare una distanza negativa. **Alimentazione** è ora un dropdown bilingue con campo vuoto `—`, Benzina, Diesel, GPL, Metano, Elettricità e Idrogeno; valori legacy restano leggibili e preservati. Schema workbook v11, IPC, preload, rete e flussi atomici di salvataggio non cambiano. Versione sorgente portata a `1.18.0`; README, manuali IT/EN, quick start, MAP e modello di sicurezza sono allineati. Con soli dati sintetici sono verdi baseline Node.js, landing bilingue, lint, typecheck, 266 test Vitest in 46 file, build renderer/Electron, CSP rigorosa, controllo dei 15 documenti obbligatori, `npm audit` con zero vulnerabilità e tutti gli 11 test Playwright automatici. Gli advisory emersi durante il gate sono stati chiusi con soli aggiornamenti patch compatibili di Vitest/coverage `4.1.11`, Joi `18.2.9` e js-yaml `4.3.2`. Il workflow Playwright CLI ha verificato italiano/tema chiaro e inglese/tema scuro a 1080×800, calcoli `19.000 − 18.200 = 800` km e `60 / 2 = 30` litri, dropdown, override/riattivazione, avviso per lettura inferiore, focus, assenza di overflow orizzontale ed errori console. Nessun workbook, sorgente o screenshot privato è stato aperto, modificato o usato come fixture.

**Esito release 2026-09-15:** commit e merge fast-forward su `main`, tag annotato `v1.18.0` e push sono completati. CI su `main` e sul tag e workflow Release risultano verdi; la release pubblica contiene artifact macOS ARM/x64 e Windows x64, oltre a `SHA256SUMS.txt`.

## M29 — Codice ISIN opzionale per investimenti e correzioni

**Obiettivo:** associare facoltativamente a ogni posizione finanziaria il proprio codice ISIN e consentirne l’inserimento sia durante la creazione dell’investimento sia dalla modale **Correzione**, senza rendere obbligatoria l’informazione o duplicarla nei movimenti.

**Comportamento previsto**

- Aggiungere una textbox **ISIN** ai moduli **Nuovo investimento / New investment** e **Modifica investimento / Edit investment** e alla modale **Correzione / Correction**, inclusa la modifica di una correzione esistente. Il campo è sempre facoltativo: lasciarlo vuoto non impedisce il salvataggio dell’investimento o della correzione.
- Conservare l’ISIN come metadato della posizione `Investment`, non come proprietà di ogni `InvestmentEntry`: la modale Correzione mostra e modifica lo stesso valore della posizione selezionata, evitando copie divergenti. Per i comparti pensione che condividono il modello Investment il campo resta disponibile e facoltativo; i raccoglitori pensione non richiedono un ISIN.
- Normalizzare un valore presente rimuovendo gli spazi esterni e convertendolo in maiuscolo. Validare localmente il formato ISO 6166 di 12 caratteri alfanumerici e la cifra di controllo; un campo vuoto diventa `undefined`, mentre un valore non vuoto non valido produce un errore bilingue vicino al campo. Posizioni distinte possono condividere lo stesso ISIN, per esempio quando lo stesso strumento è detenuto in rapporti diversi.
- Salvare insieme, in una sola trasformazione atomica, l’eventuale aggiornamento dell’ISIN della posizione e la nuova/modificata Correzione. Annullamento, errore di validazione o conflitto esterno lasciano invariati entrambi; il comando continua a passare dall’unico canale IPC `execute` già validato.
- Portare lo schema workbook da v11 a v12 aggiungendo la colonna opzionale `isin` a `Investments`. La migrazione v11→v12 lascia il campo vuoto per le posizioni esistenti, convalida l’intero `FinanceData` prima del salvataggio e riusa temporaneo, rilettura, backup e rollback; una seconda apertura non riscrive il file.
- Preservare l’ISIN durante modifica, chiusura/riapertura, rollover, copia Numbers e round-trip `.xlsx`. Aggiornare il template/importazione Investimenti con una colonna facoltativa `isin` in una nuova versione compatibile, continuando ad accettare i template v1/v2 senza inventare valori.
- Non effettuare ricerca o verifica su servizi esterni: formato e cifra di controllo sono verificati interamente in locale. Non cambiano blocco rete, preload o accesso del renderer al filesystem e l’ISIN viene trattato come dato finanziario locale, senza log o telemetria.

**Criteri di accettazione**

- Nuovo investimento e Correzione si salvano normalmente con ISIN vuoto. Un ISIN valido digitato in minuscolo o con spazi esterni viene persistito una sola volta, in maiuscolo, e ricompare uguale dopo riapertura e nelle due modali.
- Un valore non vuoto con lunghezza, caratteri o cifra di controllo non validi riceve un messaggio accessibile IT/EN e non viene scritto; nessun controllo richiede rete.
- Creare o modificare una Correzione con un ISIN aggiornato modifica atomicamente la posizione e la Correzione, senza creare Transazioni, cambiare liquidità/controvalore o alterare la semantica dei quattro riepiloghi M26 e dei rendimenti M27.
- Migrazione v11→v12, rollover, workbook `.xlsx`, mirror Numbers e template di importazione conservano il valore opzionale; workbook e template precedenti restano apribili/importabili senza perdita di dati.
- Campo, aiuto, errore, stato disabilitato e ordine del focus restano leggibili in italiano/inglese, tema chiaro/scuro e alla larghezza minima di 1080 px.

**Test richiesti:** unit test sintetici per normalizzazione e cifra di controllo ISIN, campo vuoto, valori non validi e duplicati ammessi; test dei comandi atomici investimento/correzione; migrazione v11→v12 idempotente, rollover e round-trip workbook; generazione/importazione del template aggiornato con regressione v1/v2; test renderer e Playwright CLI delle modali Nuovo investimento e Correzione in IT/EN, chiaro/scuro e 1080 px; regressione su Transazioni, riepiloghi M26 e rendimenti M27; `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `node scripts/check-required-docs.mjs` e `npm audit`.

**Documentazione:** `PLAN.md`, README, manuali IT/EN, quick start, specifica dei template, MAP e `SECURITY_MODEL.md` per schema v12, migrazione e salvataggio atomico. Versione applicativa prevista `1.19.0`; nessun workbook, codice ISIN reale o screenshot dell’utente entra in test, Git, CI, documentazione o artifact.

**Esito locale 2026-09-15:** introdotti normalizzazione e validazione ISO 6166 pure nel dominio; il campo facoltativo è disponibile in Nuovo/Modifica investimento, Correzione e comparti pensione, mentre i raccoglitori non lo richiedono. Due nuovi comandi validati aggiornano Correzione e metadato della posizione in una sola trasformazione: gli scenari sintetici confermano che annullamento o input non valido non scrivono nulla e che Transazioni, liquidità, controvalore, riepiloghi M26 e rendimenti M27 non vengono alterati. Lo schema workbook è v12 con colonna `isin` in `Investments`; la migrazione v11→v12 è idempotente e lascia vuoto lo storico, mentre round-trip `.xlsx`, chiusura/riapertura, rollover e percorso di mirror Numbers preservano il valore senza nuove dipendenze. I template sono v3 e aggiungono `isin` a Investimenti e comparti; l’importazione valida localmente il codice e mantiene la compatibilità esatta con v1/v2 senza inventare valori, inclusa la risoluzione conservativa dell’unico conto compatibile nei v1. Versione sorgente portata a `1.19.0`; README, manuali IT/EN, quick start, specifiche di importazione, MAP e modello di sicurezza sono allineati. Con soli dati sintetici sono verdi baseline Node.js, landing bilingue, lint, typecheck, 277 test Vitest in 47 file, build renderer/Electron, CSP rigorosa, controllo dei 15 documenti obbligatori, `npm audit` con zero vulnerabilità e tutti gli 11 test Playwright automatici. Il workflow Playwright CLI ha verificato Nuovo investimento in italiano/tema chiaro e Correzione in inglese/tema scuro a 1080×800: campo vuoto non bloccante, errori accessibili distinti per formato e cifra di controllo, normalizzazione al blur, salvataggio atomico e persistenza dello stesso ISIN nella successiva Correzione e in Modifica investimento; focus, assenza di overflow orizzontale ed errori console sono confermati. Nessun workbook, ISIN reale, sorgente o screenshot privato è stato aperto, modificato o usato come fixture. Restano da eseguire commit, integrazione, CI macOS/Windows, tag e pubblicazione della release.

## Patch grafici, menu release e integrità UUID

**Obiettivo:** correggere prima di M16 la leggibilità dei grafici piccoli nella modale immobili, il menu dell’app compilata e le collisioni UUID introdotte da ritocchi manuali al workbook.

**Attività pianificate**

- Sistemare i grafici compatti dei consumi e delle spese immobiliari — elettricità, gas, acqua, Telefono/Internet, Condominio e altri grafici analoghi — in modo che l’asse X e le etichette temporali siano visibili senza scrollbar verticale interna.
- Rivedere altezza, padding interno, area asse/etichette e overflow dei box grafico: la card può mantenere la sola scrollbar orizzontale quando la serie è larga, ma non deve tagliare verticalmente barre, assi o label né perdere la scala proporzionale delle barre.
- Verificare il caso reale mostrato nello screenshot del 2026-07-25, oltre a dataset sintetici con molti anni, valori zero, valori alti e categorie prive di dati.
- Ridurre i menu Electron nella versione compilata macOS e Windows, rimuovendo voci di debug/sviluppo e lasciando soltanto:
  - **File → Quit**, che deve chiudere completamente l’applicazione e non solo la finestra;
  - **Window**, con le azioni standard di ridimensionamento/gestione finestra supportate dalla piattaforma;
  - **Info**, con apertura della finestra informazioni dell’app.
- Aggiornare la finestra **Info** perché mostri il copyright `Copyright © 2026 Gloutchov`.
- All’apertura di un workbook, rilevare UUID duplicati nelle tabelle con identificativo, conservare la prima occorrenza e assegnare nuovi UUID alle successive senza eliminare righe o modificare importi, date e descrizioni.
- Riallineare soltanto i collegamenti transazione/registrazione non ambigui; in presenza di uno stesso riferimento copiato più volte, conservare entrambi i record ma rimuovere dalla copia successiva il collegamento ambiguo.
- Applicare la correzione direttamente alle sole celle interessate, tramite temporaneo verificato, backup recuperabile e sostituzione con rollback; mostrare un avviso bilingue dopo la riparazione.

**Criteri di accettazione**

- Nelle modali immobili l’asse X dei grafici compatti è visibile in tema chiaro/scuro, IT/EN e a larghezza minima 1080 px; non compare scrollbar verticale interna nei box dei grafici.
- Le barre dei grafici immobiliari e del confronto auto occupano l’altezza disponibile in proporzione ai rispettivi valori, incluso il valore massimo.
- Serie storiche larghe restano consultabili orizzontalmente senza tagliare l’asse X o la base delle barre.
- Le build compilate macOS e Windows non mostrano menu Electron di default o voci di sviluppo; `Quit` termina l’applicazione completa e il processo non resta attivo.
- La finestra **Info** è accessibile da menu e riporta correttamente nome/versione applicazione e `Copyright © 2026 Gloutchov`.
- Un workbook modificato manualmente con UUID duplicati viene riaperto con lo stesso numero di righe e gli stessi valori economici; gli UUID risultano univoci e gli eventuali riferimenti univoci restano bidirezionali.
- Prima della correzione automatica viene conservato un backup in `.contami-backups`; una seconda apertura del file già corretto non lo riscrive né crea nuovi backup.

**Test richiesti:** unit/integration test per configurazione menu e handler di quit; test renderer dei grafici compatti con dataset sintetici; test di dominio e round-trip per UUID duplicati e collegamenti; Playwright IT/EN e chiaro/scuro a 1080 px sulla modale immobile; smoke dei pacchetti compilati macOS/Windows verificando menu, quit completo e finestra Info.

**Documentazione:** aggiornare README/manuali se cambia il comportamento dei menu o della finestra Info; aggiornare MAP/SECURITY_MODEL solo se cambiano file, IPC, confini Electron o modello di packaging.

**Stato locale 2026-07-25:** implementati layout e scala proporzionale dei grafici compatti condivisi da immobili e confronto auto, menu compilato ridotto, finestra Info, riparazione conservativa degli UUID duplicati e bump versione `1.3.2`. La correzione UUID modifica solo le celle necessarie, conserva tutte le righe, riallinea i collegamenti non ambigui e passa da temporaneo verificato, backup e rollback. Una copia privata aggiornata è stata corretta e verificata localmente, restando esclusa da Git e release. La verifica Playwright su dati sintetici conferma asse X visibile, assenza di overflow verticale e barre proporzionate all’altezza della pista. Gate locale verde: lint, typecheck, 90 test unit/integration, build renderer/Electron, controllo documentazione, `npm audit` con 0 vulnerabilità e Playwright IT/EN chiaro/scuro a 1080 px; l’ispezione ASAR della parte grafici/menu resta valida. Lo smoke locale del pacchetto macOS non arriva al codice applicativo e termina con `SIGABRT` durante la registrazione AppKit dell’app non firmata; resta da riverificare nel workflow release macOS/Windows prima della pubblicazione.

## Patch limiti e chiusura rate

**Obiettivo:** impedire che un pagamento rateale continui a generare scadenze fino a fine anno dopo l’esaurimento del numero di rate indicato.

**Comportamento previsto**

- La sincronizzazione genera al massimo il numero di rate residue e non supera l’eventuale data di fine.
- La conferma di una rata riduce di una unità il residuo e aggiorna la prossima scadenza.
- Dopo l’ultima conferma la ricorrenza viene chiusa logicamente, le righe pianificate residue scompaiono e tutte le rate confermate restano nello storico.
- Il rollover conserva il residuo aggiornato e genera nel nuovo workbook soltanto le rate ancora dovute nell’anno nuovo.
- Per piani storici caricati da un altro foglio, `nextDueDate` rappresenta la prima rata non pagata e `remainingInstallments` il solo residuo, non la data iniziale e il numero originario del piano.
- Le ricorrenze non rateali continuano a essere pianificate fino alla data di fine o alla fine dell’anno.
- In Impostazioni, il pulsante per importare un file compilato è allineato verticalmente al menu della strategia duplicati; il testo di aiuto occupa una riga separata e il layout resta impilato sotto i 900 px.

**Test richiesti:** unit test sintetici per limite numerico, data di fine, decremento progressivo, chiusura automatica, conservazione delle rate confermate e piano a cavallo d’anno; regressione completa dei test di dominio e integrazione; Playwright dell’allineamento importazione in IT/EN, chiaro/scuro e a 1080 px.

**Documentazione:** aggiornare manuali IT/EN, README, MAP e versione applicativa. Non sono previste modifiche a UI, traduzioni, schema workbook, IPC o modello di sicurezza.

**Esito 2026-07-27:** implementata nel commit `9e4290a` sul branch `patch/1.3.3-installment-limits` e integrata in `main` dal merge commit `5e0a2f3`. Gate locale verde: lint, typecheck, 93 test unit/integration, build renderer/Electron, controllo documentazione, `npm audit` con 0 vulnerabilità e Playwright IT/EN chiaro/scuro a 1080 px, incluso il controllo geometrico dell’allineamento tra strategia duplicati e pulsante di importazione. CI verdi sul branch (`30273773479`), su `main` (`30273847224`) e sul tag `v1.3.3` (`30273854813`). Il workflow Release `30273854755` ha completato packaging, ispezione, smoke installato e pubblicazione privata per macOS ARM64/x64 e Windows x64; gli asset includono DMG, ZIP, installer Windows e `SHA256SUMS.txt`.

## Revisione roadmap — 2026-08-01

- Il 2026-08-01 è stata inserita M22 subito dopo M16 per aggiornare la baseline Node.js e la toolchain, risolvere la ricorrenza segnalata dalla PR Dependabot #45 e integrare `jsdom` 30; M9, M10 e M11 slittano rispettivamente ai checkpoint `v1.11.0`, `v1.12.0` e `v1.13.0`.
- È stata aggiunta M23 come ultima milestone della roadmap per realizzare in `docs/` il sito bilingue compatibile con GitHub Pages, con identità visiva ContaMì, panoramica delle funzioni, screenshot/GIF sintetici e link a download e repository. Il checkpoint desktop inizialmente previsto come `v1.14.0` è stato successivamente sostituito dal versionamento web separato `landing-v1.0.x`.
- Il 2026-08-01 è stata inserita M21 davanti alle attività ancora pianificate per distinguere competenza e incasso delle rate di affitto e correggere il caso di pagamento tardivo; M19, M16, M9, M10 e M11 slittano rispettivamente ai checkpoint da `v1.8.0` a `v1.12.0`.
- Il 2026-08-01 è stata inserita M20 davanti a tutte le attività ancora pianificate: introduce Casse, trasferimenti interni e indicatori di perdita; M19, M16, M9, M10 e M11 slittano rispettivamente ai checkpoint da `v1.7.0` a `v1.11.0`.
- Inserite M17, M18 e M19 prima di M16 e delle successive attività di hardening, integrità dei salvataggi e CSP.
- M17 raccoglie i filtri mancanti nelle modali di Immobili, automobili, investimenti e comparti pensione, completa il filtro descrizione delle Spese condivise e porta **Aggiorna valore** nel dettaglio dell’investimento.
- M18 verifica e rende obbligatoria la rappresentazione nelle Transazioni dei Versamenti e delle Liquidazioni di investimenti e comparti, sia una tantum sia periodici, mantenendoli trasferimenti patrimoniali senza doppio conteggio.
- M19 introduce cambi tariffa con decorrenza mensile e cronologia persistente: lo storico confermato resta immutato e vengono aggiornate soltanto le pianificazioni future interessate.
- Il filtro delle automobili già previsto in M16 è stato anticipato in M17. Il 2026-08-01 è stata annullata la rinomina Automobile→Trasporti perché troppo generica; M16 resta dedicata al collegamento atomico e stabile dei pagamenti rateali con le Ricorrenze e alla correzione dei relativi cicli di vita.
- La sequenza desktop era stata inizialmente ripianificata fino a `v1.14.0`; la previsione è stata superata dalla consegna separata della landing. L’app desktop resta locale e non introduce rete, telemetria, cloud o dati reali nei test; l’artifact web non amplia le capacità di rete del pacchetto Electron.

## Chiusura roadmap — 2026-08-05

- Tutte le milestone elencate nella tabella sono completate o rilasciate; non esistono milestone correnti assegnate o aperte.
- La sequenza desktop termina con M11 e `v1.13.0`; M23 è stata pubblicata separatamente tramite `landing-v1.0.0`, corretta con `landing-v1.0.1` e distribuita da `main/docs` mediante GitHub Pages.
- Il precedente checkpoint desktop `v1.14.0` non è più previsto. Ogni ulteriore sviluppo funzionale richiederà una nuova milestone e un nuovo checkpoint esplicitamente aggiunti a questo piano.

## Riapertura roadmap — 2026-08-08

- La richiesta di distinguere il netto filtrato dai saldi assoluti ha aperto M24 sul branch `milestone/24-transaction-balance-summaries` e assegnato il nuovo checkpoint desktop `1.14.0`.
- M24 non altera workbook, dati persistenti o confini di sicurezza: interviene sulle trasformazioni pure dei riepiloghi, sulla vista Transazioni, sulle traduzioni, sui test e sulla documentazione.
- M24 è stata integrata dalla PR `#61` e pubblicata come release desktop `v1.14.0` dopo il completamento di CI, packaging, smoke e verifica dei checksum su macOS e Windows.

## Riapertura roadmap — 2026-08-22

- La richiesta di un resoconto immobili destinato al comproprietario ha aperto M25 sul branch `milestone/25-property-owner-reports` e assegnato il checkpoint desktop `1.15.0`.
- M25 riusa registrazioni, consuntivi annuali e quota di proprietà dello schema v9: non richiede migrazioni e non modifica il workbook durante stampa o esportazione.
- La generazione resta interamente locale; PDF e stampa attraversano un nuovo canale IPC ristretto e validato, senza esporre percorsi, HTML o dati finanziari grezzi oltre il renderer già autorizzato.
- M25 è stata integrata dalla PR `#71` e pubblicata come release desktop `v1.15.0` dopo il completamento di CI, packaging, smoke e verifica dei checksum su macOS e Windows.

## Riapertura roadmap — 2026-08-29

- La segnalazione di modifiche ripetute che gonfiano capitale investito e saldi ha aperto M26 sul branch `milestone/26-investment-capital-reconciliation` e assegnato il checkpoint desktop `1.16.0`.
- La prima fase corregge e verifica l'aggiornamento in posto della coppia Movimento investimento↔Transazione e la sua incidenza differenziale sul Conto/Cassa, usando il workbook reale soltanto per diagnosi locale in sola lettura e test permanenti esclusivamente sintetici.
- La seconda fase aggiunge capitale iniziale, versamenti successivi, liquidazioni e saldo netto nelle viste complessive e di dettaglio di Investimenti e Pensione Integrativa, aggregando soltanto le posizioni finali per evitare doppio conteggio; in Panoramica espone inoltre il patrimonio al netto degli immobili.

## Riapertura roadmap — 2026-09-05

- La richiesta di rendimenti percentuali mensili e annuali ha aperto M27 sul branch `milestone/27-asset-return-charts` e assegnato il checkpoint desktop `1.17.0`.
- Investimenti e comparti useranno rendimenti depurati da Versamenti e Liquidazioni, con Modified Dietz mensile e collegamento geometrico annuale; lacune di valorizzazione, anni parziali e stime da consuntivi storici resteranno espliciti.
- Gli immobili locati useranno un rendimento locativo netto separato, basato su competenza dei canoni, spese confermate e valore di mercato di riferimento. La funzione resta locale e non introduce quotazioni esterne, rete, telemetria o nuovi privilegi del renderer.

## Decisione futura — Cifratura portabile

La precedente M12 non fa più parte della sequenza di sviluppo né ha una versione assegnata. ContaMì non implementerà ora una cifratura applicativa: workbook, temporanei e backup restano interoperabili e protetti tramite permessi del filesystem, FileVault/BitLocker, blocco della sessione e backup adeguati.

La decisione potrà essere rivalutata in futuro soltanto se esisterà una soluzione standard, manutenibile e verificabile che conservi apertura diretta, modifica, salvataggio, importazione Numbers e recupero con Excel e Numbers su macOS e Windows. Non saranno accettati contenitori proprietari, dipendenze cloud, chiavi in preferenze o log, né soluzioni che rendano il recupero meno affidabile.

## Checklist obbligatoria di chiusura per ogni milestone

La checklist seguente è un gate riutilizzabile da verificare alla chiusura di ciascuna milestone; non è il registro cumulativo dello stato del progetto. Gli esiti effettivi sono riportati nella tabella e nei registri di avanzamento.

- [ ] Branch milestone creato.
- [ ] Implementazione e migrazioni completate.
- [ ] Lint, typecheck e test pertinenti eseguiti.
- [ ] Smoke test o verifica manuale eseguiti.
- [ ] Versione sincronizzata quando prevista.
- [ ] `README.md`, `ISTRUZIONI.md` e `INSTRUCTIONS.md` aggiornati.
- [ ] `SECURITY_MODEL.md` aggiornato per cambi a sicurezza, rete, dati, file, IPC, logging o distribuzione.
- [ ] `MAP.md` e `AGENTS.md` aggiornati se struttura o regole operative cambiano.
- [ ] `PLAN.md` aggiornato con esito e limiti.
- [ ] Commit finale creato e diff controllato.
- [ ] PR/merge verso `main` eseguito secondo il flusso previsto.
- [ ] CI verificata sul branch/PR e su `main`.
- [ ] Tag/release creati soltanto per milestone rilasciabili.
- [ ] Artifact e checksum verificati quando esiste una release.
- [ ] Branch obsoleto eliminato solo dopo merge e verifiche.

## Registro di avanzamento — 2026-07-18

- M0: analizzato localmente e senza upload il workbook Numbers 26.3.1 (11 fogli, 43 tabelle nella sezione immobili); hash sorgente conservato nella nota di analisi e file originale intatto. Repository GitHub privato creato come `gloutchov/Contami`: GitHub non accetta `ì` nel nome tecnico e aveva convertito `Contamì` in `Contam-`, quindi è stata scelta la variante pulita più vicina.
- M1: shell Electron/React modulare, branding, i18n IT/EN, tema sistema/chiaro/scuro, configurazione validata e documenti obbligatori completati. Verifica Playwright di tutte le viste: 0 errori e 0 warning console.
- M2: schema workbook aggiornato alla v2 con 15 fogli, lettura/migrazione v1, round-trip validato, scrittura temporanea e rilettura, backup (10), rollback e rilevamento modifiche esterne. Il mirror `.numbers` è stato collaudato con successo sulla nuova installazione **Numbers Creator Studio**, rilevata tramite bundle id `com.apple.Numbers`.
- M3/M4: inserimenti guidati, CRUD controllato, dettagli, filtri e dashboard generale/tematiche completati; chiusura/riapertura logica e transazioni pianificate da ricorrenze implementate.
- M5: rollover estratto in funzione di dominio e coperto da casi di test per saldi, posizioni attive, valutazioni, ricorrenze e spese condivise.
- M6: sandbox/isolamento/CSP/IPC allowlist/blocco rete, misure prestazionali su dataset ampi, accessibilità, supply chain e smoke dei pacchetti completati; audit npm con 0 vulnerabilità e checkpoint `v0.9.0` verificato su macOS e Windows.
- M7: repository privato e workflow CI/release macOS+Windows con checksum configurati; CI cross-platform verde nel run `29643193163`. Per scelta progettuale le preview sono prodotte senza certificati e senza firma ad-hoc del bundle. Il crash del primo bundle Apple Silicon dipendeva dai metadati Unicode del pacchetto, non da Gatekeeper: bundle, metadati tecnici ed eseguibile usano `Contami`, mentre logo, titolo e UI mantengono `ContaMì`. Il bundle ARM non firmato supera lo smoke locale mantenendo l’Hardened Runtime predefinito. Manuali e note release documentano Gatekeeper, SmartScreen e Smart App Control senza suggerire di disattivare globalmente le protezioni. La preview `v0.1.0` precede la futura stabile `v1.0.0`.
- M8: schema v3 con migrazione v1/v2, sincronizzazione bidirezionale, CRUD, filtri/parziali, viste di dettaglio, dashboard storiche, grafici dei consumi domestici e sezione Automobile completati. Investimenti e Pensione Integrativa restano aree distinte; il rollover conserva consuntivi dettagliati per immobile/utenza, investimento/comparto e veicolo. Il workbook personale 2026 è stato ricostruito localmente dalla nuova copia Numbers, validato con rilettura dell’adapter applicativo e mantenuto escluso da Git e release; nessun dato reale è usato nei test o nella documentazione. Preflight locale completato con 29 test automatici, build renderer/Electron, controllo documenti, audit npm senza vulnerabilità e verifica Playwright IT/EN, chiaro/scuro a 1080 px senza errori console. CI cross-platform verde sul branch nel run `29694831210` e su `main` nel run `29694927686`; il checkpoint fu inizialmente pubblicato come preview storica `v0.2.0` ed è stato successivamente promosso, senza cambiare il perimetro funzionale, al tag di maturità `v0.8.0`. Gli artifact restano non firmati come documentato.

## Registro ritocchi — 2026-07-19

- Panoramica: le liste recenti usano la data odierna, escludono movimenti futuri/pianificati e distinguono le spese ricorrenti confermate.
- UI: filtri distribuiti su tutta la larghezza disponibile in Transazioni, Ricorrenze e Spese condivise, con etichette accessibili per i controlli.
- Immobili: aggiunti gli indicatori bilingui Telefono/Internet e Canone TV alla residenza, con aggregazione testata su categoria e descrizione.
- Pensione Integrativa: nuova area separata dagli Investimenti con pulsanti **Crea pensione** e **Crea comparto**; Fondo Pensione Fideuram è il raccoglitore e Linea Equilibrio, Linea Valore e Linea Crescita sono i comparti correlati. Dashboard e patrimonio evitano il doppio conteggio.
- Avvio: se il workbook ricordato è stato spostato o cancellato, il percorso obsoleto viene rimosso e l’app si apre nello stato non configurato con le azioni per aprire o creare un file; workbook non validi continuano a produrre errore senza essere sovrascritti.
- Impostazioni: categorie e metodi di pagamento mostrano un badge con il numero di utilizzi prima dei comandi di modifica; il conteggio include tutte le registrazioni collegate ed è condiviso con la protezione dalla cancellazione.
- Spese condivise: l’importazione privata è stata ricostruita dai dodici prospetti mensili `SPESE ORDINARIE`, riconciliando le quote al centesimo e collegando soltanto le corrispondenze certe con le Transazioni.
- Investimenti e Pensione Integrativa: i grafici cifra investita/controvalore usano tutte le valutazioni e i movimenti datati disponibili, con etichette temporali compatte e aggregazione dei comparti.
- Automobile: il confronto usa i nomi delle vetture sull’asse X e il costo/km sull’asse Y; per la vettura corrente distanza e costi provengono dalle registrazioni di dettaglio, mentre i consuntivi storici restano disponibili per le vetture precedenti.

## Revisione del piano — 2026-07-20

- Ripristinata la progressione di maturità originaria: la `v0.2.0` resta la preview storica precedente e il perimetro funzionale completato con M8 è stato promosso alla `v0.8.0`; `v0.9.0` e `v1.0.0` restano rispettivamente i gate di hardening e stabilità installabile.
- Corretti gli stati superati: il mirror Numbers e la CI M8 risultano collaudati; la checklist generale è esplicitamente un modello di gate e non un elenco globale di attività ancora aperte.
- `npm install` conclude con 0 vulnerabilità note ma segnala pacchetti transitivi deprecati. Le catene correnti partono da `exceljs` (`lodash.isequal`, `fstream`, `rimraf`, `glob`, `inflight`) e dalla toolchain `electron-builder` (`boolean`, `rimraf`, `glob`, `inflight`); nessuno di questi pacchetti è una dipendenza diretta di ContaMì. Il gate `v0.9.0` deve rivalutare gli aggiornamenti upstream o alternative compatibili senza usare override non verificati.
- npm richiede inoltre di autorizzare consapevolmente gli script di installazione di `esbuild` e `electron-winstaller`; la decisione e l’eventuale configurazione riproducibile vanno verificate insieme alla build e al packaging, senza approvazioni automatiche indiscriminate.
- Revisione applicativa `v0.8.0`: corretti controvalori di investimenti e comparti pensione includendo movimenti confermati e valutazioni in ordine temporale; aggiunto il versamento iniziale con Transazione collegata e limitato il badge Ricorrente ai soli collegamenti espliciti.
- Immobili: aggiunta valutazione per totale o €/m²; introdotti flussi dedicati Utenze (fasce F1/F2/F3/F2+F3, m³ gas/acqua) e Tasse (Canone TV, IMU, TARI, numero rata e checkbox per il riepilogo delle Spese comuni), collegati atomicamente a Transazioni e opzionalmente a Spese condivise tra persone. I dettagli propongono tutti i dodici mesi e i grafici di valore commerciale ed entrate/uscite seguono le date effettive degli inserimenti.
- Preflight della revisione completato con lint, typecheck, build renderer/Electron e 42 test automatici; controllo documentale superato. La verifica visiva interattiva delle nuove modali resta da ripetere quando è disponibile un browser integrato o sull'app Electron locale.

## Avvio e chiusura M6 — 2026-07-21

- Creato il branch `milestone/06-hardening` dal checkpoint pulito `v0.8.0`; chiarita nel registro M8 la distinzione tra preview storica `v0.2.0` e promozione di maturità `v0.8.0`.
- Rafforzato il confine Electron: IPC accettato soltanto dal frame principale e dall’URL autorizzato, tuple e arità validate, blocco anche di WebSocket/webview/drag navigation, doppio diniego delle autorizzazioni e DevTools disabilitati nel pacchetto.
- Migliorata l’accessibilità delle modali con focus iniziale, contenimento Tab/Shift+Tab, Escape e ripristino del focus; aggiunti riduzione movimento, navigazione tradotta e stato di salvataggio annunciato.
- Ottimizzate dashboard e valorizzazione investimenti eliminando scansioni ripetute; aggiunto un budget automatico con 25.000 transazioni, 1.200 immobili e 1.200 investimenti sintetici.
- Aggiunti Playwright riproducibile a 1080 px per IT/EN, chiaro/scuro, focus e overflow, smoke dell’eseguibile unpacked nei workflow release, controllo del perimetro `asar`/packaging e pin SHA delle GitHub Actions.
- L’audit M6 ha rilevato la vulnerabilità high di `shell-quote 1.8.4` nella toolchain `concurrently`: risolta con override compatibile `>=1.10.0`. Gli script npm sono ora negati salvo allowlist versionata per i soli `esbuild@0.28.1` ed `electron-winstaller@5.4.0` necessari.
- Il percorso di avvio Electron con profilo QA separato supera lo smoke locale. Il packaging Windows locale resta bloccato prima della copia applicativa da un lock `EPERM` sulla rinomina dell’Electron appena estratto, riprodotto anche fuori sandbox; la verifica dei pacchetti effettivi resta quindi affidata alla CI macOS/Windows prima di promuovere `v0.9.0`.
- Gate locale M6 superato: lint, typecheck, build renderer/Electron, 48 test Vitest, Playwright Chromium, controllo documentale e `npm audit` con 0 vulnerabilità; i successivi gate CI e release hanno poi completato la verifica multipiattaforma riportata nei punti seguenti.
- PR M6 `#12` unita nel commit `8f0d663`; CI macOS/Windows verde sulla PR nel run `29820819987` e su `main` nel run `29821309419`. Manifest e lockfile sono sincronizzati a `0.9.0`; resta il solo gate del workflow release sul tag con artifact, smoke e checksum.
- Preparazione release unita con PR `#13` nel commit `3db6cbd`; CI finale verde su PR e `main`. Il tag annotato `v0.9.0` ha completato CI nel run `29822581872` e Release nel run `29822581930`: packaging e smoke degli eseguibili superati su macOS e Windows, sei artifact `0.9.0` pubblicati e digest riconciliati con `SHA256SUMS.txt`. M6 è completata; la release resta una preview privata non firmata.

## Avvio e chiusura M7 — 2026-07-21

- Creato `milestone/07-release` dalla `main` pulita successiva a M6 e corrette le due descrizioni storiche che presentavano ancora come incompleti gate già superati da `v0.9.0`.
- Sincronizzati manifest e lockfile a `1.0.0`; aggiunti ispezione del contenuto effettivo di `app.asar` e delle risorse, installazione temporanea da DMG/NSIS, avvio smoke e rimozione automatica sui runner macOS/Windows.
- Aggiornati workflow, README, quick start, manuali IT/EN, mappa e modello di sicurezza per descrivere la release stabile e le procedure esplicite di installazione/disinstallazione; gli artifact restano privati e non firmati.
- Gate locali superati: preflight con 48 test, Playwright IT/EN e chiaro/scuro a 1080 px, controllo documentale, audit con 0 vulnerabilità, packaging Windows, ispezione `app.asar`, smoke unpacked e ciclo NSIS di installazione/avvio/rimozione.
- PR M7 `#15` unita nel commit `956c826`; CI macOS/Windows verde sulla PR nel run `29832816551` e su `main` nel run `29834535669`. La release candidate manuale `29834862508` ha verificato i pacchetti installati su entrambi i sistemi senza eseguire il job di pubblicazione.
- Il tag annotato `v1.0.0` ha completato CI nel run `29837197589` e Release nel run `29837197402`: packaging, ispezione, smoke unpacked e installato superati su macOS e Windows; sei artifact stabili pubblicati e tutti i digest riconciliati con `SHA256SUMS.txt`. La release privata resta deliberatamente non firmata, come documentato.

## Revisione roadmap — 2026-07-21

- Rimossa la precedente M9 dedicata a dati web, quotazioni immobiliari e mercati ISIN perché non più richiesta; ContaMì resta interamente local-first e continua a bloccare la rete.
- Pianificati hardening dell’apertura workbook (M9), integrità e concorrenza dei salvataggi (M10), CSP senza stili inline (M11) e un gate di fattibilità per la cifratura portabile (M12).
- Firma, notarizzazione e Authenticode restano fuori dalle milestone finché non saranno disponibili le relative credenziali.

## Estensione roadmap — 2026-07-23

- Priorità aggiornata su richiesta del proprietario: M13, M14 e M15 precedono M9, M10 e M11, così template e importazione possono essere collaudati prima sui dati storici locali.
- Avviata M13 per sostituire Canone TV, IMU e TARI hardcoded con un catalogo tasse configurabile, portabile nel workbook e migrato senza perdita dello storico.
- Pianificata M14 per generare da Impostazioni otto template Excel versionati, con colonne guidate e menu a discesa alimentati dai cataloghi disponibili.
- Pianificata M15 per importare i template con preflight, anteprima, diagnostica per riga, gestione esplicita dei duplicati e applicazione atomica con backup e rollback.
- La precedente M12 è stata rimossa dalla sequenza e riclassificata come decisione futura senza implementazione o versione assegnata.
- Le nuove funzioni restano interamente locali: non introducono rete, telemetria, servizi cloud, macro o uso di dati personali in test e documentazione.

## Avvio e chiusura M13 — 2026-07-23

- Creato il branch `milestone/13-configurable-taxes` e portato manifest e lockfile a `1.1.0`; la milestone è stata integrata in `main`, taggata e pubblicata dopo la verifica multipiattaforma.
- Introdotto nel dominio il catalogo `TaxType` con UUID stabile, nome univoco senza distinzione tra maiuscole e minuscole, ambito residenza/locazione/entrambi, da 1 a 24 rate e stato attivo/archiviato.
- Migrato il workbook allo schema v4 con il foglio `Tax Types`; le migrazioni v1, v2 e v3 creano Canone TV, IMU e TARI e trasformano deterministicamente le precedenti tasse hardcoded in riferimenti `taxTypeId` e numeri di rata.
- Aggiunto in Impostazioni il CRUD bilingue delle tasse con conteggio utilizzi: una tassa inutilizzata può essere eliminata previa conferma, mentre una tassa già referenziata può soltanto essere archiviata e resta disponibile nello storico.
- I moduli immobiliari propongono soltanto tasse attive e compatibili con il tipo di immobile, rispettano il numero di rate configurato e continuano a collegare atomicamente Transazioni e Spese condivise; rollover e round-trip preservano l’intero catalogo.
- Aggiornati README, manuali IT/EN, MAP e SECURITY_MODEL; tutti i test e la documentazione usano esclusivamente dati sintetici.
- Gate locale M13 superato: lint, typecheck, build renderer/Electron, 54 test Vitest, Playwright Chromium a 1080 px con creazione e uso della tassa in IT/scuro e verifica EN/chiaro, controllo documentale e `npm audit` con 0 vulnerabilità. Durante il gate `fast-uri` è stato aggiornato transitivamente dalla 3.1.3 alla 3.1.4 per correggere l’avviso high dell’audit.
- Commit M13 `9a0abab`; CI del branch verde nel run `29996313238`, CI dei push `main` e tag verdi nei run `29996589713` e `29996589833`. Il tag annotato `v1.1.0` ha completato la Release nel run `29996589794`: packaging, ispezione e smoke installato superati su macOS e Windows, sei artifact applicativi pubblicati e checksum raccolti in `SHA256SUMS.txt`. Il branch M13 è stato rimosso localmente e dal remoto dopo merge e CI.

## Avvio e chiusura locale M14 — 2026-07-23

- Creato il branch `milestone/14-import-templates` e portati manifest, lockfile e documentazione applicativa a `1.2.0`.
- Definiti otto contratti di importazione v1 con intestazioni `snake_case`, campi obbligatori/condizionali/opzionali, chiavi gerarchiche scelte dall’utente e liste chiuse bilingui per residenza, immobili in affitto, transazioni, investimenti, fondo pensione, spese condivise, ricorrenze e automobile.
- Aggiunto un generatore Excel isolato dal workbook autorevole: produce un foglio dati visibile e due fogli tecnici `veryHidden` protetti, fino a 5.000 righe, date e numeri tipizzati, convalide tramite intervalli denominati, metadati verificabili e nessuna formula di cella, macro o link esterno. I cataloghi attivi sono incorporati con UUID soltanto quando provengono da un workbook configurato.
- Integrati dialogo nativo, servizio main, IPC/preload minimo e sezione bilingue **Importazione dati / Data import** in Impostazioni; al renderer tornano solo annullamento e nome file, mai il percorso completo.
- Pubblicata la specifica [documents/import-template-spec.md](documents/import-template-spec.md) e aggiornati manuali IT/EN, README, MAP e SECURITY_MODEL usando esclusivamente dati vuoti o sintetici.
- Gate locale M14 superato: preflight completo con lint, typecheck, build renderer/Electron e 63 test Vitest; Playwright Chromium in IT/scuro e EN/chiaro a 1080 px; controllo documentale; `npm audit` con 0 vulnerabilità. Gli otto file hanno superato round-trip ExcelJS, metadati, protezioni, menu, cataloghi vuoti/popolati, assenza di formule/link e il test produttivo da 5.000 righe.
- Excel desktop, LibreOffice e Numbers non sono installati o disponibili in questa sessione Windows: l’apertura visiva indipendente dei template resta quindi un gate manuale/CI da eseguire sulle piattaforme in cui tali applicazioni sono disponibili. Commit, push, CI multipiattaforma, tag e release costituiscono i successivi passi di pubblicazione.
- Pubblicazione M14 completata: commit funzionale `8084861`, PR `#17` e merge commit `a517d10`; CI verde sul branch (`30000488158`), sulla PR dopo il rerun di un errore transitorio dell’endpoint npm audit (`30005793095`), su `main` (`30006137711`) e sul tag (`30006488191`). Il tag annotato `v1.2.0` ha completato la Release nel run `30006488140`: packaging, ispezione e smoke installato superati su macOS e Windows, sei artifact applicativi pubblicati e checksum raccolti in `SHA256SUMS.txt`.

## Avvio e chiusura M15 — 2026-07-23/24

- Creato il branch `milestone/15-guided-import` da `main` sincronizzato e portati manifest, lockfile e documentazione applicativa a `1.3.0`.
- Implementati preflight `.xlsx`, parser e pianificazione per tutti gli otto template, strategie ignora/crea/aggiorna per identità esatte, riferimenti catalogo UUID o nome univoco, anteprima opaca nel main e diagnostica localizzata senza valori finanziari nei log.
- La conferma riusa i comandi di dominio in una trasformazione in memoria e salva una sola volta tramite il repository esistente: controllo revisione, backup, verifica di rilettura, sostituzione atomica e rollback restano invariati.
- Aggiunti flusso Impostazioni IT/EN, anteprima accessibile, riepilogo create/aggiorna/ignora/importi e copertura sintetica per otto tipologie, formule/macro, versioni, riferimenti, duplicati, annullamento, conferma, backup e atomicità.
- Gate locale M15 superato: lint, typecheck, build renderer/Electron, 76 test Vitest, controllo documentale e `npm audit` con 0 vulnerabilità; Playwright Chromium superato in IT/scuro e EN/chiaro a 1080 px con anteprima, focus da tastiera, conferma, assenza di overflow ed errori console.
- Collaudo manuale del proprietario completato con dati locali: l'anteprima ha identificato riferimenti e valori non validi, la correzione guidata ha risolto gli errori e l'importazione finale di categorie e registrazioni immobiliari è riuscita. I file usati restano esclusi da Git e non sono stati copiati in fixture o servizi remoti.
- Pubblicazione M15 completata: commit funzionale `3b6c950`, PR `#18` e merge commit `b0bded4`; CI verde sulla PR (`30101556907`), su `main` (`30101882085`) e sul tag (`30102161837`). Il tag annotato `v1.3.0` ha completato la Release nel run `30102161664`: packaging, ispezione e smoke installato superati su macOS e Windows, sei artifact applicativi pubblicati e checksum raccolti in `SHA256SUMS.txt`.

## Patch residenza e storico immobili — 2026-07-25

- Avviato il branch `patch/1.3.1-residence-property-history` da `milestone/16-transport-improvements`; dopo approvazione del proprietario la patch è stata committata, mergiata in `main`, taggata come `v1.3.1`, pubblicata e il branch locale è stato eliminato.
- Portato il workbook allo schema v5 aggiungendo a `Property History` i campi aggregati `phoneInternetCost` e `condominiumCost`; i workbook v1, v2, v3 e v4 vengono migrati in memoria e validati come v5.
- Corretti gli indicatori della residenza per riconoscere utenze importate tramite `detailKind` e kWh elettrici da fasce F1/F2/F3/F23; Telefono/Internet e Condominio confluiscono anche nello storico annuale.
- Spostati i filtri descrizione/mese prima dello storico nella modale immobile e aumentato lo spazio verticale dei grafici delle utenze per evitare scrollbar verticali interne.
- Aggiunto il comando atomico per registrare una rata di affitto come entrata ricorrente direttamente dalla nuova registrazione immobile; la rata corrente viene collegata alla ricorrenza e le rate future pianificate restano coerenti con il modello delle Ricorrenze.
- Commit funzionale `772f187` e merge commit `ea53d29`; CI su `main` e sul tag `v1.3.1` verdi. Il workflow Release `30159557120` ha completato packaging, ispezione, smoke installato e pubblicazione privata per macOS e Windows, con checksum in `SHA256SUMS.txt`.

## Rischi e mitigazioni iniziali

| Rischio | Mitigazione |
|---|---|
| Il formato `.numbers` non è documentato né scrivibile nativamente su Windows | Adapter macOS isolato + `.xlsx` interoperabile e sempre recuperabile |
| Corruzione o conflitto durante il salvataggio | Scrittura temporanea, validazione, sostituzione atomica, backup e lock/version check |
| Errori nei KPI finanziari | Logica pura testata, dataset golden, totali di controllo e drill-down alle righe origine |
| Esposizione di dati personali | Local-first, zero telemetria, log redatti, dati di esempio sintetici, esclusioni packaging/Git |
| File modificato contemporaneamente in Excel/Numbers | Rilevamento impronta/mtime e blocco del salvataggio con scelta guidata |
| Importazione parziale, duplicata o riferita a cataloghi ambigui | Template versionati, anteprima obbligatoria, mappatura esplicita, trasformazione atomica, backup e rollback |
| Build non firmate | Nessuna falsa promessa; avvisi documentati e workflow pronto per credenziali future |

## Criterio di completamento del progetto

Il criterio di completamento è soddisfatto dalla release privata `v1.0.0`: include applicazioni installabili e verificate per macOS e Windows, le funzioni richieste sono coperte da test proporzionati al rischio, il workbook resta leggibile fuori dall’app, la chiusura annuale è riconciliata, i documenti obbligatori sono aggiornati e la CI è verde.
