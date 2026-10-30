# Vastu Mandala Studio — Development Progress

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
    - *South*: Anila (SE), Poosha, Vitatha, Brihatkshata, Yama, Gandharva, Bhringaraja, Mriga
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

- [x] **Gap Fixes after Review** (COMPLETED, 2026-10-28)
  - **App renamed** to *Vastu Mandala Studio* (title, logo, PDF, export filenames) so it no longer uses the commercial product's name.
  - **Set Scale tool** (`#btnSetScale`): click both ends of a wall, enter its real length in feet or metres. Areas, pada size and grid dimensions show real sq ft / sq m everywhere (sidebar + PDF). The scale survives Clear Boundary and undo/redo; Reset All clears it. State: `calibration`, `isCalibrating`, `calibrationPoints`; actions `setCalibrationMode`, `addCalibrationPoint`, `applyCalibration`.
  - **Positive Land Energy uses real feet**: the old pixels ÷ 10 guess is gone. Until a scale is set the card shows *SET SCALE*. Metre scales are converted to feet. The remainder table keeps the VastuGrid-style results (4 = best) but drops the borrowed Yoni names (Shwana, Gaja…), because the classical Ayadi method computes and reads differently.
  - **Real Panch Tatva**: each 22.5° zone now stores the real plot area inside it (`calculateZoneAreas`, Sutherland–Hodgman clip of the plot against each zone wedge). Element shares are the sum of their zones' areas, so they change with the plot's shape. Element zone lists now come from `ZONES_16_DATA`, so the panel matches the map colours (NNW is Water, NW is Space). This is also the data the 16 Bar Chart needs.
  - **32 entrances by compass angle**: 32 slices of 11.25° from the centroid, rotated with North (N1 starts at NW, N4/N5 either side of North, E1 at NE…). Each slice is drawn where it meets the **real plot boundary** (follows corners and L-shape notches) instead of 8 equal pieces of the bounding box. Gate names still come from the 32 outer Devtas.
  - **Grid alignment toggle** (`#toggleGridWalls`, state `gridAlign`): *Off* keeps the old behaviour (9×9 grid, Devtas and Marma turn with North). *On* lays the grid on the plot's walls (minimum-area rectangle), choosing the side that faces nearest North as the grid's North side. Zones and entrances always follow North. `metrics.gridAngle` holds the angle the grid was laid at.
  - **Tests**: `scratch/test_gap_fixes.js` (19 assertions: zone areas sum to the plot area, gates tile the perimeter exactly and lie on the boundary, 60×40 ft gives 480/432/remainder 4, metre conversion, wall alignment on a 20° tilted plot). Older test scripts updated to the new function signatures. `test_phase7.js` still fails in Node (jsPDF needs a browser); this was already failing before these fixes.

- [x] **New Feature: 16 Direction Bar Chart** (COMPLETED, 2026-10-28)
  - `calculate16BarChart` in [`js/analysis.js`](js/analysis.js): each of the 16 zones' share of the real plot area (from `calculateZoneAreas`), in compass order N → NNW. The average is always 6.25% (shares sum to 100%); the spread is the population standard deviation over the 16 shares. Bars are grouped by `BAR_BANDS`: green *strong* (above avg + 1 SD), blue *above average*, light blue *below average*, red *weak* (below avg − 1 SD). Also returns max/min direction and the strong/weak lists.
  - Renderer in [`js/barchart.js`](js/barchart.js) (`draw16BarChart`, `barChartToDataUrl`): high-DPI canvas with % labels, dashed average / ±1 SD lines and a two-row legend under the axis. The same drawing is used by the popup and the PDF.
  - **Popup**: "View 16 Bar Chart" button under Panch Tatva Balance (disabled until the plot is closed). Shows the chart plus Total Area (real units once Set Scale is applied), Average ± SD, Max and Min Direction. Redraws live while open (dragging corners, rotation, undo). **Export PNG** saves the chart image.
  - **PDF page 3** (only when a closed plot exists, otherwise the report stays at 2 pages): chart image, directional balance summary, strong/weak direction lists and a 16-row table (area, share, element, status). Page footers now say "of 3".
  - Tests: 6 new assertions in `scratch/test_gap_fixes.js` (25 total), all passing. Checked live in the browser with an L-shaped plot: at 0° the max is SSW 12.8% and the min SE 0.9%; at 45° every bar shifts two places (SSE / E).

