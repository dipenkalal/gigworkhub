// Gig Work Hub - Tax Summary page logic.

const taxYearSelect = document.getElementById("tax-year");
const taxStats = document.getElementById("tax-stats");
let currentTaxData = null;
let currentTaxYear = null;

function populateYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push(y);
  }
  taxYearSelect.innerHTML = years.map((y) => `<option value="${y}">${y}</option>`).join("");
  taxYearSelect.value = String(currentYear);
}

async function loadTaxSummary(year) {
  if (!currentUser) {
    taxStats.innerHTML = '<p class="shift-empty">Please log in first.</p>';
    return;
  }

  currentTaxYear = year;
  currentTaxData = null;
  taxStats.innerHTML = '<p class="shift-empty">Loading...</p>';

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const [shiftResult, incomeResult, fuelResult, repairResult] = await Promise.all([
    supabaseClient.from("shift_entries")
      .select("shift_date,platform,start_km,end_km,station_location,expected_pay,notes")
      .eq("user_id", currentUser.id).gte("shift_date", startDate).lte("shift_date", endDate),
    supabaseClient.from("income_entries")
      .select("income_date,platform,income_amount,tips_amount,notes")
      .eq("user_id", currentUser.id).gte("income_date", startDate).lte("income_date", endDate),
    supabaseClient.from("fuel_entries")
      .select("fuel_date,fuel_litres,fuel_cost,odometer_km,notes")
      .eq("user_id", currentUser.id).gte("fuel_date", startDate).lte("fuel_date", endDate),
    supabaseClient.from("repair_entries")
      .select("repair_date,repair_type,repair_cost,notes")
      .eq("user_id", currentUser.id).gte("repair_date", startDate).lte("repair_date", endDate)
  ]);

  if (shiftResult.error || incomeResult.error || fuelResult.error || repairResult.error) {
    taxStats.innerHTML = '<p class="shift-empty">Could not load summary. Check your Supabase tables.</p>';
    return;
  }

  currentTaxData = {
    shifts: shiftResult.data,
    income: incomeResult.data,
    fuel: fuelResult.data,
    repairs: repairResult.data
  };

  renderTaxStats(currentTaxData);
}

function summarizeTaxData(taxData) {
  const kilometres = taxData.shifts.reduce((sum, row) => {
    const start = Number(row.start_km);
    const end = Number(row.end_km);
    return Number.isFinite(start) && Number.isFinite(end) && end >= start ? sum + (end - start) : sum;
  }, 0);

  const closedShifts = taxData.shifts.filter((row) => row.end_km !== null && row.end_km !== undefined).length;

  const incomeByPlatform = {};
  let incomeTotal = 0;
  let tipsTotal = 0;
  taxData.income.forEach((row) => {
    const income = Number(row.income_amount) || 0;
    const tips = Number(row.tips_amount) || 0;
    incomeTotal += income;
    tipsTotal += tips;
    const platform = row.platform || "Other";
    incomeByPlatform[platform] = (incomeByPlatform[platform] || 0) + income + tips;
  });

  const fuelTotal = taxData.fuel.reduce((sum, row) => sum + (Number(row.fuel_cost) || 0), 0);
  const repairTotal = taxData.repairs.reduce((sum, row) => sum + (Number(row.repair_cost) || 0), 0);
  const netIncome = incomeTotal + tipsTotal - fuelTotal - repairTotal;

  return { kilometres, closedShifts, incomeByPlatform, incomeTotal, tipsTotal, fuelTotal, repairTotal, netIncome };
}

function renderTaxStats(taxData) {
  const summary = summarizeTaxData(taxData);

  const platformRows = Object.entries(summary.incomeByPlatform)
    .sort((a, b) => b[1] - a[1])
    .map(([platform, amount]) => `<div class="tax-row sub"><span>${platform}</span><span>${formatCurrency(amount)}</span></div>`)
    .join("");

  taxStats.innerHTML = `
    <div class="tax-row"><span>Business kilometres</span><span>${formatNumber(summary.kilometres)} km</span></div>
    <div class="tax-row"><span>Closed shifts</span><span>${formatNumber(summary.closedShifts)}</span></div>
    <div class="tax-row"><span>Gross income (incl. tips)</span><span>${formatCurrency(summary.incomeTotal + summary.tipsTotal)}</span></div>
    ${platformRows}
    <div class="tax-row"><span>Fuel expenses</span><span>${formatCurrency(summary.fuelTotal)}</span></div>
    <div class="tax-row"><span>Repairs &amp; maintenance</span><span>${formatCurrency(summary.repairTotal)}</span></div>
    <div class="tax-row total"><span>Net income</span><span>${formatCurrency(summary.netIncome)}</span></div>
  `;
}

function csvEscape(value) {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function buildSummaryCsv(taxData, year) {
  const summary = summarizeTaxData(taxData);

  const rows = [
    ["Category", "Amount"],
    ["Tax year", year],
    ["Business kilometres", summary.kilometres.toFixed(1)],
    ["Closed shifts", summary.closedShifts],
    ["Gross income (incl. tips)", (summary.incomeTotal + summary.tipsTotal).toFixed(2)]
  ];

  Object.entries(summary.incomeByPlatform).forEach(([platform, amount]) => {
    rows.push([`  Income - ${platform}`, amount.toFixed(2)]);
  });

  rows.push(["Fuel expenses", summary.fuelTotal.toFixed(2)]);
  rows.push(["Repairs and maintenance", summary.repairTotal.toFixed(2)]);
  rows.push(["Net income", summary.netIncome.toFixed(2)]);

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function buildDetailedCsv(taxData) {
  const header = ["Date", "Type", "Platform", "Detail", "Amount", "Notes"];
  const body = [];

  taxData.shifts.forEach((row) => {
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

  taxData.income.forEach((row) => {
    body.push([
      row.income_date,
      "Income",
      row.platform || "",
      row.tips_amount ? `Payout + tips ${Number(row.tips_amount).toFixed(2)}` : "Payout",
      (Number(row.income_amount || 0) + Number(row.tips_amount || 0)).toFixed(2),
      row.notes || ""
    ]);
  });

  taxData.fuel.forEach((row) => {
    body.push([
      row.fuel_date,
      "Fuel",
      "",
      `${row.fuel_litres || ""} L at odometer ${row.odometer_km || ""} km`.trim(),
      Number(row.fuel_cost || 0).toFixed(2),
      row.notes || ""
    ]);
  });

  taxData.repairs.forEach((row) => {
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

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

taxYearSelect.addEventListener("change", () => {
  loadTaxSummary(Number(taxYearSelect.value));
});

document.getElementById("download-summary-csv").addEventListener("click", () => {
  if (!currentTaxData) {
    return;
  }
  downloadCsv(`gig-work-hub-summary-${currentTaxYear}.csv`, buildSummaryCsv(currentTaxData, currentTaxYear));
});

document.getElementById("download-detailed-csv").addEventListener("click", () => {
  if (!currentTaxData) {
    return;
  }
  downloadCsv(`gig-work-hub-detailed-${currentTaxYear}.csv`, buildDetailedCsv(currentTaxData));
});

populateYears();

initApp({
  onSignedIn: async () => {
    await loadTaxSummary(Number(taxYearSelect.value));
  },
  onSignedOut: () => {
    taxStats.innerHTML = '<p class="shift-empty">Please log in first.</p>';
  }
});
