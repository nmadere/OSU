// Central data loader. Loads the two JSON datasets once and caches them.
let _cache = null;

export async function loadData() {
  if (_cache) return _cache;
  const [buildings, project] = await Promise.all([
    fetch('data/buildings.json').then(r => r.json()),
    fetch('data/project.json').then(r => r.json()),
  ]);
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
