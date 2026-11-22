# Changelog

## 1.5.0 — 2026-11-22

Shops inside shopping centres.

- BIG Fashion Glilot: all 160 shops, restaurants and cafés from the centre's own directory are on the map, each at its unit, with its floor ("BIG Fashion Glilot, first floor") and the Hebrew and English name. Shops that were already on the map got the floor and moved to their unit; nothing appears twice.
- The directory does not include opening hours, so these places are listed under "hours unknown" until hours are added.
- `tools/malls.py` turns a centre's indoor-map export into a small facts file (`data/malls/<centre>.json`: names, kind, floor, position, phone, website; no map drawings or logos). The nightly data update merges every file in `data/malls/`, so more centres can be added the same way.
- The shop card shows the centre and floor in the user's language; "the shopping centre's directory" is listed among the sources.

## 1.4.0 — 2026-11-21

Accounts, and moderation by staff.

- Browsing stays open to everyone. Adding shops, fixing hours and reporting open, closed or parking now needs an account. A guest who taps one of these sees why, and the sign-in panel opens.
- New account panel (👤): sign up with a username, email and password, sign in with email and password, «Forgot your password?» sends a reset link. Usernames are 3–20 letters (Hebrew, Russian or English), digits, `_ . -`, and must be unique. Supabase sends one email at sign-up to confirm the address. The old one-time sign-in link is gone.
- Accounts made earlier with the email link choose a username in the same panel.
- Staff roles: admins can rename or delete shops added by people, hide any shop from the map (staff still see it, marked, and can bring it back), reset fixed hours and clear open/closed and parking reports. Removing something takes two taps. The superadmin also sees the staff list and gives or takes admin rights by username.
- The database enforces all of this (row-level security, `supabase/migrations/20261121160000_accounts_roles.sql`). Clients can no longer set the time or author of a report, so a report dated in the future can no longer pin a shop as closed. The "Other shop" type in the add form is accepted by the database again; before, such shops were refused.

## 1.3.0 — 2026-11-21

Easier on phones.

- Adding a shop is a separate, step-by-step mode. A "+" button on the map starts it. Step 1 shows only the map with a pin fixed in the middle: move the map until the pin sits on the shop, then press «Here» (it starts at your location). Step 2 is a compact form under the map, with the pin still visible; it stays above the on-screen keyboard. The pin can be dragged or moved by tapping the map; Esc or × cancels. Before, the hint and the form ended up below the edge of the screen, under the list and the ad.
- First screen: the open count and the city share one line, notices (Shabbat, location) take one line and expand on tap, the ad banner takes one line. On an iPhone SE the first shop is now on screen without scrolling.
- Map buttons no longer slide under the list or into the 3D button.
- While a popup on the map is open (parking, payment) the list slides away on phones and comes back when it closes, so the popup's buttons are never under it. The layers menu no longer opens under the top pill.
- Bigger touch targets: language switch, account and theme buttons, category chips, the list handle, close buttons.
- The form's «Add to the map» button is styled as the main action.
- Close (×) buttons are announced in the current language by screen readers.
- Location on iPhone: the app no longer asks for the location by itself when it opens (only when it was already allowed). A prompt that appears before any tap is easily refused, and Safari then remembers the refusal, so later taps on ➤ failed without asking. Now the question comes when you tap ➤.
- When GPS cannot get a fix in time (often indoors), the app asks once more for the quicker network-based position instead of failing.
- If location access is blocked, the message says how to allow it (on iPhone: the Location Services and Safari website settings) instead of a generic error, and it shows in full even when only the map or a map popup is open (the popup closes so the message is seen). The English text of this message was missing.
- Hebrew place names on the map read right to left again (for example «קריית ים», not «מי תיירק»). The map now loads the right-to-left text plugin (`vendor/mapbox-gl-rtl-text.js`, @mapbox/mapbox-gl-rtl-text 0.3.0).

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
- The button opens the app's page in Google Play or the App Store, where «Open» launches the installed app (or «Install» if it is missing); the note under the buttons says so. The app does not pick the zone for you: check the zone and your plate before paying. No payment data passes through בטוח? פתוח!.
- Map popups now pan into the visible part of the map (between the top bar and the list) and lower the list on phones, so the payment buttons are not hidden under it. On very small screens (iPhone SE size) the full popup before a report is taller than the free map area: the payment buttons show after you report, or when you drag the list down.
- In dark mode the parking popup's notes use the theme colours; the payment popup closes when the parking layer is turned off.
- Version number shown in the footer.

## 1.0.0 — 2026-11-18

- First versioned beta: map and list of open shops, check-ins, parking reports, shade layer, Shabbat and holidays, Hebrew, Russian and English, light and dark themes.
