export function dateKey(year, month, day) { return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`; }
export function monthCells(year, month) {
  const offset = new Date(year, month, 1).getDay();
  const count = new Date(year, month+1, 0).getDate();
  return [...Array(offset).fill(null), ...Array.from({length:count},(_,i)=>i+1)];
}
export function normalizeEventName(value) { return value.normalize('NFKC').toLowerCase().trim().replace(/\s+/gu,' '); }
export function eventCandidates(events, name, date) {
  const compact = value => normalizeEventName(value).replace(/\s/gu,'');
  return events.filter(event => event.date===date && compact(event.title)===compact(name));
}
export function filterVideos(videos, tags) { return videos.filter(video => tags.every(tag => video.tags.includes(tag))); }
export function upcomingRegions(events, now = new Date()) {
  // Event dates are Japanese calendar dates; keep the region through 23:59 JST.
  const japan = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const today = japan.toISOString().slice(0,10);
  return [...new Set(events.filter(event => event.public !== false && /^\d{4}-\d{2}-\d{2}$/.test(event.date) && event.date >= today && typeof event.region === 'string' && event.region.trim()).map(event => event.region.trim()))].sort((a,b)=>a.localeCompare(b,'ja'));
}
