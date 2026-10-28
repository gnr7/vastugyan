/**
 * Vastu Mandala Studio — Pure Functional Geometry Engine
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

// Signed Shoelace area: positive means the vertices run clockwise on screen (y-down canvas)
export const calculateSignedArea = (points) => {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    sum += (current.x * next.y) - (next.x * current.y);
  }
  return sum / 2;
};

// Sutherland–Hodgman clip of any polygon (convex or concave) against a convex clip polygon.
// The area of the result is exact even when a concave subject yields degenerate bridging edges.
export const clipPolygonByConvex = (subject, clip) => {
  if (!subject || subject.length < 3 || !clip || clip.length < 3) return [];

  const orientation = Math.sign(calculateSignedArea(clip)) || 1;
  const isInside = (p, a, b) => orientation * ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) >= 0;
  const intersect = (p, q, a, b) => {
    const d = (p.x - q.x) * (a.y - b.y) - (p.y - q.y) * (a.x - b.x);
    if (Math.abs(d) < 1e-12) return { x: q.x, y: q.y };
    const t = ((p.x - a.x) * (a.y - b.y) - (p.y - a.y) * (a.x - b.x)) / d;
    return { x: p.x + t * (q.x - p.x), y: p.y + t * (q.y - p.y) };
  };

  let output = subject;
  for (let i = 0; i < clip.length && output.length > 0; i++) {
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    const input = output;
    output = [];
    for (let j = 0; j < input.length; j++) {
      const current = input[j];
      const prev = input[(j + input.length - 1) % input.length];
      const currentIn = isInside(current, a, b);
      const prevIn = isInside(prev, a, b);
      if (currentIn) {
        if (!prevIn) output.push(intersect(prev, current, a, b));
        output.push(current);
      } else if (prevIn) {
        output.push(intersect(prev, current, a, b));
      }
    }
  }
  return output;
};

// Farthest point where a ray from origin (unit direction dir) crosses the polygon boundary.
// Returns { point, edgeIndex, t, dist } or null when the ray misses every edge.
export const rayPolygonHit = (points, origin, dir) => {
  let best = null;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const denom = dir.x * ey - dir.y * ex;
    if (Math.abs(denom) < 1e-12) continue;
    const ox = a.x - origin.x;
    const oy = a.y - origin.y;
    const dist = (ox * ey - oy * ex) / denom;  // along the ray
    const t = (ox * dir.y - oy * dir.x) / denom; // along the edge
    if (dist > 1e-9 && t >= -1e-9 && t <= 1 + 1e-9 && (!best || dist > best.dist)) {
      best = {
        point: { x: origin.x + dir.x * dist, y: origin.y + dir.y * dist },
        edgeIndex: i,
        t: Math.min(1, Math.max(0, t)),
        dist
      };
    }
  }
  return best;
};

// Boundary path between two hits on the polygon, walking forward or backward along the vertex order
export const boundaryPathBetween = (points, hitA, hitB, forward) => {
  const n = points.length;
  const path = [hitA.point];
  let edge = hitA.edgeIndex;

  if (edge === hitB.edgeIndex && (forward ? hitB.t >= hitA.t : hitB.t <= hitA.t)) {
    path.push(hitB.point);
    return path;
  }

  for (let step = 0; step < n; step++) {
    if (forward) {
      edge = (edge + 1) % n;
      path.push(points[edge]);
    } else {
      path.push(points[edge]);
      edge = (edge - 1 + n) % n;
    }
    if (edge === hitB.edgeIndex) break;
  }
  path.push(hitB.point);
  return path;
};

// Convex hull (Andrew's monotone chain)
const convexHull = (points) => {
  const sorted = [...points].sort((a, b) => (a.x - b.x) || (a.y - b.y));
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
};

// Orientation of the plot's walls: angle (0–90°) of the minimum-area rectangle around the polygon
export const calculatePlotOrientation = (points) => {
  if (!points || points.length < 3) return 0;
  const hull = convexHull(points);
  let bestAngle = 0;
  let bestArea = Infinity;

  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    const edgeAngle = Math.atan2(b.y - a.y, b.x - a.x);
    const cos = Math.cos(-edgeAngle);
    const sin = Math.sin(-edgeAngle);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of hull) {
      const x = p.x * cos - p.y * sin;
      const y = p.x * sin + p.y * cos;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const area = (maxX - minX) * (maxY - minY);
    if (area < bestArea - 1e-9) {
      bestArea = area;
      bestAngle = edgeAngle;
    }
  }

  const deg = (bestAngle * 180) / Math.PI;
  return ((deg % 90) + 90) % 90;
};

// Wall-aligned grid angle closest to the North rotation, so the grid's top side faces nearest North
export const nearestWallAlignedAngle = (wallAngleDeg, northDeg) => {
  let best = wallAngleDeg;
  let bestDiff = Infinity;
  for (let k = 0; k < 4; k++) {
    const candidate = (wallAngleDeg + k * 90) % 360;
    const diff = Math.abs(((candidate - northDeg + 540) % 360) - 180);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = candidate;
    }
  }
  return best;
};

// The four Vithis of the 81-pada mandala as nested squares on the 9×9 grid (in pada units)
export const VITHI_RINGS = [
  { id: 'brahma', outer: [3, 6], inner: null, padas: 9 },
  { id: 'daivika', outer: [2, 7], inner: [3, 6], padas: 16 },
  { id: 'manushya', outer: [1, 8], inner: [2, 7], padas: 24 },
  { id: 'paishachika', outer: [0, 9], inner: [1, 8], padas: 32 }
];

// World position of a grid point (col, row in pada units, 0–9) on the rotated 9×9 grid
const gridPointToWorld = (grid9x9, col, row) => {
  const [o0, o1, , o3] = grid9x9.outerBox;
  return {
    x: o0.x + ((o1.x - o0.x) * col) / 9 + ((o3.x - o0.x) * row) / 9,
    y: o0.y + ((o1.y - o0.y) * col) / 9 + ((o3.y - o0.y) * row) / 9
  };
};

const gridSquare = (grid9x9, [lo, hi]) => [
  gridPointToWorld(grid9x9, lo, lo),
  gridPointToWorld(grid9x9, hi, lo),
  gridPointToWorld(grid9x9, hi, hi),
  gridPointToWorld(grid9x9, lo, hi)
];

/**
 * Vithi Mandal: the four concentric rings of the 9×9 grid, with the real plot area in each.
 * A ring's area is the plot clipped to its outer square minus the plot clipped to its inner one.
 * @param {Object} grid9x9 - Result of generate9x9VastuGrid
 * @param {Array} points - Closed plot polygon in world coordinates
 */
