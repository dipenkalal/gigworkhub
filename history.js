// Gig Work Hub - History page logic (tabbed full record lists).

const historyList = document.getElementById("history-list");
const tabButtons = document.querySelectorAll(".tab-button");
let activeTab = "shifts";

function dateLabelFor(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

async function loadTab(tab) {
  if (!currentUser) {
    historyList.innerHTML = '<p class="shift-empty">Please log in first.</p>';
    return;
  }

  historyList.innerHTML = '<p class="shift-empty">Loading...</p>';

  if (tab === "shifts") {
    const { data, error } = await supabaseClient
      .from("shift_entries")
      .select("shift_date,platform,start_km,end_km,expected_pay,station_location,notes")
      .eq("user_id", currentUser.id)
      .eq("entry_type", "start_shift")
      .order("shift_date", { ascending: false })
      .limit(200);

    if (error) {
      historyList.innerHTML = '<p class="shift-empty">Could not load shifts.</p>';
      return;
    }

    if (!data.length) {
      historyList.innerHTML = '<p class="shift-empty">No shifts logged yet.</p>';
      return;
    }

    historyList.innerHTML = data.map((row) => {
      const isOpen = row.end_km === null || row.end_km === undefined;
      const start = Number(row.start_km);
      const end = Number(row.end_km);
      const kmLabel = !isOpen && Number.isFinite(start) && Number.isFinite(end) && end >= start
        ? `${formatNumber(end - start)} km`
        : "Closed";
      const payLabel = row.expected_pay !== null && row.expected_pay !== undefined
        ? formatCurrency(Number(row.expected_pay))
        : "--";
      const locationLabel = row.station_location || "No location saved";

      return `
        <div class="shift-row">
          <div>
            <span class="shift-date">${dateLabelFor(row.shift_date)} - ${row.platform || "Platform"}</span>
            <span class="shift-meta">${locationLabel}</span>
          </div>
          <div class="shift-side">
            <span class="shift-pay">${payLabel}</span>
            <span class="shift-status${isOpen ? " open" : ""}">${isOpen ? "Open" : kmLabel}</span>
          </div>
        </div>`;
    }).join("");
    return;
  }

  if (tab === "income") {
    const { data, error } = await supabaseClient
      .from("income_entries")
      .select("income_date,platform,income_amount,tips_amount,notes")
      .eq("user_id", currentUser.id)
      .order("income_date", { ascending: false })
      .limit(200);

    if (error) {
      historyList.innerHTML = '<p class="shift-empty">Could not load income.</p>';
      return;
    }

    if (!data.length) {
      historyList.innerHTML = '<p class="shift-empty">No income logged yet.</p>';
      return;
    }

    historyList.innerHTML = data.map((row) => `
      <div class="shift-row">
        <div>
          <span class="shift-date">${dateLabelFor(row.income_date)} - ${row.platform || "Platform"}</span>
          <span class="shift-meta">${row.tips_amount ? `Tips: ${formatCurrency(Number(row.tips_amount))}` : (row.notes || "")}</span>
        </div>
        <div class="shift-side">
          <span class="shift-pay">${formatCurrency(Number(row.income_amount || 0) + Number(row.tips_amount || 0))}</span>
        </div>
      </div>`).join("");
    return;
  }

  if (tab === "fuel") {
    const { data, error } = await supabaseClient
      .from("fuel_entries")
      .select("fuel_date,fuel_litres,fuel_cost,odometer_km,notes")
      .eq("user_id", currentUser.id)
      .order("fuel_date", { ascending: false })
      .limit(200);

    if (error) {
      historyList.innerHTML = '<p class="shift-empty">Could not load fuel entries.</p>';
      return;
    }

    if (!data.length) {
      historyList.innerHTML = '<p class="shift-empty">No fuel entries logged yet.</p>';
      return;
    }

    historyList.innerHTML = data.map((row) => `
      <div class="shift-row">
        <div>
          <span class="shift-date">${dateLabelFor(row.fuel_date)}</span>
          <span class="shift-meta">${row.fuel_litres ? `${row.fuel_litres} L` : ""}${row.odometer_km ? ` at ${formatNumber(row.odometer_km)} km` : ""}</span>
        </div>
        <div class="shift-side">
          <span class="shift-pay">${formatCurrency(row.fuel_cost)}</span>
        </div>
      </div>`).join("");
    return;
  }

  const { data, error } = await supabaseClient
    .from("repair_entries")
    .select("repair_date,repair_type,repair_cost,notes")
    .eq("user_id", currentUser.id)
    .order("repair_date", { ascending: false })
    .limit(200);

  if (error) {
    historyList.innerHTML = '<p class="shift-empty">Could not load repair entries.</p>';
    return;
  }

  if (!data.length) {
    historyList.innerHTML = '<p class="shift-empty">No repair entries logged yet.</p>';
    return;
  }

  historyList.innerHTML = data.map((row) => `
    <div class="shift-row">
      <div>
        <span class="shift-date">${dateLabelFor(row.repair_date)} - ${row.repair_type || "Repair"}</span>
        <span class="shift-meta">${row.notes || ""}</span>
      </div>
      <div class="shift-side">
        <span class="shift-pay">${formatCurrency(row.repair_cost)}</span>
      </div>
    </div>`).join("");
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeTab = button.dataset.tab;
    tabButtons.forEach((btn) => btn.classList.toggle("active", btn === button));
    loadTab(activeTab);
  });
});

initApp({
  onSignedIn: async () => {
    await loadTab(activeTab);
  },
  onSignedOut: () => {
    historyList.innerHTML = '<p class="shift-empty">Please log in first.</p>';
  }
});
