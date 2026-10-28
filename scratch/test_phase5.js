import { calculate16DirectionalZones, calculate32EntranceGates, ZONES_16_DATA, AUSPICIOUS_ENTRANCES } from '../js/zones.js';
import { generate9x9VastuGrid } from '../js/geometry.js';
import { computeDevtaSpatialFields } from '../js/devtas.js';
import { createStore, setPolygonPoints, setRotation } from '../js/state.js';

console.log('Testing Phase 5: 16 Directional Zones & 32 Entrance Padas...');

// 1. Verify ZONES_16_DATA
console.log(`Total 16 Zones in dictionary: ${ZONES_16_DATA.length}`);
if (ZONES_16_DATA.length !== 16) {
  throw new Error(`Expected 16 zones, got ${ZONES_16_DATA.length}`);
}

// 2. Verify Auspicious Entrances
console.log(`Auspicious entrances count: ${AUSPICIOUS_ENTRANCES.size}`);
const expectedAuspicious = ['N3', 'N4', 'E3', 'E4', 'S3', 'S4', 'W3', 'W4'];
for (const code of expectedAuspicious) {
  if (!AUSPICIOUS_ENTRANCES.has(code)) {
    throw new Error(`Missing auspicious entrance: ${code}`);
  }
}

// 3. Test zone calculation on a sample plot
const centroid = { x: 400, y: 300 };
const bounds = { minX: 100, minY: 100, maxX: 700, maxY: 500, width: 600, height: 400 };
const zonesResult = calculate16DirectionalZones(centroid, bounds, 20);

if (!zonesResult || zonesResult.zones.length !== 16) {
  throw new Error('Zone calculation failed');
}

// Check 22.5 deg intervals
const zone0 = zonesResult.zones[0]; // N
const zone1 = zonesResult.zones[1]; // NNE
const diffDeg = (zone1.centerDeg - zone0.centerDeg + 360) % 360;
console.log(`Zone angular interval: ${diffDeg}°`);
if (Math.abs(diffDeg - 22.5) > 0.001) {
  throw new Error(`Expected 22.5 deg interval, got ${diffDeg}`);
}

// 4. Test 32 Entrance Gates
const points = [
  { x: 200, y: 150 },
  { x: 600, y: 150 },
  { x: 600, y: 450 },
  { x: 200, y: 450 }
];
const grid = generate9x9VastuGrid(points, { x: 400, y: 300 }, 15);
const devtas = computeDevtaSpatialFields(grid);
const gates = calculate32EntranceGates(grid, devtas);

console.log(`Calculated Entrance Gates count: ${gates.length}`);
if (gates.length !== 32) {
  throw new Error(`Expected 32 entrance gates, got ${gates.length}`);
}

const auspiciousCount = gates.filter((g) => g.isAuspicious).length;
console.log(`Auspicious gates found: ${auspiciousCount} (${gates.filter((g) => g.isAuspicious).map((g) => g.code).join(', ')})`);
if (auspiciousCount !== 8) {
  throw new Error(`Expected 8 auspicious gates, got ${auspiciousCount}`);
}

// 5. Test State integration
const store = createStore();
store.setState(setPolygonPoints(points, true));
store.setState(setRotation(30));
const state = store.getState();

if (!state.metrics.zones16 || state.metrics.zones16.zones.length !== 16) {
  throw new Error('State metrics zones16 integration failed');
}
if (!state.metrics.entranceGates32 || state.metrics.entranceGates32.length !== 32) {
  throw new Error('State metrics entranceGates32 integration failed');
}

console.log('All Phase 5 unit tests PASSED successfully!');
