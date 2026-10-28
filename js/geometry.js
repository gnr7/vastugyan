/**
 * VastuGrid — Pure Functional Geometry Engine
 */

// Euclidean distance between two points
export const distance = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

// Calculate polygon area using the Shoelace (Surveyor's) formula
export const calculatePolygonArea = (points) => {
  const n = points.length;
  if (n < 3) return 0;

  let signedArea = 0;
  for (let i = 0; i < n; i++) {
    const current = points[i];
    const next = points[(i + 1) % n];
    signedArea += (current.x * next.y) - (next.x * current.y);
  }

  return Math.abs(signedArea / 2);
};

// Calculate exact geometric centroid (Center of Mass) for an arbitrary polygon
export const calculatePolygonCentroid = (points) => {
  const n = points.length;
  if (n === 0) return null;
  if (n === 1) return { x: points[0].x, y: points[0].y };
  if (n === 2) return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };

  let signedArea = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < n; i++) {
    const current = points[i];
    const next = points[(i + 1) % n];
    const cross = (current.x * next.y) - (next.x * current.y);

    signedArea += cross;
    cx += (current.x + next.x) * cross;
    cy += (current.y + next.y) * cross;
  }

  signedArea /= 2;

  // If points are collinear or area is nearly zero, fallback to simple arithmetic mean
  if (Math.abs(signedArea) < 1e-6) {
    const avgX = points.reduce((sum, p) => sum + p.x, 0) / n;
    const avgY = points.reduce((sum, p) => sum + p.y, 0) / n;
    return { x: avgX, y: avgY };
  }

  const factor = 1 / (6 * signedArea);
  return {
    x: cx * factor,
    y: cy * factor
  };
};

// Calculate axis-aligned bounding box of a point set
export const calculateBoundingBox = (points) => {
  if (!points || points.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  };
};

// Rotate a 2D point around an origin by angle in radians
export const rotatePoint = (point, origin, angleRad) => {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;

  return {
    x: dx * cos - dy * sin + origin.x,
    y: dx * sin + dy * cos + origin.y
  };
};

// Generate 9x9 Vastu Purusha Mandala Grid (81 padas) and Brahmasthan via Oriented Bounding Box
export const generate9x9VastuGrid = (points, centroid, angleDeg = 0) => {
  if (!points || points.length < 3 || !centroid) return null;

  // Convert compass angle to radians
  const angleRad = (angleDeg * Math.PI) / 180;

  // 1. Rotate polygon vertices around centroid by -angleRad to align with axes
  const rotatedPoints = points.map((p) => rotatePoint(p, centroid, -angleRad));

  // 2. Compute axis-aligned bounding box of rotated vertices (Oriented Bounding Box)
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of rotatedPoints) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  if (width <= 0 || height <= 0) return null;

  const padW = width / 9;
  const padH = height / 9;

  // Helper to convert rotated local point back to world coordinates
  const toWorld = (rx, ry) => rotatePoint({ x: rx, y: ry }, centroid, angleRad);

  // 3. Generate 81 equal padas (9 columns x 9 rows)
  const padas = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const rx0 = minX + col * padW;
      const ry0 = minY + row * padH;
      const rx1 = rx0 + padW;
      const ry1 = ry0 + padH;

      // 4 corners of pada in world coordinates
      const p0 = toWorld(rx0, ry0); // top-left
      const p1 = toWorld(rx1, ry0); // top-right
      const p2 = toWorld(rx1, ry1); // bottom-right
      const p3 = toWorld(rx0, ry1); // bottom-left
      const center = toWorld(rx0 + padW / 2, ry0 + padH / 2);

      // Central 3x3 cells (columns 3..5, rows 3..5) are Brahmasthan
      const isBrahmasthan = (col >= 3 && col <= 5) && (row >= 3 && row <= 5);

      padas.push({
        col,
        row,
        index: row * 9 + col,
        corners: [p0, p1, p2, p3],
        center,
        isBrahmasthan
      });
    }
  }

  // 4. Central 3x3 Brahmasthan outer box (in world coordinates)
  const bMinX = minX + 3 * padW;
  const bMaxX = minX + 6 * padW;
  const bMinY = minY + 3 * padH;
  const bMaxY = minY + 6 * padH;

  const brahmasthanBox = [
    toWorld(bMinX, bMinY),
    toWorld(bMaxX, bMinY),
    toWorld(bMaxX, bMaxY),
    toWorld(bMinX, bMaxY)
  ];

  // 5. Full outer bounding box of the 9x9 grid (in world coordinates)
  const outerBox = [
    toWorld(minX, minY),
    toWorld(maxX, minY),
    toWorld(maxX, maxY),
    toWorld(minX, maxY)
  ];

  return {
    padas,
    brahmasthanBox,
    outerBox,
    padWidth: padW,
    padHeight: padH,
    totalWidth: width,
    totalHeight: height,
    centroid,
    angleDeg
  };
};

