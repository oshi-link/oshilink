import { supabase } from "./supabase.js";

function renderPaymentWarning(sub) {
  const existing = document.getElementById("paymentWarning");
  if (existing) existing.remove();

  if (!sub) return;

  if (sub.status === "past_due") {
    const div = document.createElement("div");
    div.id = "paymentWarning";

    div.style.marginBottom = "16px";
    div.style.padding = "14px 16px";
    div.style.borderRadius = "12px";
    div.style.background = "rgba(255, 80, 80, 0.12)";
    div.style.border = "1px solid rgba(255, 80, 80, 0.3)";
    div.style.color = "#ffb3b3";
    div.style.fontSize = "0.95rem";
    div.style.lineHeight = "1.6";

    div.innerHTML = `
      ⚠ お支払いに失敗しています。<br>
      支払い方法をご確認ください。
    `;

    const container = document.querySelector(".container");
    container.prepend(div);
  }
}

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
const artistExternalUrlInput = document.getElementById("artistExternalUrl");

const deleteAccountBtn = document.getElementById("deleteAccountBtn");

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

function renderPaymentWarning(sub) {
  const existing = document.getElementById("paymentWarning");
  if (existing) existing.remove();

  if (!sub) return;

  if (sub.status === "past_due") {
    const div = document.createElement("div");
    div.id = "paymentWarning";

    div.style.marginBottom = "16px";
    div.style.padding = "14px 16px";
    div.style.borderRadius = "12px";
    div.style.background = "rgba(255, 80, 80, 0.12)";
    div.style.border = "1px solid rgba(255, 80, 80, 0.3)";
    div.style.color = "#ffb3b3";
    div.style.fontSize = "0.95rem";
    div.style.lineHeight = "1.6";

    div.innerHTML = `
      ⚠ お支払いに失敗しています。<br>
      支払い方法をご確認ください。
    `;

    const container = document.querySelector(".container");
    container.prepend(div);
  }
}

function formatDateJP(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
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
  const openHour = document.getElementById("openHour");
  const startHour = document.getElementById("startHour");
  const openMinute = document.getElementById("openMinute");
  const startMinute = document.getElementById("startMinute");

  if (!openHour || !startHour || !openMinute || !startMinute) return;

  setSelectOptions(openHour, 0, 23);
  setSelectOptions(startHour, 0, 23);

  const minuteOptions = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"]
    .map(min => `<option value="${min}">${min}分</option>`)
    .join("");

  openMinute.innerHTML = minuteOptions;
  startMinute.innerHTML = minuteOptions;

  openHour.value = "18";
  openMinute.value = "00";
  startHour.value = "18";
  startMinute.value = "30";
}

function buildTimeText() {
  const openHour = document.getElementById("openHour")?.value || "18";
  const openMinute = document.getElementById("openMinute")?.value || "00";
  const startHour = document.getElementById("startHour")?.value || "18";
  const startMinute = document.getElementById("startMinute")?.value || "30";

  return `${openHour}:${openMinute} OPEN / ${startHour}:${startMinute} START`;
}

function parseTimeText(timeText = "") {
  const match = timeText.match(/(\d{1,2}):(\d{2})\s*OPEN\s*\/\s*(\d{1,2}):(\d{2})\s*START/i);

  if (!match) {
    return {
      openHour: "18",
      openMinute: "00",
      startHour: "18",
      startMinute: "30"
    };
  }

  return {
    openHour: String(match[1]).padStart(2, "0"),
    openMinute: String(match[2]).padStart(2, "0"),
    startHour: String(match[3]).padStart(2, "0"),
    startMinute: String(match[4]).padStart(2, "0")
  };
}

function getHourOptions(selectedValue = "18") {
  return Array.from({ length: 24 }, (_, i) => {
    const value = String(i).padStart(2, "0");
    return `<option value="${value}" ${value === selectedValue ? "selected" : ""}>${value}時</option>`;
  }).join("");
}

