const refineLogic = (data) => {
  const result = !data.totalFloors || !data.floor || data.floor <= data.totalFloors;
  console.log('Input:', data);
  console.log('!data.totalFloors:', !data.totalFloors);
  console.log('!data.floor:', !data.floor);
  console.log('data.floor <= data.totalFloors:', data.floor <= data.totalFloors);
  console.log('Final result:', result);
  console.log('---');
  return result;
};

console.log('Test 1 - Valid numbers (2, 5):');
refineLogic({floor: 2, totalFloors: 5});

console.log('\nTest 2 - Valid strings ("2", "5"):');
refineLogic({floor: '2', totalFloors: '5'});

console.log('\nTest 3 - Floor undefined:');
refineLogic({floor: undefined, totalFloors: 5});

console.log('\nTest 4 - Floor NaN:');
refineLogic({floor: NaN, totalFloors: 5});

console.log('\nTest 5 - Empty string floor:');
refineLogic({floor: '', totalFloors: 5});

console.log('\nTest 6 - Both filled but floor > totalFloors:');
refineLogic({floor: 6, totalFloors: 5});
