/**
 * Vastu Mandala Studio — Analysis Panel, Elemental Distribution & Area Metrics Engine
 * Pure functional calculations for area proportions, Panch Tatva balance, and entrances.
 */

import { ZONES_16_DATA } from './zones.js';

const ELEMENT_IDS = { Water: 'water', Air: 'air', Fire: 'fire', Earth: 'earth', Space: 'space' };
const zonesOfElement = (id) => ZONES_16_DATA.filter((z) => ELEMENT_IDS[z.element] === id).map((z) => z.id);

export const FEET_PER_METRE = 3.28084;

// Format a world (canvas) length in real units when Set Scale has been applied, else in pixels
export const formatLength = (worldLength, calibration, digits = 1) => {
  if (!calibration) return `${Math.round(worldLength)} px`;
  return `${(worldLength * calibration.realPerWorld).toFixed(digits)} ${calibration.unit}`;
};

export const formatArea = (worldArea, calibration) => {
  if (!calibration) return `${Math.round(worldArea).toLocaleString()} sq px`;
  const real = worldArea * calibration.realPerWorld * calibration.realPerWorld;
  return `${Math.round(real).toLocaleString()} sq ${calibration.unit}`;
};

// Panch Tatva (Five Elements) Constants
export const PANCH_TATVA_DATA = [
  {
    id: 'water',
    name: 'Water (Jal)',
    sanskrit: 'जल तत्व',
    color: '#1a73e8',
    bgTint: 'rgba(26, 115, 232, 0.12)',
    zones: zonesOfElement('water'),
    significance: 'Clarity, opportunities, flow of wealth & healing',
    directionRange: 'North-North-West to North-East'
  },
  {
    id: 'air',
    name: 'Air (Vayu)',
    sanskrit: 'वायु तत्व',
    color: '#1e8e3e',
    bgTint: 'rgba(30, 142, 62, 0.12)',
    zones: zonesOfElement('air'),
    significance: 'Growth, social networking, expansion & joy',
    directionRange: 'East-North-East to East-South-East'
  },
  {
    id: 'fire',
    name: 'Fire (Agni)',
    sanskrit: 'अग्नि तत्व',
    color: '#d93025',
    bgTint: 'rgba(217, 48, 37, 0.12)',
    zones: zonesOfElement('fire'),
    significance: 'Cash liquidity, confidence, dynamic drive & fame',
    directionRange: 'South-East to South'
  },
  {
    id: 'earth',
    name: 'Earth (Prithvi)',
    sanskrit: 'पृथ्वी तत्व',
    color: '#e37400',
    bgTint: 'rgba(227, 116, 0, 0.12)',
    zones: zonesOfElement('earth'),
    significance: 'Stability, family bonds, skills & relationships',
    directionRange: 'South-South-West to South-West'
  },
  {
    id: 'space',
    name: 'Space (Akash)',
    sanskrit: 'आकाश तत्व',
    color: '#5f6368',
    bgTint: 'rgba(95, 99, 104, 0.12)',
    zones: zonesOfElement('space'),
    significance: 'Gains, manifestation, profits & banking support',
    directionRange: 'West-South-West to North-West'
  }
];

/**
 * Pure calculation of Area breakdown metrics
 */
export const calculateAreaMetrics = (metrics) => {
  if (!metrics) {
    return {
      plotArea: 0,
      gridArea: 0,
      brahmasthanArea: 0,
      padaArea: 0,
      brahmasthanRatioPct: 11.11,
      width: 0,
      height: 0,
      hasClosedPlot: false
    };
  }

  const plotArea = metrics.area || 0;
  const grid = metrics.grid9x9;
  const bounds = metrics.bounds;

  const width = bounds ? bounds.width : 0;
  const height = bounds ? bounds.height : 0;
  const gridArea = grid ? (grid.padWidth * 9) * (grid.padHeight * 9) : 0;
  const padaArea = grid ? grid.padWidth * grid.padHeight : 0;
  const brahmasthanArea = padaArea * 9;
  const brahmasthanRatioPct = gridArea > 0 ? (brahmasthanArea / gridArea) * 100 : 11.11;

  return {
    plotArea,
    gridArea,
    brahmasthanArea,
    padaArea,
    brahmasthanRatioPct: Math.round(brahmasthanRatioPct * 10) / 10,
    width: Math.round(width * 10) / 10,
    height: Math.round(height * 10) / 10,
    hasClosedPlot: plotArea > 0
  };
};

/**
 * Pure calculation of Panch Tatva (Five Elements) distribution breakdown.
 * Shares are the real plot area falling in each element's zones (needs a closed plot).
 * @param {Object} zones16 - Zones with per-zone `area` from calculateZoneAreas
 */
