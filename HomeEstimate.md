# Documento di Prodotto – App "HomeEstimate"

## 1. Obiettivo
App che stima il valore di un immobile a partire da un link di annuncio (Idealista, Immobiliare.it, Casa.it). Incorpora dati di mercato, valori OMI (Agenzia delle Entrate) e comparabili.

---

## 2. Funzionalità principali

### 2.1 Input
- URL annuncio come fonte principale.
- Il sistema tenta automaticamente di recuperare tutti i dati disponibili dal link: indirizzo, superficie, locali, piano, stato, prezzo, anno, pertinenze e classe energetica.
- In caso di dati mancanti o incompleti, l'utente può integrarli manualmente tramite modulo dedicato con **validazione Zod** in tempo reale.
- **Wizard multi-step**:
  - Step 1: Incolla URL → Parsing automatico → Preview dati estratti
  - Step 2: Completa dati mancanti (evidenziati in giallo) → Validazione live
  - Step 3: Conferma geocoding su mappa → Drag pin per correggere posizione
  - Step 4: Calcolo in corso (progress bar: OMI → Comparabili → Stima)
  - Step 5: Report finale con confidenza visuale (gauge 0-100)

### 2.2 Estrazione dati
- Parsing titolo, descrizione, prezzo richiesto, indirizzo/coordinate, superfici, caratteristiche, foto.
- Normalizzazione JSON.
- **Retry logic** con backoff esponenziale per gestire rate limiting e errori di rete.
- **Failed jobs tracking** per tentativi falliti da rieseguire in background.

### 2.3 Analisi e valutazione
- Interrogazione valori OMI tramite servizio pubblico dell'Agenzia delle Entrate.
- Ricerca comparabili entro raggio e vincoli di similarità.
- **Scoring di similarità multi-criterio** (distanza, superficie, locali, piano, stato).
- Stima con modello ibrido: OMI + comparabili + modello edonico.
- Output: valore stimato, intervallo di confidenza, scostamento da prezzo richiesto.
- **Quality score** (0-100) basato su completezza dati e affidabilità stime.

### 2.4 Confronto mercato
- Cluster di comparabili per distanza e tipologia.
- Grafici €/m² e distribuzioni.
- **Editor comparabili avanzato**:
  - Tabella sortabile con colonne: distanza, €/m², similarità, stato inclusione
  - Checkbox "Includi in stima" con ricalcolo real-time
  - Motivo esclusione (dropdown: outlier / non comparabile / altro)
  - Visualizzazione mappa con pin colorati per similarità
- **Heatmap zone**: overlay su mappa che mostra €/m² medio per quartiere (colori: verde conveniente → rosso costoso).

### 2.5 Output
- Scheda valutazione: valore, range OMI, media comparabili, scostamento %, score, data quality.
- **Esportazione avanzata**:
  - PDF report completo
  - JSON API
  - CSV comparabili (import in Excel)
  - Link condivisibile cifrato (scadenza 7gg)
  - Stampa ottimizzata (CSS @media print)

### 2.6 Stati UX ed errori
- Stati: iniziale, parsing, validazione, risultati, errore.
- Errori gestiti: link non supportato, parsing incompleto, geocoding incerto, quota IndexedDB, rete assente.
- Messaggi azionabili con suggerimenti di correzione o input manuale.
- **Dashboard stato sistema**: ultimi errori, quota storage, cache status, failed jobs.

### 2.7 Feedback e miglioramento continuo
- **Sistema feedback utente** post-valutazione:
  - Rating accuratezza percepita (1-5 stelle)
  - Input prezzo vendita reale (se noto)
  - Commenti liberi
- **Calcolo MAPE** (Mean Absolute Percentage Error) da feedback per monitoraggio accuratezza.

### 2.8 Analisi Trend Temporale
- **Obiettivo**: Fornire contesto storico e predittivo sul mercato immobiliare per decisioni di timing ottimale.
- **Funzionalità principali**:
  - Serie storiche prezzi €/m² per zona (mensili, ultimi 1-5 anni)
  - Grafici interattivi con zoom e pan (Recharts/D3.js)
  - Variazione percentuale: 1 mese, 3 mesi, 6 mesi, 1 anno, 3 anni
  - Momentum mercato: crescita / stabile / calo
  - Heatmap temporale: identificazione periodi migliori per acquisto/vendita
  - Previsione 6-12 mesi basata su regressione lineare o modelli ARIMA
  - Comparazione trend: zona target vs città vs nazionale
  - Alert automatici: "I prezzi nella tua zona sono cresciuti del 12% quest'anno"
  - Export dati storici in CSV per analisi esterne
- **Visualizzazioni**:
  - Line chart principale con intervallo di confidenza
  - Bar chart variazioni percentuali per periodo
  - Calendar heatmap: prezzo medio per mese negli ultimi 3 anni
  - Scatter plot: prezzo vs tempo con trendline
- **Dati richiesti**:
  - Storico prezzi da scraping periodico (batch job notturno)
  - Aggregazione per zona OMI
  - Normalizzazione per superficie e tipologia
- **Schema dati**:
  ```typescript
  interface PriceTrend {
    zona: string;
    comune: string;
    tipologia: 'residenziale' | 'signorile' | 'economico';
    prezziMensili: Array<{
      anno: number;
      mese: number;
      prezzoMedioM2: number;
      numeroCampioni: number;
      stdDev: number;
    }>;
    variazioni: {
      m1: number;   // variazione 1 mese (%)
      m3: number;   // variazione 3 mesi (%)
      m6: number;   // variazione 6 mesi (%)
      y1: number;   // variazione 1 anno (%)
      y3: number;   // variazione 3 anni (%)
    };
    momentum: 'crescita_forte' | 'crescita' | 'stabile' | 'calo' | 'calo_forte';
    previsione: Array<{
      anno: number;
      mese: number;
      prezzoPrevistoM2: number;
      confidenzaLow: number;
      confidenzaHigh: number;
    }>;
    stagionalità: {
      miglioreMeseAcquisto: string;
      miglioreMeseVendita: string;
      differenzaStagionale: number; // % tra picco e valle
    };
  }
  ```
- **Tabella IndexedDB**: `priceTrends`
  - Indici: `++id, zona, comune, tipologia, annoMese`
  - Cache: 5 anni di storico, aggiornamento mensile
  - Dimensione stimata: ~2KB per zona/mese → 50 zone × 60 mesi = 6MB

### 2.9 Simulatore "Cosa Succede Se..."
- **Obiettivo**: Permettere pianificazione interventi con calcolo ROI e impatto sul valore dell'immobile.
- **Funzionalità principali**:
  - Editor interattivo con slider e checkbox per modifiche ipotizzate
  - Calcolo real-time impatto su valore stimato
  - ROI percentuale e tempo di recupero investimento
  - Comparazione scenario corrente vs migliorato
  - Prioritizzazione interventi per miglior ROI
  - Simulazione combinata: calcolo effetto di più interventi simultanei
  - Export piano ristrutturazione con costi e benefici
