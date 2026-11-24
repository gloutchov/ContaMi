# Manutenzione dipendenze / Dependency maintenance

L’eccezione del 18/11/2026 e le sezioni C44–C46 sono storiche. La policy corrente è descritta qui sotto. / The 18 November 2026 exception and the C44–C46 sections are historical. The current policy is described below.

## Policy corrente — 22/11/2026 / Current policy

**Italiano.** Il 22/11/2026 l’eccezione temporanea per [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) (`picomatch` 4.0.7) è stata rimossa. GitHub ha ritirato l’advisory il 18/11/2026 alle 15:38 UTC come «not a security issue». L’audit completo, con `--include=dev`, `--audit-level=info`, timeout di fetch di 120 secondi e zero retry, riporta zero finding. `npm run audit:ci` mostra il report integrale e termina con 0 solo se quel report è pulito. `scripts/dependency-audit-policy.json` contiene soltanto `schemaVersion` 1: una chiave `temporaryException` residua, qualsiasi advisory e ogni report incoerente o errore del registry bloccano il gate. Non c’è scadenza né rinnovo. Una nuova eccezione richiede una decisione esplicita del proprietario e una modifica revisionata. Versione applicativa 1.27.3, schema v16 e dipendenze invariati; nessuna release.

**English.** On 22 November 2026 the temporary exception for [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) (`picomatch` 4.0.7) was removed. GitHub withdrew the advisory on 18 November 2026 at 15:38 UTC as “not a security issue”. The full audit, with `--include=dev`, `--audit-level=info`, a 120-second fetch timeout and no retries, reports zero findings. `npm run audit:ci` displays the entire report and exits 0 only when that report is clean. `scripts/dependency-audit-policy.json` contains only schemaVersion 1: a leftover `temporaryException`, any advisory, and every inconsistent report or registry error block the gate. There is no expiry and no renewal. A new exception requires an explicit owner decision and a reviewed change. Application version 1.27.3, schema v16 and dependencies are unchanged; there is no release.

**Verifiche locali del 22/11/2026.** Linux, Node 24.15.0 e npm 11.12.1, la versione di Node richiesta da `.node-version`. `npm ci` esce con 0. Prima della rimozione, `npm run audit:ci` esce con 0 e zero finding e chiede di togliere l’eccezione inutilizzata. Lo stesso comando `npm audit --include=dev --audit-level=info --fetch-timeout=120000 --fetch-retries=0 --json` esce con 0 e zero finding su info, low, moderate, high e critical. Dopo la rimozione, lint, typecheck, build renderer/Electron, il controllo dei 15 documenti e `npm run audit:ci` escono con 0; il gate dichiara «no temporary exception». La suite ha 459 test superati e uno saltato, nessun errore. Browser QA, avvio Electron nativo, packaging e CI remota non sono stati eseguiti: la modifica non cambia l’app e il branch non è stato pubblicato. Nessuna release.

**Local validation on 22 November 2026.** Linux, Node 24.15.0 and npm 11.12.1, the Node version required by `.node-version`. `npm ci` exits 0. Before removal, `npm run audit:ci` exits 0 with zero findings and asks for the unused exception to be removed. The same `npm audit --include=dev --audit-level=info --fetch-timeout=120000 --fetch-retries=0 --json` exits 0 with zero info, low, moderate, high and critical findings. After removal, lint, typecheck, renderer/Electron build, the 15-document check and `npm run audit:ci` exit 0; the gate reports “no temporary exception”. The suite has 459 passing tests and one skipped test, with no failures. Browser QA, native Electron launch, packaging and remote CI were not run: this change does not alter the app and the branch was not published. No release.

## Eccezione temporanea picomatch — 18/11/2026, rimossa / Temporary picomatch exception — removed

**Storica.** Il testo seguente registra l’autorizzazione del 18/11/2026. Non è più la policy corrente. / **Historical.** The following text records the 18 November 2026 authorization. It is no longer the current policy.

