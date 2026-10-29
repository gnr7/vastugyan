/**
 * Vastu Gyan — 16 Direction Bar Chart Renderer
 * Draws the area share of each of the 16 zones on a canvas (used by the popup and the PDF).
 */

import { BAR_BANDS } from './analysis.js';

const COLORS = {
  text: '#202124',
  muted: '#5f6368',
  axis: '#dadce0',
  gridline: '#f1f3f4',
  mean: '#e37400',
  plusSd: '#1e8e3e',
  minusSd: '#d93025'
};

/**
 * Render the bar chart onto a canvas at a given CSS size (sharp on high-DPI screens).
 * @param {HTMLCanvasElement} canvas
 * @param {Object} chart - Result of calculate16BarChart
 * @param {Object} options - { width, height, pixelRatio }
 */
export const draw16BarChart = (canvas, chart, { width = 720, height = 400, pixelRatio = window.devicePixelRatio || 1 } = {}) => {
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  if (!chart || !chart.hasData) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = '500 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Close the plot boundary to see the area in each direction', width / 2, height / 2);
    return;
  }

  // Plot area
  const pad = { top: 22, right: 18, bottom: 92, left: 46 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const maxPct = Math.max(chart.max.pct, chart.mean + chart.sd);
  const yMax = Math.max(2, Math.ceil((maxPct * 1.15) / 2) * 2);
  const yOf = (pct) => pad.top + plotH - (pct / yMax) * plotH;

  // Y gridlines and labels
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const step = yMax <= 8 ? 2 : yMax <= 20 ? 4 : 10;
  for (let v = 0; v <= yMax + 1e-9; v += step) {
    const y = yOf(v);
    ctx.strokeStyle = v === 0 ? COLORS.axis : COLORS.gridline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(`${v}%`, pad.left - 8, y);
  }

  // Bars
  const slot = plotW / chart.bars.length;
  const barW = slot * 0.62;
  chart.bars.forEach((bar, i) => {
    const x = pad.left + slot * i + (slot - barW) / 2;
    const y = yOf(bar.pct);
    ctx.fillStyle = bar.color;
    ctx.fillRect(x, y, barW, pad.top + plotH - y);

    ctx.fillStyle = COLORS.text;
    ctx.font = '600 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(bar.pct.toFixed(1), x + barW / 2, y - 3);

    // Direction label, angled like a compass list
    ctx.save();
    ctx.translate(x + barW / 2, pad.top + plotH + 10);
    ctx.rotate(-Math.PI / 4);
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(bar.id, 0, 0);
    ctx.restore();
  });

  // Average and ±1 SD reference lines
  const lines = [
    { pct: chart.mean + chart.sd, color: COLORS.plusSd, label: 'Avg + 1 SD' },
    { pct: chart.mean, color: COLORS.mean, label: 'Average' },
    { pct: chart.mean - chart.sd, color: COLORS.minusSd, label: 'Avg − 1 SD' }
  ];
  lines.forEach((line) => {
    if (line.pct < 0) return;
    const y = yOf(line.pct);
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = line.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
    ctx.restore();
  });

  // Legend under the axis labels: reference lines on one row, bar colour groups on the next
  const legendRows = [
    lines.map((l) => ({ kind: 'line', color: l.color, label: `${l.label} (${Math.max(0, l.pct).toFixed(1)}%)` })),
    Object.values(BAR_BANDS).map((b) => ({ kind: 'box', color: b.color, label: b.label }))
  ];
  ctx.font = '10px Inter, sans-serif';
  legendRows.forEach((row, r) => {
    const widths = row.map((item) => 24 + ctx.measureText(item.label).width);
    const gap = 16;
    let x = pad.left + (plotW - (widths.reduce((a, b) => a + b, 0) + gap * (row.length - 1))) / 2;
    const cy = height - 30 + r * 16;
    row.forEach((item, i) => {
      if (item.kind === 'line') {
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, cy);
        ctx.lineTo(x + 18, cy);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillStyle = item.color;
        ctx.fillRect(x + 4, cy - 4, 10, 8);
      }
      ctx.fillStyle = COLORS.muted;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, x + 24, cy);
      x += widths[i] + gap;
    });
  });
};

/**
 * Render the chart off-screen and return a PNG data URL (for the PDF report).
 */
export const barChartToDataUrl = (chart, width = 720, height = 400, pixelRatio = 2) => {
  const canvas = document.createElement('canvas');
  draw16BarChart(canvas, chart, { width, height, pixelRatio });
  return canvas.toDataURL('image/png');
};
