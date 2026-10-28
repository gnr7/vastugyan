import {
  calculatePolygonArea,
  calculatePolygonCentroid,
  calculateBoundingBox,
  generate9x9VastuGrid,
  calculateMarmaSthan
} from './geometry.js';
import { computeDevtaSpatialFields } from './devtas.js';
import { calculate16DirectionalZones, calculate32EntranceGates } from './zones.js';

// Initial state factory function
export const createInitialState = () => Object.freeze({
  image: null,           // { element, width, height, src, name }
  viewport: Object.freeze({
    x: 0,
    y: 0,
    scale: 1,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0
  }),
  polygon: Object.freeze([]), // array of { x, y } in world coordinates
  isPolygonClosed: false,
  isDrawingPolygon: false,
  activeVertexIndex: null,
  draggingVertexIndex: null,
  hoverVertexIndex: null,
  cursorWorldPos: null,       // current mouse position in world coordinates
  rotation: 0,                // 0 - 360 degrees
  layers: Object.freeze({
    grid9x9: true,
    brahmasthan: true,
    devtas45: false,
    devtaNames: false,
    zones16: false,
    gates32: false,
    marma: false,
    elements: false
  }),
  metrics: Object.freeze({
    area: 0,
    centroid: null,           // { x, y }
    bounds: null,             // { minX, minY, maxX, maxY, width, height }
    grid9x9: null,            // 9x9 Vastu grid & Brahmasthan
    devtaFields: null,        // 45 Devtas spatial fields
    zones16: null,            // 16 Directional Zones
    entranceGates32: null,    // 32 Perimeter Entrance Gates
    marmaSthan: null          // Marma Sthan diagonal lines and nodes
  }),
  history: Object.freeze({
    past: Object.freeze([]),    // array of previous { polygon, isPolygonClosed } snapshots
    future: Object.freeze([])   // array of redone { polygon, isPolygonClosed } snapshots
  })
});

// App Store implementation
export const createStore = (initialState = createInitialState()) => {
  let currentState = initialState;
  const listeners = new Set();

  const getState = () => currentState;

  const setState = (updater) => {
    const nextState = typeof updater === 'function' ? updater(currentState) : updater;
    if (nextState !== currentState) {
      currentState = Object.freeze(nextState);
      listeners.forEach((listener) => listener(currentState));
    }
    return currentState;
  };

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return { getState, setState, subscribe };
};

// Pure updater helper functions
export const setFloorPlanImage = (imageElement, fileInfo = {}) => (state) => {
  const width = imageElement.naturalWidth || imageElement.width;
  const height = imageElement.naturalHeight || imageElement.height;

  return {
    ...state,
    image: {
      element: imageElement,
      width,
      height,
      name: fileInfo.name || 'Floor Plan',
      size: fileInfo.size || 0
    }
  };
};

export const updateViewport = (partialViewport) => (state) => ({
  ...state,
  viewport: Object.freeze({
    ...state.viewport,
    ...partialViewport
  })
});

export const setRotation = (deg) => (state) => {
  const normalizedDeg = ((deg % 360) + 360) % 360;
  return {
    ...state,
    rotation: normalizedDeg,
    metrics: recalculateMetrics(state.polygon, state.isPolygonClosed, normalizedDeg)
  };
};

export const toggleLayer = (layerName, isVisible) => (state) => ({
  ...state,
  layers: Object.freeze({
    ...state.layers,
    [layerName]: typeof isVisible === 'boolean' ? isVisible : !state.layers[layerName]
  })
});

