/**
 * Assertion tests for the Five Elements styles (Classic and Loose Earth), the Shakti Chakra
 * size and gates, and saving the chosen style with the project.
 * Run: node scratch/test_elements.js
 */
import assert from 'node:assert/strict';
import { calculatePolygonArea } from '../js/geometry.js';
import { createInitialState, recalculateMetrics, setElementStyle, setChakraSize, restoreProject } from '../js/state.js';
import { calculatePanchTatvaSummary, calculate16BarChart } from '../js/analysis.js';
import { ZONES_16_DATA, GATE_RING, GATE_SPAN_DEG, zoneTone, zoneElement } from '../js/zones.js';
import { shaktiChakraRadii } from '../js/canvas.js';

const near = (a, b, eps = 0.11) => Math.abs(a - b) <= eps;
let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log(`  ✔ ${name}`);
};

const rect = [{ x: 0, y: 0 }, { x: 600, y: 0 }, { x: 600, y: 400 }, { x: 0, y: 400 }];
const lShape = [{ x: 0, y: 0 }, { x: 600, y: 0 }, { x: 600, y: 240 }, { x: 300, y: 240 }, { x: 300, y: 400 }, { x: 0, y: 400 }];
const byId = (summary) => Object.fromEntries(summary.map((e) => [e.id, e]));

console.log('Zone to element mapping');
test('Classic style matches VastuGrid: NE is Water, NW is Space', () => {
  assert.equal(zoneElement('NE', 'classic'), 'Water');
  assert.equal(zoneElement('NW', 'classic'), 'Space');
  assert.equal(zoneTone('SW', 'classic'), 'Earth');
});
test('Loose Earth style moves only NE and NW, to Loose Earth; SSW and SW become Hard Earth', () => {
  ZONES_16_DATA.forEach((z) => {
    const classic = zoneElement(z.id, 'classic');
    const loose = zoneElement(z.id, 'looseEarth');
    if (z.id === 'NE' || z.id === 'NW') {
      assert.equal(loose, 'Earth', z.id);
      assert.equal(zoneTone(z.id, 'looseEarth'), 'LooseEarth', z.id);
    } else {
      assert.equal(loose, classic, z.id);
    }
  });
  assert.equal(zoneTone('SSW', 'looseEarth'), 'HardEarth');
  assert.equal(zoneTone('SW', 'looseEarth'), 'HardEarth');
});
test('Loose Earth groups match the Applied Vastu chart', () => {
  const group = (el) => ZONES_16_DATA.filter((z) => zoneElement(z.id, 'looseEarth') === el).map((z) => z.id).sort();
  assert.deepEqual(group('Water'), ['N', 'NNE', 'NNW']);
  assert.deepEqual(group('Air'), ['E', 'ENE', 'ESE']);
  assert.deepEqual(group('Fire'), ['S', 'SE', 'SSE']);
  assert.deepEqual(group('Earth'), ['NE', 'NW', 'SSW', 'SW']);
  assert.deepEqual(group('Space'), ['W', 'WNW', 'WSW']);
});

console.log('Panch Tatva shares');
test('shares add up to 100% in both styles, any shape and rotation', () => {
  for (const poly of [rect, lShape]) {
    for (const rot of [0, 23, 76, 200]) {
      const zones16 = recalculateMetrics(poly, true, rot).zones16;
      for (const style of ['classic', 'looseEarth']) {
        const total = calculatePanchTatvaSummary(zones16, style).reduce((s, e) => s + e.percentage, 0);
        assert.ok(near(total, 100, 0.3), `${style} ${rot}°: ${total}`);
      }
    }
  }
});
test('Loose Earth takes NE from Water and NW from Space; Air and Fire are unchanged', () => {
  const zones16 = recalculateMetrics(lShape, true, 30).zones16;
  const c = byId(calculatePanchTatvaSummary(zones16, 'classic'));
  const l = byId(calculatePanchTatvaSummary(zones16, 'looseEarth'));
  const pctOf = (id) => (zones16.zones.find((z) => z.id === id).area / calculatePolygonArea(lShape)) * 100;
  assert.equal(l.air.percentage, c.air.percentage);
  assert.equal(l.fire.percentage, c.fire.percentage);
  assert.ok(near(l.water.percentage, c.water.percentage - pctOf('NE'), 0.15));
  assert.ok(near(l.space.percentage, c.space.percentage - pctOf('NW'), 0.15));
  assert.ok(near(l.earth.percentage, c.earth.percentage + pctOf('NE') + pctOf('NW'), 0.15));
});
test('Earth is split into hard and loose parts only in Loose Earth style', () => {
  const zones16 = recalculateMetrics(rect, true, 12).zones16;
  const c = byId(calculatePanchTatvaSummary(zones16, 'classic'));
  const l = byId(calculatePanchTatvaSummary(zones16, 'looseEarth'));
  assert.equal(c.earth.earthSplit, null);
  assert.ok(near(l.earth.earthSplit.hard + l.earth.earthSplit.loose, l.earth.percentage, 0.15));
  assert.equal(l.earth.zoneCount, 4);
  assert.match(l.earth.directionRange, /loose/);
});
test('no plot: no shares in either style', () => {
  for (const style of ['classic', 'looseEarth']) {
    assert.ok(calculatePanchTatvaSummary(null, style).every((e) => !e.hasData && e.formattedPercentage === '—'));
  }
});
test('16 bar chart: bars unchanged, element column follows the style', () => {
  const zones16 = recalculateMetrics(lShape, true, 0).zones16;
  const c = calculate16BarChart(zones16, 'classic');
  const l = calculate16BarChart(zones16, 'looseEarth');
  assert.deepEqual(c.bars.map((b) => b.pct), l.bars.map((b) => b.pct));
  assert.equal(c.bars.find((b) => b.id === 'NE').element, 'Water');
  assert.equal(l.bars.find((b) => b.id === 'NE').element, 'Loose Earth');
  assert.equal(l.bars.find((b) => b.id === 'SW').element, 'Hard Earth');
});

