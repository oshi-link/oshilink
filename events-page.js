import { supabase } from './supabase.js';
import { sortByPlanPriority } from './plan-utils.js';

let events = [];
let selectedCalendarYear = 2026;
let selectedCalendarMonth = 1;

const allEventsGrid = document.getElementById('allEventsGrid');
const eventsMonthSelector = document.getElementById('eventsMonthSelector');
const eventsPageMonthLabel = document.getElementById('eventsPageMonthLabel');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');

const getMonthFromQuery = () => { const month = Number(new URLSearchParams(location.search).get('month')); return month >= 1 && month <= 12 ? month : new Date().getMonth()+1; };
const updateEventsPageUrl = (month) => { const url = new URL(location.href); url.searchParams.set('month', String(month)); history.replaceState({}, '', url); };
const parseEventDate = (s) => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); };
const isPastEvent = (s) => { const t=new Date(); t.setHours(0,0,0,0); return parseEventDate(s)<t; };

function renderEventsPageByMonth(month) {
  selectedCalendarMonth = month;
  const filtered = events.filter(event => { const date = new Date(event.event_date); return date.getFullYear()===selectedCalendarYear && date.getMonth()+1===month; });
  eventsMonthSelector.value = String(month);
  eventsPageMonthLabel.textContent = `${selectedCalendarYear}年${month}月のライブ一覧`;
  if (!filtered.length) { allEventsGrid.innerHTML = '<div class="events-empty"><p>この月のライブ情報はまだありません。</p></div>'; return; }
  allEventsGrid.innerHTML = filtered.map(item => `
    <article class="card"><div class="card-image">${item.image_path ? `<img src="${item.image_path}" alt="${item.title}">` : ''}<span class="badge ${isPastEvent(item.event_date)?'ended':''}">${isPastEvent(item.event_date)?'公演終了':'チケット発売中'}</span>${item.owner_plan==='premium' ? '<span class="badge priority">PREMIUM</span>' : item.owner_plan==='standard' ? '<span class="badge priority">STANDARD</span>' : ''}</div><div class="card-body"><h3>${item.title}</h3><div class="meta"><span>🎤 ${item.artist_name}</span><span>📍 ${item.place}</span><span>📅 ${item.event_date}</span><span>🕒 ${item.time_text || '-'}</span><span>🎫 ${item.price || '-'}</span></div><div class="card-actions">${item.detail_url ? `<a href="${item.detail_url}" class="ghost-btn" target="_blank" rel="noopener noreferrer">詳細</a>` : ''}${isPastEvent(item.event_date) ? '<span class="mini-btn disabled">終了</span>' : item.ticket_url ? `<a href="${item.ticket_url}" class="mini-btn" target="_blank" rel="noopener noreferrer">チケット</a>` : ''}</div></div></article>
  `).join('');
}

(async function init(){
  try {
    const { data, error } = await supabase.from('public_events_view').select('*').order('event_date', { ascending: true });
    if (error) throw error;
    events = sortByPlanPriority(data || []);
    renderEventsPageByMonth(getMonthFromQuery());
    eventsMonthSelector?.addEventListener('change', e => { const m=Number(e.target.value); updateEventsPageUrl(m); renderEventsPageByMonth(m); });
    prevMonthBtn?.addEventListener('click', () => { if (selectedCalendarMonth<=1) return; const m=selectedCalendarMonth-1; updateEventsPageUrl(m); renderEventsPageByMonth(m); });
    nextMonthBtn?.addEventListener('click', () => { if (selectedCalendarMonth>=12) return; const m=selectedCalendarMonth+1; updateEventsPageUrl(m); renderEventsPageByMonth(m); });
  } catch (e) { console.error(e); allEventsGrid.innerHTML='<div class="events-empty"><p>ライブ情報の読み込みに失敗しました。</p></div>'; }
})();
