/**
 * Test script for Positive Land Energy Analysis
 */
import { calculatePositiveLandEnergy, ENERGY_PATTERNS_DICT } from '../js/analysis.js';

// Set Scale result: 10 canvas px = 1 ft
const FT_SCALE = { realPerWorld: 0.1, unit: 'ft' };

console.log('--- Testing Positive Land Energy Analysis ---');

// Test Case 1: Square Plot (40 x 40)
const squareMetrics = {
  area: 160000,
  bounds: { width: 400, height: 400 },
  grid9x9: { totalWidth: 400, totalHeight: 400 }
};
const resSquare = calculatePositiveLandEnergy(squareMetrics, FT_SCALE);
console.log('\n1. Square Plot (40 x 40):');
console.log('Length:', resSquare.length, 'Breadth:', resSquare.breadth);
console.log('Income:', resSquare.income, 'Expenditure:', resSquare.expenditure);
console.log('Income > Expenditure:', resSquare.incomeGreater);
console.log('Remainder:', resSquare.remainder, 'Pattern:', resSquare.remainderInfo.quality);
console.log('Ratio:', resSquare.ratio, 'Ratio <= 2.5:', resSquare.ratioGood);
console.log('Verdict:', resSquare.verdict.title);

// Test Case 2: Standard Rectangular Plot (60 x 40)
// Length 60, Breadth 40.
// Income = 60 * 8 = 480. Expenditure = 40 * 10.8 = 432. Income > Expenditure!
// (60 + 40) % 8 = 100 % 8 = 4. Remainder 4 -> Shwana/Vrishabha -> Best (Positive energy)
// Ratio = 60 / 40 = 1.5 <= 2.5 (Good)
// Verdict should be: RECOMMENDED LAND
const rectMetrics = {
  area: 240000,
  bounds: { width: 600, height: 400 },
  grid9x9: { totalWidth: 600, totalHeight: 400 }
};
const resRect = calculatePositiveLandEnergy(rectMetrics, FT_SCALE);
console.log('\n2. Standard Rectangular Plot (60 x 40):');
console.log('Length:', resRect.length, 'Breadth:', resRect.breadth);
console.log('Income:', resRect.income, 'Expenditure:', resRect.expenditure);
console.log('Income > Expenditure:', resRect.incomeGreater);
console.log('Remainder:', resRect.remainder, 'Pattern:', resRect.remainderInfo.quality);
console.log('Ratio:', resRect.ratio, 'Ratio <= 2.5:', resRect.ratioGood);
console.log('Verdict:', resRect.verdict.title);

// Test Case 3: Overly Elongated Plot (90 x 30)
// Length 90, Breadth 30.
// Ratio = 90 / 30 = 3.0 > 2.5 (Overly elongated)
// Verdict should be: REMEDIES REQUIRED
const longMetrics = {
  area: 270000,
  bounds: { width: 900, height: 300 },
  grid9x9: { totalWidth: 900, totalHeight: 300 }
};
const resLong = calculatePositiveLandEnergy(longMetrics, FT_SCALE);
console.log('\n3. Elongated Plot (90 x 30):');
console.log('Length:', resLong.length, 'Breadth:', resLong.breadth);
console.log('Ratio:', resLong.ratio, 'Ratio <= 2.5:', resLong.ratioGood);
console.log('Verdict:', resLong.verdict.title);

// Test Case 4: No closed plot
const emptyRes = calculatePositiveLandEnergy(null);
console.log('\n4. Null / No Plot:');
console.log('Active:', emptyRes.isActive, 'Verdict:', emptyRes.verdict.title);

// Assertions
if (resRect.verdict.title === 'RECOMMENDED LAND' &&
    resLong.verdict.title === 'REMEDIES REQUIRED' &&
    !emptyRes.isActive) {
  console.log('\n>>> ALL TEST CASES PASSED SUCCESSFULLY! <<<');
} else {
  console.error('\n>>> TEST FAILED! <<<');
  process.exit(1);
}
