// Gig Work Hub - Settings page logic.

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

async function loadSettings() {
  if (!currentUser) {
    return;
  }

  settingsRiderNameInput.value = currentRiderName || "";
  settingsEmail.textContent = currentUser.email || "--";

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

saveRiderNameButton.addEventListener("click", async () => {
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

exportJsonButton.addEventListener("click", async () => {
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

exportCsvButton.addEventListener("click", async () => {
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
