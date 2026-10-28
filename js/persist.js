/**
 * Vastu Mandala Studio — Autosave
 * Keeps the current project (boundary, North, scale, layers and the floor plan image)
 * in IndexedDB on this device, so closing the app never loses work.
 */

const DB_NAME = 'vastu-mandala';
const STORE = 'projects';
const KEY = 'current';
const SAVE_DELAY_MS = 500;

const openDb = () => new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined') {
    reject(new Error('IndexedDB unavailable'));
    return;
  }
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = () => req.result.createObjectStore(STORE);
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const withStore = async (mode, fn) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const result = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined);
    tx.onerror = () => reject(tx.error);
  });
};

export const loadProject = async () => {
  try {
    return await withStore('readonly', (store) => store.get(KEY));
  } catch {
    return null;
  }
};

export const clearProject = async () => {
  try {
    await withStore('readwrite', (store) => store.delete(KEY));
  } catch {
    /* nothing saved */
  }
};

// The fields of the app state that make up a project
const snapshotOf = (state) => ({
  polygon: state.polygon,
  isPolygonClosed: state.isPolygonClosed,
  rotation: state.rotation,
  gridAlign: state.gridAlign,
  calibration: state.calibration,
  layers: state.layers,
  image: state.image
});

const sameSnapshot = (a, b) => !!a && !!b && Object.keys(a).every((k) => a[k] === b[k]);

/**
 * Save the project whenever its fields change (debounced).
 * @param {Object} store - App store
 * @param {Function} getImageBlob - Returns the original floor plan file/blob, or null
 */
export const startAutosave = (store, getImageBlob) => {
  let last = snapshotOf(store.getState());
  let timer = null;

  const save = async () => {
    const state = store.getState();
    const hasContent = state.image || state.polygon.length > 0 || state.calibration;
    try {
      if (!hasContent) {
        await clearProject();
        return;
      }
      const record = {
        version: 1,
        savedAt: Date.now(),
        polygon: state.polygon.map((p) => ({ x: p.x, y: p.y })),
        isPolygonClosed: state.isPolygonClosed,
        rotation: state.rotation,
        gridAlign: state.gridAlign,
        calibration: state.calibration ? { ...state.calibration } : null,
        layers: { ...state.layers },
        imageName: state.image ? state.image.name : null,
        imageBlob: state.image ? getImageBlob() : null
      };
      await withStore('readwrite', (s) => s.put(record, KEY));
    } catch (err) {
      console.warn('Autosave failed:', err);
    }
  };

  store.subscribe((state) => {
    const snap = snapshotOf(state);
    if (sameSnapshot(snap, last)) return;
    // Don't save mid-gesture: wait until a corner drag has finished
    if (state.draggingVertexIndex !== null) return;
    last = snap;
    clearTimeout(timer);
    timer = setTimeout(save, SAVE_DELAY_MS);
  });
};
