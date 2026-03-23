const events = [
  {
    title: 'Full course',
    artist: 'だうく / ゆちかみ / 〇〇',
    place: '浅草橋マンホール',
    area: '東京',
    date: '2026-03-07',
    time: '13:00 OPEN / 13:30 START',
    price: '3,500円',
    tag: 'チケット発売中',
    image: 'images/Fullcorse_2025.JPG',
    detailUrl: 'https://x.com/dauk_CA/status/2035861459037811193?s=20',
    ticketUrl: 'https://x.com/dauk_CA/status/2035861459037811193?s=20'
  },
  {
    title: 'Full course',
    artist: 'だうく / ゆちかみ / 〇〇',
    place: '浅草橋マンホール',
    area: '名古屋',
    date: '2026-03-26',
    time: '13:00 OPEN / 13:30 START',
    price: '3,500円',
    tag: 'チケット発売中',
    image: 'images/IMG_6384.JPG',
    detailUrl: 'https://x.com/dauk_CA/status/2035861459037811193?s=20',
    ticketUrl: 'https://x.com/dauk_CA/status/2035861459037811193?s=20'
  }
];

const videos = [
  {
    title: '怪獣の花唄 / 歌ってみた',
    artist: 'Amane',
    type: '歌ってみた',
    description: 'YouTubeで公開中'
  },
  {
    title: 'オリジナルMV Teaser',
    artist: 'Shion',
    type: 'MV',
    description: '新作MVティザー公開'
  },
  {
    title: 'ライブダイジェスト',
    artist: 'Luna*',
    type: 'ライブ映像',
    description: 'TikTok / Shorts向け告知動画'
  }
];

const eventGrid = document.getElementById('eventGrid');
const videoGrid = document.getElementById('videoGrid');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const filterButtons = document.querySelectorAll('.filter-btn');

const scheduleGrid = document.getElementById('scheduleGrid');
const weekViewBtn = document.getElementById('weekViewBtn');
const monthViewBtn = document.getElementById('monthViewBtn');

const monthSelector = document.getElementById('monthSelector');
const monthSelectorWrap = document.getElementById('monthSelectorWrap');

let selectedCalendarYear = 2026;
let selectedCalendarMonth = 1;

function renderEvents(list) {
  if (!eventGrid) return;

  eventGrid.innerHTML = list.map(item => `
    <article class="card">
      <div class="card-image">
        <img src="${item.image}" alt="${item.title}">
        <span class="badge">${item.tag}</span>
      </div>
      <div class="card-body">
        <h3>${item.title}</h3>
        <div class="meta">
          <span>🎤 ${item.artist}</span>
          <span>📍 ${item.place}</span>
          <span>📅 ${item.date}</span>
          <span>🕒 ${item.time}</span>
          <span>🎫 ${item.price}</span>
        </div>
        <div class="card-actions">
          <a href="${item.detailUrl}" class="ghost-btn" target="_blank" rel="noopener noreferrer">詳細</a>
          <a href="${item.ticketUrl}" class="mini-btn" target="_blank" rel="noopener noreferrer">チケット</a>
        </div>
      </div>
    </article>
  `).join('');
}

function renderVideos(list) {
  if (!videoGrid) return;

  videoGrid.innerHTML = list.map(item => `
    <article class="card">
      <div class="card-image">
        <span class="badge">${item.type}</span>
      </div>
      <div class="card-body">
        <h3>${item.title}</h3>
        <div class="meta">
          <span>👤 ${item.artist}</span>
          <span>▶ ${item.description}</span>
        </div>
        <div class="card-actions">
          <a href="#" class="mini-btn">視聴する</a>
        </div>
      </div>
    </article>
  `).join('');
}

function applyFilter(area = 'all', keyword = '') {
  const key = keyword.trim().toLowerCase();

  const filtered = events.filter(item => {
    const matchesArea = area === 'all' || item.area === area;
    const matchesKeyword =
      !key || [item.title, item.artist, item.place, item.area, item.date]
        .join(' ')
        .toLowerCase()
        .includes(key);

    return matchesArea && matchesKeyword;
  });

  renderEvents(filtered);
}