- **Scenari supportati**:
  ```typescript
  interface RenovationScenario {
    id: string;
    categoria: 'estetico' | 'strutturale' | 'energetico' | 'distributivo';
    descrizione: string;
    costoMin: number;
    costoMax: number;
    incrementoValoreMin: number;  // €
    incrementoValoreMax: number;  // €
    tempoRecupero: number;        // mesi, con affitto
    roi: number;                  // %
    difficoltà: 'bassa' | 'media' | 'alta';
    tempoDurata: number;          // giorni lavori
    impattaAbitabilità: boolean;
    prerequisiti?: string[];      // altri interventi richiesti prima
  }
  
  // Libreria scenari predefiniti:
  const SCENARI_COMUNI: RenovationScenario[] = [
    {
      id: 'bagno_completo',
      categoria: 'estetico',
      descrizione: 'Ristrutturazione completa bagno',
      costoMin: 6000,
      costoMax: 12000,
      incrementoValoreMin: 10000,
      incrementoValoreMax: 15000,
      roi: 45,
      tempoDurata: 15,
      difficoltà: 'media'
    },
    {
      id: 'cucina_completa',
      categoria: 'estetico',
      descrizione: 'Nuova cucina componibile',
      costoMin: 5000,
      costoMax: 15000,
      incrementoValoreMin: 6000,
      incrementoValoreMax: 12000,
      roi: 25,
      tempoDurata: 7,
      difficoltà: 'bassa'
    },
    {
      id: 'pavimenti',
      categoria: 'estetico',
      descrizione: 'Sostituzione pavimenti (parquet/gres)',
      costoMin: 3000,
      costoMax: 8000,
      incrementoValoreMin: 5000,
      incrementoValoreMax: 10000,
      roi: 40,
      tempoDurata: 10,
      difficoltà: 'media'
    },
    {
      id: 'infissi',
      categoria: 'energetico',
      descrizione: 'Sostituzione infissi con PVC/alluminio',
      costoMin: 4000,
      costoMax: 10000,
      incrementoValoreMin: 6000,
      incrementoValoreMax: 12000,
      roi: 50,
      tempoDurata: 5,
      difficoltà: 'bassa'
    },
    {
      id: 'cappotto_termico',
      categoria: 'energetico',
      descrizione: 'Cappotto termico esterno',
      costoMin: 15000,
      costoMax: 35000,
      incrementoValoreMin: 25000,
      incrementoValoreMax: 45000,
      roi: 60,
      tempoDurata: 30,
      difficoltà: 'alta',
      prerequisiti: ['approvazione_condominio']
    },
    {
      id: 'classe_energetica',
      categoria: 'energetico',
      descrizione: 'Upgrade classe energetica (C→A)',
      costoMin: 12000,
      costoMax: 25000,
      incrementoValoreMin: 20000,
      incrementoValoreMax: 35000,
      roi: 67,
      tempoDurata: 45,
      difficoltà: 'alta'
    },
    {
      id: 'balcone',
      categoria: 'distributivo',
      descrizione: 'Creazione balcone/veranda',
      costoMin: 8000,
      costoMax: 20000,
      incrementoValoreMin: 12000,
      incrementoValoreMax: 25000,
      roi: 50,
      tempoDurata: 20,
      difficoltà: 'alta',
      prerequisiti: ['permessi_edilizi']
    },
    {
      id: 'bagno_extra',
      categoria: 'distributivo',
      descrizione: 'Creazione secondo bagno',
      costoMin: 8000,
      costoMax: 15000,
      incrementoValoreMin: 15000,
      incrementoValoreMax: 25000,
      roi: 75,
      tempoDurata: 25,
      difficoltà: 'alta'
    },
    {
      id: 'imbiancatura',
      categoria: 'estetico',
      descrizione: 'Tinteggiatura completa appartamento',
      costoMin: 1500,
      costoMax: 3500,
      incrementoValoreMin: 2000,
      incrementoValoreMax: 5000,
      roi: 50,
      tempoDurata: 5,
      difficoltà: 'bassa'
    },
    {
      id: 'impianto_elettrico',
      categoria: 'strutturale',
      descrizione: 'Rifacimento impianto elettrico a norma',
      costoMin: 3000,
      costoMax: 8000,
      incrementoValoreMin: 5000,
      incrementoValoreMax: 10000,
      roi: 40,
      tempoDurata: 10,
      difficoltà: 'media'
    },
    {
      id: 'climatizzazione',
      categoria: 'energetico',
      descrizione: 'Installazione climatizzatore multi-split',
      costoMin: 2500,
      costoMax: 6000,
      incrementoValoreMin: 3000,
      incrementoValoreMax: 7000,
      roi: 35,
      tempoDurata: 3,
      difficoltà: 'bassa'
    },
    {
      id: 'domotica',
      categoria: 'tecnologico',
      descrizione: 'Sistema domotico completo',
      costoMin: 3000,
      costoMax: 10000,
      incrementoValoreMin: 2000,
      incrementoValoreMax: 8000,
      roi: 20,
      tempoDurata: 5,
      difficoltà: 'media'
    }
  ];
  ```
- **Calcolo impatto valore**:
  ```typescript
  function calcolaImpatto(
    valoreBase: number,
    scenario: RenovationScenario,
    caratteristicheImmobile: Property
  ): SimulationResult {
    // Fattori di aggiustamento
    const fattoreZona = getZoneFactor(caratteristicheImmobile.zona);
    const fattoreTipologia = getTypeFactor(caratteristicheImmobile.tipologia);
    const fattoreEtà = getAgeFactor(caratteristicheImmobile.annoCostruzione);
    
    // Calcolo incremento
    const incrementoMedio = (scenario.incrementoValoreMin + scenario.incrementoValoreMax) / 2;
    const incrementoAggiustato = incrementoMedio * fattoreZona * fattoreTipologia * fattoreEtà;
    
    // Costo medio
    const costoMedio = (scenario.costoMin + scenario.costoMax) / 2;
    
    // Nuovo valore
    const nuovoValore = valoreBase + incrementoAggiustato;
    
    // ROI effettivo
    const roiEffettivo = ((incrementoAggiustato - costoMedio) / costoMedio) * 100;
    
    // Tempo recupero con affitto (assumendo yield 4%)
    const affittoAnnuo = nuovoValore * 0.04;
    const affittoMensile = affittoAnnuo / 12;
    const tempoRecuperoMesi = costoMedio / affittoMensile;
    
    return {
      valoreOriginale: valoreBase,
      valoreNuovo: nuovoValore,
      incrementoValore: incrementoAggiustato,
      incrementoPct: (incrementoAggiustato / valoreBase) * 100,
      costoStimato: costoMedio,
      roiPct: roiEffettivo,
      tempoRecuperoMesi: Math.ceil(tempoRecuperoMesi),
      guadagnoNetto: incrementoAggiustato - costoMedio,
      consigliato: roiEffettivo > 30
    };
  }
  ```
- **UI Componenti**:
  - Card scenario: foto, descrizione, costo, ROI badge
  - Slider range costo: utente può personalizzare
  - Toggle inclusione in piano
  - Riepilogo: valore originale → valore nuovo, costi totali, ROI complessivo
  - Gantt chart: timeline lavori con dipendenze
  - Export PDF: business case ristrutturazione

### 2.10 Calcolatore Finanziario Integrato
- **Obiettivo**: Analisi completa del Total Cost of Ownership (TCO) per decisioni d'acquisto informate.
- **Funzionalità principali**:
  - Calcolo mutuo: importo, tasso, durata, rata mensile, interessi totali
  - Piano ammortamento completo (francese/italiano)
  - Costi d'acquisto: notaio, agenzia, imposte, perizia, registrazione
  - Costi ricorrenti: condominio, IMU, TARI, manutenzione, utenze
  - Simulazione affitto: canone stimato, yield lordo/netto, break-even
  - Comparazione Buy vs Rent con NPV
  - Analisi sostenibilità: % stipendio per rata, soglia di allarme
  - Simulazione vendita futura: valore atteso, capital gain, tassazione
- **Schema dati**:
  ```typescript
  interface FinancialCalculation {
    // Input
    prezzoAcquisto: number;
    percentualeAnticipo: number; // default 20%
    
    // Mutuo
    mutuo: {
      importo: number;
      tassoInteresse: number;      // es. 3.5% annuo
      durataAnni: number;           // es. 25
      tipoPiano: 'francese' | 'italiano';
      rataMensile: number;
      interessiTotali: number;
      capitaleTotale: number;
      pianoAmmortamento: Array<{
        mese: number;
        quotaCapitale: number;
        quotaInteressi: number;
        rata: number;
        debitoResiduo: number;
      }>;
      taeg: number;                 // Tasso Annuo Effettivo Globale
    };
    
    // Costi acquisto (una tantum)
    costiAcquisto: {
      notaio: number;               // 1-2% prezzo
      agenzia: number;              // 2-3% prezzo
      imposte: {
        registro: number;           // 2-9% in base a prima/seconda casa
        ipotecaria: number;         // 50-200€
        catastale: number;          // 50-200€
        totale: number;
      };
      perizia: number;              // 250-500€
      istruttoria: number;          // 0.5-1% mutuo
      totale: number;
    };
    
    // Costi ricorrenti
    costiRicorrenti: {
      condominio: {
        mensile: number;
        annuale: number;
      };
      imu: {
        rendita: number;
        aliquota: number;
        annuale: number;
      };
      tari: {
        annuale: number;
      };
      riscaldamento: {
        stima: number;              // da classe energetica
        mensile: number;
      };
      manutenzione: {
        percentuale: 1;             // 1% valore annuo
        annuale: number;
      };
      assicurazione: {
        annuale: number;            // opzionale
      };
      totaleAnnuo: number;
      totaleMensile: number;
    };
    
    // Analisi affitto
    affitto: {
      canoneStimato: number;        // €/mese da comparabili
      canoneAnnuo: number;
      yieldLordo: number;           // % rendimento lordo
      yieldNetto: number;           // % rendimento netto (dopo tasse/spese)
      tassazione: number;           // cedolare secca 21% o IRPEF
      speseGestione: number;        // vuoti, manutenzione straordinaria
      cashFlowMensile: number;      // canone - rata mutuo - spese
      breakEvenAnni: number;        // anni per recuperare investimento iniziale
    };
    
    // Analisi sostenibilità
    sostenibilità: {
      stipendioMensileNetto: number;
      rataSuStipendio: number;      // % (max consigliato 30-35%)
      sostenibile: boolean;
      margineSicurezza: number;     // € rimanenti dopo rata + spese
    };
    
    // Comparazione Buy vs Rent
    comparazione: {
      costoTotaleAcquisto: number;  // 30 anni
      costoTotaleAffitto: number;   // 30 anni
      npvDifferenza: number;        // Net Present Value
      consiglio: 'acquistare' | 'affittare' | 'indifferente';
      breakEvenAnni: number;        // dopo quanti anni conviene comprare
    };
    
    // Proiezione futura
    proiezioneVendita: {
      valoreAttualeStimato: number;
      apprezzamentoAnnuo: number;   // % da trend zona
      valoreFuturo: number;         // es. tra 10 anni
      capitalGain: number;          // guadagno lordo
      tassazione: number;           // 26% su plusvalenza
      guadagnoNetto: number;
    };
  }
  ```
