/**
 * Assertion tests for the fixes from the live VastuGrid comparison: the North number is the bearing
 * the top of the plan faces, the outer Devtas are centred on the compass points, and the land energy
 * remainder table reads even as positive and odd as negative.
 * Run: node scratch/test_north.js
 */
import assert from 'node:assert/strict';
import { createInitialState, recalculateMetrics, restoreProject, setRotation, setPolygonPoints } from '../js/state.js';
import { calculatePositiveLandEnergy, calculate16BarChart } from '../js/analysis.js';

let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log(`  ✔ ${name}`);
};
const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;
// Angle on screen, clockwise from the top of the plan, -180 to 180
const screenAngle = (p, c) => (Math.atan2(p.x - c.x, -(p.y - c.y)) * 180) / Math.PI;
const wrap = (d) => ((d + 540) % 360) - 180;

const square = [{ x: 0, y: 0 }, { x: 900, y: 0 }, { x: 900, y: 900 }, { x: 0, y: 900 }];
// The plan used for the side-by-side comparison with VastuGrid
const demo = [{ x: 78, y: 58 }, { x: 721, y: 58 }, { x: 721, y: 542 }, { x: 606, y: 542 }, { x: 606, y: 415 }, { x: 78, y: 415 }];

console.log('North is the bearing the top of the plan faces');
test('at 16° North sits 16° anticlockwise of the top, as in VastuGrid', () => {
  const z = recalculateMetrics(square, true, 16).zones16.zones.find((q) => q.id === 'N');
  assert.ok(near(wrap((z.centerRad * 180) / Math.PI + 90), -16));
});
test('every direction moves the same way (East at 74°, South at 164°)', () => {
  const zones = recalculateMetrics(square, true, 16).zones16.zones;
  const at = (id) => wrap((zones.find((q) => q.id === id).centerRad * 180) / Math.PI + 90);
  assert.ok(near(at('E'), 74));
  assert.ok(near(at('S'), 164));
});
test('0° leaves North at the top; 360° is the same as 0°', () => {
  const at = (r) => recalculateMetrics(square, true, r).zones16.zones.find((q) => q.id === 'N').centerRad;
  assert.ok(near(wrap((at(0) * 180) / Math.PI + 90), 0));
  assert.ok(near(wrap((at(360) * 180) / Math.PI + 90), 0));
});
test('the number the person typed stays as typed in the state', () => {
  const s = setRotation(16)(setPolygonPoints(square, true)(createInitialState()));
  assert.equal(s.rotation, 16);
  assert.equal(s.metrics.gridAngle, 344);
});
test('the grid and Marma lines turn with North (grid angle follows the new direction)', () => {
  assert.equal(recalculateMetrics(square, true, 30).gridAngle, 330);
  assert.equal(recalculateMetrics(square, true, 0).gridAngle, 0);
});

console.log('Saved projects');
const base = createInitialState();
const saved = (extra) => ({ polygon: demo, isPolygonClosed: true, ...extra });
test('a version 1 save is converted so its zones do not move', () => {
  const restored = restoreProject(saved({ version: 1, rotation: 16 }))(base);
  assert.equal(restored.rotation, 344);
  const north = restored.metrics.zones16.zones.find((q) => q.id === 'N').centerRad;
  assert.ok(near(wrap((north * 180) / Math.PI + 90), 16), 'North stays 16° clockwise of the top, as it was saved');
});
test('a version 1 save at 0° stays at 0°', () => {
  assert.equal(restoreProject(saved({ version: 1, rotation: 0 }))(base).rotation, 0);
});
test('a version 2 save is left alone', () => {
  assert.equal(restoreProject(saved({ version: 2, rotation: 16 }))(base).rotation, 16);
});

