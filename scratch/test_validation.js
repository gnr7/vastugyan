/**
 * Validation regression tests from the 28 Oct 2026 accuracy review.
 * Uses the two demo plans and VastuGrid's own sample-report plan (traced from its PDF) so every
 * fix stays fixed. Run: node scratch/test_validation.js
 */
import assert from 'node:assert/strict';
import { calculatePolygonArea, calculatePolygonCentroid } from '../js/geometry.js';
import {
  createInitialState, recalculateMetrics, setPolygonPoints, setRotation, commitRotationHistory,
  setCalibrationMode, addCalibrationPoint, applyCalibration, undoAction, redoAction
} from '../js/state.js';
import { calculatePositiveLandEnergy, calculate16BarChart, calculateAreaMetrics } from '../js/analysis.js';

const P = (arr) => arr.map(([x, y]) => ({ x, y }));
const PLAN2 = P([[78,57],[721,57],[721,542],[478,542],[478,416],[78,416]]);
const PLAN1 = P([[456,136],[1417,136],[1417,734],[1144,734],[1144,562],[692,562],[692,800],[772,800],[772,1031],[9,1031],[9,622],[180,622],[180,590],[346,590],[377,590],[377,420],[408,420],[408,211],[456,211]]);
// VastuGrid sample report plan (970×1210 px page image), North measured 49.4° clockwise of the top
// from its gate rays, so the top of the plan faces 360 - 49.4 = 310.6°
const VG = P([[213,55],[665,20],[672,92],[800,93],[800,765],[657,765],[657,1075],[218,1075],[215,697],[84,684],[88,130],[210,128]]);
const U = P([[0,0],[100,0],[100,300],[300,300],[300,0],[400,0],[400,400],[0,400]]);

const near = (a, b, tol) => Math.abs(a - b) <= tol;
const inside = (poly, p) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; };
const perimeter = (poly) => poly.reduce((s, a, i) => s + Math.hypot(poly[(i + 1) % poly.length].x - a.x, poly[(i + 1) % poly.length].y - a.y), 0);
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`  ✔ ${name}`); };

console.log('Matches VastuGrid\'s sample report');
test('centroid, largest direction and spread match the report (SE 9.8%, ±2.0%)', () => {
  const m = recalculateMetrics(VG, true, 360 - 49.4);
  const c = calculate16BarChart(m.zones16);
  assert.ok(near(m.centroid.x, 450, 3) && near(m.centroid.y, 518, 3), 'centroid');
  assert.equal(c.max.id, 'SE');
  assert.ok(near(c.max.pct, 9.8, 0.15), `max ${c.max.pct}`);
  assert.ok(near(c.sd, 2.0, 0.15), `sd ${c.sd}`);
  assert.deepEqual(c.strong.filter((z) => ['ESE', 'SE'].includes(z)), ['ESE', 'SE']);
  assert.ok(c.weak.includes('NE') && c.weak.includes('S'));
});
test('Brahmasthan is the plot at 1/3 scale about the centroid: exactly 1/9 of its area', () => {
  for (const poly of [VG, PLAN1, PLAN2]) {
    const m = recalculateMetrics(poly, true, 30);
    assert.ok(near(m.brahmasthan.pctOfPlot, 100 / 9, 1e-9), `${m.brahmasthan.pctOfPlot}`);
    const bc = calculatePolygonCentroid(m.grid9x9.brahmasthanOutline);
    assert.ok(near(bc.x, m.centroid.x, 2) && near(bc.y, m.centroid.y, 2), 'centred on the centroid');
  }
});
test('each outer Devta is centred half a slice before its gate (Shikhi = E1 on North-East …)', () => {
  const m = recalculateMetrics(VG, true, 360 - 49.4);
  const gates = Object.fromEntries(m.entranceGates32.map((g) => [g.code, g]));
  m.devtaFields.filter((d) => d.entranceCode).forEach((d) => {
    const b = ((Math.atan2(d.center.x - m.centroid.x, -(d.center.y - m.centroid.y)) * 180 / Math.PI - 49.4) % 360 + 360) % 360;
    const g = gates[d.entranceCode];
    const off = Math.abs(((b - g.fromDeg + 540) % 360) - 180);
    assert.ok(off <= 5.625 + 1e-6, `${d.name} (${d.entranceCode}) at ${b.toFixed(1)}°`);
  });
});
test('inner corner Devtas run clockwise like VastuGrid (6→7, 8→9, 10→11, 12→13)', () => {
  const m = recalculateMetrics(P([[0,0],[900,0],[900,900],[0,900]]), true, 0);
  const bearing = (n) => { const d = m.devtaFields.find((f) => f.number === n); return (Math.atan2(d.center.x - 450, -(d.center.y - 450)) * 180 / Math.PI + 360) % 360; };
  [[6, 7], [8, 9], [10, 11], [12, 13]].forEach(([a, b]) => assert.ok(bearing(a) < bearing(b), `${a} before ${b}`));
});

