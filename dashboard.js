// Gig Work Hub - Dashboard page logic (entry logging, totals, recent shifts).

const entryForms = {
  start_shift: {
    title: "Start Shift",
    table: "shift_entries",
    status: "Log your starting kilometres before the first delivery.",
    fields: [
      { name: "platform_info", label: "", type: "static_info", value: "Amazon Flex · DLC8-Windsor", full: true },
      { name: "shift_date", label: "Date", type: "date", required: true },
      { name: "start_km", label: "Start km", type: "number", required: true, min: "0", step: "0.1" },
      { name: "block_start_time", label: "Block start time", type: "time", required: true },
      { name: "block_hours", label: "Block hours", type: "hours_quick", required: true },
      { name: "block_end_time_preview", label: "Estimated block end time", type: "block_end_preview", full: true },
      { name: "expected_pay", label: "Expected pay (optional)", type: "number", min: "0", step: "0.01" },
      { name: "notes", label: "Notes", type: "textarea", full: true }
    ]
  },
  end_shift: {
    title: "End Shift",
    table: "shift_entries",
    mode: "update_open_shift",
    status: "Close the open shift for this rider and date.",
    fields: [
      { name: "platform_info", label: "", type: "static_info", value: "Amazon Flex · DLC8-Windsor", full: true },
      { name: "shift_date", label: "Date", type: "date", required: true },
      { name: "end_km", label: "End km", type: "number", required: true, min: "0", step: "0.1" },
      { name: "notes", label: "Shift notes", type: "textarea", full: true }
    ]
  },
  fuel: {
    title: "Fuel Entry",
    table: "fuel_entries",
    status: "Record fuel details for your rider log.",
    fields: [
      { name: "shift_date", label: "Date", type: "date", required: true },
      { name: "fuel_litres", label: "Litres", type: "number", min: "0", step: "0.01" },
      { name: "fuel_cost", label: "Fuel cost", type: "number", required: true, min: "0", step: "0.01" },
      { name: "odometer_km", label: "Odometer km", type: "number", min: "0", step: "0.1" },
      { name: "notes", label: "Receipt or notes", type: "textarea", full: true }
    ]
  },
  repair: {
    title: "Repair Entry",
    table: "repair_entries",
    status: "Track maintenance, service, and rider gear.",
    fields: [
      { name: "shift_date", label: "Date", type: "date", required: true },
      { name: "repair_type", label: "Repair type", type: "select", required: true, options: ["Oil", "Tires", "Brakes", "Battery", "Bike service", "Car service", "Gear", "Other"] },
      { name: "repair_cost", label: "Cost", type: "number", required: true, min: "0", step: "0.01" },
      { name: "notes", label: "Receipt or notes", type: "textarea", full: true }
    ]
  },
  income: {
    title: "Platform Income",
    table: "income_entries",
    status: "Log Amazon Flex payouts and tips.",
    fields: [
      { name: "platform_info", label: "", type: "static_info", value: "Amazon Flex", full: true },
      { name: "shift_date", label: "Date", type: "date", required: true },
      { name: "income_amount", label: "Income", type: "number", required: true, min: "0", step: "0.01" },
      { name: "tips_amount", label: "Tips", type: "number", min: "0", step: "0.01" },
      { name: "notes", label: "Notes", type: "textarea", full: true }
    ]
  },
  income_tips: {
    title: "Add Tips",
    table: "income_entries",
    tipsOnly: true,
    status: "Pay was already logged when you started this shift — add any tips here.",
    fields: [
      { name: "platform_info", label: "", type: "static_info", value: "Amazon Flex", full: true },
      { name: "shift_date", label: "Date", type: "date", required: true },
      { name: "tips_amount", label: "Tips", type: "number", required: true, min: "0", step: "0.01" },
      { name: "notes", label: "Notes", type: "textarea", full: true }
    ]
  }
};

