import { calculateAreaMetrics, calculatePanchTatvaSummary, calculateGateAssessment, PANCH_TATVA_DATA } from '../js/analysis.js';
import { generate9x9VastuGrid } from '../js/geometry.js';
import { computeDevtaSpatialFields } from '../js/devtas.js';
import { calculate32EntranceGates } from '../js/zones.js';

console.log('Testing Phase 6: Analysis Panel & Elemental Distribution...');

// 1. Verify Panch Tatva Data & Summary
const tatvaSummary = calculatePanchTatvaSummary();
console.log(`Panch Tatva elements count: ${tatvaSummary.length}`);
if (tatvaSummary.length !== 5) {
  throw new Error(`Expected 5 elements, got ${tatvaSummary.length}`);
}

const totalPct = tatvaSummary.reduce((sum, el) => sum + el.percentage, 0);
console.log(`Total elemental percentage sum: ${Math.round(totalPct)}%`);
if (Math.round(totalPct) !== 100) {
  throw new Error(`Expected 100% total elemental share, got ${totalPct}%`);
}

tatvaSummary.forEach((el) => {
  console.log(`  - ${el.name}: ${el.zoneCount} zones (${el.formattedPercentage}) -> ${el.zones.join(', ')}`);
});

// 2. Test Area Metrics
const sampleMetrics = {
  area: 250000,
  bounds: { width: 500, height: 500 },
  grid9x9: {
    totalWidth: 500,
    totalHeight: 500,
    padWidth: 500 / 9,
    padHeight: 500 / 9
  }
};

const areaResult = calculateAreaMetrics(sampleMetrics);
console.log(`Calculated Plot Area: ${areaResult.plotArea} sq units`);
console.log(`Brahmasthan Area: ${Math.round(areaResult.brahmasthanArea)} sq units (${areaResult.brahmasthanRatioPct}%)`);
console.log(`Pada Size (1/81): ${Math.round(areaResult.padaArea)} sq units`);

if (areaResult.brahmasthanRatioPct !== 11.1) {
  throw new Error(`Expected 11.1% Brahmasthan ratio, got ${areaResult.brahmasthanRatioPct}`);
}

// 3. Test Gate Assessment
const points = [
  { x: 100, y: 100 },
  { x: 700, y: 100 },
  { x: 700, y: 700 },
  { x: 100, y: 700 }
];
const grid = generate9x9VastuGrid(points, { x: 400, y: 400 }, 0);
const devtas = computeDevtaSpatialFields(grid);
const gates = calculate32EntranceGates(grid, devtas);
const gateAssessment = calculateGateAssessment(gates);

console.log(`Total Gates assessed: ${gateAssessment.totalCount}`);
console.log(`Auspicious Gates: ${gateAssessment.auspiciousCount} (${gateAssessment.auspiciousCodes.join(', ')})`);

if (gateAssessment.totalCount !== 32 || gateAssessment.auspiciousCount !== 8) {
  throw new Error('Gate assessment failed');
}

console.log('All Phase 6 unit tests PASSED successfully!');