console.log('Outer Devtas');
const bearingOf = (code, rotation = 0) => {
  const m = recalculateMetrics(square, true, rotation);
  const d = m.devtaFields.find((q) => q.entranceCode === code);
  return wrap(screenAngle(d.center, m.centroid) + rotation);
};
test('Soma, Surya, Yama and Varuna are centred on N, E, S and W', () => {
  assert.ok(near(bearingOf('N5'), 0, 0.5), `Soma ${bearingOf('N5')}`);
  assert.ok(near(bearingOf('E5'), 90, 0.5), `Surya ${bearingOf('E5')}`);
  assert.ok(near(Math.abs(bearingOf('S5')), 180, 0.5), `Yama ${bearingOf('S5')}`);
  assert.ok(near(bearingOf('W5'), -90, 0.5), `Varuna ${bearingOf('W5')}`);
});
test('Shikhi sits on North-East and Roga on North-West', () => {
  assert.ok(near(bearingOf('E1'), 45, 2), `Shikhi ${bearingOf('E1')}`);
  assert.ok(near(bearingOf('N1'), -45, 2), `Roga ${bearingOf('N1')}`);
});
test('they stay on their compass points when North turns', () => {
  assert.ok(near(bearingOf('N5', 30), 0, 3), `Soma ${bearingOf('N5', 30)}`);
  assert.ok(near(bearingOf('E5', 30), 90, 3), `Surya ${bearingOf('E5', 30)}`);
});
test('the 32 Gates still start at 315°: the N4 / N5 boundary is on North', () => {
  const gates = recalculateMetrics(square, true, 0).entranceGates32;
  const n5 = gates.find((g) => g.code === 'N5');
  const c = recalculateMetrics(square, true, 0).centroid;
  assert.ok(near(screenAngle(n5.outerEdgeStart, c), 0, 0.01), 'N5 starts on North');
});

console.log('Land energy');
const land = (length, breadth) => calculatePositiveLandEnergy(recalculateMetrics(square, true, 0), null, { length, breadth });
test('VastuGrid\'s table: even remainders positive, odd negative', () => {
  const expected = { 73: [1, false], 74: [2, true], 75: [3, false], 76: [4, true], 77: [5, false], 78: [6, true], 79: [7, false] };
  Object.entries(expected).forEach(([sum, [remainder, positive]]) => {
    const r = land(41, Number(sum) - 41);
    assert.equal(r.remainder, remainder, `sum ${sum}`);
    assert.equal(r.remainderInfo.isPositive, positive, `sum ${sum}`);
  });
});
test('an exact division reads as remainder 8 and is positive (41 + 31)', () => {
  const r = land(41, 31);
  assert.equal(r.remainder, 8);
  assert.equal(r.remainderInfo.isPositive, true);
  assert.equal(r.income, 328);
  assert.equal(r.expenditure, 334.8);
  assert.equal(r.ratio, 1.32);
});
test('decimals round first; a sum near a boundary is flagged as borderline with its other reading', () => {
  const r = land(41, 30.8);
  assert.equal(r.sumDimensions, 72);
  assert.equal(r.remainder, 8);
  const edge = land(40.3, 31.2); // 71.5: the other reading is 71, remainder 7
  assert.equal(edge.borderline, true);
  assert.equal(edge.remainder, 8);
  assert.equal(edge.alternateRemainder, 7);
});
test('a borderline sum whose other reading divides exactly shows 8, not 0', () => {
  const edge = land(40.3, 32.2); // 72.5 rounds to 73 (remainder 1); the other reading is 72
  assert.equal(edge.remainder, 1);
  assert.equal(edge.alternateRemainder, 8);
});

console.log('Bar chart');
test('the bars still add up to 100% at any bearing', () => {
  [0, 16, 45, 200].forEach((r) => {
    const total = calculate16BarChart(recalculateMetrics(demo, true, r).zones16).bars.reduce((sum, b) => sum + b.pct, 0);
    assert.ok(near(total, 100, 1e-6), `${r}°: ${total}`);
  });
});

console.log(`\nAll ${passed} tests passed.`);
