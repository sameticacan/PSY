const APP_VERSION = window.APP_VERSION || "1.4.0";
const BRAND_NAME = "Zihin Atölyesi Psikolog";
const SUPPORT_EMAIL = "destek@zihinatolyesi.com";
const SUPPORT_HOURS = "Hafta içi 09.00-22.00 • Hafta sonu 10.00-20.00";
const WHATSAPP_NUMBER = "905426726750";
const PROD_HOSTS = ["asdasfasamas.vercel.app"];
const IS_LOCAL = ["localhost", "127.0.0.1", "0.0.0.0"].some(h => location.hostname.includes(h));
const DEV_MODE = IS_LOCAL && !PROD_HOSTS.includes(location.hostname);
const SUPABASE_URL = "https://kengcnwwxdsnuylfnhre.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtlbmdjbnd3eGRzbnV5bGZuaHJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MTYwNjQsImV4cCI6MjA4MTQ5MjA2NH0.UF5r4458DtzJIEFYAe9ZcukDKg2-NoJMBHVwJTX8B1A";

const ROLE_LABELS = {
  client: "Danışan",
  psychologist: "Psikolog",
  admin: "Admin",
};

const HEADER_SELECTORS = [
  "header.site-header",
  "#site-header",
  ".site-header",
  "#header",
  "header",
  ".header",
  "#main-header",
  "body > header",
  "body > nav"
];
let headerObserver = null;
let lastHeaderHeight = -1;
const HEADER_FALLBACK = 64;
let headerRecalcQueued = false;
const IS_PANEL_PAGE = document.body?.classList.contains("panel-page");

const $app = document.getElementById("app");
const $modal = document.getElementById("modal");
const $backdrop = document.getElementById("modalBackdrop");
const $modalTitle = document.getElementById("modalTitle");
const $modalBody = document.getElementById("modalBody");
const $modalFoot = document.getElementById("modalFoot");
const $toasts = document.getElementById("toasts");

const supabaseConfigOk = Boolean(SUPABASE_URL) && Boolean(SUPABASE_ANON_KEY);
if (!window.supabase) {
  alert("Supabase kütüphanesi yüklenemedi (CDN engeli/ağ). Adblock varsa kapatıp yenile.");
}
if (!supabaseConfigOk) {
  alert("Supabase yapılandırması eksik (URL veya ANON KEY boş). Lütfen ortam değişkenlerini kontrol et.");
}

const sb = (window.supabase && supabaseConfigOk)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const state = {
  roleChoice: localStorage.getItem("roleChoice") || "",
  session: null,
  user: null,
  profile: null,
  clientProfile: null,
  psychologistProfile: null,
  cache: {
    psychologists: null,
  },
};

function qs(sel, scope = document) {
  return scope.querySelector(sel);
}
function qsa(sel, scope = document) {
  return Array.from(scope.querySelectorAll(sel));
}
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[m]));
}
function logSupabase(action, { data, error, status } = {}) {
  if (DEV_MODE) {
    console.log(`[SB] ${action}`, { status, data, error });
  } else if (error) {
    console.warn(`[SB] ${action} hata`, { status, message: error.message, code: error.code });
  }
}

function toast(type, message) {
  if (!$toasts) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  $toasts.appendChild(el);
  setTimeout(() => {
    el.classList.add("hide");
    setTimeout(() => el.remove(), 350);
  }, 3200);
}

function openModal(title, bodyHTML, footHTML = "") {
  $modalTitle.textContent = title;
  $modalBody.innerHTML = bodyHTML;
  $modalFoot.innerHTML = footHTML;
  $modal.classList.remove("hidden");
  $backdrop.classList.remove("hidden");
}

function closeModal() {
  $modal.classList.add("hidden");
  $backdrop.classList.add("hidden");
}

$backdrop.addEventListener("click", closeModal);
qs("#modalClose")?.addEventListener("click", closeModal);

function setRoleChoice(role) {
  state.roleChoice = role;
  localStorage.setItem("roleChoice", role);
  setBodyRoleClass();
}

function setBodyRoleClass() {
  document.body.classList.remove("role-client", "role-psychologist", "role-admin");
  const role = state.roleChoice || state.profile?.role;
  if (role === "client") document.body.classList.add("role-client");
  if (role === "psychologist") document.body.classList.add("role-psychologist");
  if (role === "admin") document.body.classList.add("role-admin");
}

function activeHash() {
  return location.hash.replace("#", "") || "";
}

function findHostHeader() {
  const header = HEADER_SELECTORS
    .map(sel => document.querySelector(sel))
    .find(el => el && !el.closest("#app"));
  return header || null;
}

function computeHeaderHeight(el) {
  if (!el) return 0;
  const rect = el.getBoundingClientRect();
  const styles = window.getComputedStyle(el);
  const marginTop = parseFloat(styles.marginTop) || 0;
  const marginBottom = parseFloat(styles.marginBottom) || 0;
  return Math.max(0, Math.ceil(rect.height + marginTop + marginBottom));
}

function applyHeaderOffset() {
  headerRecalcQueued = false;
  if (IS_PANEL_PAGE) {
    if (headerObserver) headerObserver.disconnect();
    lastHeaderHeight = 0;
    document.documentElement.style.setProperty("--header-h", "0px");
    return;
  }
  const header = findHostHeader();
  let height = computeHeaderHeight(header);
  if (!height) {
    height = lastHeaderHeight > 0 ? lastHeaderHeight : HEADER_FALLBACK;
  }
  if (height === lastHeaderHeight) return;
  lastHeaderHeight = height;
  document.documentElement.style.setProperty("--header-h", `${height}px`);

  if (headerObserver) headerObserver.disconnect();
  if (window.ResizeObserver && header) {
    headerObserver = new ResizeObserver(() => {
      const next = computeHeaderHeight(header);
      if (next !== lastHeaderHeight) {
        lastHeaderHeight = next;
        document.documentElement.style.setProperty("--header-h", `${next}px`);
      }
    });
    headerObserver.observe(header);
  }
}

