// Quick test to verify percentage parsing
const testData = {
  "Down Payment %": "25%",
  "Payment 2 %": "40%",
  "Payment 3 %": "10%"
};

function parseNumeric(value) {
  if (value === null || value === undefined || value === '') return undefined;
  
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    // Remove currency symbols, commas, and percentage signs
    const cleaned = value.replace(/[$,%]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? undefined : parsed;
  }
  
  return undefined;
}

console.log('Testing percentage parsing:');
Object.entries(testData).forEach(([key, value]) => {
  const result = parseNumeric(value);
  console.log(`${key}: "${value}" -> ${result}`);
});

// Test the mapping flow
const mapped = {};
const projectMappings = {
  "Down Payment %": "down_payment_percentage",
  "Payment 2 %": "payment_2_percentage"
};

Object.entries(projectMappings).forEach(([excelCol, otsField]) => {
  if (testData[excelCol] !== undefined) {
    mapped[otsField] = testData[excelCol];
  }
});

console.log('\nMapped data:', mapped);
console.log('\nParsed values:');
Object.entries(mapped).forEach(([key, value]) => {
  console.log(`${key}: ${parseNumeric(value)}`);
});
