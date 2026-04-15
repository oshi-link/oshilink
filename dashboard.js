import { supabase } from "./supabase.js";
import { getPlanLimits } from "./plan-utils.js";

const userEmail = document.getElementById("userEmail");
const userPlan = document.getElementById("userPlan");
const registeredArtistName = document.getElementById("registeredArtistName");
const logoutBtn = document.getElementById("logoutBtn");

const artistRequiredNotice = document.getElementById("artistRequiredNotice");
const eventCard = document.getElementById("eventCard");
const videoCard = document.getElementById("videoCard");

const eventForm = document.getElementById("eventForm");
const eventMessage = document.getElementById("eventMessage");
const myEvents = document.getElementById("myEvents");

const artistForm = document.getElementById("artistForm");
const artistMessage = document.getElementById("artistMessage");
const myArtists = document.getElementById("myArtists");

const videoForm = document.getElementById("videoForm");
const videoMessage = document.getElementById("videoMessage");
const myVideos = document.getElementById("myVideos");

const detailUrlInput = document.getElementById("detailUrl");
const ticketUrlInput = document.getElementById("ticketUrl");
const artistDetailSlugInput = document.getElementById("artistDetailSlug");

let currentUser = null;
let currentProfile = null;
let primaryArtist = null;

let editingEventId = null;
let editingArtistId = null;
let editingVideoId = null;

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    location.href = "login.html";
    return null;
  }
  return data.user;
}

async function loadProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("プロフィール取得失敗:", error);
    return null;
  }

  return data;
}

async function uploadImage(bucketName, file, userId) {
  if (!file) return "";

  const ext = file.name.split(".").pop();
  const filePath = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  return data.publicUrl;
}

function getSafePlan(profile) {
  return profile?.plan || "free";
}

