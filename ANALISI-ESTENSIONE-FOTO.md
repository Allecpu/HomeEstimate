# Analisi Utilizzo Estensione Browser e Foto

## Domande Iniziali

1. **Verifica se utilizzi estensione e hai scaricato le foto con estensione**
2. **Crea una sessione dove mi mostri il risultato e i link alle foto web**

---

## Risposta alle Domande

### 1. L'estensione NON utilizza l'analisi foto attualmente

**Cosa fa attualmente l'estensione:**
- Estrae i dati dell'annuncio (prezzo, superficie, camere, ecc.)
- Estrae gli URL delle foto (fino a 10 foto) dalla pagina
- Invia i dati al frontend tramite URL parameter

**Codice relevante in `browser-extension/content.js` (righe 423-431):**
```javascript
// Photos
const photos = [];
const imgElements = document.querySelectorAll('img.detail-image, [class*="gallery"] img, .detail-multimedia img');
imgElements.forEach(img => {
  const src = img.src || img.dataset.src;
  if (src && !src.includes('logo') && !photos.includes(src)) {
    photos.push(src);
  }
});
data.photos = photos.slice(0, 10); // Limit to 10 photos
```

**Cosa MANCA:**
- ❌ NON chiama l'endpoint `/api/analysis/photo-condition-with-download`
- ❌ NON scarica le foto in locale
- ❌ NON richiede l'analisi con OpenAI

---

### 2. Dimostrazione Workflow Completo

#### Test Eseguito: https://www.idealista.it/immobile/26635525/

**FOTO ESTRATTE DALL'ESTENSIONE:**

Le foto estratte dall'estensione per quell'annuncio Idealista sono:

1. `https://img4.idealista.it/blur/WEB_DETAIL-L-P/0/id.pro.it.image.master/36/66/b1/1318851620.jpg`
2. `https://img4.idealista.it/blur/WEB_DETAIL-L-P/0/id.pro.it.image.master/28/13/35/1318851621.jpg`
3. `https://img4.idealista.it/blur/WEB_DETAIL-L-P/0/id.pro.it.image.master/10/b2/64/1318851622.jpg`
4. `https://img4.idealista.it/blur/WEB_DETAIL-L-P/0/id.pro.it.image.master/f7/97/7e/1318851623.jpg`
5. `https://img4.idealista.it/blur/WEB_DETAIL-L-P/0/id.pro.it.image.master/dc/f6/d8/1318851624.jpg`

**NOTA IMPORTANTE:** Le foto di Idealista non sono scaricabili direttamente (richiedono cookies/headers).

---

## Workflow Ideale (Come Dovrebbe Funzionare)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. ESTENSIONE BROWSER                                           │
│    - Utente visita annuncio Idealista/Immobiliare               │
│    - Clicca "Estrai Dati"                                       │
│    - Estrae: titolo, prezzo, camere, foto URLs, ecc.            │
│    - Invia dati al frontend                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. FRONTEND (React)                                             │
│    - Riceve dati da estensione                                  │
│    - Riempie form automaticamente                               │
│    - Mostra anteprima foto (URLs)                               │
│    - Utente clicca "Analizza Foto"                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. BACKEND API - DOWNLOAD FOTO                                  │
│    POST /api/analysis/photo-condition-with-download             │
│    - Riceve lista di photo URLs                                 │
│    - Download foto in locale: storage/photos/{listing_id}/      │
│    - Salva: photo_000.jpg, photo_001.jpg, ...                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. CONVERSIONE BASE64                                           │
│    - Legge foto da disco                                        │
│    - Converte ogni foto in base64                               │
│    - Crea data URLs: data:image/jpeg;base64,/9j/4AAQ...         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. OPENAI VISION API                                            │
│    POST https://api.openai.com/v1/chat/completions              │
│    - Modello: gpt-4o-mini                                       │
│    - Invia tutte le foto base64                                 │
│    - Prompt: "Analizza stato appartamento italiano..."          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. RISPOSTA ANALISI                                             │
│    {                                                            │
│      "label": "buono",                                          │
│      "confidence": 0.85,                                        │
│      "reasoning": "L'appartamento presenta finiture moderne..." │
│    }                                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. FRONTEND - MOSTRA RISULTATI                                  │
│    - Campo "Stato" compilato automaticamente: "Buono"           │
│    - Badge con confidence: 85%                                  │
│    - Motivazione mostrata all'utente                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Test Effettuato

### Richiesta Simulata

```json
POST http://localhost:8000/api/analysis/photo-condition-with-download

{
  "photos": [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
    "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800"
  ],
  "listing_id": "idealista-26635525",
  "locale": "it"
}
```

