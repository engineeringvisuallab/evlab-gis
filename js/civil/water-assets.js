export const f = (key, label, type = 'text', required = false) => ({ key, label, type, required });
const pipe = [f('asset_id', 'Asset ID', 'text', true), f('material', 'Material'), f('diameter_mm', 'Diameter (mm)', 'number'), f('invert_start_m', 'Invert level start (m)', 'number'), f('invert_end_m', 'Invert level end (m)', 'number')];
/** Schemas describe standard field names only. No data is created; users map their own columns onto them. */
export const WATER = [
  { id: 'supply_zone', label: 'Water supply zone', geoms: ['Polygon'], fields: [f('zone_id', 'Zone ID', 'text', true), f('name', 'Name')] },
  { id: 'dma', label: 'DMA boundary', geoms: ['Polygon'], fields: [f('dma_id', 'DMA ID', 'text', true), f('name', 'Name'), f('zone_id', 'Parent zone ID')] },
  { id: 'reservoir', label: 'CWR / reservoir', geoms: ['Point', 'Polygon'], fields: [f('asset_id', 'Asset ID', 'text', true), f('name', 'Name'), f('capacity_m3', 'Capacity (m3)', 'number'), f('ground_level_m', 'Ground level (m)', 'number')] },
  { id: 'pumping_station', label: 'Pumping station', geoms: ['Point'], fields: [f('asset_id', 'Asset ID', 'text', true), f('name', 'Name'), f('ground_level_m', 'Ground level (m)', 'number')] },
  { id: 'transmission_main', label: 'Transmission main', geoms: ['LineString'], fields: pipe },
  { id: 'distribution_pipe', label: 'Distribution pipeline', geoms: ['LineString'], fields: pipe },
  { id: 'valve', label: 'Valve', geoms: ['Point'], fields: [f('asset_id', 'Asset ID', 'text', true), f('valve_type', 'Valve type'), f('diameter_mm', 'Diameter (mm)', 'number'), f('ground_level_m', 'Ground level (m)', 'number')] },
  { id: 'junction', label: 'Junction / node', geoms: ['Point'], fields: [f('asset_id', 'Asset ID', 'text', true), f('ground_level_m', 'Ground level (m)', 'number')] },
  { id: 'manhole', label: 'Manhole', geoms: ['Point'], fields: [f('asset_id', 'Asset ID', 'text', true), f('ground_level_m', 'Ground level (m)', 'number'), f('invert_level_m', 'Invert level (m)', 'number')] }
];
