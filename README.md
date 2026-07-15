# Gig Work Hub

Mobile-first rider logbook for gig workers. The static site runs on GitHub Pages, uses Supabase Auth for one-time phone login, and saves entries directly to Supabase.

## Supabase Setup

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Paste and run the contents of `supabase-schema.sql`.
4. Confirm these tables were created:
   - `rider_profiles`
   - `shift_entries`
   - `fuel_entries`
   - `repair_entries`
   - `income_entries`
5. In **Authentication > Providers**, make sure **Email** is enabled.
6. Open the GitHub Pages site, create one account for each rider, and submit a test entry.

Run the SQL again whenever `supabase-schema.sql` changes. It is safe to rerun; it uses `if not exists` for tables and recreates policies.

The frontend is configured in `index.html`:

```js
const SUPABASE_URL = "https://oumtpyrydlczmhxagbcq.supabase.co";
const SUPABASE_KEY = "sb_publishable_zeny0sgq0oB5LvK2iTEAdw_rqBoFVXE";
```

## Login Behavior

Each rider logs in once on their phone. Supabase stores the session in that phone browser, so the rider can keep adding entries until they log out, clear browser data, or the Supabase session expires.

Each row includes `user_id` and `rider_name`. Row level security only allows authenticated users to read, insert, and close their own shift rows.

## Dashboard Totals

The dashboard is user-specific:

- completed kilometres = sum of `end_km - start_km` from closed shift rows
- earnings = sum of `income_amount + tips_amount`
- closed shifts = count of completed shift rows

## Why Separate Tables?

Odometer readings are intentionally separated:

- `shift_entries.start_km` and `shift_entries.end_km` are only for shift start/end records.
- `Start Shift` creates an open shift row.
- `End Shift` finds the latest open row for the same rider, date, and platform, then updates its `end_km`.
- `fuel_entries.odometer_km` is only for fuel stops.
- repairs and income never touch shift odometer fields.

This prevents a fuel odometer reading from being treated like an end-shift odometer reading.

## Amazon Flex Only

The app no longer asks which gig platform or station you're at — every shift and income row is saved with `platform = "Amazon Flex"` and `station_location = "DLC8-Windsor"` automatically.

Start Shift now also asks for:

- **Block start time** — a time picker
- **Block hours** — quick-select 3 or 3.5 hrs, or type any custom value
- An **estimated block end time** is calculated automatically from those two and saved as `block_end_time`

Before deploying this version, add the new columns to `shift_entries` in the Supabase SQL editor:

```sql
alter table shift_entries add column if not exists block_start_time text;
alter table shift_entries add column if not exists block_hours numeric;
alter table shift_entries add column if not exists block_end_time text;
alter table shift_entries add column if not exists actual_end_time text;
```

End Shift now pulls in the matching open shift automatically (no need to re-type the date/platform to find it): it prefills the date, start km, and expected pay from what you entered on Start Shift, and all three stay editable in case something needs correcting. It also asks for the **actual shift end time** — this is the real end time you record, separate from the estimated end time shown on Start Shift. If pay wasn't filled in when the shift started, filling it in here logs the income entry automatically.

## No PIN Gate

The soft PIN gate has been removed entirely. Access control is Supabase Auth (owner-created accounts only) plus Row Level Security — there's no PIN to keep in sync anymore.

## Edit Rider Names

Open `index.html` and update this array:

```js
const RIDER_NAMES = ["Dipen Kalal", "Smeet Desai"];
```
