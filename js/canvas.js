/**
 * Vastu Gyan — Canvas Viewport & Pure Geometry Rendering Engine
 */

import { distance, findClosestVertex, rayPolygonHit } from './geometry.js';
import { AUSPICIOUS_ENTRANCES, GATE_RING, GATE_SPAN_DEG, zoneTone } from './zones.js';
import {
  addPolygonVertex,
  closePolygon,
  updatePolygonVertex,
  commitDragHistory,
  setHoverVertex,
  setDraggingVertex,
  setCursorWorldPos,
  addCalibrationPoint,
  recalculateMetrics
} from './state.js';

// Touch ergonomics: finger-sized hit areas and a magnifier while placing or dragging points
const TOUCH_HIT_RADIUS = 26;   // px around a vertex that a finger can grab
const TOUCH_SNAP_RADIUS = 12;
const MAX_ZOOM = 15;          // closest zoom-in
const MIN_ZOOM_OF_FIT = 0.85; // furthest zoom-out, as a share of the size that fits the screen  // px from point 0 that closes the boundary on lift (small, so nearby corners can still be placed)
const LOUPE_RADIUS = 56;
const LOUPE_ZOOM = 2.5;

// Short vibration on supporting phones (Android); silently ignored elsewhere
const haptic = (pattern) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
};

// One label board per frame, shared by every layer. Layers hand in their labels with a priority;
// the board places the most important first and leaves out any that would overlap, so a crowded
// plan stays readable and the rest appear as you zoom in. Labels are plain text with a soft halo,
// except the few that earn a pill (element names in the ring, auspicious entrances, North).
export const LABEL_PRIORITY = {
  north: 100,
  element: 90,
  auspicious: 80,
  vithi: 70,
  devtaMajor: 65,
  entrance: 60,
  zone: 50,
  devta: 40,
  padaCode: 30,
  centroid: 10
};

// textScale enlarges every label (used for the PNG and PDF, which are read on paper)
const createLabelBoard = (textScale = 1) => {
  const items = [];
  return {
    // item: { text, x, y, px, weight, color, priority, sub, subPx, pill: { fill, text }, angle, alts, force, font }
    add(item) { items.push(item); },
    draw(ctx, scale) {
      const boxes = [];
      const free = (b) => !boxes.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
      items.sort((a, b) => b.priority - a.priority).forEach((it) => {
        const size = (it.px * textScale) / scale;
        const subSize = it.sub ? ((it.subPx || it.px * 0.78) * textScale) / scale : 0;
        ctx.font = `${it.weight || 600} ${size}px ${it.font || "'Hanken Grotesk', sans-serif"}`;
        let w = ctx.measureText(it.text).width;
        if (it.sub) {
          ctx.font = `500 ${subSize}px 'Hanken Grotesk', sans-serif`;
          w = Math.max(w, ctx.measureText(it.sub).width);
        }
        const padX = (it.pill ? 6 : 2) / scale;
        const padY = (it.pill ? 3 : 1) / scale;
        const bw = w + padX * 2;
        const bh = size + subSize + padY * 2;
        const cos = Math.abs(Math.cos(it.angle || 0));
        const sin = Math.abs(Math.sin(it.angle || 0));
        const ew = bw * cos + bh * sin;
        const eh = bw * sin + bh * cos;
        const spots = [[it.x, it.y], ...(it.alts || [])];
        let spot = spots.find(([x, y]) => free({ x0: x - ew / 2, y0: y - eh / 2, x1: x + ew / 2, y1: y + eh / 2 }));
        if (!spot) {
          if (!it.force) return;
          spot = spots[0];
        }
        const [x, y] = spot;
        boxes.push({ x0: x - ew / 2, y0: y - eh / 2, x1: x + ew / 2, y1: y + eh / 2 });

        ctx.save();
        ctx.translate(x, y);
        if (it.angle) ctx.rotate(it.angle);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const titleY = it.sub ? -subSize / 2 : 0;
        if (it.pill) {
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
          else ctx.rect(-bw / 2, -bh / 2, bw, bh);
          ctx.fillStyle = it.pill.fill;
          ctx.fill();
          ctx.font = `${it.weight || 600} ${size}px ${it.font || "'Hanken Grotesk', sans-serif"}`;
          ctx.fillStyle = it.pill.text;
          ctx.fillText(it.text, 0, titleY + 0.5 / scale);
        } else {
          ctx.lineJoin = 'round';
          ctx.strokeStyle = THEME.halo;
          ctx.lineWidth = 3 / scale;
          ctx.font = `${it.weight || 600} ${size}px ${it.font || "'Hanken Grotesk', sans-serif"}`;
          ctx.strokeText(it.text, 0, titleY);
          ctx.fillStyle = it.color || THEME.ink;
          ctx.fillText(it.text, 0, titleY);
        }
        if (it.sub) {
          ctx.font = `500 ${subSize}px 'Hanken Grotesk', sans-serif`;
          ctx.lineJoin = 'round';
          ctx.strokeStyle = THEME.halo;
          ctx.lineWidth = 3 / scale;
          ctx.strokeText(it.sub, 0, size / 2 + 0.5 / scale);
          ctx.fillStyle = THEME.muted;
          ctx.fillText(it.sub, 0, size / 2 + 0.5 / scale);
        }
        ctx.restore();
      });
    }
  };
};

const tracePolygon = (ctx, pts) => {
  if (!pts || pts.length < 2) return;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
};

// Canvas chrome colours, read from the CSS design tokens so light and dark themes match
export const THEME = {
  paper: '#FFFCF6',
  ink: '#2A1F17',
  brass: '#B08D3C',
  saffron: '#C2681C',
  kumkum: '#B3261E',
  canvasLine: 'rgba(42, 31, 23, 0.06)',
  boundary: '#C2681C',
  boundaryFill: 'rgba(194, 104, 28, 0.08)',
  halo: 'rgba(255, 252, 246, 0.92)',
  muted: '#7A6A58'
};

export const refreshTheme = () => {
  if (typeof getComputedStyle !== 'function' || typeof document === 'undefined') return;
  const css = getComputedStyle(document.documentElement);
  const read = (name, fallback) => (css.getPropertyValue(name).trim() || fallback);
  THEME.paper = read('--paper', THEME.paper);
  THEME.ink = read('--ink', THEME.ink);
  THEME.brass = read('--brass', THEME.brass);
  THEME.saffron = read('--saffron', THEME.saffron);
  THEME.kumkum = read('--kumkum', THEME.kumkum);
  THEME.canvasLine = read('--canvas-line', THEME.canvasLine);
  THEME.boundary = read('--boundary', THEME.boundary);
  THEME.boundaryFill = read('--boundary-fill', THEME.boundaryFill);
  THEME.halo = read('--paper', THEME.paper);
  THEME.muted = read('--muted', THEME.muted);
};

// Pure coordinate transformation functions
export const screenToWorld = (screenX, screenY, viewport) => ({
  x: (screenX - viewport.x) / viewport.scale,
  y: (screenY - viewport.y) / viewport.scale
});

export const worldToScreen = (worldX, worldY, viewport) => ({
  x: worldX * viewport.scale + viewport.x,
  y: worldY * viewport.scale + viewport.y
});

// Calculate optimal viewport to center and fit content within canvas container
export const computeFitViewport = (contentWidth, contentHeight, containerWidth, containerHeight, padding = 40) => {
  if (!contentWidth || !contentHeight || !containerWidth || !containerHeight) {
    return { x: 0, y: 0, scale: 1 };
  }

  const availableWidth = Math.max(10, containerWidth - padding * 2);
  const availableHeight = Math.max(10, containerHeight - padding * 2);

  const scaleX = availableWidth / contentWidth;
  const scaleY = availableHeight / contentHeight;
  const scale = Math.min(scaleX, scaleY, 2.5); // cap initial auto-scale

  const x = (containerWidth - contentWidth * scale) / 2;
  const y = (containerHeight - contentHeight * scale) / 2;

  return { x, y, scale };
};

// Pure rendering functions
export const drawBackgroundGrid = (ctx, viewport, width, height) => {
  const gridSize = 40 * viewport.scale;
  if (gridSize < 10) return; // avoid dense rendering when zoomed out

  const offsetX = viewport.x % gridSize;
  const offsetY = viewport.y % gridSize;

  ctx.save();
  ctx.strokeStyle = THEME.canvasLine;
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let x = offsetX; x < width; x += gridSize) {
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, height);
  }

  for (let y = offsetY; y < height; y += gridSize) {
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(width, Math.round(y) + 0.5);
  }

  ctx.stroke();
  ctx.restore();
};

export const drawFloorPlanImage = (ctx, image) => {
  if (!image || !image.element) return;

  ctx.save();
  // Draw subtle floor plan border & shadow
  ctx.shadowColor = 'rgba(42, 31, 23, 0.16)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  ctx.drawImage(image.element, 0, 0, image.width, image.height);

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(42, 31, 23, 0.14)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, image.width, image.height);

  ctx.restore();
};