- **Formule principali**:
  ```typescript
  // Rata mutuo (piano francese)
  function calcolaRataMutuo(capitale: number, tassoAnnuo: number, anni: number): number {
    const n = anni * 12;
    const i = tassoAnnuo / 100 / 12;
    return capitale * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
  }
  
  // Piano ammortamento
  function generaPianoAmmortamento(
    capitale: number, 
    tassoAnnuo: number, 
    anni: number
  ): AmortizationEntry[] {
    const rata = calcolaRataMutuo(capitale, tassoAnnuo, anni);
    const i = tassoAnnuo / 100 / 12;
    let debitoResiduo = capitale;
    const piano: AmortizationEntry[] = [];
    
    for (let mese = 1; mese <= anni * 12; mese++) {
      const quotaInteressi = debitoResiduo * i;
      const quotaCapitale = rata - quotaInteressi;
      debitoResiduo -= quotaCapitale;
      
      piano.push({
        mese,
        quotaCapitale,
        quotaInteressi,
        rata,
        debitoResiduo: Math.max(0, debitoResiduo)
      });
    }
    
    return piano;
  }
  
  // Yield netto affitto
  function calcolaYieldNetto(
    canoneAnnuo: number,
    valoreImmobile: number,
    costiAnnui: number,
    tassazione: number
  ): number {
    const redditoLordo = canoneAnnuo;
    const tasse = redditoLordo * (tassazione / 100);
    const redditoNetto = redditoLordo - tasse - costiAnnui;
    return (redditoNetto / valoreImmobile) * 100;
  }
  
  // NPV Buy vs Rent
  function calcolaNPV(
    flussiCassa: number[],
    tassoSconto: number
  ): number {
    return flussiCassa.reduce((npv, flusso, anno) => {
      return npv + flusso / Math.pow(1 + tassoSconto, anno);
    }, 0);
  }
  ```
- **UI Componenti**:
  - Form input: prezzo, anticipo, tasso, durata
  - Tabella ammortamento con export CSV
  - Grafici: composizione rata, evoluzione debito residuo, TCO timeline
  - Card comparativa Buy vs Rent
  - Semaforo sostenibilità: verde (<30%), giallo (30-40%), rosso (>40%)
  - Export PDF: business case completo

### 2.11 Report Avanzati "Investment Analysis"
- **Obiettivo**: Generare report professionali multi-pagina per investitori, banche, consulenti.
- **Struttura report (25-35 pagine)**:
  ```typescript
  interface InvestmentReport {
    metadata: {
      dataGenerazione: string;
      versione: string;
      idValutazione: string;
      autore: string;
    };
    
    // Pagina 1-2: Executive Summary
    executiveSummary: {
      raccomandazione: 'acquista' | 'negozia' | 'evita';
      scoreComplessivo: number;           // 0-100
      sintesi: string;                     // 200 parole
      keyFindings: string[];               // 5-7 punti bullet
      rischiPrincipali: string[];
      opportunitàPrincipali: string[];
      azioniConsigliate: string[];
    };
    
    // Pagina 3-5: Dati Immobile
    schedaImmobile: {
      informazioniGenerali: {
        indirizzo: string;
        tipologia: string;
        superficie: number;
        locali: number;
        piano: number;
        annoCostruzione: number;
        statoConservazione: string;
        classeEnergetica: string;
      };
      caratteristichePrincipali: string[];
      foto: string[];                      // URLs
      planimetria?: string;
      certificazioni: string[];
    };
    
    // Pagina 6-10: Analisi Valutazione
    analisiValutazione: {
      metodologia: string;
      valoreStimato: number;
      intervalloConfidenza: { low: number; high: number };
      prezzoRichiesto: number;
      scostamento: number;                 // %
      scomposizione: {
        pesoCMP: number;
        pesoOMI: number;
        pesoHDN: number;
      };
      comparabiliUsati: number;
      comparabiliDettaglio: Array<{
        indirizzo: string;
        prezzo: number;
        superficie: number;
        prezzoM2: number;
        distanza: number;
        similarità: number;
      }>;
      graficiValori: {
        distribuzioneComparabili: ChartData;
        scostamentoDaOMI: ChartData;
        confidenza: ChartData;
      };
    };
    
    // Pagina 11-15: Analisi Mercato
    analisiMercato: {
      trendStorico: PriceTrend;
      posizionamento: {
        percentile: number;              // dove si colloca prezzo rispetto mercato
        categoriaPrezzo: 'economico' | 'medio' | 'alto' | 'lusso';
      };
      comparazioneZone: Array<{
        zona: string;
        prezzoMedioM2: number;
        variazione1Anno: number;
        scoreQualità: number;
      }>;
      domandaOfferta: {
        ratioDA: number;                 // >1 = più domanda che offerta
        tempoVenditaMedio: number;       // giorni
        scorte: number;                  // mesi di inventario
        momentum: string;
      };
      grafici: {
        trendPrezzo: ChartData;
        comparazioneZone: ChartData;
        stagionalità: ChartData;
        heatmapPrezzi: ChartData;
      };
    };
    
    // Pagina 16-20: Analisi Finanziaria
    analisiFinanziaria: FinancialCalculation;
    
    // Pagina 21-23: Due Diligence
    dueDiligence: {
      rischiGeologici: {
        zona: string;
        rischioPrincipale: string;
        livelloRischio: 'basso' | 'medio' | 'alto';
        misureAdottate: string[];
      };
      efficienzaEnergetica: {
        classeAttuale: string;
        consumoAnnuo: number;
        costoAnnuo: number;
        potenzialeMiglioramento: string;
        incentivi: string[];
      };
      statoCondominio: {
        unitàTotali: number;
        assemblee: string;
        lavoriProgrammati: string[];
        contenziosi: string;
        fondoOrdinario: number;
        fondoStraordinario: number;
      };
      vincoli: {
        urbanistici: string[];
        paesaggistici: string[];
        storici: string[];
        ambientali: string[];
      };
      situazioneGiuridica: {
        proprietà: string;
        ipoteche: string;
        servitù: string[];
        abusi: string;
        conformitàCatastale: boolean;
        conformitàUrbanistica: boolean;
      };
    };
    
    // Pagina 24-26: Scenari e Simulazioni
    scenariAnalysis: {
      scenarioBase: {
        assunzioni: string[];
        valoreAtteso: number;
        probabilità: number;
      };
      scenarioOttimistico: {
        assunzioni: string[];
        valoreAtteso: number;
        probabilità: number;
      };
      scenarioPessimistico: {
        assunzioni: string[];
        valoreAtteso: number;
        probabilità: number;
      };
      analisiSensitività: Array<{
        variabile: string;
        impatto: number;              // % su valore
        criticità: 'bassa' | 'media' | 'alta';
      }>;
      montecarloSimulation?: {
        valoreMedio: number;
        stdDev: number;
        percentile5: number;
        percentile95: number;
      };
    };
    
    // Pagina 27-28: Raccomandazioni
    raccomandazioni: {
      strategiaNegoziazione: {
        prezzoTarget: number;
        margineNegoziazione: number;     // %
        argomentazioni: string[];
        controproposteAttese: string[];
      };
      interventConsigliate: RenovationScenario[];
      pianificazioneFiscale: {
        regimeFiscale: string;
        detrazioni: string[];
        bonusApplicabili: string[];
        risparmioStimato: number;
      };
      roadmap: Array<{
        fase: string;
        attività: string[];
        tempistica: string;
        costo: number;
      }>;
    };
    
    // Pagina 29-31: Appendici
    appendici: {
      calcoli: {
        formuleMutuarie: string;
        formulaValutazione: string;
        parametriModello: Record<string, number>;
      };
      fontiDati: Array<{
        fonte: string;
        dataAccesso: string;
        url?: string;
      }>;
      glossario: Array<{
        termine: string;
        definizione: string;
      }>;
      disclaimerLegale: string;
    };
    
    // Pagina 32: Contatti e Follow-up
    followUp: {
      prossimiPassi: string[];
      scadenze: Array<{
        attività: string;
        data: string;
      }>;
      contatti: {
        email: string;
        telefono?: string;
        supporto: string;
      };
    };
  }
  ```
- **Generazione PDF**:
  ```typescript
  // Librerie: jsPDF + html2canvas oppure Puppeteer (server-side)
  async function generaReportPDF(report: InvestmentReport): Promise<Blob> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Copertina
    generaCopertina(pdf, report);
    
    // Indice
    pdf.addPage();
    generaIndice(pdf);
    
    // Executive Summary
    pdf.addPage();
    generaExecutiveSummary(pdf, report.executiveSummary);
    
    // Scheda Immobile con foto
    pdf.addPage();
    generaSchedaImmobile(pdf, report.schedaImmobile);
    
    // Analisi Valutazione con grafici
    pdf.addPage();
    generaAnalisiValutazione(pdf, report.analisiValutazione);
    
    // ... altre sezioni
    
    // Footer su ogni pagina
    const pageCount = pdf.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(128);
      pdf.text(
        `HomeEstimate Investment Analysis - Pagina ${i} di ${pageCount}`,
        pdf.internal.pageSize.width / 2,
        pdf.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
    
    return pdf.output('blob');
  }
  ```
- **Template grafici**:
  - Chart.js/Recharts per grafici embedded
  - Export immagine PNG ad alta risoluzione
  - Palette colori professionale
  - Branding: logo, colori aziendali
- **Export formati**:
  - PDF (standard)
  - Word (.docx) editabile
  - Excel (.xlsx) con dati e grafici
  - JSON per integrazioni API
- **Watermarking**:
  - Logo HomeEstimate su ogni pagina
  - QR code per verifica autenticità
  - Timestamp e hash report
