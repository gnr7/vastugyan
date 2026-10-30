import {
  calculatePolygonArea,
  calculatePolygonCentroid,
  calculateBoundingBox,
  generate9x9VastuGrid,
  calculateVithiMandal,
  calculatePlotOrientation,
  calculatePlotDimensions,
  findSelfIntersections,
  nearestWallAlignedAngle,
  distance,
  rayPolygonHit
} from './geometry.js';
import { buildMandalaGrid, calculateMandalaMarma } from './mandala.js';
import { computeDevtaSpatialFields, outerCentreOfCode } from './devtas.js';
import { calculate16DirectionalZones, calculateZoneAreas, calculate32EntranceGates } from './zones.js';

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
  rotation: 0,                // compass bearing (0-360) the top of the plan faces; North sits this far anticlockwise of the top
  gridAlign: 'north',         // 'north': 9x9 grid turns with North · 'walls': grid stays on the plot's walls
  mandalaShape: 'plot',       // 'plot': rings follow the plot outline (as VastuGrid) · 'rect': classical rectangle
  elementStyle: 'classic',    // 'classic': NE is Water, NW is Space (as VastuGrid) · 'looseEarth': NE and NW are Loose Earth
  chakraSize: 1,              // Shakti Chakra size, as a share of the size that just clears the plot (see CHAKRA_SIZES)
  landDims: null,             // { length, breadth } in feet typed by the user, or null to measure from the walls
  calibration: null,          // { realPerWorld, unit: 'ft' | 'm', realLength } once Set Scale is applied
  isCalibrating: false,
  calibrationPoints: Object.freeze([]), // up to 2 world points of the reference wall
  layers: Object.freeze({
    grid9x9: true,
    brahmasthan: true,
    devtas45: true,
    devtaNames: true,
    zones16: false,
    gates32: false,
    gatePadas: false,
    marma: false,
    vithi: false,
    elements: false,
    shaktiChakra: false
  }),
  metrics: Object.freeze({
    area: 0,
    centroid: null,           // { x, y }
    bounds: null,             // { minX, minY, maxX, maxY, width, height }
    grid9x9: null,            // 9x9 Vastu grid & Brahmasthan
    devtaFields: null,        // 45 Devtas spatial fields
    zones16: null,            // 16 Directional Zones
    entranceGates32: null,    // 32 Perimeter Entrance Gates
    marmaSthan: null,         // Marma Sthan diagonal lines and nodes
    vithi: null,              // Vithi Mandal: 4 concentric rings with real plot area
    plotDims: null,           // { length, breadth, angleDeg } of the plot's own walls (minimum rectangle)
    brahmasthan: null,        // { outline, area, pctOfPlot } — the real Brahmasthan on this plot
    boundaryError: null,      // 'self-intersecting' when the traced boundary crosses itself
    crossings: null,          // [[edgeIndex, edgeIndex], ...] for a crossing boundary
    gridAngle: 0              // clockwise screen angle the 9x9 grid is laid at (with North, or wall-aligned)
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
    metrics: recalculateMetrics(state.polygon, state.isPolygonClosed, normalizedDeg, state.gridAlign, state.mandalaShape)
  };
};

export const toggleLayer = (layerName, isVisible) => (state) => ({
  ...state,
  layers: Object.freeze({
    ...state.layers,
    [layerName]: typeof isVisible === 'boolean' ? isVisible : !state.layers[layerName]
  })
});

const pointInPolygon = (poly, p) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
};

// A short step inside the wall, along a compass direction from the centre of the plot
const insideOnBearing = (centroid, compassDeg, northDeg, poly, stepLen) => {
  const rad = ((-90 + compassDeg + northDeg) * Math.PI) / 180;
  const dir = { x: Math.cos(rad), y: Math.sin(rad) };
  const hit = rayPolygonHit(poly, centroid, dir);
  if (!hit) return null;
  // The ray can run out through a cut in the plot on its way to the furthest wall: walk back in
  for (let r = hit.dist - stepLen; r > 0; r -= stepLen) {
    const p = { x: centroid.x + dir.x * r, y: centroid.y + dir.y * r };
    if (pointInPolygon(poly, p)) return p;
  }
  return null;
};

