# EVLab GIS (Milestone 1)
Browser-based GIS by Engineering Visual Lab. Static site: no build, no backend, no API key.

Run locally: `cd evlab-gis && python3 -m http.server 8000`, open http://localhost:8000 (ES modules need http, not file://).
Tests: `node tests/run-all.mjs` (crs test needs `npm i proj4@2.9.2`, otherwise it reports SKIPPED)

CRS: only EPSG:4326, 3857, 32645, 32646 are built in. Other codes need a user-supplied proj4 definition, which EVLab GIS does not verify. Imported projected data is stored in WGS84; original X/Y stay as CSV attributes. Datum shifts are not verified.

Dependencies (pinned, loaded from unpkg CDN; vendor into lib/ and add SRI hashes before production):
Leaflet 1.9.4 (BSD-2-Clause), Proj4js 2.9.2 (MIT), Turf.js 6.5.0 (MIT; API differs from 7.x). Turf.js arrives in Milestone 4.
Basemap (optional, off by default): OpenStreetMap tiles, internet required, attribution required, subject to the OSM tile usage policy.

| Feature | Status |
|---|---|
| Layout, map, scale, coordinates, north indicator, status bar | Implemented |
| Layer tree: visibility, order, rename, remove, zoom-to-layer | Implemented |
| GeoJSON and CSV (lat/lon) import, validated, WGS84 only | Partial |
| Single/categorized/graduated styling (equal interval), legend | Implemented (one colour for fill and outline) |
| Click and table selection, attribute table (search, sort, edit, zoom, CSV export) | Implemented, edits in memory only |
| Identify popup, add/delete fields, filter builder, labels | Planned |
| Project CRS selector, per-layer source CRS, import reprojection (GeoJSON and CSV X/Y) to WGS84 | Implemented, untested in browser (needs proj4) |
| Distance/area measurement (spherical approximation, ~0.5%) | Implemented |
| Geometry validation (rings, self-crossing, short lines, non-finite) | Implemented (touching/collinear overlaps not detected) |
| Buffer, centroid, bbox, dissolve, intersect, difference, union, nearest point, select by location/attribute | Implemented via Turf.js 6.5.0 (MIT); logic tested with stubs, real Turf untested here |
| Web Worker offloading | Planned; operations currently run on the main thread with a size warning |
| Versioned JSON project save/open (data embedded, style, order, visibility, project CRS, map view; labels/filters reserved) | Implemented |
| Export layer as GeoJSON, CSV (points get lon/lat), KML (no styling) | Implemented |
| Export map as PNG (vector layers only, no basemap) and print layout (title, legend, scale bar, north arrow) | Implemented, browser-only, untested here |
| Civil module: asset schemas (supply zone, DMA, reservoir, pumping station, mains, pipes, valve, junction, manhole, road, crossing, survey point), field mapping, checks, summaries, inventory CSV, style by diameter/material, chainage from a single alignment | Implemented, saved in project files |
| ESRI ASCII grid (.asc) import, WGS84 degrees only, user must confirm CRS and units; elevation display, hillshade, slope, aspect, statistics, elevation sampling, terrain profile CSV (Web Worker with main-thread fallback) | Implemented, browser parts untested here |
| Raster not embedded in project files (name/file recorded, re-add on open) | By design |
| GeoTIFF, raster reprojection, contours, raster clipping | Planned |
| KML, GPX, Shapefile ZIP, GeoPackage import | Not implemented; selecting them shows a clear message |

## Analysis assumptions
Stored geometry is WGS84 lon/lat. Overlay, dissolve, centroid and bbox are topological/planar on degrees; do not read areas or lengths from them as ground values (use the geodesic measure tool). Buffer distances are metres via Turf's local projection. Nearest uses spherical distance. Overlay inputs must be valid polygons; invalid features are skipped and reported.

## Project file
`*.evlab.json`, format `evlab-gis-project`, version 1. Layer data is embedded (WGS84 GeoJSON) so there are no external file references; large projects produce large files (confirmation above 25 MB). User-defined CRS definitions are stored and restored as unverified. Invalid features or unknown styles are reported on open, never silently dropped.

## Civil module
Schemas define standard field names only; no project data is created. You map your own columns onto them. The map does not perform hydraulic analysis. Lengths and areas are spherical approximations (~0.5%). Chainage uses the nearest point on one alignment line (local planar search, spherical distances) and writes a new layer. Integration with CAD, Civil 3D, WaterGEMS and EVLab Infra is planned via the CSV inventory and GeoJSON exports; no direct connectors exist yet.

## Raster and performance limits
Grids up to 16 million cells are accepted (a confirmation appears above 4 million); each grid is held in memory as Float32 and drawn to a canvas the size of the grid. Slope and hillshade use Horn's method with metre cell sizes derived from latitude, assume cell values are metres, and leave the outer ring of cells empty. Vector layers draw on a canvas renderer; layers above 20,000 features ask for confirmation, and every selection change redraws all features, so very large layers remain slow. `node tests/run-all.mjs` runs every test file plus static import/id/path checks that mimic GitHub Pages subdirectory hosting.
