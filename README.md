# Gig Work Hub

Mobile-first rider logbook for gig workers. The static site runs on GitHub Pages and saves entries directly to Supabase.

## Supabase Setup

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Paste and run the contents of `supabase-schema.sql`.
4. Confirm these tables were created:
   - `shift_entries`
   - `fuel_entries`
   - `repair_entries`
   - `income_entries`
5. Open the GitHub Pages site and submit a test entry.

Run the SQL again whenever `supabase-schema.sql` changes. It is safe to rerun; it uses `if not exists` for tables and recreates policies.

The frontend is configured in `index.html`:

```js
const SUPABASE_URL = "https://oumtpyrydlczmhxagbcq.supabase.co";
const SUPABASE_KEY = "sb_publishable_zeny0sgq0oB5LvK2iTEAdw_rqBoFVXE";
```

## Why Separate Tables?

Odometer readings are intentionally separated:

- `shift_entries.start_km` and `shift_entries.end_km` are only for shift start/end records.
- `Start Shift` creates an open shift row.
- `End Shift` finds the latest open row for the same rider, date, and platform, then updates its `end_km`.
- `fuel_entries.odometer_km` is only for fuel stops.
- repairs and income never touch shift odometer fields.

This prevents a fuel odometer reading from being treated like an end-shift odometer reading.

## Edit Rider Names

Open `index.html` and update this array:

```js
const RIDER_NAMES = ["Dipen Kalal", "Smeet Desai"];
```
