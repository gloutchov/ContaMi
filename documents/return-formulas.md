# Rendimenti percentuali / Percentage returns

Questo documento descrive le formule usate da ContaMì `1.17.0`. I risultati sono indicatori di registrazione basati sui dati locali: non sono quotazioni di mercato né consulenza finanziaria.

This document describes the formulas used by ContaMì `1.17.0`. Results are record-keeping indicators derived from local data; they are neither market quotes nor financial advice.

## Investimenti e comparti / Investments and compartments

Il rendimento mensile usa Modified Dietz:

`R = (Vf − Vi − ΣF) / (Vi + Σ(w × F))`

- `Vi` / `Vf`: ultima valutazione confermata precedente disponibile e ultima valutazione confermata del mese corrente;
- `F`: Versamento positivo o Liquidazione negativa;
- `w = giorni tra il flusso e la valutazione finale / giorni tra le due valutazioni`;
- pianificazioni e Correzioni sono escluse;
- un denominatore non positivo/non finito o una valorizzazione finale assente produce un dato non disponibile, mai uno `0%` inventato.

Il primo Versamento che apre la posizione è `Vi`, non un flusso `F`: finanzia il capitale iniziale ma non genera rendimento. Il numeratore equivale quindi a `Vf − Vi − Versamenti successivi + Liquidazioni`; senza movimenti successivi la formula si riduce a `(Vf − Vi) / Vi`. Le date delle due osservazioni delimitano il periodo effettivo: non è necessario che coincidano con l’inizio o la fine del mese. Due osservazioni in mesi consecutivi producono un punto mensile coperto. Se manca la valutazione di un mese, quel mese resta senza punto e l’eventuale confronto successivo su più mesi è mostrato come intervallo parziale, senza interpolazione o annualizzazione; la linea collega comunque le due osservazioni disponibili e non inventa un valore per il mese mancante.

Monthly return uses Modified Dietz:

- `Vi` / `Vf`: the latest available previous confirmed valuation and the current month’s latest confirmed valuation;
- `F`: positive Contribution or negative Liquidation;
- `w = days from the cash flow to the ending valuation / days between the two valuations`;
- planned rows and Corrections are excluded;
- a non-positive/non-finite denominator or missing ending valuation produces an unavailable value, never an invented `0%`.

The first Contribution that opens a position is `Vi`, not a cash flow `F`: it funds opening capital but creates no return. The numerator is therefore equivalent to `Vf − Vi − later Contributions + Liquidations`; with no later movements, the formula reduces to `(Vf − Vi) / Vi`. The two observation dates delimit the actual period; they do not need to fall on the first or last day of a month. Observations in consecutive months produce a covered monthly point. If a month has no valuation, it keeps no point and any later comparison spanning multiple months is shown as partial, without interpolation or annualization; the line still connects the two available observations and invents no value for the missing month.

**Risultato complessivo / Overall result** nella scheda è una misura diversa: `controvalore corrente − (capitale iniziale + versamenti successivi − liquidazioni)`. La percentuale è tale differenza divisa per il capitale netto, solo quando questo è positivo. Per esempio, 1.000 € iniziali, una valutazione a 900 €, altri 1.000 € versati e un successivo controvalore a 1.900 € lasciano un risultato complessivo di −100 € (−5% del capitale netto); il secondo periodo ha invece rendimento Modified Dietz pari a 0% se il valore è cambiato soltanto per il nuovo versamento. Un rendimento del solo periodo può essere positivo mentre il risultato complessivo rimane negativo.

**Overall result** on the position card is a different measure: `current countervalue − (initial capital + later contributions − liquidations)`. Its percentage divides that difference by net capital only when net capital is positive. For example, an initial €1,000, a €900 valuation, another €1,000 contribution, and a later €1,900 countervalue leave an overall result of −€100 (−5% of net capital); the second period has a 0% Modified Dietz return if the value changed only by the contribution. A period alone can be positive while the overall result remains negative.