const dateElement = document.getElementById("today-date");
if (dateElement) {
  dateElement.textContent = new Date().toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

const modal = document.getElementById("entry-modal");
const modalTitle = document.getElementById("modal-title");
const entryForm = document.getElementById("entry-form");
const entryType = document.getElementById("entry-type");
const formFields = document.getElementById("form-fields");
const formStatus = document.getElementById("form-status");
const submitButton = entryForm.querySelector(".submit-button");
const totalKm = document.getElementById("total-km");
const totalEarnings = document.getElementById("total-earnings");
const totalShifts = document.getElementById("total-shifts");
const shiftList = document.getElementById("shift-list");

async function loadDashboardTotals() {
  if (!currentUser) {
    renderDashboardTotals({ kilometres: 0, earnings: 0, shifts: 0 });
    return;
  }

  const [shiftResult, incomeResult] = await Promise.all([
    supabaseClient
      .from("shift_entries")
      .select("start_km,end_km")
      .eq("user_id", currentUser.id)
      .not("start_km", "is", null)
      .not("end_km", "is", null),
    supabaseClient
      .from("income_entries")
      .select("income_amount,tips_amount")
      .eq("user_id", currentUser.id)
  ]);

  if (shiftResult.error || incomeResult.error) {
    totalKm.textContent = "--";
    totalEarnings.textContent = "--";
    totalShifts.textContent = "--";
    return;
  }

  const kilometres = shiftResult.data.reduce((sum, row) => {
    const start = Number(row.start_km);
    const end = Number(row.end_km);
    return Number.isFinite(start) && Number.isFinite(end) && end >= start
      ? sum + (end - start)
      : sum;
  }, 0);

  const earnings = incomeResult.data.reduce((sum, row) => {
    const income = Number(row.income_amount) || 0;
    const tips = Number(row.tips_amount) || 0;
    return sum + income + tips;
  }, 0);

  renderDashboardTotals({
    kilometres,
    earnings,
    shifts: shiftResult.data.length
  });
}

function renderDashboardTotals(totals) {
  totalKm.textContent = `${formatNumber(totals.kilometres)} km`;
  totalEarnings.textContent = formatCurrency(totals.earnings);
  totalShifts.textContent = formatNumber(totals.shifts);
}

async function loadRecentShifts() {
  if (!currentUser) {
    renderShiftList([]);
    return;
  }

  const { data, error } = await supabaseClient
    .from("shift_entries")
    .select("id,shift_date,platform,start_km,end_km,expected_pay,station_location")
    .eq("user_id", currentUser.id)
    .order("shift_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    shiftList.innerHTML = '<p class="shift-empty">Could not load recent shifts.</p>';
    return;
  }

  renderShiftList(data);
}

function renderShiftList(rows) {
  if (!rows.length) {
    shiftList.innerHTML = '<p class="shift-empty">No shifts logged yet. Start one above.</p>';
    return;
  }

  shiftList.innerHTML = rows.map((row) => {
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
    const dateLabel = new Date(`${row.shift_date}T00:00:00`).toLocaleDateString("en-CA", {
      weekday: "short",
      month: "short",
      day: "numeric"
    });

    return `
      <div class="shift-row">
        <div>
          <span class="shift-date">${dateLabel} - ${row.platform || "Platform"}</span>
          <span class="shift-meta">${locationLabel}</span>
        </div>
        <div class="shift-side">
          <span class="shift-pay">${payLabel}</span>
          <span class="shift-status${isOpen ? " open" : ""}">${isOpen ? "Open" : kmLabel}</span>
        </div>
      </div>`;
  }).join("");
}

async function insertEntry(table, payload) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: supabaseHeaders("return=minimal"),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Supabase insert failed");
  }
}