function initPanelOffsets() {
  const scheduleHeaderOffset = () => {
    if (headerRecalcQueued) return;
    headerRecalcQueued = true;
    requestAnimationFrame(applyHeaderOffset);
  };

  scheduleHeaderOffset();
  window.addEventListener("resize", scheduleHeaderOffset, { passive: true });
  window.addEventListener("orientationchange", scheduleHeaderOffset);
  window.addEventListener("load", scheduleHeaderOffset);
  if (!IS_PANEL_PAGE) {
    const bodyObserver = new MutationObserver(scheduleHeaderOffset);
    bodyObserver.observe(document.body, { childList: true, subtree: true });
    setTimeout(scheduleHeaderOffset, 50);
    setTimeout(scheduleHeaderOffset, 300);
  }
}

function ensureContactWidget() {
  const widget = qs("#contactWidget");
  if (!widget) return;
  const panel = qs("#contactPanel", widget);
  const toggle = qs("#contactToggle", widget);
  const closeBtn = qs("#contactClose", widget);
  const meta = qs("#widgetMeta", widget);

  const open = () => panel?.classList.toggle("hidden");
  const hide = () => panel?.classList.add("hidden");

  toggle?.addEventListener("click", open);
  closeBtn?.addEventListener("click", hide);

  meta.textContent = `${BRAND_NAME} • ${SUPPORT_EMAIL}`;

  function openWhatsApp(preset) {
    const base = `https://wa.me/${WHATSAPP_NUMBER}`;
    const full = `${preset}\n\n(Zihin Atölyesi üzerinden gönderildi)`;
    const url = `${base}?text=${encodeURIComponent(full)}`;
    window.open(url, "_blank");
    panel?.classList.add("hidden");
  }

  qsa("[data-whatsapp]", widget).forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-whatsapp");
      const msg = type === "psychologist"
        ? "Merhaba, psikolog desteği ve uzmanlar hakkında bilgi almak istiyorum."
        : "Merhaba, genel işleyiş hakkında sorum var.";
      openWhatsApp(msg);
    });
  });

  qsa(".template", widget).forEach(btn => {
    btn.addEventListener("click", () => openWhatsApp(btn.textContent.trim()));
  });
}

initPanelOffsets();
ensureContactWidget();
init();

async function init() {
  if (!sb) {
    $app.innerHTML = `<div class="container"><div class="card"><h2>Supabase bağlantısı yok</h2><p>CDN veya anahtar eksik. İnternetini ve anahtarları kontrol et.</p></div></div>`;
    return;
  }

  const { data, error } = await sb.auth.getSession();
  logSupabase("auth.getSession", { data, error });
  state.session = data?.session || null;
  state.user = state.session?.user || null;

  sb.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    state.user = session?.user || null;
    state.profile = null;
    state.clientProfile = null;
    state.psychologistProfile = null;
    await route();
  });

  window.addEventListener("hashchange", route);
  await route();
}

async function route() {
  if (!state.session) {
    renderAuth();
    return;
  }

  await hydrateProfile();
  if (!state.profile) {
    renderCompleteProfile();
    return;
  }

  if (!state.roleChoice) {
    setRoleChoice(state.profile.role);
  }

  if (state.roleChoice !== state.profile.role) {
    renderRoleMismatch();
    return;
  }

  setBodyRoleClass();

  if (state.profile.role === "admin") {
    return renderAdminApp();
  }

  if (state.profile.role === "client") {
    return renderClientApp();
  }

  if (state.profile.role === "psychologist") {
    return renderPsychologistApp();
  }
}

async function hydrateProfile() {
  if (!state.user) return;
  const { data, error } = await sb
    .from("profiles")
    .select("id, role, display_name, email, created_at")
    .eq("id", state.user.id)
    .maybeSingle();
  logSupabase("profiles.select", { data, error });
  state.profile = data || null;
}

