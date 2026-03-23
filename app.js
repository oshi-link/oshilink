const events = [
  {
    title: 'Shibuya Night Stage',
    artist: 'Amane / Shion / Luna*',
    place: '渋谷 Star Lounge',
    area: '東京',
    time: '18:00 OPEN / 18:30 START',
    price: '前売 3,400円',
    tag: 'チケット発売中'
  },
  {
    title: 'Nagoya Idol Circuit',
    artist: 'Luna* / Milky Parade',
    place: '名古屋 CLUB ZION',
    area: '名古屋',
    time: '17:30 OPEN / 18:00 START',
    price: '前売 2,800円',
    tag: '注目イベント'
  },
  {
    title: 'Osaka Uta Fes',
    artist: 'Shion / Aster / Riku',
    place: '心斎橋 VARON',
    area: '大阪',
    time: '16:30 OPEN / 17:00 START',
    price: '前売 3,000円',
    tag: '本日開催'
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

function renderEvents(list) {
  eventGrid.innerHTML = list.map(item => `
    <article class="card">
      <div class="card-image">
        <span class="badge">${item.tag}</span>
        <strong>${item.area}</strong>
      </div>
      <div class="card-body">
        <h3>${item.title}</h3>
        <div class="meta">
          <span>🎤 ${item.artist}</span>
          <span>📍 ${item.place}</span>
          <span>🕒 ${item.time}</span>
          <span>🎫 ${item.price}</span>
        </div>
        <div class="card-actions">
          <a href="#" class="ghost-btn">詳細</a>
          <a href="#" class="mini-btn">チケット</a>
        </div>
      </div>
    </article>
  `).join('');
}

function renderVideos(list) {
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
    const matchesKeyword = !key || [item.title, item.artist, item.place, item.area].join(' ').toLowerCase().includes(key);
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

searchButton.addEventListener('click', () => applyFilter(currentArea, searchInput.value));
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') applyFilter(currentArea, searchInput.value);
});

renderEvents(events);
renderVideos(videos);