function getMinuteOptions(selectedValue = "00") {
  return ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"]
    .map(value => `<option value="${value}" ${value === selectedValue ? "selected" : ""}>${value}分</option>`)
    .join("");
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

async function loadLatestSubscription(userId) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("target_plan, target_plan_effective_at, current_period_end, status, updated_at")
    .eq("user_id", userId)
    .eq("provider", "stripe")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("サブスクリプション取得失敗:", error);
    return null;
  }

  return data?.[0] || null;
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

  if (detailUrlInput) {
    detailUrlInput.disabled = !paid;
    if (!paid) {
      detailUrlInput.value = "";
      detailUrlInput.placeholder = "詳細URL（有料プランのみ）";
    }
  }

  if (ticketUrlInput) {
    ticketUrlInput.disabled = !paid;
    if (!paid) {
      ticketUrlInput.value = "";
      ticketUrlInput.placeholder = "チケットURL（有料プランのみ）";
    }
  }

  if (artistDetailSlugInput) {
    artistDetailSlugInput.disabled = !paid;
    if (!paid) {
      artistDetailSlugInput.value = "";
      artistDetailSlugInput.placeholder = "プロフィールURL用slug（有料プランのみ）";
    }
  }
}

function applyArtistGate() {
  if (primaryArtist) {
    if (artistRequiredNotice) artistRequiredNotice.style.display = "none";
    if (eventCard) eventCard.style.display = "block";
    if (videoCard) videoCard.style.display = "block";
    if (registeredArtistName) {
      registeredArtistName.textContent = `登録済み演者: ${primaryArtist.name}`;
    }
  } else {
    if (artistRequiredNotice) artistRequiredNotice.style.display = "block";
    if (eventCard) eventCard.style.display = "none";
    if (videoCard) videoCard.style.display = "none";
    if (registeredArtistName) {
      registeredArtistName.textContent = "登録済み演者: 未登録";
    }
  }
}

