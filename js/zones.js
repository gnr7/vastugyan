/**
 * Vastu Mandala Studio — 16 Directional Zones & 32 Entrance Padas Computational Engine
 * Classical 16 Directional Zones (22.5° each) & 32 Perimeter Gateway Padas
 */

import {
  calculatePolygonArea,
  calculateSignedArea,
  clipPolygonByConvex,
  rayPolygonHit,
  boundaryPathBetween,
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

/**
 * Pure calculation of the 32 Perimeter Entrance Gates by compass angle.
 * Each gate is an 11.25° slice seen from the centroid (rotated with North), marked where
 * the slice actually meets the plot boundary — so labels sit on the real walls.
 * @param {Array} points - Closed plot polygon in world coordinates
 * @param {Object} centroid - { x, y }
 * @param {number} angleDeg - Universal rotation (North) in degrees
 * @param {Array} devtaFields - The 45 Devtas spatial fields (for gate names)
 */
export const calculate32EntranceGates = (points, centroid, angleDeg = 0, devtaFields = null) => {
  if (!points || points.length < 3 || !centroid) return [];

  const reach = 2 * Math.max(...points.map((p) => distance(p, centroid))) + 1;
  // Increasing screen angle is clockwise on a y-down canvas, matching a clockwise vertex order
  const forward = calculateSignedArea(points) > 0;

  const directionAt = (compassDeg) => {
    const rad = ((-90 + compassDeg + angleDeg) * Math.PI) / 180;
    return { x: Math.cos(rad), y: Math.sin(rad) };
  };
  const hitAt = (compassDeg) => {
    const dir = directionAt(compassDeg);
    return rayPolygonHit(points, centroid, dir) || {
      point: { x: centroid.x + dir.x * reach, y: centroid.y + dir.y * reach },
      edgeIndex: -1,
      t: 0,
      dist: reach
    };
  };

  const gates = [];

  GATE_FACES.forEach(({ prefix, category, side, startDeg }) => {
    for (let i = 0; i < 8; i++) {
      const code = `${prefix}${i + 1}`;
      const fromDeg = startDeg + i * GATE_SPAN_DEG;
      const toDeg = fromDeg + GATE_SPAN_DEG;

      const hitStart = hitAt(fromDeg);
      const hitEnd = hitAt(toDeg);
      const hitMid = hitAt(fromDeg + GATE_SPAN_DEG / 2);
      const path = (hitStart.edgeIndex >= 0 && hitEnd.edgeIndex >= 0)
        ? boundaryPathBetween(points, hitStart, hitEnd, forward)
        : [hitStart.point, hitEnd.point];

      const devta = devtaFields ? devtaFields.find((d) => d.entranceCode === code) : null;

      gates.push({
        id: devta ? devta.id : code.toLowerCase(),
        name: devta ? devta.name : code,
        code,
        number: devta ? devta.number : i + 1,
        isAuspicious: AUSPICIOUS_ENTRANCES.has(code),
        category,
        side,
        segmentIndex: i,
        fromDeg: fromDeg % 360,
        toDeg: toDeg % 360,
        center: hitMid.point,
        path,
        outerEdgeStart: hitStart.point,
        outerEdgeEnd: hitEnd.point,
        startNormal: directionAt(fromDeg),
        endNormal: directionAt(toDeg),
        edgeMidpoint: hitMid.point,
        normal: directionAt(fromDeg + GATE_SPAN_DEG / 2),
        attribute: devta ? devta.description : ''
      });
    }
  });

  return gates;
};

