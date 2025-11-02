// Test script per verificare la trasformazione degli URL delle foto

// URL di esempio da Idealista (basati sul pattern nel documento)
const testUrls = [
  'https://img4.idealista.it/blur/WEB_DETAIL_TOP-L-L/0/id.pro.it.image.master/80/5b/c5/722820746.webp',
  'https://img4.idealista.it/blur/WEB_DETAIL/0/id.pro.it.image.master/80/5b/c5/722820746.webp',
  'https://img4.idealista.it/blur/WEB_LISTING-M/0/id.pro.it.image.master/80/5b/c5/722820746.webp',
];

// URL full-size atteso
const expectedFullSize = 'https://img4.idealista.it/0/0/id.pro.it.image.master/80/5b/c5/722820746.jpg';

console.log('=== Test URL Transformation ===\n');

testUrls.forEach((url, index) => {
  console.log(`Test ${index + 1}:`);
  console.log(`Original:  ${url}`);

  // Vecchia trasformazione (errata)
  const oldTransform = url.replace(/\/blur\/[^\/]+\//, '/0/').replace(/\.webp$/i, '.jpg');
  console.log(`Old:       ${oldTransform}`);

  // Nuova trasformazione (corretta)
  const newTransform = url.replace(/\/blur\/[^\/]+\//, '/').replace(/\.webp$/i, '.jpg');
  console.log(`New:       ${newTransform}`);

  console.log(`Expected:  ${expectedFullSize}`);
  console.log(`Match:     ${newTransform === expectedFullSize ? '✓' : '✗'}`);
  console.log('');
});

// Test con URL potenzialmente diversi
console.log('=== Altri pattern possibili ===\n');

const otherPatterns = [
  'https://img4.idealista.it/blur/WEB_DETAIL_TOP-L-L/id.pro.it.image.master/80/5b/c5/722820746.webp', // senza /0/
  'https://img4.idealista.it/blur/HOME_XXL_PLUS/0/id.pro.it.image.master/80/5b/c5/722820746.webp',
  'https://img4.idealista.it/blur/HOME_XXL_PLUS/1/id.pro.it.image.master/80/5b/c5/722820746.webp', // con /1/
];

otherPatterns.forEach((url, index) => {
  console.log(`Pattern ${index + 1}:`);
  console.log(`Original:  ${url}`);
  const transformed = url.replace(/\/blur\/[^\/]+\//, '/').replace(/\.webp$/i, '.jpg');
  console.log(`Result:    ${transformed}`);
  console.log('');
});

console.log('=== Pattern per full-size corretto ===');
console.log('La struttura dovrebbe essere:');
console.log('https://img[N].idealista.it/[size]/[orientation]/id.pro.it.image.master/[path]/[filename].jpg');
console.log('');
console.log('Dove:');
console.log('- [size] = 0 (full size)');
console.log('- [orientation] = 0 (default orientation)');
console.log('');
console.log('Quindi il pattern corretto è:');
console.log('Rimuovere: /blur/[QUALITY_PATTERN]/');
console.log('Aggiungere: /0/ (se non già presente dopo la rimozione)');
