# Additional official chain sources (for Claude review)

Extends the existing standard-library scraper contract, last-good chain caches and merge logic. No UI or deployment changes. Current manual-source support is preserved.

| Publisher | Public source | Active source records | Precisely located in this seed | Waiting for a location |
|---|---|---:|---:|---:|
| AM:PM | https://www.ampm.co.il/branches/ | 55 | 3 | 52 |
| Good Pharm | https://goodpharm.co.il/allstores | 69 | 14 | 55 |

One explicitly permanently closed Good Pharm branch was excluded. The seed was extracted from the official pages observed on 2026-11-17 UTC / 18 November in Israel. Source text and per-branch URLs are retained. All 17 located branches have published hour rules. This is a seed, not complete geocoding coverage.

The included branch caches use only explicit publisher navigation coordinates or one unique same-chain OSM phone match. Seeding made no geocoding requests. Unlocated source records remain in `data/chains/*-unlocated.json`, rather than being placed at city centres. Those records are retained even when geocoding fails.

A dry merge against main revision `141383a180d43d0bd4ae5b942635e384d4cf048f` found 4 existing branches and added 13 points. Known-hour coverage increased by 14, from 1,534 to 1,548. The generated `data/shops.json` is deliberately not committed; Claude should review the source changes and run the existing updater on the Israeli machine. The source pages of older networks may block GitHub's US workers.

## Hours and provenance

- AM:PM uses each branch's actual 24/7 or numeric schedule, not a network-wide default.
- Good Pharm selects the current winter/summer schedule using Asia/Jerusalem timezone data.
- Relative Shabbat rules remain `unknown` for the relevant days; no fixed closing time is invented.
- `source:hours:url`, `source:hours:text`, and `check_date:opening_hours` survive a merge into an existing OSM point.
- Good Pharm is classified as `shop=chemist`; no unsupported assumption that every branch dispenses prescription medicines.

## Running

```sh
python -m unittest discover -s tests -v
python tools/update_data.py
```

On the Israeli machine, the existing updater can also use `--skip-osm` when `data/osm_raw.json` already exists. Both new fetchers are registered in the existing `FETCHERS` map; the nightly workflow already preserves `data/chains/`. They reuse the existing last-good fallback on source errors. Drops below 70% of the previous source or located branch count are rejected to avoid replacing good caches with partial responses.

Only unresolved branches invoke public Nominatim, sequentially, at most one request per 1.1 seconds, with a 15-second timeout and a circuit breaker after the first service error. A result must match the published house number, road, city and country. Legacy geocache entries without house-level provenance are not trusted for these sources. Unsuccessful locations are not negatively cached. Previously located branch caches are reused only if the source branch ID and address remain unchanged.

Tiv Taam returned HTTP 403 and is not included. Delek remains disabled unless the existing explicit consent condition is satisfied.

## Review scope

15 offline regression tests cover schedules, seasons, Shabbat uncertainty, closed branches, parser breakage, explicit coordinates, ambiguous phone matches, strict address verification, circuit breaking, partial-response protection, last-good fallback, and provenance-preserving merges. These do not claim live service uptime or that a store is physically open.
