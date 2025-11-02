# Integrazione Frontend API OMI

## Panoramica

L'integrazione frontend delle API OMI (Osservatorio del Mercato Immobiliare) in HomeEstimate permette agli utenti di ottenere valutazioni immobiliari più accurate basate su dati ufficiali dell'Agenzia delle Entrate.

## Architettura

### 1. **Servizio API** ([lib/omi-api.ts](../lib/omi-api.ts))

Client TypeScript completamente tipizzato per comunicare con il backend:

```typescript
import { queryOMI, getPurchasePrice, getPropertyTypes } from '@/lib/omi-api';

// Query completa
const omiData = await queryOMI({
  city: 'Milano',
  metri_quadri: 100,
  tipo_immobile: 'appartamento',
  operazione: 'acquisto'
});

// Prezzi specifici
const prices = await getPurchasePrice({
  city: 'Roma',
  metri_quadri: 85,
  tipo_immobile: 'appartamento'
});
```

**Funzioni disponibili:**
- `queryOMI()` - Query completa alle API OMI
- `getPurchasePrice()` - Prezzi di acquisto
- `getRentalPrice()` - Prezzi di affitto
- `getPropertyTypes()` - Lista tipi immobile
- `getCadastralCode()` - Codice catastale comune
- `getSupportedCities()` - Comuni supportati (312)
- `isCitySupported()` - Verifica supporto città
- `getOMIZones()` - Zone OMI disponibili per comune

### 2. **Schema Validazione** ([lib/validation.ts](../lib/validation.ts))

Aggiornato con 2 nuovi campi opzionali:

```typescript
export const propertySchema = z.object({
  // ... campi esistenti ...

  // Dati OMI
  propertyTypeOMI: z.string().optional(),  // "appartamento", "villa", etc.
  zonaOMI: z.string().optional(),           // "B12", "C1", etc.
});
```

### 3. **Componenti**

#### OMIDataFields ([components/wizard/OMIDataFields.tsx](../components/wizard/OMIDataFields.tsx))

Componente smart per la selezione dei dati OMI con le seguenti caratteristiche:

**Funzionalità:**
- ✅ Verifica automatica supporto città
- ✅ Caricamento dinamico tipi immobile
- ✅ Caricamento automatico zone OMI per città
- ✅ Stati di caricamento e errore
- ✅ Debouncing richieste API
- ✅ UI responsive e accessibile

**Utilizzo:**
```tsx
<OMIDataFields
  city={watchedCity}
  propertyTypeOMI={propertyTypeOMI}
  zonaOMI={zonaOMI}
  onPropertyTypeChange={handleTypeChange}
  onZonaOMIChange={handleZoneChange}
/>
```

**Stati visualizzati:**
1. Città non inserita → Messaggio informativo
2. Città non supportata → Alert di avviso
3. Città supportata → Form completo con select e input

## Flusso Utente

### Step 1: Inserimento URL
Nessuna modifica - funziona come prima.

### Step 2: Completamento Dati

**Nuova sezione "Dati OMI"** aggiunta dopo "Informazioni Aggiuntive":

1. **L'utente inserisce la città** → Il componente verifica automaticamente il supporto
2. **Se supportata** → Carica i tipi di immobile disponibili
3. **L'utente seleziona il tipo** → Opzionale ma consigliato
4. **Se disponibili** → Mostra select con zone OMI, altrimenti input manuale
5. **L'utente seleziona/inserisce la zona** → Opzionale

```tsx
{/* Dati OMI - Integrato automaticamente */}
<Controller
  name="propertyTypeOMI"
  control={control}
  render={({ field }) => (
    <Controller
      name="zonaOMI"
      control={control}
      render={({ field: zonaField }) => (
        <OMIDataFields
          city={watchedCity}
          propertyTypeOMI={field.value}
          zonaOMI={zonaField.value}
          onPropertyTypeChange={field.onChange}
          onZonaOMIChange={zonaField.onChange}
        />
      )}
    />
  )}
/>
```

### Step 3: Verifica Posizione
Nessuna modifica - funziona come prima.

### Step 4: Calcolo Valutazione

**Chiamata API aggiornata** con dati OMI:

```typescript
const response = await fetch('/api/valuation/evaluate', {
  method: 'POST',
  body: JSON.stringify({
    // ... dati esistenti ...
    property_type: propertyData.propertyTypeOMI,  // ✨ Nuovo
    zona_omi: propertyData.zonaOMI,               // ✨ Nuovo
  }),
});
```

**Visualizzazione risultati:**
- Badge che mostra la fonte dei dati (OMI reali vs Algoritmo)
- Alert informativo se usati dati OMI reali
- Informazioni su zona e range prezzi OMI

![Step 4 con dati OMI](./images/step4-omi.png)

### Step 5: Report Finale

**Nuova sezione dedicata** "Dati OMI - Osservatorio Mercato Immobiliare":

Mostra (se disponibili):
- 📍 Comune e zona OMI
- 📅 Periodo di riferimento (semestre)
- 💰 Valore OMI medio al m²
- 📊 Range min-max con visualizzazione grafica
- 🏗️ Stato di conservazione
- 📌 Badge fonte dati
- ℹ️ Nota informativa per dati reali

```tsx
{estimationData.omiData && (
  <Card className="border-blue-200 bg-blue-50/30">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Building2 className="w-5 h-5" />
        Dati OMI - Osservatorio Mercato Immobiliare
        <Badge variant="default">
          {estimationData.omiData.fonte}
        </Badge>
      </CardTitle>
    </CardHeader>
    {/* ... contenuto ... */}
  </Card>
)}
```

