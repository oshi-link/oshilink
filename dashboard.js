import { supabase, getCurrentProfile } from './supabase.js';
import { requireAuth, signOut } from './auth.js';
import { PLAN_LIMITS, canCreateCount, getPlanLabel } from './plan-utils.js';

const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profilePlanChip = document.getElementById('profilePlanChip');
const planSummary = document.getElementById('planSummary');
const artistCountEl = document.getElementById('artistCount');
const eventCountEl = document.getElementById('eventCount');
const videoCountEl = document.getElementById('videoCount');
const myArtistsBody = document.getElementById('myArtistsBody');
const myEventsBody = document.getElementById('myEventsBody');
const myVideosBody = document.getElementById('myVideosBody');
const artistForm = document.getElementById('artistForm');
const eventForm = document.getElementById('eventForm');
const videoForm = document.getElementById('videoForm');
const logoutBtn = document.getElementById('logoutBtn');
const messageBox = document.getElementById('messageBox');

let currentUser = null;
let currentProfile = null;
let myArtists = [];
let myEvents = [];
let myVideos = [];

const setMessage = (text, type='success') => messageBox.innerHTML = `<div class="alert ${type}">${text}</div>`;
const getPlanSummaryText = (plan) => {
  const rules = PLAN_LIMITS[plan];
  const format = (value) => value === Infinity ? '無制限' : `${value}件まで`;
  return `演者: ${format(rules.artists)}<br>イベント: ${format(rules.events)}<br>動画: ${format(rules.videos)}<br>分析機能: ${rules.analytics ? 'あり' : 'なし'}`;
};
const formToObject = (formElement) => Object.fromEntries(new FormData(formElement).entries());

async function loadDashboardData() {
  const [{ data: artists, error: artistError }, { data: events, error: eventError }, { data: videos, error: videoError }] = await Promise.all([
    supabase.from('artists').select('*').eq('owner_user_id', currentUser.id).order('created_at', { ascending: false }),
    supabase.from('events').select('*').eq('owner_user_id', currentUser.id).order('event_date', { ascending: false }),
    supabase.from('videos').select('*').eq('owner_user_id', currentUser.id).order('created_at', { ascending: false })
  ]);
  if (artistError || eventError || videoError) throw artistError || eventError || videoError;

  myArtists = artists || [];
  myEvents = events || [];
  myVideos = videos || [];
  artistCountEl.textContent = myArtists.length;
  eventCountEl.textContent = myEvents.length;
  videoCountEl.textContent = myVideos.length;
  renderTables();
}

function renderTables() {
  myArtistsBody.innerHTML = myArtists.length ? myArtists.map(item => `<tr><td>${item.name}</td><td>${item.x_url ? `<a href="${item.x_url}" target="_blank" rel="noopener noreferrer">Xを見る</a>` : '-'}</td><td>${new Date(item.created_at).toLocaleDateString('ja-JP')}</td><td><button class="ghost-btn" type="button" data-delete-artist="${item.id}">削除</button></td></tr>`).join('') : `<tr><td colspan="4" class="muted">まだ演者がありません。</td></tr>`;
  myEventsBody.innerHTML = myEvents.length ? myEvents.map(item => `<tr><td>${item.title}</td><td>${item.event_date}</td><td>${item.place}</td><td><button class="ghost-btn" type="button" data-delete-event="${item.id}">削除</button></td></tr>`).join('') : `<tr><td colspan="4" class="muted">まだイベントがありません。</td></tr>`;
  myVideosBody.innerHTML = myVideos.length ? myVideos.map(item => `<tr><td>${item.title}</td><td>${item.artist_name}</td><td>${new Date(item.created_at).toLocaleDateString('ja-JP')}</td><td><button class="ghost-btn" type="button" data-delete-video="${item.id}">削除</button></td></tr>`).join('') : `<tr><td colspan="4" class="muted">まだ動画がありません。</td></tr>`;
}