const EMPTY_METRICS = {
  area: 0,
  centroid: null,
  bounds: null,
  grid9x9: null,
  devtaFields: null,
  zones16: null,
  entranceGates32: null,
  marmaSthan: null,
  vithi: null,
  plotDims: null,
  brahmasthan: null,
  boundaryError: null,
  crossings: null
};

// Pure calculation of metrics, 9x9 grid, Devtas, and 16 Zones from polygon and rotation
export const recalculateMetrics = (points, isClosed, rotation = 0, gridAlign = 'north', mandalaShape = 'plot') => {
  // The geometry works with where North sits on screen, clockwise from the top of the plan
  const northDeg = (360 - (((rotation % 360) + 360) % 360)) % 360;
  if (!points || points.length === 0) {
    return Object.freeze({ ...EMPTY_METRICS, gridAngle: northDeg });
  }

  const centroid = calculatePolygonCentroid(points);
  const bounds = calculateBoundingBox(points);

  // A boundary that crosses itself has no meaningful area: report it instead of wrong numbers
  const crossings = isClosed && points.length >= 4 ? findSelfIntersections(points) : [];
  if (crossings.length > 0) {
    return Object.freeze({ ...EMPTY_METRICS, centroid, bounds, gridAngle: northDeg, boundaryError: 'self-intersecting', crossings });
  }

  const hasPlot = isClosed && points.length >= 3;
  const area = isClosed ? calculatePolygonArea(points) : 0;

  // The grid follows North, or the plot's walls (turned to the side facing nearest North)
  const gridAngle = (hasPlot && gridAlign === 'walls')
    ? nearestWallAlignedAngle(calculatePlotOrientation(points), northDeg)
    : northDeg;

  const grid9x9 = (hasPlot && centroid) ? buildMandalaGrid(points, centroid, gridAngle, mandalaShape) : null;
  const devtaFields = grid9x9 ? computeDevtaSpatialFields(grid9x9, northDeg) : null;
  const zonesBase = centroid ? calculate16DirectionalZones(centroid, bounds, northDeg, grid9x9) : null;
  const zones16 = (hasPlot && zonesBase) ? calculateZoneAreas(zonesBase, points) : zonesBase;
  const entranceGates32 = (hasPlot && centroid)
    ? calculate32EntranceGates(points, centroid, northDeg, devtaFields)
    : null;
  // Outer Devtas are labelled on the centre line of their own slice, just inside the wall, so the
  // label stays on the building even where a slice straddles a cut in the plot
  const step = 0.025 * Math.hypot(bounds.width, bounds.height);
  const devtaFieldsPlaced = devtaFields && grid9x9.shape === 'plot'
    ? devtaFields.map((d) => {
      if (!d.entranceCode) return d;
      const label = insideOnBearing(centroid, outerCentreOfCode(d.entranceCode), northDeg, points, step);
      return label ? { ...d, center: label } : d;
    })
    : devtaFields;
  const marmaSthan = grid9x9 ? calculateMandalaMarma(grid9x9) : null;
  const vithi = grid9x9 ? calculateVithiMandal(grid9x9, points) : null;
  const plotDims = hasPlot ? calculatePlotDimensions(points) : null;

  // The Brahmasthan as it falls on this plot: its share of the real plot area
  let brahmasthan = null;
  if (grid9x9 && vithi && area > 0) {
    const ring = vithi.rings.find((r) => r.id === 'brahma');
    brahmasthan = { outline: grid9x9.brahmasthanOutline, area: ring.area, pctOfPlot: (ring.area / area) * 100 };
  }

  return Object.freeze({
    area,
    centroid,
    bounds,
    grid9x9,
    devtaFields: devtaFieldsPlaced,
    zones16,
    entranceGates32,
    marmaSthan,
    vithi,
    plotDims,
    brahmasthan,
    boundaryError: null,
    crossings: null,
    gridAngle
  });
};