async function closeOpenShift(payload) {
  const params = new URLSearchParams({
    select: "id,expected_pay",
    user_id: `eq.${currentUser.id}`,
    rider_name: `eq.${payload.rider_name}`,
    platform: `eq.${payload.platform}`,
    shift_date: `eq.${payload.shift_date}`,
    end_km: "is.null",
    order: "created_at.desc",
    limit: "1"
  });

  const lookup = await fetch(`${SUPABASE_URL}/rest/v1/shift_entries?${params.toString()}`, {
    headers: supabaseHeaders()
  });

  if (!lookup.ok) {
    const message = await lookup.text();
    throw new Error(message || "Could not find open shift");
  }

  const matches = await lookup.json();
  if (!matches.length) {
    throw new Error("No open shift found for this rider, date, and platform");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/shift_entries?id=eq.${matches[0].id}`, {
    method: "PATCH",
    headers: supabaseHeaders("return=minimal"),
    body: JSON.stringify({
      end_km: payload.end_km,
      notes: payload.notes
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Could not close shift");
  }

  return matches[0];
}

function openEntryForm(type, prefill) {
  const config = entryForms[type];
  if (!config) {
    return;
  }

  modalTitle.textContent = config.title;
  entryType.value = type;
  formStatus.textContent = prefill
    ? "Pre-filled from your closed shift. Confirm the amount, add tips, and save."
    : config.status;
  formFields.innerHTML = config.fields.map(renderField).join("");
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  setDefaultDate();
  setupBlockHoursUI();

  if (prefill) {
    Object.entries(prefill).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        return;
      }
      const field = entryForm.querySelector(`[name="${key}"]`);
      if (field) {
        field.value = value;
      }
    });
  }
}

function closeEntryForm() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  entryForm.reset();
}

function setDefaultDate() {
  const dateField = entryForm.querySelector('[name="shift_date"]');
  if (dateField && !dateField.value) {
    dateField.value = new Date().toISOString().slice(0, 10);
  }
}

function buildSupabasePayload(config, data) {
  const value = (key) => data[key] === "" ? null : data[key];
  const base = {
    user_id: currentUser.id,
    rider_name: currentRiderName,
    notes: value("notes")
  };

  if (config.table === "shift_entries") {
    const payload = {
      ...base,
      shift_date: value("shift_date"),
      platform: "Amazon Flex"
    };

    if (data.entry_type === "end_shift") {
      return {
        ...payload,
        end_km: value("end_km")
      };
    }

    return {
      ...payload,
      entry_type: value("entry_type"),
      start_km: value("start_km"),
      station_location: "DLC8-Windsor",
      block_start_time: value("block_start_time"),
      block_hours: value("block_hours"),
      block_end_time: value("block_end_time"),
      expected_pay: value("expected_pay"),
      end_km: null
    };
  }

  if (config.table === "fuel_entries") {
    return {
      ...base,
      fuel_date: value("shift_date"),
      odometer_km: value("odometer_km"),
      fuel_litres: value("fuel_litres"),
      fuel_cost: value("fuel_cost")
    };
  }

  if (config.table === "repair_entries") {
    return {
      ...base,
      repair_date: value("shift_date"),
      repair_type: value("repair_type"),
      repair_cost: value("repair_cost")
    };
  }

  return {
    ...base,
    income_date: value("shift_date"),
    platform: "Amazon Flex",
    income_amount: config.tipsOnly ? 0 : value("income_amount"),
    tips_amount: value("tips_amount")
  };
}

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

function setupBlockHoursUI() {
  const startInput = entryForm.querySelector('[name="block_start_time"]');
  const hoursInput = entryForm.querySelector('[name="block_hours"]');
  const hiddenEnd = document.getElementById("block-end-time-hidden");
  const preview = document.getElementById("block-end-time-preview");
  const quickButtons = entryForm.querySelectorAll(".hours-quick-btn");

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

document.querySelectorAll("[data-entry]").forEach((button) => {
  button.addEventListener("click", () => openEntryForm(button.dataset.entry));
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", closeEntryForm);
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeEntryForm();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("open")) {
    closeEntryForm();
  }
});

entryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser || !currentRiderName) {
    formStatus.textContent = "Please log in before saving entries.";
    return;
  }

  const config = entryForms[entryType.value];
  if (!config) {
    formStatus.textContent = "Choose an entry type first.";
    return;
  }

  const formData = Object.fromEntries(new FormData(entryForm).entries());
  const payload = buildSupabasePayload(config, formData);
  submitButton.disabled = true;
  formStatus.textContent = "Saving to Supabase...";

  try {
    if (config.mode === "update_open_shift") {
      await closeOpenShift(payload);
      formStatus.textContent = "Saved. You can close this form or add another entry.";
      entryForm.reset();
      setDefaultDate();
      await loadDashboardTotals();
      await loadRecentShifts();
      closeEntryForm();
      openEntryForm("income_tips", {
        shift_date: payload.shift_date,
        platform: payload.platform
      });
      return;
    }

    await insertEntry(config.table, payload);

    if (entryType.value === "start_shift" && payload.expected_pay !== null && payload.expected_pay !== undefined) {
      await insertEntry("income_entries", {
        user_id: currentUser.id,
        rider_name: currentRiderName,
        income_date: payload.shift_date,
        platform: payload.platform,
        income_amount: payload.expected_pay,
        tips_amount: 0,
        notes: "Auto-logged from Start Shift (pay known upfront)"
      });
    }

    formStatus.textContent = "Saved. You can close this form or add another entry.";
    entryForm.reset();
    setDefaultDate();
    await loadDashboardTotals();
    await loadRecentShifts();
  } catch (error) {
    formStatus.textContent = error.message || "Could not save. Confirm the Supabase tables and policies are set up.";
  } finally {
    submitButton.disabled = false;
  }
});

initApp({
  onSignedIn: async () => {
    await loadDashboardTotals();
    await loadRecentShifts();
  },
  onSignedOut: () => {
    renderDashboardTotals({ kilometres: 0, earnings: 0, shifts: 0 });
    renderShiftList([]);
  }
});