function isPaidPlan(plan) {
  return plan === "standard" || plan === "premium";
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

function setSelectOptions(select, start, end, suffix = "") {
  const options = [];
  for (let i = start; i <= end; i += 1) {
    const value = String(i).padStart(2, "0");
    options.push(`<option value="${value}">${value}${suffix}</option>`);
  }
  select.innerHTML = options.join("");
}

function setupTimeSelectors() {
  setSelectOptions(document.getElementById("openHour"), 0, 23);
  setSelectOptions(document.getElementById("startHour"), 0, 23);

  const minuteOptions = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"]
    .map(min => `<option value="${min}">${min}分</option>`)
    .join("");

  document.getElementById("openMinute").innerHTML = minuteOptions;
  document.getElementById("startMinute").innerHTML = minuteOptions;

  document.getElementById("openHour").value = "18";
  document.getElementById("openMinute").value = "00";
  document.getElementById("startHour").value = "18";
  document.getElementById("startMinute").value = "30";
}

function buildTimeText() {
  const openHour = document.getElementById("openHour").value;
  const openMinute = document.getElementById("openMinute").value;
  const startHour = document.getElementById("startHour").value;
  const startMinute = document.getElementById("startMinute").value;

  return `${openHour}:${openMinute} OPEN / ${startHour}:${startMinute} START`;
}

function fillTimeSelectorsFromText(timeText = "") {
  const match = timeText.match(/(\d{1,2}):(\d{2})\s*OPEN\s*\/\s*(\d{1,2}):(\d{2})\s*START/i);
  if (!match) {
    setupTimeSelectors();
    return;
  }

  document.getElementById("openHour").value = String(match[1]).padStart(2, "0");
  document.getElementById("openMinute").value = String(match[2]).padStart(2, "0");
  document.getElementById("startHour").value = String(match[3]).padStart(2, "0");
  document.getElementById("startMinute").value = String(match[4]).padStart(2, "0");
}

async function countPublishedEvents(userId) {
  const { count, error } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("owner_user_id", userId)
    .eq("status", "published")
    .is("deleted_at", null);

  if (error) throw error;
  return count || 0;
}

async function countMonthlyEventCreates(userId) {
  const { start, end } = getMonthRange();

  const { count, error } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("owner_user_id", userId)
    .gte("created_at", start)
    .lt("created_at", end);

  if (error) throw error;
  return count || 0;
}

async function countUserVideos(userId) {
  const { count, error } = await supabase
    .from("videos")
    .select("*", { count: "exact", head: true })
    .eq("owner_user_id", userId)
    .is("deleted_at", null);

  if (error) throw error;
  return count || 0;
}

async function loadPrimaryArtist() {
  const { data, error } = await supabase
    .from("artists")
    .select("*")
    .eq("owner_user_id", currentUser.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    console.error("演者取得失敗:", error);
    return null;
  }

  return data?.[0] || null;
}

function applyPlanRestrictions() {
  const plan = getSafePlan(currentProfile);
  const paid = isPaidPlan(plan);

  detailUrlInput.disabled = !paid;
  ticketUrlInput.disabled = !paid;
  artistDetailSlugInput.disabled = !paid;

  if (!paid) {
    detailUrlInput.value = "";
    ticketUrlInput.value = "";
    artistDetailSlugInput.value = "";
    detailUrlInput.placeholder = "詳細URL（有料プランのみ）";
    ticketUrlInput.placeholder = "チケットURL（有料プランのみ）";
    artistDetailSlugInput.placeholder = "詳細URL用slug（有料プランのみ）";
  }
}

function applyArtistGate() {
  if (primaryArtist) {
    artistRequiredNotice.style.display = "none";
    eventCard.style.display = "block";
    videoCard.style.display = "block";
    registeredArtistName.textContent = `登録済み演者: ${primaryArtist.name}`;
  } else {
    artistRequiredNotice.style.display = "block";
    eventCard.style.display = "none";
    videoCard.style.display = "none";
    registeredArtistName.textContent = "登録済み演者: 未登録";
  }
}

function getEventStatusLabel(status) {
  if (status === "private") return "非公開";
  if (status === "ended") return "終了";
  return "公開中";
}

function resetEventForm() {
  editingEventId = null;
  eventForm.reset();
  setupTimeSelectors();
  applyPlanRestrictions();
  eventForm.querySelector('button[type="submit"]').textContent = "イベントを投稿する";
}

function resetArtistForm() {
  editingArtistId = null;
  artistForm.reset();
  applyPlanRestrictions();
  artistForm.querySelector('button[type="submit"]').textContent = "演者を登録する";
}

function resetVideoForm() {
  editingVideoId = null;
  videoForm.reset();
  videoForm.querySelector('button[type="submit"]').textContent = "動画を投稿する";
}

function startEditEvent(item) {
  editingEventId = item.id;
  document.getElementById("title").value = item.title || "";
  document.getElementById("area").value = item.area || "";
  document.getElementById("place").value = item.place || "";
  document.getElementById("date").value = item.event_date || "";
  document.getElementById("price").value = item.price || "";
  detailUrlInput.value = item.detail_url || "";
  ticketUrlInput.value = item.ticket_url || "";
  fillTimeSelectorsFromText(item.time_text || "");
  eventForm.querySelector('button[type="submit"]').textContent = "イベントを更新する";
  eventForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function startEditArtist(item) {
  editingArtistId = item.id;
  document.getElementById("artistName").value = item.name || "";
  document.getElementById("artistDescription").value = item.description || "";
  document.getElementById("artistXUrl").value = item.x_url || "";
  artistDetailSlugInput.value = item.detail_slug || "";
  artistForm.querySelector('button[type="submit"]').textContent = "演者情報を更新する";
  artistForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function startEditVideo(item) {
  editingVideoId = item.id;
  document.getElementById("videoTitle").value = item.title || "";
  document.getElementById("videoType").value = item.type || "";
  document.getElementById("videoDescription").value = item.description || "";
  document.getElementById("videoUrl").value = item.url || "";
  videoForm.querySelector('button[type="submit"]').textContent = "動画を更新する";
  videoForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderEvents(list) {
  if (!myEvents) return;

  if (!list.length) {
    myEvents.innerHTML = `
      <div class="events-empty">
        <p>まだイベントは投稿されていません。</p>
      </div>
    `;
    return;
  }

  const paid = isPaidPlan(getSafePlan(currentProfile));

  myEvents.innerHTML = list.map(item => {
    const isEditing = editingEventId === item.id;

    if (isEditing) {
      return `
        <article class="card">
          <div class="card-body">
            <h3>イベント修正</h3>
            <div style="display: grid; gap: 12px;">
              <input type="text" id="editEventTitle_${item.id}" value="${escapeHtml(item.title || "")}" placeholder="タイトル" />

              <select id="editEventArea_${item.id}">
                <option value="">地域を選択してください</option>
                ${[
                  "北海道","青森","岩手","宮城","秋田","山形","福島","茨城","栃木","群馬","埼玉","千葉","東京","神奈川",
                  "新潟","富山","石川","福井","山梨","長野","岐阜","静岡","愛知","三重","滋賀","京都","大阪","兵庫","奈良",
                  "和歌山","鳥取","島根","岡山","広島","山口","徳島","香川","愛媛","高知","福岡","佐賀","長崎","熊本","大分",
                  "宮崎","鹿児島","沖縄"
                ].map(area => `<option value="${area}" ${item.area === area ? "selected" : ""}>${area}</option>`).join("")}
              </select>

              <input type="text" id="editEventPlace_${item.id}" value="${escapeHtml(item.place || "")}" placeholder="場所" />
              <input type="date" id="editEventDate_${item.id}" value="${escapeHtml(item.event_date || "")}" />
              <input type="text" id="editEventTime_${item.id}" value="${escapeHtml(item.time_text || "")}" placeholder="18:00 OPEN / 18:30 START" />
              <input type="text" id="editEventPrice_${item.id}" value="${escapeHtml(item.price || "")}" placeholder="料金" />

              <input
                type="text"
                id="editEventDetailUrl_${item.id}"
                value="${escapeHtml(item.detail_url || "")}"
                placeholder="${paid ? "詳細URL" : "詳細URL（有料プランのみ）"}"
                ${paid ? "" : "disabled"}
              />

              <input
                type="text"
                id="editEventTicketUrl_${item.id}"
                value="${escapeHtml(item.ticket_url || "")}"
                placeholder="${paid ? "チケットURL" : "チケットURL（有料プランのみ）"}"
                ${paid ? "" : "disabled"}
              />

              <div class="card-actions">
                <button class="primary-btn save-event-btn" data-id="${item.id}">保存</button>
                <button class="ghost-btn cancel-event-edit-btn" data-id="${item.id}">キャンセル</button>
              </div>
            </div>
          </div>
        </article>
      `;
    }

    return `
      <article class="card">
        <div class="card-image">
          ${item.image_path ? `<img src="${item.image_path}" alt="${escapeHtml(item.title)}" loading="lazy">` : ""}
          <span class="badge ${item.status === "private" ? "ended" : ""}">
            ${getEventStatusLabel(item.status)}
          </span>
        </div>
        <div class="card-body">
          <h3>${escapeHtml(item.title)}</h3>
          <div class="meta">
            <span>🎤 ${escapeHtml(item.artist_name || "")}</span>
            <span>📍 ${escapeHtml(item.place || "")}</span>
            <span>🗾 ${escapeHtml(item.area || "")}</span>
            <span>📅 ${escapeHtml(item.event_date || "")}</span>
            <span>🕒 ${escapeHtml(item.time_text || "")}</span>
          </div>
          <div class="card-actions">
            <button class="ghost-btn event-edit-btn" data-id="${item.id}">修正</button>
            ${
              item.status === "published"
                ? `<button class="ghost-btn event-private-btn" data-id="${item.id}">非公開</button>`
                : `<button class="primary-btn event-restore-btn" data-id="${item.id}">再公開</button>`
            }
            <button class="ghost-btn event-delete-btn" data-id="${item.id}">削除</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".event-edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      editingEventId = btn.dataset.id;
      loadMyEvents();
    });
  });

  document.querySelectorAll(".cancel-event-edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      editingEventId = null;
      loadMyEvents();
    });
  });

  document.querySelectorAll(".save-event-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;

      const payload = {
        title: document.getElementById(`editEventTitle_${id}`).value.trim(),
        area: document.getElementById(`editEventArea_${id}`).value,
        place: document.getElementById(`editEventPlace_${id}`).value.trim(),
        event_date: document.getElementById(`editEventDate_${id}`).value,
        time_text: document.getElementById(`editEventTime_${id}`).value.trim(),
        price: document.getElementById(`editEventPrice_${id}`).value.trim(),
        detail_url: paid ? document.getElementById(`editEventDetailUrl_${id}`).value.trim() : (item.detail_url || ""),
        ticket_url: paid ? document.getElementById(`editEventTicketUrl_${id}`).value.trim() : (item.ticket_url || "")
      };

      const { error } = await supabase
        .from("events")
        .update(payload)
        .eq("id", id)
        .eq("owner_user_id", currentUser.id);

      if (error) {
        alert("イベント更新に失敗しました");
        console.error(error);
        return;
      }

      editingEventId = null;
      await loadMyEvents();
    });
  });

  document.querySelectorAll(".event-private-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const ok = confirm("このイベントを非公開にしますか？");
      if (!ok) return;

      const { error } = await supabase
        .from("events")
        .update({ status: "private" })
        .eq("id", id)
        .eq("owner_user_id", currentUser.id);

      if (error) {
        alert("非公開への変更に失敗しました");
        console.error(error);
        return;
      }

      await loadMyEvents();
      await refreshPlanSummary();
    });
  });

  document.querySelectorAll(".event-restore-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;

      const limits = getPlanLimits(getSafePlan(currentProfile));
      const publishedCount = await countPublishedEvents(currentUser.id);

      if (limits.maxEvents !== null && publishedCount >= limits.maxEvents) {
        alert(`このプランでは公開中イベントは ${limits.maxEvents} 件までです。先に別のイベントを非公開にしてください。`);
        return;
      }

      const { error } = await supabase
        .from("events")
        .update({ status: "published" })
        .eq("id", id)
        .eq("owner_user_id", currentUser.id);

      if (error) {
        alert("再公開に失敗しました");
        console.error(error);
        return;
      }

      await loadMyEvents();
      await refreshPlanSummary();
    });
  });

  document.querySelectorAll(".event-delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const ok = confirm("このイベントを削除しますか？");
      if (!ok) return;

      const { error } = await supabase
        .from("events")
        .update({
          status: "deleted",
          deleted_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("owner_user_id", currentUser.id);

      if (error) {
        alert("削除に失敗しました");
        console.error(error);
        return;
      }

      editingEventId = null;
      await loadMyEvents();
      await refreshPlanSummary();
    });
  });
}

function renderArtists(list) {
  if (!myArtists) return;

  if (!list.length) {
    myArtists.innerHTML = `
      <div class="events-empty">
        <p>まだ演者は登録されていません。</p>
      </div>
    `;
    return;
  }

  const paid = isPaidPlan(getSafePlan(currentProfile));

  myArtists.innerHTML = list.map(item => {
    const isEditing = editingArtistId === item.id;

    if (isEditing) {
      return `
        <article class="card">
          <div class="card-body">
            <h3>演者情報修正</h3>
            <div style="display: grid; gap: 12px;">
              <input type="text" id="editArtistName_${item.id}" value="${escapeHtml(item.name || "")}" placeholder="演者名" />
              <input type="text" id="editArtistDescription_${item.id}" value="${escapeHtml(item.description || "")}" placeholder="説明" />
              <input type="text" id="editArtistXUrl_${item.id}" value="${escapeHtml(item.x_url || "")}" placeholder="XのURL" />
              <input type="text" id="editArtistExternalUrl_${item.id}" value="${escapeHtml(item.external_url || "")}" placeholder="その他詳細URL" />

              <input
                type="text"
                id="editArtistSlug_${item.id}"
                value="${escapeHtml(item.detail_slug || "")}"
                placeholder="${paid ? "プロフィールURL用slug" : "プロフィールURL用slug（有料プランのみ）"}"
                ${paid ? "" : "disabled"}
              />

              <div class="card-actions">
                <button class="primary-btn save-artist-btn" data-id="${item.id}">保存</button>
                <button class="ghost-btn cancel-artist-edit-btn" data-id="${item.id}">キャンセル</button>
              </div>
            </div>
          </div>
        </article>
      `;
    }

    return `
      <article class="card">
        <div class="card-image">
          ${item.icon_path ? `<img src="${item.icon_path}" alt="${escapeHtml(item.name)}" loading="lazy">` : ""}
          <span class="badge">ARTIST</span>
        </div>
        <div class="card-body">
          <h3>${escapeHtml(item.name)}</h3>
          <div class="meta">
            <span>📝 ${escapeHtml(item.description || "")}</span>
            <span>🔗 ${escapeHtml(item.x_url || "")}</span>
            <span>🌐 ${escapeHtml(item.external_url || "")}</span>
            <span>🆔 ${escapeHtml(item.detail_slug || "-")}</span>
          </div>
          <div class="card-actions">
            <button class="ghost-btn artist-edit-btn" data-id="${item.id}">修正</button>
            ${item.detail_slug ? `<a href="artist.html?slug=${item.detail_slug}" class="mini-btn" target="_blank" rel="noopener noreferrer">プロフィール</a>` : ""}
            <button class="ghost-btn artist-delete-btn" data-id="${item.id}">削除</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".artist-edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      editingArtistId = btn.dataset.id;
      loadMyArtists();
    });
  });

  document.querySelectorAll(".cancel-artist-edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      editingArtistId = null;
      loadMyArtists();
    });
  });

  document.querySelectorAll(".save-artist-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;

      const currentItem = list.find(item => String(item.id) === String(id));

      const payload = {
        name: document.getElementById(`editArtistName_${id}`).value.trim(),
        description: document.getElementById(`editArtistDescription_${id}`).value.trim(),
        x_url: document.getElementById(`editArtistXUrl_${id}`).value.trim(),
        external_url: document.getElementById(`editArtistExternalUrl_${id}`).value.trim(),
        detail_slug: paid
          ? (document.getElementById(`editArtistSlug_${id}`).value.trim() || null)
          : (currentItem?.detail_slug || null)
      };

      const { error } = await supabase
        .from("artists")
        .update(payload)
        .eq("id", id)
        .eq("owner_user_id", currentUser.id);

      if (error) {
        alert("演者更新に失敗しました");
        console.error(error);
        return;
      }

      editingArtistId = null;
      primaryArtist = await loadPrimaryArtist();
      applyArtistGate();
      await loadMyArtists();
    });
  });

  document.querySelectorAll(".artist-delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const ok = confirm("この演者を削除しますか？");
      if (!ok) return;

      const { error } = await supabase
        .from("artists")
        .update({
          is_public: false,
          deleted_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("owner_user_id", currentUser.id);

      if (error) {
        alert("削除に失敗しました");
        console.error(error);
        return;
      }

      editingArtistId = null;
      primaryArtist = await loadPrimaryArtist();
      applyArtistGate();
      await loadMyArtists();
    });
  });
}