- **Pricing tier**:
  - Report base (10 pagine): gratuito
  - Report completo (30+ pagine): premium
  - Batch reports: enterprise

---

## 3. Architettura

### 3.1 Frontend
- React/Next.js, Tailwind CSS.
- PWA con Service Worker e cache strategica.

### 3.2 Backend
- FastAPI o Express.
- Moduli: Scraper (con retry logic), OMI, Comparables, Valuation Engine, Report.

### 3.3 Database
- **Fase 1 (ora)**: nessun database server-side. Persistenza solo nel browser.
  - **IndexedDB** tramite **Dexie.js** per valutazioni, comparabili cache, e snapshot OMI.
  - **localStorage** per preferenze leggere (UI, ultimi input).
  - **Backup/Restore**: esportazione/importazione JSON firmato lato client; export PDF del report.
  - **Quota handling**: gestione errori `QuotaExceededError`, rotazione cache con **LRU**, politiche di eviction automatiche.
  - **Migrazione schema**: versioni Dexie con upgrade script.
  - **Cache TTL**: snapshot OMI con scadenza automatica (6 mesi).
  - **Pruning automatico**: cleanup cache scaduta e comparabili obsoleti.
- **Fase 2 (separata)**: introduzione DB server-side (es. PostgreSQL) e cache (es. Redis) per sincronizzazione multi-device e team.

### 3.4 API REST
- `POST /evaluate` - Crea nuova valutazione
- `GET /omi/:zona` - Recupera valori OMI
- `GET /comparables` - Cerca comparabili
- `GET /report/:id` - Recupera report generato
- **Nuovi endpoint per features avanzate:**
  - `GET /trends/:zona` - Recupera serie storica prezzi (feature 2.8)
  - `POST /trends/forecast` - Genera previsioni prezzi
  - `POST /scenarios/simulate` - Simula interventi ristrutturazione (feature 2.9)
  - `GET /scenarios/:id` - Recupera simulazione salvata
  - `POST /financial/calculate` - Calcola analisi finanziaria (feature 2.10)
  - `GET /financial/:id` - Recupera calcolo salvato
  - `POST /reports/generate` - Genera Investment Report (feature 2.11)
  - `GET /reports/:id/pdf` - Download PDF report
  - `GET /reports/:id/verify` - Verifica autenticità report (hash check)
- **Rate limiting** e rispetto robots.txt dei portali.

### 3.5 PWA e offline-first
- Installabile come PWA; Service Worker con cache strategica per UI e modelli statici.
- Modalità offline: valutazioni disponibili da cache; coda richieste da sincronizzare al ritorno online.
- **Biometric unlock** su mobile (Web Authentication API).

### 3.6 Schema dati locale (IndexedDB/Dexie)
**Obiettivo:** persistere valutazioni, cache comparabili e snapshot OMI solo in browser, con cifratura applicata prima del salvataggio.

**Tabelle e indici**
- `evaluations` – valutazioni generate
  - Indici: `++id, createdAt, updatedAt, addressHash, city, omiZone, status, qualityScore, dataQuality, dataSource`
- `comparables` – comparabili collegati a una valutazione
  - Indici: `++id, evalId, createdAt, distance, priceM2, similarityScore, includedInEstimate`
- `omiSnapshots` – cache valori OMI
  - Indici: `++id, comune, zona, destinazione, semestre, createdAt, expiresAt, source`
- `priceTrends` – dati storici prezzi per analisi trend (nuova feature 2.8)
  - Indici: `++id, zona, comune, tipologia, annoMese, createdAt`
  - Payload: serie temporale prezzi, variazioni, previsioni
- `renovationScenarios` – simulazioni interventi salvate (nuova feature 2.9)
  - Indici: `++id, evalId, createdAt, totalCost, totalROI`
  - Payload: lista interventi selezionati, costi, ROI, timeline
- `financialCalculations` – calcoli finanziari salvati (nuova feature 2.10)
  - Indici: `++id, evalId, createdAt, purchasePrice, monthlyPayment`
  - Payload: mutuo, costi, TCO, affitto, sostenibilità
- `investmentReports` – report generati (nuova feature 2.11)
  - Indici: `++id, evalId, createdAt, reportType, pageCount`
  - Payload: JSON completo report, metadata, hash verifica
- `failedJobs` – tentativi falliti da rieseguire
  - Indici: `++id, jobType, url, attemptCount, lastAttempt, retryAfter`
- `feedbacks` – feedback utente post-valutazione
  - Indici: `++id, evalId, ts, userRating`
- `settings` – preferenze leggere
  - Indici: `key`
- `logs` – diagnostica locale
  - Indici: `++id, level, ts`

**Versioning Dexie**
- v1: tabelle base.
- v2: aggiungi indici `city` e `omiZone` su `evaluations`.
- v3: aggiungi campo `qualityScore` a `evaluations` e indice `qualityScore`.
- v4: aggiungi campi `dataQuality`, `dataSource`, `missingFields` a `evaluations`.
- v5: aggiungi `similarityScore`, `includedInEstimate`, `excludeReason` a `comparables`.
- v6: aggiungi `expiresAt`, `source` a `omiSnapshots`.
- v7: aggiungi tabelle `failedJobs` e `feedbacks`.
- v8: aggiungi tabelle `priceTrends`, `renovationScenarios`, `financialCalculations`, `investmentReports` per nuove features.

**Tipi dati principali (TS)**
```ts
export type EvalStatus = 'draft' | 'ready' | 'error';
export type DataSource = 'auto' | 'manual' | 'hybrid';

export interface EvaluationRow {
  id?: number;
  createdAt: number; // epoch ms
  updatedAt: number;
  addressHash: string; // SHA-256 dell'indirizzo normalizzato
  city: string;
  rawUrl: string;
  encryptedPayload: ArrayBuffer; // JSON cifrato (AES-GCM)
  omiZone?: string;
  status: EvalStatus;
  qualityScore?: number; // 0..100
  dataQuality: number; // 0..100, completezza input
  dataSource: DataSource; // origine dati
  missingFields?: string[]; // campi non estratti dal parsing
}

export interface ComparableRow {
  id?: number;
  evalId: number;
  createdAt: number;
  distance: number; // km
  priceM2: number;
  similarityScore: number; // 0..100, multi-criterio
  includedInEstimate: boolean; // flag per esclusione manuale
  excludeReason?: string; // "outlier" | "user_excluded" | "low_quality"
  encryptedPayload: ArrayBuffer; // comparabile completo cifrato
}

export interface OmiSnapshotRow {
  id?: number;
  comune: string;
  zona: string;
  destinazione: string;
  semestre: string;
  createdAt: number;
  expiresAt: number; // epoch ms, es. +6 mesi
  source: 'api' | 'fallback'; // distingui se da API ufficiale o fallback
  encryptedPayload: ArrayBuffer;
}

export interface FailedJobRow {
  id?: number;
  jobType: 'scraping' | 'omi' | 'comparables';
  url: string;
  attemptCount: number;
  lastAttempt: number;
  lastError: string;
  retryAfter?: number; // epoch ms
}

export interface FeedbackRow {
  id?: number;
  evalId: number;
  ts: number;
  actualPrice?: number; // prezzo di vendita reale, se noto
  userRating: 1 | 2 | 3 | 4 | 5; // accuratezza percepita
  comments?: string;
}

export interface SettingRow {
  key: string;
  value: string;
}

export interface LogRow {
  id?: number;
  level: 'error' | 'warn' | 'info';
  ts: number;
  msg: string;
  ctx?: string;
}

export interface SecuritySettings {
  encryptionEnabled: boolean;
  autoLockMinutes: number; // 0 = mai, 5/15/30
  biometricEnabled?: boolean; // per PWA su mobile
  recoveryKeyHash?: string; // SHA-256 della recovery key
}

// Nuove interfacce per feature 2.8, 2.9, 2.10, 2.11
export interface PriceTrendRow {
  id?: number;
  zona: string;
  comune: string;
  tipologia: 'residenziale' | 'signorile' | 'economico';
  annoMese: string; // formato "YYYY-MM"
  createdAt: number;
  encryptedPayload: ArrayBuffer; // contiene PriceTrend completo
}

export interface RenovationScenarioRow {
  id?: number;
  evalId: number;
  createdAt: number;
  totalCost: number;
  totalROI: number;
  encryptedPayload: ArrayBuffer; // lista interventi, calcoli dettagliati
}

export interface FinancialCalculationRow {
  id?: number;
  evalId: number;
  createdAt: number;
  purchasePrice: number;
  monthlyPayment: number;
  encryptedPayload: ArrayBuffer; // FinancialCalculation completo
}

export interface InvestmentReportRow {
  id?: number;
  evalId: number;
  createdAt: number;
  reportType: 'basic' | 'complete' | 'premium';
  pageCount: number;
  encryptedPayload: ArrayBuffer; // InvestmentReport completo
  hash: string; // SHA-256 per verifica integrità
}
```

