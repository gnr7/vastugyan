/**
 * Vastu Gyan — Mandala mapping
 *
 * Lays the classical 9×9 (81-pada) square onto the traced plot in one of two shapes:
 *
 *  - 'plot' (default, as VastuGrid's reports show): the square is centred on the plot's centroid
 *    and projected outward onto the real outline, so every ring of the mandala is a copy of the
 *    plot scaled about the centroid. Brahma (the central 3×3) is the plot at 1/3 scale — exactly
 *    1/9 of the plot area — and the 32 outer Devtas sit in the ring between the 7/9-scale copy and
 *    the boundary, one 11.25° compass slice each. On a rectangular plot this is the ordinary grid.
 *  - 'rect': the classical rectangle around the plot, divided into 81 equal padas.
 *
 * Both are oriented to the grid angle (North, or the walls when that switch is on).
 * Grid coordinates (u, v) run 0–9: u from the grid's west edge, v from its north edge.
 */

import { rotatePoint, rayPolygonHit, generate9x9VastuGrid, calculatePolygonArea } from './geometry.js';

const EDGE_SAMPLES = 10; // points per pada edge when an outline bends with the plot

// Sample the boundary of the grid rectangle [u0,u1] × [v0,v1] (clockwise from its NW corner)
const rectBoundary = (u0, v0, u1, v1, samplesPerUnit = EDGE_SAMPLES) => {
  const pts = [];
  const edge = (ax, ay, bx, by) => {
    const steps = Math.max(1, Math.round(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * samplesPerUnit));
    for (let i = 0; i < steps; i++) pts.push([ax + ((bx - ax) * i) / steps, ay + ((by - ay) * i) / steps]);
  };
  edge(u0, v0, u1, v0);
  edge(u1, v0, u1, v1);
  edge(u1, v1, u0, v1);
  edge(u0, v1, u0, v0);
  return pts;
};

// True when every corner can be seen from the centre point without crossing a wall
const isStarShapedAbout = (points, c) => {
  const n = points.length;
  const orient = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const crosses = (a, b, p, q) => {
    const d1 = orient(a, b, p);
    const d2 = orient(a, b, q);
    const d3 = orient(p, q, a);
    const d4 = orient(p, q, b);
    return ((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) && ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9));
  };
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (j === i || (j + 1) % n === i) continue;
      if (crosses(c, points[i], points[j], points[(j + 1) % n])) return false;
    }
  }
  return true;
};

/**
 * Build the mandala grid. Returns the same shape as generate9x9VastuGrid plus:
 * shape, mapPoint(u, v), pada.outline, brahmasthanOutline, outerOutline, ringOutline(lo, hi),
 * outerSlice(fromDeg, toDeg) and plotPoints.
 */