function renderAuth() {
  setBodyRoleClass();
  $app.innerHTML = `
    <div class="container" style="min-height:100vh; padding-top: 80px; padding-bottom: 40px;">
      <div class="card" style="text-align:center; padding:40px;">
        <div class="brand" style="justify-content:center; font-size:32px; margin-bottom:10px;">
          <span class="dot"></span>Zihin Atölyesi
        </div>
        <p style="color:var(--muted); margin-bottom:26px;">Lütfen giriş yapmak istediğiniz paneli seçiniz.</p>
        <div class="grid3 role-select">
          <div class="role-card" data-role="client">
            <div style="font-size:40px; margin-bottom:10px;">🧑‍💬</div>
            <div class="t">Danışan</div>
            <div class="d">Psikolog eşleştirmeleri, seans takibi ve yorumlar.</div>
            <button class="btn" style="width:100%; margin-top:15px;">Giriş Yap</button>
          </div>
          <div class="role-card" data-role="psychologist">
            <div style="font-size:40px; margin-bottom:10px;">🧠</div>
            <div class="t">Psikolog</div>
            <div class="d">Profil yönetimi, talepler ve danışan yorumları.</div>
            <button class="btn" style="width:100%; margin-top:15px; border-color:#8b5cf6; color:#8b5cf6;">Psikolog Girişi</button>
          </div>
          <div class="role-card" data-role="admin">
            <div style="font-size:40px; margin-bottom:10px;">🛡️</div>
            <div class="t">Admin</div>
            <div class="d">Doğrulamalar, yorum yönetimi ve kullanıcı listesi.</div>
            <button class="btn" style="width:100%; margin-top:15px; border-color:var(--good); color:var(--good);">Admin Girişi</button>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:20px; padding:32px;">
        <h3 style="margin-bottom:10px;">Giriş Yap</h3>
        <div class="grid2">
          <input class="input" id="loginEmail" placeholder="ornek@mail.com" type="email" />
          <input class="input" id="loginPass" placeholder="••••••••" type="password" />
        </div>
        <div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
          <button class="btn" id="loginBtn">Giriş Yap</button>
          <button class="btn secondary" id="signupBtn">Yeni Hesap Oluştur</button>
          <button class="btn secondary" id="resetBtn">Şifremi Unuttum</button>
        </div>
        <p class="muted" style="margin-top:12px;">Rol seçimi yapılmadan kayıt oluşturulamaz.</p>
      </div>

      <div class="footer-note" style="margin-top:20px;">${BRAND_NAME} v${APP_VERSION} • Güvenli Giriş Sistemi</div>
    </div>
  `;

  qsa(".role-card").forEach(card => {
    card.addEventListener("click", () => {
      setRoleChoice(card.dataset.role);
      toast("info", `${ROLE_LABELS[state.roleChoice]} paneli seçildi.`);
    });
  });

  qs("#loginBtn")?.addEventListener("click", doLogin);
  qs("#signupBtn")?.addEventListener("click", doSignUp);
  qs("#resetBtn")?.addEventListener("click", doResetPassword);
}

async function doLogin() {
  const email = qs("#loginEmail")?.value.trim();
  const password = qs("#loginPass")?.value;
  if (!email || !password) return toast("error", "Email ve şifre zorunlu.");

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  logSupabase("auth.signInWithPassword", { data, error });
  if (error) return toast("error", error.message);
  toast("success", "Giriş başarılı.");
}

async function doSignUp() {
  if (!state.roleChoice) {
    toast("error", "Önce rol seçimi yapmalısın.");
    return;
  }
  const email = qs("#loginEmail")?.value.trim();
  const password = qs("#loginPass")?.value;
  if (!email || !password) return toast("error", "Email ve şifre zorunlu.");

  const { data, error } = await sb.auth.signUp({ email, password });
  logSupabase("auth.signUp", { data, error });
  if (error) return toast("error", error.message);

  toast("success", "Kayıt tamamlandı. Email doğrulaması gerekebilir.");
}

async function doResetPassword() {
  const email = qs("#loginEmail")?.value.trim();
  if (!email) return toast("error", "Email adresini yaz.");
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
  logSupabase("auth.resetPasswordForEmail", { error });
  if (error) return toast("error", error.message);
  toast("success", "Şifre sıfırlama maili gönderildi.");
}

async function renderCompleteProfile() {
  $app.innerHTML = `
    <div class="container" style="min-height:100vh; padding-top: 80px; padding-bottom: 40px;">
      <div class="card" style="padding:32px; text-align:center;">
        <h2>Profilini Oluştur</h2>
        <p class="muted" style="margin-bottom:16px;">Rol ve görünen adını belirle. Sonra panelin hazır.</p>
        <div class="grid2" style="margin:20px 0;">
          <select class="input" id="profileRole">
            <option value="">Rol seç</option>
            <option value="client">Danışan</option>
            <option value="psychologist">Psikolog</option>
          </select>
          <input class="input" id="profileName" placeholder="Görünen ad" />
        </div>
        <button class="btn" id="saveProfileBtn">Profili Kaydet</button>
      </div>
    </div>
  `;

  qs("#saveProfileBtn")?.addEventListener("click", async () => {
    const role = qs("#profileRole")?.value;
    const displayName = qs("#profileName")?.value.trim();
    if (!role || !displayName) return toast("error", "Rol ve görünen ad zorunlu.");

    const payload = {
      id: state.user.id,
      role,
      display_name: displayName,
      email: state.user.email,
    };

    const { data, error } = await sb.from("profiles").upsert([payload]).select("*").single();
    logSupabase("profiles.upsert", { data, error });
    if (error) return toast("error", error.message);

    state.profile = data;
    setRoleChoice(role);
    await route();
  });
}

function renderRoleMismatch() {
  $app.innerHTML = `
    <div class="container" style="min-height:100vh; padding-top: 80px; padding-bottom: 40px;">
      <div class="card" style="padding:32px; text-align:center;">
        <h2>Rol Uyumsuzluğu</h2>
        <p class="muted">Bu hesabın rolü <b>${esc(ROLE_LABELS[state.profile.role])}</b>.</p>
        <p class="muted" style="margin-bottom:20px;">Devam etmek için rol seçimini güncelle.</p>
        <button class="btn" id="fixRoleBtn">${esc(ROLE_LABELS[state.profile.role])} Paneline Geç</button>
        <button class="btn secondary" id="logoutBtn" style="margin-left:10px;">Çıkış Yap</button>
      </div>
    </div>
  `;

  qs("#fixRoleBtn")?.addEventListener("click", () => {
    setRoleChoice(state.profile.role);
    route();
  });
  qs("#logoutBtn")?.addEventListener("click", safeSignOut);
}

async function safeSignOut() {
  const { error } = await sb.auth.signOut({ scope: "global" });
  logSupabase("auth.signOut", { error });
  if (error) toast("error", error.message);
}