export const setMandalaShape = (shape) => (state) => {
  const mandalaShape = shape === 'rect' ? 'rect' : 'plot';
  if (mandalaShape === state.mandalaShape) return state;
  return {
    ...state,
    mandalaShape,
    metrics: recalculateMetrics(state.polygon, state.isPolygonClosed, state.rotation, state.gridAlign, mandalaShape)
  };
};

// One-tap views: each shows only the layers that belong together, so the plan never piles up
const LAYERS_OFF = {
  grid9x9: false, brahmasthan: false, devtas45: false, devtaNames: false, zones16: false,
  gates32: false, gatePadas: false, marma: false, vithi: false, elements: false, shaktiChakra: false
};
export const VIEWS = {
  plan: {},
  mandala: { grid9x9: true, brahmasthan: true, devtas45: true, devtaNames: true },
  zones: { shaktiChakra: true, elements: true },
  entrances: { gates32: true },
  marma: { grid9x9: true, brahmasthan: true, marma: true }
};

export const applyView = (name) => (state) => {
  if (!VIEWS[name]) return state;
  return { ...state, layers: Object.freeze({ ...LAYERS_OFF, ...VIEWS[name] }) };
};

// The view the current layers match exactly, or null for a custom mix
export const currentView = (layers) => Object.keys(VIEWS).find((name) => {
  const want = { ...LAYERS_OFF, ...VIEWS[name] };
  return Object.keys(want).every((k) => !!layers[k] === want[k]);
}) || null;

// Which school's Five Elements mapping to use; it only changes colours and shares, not geometry
export const setElementStyle = (style) => (state) => {
  const elementStyle = style === 'looseEarth' ? 'looseEarth' : 'classic';
  if (elementStyle === state.elementStyle) return state;
  return { ...state, elementStyle };
};

// Shakti Chakra sizes offered in the Layers panel; 1 just clears the plot
export const CHAKRA_SIZES = Object.freeze([0.6, 0.8, 1, 1.25, 1.5]);
export const setChakraSize = (size) => (state) => {
  const chakraSize = CHAKRA_SIZES.includes(size) ? size : 1;
  if (chakraSize === state.chakraSize) return state;
  return { ...state, chakraSize };
};

// Plot length and breadth typed by the user (feet) for Land Energy, or null to measure from the walls
export const setLandDimensions = (dims) => (state) => ({
  ...state,
  landDims: dims && dims.length > 0 && dims.breadth > 0
    ? Object.freeze({ length: Math.max(dims.length, dims.breadth), breadth: Math.min(dims.length, dims.breadth) })
    : null
});

export const setGridAlign = (mode) => (state) => {
  const gridAlign = mode === 'walls' ? 'walls' : 'north';
  if (gridAlign === state.gridAlign) return state;
  return {
    ...state,
    gridAlign,
    metrics: recalculateMetrics(state.polygon, state.isPolygonClosed, state.rotation, gridAlign, state.mandalaShape)
  };
};

// Set Scale: pick two points on a wall of known length, then enter that length
export const setCalibrationMode = (isOn) => (state) => ({
  ...state,
  isCalibrating: isOn,
  isDrawingPolygon: isOn ? false : state.isDrawingPolygon,
  calibrationPoints: Object.freeze([]),
  cursorWorldPos: null
});

export const addCalibrationPoint = (point) => (state) => {
  if (!state.isCalibrating || state.calibrationPoints.length >= 2) return state;
  return {
    ...state,
    calibrationPoints: Object.freeze([...state.calibrationPoints, { x: point.x, y: point.y }])
  };
};

