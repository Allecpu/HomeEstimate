# 💾 Analisi AI Persistente - Documentazione

## 🎯 Obiettivo

Implementare il salvataggio automatico delle analisi AI delle foto degli immobili, con recupero automatico quando l'utente torna sullo stesso immobile.

## ✨ Funzionalità Implementate

### 1. **Salvataggio Automatico dell'Analisi**
Quando l'utente clicca "Avvia analisi AI" e l'analisi viene completata:
- ✅ L'analisi viene automaticamente salvata in `backend/storage/analysis/{listing_id}.json`
- ✅ Il salvataggio avviene immediatamente dopo l'analisi, senza bisogno di azione da parte dell'utente
- ✅ Se il salvataggio fallisce, l'utente riceve comunque i risultati (il salvataggio è opzionale)

### 2. **Recupero Automatico dell'Analisi**
Quando l'utente torna allo Step 2 per lo stesso immobile:
- ✅ Il sistema controlla automaticamente se esiste un'analisi salvata
- ✅ Se trovata, l'analisi viene caricata e mostrata immediatamente
- ✅ Il campo "Condizione" viene auto-popolato con il valore dall'analisi
- ✅ Viene mostrato un indicatore "Analisi completata e salvata" in verde

### 3. **Gestione degli Errori**
- ✅ Se l'analisi non esiste, non viene mostrato alcun errore (comportamento normale)
- ✅ Se il caricamento fallisce, viene loggato in console ma non mostrato all'utente
- ✅ L'utente può sempre rieseguire l'analisi per aggiornare i risultati

## 🔧 Modifiche al Backend

### File: `backend/app/api/photo_analysis.py`

#### 1. Salvataggio Automatico (linee 448-455)
```python
# Save the analysis result to storage for future retrieval
try:
    _save_analysis_result(safe_listing_id, result)
    logger.info(f"Saved analysis result for listing {safe_listing_id}")
except Exception as exc:
    logger.warning(f"Failed to save analysis result: {exc}")
    # Don't fail the request if saving fails
```

#### 2. Nuovi Endpoint

**POST `/api/analysis/save-analysis`**
- Salva esplicitamente un'analisi (non usato attualmente, ma disponibile per uso futuro)
- Body: `{listing_id: string, locale: string}` + `PhotoConditionResult`

**GET `/api/analysis/get-analysis/{listing_id}`**
- Recupera un'analisi salvata per un listing ID
- Restituisce 404 se non esiste
- Restituisce il `PhotoConditionResult` completo

#### 3. Funzioni Helper

**`_save_analysis_result(listing_id, result)`**
- Salva il risultato dell'analisi in JSON
- Path: `storage/analysis/{listing_id}.json`
- Formato: JSON con indent per leggibilità

**`_load_analysis_result(listing_id)`**
- Carica il risultato dall'archivio
- Converte il JSON in Pydantic model
- Restituisce `None` se il file non esiste

## 🎨 Modifiche al Frontend

### File: `frontend/lib/photo-analysis.ts`

#### Nuova Funzione (linee 49-71)
```typescript
export async function getSavedAnalysis(
  listingId: string
): Promise<PhotoConditionResult | null>
```

- Recupera un'analisi salvata dal backend
- Restituisce `null` se non esiste (404)
- Non solleva errori, solo logging in console

### File: `frontend/components/wizard/Step2CompleteData.tsx`

#### 1. Auto-caricamento Analisi (linee 390-420)
```typescript
useEffect(() => {
  const loadSavedAnalysis = async () => {
    if (photoAnalysis || !photoStorageId || loadingSavedAnalysis) {
      return;
    }

    setLoadingSavedAnalysis(true);
    try {
      const savedResult = await getSavedAnalysis(photoStorageId);
      if (savedResult) {
        setPhotoAnalysis(savedResult);

        // Auto-populate state field if empty
        const currentState = getValues('state');
        if (!currentState) {
          setValue('state', savedResult.label);
        }
      }
    } catch (error) {
      console.error('Failed to load saved analysis:', error);
    } finally {
      setLoadingSavedAnalysis(false);
    }
  };

  loadSavedAnalysis();
}, [photoStorageId, photoAnalysis, loadingSavedAnalysis, getValues, setValue]);
```

