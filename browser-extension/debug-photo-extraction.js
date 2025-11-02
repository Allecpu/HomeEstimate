// ISTRUZIONI: Copia e incolla questo script nella console del browser (F12)
// mentre sei su una pagina di un annuncio Idealista

console.clear();
console.log('=== DEBUG: Estrazione Foto Idealista ===\n');

// 1. Cerca tutti gli elementi img
console.log('1. TUTTI GLI IMG SULLA PAGINA:');
const allImages = document.querySelectorAll('img');
console.log(`Trovate ${allImages.length} immagini\n`);

allImages.forEach((img, i) => {
  if (i < 10) { // Mostra solo le prime 10
    console.log(`Immagine ${i + 1}:`);
    console.log('  src:', img.src?.substring(0, 100));
    console.log('  data-src:', img.getAttribute('data-src')?.substring(0, 100));
    console.log('  currentSrc:', img.currentSrc?.substring(0, 100));
    console.log('  class:', img.className);
    console.log('');
  }
});

// 2. Cerca immagini nella galleria
console.log('2. IMMAGINI NELLA GALLERIA:');
const galleryImages = document.querySelectorAll('.detail-image, [class*="gallery"] img, .detail-multimedia img, picture img');
console.log(`Trovate ${galleryImages.length} immagini nella galleria\n`);

galleryImages.forEach((img, i) => {
  if (i < 5) {
    console.log(`Galleria ${i + 1}:`);
    console.log('  src:', img.src);
    console.log('  data-src:', img.getAttribute('data-src'));
    console.log('');
  }
});

// 3. Cerca script JSON-LD
console.log('3. JSON-LD SCRIPTS:');
const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
console.log(`Trovati ${jsonLdScripts.length} script JSON-LD\n`);

jsonLdScripts.forEach((script, i) => {
  try {
    const data = JSON.parse(script.textContent);
    if (data.image || data.images || data.photo) {
      console.log(`JSON-LD ${i + 1} contiene immagini:`, data.image || data.images || data.photo);
    }
  } catch (e) {
    console.log(`JSON-LD ${i + 1} - errore parsing`);
  }
});
console.log('');

// 4. Cerca data attributes
console.log('4. ELEMENTI CON DATA-URLS O DATA-IMAGES:');
const dataElements = document.querySelectorAll('[data-urls], [data-gallery], [data-gallery-images], [data-images]');
console.log(`Trovati ${dataElements.length} elementi con data attributes\n`);

dataElements.forEach((el, i) => {
  console.log(`Elemento ${i + 1}:`);
  console.log('  data-urls:', el.getAttribute('data-urls')?.substring(0, 100));
  console.log('  data-gallery:', el.getAttribute('data-gallery')?.substring(0, 100));
  console.log('  data-images:', el.getAttribute('data-images')?.substring(0, 100));
  console.log('');
});

// 5. Cerca nel __INITIAL_STATE__ o simili
console.log('5. WINDOW STATE OBJECTS:');
if (window.__INITIAL_STATE__) {
  console.log('window.__INITIAL_STATE__ trovato');
  console.log('Keys:', Object.keys(window.__INITIAL_STATE__).slice(0, 10));
}
if (window.__state) {
  console.log('window.__state trovato');
  console.log('Keys:', Object.keys(window.__state).slice(0, 10));
}
if (window.__DATA__) {
  console.log('window.__DATA__ trovato');
  console.log('Keys:', Object.keys(window.__DATA__).slice(0, 10));
}
console.log('');

// 6. Cerca picture elements e srcset
console.log('6. PICTURE ELEMENTS E SRCSET:');
const pictures = document.querySelectorAll('picture');
console.log(`Trovati ${pictures.length} elementi picture\n`);

pictures.forEach((pic, i) => {
  if (i < 3) {
    console.log(`Picture ${i + 1}:`);
    const sources = pic.querySelectorAll('source');
    sources.forEach((source, j) => {
      console.log(`  Source ${j + 1}:`);
      console.log('    srcset:', source.srcset?.substring(0, 100));
      console.log('    type:', source.type);
    });
    const img = pic.querySelector('img');
    if (img) {
      console.log('  img src:', img.src?.substring(0, 100));
    }
    console.log('');
  }
});

// 7. ESTRAZIONE URL REALI
console.log('7. ESTRAZIONE URL IMMAGINI REALI:');
const photoUrls = new Set();

// Prova a estrarre da tutti gli img con blur
document.querySelectorAll('img').forEach(img => {
  [img.src, img.currentSrc, img.getAttribute('data-src'), img.getAttribute('data-original')]
    .filter(Boolean)
    .forEach(url => {
      if (url.includes('idealista.it') && url.includes('id.pro.it.image')) {
        photoUrls.add(url);
      }
    });
});

console.log(`Trovati ${photoUrls.size} URL unici di immagini Idealista:`);
Array.from(photoUrls).slice(0, 5).forEach((url, i) => {
  console.log(`${i + 1}. ${url}`);
});

console.log('\n=== FINE DEBUG ===');
console.log('\nCOPIA TUTTO L\'OUTPUT E MANDALO PER ANALISI');
