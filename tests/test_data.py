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


if __name__ == "__main__":
    unittest.main()