// Pure calculation of metrics, 9x9 grid, Devtas, and 16 Zones from polygon and rotation
export const recalculateMetrics = (points, isClosed, rotation = 0) => {
  if (!points || points.length === 0) {
    return Object.freeze({
      area: 0,
      centroid: null,
      bounds: null,
      grid9x9: null,
      devtaFields: null,
      zones16: null,
      entranceGates32: null,
      marmaSthan: null
    });
  }

  const area = isClosed ? calculatePolygonArea(points) : 0;
  const centroid = calculatePolygonCentroid(points);
  const bounds = calculateBoundingBox(points);
  const grid9x9 = (isClosed && points.length >= 3 && centroid)
    ? generate9x9VastuGrid(points, centroid, rotation)
    : null;
  const devtaFields = grid9x9 ? computeDevtaSpatialFields(grid9x9) : null;
  const zones16 = centroid ? calculate16DirectionalZones(centroid, bounds, rotation, grid9x9) : null;
  const entranceGates32 = (grid9x9 && devtaFields) ? calculate32EntranceGates(grid9x9, devtaFields) : null;
  const marmaSthan = (isClosed && points.length >= 3 && centroid)
    ? calculateMarmaSthan(points, centroid, rotation)
    : null;

  return Object.freeze({
    area,
    centroid,
    bounds,
    grid9x9,
    devtaFields,
    zones16,
    entranceGates32,
    marmaSthan
  });
};

export const setDrawingMode = (isDrawing) => (state) => ({
  ...state,
  isDrawingPolygon: isDrawing,
  cursorWorldPos: isDrawing ? state.cursorWorldPos : null
});

const MAX_HISTORY = 40;

export const addPolygonVertex = (point) => (state) => {
  const currentSnapshot = { polygon: state.polygon, isPolygonClosed: state.isPolygonClosed };
  const nextPast = [...(state.history?.past || []), currentSnapshot].slice(-MAX_HISTORY);
  const nextPolygon = [...state.polygon, { x: point.x, y: point.y }];

  return {
    ...state,
    polygon: Object.freeze(nextPolygon),
    history: Object.freeze({
      past: Object.freeze(nextPast),
      future: Object.freeze([])
    }),
    metrics: recalculateMetrics(nextPolygon, state.isPolygonClosed, state.rotation)
  };
};

export const closePolygon = () => (state) => {
  if (state.polygon.length < 3) return state;
  const currentSnapshot = { polygon: state.polygon, isPolygonClosed: state.isPolygonClosed };
  const nextPast = [...(state.history?.past || []), currentSnapshot].slice(-MAX_HISTORY);

  return {
    ...state,
    isPolygonClosed: true,
    isDrawingPolygon: false,
    cursorWorldPos: null,
    history: Object.freeze({
      past: Object.freeze(nextPast),
      future: Object.freeze([])
    }),
    metrics: recalculateMetrics(state.polygon, true, state.rotation)
  };
};

export const updatePolygonVertex = (index, point) => (state) => {
  if (index < 0 || index >= state.polygon.length) return state;
  const nextPolygon = state.polygon.map((v, i) => (i === index ? { x: point.x, y: point.y } : v));
  return {
    ...state,
    polygon: Object.freeze(nextPolygon),
    metrics: recalculateMetrics(nextPolygon, state.isPolygonClosed, state.rotation)
  };
};

export const commitDragHistory = (dragStartSnapshot) => (state) => {
  if (!dragStartSnapshot) return state;
  const isIdentical =
    dragStartSnapshot.isPolygonClosed === state.isPolygonClosed &&
    dragStartSnapshot.polygon.length === state.polygon.length &&
    dragStartSnapshot.polygon.every((p, i) => p.x === state.polygon[i]?.x && p.y === state.polygon[i]?.y);

  if (isIdentical) return state;

  const nextPast = [...(state.history?.past || []), dragStartSnapshot].slice(-MAX_HISTORY);
  return {
    ...state,
    history: Object.freeze({
      past: Object.freeze(nextPast),
      future: Object.freeze([])
    })
  };
};

export const setHoverVertex = (index) => (state) => {
  if (state.hoverVertexIndex === index) return state;
  return {
    ...state,
    hoverVertexIndex: index
  };
};

export const setDraggingVertex = (index) => (state) => {
  if (state.draggingVertexIndex === index) return state;
  return {
    ...state,
    draggingVertexIndex: index
  };
};

export const setCursorWorldPos = (pos) => (state) => ({
  ...state,
  cursorWorldPos: pos ? { x: pos.x, y: pos.y } : null
});

