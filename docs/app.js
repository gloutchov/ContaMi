/* global HTMLImageElement, HTMLVideoElement, IntersectionObserver, document, navigator, window */

const translations = {
  en: {
    page: {
      title: "ContaMì — Your finances, truly yours",
      description: "ContaMì is a free, open-source, local-first desktop app for managing personal finances in a durable spreadsheet.",
    },
    accessibility: { skip: "Skip to content" },
    nav: { label: "Primary navigation", overview: "Overview", features: "Features", technical: "Technical", download: "Download" },
    language: { label: "Language" },
    hero: {
      eyebrow: "Local-first desktop app",
      title: "Your finances,",
      titleAccent: "truly yours.",
      lead: "Understand and manage your financial life without accounts, cloud services or telemetry. Your workbook stays on your computer.",
    },
    actions: { download: "Download latest release", github: "View on GitHub", manual: "Read the user guide", home: "Glauco Silvestri homepage" },
    facts: { priceLabel: "Price", priceValue: "Free", platformLabel: "Platforms", platformValue: "macOS · Windows", licenseLabel: "License" },
    media: {
      overviewAlt: "ContaMì overview in light theme",
      heroCaption: "A complete picture, from daily cash flow to long-term wealth.",
      demoHint: "Use the controls to play the demonstration.",
      overviewDemo: "Overview demonstration",
      transactionsDemo: "Transactions demonstration",
      propertiesDemo: "Properties demonstration",
      vehiclesDemo: "Vehicles demonstration",
      investmentsDemo: "Investments demonstration",
      pensionDemo: "Private pension demonstration",
      recurringDemo: "Recurring items demonstration",
      sharedDemo: "Shared expenses demonstration",
      settingsDemo: "Settings and import demonstration",
    },
    trust: {
      label: "Product principles",
      localTitle: "Local by design", localBody: "Your financial data stays in the workbook you choose.",
      openTitle: "Open source", openBody: "Transparent, auditable and released under Apache 2.0.",
      freeTitle: "Free to use", freeBody: "No subscriptions, paid accounts or hidden services.",
      privateTitle: "Private", privateBody: "No cloud, advertising, analytics or telemetry.",
    },
    overview: {
      eyebrow: "A calmer financial picture",
      title: "Everything you need. Nothing between you and your data.",
      body1: "ContaMì brings everyday movements, property, vehicles, investments, pensions, recurring items and shared expenses into one coherent view.",
      body2: "The spreadsheet remains the durable source of truth: portable, readable and recoverable without a proprietary cloud.",
    },
    features: {
      eyebrow: "Feature chapters", title: "One financial story, told from every angle.",
      intro: "Each area shares the same validated data, so connected movements appear once and remain consistent everywhere.",
    },
    featureNames: {
      overview: "Overview", transactions: "Transactions", properties: "Properties", vehicles: "Vehicles", investments: "Investments",
      pension: "Private pension", recurring: "Recurring items", shared: "Shared expenses", settings: "Settings & import",
    },
    chapters: {
      overview: { eyebrow: "Your starting point", title: "A complete overview, without losing the details.", body: "Net worth, liquidity, cash registers, properties, investments, pensions and recurring commitments stay visible and reconcilable." },
      transactions: { eyebrow: "Daily clarity", title: "Follow every movement and every balance.", body: "Searchable transactions, filters, accounts and cash registers reveal what happened, when it happened and how it affects liquidity." },
      properties: { eyebrow: "Homes and income", title: "Properties, utilities, taxes and rent in context.", body: "Track valuations, costs, consumption, configurable taxes and rent payments with separate due periods and actual receipt dates." },
      vehicles: { eyebrow: "Every kilometre counts", title: "Understand the real cost of your vehicles.", body: "Fuel, maintenance, insurance, taxes, tyres and optional financing combine into a clear cost history and vehicle comparison." },
      investments: { eyebrow: "Long-term perspective", title: "Capital invested and current value, side by side.", body: "Contributions, liquidations, valuations and recurring plans remain connected to cash movements without inflating income or expenses." },
      pension: { eyebrow: "A future without double counting", title: "Private pensions and compartments stay distinct.", body: "Collector funds, individual compartments, contributions and current values are aggregated once while preserving each position’s history." },
      recurring: { eyebrow: "Plan ahead", title: "Recurring income, expenses and instalments that respect history.", body: "Schedule future movements, confirm them safely and change future rates without rewriting operations already completed." },
      shared: { eyebrow: "Clear balances together", title: "Shared expenses without separate calculations.", body: "Participants, personal shares, payer and reimbursement status remain linked to the original transaction and monthly totals." },
      settings: { eyebrow: "Your setup, portable", title: "Configure, import and keep control of the workbook.", body: "Manage accounts, cash registers and catalogues, generate guided Excel templates and import them with preview, validation and backup." },
    },
    technical: {
      eyebrow: "Under the hood", title: "Built to stay understandable, recoverable and yours.",
      workbookTitle: "Portable workbook", workbookBody: "A readable .xlsx file is the canonical source. macOS can optionally keep a Numbers mirror.",
      savesTitle: "Verified saves", savesBody: "Temporary write, re-read verification, recoverable backups and protection from external edits.",
      securityTitle: "Hardened desktop app", securityBody: "Sandboxed Electron renderer, validated IPC, blocked navigation and no network during normal use.",
      importTitle: "Guided import", importBody: "Versioned Excel templates, security preflight, row-level preview and atomic confirmation.",
      interfaceTitle: "Bilingual and adaptive", interfaceBody: "Italian and English, system-aware light and dark themes, keyboard-friendly controls.",
      platformTitle: "Cross-platform releases", platformBody: "Packages for Windows x64 and macOS on Intel and Apple Silicon, with SHA-256 checksums.",
    },
    download: {
      eyebrow: "Free · open source · local-first", title: "Take back control of your finances.",
      body: "Download the latest release for macOS or Windows, read the user guide, or inspect every line of code on GitHub.",
    },
    footer: { license: "Released under the Apache 2.0 License" },
  },
  it: {
    page: {
      title: "ContaMì — Le tue finanze, davvero tue",
      description: "ContaMì è un’app desktop gratuita, open source e local-first per gestire le finanze personali in un foglio di calcolo durevole.",
    },
    accessibility: { skip: "Vai al contenuto" },
    nav: { label: "Navigazione principale", overview: "Panoramica", features: "Funzionalità", technical: "Tecnologia", download: "Download" },
    language: { label: "Lingua" },
    hero: {
      eyebrow: "App desktop local-first",
      title: "Le tue finanze,",
      titleAccent: "davvero tue.",
      lead: "Comprendi e gestisci la tua vita finanziaria senza account, servizi cloud o telemetria. Il workbook resta sul tuo computer.",
    },
    actions: { download: "Scarica l’ultima release", github: "Esplora su GitHub", manual: "Leggi le istruzioni", home: "Sito principale di Glauco Silvestri" },
    facts: { priceLabel: "Prezzo", priceValue: "Gratis", platformLabel: "Piattaforme", platformValue: "macOS · Windows", licenseLabel: "Licenza" },
    media: {
      overviewAlt: "Panoramica di ContaMì in tema chiaro",
      heroCaption: "Un quadro completo, dai movimenti quotidiani al patrimonio di lungo periodo.",
      demoHint: "Usa i controlli per riprodurre la dimostrazione.",
      overviewDemo: "Dimostrazione della Panoramica",
      transactionsDemo: "Dimostrazione delle Transazioni",
      propertiesDemo: "Dimostrazione degli Immobili",
      vehiclesDemo: "Dimostrazione dell’Automobile",
      investmentsDemo: "Dimostrazione degli Investimenti",
      pensionDemo: "Dimostrazione della Pensione Integrativa",
      recurringDemo: "Dimostrazione delle Ricorrenze",
      sharedDemo: "Dimostrazione delle Spese condivise",
      settingsDemo: "Dimostrazione di Impostazioni e importazione",
    },
    trust: {
      label: "Principi del prodotto",
      localTitle: "Locale per progetto", localBody: "I dati finanziari restano nel workbook che scegli.",
      openTitle: "Open source", openBody: "Trasparente, verificabile e rilasciata con licenza Apache 2.0.",
      freeTitle: "Gratis da usare", freeBody: "Nessun abbonamento, account a pagamento o servizio nascosto.",
      privateTitle: "Privata", privateBody: "Nessun cloud, pubblicità, analytics o telemetria.",
    },
    overview: {
      eyebrow: "Un quadro finanziario più sereno",
      title: "Tutto ciò che serve. Nulla tra te e i tuoi dati.",
      body1: "ContaMì riunisce movimenti quotidiani, immobili, automobile, investimenti, pensioni, ricorrenze e spese condivise in un quadro coerente.",
      body2: "Il foglio di calcolo resta la fonte dati durevole: portatile, leggibile e recuperabile senza dipendere da un cloud proprietario.",
    },
    features: {
      eyebrow: "Capitoli funzionali", title: "Un’unica storia finanziaria, vista da ogni prospettiva.",
      intro: "Ogni area condivide gli stessi dati validati: i movimenti collegati compaiono una sola volta e restano coerenti ovunque.",
    },
    featureNames: {
      overview: "Panoramica", transactions: "Transazioni", properties: "Immobili", vehicles: "Automobile", investments: "Investimenti",
      pension: "Pensione Integrativa", recurring: "Ricorrenze", shared: "Spese condivise", settings: "Impostazioni e import",
    },
    chapters: {
      overview: { eyebrow: "Il punto di partenza", title: "Un quadro completo, senza perdere i dettagli.", body: "Patrimonio netto, liquidità, Casse, immobili, investimenti, pensioni e impegni periodici restano visibili e riconciliabili." },
      transactions: { eyebrow: "Chiarezza quotidiana", title: "Segui ogni movimento e ogni saldo.", body: "Transazioni ricercabili, filtri, conti e Casse mostrano cosa è successo, quando e con quale effetto sulla liquidità." },
      properties: { eyebrow: "Casa e reddito", title: "Immobili, utenze, tasse e affitti nel loro contesto.", body: "Segui valutazioni, costi, consumi, tasse configurabili e affitti separando competenza della rata e data effettiva di incasso." },
      vehicles: { eyebrow: "Ogni chilometro conta", title: "Comprendi il costo reale dell’Automobile.", body: "Carburante, manutenzione, assicurazione, bollo, pneumatici e finanziamento facoltativo formano uno storico chiaro e confrontabile." },
      investments: { eyebrow: "Prospettiva di lungo periodo", title: "Capitale investito e controvalore, fianco a fianco.", body: "Versamenti, liquidazioni, valutazioni e piani periodici restano collegati ai flussi di cassa senza gonfiare entrate o uscite." },
      pension: { eyebrow: "Il futuro senza doppi conteggi", title: "Pensioni e comparti restano distinti.", body: "Fondi raccoglitori, singoli comparti, versamenti e controvalori vengono aggregati una volta sola conservando lo storico di ogni posizione." },
      recurring: { eyebrow: "Pianifica in anticipo", title: "Entrate, uscite e rate ricorrenti che rispettano lo storico.", body: "Programma i movimenti futuri, confermali in sicurezza e cambia le tariffe future senza riscrivere le operazioni già completate." },
      shared: { eyebrow: "Saldi chiari, insieme", title: "Spese condivise senza calcoli separati.", body: "Partecipanti, quote personali, pagante e stato del rimborso restano collegati alla Transazione originale e ai totali mensili." },
      settings: { eyebrow: "La tua configurazione, portatile", title: "Configura, importa e mantieni il controllo del workbook.", body: "Gestisci conti, Casse e cataloghi, genera template Excel guidati e importali con anteprima, validazione e backup." },
    },
    technical: {
      eyebrow: "Sotto il cofano", title: "Costruita per restare comprensibile, recuperabile e tua.",
      workbookTitle: "Workbook portatile", workbookBody: "Un file .xlsx leggibile è la fonte canonica. Su macOS può essere mantenuta anche una copia Numbers.",
      savesTitle: "Salvataggi verificati", savesBody: "Scrittura temporanea, verifica di rilettura, backup recuperabili e protezione dalle modifiche esterne.",
      securityTitle: "App desktop protetta", securityBody: "Renderer Electron in sandbox, IPC validato, navigazione bloccata e nessuna rete durante l’uso normale.",
      importTitle: "Importazione guidata", importBody: "Template Excel versionati, preflight di sicurezza, anteprima per riga e conferma atomica.",
      interfaceTitle: "Bilingue e adattiva", interfaceBody: "Italiano e inglese, temi chiaro e scuro legati al sistema, controlli accessibili da tastiera.",
      platformTitle: "Release multipiattaforma", platformBody: "Pacchetti Windows x64 e macOS Intel/Apple Silicon, accompagnati da checksum SHA-256.",
    },
    download: {
      eyebrow: "Gratis · open source · local-first", title: "Riprendi il controllo delle tue finanze.",
      body: "Scarica l’ultima release per macOS o Windows, leggi le istruzioni oppure controlla ogni riga di codice su GitHub.",
    },
    footer: { license: "Rilasciata con licenza Apache 2.0" },
  },
};

