/**
 * VastuGrid — Classical 45 Devtas Data Dictionary & Spatial Mapping Engine
 * 81 Padas (Paramasayika Mandala) partition according to classical Vastu Shastra
 */

export const DEVTAS_DATA = [
  // --- 1. Central Core (Brahmasthan, 9 Padas) ---
  {
    id: 'brahma',
    name: 'Brahma',
    sanskrit: 'ब्रह्मा',
    number: 1,
    category: 'central',
    padas: [
      [3, 3], [4, 3], [5, 3],
      [3, 4], [4, 4], [5, 4],
      [3, 5], [4, 5], [5, 5]
    ],
    zone: 'Brahmasthan',
    description: 'The supreme creator force and cosmic energetic core of the property.'
  },

  // --- 2. 4 Cardinal Inner Devtas (6 Padas each) ---
  {
    id: 'aryama',
    name: 'Aryama',
    sanskrit: 'अर्यमा',
    number: 2,
    category: 'inner_cardinal',
    padas: [
      [6, 3], [7, 3],
      [6, 4], [7, 4],
      [6, 5], [7, 5]
    ],
    zone: 'East',
    description: 'Supports growth, nobility, social connections, and ancestral blessings.'
  },
  {
    id: 'vivaswan',
    name: 'Vivaswan',
    sanskrit: 'विवस्वान',
    number: 3,
    category: 'inner_cardinal',
    padas: [
      [3, 6], [4, 6], [5, 6],
      [3, 7], [4, 7], [5, 7]
    ],
    zone: 'South',
    description: 'Controls manifestation, fame, digestion, and dynamic willpower.'
  },
  {
    id: 'mitra',
    name: 'Mitra',
    sanskrit: 'मित्र',
    number: 4,
    category: 'inner_cardinal',
    padas: [
      [1, 3], [2, 3],
      [1, 4], [2, 4],
      [1, 5], [2, 5]
    ],
    zone: 'West',
    description: 'Brings alliances, partnerships, contracts, and mutual understanding.'
  },
  {
    id: 'bhudhar',
    name: 'Bhudhar',
    sanskrit: 'भूधर / महीधर',
    number: 5,
    category: 'inner_cardinal',
    padas: [
      [3, 1], [4, 1], [5, 1],
      [3, 2], [4, 2], [5, 2]
    ],
    zone: 'North',
    description: 'The earth-bearer, imparting immense stability, patience, and focus.'
  },

  // --- 3. 8 Diagonal Inner Devtas (2 Padas each) ---
  // North-East (NE) Inner Corner
  {
    id: 'aapa',
    name: 'Aapa',
    sanskrit: 'आप',
    number: 6,
    category: 'inner_diagonal',
    padas: [[7, 1], [7, 2]],
    zone: 'North-East',
    description: 'Life-giving primordial water, vitality, and healing energy.'
  },
  {
    id: 'aapavatsa',
    name: 'Aapavatsa',
    sanskrit: 'आपवत्स',
    number: 7,
    category: 'inner_diagonal',
    padas: [[6, 1], [6, 2]],
    zone: 'North-East',
    description: 'Carrier of health, rejuvenation, and clear mental perception.'
  },

  // South-East (SE) Inner Corner
  {
    id: 'savita',
    name: 'Savita',
    sanskrit: 'सविता',
    number: 8,
    category: 'inner_diagonal',
    padas: [[7, 6], [7, 7]],
    zone: 'South-East',
    description: 'Inspiration, motivation, radiant light, and creative drive.'
  },
  {
    id: 'savitra',
    name: 'Savitra',
    sanskrit: 'सावित्र',
    number: 9,
    category: 'inner_diagonal',
    padas: [[6, 6], [6, 7]],
    zone: 'South-East',
    description: 'Empowers actions, enterprise, dynamic financial earnings.'
  },

  // South-West (SW) Inner Corner
  {
    id: 'indra_suta',
    name: 'Indra (Suta)',
    sanskrit: 'इन्द्र (सुत)',
    number: 10,
    category: 'inner_diagonal',
    padas: [[1, 6], [1, 7]],
    zone: 'South-West',
    description: 'Strength, leadership authority, and administrative power.'
  },
  {
    id: 'jaya',
    name: 'Jaya',
    sanskrit: 'जय',
    number: 11,
    category: 'inner_diagonal',
    padas: [[2, 6], [2, 7]],
    zone: 'South-West',
    description: 'Brings victory in competitive endeavors and overcoming hurdles.'
  },

  // North-West (NW) Inner Corner
  {
    id: 'rudra',
    name: 'Rudra',
    sanskrit: 'रुद्र',
    number: 12,
    category: 'inner_diagonal',
    padas: [[1, 1], [1, 2]],
    zone: 'North-West',
    description: 'Streamlining ideas, eliminating obstacles, transformative power.'
  },
  {
    id: 'rajayakshma',
    name: 'Rajayakshma',
    sanskrit: 'राजयक्ष्मा',
    number: 13,
    category: 'inner_diagonal',
    padas: [[2, 1], [2, 2]],
    zone: 'North-West',
    description: 'Preserver of mental clarity, balance, and stability of thought.'
  },

  // --- 4. 32 Outer Perimeter Devtas (1 Pada each) ---
  // East Perimeter (8 Padas, col = 8, from row 0 to row 7)
  {
    id: 'shikhi',
    name: 'Shikhi',
    sanskrit: 'शिखी',
    number: 14,
    category: 'outer_east',
    padas: [[8, 0]],
    zone: 'North-East',
    entranceCode: 'E1',
    description: 'Fire of wisdom, spiritual foresight, clarity of intellect.'
  },
  {
    id: 'parjanya',
    name: 'Parjanya',
    sanskrit: 'पर्जन्य',
    number: 15,
    category: 'outer_east',
    padas: [[8, 1]],
    zone: 'East-North-East',
    entranceCode: 'E2',
    description: 'Fertility, abundance, nurturing rains, emotional balance.'
  },
  {
    id: 'jayanta',
    name: 'Jayanta',
    sanskrit: 'जयन्त',
    number: 16,
    category: 'outer_east',
    padas: [[8, 2]],
    zone: 'East',
    entranceCode: 'E3',
    isAuspiciousEntrance: true,
    description: 'Victory, courage, enthusiasm, highly auspicious gateway.'
  },
  {
    id: 'indra_outer',
    name: 'Indra',
    sanskrit: 'इन्द्र',
    number: 17,
    category: 'outer_east',
    padas: [[8, 3]],
    zone: 'East',
    entranceCode: 'E4',
    isAuspiciousEntrance: true,
    description: 'Supreme king of devas, expansive growth, royal status.'
  },
  {
    id: 'surya',
    name: 'Surya',
    sanskrit: 'सूर्य',
    number: 18,
    category: 'outer_east',
    padas: [[8, 4]],
    zone: 'East',
    entranceCode: 'E5',
    description: 'Solar vitality, core health, social status, and radiance.'
  },
  {
    id: 'satya',
    name: 'Satya',
    sanskrit: 'सत्य',
    number: 19,
    category: 'outer_east',
    padas: [[8, 5]],
    zone: 'East-South-East',
    entranceCode: 'E6',
    description: 'Truth, integrity, loyalty in commitments and agreements.'
  },
  {
    id: 'bhrisha',
    name: 'Bhrisha',
    sanskrit: 'भृश',
    number: 20,
    category: 'outer_east',
    padas: [[8, 6]],
    zone: 'East-South-East',
    entranceCode: 'E7',
    description: 'Weight of thought, caution, balance between impulse and execution.'
  },
  {
    id: 'antariksha',
    name: 'Antariksha',
    sanskrit: 'अन्तरिक्ष',
    number: 21,
    category: 'outer_east',
    padas: [[8, 7]],
    zone: 'South-East',
    entranceCode: 'E8',
    description: 'Expansive ether, space, contemplation, and broad vision.'
  },

  // South Perimeter (8 Padas, row = 8, from col 8 to col 1)
  {
    id: 'anila',
    name: 'Anila',
    sanskrit: 'अनिल / अग्नि',
    number: 22,
    category: 'outer_south',
    padas: [[8, 8]],
    zone: 'South-East',
    entranceCode: 'S1',
    description: 'Sacred fire and wind, primal creative spark and energy.'
  },
  {
    id: 'poosha',
    name: 'Poosha',
    sanskrit: 'पूषा',
    number: 23,
    category: 'outer_south',
    padas: [[7, 8]],
    zone: 'South-East',
    entranceCode: 'S2',
    description: 'Protector of wealth, guide of journeys, nourishment.'
  },
  {
    id: 'vitatha',
    name: 'Vitatha',
    sanskrit: 'वितथ',
    number: 24,
    category: 'outer_south',
    padas: [[6, 8]],
    zone: 'South-South-East',
    entranceCode: 'S3',
    isAuspiciousEntrance: true,
    description: 'Skillful cleverness, overcoming deception, prosperity.'
  },
  {
    id: 'brihatkshata',
    name: 'Brihatkshata',
    sanskrit: 'बृहत्क्षत',
    number: 25,
    category: 'outer_south',
    padas: [[5, 8]],
    zone: 'South',
    entranceCode: 'S4',
    isAuspiciousEntrance: true,
    description: 'Great healing, immense progeny, material expansion.'
  },
  {
    id: 'yama',
    name: 'Yama',
    sanskrit: 'यम',
    number: 26,
    category: 'outer_south',
    padas: [[4, 8]],
    zone: 'South',
    entranceCode: 'S5',
    description: 'Lord of Dharma, disciplined order, justice, and accountability.'
  },
  {
    id: 'gandharva',
    name: 'Gandharva',
    sanskrit: 'गन्धर्व',
    number: 27,
    category: 'outer_south',
    padas: [[3, 8]],
    zone: 'South-South-West',
    entranceCode: 'S6',
    description: 'Artistic expression, music, aesthetic sensitivity, harmony.'
  },
  {
    id: 'bhringaraja',
    name: 'Bhringaraja',
    sanskrit: 'भृङ्गराज',
    number: 28,
    category: 'outer_south',
    padas: [[2, 8]],
    zone: 'South-South-West',
    entranceCode: 'S7',
    description: 'Concentration, herbal wisdom, natural regeneration.'
  },
  {
    id: 'mriga',
    name: 'Mriga',
    sanskrit: 'मृग',
    number: 29,
    category: 'outer_south',
    padas: [[1, 8]],
    zone: 'South-West',
    entranceCode: 'S8',
    description: 'Inquisitiveness, agile alertness, instinctual navigation.'
  },

  // West Perimeter (8 Padas, col = 0, from row 8 to row 1)
  {
    id: 'pitri',
    name: 'Pitri',
    sanskrit: 'पितृ',
    number: 30,
    category: 'outer_west',
    padas: [[0, 8]],
    zone: 'South-West',
    entranceCode: 'W1',
    description: 'Ancestral roots, lineage strength, enduring stability.'
  },
  {
    id: 'dauvarika',
    name: 'Dauvarika',
    sanskrit: 'दौवारिक',
    number: 31,
    category: 'outer_west',
    padas: [[0, 7]],
    zone: 'South-West',
    entranceCode: 'W2',
    description: 'The gatekeeper, discerning protection against negative ingress.'
  },
  {
    id: 'sugriva',
    name: 'Sugriva',
    sanskrit: 'सुग्रीव',
    number: 32,
    category: 'outer_west',
    padas: [[0, 6]],
    zone: 'West-South-West',
    entranceCode: 'W3',
    isAuspiciousEntrance: true,
    description: 'Trustworthy alliances, valuable friendships, wealth gain.'
  },
  {
    id: 'pushpadanta',
    name: 'Pushpadanta',
    sanskrit: 'पुष्पदन्त',
    number: 33,
    category: 'outer_west',
    padas: [[0, 5]],
    zone: 'West',
    entranceCode: 'W4',
    isAuspiciousEntrance: true,
    description: 'Fragrant blessings, vehicle acquisition, joyful prosperity.'
  },
  {
    id: 'varuna',
    name: 'Varuna',
    sanskrit: 'वरुण',
    number: 34,
    category: 'outer_west',
    padas: [[0, 4]],
    zone: 'West',
    entranceCode: 'W5',
    description: 'Lord of the oceans, deep emotional stability, cosmic order.'
  },
  {
    id: 'asura',
    name: 'Asura',
    sanskrit: 'असुर',
    number: 35,
    category: 'outer_west',
    padas: [[0, 3]],
    zone: 'West-North-West',
    entranceCode: 'W6',
    description: 'Material desires, worldly drive, technological aptitude.'
  },
  {
    id: 'shosha',
    name: 'Shosha',
    sanskrit: 'शोष',
    number: 36,
    category: 'outer_west',
    padas: [[0, 2]],
    zone: 'West-North-West',
    entranceCode: 'W7',
    description: 'Absorption, detoxification, shedding unwanted emotional baggage.'
  },
  {
    id: 'papayakshma',
    name: 'Papayakshma',
    sanskrit: 'पापयक्ष्मा',
    number: 37,
    category: 'outer_west',
    padas: [[0, 1]],
    zone: 'North-West',
    entranceCode: 'W8',
    description: 'Alertness to decline, overcoming vulnerabilities through prudence.'
  },

  // North Perimeter (8 Padas, row = 0, from col 0 to col 7)
  {
    id: 'roga',
    name: 'Roga',
    sanskrit: 'रोग / वायु',
    number: 38,
    category: 'outer_north',
    padas: [[0, 0]],
    zone: 'North-West',
    entranceCode: 'N1',
    description: 'Movement of breath, energetic release, clearing stagnation.'
  },
  {
    id: 'naga',
    name: 'Naga',
    sanskrit: 'नाग',
    number: 39,
    category: 'outer_north',
    padas: [[1, 0]],
    zone: 'North-North-West',
    entranceCode: 'N2',
    description: 'Subterranean wisdom, kundalini awareness, protective serpent power.'
  },
  {
    id: 'mukhya',
    name: 'Mukhya',
    sanskrit: 'मुख्य',
    number: 40,
    category: 'outer_north',
    padas: [[2, 0]],
    zone: 'North',
    entranceCode: 'N3',
    isAuspiciousEntrance: true,
    description: 'Principal architect Vishwakarma, manifestation of projects.'
  },
  {
    id: 'bhallata',
    name: 'Bhallata',
    sanskrit: 'भल्लाट',
    number: 41,
    category: 'outer_north',
    padas: [[3, 0]],
    zone: 'North',
    entranceCode: 'N4',
    isAuspiciousEntrance: true,
    description: 'Immense treasure, sustained prosperity, auspicious doorway.'
  },
  {
    id: 'soma',
    name: 'Soma',
    sanskrit: 'सोम / कुबेर',
    number: 42,
    category: 'outer_north',
    padas: [[4, 0]],
    zone: 'North',
    entranceCode: 'N5',
    description: 'Lord Kubera of liquid wealth, nectar of peace, lunar tranquility.'
  },
  {
    id: 'bhujaga',
    name: 'Bhujaga',
    sanskrit: 'भुजग',
    number: 43,
    category: 'outer_north',
    padas: [[5, 0]],
    zone: 'North-North-East',
    entranceCode: 'N6',
    description: 'Sensory acumen, medical intuition, flexibility in crisis.'
  },
  {
    id: 'aditi',
    name: 'Aditi',
    sanskrit: 'अदिति',
    number: 44,
    category: 'outer_north',
    padas: [[6, 0]],
    zone: 'North-East',
    entranceCode: 'N7',
    description: 'Universal Mother, safety, boundless security, unconditional care.'
  },
  {
    id: 'diti',
    name: 'Diti',
    sanskrit: 'दिति',
    number: 45,
    category: 'outer_north',
    padas: [[7, 0]],
    zone: 'North-East',
    entranceCode: 'N8',
    description: 'Individual vision, discerning intellect, strategic wisdom.'
  }
];

