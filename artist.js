import { supabase } from "./supabase.js";

const artistName = document.getElementById("artistName");
const artistDescription = document.getElementById("artistDescription");
const artistLinks = document.getElementById("artistLinks");
const artistVideos = document.getElementById("artistVideos");
const artistEvents = document.getElementById("artistEvents");

function getSlugFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("slug");
}

function getYouTubeVideoId(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1);
    if (parsed.hostname.includes("youtube.com")) return parsed.searchParams.get("v");
    return null;
  } catch {
    return null;
  }
}

function getVideoThumbnail(url) {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";
}

async function loadArtist() {
  const slug = getSlugFromQuery();
  if (!slug) {
    artistName.textContent = "演者が見つかりません";
    return;
  }

  const { data, error } = await supabase
    .from("artists")
    .select("*")
    .eq("detail_slug", slug)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    console.error(error);
    artistName.textContent = "演者が見つかりません";
    return;
  }

  artistName.textContent = data.name;
  artistDescription.textContent = data.description || "";

  artistLinks.innerHTML = `
    ${data.x_url ? `<a href="${data.x_url}" class="mini-btn" target="_blank" rel="noopener noreferrer">Xを見る</a>` : ""}
  `;

  await loadArtistVideos(data.name);
  await loadArtistEvents(data.name);
}

async function loadArtistVideos(name) {
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .eq("artist_name", name)
    .eq("is_public", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    artistVideos.innerHTML = `<div class="events-empty"><p>動画の読み込みに失敗しました。</p></div>`;
    return;
  }

  if (!data.length) {
    artistVideos.innerHTML = `<div class="events-empty"><p>動画はまだありません。</p></div>`;
    return;
  }

  artistVideos.innerHTML = data.map(item => {
    const thumbnail = getVideoThumbnail(item.url);
    return `
      <article class="card">
        <div class="card-image">
          ${thumbnail ? `<img src="${thumbnail}" alt="${item.title}" loading="lazy">` : ""}
          <span class="badge">${item.type || ""}</span>
        </div>
        <div class="card-body">
          <h3>${item.title}</h3>
          <div class="meta">
            <span>▶ ${item.description || ""}</span>
          </div>
          ${item.url ? `<div class="card-actions"><a href="${item.url}" class="mini-btn" target="_blank" rel="noopener noreferrer">視聴する</a></div>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

async function loadArtistEvents(name) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("artist_name", name)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("event_date", { ascending: true });

  if (error) {
    console.error(error);
    artistEvents.innerHTML = `<div class="events-empty"><p>イベントの読み込みに失敗しました。</p></div>`;
    return;
  }

  if (!data.length) {
    artistEvents.innerHTML = `<div class="events-empty"><p>出演イベントはまだありません。</p></div>`;
    return;
  }

  artistEvents.innerHTML = data.map(item => `
    <article class="card">
      <div class="card-image">
        ${item.image_path ? `<img src="${item.image_path}" alt="${item.title}" loading="lazy">` : ""}
        <span class="badge">LIVE</span>
      </div>
      <div class="card-body">
        <h3>${item.title}</h3>
        <div class="meta">
          <span>📍 ${item.place}</span>
          <span>🗾 ${item.area}</span>
          <span>📅 ${item.event_date}</span>
          <span>🕒 ${item.time_text || ""}</span>
        </div>
        <div class="card-actions">
          ${item.detail_url ? `<a href="${item.detail_url}" class="ghost-btn" target="_blank" rel="noopener noreferrer">詳細</a>` : ""}
          ${item.ticket_url ? `<a href="${item.ticket_url}" class="mini-btn" target="_blank" rel="noopener noreferrer">チケット</a>` : ""}
        </div>
      </div>
    </article>
  `).join("");
}

loadArtist();
