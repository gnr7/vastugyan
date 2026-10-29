/**
 * Vastu Gyan — 16 Directional Zones & 32 Entrance Padas Computational Engine
 * Classical 16 Directional Zones (22.5° each) & 32 Perimeter Gateway Padas
 */

import {
  calculatePolygonArea,
  clipPolygonByConvex,
  distance
} from './geometry.js';

// Classical 16 Directional Zones Definition
export const ZONES_16_DATA = [
  { id: 'N', name: 'North', short: 'N', centerDeg: 0, element: 'Water', color: '#1a73e8', bgTint: 'rgba(26, 115, 232, 0.08)', attribute: 'Wealth & Opportunities' },
  { id: 'NNE', name: 'North-North-East', short: 'NNE', centerDeg: 22.5, element: 'Water', color: '#1a73e8', bgTint: 'rgba(26, 115, 232, 0.08)', attribute: 'Health & Immunity' },
  { id: 'NE', name: 'North-East', short: 'NE', centerDeg: 45, element: 'Water', color: '#1a73e8', bgTint: 'rgba(26, 115, 232, 0.08)', attribute: 'Wisdom & Clarity' },
  { id: 'ENE', name: 'East-North-East', short: 'ENE', centerDeg: 67.5, element: 'Air', color: '#1e8e3e', bgTint: 'rgba(30, 142, 62, 0.08)', attribute: 'Fun & Refreshment' },
  { id: 'E', name: 'East', short: 'E', centerDeg: 90, element: 'Air', color: '#1e8e3e', bgTint: 'rgba(30, 142, 62, 0.08)', attribute: 'Social Connections' },
  { id: 'ESE', name: 'East-South-East', short: 'ESE', centerDeg: 112.5, element: 'Air', color: '#1e8e3e', bgTint: 'rgba(30, 142, 62, 0.08)', attribute: 'Churning & Anxiety' },
  { id: 'SE', name: 'South-East', short: 'SE', centerDeg: 135, element: 'Fire', color: '#d93025', bgTint: 'rgba(217, 48, 37, 0.08)', attribute: 'Cash Liquidity & Fire' },
  { id: 'SSE', name: 'South-South-East', short: 'SSE', centerDeg: 157.5, element: 'Fire', color: '#d93025', bgTint: 'rgba(217, 48, 37, 0.08)', attribute: 'Power & Confidence' },
  { id: 'S', name: 'South', short: 'S', centerDeg: 180, element: 'Fire', color: '#d93025', bgTint: 'rgba(217, 48, 37, 0.08)', attribute: 'Fame & Relaxation' },
  { id: 'SSW', name: 'South-South-West', short: 'SSW', centerDeg: 202.5, element: 'Earth', color: '#e37400', bgTint: 'rgba(227, 116, 0, 0.08)', attribute: 'Expenditure & Disposal' },
  { id: 'SW', name: 'South-West', short: 'SW', centerDeg: 225, element: 'Earth', color: '#e37400', bgTint: 'rgba(227, 116, 0, 0.08)', attribute: 'Relationships & Skills' },
  { id: 'WSW', name: 'West-South-West', short: 'WSW', centerDeg: 247.5, element: 'Space', color: '#5f6368', bgTint: 'rgba(95, 99, 104, 0.08)', attribute: 'Knowledge & Savings' },
  { id: 'W', name: 'West', short: 'W', centerDeg: 270, element: 'Space', color: '#5f6368', bgTint: 'rgba(95, 99, 104, 0.08)', attribute: 'Gains & Profits' },
  { id: 'WNW', name: 'West-North-West', short: 'WNW', centerDeg: 292.5, element: 'Space', color: '#5f6368', bgTint: 'rgba(95, 99, 104, 0.08)', attribute: 'Depression & Detox' },
  { id: 'NW', name: 'North-West', short: 'NW', centerDeg: 315, element: 'Space', color: '#5f6368', bgTint: 'rgba(95, 99, 104, 0.08)', attribute: 'Support & Banking' },
  { id: 'NNW', name: 'North-North-West', short: 'NNW', centerDeg: 337.5, element: 'Water', color: '#1a73e8', bgTint: 'rgba(26, 115, 232, 0.08)', attribute: 'Sex & Attraction' }
];