export const applyCalibration = (realLength, unit) => (state) => {
  const [a, b] = state.calibrationPoints;
  const worldLength = a && b ? distance(a, b) : 0;
  if (!(worldLength > 0) || !(realLength > 0)) return state;
  return {
    ...state,
    history: pushHistory(state),
    calibration: Object.freeze({
      realPerWorld: realLength / worldLength,
      unit: unit === 'm' ? 'm' : 'ft',
      realLength
    }),
    isCalibrating: false,
    calibrationPoints: Object.freeze([]),
    cursorWorldPos: null
  };
};

export const setDrawingMode = (isDrawing) => (state) => ({
  ...state,
  isDrawingPolygon: isDrawing,
  cursorWorldPos: isDrawing ? state.cursorWorldPos : null
});

const MAX_HISTORY = 40;

// One undo step: the boundary, North and the scale
const snapshotOf = (state) => ({
  polygon: state.polygon,
  isPolygonClosed: state.isPolygonClosed,
  rotation: state.rotation,
  calibration: state.calibration
});
const pushHistory = (state, snapshot = snapshotOf(state)) => Object.freeze({
  past: Object.freeze([...(state.history?.past || []), snapshot].slice(-MAX_HISTORY)),
  future: Object.freeze([])
});
// Restore a snapshot (older snapshots may lack rotation/scale: keep the current ones then)
const restoreFrom = (state, snap) => {
  const rotation = typeof snap.rotation === 'number' ? snap.rotation : state.rotation;
  const calibration = 'calibration' in snap ? snap.calibration : state.calibration;
  return {
    polygon: Object.freeze([...snap.polygon]),
    isPolygonClosed: snap.isPolygonClosed,
    rotation,
    calibration,
    metrics: recalculateMetrics(snap.polygon, snap.isPolygonClosed, rotation, state.gridAlign, state.mandalaShape)
  };
};

// Record North before a turn of the dial or slider, so the whole turn undoes in one step
export const commitRotationHistory = (previousRotation) => (state) => {
  if (typeof previousRotation !== 'number' || previousRotation === state.rotation) return state;
  return { ...state, history: pushHistory(state, { ...snapshotOf(state), rotation: previousRotation }) };
};

export const addPolygonVertex = (point) => (state) => {
  const currentSnapshot = snapshotOf(state);
  const nextPast = [...(state.history?.past || []), currentSnapshot].slice(-MAX_HISTORY);
  const nextPolygon = [...state.polygon, { x: point.x, y: point.y }];

  return {
    ...state,
    polygon: Object.freeze(nextPolygon),
    history: Object.freeze({
      past: Object.freeze(nextPast),
      future: Object.freeze([])
    }),
    metrics: recalculateMetrics(nextPolygon, state.isPolygonClosed, state.rotation, state.gridAlign, state.mandalaShape)
  };
};

export const closePolygon = () => (state) => {
  if (state.polygon.length < 3) return state;
  const currentSnapshot = snapshotOf(state);
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
    metrics: recalculateMetrics(state.polygon, true, state.rotation, state.gridAlign, state.mandalaShape)
  };
};

export const updatePolygonVertex = (index, point) => (state) => {
  if (index < 0 || index >= state.polygon.length) return state;
  const nextPolygon = state.polygon.map((v, i) => (i === index ? { x: point.x, y: point.y } : v));
  return {
    ...state,
    polygon: Object.freeze(nextPolygon),
    metrics: recalculateMetrics(nextPolygon, state.isPolygonClosed, state.rotation, state.gridAlign, state.mandalaShape)
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
  const currentSnapshot = snapshotOf(state);
  const nextPast = [...(state.history?.past || []), currentSnapshot].slice(-MAX_HISTORY);
  return {
    ...state,
    polygon: Object.freeze([...points]),
    isPolygonClosed: isClosed,
    history: Object.freeze({
      past: Object.freeze(nextPast),
      future: Object.freeze([])
    }),
    metrics: recalculateMetrics(points, isClosed, state.rotation, state.gridAlign, state.mandalaShape)
  };
};

export const clearBoundary = () => (state) => {
  if (state.polygon.length === 0) return state;
  const currentSnapshot = snapshotOf(state);
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
    metrics: recalculateMetrics([], false, state.rotation, state.gridAlign, state.mandalaShape)
  };
};

