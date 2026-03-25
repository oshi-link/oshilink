let events = [];

async function loadEvents() {
  try {
    const res = await fetch('./events.json');

    if (!res.ok) {
      throw new Error(`events.json の読み込みに失敗しました: ${res.status}`);
    }

    events = await res.json();

    renderEvents(events);

  } catch (error) {
    console.error('イベント読み込みエラー:', error);

    if (eventGrid) {
      eventGrid.innerHTML = `
        <div class="events-empty">
          <p>ライブ情報の読み込みに失敗しました。</p>
        </div>
      `;
    }

    if (allEventsGrid) {
      allEventsGrid.innerHTML = `
        <div class="events-empty">
          <p>ライブ情報の読み込みに失敗しました。</p>
        </div>
      `;
    }
  }
}

async function loadVideos() {
  try {
    const res = await fetch('./videos.json');

    if (!res.ok) {
      throw new Error(`videos.json の読み込みに失敗しました: ${res.status}`);
    }

    videos = await res.json();
    renderVideos(videos);

  } catch (error) {
    console.error('動画読み込みエラー:', error);

    const videoGrid = document.getElementById('videoGrid');
    if (videoGrid) {
      videoGrid.innerHTML = `
        <div class="events-empty">
          <p>動画情報の読み込みに失敗しました。</p>
        </div>
      `;
    }
  }
}

function parseEventDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function isPastEvent(dateString) {
  const eventDate = parseEventDate(dateString);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return eventDate < today;
}

function getEventStatusLabel(event) {
  return isPastEvent(event.date) ? '公演終了' : 'チケット発売中';
}

function getTicketButtonHtml(item) {
  if (isPastEvent(item.date)) {
    return `<span class="mini-btn disabled">終了</span>`;
  }

  return `
    <a href="${item.ticketUrl}" class="mini-btn" target="_blank" rel="noopener noreferrer">
      チケット
    </a>
  `;
}

let videos = [];

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
let selectedCalendarMonth = 3;

let artists = [];
const artistGrid = document.getElementById('artistGrid');

const allEventsGrid = document.getElementById('allEventsGrid');
const eventsMonthSelector = document.getElementById('eventsMonthSelector');
const eventsPageMonthLabel = document.getElementById('eventsPageMonthLabel');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');

function renderEvents(list) {
  if (!eventGrid) return;

  const upcomingList = list.filter(item => !isPastEvent(item.date));
  const sortedList = [...upcomingList].sort((a, b) => parseEventDate(a.date) - parseEventDate(b.date));

  const shouldShowMoreButton = sortedList.length >= 4;
  const visibleList = shouldShowMoreButton ? sortedList.slice(0, 3) : sortedList;

  if (!visibleList.length) {
    eventGrid.innerHTML = `
      <div class="events-empty">
        <p>現在表示できるライブ情報はありません。</p>
      </div>
    `;
    return;
  }

  eventGrid.innerHTML = `
    ${visibleList.map(item => `
      <article class="card">
        <div class="card-image">
          <img src="${item.image}" alt="${item.title}">
          <span class="badge ${isPastEvent(item.date) ? 'ended' : ''}">
            ${getEventStatusLabel(item)}
          </span>
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
               ${getTicketButtonHtml(item)}
          </div>
        </div>
      </article>
    `).join('')}

    ${shouldShowMoreButton ? `
      <div class="more-events-wrap">
        <a href="events.html?month=${selectedCalendarMonth}" class="show-more-btn">もっと見る</a>
      </div>
    ` : ''}
  `;
}

/*新着動画*/
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

        ${item.url ? `
          <div class="card-actions">
            <a href="${item.url}" class="mini-btn" target="_blank" rel="noopener noreferrer">視聴する</a>
          </div>
        ` : ''}

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

/*演者一覧描写関数*/
function renderArtists(list) {
  if (!artistGrid) return;

  artistGrid.innerHTML = list.map(item => `
    <div class="artist-card">
      <div class="artist-icon">${item.icon}</div>
      <div>
        <h3>${item.name}</h3>
        <p>${item.description}</p>
      </div>
    </div>
  `).join('');
}

/*演者一覧読み込み関数*/
async function loadArtists() {
  try {
    const res = await fetch('./artists.json');

    if (!res.ok) {
      throw new Error(`artists.json の読み込みに失敗しました: ${res.status}`);
    }

    artists = await res.json();
    renderArtists(artists);

  } catch (error) {
    console.error('演者読み込みエラー:', error);

    if (artistGrid) {
      artistGrid.innerHTML = `
        <div class="events-empty">
          <p>演者情報の読み込みに失敗しました。</p>
        </div>
      `;
    }
  }
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

function getMonthFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const month = Number(params.get('month'));
  return month >= 1 && month <= 12 ? month : 3;
}

function updateEventsPageUrl(month) {
  const url = new URL(window.location.href);
  url.searchParams.set('month', String(month));
  window.history.replaceState({}, '', url);
}

function renderEventsPageByMonth(month) {
  if (!allEventsGrid) return;

  selectedCalendarMonth = month;

  const filtered = [...events]
    .filter(event => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getFullYear() === selectedCalendarYear &&
        eventDate.getMonth() + 1 === month
      );
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (eventsMonthSelector) {
    eventsMonthSelector.value = String(month);
  }

  if (eventsPageMonthLabel) {
    eventsPageMonthLabel.textContent = `${selectedCalendarYear}年${month}月のライブ一覧`;
  }

  if (!filtered.length) {
    allEventsGrid.innerHTML = `
      <div class="events-empty">
        <p>この月のライブ情報はまだありません。</p>
      </div>
    `;
    return;
  }

  allEventsGrid.innerHTML = filtered.map(item => `
    <article class="card">
      <div class="card-image">
        <img src="${item.image}" alt="${item.title}">
        <span class="badge ${isPastEvent(item.date) ? 'ended' : ''}">
          ${getEventStatusLabel(item)}
        </span>
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
          ${getTicketButtonHtml(item)}
        </div>
      </div>
    </article>
  `).join('');
}

function setupEventsPage() {
  if (!allEventsGrid) return;

  const initialMonth = getMonthFromQuery();
  renderEventsPageByMonth(initialMonth);

  if (eventsMonthSelector) {
    eventsMonthSelector.addEventListener('change', (e) => {
      const month = Number(e.target.value);
      updateEventsPageUrl(month);
      renderEventsPageByMonth(month);
    });
  }

  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
      if (selectedCalendarMonth <= 1) return;
      const month = selectedCalendarMonth - 1;
      updateEventsPageUrl(month);
      renderEventsPageByMonth(month);
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
      if (selectedCalendarMonth >= 12) return;
      const month = selectedCalendarMonth + 1;
      updateEventsPageUrl(month);
      renderEventsPageByMonth(month);
    });
  }
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
}

if (weekViewBtn) {
  weekViewBtn.addEventListener('click', () => {
    renderWeekSchedule();

    if (monthSelectorWrap) {
      monthSelectorWrap.style.display = 'none';
    }
  });
}

if (monthViewBtn) {
  monthViewBtn.addEventListener('click', () => {
    renderMonthSchedule();

    if (monthSelectorWrap) {
      monthSelectorWrap.style.display = 'flex';
    }
  });
}

if (monthSelector) {
  monthSelector.addEventListener('change', (e) => {
    selectedCalendarMonth = Number(e.target.value);
    renderMonthSchedule();
  });
}

async function init() {
  await loadEvents();
  await loadVideos();
  await loadArtists();
  renderWeekSchedule();
  setupEventsPage();
}

init();