- [x] **Mobile & Tablet App Redesign** (COMPLETED, 2026-10-28)
  - **Touch input** ([`js/canvas.js`](js/canvas.js)): pointer events for mouse, pen and touch. One finger: press-and-lift places a point (a magnifier above the finger shows the exact spot), drag corners with a 26 px grab radius, pan on empty canvas. Two fingers: pinch-zoom and pan around their midpoint; a second finger cancels a half-done drag. Lifting within 30 px of point 0 closes the boundary. Haptic ticks on Android.
  - **Layout** ([`index.html`](index.html), [`css/style.css`](css/style.css), [`js/ui.js`](js/ui.js)): the canvas fills the screen. A bottom dock holds Draw, Scale, Layers, Analysis and Export. On phones one panel is a draggable bottom sheet (peek / half / full, flick to move a step). It hides while tracing and its peek shows the plot area and verdict. On tablet landscape and desktop (≥1024 px, or ≥900 px landscape) the same panel is a side panel with tabs and the dock floats as a pill. Dialogs become bottom sheets on phones. Safe-area insets handle notches and the home bar.
  - **Design system "Ivory & saffron"**: sandalwood ivory, lamp-black ink, kesar saffron accent, temple brass, kumkum red; Marcellus (titles) + Hanken Grotesk (text, tabular figures); automatic dark mode; layer tiles; action rows; toasts instead of browser alerts; a 3-step first-run guide.
  - **Brass compass dial** on the canvas: drag to turn North (haptic tick every 22.5°), tap for the North panel with a large dial, slider, ±1° steps and the grid-alignment switch.
  - **Installable offline app**: `manifest.webmanifest`, icons in `icons/` (any, maskable, Apple touch), `sw.js` (network-first app shell, cache-first fonts). Verified in headless Chrome: registers, caches 22 files, reloads fully offline. (The Claude desktop browser pane doesn't run service workers.) Install action on Android/Chrome, Add to Home Screen hint on iOS.
  - **Autosave** ([`js/persist.js`](js/persist.js)): boundary, North, scale, layers and the floor plan image are kept in IndexedDB and restored on launch. Start over clears them.
  - **Sharing**: PDF, plan image and bar chart go to the phone's share sheet on touch devices and download elsewhere. **Take photo** opens the camera for a printed plan.
  - Fixes found on the way: the start screen no longer reappears after "Use Blank Canvas"; fit-to-view handles plots that don't start at (0, 0) and keeps clear of the dock and sheet; the wide-layout canvas no longer grows taller than the window.

- [x] **New Feature: Vithi Mandal** (COMPLETED, 2026-10-28)
  - The four concentric rings of the 81-pada mandala on the 9×9 grid: **Brahma** (centre 3×3, 9 padas), **Daivika** (16), **Manushya** (24), **Paishachika** (outer ring, 32). `VITHI_RINGS` and `calculateVithiMandal` are in [`js/geometry.js`](js/geometry.js) and stored as `metrics.vithi`. Rings follow the grid in both alignment modes.
  - Each ring's area is the real plot clipped to its outer square minus its inner square, so the four areas always sum to the plot area. `fillPct` shows how much of a ring the plot actually fills, which flags cuts (an L-shape notch reaching into Brahma shows "plot fills 94% of the ring").
  - Canvas: `drawVithiMandal` draws soft ring tints (kumkum, brass, tulsi green, earth) under the grid lines, with a name pill on each ring's top band that rotates with the grid. Turned on by the new **Vithi mandal** tile in Layers.
  - Analysis card: each ring shows its Sanskrit name, share of the plot, padas, real area (sq ft / sq m once Set Scale is applied) and short traditional guidance (keep Brahma open; Paishachika for boundary walls, storage, stairs and service rooms). `VITHI_DATA` and `calculateVithiSummary` are in [`js/analysis.js`](js/analysis.js).
  - PDF: section 4 on page 2 lists the four rings with padas, area, share and guidance.
  - Tests: 4 new assertions (29 total). A square plot gives exactly 9/16/24/32 padas; ring areas sum to the plot for an L-shape at any rotation in both grid modes; the L-shape's cut shows as a partly filled outer ring.

- [x] **Accuracy Fixes from the Validation Review** (COMPLETED, 2026-10-28) — details and evidence in [`docs/validation-2026-10-28.md`](docs/validation-2026-10-28.md)
  - **Plot-following mandala** ([`js/mandala.js`](js/mandala.js), default; classical rectangle via the Layers switch): rings are copies of the plot scaled about the centroid; Brahma = 1/3-scale copy (exactly 1/9 of the plot); the 32 outer Devtas are 11.25° slices of the ring between the 7/9 copy and the wall, the same slices as the entrances. Matches VastuGrid's public sample report.
  - **Marma** per Brihat Samhita 53.63–64: vamsa lines two padas off the diagonals, atimarma on squares 23 31 33 39 41 43 49 51 59; straight and centred on the centroid.
  - Inner corner Devtas run clockwise (NE and SW pairs swapped) to match VastuGrid's numbering.
  - New **32 gates 81 pad** layer; 16 zones and the new **Five Elements** view are clipped to the plot.
  - Bugs fixed: Land Energy L × B now from the walls (optional typed size, borderline flag); entrances partition the wall exactly on U-shaped plans; self-crossing boundaries are flagged and paused; phone tracing no longer closes early (12 px snap, "Lift to close" badge); undo covers North and Set Scale; Brahmasthan label shows its real share of the plot.
  - PDF: fixed-size plan picture, new page 4 with all 32 entrances (Devta, wall length, Brihat Samhita result).
  - Tests: [`scratch/test_validation.js`](scratch/test_validation.js) (13, including VastuGrid's own sample plan) and a rewritten [`scratch/test_marma.js`](scratch/test_marma.js).

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
  14. Gap fixes: Set Scale & real units, real-area Panch Tatva, angular 32 entrances on real walls, grid alignment toggle, rename
  15. 16 Direction Bar Chart (popup with Export PNG + PDF page 3)
  16. Mobile & tablet app redesign (touch, bottom sheet, compass dial, ivory & saffron, offline install, autosave, share)
  17. Vithi Mandal (4 rings with real-area shares, guidance, canvas overlay, PDF section)
  18. Accuracy fixes: plot-following mandala, Brihat Samhita Marma, 32 gates 81 pad, clipped zones and Five Elements, five bugs
  19. Renamed to **Vastu Gyan**; responsive fixes (plan refits on rotation/resize, side panel on landscape phones, all panel tabs visible on small screens); WhatsApp/SMS link preview; published on Vercel (only the app files, via `.vercelignore`)
  20. Compass wheel layer (16-zone ring around the plot with the North line and angle), Five elements style setting (Classic as VastuGrid, or Loose Earth for NE and NW with Hard Earth SSW and SW) carried into Analysis, the 16 bar chart and the PDF, and element labels that always show
  21. Smaller PDF reports: compressed PDF, PNG plan for traced plans and JPEG (90%) over a floor plan photo; about 13 MB down to 0.4–0.6 MB
  22. Clean plan: one-tap views (Plan, Mandala, Zones, Entrances, Marma), one shared label board with priorities (plain text with a halo, pills only for elements, auspicious entrances and North), one colour fill at a time, no duplicate labels, North pointer kept in the ring; always opens in light mode with a dark toggle in the top bar
  23. Zoom that keeps the plan in view: zoom-out stops at 85% of the fitted size and glides the plan back to the centre, panning and zooming in keep part of the plan on screen, the +/- buttons zoom around the visible centre, and double-tap or double-click fits the plan
  24. Fixes from a live side-by-side with VastuGrid: the North number is now the compass bearing the top of the plan faces (saved projects convert automatically), the 32 outer Devtas are centred on the compass points, and land energy reads even remainders as positive, odd as negative, exact division as 8
- All features from the original wish list are built. **Awaiting user review** before anything further.