const LANGUAGE_STORAGE_KEY = "contami-landing-language";
const MANUAL_HREFS = {
  en: "https://github.com/gloutchov/Contami/blob/main/INSTRUCTIONS.md",
  it: "https://github.com/gloutchov/Contami/blob/main/ISTRUZIONI.md",
};
const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
let currentLanguage = "en";

function readSavedLanguage() {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return saved === "it" || saved === "en" ? saved : null;
  } catch {
    return null;
  }
}

function saveLanguage(language) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // The language switch still works when storage is unavailable.
  }
}

function getValue(dictionary, path) {
  return path.split(".").reduce((value, key) => value?.[key], dictionary);
}

function mediaPaths(key, language = currentLanguage) {
  const englishSuffix = language === "en" ? "_english" : "";
  const theme = themeQuery.matches ? "blk" : "whi";
  return {
    poster: `./assets/${key}_${theme}${englishSuffix}.png`,
    video: `./assets/${key}${englishSuffix}.mp4`,
  };
}

function updateMedia() {
  document.querySelectorAll("[data-media-key]").forEach((element) => {
    const paths = mediaPaths(element.dataset.mediaKey);
    if (element instanceof HTMLVideoElement) {
      const wasPlaying = !element.paused;
      element.pause();
      element.poster = paths.poster;
      if (element.dataset.loadedLanguage !== currentLanguage) {
        element.src = paths.video;
        element.dataset.loadedLanguage = currentLanguage;
        element.load();
      }
      if (wasPlaying && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        element.play().catch(() => undefined);
      }
    } else if (element instanceof HTMLImageElement) {
      element.src = paths.poster;
    }
  });
}