function shell({ navItems = [], contentHTML = "" }) {
  const navHTML = navItems.map(it => {
    const active = activeHash() === it.hash ? "active" : "";
    return `<a class="${active}" href="#${esc(it.hash)}">${esc(it.label)}</a>`;
  }).join("");

  $app.innerHTML = `
    <div class="container">
      <div class="topbar">
        <div class="brand">
          <span class="dot"></span>
          <span>${BRAND_NAME}</span>
          <span class="badge ${state.profile.role === "admin" ? "green" : "blue"}">${esc(ROLE_LABELS[state.profile.role])}</span>
        </div>
        <button class="nav-toggle" id="navToggle" aria-label="Menü" aria-expanded="false">☰</button>
        <div class="nav" id="topNav">
          ${navHTML}
          <button class="btn secondary" id="logoutBtn">Çıkış</button>
        </div>
      </div>
      <div class="main">${contentHTML}</div>
      <div class="footer-note">
        <div>${BRAND_NAME} • v${APP_VERSION} • ${SUPPORT_EMAIL} • ${SUPPORT_HOURS}</div>
        <div>Rol seçimi çıkış yapılmadan değişmez.</div>
      </div>
    </div>
  `;

  qs("#logoutBtn")?.addEventListener("click", safeSignOut);

  const navToggle = qs("#navToggle");
  const topNav = qs("#topNav");
  if (navToggle && topNav) {
    navToggle.onclick = () => {
      const open = $app.classList.toggle("nav-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    };
    topNav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        $app.classList.remove("nav-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }
}

async function renderClientApp() {
  const hash = activeHash() || "client-profile";
  const navItems = [
    { hash: "client-profile", label: "Profil" },
    { hash: "market", label: "Psikolog Market" },
    { hash: "client-requests", label: "Talepler" },
    { hash: "client-reviews", label: "Yorumlar" },
  ];

  if (hash === "market") return renderClientMarket(navItems);
  if (hash === "client-requests") return renderClientRequests(navItems);
  if (hash === "client-reviews") return renderClientReviews(navItems);
  return renderClientProfile(navItems);
}

async function renderClientProfile(navItems) {
  await ensureClientProfile();
  const profile = state.clientProfile || {};

  shell({
    navItems,
    contentHTML: `
      <div class="card">
        <h3>Danışan Profili</h3>
        <p class="muted">Hedeflerini ve tercihlerini paylaşarak en uygun psikologlarla eşleş.</p>
        <div class="grid2" style="margin-top:14px;">
          <input class="input" id="cpGoal" placeholder="Hedef / konu" value="${esc(profile.goal || "")}" />
          <select class="input" id="cpMode">
            <option value="">Tercih</option>
            <option value="online" ${profile.mode === "online" ? "selected" : ""}>Online</option>
            <option value="yuz_yuze" ${profile.mode === "yuz_yuze" ? "selected" : ""}>Yüz yüze</option>
            <option value="hibrit" ${profile.mode === "hibrit" ? "selected" : ""}>Hibrit</option>
          </select>
          <input class="input" id="cpCity" placeholder="Şehir" value="${esc(profile.city || "")}" />
          <input class="input" id="cpBudget" placeholder="Bütçe aralığı (örn. 1500-2500)" value="${esc(profile.budget_range || "")}" />
        </div>
        <button class="btn" id="saveClientProfile" style="margin-top:16px;">Kaydet</button>
      </div>
    `
  });

  qs("#saveClientProfile")?.addEventListener("click", async () => {
    const payload = {
      profile_id: state.profile.id,
      goal: qs("#cpGoal")?.value.trim(),
      mode: qs("#cpMode")?.value,
      city: qs("#cpCity")?.value.trim(),
      budget_range: qs("#cpBudget")?.value.trim(),
    };
    const { data, error } = await sb.from("client_profiles").upsert([payload]).select("*").single();
    logSupabase("client_profiles.upsert", { data, error });
    if (error) return toast("error", error.message);
    state.clientProfile = data;
    toast("success", "Profil güncellendi.");
  });
}

async function ensureClientProfile() {
  if (state.clientProfile) return;
  const { data, error } = await sb
    .from("client_profiles")
    .select("*")
    .eq("profile_id", state.profile.id)
    .maybeSingle();
  logSupabase("client_profiles.select", { data, error });
  state.clientProfile = data || null;
}

async function renderClientMarket(navItems) {
  const psychologists = await fetchPsychologists();
  const ratings = await fetchRatingsMap(psychologists.map(p => p.profile_id));

  shell({
    navItems,
    contentHTML: `
      <div class="card">
        <h3>Psikolog Market</h3>
        <p class="muted">Doğrulanmış psikologları incele, detayları gör ve talep oluştur.</p>
        <div class="grid2" style="margin-top:14px;">
          <input class="input" id="filterCity" placeholder="Şehir" />
          <select class="input" id="filterMode">
            <option value="">Tüm formatlar</option>
            <option value="online">Online</option>
            <option value="yuz_yuze">Yüz yüze</option>
            <option value="hibrit">Hibrit</option>
          </select>
          <input class="input" id="filterSpec" placeholder="Uzmanlık (örn. kaygı)" />
          <input class="input" id="filterPrice" placeholder="Ücret aralığı" />
        </div>
        <button class="btn secondary" id="applyFilters" style="margin-top:12px;">Filtreleri Uygula</button>
      </div>
      <div class="grid2" id="psychologistCards" style="margin-top:16px;"></div>
    `
  });

  const listEl = qs("#psychologistCards");

  function renderCards(list) {
    if (!list.length) {
      listEl.innerHTML = `<div class="card">Uygun psikolog bulunamadı.</div>`;
      return;
    }

    listEl.innerHTML = list.map(p => {
      const rating = ratings.get(p.profile_id);
      const ratingText = rating ? `⭐ ${rating.toFixed(1)}` : "⭐ Yeni";
      const specialties = (p.specialties || []).map(s => `<span class="pill">${esc(s)}</span>`).join("");
      return `
        <div class="card">
          <div style="display:flex; align-items:center; gap:12px;">
            <img src="${esc(p.photo_url || "https://i.pravatar.cc/120?img=32")}" alt="${esc(p.display_name || "Psikolog")}" style="width:72px; height:72px; border-radius:16px; object-fit:cover;" />
            <div>
              <h4>${esc(p.display_name || "Psikolog")}</h4>
              <small>${esc(p.city || "Şehir belirtilmemiş")} • ${esc(p.mode || "")}</small>
              <div style="margin-top:6px;">${ratingText}</div>
            </div>
          </div>
          <p style="margin-top:10px;">${esc(p.bio || "Biyografi paylaşılmadı.")}</p>
          <div class="pill-row" style="margin-top:10px;">${specialties || ""}</div>
          <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
            <button class="btn secondary" data-detail="${esc(p.profile_id)}">Detay</button>
            <button class="btn" data-request="${esc(p.profile_id)}">Talep Gönder</button>
          </div>
        </div>
      `;
    }).join("");

    qsa("[data-detail]", listEl).forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-detail");
        const psychologist = psychologists.find(p => p.profile_id === id);
        if (!psychologist) return;
        await openPsychologistDetail(psychologist);
      });
    });

    qsa("[data-request]", listEl).forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-request");
        const psychologist = psychologists.find(p => p.profile_id === id);
        if (!psychologist) return;
        openRequestModal(psychologist);
      });
    });
  }

  renderCards(psychologists);

  qs("#applyFilters")?.addEventListener("click", () => {
    const city = qs("#filterCity")?.value.trim().toLowerCase();
    const mode = qs("#filterMode")?.value;
    const spec = qs("#filterSpec")?.value.trim().toLowerCase();
    const price = qs("#filterPrice")?.value.trim().toLowerCase();

    const filtered = psychologists.filter(p => {
      const cityOk = !city || (p.city || "").toLowerCase().includes(city);
      const modeOk = !mode || (p.mode || "") === mode;
      const specOk = !spec || (p.specialties || []).some(s => s.toLowerCase().includes(spec));
      const priceOk = !price || (p.price_range || "").toLowerCase().includes(price);
      return cityOk && modeOk && specOk && priceOk;
    });

    renderCards(filtered);
  });
}