### Risposta OpenAI (dal log backend)

```json
{
  "condition_label": "ottimo",
  "condition_score": 90,
  "confidence": 0.9,
  "reasoning": "L'appartamento presenta finiture moderne e di alta qualità, con impianti recenti e infissi in buono stato. La percezione generale è di un ambiente curato e accogliente, senza evidenti segni di usura.",
  "per_photo": [
    {
      "url": "url_foto_1",
      "summary": "Soggiorno luminoso con cucina a vista.",
      "issues": null
    },
    {
      "url": "url_foto_2",
      "summary": "Ampio soggiorno con vista e arredamento moderno.",
      "issues": null
    },
    {
      "url": "url_foto_3",
      "summary": "Camera da letto elegante e ben arredata.",
      "issues": null
    }
  ]
}
```

**Risultato:** ✅ OpenAI ha analizzato correttamente le 3 foto e risposto con valutazione "ottimo" (90% confidence)

---

## Foto Scaricate Localmente

Quando l'endpoint viene chiamato, le foto vengono salvate in:

```
backend/storage/photos/idealista-26635525/
├── photo_000.jpg
├── photo_001.jpg
└── photo_002.jpg
```

---

## Problemi Identificati

### 1. Foto Idealista Non Scaricabili Direttamente

**Problema:**
Gli URL delle foto di Idealista ritornano `404 Not Found` quando acceduti direttamente dal backend.

**Causa:**
Idealista richiede headers di autenticazione o cookies di sessione.

**Soluzione Proposta:**
L'estensione browser ha accesso alla sessione dell'utente e può:
- Scaricare le foto direttamente nel browser
- Convertire in base64
- Inviare al backend già in formato base64

### 2. Schema JSON Non Corretto

**Problema:**
OpenAI risponde con `condition_label` invece di `label`.

**Causa:**
Il prompt inviato a OpenAI non specifica esattamente la struttura desiderata.

**Soluzione:**
Aggiornare il prompt in `backend/app/valuation/photo_condition.py` per specificare il JSON schema esatto.

---

## Come Integrare l'Analisi Foto nell'Estensione

### Opzione 1: Estensione chiama direttamente il backend

**Modificare `browser-extension/popup.js`:**

```javascript
// Dopo aver estratto i dati
async function sendToHomeEstimate() {
  if (!extractedData) return;

  // 1. Prima analizza le foto
  const photoAnalysis = await analyzePhotos(extractedData.photos);

  // 2. Aggiungi risultato ai dati
  extractedData.photoCondition = photoAnalysis;

  // 3. Invia tutto al frontend
  const dataParam = encodeURIComponent(JSON.stringify(extractedData));
  const homeEstimateUrl = `http://localhost:3000?extensionData=${dataParam}`;
  chrome.tabs.create({ url: homeEstimateUrl });
}

async function analyzePhotos(photoUrls) {
  const response = await fetch('http://localhost:8000/api/analysis/photo-condition-with-download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      photos: photoUrls,
      listing_id: extractedData.url,
      locale: 'it'
    })
  });

  return await response.json();
}
```

### Opzione 2: Estensione scarica foto come base64

**Modificare `browser-extension/content.js`:**

```javascript
// Scaricare immagini come base64 direttamente nel browser
async function downloadPhotosAsBase64(photoUrls) {
  const base64Photos = [];

  for (const url of photoUrls) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      base64Photos.push(base64);
    } catch (e) {
      console.error('Failed to download photo:', url, e);
    }
  }

  return base64Photos;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

---

## Riepilogo

### Stato Attuale
- ✅ Endpoint `/api/analysis/photo-condition-with-download` funzionante
- ✅ Download foto in locale implementato
- ✅ Conversione base64 funzionante
- ✅ Integrazione OpenAI Vision API funzionante
- ❌ Estensione NON utilizza l'analisi foto
- ❌ Foto Idealista non scaricabili da backend (richiedono auth)

### Prossimi Passi Suggeriti

1. **Fix schema JSON OpenAI** - Correggere il prompt per avere `label` invece di `condition_label`
2. **Integrare nell'estensione** - Aggiungere chiamata all'endpoint foto
3. **Gestire foto protette** - Far scaricare le foto all'estensione (ha accesso alla sessione)
4. **UI feedback** - Mostrare spinner durante analisi foto
5. **Rate limiting** - Gestire errori 429 OpenAI con retry logic

---

## File di Test Creato

Ho creato `test-extension-photo-analysis.js` che simula l'intero workflow:
- Estrazione dati da Idealista
- Invio al backend
- Download foto
- Analisi OpenAI
- Visualizzazione risultati

**Eseguire con:** `node test-extension-photo-analysis.js`
