/**
 * Assertion tests for the gap fixes: real zone areas, angular 32 entrances,
 * Set Scale units, grid alignment, and the scale-gated land energy.
 * Run: node scratch/test_gap_fixes.js
 */
import assert from 'node:assert/strict';
import { calculatePolygonArea, rotatePoint, calculatePolygonCentroid } from '../js/geometry.js';
import {
  createInitialState,
  recalculateMetrics,
  setPolygonPoints,
  setCalibrationMode,
  addCalibrationPoint,
  applyCalibration,
  setGridAlign,
  setRotation
} from '../js/state.js';
import { calculatePanchTatvaSummary, calculatePositiveLandEnergy, calculate16BarChart, calculateVithiSummary, formatArea } from '../js/analysis.js';

const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log(`  ✔ ${name}`);
};

const rect = [{ x: 0, y: 0 }, { x: 600, y: 0 }, { x: 600, y: 400 }, { x: 0, y: 400 }];
const lShape = [{ x: 0, y: 0 }, { x: 600, y: 0 }, { x: 600, y: 240 }, { x: 300, y: 240 }, { x: 300, y: 400 }, { x: 0, y: 400 }];

const onBoundary = (pt, poly) => poly.some((a, i) => {
  const b = poly[(i + 1) % poly.length];
  const cross = (b.x - a.x) * (pt.y - a.y) - (b.y - a.y) * (pt.x - a.x);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const within = Math.min(a.x, b.x) - 1e-6 <= pt.x && pt.x <= Math.max(a.x, b.x) + 1e-6
    && Math.min(a.y, b.y) - 1e-6 <= pt.y && pt.y <= Math.max(a.y, b.y) + 1e-6;
  return within && Math.abs(cross) / len < 1e-6;
});

console.log('Zone areas & Panch Tatva');
test('16 zone areas sum to the plot area (rectangle and L-shape, any rotation)', () => {
  for (const poly of [rect, lShape]) {
    for (const rot of [0, 17, 45, 200]) {
      const m = recalculateMetrics(poly, true, rot);
      const sum = m.zones16.zones.reduce((s, z) => s + z.area, 0);
      assert.ok(near(sum, calculatePolygonArea(poly)), `sum ${sum} at ${rot}°`);
    }
  }
});
test('Panch Tatva shares add up to 100% and change with plot shape', () => {
  const a = calculatePanchTatvaSummary(recalculateMetrics(rect, true, 0).zones16);
  const b = calculatePanchTatvaSummary(recalculateMetrics(lShape, true, 0).zones16);
  assert.ok(Math.abs(a.reduce((s, e) => s + e.percentage, 0) - 100) < 0.3);
  assert.ok(Math.abs(b.reduce((s, e) => s + e.percentage, 0) - 100) < 0.3);
  assert.notDeepEqual(a.map((e) => e.percentage), b.map((e) => e.percentage));
});
test('symmetric rectangle gives N area = S area and E area = W area', () => {
  const zones = Object.fromEntries(recalculateMetrics(rect, true, 0).zones16.zones.map((z) => [z.id, z.area]));
  assert.ok(near(zones.N, zones.S) && near(zones.E, zones.W));
});
test('Panch Tatva is empty (no fake numbers) before the plot is closed', () => {
  const summary = calculatePanchTatvaSummary(recalculateMetrics(rect, false, 0).zones16);
  assert.ok(summary.every((e) => !e.hasData && e.formattedPercentage === '—'));
});
test('every zone belongs to exactly one element (map colours match the panel)', () => {
  const summary = calculatePanchTatvaSummary(null);
  const all = summary.flatMap((e) => e.zones);
  assert.equal(all.length, 16);
  assert.equal(new Set(all).size, 16);
});

console.log('32 entrances by angle');
test('32 gates in order N1–N8, E1–E8, S1–S8, W1–W8, each 11.25°', () => {
  const gates = recalculateMetrics(rect, true, 0).entranceGates32;
  assert.equal(gates.length, 32);
  assert.equal(gates[0].code, 'N1');
  assert.equal(gates[8].code, 'E1');
  assert.equal(gates[31].code, 'W8');
  gates.forEach((g) => assert.ok(near(((g.toDeg - g.fromDeg + 360) % 360), 11.25)));
});
test('every gate segment lies on the real boundary (L-shape, rotated 25°)', () => {
  const gates = recalculateMetrics(lShape, true, 25).entranceGates32;
  gates.forEach((g) => g.path.forEach((pt) => assert.ok(onBoundary(pt, lShape), `${g.code} off boundary`)));
});
test('N4 sits just west of North, N5 just east (centroid as origin, rotation 0)', () => {
  const m = recalculateMetrics(rect, true, 0);
  const byCode = Object.fromEntries(m.entranceGates32.map((g) => [g.code, g]));
  assert.ok(byCode.N4.edgeMidpoint.x < m.centroid.x && byCode.N5.edgeMidpoint.x > m.centroid.x);
  assert.ok(near(byCode.N4.edgeMidpoint.y, 0) && near(byCode.E3.edgeMidpoint.x, 600));
});
test('gate names still come from the 32 outer Devtas', () => {
  const byCode = Object.fromEntries(recalculateMetrics(rect, true, 0).entranceGates32.map((g) => [g.code, g.name]));
  assert.equal(byCode.N3, 'Mukhya');
  assert.equal(byCode.E1, 'Shikhi');
  assert.equal(byCode.S1, 'Anila');
  assert.equal(byCode.W4, 'Pushpadanta');
});
test('gate segments tile the whole perimeter with no gaps or overlaps', () => {
  for (const poly of [rect, lShape]) {
    const gates = recalculateMetrics(poly, true, 10).entranceGates32;
    const total = gates.reduce((s, g) => s + g.path.slice(1).reduce((t, p, i) => t + Math.hypot(p.x - g.path[i].x, p.y - g.path[i].y), 0), 0);
    const perimeter = poly.reduce((s, a, i) => { const b = poly[(i + 1) % poly.length]; return s + Math.hypot(b.x - a.x, b.y - a.y); }, 0);
    assert.ok(near(total, perimeter, 1e-6), `${total} vs ${perimeter}`);
  }
});

