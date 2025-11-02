# Come Installare l'Estensione HomeEstimate

## ✅ Prerequisiti Completati

- ✓ Icone generate
- ✓ Manifest validato
- ✓ File necessari presenti
- ✓ Debug logging aggiunto

## 📦 Installazione dell'Estensione

### Passo 1: Apri la pagina delle estensioni di Chrome

1. Apri **Google Chrome**
2. Nella barra degli indirizzi, digita: `chrome://extensions/`
3. Premi **Invio**

### Passo 2: Attiva la Modalità Sviluppatore

1. In alto a destra della pagina, troverai un interruttore **"Modalità sviluppatore"**
2. Cliccaci sopra per attivarlo (diventerà blu)

### Passo 3: Carica l'estensione

1. Clicca sul pulsante **"Carica estensione non pacchettizzata"** (in alto a sinistra)
2. Si aprirà una finestra di selezione cartella
3. Naviga fino a: `C:\Users\allec\OneDrive\Documenti\GitHub\HomeEstimate\browser-extension`
4. Seleziona la cartella **browser-extension** (NON aprirla, selezionala)
5. Clicca **"Seleziona cartella"**

### Passo 4: Verifica l'installazione

Dovresti vedere la card dell'estensione con:
- **Nome**: HomeEstimate - Estrattore Annunci
- **Versione**: 1.0.0
- **Interruttore attivo** (blu)
- **Icona** dell'estensione

Se vedi errori in rosso, copia il messaggio e condividilo per risolverlo.

## 🚀 Come Usare l'Estensione

### Passo 1: Vai su una pagina di annuncio

Apri una di queste pagine:
- **Idealista.it**: https://www.idealista.it/immobile/[QUALSIASI_ID]/
- **Immobiliare.it**: https://www.immobiliare.it/[QUALSIASI_ANNUNCIO]/
- **Casa.it**: https://www.casa.it/[QUALSIASI_ANNUNCIO]/

### Passo 2: Clicca sull'icona dell'estensione

1. Nella toolbar di Chrome (in alto a destra), cerca l'icona dell'estensione HomeEstimate
2. **Clicca sull'icona**
3. Si aprirà un popup viola

### Passo 3: Estrai i dati

1. Nel popup, clicca sul pulsante **"Estrai Dati da Questa Pagina"**
2. Attendi qualche secondo
3. Dovresti vedere un messaggio di successo con i dati estratti

### Passo 4: Invia i dati a HomeEstimate

1. (Opzionale) Clicca **"Scarica Foto per AI"** se vuoi analizzare le foto
2. Clicca **"Invia a HomeEstimate"**
3. Si aprirà una nuova tab con l'app HomeEstimate precompilata!

## 🔧 Debug e Risoluzione Problemi

### Se il pulsante "Estrai Dati" non funziona:

1. **Click destro sul popup** dell'estensione
2. Seleziona **"Ispeziona"** (o "Inspect")
3. Si aprirà la console DevTools
4. Guarda se ci sono errori in rosso
5. Copia e incolla gli errori per ottenere supporto

### Se l'estensione non appare:

1. Vai su `chrome://extensions/`
2. Verifica che **"HomeEstimate - Estrattore Annunci"** sia nella lista
3. Verifica che l'interruttore sia **blu (attivo)**
4. Se vedi errori, clicca su **"Dettagli"** e leggi il messaggio

### Se vedi "Questa pagina non è supportata":

- Assicurati di essere su una pagina di annuncio di Idealista, Immobiliare o Casa.it
- **NON** sulla homepage, ma su una pagina specifica di un immobile

## 📝 Log di Debug

L'estensione ora ha logging dettagliato. Per vedere i log:

1. Apri il popup dell'estensione
2. Click destro → Ispeziona
3. Nella console vedrai messaggi come:
   - `HomeEstimate Popup: Script loaded`
   - `HomeEstimate Popup: Extract button listener attached`
   - `HomeEstimate Popup: Extract button clicked`

Questi messaggi ti aiuteranno a capire se l'estensione sta funzionando.

## ✅ Test Rapido

Per testare rapidamente:

1. Vai su: https://www.idealista.it/
2. Cerca un immobile qualsiasi
3. Apri l'annuncio
4. Clicca sull'icona dell'estensione HomeEstimate
5. Clicca "Estrai Dati da Questa Pagina"
6. Dovresti vedere i dati dell'immobile nel popup!

---

**Nota**: Se hai problemi, apri la console DevTools del popup e condividi gli errori che vedi.