**Inizializzazione Dexie**
```ts
import Dexie, { Table } from 'dexie';

export class HomeEstimateDB extends Dexie {
  evaluations!: Table<EvaluationRow, number>;
  comparables!: Table<ComparableRow, number>;
  omiSnapshots!: Table<OmiSnapshotRow, number>;
  priceTrends!: Table<PriceTrendRow, number>;
  renovationScenarios!: Table<RenovationScenarioRow, number>;
  financialCalculations!: Table<FinancialCalculationRow, number>;
  investmentReports!: Table<InvestmentReportRow, number>;
  failedJobs!: Table<FailedJobRow, number>;
  feedbacks!: Table<FeedbackRow, number>;
  settings!: Table<SettingRow, string>;
  logs!: Table<LogRow, number>;

  constructor() {
    super('homeestimate');
    
    // v1: schema base
    this.version(1).stores({
      evaluations: '++id, createdAt, updatedAt, addressHash, city, omiZone, status',
      comparables: '++id, evalId, createdAt, distance, priceM2',
      omiSnapshots: '++id, comune, zona, destinazione, semestre, createdAt',
      settings: 'key',
      logs: '++id, level, ts'
    });
    
    // v2: indici aggiuntivi evaluations
    this.version(2).stores({
      evaluations: '++id, createdAt, updatedAt, addressHash, city, omiZone, status'
    });
    
    // v3: qualityScore
    this.version(3).upgrade(tx => 
      tx.table('evaluations').toCollection().modify(r => (r.qualityScore ??= 0))
    );
    
    // v4: dataQuality, dataSource, missingFields
    this.version(4).stores({
      evaluations: '++id, createdAt, updatedAt, addressHash, city, omiZone, status, qualityScore, dataQuality, dataSource'
    }).upgrade(tx => 
      tx.table('evaluations').toCollection().modify(r => {
        r.dataQuality ??= 0;
        r.dataSource ??= 'auto';
        r.missingFields ??= [];
      })
    );
    
    // v5: similarityScore, includedInEstimate su comparables
    this.version(5).stores({
      comparables: '++id, evalId, createdAt, distance, priceM2, similarityScore, includedInEstimate'
    }).upgrade(tx => 
      tx.table('comparables').toCollection().modify(r => {
        r.similarityScore ??= 0;
        r.includedInEstimate ??= true;
      })
    );
    
    // v6: expiresAt, source su omiSnapshots
    this.version(6).stores({
      omiSnapshots: '++id, comune, zona, destinazione, semestre, createdAt, expiresAt, source'
    }).upgrade(tx => 
      tx.table('omiSnapshots').toCollection().modify(r => {
        r.expiresAt ??= r.createdAt + 6 * 30 * 24 * 3600 * 1000; // +6 mesi
        r.source ??= 'api';
      })
    );
    
    // v7: nuove tabelle failedJobs e feedbacks
    this.version(7).stores({
      failedJobs: '++id, jobType, url, attemptCount, lastAttempt, retryAfter',
      feedbacks: '++id, evalId, ts, userRating'
    });
    
    // v8: nuove tabelle per features avanzate
    this.version(8).stores({
      priceTrends: '++id, zona, comune, tipologia, annoMese, createdAt',
      renovationScenarios: '++id, evalId, createdAt, totalCost, totalROI',
      financialCalculations: '++id, evalId, createdAt, purchasePrice, monthlyPayment',
      investmentReports: '++id, evalId, createdAt, reportType, pageCount'
    });
  }
}

export const db = new HomeEstimateDB();
```

**Utilità**
```ts
// Stima quota usata in MB
export async function estimateUsageMB(): Promise<number> {
  const [e, c, o, pt, rs, fc, ir, f, fb] = await Promise.all([
    db.evaluations.count(),
    db.comparables.count(),
    db.omiSnapshots.count(),
    db.priceTrends.count(),
    db.renovationScenarios.count(),
    db.financialCalculations.count(),
    db.investmentReports.count(),
    db.failedJobs.count(),
    db.feedbacks.count()
  ]);
  // euristica: 20KB per evaluation, 5KB per comparable, 8KB per snapshot, 
  // 2KB per trend, 10KB per scenario, 15KB per financial calc, 
  // 100KB per report (media), 2KB per job/feedback
  const bytes = e * 20_000 + c * 5_000 + o * 8_000 + pt * 2_000 + 
                rs * 10_000 + fc * 15_000 + ir * 100_000 + f * 2_000 + fb * 2_000;
  return bytes / 1_048_576;
}

// Stima quota browser nativa
export async function getBrowserQuota(): Promise<StorageEstimate> {
  return await navigator.storage.estimate();
}

// Backup completo
export async function exportBackup(): Promise<Blob> {
  const payload = {
    v: 2, // versione backup
    ts: Date.now(),
    evaluations: await db.evaluations.toArray(),
    comparables: await db.comparables.toArray(),
    omiSnapshots: await db.omiSnapshots.toArray(),
    failedJobs: await db.failedJobs.toArray(),
    feedbacks: await db.feedbacks.toArray(),
    settings: await db.settings.toArray()
  };
  return new Blob([JSON.stringify(payload)], { type: 'application/json' });
}

// Restore (sovrascrive)
export async function importBackup(file: File): Promise<void> {
  const text = await file.text();
  const data = JSON.parse(text);
  
  if (data.v !== 2) {
    throw new Error('Versione backup non compatibile');
  }
  
  await db.transaction('rw', 
    db.evaluations, db.comparables, db.omiSnapshots, 
    db.failedJobs, db.feedbacks, db.settings,
    async () => {
      await Promise.all([
        db.evaluations.clear(),
        db.comparables.clear(),
        db.omiSnapshots.clear(),
        db.failedJobs.clear(),
        db.feedbacks.clear(),
        db.settings.clear()
      ]);
      
      await Promise.all([
        db.evaluations.bulkAdd(data.evaluations || []),
        db.comparables.bulkAdd(data.comparables || []),
        db.omiSnapshots.bulkAdd(data.omiSnapshots || []),
        db.failedJobs.bulkAdd(data.failedJobs || []),
        db.feedbacks.bulkAdd(data.feedbacks || []),
        db.settings.bulkAdd(data.settings || [])
      ]);
    }
  );
}

// Cleanup cache scaduta
export async function pruneExpiredCache(): Promise<number> {
  const now = Date.now();
  const deleted = await db.omiSnapshots.where('expiresAt').below(now).delete();
  return deleted;
}

// Eviction LRU comparabili (mantieni ultimi 500)
export async function evictOldComparables(): Promise<number> {
  const count = await db.comparables.count();
  if (count > 500) {
    const toDelete = count - 500;
    const oldIds = await db.comparables
      .orderBy('createdAt')
      .limit(toDelete)
      .primaryKeys();
    await db.comparables.bulkDelete(oldIds);
    return toDelete;
  }
  return 0;
}

// Retry failed jobs in background
export async function retryFailedJobs(): Promise<void> {
  const now = Date.now();
  const jobs = await db.failedJobs
    .where('retryAfter').below(now)
    .and(j => j.attemptCount < 5)
    .toArray();
  
  for (const job of jobs) {
    try {
      await processJob(job); // funzione da implementare
      await db.failedJobs.delete(job.id!);
    } catch (err) {
      await db.failedJobs.update(job.id!, {
        attemptCount: job.attemptCount + 1,
        lastAttempt: now,
        lastError: String(err),
        retryAfter: now + Math.pow(2, job.attemptCount) * 60000 // exp backoff
      });
    }
  }
}

// Calcolo MAPE da feedback
export async function calculateMAPE(passphrase: string): Promise<number> {
  const feedbacks = await db.feedbacks
    .filter(f => f.actualPrice !== undefined)
    .toArray();
  
  if (feedbacks.length === 0) return 0;
  
  const errors = await Promise.all(feedbacks.map(async f => {
    const eval = await db.evaluations.get(f.evalId);
    if (!eval) return 0;
    const decrypted = await decryptJSON(
      JSON.parse(new TextDecoder().decode(eval.encryptedPayload)),
      passphrase
    );
    return Math.abs(decrypted.valore_totale_eur - f.actualPrice!) / f.actualPrice!;
  }));
  
  return errors.reduce((a, b) => a + b, 0) / errors.length * 100;
}
```

**Hook e cifratura**
- La cifratura avviene prima di `add/put` e la decifratura dopo `get/where`.
- Modulo `crypto.ts` con funzioni `encrypt(json)→ArrayBuffer`, `decrypt(buf)→any` basate su Web Crypto API.
- La chiave è derivata da passphrase utente (PBKDF2/Argon2id) e mantenuta solo in memoria con **auto-lock**.

---

## 4. Sicurezza

### 4.1 Sicurezza di base
- HTTPS, rate limiting, nessun dato personale persistito.
- **Isolamento origin**: tutti i dati restano nello stesso origin; nessun tracking di terze parti.
- **Compliance scraping**: rispetto robots.txt, TOS dei portali; backoff esponenziale; user-agent identificabile; cache locale per ridurre richieste.

### 4.2 Cifratura client-side
- **Web Crypto API** (AES-GCM) per payload delle valutazioni salvate in IndexedDB.
- **Chiave derivata** da passphrase opzionale (PBKDF2 150k iterazioni, SHA-256).
- **Auto-lock**: chiave mantenuta in memoria con timeout configurabile (5/15/30 min, default 15).
- **Biometric unlock**: Web Authentication API su PWA mobile (optional).

### 4.3 Recovery key
- Generata automaticamente al primo setup (24 parole BIP39 o 32 caratteri base58).
- Hash salvato in `settings` per verifica.
- Permette recupero dati se passphrase dimenticata.

