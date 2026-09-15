# ContaMì — Guida importazione / Import guide

## Procedura / Workflow

1. Apri o crea il workbook di destinazione in ContaMì. / Open or create the destination workbook in ContaMì.
2. In **Impostazioni → Importazione dati / Settings → Data import**, genera il template della tipologia necessaria. / Generate the required template type.
3. Compila soltanto `Dati - Data` senza cambiare fogli, intestazioni o metadati. / Complete only `Dati - Data` without changing sheets, headers, or metadata.
4. Scegli una strategia duplicati e seleziona il file compilato. / Choose a duplicate strategy and select the completed file.
5. Controlla anteprima, conflitti ed errori. Nessuna scrittura è ancora avvenuta. / Review the preview, conflicts, and errors. No write has occurred.
6. Conferma soltanto quando il riepilogo è corretto. / Confirm only when the summary is correct.

## Strategie duplicati / Duplicate strategies

- **Ignora / Skip**: una corrispondenza esatta e univoca non viene riscritta; le nuove righe restano importabili.
- **Crea / Create**: anche una corrispondenza esatta produce un nuovo record con un nuovo UUID.
- **Aggiorna / Update**: una sola corrispondenza esatta viene aggiornata; più corrispondenze sono sempre rifiutate come ambigue.

Le strategie non usano similarità, correzioni automatiche o nomi “quasi uguali”. I riferimenti ai cataloghi sono risolti tramite UUID incorporato oppure nome esatto e univoco di un elemento attivo.

Strategies never use fuzzy similarity, automatic correction, or near-matching names. Catalog references resolve through the embedded UUID or the exact unique name of an active item.

Nei template v2 e v3, scegli una **Cassa** per le righe con metodo Contanti e un conto non-Cassa per gli altri metodi. Per un trasferimento interno neutro, `account` è la sorgente e `destination_account` la destinazione; devono essere distinti e nella stessa valuta. La v3 aggiunge `isin` facoltativo alle posizioni Investimenti e ai comparti pensione: il valore viene normalizzato in maiuscolo e deve superare la verifica locale della cifra di controllo.

In v2 and v3 templates, choose a **cash register** for rows using the Cash payment method and a non-cash account for other methods. For a neutral internal transfer, `account` is the source and `destination_account` is the destination; they must be distinct and use the same currency. Version 3 adds an optional `isin` to Investment positions and pension compartments: the value is normalized to uppercase and must pass the local check-digit validation.

## Errori e recupero / Errors and recovery

| Codice / Code | Significato / Meaning | Recupero / Recovery |
|---|---|---|
| `REQUIRED_VALUE` | Campo obbligatorio vuoto / Required field is blank | Compila la cella indicata / Fill the reported cell |
| `INVALID_DATE`, `INVALID_NUMBER`, `INVALID_ENUM` | Tipo o valore non ammesso / Invalid type or value | Usa una data reale, un numero non negativo o una voce del menu / Use a real date, non-negative number, or list value |
| `MISSING_REFERENCE` | Catalogo o chiave non trovata / Catalog or key not found | Seleziona un valore attivo o aggiungi prima la riga anagrafica / Select an active value or add the registry row first |
| `AMBIGUOUS_REFERENCE` | Più corrispondenze esatte / Multiple exact matches | Usa il valore con UUID o rendi il nome univoco / Use the UUID-bearing value or make the name unique |
| `DUPLICATE_KEY` | Chiave anagrafica ripetuta nel file / Registry key repeated in the file | Mantieni una sola riga anagrafica per chiave / Keep one registry row per key |
| `FORMULA_NOT_ALLOWED`, `ACTIVE_CONTENT` | Formula o contenuto attivo / Formula or active content | Sostituisci con valori passivi e rimuovi macro/link/oggetti / Replace with passive values and remove macros/links/objects |
| `INVALID_HEADERS`, `INVALID_TEMPLATE`, `UNSUPPORTED_TEMPLATE_VERSION` | Contratto non supportato / Unsupported contract | Genera un nuovo template dalla stessa versione dell’app / Generate a fresh template from the same app version |
| `ROW_LIMIT`, `TEXT_TOO_LONG` | Limite superato / Limit exceeded | Dividi il file o riduci il testo / Split the file or shorten the text |

Un errore globale di file indica struttura ZIP anomala, cifratura, macro, link esterni, fogli inattesi, formule, versione o intestazioni non supportate. Il workbook autorevole non viene modificato. Rigenera il template e copia soltanto valori passivi.

A global file error indicates an abnormal ZIP structure, encryption, macros, external links, unexpected sheets, formulas, unsupported version, or headers. The authoritative workbook is not changed. Generate a fresh template and copy passive values only.

## Atomicità / Atomicity

Il piano validato resta in memoria nel processo main e scade dopo 15 minuti. Il renderer non riceve percorsi o comandi. Alla conferma ContaMì verifica che il workbook non sia cambiato, applica tutti i comandi in memoria e usa un solo salvataggio con file temporaneo, rilettura, backup, sostituzione e rollback. Se una fase fallisce, nessuna riga del piano viene applicata.

The validated plan remains in main-process memory and expires after 15 minutes. The renderer receives neither paths nor commands. On confirmation, ContaMì checks that the workbook has not changed, applies every command in memory, and performs one save with a temporary file, re-read verification, backup, replacement, and rollback. If any step fails, no row from the plan is applied.
