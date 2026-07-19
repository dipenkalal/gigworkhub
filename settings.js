// Gig Work Hub - Settings page logic.

// Guards against a partial deploy (HTML/JS out of sync) crashing the whole
// script - a null element here would otherwise throw and stop initApp()
// from ever running below, which is what breaks login on this page.
function onClick(element, handler) {
  if (element) {
    element.addEventListener("click", handler);
  }
}

const settingsRiderNameInput = document.getElementById("settings-rider-name-input");
const saveRiderNameButton = document.getElementById("save-rider-name-button");
const riderNameStatus = document.getElementById("rider-name-status");
const settingsEmail = document.getElementById("settings-email");
const resetPasswordButton = document.getElementById("reset-password-button");
const resetPasswordStatus = document.getElementById("reset-password-status");
const settingsLogoutButton = document.getElementById("settings-logout-button");

const statsShiftCount = document.getElementById("stats-shift-count");
const statsTotalKm = document.getElementById("stats-total-km");
const statsMemberSince = document.getElementById("stats-member-since");

const exportJsonButton = document.getElementById("export-json-button");
const exportCsvButton = document.getElementById("export-csv-button");
const exportStatus = document.getElementById("export-status");

const themeSwitch = document.getElementById("theme-switch");
const themeLabel = document.getElementById("theme-label");

const defaultHoursQuickRow = document.getElementById("default-hours-quick-row");
const defaultBlockHoursInput = document.getElementById("default-block-hours-input");
const saveDefaultHoursButton = document.getElementById("save-default-hours-button");
const defaultHoursStatus = document.getElementById("default-hours-status");

const newEmailInput = document.getElementById("settings-new-email-input");
const changeEmailButton = document.getElementById("change-email-button");
const changeEmailStatus = document.getElementById("change-email-status");

const clearDataButton = document.getElementById("clear-data-button");
const clearDataStatus = document.getElementById("clear-data-status");

async function loadSettings() {
  if (!currentUser) {
    return;
  }

  settingsRiderNameInput.value = currentRiderName || "";
  settingsEmail.textContent = currentUser.email || "--";

  try {
    const savedDefault = typeof currentDefaultBlockHours !== "undefined" ? currentDefaultBlockHours : null;
    if (savedDefault !== null && savedDefault !== undefined && defaultBlockHoursInput) {
      defaultBlockHoursInput.value = savedDefault;
      if (defaultHoursQuickRow) {
        defaultHoursQuickRow.querySelectorAll(".hours-quick-btn").forEach((button) => {
          button.classList.toggle("active", Number(button.dataset.hours) === Number(savedDefault));
        });
      }
    }
  } catch (error) {
    // A stale app-core.js on an older deploy might not define this yet -
    // don't let it block the rest of the page from loading.
  }

  await loadStats();
}

async function loadStats() {
  if (!currentUser) {
    return;
  }

  statsShiftCount.textContent = "...";
  statsTotalKm.textContent = "...";
  statsMemberSince.textContent = currentUser.created_at
    ? new Date(currentUser.created_at).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
    : "--";

  const { data, error } = await supabaseClient
    .from("shift_entries")
    .select("start_km,end_km")
    .eq("user_id", currentUser.id)
    .eq("entry_type", "start_shift");

  if (error) {
    statsShiftCount.textContent = "--";
    statsTotalKm.textContent = "--";
    return;
  }

  let closedCount = 0;
  let totalKm = 0;

  data.forEach((row) => {
    const start = Number(row.start_km);
    const end = Number(row.end_km);
    if (row.end_km !== null && row.end_km !== undefined) {
      closedCount += 1;
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
        totalKm += end - start;
      }
    }
  });

  statsShiftCount.textContent = formatNumber(closedCount);
  statsTotalKm.textContent = `${formatNumber(totalKm)} km`;
}

onClick(saveRiderNameButton, async () => {
  if (!currentUser) {
    return;
  }

  const newName = settingsRiderNameInput.value.trim();
  if (!newName) {
    riderNameStatus.textContent = "Enter a name first.";
    return;
  }

  saveRiderNameButton.disabled = true;
  riderNameStatus.textContent = "Saving...";

  try {
    const { error } = await supabaseClient
      .from("rider_profiles")
      .upsert({ user_id: currentUser.id, rider_name: newName });

    if (error) throw error;

    currentRiderName = newName;
    riderNameStatus.textContent = "Saved.";

    const accountAvatar = document.getElementById("account-avatar");
    const accountLabel = document.getElementById("account-label");
    if (accountAvatar) accountAvatar.textContent = initialsFor(newName);
    if (accountLabel) accountLabel.textContent = `Logged in as ${newName}`;
  } catch (error) {
    riderNameStatus.textContent = error.message || "Could not save name.";
  } finally {
    saveRiderNameButton.disabled = false;
  }
});

