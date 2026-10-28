import { generate9x9VastuGrid } from '../js/geometry.js';
import { DEVTAS_DATA, computeDevtaSpatialFields } from '../js/devtas.js';
import { createStore, setPolygonPoints, setRotation } from '../js/state.js';

console.log('Testing Phase 4: 45 Devtas Mapping Engine...');

// 1. Verify DEVTAS_DATA dictionary count
console.log(`Total Devtas in dictionary: ${DEVTAS_DATA.length}`);
if (DEVTAS_DATA.length !== 45) {
  throw new Error(`Expected 45 devtas, got ${DEVTAS_DATA.length}`);
}

// 2. Generate a 9x9 grid on a sample polygon
const points = [
  { x: 100, y: 100 },
  { x: 500, y: 100 },
  { x: 500, y: 400 },
  { x: 100, y: 400 }
];
const centroid = { x: 300, y: 250 };
const grid = generate9x9VastuGrid(points, centroid, 25);

if (!grid || grid.padas.length !== 81) {
  throw new Error('Grid generation failed');
}

// 3. Compute Devta spatial fields
const devtaFields = computeDevtaSpatialFields(grid);
console.log(`Computed Devta spatial fields count: ${devtaFields.length}`);
if (devtaFields.length !== 45) {
  throw new Error(`Expected 45 devta spatial fields, got ${devtaFields.length}`);
}

// 4. Verify Brahma (Central)
const brahma = devtaFields.find((d) => d.id === 'brahma');
console.log(`Brahma padas count: ${brahma.memberPadas.length}, span: ${brahma.spanCols}x${brahma.spanRows}`);
if (brahma.memberPadas.length !== 9 || brahma.spanCols !== 3 || brahma.spanRows !== 3) {
  throw new Error('Brahma verification failed');
}

// 5. Verify Cardinal inner devtas
const cardinals = devtaFields.filter((d) => d.category === 'inner_cardinal');
console.log(`Cardinal inner devtas: ${cardinals.map((c) => `${c.name} (${c.memberPadas.length} padas)`).join(', ')}`);
if (cardinals.length !== 4 || cardinals.some((c) => c.memberPadas.length !== 6)) {
  throw new Error('Cardinal devtas verification failed');
}

// 6. Verify Diagonal inner devtas
const diagonals = devtaFields.filter((d) => d.category === 'inner_diagonal');
console.log(`Diagonal inner devtas count: ${diagonals.length}`);
if (diagonals.length !== 8 || diagonals.some((d) => d.memberPadas.length !== 2)) {
  throw new Error('Diagonal devtas verification failed');
}

// 7. Verify Outer perimeter devtas
const outers = devtaFields.filter((d) => d.category.startsWith('outer'));
console.log(`Outer perimeter devtas count: ${outers.length}`);
if (outers.length !== 32 || outers.some((d) => d.memberPadas.length !== 1)) {
  throw new Error('Outer devtas verification failed');
}

// 8. Test State Store integration
const store = createStore();
store.setState(setPolygonPoints(points, true));
store.setState(setRotation(35));
const state = store.getState();

if (!state.metrics.devtaFields || state.metrics.devtaFields.length !== 45) {
  throw new Error('State metrics devtaFields integration failed');
}

console.log('All Phase 4 unit tests PASSED successfully!');
