import { supabase } from "./supabase.js";

let events = [];
let videos = [];
let artists = [];

const eventGrid = document.getElementById("eventGrid");
const videoGrid = document.getElementById("videoGrid");
const artistGrid = document.getElementById("artistGrid");
const allEventsGrid = document.getElementById("allEventsGrid");

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const filterButtons = document.querySelectorAll(".filter-btn");

const eventsMonthSelector = document.getElementById("eventsMonthSelector");
const eventsPageMonthLabel = document.getElementById("eventsPageMonthLabel");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");

const authNav = document.getElementById("authNav");

let currentArea = "all";
let selectedCalendarYear = 2026;
let selectedCalendarMonth = 3;

function parseEventDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isPastEvent(dateString) {
  const eventDate = parseEventDate(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDate < today;
}

function getEventStatusLabel(event) {
  return isPastEvent(event.date) ? "公演終了" : "チケット発売中";
}

function getTicketButtonHtml(item) {
  if (isPastEvent(item.date)) {
    return `<span class="mini-btn disabled">終了</span>`;
  }

  return item.ticketUrl
    ? `<a href="${item.ticketUrl}" class="mini-btn" target="_blank" rel="noopener noreferrer">チケット</a>`
    : `<span class="mini-btn disabled">未設定</span>`;
}

async function renderAuthNav() {
  if (!authNav) return;

  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;

  if (user) {
    authNav.innerHTML = `
      <a href="dashboard.html" class="ghost-btn">マイページ</a>
      <button id="headerLogoutBtn" class="nav-cta" type="button">ログアウト</button>
    `;

    const headerLogoutBtn = document.getElementById("headerLogoutBtn");
    headerLogoutBtn?.addEventListener("click", async () => {
      await supabase.auth.signOut();
      authNav.innerHTML = `<a href="login.html" class="nav-cta">ログイン</a>`;
      location.href = "index.html";
    });
  } else {
    authNav.innerHTML = `<a href="login.html" class="nav-cta">ログイン</a>`;
  }
}

async function loadEvents() {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .is("deleted_at", null)
      .order("event_date", { ascending: true });

    if (error) throw error;

    events = (data || []).map(item => ({
      id: item.id,
      title: item.title,
      artist: item.artist_name,
      place: item.place,
      area: item.area,
      date: item.event_date,
      time: item.time_text || "",
      price: item.price || "",
      image: item.image_path || "",
      detailUrl: item.detail_url || "",
      ticketUrl: item.ticket_url || "",
      createdAt: item.created_at || ""
    }));

    renderEvents(events);
    if (allEventsGrid) {
      renderEventsPageByMonth(getMonthFromQuery());
    }
  } catch (error) {
    console.error("イベント読み込みエラー:", error);
    if (eventGrid) {
      eventGrid.innerHTML = `<div class="events-empty"><p>ライブ情報の読み込みに失敗しました。</p></div>`;
    }
    if (allEventsGrid) {
      allEventsGrid.innerHTML = `<div class="events-empty"><p>ライブ情報の読み込みに失敗しました。</p></div>`;
    }
  }
}

async function loadVideos() {
  try {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("is_public", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    videos = (data || []).map(item => ({
      title: item.title,
      artist: item.artist_name,
      type: item.type || "",
      description: item.description || "",
      url: item.url || ""
    }));

    renderVideos(videos);
  } catch (error) {
    console.error("動画読み込みエラー:", error);
    if (videoGrid) {
      videoGrid.innerHTML = `<div class="events-empty"><p>動画情報の読み込みに失敗しました。</p></div>`;
    }
  }
}

async function loadArtists() {
  try {
    const { data, error } = await supabase
      .from("artists")
      .select("*")
      .eq("is_public", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    artists = (data || []).map(item => ({
      name: item.name,
      icon: item.icon_path || "",
      description: item.description || "",
      xUrl: item.x_url || "",
      externalUrl: item.external_url || item.header_image_url || "",
      detailUrl: item.detail_slug ? `artist.html?slug=${item.detail_slug}` : ""
    }));

    renderArtists(artists);
  } catch (error) {
    console.error("演者読み込みエラー:", error);
    if (artistGrid) {
      artistGrid.innerHTML = `<div class="events-empty"><p>演者情報の読み込みに失敗しました。</p></div>`;
    }
  }
}

function renderEvents(list) {
  if (!eventGrid) return;

  const upcomingList = list.filter(item => !isPastEvent(item.date));
  const sortedList = [...upcomingList].sort((a, b) => parseEventDate(a.date) - parseEventDate(b.date));

  if (!sortedList.length) {
    eventGrid.innerHTML = `<div class="events-empty"><p>現在表示できるライブ情報はありません。</p></div>`;
    return;
  }

  const visibleList = sortedList.slice(0, 6);

  eventGrid.innerHTML = visibleList.map(item => `
    <article class="card">
      <div class="card-image">
        ${item.image ? `<img src="${item.image}" loading="lazy" alt="${item.title}" width="600" height="400">` : ""}
        <span class="badge ${isPastEvent(item.date) ? "ended" : ""}">
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
          ${item.detailUrl ? `<a href="${item.detailUrl}" class="ghost-btn" target="_blank" rel="noopener noreferrer">詳細</a>` : `<span class="ghost-btn">詳細なし</span>`}
          ${getTicketButtonHtml(item)}
        </div>
      </div>
    </article>
  `).join("");
}

function getYouTubeVideoId(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1);
    }

    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v");
    }

    return null;
  } catch {
    return null;
  }
}