function applyLanguage(language, persist = false) {
  currentLanguage = language === "it" ? "it" : "en";
  const dictionary = translations[currentLanguage];
  document.documentElement.lang = currentLanguage;
  document.title = dictionary.page.title;
  document.querySelector("#meta-description")?.setAttribute("content", dictionary.page.description);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", dictionary.page.title);
  document.querySelector('meta[property="og:description"]')?.setAttribute("content", dictionary.page.description);

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = getValue(dictionary, element.dataset.i18n);
    if (typeof value === "string") element.textContent = value;
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    const value = getValue(dictionary, element.dataset.i18nAria);
    if (typeof value === "string") element.setAttribute("aria-label", value);
  });
  document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
    const value = getValue(dictionary, element.dataset.i18nAlt);
    if (typeof value === "string") element.setAttribute("alt", value);
  });
  document.querySelectorAll("[data-language]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.language === currentLanguage));
  });
  document.querySelectorAll("[data-manual-link]").forEach((link) => {
    link.setAttribute("href", MANUAL_HREFS[currentLanguage]);
  });
  if (persist) saveLanguage(currentLanguage);
  updateMedia();
}

document.querySelectorAll("[data-language]").forEach((button) => {
  button.addEventListener("click", () => applyLanguage(button.dataset.language, true));
});

document.querySelectorAll("video").forEach((video) => {
  video.addEventListener("play", () => {
    document.querySelectorAll("video").forEach((other) => {
      if (other !== video) other.pause();
    });
  });
});

if (typeof themeQuery.addEventListener === "function") {
  themeQuery.addEventListener("change", updateMedia);
} else {
  themeQuery.addListener(updateMedia);
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduceMotion || !("IntersectionObserver" in window)) {
  document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8%", threshold: 0.08 },
  );
  document.documentElement.classList.add("reveal-ready");
  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
}

const initialLanguage = readSavedLanguage() ?? (navigator.language?.toLowerCase().startsWith("it") ? "it" : "en");
applyLanguage(initialLanguage);
