# ContaMì — Avvio rapido desktop / Desktop quick start

## Italiano

**Requisiti:** macOS 13+ (Apple Silicon o Intel) oppure Windows x64. ContaMì non richiede Excel; Numbers serve soltanto per la copia `.numbers` facoltativa. Per macOS 12 è documentata la precedente release `v1.22.2`.

1. Scarica dalla pagina [Releases](https://github.com/gloutchov/Contami/releases) il DMG o l'installer adatto e `SHA256SUMS.txt`. Verifica il checksum; per i possibili avvisi delle build non firmate segui il [manuale](ISTRUZIONI.md#2-requisiti-e-installazione).
2. Apri ContaMì e scegli **Crea nuovo foglio** oppure **Apri foglio esistente**. `.xlsx` è la scelta portabile; su macOS puoi scegliere Numbers se installato. Il file scelto è la fonte autorevole dei dati.
3. In **Impostazioni**, crea almeno un **Conto**. Se usi contanti, crea anche una **Cassa**; il conto di alimentazione predefinito è solo un suggerimento per i trasferimenti.
4. Registra entrate e uscite in **Transazioni**. Un movimento collegato a un immobile, un investimento o un comparto pensione compare anche nella vista pertinente. I filtri non cambiano i dati salvati.
5. Aggiungi, secondo le tue esigenze, **Immobili**, **Automobile**, **Investimenti** e **Pensione integrativa**. La pensione è un fondo raccoglitore con comparti: inserisci versamenti, liquidazioni e valutazioni nei comparti, senza duplicarli nel fondo.
6. Usa **Ricorrenze** per le scadenze e **Spese condivise** per gli importi ripartiti. **Cambia tariffa** modifica solo le scadenze pianificate dalla data scelta; le operazioni confermate restano nello storico.
7. Controlla valori e rendimenti nelle schede. Il risultato complessivo è distinto dal rendimento del periodo; una valutazione mancante resta una lacuna e le Correzioni non diventano rendimento.

### Stampare o salvare un report

- Da **Immobili**, apri il dettaglio e scegli **Report immobile**.
- Da **Investimenti**, scegli **Report investimenti** per tutte le posizioni non pensionistiche oppure apri il dettaglio di una posizione.
- Da **Pensione integrativa**, scegli **Report pensione integrativa** per tutte le pensioni, da un fondo per i comparti attivi o da un comparto per quella posizione.

Scegli **Anno corrente** o **Intera storia**, poi **Stampa** o **Salva PDF**. La generazione è locale e non modifica il workbook. Nei report finanziari le valute restano separate; i PDF contengono dati personali e vanno custoditi come il foglio.

A fine anno usa **Chiudi anno** e scegli il nuovo file: il precedente resta intatto. I salvataggi usano backup in `.contami-backups` e bloccano modifiche esterne concorrenti. Per dettagli e recupero consulta [ISTRUZIONI.md](ISTRUZIONI.md).

## English

**Requirements:** macOS 13+ (Apple Silicon or Intel) or Windows x64. Excel is not required; Numbers is needed only for the optional `.numbers` copy. The earlier `v1.22.2` release is documented for macOS 12.

1. Download the matching DMG or installer and `SHA256SUMS.txt` from [Releases](https://github.com/gloutchov/Contami/releases). Verify the checksum; follow the [manual](INSTRUCTIONS.md#2-requirements-and-installation) for possible unsigned-build warnings.
2. Open ContaMì and choose **Create new workbook** or **Open existing workbook**. `.xlsx` is portable; on macOS you can choose Numbers if installed. The selected file is the authoritative data source.
3. Under **Settings**, add at least one **Account**. If you use cash, add a **Cash register**; its default funding account is only a transfer suggestion.
4. Record income and expenses under **Transactions**. A movement linked to a property, investment, or pension compartment also appears in the relevant view. Filters do not change saved data.
5. Add **Properties**, **Vehicles**, **Investments**, and **Private Pension** as needed. A pension collector contains compartments: enter contributions, withdrawals, and valuations in the compartments without duplicating them in the collector.
6. Use **Recurring items** for schedules and **Shared expenses** for split amounts. **Change rate** affects only planned occurrences from the selected date; confirmed records remain in history.
7. Review values and returns on the cards. Overall result differs from period return; a missing valuation remains a gap, and Corrections do not become return.

### Print or save a report

- Under **Properties**, open details and choose **Property report**.
- Under **Investments**, choose **Investment report** for all non-pension positions or open one position's details.
- Under **Private Pension**, choose **Private pension report** for all pensions, from a collector for its active compartments, or from a compartment for that position.

Choose **Current year** or **Full history**, then **Print** or **Save PDF**. Generation is local and does not change the workbook. Financial reports keep currencies separate; PDFs contain personal data and deserve the same protection as the workbook.

At year-end, use **Close year** and select a new file: the old one remains intact. Saves keep backups in `.contami-backups` and block conflicting external edits. See [INSTRUCTIONS.md](INSTRUCTIONS.md) for details and recovery.