### 4.4 Content Security Policy
```ts
{
  "Content-Security-Policy": 
    "default-src 'self'; " +
    "script-src 'self' 'wasm-unsafe-eval'; " +
    "connect-src 'self' https://api.agenziaterritorio.it; " +
    "img-src 'self' data: https:; " +
    "style-src 'self' 'unsafe-inline'"
}
```

### 4.5 Subresource Integrity
```html
<!-- Se usi CDN per librerie -->
<script 
  src="https://cdn.example.com/lib.js"
  integrity="sha384-..."
  crossorigin="anonymous">
</script>
```

---

## 5. KPI
- **Accuratezza**: ±10% sul prezzo di transazione.
- **Parsing success rate**: >95%.
- **Performance**:
  - T90 parsing < 3s su rete 4G
  - Cold start < 2s su device mid-range
  - First Contentful Paint < 1.5s
- **Data quality score medio**: >75/100.
- **MAPE da feedback**: <12% (target).
- **Uptime**: 99.5% (considerando fallback offline-first).

---

## 6. Logica matematica del motore di valutazione

### 6.1 Definizioni
- \(A_c\): superficie commerciale [m²].
- \(P_{req}\): prezzo richiesto.
- Prezzo unitario da annuncio: \(p_{adv} = P_{req}/A_c\).

### 6.2 Valori OMI
- Intervallo \([p^{OMI}_{min}, p^{OMI}_{max}]\) per zona e categoria.
- Mediana: \(p^{OMI}_{med} = (p^{OMI}_{min}+p^{OMI}_{max})/2\).
- Aggiustato: \(p^{OMI}_{adj} = p^{OMI}_{med}\cdot f_{floor}\cdot f_{cond}\cdot f_{micro}\cdot \gamma_{type}\).

### 6.3 Comparabili
- Set \(C\) di immobili simili entro raggio \(r\).
- **Scoring similarità multi-criterio**:
  ```
  similarityScore = 0.25·distScore + 0.30·sizeScore + 0.15·roomScore + 0.10·floorScore + 0.20·condScore
  ```
  dove:
  - distScore = max(0, 100 - distance_km × 10)
  - sizeScore = 100 - |A_target - A_comp| / A_target × 100
  - roomScore = 100 se rooms uguali, 70 altrimenti
  - floorScore = 100 se |floor_diff| ≤ 2, 80 altrimenti
  - condScore = 100 se condition uguale, 85 altrimenti

- Peso \(w_i = w^{dist}_i\cdot w^{size}_i\cdot w^{time}_i\) solo per comparabili con `includedInEstimate = true`.
- Stima: \(p^{CMP} = \sum w_i p_i\).
- Filtraggio outlier con MAD (Median Absolute Deviation).

### 6.4 Modello edonico
- Regressione log-lineare:
  \[ \ln p = \beta_0 + \beta_A\ln A_c + \beta_F F + \beta_E E + \beta_S S + \beta_Y Y + \beta_B B + \varepsilon \]
- Stima \(\hat{\beta}\) con Ridge, validazione incrociata.
- Predizione: \(p^{HDN} = e^{\hat{\beta}^Tx}\).

### 6.5 Fusione stime
- Pesi di qualità: \(\alpha, \beta, \gamma\) da comparabili, OMI, edonico.
- Stima finale: \(p^* = \alpha p^{CMP} + \beta p^{OMI}_{adj} + \gamma p^{HDN}\).
- Valore totale: \(V = p^*A_c\).

### 6.6 Intervallo di confidenza
- Varianza combinata:
  \[ \sigma^2_{p^*} = \alpha^2\sigma^2_{CMP} + \beta^2\sigma^2_{OMI} + \gamma^2\sigma^2_{HDN}\]
- CI 90%: \(V \pm 1.64\,\sigma_{p^*}A_c\).

### 6.7 Coefficienti correttivi
- **Stato**: nuovo 1.10, buono 1.00, da ristrutturare 0.90.
- **Piano**: con ascensore 1.00, senza 0.93.
- **Classe energetica**: A 1.05 → G 0.92.
- **Pertinenze**: box +5%, cantina +2%, balcone +3%.

### 6.8 Output API
```json
{
  "valore_unitario_eur_m2": 4850,
  "valore_totale_eur": 412250,
  "ci90": {"low": 380000, "high": 445000},
  "scostamento_prezzo_richiesto_pct": -7.3,
  "pesi": {"cmp": 0.55, "omi": 0.20, "hdn": 0.25},
  "qualita": 78,
  "data_quality": 85,
  "similarity_scores": {
    "n_comparables": 12,
    "avg_similarity": 82,
    "included_count": 10
  }
}
```

### 6.9 Validazione
- Monitoraggio MAPE per zona da feedback utente.
- Alert se errore medio >15% per 3 settimane consecutive.
- Dashboard interna con metriche per portale e tipologia immobile.

---

## 7. Validazione Input

### 7.1 Schema Zod
```ts
import { z } from 'zod';

export const ManualInputSchema = z.object({
  address: z.string().min(10, "Indirizzo troppo breve"),
  city: z.string().min(2),
  cap: z.string().regex(/^\d{5}$/, "CAP non valido"),
  surface: z.number().min(15).max(1000, "Superficie irrealistica"),
  rooms: z.number().int().min(1).max(20),
  floor: z.number().int().min(-2).max(50),
  condition: z.enum(['nuovo', 'ottimo', 'buono', 'discreto', 'da_ristrutturare']),
  energyClass: z.enum(['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G', 'NC']),
  hasElevator: z.boolean(),
  hasBalcony: z.boolean(),
  hasParking: z.boolean().optional(),
  hasGarden: z.boolean().optional(),
  buildYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  askingPrice: z.number().min(10000).optional()
});

export type ManualInput = z.infer<typeof ManualInputSchema>;
```

### 7.2 Quality score calculation
```ts
export function calculateInputQuality(data: Partial<ManualInput>): number {
  const required = ['address', 'city', 'surface', 'rooms', 'floor', 'condition'];
  const optional = ['energyClass', 'buildYear', 'hasParking', 'askingPrice'];
  
  const reqScore = required.filter(k => data[k as keyof ManualInput]).length / required.length * 70;
  const optScore = optional.filter(k => data[k as keyof ManualInput]).length / optional.length * 30;
  
  return Math.round(reqScore + optScore);
}
```

---

## 8. Retry Logic e Resilienza

### 8.1 Fetch with retry
```ts
export async function fetchWithRetry(
  url: string,
  maxRetries = 3,
  backoffMs = 1000
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'HomeEstimate/1.0 (contact@homeestimate.it)'
        }
      });
      
      if (res.status === 429) { // Rate limit
        const retryAfter = res.headers.get('Retry-After');
        const waitMs = retryAfter 
          ? parseInt(retryAfter) * 1000 
          : backoffMs * Math.pow(2, i);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      
      if (res.ok) return res;
      
      if (res.status >= 500 && i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, backoffMs * Math.pow(2, i)));
        continue;
      }
      
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, backoffMs * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 8.2 Failed jobs processor
```ts
async function processJob(job: FailedJobRow): Promise<void> {
  switch (job.jobType) {
    case 'scraping':
      return await scrapeListing(job.url);
    case 'omi':
      return await fetchOMIData(job.url);
    case 'comparables':
      return await searchComparables(JSON.parse(job.url));
    default:
      throw new Error(`Unknown job type: ${job.jobType}`);
  }
}
```

---

## 9. Accessibilità e i18n
- **WCAG 2.2 AA**: contrasti, focus visibile, tasti rapidi, screen reader friendly.
- **Localizzazione**: IT/EN, numeri e valute locali, formati metri quadrati.
- **Keyboard navigation**: tutte le funzioni accessibili da tastiera.
- **ARIA labels**: descrizioni dettagliate per componenti interattivi.

---

## 10. Osservabilità locale
- Log diagnostici in IndexedDB, livelli: error, warn, info.
- **Pannello "Stato sistema"**:
  - Ultimi errori (10 più recenti)
  - Quota storage (progress bar con colori)
  - Cache status (OMI snapshots, comparabili)
  - Failed jobs (con possibilità di retry manuale)
  - MAPE corrente (da feedback)

---

## 11. Telemetria opzionale
- **Opt-in esplicito** con banner GDPR-compliant.
- Metriche anonime aggregate:
  - Performance: tempi parsing, tempi valutazione
  - Tassi di parsing per portale
  - Errori frequenti
  - Distribuzione quality scores
- **No PII**: nessun indirizzo, nessun dato personale, solo hash anonimi.

---

## 12. Piano test

### 12.1 Unit test
- Test parsing selettori per portale (Idealista, Immobiliare.it, Casa.it).
- Test validazione Zod su input edge cases.
- Test funzioni matematiche del motore di valutazione.
- Test crypto (encrypt/decrypt roundtrip).

### 12.2 Integration test
- Test di regressione su 100 annunci campione.
- Test quota IndexedDB e politiche eviction.
- Test migrazioni Dexie (v1→v7).
- Test retry logic con mock server (429, 500, timeout).

### 12.3 E2E test (Playwright)
```ts
test('full evaluation flow', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="url-input"]', SAMPLE_URL);
  await page.click('[data-testid="submit"]');
  
  // Attendi parsing
  await page.waitForSelector('[data-testid="preview"]');
  
  // Completa dati mancanti
  await page.fill('[data-testid="rooms"]', '3');
  await page.click('[data-testid="confirm"]');
  
  // Attendi risultato
  await page.waitForSelector('[data-testid="result"]', { timeout: 15000 });
  
  const value = await page.textContent('[data-testid="estimated-value"]');
  expect(Number(value?.replace(/[^\d]/g, ''))).toBeGreaterThan(100000);
});

