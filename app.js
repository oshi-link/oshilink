import { supabase } from './supabase.js';
import { sortByPlanPriority } from './plan-utils.js';

let events = [];
let videos = [];
let artists = [];
let currentArea = 'all';
let selectedCalendarYear = 2026;
let selectedCalendarMonth = new Date().getMonth() + 1;

const eventGrid = document.getElementById('eventGrid');
const videoGrid = document.getElementById('videoGrid');
const artistGrid = document.getElementById('artistGrid');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const filterButtons = document.querySelectorAll('.filter-btn');
const scheduleGrid = document.getElementById('scheduleGrid');
const weekViewBtn = document.getElementById('weekViewBtn');
const monthViewBtn = document.getElementById('monthViewBtn');
const monthSelector = document.getElementById('monthSelector');
const monthSelectorWrap = document.getElementById('monthSelectorWrap');

const parseEventDate = (s) => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); };
const isPastEvent = (s) => { const t=new Date(); t.setHours(0,0,0,0); return parseEventDate(s)<t; };
const formatDateString = (y,m,d) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const getStatus = (item) => isPastEvent(item.date) ? '公演終了' : 'チケット発売中';
const priorityBadge = (plan) => plan==='premium' ? '<span class="badge priority">PREMIUM</span>' : plan==='standard' ? '<span class="badge priority">STANDARD</span>' : '';

function getYouTubeThumb(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') return `https://img.youtube.com/vi/${parsed.pathname.slice(1)}/hqdefault.jpg`;
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v');
      return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
    }
  } catch {}
  return '';
}

function renderEvents(list) {
  const upcoming = sortByPlanPriority(list.filter(i => !isPastEvent(i.date)));
  const visible = upcoming.slice(0,3);
  if (!visible.length) {
    eventGrid.innerHTML = '<div class="events-empty"><p>現在表示できるライブ情報はありません。</p></div>';
    return;
  }
  eventGrid.innerHTML = visible.map(item => `
    <article class="card">
      <div class="card-image">
        ${item.image ? `<img src="${item.image}" alt="${item.title}">` : ''}
        <span class="badge ${isPastEvent(item.date) ? 'ended' : ''}">${getStatus(item)}</span>
        ${priorityBadge(item.owner_plan)}
      </div>
      <div class="card-body">
        <h3>${item.title}</h3>
        <div class="meta">
          <span>🎤 ${item.artist}</span><span>📍 ${item.place}</span><span>📅 ${item.date}</span><span>🕒 ${item.time || '-'}</span><span>🎫 ${item.price || '-'}</span>
        </div>
        <div class="card-actions">
          ${item.detailUrl ? `<a href="${item.detailUrl}" class="ghost-btn" target="_blank" rel="noopener noreferrer">詳細</a>` : ''}
          ${isPastEvent(item.date) ? '<span class="mini-btn disabled">終了</span>' : item.ticketUrl ? `<a href="${item.ticketUrl}" class="mini-btn" target="_blank" rel="noopener noreferrer">チケット</a>` : ''}
        </div>
      </div>
    </article>
  `).join('') + (upcoming.length >= 4 ? `<div style="grid-column:1/-1;display:flex;justify-content:center;"><a href="./events.html?month=${selectedCalendarMonth}" class="primary-btn">もっと見る</a></div>` : '');
}

function renderVideos(list) {
  if (!list.length) { videoGrid.innerHTML = '<div class="events-empty"><p>表示できる動画はありません。</p></div>'; return; }
  videoGrid.innerHTML = sortByPlanPriority(list).map(item => `
    <article class="card">
      <div class="card-image">
        ${(item.thumbnail_url || getYouTubeThumb(item.url)) ? `<img src="${item.thumbnail_url || getYouTubeThumb(item.url)}" alt="${item.title}">` : ''}
        <span class="badge">${item.type || '動画'}</span>
        ${priorityBadge(item.owner_plan)}
      </div>
      <div class="card-body">
        <h3>${item.title}</h3>
        <div class="meta"><span>👤 ${item.artist}</span><span>▶ ${item.description || ''}</span></div>
        ${item.url ? `<div class="card-actions"><a href="${item.url}" class="mini-btn" target="_blank" rel="noopener noreferrer">視聴する</a></div>` : ''}
      </div>
    </article>
  `).join('');
}

function renderArtists(list) {
  if (!list.length) { artistGrid.innerHTML = '<div class="events-empty"><p>演者情報はまだありません。</p></div>'; return; }
  artistGrid.innerHTML = sortByPlanPriority(list).map(item => `
    <article class="artist-card">
      <div class="artist-card-main">
        <div class="artist-icon">${item.icon?.startsWith('http') ? `<img src="${item.icon}" alt="${item.name}">` : (item.icon?.[0] || item.name?.[0] || '?')}</div>
        <div class="artist-info"><h3>${item.name}</h3><p>${item.description || ''}</p></div>
      </div>
      <div class="artist-card-overlay">
        ${item.xUrl ? `<a href="${item.xUrl}" class="artist-action-btn x-btn" target="_blank" rel="noopener noreferrer">X</a>` : ''}
        ${item.detailUrl ? `<a href="${item.detailUrl}" class="artist-action-btn detail-btn">もっと見る</a>` : ''}
      </div>
    </article>
  `).join('');
}

