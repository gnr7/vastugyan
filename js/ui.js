/**
 * Vastu Gyan — App Shell (panel, bottom sheet, dock, compass dial, toasts)
 * Phones get a draggable bottom sheet; large screens show the same panel at the side.
 */

import { setRotation, commitRotationHistory } from './state.js';

const WIDE_QUERY = '(min-width: 1024px), (min-width: 900px) and (orientation: landscape), (min-width: 640px) and (orientation: landscape) and (max-height: 540px)';
const SHEET_STATES = ['peek', 'half', 'full'];
const DOCK_PANELS = new Set(['layers', 'analysis', 'export']);

const haptic = (pattern) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
};

// Angle of a point around a centre, in degrees clockwise from straight up
const bearingOf = (cx, cy, x, y) => (Math.atan2(x - cx, cy - y) * 180) / Math.PI;

export const initUI = (store) => {
  const panel = document.getElementById('panel');
  const handle = document.getElementById('panelHandle');
  const tabs = [...document.querySelectorAll('.panel-tabs [data-tab]')];
  const sections = [...document.querySelectorAll('.panel-section')];
  const panelOpeners = [...document.querySelectorAll('[data-open-panel]')];
  const toastStack = document.getElementById('toastStack');
  const wideMedia = window.matchMedia(WIDE_QUERY);

  let currentPanel = 'analysis';
  let sheetBeforeTool = null; // sheet state to restore after drawing / Set Scale

  const isWide = () => wideMedia.matches;

  // ---------- Panel sections ----------
  const setPanel = (name) => {
    currentPanel = name;
    sections.forEach((s) => s.classList.toggle('is-active', s.dataset.panel === name));
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
    document.querySelectorAll('.dock-btn[data-open-panel]').forEach((b) => {
      b.classList.toggle('is-current', b.dataset.openPanel === name && (isWide() || panel.dataset.sheet !== 'peek'));
    });
    document.getElementById('panelBody').scrollTop = 0;
  };

  const setSheet = (state) => {
    panel.dataset.sheet = state;
    panel.style.transform = '';
    setPanel(currentPanel);
  };

  const openPanel = (name) => {
    if (isWide()) {
      setPanel(name);
      return;
    }
    const sheet = panel.dataset.sheet;
    if (name === currentPanel && (sheet === 'half' || sheet === 'full')) {
      setSheet('peek');
      return;
    }
    currentPanel = name;
    setSheet(sheet === 'full' ? 'full' : 'half');
  };

  tabs.forEach((t) => t.addEventListener('click', () => {
    setPanel(t.dataset.tab);
    if (!isWide() && panel.dataset.sheet === 'peek') setSheet('half');
  }));
  panelOpeners.forEach((b) => b.addEventListener('click', () => openPanel(b.dataset.openPanel)));

  // ---------- Bottom sheet drag ----------
  let drag = null;
  const sheetOffsetFor = (state) => {
    const h = panel.offsetHeight;
    const peek = parseFloat(getComputedStyle(panel).getPropertyValue('--peek-h')) || 68;
    if (state === 'full') return 0;
    if (state === 'half') return h * 0.45;
    return h - peek;
  };

  handle.addEventListener('pointerdown', (e) => {
    if (isWide()) return;
    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    drag = {
      startY: e.clientY,
      startOffset: sheetOffsetFor(panel.dataset.sheet === 'hidden' ? 'peek' : panel.dataset.sheet),
      lastY: e.clientY,
      lastT: performance.now(),
      velocity: 0,
      moved: false
    };
    panel.classList.add('is-dragging');
  });

  handle.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dy) > 4) drag.moved = true;
    const now = performance.now();
    drag.velocity = (e.clientY - drag.lastY) / Math.max(1, now - drag.lastT);
    drag.lastY = e.clientY;
    drag.lastT = now;
    const max = sheetOffsetFor('peek');
    const offset = Math.min(max + 24, Math.max(-12, drag.startOffset + dy));
    panel.style.transform = `translateY(${offset}px)`;
  });

  const endDrag = (e) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    panel.classList.remove('is-dragging');

    if (!d.moved) {
      setSheet(panel.dataset.sheet === 'peek' ? 'half' : 'peek');
      return;
    }
    const offset = d.startOffset + (e.clientY - d.startY);
    // A quick flick moves one step in its direction; otherwise snap to the nearest height
    let target;
    if (Math.abs(d.velocity) > 0.6) {
      const order = SHEET_STATES;
      const nearestIdx = order.reduce((best, s, i) => (
        Math.abs(sheetOffsetFor(s) - offset) < Math.abs(sheetOffsetFor(order[best]) - offset) ? i : best
      ), 0);
      target = d.velocity < 0 ? order[Math.min(order.length - 1, nearestIdx + 1)] : order[Math.max(0, nearestIdx - 1)];
    } else {
      target = SHEET_STATES.reduce((best, s) => (
        Math.abs(sheetOffsetFor(s) - offset) < Math.abs(sheetOffsetFor(best) - offset) ? s : best
      ), 'peek');
    }
    setSheet(target);
    haptic(6);
  };
  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);

  wideMedia.addEventListener('change', () => setSheet(isWide() ? 'peek' : panel.dataset.sheet));

  // ---------- Compass dials ----------
  const buildTicks = (group) => {
    const ns = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < 32; i++) {
      const deg = i * 11.25;
      const isCardinal = i % 8 === 0;
      const isZone = i % 2 === 0;
      if (i === 0) continue; // N is marked by the letter
      const inner = isCardinal ? 32 : isZone ? 34.5 : 36.5;
      const rad = (deg * Math.PI) / 180;
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', String(50 + Math.sin(rad) * inner));
      line.setAttribute('y1', String(50 - Math.cos(rad) * inner));
      line.setAttribute('x2', String(50 + Math.sin(rad) * 39));
      line.setAttribute('y2', String(50 - Math.cos(rad) * 39));
      if (isCardinal || isZone) line.setAttribute('class', isCardinal ? 'tick-major' : '');
      group.appendChild(line);
    }
  };
  document.querySelectorAll('.dial-ticks').forEach(buildTicks);

  const rotors = [document.getElementById('compassDial'), document.getElementById('northDialLargeRotor')].filter(Boolean);

  const bindDial = (dial, { tapOpensNorth }) => {
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
      turn = {
        cx, cy,
        startBearing: bearingOf(cx, cy, e.clientX, e.clientY),
        startRotation: store.getState().rotation,
        lastZone: Math.floor(store.getState().rotation / 22.5),
        moved: false,
        startX: e.clientX,
        startY: e.clientY
      };
    });
    dial.addEventListener('pointermove', (e) => {
      if (!turn) return;
      if (!turn.moved && Math.hypot(e.clientX - turn.startX, e.clientY - turn.startY) < 6) return;
      turn.moved = true;
      dial.classList.add('is-turning');
      const delta = bearingOf(turn.cx, turn.cy, e.clientX, e.clientY) - turn.startBearing;
      const deg = Math.round((turn.startRotation + delta) * 2) / 2;
      store.setState(setRotation(deg));
      const zone = Math.floor(store.getState().rotation / 22.5);
      if (zone !== turn.lastZone) {
        turn.lastZone = zone;
        haptic(5);
      }
    });
    const finish = () => {
      if (!turn) return;
      const wasTap = !turn.moved;
      // One undo step for the whole turn
      if (!wasTap) store.setState(commitRotationHistory(turn.startRotation));
      turn = null;
      dial.classList.remove('is-turning');
      if (wasTap && tapOpensNorth) openPanel('north');
    };
    dial.addEventListener('pointerup', finish);
    dial.addEventListener('pointercancel', finish);
    dial.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') store.setState(setRotation(store.getState().rotation + step));
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') store.setState(setRotation(store.getState().rotation - step));
    });
  };
  bindDial(document.getElementById('compassButton'), { tapOpensNorth: true });
  bindDial(document.getElementById('northDialLarge'), { tapOpensNorth: false });

  const nudge = (deg) => {
    const before = store.getState().rotation;
    store.setState(setRotation(before + deg));
    store.setState(commitRotationHistory(before));
  };
  document.getElementById('btnRotateMinus')?.addEventListener('click', () => nudge(-1));
  document.getElementById('btnRotatePlus')?.addEventListener('click', () => nudge(1));

  // ---------- Toasts ----------
  const showToast = (message, { duration = 2800 } = {}) => {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = '<svg class="icon"><use href="#i-check"/></svg><span></span>';
    el.querySelector('span').textContent = message;
    toastStack.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 260);
    }, duration);
  };

  // ---------- Per-state sync (called from the app's store subscription) ----------
  const sync = (state) => {
    rotors.forEach((rotor) => {
      rotor.style.transform = `rotate(${state.rotation}deg)`;
    });

    // While tracing or setting scale on a phone, get the sheet out of the way
    const toolActive = state.isDrawingPolygon || state.isCalibrating;
    if (!isWide()) {
      if (toolActive && panel.dataset.sheet !== 'hidden') {
        sheetBeforeTool = panel.dataset.sheet;
        setSheet('hidden');
      } else if (!toolActive && panel.dataset.sheet === 'hidden') {
        setSheet(sheetBeforeTool && sheetBeforeTool !== 'hidden' ? sheetBeforeTool : 'peek');
        sheetBeforeTool = null;
      }
    }
  };

  // The peeking sheet shows exactly its handle (grip + summary), never a sliver of the tabs
  const measurePeek = () => {
    panel.style.setProperty('--peek-h', `${Math.ceil(handle.offsetHeight)}px`);
    document.documentElement.style.setProperty('--peek-h', `${Math.ceil(handle.offsetHeight)}px`);
  };
  new ResizeObserver(measurePeek).observe(handle);
  measurePeek();

  setPanel(currentPanel);
  return { openPanel, setPanel, setSheet, showToast, sync, isWide };
};