#### 2. Indicatore Visivo (linee 917-922)
```typescript
{loadingSavedAnalysis && (
  <div className="flex items-center gap-2 text-sm text-blue-600">
    <Loader2 className="h-4 w-4 animate-spin" />
    <span>Caricamento analisi salvata...</span>
  </div>
)}
```

```typescript
{photoAnalysis && (
  <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
    <CheckCircle2 className="h-4 w-4" />
    <span>Analisi completata e salvata</span>
  </div>
)}
```

## 📁 Struttura Storage

```
backend/
└── storage/
    ├── analysis/              ← NUOVO
    │   ├── {listing_id_1}.json
    │   ├── {listing_id_2}.json
    │   └── ...
    └── photos/
        ├── {listing_id_1}/
        │   ├── photo_000.jpg
        │   └── ...
        └── ...
```

### Formato File JSON
```json
{
  "label": "buono",
  "score": 75.5,
  "confidence": 0.85,
  "reasoning": "L'immobile presenta...",
  "per_photo": [
    {
      "url": "https://...",
      "summary": "Cucina moderna",
      "issues": null
    }
  ]
}
```

## 🔄 Flusso Utente Completo

### Prima Analisi
1. Utente va su Idealista e scarica le foto con l'estensione
2. Frontend riceve `photoStorageId` (es: `33573330`)
3. Utente clicca "Avvia analisi AI"
4. Backend analizza le foto
5. **Backend salva automaticamente** in `storage/analysis/33573330.json`
6. Frontend mostra i risultati con badge verde "Analisi completata e salvata"

### Analisi Successiva (stesso immobile)
1. Utente torna sullo stesso annuncio
2. Frontend riceve lo stesso `photoStorageId`
3. **Auto-caricamento**: Frontend chiama automaticamente `GET /api/analysis/get-analysis/33573330`
4. Se trovata, l'analisi viene mostrata immediatamente
5. Badge verde conferma che è un'analisi salvata
6. Campo "Condizione" viene auto-popolato

### Ri-analisi
1. Utente può cliccare di nuovo "Avvia analisi AI"
2. Backend esegue nuova analisi
3. **Sovrascrive** il file JSON esistente con i nuovi risultati
4. Frontend mostra i risultati aggiornati

## 🧪 Testing

### Test Backend

1. **Avvia il backend:**
```bash
.\venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload
```

2. **Testa il salvataggio:**
```bash
# Dopo aver eseguito un'analisi, verifica che il file esista
ls backend/storage/analysis/
```

3. **Testa il recupero:**
```bash
curl http://localhost:8000/api/analysis/get-analysis/33573330
```

### Test Frontend

1. **Avvia il frontend:**
```bash
cd frontend
npm run dev
```

2. **Test flusso completo:**
   - Vai su un annuncio Idealista
   - Usa l'estensione per scaricare le foto
   - Nello Step 2, clicca "Avvia analisi AI"
   - Verifica badge verde "Analisi completata e salvata"
   - Torna indietro allo Step 1
   - Torna avanti allo Step 2
   - **Verifica**: L'analisi dovrebbe apparire automaticamente

3. **Test console:**
```javascript
// Nella console del browser, dovresti vedere:
Loaded saved analysis for listing: 33573330
```

## 🎯 Benefici

1. ✅ **Esperienza Utente Migliorata**: L'utente non deve ripetere l'analisi costosa ogni volta
2. ✅ **Risparmio Costi**: Evita chiamate ripetute all'API di OpenAI per lo stesso immobile
3. ✅ **Velocità**: Caricamento istantaneo delle analisi precedenti
4. ✅ **Persistenza**: I dati sopravvivono a refresh della pagina o navigazione
5. ✅ **Trasparenza**: L'utente vede chiaramente quando un'analisi è salvata

## 🔒 Note di Sicurezza

- I `listing_id` vengono "sanitizzati" tramite `_build_storage_identifier()`
- I file JSON sono salvati solo localmente nel server
- Non c'è autenticazione al momento (da implementare se necessario)
- I file possono essere cancellati manualmente se necessario

## 📝 TODO Futuro (Opzionale)

- [ ] Aggiungere timestamp alle analisi salvate
- [ ] Implementare scadenza automatica (es: analisi più vecchie di 30 giorni)
- [ ] Aggiungere endpoint per cancellare analisi specifiche
- [ ] Mostrare all'utente quando è stata eseguita l'ultima analisi
- [ ] Permettere all'utente di forzare ri-analisi anche se esiste già