async function createArtist(values) {
  if (!canCreateCount(currentProfile.plan, 'artists', myArtists.length)) throw new Error('現在のプランでは演者の追加上限に達しています。');
  const { error } = await supabase.from('artists').insert({ owner_user_id: currentUser.id, name: values.name, description: values.description || null, icon_path: values.icon_path || null, x_url: values.x_url || null, detail_slug: values.detail_slug || null });
  if (error) throw error;
}
async function createEvent(values) {
  if (!canCreateCount(currentProfile.plan, 'events', myEvents.length)) throw new Error('現在のプランではイベントの追加上限に達しています。');
  const { error } = await supabase.from('events').insert({ owner_user_id: currentUser.id, title: values.title, artist_name: values.artist_name, place: values.place, area: values.area, event_date: values.event_date, time_text: values.time_text || null, price: values.price || null, image_path: values.image_path || null, detail_url: values.detail_url || null, ticket_url: values.ticket_url || null, priority_score: currentProfile.plan === 'premium' ? 20 : currentProfile.plan === 'standard' ? 10 : 0, status: 'published' });
  if (error) throw error;
}
function getYouTubeThumbnail(url) {
  if (!url) return null;
  try { const parsed = new URL(url); if (parsed.hostname==='youtu.be') return `https://img.youtube.com/vi/${parsed.pathname.slice(1)}/hqdefault.jpg`; if (parsed.hostname.includes('youtube.com')) { const id=parsed.searchParams.get('v'); return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null; } } catch {}
  return null;
}
async function createVideo(values) {
  if (!canCreateCount(currentProfile.plan, 'videos', myVideos.length)) throw new Error('現在のプランでは動画の追加上限に達しています。');
  const { error } = await supabase.from('videos').insert({ owner_user_id: currentUser.id, title: values.title, artist_name: values.artist_name, type: values.type || null, description: values.description || null, url: values.url || null, thumbnail_url: getYouTubeThumbnail(values.url) });
  if (error) throw error;
}
async function deleteRecord(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id).eq('owner_user_id', currentUser.id);
  if (error) throw error;
}

artistForm.addEventListener('submit', async (e) => { e.preventDefault(); try { await createArtist(formToObject(artistForm)); artistForm.reset(); await loadDashboardData(); setMessage('演者を保存しました。'); } catch (error) { setMessage(error.message, 'error'); } });
eventForm.addEventListener('submit', async (e) => { e.preventDefault(); try { await createEvent(formToObject(eventForm)); eventForm.reset(); await loadDashboardData(); setMessage('イベントを保存しました。'); } catch (error) { setMessage(error.message, 'error'); } });
videoForm.addEventListener('submit', async (e) => { e.preventDefault(); try { await createVideo(formToObject(videoForm)); videoForm.reset(); await loadDashboardData(); setMessage('動画を保存しました。'); } catch (error) { setMessage(error.message, 'error'); } });

document.addEventListener('click', async (e) => {
  try {
    if (e.target.dataset.deleteArtist) { await deleteRecord('artists', e.target.dataset.deleteArtist); await loadDashboardData(); setMessage('演者を削除しました。'); }
    if (e.target.dataset.deleteEvent) { await deleteRecord('events', e.target.dataset.deleteEvent); await loadDashboardData(); setMessage('イベントを削除しました。'); }
    if (e.target.dataset.deleteVideo) { await deleteRecord('videos', e.target.dataset.deleteVideo); await loadDashboardData(); setMessage('動画を削除しました。'); }
  } catch (error) { setMessage(error.message, 'error'); }
});
logoutBtn.addEventListener('click', async () => { try { await signOut(); location.href='./login.html'; } catch (error) { setMessage(error.message, 'error'); } });

(async function init(){
  try {
    currentUser = await requireAuth();
    if (!currentUser) return;
    currentProfile = await getCurrentProfile();
    profileName.textContent = currentProfile.display_name || 'ユーザー';
    profileEmail.textContent = currentUser.email || '-';
    profilePlanChip.textContent = getPlanLabel(currentProfile.plan);
    planSummary.innerHTML = getPlanSummaryText(currentProfile.plan);
    await loadDashboardData();
  } catch (error) { setMessage(error.message, 'error'); }
})();
