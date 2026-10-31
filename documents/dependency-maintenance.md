# Manutenzione dipendenze / Dependency maintenance

Le sezioni C44 seguenti sono storiche; lo stato locale M45 è riportato in fondo. / The C44 sections below are historical; local M45 status follows at the end.

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
