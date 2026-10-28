/**
 * VastuGrid — 16 Directional Zones & 32 Entrance Padas Computational Engine
 * Classical 16 Directional Zones (22.5° each) & 32 Perimeter Gateway Padas
 */

import { rotatePoint } from './geometry.js';

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
 * Pure calculation of 32 Perimeter Entrance Gates from the 9x9 grid
 * Divides each of the four perimeter sides into 8 equal segments:
 * - North: N1 to N8
 * - East:  E1 to E8
 * - South: S1 to S8
 * - West:  W1 to W8
 * @param {Object} grid9x9 - The 9x9 grid object
 * @param {Array} devtaFields - The 45 Devtas spatial fields
 */
export const calculate32EntranceGates = (grid9x9, devtaFields) => {
  if (!grid9x9 || !grid9x9.outerBox || grid9x9.outerBox.length < 4) return [];

  const box = grid9x9.outerBox;
  const centroid = grid9x9.centroid || { x: (box[0].x + box[2].x) / 2, y: (box[0].y + box[2].y) / 2 };

  // 4 perimeter sides: [StartCorner, EndCorner, prefix, category, sideName]
  const sides = [
    { start: box[0], end: box[1], prefix: 'N', category: 'outer_north', side: 'north' }, // North: NW -> NE
    { start: box[1], end: box[2], prefix: 'E', category: 'outer_east',  side: 'east'  }, // East:  NE -> SE
    { start: box[2], end: box[3], prefix: 'S', category: 'outer_south', side: 'south' }, // South: SE -> SW
    { start: box[3], end: box[0], prefix: 'W', category: 'outer_west',  side: 'west'  }  // West:  SW -> NW
  ];

  const gates = [];

  sides.forEach(({ start, end, prefix, category, side }) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy) || 1;

    // Unit tangent along side
    const tx = dx / len;
    const ty = dy / len;

    // Outward unit normal pointing away from centroid
    let nx = -ty;
    let ny = tx;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    if (nx * (midX - centroid.x) + ny * (midY - centroid.y) < 0) {
      nx = -nx;
      ny = -ny;
    }
    const normal = { x: nx, y: ny };

    // 8 equal segments per side
    for (let i = 0; i < 8; i++) {
      const code = `${prefix}${i + 1}`;
      const t0 = i / 8;
      const t1 = (i + 1) / 8;
      const tMid = (i + 0.5) / 8;

      const segStart = { x: start.x + dx * t0, y: start.y + dy * t0 };
      const segEnd = { x: start.x + dx * t1, y: start.y + dy * t1 };
      const edgeMidpoint = { x: start.x + dx * tMid, y: start.y + dy * tMid };

      const devta = devtaFields ? devtaFields.find((d) => d.entranceCode === code) : null;
      const isAuspicious = AUSPICIOUS_ENTRANCES.has(code);

      gates.push({
        id: devta ? devta.id : code.toLowerCase(),
        name: devta ? devta.name : code,
        code,
        number: devta ? devta.number : i + 1,
        isAuspicious,
        category,
        side,
        segmentIndex: i,
        center: devta ? devta.center : edgeMidpoint,
        boundaryCorners: devta ? devta.boundaryCorners : null,
        outerEdgeStart: segStart,
        outerEdgeEnd: segEnd,
        edgeMidpoint,
        normal,
        attribute: devta ? devta.description : ''
      });
    }
  });

  return gates;
};

