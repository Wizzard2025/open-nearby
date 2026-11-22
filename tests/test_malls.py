"""Regression tests for tools/malls.py (shopping-centre directories): python3 -m unittest discover -s tests"""
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "tools"))
import malls  # noqa: E402

HERE = malls._place_words({"name": "ביג פאשן גלילות", "name:en": "BIG Fashion Glilot"})


def inside(rings, x, y):
    """Even-odd test, strict: a point on an edge does not count as inside."""
    hit = False
    for ring in rings:
        for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
            if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
                hit = not hit
    return hit


def on_edge(rings, x, y):
    for ring in rings:
        for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
            cross = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)
            if abs(cross) < 1e-12 and min(x1, x2) <= x <= max(x1, x2) and min(y1, y2) <= y <= max(y1, y2):
                return True
    return False


class PinInsideUnit(unittest.TestCase):
    def check(self, rings):
        x, y = malls._centroid({"type": "Polygon", "coordinates": rings})
        flat = [[tuple(p) for p in r[:-1]] for r in rings]
        self.assertTrue(inside(flat, x, y), (x, y))
        self.assertFalse(on_edge(flat, x, y), (x, y))

    def test_square(self):
        self.check([[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]])

    def test_l_shape(self):
        self.check([[[0, 0], [4, 0], [4, 1], [1, 1], [1, 4], [0, 4], [0, 0]]])

    def test_ring_with_hole_in_the_middle(self):
        self.check([[[0, 0], [6, 0], [6, 6], [0, 6], [0, 0]], [[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]]])

    def test_average_on_a_hole_edge(self):
        self.check([[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]], [[1, 1], [1, 2], [3, 2], [3, 1], [1, 1]]])

    def test_point_is_kept(self):
        self.assertEqual(malls._centroid({"type": "Point", "coordinates": [34.8, 32.1]}), [34.8, 32.1])


class SameShop(unittest.TestCase):
    def test_home_line_is_another_shop(self):
        self.assertIsNone(malls._match({"name": "Zara Home", "brand": "Zara"}, {"name": "Zara"}, here=HERE))
        self.assertIsNone(malls._match({"name": "Zara", "brand": "Zara"}, {"name": "Zara Home"}, here=HERE))

    def test_chain_record_named_just_the_brand(self):
        self.assertIsNone(malls._match({"name": "Example", "brand": "Example"}, {"name": "Example Home"}, chain=True))
        self.assertIsNone(malls._match({"name": "Example Home", "brand": "Example"}, {"name": "Example"}, chain=True))

    def test_chain_branch_matches_its_directory_entry(self):
        branch = {"name": "סופר-פארם גאלרי ביג גלילות", "name:en": "Super-Pharm", "brand": "Super-Pharm"}
        tenant = {"name": "Super-pharm gallery", "name:he": "סופר פארם גאלרי"}
        self.assertEqual(malls._match(branch, tenant, chain=True), "brand")
        self.assertIsNone(malls._match(branch, tenant, chain=False))

    def test_brand_at_this_centre(self):
        known = {"name": "The North Face Glilot Tel Aviv", "brand": "The North Face"}
        self.assertEqual(malls._match(known, {"name": "THE NORTH FACE"}, here=HERE), "exact")

    def test_generic_centre_word_is_not_this_centre(self):
        self.assertNotIn("fashion", HERE)
        self.assertNotIn("פאשן", HERE)
        self.assertIsNone(malls._match({"name": "Mango Fashion", "brand": "Mango"}, {"name": "Mango"}, here=HERE))

    def test_chain_provenance_from_source(self):
        self.assertTrue(malls._is_chain_branch(["n1", 0, 0, {"src": "osm@2024-01-01;chain:superpharm@2026-11-21"}]))
        self.assertTrue(malls._is_chain_branch(["csuperpharm333", 0, 0, {}]))
        self.assertFalse(malls._is_chain_branch(["n1", 0, 0, {"src": "osm@2024-01-01;ovt@2026-11-02", "brand": "X"}]))


class Kinds(unittest.TestCase):
    CATS = {"k": "לקטנים", "f": "אופנה", "food": "מזון"}

    def kind(self, name, cat):
        return malls._kind({"type": "tenant", "name": name, "tags": [], "categories": [cat]}, self.CATS)

    def test_toys_and_kids_clothes(self):
        self.assertEqual(self.kind("LEGO", "k"), {"shop": "toys"})
        self.assertEqual(self.kind("Golf Kids", "k"), {"shop": "clothes", "clothes": "children"})
        self.assertEqual(self.kind("Laguna", "f"), {"shop": "clothes"})

    def test_excluded_before_categories(self):
        self.assertIsNone(self.kind("Pop Up", "f"))
        self.assertIsNone(self.kind("Cinema City", "food"))


class Merge(unittest.TestCase):
    def test_own_record_takes_the_current_kind_and_floor(self):
        doc = {"slug": "x", "name": "מרכז", "name:en": "Centre"}
        own = ["mx-1", 32.1, 34.8, {"name": "LEGO", "shop": "clothes", "clothes": "children", "level": "GF"}]
        t = {"name": "LEGO", "shop": "toys", "level": "FF", "lat": 32.1, "lon": 34.8}
        malls._enrich(own, t, 0, doc, {"level": "FF", "mall": "מרכז", "mall:en": "Centre"})
        self.assertEqual((own[3]["shop"], own[3].get("clothes"), own[3]["level"]), ("toys", None, "FF"))

    def test_other_sources_keep_their_kind(self):
        doc = {"slug": "x", "name": "מרכז", "name:en": "Centre"}
        branch = ["csuperpharm1", 32.1, 34.8, {"name": "סופר-פארם", "amenity": "pharmacy"}]
        t = {"name": "Super-pharm gallery", "shop": "cosmetics", "lat": 32.1, "lon": 34.8}
        malls._enrich(branch, t, 0, doc, {"level": "GF", "mall": "מרכז", "mall:en": "Centre"})
        self.assertEqual((branch[3].get("amenity"), branch[3].get("shop")), ("pharmacy", None))


if __name__ == "__main__":
    unittest.main()
