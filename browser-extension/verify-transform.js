// Verifica finale della trasformazione corretta

const testUrl = 'https://img4.idealista.it/blur/WEB_DETAIL_TOP-L-L/0/id.pro.it.image.master/80/5b/c5/722820746.webp';
const expected = 'https://img4.idealista.it/0/0/id.pro.it.image.master/80/5b/c5/722820746.jpg';

// Trasformazione corretta
const transformed = testUrl
  .replace(/\/blur\/[^\/]+\//, '/0/')
  .replace(/\.webp$/i, '.jpg');

console.log('Original:    ', testUrl);
console.log('Transformed: ', transformed);
console.log('Expected:    ', expected);
console.log('Match:       ', transformed === expected ? '✓ CORRETTO' : '✗ ERRATO');