**Italiano.** Il 18/11/2026 il proprietario autorizzò una sola eccezione per [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), con scadenza **02/12/2026 ore 00:00 UTC**, senza rinnovo automatico. L’indagine riprodusse il rallentamento su pattern sintetici, ma nel progetto `picomatch` 4.0.7 compariva solo nella toolchain di sviluppo/compilazione; non fu individuato un ingresso dai dati finanziari ai pattern. In quella data l’audit completo riportava 19 finding alti derivati da un solo advisory; quello delle dipendenze di produzione riportava zero finding. [Snyk aveva revocato l’avviso](https://security.snyk.io/vuln/SNYK-JS-PICOMATCH-21248802), mentre GitHub lo manteneva attivo senza versione corretta. Era rischio residuo accettato, non una correzione della libreria né una garanzia generale sui pattern non fidati. L’eccezione è stata rimossa il 22/11/2026, dopo il ritiro dell’advisory da parte di GitHub e il ritorno dell’audit completo a zero.

In quella data `npm run audit:ci` era il comando comune a CI e packaging. Eseguiva `npm audit --include=dev --audit-level=info --fetch-timeout=120000 --fetch-retries=0 --json`, mostrava il report integrale e valutava la policy in `scripts/dependency-audit-policy.json`. Il processo npm aveva un limite di 165 secondi e lo step CI conservava 3 minuti. Erano ammessi solo i 19 nomi approvati e i nodi esclusivamente `dev` presenti nel lockfile, con provenienza transitiva riconducibile unicamente all’advisory autorizzato. `picomatch` doveva restare la copia npm originale 4.0.7, con URL e integrità approvati; symlink, fork, versioni e collocazioni differenti richiedevano una nuova valutazione. I cicli nel grafo delle metavulnerabilità non facevano perdere la verifica di provenienza.

Qualsiasi nuovo advisory, anche sullo stesso pacchetto e senza cambiare il numero di finding, restava bloccante. Lo stesso valeva per nuove catene fuori perimetro, coinvolgimento runtime, gravità critica, report mancanti o incoerenti, exit code inattesi, errori del registry, timeout e scadenza. Il gate distingueva esplicitamente «audit pulito» da «finding accettati temporaneamente»; `npm audit` ordinario poteva uscire con codice 1. Il controllo diagnostico delle sole dipendenze di produzione non sostituiva il gate completo.

La regola di rimozione era: togliere l’eccezione quando una versione upstream corretta eliminava i finding o l’advisory veniva rettificato e l’audit completo tornava pulito. È la condizione soddisfatta il 22/11/2026. Il rinnovo avrebbe richiesto una nuova decisione esplicita del proprietario. Versione applicativa 1.27.3, schema v16 e dipendenze restavano invariati: quella modifica riguardava solo controlli e documentazione, senza nuova release applicativa.

**English.** On 18 November 2026 the owner authorized a single exception for [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), expiring **2 December 2026, 00:00 UTC**, with no automatic renewal. Investigation reproduced slow matching on synthetic patterns, but this project's `picomatch` 4.0.7 belonged only to development/build tooling; no path from financial data to patterns was identified. On that date the full audit reported 19 high findings originating from one advisory; the production-only audit reported none. [Snyk had revoked the advisory](https://security.snyk.io/vuln/SNYK-JS-PICOMATCH-21248802), while GitHub still listed it without a patched version. That accepted residual risk; it did not fix the library or establish general safety for untrusted patterns. The exception was removed on 22 November 2026, after GitHub withdrew the advisory and the full audit returned to zero.

On that date `npm run audit:ci` was shared by CI and packaging. It ran `npm audit --include=dev --audit-level=info --fetch-timeout=120000 --fetch-retries=0 --json`, displayed the entire report and evaluated `scripts/dependency-audit-policy.json`. The npm subprocess had a 165-second limit and the CI step retained three minutes. Only the 19 approved package names and exclusively `dev` lockfile nodes were permitted, with every transitive finding attributable solely to the authorized advisory. `picomatch` had to retain the original npm 4.0.7 source URL and integrity; symlinks, forks, different versions or installation paths needed reassessment. Cycles in the metavulnerability graph did not bypass provenance checks.

Every new advisory blocked, including another advisory on the same package without a different finding count. New out-of-scope chains, runtime exposure, critical severity, missing/inconsistent reports, unexpected exit codes, registry errors, timeouts and expiry also blocked. Output explicitly distinguished a clean audit from temporarily accepted findings; ordinary `npm audit` could still exit with code 1. A production-only diagnostic did not replace the full gate.

The removal rule was to drop the exception when an upstream fix eliminated the findings or the advisory was corrected and the full audit became clean. That condition was met on 22 November 2026. Renewal would have required a new explicit owner decision. Application version 1.27.3, schema v16 and dependencies stayed unchanged: that change covered checks and documentation only, without a new application release.

**Verifiche locali del 18/11/2026.** Copia pulita su Windows, Node 24.18.1 e npm 12.2.1; installazione del grafo originale con `npm ci --ignore-scripts`, senza cambiare il lockfile. Superati i 33 test dedicati alla policy e al comando npm reale contro un registry sintetico: inclusione delle dev, report integrale, unico advisory, catene cicliche, nuovi avvisi anche sullo stesso pacchetto, runtime, origine/integrità, scadenza, report incoerenti ed errori. Superati lint, typecheck, build renderer/Electron, CSP, baseline Node, landing e controllo dei 15 documenti obbligatori. L’audit completo reale mantiene 19 high/zero critical; `npm run audit:ci` esce con 0 dichiarando esplicitamente l’eccezione. La suite generale ha 466 test superati, uno saltato e un errore in `modernDependencyCompatibility.test.mjs`, test «creates and extracts ASAR with Unicode, dotfiles, ignores and unpack filters»: l’asserzione di esclusione della cartella sintetica `sources` fallisce anche su una copia pulita del commit base `7516bdb`, con il medesimo lockfile e senza queste modifiche. Non è stato corretto né saltato. Browser QA, avvio Electron nativo, packaging e CI remota non eseguiti per questa modifica ai soli controlli; non è stata pubblicata una release.

**Local validation on 18 November 2026.** Clean Windows checkout, Node 24.18.1 and npm 12.2.1; the original graph was installed with `npm ci --ignore-scripts` without changing the lockfile. All 33 dedicated policy and actual-npm tests against a synthetic registry passed: development inclusion, full report, sole advisory, cyclic chains, new advisories on the same package, runtime, origin/integrity, expiry, inconsistent reports and errors. Lint, typecheck, renderer/Electron build, CSP, Node baseline, landing and all 15 required-document checks passed. The real full audit retains 19 high/zero critical findings; `npm run audit:ci` exits 0 while explicitly reporting the exception. The general suite has 466 passing tests, one skipped and one failure in `modernDependencyCompatibility.test.mjs`, «creates and extracts ASAR with Unicode, dotfiles, ignores and unpack filters»: excluding the synthetic `sources` directory also fails on a clean baseline commit `7516bdb`, with the same lockfile and none of these changes. It was neither fixed nor skipped. Browser QA, native Electron launch, packaging and remote CI were not run for this checks-only change; no release was published.

## Ambito e provenienza C44 / C44 scope and provenance

Verifica del 31 ottobre 2026 su Node.js 24.18.1 / npm 11.16.0. Base applicativa C43
`1890b7ef5b1477798cd3ebe7de8d9feb4b56d0ef`; versione 1.27.0 e schema workbook v16
invariati. M44 non modifica codice applicativo, IPC, rete o dati finanziari e non
pubblica una release. C44 è chiusa sul commit `914d8fd` con CI e pacchetti verificati;
il riepilogo definitivo è in PLAN.md.

Checked on 31 October 2026 with Node.js 24.18.1 / npm 11.16.0 against application
baseline C43 above. Application version 1.27.0 and workbook schema v16 are unchanged.
M44 changes no application code, IPC, network access or financial data, and produces
no release. C44 is closed at commit `914d8fd` after CI and package validation; see
PLAN.md for the final record.

Fonti ufficiali / Official sources:

- [Glob cancellation advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4):
  affected ≥9.0.0–14.0.1, fixed from 14.0.2.
- [Minimatch amplification advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249):
  affected <11.0.1, fixed from 11.0.1.
- [Minimatch API](https://github.com/isaacs/minimatch#readme): named exports,
  `Minimatch.match(path, partial)`, non-regex matchers in version 11.
- [npm scoped overrides](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#overrides).

Il registry npm conferma che le versioni correnti dei consumatori sotto riportati
richiedono ancora minimatch 9/10 e ASAR 4 richiede glob 13. Gli override sono limitati
al consumatore e alla major figlia: non sostituiscono minimatch 3/5 o glob 7.
Nessuna patch a `node_modules`, alias, versione falsificata o audit forzato.
`@isaacs/nonrecursive-glob-match` 1.0.3 è una nuova dipendenza transitiva ufficiale
di minimatch 11, necessaria al suo motore di matching. Glob 14 richiede path-scurry 3.

The npm registry confirms that the current consumers below still require minimatch
9/10, while ASAR 4 requires glob 13. Overrides are scoped by consumer and child major;
they do not replace minimatch 3/5 or glob 7. No edits to installed packages, aliases,
fabricated versions or forced audit fixes are used. The new transitive dependency
`@isaacs/nonrecursive-glob-match` 1.0.3 is minimatch 11's official matching engine;
glob 14 also requires path-scurry 3.

## Gruppo moderno / Modern cohort

| Consumatore / Consumer (unchanged) | Prima / Before | Dopo / After |
|---|---|---|
| `@electron/asar` 4.3.1 | glob 13.0.6, minimatch 10.2.6 | glob 14.0.3, minimatch 11.0.3 |
| glob (used by ASAR 4) | minimatch 10.2.6, path-scurry 2.0.2 | minimatch 11.0.3, path-scurry 3.0.0 |
| `@electron/universal` 2.0.3 (direct matcher) | minimatch 9.0.9 | minimatch 11.0.3 |
| `app-builder-lib` 26.18.0 (direct matcher) | minimatch 10.2.6 | minimatch 11.0.3 |
| ESLint 10.13.0 / `@eslint/config-array` 0.23.5 | minimatch 10.2.6 | minimatch 11.0.3 |
| `@typescript-eslint/typescript-estree` 8.72.0 | minimatch 10.2.6 | minimatch 11.0.3 |

L'override ASAR seleziona soltanto glob 13 / minimatch 10 anche quando incontra ASAR
3 annidato. I filtri del builder leggono `Minimatch.set` per riconoscere i pattern
dinamici e usano `match` con il flag partial: entrambi i comportamenti sono verificati
con l'API reale. Universal usa l'export nominato `minimatch`, con `matchBase`.

The ASAR override selects only glob 13 / minimatch 10, including when traversing
nested ASAR 3. Builder filters inspect `Minimatch.set` for dynamic patterns and use
partial `match`; tests exercise both through the real API. Universal uses the named
`minimatch` export with `matchBase`.

## Audit e residui M45 / Audit and M45 residuals

| Audit completo / Full audit | C43 | M44 |
|---|---:|---:|
| Moderate | 31 | 20 |
| High / critical | 0 | 0 |
| Advisory radice / Root advisories | 2 | 1 (minimatch) |

Gli 11 gruppi rimossi / The 11 removed package groups: `@eslint-community/eslint-utils`,
`@eslint/config-array`, `@eslint/js`, `@typescript-eslint/eslint-plugin`,
`@typescript-eslint/parser`, `@typescript-eslint/type-utils`,
`@typescript-eslint/typescript-estree`, `@typescript-eslint/utils`, `eslint`,
`eslint-plugin-react-refresh`, `typescript-eslint`. L'advisory glob scompare anche
dai gruppi che restano segnalati per minimatch legacy. / The glob advisory also
disappears from groups still flagged through legacy minimatch.

`npm audit --include=dev --json` continua a uscire con codice 1. Le 20 segnalazioni
sono gruppi di pacchetti propagati da minimatch 3.1.5 / 5.1.9; non sono 20 difetti
indipendenti. Tutte le 11 copie vulnerabili sono nelle catene legacy seguenti:

- `@electron/universal`, `app-builder-lib`, `electron-winstaller` → ASAR 3.4.1
  e/o glob 7.2.3 → minimatch 3.1.5.
- `@electron/universal` → dir-compare 4.2.0 → minimatch 3.1.5.
- `app-builder-lib` → ejs → jake → filelist 1.0.6 → minimatch 5.1.9.
- ExcelJS → archiver → archiver-utils 2.1.0 / zip-stream → archiver-utils 3.0.4
  → glob 7.2.3 → minimatch 3.1.5.
- ExcelJS → archiver → readdir-glob 1.1.3 → minimatch 5.1.9.
- ExcelJS → unzipper → fstream, e electron-winstaller → temp → rimraf 2.6.3
  → glob 7.2.3 → minimatch 3.1.5.

Npm raggruppa i finding per nome del pacchetto: può ancora elencare ASAR 4 fra i
`nodes` di ASAR e glob come pacchetto transitivamente vulnerabile. La riconciliazione
per percorso conferma che ASAR 4 risolve glob 14/minimatch 11 e che solo glob 7
conserva matcher vulnerabili. Glob 7 è fuori dall'intervallo dell'advisory di
cancellazione, che non compare più nel report. Le catene legacy restano da correggere.

The full audit still exits 1. Its 20 package groups arise from the 11 remaining
minimatch 3.1.5 / 5.1.9 installations in the legacy chains above. npm groups findings
by package name, so it may still list ASAR 4 among ASAR's nodes and glob as a
transitively vulnerable package. Path-by-path resolution confirms that ASAR 4 uses
glob 14/minimatch 11; only glob 7 retains vulnerable matchers. Glob 7 is outside the
cancellation advisory's affected range, and that advisory is absent from the report.
The legacy chains still require remediation.

La policy rimuove l'eccezione glob; resta solo l'advisory minimatch moderata fino al
14 novembre 2026 incluso UTC. Il gate passa con questa limitazione; non equivale ad
audit pulito. Nuovi finding, gravità diverse, errori e scadenza restano bloccanti.
Un test della policy reale verifica che un ritorno dell'advisory glob venga bloccato.

The policy removes the glob exception and retains only the moderate minimatch
advisory through 14 November 2026 inclusive UTC. The passing bounded gate does not
mean a clean audit. New findings, different severities, errors and expiry still block
the gate. A test of the real policy checks that a returning glob advisory is rejected.

## Verifiche / Validation

`modernDependencyCompatibility.test.mjs` verifica tutti i consumatori moderni,
dotfile, Unicode/spazi, percorsi Windows/UNC, globstar, negazioni, pruning delle
directory e ordine dei filtri; esercita builder, ASAR, ESLint e il project service
typescript-eslint. I probe delle due advisory girano in processi separati, con
timeout 10 secondi, heap 128 MiB e output limitato. I probe falliscono anche sulla
baseline vulnerabile C43, con dati sintetici piccoli e senza esaurire risorse.

The compatibility suite checks all modern consumers, dotfiles, Unicode/spaces,
Windows/UNC paths, globstar, negation, directory pruning and filter ordering. It
exercises builder, ASAR, ESLint and the typescript-eslint project service. Advisory
probes run in separate processes with a 10-second timeout, 128-MiB heap and bounded
output; both also reject the vulnerable C43 baseline using small synthetic fixtures.

Esiti locali e chiusura remota sono registrati nella voce C44 di [PLAN.md](../PLAN.md).
Nessun workbook privato è usato; gli smoke nativi che possono leggere le impostazioni
reali sono riservati ai runner CI effimeri.

Local results and remote closure are recorded under C44 in [PLAN.md](../PLAN.md). No private
workbook is used; native smoke tests that may read real settings are reserved for
ephemeral CI runners.

## M45 — audit completo senza eccezioni / full audit without exceptions

Base: main documentale C44 `c665e2c2433326dbde76a3aa2a5d90538706bc60`, checkpoint
applicativo `milestone/C44` su `914d8fd`. Sorgente candidata 1.27.1, workbook v16
invariato. Nessuna pubblicazione prima del controllo del commit e dei gate remoti.

Baseline: C44 documentation main above, with application checkpoint `914d8fd`.
Candidate source 1.27.1 keeps workbook v16. Publication requires commit review and
remote package gates.

| Catena / Chain | C44 | M45 locale / local |
|---|---|---|
| ASAR sotto builder/universal/winstaller | 3.4.1 con glob 7/minimatch 3 | 4.3.1 con glob 14/minimatch 11 |
| Universal | 2.0.3, dir-compare/minimatch 3 | 3.0.6, confronto filesystem e `path.matchesGlob` nativi |
| Jake → FileList | 1.0.6, minimatch 5 | 2.0.2, minimatch 11 |
| ExcelJS → Archiver → readdir-glob | 1.1.3, minimatch 5 | 3.0.0, minimatch 11 |
| Archiver/zip-stream → archiver-utils | glob 7/minimatch 3 | glob 14.0.3/minimatch 11.0.3 |
| ExcelJS → unzipper | 0.10.14 → fstream/rimraf/glob 7 | 0.12.5, senza fstream/rimraf |
| winstaller → temp | 0.9.4 → rimraf/glob 7 | 0.9.4 locale, cleanup letterale Node `fs.rm` |

Gli override limitano le major glob 7–13 e minimatch 9/10 ai rispettivi target
14.0.3/11.0.3. Dopo le migrazioni, le uniche chiamate legacy a glob erano `glob.sync`
in archiver-utils 2/3, API conservata e verificata con inclusioni/esclusioni, dotfile,
Unicode/spazi e confronto del corpus. Non si forza minimatch 11 nei chiamanti
callable 3/5: tali catene sono eliminate. ASAR/unzipper/FileList/readdir-glob
mantengono le API realmente usate, esercitate nei test dei consumatori.

Overrides target glob majors 7–13 and minimatch 9/10 at 14.0.3/11.0.3 respectively.
After migration, the remaining legacy glob calls were `glob.sync` in archiver-utils
2/3, an API preserved and tested against inclusion/exclusion, dotfiles, Unicode and
spaces. Minimatch 11 is not forced into callable 3/5 consumers; those chains are
removed. Tests exercise the APIs actually used by ASAR, unzipper, FileList and readdir-glob.

Archiver resta alla versione C44 5.3.2. Le versioni candidate 6/7 normalizzano gli
stream tramite il valore restituito da `pipe`, mentre StreamBuf di ExcelJS 4.4.0
non restituisce la destinazione: il nuovo test streaming rileva l'incompatibilità.
Conservare la factory compatibile e aggiornare i suoi traversal/matcher elimina
le vulnerabilità senza introdurre un secondo fork o modificare ExcelJS.

Archiver remains at C44's 5.3.2. Candidate majors 6/7 normalize streams using the
return value of `pipe`, while ExcelJS 4.4.0 StreamBuf does not return its destination;
the streaming test detects that incompatibility. Retaining the compatible factory
and migrating its traversal/matcher dependencies removes findings without a second
fork or changes to ExcelJS.

La sola copia locale è [vendor/temp](../vendor/temp/README.md), build-only, con
licenza MIT e integrità npm upstream verificata in `UPSTREAM.json`. Nome/versione
originali sono conservati; la patch sostituisce rimraf con `fs.rm`/`fs.rmSync` sui
percorsi tracciati, con retry e API callback/sync/exit. `.npmrc` abilita install-links:
la copia è impacchettata, non un symlink escluso dall'audit. L'audit continua quindi
a vedere `temp@0.9.4`, comprese eventuali advisory future su quel nome/versione.
Un test confronta il sorgente realmente installato con la copia locale e ne verifica
l'assenza di dipendenze rimraf. Nessuna rinomina o versione inventata per l'audit.

The sole local copy is build-only MIT-licensed temp, with verified upstream npm
integrity recorded in `UPSTREAM.json`. Original name/version are retained. The patch
uses literal `fs.rm`/`fs.rmSync` for tracked paths with retry and callback/sync/exit
cleanup. `install-links` packs the dependency instead of symlinking it out of audit;
npm still audits `temp@0.9.4`, including future advisories for that name/version.
Tests compare the installed source with the local copy and reject a remaining rimraf
dependency. No renamed package or fabricated version is used to obtain a clean audit.

L'audit completo passa **20→0**, incluse le dipendenze dev e opzionali del lockfile.
Restano soltanto glob 14.0.3 e minimatch 11.0.3. Rimossi comando `audit:release`, policy,
helper/validatore e relativi test di esenzione. CI/Release usano il comando npm
ordinario completo, con `--audit-level=info`, timeout fetch di 120 secondi, zero
retry e timeout step di 3 minuti. Ogni advisory o errore blocca, senza scadenze.
Un registry locale sintetico verifica il comando reale dei workflow: pulito passa;
info, moderato ed errore 503 falliscono, senza credenziali o traffico esterno.

The full audit falls **20→0**, including dev and optional lockfile dependencies.
Only glob 14.0.3/minimatch 11.0.3 remain. The release-audit command, policy, assessor
and exemption tests are removed. CI/Release use ordinary full npm audit, with
`--audit-level=info`, a 120-second fetch timeout, no retries and a 3-minute step
limit. Any advisory/error blocks without expiry. Tests run the actual workflow
command against a synthetic local registry: clean passes; info, moderate and 503
errors fail without credentials or external traffic.

Limite upstream rilevato: l'API opzionale WorkbookReader streaming di ExcelJS 4 può
restituire riferimenti sharedString in modo dipendente dall'ordine degli elementi ZIP;
il difetto è riprodotto su C44 e sul nuovo grafo. L'app usa il reader ordinario, che
conserva i valori. I test coprono writer streaming con e senza stringhe condivise
seguito dal reader ordinario, e reader streaming con stringhe inline; non dichiarano
corretto il difetto upstream. I test finanziari, import/rollover e round-trip v16
continuano a verificare le API usate dall'app con soli dati sintetici.

Il confronto C44/M45 sullo stesso corpus sintetico conferma risultati identici per
readdir-glob, FileList e glob.sync. Nel caso di un nome tracciato già scomparso con
metacaratteri, la base C44 elimina il vicino non tracciato che corrisponde al pattern;
M45 lo conserva grazie al percorso letterale. Le prove sono isolate in directory
temporanee sintetiche e registrate nelle evidenze locali.

The C44/M45 comparison on the same synthetic corpus gives identical results for
readdir-glob, FileList and glob.sync. For a disappeared tracked name containing
metacharacters, C44 removes an untracked neighbour matching the pattern; M45 preserves
it by treating the path literally. Probes use isolated synthetic temporary directories.

A pre-existing upstream limitation was reproduced on C44 and the new graph: ExcelJS
4's optional streaming WorkbookReader may expose sharedString references depending
on ZIP entry order. The app uses the standard reader, which preserves values. Tests
cover streaming writer output with/without shared strings through the standard reader,
and the streaming reader with inline strings; they do not claim to fix the upstream
ordering issue. Finance/import/rollover/v16 round-trips exercise the app's actual APIs
with synthetic data. Final results and residual limits are recorded under C45 in PLAN.md.

### Correzione del test multipiattaforma / Cross-platform test correction

Il primo controllo remoto del commit `072a77f` ha rilevato un errore del test che
eseguiva il merge Universal su Windows: `mergeASARs` rimuove soltanto il prefisso
`/` dai nomi ASAR, mentre Windows restituisce `\\`. Universal costruisce bundle
macOS; questo test completo viene quindi eseguito soltanto su macOS. I test ASAR
del builder, dell'import CJS di electron-winstaller, dei matcher e dei consumatori
distribuiti restano attivi su entrambe le piattaforme. Non viene modificata o
aggirata la libreria upstream. Windows packaging/smoke rimangono gate obbligatori
prima di merge e release del nuovo commit.

The first remote check of commit `072a77f` caught a test running Universal merge
on Windows: `mergeASARs` strips only the `/` prefix from ASAR names, whereas Windows
returns `\\`. Universal builds macOS bundles, so this complete test now runs only
on macOS. Builder ASAR, electron-winstaller CJS imports, matchers and shipped
consumer tests remain enabled on both platforms. The upstream library is not
modified or bypassed. Windows packaging/smoke remain mandatory gates before merging
and releasing the new commit.


### Chiusura verificata / Verified closure — C45, v1.27.1

Il commit corretto `18584fd` è approvato e rilasciato: CI branch/main/tag e packaging
preliminare/finale macOS/Windows verdi, audit completo zero senza eccezioni.
macOS passa 436 test, Windows 435 con il solo merge Universal macOS escluso; entrambi
passano 11 test browser app e 7 landing. Ispezione e smoke unpacked/installato dei
pacchetti finali passano su macOS ARM64 e Windows x64; Mac Intel resta statico.
I sei pacchetti pubblicati, manifesto SHA-256, digest GitHub, tre ASAR, due DMG e
322 file in ciascun archivio sorgente sono verificati dopo il download. I dettagli
con link ai run e i limiti residui sono in [C45](../PLAN.md#c45--minimatch-legacy-e-audit-completo-senza-eccezioni).

Corrected commit `18584fd` is approved and released: branch/main/tag CI and
preliminary/final macOS/Windows packaging passed, with a fully clean audit and no
exceptions. macOS passes 436 tests; Windows passes 435, excluding only macOS Universal
merge. Both pass 11 app and 7 landing browser tests. Final package inspection and
unpacked/installed smoke passed on macOS ARM64 and Windows x64; Intel Mac remains
statically checked. Downloaded artifacts were verified: six packages, SHA-256
manifest, GitHub digests, three ASAR archives, two DMGs and all 322 files in each
source archive. C45 in PLAN.md records workflow links and residual limits.


## C46 — PR Dependabot #136–#140 / Grouped Dependabot update

Base: main bb731ae, checkpoint C45 18584fd verificati. Sorgente candidata 1.27.2;
schema v16 e Node di sviluppo 24 invariati. / Verified base: main bb731ae,
checkpoint C45 18584fd. Candidate source 1.27.2; schema v16/development Node 24 unchanged.

| PR | Dipendenza / Dependency | Prima / Before | Dopo / After |
|---|---|---|---|
| #136 | @types/node | 26.6.5 | 26.6.6 |
| #137 | concurrently | 10.0.5 | 10.0.6 |
| #138 | @vitest/coverage-v8 | 5.0.3 | 5.0.5 |
| peer #138 | vitest, @vitest/mocker, @vitest/spy | 5.0.3 | 5.0.5 |
| #139 | @testing-library/user-event | 14.6.7 | 14.6.8 |
| #140 | electron | 44.9.3 | 45.1.0 |

Il provider coverage richiede Vitest 5.0.5 esatto: aggiornati insieme e verificati
con test:coverage, non soltanto tramite npm test. Le sole altre variazioni di versione
sono richieste dalle nuove catene Vitest: magic-string 1.4.3→1.4.5, obug 2.2.1→3.0.0,
tinybench 6.2.1→6.2.2, tinyrainbow 3.1.1→3.2.0. Restano invariati dipendenze di
produzione e override C45, inclusi glob/minimatch corretti e temp locale auditabile.
Le PR #136–#139 erano basate su C44: sono state applicate le variazioni semantiche
al lockfile C45, senza reintrodurre vecchie catene o eccezioni. La vecchia CI Windows
fallita di #139 segnalava AUDIT_COMMAND_FAILED, dopo i test; l'audit del grafo combinato
è ricontrollato come parte dei gate ordinari.

The coverage provider requires exact Vitest 5.0.5: update them together and verify
actual test:coverage output. The only other version changes belong to the new
Vitest chains: magic-string 1.4.3→1.4.5, obug 2.2.1→3.0.0, tinybench 6.2.1→6.2.2,
tinyrainbow 3.1.1→3.2.0. Production dependencies and all C45 overrides are preserved,
including fixed matchers and auditable local temp. PRs #136–#139 were based on C44;
apply their semantic changes to C45's lockfile without restoring old chains or
exceptions. The old Windows failure on #139 was AUDIT_COMMAND_FAILED after tests;
check the combined graph through the ordinary full audit gate.

[Electron 45 release notes](https://releases.electronjs.org/release/v45.1.0) e
[breaking changes](https://www.electronjs.org/docs/latest/breaking-changes#breaking-api-changes-450)
verificati. La regressione del preload compilato non fornisce gli shim rimossi e
controlla il bridge; l'harness nativo locale usa soltanto profilo/dati sintetici.
Il main dell'app, i servizi finanziari, i workbook e le preferenze reali non vengono
caricati dalla prova. CI e pacchetti macOS/Windows del gruppo richiedono prima la
revisione/approvazione del commit locale; le PR bot si chiudono dopo integrazione.

Official Electron release/breaking notes were checked. The compiled-preload
regression provides none of the removed shims and checks the bridge; the native
local harness uses only synthetic data/profile and loads no app main, finance
services, workbook or real preferences. Combined macOS/Windows CI/packaging require
prior approval of the frozen local commit; bot PRs close after verified integration.


### C46 rilasciata / C46 released — v1.27.2

Commit a1f13ba approvato e rilasciato. CI e packaging preliminare/finale macOS/Windows
verdi; audit completo zero, 439 test macOS e 438 Windows più un test esclusivo macOS,
11 test browser app e 7 landing per piattaforma. Ispezione e smoke reali dell'app
unpacked/installata passano su macOS ARM64 e Windows x64, Intel Mac statico. Sei pacchetti,
manifesto SHA-256, digest GitHub, ASAR/DMG e 323 file per archivio sorgente verificati
dopo download. Le cinque PR si sono chiuse dopo integrazione; i loro aggiornamenti
sono riconciliati nel main e i commit originali sono recuperabili dal bundle verificato.
Nessuna PR o branch bot residuo. [C46 e run](../PLAN.md#c46--manutenzione-dependabot-136140).

Approved commit a1f13ba is released. macOS/Windows CI and preliminary/final packaging
passed: full audit zero, 439 macOS tests and 438 Windows tests plus one macOS-only test,
11 app and 7 landing browser checks per platform. Real unpacked/installed app inspection
and smoke passed on macOS ARM64/Windows x64; Intel Mac was statically checked. Six
packages, SHA-256 manifest, GitHub digests, ASAR/DMG and 323 source files per archive
were verified after download. Five PRs closed after integration; their changes are
reconciled on main and original commits remain recoverable from the verified bundle.
No bot PR or branch remains. PLAN.md C46 records workflow links and residual limits.


## Patch 1.27.3 — dopo il tag v1.27.2 / After tag v1.27.2

Base verificata: tag `v1.27.2` sul commit `a1f13ba`, main `e53a6dd`. La versione
sorgente diventa 1.27.3; schema v16 e Node di sviluppo 24 restano invariati.
Il tag e la release GitHub non fanno parte di questa preparazione.

| PR | Dipendenza / Dependency | Prima / Before | Dopo / After |
|---|---|---|---|
| #141 | eslint | 10.13.0 | 10.14.0 |
| #141 | globals | 17.13.0 | 17.14.0 |
| #144 | lucide-react | 1.57.0 | 1.68.0 |
| #145 | vitest, @vitest/mocker, @vitest/spy | 5.0.5 | 5.1.0 |
| #145 | @vitest/coverage-v8 risolto / resolved | 5.0.5 | 5.1.0 |
| #145 | @vitest/istanbul-lib-coverage, @vitest/istanbul-lib-report | 1.0.2 | 2.1.0 |
| #142 | electron | 45.1.0 | 45.2.3 |
| #146 | range dichiarato di @vitest/coverage-v8 | ^5.0.5 | ^5.1.0 |

#146 non cambia il tarball già risolto `coverage-v8-5.1.0`. Nessuna dipendenza di
produzione oltre Lucide, nessun override e nessuno schema workbook cambiano.

Verified base: tag `v1.27.2` at `a1f13ba`, main `e53a6dd`. Source version becomes
1.27.3; schema v16 and development Node 24 stay unchanged. This preparation does
not create the tag or the GitHub release. #146 leaves the resolved
`coverage-v8-5.1.0` tarball in place. No production dependency other than Lucide,
no override, and no workbook schema changes.

## Patch 1.27.4 — dipendenze #150–#155 senza Electron / without Electron

Base: main `2178fbfc`. Sorgente `1.27.4`; schema v16 e Electron 45.2.3 invariati.
Il tag e la release sono stati poi pubblicati sul commit `270254f1`. Stato **C**.

| PR | Dipendenza / Dependency | Prima / Before | Dopo / After |
|---|---|---|---|
| #150 | softprops/action-gh-release, pin SHA | 3.0.3 `efb35369` | 3.0.4 `8a0cd651` |
| #151 | @playwright/test, playwright, playwright-core | 1.64.1 | 1.65.1 |
| #152 | lucide-react | 1.68.0 | 1.77.0 |
| #154 | @testing-library/user-event | 14.6.8 | 14.6.13 |
| #155 | concurrently | 10.0.6 | 10.0.7 |

#153 (Electron) non è inclusa. L’audit resta a `schemaVersion` 1, senza eccezione.

Baseline: main `2178fbfc`. Source `1.27.4`; schema v16 and Electron 45.2.3 stay unchanged.
The tag and the GitHub release were later published on commit `270254f1`. Status **C**.
#153 (Electron) is not included. The audit stays at schemaVersion 1, with no exception.

## C47 — Electron 45.4.1, PR #153

Base: main `270254f1`, release pubblicata `v1.27.4`. Sorgente `1.27.5`. Stato **C**: il proprietario ha approvato la chiusura. Il branch è pubblicato nella PR #160; CI e packaging sono verdi. Il tag `milestone/C47` e la release `v1.27.5` non sono pubblicati. Il branch della PR #153 non è unito.

| Dipendenza / Dependency | Prima / Before | Dopo / After | Motivo / Reason |
|---|---|---|---|
| electron | `^45.2.3` risolto `45.2.3` | `45.4.1` esatto | Scelta del proprietario al posto di `45.3.0`. Runtime, quindi `+0.0.1`. |
| electron-builder | `^26.18.0` risolto `26.18.0` | invariato | Nessun peer che rifiuti 45.4.1; legge la versione installata. |
| @electron/get | override `^5.1.0` | invariato | Copre già il requisito `^5.0.0` di Electron 45.4.1. |
| @electron/asar, @electron/universal | override esistenti | invariati | Builder e audit, non l'ABI del runtime. |
| @electron/rebuild | transitivo `4.2.1` | invariato | Nessun modulo nativo dell'app da ricostruire. |

Runtime Electron: Node 24.22.2 → 24.22.3, Chromium 156.0.8078.80 → 156.0.8078.100.
Le note 45.3.0, 45.3.1, 45.3.2, 45.3.3, 45.3.4 e 45.4.1 non dichiarano breaking change di API.
La 45.3.1 revoca la fiducia negli intermedi RSA di eMudhra. La 45.4.1 riporta: «Backported fixes from upstream ANGLE, Chromium, Dawn, FFmpeg, PDFium and V8» ([electron/electron#55907](https://github.com/electron/electron/pull/55907)). CSP, IPC e flag Electron restano invariati. L'audit resta a `schemaVersion` 1, senza eccezione.

Baseline: main `270254f1`, published release `v1.27.4`. Source `1.27.5`. Status **C**: the owner approved closure. The branch is published as PR #160; CI and packaging are green. Tag `milestone/C47` and release `v1.27.5` are not published. PR #153's branch is not merged.
Electron's runtime moves from Node 24.22.2 / Chromium 156.0.8078.80 to Node 24.22.3 / Chromium 156.0.8078.100.
Notes for 45.3.0 through 45.4.1 declare no API break. 45.3.1 distrusts eMudhra's revoked RSA intermediates.
45.4.1 reports: “Backported fixes from upstream ANGLE, Chromium, Dawn, FFmpeg, PDFium and V8” ([electron/electron#55907](https://github.com/electron/electron/pull/55907)).
CSP, IPC, and Electron flags stay unchanged. The audit stays at schemaVersion 1, with no exception.

## Patch — Dependabot standard / standard Dependabot configuration

Il 23/11/2026 `.github/dependabot.yml` torna nel repository dopo la rimozione del 18/11/2026 (`7516bdb5`). Il file precedente, `70b2e335`, era settimanale. Quello nuovo è il modello mensile npm e GitHub Actions: gruppi `electron`, `runtime-minor-patch`, `dev-minor-patch` e `security`, cooldown, e major di Electron ignorate. `directory: "/"` non aggiunge una voce per `vendor/temp`. Versione `1.27.5` invariata; nessuna release. Gli alert e le security updates del repository non sono stati modificati.

On 23 November 2026 `.github/dependabot.yml` returns after the 18 November 2026 removal (`7516bdb5`). The previous file, `70b2e335`, was weekly. The new file is the monthly npm and GitHub Actions model: groups `electron`, `runtime-minor-patch`, `dev-minor-patch` and `security`, cooldown, and Electron majors ignored. `directory: "/"` adds no entry for `vendor/temp`. Version `1.27.5` is unchanged; there is no release. Repository alerts and security updates were not changed.

## Patch — dipendenze #162, con minimatch nel pacchetto / dependencies #162, with minimatch in the package

Base: main `8b87016`. Non è solo sviluppo. minimatch 11.0.8 e `@isaacs/nonrecursive-glob-match` 1.1.0 sono nell’albero di produzione `exceljs` → `archiver` → `readdir-glob` (stessa copia anche da `archiver-utils` → `glob`) e finiscono nel pacchetto. Non sono su percorsi chiamati: `src/` e `src/main` non usano minimatch, glob né archiver; ExcelJS usa archiver solo in `workbook-writer`, senza `.glob`; `archiver.glob()` non è invocato. Il codice incluso cambia; il comportamento dell’app no. Pubblicata come [PR #163](https://github.com/gloutchov/ContaMi/pull/163), approvata da Glauco il 23/11, in attesa della chiusura; nessuna release per scelta di Glauco (modifica senza effetti a runtime). Sorgente `1.27.5` invariata. Schema v16 invariato. Il branch del bot non è unito.

| Dipendenza / Dependency | Prima / Before | Dopo / After |
|---|---|---|
| @electron/asar | 4.3.1 (`minimatch` ^10.0.1) | 4.3.2 (`minimatch` ^11.0.1, `glob` ^14.0.2) |
| minimatch, copia unica / single copy | 11.0.3 | 11.0.8 |
| @isaacs/nonrecursive-glob-match | 1.0.3 | 1.1.0 |
| glob | 14.0.3 | 14.0.3 |
| @vitejs/plugin-react | 6.1.1 | 6.3.0 |
| vite | 8.3.5 | 8.3.8 |
| vitest, @vitest/coverage-v8, mocker, spy | 5.1.0 | 5.1.1 |
| eslint | 10.14.0 | 10.15.0 |
| eslint-plugin-react-refresh | 0.5.7 | 0.5.8 |
| typescript-eslint | 8.72.0 | 8.72.2 |
| jsdom | 30.1.2 | 30.1.3 |
| semver | 7.8.5 | 7.8.6 |

La CI di #162 fallisce nel probe `bounds amplification`, non nella creazione ASAR. In locale, 11.0.3 tronca otto gruppi `**/..` a 64 e 11.0.8 lancia `RangeError`. Il [changelog 11.0.8](https://github.com/isaacs/minimatch/blob/v11.0.8/changelog.md) e il [test upstream](https://github.com/isaacs/minimatch/blob/v11.0.8/test/preprocess-limits.ts) descrivono il confine usato dal probe: sei gruppi e budget 64 producono 64 pattern, budget 63 lancia. La [nota di `@electron/asar` 4.3.2](https://github.com/electron/asar/releases/tag/v4.3.2) dice «release updated glob and minimatch dependencies». Electron resta 45.4.1. L’audit resta a `schemaVersion` 1, senza eccezione.

Baseline: main `8b87016`. Not development-only. minimatch 11.0.8 and `@isaacs/nonrecursive-glob-match` 1.1.0 are in the production tree `exceljs` → `archiver` → `readdir-glob` (the same copy is also reached from `archiver-utils` → `glob`) and end up in the package. They are not on called paths: `src/` and `src/main` do not use minimatch, glob, or archiver; ExcelJS uses archiver only in `workbook-writer`, without `.glob`; `archiver.glob()` is never invoked. The included code changes; application behavior does not. Published as [PR #163](https://github.com/gloutchov/ContaMi/pull/163), approved by Glauco on 23 November, waiting for closure; no release by Glauco's choice (a change with no runtime effect). Source stays `1.27.5`. Schema v16 stays unchanged. The bot branch is not merged.

PR #162’s CI fails in the `bounds amplification` probe, not in ASAR creation. Locally, 11.0.3 truncates eight `**/..` groups to 64 and 11.0.8 throws `RangeError`. The [11.0.8 changelog](https://github.com/isaacs/minimatch/blob/v11.0.8/changelog.md) and the [upstream test](https://github.com/isaacs/minimatch/blob/v11.0.8/test/preprocess-limits.ts) describe the boundary the probe uses: six groups and a budget of 64 produce 64 patterns, and a budget of 63 throws. The [`@electron/asar` 4.3.2 note](https://github.com/electron/asar/releases/tag/v4.3.2) says “release updated glob and minimatch dependencies”. Electron stays 45.4.1. The audit stays at schemaVersion 1, with no exception.

## Patch — typescript-eslint, PR #164 / typescript-eslint patch, PR #164

Base: main `846cd86`; branch locale `patch/1.27.5-typescript-eslint-164`. La [PR #164](https://github.com/gloutchov/ContaMi/pull/164) propone typescript-eslint 8.73.0. Il lockfile locale è rigenerato con npm e conserva `ignore` 7.0.16 anziché il downgrade del bot a 7.0.14. L'unica differenza rispetto al lockfile della PR è questa conservazione.

| Pacchetti / Packages | Prima / Before | Dopo / After |
|---|---|---|
| typescript-eslint | 8.72.2 | 8.73.0 |
| @typescript-eslint/{eslint-plugin,parser,project-service,scope-manager,tsconfig-utils,type-utils,types,typescript-estree,utils,visitor-keys} | 8.72.2 | 8.73.0 |
| ignore, copia del plugin / plugin copy | 7.0.16 | 7.0.16, invariato / unchanged |

Tutte le undici voci aggiornate sono `dev: true`; ogni voce del grafo di produzione resta identica. Il peer opzionale `@typescript/native` non entra nel lockfile e il backend sperimentale descritto nelle [note 8.73.0](https://github.com/typescript-eslint/typescript-eslint/releases/tag/v8.73.0) non è attivato. Nessuna modifica a configurazione ESLint, override, allowlist degli script, policy audit, Electron 45.4.1 o schema v16. Versione sorgente 1.27.5 invariata, nessun tag o release. Il 24/11/2026 su Windows, Node 24.18.1 / npm 12.2.1, passano npm ci, baseline, lint, typecheck, 459 test con uno saltato riservato a macOS, build, documenti, CSP e audit completo zero senza eccezioni. Playwright, avvio reale, packaging e macOS nativo non eseguiti; esiti e limiti in PLAN.md. CI originale verde su macOS/Windows per `799ad4b`; il nuovo commit deve ancora essere controllato prima della pubblicazione.

Baseline: main `846cd86`; local branch `patch/1.27.5-typescript-eslint-164`. npm regenerates the lockfile for typescript-eslint 8.73.0 while retaining ignore 7.0.16 instead of the bot's 7.0.14 downgrade, the only difference from the PR lockfile. All eleven updated entries are development-only; every production entry remains identical. The optional native TypeScript peer is absent and the experimental backend is not enabled. ESLint configuration, overrides, install-script allowlist, audit policy, Electron 45.4.1 and schema v16 stay unchanged. Source version remains 1.27.5, with no tag or release. On 24 November 2026, Windows checks passed on Node 24.18.1 / npm 12.2.1: npm ci, Node baseline, lint, typecheck, 459 tests with one macOS-only test skipped, build, documents, CSP and a clean full audit without exceptions. Playwright, real-app startup, packaging and native macOS tests were not run; PLAN.md records results and limits. Original macOS/Windows CI is green for `799ad4b`; the new commit still requires review before publication.

## Patch 1.27.6 — Release cumulativa di manutenzione / Cumulative maintenance release

**Italiano — 24/11/2026.** La release [v1.27.6](https://github.com/gloutchov/ContaMi/releases/tag/v1.27.6) è pubblicata sul commit approvato `2bbf16affc6499e2dc164312ec5d1f9d8553a74e`, integrato dalla [PR #166](https://github.com/gloutchov/ContaMi/pull/166) nel merge main `5f621d463b52bfc50305430578c1094829f02bd4` con albero identico. È cumulativa rispetto a v1.27.5 e include #163/#165 e la configurazione #161; #162/#164 sono chiuse come sostituite. La patch di release cambia solo versione e documentazione: nessun nuovo aggiornamento del grafo npm, override o permesso.

| Componente / Component | In v1.27.5 | In v1.27.6 |
|---|---|---|
| minimatch, anche nel pacchetto / also packaged | 11.0.3 | 11.0.8 |
| @isaacs/nonrecursive-glob-match, anche nel pacchetto / also packaged | 1.0.3 | 1.1.0 |
| @electron/asar | 4.3.1 | 4.3.2 |
| Vite / @vitejs/plugin-react | 8.3.5 / 6.1.1 | 8.3.8 / 6.3.0 |
| Vitest / @vitest/coverage-v8 | 5.1.0 / 5.1.0 | 5.1.1 / 5.1.1 |
| ESLint / eslint-plugin-react-refresh | 10.14.0 / 0.5.7 | 10.15.0 / 0.5.8 |
| typescript-eslint e namespace / and namespace | 8.72.0 | 8.73.0 |
| jsdom / semver | 30.1.2 / 7.8.5 | 30.1.3 / 7.8.6 |

minimatch e il matcher sono nell'albero di produzione ExcelJS → Archiver → readdir-glob su percorsi glob non chiamati dall'app. Electron resta 45.4.1, schema v16 e policy audit senza eccezioni. I sei pacchetti distribuiti di v1.27.6 sono stati scaricati e verificati contro [SHA256SUMS.txt](https://github.com/gloutchov/ContaMi/releases/download/v1.27.6/SHA256SUMS.txt) e i digest GitHub. [Piano, gate e checksum finali](../PLAN.md#patch-1276--release-cumulativa-di-manutenzione).

**English — 24 November 2026.** Release [v1.27.6](https://github.com/gloutchov/ContaMi/releases/tag/v1.27.6) is published on owner-approved commit `2bbf16affc6499e2dc164312ec5d1f9d8553a74e`, integrated by PR #166 as main merge `5f621d463b52bfc50305430578c1094829f02bd4` with an identical tree. It collects #163/#165 and configuration #161 after v1.27.5; #162/#164 are closed as superseded. Only root version and documentation change, without further npm graph, override or permission changes. Packaged matcher dependencies remain on unused ExcelJS/Archiver glob paths. Electron 45.4.1, schema v16 and the exception-free audit policy stay unchanged. All six distributed packages were downloaded and matched to the official SHA256SUMS.txt and GitHub digests. The [plan](../PLAN.md#patch-1276--release-cumulativa-di-manutenzione) records final gates, checksums and limits.

**Chiusura verificata / Verified closure — 24/11/2026.** [CI main](https://github.com/gloutchov/ContaMi/actions/runs/45419139230), [CI tag](https://github.com/gloutchov/ContaMi/actions/runs/45419299126), [packaging preliminare](https://github.com/gloutchov/ContaMi/actions/runs/45416759954) e [Release finale](https://github.com/gloutchov/ContaMi/actions/runs/45419299149) verdi su macOS/Windows; audit completo zero senza eccezioni. Superati test, CSP, documenti, browser, ASAR e installazione/avvio/rimozione su macOS ARM64 e Windows x64. Il primo npm ci Windows finale è uscito con codice 1 senza diagnostica; retry dei soli job falliti superato sullo stesso commit. Nel download finale passano CRC dei 627 file dei tre ZIP, tre ASAR, versione, dipendenze, assenza di dati sensibili e confronto del codice con la build approvata normalizzando i soli terminatori di riga. SHA-256 dei sei pacchetti e del manifesto riconciliati con GitHub. Restano build non firmate e controllo Intel Mac statico. L'osservazione dello smoke rapido locale resta storica nel piano; il collaudo nativo completo passa senza errori e senza modifiche ai controlli IPC. / Main/tag CI, preliminary and final packaging passed on macOS/Windows with a clean full audit without exceptions. Tests, CSP, documents, browser flows, ASAR inspection and installation/startup/removal passed on macOS ARM64 and Windows x64. A Windows npm ci attempt exited 1 without diagnostics; failed-job retry passed on unchanged source. Final download checks passed all 627 ZIP file CRCs, three ASAR archives, version, dependencies, privacy and approved-code comparison after line-ending normalization. Six package checksums and the manifest match GitHub digests. Builds remain unsigned and Intel Mac verification is static. The local rapid-smoke observation remains in the plan; full native integration passes without errors or weaker IPC checks.
