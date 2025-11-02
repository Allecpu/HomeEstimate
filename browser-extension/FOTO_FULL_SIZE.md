# 🖼️ Miglioramento Estrazione Foto

## Problema

Le foto estratte da Idealista erano di bassa qualità (blur/thumbnail):
- URL tipo: `https://img4.idealista.it/blur/WEB_DETAIL_TOP-L-L/0/...`
- Risultato: 19 foto scaricate ma solo 2 utilizzabili
- Dimensione: 292 bytes - 90KB (troppo piccole)

## Causa

Il content script estraeva gli URL "blur" che Idealista usa per le anteprime, non le foto full-size.

## Soluzione

Modificato `content.js` per convertire automaticamente gli URL blur in full-size:

### Prima (Blur/Thumbnail):
```
https://img4.idealista.it/blur/WEB_DETAIL_TOP-L-L/0/id.pro.it.image.master/80/5b/c5/722820746.webp
```

### Dopo (Full-Size):
```
https://img4.idealista.it/0/0/id.pro.it.image.master/80/5b/c5/722820746.jpg
```

### Modifiche Applicate

1. **Rimozione `/blur/[pattern]/`** → `/0/`
2. **Conversione `.webp` → `.jpg`** per migliore compatibilità

```javascript
// In content.js, funzione addPhotoUrl()
url = url.replace(/\/blur\/[^\/]+\//, '/0/');
url = url.replace(/\.webp$/i, '.jpg');
```

## Test

### Come Testare

1. **Ricarica l'estensione** (`edge://extensions/` → Ricarica)
2. **Vai su Idealista** (stesso annuncio o uno nuovo)
3. **Estrai i dati** con l'estensione
4. **Clicca "Scarica Foto per AI"**
5. **Verifica le foto** in `backend/storage/photos/{listing_id}/`

### Cosa Aspettarsi

- ✅ Foto full-size (non più blur)
- ✅ Formato JPG (più compatibile)
- ✅ Dimensioni maggiori (100KB - 500KB per foto)
- ✅ Tutte le foto utilizzabili

## Fallback

Se alcune foto danno ancora errore 404, significa che:
1. L'URL pattern di Idealista è cambiato
2. Le foto richiedono autenticazione speciale
3. Gli URL sono temporanei/scaduti

In questi casi, il backend proverà comunque a scaricare tutte le foto possibili e salverà quelle che funzionano.

---

**Ora le foto dovrebbero essere tutte utilizzabili!** 📸