console.log('Set Scale & land energy');
test('Set Scale: 600 px line = 60 ft gives real area and dimensions', () => {
  let s = setPolygonPoints(rect, true)(createInitialState());
  s = setCalibrationMode(true)(s);
  s = addCalibrationPoint({ x: 0, y: 0 })(s);
  s = addCalibrationPoint({ x: 600, y: 0 })(s);
  s = applyCalibration(60, 'ft')(s);
  assert.ok(near(s.calibration.realPerWorld, 0.1));
  assert.equal(s.isCalibrating, false);
  assert.equal(formatArea(s.metrics.area, s.calibration), '2,400 sq ft');
});
test('land energy needs Set Scale (no pixel guesses)', () => {
  const m = recalculateMetrics(rect, true, 0);
  const res = calculatePositiveLandEnergy(m, null);
  assert.equal(res.isActive, false);
  assert.equal(res.verdict.code, 'NO_SCALE');
});
test('60 × 40 ft plot: income 480, expenditure 432, remainder 4, recommended', () => {
  const res = calculatePositiveLandEnergy(recalculateMetrics(rect, true, 0), { realPerWorld: 0.1, unit: 'ft' });
  assert.equal(res.length, 60);
  assert.equal(res.breadth, 40);
  assert.equal(res.income, 480);
  assert.equal(res.expenditure, 432);
  assert.equal(res.remainder, 4);
  assert.equal(res.verdict.code, 'RECOMMENDED');
  assert.equal(res.remainderInfo.yoni, undefined);
});
test('metre scale is converted to feet for land energy', () => {
  const res = calculatePositiveLandEnergy(recalculateMetrics(rect, true, 0), { realPerWorld: 18.288 / 600, unit: 'm' });
  assert.equal(res.length, 60);
  assert.equal(res.breadth, 40);
});
test('Clear-boundary style polygon changes keep the scale; Reset All clears it', () => {
  let s = setPolygonPoints(rect, true)(createInitialState());
  s = applyCalibration(60, 'ft')(addCalibrationPoint({ x: 600, y: 0 })(addCalibrationPoint({ x: 0, y: 0 })(setCalibrationMode(true)(s))));
  s = setPolygonPoints(lShape, true)(s);
  assert.ok(s.calibration);
  assert.equal(createInitialState().calibration, null);
});

console.log('Grid alignment');
const tilted = (() => {
  const c = { x: 300, y: 200 };
  return rect.map((p) => rotatePoint(p, c, (20 * Math.PI) / 180));
})();
test('walls mode lays the grid on a tilted plot exactly (600 × 400)', () => {
  let s = setPolygonPoints(tilted, true)(createInitialState());
  s = setGridAlign('walls')(s);
  const g = s.metrics.grid9x9;
  assert.ok(near(Math.max(g.totalWidth, g.totalHeight), 600, 1e-6) && near(Math.min(g.totalWidth, g.totalHeight), 400, 1e-6));
});
test('north mode keeps the old behaviour: grid turns with North and grows on a tilted plot', () => {
  const s = setPolygonPoints(tilted, true)(createInitialState());
  assert.equal(s.metrics.gridAngle, 0);
  assert.ok(s.metrics.grid9x9.totalWidth > 600);
});
test('walls mode picks the wall direction nearest North and follows rotation changes', () => {
  let s = setGridAlign('walls')(setPolygonPoints(tilted, true)(createInitialState()));
  assert.ok(near(s.metrics.gridAngle, 20, 1e-6));
  s = setRotation(80)(s);
  assert.ok(near(s.metrics.gridAngle, 110, 1e-6));
  assert.ok(near(s.metrics.zones16.angleDeg, 80));
});
test('centroid unchanged by alignment mode', () => {
  const a = setPolygonPoints(lShape, true)(createInitialState());
  const b = setGridAlign('walls')(a);
  assert.deepEqual(a.metrics.centroid, b.metrics.centroid);
  assert.deepEqual(a.metrics.centroid, calculatePolygonCentroid(lShape));
});