async function fetchPsychologists() {
  if (state.cache.psychologists) return state.cache.psychologists;
  const { data, error } = await sb
    .from("psychologist_profiles")
    .select("profile_id, display_name, bio, specialties, city, mode, price_range, photo_url, verified")
    .eq("verified", true);
  logSupabase("psychologist_profiles.select", { data, error });
  state.cache.psychologists = data || [];
  return state.cache.psychologists;
}

async function fetchRatingsMap(psychologistIds) {
  const map = new Map();
  if (!psychologistIds.length) return map;
  const { data, error } = await sb
    .from("reviews")
    .select("psychologist_profile_id, rating")
    .in("psychologist_profile_id", psychologistIds)
    .eq("is_hidden", false);
  logSupabase("reviews.select.ratings", { data, error });
  if (error) return map;

  const grouped = new Map();
  (data || []).forEach(row => {
    const list = grouped.get(row.psychologist_profile_id) || [];
    list.push(row.rating);
    grouped.set(row.psychologist_profile_id, list);
  });

  grouped.forEach((ratings, id) => {
    const avg = ratings.reduce((acc, val) => acc + val, 0) / ratings.length;
    map.set(id, avg);
  });
  return map;
}

async function openPsychologistDetail(psychologist) {
  const { data, error } = await sb
    .from("reviews")
    .select("id, reviewer_profile_id, rating, comment, is_anonymous, created_at")
    .eq("psychologist_profile_id", psychologist.profile_id)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false });
  logSupabase("reviews.select.detail", { data, error });

  const reviewsHTML = (data || []).map(r => {
    const name = r.is_anonymous ? "Anonim" : (r.reviewer_profile_id || "Danışan");
    return `
      <div class="card" style="margin-top:10px;">
        <strong>${esc(name)}</strong> • ⭐ ${esc(r.rating)}
        <p>${esc(r.comment || "")}</p>
        <small>${new Date(r.created_at).toLocaleDateString("tr-TR")}</small>
      </div>
    `;
  }).join("") || `<div class="card">Henüz yorum yok.</div>`;

  openModal(
    "Psikolog Detayı",
    `
      <div>
        <div style="display:flex; gap:14px; align-items:center;">
          <img src="${esc(psychologist.photo_url || "https://i.pravatar.cc/120?img=32")}" style="width:80px; height:80px; border-radius:16px;" />
          <div>
            <h3>${esc(psychologist.display_name || "Psikolog")}</h3>
            <small>${esc(psychologist.city || "")}</small>
          </div>
        </div>
        <p style="margin-top:12px;">${esc(psychologist.bio || "")}</p>
        <div class="pill-row" style="margin-top:10px;">${(psychologist.specialties || []).map(s => `<span class="pill">${esc(s)}</span>`).join("")}</div>
        <h4 style="margin-top:18px;">Yorumlar</h4>
        ${reviewsHTML}
      </div>
    `,
    `
      <button class="btn" id="requestFromModal">Talep Oluştur</button>
      <button class="btn secondary" id="reviewFromModal">Yorum Yaz</button>
    `
  );

  qs("#requestFromModal")?.addEventListener("click", () => {
    closeModal();
    openRequestModal(psychologist);
  });
  qs("#reviewFromModal")?.addEventListener("click", () => {
    closeModal();
    openReviewModal(psychologist.profile_id);
  });
}

