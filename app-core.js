// Gig Work Hub - shared core (auth, session, formatting) used by every page.

/* ===================================================================
   Soft PIN gate - a deterrent against casual visitors landing on the
   site, NOT real security. Anyone who views this file's source can
   read the PIN. Real protection is Supabase Auth + Row Level Security
   below. Change the PIN any time by editing the line below and
   re-deploying.
=================================================================== */
const SITE_PIN = "1590";

(function runPinGate() {
  if (sessionStorage.getItem("gwh_pin_ok") === "1") {
    return;
  }

  const gate = document.getElementById("pin-gate");
  if (!gate) {
    return;
  }

  const form = document.getElementById("pin-form");
  const input = document.getElementById("pin-input");
  const error = document.getElementById("pin-error");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (input.value === SITE_PIN) {
      sessionStorage.setItem("gwh_pin_ok", "1");
      gate.hidden = true;
    } else {
      error.textContent = "Wrong PIN. Try again.";
      input.value = "";
      input.focus();
    }
  });
})();

const SUPABASE_URL = "https://oumtpyrydlczmhxagbcq.supabase.co";
const SUPABASE_KEY = "sb_publishable_zeny0sgq0oB5LvK2iTEAdw_rqBoFVXE";
const DEFAULT_RIDER_NAME = "Rider";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentRiderName = "";
let currentAccessToken = null;

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
    .select("rider_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (data?.rider_name) {
    return data.rider_name;
  }

  const fallbackName = metadataName || DEFAULT_RIDER_NAME;
  await supabaseClient.from("rider_profiles").upsert({ user_id: user.id, rider_name: fallbackName });
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

function setActiveNav() {
  const page = document.body.dataset.page;
  document.querySelectorAll(".site-nav-links a").forEach((link) => {
    link.classList.toggle("active", link.dataset.nav === page);
  });
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