function renderVideos(list) {
  if (!myVideos) return;

  if (!list.length) {
    myVideos.innerHTML = `
      <div class="events-empty">
        <p>まだ動画は投稿されていません。</p>
      </div>
    `;
    return;
  }

  myVideos.innerHTML = list.map(item => {
    const isEditing = editingVideoId === item.id;

    if (isEditing) {
      return `
        <article class="card">
          <div class="card-body">
            <h3>動画修正</h3>
            <div style="display: grid; gap: 12px;">
              <input type="text" id="editVideoTitle_${item.id}" value="${item.title || ""}" placeholder="動画タイトル" />
              <input type="text" id="editVideoType_${item.id}" value="${item.type || ""}" placeholder="種別" />
              <input type="text" id="editVideoDescription_${item.id}" value="${item.description || ""}" placeholder="説明" />
              <input type="text" id="editVideoUrl_${item.id}" value="${item.url || ""}" placeholder="動画URL" />

              <div class="card-actions">
                <button class="primary-btn save-video-btn" data-id="${item.id}">保存</button>
                <button class="ghost-btn cancel-video-edit-btn" data-id="${item.id}">キャンセル</button>
              </div>
            </div>
          </div>
        </article>
      `;
    }

    return `
      <article class="card">
        <div class="card-body">
          <h3>${item.title}</h3>
          <div class="meta">
            <span>👤 ${item.artist_name}</span>
            <span>▶ ${item.description || ""}</span>
            <span>🏷 ${item.type || ""}</span>
          </div>
          <div class="card-actions">
            <button class="ghost-btn video-edit-btn" data-id="${item.id}">修正</button>
            ${item.url ? `<a href="${item.url}" class="mini-btn" target="_blank" rel="noopener noreferrer">視聴する</a>` : ""}
            <button class="ghost-btn video-delete-btn" data-id="${item.id}">削除</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".video-edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      editingVideoId = btn.dataset.id;
      loadMyVideos();
    });
  });

  document.querySelectorAll(".cancel-video-edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      editingVideoId = null;
      loadMyVideos();
    });
  });

  document.querySelectorAll(".save-video-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;

      const payload = {
        title: document.getElementById(`editVideoTitle_${id}`).value.trim(),
        type: document.getElementById(`editVideoType_${id}`).value.trim(),
        description: document.getElementById(`editVideoDescription_${id}`).value.trim(),
        url: document.getElementById(`editVideoUrl_${id}`).value.trim()
      };

      const { error } = await supabase
        .from("videos")
        .update(payload)
        .eq("id", id)
        .eq("owner_user_id", currentUser.id);

      if (error) {
        alert("動画更新に失敗しました");
        console.error(error);
        return;
      }

      editingVideoId = null;
      await loadMyVideos();
    });
  });

  document.querySelectorAll(".video-delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const ok = confirm("この動画を削除しますか？");
      if (!ok) return;

      const { error } = await supabase
        .from("videos")
        .update({
          is_public: false,
          deleted_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("owner_user_id", currentUser.id);

      if (error) {
        alert("削除に失敗しました");
        console.error(error);
        return;
      }

      editingVideoId = null;
      await loadMyVideos();
    });
  });
}

async function loadMyEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("owner_user_id", currentUser.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("イベント取得失敗:", error);
    return;
  }

  renderEvents(data || []);
}

async function loadMyArtists() {
  const { data, error } = await supabase
    .from("artists")
    .select("*")
    .eq("owner_user_id", currentUser.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("演者取得失敗:", error);
    return;
  }

  renderArtists(data || []);
}

async function loadMyVideos() {
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .eq("owner_user_id", currentUser.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("動画取得失敗:", error);
    return;
  }

  renderVideos(data || []);
}

async function refreshPlanSummary() {
  const plan = getSafePlan(currentProfile);
  const limits = getPlanLimits(plan);
  const publishedCount = await countPublishedEvents(currentUser.id);
  const monthlyCreateCount = await countMonthlyEventCreates(currentUser.id);

  const publishedText =
    limits.maxEvents === null ? `${publishedCount}件` : `${publishedCount}/${limits.maxEvents}件`;

  const monthlyText =
    limits.maxMonthlyEventCreates === null
      ? `${monthlyCreateCount}件`
      : `${monthlyCreateCount}/${limits.maxMonthlyEventCreates}件`;

  userPlan.textContent = `現在のプラン: ${plan.toUpperCase()} ｜ 公開中イベント: ${publishedText} ｜ 今月の新規作成: ${monthlyText}`;
}

eventForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  eventMessage.textContent = "";

  try {
    if (!primaryArtist) {
      eventMessage.textContent = "先に演者登録を行ってください。";
      return;
    }

    const plan = getSafePlan(currentProfile);
    const paid = isPaidPlan(plan);

    if (!editingEventId) {
      const limits = getPlanLimits(plan);
      const publishedCount = await countPublishedEvents(currentUser.id);
      const monthlyCreateCount = await countMonthlyEventCreates(currentUser.id);

      if (limits.maxEvents !== null && publishedCount >= limits.maxEvents) {
        eventMessage.textContent = `このプランでは公開中イベントは ${limits.maxEvents} 件までです。先に別のイベントを非公開にしてください。`;
        return;
      }

      if (
        limits.maxMonthlyEventCreates !== null &&
        monthlyCreateCount >= limits.maxMonthlyEventCreates
      ) {
        eventMessage.textContent = `このプランでは今月の新規イベント作成は ${limits.maxMonthlyEventCreates} 件までです。`;
        return;
      }
    }

    const imageFile = document.getElementById("eventImage").files[0];
    let imageUrl = "";

    if (editingEventId) {
      const { data: currentEvent } = await supabase
        .from("events")
        .select("image_path")
        .eq("id", editingEventId)
        .eq("owner_user_id", currentUser.id)
        .single();

      imageUrl = currentEvent?.image_path || "";
    }

    if (imageFile) {
      imageUrl = await uploadImage("event-images", imageFile, currentUser.id);
    }

    const payload = {
      owner_user_id: currentUser.id,
      title: document.getElementById("title").value.trim(),
      artist_name: primaryArtist.name,
      place: document.getElementById("place").value.trim(),
      area: document.getElementById("area").value,
      event_date: document.getElementById("date").value,
      time_text: buildTimeText(),
      price: document.getElementById("price").value.trim(),
      detail_url: paid ? detailUrlInput.value.trim() : "",
      ticket_url: paid ? ticketUrlInput.value.trim() : "",
      image_path: imageUrl,
      status: "published",
      deleted_at: null
    };

    let error;

    if (editingEventId) {
      ({ error } = await supabase
        .from("events")
        .update(payload)
        .eq("id", editingEventId)
        .eq("owner_user_id", currentUser.id));
    } else {
      ({ error } = await supabase.from("events").insert(payload));
    }

    if (error) throw error;

    eventMessage.textContent = editingEventId ? "イベントを更新しました。" : "イベントを投稿しました。";
    resetEventForm();

    await loadMyEvents();
    await refreshPlanSummary();
  } catch (error) {
    console.error(error);
    eventMessage.textContent = "イベント投稿に失敗しました。";
  }
});

artistForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  artistMessage.textContent = "";

  try {
    const plan = getSafePlan(currentProfile);
    const paid = isPaidPlan(plan);

    let iconUrl = "";

    if (editingArtistId) {
      const { data: currentArtist } = await supabase
        .from("artists")
        .select("icon_path")
        .eq("id", editingArtistId)
        .eq("owner_user_id", currentUser.id)
        .single();

      iconUrl = currentArtist?.icon_path || "";
    }

    const iconFile = document.getElementById("artistIcon").files[0];
    if (iconFile) {
      iconUrl = await uploadImage("artist-icons", iconFile, currentUser.id);
    }

    const payload = {
      owner_user_id: currentUser.id,
      name: document.getElementById("artistName").value.trim(),
      description: document.getElementById("artistDescription").value.trim(),
      icon_path: iconUrl,
      x_url: document.getElementById("artistXUrl").value.trim(),
      detail_slug: paid ? (artistDetailSlugInput.value.trim() || null) : null,
      is_public: true,
      deleted_at: null
    };

    let error;

    if (editingArtistId) {
      ({ error } = await supabase
        .from("artists")
        .update(payload)
        .eq("id", editingArtistId)
        .eq("owner_user_id", currentUser.id));
    } else {
      const existingArtist = await loadPrimaryArtist();
      if (existingArtist) {
        artistMessage.textContent = "このアカウントでは既に演者登録済みです。修正ボタンから更新してください。";
        return;
      }

      ({ error } = await supabase.from("artists").insert(payload));
    }

    if (error) throw error;

    artistMessage.textContent = editingArtistId ? "演者情報を更新しました。" : "演者を登録しました。";
    resetArtistForm();

    primaryArtist = await loadPrimaryArtist();
    applyArtistGate();

    await loadMyArtists();
  } catch (error) {
    console.error(error);
    artistMessage.textContent = "演者登録に失敗しました。";
  }
});

videoForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  videoMessage.textContent = "";

  try {
    if (!primaryArtist) {
      videoMessage.textContent = "先に演者登録を行ってください。";
      return;
    }

    if (!editingVideoId) {
      const limits = getPlanLimits(getSafePlan(currentProfile));
      const currentCount = await countUserVideos(currentUser.id);

      if (limits.maxVideos !== null && currentCount >= limits.maxVideos) {
        videoMessage.textContent = `このプランでは動画は ${limits.maxVideos} 件までです。`;
        return;
      }
    }

    const payload = {
      owner_user_id: currentUser.id,
      title: document.getElementById("videoTitle").value.trim(),
      artist_name: primaryArtist.name,
      type: document.getElementById("videoType").value.trim(),
      description: document.getElementById("videoDescription").value.trim(),
      url: document.getElementById("videoUrl").value.trim(),
      is_public: true,
      deleted_at: null
    };

    let error;

    if (editingVideoId) {
      ({ error } = await supabase
        .from("videos")
        .update(payload)
        .eq("id", editingVideoId)
        .eq("owner_user_id", currentUser.id));
    } else {
      ({ error } = await supabase.from("videos").insert(payload));
    }

    if (error) throw error;

    videoMessage.textContent = editingVideoId ? "動画を更新しました。" : "動画を投稿しました。";
    resetVideoForm();
    await loadMyVideos();
  } catch (error) {
    console.error(error);
    videoMessage.textContent = "動画投稿に失敗しました。";
  }
});

logoutBtn?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.href = "login.html";
});

async function init() {
  setupTimeSelectors();

  currentUser = await requireUser();
  if (!currentUser) return;

  currentProfile = await loadProfile(currentUser.id);
  primaryArtist = await loadPrimaryArtist();

  userEmail.textContent = `ログイン中: ${currentUser.email}`;
  await refreshPlanSummary();
  applyPlanRestrictions();
  applyArtistGate();

  await loadMyEvents();
  await loadMyArtists();
  await loadMyVideos();
}

init();