function openRequestModal(psychologist) {
  openModal(
    "Talep Oluştur",
    `
      <div class="grid2">
        <input class="input" id="reqTopic" placeholder="Konu başlığı" />
        <input class="input" id="reqBudget" placeholder="Bütçe notu (opsiyonel)" />
      </div>
      <textarea class="input" id="reqMessage" placeholder="Mesaj" style="margin-top:12px; min-height:120px;"></textarea>
    `,
    `
      <button class="btn" id="sendRequest">Talep Gönder</button>
    `
  );

  qs("#sendRequest")?.addEventListener("click", async () => {
    await ensureClientProfile();
    if (!state.clientProfile) return toast("error", "Önce danışan profilini doldurmalısın.");

    const payload = {
      client_profile_id: state.clientProfile.profile_id,
      psychologist_profile_id: psychologist.profile_id,
      topic: qs("#reqTopic")?.value.trim(),
      message: qs("#reqMessage")?.value.trim(),
      status: "pending",
    };

    const { error } = await sb.from("client_requests").insert([payload]);
    logSupabase("client_requests.insert", { error });
    if (error) return toast("error", error.message);

    toast("success", "Talep gönderildi.");
    closeModal();
  });
}

function openReviewModal(psychologistId) {
  openModal(
    "Yorum Yaz",
    `
      <div class="grid2">
        <input class="input" id="reviewRating" type="number" min="1" max="5" placeholder="Puan (1-5)" />
        <select class="input" id="reviewAnon">
          <option value="false">Adım görünsün</option>
          <option value="true">Anonim</option>
        </select>
      </div>
      <textarea class="input" id="reviewComment" placeholder="Yorum" style="margin-top:12px; min-height:120px;"></textarea>
    `,
    `<button class="btn" id="saveReview">Gönder</button>`
  );

  qs("#saveReview")?.addEventListener("click", async () => {
    const rating = parseInt(qs("#reviewRating")?.value, 10);
    const comment = qs("#reviewComment")?.value.trim();
    const isAnon = qs("#reviewAnon")?.value === "true";

    if (!rating || rating < 1 || rating > 5) return toast("error", "Puan 1-5 arasında olmalı.");

    const payload = {
      psychologist_profile_id: psychologistId,
      reviewer_profile_id: state.profile.id,
      rating,
      comment,
      is_anonymous: isAnon,
      is_hidden: false,
    };

    const { error } = await sb.from("reviews").insert([payload]);
    logSupabase("reviews.insert", { error });
    if (error) return toast("error", error.message);

    toast("success", "Yorum gönderildi.");
    closeModal();
  });
}

async function renderClientRequests(navItems) {
  await ensureClientProfile();
  if (!state.clientProfile) {
    shell({
      navItems,
      contentHTML: `
        <div class="card">
          <h3>Taleplerim</h3>
          <p class="muted">Talep göndermeden önce danışan profilini tamamlamalısın.</p>
        </div>
      `
    });
    return;
  }

  const { data, error } = await sb
    .from("client_requests")
    .select("id, psychologist_profile_id, topic, message, status, created_at")
    .eq("client_profile_id", state.clientProfile.profile_id)
    .order("created_at", { ascending: false });
  logSupabase("client_requests.select", { data, error });

  const rows = data || [];
  const ids = [...new Set(rows.map(r => r.psychologist_profile_id).filter(Boolean))];
  let psyMap = new Map();
  if (ids.length) {
    const { data: psy } = await sb
      .from("psychologist_profiles")
      .select("profile_id, display_name")
      .in("profile_id", ids);
    psyMap = new Map((psy || []).map(p => [p.profile_id, p.display_name]));
  }

  shell({
    navItems,
    contentHTML: `
      <div class="card">
        <h3>Taleplerim</h3>
        <p class="muted">Gönderdiğin taleplerin durumu burada.</p>
        <div style="margin-top:14px;" class="list">
          ${rows.map(r => `
            <div class="card" style="margin-bottom:10px;">
              <strong>${esc(psyMap.get(r.psychologist_profile_id) || "Psikolog")}</strong>
              <p>${esc(r.topic || "Konu belirtilmedi")}</p>
              <small>${esc(r.status)} • ${new Date(r.created_at).toLocaleDateString("tr-TR")}</small>
            </div>
          `).join("") || `<div class="lock">Henüz talep yok.</div>`}
        </div>
      </div>
    `
  });
}

async function renderClientReviews(navItems) {
  const { data, error } = await sb
    .from("reviews")
    .select("id, psychologist_profile_id, rating, comment, created_at, is_hidden")
    .eq("reviewer_profile_id", state.profile.id)
    .order("created_at", { ascending: false });
  logSupabase("reviews.select.client", { data, error });

  shell({
    navItems,
    contentHTML: `
      <div class="card">
        <h3>Yorumlarım</h3>
        <p class="muted">Gönderdiğin yorumları buradan takip edebilirsin.</p>
        <div style="margin-top:14px;">
          ${(data || []).map(r => `
            <div class="card" style="margin-bottom:10px;">
              <strong>⭐ ${esc(r.rating)}</strong>
              <p>${esc(r.comment || "")}</p>
              <small>${r.is_hidden ? "Gizli" : "Yayında"} • ${new Date(r.created_at).toLocaleDateString("tr-TR")}</small>
            </div>
          `).join("") || `<div class="lock">Henüz yorum yok.</div>`}
        </div>
      </div>
    `
  });
}

async function renderPsychologistApp() {
  const hash = activeHash() || "psychologist-profile";
  const navItems = [
    { hash: "psychologist-profile", label: "Profil" },
    { hash: "psychologist-requests", label: "Talepler" },
    { hash: "psychologist-reviews", label: "Yorumlar" },
  ];

  if (hash === "psychologist-requests") return renderPsychologistRequests(navItems);
  if (hash === "psychologist-reviews") return renderPsychologistReviews(navItems);
  return renderPsychologistProfile(navItems);
}

