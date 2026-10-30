#!/bin/sh
# UNTESTED: downloads the pinned libraries into lib/. Afterwards edit index.html to use lib/leaflet.css, lib/leaflet.js, lib/proj4.js, lib/turf.min.js.
set -e; mkdir -p lib
curl -fsSL https://unpkg.com/leaflet@1.9.4/dist/leaflet.css -o lib/leaflet.css
curl -fsSL https://unpkg.com/leaflet@1.9.4/dist/leaflet.js -o lib/leaflet.js
curl -fsSL https://unpkg.com/proj4@2.9.2/dist/proj4.js -o lib/proj4.js
curl -fsSL https://unpkg.com/@turf/turf@6.5.0/turf.min.js -o lib/turf.min.js
echo "Done. Leaflet's CSS references marker/layer images that are not copied; this app does not use them."
