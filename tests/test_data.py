"""Regression tests for tools/update_data.py and tools/chains.py: python3 -m unittest discover -s tests"""
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "tools"))
import chains  # noqa: E402
import update_data  # noqa: E402


class DuplicateIds(unittest.TestCase):
    def test_repeat_is_dropped_and_its_sources_kept(self):
        shops = [["c1", 32.1, 34.8, {"src": "chain:x@2026-11-21"}], ["n1", 32.2, 34.8, {}],
                 ["c1", 32.1, 34.8, {"src": "chain:x@2026-11-21;ovt@2026-11-02"}]]
        self.assertEqual(update_data.drop_duplicate_ids(shops), ["c1"])
        self.assertEqual([s[0] for s in shops], ["c1", "n1"])
        self.assertEqual(shops[0][3]["src"], "chain:x@2026-11-21;ovt@2026-11-02")

    def test_repeat_elsewhere_is_another_place_and_kept(self):
        shops = [["c1", 32.1, 34.8, {}], ["c1", 31.7, 34.9, {}]]
        update_data.drop_duplicate_ids(shops)
        self.assertEqual([s[0] for s in shops], ["c1", "c1~2"])

    def test_unique_ids_are_left_alone(self):
        shops = [["a", 0, 0, {}], ["b", 0, 0, {}]]
        self.assertEqual(update_data.drop_duplicate_ids(shops), [])
        self.assertEqual(len(shops), 2)


class BranchIds(unittest.TestCase):
    ROWS = [("חדרה", "השלום 1 חדרה"), ("בת ים", "העמל 20 בת ים"), ("חדרה", 'תרנ"א 20 חדרה')]

    def test_shared_names_get_the_street_whatever_the_order(self):
        ids = dict(zip(self.ROWS, chains.branch_ids(self.ROWS)))
        rev = dict(zip(self.ROWS[::-1], chains.branch_ids(self.ROWS[::-1])))
        self.assertEqual(ids, rev)
        self.assertEqual(ids[self.ROWS[0]], "חדרה השלום 1 חדרה")
        self.assertEqual(ids[self.ROWS[1]], "בת ים")

    def test_id_does_not_depend_on_other_branches_geocoding(self):
        # ids are given before geocoding, so a branch that fails to geocode never hands its id to another
        self.assertEqual(chains.branch_ids(self.ROWS)[2], 'חדרה תרנ"א 20 חדרה')


class RamiLevyPage(unittest.TestCase):
    """ramilevy() end to end on a stub page, with one branch failing to geocode."""
    PAGE = "".join(
        f'<h2 class="mt-1 mb-0 title-list">{name}<small>{addr}</small></h2>'
        for name, addr in (("חדרה", "השלום 1, חדרה"), ("חדרה", 'תרנ"א 20, חדרה'), ("בת ים", "העמל 20, בת ים")))

    def setUp(self):
        self.old = chains.get, chains.geocode
        chains.get = lambda url, *a, **k: self.PAGE

    def tearDown(self):
        chains.get, chains.geocode = self.old

    def ids(self, failing=()):
        chains.geocode = lambda street, city: None if street in failing else [32.4, 34.9]
        return sorted(b["id"] for b in chains.ramilevy())

    def test_failed_geocode_does_not_move_an_id(self):
        both = self.ids()
        self.assertEqual(both, ["בת ים", "חדרה השלום 1", 'חדרה תרנ"א 20'])
        self.assertEqual(self.ids(failing=("השלום 1",)), ["בת ים", 'חדרה תרנ"א 20'])


class SharedPins(unittest.TestCase):
    def setUp(self):
        self.old = chains.geocode
        chains.geocode = lambda street, city: {"בת ים": [32.005564, 34.747903], "עמק חפר": [32.39894, 34.896757]}.get(city)

    def tearDown(self):
        chains.geocode = self.old

    def branch(self, addr):
        return {"lat": 32.400589, "lon": 34.900231, "tags": {"addr:street": addr}}

    def test_branch_far_from_the_shared_pin_moves_to_its_address(self):
        bat_yam, hefer = self.branch("העמל 11, בת ים"), self.branch("נחל אלכסנדר 3, עמק חפר")
        chains._fix_shared_pins([bat_yam, hefer])
        self.assertEqual((bat_yam["lat"], bat_yam["lon"]), (32.005564, 34.747903))
        self.assertEqual((hefer["lat"], hefer["lon"]), (32.400589, 34.900231))   # the pin is right for it

    def test_own_pins_are_not_geocoded(self):
        a, b = self.branch("העמל 11, בת ים"), dict(self.branch("x, y"), lat=31.0)
        chains._fix_shared_pins([a, b])
        self.assertEqual(a["lat"], 32.400589)


