/**
 * Marma sthan follows Brihat Samhita 53.63–64: six vamsa lines (two corner diagonals plus four
 * two padas off them) crossing at nine atimarma points, squares 23 31 33 39 41 43 49 51 59.
 * Run: node scratch/test_marma.js
 */
import assert from 'node:assert/strict';
import { recalculateMetrics } from '../js/state.js';

const square = [{ x: 0, y: 0 }, { x: 900, y: 0 }, { x: 900, y: 900 }, { x: 0, y: 900 }];
const pada = 100;

for (const shape of ['plot', 'rect']) {
  const m = recalculateMetrics(square, true, 0, 'north', shape).marmaSthan;
  assert.equal(m.lines.length, 6);
  assert.equal(m.marmaPoints.length, 9);
  // Atimarma at pada centres; square number = row * 9 + col + 1
  const squares = m.marmaPoints.map((p) => Math.floor(p.y / pada) * 9 + Math.floor(p.x / pada) + 1).sort((a, b) => a - b);
  assert.deepEqual(squares, [23, 31, 33, 39, 41, 43, 49, 51, 59]);
  // Every point sits on two of the lines
  const onLine = (p, l) => Math.abs((l.end.x - l.start.x) * (l.start.y - p.y) - (l.end.y - l.start.y) * (l.start.x - p.x)) / Math.hypot(l.end.x - l.start.x, l.end.y - l.start.y) < 1e-6;
  m.marmaPoints.forEach((p) => assert.ok(m.lines.filter((l) => onLine(p, l)).length >= 2, `${p.name} not on two lines`));
  // Mukhya–Bhrisha line runs from N3's corner to E7's corner
  const mb = m.lines.find((l) => l.name === 'Mukhya – Bhrisha');
  assert.deepEqual([Math.round(mb.start.x), Math.round(mb.start.y), Math.round(mb.end.x), Math.round(mb.end.y)], [200, 0, 900, 700]);
  console.log(`  ✔ ${shape}: 6 vamsa lines, atimarma squares 23 31 33 39 41 43 49 51 59`);
}

// Rotating North turns the lattice about the centroid; the centre point stays on the centroid
const r = recalculateMetrics(square, true, 30, 'north', 'plot');
assert.ok(Math.hypot(r.marmaSthan.marmaPoints[0].x - r.centroid.x, r.marmaSthan.marmaPoints[0].y - r.centroid.y) < 1e-6);
console.log('  ✔ centre point stays on the centroid when North turns');