export const buildMandalaGrid = (points, centroid, angleDeg = 0, shape = 'plot') => {
  const rect = generate9x9VastuGrid(points, centroid, angleDeg);
  if (!rect) return null;
  const angleRad = (angleDeg * Math.PI) / 180;

  // Grid-local frame: x east, y south, origin at the centroid, axes turned by the grid angle
  const toLocal = (p) => rotatePoint(p, centroid, -angleRad);
  const toWorld = (x, y) => rotatePoint({ x: centroid.x + x, y: centroid.y + y }, centroid, angleRad);
  const local = points.map(toLocal).map((p) => ({ x: p.x - centroid.x, y: p.y - centroid.y }));
  const minX = Math.min(...local.map((p) => p.x));
  const maxX = Math.max(...local.map((p) => p.x));
  const minY = Math.min(...local.map((p) => p.y));
  const maxY = Math.max(...local.map((p) => p.y));
  const localPoly = local.map((p) => ({ x: p.x, y: p.y }));
  const origin = { x: 0, y: 0 };

  let mapPoint;
  if (shape === 'rect') {
    // Classical: bilinear on the bounding rectangle (same as the 81 equal padas)
    const [o0, o1, , o3] = rect.outerBox;
    mapPoint = (u, v) => ({
      x: o0.x + ((o1.x - o0.x) * u) / 9 + ((o3.x - o0.x) * v) / 9,
      y: o0.y + ((o1.y - o0.y) * u) / 9 + ((o3.y - o0.y) * v) / 9
    });
  } else {
    // Plot-following: centre the square on the centroid (each half scaled to its own side of the
    // bounding rectangle), then push each point out along its direction from the centroid so the
    // rectangle's rings land on the real outline.
    mapPoint = (u, v) => {
      const du = u - 4.5;
      const dv = v - 4.5;
      const s = Math.max(Math.abs(du), Math.abs(dv)) / 4.5; // ring level: 0 at centre, 1 at the boundary
      if (s < 1e-12) return { x: centroid.x, y: centroid.y };
      const rx = (du / 4.5) * (du >= 0 ? maxX : -minX);
      const ry = (dv / 4.5) * (dv >= 0 ? maxY : -minY);
      const len = Math.hypot(rx, ry);
      const dir = { x: rx / len, y: ry / len };
      const hit = rayPolygonHit(localPoly, origin, dir);
      // Where the outline can't be reached in that direction (centroid outside a U-shape), keep the rectangle
      const reach = hit ? hit.dist : len / s;
      return toWorld(dir.x * reach * s, dir.y * reach * s);
    };
  }

  const outlineOf = (u0, v0, u1, v1) => (shape === 'rect'
    ? [mapPoint(u0, v0), mapPoint(u1, v0), mapPoint(u1, v1), mapPoint(u0, v1)]
    : rectBoundary(u0, v0, u1, v1).map(([u, v]) => mapPoint(u, v)));

  const padas = rect.padas.map((p) => {
    const outline = outlineOf(p.col, p.row, p.col + 1, p.row + 1);
    return {
      ...p,
      corners: shape === 'rect' ? p.corners : [mapPoint(p.col, p.row), mapPoint(p.col + 1, p.row), mapPoint(p.col + 1, p.row + 1), mapPoint(p.col, p.row + 1)],
      center: mapPoint(p.col + 0.5, p.row + 0.5),
      outline
    };
  });

  /**
   * One 11.25° compass slice of the outer ring (between the 7/9-scale copy and the boundary).
   * Bearings are compass degrees relative to North; the ring follows the plot in 'plot' mode.
   */
  const outerSlice = (fromDeg, toDeg, northDeg) => {
    const span = ((toDeg - fromDeg) % 360 + 360) % 360 || 360;
    const dirs = [];
    for (let i = 0; i <= 6; i++) dirs.push(fromDeg + (span * i) / 6);
    // Include the plot's own corners inside the slice so the outline keeps its shape
    points.forEach((p) => {
      const b = ((Math.atan2(p.x - centroid.x, -(p.y - centroid.y)) * 180) / Math.PI - northDeg + 720) % 360;
      const rel = ((b - fromDeg) % 360 + 360) % 360;
      if (rel > 1e-6 && rel < span - 1e-6) dirs.push(fromDeg + rel);
    });
    dirs.sort((a, b) => a - b);
    const outer = [];
    const inner = [];
    dirs.forEach((deg) => {
      const rad = ((-90 + deg + northDeg) * Math.PI) / 180;
      const dir = { x: Math.cos(rad), y: Math.sin(rad) };
      const hit = rayPolygonHit(points, centroid, dir);
      const r = hit ? hit.dist : 0;
      outer.push({ x: centroid.x + dir.x * r, y: centroid.y + dir.y * r });
      inner.push({ x: centroid.x + dir.x * r * (7 / 9), y: centroid.y + dir.y * r * (7 / 9) });
    });
    return outer.concat(inner.reverse());
  };

  // Star-shaped about the centroid (every wall visible from it): rings are exact scaled copies,
  // so a ring scaled by s holds s² of the plot area
  const starShaped = isStarShapedAbout(points, centroid);

  // A ring of the plot-following mandala is the plot's own corners scaled toward the centroid,
  // so a ring at scale s always holds exactly s² of the plot area, whatever the shape
  const scaledCopy = (sc) => points.map((p) => ({ x: centroid.x + (p.x - centroid.x) * sc, y: centroid.y + (p.y - centroid.y) * sc }));
  const ringOutline = (lo, hi) => (shape === 'rect' ? outlineOf(lo, lo, hi, hi) : scaledCopy((hi - lo) / 9));

  const brahmasthanOutline = ringOutline(3, 6);
  const outerOutline = ringOutline(0, 9);

  return {
    ...rect,
    shape,
    padas,
    brahmasthanBox: shape === 'rect' ? rect.brahmasthanBox : [mapPoint(3, 3), mapPoint(6, 3), mapPoint(6, 6), mapPoint(3, 6)],
    brahmasthanOutline,
    outerBox: shape === 'rect' ? rect.outerBox : [mapPoint(0, 0), mapPoint(9, 0), mapPoint(9, 9), mapPoint(0, 9)],
    outerOutline,
    mapPoint,
    outlineOf,
    ringOutline,
    scaledCopy,
    outerSlice,
    plotPoints: points,
    starShaped,
    brahmasthanArea: calculatePolygonArea(brahmasthanOutline),
    centroid
  };
};