test('offline mode', async ({ page, context }) => {
  // Simula offline
  await context.setOffline(true);
  
  await page.goto('/');
  await page.waitForSelector('[data-testid="offline-banner"]');
  
  // Carica valutazione da cache
  await page.click('[data-testid="history-item-0"]');
  await page.waitForSelector('[data-testid="cached-result"]');
});
```

### 12.4 Golden tests
```ts
test('valuation engine reproducibility', () => {
  const fixture = loadFixture('case_001.json');
  const result = calculateEstimate(fixture.input);
  
  expect(result.valore_totale_eur).toBe(fixture.expected.value);
  expect(result.pesi).toEqual(fixture.expected.weights);
  expect(result.qualita).toBe(fixture.expected.quality);
});
```

---

## 13. Compatibilità target
- **Browser moderni**:
  - Chrome ≥ 109
  - Edge ≥ 109
  - Firefox ≥ 108
  - Safari ≥ 16.4
- **Mobile**: iOS/Android ultimi 2 major.
- **Progressive Enhancement**: fallback graceful per browser più vecchi (no IndexedDB → solo localStorage temporaneo).

---

## 14. Roadmap e Priorità (MoSCoW)

### 14.1 Must Have (v1.0) ✅
- ✅ Parsing Idealista + Immobiliare.it + Casa.it
- ✅ Cifratura client-side (AES-GCM + PBKDF2)
- ✅ Valutazione base (OMI + comparabili + edonico)
- ✅ Export PDF
- ✅ Validazione input Zod
- ✅ Wizard multi-step
- ✅ PWA offline-first

### 14.2 Should Have (v1.1)
- Recovery key (24 parole BIP39)
- Editor comparabili avanzato
- Retry logic con failedJobs
- Feedback utente con MAPE tracking
- Auto-lock passphrase
- Heatmap zone
- Export CSV comparabili
- **✨ Calcolatore Finanziario** (feature 2.10): mutuo, TCO, buy vs rent

### 14.3 Could Have (v1.2)
- Link condivisibili cifrati (scadenza 7gg)
- Stima tempi vendita
- Biometric unlock PWA
- Dashboard analytics interna
- Supporto portali aggiuntivi (Subito.it, Bakeca)
- Notifiche push per nuovi comparabili
- **✨ Analisi Trend Temporale** (feature 2.8): storico prezzi, previsioni
- **✨ Simulatore "Cosa Succede Se..."** (feature 2.9): ROI ristrutturazioni
- **✨ Report Investment Analysis base** (feature 2.11): 10-15 pagine

### 14.4 Won't Have (ora, ma Q4 2025+)
- Sincronizzazione cloud (→ Fase 2)
- Multi-utente / team
- API pubblica
- Machine learning avanzato (es. computer vision per foto)
- Integrazione mutui/finanziamenti esterni
- **Report Investment Analysis premium** (30+ pagine con Monte Carlo)

### 14.5 Fase 2 (Q3-Q4 2025)
- Database server-side (PostgreSQL)
- Cache distribuita (Redis)
- Sincronizzazione multi-device
- Ruoli e permessi (team)
- Audit log
- API pubblica con rate limiting
- Dashboard admin
- **Batch reports** generation
- **Historical data aggregation** server-side

---

## 15. UI Components

### 15.1 Storage Status Widget
```tsx
export function StorageStatus() {
  const [usage, setUsage] = useState<StorageEstimate | null>(null);
  const [dbUsage, setDbUsage] = useState<number>(0);
  
  useEffect(() => {
    navigator.storage.estimate().then(est => setUsage(est));
    estimateUsageMB().then(mb => setDbUsage(mb));
  }, []);
  
  if (!usage) return null;
  
  const pct = (usage.usage! / usage.quota!) * 100;
  const color = pct > 80 ? 'red' : pct > 60 ? 'orange' : 'green';
  
  return (
    <div className="storage-meter p-4 border rounded">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium">Spazio utilizzato</span>
        <span className="text-sm text-gray-600">
          {formatBytes(usage.usage)} / {formatBytes(usage.quota)}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="mt-2 text-xs text-gray-500">
        DB: ~{dbUsage.toFixed(1)} MB
      </div>
      {pct > 80 && (
        <button 
          onClick={async () => {
            await pruneExpiredCache();
            await evictOldComparables();
            window.location.reload();
          }}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          Libera spazio
        </button>
      )}
    </div>
  );
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
```

### 15.2 Comparables Editor
```tsx
export function ComparablesEditor({ evalId }: { evalId: number }) {
  const [comparables, setComparables] = useState<ComparableRow[]>([]);
  const [estimatedValue, setEstimatedValue] = useState<number>(0);
  
  useEffect(() => {
    loadComparables();
  }, [evalId]);
  
  async function loadComparables() {
    const comps = await db.comparables.where('evalId').equals(evalId).toArray();
    setComparables(comps);
    recalculateEstimate(comps);
  }
  
  async function toggleInclude(id: number) {
    const comp = comparables.find(c => c.id === id);
    if (!comp) return;
    
    await db.comparables.update(id, {
      includedInEstimate: !comp.includedInEstimate
    });
    
    const updated = comparables.map(c => 
      c.id === id ? { ...c, includedInEstimate: !c.includedInEstimate } : c
    );
    setComparables(updated);
    recalculateEstimate(updated);
  }
  
  function recalculateEstimate(comps: ComparableRow[]) {
    const included = comps.filter(c => c.includedInEstimate);
    if (included.length === 0) {
      setEstimatedValue(0);
      return;
    }
    const avg = included.reduce((sum, c) => sum + c.priceM2, 0) / included.length;
    setEstimatedValue(avg); // semplificato, in realtà usa pesi
  }
  
  return (
    <div className="comparables-editor">
      <h3 className="text-lg font-semibold mb-4">
        Comparabili ({comparables.filter(c => c.includedInEstimate).length}/{comparables.length} inclusi)
      </h3>
      
      <div className="mb-4 p-3 bg-blue-50 rounded">
        <span className="font-medium">Stima corrente: </span>
        <span className="text-xl">€ {estimatedValue.toFixed(0)}/m²</span>
      </div>
      
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Includi</th>
            <th className="text-left p-2">Distanza</th>
            <th className="text-left p-2">€/m²</th>
            <th className="text-left p-2">Similarità</th>
          </tr>
        </thead>
        <tbody>
          {comparables.map(comp => (
            <tr key={comp.id} className="border-b hover:bg-gray-50">
              <td className="p-2">
                <input
                  type="checkbox"
                  checked={comp.includedInEstimate}
                  onChange={() => toggleInclude(comp.id!)}
                />
              </td>
              <td className="p-2">{comp.distance.toFixed(2)} km</td>
              <td className="p-2">€ {comp.priceM2.toFixed(0)}</td>
              <td className="p-2">
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-green-500"
                      style={{ width: `${comp.similarityScore}%` }}
                    />
                  </div>
                  <span>{comp.similarityScore}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Appendice A – `crypto.ts` (Web Crypto API)

Implementazione completa per cifrare/decifrare payload JSON prima di salvarli in IndexedDB.

```ts
// crypto.ts – AES-GCM + PBKDF2 (SHA-256)
// Nota: Argon2 richiede libreria esterna; qui usiamo PBKDF2 nativo Web Crypto.

const ENC = new TextEncoder();
const DEC = new TextDecoder();

function b64e(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64d(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export function randomBytes(len: number): Uint8Array {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return a;
}

export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations = 150_000
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    ENC.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export type EncryptedPayload = {
  v: 1;
  alg: 'AES-GCM';
  kdf: 'PBKDF2-SHA256';
  iter: number;
  salt: string; // base64
  iv: string;   // base64 (12 byte)
  ct: string;   // base64 ciphertext
};

export async function encryptJSON(
  obj: any,
  passphrase: string,
  iterations = 150_000
): Promise<EncryptedPayload> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(passphrase, salt, iterations);
  const plaintext = ENC.encode(JSON.stringify(obj));
  const ctBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  
  return {
    v: 1,
    alg: 'AES-GCM',
    kdf: 'PBKDF2-SHA256',
    iter: iterations,
    salt: b64e(salt.buffer),
    iv: b64e(iv.buffer),
    ct: b64e(ctBuf)
  };
}

export async function decryptJSON(
  payload: EncryptedPayload,
  passphrase: string
): Promise<any> {
  if (payload.v !== 1 || payload.alg !== 'AES-GCM') {
    throw new Error('Formato non supportato');
  }
  
  const salt = new Uint8Array(b64d(payload.salt));
  const iv = new Uint8Array(b64d(payload.iv));
  const key = await deriveKey(passphrase, salt, payload.iter);
  const ctBuf = b64d(payload.ct);
  
  try {
    const ptBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ctBuf);
    return JSON.parse(DEC.decode(ptBuf));
  } catch (err) {
    throw new Error('Decifratura fallita: passphrase errata o dati corrotti');
  }
}

// Hash indirizzo normalizzato → addressHash (SHA-256, hex)
export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', ENC.encode(text));
  return [...new Uint8Array(buf)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Session key manager con auto-lock
export class SessionKeyManager {
  private key: CryptoKey | null = null;
  private lockTimer: number | null = null;
  private autoLockMinutes: number = 15;
  
  constructor(autoLockMinutes: number = 15) {
    this.autoLockMinutes = autoLockMinutes;
  }
  
  async unlock(passphrase: string, salt: Uint8Array): Promise<void> {
    this.key = await deriveKey(passphrase, salt);
    this.resetLockTimer();
  }
  
  lock(): void {
    this.key = null;
    if (this.lockTimer !== null) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }
  }
  
  getKey(): CryptoKey | null {
    if (this.key) {
      this.resetLockTimer(); // Refresh timer on access
    }
    return this.key;
  }
  
  isUnlocked(): boolean {
    return this.key !== null;
  }
  
  private resetLockTimer(): void {
    if (this.lockTimer !== null) {
      clearTimeout(this.lockTimer);
    }
    
    if (this.autoLockMinutes > 0) {
      this.lockTimer = window.setTimeout(
        () => this.lock(),
        this.autoLockMinutes * 60000
      );
    }
  }
}

// Recovery key generation (BIP39-like, simplified)
export function generateRecoveryKey(): string {
  const bytes = randomBytes(32);
  return b64e(bytes.buffer).substring(0, 32); // 32 caratteri base64
}

export async function hashRecoveryKey(recoveryKey: string): Promise<string> {
  return await sha256Hex(recoveryKey);
}
```

**Uso tipico**
```ts
// Inizializzazione session manager
const sessionKeyManager = new SessionKeyManager(15); // 15 min auto-lock

// Unlock all'avvio
await sessionKeyManager.unlock(userPassphrase, salt);

// Salvataggio valutazione
const payload = await encryptJSON(evaluationObject, passphrase);
await db.evaluations.add({
  createdAt: Date.now(),
  updatedAt: Date.now(),
  rawUrl,
  addressHash: await sha256Hex(normalizedAddress),
  city,
  omiZone,
  status: 'ready',
  dataQuality: calculateInputQuality(evaluationObject),
  dataSource: 'auto',
  encryptedPayload: new TextEncoder().encode(JSON.stringify(payload))
});

// Lettura valutazione
const row = await db.evaluations.get(id);
if (!row) throw new Error('Valutazione non trovata');

const payloadStr = new TextDecoder().decode(row.encryptedPayload);
const payload: EncryptedPayload = JSON.parse(payloadStr);
const decrypted = await decryptJSON(payload, passphrase);
```

---

## Appendice B – `validation.ts` (Validazione Input)

```ts
import { z } from 'zod';

export const ManualInputSchema = z.object({
  address: z.string().min(10, "Indirizzo troppo breve"),
  city: z.string().min(2),
  cap: z.string().regex(/^\d{5}$/, "CAP non valido"),
  surface: z.number().min(15).max(1000, "Superficie irrealistica"),
  rooms: z.number().int().min(1).max(20),
  floor: z.number().int().min(-2).max(50),
  condition: z.enum(['nuovo', 'ottimo', 'buono', 'discreto', 'da_ristrutturare']),
  energyClass: z.enum(['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G', 'NC']),
  hasElevator: z.boolean(),
  hasBalcony: z.boolean(),
  hasParking: z.boolean().optional(),
  hasGarden: z.boolean().optional(),
  buildYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  askingPrice: z.number().min(10000).optional()
});

export type ManualInput = z.infer<typeof ManualInputSchema>;

export function calculateInputQuality(data: Partial<ManualInput>): number {
  const required: Array<keyof ManualInput> = [
    'address', 'city', 'surface', 'rooms', 'floor', 'condition'
  ];
  const optional: Array<keyof ManualInput> = [
    'energyClass', 'buildYear', 'hasParking', 'askingPrice'
  ];
  
  const reqScore = required.filter(k => data[k] !== undefined).length / required.length * 70;
  const optScore = optional.filter(k => data[k] !== undefined).length / optional.length * 30;
  
  return Math.round(reqScore + optScore);
}

export function getMissingFields(data: Partial<ManualInput>): string[] {
  const required: Array<keyof ManualInput> = [
    'address', 'city', 'cap', 'surface', 'rooms', 'floor', 
    'condition', 'energyClass', 'hasElevator', 'hasBalcony'
  ];
  
  return required.filter(k => data[k] === undefined);
}
```

---

## Appendice C – `comparables.ts` (Scoring Similarità)

```ts
export interface Property {
  surface: number;
  rooms: number;
  floor: number;
  condition: string;
  distance: number; // km
}

export function calculateSimilarity(target: Property, comp: Property): number {
  // Distance score: -10 punti per km
  const distScore = Math.max(0, 100 - comp.distance * 10);
  
  // Size score: penalità proporzionale alla differenza percentuale
  const sizeDiff = Math.abs(target.surface - comp.surface) / target.surface * 100;
  const sizeScore = Math.max(0, 100 - sizeDiff);
  
  // Room score: match esatto 100, altrimenti 70
  const roomScore = target.rooms === comp.rooms ? 100 : 70;
  
  // Floor score: differenza <= 2 piani = 100, altrimenti 80
  const floorDiff = Math.abs(target.floor - comp.floor);
  const floorScore = floorDiff <= 2 ? 100 : 80;
  
  // Condition score: match esatto 100, altrimenti 85
  const condScore = target.condition === comp.condition ? 100 : 85;
  
  // Weighted average
  return Math.round(
    distScore * 0.25 +
    sizeScore * 0.30 +
    roomScore * 0.15 +
    floorScore * 0.10 +
    condScore * 0.20
  );
}

// Filtraggio outlier con MAD (Median Absolute Deviation)
export function filterOutliers(prices: number[], threshold: number = 3): number[] {
  if (prices.length < 4) return prices;
  
  const sorted = [...prices].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  const deviations = prices.map(p => Math.abs(p - median));
  const mad = deviations.sort((a, b) => a - b)[Math.floor(deviations.length / 2)];
  
  if (mad === 0) return prices; // Tutti i valori uguali
  
  return prices.filter(p => Math.abs(p - median) / mad < threshold);
}
```

---

## Appendice D – Riepilogo Nuove Funzionalità Avanzate

### Feature 2.8: Analisi Trend Temporale
**Valore:** Decisioni di timing basate su dati storici e previsioni  
**Implementazione:**
- Tabella `priceTrends` con 5 anni di storico per zona
- Grafici interattivi (line chart, calendar heatmap, bar variazioni)
- Algoritmo previsionale (regressione lineare / ARIMA)
- Identificazione stagionalità e momentum mercato
- Alert automatici su variazioni significative

**Impatto utente:** "Questo è il momento giusto per comprare/vendere?"

### Feature 2.9: Simulatore "Cosa Succede Se..."
**Valore:** Pianificazione interventi data-driven con ROI  
**Implementazione:**
- Libreria 12+ scenari ristrutturazione predefiniti
- Calcolo impatto valore con fattori zona/tipologia/età
- Editor interattivo con combinazione interventi
- Timeline lavori con Gantt chart
- Export piano ristrutturazione PDF

**Impatto utente:** "Quali lavori mi conviene fare e in che ordine?"

### Feature 2.10: Calcolatore Finanziario Integrato
**Valore:** Visione completa Total Cost of Ownership  
**Implementazione:**
- Simulatore mutuo con piano ammortamento (francese/italiano)
- Calcolo costi acquisto (notaio, agenzia, imposte)
- Analisi costi ricorrenti (condominio, IMU, TARI, manutenzione)
- Comparazione Buy vs Rent con NPV
- Analisi sostenibilità rata su stipendio
- Proiezione vendita futura con capital gain

**Impatto utente:** "Posso davvero permettermelo? Conviene comprare o affittare?"

### Feature 2.11: Report Avanzati "Investment Analysis"
**Valore:** Professionalità per investitori seri, banche, consulenti  
**Implementazione:**
- Report strutturato 25-35 pagine
- Sezioni: Executive Summary, Analisi Mercato, Due Diligence, Scenari
- Grafici professionali (Chart.js/Recharts)
- Export PDF/DOCX/XLSX
- Watermarking e verifica autenticità (QR code + hash)
- Pricing tier: base gratuito, completo premium

**Impatto utente:** "Ho bisogno di un documento professionale per la banca/investitori"

### Sinergie tra Features
Le quattro nuove funzionalità si integrano perfettamente:
1. **Trend** → mostra se è il momento giusto
2. **Simulatore** → ottimizza l'investimento
3. **Calcolatore** → verifica sostenibilità finanziaria
4. **Report** → documenta tutto per terze parti

**Percorso utente completo:**
```
[Valutazione base] 
  ↓
[Trend] → "I prezzi stanno crescendo del 3% annuo"
  ↓
[Simulatore] → "Con ristrutturazione bagno, +€12k valore"
  ↓
[Calcolatore] → "Rata mutuo €850/mese (28% stipendio) ✓ sostenibile"
  ↓
[Report] → PDF 30 pagine per la banca
  ↓
[Decisione d'acquisto informata! 🎯]
```

---

**Fine documento**

*Versione: 3.0*  
*Ultimo aggiornamento: 2025-10-21*  
*Changelog v3.0: Aggiunte features 2.8 (Trend Temporale), 2.9 (Simulatore), 2.10 (Calcolatore Finanziario), 2.11 (Report Investment Analysis)*  
*Autore: Team HomeEstimate*
