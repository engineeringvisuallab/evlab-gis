/** RFC 7946: WGS84 lon/lat. Layers are stored in WGS84, so no crs member is written. */
export const toGeoJSON = l => JSON.stringify({ type: 'FeatureCollection', name: l.name, features: l.geojson.features });
