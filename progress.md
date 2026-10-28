# VastuGrid Open-Source Web Application — Development Progress

## Project Overview
Open-source, local-first Vastu Shastra analysis web application inspired by professional tools like VastuGrid. Built with a clean, Google UI flat aesthetic, modular functional JavaScript, and pure geometric canvas rendering.

---

## Technical Inspection Observations (VastuGrid.com)

### 1. Coordinate & Canvas System
- **Coordinate Basis**: Uses standard Cartesian canvas coordinates mapped over an uploaded architectural 2D floor plan image.
- **Centroid Calculation**: Computes the geometric centroid $(C_x, C_y)$ of the property boundary polygon using the standard Shoelace surveyor formula:
  $$C_x = \frac{1}{6A} \sum (x_i + x_{i+1})(x_i y_{i+1} - x_{i+1} y_i), \quad C_y = \frac{1}{6A} \sum (y_i + y_{i+1})(x_i y_{i+1} - x_{i+1} y_i)$$
- **Boundary Polygon**: Supports arbitrary multi-vertex polygons with interactive vertex handles (drag, add, snap) to trace rectangular, L-shaped, cut-corner, or irregular plots.
- **Universal Rotation ($\theta$)**: Real-time compass calibration (0°–360°) rotating all analytical grids relative to True / Magnetic North.

### 2. Classical Vastu Purusha Mandala Geometry (81 Padas / 9×9 Grid)
- **Grid Scaling**: Slices the property's oriented bounding box into a 9×9 orthogonal matrix (81 equal padas).
- **Brahmasthan**: Central 3×3 padas (padas [3..5, 3..5], total 9 padas) highlighted with distinct red boundary and translucent energetic fill.
- **45 Devtas Distribution**:
  - **32 Outer Devtas** (occupying the 32 perimeter padas, 8 per direction):
    - *East*: Shikhi (NE), Parjanya, Jayanta, Indra, Surya, Satya, Bhrisha, Antariksha
    - *South*: Agni (SE), Poosha, Vitatha, Brihatkshata, Yama, Gandharva, Bhringaraja, Mriga
    - *West*: Pitri (SW), Dauvarika, Sugriva, Pushpadanta, Varuna, Asura, Shosha, Papayakshma
    - *North*: Roga (NW), Naga/Mukhya, Bhallat, Soma, Bhujaga, Aditi, Diti
  - **13 Inner Devtas**:
    - Central: Brahma (Brahmasthan 9 padas or core pada)
    - 4 Cardinal inner devtas: Aryama (East), Vivaswan (South), Mitra (West), Bhudhar/Mahidhara (North)
    - 8 Diagonal/corner inner devtas: Aapa & Aapavatsa (NE), Savita & Savitra (SE), Jaya & Indra (SW), Rudra & Rajayakshma (NW)

### 3. Zonal & Perimeter Analysis
- **16 Directional Zones**: Radial sectors of $22.5^\circ$ centered at the centroid, calibrated to compass degrees (N, NNE, NE, ENE, E, ESE, SE, SSE, S, SSW, SW, WSW, W, WNW, NW, NNW) with polygon ray intersection shading.
- **32 Perimeter Entrances**: Evaluates the 32 perimeter padas (N1–N8, E1–E8, S1–S8, W1–W8) identifying auspicious (e.g. N3/N4, E3/E4, S3/S4, W3/W4) vs inauspicious entry zones.
- **Marma Sthan**: Vulnerable diagonal energy lines connecting opposite cardinal/diagonal pada nodes, with intersection points highlighted.
- **Five Elements (Panch Tatva)**: Color-coded elemental zones (Water/North: Blue, Air/East: Green, Fire/South-East: Red, Earth/South-West: Yellow, Space/West & Center: Gray/White).

---

## Planned Implementation Phases

- [x] **Phase 0: Inspection & Technical Design**
  - Live site analyzed via browser subagent & high-res screenshot examination.
  - Grid geometry confirmed: Oriented bounding box (OBB) rotated around centroid first, then bounding box computed for 9×9 grid.
  - Classical Devta mapping confirmed: 32 outer + 13 inner = 45 Devtas.
- [x] **Phase 1: Project Architecture & HTML5 Canvas Foundation** (COMPLETED)
  - Standalone local web app (`index.html`, `css/style.css`, `js/state.js`, `js/canvas.js`, `js/app.js`).
  - Google UI flat, minimalist design system (clean cards, 2-4px border radius, Inter/JetBrains Mono typography, clean toggles).
  - Interactive Canvas with high-DPI scaling, smooth pan, mouse-wheel zoom centered on cursor, and floor plan upload (drag-and-drop / file picker).
  - Real-time compass needle dial synced with universal rotation slider and numeric degree input.
  - Verified in browser with zero console errors.