## Tipi TypeScript

### Interfacce Principali

```typescript
// Quotazione OMI singola
interface OMIQuotation {
  zona_omi: string;
  property_type: string;
  stato_conservazione?: string;
  prezzo_acquisto_min?: number;
  prezzo_acquisto_max?: number;
  prezzo_acquisto_medio?: number;
  prezzo_affitto_min?: number;
  prezzo_affitto_max?: number;
  prezzo_affitto_medio?: number;
}

// Risposta completa
interface OMIResponse {
  codice_comune: string;
  comune: string;
  metri_quadri: number;
  zona_omi_filter?: string;
  quotations: OMIQuotation[];
  timestamp: string;
  zone_count: number;
}

// Dati OMI nella valutazione
interface OMIData {
  comune: string;
  zona?: string;
  valoreMin: number;
  valoreMax: number;
  valoreNormale: number;
  semestre: string;
  stato_conservazione?: string;
  fonte: string;
}
```

## Gestione Errori

Il sistema gestisce automaticamente vari scenari:

1. **Città non supportata:**
   ```tsx
   <Alert variant="destructive">
     La città non è attualmente supportata per i dati OMI.
     La valutazione utilizzerà solo l'algoritmo proprietario.
   </Alert>
   ```

2. **Errore caricamento tipi:**
   ```tsx
   Impossibile caricare i tipi di immobile
   ```

3. **Errore API backend:**
   ```typescript
   catch (error) {
     throw new Error(error.detail || 'Errore nel recupero dati OMI');
   }
   ```

## Performance

### Ottimizzazioni Implementate

1. **Debouncing:** 500ms delay sulla verifica città
   ```typescript
   const timeoutId = setTimeout(checkCityAndLoadZones, 500);
   return () => clearTimeout(timeoutId);
   ```

2. **Cache backend:** 1 ora TTL per ridurre chiamate API

3. **Caricamento lazy:** Tipi immobile e zone caricate solo quando necessario

4. **Stati di caricamento:** Feedback visivo immediato

## Variabili d'Ambiente

Configura l'URL del backend nel file `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Testing

### Test Manuale

1. **Test città supportata (Milano):**
   - Inserire "Milano" nel campo città
   - Verificare caricamento tipi immobile
   - Selezionare "Appartamento"
   - Verificare caricamento zone OMI
   - Selezionare una zona (es. "B12")
   - Procedere con la valutazione
   - Verificare badge "OMI - Dati reali" nello Step 4
   - Verificare sezione OMI nello Step 5

2. **Test città non supportata:**
   - Inserire una città piccola non in lista
   - Verificare alert "città non supportata"
   - Verificare che la valutazione funzioni comunque

3. **Test senza dati OMI:**
   - Non selezionare tipo immobile né zona
   - Verificare che la valutazione funzioni
   - Verificare fonte "Algoritmo proprietario"

### Test Integrazione

```bash
# Avvia il backend
cd backend
./venv/Scripts/python.exe -m uvicorn app.main:app --reload

# In un altro terminale, avvia il frontend
cd frontend
npm run dev
```

Naviga a http://localhost:3000 e testa il flusso completo.

## Troubleshooting

### Problema: "Impossibile caricare i tipi di immobile"

**Causa:** Backend non raggiungibile o errore API

**Soluzione:**
1. Verifica che il backend sia avviato
2. Controlla `NEXT_PUBLIC_API_URL` in `.env.local`
3. Verifica console browser per errori CORS

### Problema: "Città non trovata"

**Causa:** Città non in lista dei 312 comuni supportati

**Soluzione:**
- Controlla lista comuni: `GET /api/omi/cities`
- Per aggiungere comuni, modifica `backend/app/omi/cadastral_codes.py`

### Problema: Zone OMI non caricate

**Causa:** API OMI non restituisce dati per quella città

**Soluzione:**
- L'utente può inserire manualmente la zona OMI
- Verifica con: `GET /api/omi/query?city={city}&metri_quadri=1`

## Best Practices

1. **Sempre gestire il caso "dati non disponibili":**
   ```typescript
   {estimationData.omiData ? (
     <OMISection data={estimationData.omiData} />
   ) : (
     <FallbackSection />
   )}
   ```

2. **Fornire feedback visivo durante caricamenti:**
   ```tsx
   {isLoading && <Loader2 className="animate-spin" />}
   ```

3. **Validare input utente:**
   ```typescript
   const schema = z.object({
     propertyTypeOMI: z.string().optional(),
     zonaOMI: z.string().optional(),
   });
   ```

4. **Gestire errori in modo user-friendly:**
   ```tsx
   <Alert variant="destructive">
     <AlertDescription>{error}</AlertDescription>
   </Alert>
   ```

## Roadmap Future

- [ ] Autocomplete per zone OMI
- [ ] Visualizzazione mappa zone OMI
- [ ] Storico quotazioni OMI
- [ ] Confronto multi-zona
- [ ] Export dati OMI in PDF
- [ ] Notifiche variazioni prezzi OMI

## Riferimenti

- **Backend API Docs:** [../backend/docs/omi-integration.md](../../backend/docs/omi-integration.md)
- **API OMI Ufficiali:** https://github.com/davide-sagona/api-quotazioni-immobiliari-omi
- **Shadcn UI:** https://ui.shadcn.com/
- **React Hook Form:** https://react-hook-form.com/

## Supporto

Per problemi o domande:
1. Controlla questa documentazione
2. Verifica console browser (F12)
3. Verifica log backend
4. Testa endpoint API direttamente con Postman/curl
