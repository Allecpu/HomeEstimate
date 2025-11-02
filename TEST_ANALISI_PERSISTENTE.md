# 🧪 Test Analisi AI Persistente

## Pre-requisiti

1. Backend in esecuzione: `.\venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload`
2. Frontend in esecuzione: `cd frontend && npm run dev`
3. Estensione caricata in Edge
4. OpenAI API key configurata

## Test 1: Prima Analisi e Salvataggio

### Step 1: Scarica le Foto
1. Vai su: https://www.idealista.it/immobile/33573330/
2. Clicca sull'icona dell'estensione
3. Clicca "Estrai Dati da Questa Pagina"
4. Clicca "Scarica Foto per AI"
5. Aspetta il completamento (dovrebbe dire "54 foto")

### Step 2: Avvia Prima Analisi
1. Vai su http://localhost:3000
2. Dovresti essere già nello Step 2 (dati completati automaticamente)
3. Scorri fino alla sezione "Analisi delle Foto"
4. Verifica che vedi: "54 foto archiviate"
5. ⚠️ **IMPORTANTE**: Apri DevTools (F12) → Tab Console
6. Clicca "Avvia analisi AI"
7. Aspetta il completamento (20-30 secondi)

### Step 3: Verifica Salvataggio
**Console Frontend (F12):**
```
✅ Dovresti vedere i risultati dell'analisi
✅ Badge verde: "Analisi completata e salvata"
```

**Backend Console:**
```
✅ INFO: Saved analysis result for listing 33573330
```

**File System:**
```bash
# In una nuova console, verifica che il file esista
ls backend/storage/analysis/

# Dovresti vedere un file tipo: 33573330.json
# Visualizza il contenuto:
cat backend/storage/analysis/33573330.json
```

**Contenuto atteso:**
```json
{
  "label": "buono",
  "score": 75.5,
  "confidence": 0.85,
  "reasoning": "Testo della valutazione...",
  "per_photo": [...]
}
```

## Test 2: Recupero Automatico

### Step 1: Naviga Via e Torna
1. Nel frontend, clicca "Indietro" per tornare allo Step 1
2. Clicca "Continua" per tornare allo Step 2

### Step 2: Verifica Auto-Caricamento
**Console Frontend (F12):**
```
✅ Caricamento analisi salvata...
✅ Loaded saved analysis for listing: 33573330
```

**UI:**
```
✅ Badge verde: "Analisi completata e salvata"
✅ I risultati dell'analisi sono visibili immediatamente
✅ Il campo "Condizione" è già popolato (es: "Buono")
✅ Non è necessario cliccare "Avvia analisi AI" di nuovo
```

## Test 3: Refresh della Pagina

### Step 1: Ricarica la Pagina
1. Premi F5 nel browser
2. Vai manualmente allo Step 2

### Step 2: Verifica Persistenza
**Comportamento Atteso:**
```
❌ L'analisi NON viene caricata automaticamente
   (Perché wizardData viene perso al refresh)

✅ MA: Se vai di nuovo sull'annuncio Idealista
✅ E clicchi di nuovo "Estrai Dati da Questa Pagina"
✅ ALLORA: L'analisi viene ri-caricata automaticamente
```

## Test 4: Re-analisi

### Step 1: Esegui Nuova Analisi
1. Con l'analisi già caricata nello Step 2
2. Clicca di nuovo "Avvia analisi AI"
3. Aspetta il completamento

### Step 2: Verifica Sovrascrittura
**Backend Console:**
```
✅ INFO: Saved analysis result for listing 33573330
```

**File System:**
```bash
# Il file viene sovrascritto con i nuovi risultati
cat backend/storage/analysis/33573330.json
```

## Test 5: Secondo Immobile

### Step 1: Vai su Altro Annuncio
1. Vai su: https://www.idealista.it/immobile/[ALTRO_ID]/
2. Usa l'estensione per scaricare le foto
3. Avvia l'analisi AI

### Step 2: Verifica File Separati
```bash
ls backend/storage/analysis/

# Dovresti vedere DUE file:
# - 33573330.json (primo immobile)
# - [ALTRO_ID].json (secondo immobile)
```

## Test 6: Analisi Non Esistente

### Test API Diretta
```bash
# Testa con un listing ID che non esiste
curl http://localhost:8000/api/analysis/get-analysis/99999999

# Risposta attesa:
# Status: 404
# Body: {"detail": "Nessuna analisi salvata trovata per questo annuncio."}
```

**Frontend:**
```
✅ Nessun errore mostrato all'utente
✅ Solo log in console: "No saved analysis found"
✅ Pulsante "Avvia analisi AI" è cliccabile normalmente
```

## 🐛 Problemi Comuni

### Problema 1: Analisi Non Si Salva
**Sintomo:** Backend log non mostra "Saved analysis result"

**Soluzione:**
```bash
# Verifica che la cartella esista
ls backend/storage/analysis/

# Se non esiste, creala manualmente
mkdir backend/storage/analysis
```

### Problema 2: Auto-caricamento Non Funziona
**Sintomo:** Tornando allo Step 2, l'analisi non appare

**Debug:**
1. Apri DevTools → Console
2. Cerca log: "Loaded saved analysis"
3. Se non c'è, verifica:
   - `photoStorageId` è definito? (dovrebbe essere nell'URL o wizardData)
   - Il file JSON esiste in `backend/storage/analysis/`?

**Soluzione:**
```javascript
// In console, verifica:
console.log(window.location.href);
// Dovrebbe contenere ?extensionData=... con photoStorageId
```

### Problema 3: Errore CORS
**Sintomo:** Errore in console: "CORS policy blocked"

**Soluzione:**
```python
# In backend/app/main.py, verifica che ci sia:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Problema 4: "Block-scoped variable used before declaration"
**Sintomo:** Errore TypeScript durante build

**Soluzione:** Già risolto! Le dichiarazioni sono state riorganizzate correttamente.

## ✅ Checklist Finale

Dopo tutti i test, dovresti avere:

- [ ] File JSON salvati in `backend/storage/analysis/`
- [ ] Auto-caricamento funzionante quando torni allo Step 2
- [ ] Badge verde "Analisi completata e salvata" visibile
- [ ] Campo "Condizione" auto-popolato
- [ ] Possibilità di ri-eseguire l'analisi e sovrascrivere
- [ ] Nessun errore in console (tranne log informativi)
- [ ] File separati per immobili diversi

## 📊 Metriche di Successo

- ⏱️ **Velocità**: Caricamento analisi salvata < 500ms
- 💾 **Storage**: File JSON ~2-10 KB per analisi
- 🔄 **Ripetibilità**: 100% delle analisi vengono salvate
- 🎯 **Accuratezza**: Recupero corrisponde al salvataggio

## 🎉 Test Superato!

Se tutti i test sono ✅, l'implementazione è completa e funzionante!

**Prossimi passi opzionali:**
- Aggiungere timestamp alle analisi
- Implementare cleanup automatico di analisi vecchie
- Mostrare data/ora dell'ultima analisi nell'UI
