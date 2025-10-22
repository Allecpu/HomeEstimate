const testData = {
  address: 'Via test',
  city: 'Milano',
  surface: 132,
  price: 89500,
  rooms: 3,
  bedrooms: 2,
  bathrooms: 1,
  floor: 1,
  totalFloors: 5,
  yearBuilt: 1980
};

const allFields = ['address', 'city', 'surface', 'price', 'rooms', 'bedrooms', 'bathrooms', 'floor', 'totalFloors', 'yearBuilt'];

const filledFields = allFields.filter(field => {
  const value = testData[field];
  if (typeof value === 'number') {
    return true;
  }
  return value !== undefined && value !== null && value !== '';
});

console.log('Filled:', filledFields.length, 'Total:', allFields.length, 'Percentage:', Math.round((filledFields.length / allFields.length) * 100) + '%');
console.log('Fields:', filledFields);