export const undoAction = () => (state) => {
  const past = state.history?.past || [];
  if (past.length === 0) return state;

  const prevSnapshot = past[past.length - 1];
  const nextPast = past.slice(0, -1);
  const currentSnapshot = snapshotOf(state);
  const nextFuture = [currentSnapshot, ...(state.history?.future || [])].slice(0, MAX_HISTORY);

  return {
    ...state,
    ...restoreFrom(state, prevSnapshot),
    isDrawingPolygon: false,
    activeVertexIndex: null,
    draggingVertexIndex: null,
    hoverVertexIndex: null,
    cursorWorldPos: null,
    history: Object.freeze({
      past: Object.freeze(nextPast),
      future: Object.freeze(nextFuture)
    }),
  };
};

export const redoAction = () => (state) => {
  const future = state.history?.future || [];
  if (future.length === 0) return state;

  const nextSnapshot = future[0];
  const nextFuture = future.slice(1);
  const currentSnapshot = snapshotOf(state);
  const nextPast = [...(state.history?.past || []), currentSnapshot].slice(-MAX_HISTORY);

  return {
    ...state,
    ...restoreFrom(state, nextSnapshot),
    isDrawingPolygon: false,
    activeVertexIndex: null,
    draggingVertexIndex: null,
    hoverVertexIndex: null,
    cursorWorldPos: null,
    history: Object.freeze({
      past: Object.freeze(nextPast),
      future: Object.freeze(nextFuture)
    }),
  };
};

export const resetAll = () => () => createInitialState();

// Bring back a project saved on this device (the floor plan image is restored separately)
export const restoreProject = (saved) => (state) => {
  if (!saved) return state;
  const polygon = Object.freeze((saved.polygon || []).map((p) => ({ x: p.x, y: p.y })));
  const isPolygonClosed = !!saved.isPolygonClosed && polygon.length >= 3;
  // Saves from before version 2 stored North's clockwise angle; the plan itself must not change
  const savedRotation = saved.version === 1 ? -(Number(saved.rotation) || 0) : (Number(saved.rotation) || 0);
  const rotation = (savedRotation % 360 + 360) % 360;
  const gridAlign = saved.gridAlign === 'walls' ? 'walls' : 'north';
  const calibration = saved.calibration && saved.calibration.realPerWorld > 0
    ? Object.freeze({ ...saved.calibration })
    : null;
  // Older saves called the Shakti Chakra layer the compass wheel
  const { compassWheel, ...savedLayers } = saved.layers || {};
  if (compassWheel !== undefined && savedLayers.shaktiChakra === undefined) savedLayers.shaktiChakra = compassWheel;
  const layers = Object.freeze({ ...state.layers, ...savedLayers });
  const mandalaShape = saved.mandalaShape === 'rect' ? 'rect' : 'plot';
  const elementStyle = saved.elementStyle === 'looseEarth' ? 'looseEarth' : 'classic';
  const chakraSize = CHAKRA_SIZES.includes(saved.chakraSize) ? saved.chakraSize : 1;
  const landDims = saved.landDims && saved.landDims.length > 0 && saved.landDims.breadth > 0 ? Object.freeze({ ...saved.landDims }) : null;
  return {
    ...state,
    polygon,
    isPolygonClosed,
    rotation,
    gridAlign,
    mandalaShape,
    elementStyle,
    chakraSize,
    landDims,
    calibration,
    layers,
    metrics: recalculateMetrics(polygon, isPolygonClosed, rotation, gridAlign, mandalaShape)
  };
};
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

