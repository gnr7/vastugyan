/**
 * Vastu Gyan — Client-Side Export Engine (PNG & Professional PDF Report)
 * Generates high-resolution PNG captures and multi-page client-ready PDF reports.
 */

import {
  calculateAreaMetrics,
  calculatePanchTatvaSummary,
  calculateGateAssessment,
  calculatePositiveLandEnergy,
  calculate16BarChart,
  calculateVithiSummary,
  formatArea,
  formatLength
} from './analysis.js';
import { barChartToDataUrl } from './barchart.js';
import { ELEMENT_STYLES } from './zones.js';

/**
 * Hand a finished file to the person: the phone's share sheet on touch devices
 * (WhatsApp, Drive, Files…), a normal download elsewhere or if sharing isn't available.
 * @returns {Promise<'shared'|'downloaded'|'cancelled'>}
 */
export const deliverFile = async (blob, filename) => {
  const file = new File([blob], filename, { type: blob.type });
  const prefersShare = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  if (prefersShare && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelled';
      // Fall through to a download if the share sheet failed for any other reason
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
};

const canvasToBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

/**
 * Export the canvas view (with the visible overlays) as a PNG
 * @param {HTMLCanvasElement} canvas
 * @param {string} filename
 */
export const exportCanvasToPng = async (canvas, filename = '') => {
  if (!canvas) return 'cancelled';
  const dateStr = new Date().toISOString().slice(0, 10);
  const name = filename || `VastuGyan-Plan-${dateStr}.png`;
  return deliverFile(await canvasToBlob(canvas), name);
};

/**
 * Generate multi-page professional PDF client report
 * @param {HTMLCanvasElement} canvas
 * @param {Object} state
 * @param {string} filename
 * @param {Object} clientInfo
 */
export const generatePdfReport = async (canvas, state, filename = '', clientInfo = {}) => {
  if (!window.jspdf) {
    return 'cancelled';
  }

  const { jsPDF } = window.jspdf;
  // Compressed so a report is small enough to send on WhatsApp or by email
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const reportName = filename || `VastuGyan-Report-${dateStr}.pdf`;

  // Client personal details (optional)
  const clientName = (clientInfo.name || '').trim();
  const clientPhone = (clientInfo.phone || '').trim();
  const clientAddress = (clientInfo.address || '').trim();
  const hasClient = !!(clientName || clientPhone || clientAddress);

  // Calculate metrics and analysis
  const areaData = calculateAreaMetrics(state.metrics);
  const cal = state.calibration;
  const grid = state.metrics.grid9x9;
  const elementStyle = state.elementStyle || 'classic';
  const tatvaData = calculatePanchTatvaSummary(state.metrics.zones16, elementStyle);
  const gateData = calculateGateAssessment(state.metrics.entranceGates32);
  const landData = calculatePositiveLandEnergy(state.metrics, cal, state.landDims);
  const gates = state.metrics.entranceGates32 || [];
  const barChart = calculate16BarChart(state.metrics.zones16, elementStyle);
  const vithiData = calculateVithiSummary(state.metrics.vithi);
  // Page 4 (the 32 entrances) appears with page 3 whenever the plot is closed
  const totalPages = barChart.hasData ? 4 : 2;

  // Palette constants
  const primaryBlue = [26, 115, 232];
  const darkCharcoal = [32, 33, 36];
  const mediumGray = [95, 99, 104];
  const lightBg = [248, 249, 250];
  const successGreen = [30, 142, 62];

  // ==================== PAGE 1: Executive Overview & Visual Plan ====================

  // Header Banner
  doc.setFillColor(...primaryBlue);
  doc.rect(0, 0, 210, 18, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('VASTU GYAN — VASTU PURUSHA MANDALA REPORT', 14, 12);

  // Subheader info (with optional Client Info)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...mediumGray);
  if (hasClient) {
    const details = [
      clientName ? `Client: ${clientName}` : '',
      clientPhone ? `Phone: ${clientPhone}` : '',
      clientAddress ? `Address: ${clientAddress}` : ''
    ].filter(Boolean).join('  |  ');
    doc.text(details, 14, 22.5);
    doc.text(`Generated: ${new Date().toLocaleDateString()} | Top of plan faces: ${state.rotation}° | Mandala: 81 Padas (Paramasayika)`, 14, 26.5);
  } else {
    doc.text(`Generated: ${new Date().toLocaleDateString()} | Top of plan faces: ${state.rotation}° | Mandala: 81 Padas (Paramasayika)`, 14, 25);
  }

  // Divider
  doc.setDrawColor(218, 220, 224);
  doc.setLineWidth(0.3);
  doc.line(14, 28.5, 196, 28.5);

  // Embed High-Res Canvas Snapshot
  if (canvas) {
    // A traced plan stays a sharp PNG; over a photographed floor plan, JPEG is far smaller
    const planIsPhoto = !!state.image;
    const canvasDataUrl = planIsPhoto ? canvas.toDataURL('image/jpeg', 0.9) : canvas.toDataURL('image/png');
    const planWidth = 182;
    const planHeight = 115;
    const planX = 14;
    const planY = 32;

    // Background card border for visual plan
    doc.setFillColor(...lightBg);
    doc.rect(planX - 1, planY - 1, planWidth + 2, planHeight + 2, 'F');
    doc.setDrawColor(218, 220, 224);
    doc.rect(planX - 1, planY - 1, planWidth + 2, planHeight + 2, 'S');

    doc.addImage(canvasDataUrl, planIsPhoto ? 'JPEG' : 'PNG', planX, planY, planWidth, planHeight, undefined, 'FAST');
  }

  // Key Area Metrics Card (Page 1 bottom)
  let yPos = 154;
  doc.setFillColor(...lightBg);
  doc.rect(14, yPos, 182, 35, 'F');
  doc.setDrawColor(218, 220, 224);
  doc.rect(14, yPos, 182, 35, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkCharcoal);
  doc.text('EXECUTIVE AREA & GEOMETRY SUMMARY', 20, yPos + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...darkCharcoal);

  // Column 1
  doc.text(`Total Plot Area: ${formatArea(areaData.plotArea, cal)}`, 20, yPos + 16);
  doc.text(`Brahmasthan: ${formatArea(areaData.brahmasthanArea, cal)} (${areaData.brahmasthanRatioPct}% of the plot)`, 20, yPos + 23);
  doc.text(grid
    ? `Grid Dimensions: ${formatLength(grid.totalWidth, cal)} × ${formatLength(grid.totalHeight, cal)}`
    : 'Grid Dimensions: —', 20, yPos + 30);

  // Column 2
  doc.text(`Single Pada Area (1/81): ${formatArea(areaData.padaArea, cal)}`, 110, yPos + 16);
  doc.text(`Top of plan faces: ${state.rotation}° · Grid ${state.gridAlign === 'walls' ? 'on plot walls' : 'turned with North'}`, 110, yPos + 23);
  doc.text(`Boundary Vertices: ${state.polygon.length} points (${state.isPolygonClosed ? 'Closed Polygon' : 'Draft'})`, 110, yPos + 30);

  // Executive Vastu Insights Box
  yPos = 194;
  const boxHeight = (landData.isActive || !cal) ? 38 : 32;
  doc.setFillColor(230, 244, 234); // soft green
  doc.rect(14, yPos, 182, boxHeight, 'F');
  doc.setDrawColor(...successGreen);
  doc.setLineWidth(0.5);
  doc.rect(14, yPos, 182, boxHeight, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...successGreen);
  doc.text('VASTU COMPLIANCE & OBSERVATIONS', 20, yPos + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...darkCharcoal);
  doc.text('• Brahmasthan is accurately identified at the central 9 padas. Keep this zone free of heavy load, pillars, and cuts.', 20, yPos + 14);
  doc.text('• 8 Classical Auspicious Gateways identified: N3/N4 (North), E3/E4 (East), S3/S4 (South), and W3/W4 (West).', 20, yPos + 20);
  doc.text('• 16 Directional Zones radiate at 22.5° intervals from the geometric center of mass (centroid).', 20, yPos + 26);
  if (landData.isActive) {
    doc.text(`• Positive Land Energy (${landData.length} × ${landData.breadth} ft, ${landData.source === 'typed' ? 'typed in' : 'measured from walls'}): ${landData.verdict.title} (Income ${landData.income} vs Expenditure ${landData.expenditure} | Remainder ${landData.remainder}${landData.borderline ? ' — borderline' : ''} | Ratio ${landData.ratio})`, 20, yPos + 32);
  } else if (!cal) {
    doc.text('• Real dimensions not set (Set Scale): areas are in canvas pixels and Land Energy was not evaluated.', 20, yPos + 32);
  }

  // Page 1 Footer
  doc.setFontSize(8);
  doc.setTextColor(...mediumGray);
  if (hasClient) {
    const clientSummary = [clientName, clientPhone].filter(Boolean).join(' · ');
    doc.text(`Page 1 of ${totalPages} — Prepared for: ${clientSummary}`, 14, 287);
  } else {
    doc.text(`Page 1 of ${totalPages} — Vastu Gyan Report`, 14, 287);
  }
  doc.text('Open Source · Local-First Vastu Analysis Tool', 135, 287);

  // ==================== PAGE 2: Panch Tatva & 32 Gateways ====================
  doc.addPage();

  // Page 2 Header Banner
  doc.setFillColor(...primaryBlue);
  doc.rect(0, 0, 210, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('PANCH TATVA (FIVE ELEMENTS) & 32 GATEWAY ASSESSMENT', 14, 9.5);

  if (hasClient && clientName) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Client: ${clientName}`, 196, 9.5, { align: 'right' });
  }

  // Section 1: Panch Tatva Elemental Distribution
  yPos = 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...darkCharcoal);
  doc.text('1. Panch Tatva (Five Elements) Distribution', 14, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...mediumGray);
  const tatvaIntro = doc.splitTextToSize(`Share of the plot area falling in each element's directional zones. ${ELEMENT_STYLES[elementStyle].label} style: ${ELEMENT_STYLES[elementStyle].note}.`, 182);
  doc.text(tatvaIntro, 14, yPos);
  yPos += (tatvaIntro.length - 1) * 3.6;

  yPos += 5;
  // Table Header
  doc.setFillColor(...lightBg);
  doc.rect(14, yPos, 182, 8, 'F');
  doc.setDrawColor(218, 220, 224);
  doc.rect(14, yPos, 182, 8, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...darkCharcoal);
  doc.text('Element', 18, yPos + 5.5);
  doc.text('Directional Zones', 60, yPos + 5.5);
  doc.text('Area Share', 120, yPos + 5.5);
  doc.text('Core Vastu Attribute', 145, yPos + 5.5);

  // Table Rows
  yPos += 8;
  tatvaData.forEach((item) => {
    doc.setFillColor(255, 255, 255);
    doc.rect(14, yPos, 182, 9, 'F');
    doc.setDrawColor(241, 243, 244);
    doc.rect(14, yPos, 182, 9, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...darkCharcoal);
    doc.text(item.name, 18, yPos + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (item.earthSplit) {
      // Loose Earth style: show the hard and loose parts of Earth's share
      doc.setFontSize(7);
      doc.text(item.hasData
        ? `SSW, SW (hard ${item.earthSplit.hard}%) · NE, NW (loose ${item.earthSplit.loose}%)`
        : 'SSW, SW (hard) · NE, NW (loose)', 60, yPos + 6);
      doc.setFontSize(8);
    } else {
      doc.text(item.zones.join(', '), 60, yPos + 6);
    }
    doc.text(item.formattedPercentage, 120, yPos + 6);
    doc.text(item.significance, 145, yPos + 6);

    yPos += 9;
  });

  // Section 2: 32 Entrance Gateways Assessment
  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...darkCharcoal);
  doc.text('2. 32 Perimeter Entrance Gateway Assessment', 14, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...mediumGray);
  doc.text('Traditional evaluation of all 32 perimeter gateway padas along the plot boundary:', 14, yPos);

  yPos += 6;
  const directions = [
    { title: 'NORTH (Kubera / Water)', codes: 'N1 - N8', auspicious: 'N3 (Mukhya), N4 (Bhallata)', bless: 'Abundant wealth, sustained prosperity, and spiritual growth' },
    { title: 'EAST (Indra / Air)', codes: 'E1 - E8', auspicious: 'E3 (Jayanta), E4 (Indra)', bless: 'Victorious life, influential social connections, and royal status' },
    { title: 'SOUTH (Yama / Fire)', codes: 'S1 - S8', auspicious: 'S3 (Vitatha), S4 (Brihatkshata)', bless: 'Material expansion, clever prosperity, and dynamic willpower' },
    { title: 'WEST (Varuna / Space)', codes: 'W1 - W8', auspicious: 'W3 (Sugriva), W4 (Pushpadanta)', bless: 'Profitable alliances, vehicle acquisition, and steady savings' }
  ];

  directions.forEach((d) => {
    doc.setFillColor(...lightBg);
    doc.rect(14, yPos, 182, 16, 'F');
    doc.setDrawColor(218, 220, 224);
    doc.rect(14, yPos, 182, 16, 'S');

    // Direction title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...primaryBlue);
    doc.text(d.title, 18, yPos + 5.5);

    // Auspicious badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...successGreen);
    doc.text(`Auspicious Gates: ${d.auspicious}`, 18, yPos + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...mediumGray);
    doc.text(`Blessings: ${d.bless}`, 18, yPos + 14.5);

    yPos += 18;
  });

  // Section 3: 45 Devtas Paramasayika Mandala Summary
  yPos += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...darkCharcoal);
  doc.text('3. 45 Devtas Paramasayika Structure', 14, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...darkCharcoal);
  doc.text('• Central Creator (Brahmasthan): Brahma (#1) spanning 9 central padas (rows 4..6, cols 4..6).', 14, yPos);
  doc.text('• 4 Cardinal Inner Devtas: Aryama (East, 6 padas), Vivaswan (South, 6 padas), Mitra (West, 6 padas), Bhudhar (North, 6 padas).', 14, yPos + 5);
  doc.text('• 8 Diagonal Inner Devtas: Aapa/Aapavatsa (NE), Savita/Savitra (SE), Indra/Jaya (SW), Rudra/Rajayakshma (NW) (2 padas each).', 14, yPos + 10);
  doc.text('• 32 Perimeter Devtas: 1 pada each along all 4 perimeter edges forming the 32 Gateway matrix.', 14, yPos + 15);

  // Section 4: Vithi Mandal (share of the real plot in each ring)
  if (vithiData.hasData) {
    yPos += 25;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...darkCharcoal);
    doc.text('4. Vithi Mandal (Four Rings of the 81 Padas)', 14, yPos);
    yPos += 5;
    const ringRgb = { brahma: [179, 38, 30], daivika: [176, 141, 60], manushya: [62, 142, 94], paishachika: [110, 91, 74] };
    vithiData.rings.forEach((ring) => {
      doc.setFillColor(...lightBg);
      doc.rect(14, yPos, 182, 10.5, 'F');
      doc.setFillColor(...ringRgb[ring.id]);
      doc.rect(14, yPos, 2.2, 10.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...darkCharcoal);
      doc.text(ring.name, 19, yPos + 4.3);
      doc.setFont('helvetica', 'normal');
      doc.text(`${ring.padas} padas`, 52, yPos + 4.3);
      doc.text(formatArea(ring.area, cal), 80, yPos + 4.3);
      doc.setFont('helvetica', 'bold');
      doc.text(`${ring.areaPct.toFixed(1)}% of plot`, 196, yPos + 4.3, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...mediumGray);
      doc.text(ring.guidance, 19, yPos + 8.6);
      yPos += 11.5;
    });
  }

  // Page 2 Footer
  doc.setFontSize(8);
  doc.setTextColor(...mediumGray);
  if (hasClient) {
    const clientSummary = [clientName, clientPhone].filter(Boolean).join(' · ');
    doc.text(`Page 2 of ${totalPages} — Prepared for: ${clientSummary}`, 14, 287);
  } else {
    doc.text(`Page 2 of ${totalPages} — Vastu Gyan Report`, 14, 287);
  }
  doc.text('Open Source · Local-First Vastu Analysis Tool', 135, 287);

  // ==================== PAGE 3: 16 Direction Bar Chart ====================
  if (barChart.hasData) {
    doc.addPage();

    doc.setFillColor(...primaryBlue);
    doc.rect(0, 0, 210, 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('16 DIRECTION BAR CHART — AREA DISTRIBUTION BY DIRECTION', 14, 9.5);
    if (hasClient && clientName) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Client: ${clientName}`, 196, 9.5, { align: 'right' });
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...mediumGray);
    doc.text('Share of the plot area falling in each of the 16 compass zones (22.5° each, measured from the centroid):', 14, 22);

    // Chart image (720 × 400 aspect)
    const chartW = 170;
    const chartH = (chartW * 400) / 720;
    doc.setDrawColor(218, 220, 224);
    doc.rect(19.5, 25.5, chartW + 1, chartH + 1, 'S');
    doc.addImage(barChartToDataUrl(barChart), 'PNG', 20, 26, chartW, chartH, undefined, 'FAST');

    // Summary card
    yPos = 26 + chartH + 8;
    doc.setFillColor(...lightBg);
    doc.rect(14, yPos, 182, 30, 'F');
    doc.setDrawColor(218, 220, 224);
    doc.rect(14, yPos, 182, 30, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...darkCharcoal);
    doc.text('DIRECTIONAL BALANCE SUMMARY', 20, yPos + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Total Plot Area: ${formatArea(barChart.totalArea, cal)}`, 20, yPos + 15);
    doc.text(`Average Share: ${barChart.mean.toFixed(2)}% ± ${barChart.sd.toFixed(2)}% (1 SD)`, 20, yPos + 22);
    doc.text(`Max Direction: ${barChart.max.id} (${barChart.max.pct.toFixed(1)}%)`, 110, yPos + 15);
    doc.text(`Min Direction: ${barChart.min.id} (${barChart.min.pct.toFixed(1)}%)`, 110, yPos + 22);

    // Strong / weak directions
    yPos += 38;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...successGreen);
    doc.text(`Strong directions (above average + 1 SD): ${barChart.strong.length ? barChart.strong.join(', ') : 'none'}`, 14, yPos);
    doc.setTextColor(217, 48, 37);
    doc.text(`Weak directions (below average − 1 SD): ${barChart.weak.length ? barChart.weak.join(', ') : 'none'}`, 14, yPos + 7);

    // Per-direction table
    yPos += 15;
    doc.setFillColor(...lightBg);
    doc.rect(14, yPos, 182, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...darkCharcoal);
    doc.text('Direction', 18, yPos + 5);
    doc.text('Area', 60, yPos + 5);
    doc.text('Share', 110, yPos + 5);
    doc.text('Element', 140, yPos + 5);
    doc.text('Status', 168, yPos + 5);
    yPos += 7;

    doc.setFont('helvetica', 'normal');
    barChart.bars.forEach((bar) => {
      const bandText = bar.band === 'high' ? 'Strong' : bar.band === 'low' ? 'Weak' : 'Normal';
      doc.setTextColor(...darkCharcoal);
      doc.text(bar.id, 18, yPos + 4);
      doc.text(formatArea(bar.area, cal), 60, yPos + 4);
      doc.text(`${bar.pct.toFixed(1)}%`, 110, yPos + 4);
      doc.text(bar.element, 140, yPos + 4);
      if (bar.band === 'high') doc.setTextColor(...successGreen);
      else if (bar.band === 'low') doc.setTextColor(217, 48, 37);
      doc.text(bandText, 168, yPos + 4);
      doc.setDrawColor(241, 243, 244);
      doc.line(14, yPos + 5.4, 196, yPos + 5.4);
      yPos += 5.4;
    });

    doc.setFontSize(8);
    doc.setTextColor(...mediumGray);
    if (hasClient) {
      const clientSummary = [clientName, clientPhone].filter(Boolean).join(' · ');
      doc.text(`Page 3 of ${totalPages} — Prepared for: ${clientSummary}`, 14, 287);
    } else {
      doc.text(`Page 3 of ${totalPages} — Vastu Gyan Report`, 14, 287);
    }
    doc.text('Open Source · Local-First Vastu Analysis Tool', 135, 287);
  }

  // ==================== PAGE 4: 32 Entrance Padas ====================
  if (barChart.hasData && gates.length === 32) {
    doc.addPage();
    doc.setFillColor(...primaryBlue);
    doc.rect(0, 0, 210, 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('32 ENTRANCE PADAS — RESULTS ON THIS PLOT', 14, 9.5);
    if (hasClient && clientName) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Client: ${clientName}`, 196, 9.5, { align: 'right' });
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...mediumGray);
    doc.text('Each entrance is an 11.25° compass slice from the centroid; wall length is the part of the boundary inside that slice.', 14, 20);
    doc.text('Classical result: Brihat Samhita 53.72–75 (tr. N. C. Iyer, 1884). Rating: the 8 commonly favoured entrances (N3 N4 E3 E4 S3 S4 W3 W4).', 14, 24);

    yPos = 29;
    doc.setFillColor(...lightBg);
    doc.rect(14, yPos, 182, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...darkCharcoal);
    doc.text('Gate', 17, yPos + 4.8);
    doc.text('Devta', 30, yPos + 4.8);
    doc.text('Wall', 62, yPos + 4.8);
    doc.text('Classical result', 84, yPos + 4.8);
    doc.text('Rating', 176, yPos + 4.8);
    yPos += 7;

    gates.forEach((g, i) => {
      if (i % 8 === 0 && i > 0) {
        doc.setDrawColor(214, 199, 174);
        doc.line(14, yPos, 196, yPos);
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...(g.isAuspicious ? successGreen : darkCharcoal));
      doc.text(g.code, 17, yPos + 4.6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...darkCharcoal);
      doc.text(String(g.name), 30, yPos + 4.6);
      doc.text(g.wallLength > 0 ? formatLength(g.wallLength, cal) : '—', 62, yPos + 4.6);
      doc.text(g.result || '', 84, yPos + 4.6);
      doc.setTextColor(...(g.isAuspicious ? successGreen : mediumGray));
      doc.text(g.isAuspicious ? 'Favoured' : '—', 176, yPos + 4.6);
      doc.setDrawColor(241, 243, 244);
      doc.line(14, yPos + 6.6, 196, yPos + 6.6);
      yPos += 6.6;
    });

    doc.setFontSize(8);
    doc.setTextColor(...mediumGray);
    if (hasClient) {
      const clientSummary = [clientName, clientPhone].filter(Boolean).join(' · ');
      doc.text(`Page 4 of ${totalPages} — Prepared for: ${clientSummary}`, 14, 287);
    } else {
      doc.text(`Page 4 of ${totalPages} — Vastu Gyan Report`, 14, 287);
    }
    doc.text('Open Source · Local-First Vastu Analysis Tool', 135, 287);
  }

  // Save PDF file
  return deliverFile(doc.output('blob'), reportName);
};
