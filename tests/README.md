# Tests
Run everything: `node tests/run-all.mjs` (Node 22). Each file is standalone.
| File | Covers |
|---|---|
| geojson-import, csv-styling | import validation, CSV coordinates, styling, CSV export |
| m3 | geodesy, geometry validation, reprojection logic (fake transform), CRS helpers |
| crs | real proj4 transforms (SKIPPED unless proj4 is installed) |
| analysis | spatial queries, overlay/dissolve orchestration with a stub Turf; real Turf checks SKIPPED unless installed |
| m5 | project save/open round trip, GeoJSON/CSV/KML export, scale bar, legend |
| m6 | civil schemas, checks, summaries, inventory, chainage |
| m7 | ASCII grid, slope/aspect/hillshade, profile |
| m8 | XML, KML and GPX import, XYZ validation |
| m9 | duplicate layer, add/delete fields, labels, display filter, project round trip |
| m10 | multi-condition filter, groups, point size, saved project fields |
| m11 | quantile and Jenks classes, class lookup, large-array safety |
| static | relative imports, named exports, element ids, no root-absolute paths |
Not covered (needs a browser): rendering, map interaction, file downloads, printing, Web Worker, console errors. Check these manually.

## Browser smoke test
`python3 tests/browser-smoke.py` (needs `pip install playwright` and `playwright install chromium`). By default Leaflet, Proj4 and Turf are replaced by a do-nothing stub, so it checks module loading, DOM wiring, imports (CSV, GeoJSON, KML, GPX, ASC), table, styling, save/open, exports and console errors, but NOT real map rendering or clicks on the map. Run it with `--real` on a machine with internet to use the real libraries.