// Helper to look up Devta by pada col and row
export const getDevtaByPadaCoords = (col, row) => {
  return DEVTAS_DATA.find((devta) =>
    devta.padas.some(([c, r]) => c === col && r === row)
  );
};

// Compute the world-space bounding polygon and centroid for each of the 45 Devtas
export const computeDevtaSpatialFields = (grid9x9) => {
  if (!grid9x9 || !grid9x9.padas || grid9x9.padas.length < 81) return [];

  // Map padas by key "col,row" for O(1) retrieval
  const padaMap = new Map();
  grid9x9.padas.forEach((p) => {
    padaMap.set(`${p.col},${p.row}`, p);
  });

  return DEVTAS_DATA.map((devta) => {
    const memberPadas = devta.padas
      .map(([c, r]) => padaMap.get(`${c},${r}`))
      .filter(Boolean);

    if (memberPadas.length === 0) return null;

    // Calculate centroid of all member padas
    const center = memberPadas.reduce(
      (acc, p) => ({ x: acc.x + p.center.x / memberPadas.length, y: acc.y + p.center.y / memberPadas.length }),
      { x: 0, y: 0 }
    );

    // Calculate bounding box in world space
    let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity;
    devta.padas.forEach(([c, r]) => {
      if (c < minCol) minCol = c;
      if (c > maxCol) maxCol = c;
      if (r < minRow) minRow = r;
      if (r > maxRow) maxRow = r;
    });

    // Outer corner points of the Devta's field
    // (For single pada or rectangular multi-pada blocks)
    const tlPada = padaMap.get(`${minCol},${minRow}`);
    const trPada = padaMap.get(`${maxCol},${minRow}`);
    const brPada = padaMap.get(`${maxCol},${maxRow}`);
    const blPada = padaMap.get(`${minCol},${maxRow}`);

    const boundaryCorners = (tlPada && trPada && brPada && blPada) ? [
      tlPada.corners[0], // top-left
      trPada.corners[1], // top-right
      brPada.corners[2], // bottom-right
      blPada.corners[3]  // bottom-left
    ] : memberPadas[0].corners;

    const spanCols = maxCol - minCol + 1;
    const spanRows = maxRow - minRow + 1;

    return {
      ...devta,
      center,
      boundaryCorners,
      memberPadas,
      spanCols,
      spanRows,
      padWidth: grid9x9.padWidth,
      padHeight: grid9x9.padHeight
    };
  }).filter(Boolean);
};
