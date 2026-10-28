/**
 * Vastu Mandala Studio — Canvas Viewport & Pure Geometry Rendering Engine
 */

import { distance, findClosestVertex } from './geometry.js';
import {
  addPolygonVertex,
  closePolygon,
  updatePolygonVertex,
  commitDragHistory,
  setHoverVertex,
  setDraggingVertex,
  setCursorWorldPos,
  addCalibrationPoint
} from './state.js';

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
  ctx.strokeStyle = '#e8eaed';
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
  ctx.shadowColor = 'rgba(60, 64, 67, 0.15)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  ctx.drawImage(image.element, 0, 0, image.width, image.height);

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#dadce0';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, image.width, image.height);

  ctx.restore();
};

// Render polygon boundary, vertex handles, and numbers
export const drawPolygon = (ctx, state) => {
  const { polygon, isPolygonClosed, isDrawingPolygon, cursorWorldPos, hoverVertexIndex, draggingVertexIndex, viewport } = state;
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
      ctx.fillStyle = 'rgba(26, 115, 232, 0.08)';
      ctx.fill();

      ctx.strokeStyle = '#1a73e8';
      ctx.lineWidth = lw;
      ctx.setLineDash([]);
      ctx.stroke();
    } else {
      // Drafting mode: draw established segments
      ctx.strokeStyle = '#1a73e8';
      ctx.lineWidth = lw;
      ctx.setLineDash([6 / scale, 4 / scale]);
      ctx.stroke();

      // Rubberband line to current mouse position
      if (isDrawingPolygon && cursorWorldPos) {
        ctx.beginPath();
        ctx.moveTo(polygon[n - 1].x, polygon[n - 1].y);
        ctx.lineTo(cursorWorldPos.x, cursorWorldPos.y);
        ctx.strokeStyle = 'rgba(26, 115, 232, 0.6)';
        ctx.setLineDash([4 / scale, 4 / scale]);
        ctx.stroke();
      }
    }
  }

  // 2. Draw vertex handles and numbered labels
  polygon.forEach((vertex, idx) => {
    const isHovered = hoverVertexIndex === idx;
    const isDragging = draggingVertexIndex === idx;
    const isFirstInDraft = !isPolygonClosed && idx === 0 && n >= 3;

    const baseRadius = 5.5 / scale;
    const radius = (isHovered || isDragging) ? 8 / scale : baseRadius;

    // Outer circle
    ctx.beginPath();
    ctx.arc(vertex.x, vertex.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.lineWidth = 2 / scale;
    ctx.setLineDash([]);
    ctx.strokeStyle = isFirstInDraft ? '#1e8e3e' : (isDragging ? '#1557b0' : '#1a73e8');
    ctx.stroke();

    // Pulse / snap ring for vertex 0 when ready to close
    if (isFirstInDraft && isHovered) {
      ctx.beginPath();
      ctx.arc(vertex.x, vertex.y, radius + 4 / scale, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(30, 142, 62, 0.5)';
      ctx.lineWidth = 1.5 / scale;
      ctx.stroke();
    }

    // Number badge (Google UI style label)
    const fontSize = Math.max(10, Math.min(13, 11 / Math.sqrt(scale)));
    ctx.font = `600 ${fontSize}px Inter, sans-serif`;
    const label = `${idx}`;
    const textWidth = ctx.measureText(label).width;

    const badgeX = vertex.x + 9 / scale;
    const badgeY = vertex.y - 9 / scale;
    const pad = 2 / scale;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(badgeX - pad, badgeY - fontSize + pad, textWidth + pad * 2, fontSize + pad);

    ctx.fillStyle = '#202124';
    ctx.fillText(label, badgeX, badgeY);
  });

  ctx.restore();
};

// Render Centroid Marker (Red Center of Mass Dot)
export const drawCentroidMarker = (ctx, centroid, scale) => {
  if (!centroid) return;

  const r = 5.5 / scale;
  const outerR = 10 / scale;

  ctx.save();

  // Subtle outer pulse circle
  ctx.beginPath();
  ctx.arc(centroid.x, centroid.y, outerR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(217, 48, 37, 0.15)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(217, 48, 37, 0.4)';
  ctx.lineWidth = 1 / scale;
  ctx.stroke();

  // Central red dot
  ctx.beginPath();
  ctx.arc(centroid.x, centroid.y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#d93025';
  ctx.fill();

  // Center white pinpoint
  ctx.beginPath();
  ctx.arc(centroid.x, centroid.y, 1.5 / scale, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Small label badge below centroid
  const fontSize = Math.max(9, Math.min(11, 10 / Math.sqrt(scale)));
  ctx.font = `600 ${fontSize}px Inter, sans-serif`;
  ctx.fillStyle = '#d93025';
  ctx.textAlign = 'center';
  ctx.fillText('Centroid', centroid.x, centroid.y + outerR + fontSize);

  ctx.restore();
};

// Render 9x9 Vastu Purusha Mandala Grid and Brahmasthan
export const draw9x9Grid = (ctx, grid9x9, scale, layers) => {
  if (!grid9x9 || !grid9x9.padas || grid9x9.padas.length === 0) return;

  const showGrid = layers.grid9x9;
  const showBrahmasthan = layers.brahmasthan;

  if (!showGrid && !showBrahmasthan) return;

  ctx.save();

  // 1. Render 9x9 Grid (Thin, clean Google style lines)
  if (showGrid) {
    // A. Outer bounding box of 9x9 matrix
    ctx.beginPath();
    ctx.moveTo(grid9x9.outerBox[0].x, grid9x9.outerBox[0].y);
    ctx.lineTo(grid9x9.outerBox[1].x, grid9x9.outerBox[1].y);
    ctx.lineTo(grid9x9.outerBox[2].x, grid9x9.outerBox[2].y);
    ctx.lineTo(grid9x9.outerBox[3].x, grid9x9.outerBox[3].y);
    ctx.closePath();
    ctx.strokeStyle = '#5f6368';
    ctx.lineWidth = 1.5 / scale;
    ctx.setLineDash([]);
    ctx.stroke();

    // B. Internal 81 padas lines
    ctx.beginPath();
    grid9x9.padas.forEach((pada) => {
      ctx.moveTo(pada.corners[0].x, pada.corners[0].y);
      ctx.lineTo(pada.corners[1].x, pada.corners[1].y);
      ctx.lineTo(pada.corners[2].x, pada.corners[2].y);
      ctx.lineTo(pada.corners[3].x, pada.corners[3].y);
      ctx.closePath();
    });
    ctx.strokeStyle = 'rgba(95, 99, 104, 0.4)';
    ctx.lineWidth = 1 / scale;
    ctx.stroke();
  }

  // 2. Render Brahmasthan (Sacred Central 3x3 Padas)
  if (showBrahmasthan && grid9x9.brahmasthanBox) {
    ctx.beginPath();
    ctx.moveTo(grid9x9.brahmasthanBox[0].x, grid9x9.brahmasthanBox[0].y);
    ctx.lineTo(grid9x9.brahmasthanBox[1].x, grid9x9.brahmasthanBox[1].y);
    ctx.lineTo(grid9x9.brahmasthanBox[2].x, grid9x9.brahmasthanBox[2].y);
    ctx.lineTo(grid9x9.brahmasthanBox[3].x, grid9x9.brahmasthanBox[3].y);
    ctx.closePath();

    // Soft energetic red fill
    ctx.fillStyle = 'rgba(217, 48, 37, 0.12)';
    ctx.fill();

    // Strong red outline
    ctx.strokeStyle = '#d93025';
    ctx.lineWidth = 2.2 / scale;
    ctx.setLineDash([]);
    ctx.stroke();
  }

  ctx.restore();
};

// Render 45 Devtas Overlay (Classical Paramasayika Mandala)
export const draw45Devtas = (ctx, devtaFields, scale, layers, angleDeg = 0) => {
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
        ctx.fillStyle = 'rgba(217, 48, 37, 0.08)';
        ctx.fill();
        ctx.strokeStyle = '#d93025';
        ctx.lineWidth = 2.2 / scale;
        ctx.stroke();
      } else if (devta.category === 'inner_cardinal') {
        // Aryama, Vivaswan, Mitra, Bhudhar
        ctx.fillStyle = 'rgba(26, 115, 232, 0.07)';
        ctx.fill();
        ctx.strokeStyle = '#1a73e8';
        ctx.lineWidth = 1.8 / scale;
        ctx.stroke();
      } else if (devta.category === 'inner_diagonal') {
        // 8 Diagonal Devtas
        ctx.fillStyle = 'rgba(30, 142, 62, 0.06)';
        ctx.fill();
        ctx.strokeStyle = '#1e8e3e';
        ctx.lineWidth = 1.5 / scale;
        ctx.stroke();
      } else {
        // Outer 32 perimeter devtas
        if (devta.isAuspiciousEntrance) {
          ctx.fillStyle = 'rgba(52, 168, 83, 0.12)';
          ctx.fill();
          ctx.strokeStyle = '#34a853';
          ctx.lineWidth = 1.4 / scale;
        } else {
          ctx.fillStyle = 'rgba(241, 243, 244, 0.15)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(95, 99, 104, 0.55)';
          ctx.lineWidth = 1.0 / scale;
        }
        ctx.stroke();
      }
    });

    ctx.restore();
  }

  // 2. Render Devta Labels and Pada Numbers (when Devta Names is active)
  if (showNames) {
    ctx.save();

    devtaFields.forEach((devta) => {
      if (!devta.center) return;

      const padW = devta.padWidth || 50;
      const padH = devta.padHeight || 50;
      const cellDim = Math.min(padW, padH);

      // Compute responsive font sizes in world units, clamped to legible screen pixel limits
      const isLargeDevta = devta.category === 'central' || devta.category === 'inner_cardinal';
      const baseRatio = isLargeDevta ? 0.22 : 0.16;

      const rawTitlePx = cellDim * baseRatio * scale;
      const clampedTitlePx = Math.max(9, Math.min(15, rawTitlePx));
      const titleFontSize = clampedTitlePx / scale;

      const clampedSubPx = Math.max(7.5, Math.min(11, clampedTitlePx * 0.75));
      const subFontSize = clampedSubPx / scale;

      // Position and rotate in local Devta space
      ctx.save();
      ctx.translate(devta.center.x, devta.center.y);
      ctx.rotate(angleRad);

      const titleText = devta.name;
      const subText = devta.entranceCode
        ? `#${devta.number} (${devta.entranceCode})`
        : `#${devta.number}`;

      // Measure text for background pill halo
      ctx.font = `600 ${titleFontSize}px Inter, sans-serif`;
      const titleWidth = ctx.measureText(titleText).width;

      ctx.font = `400 ${subFontSize}px Inter, sans-serif`;
      const subWidth = ctx.measureText(subText).width;

      const maxWidth = Math.max(titleWidth, subWidth);
      const pillPadX = 4 / scale;
      const pillPadY = 2 / scale;
      const pillW = maxWidth + pillPadX * 2;
      const pillH = titleFontSize + subFontSize + pillPadY * 2.5;

      // Draw background pill for high contrast against drawing / grid
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.fillRect(-pillW / 2, -pillH / 2, pillW, pillH);

      ctx.strokeStyle = devta.isAuspiciousEntrance
        ? 'rgba(52, 168, 83, 0.6)'
        : (devta.category === 'central' ? 'rgba(217, 48, 37, 0.5)' : 'rgba(0, 0, 0, 0.12)');
      ctx.lineWidth = 1 / scale;
      ctx.strokeRect(-pillW / 2, -pillH / 2, pillW, pillH);

      // Render Title (Devta Name)
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${titleFontSize}px Inter, sans-serif`;
      ctx.fillStyle = devta.category === 'central'
        ? '#d93025'
        : (devta.isAuspiciousEntrance ? '#137333' : '#202124');
      ctx.fillText(titleText, 0, -subFontSize / 2);

      // Render Subtitle (Number / Entrance Code)
      ctx.font = `500 ${subFontSize}px Inter, sans-serif`;
      ctx.fillStyle = devta.isAuspiciousEntrance ? '#188038' : '#5f6368';
      ctx.fillText(subText, 0, titleFontSize / 2 + 1 / scale);

      ctx.restore();
    });

    ctx.restore();
  }
};

// Render 16 Directional Zones (22.5° rays, sector fills, directional badges)
export const draw16Zones = (ctx, zones16, scale, layers) => {
  if (!zones16 || !zones16.zones || zones16.zones.length === 0) return;
  if (!layers.zones16 && !layers.elements) return;

  const { centroid, radius, zones } = zones16;

  ctx.save();

  // 1. Sector Fills (Translucent Elemental Tinting)
  zones.forEach((z) => {
    ctx.beginPath();
    ctx.moveTo(centroid.x, centroid.y);
    ctx.arc(centroid.x, centroid.y, radius, z.startRad, z.endRad, false);
    ctx.closePath();
    ctx.fillStyle = z.bgTint;
    ctx.fill();
  });

  // 2. Outer Perimeter Circle
  ctx.beginPath();
  ctx.arc(centroid.x, centroid.y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(95, 99, 104, 0.35)';
  ctx.lineWidth = 1 / scale;
  ctx.setLineDash([]);
  ctx.stroke();

  // 3. 16 Boundary Rays
  ctx.beginPath();
  zones.forEach((z) => {
    ctx.moveTo(centroid.x, centroid.y);
    ctx.lineTo(z.rayEnd.x, z.rayEnd.y);
  });
  ctx.strokeStyle = 'rgba(95, 99, 104, 0.45)';
  ctx.lineWidth = 1 / scale;
  ctx.setLineDash([4 / scale, 3 / scale]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 4. Directional Zone Labels (N, NNE, NE, etc.)
  const fontSizePx = Math.max(9, Math.min(13, 11 / Math.sqrt(scale)));
  const fontSizeWorld = fontSizePx / scale;

  zones.forEach((z) => {
    ctx.save();
    ctx.translate(z.labelPos.x, z.labelPos.y);

    const labelText = z.short;
    ctx.font = `600 ${fontSizeWorld}px Inter, sans-serif`;
    const textW = ctx.measureText(labelText).width;
    const padX = 4 / scale;
    const padY = 2 / scale;
    const pillW = textW + padX * 2;
    const pillH = fontSizeWorld + padY * 2;

    // Pill background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(-pillW / 2, -pillH / 2, pillW, pillH);

    ctx.strokeStyle = z.color;
    ctx.lineWidth = 1 / scale;
    ctx.strokeRect(-pillW / 2, -pillH / 2, pillW, pillH);

    // Label text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = z.color;
    ctx.fillText(labelText, 0, 0);

    ctx.restore();
  });

  ctx.restore();
};

// Render 32 Perimeter Entrance Gates (N1-N8, E1-E8, S1-S8, W1-W8) & Auspicious Highlights
export const draw32EntranceGates = (ctx, entranceGates32, scale, layers, angleDeg = 0) => {
  if (!entranceGates32 || entranceGates32.length === 0) return;
  if (!layers.gates32) return;

  const angleRad = (angleDeg * Math.PI) / 180;

  ctx.save();

  // Helper for clean rounded badge (Google UI minimal 2-3px radius)
  const drawPill = (x, y, w, h, r) => {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
  };

  // Trace a gate's stretch of the real plot boundary
  const traceGatePath = (gate) => {
    const path = gate.path && gate.path.length >= 2 ? gate.path : [gate.outerEdgeStart, gate.outerEdgeEnd];
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    path.slice(1).forEach((pt) => ctx.lineTo(pt.x, pt.y));
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

  // 2. Draw Entrance Gate Badges just outside the polygon boundary
  const fontSizePx = Math.max(9, Math.min(13, 11 / Math.sqrt(scale)));
  const fontSizeWorld = fontSizePx / scale;
  const offsetDist = 16 / scale;

  entranceGates32.forEach((gate) => {
    if (!gate.edgeMidpoint) return;

    const normal = gate.normal || { x: 0, y: -1 };
    const labelX = gate.edgeMidpoint.x + normal.x * offsetDist;
    const labelY = gate.edgeMidpoint.y + normal.y * offsetDist;

    ctx.save();
    ctx.translate(labelX, labelY);
    ctx.rotate(angleRad);

    const badgeText = gate.isAuspicious ? `★ ${gate.code}` : gate.code;

    ctx.font = `600 ${fontSizeWorld}px Inter, sans-serif`;
    const textW = ctx.measureText(badgeText).width;
    const padX = 5 / scale;
    const padY = 2.5 / scale;
    const pillW = textW + padX * 2;
    const pillH = fontSizeWorld + padY * 2;
    const pillR = 3 / scale;

    if (gate.isAuspicious) {
      // Bold green badge for auspicious entrances
      drawPill(-pillW / 2, -pillH / 2, pillW, pillH, pillR);
      ctx.fillStyle = '#1e8e3e';
      ctx.fill();

      ctx.strokeStyle = '#137333';
      ctx.lineWidth = 1 / scale;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(badgeText, 0, 0);
    } else {
      // Clean neutral white/gray badge for regular entrances
      drawPill(-pillW / 2, -pillH / 2, pillW, pillH, pillR);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fill();

      ctx.strokeStyle = '#dadce0';
      ctx.lineWidth = 1 / scale;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#3c4043';
      ctx.fillText(badgeText, 0, 0);
    }

    ctx.restore();
  });

  ctx.restore();
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
    ctx.moveTo(line.start.x, line.start.y);
    ctx.lineTo(line.end.x, line.end.y);
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
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);

    this.render(this.store.getState());
  }

  initEventListeners() {
    // Window and container resize observer
    const resizeObserver = new ResizeObserver(() => this.handleResize());
    resizeObserver.observe(this.canvas.parentElement);

    // Mouse Pan, Vertex Drag, and Polygon Drafting
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('dblclick', (e) => this.onDblClick(e));
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
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

    // 2. Normal mode: Check for vertex handle grab
    if (state.polygon.length > 0 && e.button === 0) {
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
      const nextX = e.clientX - state.viewport.dragStartX;
      const nextY = e.clientY - state.viewport.dragStartY;

      this.store.setState((prev) => ({
        ...prev,
        viewport: {
          ...prev.viewport,
          x: nextX,
          y: nextY
        }
      }));
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
    if (state.polygon.length > 0) {
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
    }
  }

  onWheel(e) {
    e.preventDefault();
    const state = this.store.getState();
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const currentScale = state.viewport.scale;
    const newScale = Math.min(Math.max(0.1, currentScale * zoomFactor), 15);

    if (newScale === currentScale) return;

    // Zoom anchored at cursor position
    const newX = mouseX - (mouseX - state.viewport.x) * (newScale / currentScale);
    const newY = mouseY - (mouseY - state.viewport.y) * (newScale / currentScale);

    this.store.setState((prev) => ({
      ...prev,
      viewport: {
        ...prev.viewport,
        x: newX,
        y: newY,
        scale: newScale
      }
    }));
  }

  zoomBy(factor) {
    const state = this.store.getState();
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const currentScale = state.viewport.scale;
    const newScale = Math.min(Math.max(0.1, currentScale * factor), 15);

    const newX = centerX - (centerX - state.viewport.x) * (newScale / currentScale);
    const newY = centerY - (centerY - state.viewport.y) * (newScale / currentScale);

    this.store.setState((prev) => ({
      ...prev,
      viewport: {
        ...prev.viewport,
        x: newX,
        y: newY,
        scale: newScale
      }
    }));
  }

  fitToView() {
    const state = this.store.getState();
    let contentW = 800;
    let contentH = 600;

    if (state.image) {
      contentW = state.image.width;
      contentH = state.image.height;
    } else if (state.metrics.bounds) {
      contentW = state.metrics.bounds.width || 800;
      contentH = state.metrics.bounds.height || 600;
    }

    const newViewport = computeFitViewport(contentW, contentH, this.width, this.height, 40);
    this.store.setState((prev) => ({
      ...prev,
      viewport: {
        ...prev.viewport,
        ...newViewport
      }
    }));
  }

  render(state) {
    const { ctx, width, height } = this;
    if (!ctx || !width || !height) return;

    // 1. Clear viewport
    ctx.clearRect(0, 0, width, height);

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

    // 5. Render 16 Directional Zones Overlay (Sector fills, 22.5° rays, zone labels)
    if (state.metrics.zones16) {
      draw16Zones(ctx, state.metrics.zones16, state.viewport.scale, state.layers);
    }

    // 6. Render 9x9 Vastu grid & Brahmasthan overlay
    if (state.metrics.grid9x9) {
      draw9x9Grid(ctx, state.metrics.grid9x9, state.viewport.scale, state.layers);
    }

    // 7. Render 45 Devtas Overlay & Labels
    if (state.metrics.devtaFields) {
      draw45Devtas(ctx, state.metrics.devtaFields, state.viewport.scale, state.layers, state.metrics.gridAngle);
    }

    // 8. Render 32 Perimeter Entrance Gates & Auspicious Highlights
    if (state.metrics.entranceGates32) {
      draw32EntranceGates(ctx, state.metrics.entranceGates32, state.viewport.scale, state.layers, state.rotation);
    }

    // 9. Render Marma Sthan (Diagonal Energy Lines & Intersection Nodes)
    if (state.metrics.marmaSthan) {
      drawMarmaSthan(ctx, state.metrics.marmaSthan, state.viewport.scale, state.layers);
    }

    // 10. Render property boundary polygon & vertex handles
    drawPolygon(ctx, state);
    drawCalibration(ctx, state);

    // 10. Render geometric centroid marker
    if (state.metrics.centroid) {
      drawCentroidMarker(ctx, state.metrics.centroid, state.viewport.scale);
    }

    ctx.restore();
  }
}