// The two Five Elements conventions practitioners use. 'classic' follows VastuGrid (NE is Water,
// NW is Space); 'looseEarth' (Applied Vastu and others) treats NE and NW, where two elements meet,
// as Loose Earth and SSW–SW as Hard Earth.
export const ELEMENT_STYLES = {
  classic: { label: 'Classic', note: 'NE is Water and NW is Space (as VastuGrid)' },
  looseEarth: { label: 'Loose Earth', note: 'NE and NW are Loose Earth; SSW and SW are Hard Earth' }
};

const LOOSE_EARTH_ZONES = new Set(['NE', 'NW']);

// A zone's colour group under a style: one of the five elements, or HardEarth / LooseEarth
export const zoneTone = (zoneId, style = 'classic') => {
  const zone = ZONES_16_DATA.find((z) => z.id === zoneId);
  if (!zone) return null;
  if (style !== 'looseEarth') return zone.element;
  if (LOOSE_EARTH_ZONES.has(zoneId)) return 'LooseEarth';
  return zone.element === 'Earth' ? 'HardEarth' : zone.element;
};

// The element (one of five) a zone belongs to under a style
export const zoneElement = (zoneId, style = 'classic') => {
  const tone = zoneTone(zoneId, style);
  return tone === 'HardEarth' || tone === 'LooseEarth' ? 'Earth' : tone;
};

// Auspicious Entrance Codes Set
export const AUSPICIOUS_ENTRANCES = new Set(['N3', 'N4', 'E3', 'E4', 'S3', 'S4', 'W3', 'W4']);

/**
 * Pure calculation of 16 Directional Zones with radial boundaries and sector geometry
 * @param {Object} centroid - { x, y } in world coordinates
 * @param {Object} bounds - Bounding box { minX, minY, maxX, maxY, width, height }
 * @param {number} angleDeg - Universal rotation in degrees
 * @param {Object} grid9x9 - Optional 9x9 grid object
 */
export const calculate16DirectionalZones = (centroid, bounds, angleDeg = 0, grid9x9 = null) => {
  if (!centroid) return null;

  // Determine outer boundary radius R
  let radius = 300;
  if (grid9x9) {
    radius = Math.max(grid9x9.totalWidth, grid9x9.totalHeight) * 0.72;
  } else if (bounds) {
    radius = Math.max(bounds.width, bounds.height) * 0.72;
  }
  radius = Math.max(120, radius);

  const zones = ZONES_16_DATA.map((z, idx) => {
    // True North starts at -90° (straight up) + rotation θ
    // Each zone has center at -90° + θ + z.centerDeg
    const centerDegNorm = ((z.centerDeg + angleDeg) % 360 + 360) % 360;
    const startDegNorm = ((centerDegNorm - 11.25) % 360 + 360) % 360;
    const endDegNorm = ((centerDegNorm + 11.25) % 360 + 360) % 360;

    // Angles in standard Cartesian radians (where 0 is +X, -PI/2 is -Y straight up)
    const centerRad = ((-90 + centerDegNorm) * Math.PI) / 180;
    const startRad = ((-90 + startDegNorm) * Math.PI) / 180;
    const endRad = ((-90 + endDegNorm) * Math.PI) / 180;

    // Ray start and end points
    const rayStart = { ...centroid };
    const rayEnd = {
      x: centroid.x + Math.cos(startRad) * radius,
      y: centroid.y + Math.sin(startRad) * radius
    };

    // Label anchor position near outer boundary
    const labelPos = {
      x: centroid.x + Math.cos(centerRad) * (radius * 0.92),
      y: centroid.y + Math.sin(centerRad) * (radius * 0.92)
    };

    return {
      ...z,
      index: idx,
      centerDegNorm,
      startDegNorm,
      endDegNorm,
      centerRad,
      startRad,
      endRad,
      rayStart,
      rayEnd,
      labelPos,
      radius
    };
  });

  return {
    centroid,
    radius,
    angleDeg,
    zones
  };
};

/**
 * Attach the real plot area inside each 22.5° zone (polygon clipped to the zone wedge).
 * Zone areas always sum to the plot area, even when the centroid falls outside the plot.
 * @param {Object} zones16 - Result of calculate16DirectionalZones
 * @param {Array} points - Closed plot polygon in world coordinates
 */
