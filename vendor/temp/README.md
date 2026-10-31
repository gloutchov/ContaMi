# temp 0.9.4 — local build adaptation / adattamento locale per la build

This is the MIT-licensed `temp` 0.9.4 source from the official npm tarball recorded
in `UPSTREAM.json`. Its original package name and version are preserved. It is used
only by `electron-winstaller` in the development/packaging graph.

Questa copia deriva dal tarball npm ufficiale di `temp` 0.9.4, licenza MIT, con
provenienza e integrità in `UPSTREAM.json`. Nome e versione originali sono conservati.
È usata solo da `electron-winstaller` nella catena di sviluppo/packaging.

The local patch replaces the `rimraf` dependency with Node 24's `fs.rm` / `fs.rmSync`
for paths already tracked by temp. Paths are literal; no glob expansion occurs,
including when a tracked path has already disappeared. Recursive/force cleanup,
callback/synchronous APIs, exit cleanup and the existing retry budget are preserved.
Upstream dev-test metadata is omitted; tests live in the parent repository.

La patch sostituisce `rimraf` con `fs.rm` / `fs.rmSync` di Node 24 sui percorsi già
tracciati da temp. I percorsi restano letterali, anche quando sono già scomparsi:
nessuna espansione glob. Sono conservati pulizia ricorsiva/force, callback, API
sincrona, pulizia all'uscita e budget dei tentativi. I metadati dei soli test upstream
sono omessi; le regressioni sono nel repository principale.

`.npmrc` enables `install-links` so npm packs this local dependency instead of
symlinking it. npm audit therefore still sees `temp@0.9.4`; future advisories against
that version are not hidden by a renamed package or a fabricated version. Revisit
this copy when upstream removes the obsolete dependency. No installed package is
patched in place and no audit exception is used.

`.npmrc` abilita `install-links`: npm installa una copia impacchettata, evitando il
symlink che npm audit escluderebbe. L'audit vede ancora `temp@0.9.4`: advisory future
non vengono nascoste tramite rinomina o versione inventata. Rivalutare questa copia
quando upstream elimina la dipendenza obsoleta. Nessuna patch in-place ai pacchetti
installati e nessuna eccezione audit.
