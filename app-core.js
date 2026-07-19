// Gig Work Hub - shared core (auth, session, formatting) used by every page.

const SUPABASE_URL = "https://oumtpyrydlczmhxagbcq.supabase.co";
const SUPABASE_KEY = "sb_publishable_zeny0sgq0oB5LvK2iTEAdw_rqBoFVXE";
const DEFAULT_RIDER_NAME = "Rider";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentRiderName = "";
let currentAccessToken = null;
let currentDefaultBlockHours = null;

function supabaseHeaders(prefer) {
  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${currentAccessToken || SUPABASE_KEY}`,
    "Content-Type": "application/json"
  };

  if (prefer) {
    headers.Prefer = prefer;
  }

  return headers;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-CA", { maximumFractionDigits: 1 }).format(Number(value) || 0);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(Number(value) || 0);
}

async function getOrCreateRiderName(user) {
  const metadataName = user.user_metadata?.rider_name || "";
  const { data } = await supabaseClient
    .from("rider_profiles")
    .select("rider_name,default_block_hours")
    .eq("user_id", user.id)
    .maybeSingle();

  currentDefaultBlockHours = data?.default_block_hours ?? null;

  if (data?.rider_name) {
    return data.rider_name;
  }

  const fallbackName = metadataName || DEFAULT_RIDER_NAME;
  await supabaseClient.from("rider_profiles").upsert({ user_id: user.id, rider_name: fallbackName }, { onConflict: "user_id" });
  return fallbackName;
}

function initialsFor(name) {
  const initials = (name || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "GW";
}

function getStoredTheme() {
  try {
    return localStorage.getItem("gwh_theme") || "dark";
  } catch (error) {
    return "dark";
  }
}

function applyTheme(theme) {
  document.body.classList.toggle("theme-light", theme === "light");
}

function setStoredTheme(theme) {
  try {
    localStorage.setItem("gwh_theme", theme);
  } catch (error) {
    // ignore - theme just won't persist
  }
  applyTheme(theme);
}

applyTheme(getStoredTheme());

function setActiveNav() {
  const page = document.body.dataset.page;
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.nav === page);
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    });
  }
}

registerServiceWorker();

function renderField(field) {
  const required = field.required ? " required" : "";
  const full = field.full ? " full" : "";
  const min = field.min ? ` min="${field.min}"` : "";
  const step = field.step ? ` step="${field.step}"` : "";
  const list = field.list ? ` list="${field.list}"` : "";

  if (field.type === "static_info") {
    return `<div class="field${full}"><div class="static-info-banner">${field.value}</div></div>`;
  }

  if (field.type === "hours_quick") {
    return `
      <div class="field${full}">
        <label for="${field.name}">${field.label}</label>
        <div class="hours-quick-row">
          <button type="button" class="hours-quick-btn" data-hours="3">3 hrs</button>
          <button type="button" class="hours-quick-btn" data-hours="3.5">3.5 hrs</button>
        </div>
        <input id="${field.name}" name="${field.name}" type="number" min="0" step="0.25"${required} placeholder="Or type custom hours">
      </div>`;
  }

  if (field.type === "block_end_preview") {
    return `
      <div class="field${full}">
        <label>${field.label}</label>
        <div class="block-end-time-preview" id="block-end-time-preview">--:--</div>
        <input type="hidden" name="block_end_time" id="block-end-time-hidden">
      </div>`;
  }

  if (field.type === "textarea") {
    return `<div class="field${full}"><label for="${field.name}">${field.label}</label><textarea id="${field.name}" name="${field.name}"${required}></textarea></div>`;
  }

  if (field.type === "select") {
    const options = field.options.map((option) => `<option value="${option}">${option}</option>`).join("");
    return `<div class="field${full}"><label for="${field.name}">${field.label}</label><select id="${field.name}" name="${field.name}"${required}><option value="">Choose...</option>${options}</select></div>`;
  }

  return `<div class="field${full}"><label for="${field.name}">${field.label}</label><input id="${field.name}" name="${field.name}" type="${field.type}"${required}${min}${step}${list}></div>`;
}

function formatTimeLabel(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function computeBlockEndTime(startTime, hours) {
  const hoursNumber = Number(hours);
  if (!startTime || !Number.isFinite(hoursNumber) || hoursNumber <= 0) {
    return null;
  }
  const [h, m] = startTime.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    return null;
  }
  const totalMinutes = h * 60 + m + Math.round(hoursNumber * 60);
  const endH = Math.floor((totalMinutes / 60)) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

// Wires up the quick-select buttons + live preview for a block-hours field.
// Pass the <form> element that contains block_start_time / block_hours inputs.
function setupBlockHoursUI(formEl) {
  if (!formEl) {
    return;
  }

  const startInput = formEl.querySelector('[name="block_start_time"]');
  const hoursInput = formEl.querySelector('[name="block_hours"]');
  const hiddenEnd = formEl.querySelector("#block-end-time-hidden");
  const preview = formEl.querySelector("#block-end-time-preview");
  const quickButtons = formEl.querySelectorAll(".hours-quick-btn");

  if (!startInput || !hoursInput) {
    return;
  }

  function updatePreview() {
    const computed = computeBlockEndTime(startInput.value, hoursInput.value);
    if (preview) {
      preview.textContent = computed ? formatTimeLabel(computed) : "--:--";
    }
    if (hiddenEnd) {
      hiddenEnd.value = computed || "";
    }
  }

  quickButtons.forEach((button) => {
    button.addEventListener("click", () => {
      hoursInput.value = button.dataset.hours;
      quickButtons.forEach((btn) => btn.classList.toggle("active", btn === button));
      updatePreview();
    });
  });

  startInput.addEventListener("input", updatePreview);
  hoursInput.addEventListener("input", () => {
    quickButtons.forEach((btn) => btn.classList.remove("active"));
    updatePreview();
  });

  updatePreview();
}

// hooks: { onSignedIn: async () => {}, onSignedOut: () => {} }
function initApp(hooks = {}) {
  const authGate = document.getElementById("auth-gate");
  const app = document.getElementById("app");
  const accountBar = document.getElementById("account-bar");
  const accountAvatar = document.getElementById("account-avatar");
  const accountLabel = document.getElementById("account-label");
  const logoutButton = document.getElementById("logout-button");
  const authForm = document.getElementById("auth-form");
  const authStatus = document.getElementById("auth-status");
  const authSubmit = document.getElementById("auth-submit");

  setActiveNav();

  function renderSignedOut() {
    if (app) app.hidden = true;
    if (authGate) authGate.hidden = false;
    if (accountBar) accountBar.classList.remove("visible");
    if (hooks.onSignedOut) hooks.onSignedOut();
  }

  function renderSignedIn() {
    if (authGate) authGate.hidden = true;
    if (app) app.hidden = false;
    if (accountBar) {
      accountBar.classList.add("visible");
      if (accountAvatar) accountAvatar.textContent = initialsFor(currentRiderName);
      if (accountLabel) accountLabel.textContent = `Logged in as ${currentRiderName}`;
    }
  }

  async function handleSession(session) {
    if (!session?.user) {
      currentUser = null;
      currentRiderName = "";
      currentAccessToken = null;
      renderSignedOut();
      return;
    }

    currentUser = session.user;
    currentAccessToken = session.access_token;
    currentRiderName = await getOrCreateRiderName(session.user);
    renderSignedIn();

    if (hooks.onSignedIn) {
      await hooks.onSignedIn();
    }
  }

  if (authForm) {
    authForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      authSubmit.disabled = true;
      authStatus.textContent = "Logging in...";

      try {
        const formData = Object.fromEntries(new FormData(authForm).entries());
        const { error } = await supabaseClient.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });

        if (error) {
          throw error;
        }

        authStatus.textContent = "Logged in.";
      } catch (error) {
        authStatus.textContent = error.message || "Could not log in.";
      } finally {
        authSubmit.disabled = false;
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      currentUser = null;
      currentRiderName = "";
      currentAccessToken = null;
      renderSignedOut();
    });
  }

  supabaseClient.auth.getSession().then(({ data }) => handleSession(data.session));
  supabaseClient.auth.onAuthStateChange((_event, session) => handleSession(session));
}
