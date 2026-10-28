import { generate9x9VastuGrid, calculatePolygonCentroid } from '../js/geometry.js';
import { computeDevtaSpatialFields } from '../js/devtas.js';
import { calculate32EntranceGates } from '../js/zones.js';
import { calculateGateAssessment } from '../js/analysis.js';

const polygon = [
  { x: 200, y: 100 },
  { x: 800, y: 100 },
  { x: 800, y: 600 },
  { x: 200, y: 600 }
];

const centroid = calculatePolygonCentroid(polygon);
const grid = generate9x9VastuGrid(polygon, centroid, 0);
const devtas = computeDevtaSpatialFields(grid);
const gates = calculate32EntranceGates(polygon, centroid, 0, devtas);

console.log('Total gates generated:', gates.length);
console.log('North gates:', gates.filter(g => g.category === 'outer_north').map(g => g.code));
console.log('East gates:', gates.filter(g => g.category === 'outer_east').map(g => g.code));
console.log('South gates:', gates.filter(g => g.category === 'outer_south').map(g => g.code));
console.log('West gates:', gates.filter(g => g.category === 'outer_west').map(g => g.code));

const assessment = calculateGateAssessment(gates);
console.log('Assessment totalCount:', assessment.totalCount);
console.log('Assessment auspiciousCount:', assessment.auspiciousCount);
console.log('Auspicious codes:', assessment.auspiciousCodes);

// Verify with 30 degree rotation
const grid30 = generate9x9VastuGrid(polygon, centroid, 30);
const devtas30 = computeDevtaSpatialFields(grid30);
const gates30 = calculate32EntranceGates(polygon, centroid, 30, devtas30);
console.log('Rotated 30deg total gates:', gates30.length);
console.log('North normal at 30deg:', gates30[0].normal);