async function ensurePsychologistProfile() {
  if (state.psychologistProfile) return;
  const { data, error } = await sb
    .from("psychologist_profiles")
    .select("*")
    .eq("profile_id", state.profile.id)
    .maybeSingle();
  logSupabase("psychologist_profiles.select", { data, error });
  state.psychologistProfile = data || null;
}

async function renderPsychologistProfile(navItems) {
  await ensurePsychologistProfile();
  const profile = state.psychologistProfile || {};

  shell({
    navItems,
    contentHTML: `
      <div class="card">
        <h3>Psikolog Profili</h3>
        <p class="muted">Bilgilerini güncelle, danışanlar için görünürlüğünü artır.</p>
        <div class="grid2" style="margin-top:14px;">
          <input class="input" id="ppName" placeholder="Görünen ad" value="${esc(profile.display_name || state.profile.display_name || "")}" />
          <input class="input" id="ppCity" placeholder="Şehir" value="${esc(profile.city || "")}" />
          <select class="input" id="ppMode">
            <option value="">Format</option>
            <option value="online" ${profile.mode === "online" ? "selected" : ""}>Online</option>
            <option value="yuz_yuze" ${profile.mode === "yuz_yuze" ? "selected" : ""}>Yüz yüze</option>
            <option value="hibrit" ${profile.mode === "hibrit" ? "selected" : ""}>Hibrit</option>
          </select>
          <input class="input" id="ppPrice" placeholder="Ücret aralığı" value="${esc(profile.price_range || "")}" />
          <input class="input" id="ppSpecs" placeholder="Uzmanlıklar (virgülle ayır)" value="${esc((profile.specialties || []).join(", "))}" />
          <input class="input" id="ppPhoto" placeholder="Fotoğraf URL" value="${esc(profile.photo_url || "")}" />
        </div>
        <textarea class="input" id="ppBio" placeholder="Bio" style="margin-top:12px; min-height:120px;">${esc(profile.bio || "")}</textarea>
        <div style="margin-top:14px; display:flex; gap:10px; align-items:center;">
          <button class="btn" id="savePsychologist">Kaydet</button>
          <span class="badge ${profile.verified ? "green" : "warn"}">${profile.verified ? "Doğrulandı" : "Doğrulanmadı"}</span>
        </div>
      </div>
    `
  });

  qs("#savePsychologist")?.addEventListener("click", async () => {
    const payload = {
      profile_id: state.profile.id,
      display_name: qs("#ppName")?.value.trim(),
      bio: qs("#ppBio")?.value.trim(),
      specialties: (qs("#ppSpecs")?.value || "").split(",").map(s => s.trim()).filter(Boolean),
      city: qs("#ppCity")?.value.trim(),
      mode: qs("#ppMode")?.value,
      price_range: qs("#ppPrice")?.value.trim(),
      photo_url: qs("#ppPhoto")?.value.trim(),
      verified: profile.verified || false,
    };
    const { data, error } = await sb.from("psychologist_profiles").upsert([payload]).select("*").single();
    logSupabase("psychologist_profiles.upsert", { data, error });
    if (error) return toast("error", error.message);
    state.psychologistProfile = data;
    toast("success", "Profil güncellendi.");
  });
}

async function renderPsychologistRequests(navItems) {
  await ensurePsychologistProfile();
  const { data, error } = await sb
    .from("client_requests")
    .select("id, client_profile_id, topic, message, status, created_at")
    .eq("psychologist_profile_id", state.psychologistProfile?.profile_id)
    .order("created_at", { ascending: false });
  logSupabase("client_requests.select.psychologist", { data, error });

  const rows = data || [];
  const clientIds = [...new Set(rows.map(r => r.client_profile_id).filter(Boolean))];
  let clientMap = new Map();
  if (clientIds.length) {
    const { data: clients } = await sb
      .from("client_profiles")
      .select("profile_id, goal, city")
      .in("profile_id", clientIds);
    clientMap = new Map((clients || []).map(c => [c.profile_id, c]));
  }

  shell({
    navItems,
    contentHTML: `
      <div class="card">
        <h3>Gelen Talepler</h3>
        <p class="muted">Danışan taleplerine yanıt ver.</p>
        <div style="margin-top:14px;">
          ${rows.map(r => {
            const client = clientMap.get(r.client_profile_id) || {};
            return `
              <div class="card" style="margin-bottom:10px;">
                <strong>${esc(client.goal || "Danışan talebi")}</strong>
                <p>${esc(r.topic || "Konu belirtilmedi")}</p>
                <small>${esc(client.city || "")}</small>
                <p style="margin-top:8px;">${esc(r.message || "")}</p>
                <div style="display:flex; gap:8px; margin-top:10px;">
                  <span class="badge ${r.status === "accepted" ? "green" : r.status === "rejected" ? "warn" : ""}">${esc(r.status)}</span>
                  <button class="btn secondary" data-action="accept" data-id="${esc(r.id)}">Onayla</button>
                  <button class="btn danger" data-action="reject" data-id="${esc(r.id)}">Reddet</button>
                </div>
              </div>
            `;
          }).join("") || `<div class="lock">Henüz talep yok.</div>`}
        </div>
      </div>
    `
  });

  qsa("[data-action]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-action");
      const status = action === "accept" ? "accepted" : "rejected";
      const { error: uErr } = await sb
        .from("client_requests")
        .update({ status })
        .eq("id", id);
      logSupabase("client_requests.update", { error: uErr });
      if (uErr) return toast("error", uErr.message);
      toast("success", "Talep güncellendi.");
      renderPsychologistRequests(navItems);
    });
  });
}

