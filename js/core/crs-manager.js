// Milestone 1: registry only. Per-layer CRS and reprojection arrive in Milestone 3.
export const CRS_DEFS = {
  'EPSG:4326': { name: 'WGS 84 (geographic, degrees)', units: 'degrees' },
  'EPSG:3857': { name: 'WGS 84 / Pseudo-Mercator', units: 'm', proj4: '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +no_defs' },
  'EPSG:32645': { name: 'WGS 84 / UTM zone 45N', units: 'm', proj4: '+proj=utm +zone=45 +datum=WGS84 +units=m +no_defs' },
  'EPSG:32646': { name: 'WGS 84 / UTM zone 46N', units: 'm', proj4: '+proj=utm +zone=46 +datum=WGS84 +units=m +no_defs' }
};
export function registerAll() {
  for (const [code, d] of Object.entries(CRS_DEFS)) if (d.proj4) proj4.defs(code, d.proj4);
}
export function transform(from, to, [x, y]) { return proj4(from, to, [x, y]); }
