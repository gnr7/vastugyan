/**
 * Vastu Gyan — Simple view
 * One plain page on the same engine as the full app: add a plan, turn or crop it, mark the boundary,
 * then switch the charts on and off. It shares the saved project with the full app.
 */

import {
  createStore,
  createInitialState,
  setFloorPlanImage,
  setRotation,
  toggleLayer,
  setDrawingMode,
  closePolygon,
  clearBoundary,
  resetAll,
  undoAction,
  redoAction,
  setCalibrationMode,
  applyCalibration,
  restoreProject,
  setChakraSize,
  commitRotationHistory
} from './state.js';
import { CanvasController, refreshTheme } from './canvas.js';
import { calculateAreaMetrics, calculatePositiveLandEnergy, calculate16BarChart, formatArea, formatLength } from './analysis.js';
import { draw16BarChart } from './barchart.js';
import { exportCanvasToPng, generatePdfReport } from './export.js';
import { loadProject, clearProject, startAutosave } from './persist.js';

document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const store = createStore(createInitialState());
  refreshTheme();
  const canvasController = new CanvasController($('planCanvas'), store);

  let currentImageBlob = null; // the plan as used (after any turn or crop), kept for autosave
  let restoring = false;       // no step-by-step messages while a saved project loads
  let drawnHere = false;       // a boundary marked on this page opens with only 16 Directions on
  let showBarChart = false;

  const showToast = (message) => {
    const el = document.createElement('div');
    el.className = 's-toast';
    el.textContent = message;
    $('toastStack').appendChild(el);
    setTimeout(() => el.remove(), 3400);
  };
  const announceExport = (outcome) => {
    if (outcome === 'downloaded') showToast('Saved to your downloads');
  };

  // ---------- The three steps of the page ----------
  const steps = { upload: $('stepUpload'), preview: $('stepPreview'), work: $('stepWork') };
  const showStep = (name) => {
    Object.entries(steps).forEach(([key, el]) => { el.hidden = key !== name; });
    window.scrollTo(0, 0);
    if (name === 'work') {
      // The canvas only has a size once its step is showing
      requestAnimationFrame(() => {
        canvasController.handleResize();
        canvasController.fitToView();
      });
    }
  };

  const setPlanLabel = (name, url) => {
    $('planName').textContent = name || 'Blank page';
    $('planThumb').hidden = !url;
    if (url) $('planThumb').src = url;
  };

  const loadPlan = (blob, name) => new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      currentImageBlob = blob;
      store.setState(setFloorPlanImage(img, { name, size: blob.size }));
      setPlanLabel(name, url);
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = url;
  });

  // ---------- 1. Choose a plan ----------
  const fileInput = $('fileInput');
  const dropZone = $('dropZone');
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) openPreview(e.target.files[0]);
    e.target.value = '';
  });
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('is-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('is-over');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) openPreview(e.dataTransfer.files[0]);
  });

  $('btnBlank').addEventListener('click', () => {
    setPlanLabel('Blank page', null);
    drawnHere = true;
    showStep('work');
    store.setState(setDrawingMode(true));
  });

  // ---------- 2. Turn or crop before starting ----------
  const previewCanvas = $('previewCanvas');
  const preview = { file: null, work: null, degrees: 0, changed: false, cropping: false, rect: null, start: null, scale: 1 };

  const imageToCanvas = (img) => {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || img.width;
    c.height = img.naturalHeight || img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    return c;
  };

  const drawPreview = () => {
    const work = preview.work;
    if (!work || steps.preview.hidden) return;
    const box = previewCanvas.parentElement.getBoundingClientRect();
    const k = Math.min(box.width / work.width, box.height / work.height);
    const dpr = window.devicePixelRatio || 1;
    previewCanvas.style.width = `${work.width * k}px`;
    previewCanvas.style.height = `${work.height * k}px`;
    previewCanvas.width = Math.max(1, Math.round(work.width * k * dpr));
    previewCanvas.height = Math.max(1, Math.round(work.height * k * dpr));
    const ctx = previewCanvas.getContext('2d');
    ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
    ctx.drawImage(work, 0, 0);
    const r = preview.rect;
    if (preview.cropping && r && r.w > 0 && r.h > 0) {
      // Dim everything outside the part being kept
      ctx.beginPath();
      ctx.rect(0, 0, work.width, work.height);
      ctx.rect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = 'rgba(17, 24, 39, 0.5)';
      ctx.fill('evenodd');
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 2 / k;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
    preview.scale = k;
  };

  const setCropping = (on) => {
    preview.cropping = on;
    preview.rect = null;
    previewCanvas.classList.toggle('is-cropping', on);
    $('previewTools').hidden = on;
    $('previewActions').hidden = on;
    $('cropTools').hidden = !on;
    $('btnCropApply').disabled = true;
    $('previewTitle').textContent = on ? 'Drag over the part of the plan you want to keep' : 'Check the plan before you start';
    drawPreview();
  };

  function openPreview(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Choose a PNG, JPG or WebP image');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      Object.assign(preview, { file, work: imageToCanvas(img), degrees: 0, changed: false });
      $('previewDeg').textContent = '0°';
      showStep('preview');
      setCropping(false);
      requestAnimationFrame(drawPreview);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      showToast("That image couldn't be opened. Try another file.");
    };
    img.src = url;
  }

  $('btnRotate90').addEventListener('click', () => {
    const w = preview.work;
    const c = document.createElement('canvas');
    c.width = w.height;
    c.height = w.width;
    const ctx = c.getContext('2d');
    ctx.translate(c.width, 0);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(w, 0, 0);
    preview.work = c;
    preview.degrees = (preview.degrees + 90) % 360;
    preview.changed = true;
    $('previewDeg').textContent = `${preview.degrees}°`;
    drawPreview();
  });

  $('btnCrop').addEventListener('click', () => setCropping(true));
  $('btnCropCancel').addEventListener('click', () => setCropping(false));
  $('btnCropApply').addEventListener('click', () => {
    const r = preview.rect;
    if (!r || r.w < 8 || r.h < 8) return;
    const c = document.createElement('canvas');
    c.width = Math.round(r.w);
    c.height = Math.round(r.h);
    c.getContext('2d').drawImage(preview.work, Math.round(r.x), Math.round(r.y), c.width, c.height, 0, 0, c.width, c.height);
    preview.work = c;
    preview.changed = true;
    setCropping(false);
  });

  // Crop by dragging a box over the preview (works with mouse, pen and finger)
  const imagePoint = (e) => {
    const box = previewCanvas.getBoundingClientRect();
    const w = preview.work.width;
    const h = preview.work.height;
    return {
      x: Math.min(w, Math.max(0, (e.clientX - box.left) / preview.scale)),
      y: Math.min(h, Math.max(0, (e.clientY - box.top) / preview.scale))
    };
  };
  previewCanvas.addEventListener('pointerdown', (e) => {
    if (!preview.cropping) return;
    try {
      previewCanvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    preview.start = imagePoint(e);
    preview.rect = { ...preview.start, w: 0, h: 0 };
  });
  previewCanvas.addEventListener('pointermove', (e) => {
    if (!preview.cropping || !preview.start) return;
    const p = imagePoint(e);
    const s = preview.start;
    preview.rect = { x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) };
    drawPreview();
  });
  const endCropDrag = () => {
    if (!preview.start) return;
    preview.start = null;
    const r = preview.rect;
    $('btnCropApply').disabled = !(r && r.w >= 8 && r.h >= 8);
  };
  previewCanvas.addEventListener('pointerup', endCropDrag);
  previewCanvas.addEventListener('pointercancel', endCropDrag);
  window.addEventListener('resize', drawPreview);

  $('btnPreviewCancel').addEventListener('click', () => {
    preview.work = null;
    showStep('upload');
  });

  $('btnPreviewUse').addEventListener('click', async () => {
    const { file } = preview;
    let blob = file;
    if (preview.changed) {
      const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
      blob = await new Promise((resolve) => preview.work.toBlob(resolve, type, 0.92));
    }
    // A new plan is a new project: no boundary, North or scale carried over from the last one
    store.setState(resetAll());
    const ok = await loadPlan(blob, file.name);
    if (!ok) {
      showToast("That image couldn't be opened. Try another file.");
      return;
    }
    preview.work = null;
    drawnHere = true;
    showStep('work');
    showToast('Plan added. Press Draw Polygon to mark the boundary.');
  });

  // ---------- 3. Mark the boundary ----------
  $('btnDraw').addEventListener('click', () => {
    const state = store.getState();
    if (state.isDrawingPolygon) {
      store.setState(setDrawingMode(false));
      return;
    }
    // Drawing again replaces the old boundary (Undo brings it back)
    if (state.polygon.length > 0) store.setState(clearBoundary());
    drawnHere = true;
    store.setState(setDrawingMode(true));
  });
  $('btnFinish').addEventListener('click', () => {
    if (store.getState().polygon.length >= 3) store.setState(closePolygon());
  });
  $('btnUndo').addEventListener('click', () => store.setState(undoAction()));
  $('btnRedo').addEventListener('click', () => store.setState(redoAction()));
  $('btnClear').addEventListener('click', () => store.setState(clearBoundary()));

  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      store.setState(e.shiftKey ? redoAction() : undoAction());
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      store.setState(redoAction());
    }
  });

  // Image size: zoom around the plan, shown as a share of the fitted size
  $('btnZoomIn').addEventListener('click', () => canvasController.zoomBy(1.2));
  $('btnZoomOut').addEventListener('click', () => canvasController.zoomBy(0.8));
  $('btnZoomReset').addEventListener('click', () => canvasController.fitToView());

  // Start again with another plan
  $('btnStartOver').addEventListener('click', () => {
    if (!window.confirm('Remove this plan and start again?')) return;
    currentImageBlob = null;
    drawnHere = false;
    showBarChart = false;
    $('toggleBarChart').checked = false;
    clearProject();
    store.setState(resetAll());
    setPlanLabel('Blank page', null);
    showStep('upload');
  });

  // ---------- Exports ----------
  $('btnPng').addEventListener('click', () => {
    exportCanvasToPng(canvasController.snapshot()).then(announceExport);
  });
  const pdfModal = $('pdfModal');
  $('btnPdf').addEventListener('click', () => {
    pdfModal.hidden = false;
    setTimeout(() => $('pdfName').focus(), 50);
  });
  $('btnPdfCancel').addEventListener('click', () => { pdfModal.hidden = true; });
  pdfModal.addEventListener('click', (e) => {
    if (e.target === pdfModal) pdfModal.hidden = true;
  });
  $('btnPdfMake').addEventListener('click', async () => {
    const clientInfo = {
      name: $('pdfName').value.trim(),
      phone: $('pdfPhone').value.trim(),
      address: $('pdfAddress').value.trim()
    };
    pdfModal.hidden = true;
    showToast('Making the PDF report…');
    announceExport(await generatePdfReport(canvasController.snapshot(), store.getState(), '', clientInfo));
  });

  // ---------- Area Analysis and scale ----------
  $('toggleAreaAnalysis').addEventListener('change', (e) => { $('areaPanel').hidden = !e.target.checked; });

  const scaleModal = $('scaleModal');
  const cancelScale = () => {
    scaleModal.hidden = true;
    store.setState(setCalibrationMode(false));
  };
  const applyScale = () => {
    const length = parseFloat($('scaleLength').value);
    if (!(length > 0)) {
      $('scaleLength').focus();
      return;
    }
    scaleModal.hidden = true;
    store.setState(applyCalibration(length, $('scaleUnit').value));
  };
  $('btnSetScale').addEventListener('click', () => {
    store.setState(setCalibrationMode(true));
    $('stage').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $('btnScaleCancel').addEventListener('click', cancelScale);
  $('btnScaleModalCancel').addEventListener('click', cancelScale);
  $('btnScaleModalApply').addEventListener('click', applyScale);
  $('scaleLength').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyScale();
    if (e.key === 'Escape') cancelScale();
  });

  // ---------- Universal Rotation ----------
  const rotationSlider = $('rotationSlider');
  const rotationNumber = $('rotationNumber');
  let rotationAtStart = null;
  const beginRotation = () => {
    if (rotationAtStart === null) rotationAtStart = store.getState().rotation;
  };
  const endRotation = () => {
    if (rotationAtStart !== null) store.setState(commitRotationHistory(rotationAtStart));
    rotationAtStart = null;
  };
  [rotationSlider, rotationNumber].forEach((input) => {
    input.addEventListener('pointerdown', beginRotation);
    input.addEventListener('focus', beginRotation);
    input.addEventListener('change', endRotation);
    input.addEventListener('input', (e) => {
      beginRotation();
      store.setState(setRotation(parseFloat(e.target.value) || 0));
    });
  });
  const nudge = (deg) => {
    const before = store.getState().rotation;
    store.setState(setRotation(before + deg));
    store.setState(commitRotationHistory(before));
  };
  $('btnRotMinus').addEventListener('click', () => nudge(-1));
  $('btnRotPlus').addEventListener('click', () => nudge(1));
  $('btnRotReset').addEventListener('click', () => nudge(-store.getState().rotation));

  // ---------- Chart switches ----------
  const layerInputs = [...document.querySelectorAll('[data-layer]')];
  layerInputs.forEach((input) => {
    input.addEventListener('change', () => {
      store.setState(toggleLayer(input.dataset.layer, input.checked));
      // The chakra sits outside the plot, so make room for it (and give the room back)
      if (input.dataset.layer === 'shaktiChakra') canvasController.fitToView();
    });
  });
  const chakraButtons = [...document.querySelectorAll('[data-chakra-size]')];
  chakraButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      store.setState(setChakraSize(Number(btn.dataset.chakraSize)));
      canvasController.fitToView();
    });
  });
  $('toggleBarChart').addEventListener('change', (e) => {
    showBarChart = e.target.checked;
    sync(store.getState());
    if (showBarChart) $('barChartCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // ---------- Keep the page in step with the plan ----------
  let lastState = store.getState();
  const sync = (state) => {
    const drawing = state.isDrawingPolygon;
    const closed = state.isPolygonClosed;
    const corners = state.polygon.length;

    $('btnDrawLabel').textContent = drawing ? 'Drawing…' : 'Draw Polygon';
    $('btnDraw').classList.toggle('is-busy', drawing);
    $('btnDraw').title = drawing ? 'Stop marking the boundary' : 'Mark the outer corners of the plot';
    $('btnFinish').hidden = !drawing;
    $('btnFinishLabel').textContent = `Finish (${corners})`;
    $('btnFinish').disabled = corners < 3;
    $('btnUndo').hidden = !drawing;
    $('btnRedo').hidden = !drawing;
    $('btnUndo').disabled = (state.history?.past?.length || 0) === 0;
    $('btnRedo').disabled = (state.history?.future?.length || 0) === 0;
    $('btnPng').disabled = drawing || !closed;
    $('btnPdf').disabled = drawing || !closed;
    $('btnClear').disabled = corners === 0;

    $('drawHint').hidden = !drawing;
    $('scaleHint').hidden = !(state.isCalibrating && state.calibrationPoints.length < 2);
    $('crossHint').hidden = state.metrics.boundaryError !== 'self-intersecting';

    const fitted = canvasController.fittedViewport;
    $('zoomPct').textContent = `${Math.round((fitted ? state.viewport.scale / fitted.scale : 1) * 100)}%`;

    // Charts appear once there is a closed boundary
    $('drawFirst').hidden = closed;
    $('chartControls').hidden = !closed;

    const deg = Math.round(state.rotation * 10) / 10;
    $('rotationBadge').textContent = `${deg}°`;
    if (document.activeElement !== rotationSlider) rotationSlider.value = state.rotation;
    if (document.activeElement !== rotationNumber) rotationNumber.value = deg;

    layerInputs.forEach((input) => {
      const on = !!state.layers[input.dataset.layer];
      if (input.checked !== on) input.checked = on;
    });
    $('chakraSizes').hidden = !state.layers.shaktiChakra;
    chakraButtons.forEach((btn) => btn.classList.toggle('is-on', Number(btn.dataset.chakraSize) === state.chakraSize));

    $('barChartCard').hidden = !(showBarChart && closed);
    if (showBarChart && closed) draw16BarChart($('barChartCanvas'), calculate16BarChart(state.metrics.zones16, state.elementStyle));

    // Area Analysis
    const cal = state.calibration;
    const area = calculateAreaMetrics(state.metrics);
    const land = calculatePositiveLandEnergy(state.metrics, cal, state.landDims);
    const grid = state.metrics.grid9x9;
    $('valArea').textContent = area.hasClosedPlot ? formatArea(area.plotArea, cal) : '—';
    $('valBrahma').textContent = area.gridArea > 0 ? `${formatArea(area.brahmasthanArea, cal)} (${area.brahmasthanRatioPct}%)` : '—';
    $('valGrid').textContent = grid ? `${formatLength(grid.totalWidth, cal)} × ${formatLength(grid.totalHeight, cal)}` : '—';
    $('valLand').textContent = land.isActive
      ? ({ RECOMMENDED: 'Recommended', MODERATE: 'Conditional', CAUTION: 'Remedies needed' }[land.verdict.code] || '—')
      : (area.hasClosedPlot ? 'Needs scale' : '—');
    $('valScale').textContent = cal
      ? `Scale set: ${cal.realLength} ${cal.unit} wall`
      : 'Scale not set, so sizes are in image pixels.';
    $('valScale').classList.toggle('is-set', !!cal);

    // The real length of the marked wall, once both ends are tapped
    if (state.isCalibrating && state.calibrationPoints.length === 2 && scaleModal.hidden) {
      const [a, b] = state.calibrationPoints;
      $('scaleModalSub').textContent = `Type the real length of the line you marked (${Math.round(Math.hypot(b.x - a.x, b.y - a.y))} px on the plan).`;
      if (cal) $('scaleUnit').value = cal.unit;
      $('scaleLength').value = '';
      scaleModal.hidden = false;
      setTimeout(() => $('scaleLength').focus(), 50);
    }

    // A boundary just finished on this page: start with 16 Directions only, as a plain reading
    if (!restoring && closed && !lastState.isPolygonClosed && drawnHere) {
      drawnHere = false;
      queueMicrotask(() => {
        Object.keys(store.getState().layers).forEach((key) => store.setState(toggleLayer(key, key === 'zones16')));
        canvasController.fitToView();
        showToast('Boundary marked. Turn the charts on and off with the switches.');
      });
    }
    if (!restoring && cal && cal !== lastState.calibration) showToast(`Scale set: ${cal.realLength} ${cal.unit}`);
    lastState = state;
  };
  store.subscribe(sync);
  sync(store.getState());

  // ---------- Open the last project, then keep saving it ----------
  loadProject().then(async (saved) => {
    const hasSaved = saved && ((saved.polygon && saved.polygon.length) || saved.imageBlob || saved.calibration);
    if (hasSaved) {
      restoring = true;
      if (saved.imageBlob) await loadPlan(saved.imageBlob, saved.imageName || 'Floor plan');
      else setPlanLabel('Blank page', null);
      store.setState(restoreProject(saved));
      showBarChart = false;
      restoring = false;
      showStep('work');
      showToast('Your last plan is back');
    } else {
      showStep('upload');
    }
    startAutosave(store, () => currentImageBlob);
  });

  // Offline support (only over http/https, not file://)
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Offline support unavailable:', err));
  }
});
