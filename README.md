# EVLab GIS (Milestone 1)
Browser-based GIS by Engineering Visual Lab. Static site: no build, no backend, no API key.

Run locally: `cd evlab-gis && python3 -m http.server 8000`, open http://localhost:8000 (ES modules need http, not file://).
Tests: `node tests/geojson-import.test.mjs && node tests/csv-styling.test.mjs`

Dependencies (pinned, loaded from unpkg CDN; vendor into lib/ and add SRI hashes before production):
Leaflet 1.9.4 (BSD-2-Clause), Proj4js 2.9.2 (MIT). Turf.js arrives in Milestone 4.
Basemap (optional, off by default): OpenStreetMap tiles, internet required, attribution required, subject to the OSM tile usage policy.

| Feature | Status |
|---|---|
| Layout, map, scale, coordinates, north indicator, status bar | Implemented |
| Layer tree: visibility, order, rename, remove, zoom-to-layer | Implemented |
| GeoJSON and CSV (lat/lon) import, validated, WGS84 only | Partial |
| Single/categorized/graduated styling (equal interval), legend | Implemented (one colour for fill and outline) |
| Click and table selection, attribute table (search, sort, edit, zoom, CSV export) | Implemented, edits in memory only |
| Identify popup, add/delete fields, filter builder, labels | Planned |
| CRS transforms, measurement, validation | Planned (M3); proj4 defs registered only |
| Analysis, save/load, export, civil, raster | Planned (M4-M7) |
