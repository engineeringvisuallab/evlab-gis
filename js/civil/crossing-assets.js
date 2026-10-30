import { f } from './water-assets.js';
export const CROSSING = [{ id: 'crossing', label: 'Bridge / culvert crossing', geoms: ['Point', 'LineString'], fields: [f('asset_id', 'Asset ID', 'text', true), f('name', 'Name'), f('crossing_type', 'Type (bridge/culvert)'), f('chainage_m', 'Chainage (m)', 'number'), f('ground_level_m', 'Ground level (m)', 'number')] }];