async function renderPsychologistReviews(navItems) {
  await ensurePsychologistProfile();
  const { data, error } = await sb
    .from("reviews")
    .select("rating, comment, created_at, is_anonymous")
    .eq("psychologist_profile_id", state.psychologistProfile?.profile_id)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false });
  logSupabase("reviews.select.psychologist", { data, error });

  shell({
    navItems,
    contentHTML: `
      <div class="card">
        <h3>Yorumlar</h3>
        <p class="muted">Danışanların değerlendirmeleri.</p>
        <div style="margin-top:14px;">
          ${(data || []).map(r => `
            <div class="card" style="margin-bottom:10px;">
              <strong>⭐ ${esc(r.rating)}</strong>
              <p>${esc(r.comment || "")}</p>
              <small>${r.is_anonymous ? "Anonim" : "Danışan"} • ${new Date(r.created_at).toLocaleDateString("tr-TR")}</small>
            </div>
          `).join("") || `<div class="lock">Henüz yorum yok.</div>`}
        </div>
      </div>
    `
  });
}

async function renderAdminApp() {
  const hash = activeHash() || "admin-verify";
  const navItems = [
    { hash: "admin-verify", label: "Doğrulama" },
    { hash: "admin-reviews", label: "Yorumlar" },
    { hash: "admin-users", label: "Kullanıcılar" },
  ];

  if (hash === "admin-reviews") return renderAdminReviews(navItems);
  if (hash === "admin-users") return renderAdminUsers(navItems);
  return renderAdminVerify(navItems);
}

async function renderAdminVerify(navItems) {
  const { data, error } = await sb
    .from("psychologist_profiles")
    .select("profile_id, display_name, city, verified")
    .order("created_at", { ascending: false });
  logSupabase("psychologist_profiles.select.admin", { data, error });

  shell({
    navItems,
    contentHTML: `
      <div class="card">
        <h3>Psikolog Doğrulama</h3>
        <p class="muted">Psikologları doğrula (mavi tik).</p>
        <div style="margin-top:14px;">
          ${(data || []).map(p => `
            <div class="card" style="margin-bottom:10px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
              <div>
                <strong>${esc(p.display_name || "Psikolog")}</strong>
                <p class="muted" style="margin:0;">${esc(p.city || "")}</p>
              </div>
              <button class="btn ${p.verified ? "secondary" : ""}" data-verify="${esc(p.profile_id)}">${p.verified ? "Doğrulamayı Kaldır" : "Doğrula"}</button>
            </div>
          `).join("") || `<div class="lock">Kayıt yok.</div>`}
        </div>
      </div>
    `
  });

  qsa("[data-verify]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-verify");
      const current = data?.find(p => p.profile_id === id);
      const { error: uErr } = await sb
        .from("psychologist_profiles")
        .update({ verified: !current?.verified })
        .eq("profile_id", id);
      logSupabase("psychologist_profiles.update.verify", { error: uErr });
      if (uErr) return toast("error", uErr.message);
      toast("success", "Doğrulama güncellendi.");
      renderAdminVerify(navItems);
    });
  });
}

async function renderAdminReviews(navItems) {
  const { data, error } = await sb
    .from("reviews")
    .select("id, psychologist_profile_id, rating, comment, is_hidden, created_at")
    .order("created_at", { ascending: false });
  logSupabase("reviews.select.admin", { data, error });

  shell({
    navItems,
    contentHTML: `
      <div class="card">
        <h3>Yorum Yönetimi</h3>
        <p class="muted">Yorumları gizle/aç.</p>
        <div style="margin-top:14px;">
          ${(data || []).map(r => `
            <div class="card" style="margin-bottom:10px;">
              <strong>⭐ ${esc(r.rating)}</strong>
              <p>${esc(r.comment || "")}</p>
              <small>${new Date(r.created_at).toLocaleDateString("tr-TR")}</small>
              <div style="margin-top:8px;">
                <button class="btn secondary" data-toggle-review="${esc(r.id)}">${r.is_hidden ? "Yayınla" : "Gizle"}</button>
              </div>
            </div>
          `).join("") || `<div class="lock">Yorum yok.</div>`}
        </div>
      </div>
    `
  });

  qsa("[data-toggle-review]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-toggle-review");
      const current = data?.find(r => r.id === id);
      const { error: uErr } = await sb
        .from("reviews")
        .update({ is_hidden: !current?.is_hidden })
        .eq("id", id);
      logSupabase("reviews.update.admin", { error: uErr });
      if (uErr) return toast("error", uErr.message);
      toast("success", "Yorum güncellendi.");
      renderAdminReviews(navItems);
    });
  });
}

async function renderAdminUsers(navItems) {
  const { data, error } = await sb
    .from("profiles")
    .select("id, display_name, role, email, created_at")
    .order("created_at", { ascending: false });
  logSupabase("profiles.select.admin", { data, error });

  shell({
    navItems,
    contentHTML: `
      <div class="card">
        <h3>Kullanıcılar</h3>
        <p class="muted">Tüm rollerin listesi.</p>
        <div style="margin-top:14px;">
          ${(data || []).map(p => `
            <div class="card" style="margin-bottom:10px;">
              <strong>${esc(p.display_name || p.email || "Kullanıcı")}</strong>
              <p class="muted" style="margin:0;">${esc(p.email || "")}</p>
              <small>${esc(ROLE_LABELS[p.role] || p.role)} • ${new Date(p.created_at).toLocaleDateString("tr-TR")}</small>
            </div>
          `).join("") || `<div class="lock">Kayıt yok.</div>`}
        </div>
      </div>
    `
  });
}