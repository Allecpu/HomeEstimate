# HomeEstimate - Browser Extension

Estensione per Chrome/Edge che estrae automaticamente i dati dagli annunci immobiliari e li invia all'applicazione HomeEstimate.

## Caratteristiche

- ✅ Estrae dati da **Idealista.it**, **Immobiliare.it** e **Casa.it**
- ✅ Funziona direttamente nel browser (nessun problema con anti-bot)
- ✅ Interface grafica semplice e intuitiva
- ✅ Invio automatico dei dati a HomeEstimate
- ✅ Copia dati in JSON per backup

## Installazione

### 1. Carica l'estensione in Chrome/Edge

1. Apri Chrome o Edge
2. Vai su `chrome://extensions` (o `edge://extensions`)
3. Attiva la **Modalità sviluppatore** (toggle in alto a destra)
4. Clicca su **Carica estensione non pacchettizzata**
5. Seleziona la cartella `C:\Github\HomeEstimate\browser-extension`
6. L'estensione verrà installata

![Extension Icon](https://img.icons8.com/color/48/000000/home.png)

### 2. Verifica installazione

Dovresti vedere l'icona dell'estensione nella barra degli strumenti del browser.
Se non la vedi, clicca sull'icona del puzzle e fissa l'estensione.

## Come Usare

### Metodo 1: Estrazione Automatica

1. **Vai su un annuncio** (es: https://www.idealista.it/immobile/32970155/)
2. L'estensione **estrae automaticamente** i dati in background
3. **Clicca sull'icona** dell'estensione
4. Vedrai i dati estratti in anteprima
5. Clicca **"Invia a HomeEstimate"**
6. Verrai reindirizzato a HomeEstimate con i dati già caricati

### Metodo 2: Estrazione Manuale

1. Vai su un annuncio immobiliare
2. Clicca sull'icona dell'estensione
3. Clicca **"Estrai Dati da Questa Pagina"**
4. Clicca **"Invia a HomeEstimate"**

### Metodo 3: Copia Dati

1. Estrai i dati come sopra
2. Clicca **"Copia Dati"**
3. I dati vengono copiati in formato JSON
4. Incollali dove preferisci

## Dati Estratti

L'estensione estrae automaticamente:

### Idealista.it
- ✅ Titolo annuncio
- ✅ Prezzo
- ✅ Indirizzo
- ✅ Città
- ✅ Superficie (m²)
- ✅ Numero locali
- ✅ Numero camere
- ✅ Numero bagni
- ✅ Piano
- ✅ Ascensore (sì/no)
- ✅ Parcheggio/Garage (sì/no)
- ✅ Balcone/Terrazza (sì/no)
- ✅ Descrizione completa
- ✅ Foto (fino a 10)

### Immobiliare.it
- ✅ Titolo
- ✅ Prezzo
- ✅ Superficie
- ✅ Numero locali/camere/bagni
- ✅ Piano

### Casa.it
- ✅ Titolo
- ✅ Prezzo

## Troubleshooting

### L'estensione non estrae dati

**Causa**: La pagina potrebbe non essere completamente caricata

**Soluzione**:
1. Attendi che la pagina sia completamente caricata
2. Clicca sull'icona dell'estensione
3. Clicca "Estrai Dati da Questa Pagina"

### "Questa pagina non è supportata"

**Causa**: Sei su una pagina che non è un annuncio

**Soluzione**: Vai su un annuncio specifico (URL deve contenere `/immobile/` per Idealista)

### L'invio a HomeEstimate non funziona

**Causa 1**: HomeEstimate non è in esecuzione

**Soluzione**: Avvia HomeEstimate su http://localhost:3001

**Causa 2**: Porto diverso

**Soluzione**: Verifica che il frontend sia su porta 3001

### I dati non appaiono in HomeEstimate

**Causa**: localStorage potrebbe essere disabilitato

**Soluzione**:
1. Vai su HomeEstimate (http://localhost:3001)
2. Apri Developer Tools (F12)
3. Vai su Console
4. Digita: `localStorage.getItem('homeEstimateExtensionData')`
5. Se vedi i dati, ricarica la pagina

## Sviluppo

### Struttura File

```
browser-extension/
├── manifest.json         # Configurazione extension
├── content.js           # Script estrazione dati
├── popup.html           # UI popup
├── popup.js             # Logica popup
├── injector.js          # Inietta dati in HomeEstimate
├── icons/               # Icone extension
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # Questa documentazione
```

### Debug

1. Vai su `chrome://extensions`
2. Trova "HomeEstimate - Estrattore Annunci"
3. Clicca su **"Ispeziona visualizzazioni"** → **"popup.html"**
4. Si aprirà il Developer Tools per il popup
5. Controlla la Console per errori

Per debug del content script:
1. Vai su un annuncio Idealista
2. Apri Developer Tools (F12)
3. Vai su Console
4. Cerca messaggi che iniziano con "HomeEstimate:"

## Aggiornamenti

Per aggiornare l'estensione dopo modifiche al codice:

1. Vai su `chrome://extensions`
2. Trova l'estensione
3. Clicca sull'icona **Ricarica** (🔄)

## Sicurezza e Privacy

- ✅ **Nessun dato inviato a server esterni**
- ✅ **Funziona solo su localhost**
- ✅ **Codice open source**
- ✅ **Nessun tracking o analytics**
- ✅ **Dati memorizzati solo localmente**

## Limitazioni

- ⚠️ Funziona solo con **Chrome** e **Edge** (Manifest V3)
- ⚠️ Richiede che HomeEstimate sia in esecuzione
- ⚠️ I siti potrebbero cambiare struttura HTML (richiede aggiornamento)

## Supporto

Per problemi o domande:
1. Controlla la Console del browser per errori
2. Verifica che HomeEstimate sia in esecuzione
3. Ricarica l'estensione
4. Riavvia il browser se necessario

## Licenza

Questo progetto fa parte di HomeEstimate.

---

**Versione**: 1.0.0
**Ultimo aggiornamento**: 2025-01-22
