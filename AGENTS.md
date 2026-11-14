# ContaMì — Istruzioni operative per agenti e maintainer

## Prima di modificare

1. Leggi `PLAN.md`, `README.md`, `MAP.md` e `SECURITY_MODEL.md`.
2. Controlla branch e worktree; non sovrascrivere modifiche non tue.
3. Tratta `sources/`, workbook, screenshot e backup come dati privati. Non aprirli con servizi remoti, non committarli e non usarli come fixture.
4. Usa dati sintetici in test, documentazione e issue.

## Architettura

- Mantieni separati dominio, configurazione, persistenza spreadsheet, servizi main, IPC/preload e renderer.
- Evita moduli monolitici e logica finanziaria nei componenti React.
- Il dominio espone trasformazioni pure e validate; adapter Excel/Numbers implementano solo il formato.
- Schema workbook corrente: v16. Le ricorrenze condivise conservano pagante e proporzione delle quote; le pianificazioni sono visibili nella lista ma non incidono sui saldi condivisi né sull’importo o sul conteggio delle spese saldate. Il Totale filtrato somma le righe visibili e distingue la parte pianificata. I metadati acquisto Automobile sono informativi: non generare movimenti finanziari, non sommare prezzo intero e rate e non inventare anticipi durante la migrazione.
- `.xlsx` è il formato canonico portabile. `.numbers` è una copia macOS opzionale; non introdurre dipendenza Numbers nel dominio.
- Il renderer non deve ottenere Node.js, percorsi arbitrari, IPC generico, rete o segreti.
- Aggiungi canali IPC soltanto in `src/shared/ipc.ts`, valida input e mittente in `registerIpc.ts`, esponi il minimo nel preload e aggiorna `SECURITY_MODEL.md`.

## Lingua e UI

- Ogni stringa visibile va aggiunta in italiano e inglese in `translations.ts`.
- Italiano è automatico solo quando la lingua di sistema inizia con `it`; altrimenti inglese.
- Ogni componente nuovo deve restare leggibile in tema chiaro/scuro e a larghezza minima 1080 px.
- Conserva palette, spaziature e gerarchia del logo; evita font o asset remoti.
- Verifica stati vuoto, errore, caricamento, disabilitato e focus tastiera.

## Dati e sicurezza

- Valida ogni confine con Zod o controlli equivalenti; imposta limiti espliciti.
- Non scrivere formule ottenute da testo utente e non eseguire macro o contenuto attivo dei workbook.
- Conserva salvataggio temporaneo, verifica di rilettura, backup, rollback e controllo modifiche esterne.
- Non aggiungere telemetria, cloud, AI o rete senza una milestone esplicita, consenso del proprietario e aggiornamento del modello di sicurezza.
- Non loggare contenuti finanziari, percorsi completi non necessari o segreti.
- Le operazioni distruttive su dati utente richiedono conferma; preferire chiusura logica e copie recuperabili.

## Sviluppo e test

Richiede Node.js 24 LTS >=24.15.0. Prima di chiudere una modifica:

```bash
npm run lint
npm run typecheck
npm test
npm run build
node scripts/check-required-docs.mjs
npm audit
```

- Aggiungi unit test per logica finanziaria e integration test per filesystem/settings/workbook.
- Per UI usa il workflow Playwright CLI e verifica almeno una volta IT/EN e chiaro/scuro.
- Per spreadsheet usa solo dati sintetici; controlla round-trip e resa dei fogli principali.
- Se una verifica non può essere eseguita, dichiaralo nei documenti di milestone e nella consegna.

## Git, milestone e release

- Usa branch `milestone/<numero>-<slug>` o `patch/<versione>-<slug>` e commit piccoli, intenzionali.
- Usa l'account GitHub privato `gloutchov` e l'email autore `gloutchov@gmail.com` per questo repository. Se l'email Git configurata è diversa, imposta `user.email` a `gloutchov@gmail.com` nella configurazione locale del repository prima di commit, push, PR, tag o release; questo riferimento esplicito vale anche in caso di discrepanza. Se l'account GitHub autenticato non è `gloutchov` o non può essere verificato, fermati e chiedi conferma.
- Il proprietario ha autorizzato la progressione autonoma tra milestone. Alla chiusura di una milestone o patch, congela il branch sul commit finale locale e presenta hash, diff, test ed eventuali limiti: merge, tag, push, release e rimozione del branch richiedono il controllo personale di quel preciso commit e l'approvazione esplicita del proprietario. Una modifica successiva richiede un nuovo controllo e una nuova approvazione.
- Aggiorna insieme codice, test, `PLAN.md`, manuali, `MAP.md` e `SECURITY_MODEL.md` quando pertinenti.
- La CI e il packaging usano `npm audit --include=dev`, completo e bloccante, con soglia info, fetch timeout 120 secondi/zero retry e step CI di 3 minuti: nessuna eccezione, soglia ridotta o scadenza. `npm ci` usa `.npmrc` con `install-links=true` per impacchettare `vendor/temp` anziché escluderlo dall’audit come symlink. Conserva nome/versione upstream, licenza, provenienza e regressioni del componente; non modificare manualmente `node_modules`. `vendor/` conserva lo stile upstream ed è escluso dal lint, mentre i test verificano la copia realmente installata.
- Se pubblicare una GitHub release segue la regola unica della sezione Release dello standard HOME, dal 14/11/2026, senza eccezioni di progetto. Senza release la versione resta invariata e non si crea un tag `vX.Y.Z`. Il tag di checkpoint di una milestone chiusa è `milestone/C<numero>`.
- Non pubblicare una release dovuta finché CI macOS/Windows, artifact e checksum non sono verificati.
- Le build restano non firmate finché non esiste un processo documentato con credenziali fornite esplicitamente.
- Non spostare tag pubblicati e non eliminare branch prima di merge e verifica CI.

## Packaging

- `sources/`, workbook, backup, file `.env`, chiavi e certificati non devono entrare in Git o artifact.
- Mantieni `asar: true`, CSP, sandbox e blocchi di rete/navigazione nel pacchetto.
- Esegui il packaging macOS su macOS e Windows su Windows, preferibilmente tramite GitHub Actions.
- Pubblica `SHA256SUMS.txt` e segnala chiaramente Gatekeeper/SmartScreen per artifact non firmati.
