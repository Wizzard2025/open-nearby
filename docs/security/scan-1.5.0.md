# Release scan 1.5.0

Quality gate **Strict (open-nearby)**: **OK**

| Condition | Actual | Fails when | Status |
|---|---|---|---|
| new_duplicated_lines_density | 0.0 | GT 3 | OK |
| duplicated_lines_density | 0.0 | GT 3 | OK |
| blocker_violations | 0 | GT 0 | OK |
| new_software_quality_maintainability_rating | 1 | GT 1 | OK |
| new_software_quality_reliability_rating | 1 | GT 1 | OK |
| new_software_quality_security_rating | 1 | GT 1 | OK |
| new_violations | 0 | GT 0 | OK |
| software_quality_maintainability_rating | 1 | GT 1 | OK |
| software_quality_reliability_rating | 1 | GT 1 | OK |
| software_quality_security_rating | 1 | GT 1 | OK |

Lines of code: 5133. Open issues: 548. Hotspots to review: 0.

Open issues by quality: maintainability 548.
Most frequent rules: javascript:S121 (303), javascript:S2681 (22), css:S4664 (18), python:S3776 (17), python:S7498 (16), javascript:S134 (15), javascript:S6582 (14), javascript:S3776 (13).

Recorded reviews applied (tools/sonar/reviews.json): 0 hotspots, 1 false positives.

SonarQube 26.11.0.134175, profile "Strict (open-nearby)", scanner 12.4.0.4321_8.4.0.

# Dependency check

| Package | Version | Ecosystem | Where |
|---|---|---|---|
| maplibre-gl | 5.24.1 | npm | index.html:29 (CDN) |
| maplibre-gl | 5.24.1 | npm | index.html:177 (CDN) |
| @supabase/supabase-js | 2.118.0 | npm | index.html:180 (CDN) |
| opening_hours | 3.14.0 | npm | index.html:179 (vendored vendor/opening_hours.js) |
| suncalc | 1.9.0 | npm | index.html:178 (vendored vendor/suncalc.js) |
| @mapbox/mapbox-gl-rtl-text | 0.3.0 | npm | app.js:391 (vendored vendor/mapbox-gl-rtl-text.js) |
| actions/checkout | 4.4.0 | GitHub Actions | .github/workflows/deploy.yml:15 (workflow) |
| actions/setup-python | 5.6.0 | GitHub Actions | .github/workflows/deploy.yml:16 (workflow) |
| actions/upload-pages-artifact | 3.0.1 | GitHub Actions | .github/workflows/deploy.yml:30 (workflow) |
| actions/deploy-pages | 4.0.5 | GitHub Actions | .github/workflows/deploy.yml:38 (workflow) |
| duckdb | 2.0.0 | PyPI | .github/workflows/deploy.yml:23 (workflow) |

Findings: 0


Reviewed advisories (not counted; valid only for this exact version):

- GHSA-jrc7-96c5-q579 on maplibre-gl@5.24.1 (index.html:29): OSV marks every version below 6.4.1 as affected, but 5.24.1 (latest-5 line) ships a rewritten DOM.sanitize(): an element/attribute allow list that iterates a snapshot from getAttributeNames(), so the live NamedNodeMap skip is gone. 6.x is ESM-only and would need the app to switch to ES modules. Evidence: https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.1/src/util/dom.ts (sanitize, removeDisallowedAttributes)
- GHSA-jrc7-96c5-q579 on maplibre-gl@5.24.1 (index.html:177): OSV marks every version below 6.4.1 as affected, but 5.24.1 (latest-5 line) ships a rewritten DOM.sanitize(): an element/attribute allow list that iterates a snapshot from getAttributeNames(), so the live NamedNodeMap skip is gone. 6.x is ESM-only and would need the app to switch to ES modules. Evidence: https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.1/src/util/dom.ts (sanitize, removeDisallowedAttributes)

