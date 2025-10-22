// Test the characteristics completion logic

const formData = {
  rooms: 4,
  bedrooms: 4,
  bathrooms: 2,
  floor: 2,
  totalFloors: 5,
  yearBuilt: 1980
};

const characteristicsFields = ['rooms', 'bedrooms', 'bathrooms', 'floor', 'totalFloors', 'yearBuilt'];

const isCharacteristicsComplete = characteristicsFields.every(field => {
  const value = formData[field];
  console.log(`Checking ${field}:`, value, typeof value);

  // For numbers, check if it's a valid number (not undefined, null, NaN, or empty string)
  if (typeof value === 'number') {
    return !isNaN(value);
  }
  return value !== undefined && value !== null && value !== '';
});

console.log('\n=== RESULT ===');
console.log('isCharacteristicsComplete:', isCharacteristicsComplete);

// Test with missing field
console.log('\n\n=== TEST WITH MISSING FIELD ===');
const formData2 = {
  rooms: 4,
  bedrooms: 4,
  bathrooms: 2,
  floor: 2,
  totalFloors: 5
  // yearBuilt missing
};

const isComplete2 = characteristicsFields.every(field => {
  const value = formData2[field];
  console.log(`Checking ${field}:`, value, typeof value);

  if (typeof value === 'number') {
    return !isNaN(value);
  }
  return value !== undefined && value !== null && value !== '';
});

console.log('\n=== RESULT ===');
console.log('isCharacteristicsComplete:', isComplete2);

// Test with undefined converted to empty string
console.log('\n\n=== TEST WITH UNDEFINED ===');
const formData3 = {
  rooms: 4,
  bedrooms: 4,
  bathrooms: 2,
  floor: 2,
  totalFloors: 5,
  yearBuilt: undefined
};

const isComplete3 = characteristicsFields.every(field => {
  const value = formData3[field];
  console.log(`Checking ${field}:`, value, typeof value);

  if (typeof value === 'number') {
    return !isNaN(value);
  }
  return value !== undefined && value !== null && value !== '';
});

console.log('\n=== RESULT ===');
console.log('isCharacteristicsComplete:', isComplete3);