function getVideoThumbnail(url) {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";
}

function renderVideos(list) {
  if (!videoGrid) return;

  if (!list.length) {
    videoGrid.innerHTML = `<div class="events-empty"><p>現在表示できる動画はありません。</p></div>`;
    return;
  }

  videoGrid.innerHTML = list.map(item => {
    const thumbnail = getVideoThumbnail(item.url);

    return `
      <article class="card">
        <div class="card-image">
          ${thumbnail ? `<img src="${thumbnail}" loading="lazy" alt="${item.title}のサムネイル" width="600" height="338">` : ""}
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
          ` : ""}
        </div>
      </article>
    `;
  }).join("");
}

function renderArtists(list) {
  if (!artistGrid) return;

  if (!list.length) {
    artistGrid.innerHTML = `<div class="events-empty"><p>現在表示できる演者情報はありません。</p></div>`;
    return;
  }

  artistGrid.innerHTML = list.map(item => `
    <article class="artist-card">
      <div class="artist-card-main">
        <div class="artist-icon">
          ${item.icon ? `<img src="${item.icon}" alt="${item.name}" loading="lazy" width="52" height="52">` : ""}
        </div>
        <div class="artist-info">
          <h3>${item.name}</h3>
          <p>${item.description}</p>
        </div>
      </div>

      <div class="artist-card-overlay">
        ${item.xUrl ? `<a href="${item.xUrl}" class="artist-action-btn x-btn" target="_blank" rel="noopener noreferrer">X</a>` : ""}
        ${item.externalUrl ? `<a href="${item.externalUrl}" class="artist-action-btn detail-btn" target="_blank" rel="noopener noreferrer">詳細</a>` : ""}
        ${item.detailUrl ? `<a href="${item.detailUrl}" class="artist-action-btn detail-btn">プロフィール</a>` : ""}
      </div>
    </article>
  `).join("");
}

function applyFilter(area = "all", keyword = "") {
  const key = keyword.trim().toLowerCase();

  const filtered = events.filter(item => {
    const matchesArea = area === "all" || item.area === area;
    const matchesKeyword =
      !key || [item.title, item.artist, item.place, item.area, item.date]
        .join(" ")
        .toLowerCase()
        .includes(key);

    return matchesArea && matchesKeyword;
  });

  renderEvents(filtered);
}

function getMonthFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const month = Number(params.get("month"));
  return month >= 1 && month <= 12 ? month : new Date().getMonth() + 1;
}

function updateEventsPageUrl(month) {
  const url = new URL(window.location.href);
  url.searchParams.set("month", String(month));
  window.history.replaceState({}, "", url);
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
    allEventsGrid.innerHTML = `<div class="events-empty"><p>この月のライブ情報はまだありません。</p></div>`;
    return;
  }

  allEventsGrid.innerHTML = filtered.map(item => `
    <article class="card">
      <div class="card-image">
        ${item.image ? `<img src="${item.image}" loading="lazy" alt="${item.title}" width="600" height="400">` : ""}
        <span class="badge ${isPastEvent(item.date) ? "ended" : ""}">
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
          ${item.detailUrl ? `<a href="${item.detailUrl}" class="ghost-btn" target="_blank" rel="noopener noreferrer">詳細</a>` : `<span class="ghost-btn">詳細なし</span>`}
          ${getTicketButtonHtml(item)}
        </div>
      </div>
    </article>
  `).join("");
}

function setupEventsPage() {
  if (!allEventsGrid) return;

  const initialMonth = getMonthFromQuery();
  renderEventsPageByMonth(initialMonth);

  if (eventsMonthSelector) {
    eventsMonthSelector.addEventListener("change", (e) => {
      const month = Number(e.target.value);
      updateEventsPageUrl(month);
      renderEventsPageByMonth(month);
    });
  }

  if (prevMonthBtn) {
    prevMonthBtn.addEventListener("click", () => {
      if (selectedCalendarMonth <= 1) return;
      const month = selectedCalendarMonth - 1;
      updateEventsPageUrl(month);
      renderEventsPageByMonth(month);
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener("click", () => {
      if (selectedCalendarMonth >= 12) return;
      const month = selectedCalendarMonth + 1;
      updateEventsPageUrl(month);
      renderEventsPageByMonth(month);
    });
  }
}

filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    filterButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentArea = btn.dataset.filter;
    applyFilter(currentArea, searchInput?.value || "");
  });
});

searchButton?.addEventListener("click", () => applyFilter(currentArea, searchInput?.value || ""));
searchInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") applyFilter(currentArea, searchInput.value);
});

async function init() {
  await renderAuthNav();

  supabase.auth.onAuthStateChange(async () => {
    await renderAuthNav();
  });

  await loadEvents();
  await loadVideos();
  await loadArtists();
  setupEventsPage();
}

init();