export const calculateVithiMandal = (grid9x9, points) => {
  if (!grid9x9 || !grid9x9.outerBox || !points || points.length < 3) return null;
  const plotArea = calculatePolygonArea(points);
  const areaInside = (square) => calculatePolygonArea(clipPolygonByConvex(points, square));

  const rings = VITHI_RINGS.map((ring) => {
    const outer = gridSquare(grid9x9, ring.outer);
    const inner = ring.inner ? gridSquare(grid9x9, ring.inner) : null;
    const area = Math.max(0, areaInside(outer) - (inner ? areaInside(inner) : 0));
    const ringGridArea = calculatePolygonArea(outer) - (inner ? calculatePolygonArea(inner) : 0);
    return {
      ...ring,
      outerCorners: outer,
      innerCorners: inner,
      area,
      areaPct: plotArea > 0 ? (area / plotArea) * 100 : 0,
      // How much of the ring the plot actually fills (below 100% where the plot has cuts)
      fillPct: ringGridArea > 0 ? (area / ringGridArea) * 100 : 0,
      // Label anchor: middle of the ring's top band (the Brahma label sits in its centre)
      labelPoint: ring.inner
        ? gridPointToWorld(grid9x9, 4.5, (ring.outer[0] + ring.inner[0]) / 2)
        : gridPointToWorld(grid9x9, 4.5, ring.outer[0] + 0.45)
    };
  });

  return { rings, plotArea, angleDeg: grid9x9.angleDeg };
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