console.log('State, saving and the Shakti Chakra');
test('new projects start in Classic style; the style can be switched and back', () => {
  const s0 = createInitialState();
  assert.equal(s0.elementStyle, 'classic');
  assert.equal(s0.layers.shaktiChakra, false);
  const s1 = setElementStyle('looseEarth')(s0);
  assert.equal(s1.elementStyle, 'looseEarth');
  assert.equal(s1.metrics, s0.metrics, 'geometry is not recalculated');
  assert.equal(setElementStyle('nonsense')(s1).elementStyle, 'classic');
  assert.equal(setElementStyle('looseEarth')(s1), s1, 'same style is a no-op');
});
test('a saved project brings its style and chakra back; old saves fall back to Classic', () => {
  const base = createInitialState();
  const restored = restoreProject({ polygon: rect, isPolygonClosed: true, elementStyle: 'looseEarth', chakraSize: 0.8, layers: { shaktiChakra: true } })(base);
  assert.equal(restored.elementStyle, 'looseEarth');
  assert.equal(restored.layers.shaktiChakra, true);
  assert.equal(restored.chakraSize, 0.8);
  const old = restoreProject({ polygon: rect, isPolygonClosed: true })(base);
  assert.equal(old.elementStyle, 'classic');
  assert.equal(old.chakraSize, 1);
});
test('a save with the old compass wheel layer opens with the Shakti Chakra', () => {
  const restored = restoreProject({ polygon: rect, isPolygonClosed: true, layers: { compassWheel: true } })(createInitialState());
  assert.equal(restored.layers.shaktiChakra, true);
  assert.equal('compassWheel' in restored.layers, false);
});
test('chakra size only takes the offered values', () => {
  const s0 = createInitialState();
  assert.equal(s0.chakraSize, 1);
  assert.equal(setChakraSize(1.25)(s0).chakraSize, 1.25);
  assert.equal(setChakraSize(7)(setChakraSize(1.25)(s0)).chakraSize, 1);
  assert.equal(setChakraSize(1)(s0), s0, 'same size is a no-op');
});
test('at Fit the chakra rings sit fully outside the plot, and they scale with the size', () => {
  for (const poly of [rect, lShape]) {
    const m = recalculateMetrics(poly, true, 40);
    const { inner, outer } = shaktiChakraRadii(poly, m.zones16.centroid);
    const far = Math.max(...poly.map((p) => Math.hypot(p.x - m.zones16.centroid.x, p.y - m.zones16.centroid.y)));
    assert.ok(inner > far && outer > inner);
    assert.ok(near(shaktiChakraRadii(poly, m.zones16.centroid, 0.6).outer, outer * 0.6));
  }
});
test('the chakra gate ring matches the 32 entrances: the N4/N5 line sits on North', () => {
  const gate = (label) => GATE_RING.find((g) => g.label === label);
  assert.equal(GATE_RING.length, 32);
  assert.equal(gate('N1').bearing - GATE_SPAN_DEG / 2, 315);
  assert.equal((gate('N5').bearing - GATE_SPAN_DEG / 2) % 360, 0);
  assert.equal(gate('E1').bearing - GATE_SPAN_DEG / 2, 45);
  const m = recalculateMetrics(rect, true, 0);
  m.entranceGates32.forEach((g) => {
    const ring = GATE_RING.find((r) => r.label === g.id || r.label === g.label || r.label === g.code);
    assert.ok(ring, 'every entrance has a place on the ring');
  });
});

console.log(`\nAll ${passed} tests passed.`);
