/**
 * VastuGrid — Analysis Panel, Elemental Distribution & Area Metrics Engine
 * Pure functional calculations for area proportions, Panch Tatva balance, and entrances.
 */

// Panch Tatva (Five Elements) Constants
export const PANCH_TATVA_DATA = [
  {
    id: 'water',
    name: 'Water (Jal)',
    sanskrit: 'जल तत्व',
    color: '#1a73e8',
    bgTint: 'rgba(26, 115, 232, 0.12)',
    zones: ['N', 'NNE', 'NE'],
    significance: 'Clarity, opportunities, flow of wealth & healing',
    directionRange: 'North to North-East'
  },
  {
    id: 'air',
    name: 'Air (Vayu)',
    sanskrit: 'वायु तत्व',
    color: '#1e8e3e',
    bgTint: 'rgba(30, 142, 62, 0.12)',
    zones: ['ENE', 'E', 'ESE'],
    significance: 'Growth, social networking, expansion & joy',
    directionRange: 'East-North-East to East-South-East'
  },
  {
    id: 'fire',
    name: 'Fire (Agni)',
    sanskrit: 'अग्नि तत्व',
    color: '#d93025',
    bgTint: 'rgba(217, 48, 37, 0.12)',
    zones: ['SE', 'SSE', 'S'],
    significance: 'Cash liquidity, confidence, dynamic drive & fame',
    directionRange: 'South-East to South'
  },
  {
    id: 'earth',
    name: 'Earth (Prithvi)',
    sanskrit: 'पृथ्वी तत्व',
    color: '#e37400',
    bgTint: 'rgba(227, 116, 0, 0.12)',
    zones: ['SSW', 'SW'],
    significance: 'Stability, family bonds, skills & relationships',
    directionRange: 'South-South-West to South-West'
  },
  {
    id: 'space',
    name: 'Space (Akash)',
    sanskrit: 'आकाश तत्व',
    color: '#5f6368',
    bgTint: 'rgba(95, 99, 104, 0.12)',
    zones: ['WSW', 'W', 'WNW', 'NW', 'NNW'],
    significance: 'Gains, manifestation, profits & banking support',
    directionRange: 'West-South-West to North-North-West'
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
 * Pure calculation of Panch Tatva (Five Elements) distribution breakdown
 */
export const calculatePanchTatvaSummary = () => {
  const totalZones = 16;
  return PANCH_TATVA_DATA.map((elem) => {
    const zoneCount = elem.zones.length;
    const percentage = Math.round((zoneCount / totalZones) * 1000) / 10; // e.g. 18.8%
    return {
      ...elem,
      zoneCount,
      percentage,
      formattedPercentage: `${percentage}%`
    };
  });
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
 * Classical Remainder (Ayaadi / Yoni) Energy Pattern dictionary
 * Formula: (Length + Breadth) ÷ 8 → remainder
 */
export const ENERGY_PATTERNS_DICT = {
  0: {
    yoni: 'Kaka (Crow)',
    direction: 'North-East',
    isPositive: false,
    quality: 'Caution',
    description: 'Mixed/Weak Energy (delays, unpredictability; remedial measures advised)'
  },
  1: {
    yoni: 'Dhwaja (Flag)',
    direction: 'East',
    isPositive: true,
    quality: 'Auspicious',
    description: 'Positive Energy (success, sustained growth, fame & leadership)'
  },
  2: {
    yoni: 'Dhooma (Smoke)',
    direction: 'South-East',
    isPositive: false,
    quality: 'Inauspicious',
    description: 'Negative Tendency (anxiety, conflicts, higher restlessness)'
  },
  3: {
    yoni: 'Simha (Lion)',
    direction: 'South',
    isPositive: true,
    quality: 'Auspicious',
    description: 'Positive Energy (power, dynamic courage, victory & authority)'
  },
  4: {
    yoni: 'Shwana / Vrishabha',
    direction: 'South-West',
    isPositive: true,
    quality: 'Best',
    description: 'Positive Energy: dhan, sukh, santan, progress'
  },
  5: {
    yoni: 'Vrisha (Bull)',
    direction: 'West',
    isPositive: true,
    quality: 'Auspicious',
    description: 'Positive Energy (steady prosperity, financial stability & harmony)'
  },
  6: {
    yoni: 'Khar (Donkey)',
    direction: 'North-West',
    isPositive: false,
    quality: 'Inauspicious',
    description: 'Negative Tendency (instability, frequent hurdles & fluctuating gains)'
  },
  7: {
    yoni: 'Gaja (Elephant)',
    direction: 'North',
    isPositive: true,
    quality: 'Best',
    description: 'Positive Energy: abundant wealth, royal status & spiritual wisdom'
  }
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
 * @param {Object} metrics - Plot metrics
 */
export const calculatePositiveLandEnergy = (metrics) => {
  if (!metrics || !metrics.bounds || !metrics.area || metrics.area <= 0) {
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
      verdict: {
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

  // Convert canvas pixel units into clean, usable plot units
  const divisor = rawL >= 120 ? 10 : (rawL >= 30 ? 1 : 0.1);
  const length = Math.round((rawL / divisor) * 10) / 10;
  const breadth = Math.max(1, Math.round((rawB / divisor) * 10) / 10);

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

