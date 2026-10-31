# M44 — manutenzione dipendenze / dependency maintenance

## Ambito e provenienza / Scope and provenance

Verifica del 31 ottobre 2026 su Node.js 24.18.1 / npm 11.16.0. Base applicativa C43
`1890b7ef5b1477798cd3ebe7de8d9feb4b56d0ef`; versione 1.27.0 e schema workbook v16
invariati. M44 non modifica codice applicativo, IPC, rete o dati finanziari e non
pubblica una release. Le verifiche remote dei pacchetti precedono la chiusura C44.

Checked on 31 October 2026 with Node.js 24.18.1 / npm 11.16.0 against application
baseline C43 above. Application version 1.27.0 and workbook schema v16 are unchanged.
M44 changes no application code, IPC, network access or financial data, and produces
no release. Remote package validation remains required before closing C44.

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

Esiti e gate ancora pendenti sono registrati nella voce M44 di [PLAN.md](../PLAN.md).
Nessun workbook privato è usato; gli smoke nativi che possono leggere le impostazioni
reali sono riservati ai runner CI effimeri.

Results and remaining gates are recorded under M44 in [PLAN.md](../PLAN.md). No private
workbook is used; native smoke tests that may read real settings are reserved for
ephemeral CI runners.
