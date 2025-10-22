// Test toNumber function
const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return undefined;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return typeof num === 'number' && !isNaN(num) ? num : undefined;
};

const testCases = [
  { input: 5, expected: 5 },
  { input: '5', expected: 5 },
  { input: 0, expected: 0 },
  { input: '0', expected: 0 },
  { input: undefined, expected: undefined },
  { input: null, expected: undefined },
  { input: '', expected: undefined },
  { input: NaN, expected: undefined },
  { input: 'abc', expected: undefined },
  { input: '1980', expected: 1980 },
  { input: 1980, expected: 1980 },
];

console.log('Testing toNumber function:');
testCases.forEach(({ input, expected }) => {
  const result = toNumber(input);
  const pass = result === expected;
  console.log(`toNumber(${JSON.stringify(input)}) = ${result} ${pass ? '✓' : '✗ Expected: ' + expected}`);
});
