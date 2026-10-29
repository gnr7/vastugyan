/**
 * Assertion tests for the one-tap views in Layers.
 * Run: node scratch/test_views.js
 */
import assert from 'node:assert/strict';
import { createInitialState, applyView, currentView, toggleLayer, VIEWS } from '../js/state.js';

let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log(`  ✔ ${name}`);
};

const on = (layers) => Object.keys(layers).filter((k) => layers[k]).sort();

console.log('Views');
test('new projects open in the Mandala view', () => {
  assert.equal(currentView(createInitialState().layers), 'mandala');
});
test('each view switches on exactly its own layers', () => {
  const s0 = createInitialState();
  assert.deepEqual(on(applyView('plan')(s0).layers), []);
  assert.deepEqual(on(applyView('mandala')(s0).layers), ['brahmasthan', 'devtaNames', 'devtas45', 'grid9x9']);
  assert.deepEqual(on(applyView('zones')(s0).layers), ['compassWheel', 'elements']);
  assert.deepEqual(on(applyView('entrances')(s0).layers), ['gates32']);
  assert.deepEqual(on(applyView('marma')(s0).layers), ['brahmasthan', 'grid9x9', 'marma']);
});
test('every view is recognised after applying it', () => {
  Object.keys(VIEWS).forEach((name) => {
    assert.equal(currentView(applyView(name)(createInitialState()).layers), name);
  });
});
test('changing one switch makes it a custom mix', () => {
  const s = toggleLayer('marma', true)(applyView('zones')(createInitialState()));
  assert.equal(currentView(s.layers), null);
});
test('an unknown view leaves the state alone', () => {
  const s0 = createInitialState();
  assert.equal(applyView('everything')(s0), s0);
});

console.log(`\nAll ${passed} tests passed.`);