function getEventStatusLabel(status) {
  if (status === "private") return "非公開";
  if (status === "ended") return "終了";
  return "公開中";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
    const isEditing = String(editingEventId) === String(item.id);
    const parsedTime = parseTimeText(item.time_text || "");

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

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div style="display: grid; gap: 8px;">
                  <label>OPEN</label>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <select id="editEventOpenHour_${item.id}">
                      ${getHourOptions(parsedTime.openHour)}
                    </select>
                    <select id="editEventOpenMinute_${item.id}">
                      ${getMinuteOptions(parsedTime.openMinute)}
                    </select>
                  </div>
                </div>

                <div style="display: grid; gap: 8px;">
                  <label>START</label>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <select id="editEventStartHour_${item.id}">
                      ${getHourOptions(parsedTime.startHour)}
                    </select>
                    <select id="editEventStartMinute_${item.id}">
                      ${getMinuteOptions(parsedTime.startMinute)}
                    </select>
                  </div>
                </div>
              </div>

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
    btn.addEventListener("click", async () => {
      editingEventId = btn.dataset.id;
      await loadMyEvents();
    });
  });

  document.querySelectorAll(".cancel-event-edit-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      editingEventId = null;
      await loadMyEvents();
    });
  });

  document.querySelectorAll(".save-event-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const currentItem = list.find(v => String(v.id) === String(id));

      const openHour = document.getElementById(`editEventOpenHour_${id}`).value;
      const openMinute = document.getElementById(`editEventOpenMinute_${id}`).value;
      const startHour = document.getElementById(`editEventStartHour_${id}`).value;
      const startMinute = document.getElementById(`editEventStartMinute_${id}`).value;

      const payload = {
        title: document.getElementById(`editEventTitle_${id}`).value.trim(),
        area: document.getElementById(`editEventArea_${id}`).value,
        place: document.getElementById(`editEventPlace_${id}`).value.trim(),
        event_date: document.getElementById(`editEventDate_${id}`).value,
        time_text: `${openHour}:${openMinute} OPEN / ${startHour}:${startMinute} START`,
        price: document.getElementById(`editEventPrice_${id}`).value.trim(),
        detail_url: paid
          ? document.getElementById(`editEventDetailUrl_${id}`).value.trim()
          : (currentItem?.detail_url || ""),
        ticket_url: paid
          ? document.getElementById(`editEventTicketUrl_${id}`).value.trim()
          : (currentItem?.ticket_url || "")
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
    const isEditing = String(editingArtistId) === String(item.id);

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
    btn.addEventListener("click", async () => {
      editingArtistId = btn.dataset.id;
      await loadMyArtists();
    });
  });

  document.querySelectorAll(".cancel-artist-edit-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      editingArtistId = null;
      await loadMyArtists();
    });
  });

  document.querySelectorAll(".save-artist-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const currentItem = list.find(v => String(v.id) === String(id));

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
    const isEditing = String(editingVideoId) === String(item.id);

    if (isEditing) {
      return `
        <article class="card">
          <div class="card-body">
            <h3>動画修正</h3>
            <div style="display: grid; gap: 12px;">
              <input type="text" id="editVideoTitle_${item.id}" value="${escapeHtml(item.title || "")}" placeholder="動画タイトル" />
              <input type="text" id="editVideoType_${item.id}" value="${escapeHtml(item.type || "")}" placeholder="種別" />
              <input type="text" id="editVideoDescription_${item.id}" value="${escapeHtml(item.description || "")}" placeholder="説明" />
              <input type="text" id="editVideoUrl_${item.id}" value="${escapeHtml(item.url || "")}" placeholder="動画URL" />

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
          <h3>${escapeHtml(item.title)}</h3>
          <div class="meta">
            <span>👤 ${escapeHtml(item.artist_name || "")}</span>
            <span>▶ ${escapeHtml(item.description || "")}</span>
            <span>🏷 ${escapeHtml(item.type || "")}</span>
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
    btn.addEventListener("click", async () => {
      editingVideoId = btn.dataset.id;
      await loadMyVideos();
    });
  });

  document.querySelectorAll(".cancel-video-edit-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      editingVideoId = null;
      await loadMyVideos();
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
    myEvents.innerHTML = `<div class="events-empty"><p>イベントの読み込みに失敗しました。</p></div>`;
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
    myArtists.innerHTML = `<div class="events-empty"><p>演者の読み込みに失敗しました。</p></div>`;
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
    myVideos.innerHTML = `<div class="events-empty"><p>動画の読み込みに失敗しました。</p></div>`;
    return;
  }

  renderVideos(data || []);
}

async function refreshPlanSummary() {
  if (!currentUser) return;
  
  const plan = getSafePlan(currentProfile);
  const limits = getPlanLimits(plan);
  const publishedCount = await countPublishedEvents(currentUser.id);
  const monthlyCreateCount = await countMonthlyEventCreates(currentUser.id);
  const latestSubscription = await loadLatestSubscription(currentUser.id);
  renderPaymentWarning(latestSubscription);

  const publishedText =
    limits.maxEvents === null ? `${publishedCount}件` : `${publishedCount}/${limits.maxEvents}件`;

  const monthlyText =
    limits.maxMonthlyEventCreates === null
      ? `${monthlyCreateCount}件`
      : `${monthlyCreateCount}/${limits.maxMonthlyEventCreates}件`;

  const planLabel = plan.toUpperCase();

  let planSummaryHtml = `現在のプラン: ${planLabel}`;

  if (latestSubscription?.target_plan && latestSubscription?.target_plan_effective_at) {
    const currentValidUntil = formatDateJP(latestSubscription.target_plan_effective_at);
    const nextPlanLabel = String(latestSubscription.target_plan).toUpperCase();

    planSummaryHtml = `
      現在のプラン: ${planLabel}（${currentValidUntil}まで有効）<br>
      次回プラン: ${nextPlanLabel}（${currentValidUntil}から切り替わり）
    `;
  }

  userPlan.innerHTML = `
    ${planSummaryHtml}<br>
    公開中イベント: ${publishedText} ｜ 今月の新規作成: ${monthlyText}
  `;
}

artistForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  artistMessage.textContent = "";

  try {
    const plan = getSafePlan(currentProfile);
    const paid = isPaidPlan(plan);

    let iconUrl = "";

    const iconFile = document.getElementById("artistIcon")?.files?.[0];
    if (iconFile) {
      iconUrl = await uploadImage("artist-icons", iconFile, currentUser.id);
    }

    const existingArtist = await loadPrimaryArtist();
    if (existingArtist) {
      artistMessage.textContent = "このアカウントでは既に演者登録済みです。カード内の修正ボタンから更新してください。";
      return;
    }

    const payload = {
      owner_user_id: currentUser.id,
      name: document.getElementById("artistName").value.trim(),
      description: document.getElementById("artistDescription").value.trim(),
      icon_path: iconUrl,
      x_url: document.getElementById("artistXUrl").value.trim(),
      external_url: artistExternalUrlInput?.value.trim() || "",
      detail_slug: paid ? (artistDetailSlugInput?.value.trim() || null) : null,
      is_public: true,
      deleted_at: null
    };

    const { error } = await supabase.from("artists").insert(payload);
    if (error) throw error;

    artistMessage.textContent = "演者を登録しました。";
    artistForm.reset();
    applyPlanRestrictions();

    primaryArtist = await loadPrimaryArtist();
    applyArtistGate();
    await loadMyArtists();
  } catch (error) {
    console.error(error);
    artistMessage.textContent = "演者登録に失敗しました。";
  }
});

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

    const imageFile = document.getElementById("eventImage")?.files?.[0];
    const imageUrl = imageFile
      ? await uploadImage("event-images", imageFile, currentUser.id)
      : "";

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

    const { error } = await supabase.from("events").insert(payload);
    if (error) throw error;

    eventMessage.textContent = "イベントを投稿しました。";
    eventForm.reset();
    setupTimeSelectors();
    applyPlanRestrictions();

    await loadMyEvents();
    await refreshPlanSummary();
  } catch (error) {
    console.error(error);
    eventMessage.textContent = "イベント投稿に失敗しました。";
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

    const limits = getPlanLimits(getSafePlan(currentProfile));
    const currentCount = await countUserVideos(currentUser.id);

    if (limits.maxVideos !== null && currentCount >= limits.maxVideos) {
      videoMessage.textContent = `このプランでは動画は ${limits.maxVideos} 件までです。`;
      return;
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

    const { error } = await supabase.from("videos").insert(payload);
    if (error) throw error;

    videoMessage.textContent = "動画を投稿しました。";
    videoForm.reset();
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

deleteAccountBtn?.addEventListener("click", async () => {
  const confirmed = confirm(
    "本当にアカウントを削除しますか？\n\n削除すると、演者・イベント・動画などの投稿情報もすべて削除され、元に戻せません。"
  );
  if (!confirmed) return;

  try {
    deleteAccountBtn.disabled = true;
    deleteAccountBtn.textContent = "削除中...";

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      throw new Error("ログイン情報が確認できませんでした。");
    }

    const response = await fetch(
      "https://zoprqzivoqpfylujdaun.supabase.co/functions/v1/delete-account",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result?.error || "アカウント削除に失敗しました。");
    }

    await supabase.auth.signOut();
    alert("アカウントを削除しました。");
    location.replace("index.html");
  } catch (error) {
    console.error("アカウント削除失敗:", error);
    alert(error.message || "アカウント削除に失敗しました。");
    deleteAccountBtn.disabled = false;
    deleteAccountBtn.textContent = "アカウントを削除する";
  }
});

async function init() {
  setupTimeSelectors();

  currentUser = await requireUser();
  if (!currentUser) return;

  currentProfile = await loadProfile(currentUser.id);
  primaryArtist = await loadPrimaryArtist();

  if (userEmail) {
    userEmail.textContent = `ログイン中: ${currentUser.email}`;
  }

  await refreshPlanSummary();
  applyPlanRestrictions();
  applyArtistGate();

  await loadMyEvents();
  await loadMyArtists();
  await loadMyVideos();
}

init();
