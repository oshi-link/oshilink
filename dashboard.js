import { supabase } from "./supabase.js";
import { getPlanLimits } from "./plan-utils.js";

const userEmail = document.getElementById("userEmail");
const userPlan = document.getElementById("userPlan");
const registeredArtistName = document.getElementById("registeredArtistName");
const logoutBtn = document.getElementById("logoutBtn");

const artistRequiredNotice = document.getElementById("artistRequiredNotice");
const eventCard = document.getElementById("eventCard");

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

async function countPublishedEvents(userId) {
  const { count, error } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("owner_user_id", userId)
    .eq("status", "published");

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
    .eq("owner_user_id", userId);

  if (error) throw error;
  return count || 0;
}

async function loadPrimaryArtist() {
  const { data, error } = await supabase
    .from("artists")
    .select("*")
    .eq("owner_user_id", currentUser.id)
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
    registeredArtistName.textContent = `登録済み演者: ${primaryArtist.name}`;
  } else {
    artistRequiredNotice.style.display = "block";
    eventCard.style.display = "none";
    registeredArtistName.textContent = "登録済み演者: 未登録";
  }
}

function getEventStatusLabel(status) {
  if (status === "private") return "非公開";
  if (status === "ended") return "終了";
  return "公開中";
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

  myEvents.innerHTML = list.map(item => `
    <article class="card">
      <div class="card-image">
        ${item.image_path ? `<img src="${item.image_path}" alt="${item.title}" loading="lazy">` : ""}
        <span class="badge ${item.status === "private" ? "ended" : ""}">
          ${getEventStatusLabel(item.status)}
        </span>
      </div>
      <div class="card-body">
        <h3>${item.title}</h3>
        <div class="meta">
          <span>🎤 ${item.artist_name}</span>
          <span>📍 ${item.place}</span>
          <span>🗾 ${item.area}</span>
          <span>📅 ${item.event_date}</span>
          <span>🕒 ${item.time_text || ""}</span>
        </div>
        <div class="card-actions">
          ${
            item.status === "published"
              ? `<button class="ghost-btn event-private-btn" data-id="${item.id}">非公開にする</button>`
              : `<button class="primary-btn event-restore-btn" data-id="${item.id}">再公開する</button>`
          }
          <button class="ghost-btn event-delete-btn" data-id="${item.id}">削除</button>
        </div>
      </div>
    </article>
  `).join("");

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

      try {
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
      } catch (error) {
        console.error(error);
        alert("再公開に失敗しました");
      }
    });
  });

  document.querySelectorAll(".event-delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const ok = confirm("このイベントを完全に削除しますか？この操作は元に戻せません。");
      if (!ok) return;

      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id)
        .eq("owner_user_id", currentUser.id);

      if (error) {
        alert("削除に失敗しました");
        console.error(error);
        return;
      }

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

  myArtists.innerHTML = list.map(item => `
    <article class="card">
      <div class="card-image">
        ${item.icon_path ? `<img src="${item.icon_path}" alt="${item.name}" loading="lazy">` : ""}
        <span class="badge">ARTIST</span>
      </div>
      <div class="card-body">
        <h3>${item.name}</h3>
        <div class="meta">
          <span>📝 ${item.description || ""}</span>
          <span>🔗 ${item.x_url || ""}</span>
          <span>🆔 ${item.detail_slug || "-"}</span>
        </div>
      </div>
    </article>
  `).join("");
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

  myVideos.innerHTML = list.map(item => `
    <article class="card">
      <div class="card-body">
        <h3>${item.title}</h3>
        <div class="meta">
          <span>👤 ${item.artist_name}</span>
          <span>▶ ${item.description || ""}</span>
          <span>🏷 ${item.type || ""}</span>
        </div>
        <div class="card-actions">
          ${item.url ? `<a href="${item.url}" class="mini-btn" target="_blank" rel="noopener noreferrer">視聴する</a>` : ""}
          <button class="ghost-btn delete-video-btn" data-id="${item.id}">削除</button>
        </div>
      </div>
    </article>
  `).join("");

  document.querySelectorAll(".delete-video-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const ok = confirm("この動画を削除しますか？");
      if (!ok) return;

      const { error } = await supabase.from("videos").delete().eq("id", id);
      if (error) {
        alert("削除に失敗しました");
        console.error(error);
        return;
      }

      await loadMyVideos();
    });
  });
}

async function loadMyEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("owner_user_id", currentUser.id)
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

    const limits = getPlanLimits(getSafePlan(currentProfile));
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

    const plan = getSafePlan(currentProfile);
    const paid = isPaidPlan(plan);

    const imageFile = document.getElementById("eventImage").files[0];
    const imageUrl = await uploadImage("event-images", imageFile, currentUser.id);

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
      status: "published"
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

artistForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  artistMessage.textContent = "";

  try {
    const plan = getSafePlan(currentProfile);
    const paid = isPaidPlan(plan);

    const existingArtist = await loadPrimaryArtist();
    if (existingArtist) {
      artistMessage.textContent = "このアカウントでは既に演者登録済みです。";
      primaryArtist = existingArtist;
      applyArtistGate();
      return;
    }

    const iconFile = document.getElementById("artistIcon").files[0];
    const iconUrl = await uploadImage("artist-icons", iconFile, currentUser.id);

    const payload = {
      owner_user_id: currentUser.id,
      name: document.getElementById("artistName").value.trim(),
      description: document.getElementById("artistDescription").value.trim(),
      icon_path: iconUrl,
      x_url: document.getElementById("artistXUrl").value.trim(),
      detail_slug: paid ? (artistDetailSlugInput.value.trim() || null) : null,
      is_public: true
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

videoForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  videoMessage.textContent = "";

  try {
    const limits = getPlanLimits(getSafePlan(currentProfile));
    const currentCount = await countUserVideos(currentUser.id);

    if (limits.maxVideos !== null && currentCount >= limits.maxVideos) {
      videoMessage.textContent = `このプランでは動画は ${limits.maxVideos} 件までです。`;
      return;
    }

    const payload = {
      owner_user_id: currentUser.id,
      title: document.getElementById("videoTitle").value,
      artist_name: document.getElementById("videoArtist").value,
      type: document.getElementById("videoType").value,
      description: document.getElementById("videoDescription").value,
      url: document.getElementById("videoUrl").value,
      is_public: true
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
