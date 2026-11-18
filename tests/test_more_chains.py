"""Offline regression checks for the additional public chain sources."""
import copy
import json
import pathlib
import sys
import tempfile
import unittest
from datetime import date
from unittest.mock import patch

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "tools"))
import chains
import more_chains as extra


def ampm_block(ident="101", name="סניף בדיקה", address="בן יהודה 30, תל אביב", hours="24/7"):
    return (f'<div class="branch-item"><div aria-controls="panel-{ident}">'
            f'<h2 class="branch-name">{name}</h2><div class="address">{address}</div></div>'
            f'<div class="opening-hours-row">{hours}</div><a href="tel:03-0000000">phone</a></div>')


def good_block(slug="test", name="סניף בדיקה, תל אביב", winter="08:00-21:00", summer="09:00-22:00", saturday="סגור"):
    return (f'<h1 class="elementor-heading-title"><a href="https://goodpharm.co.il/pharm_storelocation/{slug}">{name}</a></h1>'
            '<div class="elementor-widget-text-editor"><div class="elementor-widget-container">רחוב בן יהודה 30, תל אביב</div></div>'
            f'<span class="elementor-icon-list-text">שעון חורף, א׳ - ה׳ {winter}</span>'
            '<span class="elementor-icon-list-text">שעון חורף, ו׳ 08:00-15:00</span>'
            f'<span class="elementor-icon-list-text">שעון חורף, שבת/חג {saturday}</span>'
            f'<span class="elementor-icon-list-text">שעון קיץ, א׳ - ה׳ {summer}</span>')


def record(ident="101", chain="ampm"):
    return {"id": ident, "chain": chain, "title": "סניף בדיקה", "street": "בן יהודה 30", "city": "תל אביב",
            "phone": "03-0000000", "hours_text": "24/7", "opening_hours": "24/7",
            "source_url": extra.AMPM_URL, "address": "בן יהודה 30, תל אביב", "nav_url": None}


def branch(ident="101"):
    return {"id": ident, "chain": "ampm", "lat": 32.076032, "lon": 34.768255, "opening_hours": "24/7",
            "tags": {"name": "am:pm", "brand": "AM:PM", "shop": "convenience",
                     "addr:street": "בן יהודה 30", "addr:city": "תל אביב"}}


class AdditionalSourcesTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.old_data, self.old_cache = chains.DATA, chains._geocache
        chains.DATA, chains._geocache = pathlib.Path(self.temp.name), None
        extra._shop_index, extra._geocode_unavailable, extra._last_geocode = None, False, 0.0

    def tearDown(self):
        chains.DATA, chains._geocache = self.old_data, self.old_cache
        self.temp.cleanup()

    def save(self, name, value):
        p = chains.DATA / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(value), encoding="utf-8")

    def test_ampm_individual_247_and_daily_hours(self):
        rows = extra.parse_ampm(ampm_block() + ampm_block("102", hours="07:00-23-00"))
        self.assertEqual([r["opening_hours"] for r in rows], ["24/7", "Su-Sa 07:00-23:00"])
        self.assertEqual(rows[0]["id"], "101")
        self.assertEqual(rows[0]["source_url"], extra.AMPM_URL + "#panel-101")

    def test_overnight_and_invalid_ranges(self):
        self.assertEqual(extra._hours(["06:00-01:00"]), "Su-Sa 06:00-01:00")
        self.assertIsNone(extra._hours(["24:30-25:00"]))
        self.assertIsNone(extra._hours(["08:99-20:00"]))
        self.assertIsNone(extra._hours(["08:00-08:00"]))

    def test_relative_shabbat_rules_remain_unknown(self):
        text = ["א-ה 06:00-23:00", "ו' - סגירה חצי שעה לפני כניסת שבת", "שבת - פתיחה בצאת שבת"]
        result = extra._hours(text)
        self.assertIn("Su-Th 06:00-23:00", result)
        self.assertIn("Fr unknown", result)
        self.assertIn("Sa unknown", result)

    def test_broken_or_conflicting_source_is_not_an_empty_success(self):
        with self.assertRaises(ValueError):
            extra.parse_ampm("<html>Access denied</html>")
        with self.assertRaises(ValueError):
            extra.parse_ampm(ampm_block() + ampm_block(address="שונה 1, חיפה"))
        with self.assertRaises(ValueError):
            extra.parse_ampm('<div class="branch-item"><h2 class="branch-name">Missing fields</h2>')

    def test_seasons_are_selected_instead_of_combined(self):
        page = good_block()
        winter = extra.parse_goodpharm(page, date(2026, 11, 17))[0]
        summer = extra.parse_goodpharm(page, date(2026, 7, 17))[0]
        self.assertIn("08:00-21:00", winter["opening_hours"])
        self.assertNotIn("09:00-22:00", winter["opening_hours"])
        self.assertIn("09:00-22:00", summer["opening_hours"])
        self.assertNotIn("08:00-21:00", summer["opening_hours"])
        self.assertEqual(extra._season(date(2026, 10, 31)), "חורף")

    def test_goodpharm_closed_branch_and_missing_current_season(self):
        page = good_block() + good_block("closed", "סגור לצמיתות!! סניף בדיקה")
        self.assertEqual(len(extra.parse_goodpharm(page, date(2026, 11, 17))), 1)
        rows = extra.parse_goodpharm(good_block().replace("שעון חורף", "invalid"), date(2026, 11, 17))
        self.assertIsNone(rows[0]["opening_hours"])

    def test_goodpharm_relative_saturday_is_not_an_invented_clock(self):
        r = extra.parse_goodpharm(good_block(saturday="חצי שעה מצאת שבת -23:00"), date(2026, 11, 17))[0]
        self.assertIn("Sa unknown", r["opening_hours"])
        self.assertNotIn("sunset", r["opening_hours"])

    def test_explicit_publisher_coordinate_links(self):
        point = extra._direct_point("https://www.waze.com/live-map/directions?to=ll.32.076032%2C34.768255")
        self.assertEqual(point, [32.076032, 34.768255])
        self.assertIsNone(extra._direct_point("https://evil.example/?to=ll.32.07,34.76"))
        self.assertIsNone(extra._direct_point("https://www.waze.com/?to=ll.90,180"))
        self.assertFalse(extra._valid_point([float('nan'), 34.76]))

    def test_prior_precise_cache_reused_only_for_unchanged_address(self):
        self.save("chains/ampm.json", {"branches": [branch()]})
        self.assertEqual(extra._existing_point(record()), [32.076032, 34.768255])
        moved = record(); moved["street"] = "בן יהודה 50"
        self.assertIsNone(extra._existing_point(moved))

    def test_unique_same_chain_phone_can_reuse_osm_position(self):
        self.save("shops.json", {"shops": [["n1", 32.07, 34.76, {"brand": "AM:PM", "phone": "+972 3 0000000"}]]})
        self.assertEqual(extra._existing_point(record()), [32.07, 34.76])
        extra._shop_index.append(["n2", 32.08, 34.77, {"brand": "AM:PM", "phone": "03-0000000"}])
        self.assertIsNone(extra._existing_point(record()))

    def test_geocoding_requires_house_street_city_and_country(self):
        good = {"lat": "32.076032", "lon": "34.768255", "address": {"country_code": "il", "house_number": "30", "road": "בן יהודה", "city": "תל אביב-יפו"}}
        bad = copy.deepcopy(good); bad["address"]["road"] = "רחוב אחר"
        with patch.object(chains, "get", return_value=json.dumps([bad, good])), patch.object(extra.time, "sleep"):
            self.assertEqual(extra._geocode(record()), [32.076032, 34.768255])
        self.assertEqual(chains._geocache["בן יהודה 30|תל אביב"], [32.076032, 34.768255])
        chains._geocache = {}
        for field, value in [("house_number", "31"), ("country_code", "us"), ("city", "חיפה")]:
            wrong = copy.deepcopy(good); wrong["address"][field] = value
            with patch.object(chains, "get", return_value=json.dumps([wrong])), patch.object(extra.time, "sleep"):
                self.assertIsNone(extra._geocode(record()))
        self.assertEqual(chains._geocache, {})

    def test_geocoder_outage_stops_requests_and_keeps_unlocated_records(self):
        rows = [record("101"), record("102")]
        with patch.object(chains, "get", side_effect=TimeoutError()), patch.object(extra.time, "sleep"):
            with self.assertRaises(ValueError):
                extra.resolve(rows, "ampm")
            self.assertTrue(extra._geocode_unavailable)
        saved = json.loads((chains.DATA / "chains/ampm-unlocated.json").read_text())
        self.assertEqual(saved["source_count"], 2)
        self.assertEqual(len(saved["branches"]), 2)
        self.assertEqual(chains._geocache, {})

    def test_partial_source_or_lost_positions_cannot_replace_last_good_cache(self):
        self.save("chains/ampm-unlocated.json", {"source_count": 100, "branches": []})
        with self.assertRaises(ValueError):
            extra.resolve([record()], "ampm")
        self.save("chains/ampm-unlocated.json", {"source_count": 1, "branches": []})
        saved = {"branches": [branch(str(i)) for i in range(20)]}
        self.save("chains/ampm.json", saved)
        with patch.object(extra, "_existing_point", return_value=[32.07, 34.76]):
            with self.assertRaises(ValueError):
                extra.resolve([record()], "ampm")
        self.assertEqual(json.loads((chains.DATA / "chains/ampm.json").read_text()), saved)

    def test_network_failure_uses_existing_core_fallback(self):
        saved = {"fetched": "2026-11-16", "branches": [branch()]}
        self.save("chains/ampm.json", saved)
        with patch.object(chains, "FETCHERS", {"ampm": extra.ampm}), patch.object(chains, "get", side_effect=TimeoutError()):
            self.assertEqual(chains.fetch_all(), saved["branches"])

    def test_merge_preserves_source_metadata_and_avoids_duplicate_osm_point(self):
        shops = [["n1", 32.076032, 34.768255, {"brand": "AM:PM", "name": "AM:PM"}]]
        b = branch(); b["tags"].update({"source:hours:url": extra.AMPM_URL, "check_date:opening_hours": "2026-11-17", "source:hours:text": "24/7"})
        stats = chains.merge_into(shops, [b])
        self.assertEqual(len(shops), 1)
        self.assertEqual(stats["ampm"]["matched"], 1)
        self.assertEqual(shops[0][3]["check_date:opening_hours"], "2026-11-17")
        self.assertEqual(shops[0][3]["source:hours:url"], extra.AMPM_URL)
        self.assertTrue(chains.matches("goodpharm", {"name:he": "גוד פארם"}))


if __name__ == "__main__":
    unittest.main()
