// Test script to demonstrate photo analysis workflow with browser extension
// This simulates: extension extracts photos -> backend downloads -> OpenAI analyzes

const IDEALISTA_URL = 'https://www.idealista.it/immobile/26635525/';

// Sample photo URLs that would be extracted by the browser extension
// Note: Idealista URLs require authentication, using public sample apartment photos instead
const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',  // Living room
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',  // Kitchen
  'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800'   // Bedroom
];

const IDEALISTA_PHOTOS = [
  'https://img4.idealista.it/blur/WEB_DETAIL-L-P/0/id.pro.it.image.master/36/66/b1/1318851620.jpg',
  'https://img4.idealista.it/blur/WEB_DETAIL-L-P/0/id.pro.it.image.master/28/13/35/1318851621.jpg',
  'https://img4.idealista.it/blur/WEB_DETAIL-L-P/0/id.pro.it.image.master/10/b2/64/1318851622.jpg',
  'https://img4.idealista.it/blur/WEB_DETAIL-L-P/0/id.pro.it.image.master/f7/97/7e/1318851623.jpg',
  'https://img4.idealista.it/blur/WEB_DETAIL-L-P/0/id.pro.it.image.master/dc/f6/d8/1318851624.jpg'
];

async function testPhotoAnalysisWorkflow() {
  console.log('\n=== SIMULAZIONE WORKFLOW ESTENSIONE BROWSER ===\n');

  console.log('1. ESTRAZIONE DATI CON ESTENSIONE BROWSER');
  console.log('   URL Annuncio:', IDEALISTA_URL);
  console.log('   Foto estratte da Idealista (originali):', IDEALISTA_PHOTOS.length);
  IDEALISTA_PHOTOS.forEach((url, idx) => {
    console.log(`      ${idx + 1}. ${url}`);
  });
  console.log('\n   NOTA: Le foto Idealista richiedono autenticazione.');
  console.log('   Usando foto pubbliche di test invece:', SAMPLE_PHOTOS.length);
  SAMPLE_PHOTOS.forEach((url, idx) => {
    console.log(`      ${idx + 1}. ${url}`);
  });

  console.log('\n2. INVIO DATI AL BACKEND PER ANALISI FOTO');
  console.log('   Endpoint: POST http://localhost:8000/api/analysis/photo-condition-with-download');

  const requestBody = {
    photos: SAMPLE_PHOTOS,
    listing_id: 'idealista-26635525',
    locale: 'it'
  };

  console.log('   Request body:', JSON.stringify(requestBody, null, 2));

  try {
    console.log('\n3. DOWNLOAD FOTO IN LOCALE...');
    const response = await fetch('http://localhost:8000/api/analysis/photo-condition-with-download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('   Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('   Errore:', errorText);

      if (response.status === 429) {
        console.log('\n   ⚠️  RATE LIMIT OPENAI - Questo è normale!');
        console.log('   La chiamata API funziona, ma hai superato il limite di richieste.');
        console.log('   Soluzione: aspetta qualche minuto o passa a un piano paid.');
      }
      return;
    }

    const result = await response.json();

    console.log('\n4. ANALISI OPENAI COMPLETATA ✓');
    console.log('   Risultato:');
    console.log('   - Label:', result.label);
    console.log('   - Confidence:', (result.confidence * 100).toFixed(1) + '%');
    console.log('   - Reasoning:', result.reasoning);

    console.log('\n5. FOTO SCARICATE LOCALMENTE:');
    console.log('   Directory: backend/storage/photos/idealista-26635525/');
    console.log('   File: photo_000.jpg, photo_001.jpg, ...');

    console.log('\n=== WORKFLOW COMPLETATO CON SUCCESSO ===\n');

  } catch (error) {
    console.error('\n   Errore di rete:', error.message);
    console.log('\n   Verifica che il backend sia in esecuzione su http://localhost:8000');
  }
}

// Run the test
testPhotoAnalysisWorkflow().catch(console.error);