export const calculateZoneAreas = (zones16, points) => {
  if (!zones16 || !points || points.length < 3) return zones16;

  const { centroid } = zones16;
  const reach = 4 * Math.max(...points.map((p) => distance(p, centroid))) + 1;
  const totalArea = calculatePolygonArea(points);

  const zones = zones16.zones.map((zone) => {
    const wedge = [
      centroid,
      { x: centroid.x + Math.cos(zone.startRad) * reach, y: centroid.y + Math.sin(zone.startRad) * reach },
      { x: centroid.x + Math.cos(zone.endRad) * reach, y: centroid.y + Math.sin(zone.endRad) * reach }
    ];
    const area = calculatePolygonArea(clipPolygonByConvex(points, wedge));
    return {
      ...zone,
      area,
      areaPct: totalArea > 0 ? (area / totalArea) * 100 : 0
    };
  });

  return { ...zones16, zones, totalArea };
};

// The four faces of the 32 entrances, as compass bearings where each face's first gate starts
const GATE_FACES = [
  { prefix: 'N', category: 'outer_north', side: 'north', startDeg: 315 }, // N1 at NW → N8 at NE
  { prefix: 'E', category: 'outer_east',  side: 'east',  startDeg: 45 },  // E1 at NE → E8 at SE
  { prefix: 'S', category: 'outer_south', side: 'south', startDeg: 135 }, // S1 at SE → S8 at SW
  { prefix: 'W', category: 'outer_west',  side: 'west',  startDeg: 225 }  // W1 at SW → W8 at NW
];
const GATE_SPAN_DEG = 360 / 32; // 11.25°

// Brihat Samhita 53.72–75 (tr. N. Chidambaram Iyer, 1884): result of a door in each of the
// 8 squares of a side, counted from the corner where that side's numbering starts
export const ENTRANCE_RESULTS_BS = {
  E: ['Injury from fire', 'Birth of daughters', 'Gain of immense wealth', 'Friendship of the king', 'Increase of anger', 'Untruthfulness', 'Cruelty', 'Theft'],
  S: ['Few sons', 'Servitude', 'Fall in status', 'Excess eating and drinking, more sons', 'Anger', 'Ingratitude', 'Poverty', 'Loss of sons and valour'],
  W: ['Suffering of sons', 'Increase of enemies', 'Want of wealth and sons', 'Increase of sons, wealth and strength', 'Opulence', 'Fear from rulers', 'Loss of wealth', 'Disease'],
  N: ['Cruelty, many kinsmen', 'Increase of enemies', 'Gain of wealth and sons', 'All virtues', 'Sons and wealth', 'Hatred of sons', 'Loss of character of women', 'Loss of wealth']
};

const polylineLength = (pts) => pts.slice(1).reduce((t, p, i) => t + distance(p, pts[i]), 0);

/**
 * Pure calculation of the 32 Perimeter Entrance Gates by compass angle.
 * Each gate is an 11.25° slice seen from the centroid (rotated with North). The plot boundary is
 * cut wherever a slice line crosses it, and every piece of wall goes to the slice its direction
 * falls in — so the 32 gates always cover the whole boundary exactly once, even on U-shaped or
 * courtyard plans where the centroid lies outside the building and a slice meets several walls.
 * @param {Array} points - Closed plot polygon in world coordinates
 * @param {Object} centroid - { x, y }
 * @param {number} angleDeg - Universal rotation (North) in degrees
 * @param {Array} devtaFields - The 45 Devtas spatial fields (for gate names)
 */
