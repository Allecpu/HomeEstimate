# 🔍 Debug Foto - Test Completo

## Modifiche Applicate

### 1. Content Script ([content.js:96](browser-extension/content.js#L96))
- ✅ Trasformazione URL corretta: `/blur/[PATTERN]/` → `/0/`
- ✅ Conversione `.webp` → `.jpg`
- ✅ Logging per vedere le trasformazioni

### 2. Backend ([photo_analysis.py:100-108](backend/app/api/photo_analysis.py#L100-L108))
- ✅ Logging dettagliato: URL, size, content-type
- ✅ Skip automatico foto < 1 KB (placeholder)
- ✅ Logging size finale delle foto salvate

## Come Testare

### Step 1: Riavvia il Backend
```bash
# Ferma il backend se è in esecuzione (Ctrl+C)
# Poi riavvialo:
.\venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload
```

### Step 2: Ricarica l'Estensione
1. Vai su `edge://extensions/`
2. Trova "HomeEstimate - Estrattore Annunci"
3. Clicca su **Ricarica** (🔄)

### Step 3: Prepara la Pagina Idealista
1. Vai su un annuncio Idealista (es: https://www.idealista.it/immobile/33573330/)
2. **IMPORTANTE**: Scorri la pagina e apri la galleria foto (clicca su una foto)
3. Aspetta che tutte le foto si carichino
4. **Ricarica la pagina** (F5) per assicurarti che il content script sia fresco

### Step 4: Apri la Console del Browser
1. Premi **F12** per aprire DevTools
2. Vai alla tab **Console**
3. Filtra per "HomeEstimate" se vuoi vedere solo i nostri log

### Step 5: Estrai i Dati
1. Clicca sull'icona dell'estensione
2. Clicca **"Estrai Dati da Questa Pagina"**
3. **GUARDA LA CONSOLE**: Dovresti vedere messaggi tipo:
   ```
   HomeEstimate: Photo URL transformed: {
     original: "https://img4.idealista.it/blur/WEB_DETAIL_TOP-L-L/0/id.pro...",
     transformed: "https://img4.idealista.it/0/0/id.pro...jpg"
   }
   ```

### Step 6: Scarica le Foto
1. Clicca **"Scarica Foto per AI"** nell'estensione
2. **GUARDA I LOG DEL BACKEND**: Dovresti vedere:
   ```
   INFO: Downloading photo 1/19: https://img4.idealista.it/0/0/id.pro...
   INFO: Photo 1 - Status: 200, Size: 245678 bytes, Type: image/jpeg
   INFO: Saved photo to: storage/photos/.../photo_000.jpg (245678 bytes)
   ```

### Step 7: Verifica le Foto
1. Vai in `backend/storage/photos/[listing_id]/`
2. Controlla le foto:
   - ✅ Devono essere > 10 KB
   - ✅ Devono aprirsi e mostrare l'immobile
   - ❌ Se sono 1 KB = placeholder/errore

## Cosa Cercare nei Log

### Console Browser (F12)
- ✅ **"Photo URL transformed"** - Verifica che gli URL vengano trasformati
- ✅ Controlla che i transformed URL non abbiano pattern strani tipo `/blur/` residui
- ❌ Se NON vedi "Photo URL transformed", significa che gli URL non hanno `/blur/` da trasformare

### Backend Console
- ✅ **Status: 200** - Richiesta riuscita
- ✅ **Size: > 50000** - Foto di dimensione ragionevole (50+ KB)
- ❌ **Size: < 1000** - Placeholder/icona (verrà skippato automaticamente)
- ❌ **Status: 404** - URL non valido

## Problemi Possibili

### Problema 1: Nessuna trasformazione nella console
**Causa**: Gli URL sulla pagina non contengono `/blur/`
**Soluzione**: Copia uno degli URL dalla console e mandamelo per analizzarlo

### Problema 2: Status 404 nel backend
**Causa**: La trasformazione URL produce URL non validi
**Soluzione**: Copia l'URL che da 404 e mandamelo

### Problema 3: Tutte le foto < 1 KB
**Causa**: Idealista restituisce placeholder anche per URL full-size
**Soluzione**: Potrebbe servire autenticazione/cookies aggiuntivi

### Problema 4: Solo alcune foto sono valide
**Causa**: Alcuni URL potrebbero essere già full-size, altri no
**Soluzione**: Normale, il backend skipperà automaticamente i placeholder

## Output Atteso

Se tutto funziona:
- Console Browser: 15-20 trasformazioni URL
- Backend: 15-20 download con size variabile (50 KB - 500 KB)
- Cartella foto: 15-20 file JPG utilizzabili

---

**Dopo il test, mandami gli output per capire dove è il problema!**

1. Screenshot/copia della console browser con le trasformazioni URL
2. Log del backend con le info di download
3. Screenshot di una delle foto scaricate (per vedere se è utilizzabile)
