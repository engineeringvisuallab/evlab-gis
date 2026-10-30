import { f } from './water-assets.js';
export const ROAD = [{ id: 'road', label: 'Road network', geoms: ['LineString'], fields: [f('asset_id', 'Road ID', 'text', true), f('name', 'Name'), f('surface', 'Surface'), f('width_m', 'Width (m)', 'number'), f('chainage_start_m', 'Chainage start (m)', 'number'), f('chainage_end_m', 'Chainage end (m)', 'number')] }];
export const SURVEY = [{ id: 'survey_point', label: 'Survey point', geoms: ['Point'], fields: [f('point_id', 'Point ID', 'text', true), f('ground_level_m', 'Ground level (m)', 'number'), f('chainage_m', 'Chainage (m)', 'number')] }];