class GoodPharmHours(unittest.TestCase):
    WINTER = ["שעון חורף, א׳ - ה׳ 08:30-21:30", "שעון חורף, ו׳ 08:30-15:00", "שעון חורף, שבת/חג סגור",
              "שעון קיץ, א׳ - ה׳08:30-21:30", "שעון קיץ, ו׳ 08:30-16:30", "שעון קיץ, שבת/חג סגור", "צלע ההר 17, מודיעין"]

    def test_season_is_chosen(self):
        self.assertEqual(chains.goodpharm_hours(self.WINTER, summer=False), "Su-Th 08:30-21:30; Fr 08:30-15:00")
        self.assertEqual(chains.goodpharm_hours(self.WINTER, summer=True), "Su-Th 08:30-21:30; Fr 08:30-16:30")

    def test_after_shabbat_and_typo(self):
        lines = ["שעון חורף, א׳ - ה׳ 08:00-22:00", "שעון חורף, ו׳ 08:00:14:30", "שעון חורף, שבת/חג חצי שעה מצאת שבת - 22:00"]
        self.assertEqual(chains.goodpharm_hours(lines, summer=False),
                         "Su-Th 08:00-22:00; Fr 08:00-14:30; Sa (sunset+01:10)-22:00")

    def test_days_named_inside_the_line(self):
        lines = ["שעון חורף, א׳ - ה׳  א׳ 10:00-20:00 | ב׳-ה׳ 09:00-20:30", "שעון חורף, ו׳ 09:00-15:00"]
        self.assertEqual(chains.goodpharm_hours(lines, summer=False), "Su 10:00-20:00; Mo-Th 09:00-20:30; Fr 09:00-15:00")

    def test_unreadable_page_gives_no_hours(self):
        self.assertIsNone(chains.goodpharm_hours(["צלע ההר 17, מודיעין", "אודות"], summer=False))


class GoodPharmPlace(unittest.TestCase):
    STORES = [{"addr": "בן גוריון 4", "city": "הרצלייה", "lat": 32.166, "lon": 34.842},
              {"addr": "הרצל 23", "city": "נתניה", "lat": 32.33, "lon": 34.85},
              {"addr": "הרצל 32", "city": "נתניה", "lat": 32.32, "lon": 34.86},
              {"addr": "שד' הנשיא ויצמן 1", "city": "אור עקיבא", "lat": 32.5, "lon": 34.92}]

    def place(self, address, title):
        street, town = chains._gp_address(address, title)
        return chains._gp_place(street, town, title, self.STORES)

    def test_town_spelling_and_street_prefixes(self):
        self.assertEqual(self.place("רחוב בן גוריון 4, הרצליה", "בן גוריון, הרצליה"), (32.166, 34.842))
        self.assertEqual(self.place("רחוב שד' נשיא ויצמן 1 (קניון אורות), אור עקיבא", "קניון אורות, אור עקיבא"), (32.5, 34.92))

    def test_nearest_house_number_on_the_street(self):
        self.assertEqual(self.place("רחוב הרצל 32, נתניה", "הרצל 32, נתניה"), (32.32, 34.86))
        self.assertIsNone(self.place("רחוב הרצל 60, נתניה", "הרצל 60, נתניה"))

    def test_other_town_is_not_matched(self):
        self.assertIsNone(self.place("רחוב הרצל 23, רחובות", "הרצל 23, רחובות"))

    def test_town_from_the_title_when_the_address_names_a_mall(self):
        self.assertEqual(chains._gp_address("שד' שבעת הכוכבים 8, קניון שבעת הכוכבים", "שבעת הכוכבים, הרצליה"),
                         ("שד' שבעת הכוכבים 8", "הרצליה"))


class GeocodeNetworkFailure(unittest.TestCase):
    def test_failure_is_not_cached(self):
        import tempfile
        old = (chains.get, chains.DATA, chains._geocache, chains.time.sleep)
        tmp = tempfile.TemporaryDirectory()
        try:
            chains.DATA, chains._geocache, chains.time.sleep = pathlib.Path(tmp.name), None, lambda s: None
            chains.get = lambda *a, **k: (_ for _ in ()).throw(OSError("network down"))
            self.assertIsNone(chains.geocode("הרצל 1", "חיפה"))
            self.assertNotIn("הרצל 1|חיפה", chains._geocache)
        finally:
            chains.get, chains.DATA, chains._geocache, chains.time.sleep = old
            tmp.cleanup()


if __name__ == "__main__":
    unittest.main()
