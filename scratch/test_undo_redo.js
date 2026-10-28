import {
  createStore,
  createInitialState,
  addPolygonVertex,
  closePolygon,
  clearBoundary,
  undoAction,
  redoAction,
  resetAll,
  commitDragHistory
} from '../js/state.js';

const store = createStore(createInitialState());

console.log('--- Initial State ---');
console.log('Points:', store.getState().polygon.length);
console.log('Past:', store.getState().history.past.length);
console.log('Future:', store.getState().history.future.length);

// Step 1: Add vertices
store.setState(addPolygonVertex({ x: 100, y: 100 }));
store.setState(addPolygonVertex({ x: 500, y: 100 }));
store.setState(addPolygonVertex({ x: 500, y: 500 }));
store.setState(addPolygonVertex({ x: 100, y: 500 }));
console.log('\n--- Added 4 vertices ---');
console.log('Points:', store.getState().polygon.length);
console.log('Past:', store.getState().history.past.length); // should be 4

// Step 2: Close polygon
store.setState(closePolygon());
console.log('\n--- Closed Polygon ---');
console.log('isClosed:', store.getState().isPolygonClosed);
console.log('Past:', store.getState().history.past.length); // should be 5
console.log('Area:', Math.round(store.getState().metrics.area));

// Step 3: Undo close
store.setState(undoAction());
console.log('\n--- Undo (Close) ---');
console.log('isClosed:', store.getState().isPolygonClosed); // should be false
console.log('Points:', store.getState().polygon.length); // 4
console.log('Past:', store.getState().history.past.length); // 4
console.log('Future:', store.getState().history.future.length); // 1

// Step 4: Redo close
store.setState(redoAction());
console.log('\n--- Redo (Close) ---');
console.log('isClosed:', store.getState().isPolygonClosed); // true
console.log('Area:', Math.round(store.getState().metrics.area)); // 160000

// Step 5: Clear Boundary
store.setState(clearBoundary());
console.log('\n--- Clear Boundary ---');
console.log('Points:', store.getState().polygon.length); // 0
console.log('Area:', store.getState().metrics.area); // 0
console.log('Past:', store.getState().history.past.length); // 6

// Step 6: Undo Clear Boundary
store.setState(undoAction());
console.log('\n--- Undo Clear Boundary ---');
console.log('Points restored:', store.getState().polygon.length); // 4
console.log('isClosed:', store.getState().isPolygonClosed); // true
console.log('Area restored:', Math.round(store.getState().metrics.area)); // 160000

// Step 7: Reset All
store.setState(resetAll());
console.log('\n--- Reset All ---');
console.log('Points:', store.getState().polygon.length); // 0
console.log('Past:', store.getState().history.past.length); // 0
console.log('Future:', store.getState().history.future.length); // 0