console.log('16 Bar Chart');
test('16 bars in compass order N → NNW that add up to 100%, average 6.25%', () => {
  const chart = calculate16BarChart(recalculateMetrics(lShape, true, 0).zones16);
  assert.equal(chart.bars.length, 16);
  assert.equal(chart.bars[0].id, 'N');
  assert.equal(chart.bars[15].id, 'NNW');
  assert.ok(near(chart.bars.reduce((s, b) => s + b.pct, 0), 100));
  assert.ok(near(chart.mean, 6.25));
});
test('symmetric rectangle gives matching opposite bars', () => {
  const byId = Object.fromEntries(calculate16BarChart(recalculateMetrics(rect, true, 0).zones16).bars.map((b) => [b.id, b.pct]));
  assert.ok(near(byId.N, byId.S) && near(byId.NE, byId.SW) && near(byId.E, byId.W));
});
test('colour groups follow the average and ±1 SD lines', () => {
  const chart = calculate16BarChart(recalculateMetrics(lShape, true, 30).zones16);
  chart.bars.forEach((b) => {
    if (b.band === 'high') assert.ok(b.pct > chart.mean + chart.sd);
    if (b.band === 'low') assert.ok(b.pct < chart.mean - chart.sd);
    if (b.band === 'above') assert.ok(b.pct >= chart.mean && b.pct <= chart.mean + chart.sd + 1e-9);
    if (b.band === 'below') assert.ok(b.pct < chart.mean && b.pct >= chart.mean - chart.sd - 1e-9);
  });
  assert.deepEqual(chart.strong, chart.bars.filter((b) => b.band === 'high').map((b) => b.id));
});
test('spread is the population SD of the 16 shares', () => {
  const chart = calculate16BarChart(recalculateMetrics(lShape, true, 0).zones16);
  const sd = Math.sqrt(chart.bars.reduce((s, b) => s + (b.pct - 6.25) ** 2, 0) / 16);
  assert.ok(near(chart.sd, sd));
});
test('L-shape (notch in the SE) has its smallest share in a south-east zone', () => {
  const chart = calculate16BarChart(recalculateMetrics(lShape, true, 0).zones16);
  assert.ok(['ESE', 'SE', 'SSE'].includes(chart.min.id), `min was ${chart.min.id}`);
  assert.ok(chart.max.pct > chart.min.pct);
});
test('no chart data before the plot is closed', () => {
  assert.equal(calculate16BarChart(recalculateMetrics(rect, false, 0).zones16).hasData, false);
  assert.equal(calculate16BarChart(null).hasData, false);
});

console.log('Vithi Mandal');
test('square plot: rings hold exactly 9, 16, 24 and 32 padas of area', () => {
  const sq = [{ x: 0, y: 0 }, { x: 900, y: 0 }, { x: 900, y: 900 }, { x: 0, y: 900 }];
  const rings = recalculateMetrics(sq, true, 0).vithi.rings;
  const pada = 810000 / 81;
  assert.deepEqual(rings.map((r) => r.id), ['brahma', 'daivika', 'manushya', 'paishachika']);
  [9, 16, 24, 32].forEach((n, i) => assert.ok(near(rings[i].area / pada, n), `${rings[i].id}: ${rings[i].area / pada}`));
  rings.forEach((r) => assert.ok(near(r.fillPct, 100)));
});
test('ring areas add up to the plot area (L-shape, any rotation, both grid modes)', () => {
  for (const rot of [0, 23, 140]) {
    for (const align of ['north', 'walls']) {
      const m = recalculateMetrics(lShape, true, rot, align);
      const sum = m.vithi.rings.reduce((s, r) => s + r.area, 0);
      assert.ok(near(sum, calculatePolygonArea(lShape)), `${rot}° ${align}: ${sum}`);
      assert.ok(near(m.vithi.rings.reduce((s, r) => s + r.areaPct, 0), 100));
    }
  }
});
test('rectangle mandala: L-shape cut shows up as a partly filled outer ring', () => {
  const rings = recalculateMetrics(lShape, true, 0, 'north', 'rect').vithi.rings;
  const outer = rings.find((r) => r.id === 'paishachika');
  assert.ok(outer.fillPct < 100 && outer.fillPct > 50, `fill ${outer.fillPct}`);
});
test('Vithi summary carries names, padas and guidance; empty before closing', () => {
  const summary = calculateVithiSummary(recalculateMetrics(lShape, true, 0).vithi);
  assert.equal(summary.hasData, true);
  assert.deepEqual(summary.rings.map((r) => r.padas), [9, 16, 24, 32]);
  assert.ok(summary.rings.every((r) => r.guidance.length > 20));
  assert.equal(calculateVithiSummary(recalculateMetrics(lShape, false, 0).vithi).hasData, false);
});

console.log(`\nAll ${passed} tests passed.`);
