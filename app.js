const events = [
  {
    title: 'Full course',
    artist: 'だうく / ゆちかみ / 〇〇',
    place: '浅草橋マンホール',
    area: '東京',
    time: '13:00 OPEN / 13:30 START',
    price: '3,500円',
    tag: 'チケット発売中',
    image: 'images/Fullcorse_2025.JPG'
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
        <img src="${item.image}" alt="">
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
