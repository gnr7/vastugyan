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
  setPolygonLocked,
  setMandalaShape,
  setGridAlign,
  setElementStyle,
  setLandDimensions,
  applyView,
  currentView,
  commitRotationHistory
} from './state.js';
import { ELEMENT_STYLES } from './zones.js';
import { CanvasController, refreshTheme } from './canvas.js';
import {
  calculateAreaMetrics,
  calculatePositiveLandEnergy,
  calculatePanchTatvaSummary,
  calculateVithiSummary,
  calculate16BarChart,
  formatArea,
  formatLength
} from './analysis.js';
import { draw16BarChart } from './barchart.js';
import { exportCanvasToPng, generatePdfReport, deliverFile } from './export.js';
import { loadProject, clearProject, startAutosave } from './persist.js';

// What each Vithi ring suits, from the centre out (same wording as the full app)
const VITHI_USE = {
  brahma: 'The sacred centre. Keep it open and light, free of pillars, walls, toilets and heavy loads.',
  daivika: 'Ring of the devas. Suits prayer, quiet sitting and light, open use.',
  manushya: 'Ring of people. The natural place for living, dining, bedrooms and daily life.',
  paishachika: 'The outer ring. Traditionally for boundary walls, storage, stairs and service rooms.'
};

document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const store = createStore(createInitialState());
  refreshTheme();
  const canvasController = new CanvasController($('planCanvas'), store);

  // Light unless dark was chosen; the choice is shared with the full app
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  const applyTheme = (theme) => {
    const dark = theme === 'dark';
    if (dark) document.documentElement.dataset.theme = 'dark';
    else delete document.documentElement.dataset.theme;
    if (themeColorMeta) themeColorMeta.content = dark ? '#0F141B' : '#F4F6F9';
    $('btnTheme').querySelector('use').setAttribute('href', dark ? '#s-sun' : '#s-moon');
    $('btnTheme').title = dark ? 'Light mode' : 'Dark mode';
    $('btnTheme').setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    refreshTheme();
    canvasController.render(store.getState());
  };
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  $('btnTheme').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('vg-theme', next);
    } catch {
      /* private mode: the choice just isn't remembered */
    }
    applyTheme(next);
  });

  let currentImageBlob = null; // the plan as used (after any turn or crop), kept for autosave
  let restoring = false;       // no step-by-step messages while a saved project loads
  let drawnHere = false;       // a boundary marked on this page opens with only 16 Zones on
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
  const cameraInput = $('cameraInput');
  const dropZone = $('dropZone');
  dropZone.addEventListener('click', () => fileInput.click());
  $('btnNewPlan').addEventListener('click', () => fileInput.click());
  document.querySelectorAll('[data-action="camera"]').forEach((b) => b.addEventListener('click', () => cameraInput.click()));
  [fileInput, cameraInput].forEach((input) => input.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) openPreview(e.target.files[0]);
    e.target.value = '';
  }));
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

  const stageBox = $('stage');
  stageBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    stageBox.classList.add('is-over');
  });
  stageBox.addEventListener('dragleave', () => stageBox.classList.remove('is-over'));
  stageBox.addEventListener('drop', (e) => {
    e.preventDefault();
    stageBox.classList.remove('is-over');
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
  const preview = { file: null, work: null, degrees: 0, changed: false, cropping: false, rect: null, start: null, scale: 1, from: 'upload' };

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
      // A plan chosen from the work screen replaces the current one, so Cancel goes back there
      const from = steps.work.hidden ? 'upload' : 'work';
      Object.assign(preview, { file, work: imageToCanvas(img), degrees: 0, changed: false, from });
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
    showStep(preview.from);
  });

  $('btnPreviewUse').addEventListener('click', async () => {
    const { file } = preview;
    const current = store.getState();
    if (preview.from === 'work' && (current.polygon.length > 0 || current.image)
      && !window.confirm('Use this as a new plan? The current plan and its boundary will be replaced.')) return;
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
  // Edit Polygon unlocks a finished boundary's corners; Finish Polygon locks them again
  $('btnEditPoly').addEventListener('click', () => {
    const state = store.getState();
    store.setState(setPolygonLocked(!state.isPolygonLocked));
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
  const startOver = () => {
    if (!window.confirm('Remove this plan and start again?')) return;
    currentImageBlob = null;
    drawnHere = false;
    showBarChart = false;
    $('toggleBarChart').checked = false;
    clearProject();
    store.setState(resetAll());
    setPlanLabel('Blank page', null);
    showStep('upload');
  };
  $('btnStartOver').addEventListener('click', startOver);
  $('btnStartOverFull').addEventListener('click', startOver);

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
  const startScale = () => {
    store.setState(setCalibrationMode(true));
    $('stage').scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  $('btnSetScale').addEventListener('click', startScale);
  $('btnScaleTool').addEventListener('click', () => {
    if (store.getState().isCalibrating) cancelScale();
    else startScale();
  });
  $('btnScaleCancel').addEventListener('click', cancelScale);
  $('btnScaleModalCancel').addEventListener('click', cancelScale);
  $('btnScaleModalApply').addEventListener('click', applyScale);
  $('scaleLength').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyScale();
    if (e.key === 'Escape') cancelScale();
  });

  // ---------- Land energy: plot size from the documents ----------
  const landModal = $('landModal');
  const closeLand = () => { landModal.hidden = true; };
  $('btnLandDims').addEventListener('click', () => {
    const st = store.getState();
    const land = calculatePositiveLandEnergy(st.metrics, st.calibration, st.landDims);
    $('landLength').value = st.landDims ? st.landDims.length : (land.isActive ? land.length : '');
    $('landBreadth').value = st.landDims ? st.landDims.breadth : (land.isActive ? land.breadth : '');
    landModal.hidden = false;
    setTimeout(() => $('landLength').focus(), 50);
  });
  $('btnLandCancel').addEventListener('click', closeLand);
  $('btnLandMeasured').addEventListener('click', () => {
    store.setState(setLandDimensions(null));
    closeLand();
  });
  $('btnLandApply').addEventListener('click', () => {
    const length = parseFloat($('landLength').value);
    const breadth = parseFloat($('landBreadth').value);
    if (!(length > 0) || !(breadth > 0)) {
      (length > 0 ? $('landBreadth') : $('landLength')).focus();
      return;
    }
    store.setState(setLandDimensions({ length, breadth }));
    closeLand();
  });

  // Fold-open sections remember whether they were open (only on this device)
  const OPEN_KEY = 'vg-simple-open';
  let openPanels = {};
  try {
    openPanels = JSON.parse(localStorage.getItem(OPEN_KEY) || '{}') || {};
  } catch {
    openPanels = {};
  }
  document.querySelectorAll('[data-opens]').forEach((box) => {
    const panel = $(box.dataset.opens);
    box.checked = !!openPanels[box.dataset.opens];
    panel.hidden = !box.checked;
    box.addEventListener('change', () => {
      panel.hidden = !box.checked;
      openPanels[box.dataset.opens] = box.checked;
      try {
        localStorage.setItem(OPEN_KEY, JSON.stringify(openPanels));
      } catch {
        /* private mode: the choice just isn't remembered */
      }
      sync(store.getState());
    });
  });

  // Settings
  $('toggleMandalaPlot').addEventListener('change', (e) => store.setState(setMandalaShape(e.target.checked ? 'plot' : 'rect')));
  $('toggleGridWalls').addEventListener('change', (e) => store.setState(setGridAlign(e.target.checked ? 'walls' : 'north')));
  const elementStyleButtons = [...document.querySelectorAll('[data-element-style]')];
  elementStyleButtons.forEach((btn) => btn.addEventListener('click', () => store.setState(setElementStyle(btn.dataset.elementStyle))));

  // Install on the home screen, where the browser offers it
  let installPrompt = null;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    $('btnInstall').hidden = false;
  });
  $('btnInstall').addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    installPrompt = null;
    $('btnInstall').hidden = true;
    if (choice.outcome === 'accepted') showToast('Installed. Open it from your home screen.');
  });
  if (!isStandalone && /iphone|ipad|ipod/i.test(navigator.userAgent)) $('iosInstallHint').hidden = false;

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

  // Compass on the plan: drag to turn North, tap to type the exact angle
  const dial = $('compassDial');
  const ticks = dial.querySelector('.s-dial-ticks');
  for (let i = 1; i < 32; i++) {
    const major = i % 8 === 0;
    const zone = i % 2 === 0;
    const inner = major ? 32 : zone ? 34.5 : 36.5;
    const rad = (i * 11.25 * Math.PI) / 180;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(50 + Math.sin(rad) * inner));
    line.setAttribute('y1', String(50 - Math.cos(rad) * inner));
    line.setAttribute('x2', String(50 + Math.sin(rad) * 39));
    line.setAttribute('y2', String(50 - Math.cos(rad) * 39));
    if (major) line.setAttribute('class', 'is-major');
    ticks.appendChild(line);
  }
  const bearingOf = (cx, cy, x, y) => (Math.atan2(x - cx, cy - y) * 180) / Math.PI;
  let turn = null;
  dial.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try {
      dial.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const r = dial.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    turn = { cx, cy, start: bearingOf(cx, cy, e.clientX, e.clientY), from: store.getState().rotation, x: e.clientX, y: e.clientY, moved: false };
  });
  dial.addEventListener('pointermove', (e) => {
    if (!turn) return;
    if (!turn.moved && Math.hypot(e.clientX - turn.x, e.clientY - turn.y) < 6) return;
    turn.moved = true;
    dial.classList.add('is-turning');
    // The needle follows the finger; the number is the bearing, so it runs the other way
    const delta = bearingOf(turn.cx, turn.cy, e.clientX, e.clientY) - turn.start;
    store.setState(setRotation(Math.round((turn.from - delta) * 2) / 2));
  });
  const endTurn = () => {
    if (!turn) return;
    const { moved, from } = turn;
    turn = null;
    dial.classList.remove('is-turning');
    if (moved) {
      store.setState(commitRotationHistory(from));
    } else if (!$('chartControls').hidden) {
      rotationNumber.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => rotationNumber.focus(), 300);
    } else {
      showToast('Mark the boundary first, then turn North here');
    }
  };
  dial.addEventListener('pointerup', endTurn);
  dial.addEventListener('pointercancel', endTurn);

  // Quick views: switch a whole set of charts at once
  const viewButtons = [...document.querySelectorAll('[data-view]')];
  viewButtons.forEach((btn) => btn.addEventListener('click', () => {
    store.setState(applyView(btn.dataset.view));
    canvasController.fitToView();
  }));

  // Save the 16 bar chart on its own
  $('btnBarChartSave').addEventListener('click', () => {
    $('barChartCanvas').toBlob((blob) => {
      const day = new Date().toISOString().slice(0, 10);
      deliverFile(blob, `VastuGyan-16-Bar-Chart-${day}.png`).then(announceExport);
    }, 'image/png');
  });

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
    const editing = closed && !state.isPolygonLocked && !drawing;
    $('btnEditPoly').hidden = !closed || drawing;
    $('btnEditPolyLabel').textContent = editing ? 'Finish' : 'Edit';
    $('btnEditPoly').classList.toggle('s-tbtn-green', editing);
    $('btnEditPoly').classList.toggle('s-tbtn-light', !editing);
    $('btnEditPoly').title = editing ? 'Finish Polygon: lock the boundary' : 'Edit Polygon: unlock the corners to adjust the boundary';
    $('editHint').hidden = !editing;
    $('btnFinishLabel').textContent = `Finish (${corners})`;
    $('btnFinish').disabled = corners < 3;
    $('btnUndo').disabled = (state.history?.past?.length || 0) === 0;
    $('btnRedo').disabled = (state.history?.future?.length || 0) === 0;
    $('btnPng').disabled = drawing || !closed;
    $('btnPdf').disabled = drawing || !closed;
    $('btnClear').disabled = corners === 0;
    $('btnNewPlan').disabled = drawing;
    $('btnNewPhoto').disabled = drawing;
    $('btnScaleTool').disabled = drawing;
    $('btnScaleTool').classList.toggle('is-on', state.isCalibrating);

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
    $('compassDeg').textContent = `${deg}°`;
    $('compassRotor').style.transform = `rotate(${-state.rotation}deg)`;
    const view = currentView(state.layers);
    viewButtons.forEach((btn) => btn.setAttribute('aria-checked', String(btn.dataset.view === view)));
    if (document.activeElement !== rotationSlider) rotationSlider.value = state.rotation;
    if (document.activeElement !== rotationNumber) rotationNumber.value = deg;

    layerInputs.forEach((input) => {
      const on = !!state.layers[input.dataset.layer];
      if (input.checked !== on) input.checked = on;
    });
    $('chakraSizes').hidden = !state.layers.shaktiChakra;
    chakraButtons.forEach((btn) => btn.classList.toggle('is-on', Number(btn.dataset.chakraSize) === state.chakraSize));

    $('barChartCard').hidden = !(showBarChart && closed);
    if (showBarChart && closed) {
      const chart = calculate16BarChart(state.metrics.zones16, state.elementStyle);
      draw16BarChart($('barChartCanvas'), chart);
      $('barStatTotal').textContent = chart.hasData ? formatArea(chart.totalArea, state.calibration) : '—';
      $('barStatMean').textContent = chart.hasData ? `${chart.mean.toFixed(2)}% ± ${chart.sd.toFixed(2)}%` : '—';
      $('barStatMax').textContent = chart.hasData ? `${chart.max.id} (${chart.max.pct.toFixed(1)}%)` : '—';
      $('barStatMin').textContent = chart.hasData ? `${chart.min.id} (${chart.min.pct.toFixed(1)}%)` : '—';
    }

    // Area Analysis
    const cal = state.calibration;
    const area = calculateAreaMetrics(state.metrics);
    const land = calculatePositiveLandEnergy(state.metrics, cal, state.landDims);
    const grid = state.metrics.grid9x9;
    $('valArea').textContent = area.hasClosedPlot ? formatArea(area.plotArea, cal) : '—';
    $('valBrahma').textContent = area.gridArea > 0 ? `${formatArea(area.brahmasthanArea, cal)} (${area.brahmasthanRatioPct}%)` : '—';
    $('valPada').textContent = area.gridArea > 0 ? formatArea(area.padaArea, cal) : '—';
    $('valGrid').textContent = grid ? `${formatLength(grid.totalWidth, cal)} × ${formatLength(grid.totalHeight, cal)}` : '—';
    $('valLand').textContent = land.isActive
      ? ({ RECOMMENDED: 'Recommended', MODERATE: 'Conditional', CAUTION: 'Remedies needed' }[land.verdict.code] || '—')
      : (area.hasClosedPlot ? 'Needs scale' : '—');
    $('valScale').textContent = cal
      ? `Scale set: 1 ${cal.unit} = ${(1 / cal.realPerWorld).toFixed(2)} px on the plan (from a ${cal.realLength} ${cal.unit} wall)`
      : 'Scale not set, so sizes are in image pixels.';
    $('valScale').classList.toggle('is-set', !!cal);

    // Land Energy
    if (!$('landPanel').hidden) {
      const yes = (ok, good, bad) => (ok ? good : bad);
      $('valLandDims').textContent = land.isActive
        ? `${land.length} × ${land.breadth} ft (${land.source === 'typed' ? 'typed in' : 'measured'})`
        : (state.landDims ? `${state.landDims.length} × ${state.landDims.breadth} ft (typed in)` : 'Set the scale, or type the size');
      $('valIncome').textContent = land.isActive ? `${land.income.toFixed(2)} (${land.length} × 8)` : '—';
      $('valExpense').textContent = land.isActive ? `${land.expenditure.toFixed(2)} (${land.breadth} × 10.8)` : '—';
      $('valCompare').textContent = land.isActive ? yes(land.incomeGreater, 'Income is higher', 'Expenditure is higher') : '—';
      $('valPattern').textContent = land.isActive
        ? `Remainder ${land.remainder}: ${yes(land.remainderInfo.isPositive, 'good', 'not good')}${land.borderline ? ' (borderline)' : ''}`
        : '—';
      $('valPatternCalc').hidden = !land.isActive;
      if (land.isActive) {
        $('valPatternCalc').textContent = `(${land.length} + ${land.breadth} = ${Math.round(land.exactSum * 100) / 100} → ${land.sumDimensions}) ÷ 8 leaves ${land.remainder}: ${land.remainderInfo.quality} (${land.remainderInfo.description}).`
          + (land.borderline ? ` Borderline: the total is close to ${Math.floor(land.exactSum) + 0.5}, so a small measuring difference would give ${land.alternateRemainder}.` : '');
      }
      $('valRatio').textContent = land.isActive ? `${land.ratio.toFixed(2)}: ${yes(land.ratioGood, 'good', 'needs care')}` : '—';
      const tone = land.isActive ? ({ RECOMMENDED: 'is-good', MODERATE: 'is-mid', CAUTION: 'is-bad' }[land.verdict.code] || '') : '';
      $('valVerdict').className = `s-verdict ${tone}`;
      $('valVerdictTitle').textContent = land.isActive
        ? ({ RECOMMENDED: 'Recommended land', MODERATE: 'Conditionally suitable', CAUTION: 'Remedies needed' }[land.verdict.code] || '—')
        : (area.hasClosedPlot ? 'Needs the scale or the plot size' : 'No boundary yet');
      $('valVerdictText').textContent = land.isActive ? land.verdict.summary : 'Mark the boundary and set the scale to read the land energy.';
    }

    // Five Elements Balance
    elementStyleButtons.forEach((btn) => btn.setAttribute('aria-checked', String(btn.dataset.elementStyle === state.elementStyle)));
    $('elementStyleNote').textContent = ELEMENT_STYLES[state.elementStyle].note;
    if (!$('elementsPanel').hidden) {
      const tatva = calculatePanchTatvaSummary(state.metrics.zones16, state.elementStyle);
      const colours = { water: '#1F1F1F', air: '#8B5A2B', fire: '#F26B1D', earth: '#B8862B', space: '#FFFFFF' };
      $('elementRows').innerHTML = tatva.map((el) => `<div class="s-area-row"><span><i class="s-dot" style="background:${colours[el.id] || '#999'}"></i>${el.name} <small>${el.zones.join(', ')}</small></span><strong>${el.hasData ? el.formattedPercentage : '—'}</strong></div>`).join('');
      const earth = tatva.find((el) => el.id === 'earth');
      $('earthSplit').hidden = !(earth && earth.earthSplit && earth.hasData);
      if (earth && earth.earthSplit) $('earthSplit').textContent = `Earth: hard ${earth.earthSplit.hard}% (SSW, SW) · loose ${earth.earthSplit.loose}% (NE, NW)`;
    }

    // Vithi Mandal Shares
    if (!$('vithiPanel').hidden) {
      const vithi = calculateVithiSummary(state.metrics.vithi);
      $('vithiRows').innerHTML = vithi.rings.map((ring) => {
        const filled = vithi.hasData && ring.fillPct < 99.5 ? ` · plot fills ${Math.round(ring.fillPct)}% of the ring` : '';
        const meta = vithi.hasData ? `${ring.padas} padas · ${formatArea(ring.area, cal)}${filled}` : `${ring.padas} padas`;
        return `<div class="s-ring"><div class="s-ring-head"><span>${ring.name || ring.id} <small>${meta}</small></span><strong>${vithi.hasData ? `${ring.areaPct.toFixed(1)}%` : '—'}</strong></div><p>${VITHI_USE[ring.id] || ''}</p></div>`;
      }).join('');
    }

    // Settings
    $('toggleMandalaPlot').checked = state.mandalaShape !== 'rect';
    $('toggleGridWalls').checked = state.gridAlign === 'walls';

    // The real length of the marked wall, once both ends are tapped
    if (state.isCalibrating && state.calibrationPoints.length === 2 && scaleModal.hidden) {
      const [a, b] = state.calibrationPoints;
      $('scaleModalSub').textContent = `Type the real length of the line you marked (${Math.round(Math.hypot(b.x - a.x, b.y - a.y))} px on the plan).`;
      if (cal) $('scaleUnit').value = cal.unit;
      $('scaleLength').value = '';
      scaleModal.hidden = false;
      setTimeout(() => $('scaleLength').focus(), 50);
    }

    // A boundary just finished on this page: start with 16 Zones only, as a plain reading
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
