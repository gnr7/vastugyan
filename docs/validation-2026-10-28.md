# Accuracy validation — demo floor plans (28 Oct 2026)

**Purpose:** Check Vastu Mandala Studio's results before publishing. The checks compare against:
- an independent re-calculation of every number,
- the classical 81-pada references practitioners use,
- the behaviour VastuGrid shows in its own screenshots and site.

**Not covered:** VastuGrid's actual output for these two plans has **not** been compared yet; the last section is a worksheet for that.

Plans tested: `demofloorplan_1.jpg` (villa with garage, pool and patio) and `demofloorplan_2.jpg` (2-bed house, 41′0″ × 30′10″). Neither drawing has a North arrow, so North was tested at 0° (up), 30° and 45°.

## 1. Are our calculations internally correct? — Yes

Every area was recomputed by a second, independent method (pixel sampling at 0.5 px, not the app's polygon clipping):

| Check | Plan 2 | Plan 1 | Result |
|---|---|---|---|
| Plot area | 1,069.7 sq ft both ways | 800,623 px² both ways | Exact |
| Centroid (centre of gravity) | (422.9, 264.9) both ways | (719.2, 555.5) both ways | Exact |
| 16-zone area shares, max difference | 0.005 % points | 0.005 % points | Match |
| Vithi ring shares, max difference | 0.07 % points | 0.035 % points | Match (sampling at pada edges) |
| 32 entrances: each inside its 11.25° slice, together covering the whole wall | 32/32, 100 % | 32/32, 100 % | Correct at 0°, 30°, 45° |
| Scale from the drawing | 41′0″ line = 641 px → 15.63 px/ft; 30′10″ side gives 15.73 px/ft (0.6 % apart) | No dimensions on drawing | Consistent |

Hand check, plan 2: main block 41.13 × 22.96 ft = 944.4 + laundry/porch wing 15.54 × 8.06 ft = 125.3 → **1,069.7 sq ft**, the same as the app.

## 2. Does each overlay follow the standard definition?

| Overlay | Our method | Classical / VastuGrid reference | Verdict |
|---|---|---|---|
| 16 zones | 22.5° sectors from the plot's centroid, N = 348.75°–11.25° | Same: VastuGrid says "16 directional sectors projected angularly from the property centroid" | ✅ Matches |
| 16 bar chart | Area share per zone; average 6.25 %; ±1 SD bands coloured green / blue / light blue / red | Same method and colours as VastuGrid's chart | ✅ Matches; VastuGrid also shows band counts and hover values |
| 32 entrances | 11.25° slices from the centroid; N1 starts at NW, E1 at NE, S1 at SE, W1 at SW; auspicious N3 N4 E3 E4 S3 S4 W3 W4 | VastuGrid: "calculates the angular positions of all 32 perimeter padas"; same order in its screenshots | ✅ Matches; VastuGrid also gives each of the 32 a classification in its report |
| 45 Devta layout | Brahma 9, Aryama / Vivasvan / Mitra / Prithvidhara 6 each, 8 inner corner devtas 2 each, 32 outer 1 each = 81; numbered 1–45 clockwise from Shikhi (14) at NE | Paramasayika 81-pada layout; numbering matches VastuGrid's screenshot | ✅ Layout matches · ⚠️ Shape differs (see the 9×9 grid row) |
| **Brahmasthan** | Central 3×3 of the plot's bounding rectangle, centred on the rectangle's middle | VastuGrid: "central 9-pada zone (1/9th of property area)"; its screenshots centre it on the centroid and follow the plot's shape | ❌ **Different**, see below |
| **9×9 grid / 45 Devtas on irregular plots** | Rectangle around the plot; padas can fall outside the building | VastuGrid ("centroid aligned") draws the rings as smaller copies of the plot outline | ❌ **Different on L-shaped or irregular plots**; the same on rectangles |
| Marma sthan | 2 corner diagonals + 4 parallel sutras, 9 nodes, on the grid | VastuGrid shows a similar diagonal lattice | ⚠️ Looks the same; exact nodes not confirmed |
| Vithi mandal | 4 rings (9 / 16 / 24 / 32 padas) on the 9×9 grid | Classical Brahma / Daivika / Manushya / Paishachika | ✅ Classical · ⚠️ VastuGrid's exact ring shape unknown |
| **Panch tatva** | Element by zone: Water = NNW–NE, Air = ENE–ESE, Fire = SE–S, Earth = SSW–SW, Space = WSW–NW | VastuGrid's site: "Water (NE), Air (E), Fire (SE), Earth (SW), and Space (Center)". Classical: NW is Vayu (Air) | ❌ **Space is a centre element there, but a western sector here; NW is Space here but Air classically** |
| **Land energy** | Income = L × 8, expenditure = B × 10.8, (L + B) ÷ 8 remainder; L and B in feet from the grid | Matches VastuGrid's 60 × 40 example exactly | ❌ **Bug:** L and B change with North rotation (see below) |

### Discrepancy details

**Brahmasthan (affects both plans)**

| | Plan 2 | Plan 1 |
|---|---|---|
| Our Brahmasthan | 141.8 sq ft = 13.3 % of the plot | 140,018 px² = 17.5 % of the plot, and **31 % of it lies outside the house** (over the pool and patio) |
| VastuGrid-style (1/9 of the plot) | 118.9 sq ft = 11.1 % | 88,958 px² = 11.1 % |
| Our centre vs the centroid | 2.67 ft apart | 28.6 px apart (2 % of the plan width) |
| North turned to 30° (grid following North) | Grows to **229.8 sq ft** | Grows similarly |

Practitioners will notice this first: different rooms will be "in the Brahmasthan" than in VastuGrid.

**Land energy bug (plan 2):** at North 0° we use L = 41.1, B = 31.0 ft (expenditure 334.8 > income 328.8, remainder 0 → "Remedies required"). At North 30°, with the grid following North, the grid grows to 51.1 × 40.5 ft and the verdict flips to "Conditionally suitable". The house didn't change, so L and B must come from the real walls, not the North-rotated grid.

**Remainder sensitivity:** (L + B) is rounded to whole feet before ÷ 8. 41.1 + 31.0 = 72.1 → 72 → remainder 0, but a trace giving 71.4 → 71 → remainder 7 ("Best"). VastuGrid's rounding rule (feet only? feet and inches? inside or outside wall face?) must be confirmed, or results will flip on small tracing differences.

**Devta names to confirm with practitioners:** SE corner "Anila" (some charts use Agni / Anala); the split of the two-pada inner corner devtas (e.g. Aapa vs Aapavatsa) inside each 2 × 2 block.

## 3. Features VastuGrid has that we don't

| VastuGrid feature (from its toolbar and site) | Status here |
|---|---|
| "32 gates 81 pad" layer: outer-ring padas that follow the plot shape | ❌ Missing (we have angular entrances plus rectangular devtas) |
| "Area Analysis" switch | ❌ Missing / unclear: likely area labels per zone or room on the plan |
| 32-entrance classification table in the PDF (each gate's result) | ⚠️ We only mark the 8 auspicious gates |
| Brahmasthan boundary coordinates and "non-obstruction" status in the report | ❌ Missing |
| Land Energy Checker (pre-purchase: slope, road frontage, surroundings, corner cuts and extensions, soil) | ❌ Missing (we only have the L × B formulas) |
| Numerovastu (house number and birth date) | ❌ Missing |
| Shakti Chakra and 8 planets (AstroVastu wheel) | ❌ Missing |
| Room Mapper (draw rooms with areas) | ❌ Missing |
| Bar chart: counts per band, hover values | ⚠️ Minor; chart and bands are there |
| Cut and extension detection per zone ("missing sectors, over-extended zones") | ⚠️ We show strong and weak zones, but don't label cuts and extensions |

We have and VastuGrid may not: real-unit Set Scale, wall-alignment switch, Vithi areas with guidance, autosave, offline install, share sheet.

## 4. Second round: remaining layers and everyday use

| Check (both plans unless noted) | Result | Verdict |
|---|---|---|
| 45 Devtas: count, 81 padas each covered once, every outer Devta on its correct side, at North 0° and 45° | 45 / 81 / 0 duplicates / 0 wrong side | ✅ |
| Devta name on each of the 32 entrances | 32 / 32 match | ✅ |
| **Devta pada vs entrance with the same code** (e.g. Mukhya pada vs N3 on the wall) | Up to **25.7°** apart; 9 (plan 2) and 13 (plan 1) of 32 are more than one entrance-width off | ❌ The entrances use compass slices, the padas use equal grid squares, so the same name lands in two places. VastuGrid keeps these as two layers ("32 Gates" and "32 gates 81 pad") |
| **Devtas outside the building** (pada centre not inside the traced plot) | Plan 2: **10 of 45**; plan 1: **20 of 45, including Brahma** | ❌ Rectangle grid on irregular homes (see section 2) |
| Devta names layer | Readable, turns with the grid; "Brahma" overlaps the "Centroid" label | ⚠️ Minor |
| Marma: 6 lines, 9 points, every point a real crossing of two lines | Correct | ✅ Self-consistent |
| **Marma line angle** | Ours: corner to corner, **32°–49°** depending on plot shape. VastuGrid screenshot measured with a Hough transform: lines at **≈45° and ≈135°**, while its plot's corner-to-corner angle is 57° | ❌ VastuGrid appears to draw Marma lines along true diagonals; ours tilt with the plot's proportions |
| **Panch tatva overlay switch** | Pixel-identical to the 16 zones overlay (0 differing bytes) | ❌ No separate Five Elements view; VastuGrid describes Space at the centre |
| 16 zone tints | Fill a large circle over the whole canvas | ⚠️ VastuGrid's screenshot draws the 16 directions inside the plot only |
| PDF vs screen (area, Brahmasthan, pada, grid size, land energy, Panch Tatva, Vithi, bar chart page) | Every value identical; 3 pages; plan image and chart embedded | ✅ |
| **Brahmasthan label "(11.1%)"** on screen and in the PDF | Share of the grid rectangle, not of the plot (real: 13.3 % and 17.5 %) | ❌ Misleading |
| PDF entrance section | Fixed text (always N3/N4, E3/E4, S3/S4, W3/W4) | ⚠️ VastuGrid gives a per-plot table of all 32 |
| PDF page 1 picture | A snapshot of the current screen view, so it depends on zoom and pan | ⚠️ A zoomed-in screen gives a cropped plan in the report |
| PNG export | Renders (1.25 MB) | ✅ |
| Grid aligned to walls: both plans tilted 17°, 63°, 101° with North turned the same | Zones, Vithi, Devta positions and land energy identical to the untilted plan; grid hugs the walls | ✅ Exact |
| Rotations 0, 11.25, 22.5, 348.75, 359.5, 360, −1, 720.25 | Correct; 360 → 0, −1 → 359, 720.25 → 0.25 | ✅ |
| Tiny (3 px), huge (1,000,000 px), thin (1000 × 5) plots, duplicate or collinear corners | No errors; totals correct | ✅ |
| **U-shaped / courtyard plan (centre point outside the building)** | 32 entrances cover **111 %** of the wall (overlapping) | ❌ Bug |
| **Self-crossing boundary** (corners traced out of order) | Accepted silently; zone and Vithi totals wrong | ❌ Needs a warning |
| Undo / redo of the boundary; scale kept | Correct | ✅ |
| Undo of North rotation or scale | Not undoable | ⚠️ |
| Autosave with the real floor plan image, corners, North and scale; restored after reload | Correct | ✅ |
| **Finger tracing of plan 1 on a phone at full-plan zoom** | Closed after **17 of 19 corners**: corners within 30 screen px of point 0 close the shape instead of being added (5 image px per screen px) | ❌ Bug; workaround is to pinch-zoom first |
| Phone, dark mode, magnifier | Works; at full-plan zoom the 32 entrance and 16 zone labels pile up and some clip at the screen edge | ⚠️ Clutter |

## 5. Third round: evidence found online, and the fixes

No one on the team has VastuGrid access, so the reference was rebuilt from public sources:

- **VastuGrid's public sample report**: a 12-page PDF linked from vastugrid.com, one page per layer for one plan. Its plan was traced, and North was measured from its 32-gate rays: they fall at 49.4°, 60.4°, 71.9°, 83.2° and 94.4°, spaced 11.25° apart, so North = **49.4°**.
- **Brihat Samhita ch. 53**, N. Chidambaram Iyer's translation (1884, public domain; [wisdomlib](https://www.wisdomlib.org/hinduism/book/brihat-samhita/d/doc229297.html)):
  - 43–45: the 32 outer Devtas
  - 63–64: the six vamsa lines and nine atimarma points
  - 72–75: the result of a door in each of the 32 entrance positions
- **RoxyAPI's Vastu documentation** ([guide](https://roxyapi.com/docs/guides/vastu)): an independent implementation that cites the same verses. It lists the atimarma squares as 23, 31, 33, 39, 41, 43, 49, 51, 59.

**Our app against VastuGrid's own sample plan** (now an automated test):

| | VastuGrid report | Ours |
|---|---|---|
| Centroid | ≈ (450, 518) | (449.2, 518.8) |
| Largest direction | SE 9.8 % | SE 9.86 % |
| Spread (1 SD) | ± 2.0 % | ± 2.07 % |
| Strong / weak bands | 14 of 16 the same; E and NNW sit within 0.07 points of a band line (tracing precision) | |
| Five Elements regions | Water NNW–NE, Air ENE–ESE, Fire SE–S, Earth SSW–SW, Space WSW–NW | Identical |

**What changed** (all checked on both demo plans and VastuGrid's plan):

| Item | Before | Now | Evidence |
|---|---|---|---|
| Mandala shape | Rectangle around the plot; up to 20 of 45 Devtas outside the house | **Follows the plot**: rings are copies of the outline scaled about the centroid. Brahma is the 1/3-scale copy (exactly 1/9 of the plot); the 32 outer Devtas are 11.25° slices of the ring between the 7/9 copy and the wall. 0 Devtas outside the house on all three plans. Rectangle still available (Layers switch) | VastuGrid report pages 3, 4, 8 |
| Brahmasthan | 13.3 % / 17.5 % of the plot, labelled "11.1 %" | 1/9 of the plot, centred on the centroid; label shows the real share | VastuGrid site ("1/9th of property area") and report |
| Marma | Side lines 3 padas off the diagonals; points on pada corners | Lines 2 padas off (Mukhya–Bhrisha, Jayanta–Bhringaraja, Vitatha–Shosha, Aditi–Sugriva); points on squares 23 31 33 39 41 43 49 51 59; straight, parallel, centred on the centroid | Brihat Samhita 53.63–64; RoxyAPI; VastuGrid report p. 7 |
| Inner corner Devtas | NE and SW pairs anticlockwise | Clockwise 6→7, 8→9, 10→11, 12→13 | VastuGrid report p. 4 |
| Outer Devta vs entrance | Up to 25.7° apart | The same slice (Shikhi = E1, Diti = N8, …) | VastuGrid report pp. 3–4 |
| "32 gates 81 pad" | Missing | New layer: the 32 outer padas with their codes | VastuGrid report p. 3 |
| 16 zones / Five Elements | Tints over the whole canvas; Five Elements view identical to 16 zones | Clipped to the plot; Five Elements draws merged "Water area", "Air area", … regions | VastuGrid report pp. 1, 9 |
| Land energy L × B | Changed with North (41 × 31 → 51 × 40.5 ft) | From the plot's own walls (41.1 × 31.0 ft at any North); optional typed size; borderline remainders flagged | Bug |
| Entrances on U-shapes | Overlapped (111 % of the wall) | Each piece of wall in exactly one entrance (100 %) | Bug |
| Self-crossing boundary | Silently wrong totals | Red edges, warning, results paused until fixed | Bug |
| Phone tracing | Closed after 17 of 19 corners | All 19 placed; magnifier shows "Lift to close" | Bug |
| Undo | Boundary only | Also North (one step per turn) and Set Scale | Gap |
| PDF | Picture depended on zoom; fixed entrance text | Fixed-size picture of the whole plan; page 4 lists all 32 entrances with Devta, wall length and the Brihat Samhita result | VastuGrid report lists per-entrance results |

**Still different or unconfirmed:**
- **Vithi Mandal ring sizes:** VastuGrid's sample rings measure ≈ 0.39, 0.59, 0.78 and 0.95 of the plot. Ours are the classical 3/9, 5/9, 7/9 and the wall. Only the 7/9 ring agrees. One sample can't pin down VastuGrid's rule.
- **Marma spacing:** our lattice uses even pada spacing, which looks very close to VastuGrid's page but isn't measured to the pixel.
- **Entrance ratings:** we mark the 8 commonly favoured gates (N3 N4 E3 E4 S3 S4 W3 W4). The Brihat Samhita results differ on some (e.g. W3 "want of wealth and sons", W5 "opulence"). Both are shown in the PDF.
- **Not built:** Numerovastu, Shakti Chakra and the 8 planets, Room Mapper, the full Land Energy Checker (slope, road frontage), and VastuGrid's "Area Analysis" switch (its meaning isn't documented).

## 6. Worksheet: fill in from VastuGrid (optional)

Trace the **same corners** in VastuGrid (pixel coordinates on the original image, x across, y down) and set North to 0° (up). Small tracing differences of ±1 % are expected.

**Plan 2 corners:** (78,57) (721,57) (721,542) (478,542) (478,416) (78,416) · scale: 41′0″ = (79,17)→(720,17)

**Plan 1 corners:** (456,136) (1417,136) (1417,734) (1144,734) (1144,562) (692,562) (692,800) (772,800) (772,1031) (9,1031) (9,622) (180,622) (180,590) (346,590) (377,590) (377,420) (408,420) (408,211) (456,211) · pool and patio excluded

| Value (North 0°) | Ours, plan 2 | VastuGrid, plan 2 | Ours, plan 1 | VastuGrid, plan 1 |
|---|---|---|---|---|
| N | 3.29 % | | 4.37 % | |
| NNE | 3.88 % | | 5.16 % | |
| NE | 6.83 % | | 9.11 % | |
| ENE | 7.97 % | | 14.07 % | |
| E | 6.76 % | | 10.18 % | |
| ESE | 7.97 % | | 2.29 % | |
| SE | 10.43 % | | 0.00 % | |
| SSE | 6.29 % | | 0.01 % | |
| S | 1.74 % | | 3.73 % | |
| SSW | 2.05 % | | 6.46 % | |
| SW | 3.62 % | | 11.66 % | |
| WSW | 8.87 % | | 14.77 % | |
| W | 9.05 % | | 5.45 % | |
| WNW | 10.53 % | | 3.11 % | |
| NW | 6.85 % | | 4.50 % | |
| NNW | 3.88 % | | 5.13 % | |
| Bar chart: average ± SD | 6.25 ± 2.77 % | | 6.25 ± 4.37 % | |
| Strong (> avg + 1 SD) | SE, W, WNW | | ENE, SW, WSW | |
| Weak (< avg − 1 SD) | N, S, SSW | | SE, SSE | |
| Panch tatva W / A / F / E / S | 17.9 / 22.7 / 18.5 / 5.7 / 35.3 % | | 23.8 / 26.5 / 3.7 / 18.1 / 27.8 % | |
| Brahmasthan area | 141.8 sq ft | | 17.5 % of plot | |
| Land energy L × B, remainder | 41.1 × 31.0 ft, 0 | | no scale | |
| Which room holds the Brahmasthan centre | Living room | | Just outside the house, at the pool edge (the centroid itself is on the terrace) | |