function applyFilter(area='all', keyword='') {
  const key = keyword.trim().toLowerCase();
  renderEvents(events.filter(item => {
    const matchesArea = area === 'all' || item.area === area;
    const matchesKeyword = !key || [item.title, item.artist, item.place, item.area, item.date].join(' ').toLowerCase().includes(key);
    return matchesArea && matchesKeyword;
  }));
}

function getEventsByDate(dateString) { return events.filter(event => event.date === dateString); }
function renderWeekSchedule() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today); monday.setDate(today.getDate() + mondayOffset);
  const weekdays = ['日','月','火','水','木','金','土'];
  const days = [];
  for (let i=0;i<7;i++) {
    const current = new Date(monday); current.setDate(monday.getDate()+i);
    const dateString = formatDateString(current.getFullYear(), current.getMonth()+1, current.getDate());
    days.push({ day: weekdays[current.getDay()], date: current.getDate(), events: getEventsByDate(dateString) });
  }
  scheduleGrid.className = 'schedule-grid week-mode';
  scheduleGrid.innerHTML = days.map(item => `<div class="schedule-card"><p class="schedule-day">${item.day}</p><div class="schedule-date">${item.date}</div><div class="schedule-event-list">${item.events.length ? item.events.map(event => `<p class="schedule-text">${event.title}</p>`).join('') : '<p class="schedule-text empty-text">予定なし</p>'}</div></div>`).join('');
  weekViewBtn?.classList.add('active'); monthViewBtn?.classList.remove('active'); if (monthSelectorWrap) monthSelectorWrap.style.display='none';
}
function renderMonthSchedule() {
  const year = selectedCalendarYear, month = selectedCalendarMonth;
  const firstDay = new Date(year, month-1, 1); const lastDate = new Date(year, month, 0).getDate(); const startWeekday = (firstDay.getDay()+6)%7;
  const cells = []; for (let i=0;i<startWeekday;i++) cells.push({date:'',events:[]});
  for (let day=1; day<=lastDate; day++) cells.push({date:day,events:getEventsByDate(formatDateString(year,month,day))});
  while (cells.length % 7 !== 0) cells.push({date:'',events:[]});
  scheduleGrid.className='schedule-grid month-mode';
  scheduleGrid.innerHTML = '<div class="month-weekday">月</div><div class="month-weekday">火</div><div class="month-weekday">水</div><div class="month-weekday">木</div><div class="month-weekday">金</div><div class="month-weekday">土</div><div class="month-weekday">日</div>' + cells.map(cell => `<div class="month-cell ${cell.date ? '' : 'empty'}">${cell.date ? `<div class="month-date">${cell.date}</div>` : ''}<div class="month-event-list">${cell.events.map(event => `<p class="month-text">${event.title}</p>`).join('')}</div></div>`).join('');
  monthViewBtn?.classList.add('active'); weekViewBtn?.classList.remove('active'); if (monthSelectorWrap) monthSelectorWrap.style.display='flex'; if (monthSelector) monthSelector.value=String(month);
}

async function loadEvents() {
  const { data, error } = await supabase.from('public_events_view').select('*').order('event_date', { ascending: true });
  if (error) throw error;
  events = (data || []).map(item => ({ id:item.id, title:item.title, artist:item.artist_name, place:item.place, area:item.area, date:item.event_date, time:item.time_text, price:item.price, image:item.image_path, detailUrl:item.detail_url, ticketUrl:item.ticket_url, priority_score:item.priority_score, owner_plan:item.owner_plan, created_at:item.created_at }));
  renderEvents(events);
}
async function loadVideos() {
  const { data, error } = await supabase.from('public_videos_view').select('*').order('created_at', { ascending: false }).limit(6);
  if (error) throw error;
  videos = (data || []).map(item => ({ title:item.title, artist:item.artist_name, type:item.type, description:item.description, url:item.url, thumbnail_url:item.thumbnail_url, owner_plan:item.owner_plan, created_at:item.created_at }));
  renderVideos(videos);
}
async function loadArtists() {
  const { data, error } = await supabase.from('public_artists_view').select('*').order('created_at', { ascending: false }).limit(9);
  if (error) throw error;
  artists = (data || []).map(item => ({ name:item.name, icon:item.icon_path, description:item.description, xUrl:item.x_url, detailUrl:item.detail_slug ? `./artist.html?slug=${item.detail_slug}` : '', owner_plan:item.owner_plan, created_at:item.created_at }));
  renderArtists(artists);
}

filterButtons.forEach(btn => btn.addEventListener('click', () => { filterButtons.forEach(b => b.classList.remove('active')); btn.classList.add('active'); currentArea = btn.dataset.filter; applyFilter(currentArea, searchInput?.value || ''); }));
searchButton?.addEventListener('click', () => applyFilter(currentArea, searchInput?.value || ''));
searchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') applyFilter(currentArea, searchInput.value); });
weekViewBtn?.addEventListener('click', renderWeekSchedule);
monthViewBtn?.addEventListener('click', renderMonthSchedule);
monthSelector?.addEventListener('change', e => { selectedCalendarMonth = Number(e.target.value); renderMonthSchedule(); });

(async function init(){
  try { await Promise.all([loadEvents(), loadVideos(), loadArtists()]); renderWeekSchedule(); }
  catch (e) { console.error(e); if (eventGrid) eventGrid.innerHTML='<div class="events-empty"><p>読み込みに失敗しました。</p></div>'; }
})();
