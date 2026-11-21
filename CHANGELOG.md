# Changelog

## 1.2.0 — 2026-11-21

Security and quality release, checked by the new release scan (`tools/sonar/`: local SonarQube + OSV.dev CVE check).

- MapLibre GL 5.24.0 → 5.24.1: fixes an XSS in map attribution sanitising (CVE-2026-85061 / GHSA-jrc7-96c5-q579).
- All scripts and styles from CDNs now carry Subresource Integrity; the GoatCounter script is the pinned `count.v5.js`.
- The vector-tile reader rejects malformed tiles instead of looping for a very long time (tiles come from a third-party server).
- Opening-hours text, map links and imported store addresses no longer use regular expressions that slow down sharply on crafted input.
- Async work (map redraws, background loads, buttons) reports failures instead of leaving unhandled errors.
- Fixed: the shade layer's "sun has set" notice showed the route's wording; the map tooltip decoded "&amp;lt;" twice.
- Accessibility: labels for the add-a-shop fields and the layers menu, text for the ad form before the script loads.
- Build: GitHub Actions pinned to commit SHAs, least-privilege workflow permissions, `duckdb` pinned.

## 1.1.0 — 2026-11-21

- Parking: «Pay for parking» buttons for Pango and Cello in the parking popup. After you report a lot (free, busy or full), the popup reopens with these buttons.
- The button opens the app's page in Google Play or the App Store, where «Open» launches the installed app. The app does not pick the zone for you: check the zone and your plate before paying. No payment data passes through בטוח? פתוח!.
- Map popups now pan into the visible part of the map (between the top bar and the list) and lower the list on phones, so the payment buttons are not hidden under it.
- Version number shown in the footer.

## 1.0.0 — 2026-11-18

- First versioned beta: map and list of open shops, check-ins, parking reports, shade layer, Shabbat and holidays, Hebrew, Russian and English, light and dark themes.
