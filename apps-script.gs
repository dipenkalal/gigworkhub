const SHEET_NAME = "GigWorkHub";
const HEADERS = [
  "submitted_at",
  "entry_type",
  "shift_date",
  "platform",
  "start_km",
  "end_km",
  "fuel_litres",
  "fuel_cost",
  "repair_type",
  "repair_cost",
  "income_amount",
  "tips_amount",
  "notes"
];

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    const sheet = getSheet();
    ensureHeaders(sheet);

    sheet.appendRow([
      new Date(),
      payload.entry_type || "",
      payload.shift_date || "",
      payload.platform || "",
      payload.start_km || "",
      payload.end_km || "",
      payload.fuel_litres || "",
      payload.fuel_cost || "",
      payload.repair_type || "",
      payload.repair_cost || "",
      payload.income_amount || "",
      payload.tips_amount || "",
      payload.notes || ""
    ]);

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}

function doGet() {
  return jsonResponse({ ok: true, service: "GigWorkHub sheet writer" });
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeaders(sheet) {
  const currentHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const needsHeaders = currentHeaders.every((value) => value === "");

  if (needsHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
