// Test per capire il comportamento di valueAsNumber

console.log('Test NaN:');
console.log('typeof NaN:', typeof NaN);
console.log('isNaN(NaN):', isNaN(NaN));
console.log('NaN === NaN:', NaN === NaN);
console.log('Number.isNaN(NaN):', Number.isNaN(NaN));

console.log('\nTest valori:');
const testValues = {
  validNumber: 5,
  zero: 0,
  nan: NaN,
  undefined: undefined,
  null: null,
  emptyString: '',
  object: {}
};

Object.entries(testValues).forEach(([key, value]) => {
  const isNumber = typeof value === 'number';
  const isValidNumber = isNumber && !isNaN(value);
  console.log(`${key}: ${value}, type: ${typeof value}, isNumber: ${isNumber}, isValid: ${isValidNumber}`);
});
