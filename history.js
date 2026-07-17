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

function shortDateLabelFor(date) {
  return date.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
}

// Amazon Flex pay period: Wednesday 12:00am through the following Tuesday 11:59pm,
// paid out into the bank on the Wednesday after the period closes.
function getPayPeriod(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay(); // 0 = Sun ... 3 = Wed ... 6 = Sat
  const daysSinceWednesday = (day - 3 + 7) % 7;

  const start = new Date(d);
  start.setDate(d.getDate() - daysSinceWednesday);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const payoutDate = new Date(start);
  payoutDate.setDate(start.getDate() + 7);

  return { start, end, payoutDate };
}

function payPeriodKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function renderIncomeGroupedByPayPeriod(rows) {
  const groups = new Map();

  rows.forEach((row) => {
    const period = getPayPeriod(row.income_date);
    const key = payPeriodKey(period.start);

    if (!groups.has(key)) {
      groups.set(key, { period, rows: [], total: 0 });
    }

    const group = groups.get(key);
    const amount = Number(row.income_amount || 0) + Number(row.tips_amount || 0);
    group.rows.push(row);
    group.total += amount;
  });

  const sortedKeys = [...groups.keys()].sort((a, b) => (a < b ? 1 : -1));

  return sortedKeys.map((key) => {
    const group = groups.get(key);
    const rangeLabel = `${shortDateLabelFor(group.period.start)} \u2013 ${shortDateLabelFor(group.period.end)}`;
    const payoutLabel = shortDateLabelFor(group.period.payoutDate);

    const rowsHtml = group.rows.map((row) => `
      <div class="shift-row">
        <div>
          <span class="shift-date">${dateLabelFor(row.income_date)} - ${row.platform || "Platform"}</span>
          <span class="shift-meta">${row.tips_amount ? `Tips: ${formatCurrency(Number(row.tips_amount))}` : (row.notes || "")}</span>
        </div>
        <div class="shift-side">
          <span class="shift-pay">${formatCurrency(Number(row.income_amount || 0) + Number(row.tips_amount || 0))}</span>
        </div>
      </div>`).join("");

    return `
      <div class="pay-period-group">
        <div class="pay-period-header">
          <span class="pay-period-range">${rangeLabel}</span>
          <span class="pay-period-payout">Paid ${payoutLabel} · ${formatCurrency(group.total)}</span>
        </div>
        ${rowsHtml}
      </div>`;
  }).join("");
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
      .select("id,shift_date,platform,start_km,end_km,expected_pay,station_location,notes,block_start_time,block_hours,block_end_time,actual_end_time")
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
        <div class="shift-row shift-row-editable" data-shift-id="${row.id}">
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

    historyList.innerHTML = renderIncomeGroupedByPayPeriod(data);
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

// ---- Shift editing (from History > Shifts) ----

const editShiftFields = [
  { name: "platform_info", label: "", type: "static_info", value: "Amazon Flex · DLC8-Windsor", full: true },
  { name: "shift_date", label: "Date", type: "date", required: true },
  { name: "start_km", label: "Start km", type: "number", required: true, min: "0", step: "0.1" },
  { name: "end_km", label: "End km (leave blank if still open)", type: "number", min: "0", step: "0.1" },
  { name: "block_start_time", label: "Block start time", type: "time" },
  { name: "block_hours", label: "Block hours", type: "hours_quick" },
  { name: "block_end_time_preview", label: "Estimated block end time", type: "block_end_preview", full: true },
  { name: "actual_end_time", label: "Actual shift end time", type: "time" },
  { name: "expected_pay", label: "Expected pay", type: "number", min: "0", step: "0.01" },
  { name: "notes", label: "Notes", type: "textarea", full: true }
];

const editModal = document.getElementById("edit-modal");
const editForm = document.getElementById("edit-form");
const editFormFields = document.getElementById("edit-form-fields");
const editFormStatus = document.getElementById("edit-form-status");
const editShiftIdInput = document.getElementById("edit-shift-id");
const editSubmitButton = editForm.querySelector(".submit-button");

function closeEditModal() {
  editModal.classList.remove("open");
  editModal.setAttribute("aria-hidden", "true");
}

async function openEditShift(shiftId) {
  const { data: row, error } = await supabaseClient
    .from("shift_entries")
    .select("id,shift_date,start_km,end_km,expected_pay,notes,block_start_time,block_hours,block_end_time,actual_end_time")
    .eq("id", shiftId)
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error || !row) {
    return;
  }

  editFormFields.innerHTML = editShiftFields.map(renderField).join("");
  editShiftIdInput.value = row.id;
  editFormStatus.textContent = "Editing this shift.";
  editModal.classList.add("open");
  editModal.setAttribute("aria-hidden", "false");
  setupBlockHoursUI(editForm);

  editShiftFields.forEach((field) => {
    if (field.type === "static_info" || field.type === "block_end_preview") {
      return;
    }
    const input = editForm.querySelector(`[name="${field.name}"]`);
    if (input && row[field.name] !== null && row[field.name] !== undefined) {
      input.value = row[field.name];
    }
  });

  if (row.block_end_time) {
    const preview = document.getElementById("block-end-time-preview");
    const hiddenEnd = document.getElementById("block-end-time-hidden");
    if (preview) preview.textContent = formatTimeLabel(row.block_end_time);
    if (hiddenEnd) hiddenEnd.value = row.block_end_time;
  }
}

historyList.addEventListener("click", (event) => {
  const row = event.target.closest(".shift-row-editable");
  if (!row) {
    return;
  }
  openEditShift(row.dataset.shiftId);
});

document.querySelectorAll("#edit-modal [data-close]").forEach((button) => {
  button.addEventListener("click", closeEditModal);
});

editModal.addEventListener("click", (event) => {
  if (event.target === editModal) {
    closeEditModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && editModal.classList.contains("open")) {
    closeEditModal();
  }
});

editForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    return;
  }

  const formData = Object.fromEntries(new FormData(editForm).entries());
  const value = (name) => (formData[name] === "" ? null : formData[name]);

  const payload = {
    shift_date: value("shift_date"),
    start_km: value("start_km"),
    end_km: value("end_km"),
    block_start_time: value("block_start_time"),
    block_hours: value("block_hours"),
    block_end_time: value("block_end_time"),
    actual_end_time: value("actual_end_time"),
    expected_pay: value("expected_pay"),
    notes: value("notes")
  };

  editSubmitButton.disabled = true;
  editFormStatus.textContent = "Saving...";

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/shift_entries?id=eq.${formData.id}`, {
      method: "PATCH",
      headers: supabaseHeaders("return=minimal"),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Could not save changes");
    }

    editFormStatus.textContent = "Saved.";
    await loadTab(activeTab);
    closeEditModal();
  } catch (error) {
    editFormStatus.textContent = error.message || "Could not save changes.";
  } finally {
    editSubmitButton.disabled = false;
  }
});

initApp({
  onSignedIn: async () => {
    await loadTab(activeTab);
  },
  onSignedOut: () => {
    historyList.innerHTML = '<p class="shift-empty">Please log in first.</p>';
  }
});