/**
 * Marma sthan from Brihat Samhita 53.63–64: six vamsa lines — the two corner diagonals
 * (Roga–Vayu and Pitri–Agni) and four joining Mukhya–Bhrisha, Jayanta–Bhringaraja,
 * Vitatha–Shosha and Aditi–Sugriva (each two padas off a diagonal) — and the nine
 * atimarma points where they cross: squares 23, 31, 33, 39, 41, 43, 49, 51 and 59.
 */
export const VAMSA_LINES = [
  { from: [0, 0], to: [9, 9], type: 'mahamarma', name: 'Roga – Vayu' },
  { from: [9, 0], to: [0, 9], type: 'mahamarma', name: 'Agni – Pitri' },
  { from: [2, 0], to: [9, 7], type: 'upamarma', name: 'Mukhya – Bhrisha' },
  { from: [9, 2], to: [2, 9], type: 'upamarma', name: 'Jayanta – Bhringaraja' },
  { from: [0, 2], to: [7, 9], type: 'upamarma', name: 'Shosha – Vitatha' },
  { from: [7, 0], to: [0, 7], type: 'upamarma', name: 'Aditi – Sugriva' }
];

export const ATIMARMA_POINTS = [
  { col: 4.5, row: 4.5, square: 41, name: 'Brahma (centre)' },
  { col: 3.5, row: 3.5, square: 31, name: 'Brahma NW' },
  { col: 5.5, row: 3.5, square: 33, name: 'Brahma NE' },
  { col: 5.5, row: 5.5, square: 51, name: 'Brahma SE' },
  { col: 3.5, row: 5.5, square: 49, name: 'Brahma SW' },
  { col: 4.5, row: 2.5, square: 23, name: 'Bhudhar (N)' },
  { col: 6.5, row: 4.5, square: 43, name: 'Aryama (E)' },
  { col: 4.5, row: 6.5, square: 59, name: 'Vivaswan (S)' },
  { col: 2.5, row: 4.5, square: 39, name: 'Mitra (W)' }
];

export const calculateMandalaMarma = (grid) => {
  if (!grid || !grid.mapPoint) return null;

  if (grid.shape !== 'plot') {
    // Classical rectangle: lines run corner pada to corner pada, straight, points on pada centres
    const marmaPoints = ATIMARMA_POINTS.map((p) => ({ ...p, ...grid.mapPoint(p.col, p.row) }));
    const lines = VAMSA_LINES.map((l) => {
      const start = grid.mapPoint(l.from[0], l.from[1]);
      const end = grid.mapPoint(l.to[0], l.to[1]);
      return { ...l, points: [start, end], start, end };
    });
    return { lines, marmaPoints, width: grid.totalWidth, height: grid.totalHeight };
  }

  // Plot-following: the same lattice on even pada spacing, centred on the centroid ("centroid
  // aligned"), so the six vamsa lines stay straight and parallel as in VastuGrid's reports, and
  // each runs on to the walls in both directions
  const c = grid.centroid;
  const a = (grid.angleDeg * Math.PI) / 180;
  const ux = { x: Math.cos(a), y: Math.sin(a) };   // grid east
  const vy = { x: -Math.sin(a), y: Math.cos(a) };  // grid south
  const at = (col, row) => ({
    x: c.x + (col - 4.5) * grid.padWidth * ux.x + (row - 4.5) * grid.padHeight * vy.x,
    y: c.y + (col - 4.5) * grid.padWidth * ux.y + (row - 4.5) * grid.padHeight * vy.y
  });
  const marmaPoints = ATIMARMA_POINTS.map((p) => ({ ...p, ...at(p.col, p.row) }));
  const lines = VAMSA_LINES.map((l) => {
    const p0 = at(l.from[0], l.from[1]);
    const p1 = at(l.to[0], l.to[1]);
    const len = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
    const dir = { x: (p1.x - p0.x) / len, y: (p1.y - p0.y) / len };
    const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const reach = (d) => {
      const hit = rayPolygonHit(grid.plotPoints, mid, d);
      return hit ? hit.dist : len / 2;
    };
    const back = reach({ x: -dir.x, y: -dir.y });
    const fwd = reach(dir);
    const start = { x: mid.x - dir.x * back, y: mid.y - dir.y * back };
    const end = { x: mid.x + dir.x * fwd, y: mid.y + dir.y * fwd };
    return { ...l, points: [start, end], start, end };
  });
  return { lines, marmaPoints, width: grid.totalWidth, height: grid.totalHeight };
};
