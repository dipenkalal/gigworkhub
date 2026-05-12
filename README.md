# Gig Work Hub

Mobile-first rider logbook for gig workers. The static site runs on GitHub Pages and posts entries to Google Sheets through a Google Apps Script web app.

## Connect Google Sheets

1. Create or open the Google Spreadsheet you want to use.
2. Go to **Extensions > Apps Script**.
3. Paste the contents of `apps-script.gs` into the script editor.
4. Save the project.
5. Click **Deploy > New deployment**.
6. Select **Web app**.
7. Set **Execute as** to **Me**.
8. Set **Who has access** to **Anyone**.
9. Deploy and copy the Web app URL.
10. Open `index.html` and paste that URL into:

```js
const SCRIPT_URL = "";
```

After that, the in-page forms will append rows to the `GigWorkHub` sheet tab.

## Edit Rider Names

Open `index.html` and update this array:

```js
const RIDER_NAMES = ["Dipen", "Other"];
```
