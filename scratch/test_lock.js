/**
 * Assertion tests for the finished-boundary lock (Edit Polygon / Finish Polygon).
 * Run: node scratch/test_lock.js
 */
import assert from 'node:assert/strict';
import {
  createInitialState,
  addPolygonVertex,
  closePolygon,
  clearBoundary,
  setPolygonLocked,
  undoAction,
  redoAction,
  restoreProject
} from '../js/state.js';

let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log(`  ✔ ${name}`);
};

const rect = [{ x: 0, y: 0 }, { x: 600, y: 0 }, { x: 600, y: 400 }, { x: 0, y: 400 }];
const traced = () => rect.reduce((s, p) => addPolygonVertex(p)(s), createInitialState());

console.log('Finished boundary lock');
test('a new project has nothing to lock', () => {
  const s = createInitialState();
  assert.equal(s.isPolygonLocked, false);
  assert.equal(setPolygonLocked(true)(s), s, 'an open boundary cannot be locked');
});
test('finishing a boundary locks it', () => {
  const s = closePolygon()(traced());
  assert.equal(s.isPolygonClosed, true);
  assert.equal(s.isPolygonLocked, true);
});
test('Edit Polygon unlocks and Finish Polygon locks again', () => {
  const closed = closePolygon()(traced());
  const editing = setPolygonLocked(false)(closed);
  assert.equal(editing.isPolygonLocked, false);
  assert.equal(setPolygonLocked(true)(editing).isPolygonLocked, true);
  assert.equal(setPolygonLocked(true)(closed), closed, 'locking a locked boundary changes nothing');
});
test('clearing the boundary drops the lock', () => {
  assert.equal(clearBoundary()(closePolygon()(traced())).isPolygonLocked, false);
});
test('undo of Finish reopens it; redo closes it locked again', () => {
  const closed = closePolygon()(traced());
  const undone = undoAction()(closed);
  assert.equal(undone.isPolygonClosed, false);
  assert.equal(undone.isPolygonLocked, false);
  const redone = redoAction()(undone);
  assert.equal(redone.isPolygonClosed, true);
  assert.equal(redone.isPolygonLocked, true);
});
test('saved projects open locked, unless they were saved while editing', () => {
  const base = createInitialState();
  assert.equal(restoreProject({ polygon: rect, isPolygonClosed: true })(base).isPolygonLocked, true, 'older saves');
  assert.equal(restoreProject({ polygon: rect, isPolygonClosed: true, isPolygonLocked: false })(base).isPolygonLocked, false);
  assert.equal(restoreProject({ polygon: rect.slice(0, 2), isPolygonClosed: false })(base).isPolygonLocked, false);
});

console.log(`\nAll ${passed} tests passed.`);
