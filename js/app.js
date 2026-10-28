/**
 * VastuGrid — Application Entry Point & UI Controller
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
  redoAction
} from './state.js';
import { CanvasController, computeFitViewport } from './canvas.js';
import { calculateAreaMetrics, calculatePositiveLandEnergy } from './analysis.js';
import { exportCanvasToPng, generatePdfReport } from './export.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize store and canvas controller
  const store = createStore(createInitialState());
  window.store = store;
  const canvasElement = document.getElementById('vastuCanvas');
  const canvasController = new CanvasController(canvasElement, store);

  // 2. Cache DOM Elements
  const fileInput = document.getElementById('fileInput');
  const btnUpload = document.getElementById('btnUpload');
  const btnBlankCanvas = document.getElementById('btnBlankCanvas');
  const emptyState = document.getElementById('emptyState');
  const viewportContainer = document.getElementById('viewportContainer');
  const draftingBanner = document.getElementById('draftingBanner');
  const btnFinishDraft = document.getElementById('btnFinishDraft');

  // Zoom controls
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnZoomReset = document.getElementById('btnZoomReset');
  const zoomLevelText = document.getElementById('zoomLevelText');

  // Rotation controls
  const rotationSlider = document.getElementById('rotationSlider');
  const rotationNumber = document.getElementById('rotationNumber');
  const rotationBadge = document.getElementById('rotationBadge');
  const btnResetRotation = document.getElementById('btnResetRotation');
  const compassDial = document.getElementById('compassDial');
  const compassDegDisplay = document.getElementById('compassDegDisplay');

  // Layer switches
  const toggles = {
    grid9x9: document.getElementById('toggleGrid9x9'),
    brahmasthan: document.getElementById('toggleBrahmasthan'),
    devtas45: document.getElementById('toggleDevtas45'),
    devtaNames: document.getElementById('toggleDevtaNames'),
    zones16: document.getElementById('toggleZones16'),
    gates32: document.getElementById('toggleGates32'),
    marma: document.getElementById('toggleMarma'),
    elements: document.getElementById('toggleElements')
  };

  // Action buttons
  const btnDrawPolygon = document.getElementById('btnDrawPolygon');
  const btnUndo = document.getElementById('btnUndo');
  const btnRedo = document.getElementById('btnRedo');
  const btnClearBoundary = document.getElementById('btnClearBoundary');
  const btnResetAll = document.getElementById('btnResetAll');
  const btnClear = document.getElementById('btnClear'); // legacy alias if present
  const btnExportPng = document.getElementById('btnExportPng');
  const btnExportPdf = document.getElementById('btnExportPdf');

  // PDF Report Details Modal
  const pdfModalBackdrop = document.getElementById('pdfModalBackdrop');
  const btnPdfModalClose = document.getElementById('btnPdfModalClose');
  const btnPdfModalSkip = document.getElementById('btnPdfModalSkip');
  const btnPdfModalGenerate = document.getElementById('btnPdfModalGenerate');
  const pdfName = document.getElementById('pdfName');
  const pdfPhone = document.getElementById('pdfPhone');
  const pdfAddress = document.getElementById('pdfAddress');

  // 3. File Upload Handler (Functional using modern Fetch API / FileReader)
  const handleImageFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    try {
      const objectUrl = URL.createObjectURL(file);
      // Modern fetch to load the object URL as blob/image
      const res = await fetch(objectUrl);
      const blob = await res.blob();

      const img = new Image();
      img.onload = () => {
        store.setState(setFloorPlanImage(img, { name: file.name, size: file.size }));
        emptyState.style.display = 'none';
        canvasController.fitToView();
        URL.revokeObjectURL(objectUrl);
      };
      img.src = URL.createObjectURL(blob);
    } catch (err) {
      console.error('Error loading floor plan image:', err);
      alert('Failed to load the selected image file.');
    }
  };

  btnUpload.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  });

  // Drag and drop image upload
  viewportContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    viewportContainer.classList.add('is-dragging');
  });

  viewportContainer.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    viewportContainer.classList.remove('is-dragging');
  });

  viewportContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    viewportContainer.classList.remove('is-dragging');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  });

  // Blank canvas mode
  btnBlankCanvas.addEventListener('click', () => {
    emptyState.style.display = 'none';
    canvasController.fitToView();
  });

  // 4. Viewport Zoom Buttons
  btnZoomIn.addEventListener('click', () => canvasController.zoomBy(1.2));
  btnZoomOut.addEventListener('click', () => canvasController.zoomBy(0.8));
  btnZoomReset.addEventListener('click', () => canvasController.fitToView());

  // 5. Universal Rotation Synchronization
  const updateRotationUI = (deg) => {
    const normalizedDeg = ((deg % 360) + 360) % 360;
    store.setState(setRotation(normalizedDeg));
  };

  rotationSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 0;
    updateRotationUI(val);
  });

  rotationNumber.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 0;
    updateRotationUI(val);
  });

  btnResetRotation.addEventListener('click', () => {
    updateRotationUI(0);
  });

  // 6. Layer Toggles Event Binding
  Object.entries(toggles).forEach(([layerKey, checkbox]) => {
    if (!checkbox) return;
    checkbox.addEventListener('change', (e) => {
      store.setState(toggleLayer(layerKey, e.target.checked));
    });
  });

  // 7. Draw Boundary Toggle Button
  btnDrawPolygon.addEventListener('click', () => {
    const state = store.getState();
    const nextDrawing = !state.isDrawingPolygon;
    if (nextDrawing) {
      emptyState.style.display = 'none';
    }
    store.setState(setDrawingMode(nextDrawing));
  });

  if (btnFinishDraft) {
    btnFinishDraft.addEventListener('click', () => {
      const state = store.getState();
      if (state.polygon.length >= 3) {
        store.setState(closePolygon());
      } else {
        store.setState(setDrawingMode(false));
      }
    });
  }

  // 8. History & Reset Actions
  if (btnUndo) {
    btnUndo.addEventListener('click', () => {
      store.setState(undoAction());
    });
  }

  if (btnRedo) {
    btnRedo.addEventListener('click', () => {
      store.setState(redoAction());
    });
  }

  if (btnClearBoundary) {
    btnClearBoundary.addEventListener('click', () => {
      store.setState(clearBoundary());
    });
  }

  if (btnResetAll) {
    btnResetAll.addEventListener('click', () => {
      store.setState(resetAll());
      setTimeout(() => canvasController.fitToView(), 50);
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      store.setState(clearBoundary());
    });
  }

  // Keyboard Shortcuts: Ctrl+Z (Undo), Ctrl+Y / Ctrl+Shift+Z (Redo)
  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea') return;

    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      if (e.shiftKey) {
        store.setState(redoAction());
      } else {
        store.setState(undoAction());
      }
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      store.setState(redoAction());
    }
  });

  // 9. Export Actions
  if (btnExportPng) {
    btnExportPng.addEventListener('click', () => {
      exportCanvasToPng(canvasElement);
    });
  }

  // PDF Export with Details Modal
  const openPdfModal = () => {
    if (pdfModalBackdrop) {
      pdfModalBackdrop.style.display = 'flex';
      setTimeout(() => {
        if (pdfName) pdfName.focus();
      }, 50);
    }
  };

  const closePdfModal = () => {
    if (pdfModalBackdrop) {
      pdfModalBackdrop.style.display = 'none';
    }
  };

  if (btnExportPdf) {
    btnExportPdf.addEventListener('click', () => {
      openPdfModal();
    });
  }

  if (btnPdfModalClose) {
    btnPdfModalClose.addEventListener('click', () => {
      closePdfModal();
    });
  }

  if (pdfModalBackdrop) {
    pdfModalBackdrop.addEventListener('click', (e) => {
      if (e.target === pdfModalBackdrop) {
        closePdfModal();
      }
    });
  }

  if (btnPdfModalSkip) {
    btnPdfModalSkip.addEventListener('click', async () => {
      closePdfModal();
      await generatePdfReport(canvasElement, store.getState(), '', {});
    });
  }

  if (btnPdfModalGenerate) {
    btnPdfModalGenerate.addEventListener('click', async () => {
      const clientInfo = {
        name: pdfName ? pdfName.value.trim() : '',
        phone: pdfPhone ? pdfPhone.value.trim() : '',
        address: pdfAddress ? pdfAddress.value.trim() : ''
      };
      closePdfModal();
      await generatePdfReport(canvasElement, store.getState(), '', clientInfo);
    });
  }

  // 10. Reactive UI Update Subscription (Keeps DOM in sync with state)
  store.subscribe((state) => {
    // Sync Zoom display
    const zoomPct = Math.round(state.viewport.scale * 100);
    zoomLevelText.textContent = `${zoomPct}%`;

    // Sync Drawing Mode Button & Banner
    if (state.isDrawingPolygon) {
      btnDrawPolygon.classList.add('active');
      btnDrawPolygon.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Done Drawing
      `;
      if (draftingBanner) draftingBanner.style.display = 'flex';
    } else {
      btnDrawPolygon.classList.remove('active');
      btnDrawPolygon.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 22 8.5 17 21 7 21 2 8.5 12 2"/>
        </svg>
        Draw Boundary
      `;
      if (draftingBanner) draftingBanner.style.display = 'none';
    }

    // Sync Rotation values and compass dial
    const deg = state.rotation;
    const formattedDeg = `${Math.round(deg * 10) / 10}°`;
    rotationBadge.textContent = formattedDeg;
    compassDegDisplay.textContent = formattedDeg;
    if (document.activeElement !== rotationSlider) {
      rotationSlider.value = deg;
    }
    if (document.activeElement !== rotationNumber) {
      rotationNumber.value = Math.round(deg * 10) / 10;
    }
    compassDial.style.transform = `rotate(${-deg}deg)`;

    // Sync Layer checkboxes
    Object.entries(toggles).forEach(([layerKey, checkbox]) => {
      if (checkbox && checkbox.checked !== !!state.layers[layerKey]) {
        checkbox.checked = !!state.layers[layerKey];
      }
    });

    // Sync Undo / Redo / Clear Boundary button states
    if (btnUndo) {
      btnUndo.disabled = (state.history?.past?.length || 0) === 0;
    }
    if (btnRedo) {
      btnRedo.disabled = (state.history?.future?.length || 0) === 0;
    }
    if (btnClearBoundary) {
      btnClearBoundary.disabled = state.polygon.length === 0;
    }

    // Sync emptyState overlay
    if (emptyState) {
      emptyState.style.display = (!state.image && state.polygon.length === 0) ? 'flex' : 'none';
    }

    // Update Live Metrics & Analysis
    const areaData = calculateAreaMetrics(state.metrics);
    const valArea = document.getElementById('valArea');
    const valAreaBadge = document.getElementById('valAreaBadge');
    const valBrahmaArea = document.getElementById('valBrahmaArea');
    const valPadaArea = document.getElementById('valPadaArea');
    const valDimensions = document.getElementById('valDimensions');

    if (valArea) {
      valArea.textContent = areaData.hasClosedPlot
        ? `${Math.round(areaData.plotArea).toLocaleString()} sq units`
        : (state.polygon.length >= 3 && !state.isPolygonClosed ? 'Close plot to compute' : '0 sq units');
    }
    if (valAreaBadge) {
      valAreaBadge.textContent = areaData.hasClosedPlot
        ? `${Math.round(areaData.plotArea).toLocaleString()} sq`
        : '0 sq units';
    }
    if (valBrahmaArea) {
      valBrahmaArea.textContent = areaData.gridArea > 0
        ? `${Math.round(areaData.brahmasthanArea).toLocaleString()} sq (${areaData.brahmasthanRatioPct}%)`
        : '—';
    }
    if (valPadaArea) {
      valPadaArea.textContent = areaData.gridArea > 0
        ? `${Math.round(areaData.padaArea).toLocaleString()} sq`
        : '—';
    }
    if (valDimensions) {
      valDimensions.textContent = state.metrics.bounds
        ? `${Math.round(state.metrics.bounds.width)} × ${Math.round(state.metrics.bounds.height)}`
        : '—';
    }

    // Update Positive Land Energy Analysis (VastuGrid Authentic)
    const landData = calculatePositiveLandEnergy(state.metrics);
    const landEnergyBadge = document.getElementById('landEnergyBadge');
    const valLandIncome = document.getElementById('valLandIncome');
    const valLandIncomeFormula = document.getElementById('valLandIncomeFormula');
    const valLandExpenditure = document.getElementById('valLandExpenditure');
    const valLandExpenditureFormula = document.getElementById('valLandExpenditureFormula');

    const cardIncomeComparison = document.getElementById('cardIncomeComparison');
    const iconIncomeComparison = document.getElementById('iconIncomeComparison');
    const titleIncomeComparison = document.getElementById('titleIncomeComparison');
    const subIncomeComparison = document.getElementById('subIncomeComparison');

    const cardEnergyPattern = document.getElementById('cardEnergyPattern');
    const labelEnergyPattern = document.getElementById('labelEnergyPattern');
    const iconEnergyPattern = document.getElementById('iconEnergyPattern');
    const descEnergyPattern = document.getElementById('descEnergyPattern');
    const calcEnergyPattern = document.getElementById('calcEnergyPattern');

    const cardLengthProportion = document.getElementById('cardLengthProportion');
    const labelLengthProportion = document.getElementById('labelLengthProportion');
    const iconLengthProportion = document.getElementById('iconLengthProportion');
    const descLengthProportion = document.getElementById('descLengthProportion');
    const calcLengthProportion = document.getElementById('calcLengthProportion');

    const cardLandVerdict = document.getElementById('cardLandVerdict');
    const tagLandVerdict = document.getElementById('tagLandVerdict');
    const summaryLandVerdict = document.getElementById('summaryLandVerdict');

    if (landData.isActive) {
      if (landEnergyBadge) {
        landEnergyBadge.textContent = landData.verdict.isRecommended ? 'Positive Energy' : 'Analysis Ready';
        landEnergyBadge.className = `badge-value ${landData.verdict.isRecommended ? 'badge-success' : ''}`;
      }

      if (valLandIncome) valLandIncome.textContent = landData.income.toFixed(2);
      if (valLandIncomeFormula) valLandIncomeFormula.textContent = `Length: ${landData.length} × 8`;

      if (valLandExpenditure) valLandExpenditure.textContent = landData.expenditure.toFixed(2);
      if (valLandExpenditureFormula) valLandExpenditureFormula.textContent = `Breadth: ${landData.breadth} × 10.8`;

      // Income vs Expenditure Comparison
      if (cardIncomeComparison) {
        cardIncomeComparison.className = `energy-status-card ${landData.incomeGreater ? 'status-good' : 'status-warning'}`;
      }
      if (iconIncomeComparison) iconIncomeComparison.textContent = landData.incomeGreater ? '✔' : '⚠';
      if (titleIncomeComparison) titleIncomeComparison.textContent = landData.incomeGreater ? 'Income > Expenditure' : 'Expenditure > Income';
      if (subIncomeComparison) {
        subIncomeComparison.textContent = landData.incomeGreater
          ? 'Good financial prospects for this land'
          : 'Higher financial outflow tendency for this land';
      }

      // Energy Pattern (Remainder Method)
      if (cardEnergyPattern) {
        cardEnergyPattern.className = `energy-status-card ${landData.remainderInfo.isPositive ? 'status-good' : 'status-warning'}`;
      }
      if (labelEnergyPattern) labelEnergyPattern.textContent = `Energy Pattern (Remainder: ${landData.remainder})`;
      if (iconEnergyPattern) iconEnergyPattern.textContent = landData.remainderInfo.isPositive ? '✔' : '⚠';
      if (descEnergyPattern) descEnergyPattern.textContent = `${landData.remainderInfo.quality} (${landData.remainderInfo.description})`;
      if (calcEnergyPattern) calcEnergyPattern.textContent = `(${landData.length} + ${landData.breadth}) ÷ 8 = remainder ${landData.remainder}`;

      // Length Proportion (Ratio)
      if (cardLengthProportion) {
        cardLengthProportion.className = `energy-status-card ${landData.ratioGood ? 'status-good' : 'status-warning'}`;
      }
      if (labelLengthProportion) labelLengthProportion.textContent = `Length Proportion (Ratio: ${landData.ratio.toFixed(2)})`;
      if (iconLengthProportion) iconLengthProportion.textContent = landData.ratioGood ? '✔' : '⚠';
      if (descLengthProportion) {
        descLengthProportion.textContent = landData.ratioGood
          ? 'Positive Energy (Length proportion good)'
          : 'Warning (Overly elongated / narrow land)';
      }
      if (calcLengthProportion) {
        calcLengthProportion.textContent = `Length should be ≤ 2.5 × Breadth (${landData.length} vs ${landData.maxAllowedLength})`;
      }

      // Verdict Box
      if (cardLandVerdict) cardLandVerdict.className = `energy-verdict-box ${landData.verdict.badgeClass}`;
      if (tagLandVerdict) tagLandVerdict.textContent = landData.verdict.title;
      if (summaryLandVerdict) summaryLandVerdict.textContent = landData.verdict.summary;
    } else {
      if (landEnergyBadge) {
        landEnergyBadge.textContent = 'No Plot';
        landEnergyBadge.className = 'badge-value';
      }
      if (valLandIncome) valLandIncome.textContent = '0.00';
      if (valLandIncomeFormula) valLandIncomeFormula.textContent = 'Length: 0 × 8';
      if (valLandExpenditure) valLandExpenditure.textContent = '0.00';
      if (valLandExpenditureFormula) valLandExpenditureFormula.textContent = 'Breadth: 0 × 10.8';

      if (cardIncomeComparison) cardIncomeComparison.className = 'energy-status-card';
      if (iconIncomeComparison) iconIncomeComparison.textContent = '—';
      if (titleIncomeComparison) titleIncomeComparison.textContent = 'Income vs Expenditure';
      if (subIncomeComparison) subIncomeComparison.textContent = 'Close plot to evaluate financial balance';

      if (cardEnergyPattern) cardEnergyPattern.className = 'energy-status-card';
      if (labelEnergyPattern) labelEnergyPattern.textContent = 'Energy Pattern (Remainder: —)';
      if (iconEnergyPattern) iconEnergyPattern.textContent = '—';
      if (descEnergyPattern) descEnergyPattern.textContent = 'Close boundary to compute pattern';
      if (calcEnergyPattern) calcEnergyPattern.textContent = '(L + B) ÷ 8 = remainder';

      if (cardLengthProportion) cardLengthProportion.className = 'energy-status-card';
      if (labelLengthProportion) labelLengthProportion.textContent = 'Length Proportion (Ratio: —)';
      if (iconLengthProportion) iconLengthProportion.textContent = '—';
      if (descLengthProportion) descLengthProportion.textContent = 'Evaluates plot elongation';
      if (calcLengthProportion) calcLengthProportion.textContent = 'Length should be ≤ 2.5 × Breadth';

      if (cardLandVerdict) cardLandVerdict.className = 'energy-verdict-box verdict-neutral';
      if (tagLandVerdict) tagLandVerdict.textContent = 'DRAW BOUNDARY';
      if (summaryLandVerdict) summaryLandVerdict.textContent = 'Plot boundary required to calculate land energy indicators.';
    }
  });

  // Initial fit to view
  setTimeout(() => canvasController.fitToView(), 100);
});