// Render polygon boundary, vertex handles, and numbers
export const drawPolygon = (ctx, state) => {
  const { polygon, isPolygonClosed, isDrawingPolygon, cursorWorldPos, hoverVertexIndex, draggingVertexIndex, viewport } = state;
  // A finished boundary shows no corner handles until Edit Polygon
  const n = polygon.length;
  if (n === 0 && !cursorWorldPos) return;

  const scale = viewport.scale;
  const lw = 2 / scale;

  ctx.save();

  // 1. Draw polygon boundary lines
  if (n > 0) {
    ctx.beginPath();
    ctx.moveTo(polygon[0].x, polygon[0].y);

    for (let i = 1; i < n; i++) {
      ctx.lineTo(polygon[i].x, polygon[i].y);
    }

    if (isPolygonClosed) {
      ctx.closePath();
      ctx.fillStyle = THEME.boundaryFill;
      ctx.fill();

      ctx.strokeStyle = THEME.boundary;
      ctx.lineWidth = lw;
      ctx.setLineDash([]);
      ctx.stroke();
    } else {
      // Drafting mode: draw established segments
      ctx.strokeStyle = THEME.boundary;
      ctx.lineWidth = lw;
      ctx.setLineDash([6 / scale, 4 / scale]);
      ctx.stroke();

      // Rubberband line to current mouse position
      if (isDrawingPolygon && cursorWorldPos) {
        ctx.beginPath();
        ctx.moveTo(polygon[n - 1].x, polygon[n - 1].y);
        ctx.lineTo(cursorWorldPos.x, cursorWorldPos.y);
        ctx.strokeStyle = THEME.boundary;
        ctx.globalAlpha = 0.65;
        ctx.setLineDash([4 / scale, 4 / scale]);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  // 1b. A boundary that crosses itself: show the offending edges in red
  const crossings = state.metrics && state.metrics.crossings;
  if (crossings && crossings.length) {
    ctx.beginPath();
    crossings.flat().forEach((i) => {
      const a = polygon[i];
      const b = polygon[(i + 1) % n];
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    });
    ctx.strokeStyle = THEME.kumkum;
    ctx.lineWidth = 4 / scale;
    ctx.setLineDash([]);
    ctx.stroke();
  }

  // 2. Draw vertex handles and numbered labels (hidden while the boundary is locked)
  if (!(isPolygonClosed && state.isPolygonLocked)) polygon.forEach((vertex, idx) => {
    const isHovered = hoverVertexIndex === idx;
    const isDragging = draggingVertexIndex === idx;
    const isFirstInDraft = !isPolygonClosed && idx === 0 && n >= 3;

    const baseRadius = 5.5 / scale;
    const radius = (isHovered || isDragging) ? 8 / scale : baseRadius;

    // Outer circle
    ctx.beginPath();
    ctx.arc(vertex.x, vertex.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = THEME.paper;
    ctx.fill();

    ctx.lineWidth = 2 / scale;
    ctx.setLineDash([]);
    ctx.strokeStyle = isFirstInDraft ? '#1e7a4a' : (isDragging ? THEME.ink : THEME.boundary);
    ctx.stroke();

    // Pulse / snap ring for vertex 0 when ready to close
    if (isFirstInDraft && isHovered) {
      ctx.beginPath();
      ctx.arc(vertex.x, vertex.y, radius + 4 / scale, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(30, 122, 74, 0.55)';
      ctx.lineWidth = 1.5 / scale;
      ctx.stroke();
    }

    // Number badge (Google UI style label)
    const fontSize = Math.max(10, Math.min(13, 11 / Math.sqrt(scale)));
    ctx.font = `600 ${fontSize}px 'Hanken Grotesk', sans-serif`;
    const label = `${idx}`;
    const textWidth = ctx.measureText(label).width;

    const badgeX = vertex.x + 9 / scale;
    const badgeY = vertex.y - 9 / scale;
    const pad = 2 / scale;

    ctx.fillStyle = THEME.paper;
    ctx.fillRect(badgeX - pad, badgeY - fontSize + pad, textWidth + pad * 2, fontSize + pad);

    ctx.fillStyle = THEME.ink;
    ctx.fillText(label, badgeX, badgeY);
  });

  ctx.restore();
};

// Render Centroid Marker (Red Center of Mass Dot)
export const drawCentroidMarker = (ctx, centroid, scale, board = null) => {
  if (!centroid) return;

  const r = 5.5 / scale;
  const outerR = 10 / scale;

  ctx.save();

  // Subtle outer pulse circle
  ctx.beginPath();
  ctx.arc(centroid.x, centroid.y, outerR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(179, 38, 30, 0.14)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(179, 38, 30, 0.4)';
  ctx.lineWidth = 1 / scale;
  ctx.stroke();

  // Central red dot
  ctx.beginPath();
  ctx.arc(centroid.x, centroid.y, r, 0, Math.PI * 2);
  ctx.fillStyle = THEME.kumkum;
  ctx.fill();

  // Center white pinpoint
  ctx.beginPath();
  ctx.arc(centroid.x, centroid.y, 1.5 / scale, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.restore();

  if (board) {
    board.add({ text: 'Centroid', x: centroid.x + outerR + 26 / scale, y: centroid.y + outerR, px: 10, color: THEME.kumkum, priority: LABEL_PRIORITY.centroid });
  }
};

// Render 9x9 Vastu Purusha Mandala Grid and Brahmasthan
// Vithi Mandal ring colours: sacred centre to the outer, worldly ring
const VITHI_STYLE = {
  brahma: { fill: 'rgba(179, 38, 30, 0.16)', stroke: 'rgba(179, 38, 30, 0.75)', label: 'Brahma' },
  daivika: { fill: 'rgba(176, 141, 60, 0.18)', stroke: 'rgba(150, 118, 44, 0.8)', label: 'Daivika' },
  manushya: { fill: 'rgba(62, 142, 94, 0.13)', stroke: 'rgba(47, 122, 75, 0.75)', label: 'Manushya' },
  paishachika: { fill: 'rgba(91, 74, 59, 0.12)', stroke: 'rgba(91, 74, 59, 0.6)', label: 'Paishachika' }
};

// Render the Vithi Mandal: four concentric rings with a name on each ring's top band
export const drawVithiMandal = (ctx, vithi, scale, layers, board = null, withFill = true) => {
  if (!vithi || !layers.vithi) return;
  const angleRad = ((vithi.angleDeg || 0) * Math.PI) / 180;
  const tracePath = (corners) => {
    ctx.moveTo(corners[0].x, corners[0].y);
    corners.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
  };

  ctx.save();
  vithi.rings.forEach((ring) => {
    const style = VITHI_STYLE[ring.id];
    if (withFill) {
      ctx.beginPath();
      tracePath(ring.outerCorners);
      if (ring.innerCorners) tracePath(ring.innerCorners);
      ctx.fillStyle = style.fill;
      ctx.fill('evenodd');
    }
    ctx.beginPath();
    tracePath(ring.outerCorners);
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = 1.6 / scale;
    ctx.setLineDash([]);
    ctx.stroke();
  });
  ctx.restore();

  if (board) {
    vithi.rings.forEach((ring) => {
      const style = VITHI_STYLE[ring.id];
      board.add({ text: style.label, x: ring.labelPoint.x, y: ring.labelPoint.y, px: 11.5, color: style.stroke, angle: angleRad, priority: LABEL_PRIORITY.vithi });
    });
  }
};

export const draw9x9Grid = (ctx, grid9x9, scale, layers, withFill = true) => {
  if (!grid9x9 || !grid9x9.padas || grid9x9.padas.length === 0) return;
  const showGrid = layers.grid9x9;
  const showBrahmasthan = layers.brahmasthan;
  if (!showGrid && !showBrahmasthan) return;

  ctx.save();
  if (showGrid) {
    // Outer edge of the mandala, then the 81 padas
    ctx.beginPath();
    tracePolygon(ctx, grid9x9.outerOutline || grid9x9.outerBox);
    ctx.strokeStyle = 'rgba(42, 31, 23, 0.55)';
    ctx.lineWidth = 1.4 / scale;
    ctx.setLineDash([]);
    ctx.stroke();

    ctx.beginPath();
    grid9x9.padas.forEach((pada) => tracePolygon(ctx, pada.outline || pada.corners));
    ctx.strokeStyle = 'rgba(42, 31, 23, 0.28)';
    ctx.lineWidth = 1 / scale;
    ctx.stroke();
  }

  if (showBrahmasthan) {
    ctx.beginPath();
    tracePolygon(ctx, grid9x9.brahmasthanOutline || grid9x9.brahmasthanBox);
    if (withFill) {
      ctx.fillStyle = 'rgba(179, 38, 30, 0.12)';
      ctx.fill();
    }
    ctx.strokeStyle = THEME.kumkum;
    ctx.lineWidth = 2.2 / scale;
    ctx.setLineDash([]);
    ctx.stroke();
  }
  ctx.restore();
};

// Render 45 Devtas Overlay (Classical Paramasayika Mandala)
export const draw45Devtas = (ctx, devtaFields, scale, layers, angleDeg = 0, board = null, withFill = true) => {
  if (!devtaFields || devtaFields.length === 0) return;

  const showBoundaries = layers.devtas45;
  const showNames = layers.devtaNames;

  if (!showBoundaries && !showNames) return;

  const angleRad = (angleDeg * Math.PI) / 180;

  // 1. Render Devta Boundaries and Category Fills (when 45 Devtas is active)
  if (showBoundaries) {
    ctx.save();

    devtaFields.forEach((devta) => {
      const corners = devta.boundaryCorners;
      if (!corners || corners.length < 4) return;

      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) {
        ctx.lineTo(corners[i].x, corners[i].y);
      }
      ctx.closePath();

      // Category-tailored styles (Google UI palette)
      if (devta.category === 'central') {
        // Brahma
        if (withFill) {
          ctx.fillStyle = 'rgba(217, 48, 37, 0.08)';
          ctx.fill();
        }
        ctx.strokeStyle = '#d93025';
        ctx.lineWidth = 2.2 / scale;
        ctx.stroke();
      } else if (devta.category === 'inner_cardinal') {
        // Aryama, Vivaswan, Mitra, Bhudhar
        if (withFill) {
          ctx.fillStyle = 'rgba(26, 115, 232, 0.07)';
          ctx.fill();
        }
        ctx.strokeStyle = '#1a73e8';
        ctx.lineWidth = 1.8 / scale;
        ctx.stroke();
      } else if (devta.category === 'inner_diagonal') {
        // 8 Diagonal Devtas
        if (withFill) {
          ctx.fillStyle = 'rgba(30, 142, 62, 0.06)';
          ctx.fill();
        }
        ctx.strokeStyle = '#1e8e3e';
        ctx.lineWidth = 1.5 / scale;
        ctx.stroke();
      } else {
        // Outer 32 perimeter devtas
        if (devta.isAuspiciousEntrance) {
          if (withFill) {
            ctx.fillStyle = 'rgba(52, 168, 83, 0.12)';
            ctx.fill();
          }
          ctx.strokeStyle = '#34a853';
          ctx.lineWidth = 1.4 / scale;
        } else {
          if (withFill) {
            ctx.fillStyle = 'rgba(241, 243, 244, 0.15)';
            ctx.fill();
          }
          ctx.strokeStyle = 'rgba(95, 99, 104, 0.55)';
          ctx.lineWidth = 1.0 / scale;
        }
        ctx.stroke();
      }
    });

    ctx.restore();
  }

  // 2. Devta names go on the shared board: the big ones first, the rest where they fit.
  // The pada number joins the name once a pada is large enough on screen.
  if (showNames && board) {
    devtaFields.forEach((devta) => {
      if (!devta.center) return;
      const cellPx = Math.min(devta.padWidth || 50, devta.padHeight || 50) * scale;
      const major = devta.category === 'central' || devta.category === 'inner_cardinal';
      const px = Math.max(9, Math.min(major ? 15 : 13, cellPx * (major ? 0.22 : 0.17)));
      board.add({
        text: devta.name,
        sub: cellPx > 70 ? `#${devta.number}` : null,
        x: devta.center.x,
        y: devta.center.y,
        px,
        angle: angleRad,
        color: devta.category === 'central' ? THEME.kumkum : (devta.isAuspiciousEntrance ? '#2F7A4B' : THEME.ink),
        priority: major ? LABEL_PRIORITY.devtaMajor : LABEL_PRIORITY.devta
      });
    });
  }
};

// Render 16 Directional Zones (22.5° rays, sector fills, directional badges)
const ELEMENT_STYLE = {
  Water: { color: '#1F1F1F', line: '#1F1F1F', fill: 'rgba(31, 31, 31, 0.20)', label: 'Water' },
  Air: { color: '#8B5A2B', line: '#8B5A2B', fill: 'rgba(139, 90, 43, 0.24)', label: 'Air' },
  Fire: { color: '#E8590C', line: '#F26B1D', fill: 'rgba(242, 107, 29, 0.26)', label: 'Fire' },
  Earth: { color: '#A88400', line: '#E8B800', fill: 'rgba(255, 204, 0, 0.36)', label: 'Earth' }, // true yellow
  Space: { color: '#4A4A4A', line: '#9A9A9A', fill: 'rgba(255, 255, 255, 0.62)', label: 'Space' }, // white area, grey edge, dark label
  HardEarth: { color: '#A87A12', line: '#D9A400', fill: 'rgba(222, 178, 40, 0.30)', label: 'Hard earth' },
  LooseEarth: { color: '#97804A', line: '#B8A060', fill: 'rgba(238, 220, 160, 0.42)', label: 'Loose earth' }
};

// Render the 16 directional zones and/or the Five Elements view.
// With a closed plot both are clipped to it: rays end on the walls and labels sit inside.
export const draw16Zones = (ctx, zones16, scale, layers, plot = null, style = 'classic', board = null, withFill = true, print = false) => {
  if (!zones16 || !zones16.zones || zones16.zones.length === 0) return;
  if (!layers.zones16 && !layers.elements) return;
  const { centroid, radius, zones } = zones16;
  const closed = plot && plot.length >= 3;
  const reach = closed ? 4 * Math.max(...plot.map((p) => distance(p, centroid))) + 1 : radius;
  const hitDistance = (rad) => {
    if (!closed) return radius;
    const hit = rayPolygonHit(plot, centroid, { x: Math.cos(rad), y: Math.sin(rad) });
    return hit ? hit.dist : radius;
  };
  const wedge = (startRad, endRad) => {
    ctx.beginPath();
    ctx.moveTo(centroid.x, centroid.y);
    ctx.arc(centroid.x, centroid.y, reach, startRad, endRad, false);
    ctx.closePath();
  };
  const toneOf = (z) => zoneTone(z.id, style) || z.element;

  ctx.save();
  if (closed) {
    ctx.beginPath();
    tracePolygon(ctx, plot);
    ctx.clip();
  }

  // Fills: one per element in the Five Elements view, a light tint per zone when the zones own the colour
  if (layers.elements) {
    zones.forEach((z) => {
      wedge(z.startRad, z.endRad);
      ctx.fillStyle = ELEMENT_STYLE[toneOf(z)].fill;
      ctx.fill();
    });
  } else if (withFill) {
    zones.forEach((z) => {
      wedge(z.startRad, z.endRad);
      ctx.fillStyle = z.bgTint;
      ctx.fill();
    });
  }

  // Five Elements: each element's area outlined in its own colour, along both edges and its walls.
  // Every outline is clipped to its own area, so a shared edge shows both colours side by side.
  if (layers.elements) {
    const groups = [];
    zones.forEach((z) => {
      const last = groups[groups.length - 1];
      if (last && last.tone === toneOf(z)) last.zones.push(z);
      else groups.push({ tone: toneOf(z), zones: [z] });
    });
    if (groups.length > 1 && groups[0].tone === groups[groups.length - 1].tone) {
      groups[0].zones = groups.pop().zones.concat(groups[0].zones);
    }
    groups.forEach((g) => {
      const a0 = g.zones[0].startRad;
      const a1 = g.zones[g.zones.length - 1].endRad;
      ctx.save();
      wedge(a0, a1);
      ctx.clip();
      ctx.beginPath();
      if (closed) tracePolygon(ctx, plot);
      else ctx.arc(centroid.x, centroid.y, radius, 0, Math.PI * 2);
      [a0, a1].forEach((a) => {
        ctx.moveTo(centroid.x, centroid.y);
        ctx.lineTo(centroid.x + Math.cos(a) * reach, centroid.y + Math.sin(a) * reach);
      });
      ctx.strokeStyle = ELEMENT_STYLE[g.tone].line || ELEMENT_STYLE[g.tone].color;
      ctx.lineWidth = (print ? 5 : 3.4) / scale; // half of it is clipped away at each edge
      ctx.setLineDash([]);
      ctx.stroke();
      ctx.restore();
    });
  }

  // Rays: every zone boundary, dotted, when 16 Zones is on
  ctx.beginPath();
  if (layers.zones16) {
    zones.forEach((z) => {
      ctx.moveTo(centroid.x, centroid.y);
      ctx.lineTo(centroid.x + Math.cos(z.startRad) * reach, centroid.y + Math.sin(z.startRad) * reach);
    });
  }
  // On screen a light dotted line; on paper (PNG / PDF) a bold, near-black dashed line so it survives printing
  if (print) {
    ctx.strokeStyle = 'rgba(20, 15, 10, 0.92)';
    ctx.lineWidth = 2.6 / scale;
    ctx.setLineDash(layers.zones16 ? [10 / scale, 5 / scale] : []);
  } else {
    ctx.strokeStyle = THEME.ink;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = (layers.zones16 ? 1.7 : 1.4) / scale;
    ctx.setLineDash(layers.zones16 ? [7 / scale, 4 / scale] : []);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  if (!closed) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(centroid.x, centroid.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(42, 31, 23, 0.3)';
    ctx.lineWidth = 1 / scale;
    ctx.stroke();
    ctx.restore();
  }

  // Labels go on the shared board. Element names always show, sliding along their own direction
  // when their spot is taken; zone names are left to the ring when the Shakti Chakra is on.
  if (!board) return;
  if (layers.elements) {
    const groups = [];
    zones.forEach((z) => {
      const last = groups[groups.length - 1];
      if (last && last.tone === toneOf(z)) last.zones.push(z);
      else groups.push({ tone: toneOf(z), zones: [z] });
    });
    if (groups.length > 1 && groups[0].tone === groups[groups.length - 1].tone) {
      groups[0].zones = groups.pop().zones.concat(groups[0].zones);
    }
    groups.forEach((g) => {
      const mid = g.zones[Math.floor(g.zones.length / 2)];
      const rad = g.zones.length % 2 ? mid.centerRad : mid.startRad;
      const wall = hitDistance(rad);
      const look = ELEMENT_STYLE[g.tone];
      const spot = (f) => [centroid.x + Math.cos(rad) * wall * f, centroid.y + Math.sin(rad) * wall * f];
      const [x, y] = spot(0.5);
      board.add({ text: look.label, x, y, alts: [0.36, 0.64, 0.24, 0.76].map(spot), px: 12.5, weight: 700, color: look.color, priority: LABEL_PRIORITY.element, force: true });
    });
  }
  if (layers.zones16 && !layers.shaktiChakra) {
    zones.forEach((z) => {
      const d = hitDistance(z.centerRad) * (closed ? 0.78 : 0.92);
      board.add({ text: z.short, x: centroid.x + Math.cos(z.centerRad) * d, y: centroid.y + Math.sin(z.centerRad) * d, px: 11, color: z.color, priority: LABEL_PRIORITY.zone });
    });
  }
};

// Shakti Chakra: the degree dial practitioners lay over a plan. From the outside in: degrees, life
// aspects, 32 gates, the 16 zones in element colours, then spokes across the plan. At size 1 the
// rings just clear the plot's farthest corner; smaller sizes let them overlap the plan.
// Its size depends only on the plot, so fitting the view can allow for it.
const CHAKRA_RING_EDGE = { degrees: 0.905, lifeAspects: 0.775, gates: 0.7, zones: 0.62 }; // inner edges, as a share of the outer radius
const CHAKRA_PAPER = 'rgba(255, 253, 247, 0.86)';
const CHAKRA_INK = '#2A1F17';

export const shaktiChakraRadii = (plot, centroid, size = 1) => {
  const far = Math.max(...plot.map((p) => distance(p, centroid)));
  const inner = far * 1.04 * size;
  return { inner, outer: inner / CHAKRA_RING_EDGE.zones };
};

const WHEEL_STYLE = {
  Water: { fill: '#1F1F1F', text: '#FFFFFF' },
  Air: { fill: '#8B5A2B', text: '#FFFFFF' },
  Fire: { fill: '#F26B1D', text: '#FFFFFF' },
  Earth: { fill: '#FFCC00', text: '#3A2A10' },
  HardEarth: { fill: '#E6C02E', text: '#3A2A10' },
  LooseEarth: { fill: '#F4EAC0', text: '#5A4520' },
  Space: { fill: '#FFFFFF', text: '#2A1F17', seam: '#9A9A9A' } // white needs a visible edge
};

// One or two lines of text on the dial, turned so they never read upside down
const drawChakraText = (ctx, centroid, rad, r, lines, { px, weight = 600, color = CHAKRA_INK, maxWidth = Infinity }) => {
  const bottomHalf = Math.sin(rad) > 0.0001;
  ctx.save();
  ctx.translate(centroid.x + Math.cos(rad) * r, centroid.y + Math.sin(rad) * r);
  ctx.rotate(rad + (bottomHalf ? -Math.PI / 2 : Math.PI / 2));
  ctx.font = `${weight} ${px}px 'Hanken Grotesk', sans-serif`;
  const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
  if (widest > maxWidth) ctx.font = `${weight} ${(px * maxWidth) / widest}px 'Hanken Grotesk', sans-serif`;
  ctx.fillStyle = color;
  lines.forEach((line, i) => ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * px * 1.18));
  ctx.restore();
};

export const drawShaktiChakra = (ctx, zones16, scale, plot, style = 'classic', rotationDeg = 0, board = null, size = 1) => {
  if (!zones16 || !zones16.zones || zones16.zones.length !== 16 || !plot || plot.length < 3) return;
  const { centroid, zones } = zones16;
  const north = zones.find((z) => z.id === 'N');
  if (!north) return;
  const { outer } = shaktiChakraRadii(plot, centroid, size);
  const edge = {
    degrees: outer * CHAKRA_RING_EDGE.degrees,
    lifeAspects: outer * CHAKRA_RING_EDGE.lifeAspects,
    gates: outer * CHAKRA_RING_EDGE.gates,
    zones: outer * CHAKRA_RING_EDGE.zones
  };
  const at = (rad, r) => ({ x: centroid.x + Math.cos(rad) * r, y: centroid.y + Math.sin(rad) * r });
  const radOf = (bearing) => north.centerRad + (bearing * Math.PI) / 180;
  const addRadialLine = (rad, from, to) => {
    const a = at(rad, from);
    const b = at(rad, to);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  };
  const addCircle = (r) => {
    ctx.moveTo(centroid.x + r, centroid.y);
    ctx.arc(centroid.x, centroid.y, r, 0, Math.PI * 2);
  };

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Across the plan: faint gate lines and inner circles, firmer lines on the zone boundaries
  ctx.beginPath();
  GATE_RING.forEach((gate) => addRadialLine(radOf(gate.bearing - GATE_SPAN_DEG / 2), 0, edge.zones));
  addCircle(edge.zones * 0.34);
  addCircle(edge.zones * 0.68);
  ctx.strokeStyle = 'rgba(42, 31, 23, 0.16)';
  ctx.lineWidth = 1 / scale;
  ctx.stroke();
  ctx.beginPath();
  zones.forEach((z) => addRadialLine(z.startRad, 0, edge.zones));
  ctx.strokeStyle = 'rgba(42, 31, 23, 0.42)';
  ctx.stroke();

  // The paper the outer rings are printed on, leaving the plan showing faintly behind it
  ctx.beginPath();
  addCircle(outer);
  addCircle(edge.gates);
  ctx.fillStyle = CHAKRA_PAPER;
  ctx.fill('evenodd');

  // Degree scale: every degree when there is room for it, longer ticks at 5° and 10°
  const roomForEveryDegree = (outer * scale * Math.PI) / 180 >= 2.2;
  ctx.beginPath();
  for (let d = 0; d < 360; d++) {
    if (d % 10 === 0) addRadialLine(radOf(d), outer * 0.955, outer);
    else if (d % 5 === 0) addRadialLine(radOf(d), outer * 0.97, outer);
    else if (roomForEveryDegree) addRadialLine(radOf(d), outer * 0.985, outer);
  }
  ctx.strokeStyle = CHAKRA_INK;
  ctx.lineWidth = 0.6 / scale;
  ctx.stroke();
  for (let d = 0; d < 360; d += 10) {
    drawChakraText(ctx, centroid, radOf(d), outer * 0.93, [String(d)], { px: outer * 0.036 });
  }

  // Life aspects and 32 gates, with their dividers and the circles between the rings
  ctx.beginPath();
  zones.forEach((z) => addRadialLine(z.startRad, edge.lifeAspects, edge.degrees));
  GATE_RING.forEach((gate) => addRadialLine(radOf(gate.bearing - GATE_SPAN_DEG / 2), edge.gates, edge.lifeAspects));
  addCircle(outer);
  addCircle(edge.degrees);
  addCircle(edge.lifeAspects);
  ctx.strokeStyle = 'rgba(42, 31, 23, 0.6)';
  ctx.lineWidth = 1 / scale;
  ctx.stroke();
  zones.forEach((z) => {
    const lines = z.attribute.includes(' & ') ? z.attribute.split(' & ') : z.attribute.split(' ');
    drawChakraText(ctx, centroid, z.centerRad, (edge.lifeAspects + edge.degrees) / 2, lines, { px: outer * 0.036, maxWidth: outer * 0.3 });
  });
  GATE_RING.forEach((gate) => {
    drawChakraText(ctx, centroid, radOf(gate.bearing), (edge.gates + edge.lifeAspects) / 2, [gate.label], { px: outer * 0.036, weight: 700 });
  });

  // The 16 zones in element colours, with white seams
  zones.forEach((z) => {
    const look = WHEEL_STYLE[zoneTone(z.id, style) || z.element];
    ctx.beginPath();
    ctx.arc(centroid.x, centroid.y, edge.gates, z.startRad, z.endRad, false);
    ctx.arc(centroid.x, centroid.y, edge.zones, z.endRad, z.startRad, true);
    ctx.closePath();
    ctx.fillStyle = look.fill;
    ctx.fill();
    ctx.strokeStyle = look.seam || '#FFFFFF';
    ctx.lineWidth = 1.5 / scale;
    ctx.stroke();
    drawChakraText(ctx, centroid, z.centerRad, (edge.zones + edge.gates) / 2, [z.short], { px: outer * 0.04, weight: 700, color: look.text });
  });

  // North: a pointer on the inside of the rings and the angle beside it
  const pointer = outer * 0.034;
  const tip = at(north.centerRad, edge.zones);
  const back = at(north.centerRad, edge.zones - pointer);
  const side = { x: -Math.sin(north.centerRad) * pointer * 0.55, y: Math.cos(north.centerRad) * pointer * 0.55 };
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(back.x + side.x, back.y + side.y);
  ctx.lineTo(back.x - side.x, back.y - side.y);
  ctx.closePath();
  ctx.fillStyle = THEME.kumkum;
  ctx.fill();
  if (board) {
    const deg = Math.round((((rotationDeg % 360) + 360) % 360) * 10) / 10;
    const label = at(north.centerRad, edge.zones - pointer * 2.4);
    board.add({ text: `N ${deg}°`, x: label.x, y: label.y, px: 11.5, weight: 700, pill: { fill: THEME.kumkum, text: '#FFFFFF' }, priority: LABEL_PRIORITY.north, force: true });
  }

  ctx.restore();
};

// 32 gate lines from the centroid to the walls, one on every gate boundary (N1 starts at 315°)
export const drawGateRays = (ctx, zones16, plot, scale, print = false) => {
  if (!zones16 || !zones16.centroid || !plot || plot.length < 3) return;
  const north = zones16.zones.find((z) => z.id === 'N');
  if (!north) return;
  const c = zones16.centroid;
  ctx.save();
  ctx.beginPath();
  GATE_RING.forEach((gate) => {
    const rad = north.centerRad + ((gate.bearing - GATE_SPAN_DEG / 2) * Math.PI) / 180;
    const dir = { x: Math.cos(rad), y: Math.sin(rad) };
    const hit = rayPolygonHit(plot, c, dir);
    if (!hit) return;
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(c.x + dir.x * hit.dist, c.y + dir.y * hit.dist);
  });
  // Solid, so they read apart from the dotted 16 zone lines
  ctx.strokeStyle = print ? 'rgba(25, 30, 38, 0.85)' : THEME.ink;
  ctx.globalAlpha = print ? 1 : 0.6;
  ctx.lineWidth = (print ? 1.8 : 1.1) / scale;
  ctx.setLineDash([]);
  ctx.stroke();
  ctx.restore();
};

// Render 32 Perimeter Entrance Gates (N1-N8, E1-E8, S1-S8, W1-W8) & Auspicious Highlights
export const draw32EntranceGates = (ctx, entranceGates32, scale, layers, angleDeg = 0, board = null) => {
  if (!entranceGates32 || entranceGates32.length === 0) return;
  if (!layers.gates32) return;

  ctx.save();

  // Trace a gate's stretch of the real plot boundary
  // A gate can own several stretches of wall (e.g. both arms of a U-shaped plan)
  const traceGatePath = (gate) => {
    ctx.beginPath();
    (gate.paths || [gate.path]).forEach((path) => {
      if (!path || path.length < 2) return;
      ctx.moveTo(path[0].x, path[0].y);
      path.slice(1).forEach((pt) => ctx.lineTo(pt.x, pt.y));
    });
  };

  // 1. Draw perimeter edge segments and divider ticks
  entranceGates32.forEach((gate) => {
    if (!gate.outerEdgeStart || !gate.outerEdgeEnd) return;

    const normal = gate.normal || { x: 0, y: -1 };
    const tickLen = 8 / scale;

    // A. Ambient soft glow under auspicious gate segments
    if (gate.isAuspicious) {
      traceGatePath(gate);
      ctx.strokeStyle = 'rgba(52, 168, 83, 0.22)';
      ctx.lineWidth = 7 / scale;
      ctx.stroke();
    }

    // B. Perimeter edge boundary stroke
    traceGatePath(gate);

    if (gate.isAuspicious) {
      ctx.strokeStyle = '#1e8e3e'; // Google Green
      ctx.lineWidth = 3.5 / scale;
    } else {
      ctx.strokeStyle = '#5f6368'; // Google Slate
      ctx.lineWidth = 1.8 / scale;
    }
    ctx.stroke();

    // C. Divider tick marks at segment boundary points (pointing radially outward)
    [[gate.outerEdgeStart, gate.startNormal], [gate.outerEdgeEnd, gate.endNormal]].forEach(([pt, tickDir]) => {
      const dir = tickDir || normal;
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(pt.x + dir.x * tickLen, pt.y + dir.y * tickLen);
      ctx.strokeStyle = gate.isAuspicious ? '#1e8e3e' : '#5f6368';
      ctx.lineWidth = (gate.isAuspicious ? 2.0 : 1.2) / scale;
      ctx.stroke();
    });
  });

  ctx.restore();

  // 2. Codes just outside the walls, on the shared board
  if (!board) return;
  const offsetDist = 15 / scale;
  entranceGates32.forEach((gate) => {
    if (!gate.edgeMidpoint) return;
    const normal = gate.normal || { x: 0, y: -1 };
    const x = gate.edgeMidpoint.x + normal.x * offsetDist;
    const y = gate.edgeMidpoint.y + normal.y * offsetDist;
    if (gate.isAuspicious) {
      board.add({ text: gate.code, x, y, px: 11, weight: 700, pill: { fill: '#2F7A4B', text: '#FFFFFF' }, priority: LABEL_PRIORITY.auspicious });
    } else {
      board.add({ text: gate.code, x, y, px: 10.5, color: THEME.muted, priority: LABEL_PRIORITY.entrance });
    }
  });
};

// Render the 32 outer padas of the mandala with their entrance codes ("32 gates 81 pad")
export const drawGatePadas = (ctx, devtaFields, scale, layers, auspicious, board = null) => {
  if (!devtaFields || !layers.gatePadas) return;
  const outer = devtaFields.filter((d) => d.entranceCode);
  ctx.save();
  outer.forEach((d) => {
    ctx.beginPath();
    tracePolygon(ctx, d.boundaryCorners);
    if (auspicious && auspicious.has(d.entranceCode)) {
      ctx.fillStyle = 'rgba(47, 122, 75, 0.16)';
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(42, 31, 23, 0.45)';
    ctx.lineWidth = 1.2 / scale;
    ctx.stroke();
  });
  ctx.restore();
  if (!board || layers.gates32) return;
  outer.forEach((d) => {
    const good = auspicious && auspicious.has(d.entranceCode);
    board.add({ text: d.entranceCode, x: d.center.x, y: d.center.y, px: 10.5, weight: good ? 700 : 600, color: good ? '#2F7A4B' : THEME.ink, priority: good ? LABEL_PRIORITY.auspicious : LABEL_PRIORITY.padaCode });
  });
};

// Render Marma Sthan (Classical Diagonal Energy Lines & 9 Sensitive Nodes)
export const drawMarmaSthan = (ctx, marmaSthan, scale, layers) => {
  if (!marmaSthan || !layers.marma) return;

  const { lines, marmaPoints } = marmaSthan;
  if (!lines || lines.length === 0) return;

  ctx.save();

  // 1. Draw Dashed Red Energy Lines (Mahamarma & Upamarma Sutras)
  ctx.strokeStyle = '#d93025'; // Google Red / Classical Vastu Red
  ctx.lineWidth = 1.8 / scale;
  ctx.setLineDash([8 / scale, 6 / scale]);
  ctx.beginPath();

  lines.forEach((line) => {
    if (!line.start || !line.end) return;
    const pts = line.points && line.points.length >= 2 ? line.points : [line.start, line.end];
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach((pt) => ctx.lineTo(pt.x, pt.y));
  });

  ctx.stroke();

  // 2. Draw Solid Black Circular Markers at Intersections
  ctx.setLineDash([]); // Reset line dash for markers
  const markerRadius = 4.5 / scale;

  marmaPoints.forEach((node) => {
    // Outer white rim for high contrast over any background
    ctx.beginPath();
    ctx.arc(node.x, node.y, markerRadius + 1.2 / scale, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Solid black dot
    ctx.beginPath();
    ctx.arc(node.x, node.y, markerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#202124'; // Solid black / dark charcoal
    ctx.fill();
  });

  ctx.restore();
};

// Main Canvas Controller Class
// Render the Set Scale reference line (while picking its two points)
export const drawCalibration = (ctx, state) => {
  if (!state.isCalibrating) return;
  const scale = state.viewport.scale;
  const pts = [...state.calibrationPoints];
  if (pts.length === 1 && state.cursorWorldPos) pts.push(state.cursorWorldPos);
  if (pts.length === 0) return;

  ctx.save();
  if (pts.length === 2) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.setLineDash([6 / scale, 4 / scale]);
    ctx.strokeStyle = '#e37400';
    ctx.lineWidth = 2.5 / scale;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  state.calibrationPoints.forEach((pt) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 5 / scale, 0, Math.PI * 2);
    ctx.fillStyle = '#e37400';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 / scale;
    ctx.stroke();
  });
  ctx.restore();
};

// Grow a content box so the Shakti Chakra, when shown, fits on screen and in exports
const withWheelRoom = (state, box) => {
  const zones16 = state.metrics.zones16;
  if (!state.layers.shaktiChakra || !state.isPolygonClosed || !zones16 || !zones16.centroid) return box;
  const { outer } = shaktiChakraRadii(state.polygon, zones16.centroid, state.chakraSize);
  const c = zones16.centroid;
  const minX = Math.min(box.originX, c.x - outer);
  const minY = Math.min(box.originY, c.y - outer);
  const maxX = Math.max(box.originX + box.contentW, c.x + outer);
  const maxY = Math.max(box.originY + box.contentH, c.y + outer);
  return { originX: minX, originY: minY, contentW: maxX - minX, contentH: maxY - minY };
};

export class CanvasController {
  constructor(canvasElement, store) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.store = store;
    this.dpr = window.devicePixelRatio || 1;

    this.initEventListeners();
    this.handleResize();

    // Subscribe to state changes for reactive rendering
    this.unsubscribe = store.subscribe((state) => {
      this.render(state);
    });
  }

  handleResize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const prevWidth = this.width;
    const prevHeight = this.height;
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);

    // Rotating a phone or tablet, or resizing a window, must not leave the plan off-screen:
    // refit if the view is still where fitToView put it, otherwise keep the same point centred
    if (prevWidth > 0 && prevHeight > 0 && (prevWidth !== this.width || prevHeight !== this.height)) {
      const vp = this.store.getState().viewport;
      const fitted = this.fittedViewport;
      if (fitted && vp.scale === fitted.scale && vp.x === fitted.x && vp.y === fitted.y) {
        this.fitToView();
        // The bottom sheet may still be sliding into its new place; fit again once it settles
        clearTimeout(this.refitTimer);
        this.refitTimer = setTimeout(() => {
          const now = this.store.getState().viewport;
          const last = this.fittedViewport;
          if (last && now.scale === last.scale && now.x === last.x && now.y === last.y) this.fitToView();
        }, 450);
        return;
      }
      const dx = (this.width - prevWidth) / 2;
      const dy = (this.height - prevHeight) / 2;
      this.store.setState((prev) => ({
        ...prev,
        viewport: { ...prev.viewport, x: prev.viewport.x + dx, y: prev.viewport.y + dy }
      }));
      return;
    }

    this.render(this.store.getState());
  }

  initEventListeners() {
    // Window and container resize observer
    const resizeObserver = new ResizeObserver(() => this.handleResize());
    resizeObserver.observe(this.canvas.parentElement);

    // Pointer events cover mouse, pen and touch. Mouse keeps its click-to-place behaviour;
    // touch uses press-and-lift with a magnifier, and two fingers pinch-zoom and pan.
    this.pointers = new Map();   // active touch pointers: id -> { x, y } (canvas-local px)
    this.touch = null;           // current one-finger touch gesture
    this.pinch = null;           // current two-finger gesture
    this.loupe = null;           // { x, y } screen point shown magnified, or null

    this.canvas.style.touchAction = 'none';
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    this.canvas.addEventListener('pointercancel', (e) => this.onPointerUp(e, true));
    this.canvas.addEventListener('dblclick', (e) => this.onDblClick(e));
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // ---------- Pointer routing ----------

  localPoint(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  onPointerDown(e) {
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already gone; capture is only a convenience */
    }
    if (e.pointerType !== 'touch') {
      this.onMouseDown(e);
      return;
    }
    e.preventDefault();
    this.pointers.set(e.pointerId, this.localPoint(e));

    if (this.pointers.size === 2) {
      this.cancelTouchGesture();
      this.startPinch();
    } else if (this.pointers.size === 1) {
      this.startTouch(e);
    }
  }

  onPointerMove(e) {
    if (e.pointerType !== 'touch') {
      this.onMouseMove(e);
      return;
    }
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, this.localPoint(e));

    if (this.pinch && this.pointers.size >= 2) {
      this.updatePinch();
    } else if (this.touch && this.touch.pointerId === e.pointerId) {
      this.updateTouch(e);
    }
  }

  onPointerUp(e, cancelled = false) {
    if (e.pointerType !== 'touch') {
      this.onMouseUp(e);
      return;
    }
    this.pointers.delete(e.pointerId);

    if (this.pinch) {
      // Ending a pinch never places a point; wait for every finger to lift
      if (this.pointers.size < 2) this.pinch = null;
      return;
    }
    if (this.touch && this.touch.pointerId === e.pointerId) {
      this.endTouch(e, cancelled);
    }
  }

  // ---------- One-finger touch ----------

  startTouch(e) {
    const state = this.store.getState();
    const local = this.localPoint(e);
    const worldPos = screenToWorld(local.x, local.y, state.viewport);
    const scale = state.viewport.scale;

    if (state.isDrawingPolygon || state.isCalibrating) {
      // Press shows where the point will land; lifting the finger places it
      this.touch = { pointerId: e.pointerId, mode: 'place' };
      this.loupe = local;
      this.previewPlacement(worldPos);
      return;
    }

    const locked = state.isPolygonClosed && state.isPolygonLocked;
    const hitIndex = state.polygon.length > 0 && !locked
      ? findClosestVertex(worldPos, state.polygon, TOUCH_HIT_RADIUS / scale)
      : -1;
    if (hitIndex !== -1) {
      this.touch = {
        pointerId: e.pointerId,
        mode: 'drag-vertex',
        snapshot: { polygon: [...state.polygon], isPolygonClosed: state.isPolygonClosed },
        // Keep the vertex under the finger exactly where it was grabbed (no jump)
        offset: { x: state.polygon[hitIndex].x - worldPos.x, y: state.polygon[hitIndex].y - worldPos.y }
      };
      this.loupe = local;
      this.store.setState(setDraggingVertex(hitIndex));
      haptic(8);
      return;
    }

    this.touch = {
      pointerId: e.pointerId,
      mode: 'pan',
      start: local,
      viewport: { x: state.viewport.x, y: state.viewport.y }
    };
  }

  updateTouch(e) {
    const state = this.store.getState();
    const local = this.localPoint(e);
    const worldPos = screenToWorld(local.x, local.y, state.viewport);

    if (this.touch.mode === 'place') {
      this.loupe = local;
      this.previewPlacement(worldPos);
    } else if (this.touch.mode === 'drag-vertex') {
      this.loupe = local;
      const { offset } = this.touch;
      this.store.setState(updatePolygonVertex(state.draggingVertexIndex, { x: worldPos.x + offset.x, y: worldPos.y + offset.y }));
    } else if (this.touch.mode === 'pan') {
      const { start, viewport } = this.touch;
      this.setViewport({ x: viewport.x + local.x - start.x, y: viewport.y + local.y - start.y });
    }
  }

  endTouch(e, cancelled) {
    const gesture = this.touch;
    this.touch = null;
    this.loupe = null;
    const state = this.store.getState();

    if (gesture.mode === 'place') {
      if (!cancelled) {
        const local = this.localPoint(e);
        const worldPos = screenToWorld(local.x, local.y, state.viewport);
        this.placePoint(worldPos, TOUCH_SNAP_RADIUS);
      }
      this.store.setState(setHoverVertex(null));
      this.store.setState(setCursorWorldPos(state.isDrawingPolygon || state.isCalibrating ? state.cursorWorldPos : null));
    } else if (gesture.mode === 'drag-vertex') {
      this.store.setState(commitDragHistory(gesture.snapshot));
      this.store.setState(setDraggingVertex(null));
    } else {
      // Two quick taps on empty space bring the whole plan back into view
      const local = this.localPoint(e);
      const moved = Math.hypot(local.x - gesture.start.x, local.y - gesture.start.y);
      const now = Date.now();
      const last = this.lastTap;
      if (!cancelled && moved < 10) {
        if (last && now - last.time < 320 && Math.hypot(local.x - last.x, local.y - last.y) < 40) {
          this.lastTap = null;
          this.fitToView();
          return;
        }
        this.lastTap = { time: now, x: local.x, y: local.y };
      }
      this.render(state);
    }
  }

  // A second finger turns the gesture into a pinch: undo any half-done drag, place nothing
  cancelTouchGesture() {
    const gesture = this.touch;
    this.touch = null;
    this.loupe = null;
    if (!gesture) return;
    if (gesture.mode === 'drag-vertex') {
      this.store.setState((prev) => ({
        ...prev,
        polygon: Object.freeze([...gesture.snapshot.polygon]),
        draggingVertexIndex: null,
        metrics: recalculateMetrics(gesture.snapshot.polygon, gesture.snapshot.isPolygonClosed, prev.rotation, prev.gridAlign, prev.mandalaShape)
      }));
    } else if (gesture.mode === 'place') {
      this.store.setState(setHoverVertex(null));
    }
  }

  // ---------- Two-finger pinch & pan ----------

  startPinch() {
    const [a, b] = [...this.pointers.values()];
    const { viewport } = this.store.getState();
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    this.pinch = {
      distance: Math.hypot(b.x - a.x, b.y - a.y) || 1,
      anchorWorld: screenToWorld(mid.x, mid.y, viewport),
      scale: viewport.scale
    };
  }

  updatePinch() {
    const [a, b] = [...this.pointers.values()];
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const scale = this.pinch.scale * (dist / this.pinch.distance);
    // Keep the world point that started under the fingers' midpoint under it now
    this.setViewport({
      scale,
      x: mid.x - this.pinch.anchorWorld.x * scale,
      y: mid.y - this.pinch.anchorWorld.y * scale
    }, { zooming: true });
  }

  // ---------- Shared placement helpers ----------

  previewPlacement(worldPos) {
    const state = this.store.getState();
    const nearStart = state.isDrawingPolygon && state.polygon.length >= 3
      && distance(worldPos, state.polygon[0]) * state.viewport.scale <= TOUCH_SNAP_RADIUS;
    this.store.setState(setHoverVertex(nearStart ? 0 : null));
    this.store.setState(setCursorWorldPos(worldPos));
  }

  // Place a polygon vertex (snapping closed near point 0) or a Set Scale point
  placePoint(worldPos, snapRadiusPx) {
    const state = this.store.getState();
    if (state.isCalibrating) {
      this.store.setState(addCalibrationPoint(worldPos));
      haptic(10);
      return;
    }
    if (!state.isDrawingPolygon) return;
    if (state.polygon.length >= 3 && distance(worldPos, state.polygon[0]) * state.viewport.scale <= snapRadiusPx) {
      this.store.setState(closePolygon());
      haptic([12, 40, 18]);
      return;
    }
    this.store.setState(addPolygonVertex(worldPos));
    haptic(10);
  }

  setViewport(partial, options = {}) {
    this.store.setState((prev) => ({
      ...prev,
      viewport: this.constrainViewport({ ...prev.viewport, ...partial }, prev, options)
    }));
  }

  // Magnifier above the finger so the exact point under it stays visible
  drawLoupe(ctx) {
    if (!this.loupe) return;
    const st = this.store.getState();
    const willClose = this.touch && this.touch.mode === 'place' && st.isDrawingPolygon && st.hoverVertexIndex === 0;
    const { x, y } = this.loupe;
    const r = LOUPE_RADIUS;
    const zoom = LOUPE_ZOOM;
    const cx = x;
    const cy = y - r - 44 < r + 8 ? y + r + 44 : y - r - 44;
    const dpr = this.dpr;

    if (!this.loupeCanvas) this.loupeCanvas = document.createElement('canvas');
    const lc = this.loupeCanvas;
    const size = Math.round(r * 2 * dpr);
    if (lc.width !== size) {
      lc.width = size;
      lc.height = size;
    }
    const lctx = lc.getContext('2d');
    const srcSize = (r * 2 * dpr) / zoom;
    lctx.clearRect(0, 0, size, size);
    lctx.drawImage(this.canvas, x * dpr - srcSize / 2, y * dpr - srcSize / 2, srcSize, srcSize, 0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.shadowColor = 'rgba(42, 31, 23, 0.28)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = THEME.paper;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.clip();
    ctx.drawImage(lc, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = THEME.brass;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.strokeStyle = THEME.saffron;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx - 3, cy);
    ctx.moveTo(cx + 3, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx, cy - 3);
    ctx.moveTo(cx, cy + 3);
    ctx.lineTo(cx, cy + 10);
    ctx.stroke();
    if (willClose) {
      const label = 'Lift to close';
      ctx.font = "700 12px 'Hanken Grotesk', sans-serif";
      const w = ctx.measureText(label).width + 16;
      ctx.fillStyle = '#2F7A4B';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') ctx.roundRect(cx - w / 2, cy + r - 12, w, 22, 11);
      else ctx.rect(cx - w / 2, cy + r - 12, w, 22);
      ctx.fill();
      ctx.fillStyle = '#FFFCF6';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, cx, cy + r - 1);
    }
    ctx.restore();
  }

  getEventWorldPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    return screenToWorld(screenX, screenY, this.store.getState().viewport);
  }

  onMouseDown(e) {
    if (e.button !== 0 && e.button !== 1) return;

    const state = this.store.getState();
    const worldPos = this.getEventWorldPos(e);
    const scale = state.viewport.scale;

    // 0. Set Scale mode: pick the two ends of a wall of known length
    if (state.isCalibrating) {
      if (e.button === 0) this.store.setState(addCalibrationPoint(worldPos));
      return;
    }

    // 1. Drawing mode: Click to add vertices or click near start to close
    if (state.isDrawingPolygon) {
      if (e.button === 0) {
        const n = state.polygon.length;
        // Snap to close if clicking near vertex 0
        if (n >= 3) {
          const distToStart = distance(worldPos, state.polygon[0]) * scale;
          if (distToStart <= 16) {
            this.store.setState(closePolygon());
            return;
          }
        }
        // Add new vertex
        this.store.setState(addPolygonVertex(worldPos));
      }
      return;
    }

    // 2. Normal mode: Check for vertex handle grab (not while the boundary is locked)
    if (state.polygon.length > 0 && e.button === 0 && !(state.isPolygonClosed && state.isPolygonLocked)) {
      const toleranceWorld = 12 / scale;
      const hitIndex = findClosestVertex(worldPos, state.polygon, toleranceWorld);

      if (hitIndex !== -1) {
        this.dragStartSnapshot = {
          polygon: [...state.polygon],
          isPolygonClosed: state.isPolygonClosed
        };
        this.store.setState(setDraggingVertex(hitIndex));
        return;
      }
    }

    // 3. Pan canvas
    this.store.setState((prev) => ({
      ...prev,
      viewport: {
        ...prev.viewport,
        isDragging: true,
        dragStartX: e.clientX - prev.viewport.x,
        dragStartY: e.clientY - prev.viewport.y
      }
    }));
    this.canvas.parentElement.classList.add('is-dragging');
  }

  onMouseMove(e) {
    const state = this.store.getState();
    const worldPos = this.getEventWorldPos(e);
    const scale = state.viewport.scale;

    // 1. Handle active vertex dragging
    if (state.draggingVertexIndex !== null) {
      this.store.setState(updatePolygonVertex(state.draggingVertexIndex, worldPos));
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    // 2. Handle canvas panning
    if (state.viewport.isDragging) {
      this.setViewport({ x: e.clientX - state.viewport.dragStartX, y: e.clientY - state.viewport.dragStartY });
      return;
    }

    // 3a. Set Scale rubberband
    if (state.isCalibrating) {
      this.store.setState(setCursorWorldPos(worldPos));
      this.canvas.style.cursor = 'crosshair';
      return;
    }

    // 3. Handle drafting rubberband & snap preview
    if (state.isDrawingPolygon) {
      this.store.setState(setCursorWorldPos(worldPos));
      this.canvas.style.cursor = 'crosshair';

      if (state.polygon.length >= 3) {
        const distToStart = distance(worldPos, state.polygon[0]) * scale;
        if (distToStart <= 16) {
          this.store.setState(setHoverVertex(0));
          this.canvas.style.cursor = 'pointer';
          return;
        }
      }
      this.store.setState(setHoverVertex(null));
      return;
    }

    // 4. Handle vertex handle hover detection
    if (state.polygon.length > 0 && !(state.isPolygonClosed && state.isPolygonLocked)) {
      const toleranceWorld = 12 / scale;
      const hitIndex = findClosestVertex(worldPos, state.polygon, toleranceWorld);

      if (hitIndex !== -1) {
        this.store.setState(setHoverVertex(hitIndex));
        this.canvas.style.cursor = 'pointer';
        return;
      }
    }

    this.store.setState(setHoverVertex(null));
    this.canvas.style.cursor = 'grab';
  }

  onMouseUp(e) {
    const state = this.store.getState();

    if (state.draggingVertexIndex !== null) {
      if (this.dragStartSnapshot) {
        this.store.setState(commitDragHistory(this.dragStartSnapshot));
        this.dragStartSnapshot = null;
      }
      this.store.setState(setDraggingVertex(null));
      this.canvas.style.cursor = 'grab';
    }

    if (state.viewport.isDragging) {
      this.store.setState((prev) => ({
        ...prev,
        viewport: {
          ...prev.viewport,
          isDragging: false
        }
      }));
      this.canvas.parentElement.classList.remove('is-dragging');
    }
  }

  onDblClick(e) {
    const state = this.store.getState();
    if (state.isDrawingPolygon && state.polygon.length >= 3) {
      this.store.setState(closePolygon());
      return;
    }
    // Double-click on the plan brings the whole of it back into view
    if (!state.isDrawingPolygon && !state.isCalibrating) this.fitToView();
  }

  onWheel(e) {
    e.preventDefault();
    const state = this.store.getState();
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const currentScale = state.viewport.scale;
    const newScale = currentScale * zoomFactor;

    // Zoom anchored at the cursor (the bounds keep the plan in view)
    this.setViewport({
      scale: newScale,
      x: mouseX - (mouseX - state.viewport.x) * (newScale / currentScale),
      y: mouseY - (mouseY - state.viewport.y) * (newScale / currentScale)
    }, { zooming: true });
  }

  // The + and - buttons zoom around the middle of what you can see, not of the whole canvas
  zoomBy(factor) {
    const state = this.store.getState();
    const area = this.visibleArea();
    const centerX = area.width / 2;
    const centerY = area.height / 2;
    const currentScale = state.viewport.scale;
    const newScale = currentScale * factor;
    this.setViewport({
      scale: newScale,
      x: centerX - (centerX - state.viewport.x) * (newScale / currentScale),
      y: centerY - (centerY - state.viewport.y) * (newScale / currentScale)
    }, { zooming: true });
  }

  // ---------- Keeping the plan in view ----------

  // What has to fit on screen: the floor plan image and the plot (and the compass wheel when shown)
  contentBox(state) {
    const b = state.metrics.bounds;
    let box = { originX: 0, originY: 0, contentW: 800, contentH: 600 };
    if (state.image && b) {
      const originX = Math.min(0, b.minX);
      const originY = Math.min(0, b.minY);
      box = { originX, originY, contentW: Math.max(state.image.width, b.maxX) - originX, contentH: Math.max(state.image.height, b.maxY) - originY };
    } else if (state.image) {
      box = { originX: 0, originY: 0, contentW: state.image.width, contentH: state.image.height };
    } else if (b) {
      // A hand-drawn plot can sit anywhere in world space, not just from (0, 0)
      box = { originX: b.minX, originY: b.minY, contentW: b.width || 800, contentH: b.height || 600 };
    }
    return withWheelRoom(state, box);
  }

  // The part of the canvas you can actually see (the phone sheet and dock cover the bottom)
  visibleArea() {
    const insetBottom = typeof this.getBottomInset === 'function' ? this.getBottomInset() : 0;
    return { width: this.width, height: Math.max(120, this.height - insetBottom) };
  }

  fitViewport(state) {
    const box = this.contentBox(state);
    const area = this.visibleArea();
    const fit = computeFitViewport(box.contentW, box.contentH, area.width, area.height, 40);
    return { scale: fit.scale, x: fit.x - box.originX * fit.scale, y: fit.y - box.originY * fit.scale };
  }

  // Zooming out stops a little below the fitted size and glides the plan back to the middle as it
  // gets there; panning and zooming in can never push the plan off the visible area.
  constrainViewport(next, state, { zooming = false } = {}) {
    if (!this.width || !this.height) return next;
    // Tracing on a blank canvas may reach anywhere; there is nothing yet to keep in view
    if (state.isDrawingPolygon && !state.image) return next;
    const fit = this.fitViewport(state);
    const box = this.contentBox(state);
    const area = this.visibleArea();
    const scale = Math.min(Math.max(fit.scale * MIN_ZOOM_OF_FIT, next.scale), MAX_ZOOM);
    const centred = {
      x: (area.width - box.contentW * scale) / 2 - box.originX * scale,
      y: (area.height - box.contentH * scale) / 2 - box.originY * scale
    };
    let { x, y } = next;
    if (scale !== next.scale) {
      x = centred.x;
      y = centred.y;
    } else if (zooming && scale < state.viewport.scale) {
      const glideFrom = fit.scale * 1.5;
      if (scale < glideFrom) {
        const t = Math.min(1, (glideFrom - scale) / (glideFrom - fit.scale));
        x += (centred.x - x) * t;
        y += (centred.y - y) * t;
      }
    }
    // Keep at least a third of the plan (or of the screen, if the plan is bigger) in sight
    const left = x + box.originX * scale;
    const top = y + box.originY * scale;
    const right = left + box.contentW * scale;
    const bottom = top + box.contentH * scale;
    const keepX = Math.min(box.contentW * scale, area.width) * 0.35;
    const keepY = Math.min(box.contentH * scale, area.height) * 0.35;
    if (right < keepX) x += keepX - right;
    if (left > area.width - keepX) x -= left - (area.width - keepX);
    if (bottom < keepY) y += keepY - bottom;
    if (top > area.height - keepY) y -= top - (area.height - keepY);
    return { ...next, scale, x, y };
  }

  // The visible area changed: keep the whole plan in view, unless the person has zoomed or panned
  refitIfFitted() {
    const now = this.store.getState().viewport;
    const last = this.fittedViewport;
    if (last && now.scale === last.scale && now.x === last.x && now.y === last.y) this.fitToView();
  }

  fitToView() {
    const viewport = this.fitViewport(this.store.getState());
    this.fittedViewport = viewport;
    this.store.setState((prev) => ({
      ...prev,
      viewport: { ...prev.viewport, ...viewport }
    }));
  }

  /**
   * Draw the whole plan (image and plot, every visible layer) into a new canvas of a fixed size,
   * independent of the current zoom and pan — used for the PDF report and the plan image.
   */
  snapshot(width = 1800, height = 1130) {
    const state = this.store.getState();
    const off = document.createElement('canvas');
    off.width = width;
    off.height = height;
    const saved = { ctx: this.ctx, width: this.width, height: this.height, loupe: this.loupe };
    let contentW = 800;
    let contentH = 600;
    let originX = 0;
    let originY = 0;
    const b = state.metrics.bounds;
    if (state.image && b) {
      originX = Math.min(0, b.minX);
      originY = Math.min(0, b.minY);
      contentW = Math.max(state.image.width, b.maxX) - originX;
      contentH = Math.max(state.image.height, b.maxY) - originY;
    } else if (state.image) {
      contentW = state.image.width;
      contentH = state.image.height;
    } else if (b) {
      originX = b.minX;
      originY = b.minY;
      contentW = b.width || 800;
      contentH = b.height || 600;
    }
    ({ originX, originY, contentW, contentH } = withWheelRoom(state, { originX, originY, contentW, contentH }));
    const fit = computeFitViewport(contentW, contentH, width, height, 50);
    const viewport = { ...state.viewport, scale: fit.scale, x: fit.x - originX * fit.scale, y: fit.y - originY * fit.scale };
    try {
      this.ctx = off.getContext('2d');
      this.width = width;
      this.height = height;
      this.loupe = null;
      this.ctx.fillStyle = '#FFFCF6';
      this.ctx.fillRect(0, 0, width, height);
      this.render({ ...state, viewport }, { transparent: true, print: true });
    } finally {
      Object.assign(this, saved);
    }
    return off;
  }

  render(state, { transparent = false, print = false } = {}) {
    const { ctx, width, height } = this;
    if (!ctx || !width || !height) return;

    // 1. Clear viewport (a snapshot keeps the paper background it was given)
    if (!transparent) ctx.clearRect(0, 0, width, height);

    // 2. Draw background grid
    drawBackgroundGrid(ctx, state.viewport, width, height);

    // 3. Apply viewport transformations (pan & zoom)
    ctx.save();
    ctx.translate(state.viewport.x, state.viewport.y);
    ctx.scale(state.viewport.scale, state.viewport.scale);

    // 4. Render floor plan image if present
    if (state.image) {
      drawFloorPlanImage(ctx, state.image);
    }

    // One label board for every layer, and one layer that colours the plan; the others draw outlines
    const board = createLabelBoard(print ? 1.6 : 1);
    const scale = state.viewport.scale;
    const L = state.layers;
    const fillOwner = L.elements ? 'elements' : L.vithi ? 'vithi' : L.devtas45 ? 'devtas' : L.zones16 ? 'zones' : null;
    const plot = state.isPolygonClosed ? state.polygon : null;

    // 5. 16 zones and the Five Elements view
    if (state.metrics.zones16) {
      draw16Zones(ctx, state.metrics.zones16, scale, L, plot, state.elementStyle, board, fillOwner === 'zones', print);
    }

    // 5b. Vithi Mandal rings (under the grid lines)
    if (state.metrics.vithi) {
      drawVithiMandal(ctx, state.metrics.vithi, scale, L, board, fillOwner === 'vithi');
    }

    // 6. 9x9 grid and Brahmasthan (its tint only when nothing else colours the plan)
    if (state.metrics.grid9x9) {
      draw9x9Grid(ctx, state.metrics.grid9x9, scale, L, fillOwner === null || fillOwner === 'devtas');
    }

    // 7. 45 Devtas and the 32 outer padas
    if (state.metrics.devtaFields) {
      draw45Devtas(ctx, state.metrics.devtaFields, scale, L, state.metrics.gridAngle, board, fillOwner === 'devtas');
      drawGatePadas(ctx, state.metrics.devtaFields, scale, L, AUSPICIOUS_ENTRANCES, board);
    }

    // 8. 32 entrances along the walls
    if (state.metrics.entranceGates32) {
      if (L.gates32 && plot) drawGateRays(ctx, state.metrics.zones16, plot, scale, print);
      draw32EntranceGates(ctx, state.metrics.entranceGates32, scale, L, state.rotation, board);
    }

    // 9. Marma lines and nodes
    if (state.metrics.marmaSthan) {
      drawMarmaSthan(ctx, state.metrics.marmaSthan, scale, L);
    }

    // 9b. Shakti Chakra around the plot
    if (L.shaktiChakra && plot && state.metrics.zones16) {
      drawShaktiChakra(ctx, state.metrics.zones16, scale, plot, state.elementStyle, state.rotation, board, state.chakraSize);
    }

    // 10. Boundary, corner handles and the centre
    drawPolygon(ctx, state);
    drawCalibration(ctx, state);
    if (state.metrics.centroid) {
      drawCentroidMarker(ctx, state.metrics.centroid, scale, board);
    }

    // 11. Every label, most important first
    board.draw(ctx, scale);

    ctx.restore();

    // 12. Touch magnifier (screen space, on top of everything)
    this.drawLoupe(ctx);
  }
}