console.log('Plot-following mandala on the demo plans');
test('no Devta sits outside the house (was 10 of 45 on plan 2 and 20 of 45 on plan 1)', () => {
  for (const [poly, rot] of [[PLAN2, 0], [PLAN1, 0], [PLAN1, 45], [VG, 360 - 49.4]]) {
    const m = recalculateMetrics(poly, true, rot);
    const out = m.devtaFields.filter((d) => !inside(poly, d.center)).map((d) => d.name);
    assert.deepEqual(out, [], `outside: ${out.join(', ')}`);
  }
});
test('the classical rectangle is still available and unchanged', () => {
  const m = recalculateMetrics(PLAN2, true, 0, 'north', 'rect');
  assert.ok(near(m.grid9x9.totalWidth, 643, 1e-6) && near(m.grid9x9.totalHeight, 485, 1e-6));
  assert.ok(near(m.brahmasthan.pctOfPlot, 13.25, 0.01), `${m.brahmasthan.pctOfPlot}`);
});
test('Brahmasthan label is its share of the plot', () => {
  assert.ok(near(calculateAreaMetrics(recalculateMetrics(PLAN1, true, 0, 'north', 'rect')).brahmasthanRatioPct, 12.0, 0.1));
  assert.ok(near(calculateAreaMetrics(recalculateMetrics(PLAN1, true, 0)).brahmasthanRatioPct, 11.1, 0.05));
});

console.log('Bugs from the review');
test('Land Energy L × B comes from the walls: the same at any North (plan 2: 41.1 × 31.0 ft)', () => {
  const cal = { realPerWorld: 41 / 641, unit: 'ft' };
  for (const rot of [0, 30, 77, 200]) {
    const l = calculatePositiveLandEnergy(recalculateMetrics(PLAN2, true, rot), cal);
    assert.equal(l.length, 41.1);
    assert.equal(l.breadth, 31);
    assert.equal(l.remainder, 8);
  }
});
test('typed plot size overrides the measured one; borderline remainders are flagged', () => {
  const m = recalculateMetrics(PLAN2, true, 0);
  const typed = calculatePositiveLandEnergy(m, null, { length: 41, breadth: 30.83 });
  assert.equal(typed.source, 'typed');
  assert.equal(typed.remainder, 8);
  const edge = calculatePositiveLandEnergy(m, null, { length: 40.3, breadth: 31.2 }); // 71.5 → borderline
  assert.equal(edge.borderline, true);
  assert.notEqual(edge.alternateRemainder, edge.remainder);
});
test('U-shaped plan (centroid outside the building): entrances cover the wall exactly once', () => {
  for (const rot of [0, 37]) {
    const gates = recalculateMetrics(U, true, rot).entranceGates32;
    const covered = gates.reduce((s, g) => s + g.wallLength, 0);
    assert.ok(near(covered, perimeter(U), 1e-6), `${covered} vs ${perimeter(U)}`);
  }
});
test('demo plans: entrances still cover each wall exactly once', () => {
  for (const poly of [PLAN1, PLAN2, VG]) {
    const covered = recalculateMetrics(poly, true, 23).entranceGates32.reduce((s, g) => s + g.wallLength, 0);
    assert.ok(near(covered, perimeter(poly), 1e-6));
  }
});
test('a self-crossing boundary is reported, not measured', () => {
  const m = recalculateMetrics(P([[0,0],[300,300],[300,0],[0,300]]), true, 0);
  assert.equal(m.boundaryError, 'self-intersecting');
  assert.equal(m.area, 0);
  assert.equal(m.grid9x9, null);
  assert.ok(m.crossings.length > 0);
  assert.equal(recalculateMetrics(PLAN1, true, 0).boundaryError, null);
});
test('undo covers North and the scale as well as the boundary', () => {
  let s = setPolygonPoints(PLAN2, true)(createInitialState());
  s = setRotation(40)(s); s = commitRotationHistory(0)(s);
  s = setCalibrationMode(true)(s); s = addCalibrationPoint({ x: 79, y: 17 })(s); s = addCalibrationPoint({ x: 720, y: 17 })(s); s = applyCalibration(41, 'ft')(s);
  assert.ok(s.calibration);
  s = undoAction()(s); assert.equal(s.calibration, null); assert.equal(s.rotation, 40);
  s = undoAction()(s); assert.equal(s.rotation, 0);
  s = redoAction()(s); assert.equal(s.rotation, 40);
  s = redoAction()(s); assert.ok(s.calibration);
  assert.ok(near(calculatePolygonArea(s.polygon), calculatePolygonArea(PLAN2), 1e-9));
});

console.log(`\nAll ${passed} validation tests passed.`);