onClick(resetPasswordButton, async () => {
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

onClick(settingsLogoutButton, async () => {
  await supabaseClient.auth.signOut();
  currentUser = null;
  currentRiderName = "";
  currentAccessToken = null;
  window.location.href = "index.html";
});

// ---- Export everything ----

async function fetchAllTables() {
  const [shifts, income, fuel, repairs] = await Promise.all([
    supabaseClient.from("shift_entries").select("*").eq("user_id", currentUser.id),
    supabaseClient.from("income_entries").select("*").eq("user_id", currentUser.id),
    supabaseClient.from("fuel_entries").select("*").eq("user_id", currentUser.id),
    supabaseClient.from("repair_entries").select("*").eq("user_id", currentUser.id)
  ]);

  if (shifts.error || income.error || fuel.error || repairs.error) {
    throw new Error("Could not load all of your data. Try again.");
  }

  return {
    shifts: shifts.data,
    income: income.data,
    fuel: fuel.data,
    repairs: repairs.data
  };
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function buildFullHistoryCsv(allData) {
  const header = ["Date", "Type", "Platform", "Detail", "Amount", "Notes"];
  const body = [];

  allData.shifts.forEach((row) => {
    const start = Number(row.start_km);
    const end = Number(row.end_km);
    const km = Number.isFinite(start) && Number.isFinite(end) && row.end_km !== null
      ? `${(end - start).toFixed(1)} km`
      : "Open shift";
    body.push([
      row.shift_date,
      "Shift",
      row.platform || "",
      `${row.station_location || ""} (${km})`.trim(),
      row.expected_pay !== null && row.expected_pay !== undefined ? Number(row.expected_pay).toFixed(2) : "",
      row.notes || ""
    ]);
  });

  allData.income.forEach((row) => {
    body.push([
      row.income_date,
      "Income",
      row.platform || "",
      row.tips_amount ? `Payout + tips ${Number(row.tips_amount).toFixed(2)}` : "Payout",
      (Number(row.income_amount || 0) + Number(row.tips_amount || 0)).toFixed(2),
      row.notes || ""
    ]);
  });

  allData.fuel.forEach((row) => {
    body.push([
      row.fuel_date,
      "Fuel",
      "",
      `${row.fuel_litres || ""} L at odometer ${row.odometer_km || ""} km`.trim(),
      Number(row.fuel_cost || 0).toFixed(2),
      row.notes || ""
    ]);
  });

  allData.repairs.forEach((row) => {
    body.push([
      row.repair_date,
      "Repair",
      "",
      row.repair_type || "",
      Number(row.repair_cost || 0).toFixed(2),
      row.notes || ""
    ]);
  });

  body.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  return [header, ...body].map((row) => row.map(csvEscape).join(",")).join("\n");
}

onClick(exportJsonButton, async () => {
  if (!currentUser) {
    return;
  }

  exportJsonButton.disabled = true;
  exportStatus.textContent = "Gathering your data...";

  try {
    const allData = await fetchAllTables();
    const backup = {
      exported_at: new Date().toISOString(),
      rider_name: currentRiderName,
      ...allData
    };
    downloadFile(`gig-work-hub-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2), "application/json");
    exportStatus.textContent = "Backup downloaded.";
  } catch (error) {
    exportStatus.textContent = error.message || "Could not export data.";
  } finally {
    exportJsonButton.disabled = false;
  }
});

onClick(exportCsvButton, async () => {
  if (!currentUser) {
    return;
  }

  exportCsvButton.disabled = true;
  exportStatus.textContent = "Gathering your data...";

  try {
    const allData = await fetchAllTables();
    downloadFile(`gig-work-hub-full-history-${new Date().toISOString().slice(0, 10)}.csv`, buildFullHistoryCsv(allData), "text/csv;charset=utf-8;");
    exportStatus.textContent = "CSV downloaded.";
  } catch (error) {
    exportStatus.textContent = error.message || "Could not export data.";
  } finally {
    exportCsvButton.disabled = false;
  }
});

// ---- Theme toggle ----

function refreshThemeUI() {
  if (!themeSwitch || !themeLabel) {
    return;
  }
  const isLight = document.body.classList.contains("theme-light");
  themeSwitch.classList.toggle("on", isLight);
  themeSwitch.setAttribute("aria-checked", String(isLight));
  themeLabel.textContent = isLight ? "Light" : "Dark";
}

onClick(themeSwitch, () => {
  const nextTheme = document.body.classList.contains("theme-light") ? "dark" : "light";
  setStoredTheme(nextTheme);
  refreshThemeUI();
});

refreshThemeUI();

// ---- Default block hours ----

if (defaultHoursQuickRow) {
  defaultHoursQuickRow.querySelectorAll(".hours-quick-btn").forEach((button) => {
    button.addEventListener("click", () => {
      defaultBlockHoursInput.value = button.dataset.hours;
      defaultHoursQuickRow.querySelectorAll(".hours-quick-btn").forEach((btn) => btn.classList.toggle("active", btn === button));
    });
  });
}

if (defaultBlockHoursInput) {
  defaultBlockHoursInput.addEventListener("input", () => {
    if (defaultHoursQuickRow) {
      defaultHoursQuickRow.querySelectorAll(".hours-quick-btn").forEach((btn) => {
        btn.classList.toggle("active", Number(btn.dataset.hours) === Number(defaultBlockHoursInput.value));
      });
    }
  });
}

onClick(saveDefaultHoursButton, async () => {
  if (!currentUser) {
    return;
  }

  const hoursValue = defaultBlockHoursInput.value ? Number(defaultBlockHoursInput.value) : null;

  saveDefaultHoursButton.disabled = true;
  defaultHoursStatus.textContent = "Saving...";

  try {
    const { error } = await supabaseClient
      .from("rider_profiles")
      .upsert({ user_id: currentUser.id, default_block_hours: hoursValue });

    if (error) throw error;

    currentDefaultBlockHours = hoursValue;
    defaultHoursStatus.textContent = "Saved.";
  } catch (error) {
    defaultHoursStatus.textContent = error.message || "Could not save default.";
  } finally {
    saveDefaultHoursButton.disabled = false;
  }
});

// ---- Change email ----

onClick(changeEmailButton, async () => {
  if (!currentUser) {
    return;
  }

  const newEmail = newEmailInput.value.trim();
  if (!newEmail) {
    changeEmailStatus.textContent = "Enter a new email first.";
    return;
  }

  changeEmailButton.disabled = true;
  changeEmailStatus.textContent = "Sending confirmation...";

  try {
    const { error } = await supabaseClient.auth.updateUser({ email: newEmail });
    if (error) throw error;
    changeEmailStatus.textContent = `Confirmation link sent to ${newEmail}. Your login email updates once you confirm it.`;
    newEmailInput.value = "";
  } catch (error) {
    changeEmailStatus.textContent = error.message || "Could not update email.";
  } finally {
    changeEmailButton.disabled = false;
  }
});

// ---- Clear all data ----

onClick(clearDataButton, async () => {
  if (!currentUser) {
    return;
  }

  const confirmation = window.prompt('This permanently deletes every shift, income, fuel, and repair entry you\'ve logged. Type "DELETE" to confirm.');
  if (confirmation !== "DELETE") {
    clearDataStatus.textContent = confirmation === null ? "" : 'Cancelled \u2014 you must type "DELETE" exactly.';
    return;
  }

  clearDataButton.disabled = true;
  clearDataStatus.textContent = "Deleting...";

  try {
    const tables = ["shift_entries", "income_entries", "fuel_entries", "repair_entries"];
    for (const table of tables) {
      const { error } = await supabaseClient.from(table).delete().eq("user_id", currentUser.id);
      if (error) throw error;
    }
    clearDataStatus.textContent = "All your logged data has been deleted.";
    await loadStats();
  } catch (error) {
    clearDataStatus.textContent = error.message || "Could not delete all data.";
  } finally {
    clearDataButton.disabled = false;
  }
});

initApp({
  onSignedIn: async () => {
    await loadSettings();
  },
  onSignedOut: () => {
    settingsRiderNameInput.value = "";
    settingsEmail.textContent = "--";
    statsShiftCount.textContent = "--";
    statsTotalKm.textContent = "--";
    statsMemberSince.textContent = "--";
  }
});