- [x] **Phase 2: Polygon Drawing & Centroid Engine** (COMPLETED)
  - Interactive multi-vertex polygon boundary drafting tool (click to place vertices, close polygon at start point or via Done button, interactive handle drag).
  - Pure functional geometry module ([`js/geometry.js`](file:///g:/Vastugrid/js/geometry.js)) implementing Shoelace formula for polygon area and exact center of mass centroid $(C_x, C_y)$.
  - Vertex numbering badges (0, 1, 2, ...), snap-to-close ring, rubberband preview line.
  - Clear red centroid marker with pinpoint and label.
  - Live Plot Metrics updates (Vertices count, calculated area in sq units, centroid coordinates, bounding dimensions).
- [x] **Phase 3: 9×9 Grid & Brahmasthan** (COMPLETED)
  - Universal rotation ($\theta$) rotating around the polygon centroid first.
  - Oriented bounding box (OBB) calculation for the rotated polygon extents.
  - Scaled 9×9 classical Vastu Purusha Mandala grid (81 equal padas) aligned to OBB with clean Google-style lines.
  - Central 3×3 Brahmasthan (9 sacred central padas) highlighted with solid red outline and soft energetic red fill.
  - Real-time rotation around centroid preserving exact spatial registration across pan, zoom, and orientation adjustments.
  - Layer toggles for 9×9 Grid and Brahmasthan verified.
- [x] **Phase 4: 45 Devtas Mapping Engine** (COMPLETED)
  - Complete classical Devta dictionary with all 45 Devtas (32 outer perimeter padas + 13 inner devtas) implemented in `js/devtas.js`.
  - Exact geometric mapping onto the 81 padas (Brahma in central 9 padas, 4 cardinal inner Devtas of 6 padas each, 8 diagonal inner Devtas of 2 padas each, 32 outer perimeter Devtas of 1 pada each).
  - Spatial field generation with boundaries, category color fills, and responsive centroid calculation.
  - Category-based Google UI color accents: Central Brahma (Red), Cardinal Inner (Google Blue), Diagonal Inner (Google Green), Outer Perimeter (Slate with Green for auspicious entrances).
  - Clean, legible text labels (Name, pada number, and entrance codes) with white contrast pill halos that rotate in sync with the grid orientation angle.
  - Zoom-responsive font sizing clamped to maintain readability without overlapping.
  - Layer switches for "45 Devtas" and "Devta Names" fully integrated with live toggle support.
  - Verified live in browser with real plot boundary and 25° rotation.
- [x] **Phase 5: 16 Directional Zones & 32 Entrance Padas** (COMPLETED)
  - 16 directional $22.5^\circ$ rays from the centroid, rotated dynamically by $\theta$ via `calculate16DirectionalZones` in `js/zones.js`.
  - 16 directional zone labels (N, NNE, NE ... NNW) with subtle Panch Tatva elemental fills (Water, Air, Fire, Earth, Space) and color-coded badges.
  - 32 perimeter entrance padas (N1–N8, E1–E8, S1–S8, W1–W8) calculated along the external boundary edges of the 9×9 grid via `calculate32EntranceGates`.
  - Auspicious entrance highlighting (N3/N4, E3/E4, S3/S4, W3/W4) with green boundary bars, luminous soft green fills, and green pill badges.
  - Integrated into state reactive pipeline and controlled by sidebar layer switches (`layers.zones16`, `layers.gates32`).
  - Unit tests verified and browser tested live at 25° rotation.
- [x] **Phase 6: Analysis Panel, Elemental Distribution & Area Metrics** (COMPLETED)
  - Pure calculation engine implemented in `js/analysis.js` (`calculateAreaMetrics`, `calculatePanchTatvaSummary`, `calculateGateAssessment`).
  - Real-time Plot Area, Brahmasthan Area (with exact 11.1% ratio), Pada Size (1/81), and bounding dimensions formatted with localized thousands separators.
  - Panch Tatva (Five Elements) multi-segment visual balance bar with Google color palette (Water #1a73e8, Air #1e8e3e, Fire #d93025, Earth #e37400, Space #5f6368).
  - Elemental distribution breakdown table detailing directional zones and exact percentages summing to 100%.
  - Entrance Gateways assessment grid highlighting all 4 cardinal auspicious gateways (N3/N4, E3/E4, S3/S4, W3/W4) with green indicator badges.
  - Reactive live updates in right sidebar as polygon points or rotation change.
  - Tested with unit tests and verified live in browser.
- [x] **Phase 7: Client-Side Export (PNG & PDF Report)** (COMPLETED)
  - Pure client-side high-resolution PNG export via `exportCanvasToPng` in `js/export.js` triggered by `#btnExportPng`.
  - Multi-page professional client PDF report generator via `generatePdfReport` in `js/export.js` triggered by `#btnExportPdf`.
  - Offline-first execution using bundled local jsPDF vendor library (`js/vendor/jspdf.umd.min.js`, 364 KB) with zero backend requirement.
  - Page 1 includes: Clean Google UI header banner, True North orientation degree, high-resolution canvas snapshot with border frame, comprehensive executive area & geometry summary table, and Vastu compliance findings card.
  - Page 2 includes: Panch Tatva (Five Elements) distribution breakdown table with directional zones and exact percentages, 32 perimeter entrance gateway assessment cards with the 8 auspicious gateways highlighted, and 45 Devtas Paramasayika structure summary.
  - Fully tested and verified live in browser with zero console errors.
- [x] **New Feature: Classical Marma Sthan Overlay** (COMPLETED)
  - Pure calculation in `calculateMarmaSthan` in [`js/geometry.js`](file:///g:/Vastugrid/js/geometry.js): 6 primary diagonal energy sutras (2 Mahamarma Karna sutras corner-to-corner + 4 Upamarma diagonal lines) and 9 sensitive intersection nodes (Central Nabhi, 4 Brahmasthan corners, 4 outer diamond cardinal points).
  - High-visibility rendering in `drawMarmaSthan` in [`js/canvas.js`](file:///g:/Vastugrid/js/canvas.js) with Google Red dashed lines (`#d93025`, `[8, 6]` dash pattern) and solid black circular markers with crisp white contrast rims.
  - Fully dynamic rotation: all lines and nodes rotate seamlessly around the polygon centroid in sync with the Universal Rotation ($\theta$).
  - Sidebar toggle control via existing “Marma Sthan” switch (`layers.marma`).
- [x] **New Feature: PDF Report Details Modal** (COMPLETED)
  - Clean Google UI flat modal dialog in `index.html` and `css/style.css` displaying when clicking "PDF Report".
  - Optional client metadata fields: Name, Phone, and Address.
  - Dual action buttons: "Skip & Generate" (bypasses details) and "Generate PDF" (includes client details).
  - Responsive inclusion in PDF: client details embedded in Page 1 subheader & footer and Page 2 header & footer across every page.
- [x] **New Feature: Undo & Redo History System** (COMPLETED)
  - Pure immutable history stack (`past` and `future` snapshots) in [`js/state.js`](file:///g:/Vastugrid/js/state.js) capped at 40 states.
  - Automatically records state snapshots on vertex addition, polygon closing, vertex drag release (`commitDragHistory`), and boundary clearing.
  - Pure action creators `undoAction()` and `redoAction()` recalculating metrics dynamically.
  - Dedicated top bar icon buttons (`#btnUndo` and `#btnRedo`) with reactive enabled/disabled states.
  - Full keyboard shortcut support: `Ctrl+Z` (Undo), `Ctrl+Y` and `Ctrl+Shift+Z` (Redo), with smart bypass when typing in modal inputs.
- [x] **New Feature: Clear Boundary vs. Reset All Workflow** (COMPLETED)
  - Replaced ambiguous, blocking `confirm()` button with two distinct, instant Google UI actions:
  - **Clear Boundary (`#btnClearBoundary`)**: Instantly removes boundary polygon, 9×9 grid, Brahmasthan, Devtas, 16 zones, 32 gates, and Marma Sthan while keeping the uploaded floor plan image and orientation intact. 100% undoable via `Ctrl+Z`.
  - **Reset All (`#btnResetAll`)**: Full workspace reset back to pristine initial state (clears floor plan, boundary, orientation, and zoom back to empty state prompt).
  - Tested live in browser and verified with zero console errors.
- [x] **Enhancement: Improved 32 Entrance Padas (Gates) Visual Style** (COMPLETED)
  - Segmented perimeter calculation in `calculate32EntranceGates` in [`js/zones.js`](file:///g:/Vastugrid/js/zones.js): partitions each of the four perimeter sides into 8 equal segments (North: N1–N8, East: E1–E8, South: S1–S8, West: W1–W8; 32 gates total).
  - Accurate outward normal calculations for each edge ensuring tick marks and labels always project outward away from the plot centroid regardless of rotation angle $\theta$.
  - Perpendicular divider tick marks rendered at every segment boundary.
  - Exterior badge placement: labels positioned cleanly outside the polygon perimeter, rotating synchronously with the Universal Rotation ($\theta$).
  - High-contrast Google UI styling:
    - Auspicious gateways (`N3, N4, E3, E4, S3, S4, W3, W4`) highlighted in Google Green (`#1e8e3e`) with star icons (`★ N3`), thicker stroke outlines (`3.5px`), and soft ambient glow.
    - Regular gateways styled in clean neutral slate/white pills (`#3c4043` text on `#dadce0` border).
  - Fully reactive to zoom scaling and layer toggle (`#toggleGates32`).
  - Preserved 100% backwards compatibility with sidebar Gate Assessment panel and PDF export.

- [x] **New Feature: Positive Land Energy Analysis (VastuGrid Authentic)** (COMPLETED)
  - Pure calculation engine in `calculatePositiveLandEnergy` in [`js/analysis.js`](file:///g:/Vastugrid/js/analysis.js) and `ENERGY_PATTERNS_DICT` mapping classical Ayaadi/Yoni attributes (0–7 remainders).
  - Derived from rotated bounding dimensions ($W \times H$) with longer side as Length ($L$) and shorter side as Breadth ($B$).
  - **Income Potential**: $\text{Length} \times 8$ (e.g. $60 \times 8 = 480.00$) with upward trend indicator.
  - **Expenditure Tendency**: $\text{Breadth} \times 10.8$ (e.g. $40 \times 10.8 = 432.00$) with downward trend indicator.
  - **Financial Balance Comparison**: Reactive card evaluating $\text{Income} \ge \text{Expenditure}$ ("Good financial prospects for this land") vs. $\text{Expenditure} > \text{Income}$ ("Higher financial outflow tendency").
  - **Energy Pattern (Remainder Method)**: $(L + B) \div 8 \to \text{remainder} \in [0, 7]$ with full classical interpretation:
    - Remainder 0: Kaka (Crow) — Inauspicious / Caution
    - Remainder 1: Dhwaja (Flag) — Auspicious (success, sustained growth)
    - Remainder 2: Dhooma (Smoke) — Inauspicious (anxiety, restlessness)
    - Remainder 3: Simha (Lion) — Auspicious (power, dynamic courage)
    - Remainder 4: Shwana / Vrishabha — Best (Positive Energy: dhan, sukh, santan, progress)
    - Remainder 5: Vrisha (Bull) — Auspicious (steady prosperity, financial stability)
    - Remainder 6: Khar (Donkey) — Inauspicious (instability, frequent hurdles)
    - Remainder 7: Gaja (Elephant) — Best (abundant wealth, royal status)
  - **Length Proportion (Ratio)**: $L / B$ ratio evaluated against standard $\le 2.5$ threshold, displaying max allowed length ($2.5 \times B$).
  - **Final Land Energy Verdict**: Reactive status cards for "RECOMMENDED LAND" (Gold/Cream), "CONDITIONALLY SUITABLE" (Blue/White), and "REMEDIES REQUIRED" (Red/Soft Pink).
  - **Google UI Integration**: Added clean section `.land-energy-section` in right sidebar between Area Metrics and Panch Tatva Balance.
  - **PDF Report Integration**: Included Positive Land Energy findings in Executive Vastu Insights on Page 1 of the generated PDF report.
  - **Verified live in browser & unit tests**: Tested across standard rectangle ($60 \times 40$), square ($40 \times 40$), and elongated plots ($90 \times 20$), verifying dynamic recalculation on rotation, drafting, and undo/redo.

---

## Current Status
- **Core Engine & Features 100% Completed & Verified**:
  1. Phase 1: Foundation & High-DPI Canvas Setup
  2. Phase 2: Polygon Drawing & Centroid Engine
  3. Phase 3: 9×9 Classical Vastu Grid & Brahmasthan (OBB)
  4. Phase 4: 45 Devtas Mapping Engine (Paramasayika 81-Pada Mandala)
  5. Phase 5: 16 Directional Zones & 32 Entrance Padas (Auspicious Gates)
  6. Phase 6: Live Analysis Panel, Panch Tatva Distribution & Area Metrics
  7. Phase 7: Client-Side Export (High-Res PNG & 2-Page Executive PDF Report)
  8. Classical Marma Sthan Overlay (6 Energy Sutras, 9 Sensitive Nodes)
  9. PDF Report Details Modal (Name, Phone, Address in headers & footers)
  10. Undo & Redo History System (`Ctrl+Z`, `Ctrl+Y` & Top Bar Buttons)
  11. Instant Clear Boundary & Complete Reset All Controls
  12. Improved 32 Entrance Padas Visual Style (Segmented Perimeter, Dividers, Outward Badges)
  13. Positive Land Energy Analysis Module (Income Potential, Expenditure Tendency, Remainder Method, Ratio & Final Verdict)
- **Awaiting User Review & Approval** before proceeding to next features (Vithi Mandal / 16 Bar Chart).


