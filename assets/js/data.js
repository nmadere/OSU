// Central data loader. Routes through the backend layer, which serves either
// local JSON (static mode) or Supabase (live mode) transparently.
import { fetchBuildings, fetchProject } from './backend.js';
let _cache = null;

export async function loadData(force = false) {
  if (_cache && !force) return _cache;
  const [buildings, project] = await Promise.all([fetchBuildings(), fetchProject()]);
  _cache = { buildings, project };
  return _cache;
}

export const DEPTS = ['FOD', 'ATH', 'BA', 'SL', 'DS'];
export const DEPT_NAMES = {
  FOD: 'Facilities (FOD)', ATH: 'Athletics', BA: 'Business Advancement',
  SL: 'Student Life', DS: 'Dining Services', Unassigned: 'Unassigned',
};
export const DEPT_COLORS = {
  FOD: '#BB0000', ATH: '#A05A00', BA: '#1F6FB2', SL: '#2E7D32', DS: '#6A1B9A', Unassigned: '#777',
};
export const QUAD_COLORS = {
  Southeast: '#BB0000', Northeast: '#1F6FB2', Southwest: '#2E7D32', Northwest: '#A05A00', Unknown: '#999',
};
