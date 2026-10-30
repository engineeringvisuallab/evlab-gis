# EVLab GIS
Free, browser-based GIS by Engineering Visual Lab (EVLab). *Engineering • Innovation • Learning*
Static site (HTML, CSS, JavaScript ES modules, Leaflet, Proj4js, Turf.js). No build step, no backend, no account, no API key for local data.

Suggested URL: https://engineeringvisuallab.github.io/evlab-gis/

## Run locally
`python3 -m http.server 8000` in this folder, then open http://localhost:8000 (ES modules do not load from file://).

## Deploy to GitHub Pages
1. Create the repository `evlab-gis`, push this folder to `main`.
2. Settings > Pages > Source: **GitHub Actions** (uses `.github/workflows/pages.yml`, which runs the tests first), or choose "Deploy from a branch", `main`, `/ (root)`.
3. All paths are relative and `.nojekyll` is present, so subdirectory hosting works (checked statically by `tests/static.test.mjs`; not yet verified on a live Pages site).
4. Optional: run `scripts/vendor-deps.sh` to copy the pinned libraries into `lib/` and point `index.html` at them, so the app does not depend on unpkg.

## Feature matrix
| Area | Implemented | Partial | Planned / not implemented |
|---|---|---|---|
| Workspace | Toolbar, layer panel, map, scale, cursor coordinates, north indicator, status bar | Properties panel is split into symbology, CRS, analysis, civil, raster sections | Feature info panel (identify popup is available) |
| Import | GeoJSON, CSV (comma, lat/lon or projected X/Y with CRS), KML, GPX, ESRI ASCII grid | KML: geometry and attributes only (no styles, KMZ, NetworkLink); CSV: comma delimiter only | Shapefile ZIP, GeoPackage, GeoTIFF (clear message shown) |
| Layers | Visibility, order, rename, remove, zoom to layer, per-layer opacity (via style), selection, duplicate layer, groups (collapse, show/hide, saved in projects) | | |
| Symbology | Single, categorized, graduated (equal interval, quantile, natural breaks from data; Jenks samples at most 1000 values), colour, width, point size, opacity, legend, labels (field, size, colour; layers with up to 500 visible features) | One colour for polygon fill and outline; labels are drawn on screen and in print but not in the PNG export | More class methods (standard deviation, manual breaks) |
| Attribute table | Types, search, sorting, row selection, edit cells, zoom to selected, export selected CSV, add/delete fields, multi-condition (AND/OR) display filter, identify popup | Edits are in memory until the project is saved | OR-groups nested inside AND (filters are a flat AND or OR list) |
| CRS | WGS84, UTM 45N/46N, Web Mercator, user-supplied proj4 definitions, project CRS readout, import reprojection | Layers are stored in WGS84; datum shifts not verified | Per-layer re-export in another CRS, Bangladesh preset list |
| Measurement | Geodesic-style distance and area (spherical, ~0.5%) | | Ellipsoidal precision |
| Analysis | Buffer, centroid, bbox, dissolve, intersect, difference, union, nearest point, select by location/attribute, geometry validation | Turf-based tools tested only with stubs here | Web Worker offloading for vector tools |
| Raster | ASCII grid display, hillshade, slope, aspect, statistics, elevation sampling, profile CSV (worker) | WGS84 degree grids only | GeoTIFF, reprojection, contours, clipping |
| Civil | Asset schemas, field mapping, checks, summaries, inventory CSV, chainage | | CAD / Civil 3D / WaterGEMS / EVLab Infra connectors |
| Project and export | JSON project save/open, GeoJSON, CSV, KML, PNG (vector only), print layout | Rasters are not embedded in projects | |
| Basemaps | OSM toggle, custom XYZ URL with attribution | Not saved in projects | |

## Data integrity rules
Invalid records are skipped and counted, never silently dropped; attributes are preserved; a missing CRS is asked for, not guessed; layers are stored in WGS84 after reprojection, and imported projected CSV X/Y stay as attributes. Planar overlay results on lon/lat must not be used for ground areas; use the measure tool or the civil summaries.

## Basemaps and terms
Basemaps are optional and need internet. OpenStreetMap tiles require attribution and are subject to the OSM tile usage policy (no heavy use, no bulk download). Custom XYZ services: you must follow the provider's terms, rate limits and API-key rules. Tiles are never downloaded or redistributed by this app, and the PNG export excludes them.

## Project file
`*.evlab.json`, format `evlab-gis-project`, version 1: project name, CRS, map view, per-layer data (embedded WGS84 GeoJSON), style, visibility, order, source CRS, civil mapping. Labels and the display filter are saved. Raster layers are recorded by name only and must be re-added.

## Performance
Vector layers draw on canvas; above 20,000 features a confirmation appears, and selection changes redraw everything, so very large layers stay slow. Grids up to 16 million cells are accepted (confirmation above 4 million). Slope and hillshade run in a Web Worker with a main-thread fallback; vector analysis runs on the main thread with a size warning.

## Civil module
Standard field schemas only; you map your own columns. The map does not perform hydraulic analysis. Lengths and areas are spherical approximations. Chainage uses one alignment line.

## Tests
`node tests/run-all.mjs` (details in `tests/README.md`). To enable the skipped CRS and Turf tests: `npm i --no-save proj4@2.9.2 @turf/turf@6.5.0`.

## Licence
Source code: MIT (see `LICENSE`; change it if your organisation prefers another licence). Third-party libraries: see `THIRD_PARTY_LICENSES.md`.