export const setPolygonPoints = (points, isClosed = true) => (state) => {
  const currentSnapshot = { polygon: state.polygon, isPolygonClosed: state.isPolygonClosed };
  const nextPast = [...(state.history?.past || []), currentSnapshot].slice(-MAX_HISTORY);
  return {
    ...state,
    polygon: Object.freeze([...points]),
    isPolygonClosed: isClosed,
    history: Object.freeze({
      past: Object.freeze(nextPast),
      future: Object.freeze([])
    }),
    metrics: recalculateMetrics(points, isClosed, state.rotation)
  };
};

export const clearBoundary = () => (state) => {
  if (state.polygon.length === 0) return state;
  const currentSnapshot = { polygon: state.polygon, isPolygonClosed: state.isPolygonClosed };
  const nextPast = [...(state.history?.past || []), currentSnapshot].slice(-MAX_HISTORY);

  return {
    ...state,
    polygon: Object.freeze([]),
    isPolygonClosed: false,
    isDrawingPolygon: false,
    activeVertexIndex: null,
    draggingVertexIndex: null,
    hoverVertexIndex: null,
    cursorWorldPos: null,
    history: Object.freeze({
      past: Object.freeze(nextPast),
      future: Object.freeze([])
    }),
    metrics: recalculateMetrics([], false, state.rotation)
  };
};

export const undoAction = () => (state) => {
  const past = state.history?.past || [];
  if (past.length === 0) return state;

  const prevSnapshot = past[past.length - 1];
  const nextPast = past.slice(0, -1);
  const currentSnapshot = { polygon: state.polygon, isPolygonClosed: state.isPolygonClosed };
  const nextFuture = [currentSnapshot, ...(state.history?.future || [])].slice(0, MAX_HISTORY);

  return {
    ...state,
    polygon: Object.freeze([...prevSnapshot.polygon]),
    isPolygonClosed: prevSnapshot.isPolygonClosed,
    isDrawingPolygon: false,
    activeVertexIndex: null,
    draggingVertexIndex: null,
    hoverVertexIndex: null,
    cursorWorldPos: null,
    history: Object.freeze({
      past: Object.freeze(nextPast),
      future: Object.freeze(nextFuture)
    }),
    metrics: recalculateMetrics(prevSnapshot.polygon, prevSnapshot.isPolygonClosed, state.rotation)
  };
};

export const redoAction = () => (state) => {
  const future = state.history?.future || [];
  if (future.length === 0) return state;

  const nextSnapshot = future[0];
  const nextFuture = future.slice(1);
  const currentSnapshot = { polygon: state.polygon, isPolygonClosed: state.isPolygonClosed };
  const nextPast = [...(state.history?.past || []), currentSnapshot].slice(-MAX_HISTORY);

  return {
    ...state,
    polygon: Object.freeze([...nextSnapshot.polygon]),
    isPolygonClosed: nextSnapshot.isPolygonClosed,
    isDrawingPolygon: false,
    activeVertexIndex: null,
    draggingVertexIndex: null,
    hoverVertexIndex: null,
    cursorWorldPos: null,
    history: Object.freeze({
      past: Object.freeze(nextPast),
      future: Object.freeze(nextFuture)
    }),
    metrics: recalculateMetrics(nextSnapshot.polygon, nextSnapshot.isPolygonClosed, state.rotation)
  };
};

export const resetAll = () => () => createInitialState();
export const clearPolygon = clearBoundary;
export const clearAll = resetAll;

export const computeFitViewport = (contentWidth, contentHeight, containerWidth, containerHeight, padding = 40) => {
  if (!contentWidth || !contentHeight || !containerWidth || !containerHeight) {
    return { x: 0, y: 0, scale: 1 };
  }

  const availableWidth = Math.max(10, containerWidth - padding * 2);
  const availableHeight = Math.max(10, containerHeight - padding * 2);

  const scaleX = availableWidth / contentWidth;
  const scaleY = availableHeight / contentHeight;
  const scale = Math.min(scaleX, scaleY, 2.5);

  const x = (containerWidth - contentWidth * scale) / 2;
  const y = (containerHeight - contentHeight * scale) / 2;

  return { x, y, scale };
};

