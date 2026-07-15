// Gig Work Hub - Settings page logic.

const settingsRiderName = document.getElementById("settings-rider-name");
const settingsEmail = document.getElementById("settings-email");
const resetPasswordButton = document.getElementById("reset-password-button");
const resetPasswordStatus = document.getElementById("reset-password-status");
const settingsLogoutButton = document.getElementById("settings-logout-button");

async function loadSettings() {
  if (!currentUser) {
    return;
  }

  settingsRiderName.textContent = currentRiderName || "--";
  settingsEmail.textContent = currentUser.email || "--";
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
  }
});