export const calculatePanchTatvaSummary = (zones16 = null) => {
  const zones = zones16 && zones16.zones ? zones16.zones : [];
  const hasAreas = zones.length > 0 && zones.every((z) => typeof z.area === 'number');
  const totalArea = hasAreas ? zones.reduce((sum, z) => sum + z.area, 0) : 0;

  return PANCH_TATVA_DATA.map((elem) => {
    const area = hasAreas
      ? zones.filter((z) => elem.zones.includes(z.id)).reduce((sum, z) => sum + z.area, 0)
      : 0;
    const percentage = totalArea > 0 ? Math.round((area / totalArea) * 1000) / 10 : 0;
    return {
      ...elem,
      zoneCount: elem.zones.length,
      area,
      hasData: totalArea > 0,
      percentage,
      formattedPercentage: totalArea > 0 ? `${percentage}%` : '—'
    };
  });
};

// Bar colour groups for the 16 Bar Chart, relative to the average and ±1 standard deviation
export const BAR_BANDS = {
  high: { label: 'Strong (above avg + 1 SD)', color: '#1e8e3e' },
  above: { label: 'Above average', color: '#1a73e8' },
  below: { label: 'Below average', color: '#8ab4f8' },
  low: { label: 'Weak (below avg − 1 SD)', color: '#d93025' }
};

/**
 * Pure calculation of the 16 Bar Chart: each direction's share of the plot area.
 * The average is always 100 / 16 = 6.25%; the spread (population SD over the 16 shares)
 * is what changes with the plot's shape.
 * @param {Object} zones16 - Zones with per-zone `area` from calculateZoneAreas
 */
export const calculate16BarChart = (zones16 = null) => {
  const zones = zones16 && zones16.zones ? zones16.zones : [];
  const totalArea = zones.reduce((sum, z) => sum + (typeof z.area === 'number' ? z.area : 0), 0);
  if (zones.length !== 16 || !(totalArea > 0)) {
    return { hasData: false, bars: [], totalArea: 0, mean: 0, sd: 0, max: null, min: null };
  }

  const pcts = zones.map((z) => (z.area / totalArea) * 100);
  const mean = pcts.reduce((sum, p) => sum + p, 0) / pcts.length;
  const sd = Math.sqrt(pcts.reduce((sum, p) => sum + (p - mean) ** 2, 0) / pcts.length);
  const eps = 1e-9;

  const bars = zones.map((z, i) => {
    const pct = pcts[i];
    let band;
    if (pct > mean + sd + eps) band = 'high';
    else if (pct < mean - sd - eps) band = 'low';
    else band = pct >= mean ? 'above' : 'below';
    return { id: z.id, name: z.name, element: z.element, area: z.area, pct, band, color: BAR_BANDS[band].color };
  });

  const max = bars.reduce((best, b) => (b.pct > best.pct ? b : best), bars[0]);
  const min = bars.reduce((best, b) => (b.pct < best.pct ? b : best), bars[0]);

  return {
    hasData: true,
    bars,
    totalArea,
    mean,
    sd,
    max,
    min,
    strong: bars.filter((b) => b.band === 'high').map((b) => b.id),
    weak: bars.filter((b) => b.band === 'low').map((b) => b.id)
  };
};

/**
 * Pure calculation of 32 Entrance Gate Assessment summary
 */
export const calculateGateAssessment = (entranceGates32) => {
  if (!entranceGates32 || entranceGates32.length === 0) {
    return {
      totalCount: 0,
      auspiciousCount: 0,
      regularCount: 0,
      byDirection: {
        north: [],
        east: [],
        south: [],
        west: []
      }
    };
  }

  const byDirection = {
    north: entranceGates32.filter((g) => g.category === 'outer_north'),
    east: entranceGates32.filter((g) => g.category === 'outer_east'),
    south: entranceGates32.filter((g) => g.category === 'outer_south'),
    west: entranceGates32.filter((g) => g.category === 'outer_west')
  };

  const auspiciousGates = entranceGates32.filter((g) => g.isAuspicious);

  return {
    totalCount: entranceGates32.length,
    auspiciousCount: auspiciousGates.length,
    regularCount: entranceGates32.length - auspiciousGates.length,
    auspiciousCodes: auspiciousGates.map((g) => g.code),
    byDirection
  };
};

/**
 * Remainder energy pattern table: (Length + Breadth) ÷ 8 → remainder.
 * Results follow the VastuGrid-style reading (remainder 4 = best); the classical Ayadi
 * Yoni names are intentionally not used because that method computes and reads differently.
 */
export const ENERGY_PATTERNS_DICT = {
  0: { isPositive: false, quality: 'Caution', description: 'Mixed/Weak Energy (delays, unpredictability; remedial measures advised)' },
  1: { isPositive: true, quality: 'Auspicious', description: 'Positive Energy (success, sustained growth, fame & leadership)' },
  2: { isPositive: false, quality: 'Inauspicious', description: 'Negative Tendency (anxiety, conflicts, higher restlessness)' },
  3: { isPositive: true, quality: 'Auspicious', description: 'Positive Energy (power, dynamic courage, victory & authority)' },
  4: { isPositive: true, quality: 'Best', description: 'Positive Energy: dhan, sukh, santan, progress' },
  5: { isPositive: true, quality: 'Auspicious', description: 'Positive Energy (steady prosperity, financial stability & harmony)' },
  6: { isPositive: false, quality: 'Inauspicious', description: 'Negative Tendency (instability, frequent hurdles & fluctuating gains)' },
  7: { isPositive: true, quality: 'Best', description: 'Positive Energy: abundant wealth, royal status & spiritual wisdom' }
};