Un anno con copertura mensile completa collega geometricamente i mesi: `(Π(1 + Rm)) − 1`. Un periodo iniziato o terminato durante l’anno è parziale. Quando restano soltanto consuntivi annuali consecutivi, ContaMì usa il valore di chiusura dell’anno precedente come apertura e quello dell’anno corrente come chiusura, mostrando una **stima** Original Dietz con peso `0,5` sui flussi. Nell’anno di apertura il primo Versamento disponibile viene invece riclassificato come capitale iniziale con peso pieno; se resta soltanto un consuntivo aggregato, il totale Versamenti di quel primo anno è la migliore base iniziale ricostruibile e il risultato rimane etichettato come stima. La stima viene derivata in memoria anche per i workbook migrati e non riscrive retroattivamente lo storico; un anno privo sia di chiusura precedente sia di capitale iniziale ricostruibile viene omesso. Questa distinzione segue il principio GIPS di valutare i portafogli almeno mensilmente e ponderare i flussi esterni per il tempo investito: [GIPS Standards for Asset Owners](https://www.cfainstitute.org/-/media/documents/code/gips/2020-gips-standards-asset-owners.pdf) e [GIPS Standards Handbook](https://www.gipsstandards.org/standards/gips-standards-for-firms/gips-standards-handbook-for-firms/).

A year with complete monthly coverage geometrically links its months: `(Π(1 + Rm)) − 1`. A period starting or ending during the year is partial. When only consecutive annual summaries remain, ContaMì uses the prior year’s closing value as the opening and the current year’s closing value as the ending, showing an **estimated** Original Dietz result with a `0.5` cash-flow weight. In an opening year, the first available Contribution is instead reclassified as full-weight opening capital; when only an aggregate summary survives, that first year’s total Contributions are the best reconstructible opening base and the result remains labelled as an estimate. The estimate is derived in memory for migrated workbooks too and does not retroactively rewrite history; a year with neither a prior closing value nor reconstructible opening capital is omitted.

Per gruppi, pensioni-raccoglitore e confronto globale Titoli/Fondi/Fogli della pagina Investimenti, valori e flussi delle posizioni finali applicabili a ciascun periodo vengono sommati prima di applicare la formula. Le percentuali dei figli non sono sommate o mediate. Un insieme con valute diverse non produce un aggregato senza tassi di conversione.

For groups, pension collectors, and the Investments page’s global Securities/Funds/Savings plans comparison, values and flows from leaf positions applicable to each period are summed before applying the formula. Child percentages are never added or arithmetically averaged. A mixed-currency set produces no aggregate without conversion rates.

## Immobili in affitto / Rental properties

Il rendimento locativo netto mensile, non annualizzato, è:

`R = (affitti confermati di competenza − spese immobiliari confermate) / valore commerciale di riferimento`

Le entrate usano `dueDate` quando presente, le spese la propria data. I movimenti pianificati sono esclusi. Il rendimento annuo usa entrate e spese dell’anno e il relativo valore di chiusura. La percentuale è identica usando importi e valore interi oppure applicando a entrambi la stessa quota di proprietà. Il concetto è coerente con la definizione di rental yield come reddito da locazione in rapporto al valore del bene, qui resa netta sottraendo le spese confermate: [OECD Economic Survey: India 2019](https://www.oecd.org/en/publications/oecd-economic-surveys-india-2019_554c1c22-en/full-report/component-6.html).

Un canone incassato dopo il passaggio d’anno viene attribuito al consuntivo dell’anno di competenza e tale riallineamento viene conservato al rollover successivo usando i campi già presenti; non sono salvate percentuali derivate.

The non-annualized monthly net rental yield is:

`R = (confirmed rent income for the due period − confirmed property expenses) / reference commercial value`

Income uses `dueDate` when present; expenses use their own date. Planned movements are excluded. Annual yield uses the year’s income and expenses and its closing value. The percentage is identical whether full amounts/value are used or the same ownership share is applied to both.

Rent received after year rollover is assigned to the annual summary for its due year, and that reconciliation is retained at the next rollover using existing fields; no derived percentages are stored.

## Copertura e interfaccia / Coverage and interface

- Una lacuna nel grafico mensile significa copertura insufficiente, non rendimento zero.
- La linea continua attraverso una lacuna collega soltanto i punti calcolati ai lati; non assegna alcun valore al periodo mancante.
- La linea tratteggiata **Media** è la media aritmetica dei soli rendimenti visibili e disponibili; è un riferimento grafico, non un rendimento composto o annualizzato.
- **stima / estimate** identifica dati annuali senza date dei singoli flussi.
- Il tooltip, collocato sopra l’area tracciata, espone l’intervallo osservato e i componenti numerici usati dalla formula senza coprire i punti adiacenti.
- Nell’anno solare di apertura, le card di investimenti e comparti mostrano la serie mensile; dagli anni successivi mostrano quella annuale. Il dettaglio conserva sempre la serie mensile.
- I punti mensili restano trasformazioni pure della `FinanceData` già validata. Al rollover, il workbook v11 conserva in `Investment History` il rendimento annuale già calcolato, metodo, copertura, stato parziale e data dell’osservazione finale; la migrazione v10→v11 lascia assenti i risultati storici non ricostruibili. Non vengono richieste quotazioni.

- A gap in the monthly chart means insufficient coverage, not a zero return.
- The continuous line across a gap connects only the calculated points on either side; it assigns no value to the missing period.
- The dashed **Average** line is the arithmetic mean of visible, available returns only; it is a visual reference, not a compounded or annualized return.
- **stima / estimate** identifies annual data with no individual cash-flow dates.
- The tooltip sits above the plot and exposes the observed interval and numeric formula components without covering adjacent points.
- During the opening calendar year, investment and compartment cards show the monthly series; from later years they show the annual series. Details always retain the monthly series.
- Monthly points remain pure transformations of already validated `FinanceData`. At rollover, the v11 workbook stores the calculated annual return, method, coverage, partial-period status, and ending-observation date in `Investment History`; v10→v11 migration leaves non-reconstructible historical results absent. No quotes are requested.