export const calculate32EntranceGates = (points, centroid, angleDeg = 0, devtaFields = null) => {
  if (!points || points.length < 3 || !centroid) return [];
  const n = points.length;

  const directionAt = (compassDeg) => {
    const rad = ((-90 + compassDeg + angleDeg) * Math.PI) / 180;
    return { x: Math.cos(rad), y: Math.sin(rad) };
  };
  // Compass bearing (relative to North) of a point seen from the centroid
  const bearingOf = (p) => {
    const screenDeg = (Math.atan2(p.x - centroid.x, -(p.y - centroid.y)) * 180) / Math.PI;
    return ((screenDeg - angleDeg) % 360 + 360) % 360;
  };
  // Gate index 0..31 in N1..N8, E1..E8, S1..S8, W1..W8 order (N1 starts at compass 315°)
  const gateIndexAt = (bearing) => Math.floor((((bearing - 315) % 360 + 360) % 360) / GATE_SPAN_DEG) % 32;

  // 1. Cut every edge where it crosses one of the 32 slice lines (half-lines from the centroid)
  const pieces = [];
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const ts = [0, 1];
    for (let k = 0; k < 32; k++) {
      const dir = directionAt(315 + k * GATE_SPAN_DEG);
      const ex = b.x - a.x;
      const ey = b.y - a.y;
      const denom = dir.x * ey - dir.y * ex;
      if (Math.abs(denom) < 1e-12) continue;
      const ox = a.x - centroid.x;
      const oy = a.y - centroid.y;
      const along = (ox * ey - oy * ex) / denom;   // distance along the slice line
      const t = (ox * dir.y - oy * dir.x) / denom; // position along the edge
      if (along > 1e-9 && t > 1e-9 && t < 1 - 1e-9) ts.push(t);
    }
    ts.sort((x, y) => x - y);
    for (let j = 0; j < ts.length - 1; j++) {
      if (ts[j + 1] - ts[j] < 1e-12) continue;
      const p0 = { x: a.x + (b.x - a.x) * ts[j], y: a.y + (b.y - a.y) * ts[j] };
      const p1 = { x: a.x + (b.x - a.x) * ts[j + 1], y: a.y + (b.y - a.y) * ts[j + 1] };
      const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
      pieces.push({ gate: gateIndexAt(bearingOf(mid)), p0, p1 });
    }
  }

  // 2. Join consecutive pieces of the same gate into polylines (wrapping around the start)
  const runs = [];
  pieces.forEach((pc) => {
    const last = runs[runs.length - 1];
    if (last && last.gate === pc.gate) last.pts.push(pc.p1);
    else runs.push({ gate: pc.gate, pts: [pc.p0, pc.p1] });
  });
  if (runs.length > 1 && runs[0].gate === runs[runs.length - 1].gate) {
    const tail = runs.pop();
    runs[0].pts = tail.pts.concat(runs[0].pts.slice(1));
  }

  const gates = [];
  GATE_FACES.forEach(({ prefix, category, side, startDeg }, face) => {
    for (let i = 0; i < 8; i++) {
      const index = face * 8 + i;
      const code = `${prefix}${i + 1}`;
      const fromDeg = startDeg + i * GATE_SPAN_DEG;
      const toDeg = fromDeg + GATE_SPAN_DEG;
      const paths = runs.filter((r) => r.gate === index).map((r) => r.pts);
      // The label and ticks go on the longest stretch of wall in the slice
      const main = paths.slice().sort((x, y) => polylineLength(y) - polylineLength(x))[0] || null;
      let midpoint = null;
      if (main) {
        const half = polylineLength(main) / 2;
        let acc = 0;
        for (let j = 1; j < main.length && !midpoint; j++) {
          const seg = distance(main[j - 1], main[j]);
          if (acc + seg >= half) {
            const f = seg > 0 ? (half - acc) / seg : 0;
            midpoint = { x: main[j - 1].x + (main[j].x - main[j - 1].x) * f, y: main[j - 1].y + (main[j].y - main[j - 1].y) * f };
          }
          acc += seg;
        }
      }
      const radial = (p) => {
        const d = distance(p, centroid) || 1;
        return { x: (p.x - centroid.x) / d, y: (p.y - centroid.y) / d };
      };
      const devta = devtaFields ? devtaFields.find((d) => d.entranceCode === code) : null;

      gates.push({
        id: devta ? devta.id : code.toLowerCase(),
        name: devta ? devta.name : code,
        code,
        number: devta ? devta.number : i + 1,
        isAuspicious: AUSPICIOUS_ENTRANCES.has(code),
        result: ENTRANCE_RESULTS_BS[prefix][i],
        category,
        side,
        segmentIndex: i,
        fromDeg: fromDeg % 360,
        toDeg: toDeg % 360,
        paths,
        path: main || [],
        wallLength: paths.reduce((t, pts) => t + polylineLength(pts), 0),
        center: midpoint,
        outerEdgeStart: main ? main[0] : null,
        outerEdgeEnd: main ? main[main.length - 1] : null,
        startNormal: main ? radial(main[0]) : directionAt(fromDeg),
        endNormal: main ? radial(main[main.length - 1]) : directionAt(toDeg),
        edgeMidpoint: midpoint,
        normal: directionAt(fromDeg + GATE_SPAN_DEG / 2),
        attribute: devta ? devta.description : ''
      });
    }
  });

  return gates;
};