let currentArea = 'all';

filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentArea = btn.dataset.filter;
    applyFilter(currentArea, searchInput.value);
  });
});

if (searchButton) {
  searchButton.addEventListener('click', () => applyFilter(currentArea, searchInput.value));
}

if (searchInput) {
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyFilter(currentArea, searchInput.value);
  });
}

function getEventsByDate(dateString) {
  return events.filter(event => event.date === dateString);
}

function formatDateString(year, month, day) {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function renderWeekSchedule() {
  if (!scheduleGrid) return;

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0:日, 1:月...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const weekDays = [];
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);

    const dateString = formatDateString(
      current.getFullYear(),
      current.getMonth() + 1,
      current.getDate()
    );

    weekDays.push({
      day: weekdays[current.getDay()],
      date: current.getDate(),
      events: getEventsByDate(dateString)
    });
  }

  scheduleGrid.className = 'schedule-grid week-mode';
  scheduleGrid.innerHTML = weekDays.map(item => `
    <div class="schedule-card">
      <p class="schedule-day">${item.day}</p>
      <div class="schedule-date">${item.date}</div>
      <div class="schedule-event-list">
        ${item.events.length
          ? item.events.map(event => `<p class="schedule-text">${event.title}</p>`).join('')
          : `<p class="schedule-text empty-text">予定なし</p>`
        }
      </div>
    </div>
  `).join('');

  if (weekViewBtn) weekViewBtn.classList.add('active');
  if (monthViewBtn) monthViewBtn.classList.remove('active');
}

function renderMonthSchedule() {
  if (!scheduleGrid) return;

  const year = selectedCalendarYear;
  const month = selectedCalendarMonth;

  const firstDay = new Date(year, month - 1, 1);
  const lastDate = new Date(year, month, 0).getDate();
  const startWeekday = (firstDay.getDay() + 6) % 7;

  const cells = [];

  for (let i = 0; i < startWeekday; i++) {
    cells.push({ date: '', events: [] });
  }

  for (let day = 1; day <= lastDate; day++) {
    const dateString = formatDateString(year, month, day);

    cells.push({
      date: day,
      events: getEventsByDate(dateString)
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: '', events: [] });
  }

  scheduleGrid.className = 'schedule-grid month-mode';
  scheduleGrid.innerHTML = `
    <div class="month-weekday">月</div>
    <div class="month-weekday">火</div>
    <div class="month-weekday">水</div>
    <div class="month-weekday">木</div>
    <div class="month-weekday">金</div>
    <div class="month-weekday">土</div>
    <div class="month-weekday">日</div>

    ${cells.map(cell => `
      <div class="month-cell ${cell.date ? '' : 'empty'}">
        ${cell.date ? `<div class="month-date">${cell.date}</div>` : ''}
        <div class="month-event-list">
          ${cell.events.map(event => `<p class="month-text">${event.title}</p>`).join('')}
        </div>
      </div>
    `).join('')}
  `;

  if (monthViewBtn) monthViewBtn.classList.add('active');
  if (weekViewBtn) weekViewBtn.classList.remove('active');
  if (monthSelectorWrap) monthSelectorWrap.style.display = 'flex';
  if (monthSelector) monthSelector.value = String(month);

  if (weekViewBtn) weekViewBtn.classList.add('active');
  if (monthViewBtn) monthViewBtn.classList.remove('active');
  if (monthSelectorWrap) monthSelectorWrap.style.display = 'none';
}

if (weekViewBtn) {
  weekViewBtn.addEventListener('click', renderWeekSchedule);
}

if (monthViewBtn) {
  monthViewBtn.addEventListener('click', renderMonthSchedule);
}

if (monthSelector) {
  monthSelector.addEventListener('change', (e) => {
    selectedCalendarMonth = Number(e.target.value);
    renderMonthSchedule();
  });
}

renderEvents(events);
renderVideos(videos);
renderWeekSchedule();
