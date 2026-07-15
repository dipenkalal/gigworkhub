// Gig Work Hub - Settings page logic.

const settingsRiderName = document.getElementById("settings-rider-name");
const settingsEmail = document.getElementById("settings-email");
const settingsLocations = document.getElementById("settings-locations");
const resetPasswordButton = document.getElementById("reset-password-button");
const resetPasswordStatus = document.getElementById("reset-password-status");
const settingsLogoutButton = document.getElementById("settings-logout-button");

async function loadSettings() {
  if (!currentUser) {
    return;
  }

  settingsRiderName.textContent = currentRiderName || "--";
  settingsEmail.textContent = currentUser.email || "--";

  const { data, error } = await supabaseClient
    .from("shift_entries")
    .select("station_location")
    .eq("user_id", currentUser.id)
    .not("station_location", "is", null);

  if (error) {
    settingsLocations.textContent = "Could not load saved locations.";
    return;
  }

  const unique = [...new Set(data.map((row) => row.station_location).filter(Boolean))];

  if (!unique.length) {
    settingsLocations.textContent = "No saved locations yet — they'll show up here once you log a station location on Start Shift.";
    return;
  }

  settingsLocations.innerHTML = unique.map((loc) => `<span class="location-chip">${loc}</span>`).join("");
}

resetPasswordButton.addEventListener("click", async () => {
  if (!currentUser?.email) {
    return;
  }
  resetPasswordButton.disabled = true;
  resetPasswordStatus.textContent = "Sending...";
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(currentUser.email);
    if (error) throw error;
    resetPasswordStatus.textContent = `Reset link sent to ${currentUser.email}.`;
  } catch (error) {
    resetPasswordStatus.textContent = error.message || "Could not send reset link.";
  } finally {
    resetPasswordButton.disabled = false;
  }
});

settingsLogoutButton.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  currentUser = null;
  currentRiderName = "";
  currentAccessToken = null;
  window.location.href = "index.html";
});

initApp({
  onSignedIn: async () => {
    await loadSettings();
  },
  onSignedOut: () => {
    settingsRiderName.textContent = "--";
    settingsEmail.textContent = "--";
    settingsLocations.textContent = "";
  }
});
