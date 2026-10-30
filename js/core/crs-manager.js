// CRS registry. Only the definitions below are built in; anything else must be supplied by the user as a proj4 string (not verified by EVLab GIS).
export const CRS_DEFS = {
  'EPSG:4326': { name: 'WGS 84 (geographic, degrees)', units: 'degrees' },
  'EPSG:3857': { name: 'WGS 84 / Pseudo-Mercator', units: 'm', proj4: '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +no_defs' },
  'EPSG:32645': { name: 'WGS 84 / UTM zone 45N', units: 'm', proj4: '+proj=utm +zone=45 +datum=WGS84 +units=m +no_defs' },
  'EPSG:32646': { name: 'WGS 84 / UTM zone 46N', units: 'm', proj4: '+proj=utm +zone=46 +datum=WGS84 +units=m +no_defs' }
};
const user = {}; export const projectCrs = { code: 'EPSG:4326' };
export const userDefs = () => Object.fromEntries(Object.entries(user).map(([k, v]) => [k, v.proj4]));
export const list = () => ({ ...CRS_DEFS, ...user });
export const info = code => list()[code] || null;
export const normalize = s => { const m = /^(?:EPSG:)?(\d{4,6})$/i.exec(String(s).trim()); return m ? 'EPSG:' + m[1] : null; };
export function registerAll() { for (const [c, d] of Object.entries(CRS_DEFS)) if (d.proj4) globalThis.proj4.defs(c, d.proj4); }
export function register(code, proj4str) { globalThis.proj4.defs(code, proj4str); globalThis.proj4(code); user[code] = { name: 'User-defined (unverified)', units: /\+units=m\b/.test(proj4str) ? 'm' : 'see definition', proj4: proj4str }; }
/** Returns xy => [x', y'] (extra ordinates untouched by mapGeometry). Throws if a CRS is unknown to proj4. */
export function makeTransform(from, to) { if (from === to) return xy => [xy[0], xy[1]]; const f = globalThis.proj4(from, to); return xy => f.forward([xy[0], xy[1]]); }
const mc = (c, fn) => typeof c[0] === 'number' ? (q => c.length > 2 ? [q[0], q[1], ...c.slice(2)] : q)(fn(c)) : c.map(x => mc(x, fn));
export function mapGeometry(g, fn) { return g.type === 'GeometryCollection' ? { ...g, geometries: g.geometries.map(x => mapGeometry(x, fn)) } : { ...g, coordinates: mc(g.coordinates, fn) }; }