/**
 * Pure calculation of Positive Land Energy Analysis
 * Evaluates:
 * 1. Income Potential (Length × 8)
 * 2. Expenditure Tendency (Breadth × 10.8)
 * 3. Income > Expenditure Financial Outlook
 * 4. Energy Pattern Remainder: (Length + Breadth) ÷ 8
 * 5. Length Proportion Ratio: Length / Breadth (<= 2.5)
 * 6. Final Land Verdict
 * Length and Breadth are in feet, taken from the grid's bounding dimensions and Set Scale.
 * @param {Object} metrics - Plot metrics
 * @param {Object} calibration - Set Scale result { realPerWorld, unit }
 */
export const calculatePositiveLandEnergy = (metrics, calibration = null) => {
  const hasPlot = !!(metrics && metrics.bounds && metrics.area > 0);
  if (!hasPlot || !calibration) {
    return {
      isActive: false,
      length: 0,
      breadth: 0,
      income: 0,
      expenditure: 0,
      incomeGreater: false,
      remainder: null,
      remainderInfo: null,
      ratio: 0,
      maxAllowedLength: 0,
      ratioGood: false,
      verdict: hasPlot
        ? {
          code: 'NO_SCALE',
          title: 'SET SCALE',
          badgeClass: 'verdict-neutral',
          isRecommended: false,
          summary: 'Use Set Scale and enter one wall\'s real length — land energy needs real dimensions.'
        }
        : {
          code: 'NO_PLOT',
          title: 'NO CLOSED PLOT',
          badgeClass: 'verdict-neutral',
          isRecommended: false,
          summary: 'Draw and close a property boundary to compute land energy.'
        }
    };
  }

  // Use oriented bounding dimensions after rotation
  const rawW = metrics.grid9x9 ? metrics.grid9x9.totalWidth : metrics.bounds.width;
  const rawH = metrics.grid9x9 ? metrics.grid9x9.totalHeight : metrics.bounds.height;

  const rawL = Math.max(rawW, rawH);
  const rawB = Math.min(rawW, rawH);

  // Convert canvas units to real feet using the Set Scale calibration
  const feetPerWorld = calibration.realPerWorld * (calibration.unit === 'm' ? FEET_PER_METRE : 1);
  const length = Math.round(rawL * feetPerWorld * 10) / 10;
  const breadth = Math.max(0.1, Math.round(rawB * feetPerWorld * 10) / 10);

  // 1. Income Potential: Length × 8
  const income = Math.round(length * 8 * 100) / 100;

  // 2. Expenditure Tendency: Breadth × 10.8
  const expenditure = Math.round(breadth * 10.8 * 100) / 100;

  // 3. Comparison
  const incomeGreater = income >= expenditure;

  // 4. Energy Pattern (Remainder method): (Length + Breadth) ÷ 8 → remainder
  const sumDimensions = Math.round(length + breadth);
  const remainder = sumDimensions % 8;
  const remainderInfo = ENERGY_PATTERNS_DICT[remainder] || ENERGY_PATTERNS_DICT[0];

  // 5. Length Proportion (Ratio): Length / Breadth
  const ratio = Math.round((length / breadth) * 100) / 100;
  const maxAllowedLength = Math.round(2.5 * breadth * 10) / 10;
  const ratioGood = ratio <= 2.5;

  // 6. Final Verdict Assessment
  let verdict;
  if (incomeGreater && ratioGood && remainderInfo.isPositive) {
    verdict = {
      code: 'RECOMMENDED',
      title: 'RECOMMENDED LAND',
      badgeClass: 'verdict-recommended',
      isRecommended: true,
      summary: 'This land shows predominantly positive Vastu energy patterns suitable for prosperity and well-being.'
    };
  } else if (ratioGood && (incomeGreater || remainderInfo.isPositive)) {
    verdict = {
      code: 'MODERATE',
      title: 'CONDITIONALLY SUITABLE',
      badgeClass: 'verdict-moderate',
      isRecommended: false,
      summary: 'Land possesses balanced structural proportions; subtle energetic zone balancing is recommended.'
    };
  } else {
    verdict = {
      code: 'CAUTION',
      title: 'REMEDIES REQUIRED',
      badgeClass: 'verdict-warning',
      isRecommended: false,
      summary: 'Higher financial expenditure tendency or unbalanced dimension ratio detected. Boundary correction recommended.'
    };
  }

  return {
    isActive: true,
    length,
    breadth,
    income,
    expenditure,
    incomeGreater,
    remainder,
    remainderInfo,
    sumDimensions,
    ratio,
    maxAllowedLength,
    ratioGood,
    verdict
  };
};