// Find closest vertex within a screen pixel tolerance radius
export const findClosestVertex = (worldPoint, vertices, toleranceWorld) => {
  if (!vertices || vertices.length === 0) return -1;

  let minDistance = Infinity;
  let closestIndex = -1;

  vertices.forEach((v, idx) => {
    const d = distance(worldPoint, v);
    if (d < minDistance && d <= toleranceWorld) {
      minDistance = d;
      closestIndex = idx;
    }
  });

  return closestIndex;
};

// Calculate classical Marma Sthan: diagonal energy lines and 9 intersection nodes
export const calculateMarmaSthan = (points, centroid, angleDeg = 0) => {
  if (!points || points.length < 3 || !centroid) return null;

  const angleRad = (angleDeg * Math.PI) / 180;
  const rotatedPoints = points.map((p) => rotatePoint(p, centroid, -angleRad));

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of rotatedPoints) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  if (width <= 0 || height <= 0) return null;

  const padW = width / 9;
  const padH = height / 9;
  const toWorld = (rx, ry) => rotatePoint({ x: rx, y: ry }, centroid, angleRad);

  // 6 Primary Energy Lines (Mahamarma & Upamarma Sutras)
  const lineDefinitions = [
    // 2 Main Diagonal Karna Sutras (Corner to Corner)
    { startCol: 0, startRow: 0, endCol: 9, endRow: 9, type: 'mahamarma' },
    { startCol: 9, startRow: 0, endCol: 0, endRow: 9, type: 'mahamarma' },
    // 4 Upamarma Diagonal Lines
    { startCol: 3, startRow: 0, endCol: 9, endRow: 6, type: 'upamarma' },
    { startCol: 0, startRow: 3, endCol: 6, endRow: 9, type: 'upamarma' },
    { startCol: 6, startRow: 0, endCol: 0, endRow: 6, type: 'upamarma' },
    { startCol: 9, startRow: 3, endCol: 3, endRow: 9, type: 'upamarma' }
  ];

  const lines = lineDefinitions.map((def) => ({
    start: toWorld(minX + def.startCol * padW, minY + def.startRow * padH),
    end: toWorld(minX + def.endCol * padW, minY + def.endRow * padH),
    type: def.type
  }));

  // 9 Sensitive Marma Intersection Nodes
  const marmaPoints = [
    // Center Nabhi Marma
    { col: 4.5, row: 4.5, name: 'Brahma Nabhi (Center)' },
    // 4 Corners of Brahmasthan
    { col: 3, row: 3, name: 'Brahmasthan NW' },
    { col: 6, row: 3, name: 'Brahmasthan NE' },
    { col: 6, row: 6, name: 'Brahmasthan SE' },
    { col: 3, row: 6, name: 'Brahmasthan SW' },
    // 4 Outer Diamond Intersections
    { col: 4.5, row: 1.5, name: 'North Upamarma' },
    { col: 7.5, row: 4.5, name: 'East Upamarma' },
    { col: 4.5, row: 7.5, name: 'South Upamarma' },
    { col: 1.5, row: 4.5, name: 'West Upamarma' }
  ].map((node) => ({
    ...node,
    x: toWorld(minX + node.col * padW, minY + node.row * padH).x,
    y: toWorld(minX + node.col * padW, minY + node.row * padH).y
  }));

  return {
    lines,
    marmaPoints,
    width,
    height
  };
};



