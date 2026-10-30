/**
 * Vastu Gyan — Analysis Panel, Elemental Distribution & Area Metrics Engine
 * Pure functional calculations for area proportions, Panch Tatva balance, and entrances.
 */

import { ZONES_16_DATA, zoneElement, zoneTone } from './zones.js';

const ELEMENT_IDS = { Water: 'water', Air: 'air', Fire: 'fire', Earth: 'earth', Space: 'space' };
const zonesOfElement = (id, style = 'classic') => ZONES_16_DATA.filter((z) => ELEMENT_IDS[zoneElement(z.id, style)] === id).map((z) => z.id);

// Direction ranges that change with the Loose Earth style
const LOOSE_EARTH_RANGES = {
  water: 'North-North-West to North-North-East',
  earth: 'South-South-West to South-West (hard), North-East and North-West (loose)',
  space: 'West-South-West to West-North-West'
};

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
  // A pada is 1/81 of the mandala: of the plot itself when the mandala follows the plot
  const padaArea = grid ? (grid.shape === 'plot' ? plotArea / 81 : grid.padWidth * grid.padHeight) : 0;
  // The Brahmasthan's real share of the plot (not of the grid rectangle)
  const brahmasthanArea = metrics.brahmasthan ? metrics.brahmasthan.area : padaArea * 9;
  const brahmasthanRatioPct = metrics.brahmasthan ? metrics.brahmasthan.pctOfPlot : 11.11;

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
export const calculatePanchTatvaSummary = (zones16 = null, style = 'classic') => {
  const zones = zones16 && zones16.zones ? zones16.zones : [];
  const hasAreas = zones.length > 0 && zones.every((z) => typeof z.area === 'number');
  const totalArea = hasAreas ? zones.reduce((sum, z) => sum + z.area, 0) : 0;
  const pctOf = (area) => (totalArea > 0 ? Math.round((area / totalArea) * 1000) / 10 : 0);
  const areaOf = (ids) => (hasAreas ? zones.filter((z) => ids.includes(z.id)).reduce((sum, z) => sum + z.area, 0) : 0);

  return PANCH_TATVA_DATA.map((elem) => {
    const elemZones = zonesOfElement(elem.id, style);
    const area = areaOf(elemZones);
    const percentage = pctOf(area);
    // With Loose Earth, Earth's share is split into its hard (SSW, SW) and loose (NE, NW) parts
    const earthSplit = style === 'looseEarth' && elem.id === 'earth'
      ? {
        hard: pctOf(areaOf(elemZones.filter((id) => zoneTone(id, style) === 'HardEarth'))),
        loose: pctOf(areaOf(elemZones.filter((id) => zoneTone(id, style) === 'LooseEarth')))
      }
      : null;
    return {
      ...elem,
      zones: elemZones,
      directionRange: style === 'looseEarth' && LOOSE_EARTH_RANGES[elem.id] ? LOOSE_EARTH_RANGES[elem.id] : elem.directionRange,
      zoneCount: elemZones.length,
      area,
      earthSplit,
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
export const calculate16BarChart = (zones16 = null, style = 'classic') => {
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
    const tone = zoneTone(z.id, style);
    const element = tone === 'LooseEarth' ? 'Loose Earth' : tone === 'HardEarth' ? 'Hard Earth' : z.element;
    return { id: z.id, name: z.name, element, area: z.area, pct, band, color: BAR_BANDS[band].color };
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
 * Remainder energy pattern table: (Length + Breadth) ÷ 8 → remainder, as VastuGrid reads it:
 * even remainders are positive, odd ones are not, and an exact division counts as remainder 8.
 * The classical Ayadi Yoni names are intentionally not used because that method computes and
 * reads differently.
 */
const POSITIVE_PATTERN = { isPositive: true, quality: 'Best', description: 'Positive Energy: dhan, sukh, santan, progress' };
const NEGATIVE_PATTERN = { isPositive: false, quality: 'Avoid', description: 'Negative Energy' };
export const ENERGY_PATTERNS_DICT = {
  1: NEGATIVE_PATTERN,
  2: POSITIVE_PATTERN,
  3: NEGATIVE_PATTERN,
  4: POSITIVE_PATTERN,
  5: NEGATIVE_PATTERN,
  6: POSITIVE_PATTERN,
  7: NEGATIVE_PATTERN,
  8: POSITIVE_PATTERN
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
export const calculatePositiveLandEnergy = (metrics, calibration = null, landDims = null) => {
  const hasPlot = !!(metrics && metrics.bounds && metrics.area > 0);
  if (!hasPlot || (!calibration && !landDims)) {
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

  // Length and breadth of the plot's own walls (independent of North), or as typed by the user
  let lengthFt;
  let breadthFt;
  let source;
  if (landDims) {
    lengthFt = landDims.length;
    breadthFt = landDims.breadth;
    source = 'typed';
  } else {
    const dims = metrics.plotDims || { length: Math.max(metrics.bounds.width, metrics.bounds.height), breadth: Math.min(metrics.bounds.width, metrics.bounds.height) };
    const feetPerWorld = calibration.realPerWorld * (calibration.unit === 'm' ? FEET_PER_METRE : 1);
    lengthFt = dims.length * feetPerWorld;
    breadthFt = dims.breadth * feetPerWorld;
    source = 'measured';
  }
  const length = Math.round(lengthFt * 10) / 10;
  const breadth = Math.max(0.1, Math.round(breadthFt * 10) / 10);

  // 1. Income Potential: Length × 8
  const income = Math.round(length * 8 * 100) / 100;

  // 2. Expenditure Tendency: Breadth × 10.8
  const expenditure = Math.round(breadth * 10.8 * 100) / 100;

  // 3. Comparison
  const incomeGreater = income >= expenditure;

  // 4. Energy Pattern (Remainder method): (Length + Breadth) ÷ 8 → remainder
  const sumDimensions = Math.round(length + breadth);
  const remainder = sumDimensions % 8 || 8;
  // Borderline when a small tracing difference (under 0.3 ft) would round L + B the other way
  const exactSum = length + breadth;
  const toBoundary = Math.abs(exactSum - (Math.floor(exactSum) + 0.5));
  const borderline = toBoundary < 0.3;
  const otherSum = exactSum >= Math.floor(exactSum) + 0.5 ? sumDimensions - 1 : sumDimensions + 1;
  const alternateRemainder = borderline ? ((otherSum % 8) + 8) % 8 || 8 : null;
  const remainderInfo = ENERGY_PATTERNS_DICT[remainder];

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
    exactSum: Math.round(exactSum * 100) / 100,
    borderline,
    alternateRemainder,
    source,
    ratio,
    maxAllowedLength,
    ratioGood,
    verdict
  };
};


/**
 * Vithi Mandal: the four concentric rings of the 81-pada mandala and their traditional use
 */
export const VITHI_DATA = {
  brahma: {
    name: 'Brahma',
    sanskrit: 'ब्रह्म',
    color: 'var(--vithi-brahma)',
    guidance: 'The sacred centre. Keep it open and light, free of pillars, walls, toilets and heavy loads.'
  },
  daivika: {
    name: 'Daivika',
    sanskrit: 'दैविक',
    color: 'var(--vithi-daivika)',
    guidance: 'Ring of the devas. Suits prayer, quiet sitting and light, open use.'
  },
  manushya: {
    name: 'Manushya',
    sanskrit: 'मानुष',
    color: 'var(--vithi-manushya)',
    guidance: 'Ring of people. The natural place for living, dining, bedrooms and daily life.'
  },
  paishachika: {
    name: 'Paishachika',
    sanskrit: 'पैशाचिक',
    color: 'var(--vithi-paishachika)',
    guidance: 'The outer ring. Traditionally for boundary walls, storage, stairs and service rooms.'
  }
};

/**
 * Pure summary of the Vithi Mandal for the panel and the PDF
 * @param {Object} vithi - Result of calculateVithiMandal (metrics.vithi)
 */
export const calculateVithiSummary = (vithi = null) => {
  const rings = vithi && vithi.rings ? vithi.rings : [];
  return {
    hasData: rings.length === 4 && vithi.plotArea > 0,
    rings: ['brahma', 'daivika', 'manushya', 'paishachika'].map((id) => {
      const ring = rings.find((r) => r.id === id);
      return {
        id,
        ...VITHI_DATA[id],
        padas: ring ? ring.padas : { brahma: 9, daivika: 16, manushya: 24, paishachika: 32 }[id],
        area: ring ? ring.area : 0,
        areaPct: ring ? ring.areaPct : 0,
        fillPct: ring ? ring.fillPct : 0
      };
    })
  };
};
