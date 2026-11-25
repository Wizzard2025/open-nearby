"""Regression tests for tools/overture.py: python3 -m unittest discover -s tests"""
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "tools"))
import overture  # noqa: E402


def grid_of(*shops):
    grid = {}
    for s in shops:
        grid.setdefault((round(s[1] * 200), round(s[2] * 200)), []).append(s)
    return grid


DEAL = ["cshufersal118", 32.1000, 34.8000, {"name": "שופרסל דיל", "brand": "Shufersal", "shop": "supermarket",
                                           "opening_hours": "Su-Th 07:00-23:00"}]
BE = ["cshufersal643", 32.1000, 34.8000, {"name": "Be", "brand": "Shufersal", "shop": "chemist"}]
OSM_SP = ["n1", 32.1000, 34.8000, {"name": "Super-Pharm", "amenity": "pharmacy", "src": "osm@2025-01-01;chain:superpharm@2026-11-21"}]


class ChainTwin(unittest.TestCase):
    def test_overture_twin_in_another_category_is_the_branch(self):
        # Overture files Shufersal supermarkets as pharmacies, ~100 m from the official pin.
        self.assertIs(overture.chain_twin(grid_of(DEAL), 32.0991, 34.8000, {"name": "שופרסל דיל", "amenity": "pharmacy"}), DEAL)

    def test_branch_confirmed_by_the_chain_list(self):
        self.assertIs(overture.chain_twin(grid_of(OSM_SP), 32.1006, 34.8000, {"name": "סופר-פארם מלחה"}), OSM_SP)

    def test_too_far_is_another_place(self):
        self.assertIsNone(overture.chain_twin(grid_of(DEAL), 32.0980, 34.8000, {"name": "שופרסל דיל"}))

    def test_name_must_start_with_the_chain(self):
        g = grid_of(OSM_SP, DEAL)
        self.assertIsNone(overture.chain_twin(g, 32.1, 34.8, {"name": "איי טאצ' iTouch (ליד סופר פארם)"}))
        self.assertIsNone(overture.chain_twin(grid_of(["cvictory1", 32.1, 34.8, {"name": "ויקטורי"}]), 32.1, 34.8,
                                              {"name": "ויקטוריה קוסמטיקס"}))

    def test_supermarket_name_is_not_its_be_pharmacy(self):
        self.assertIsNone(overture.chain_twin(grid_of(BE), 32.1, 34.8, {"name": "שופרסל דיל"}))
        self.assertIs(overture.chain_twin(grid_of(BE), 32.1, 34.8, {"name": "Be"}), BE)

    def test_non_chain_places_are_never_twins(self):
        other = ["ov1", 32.1, 34.8, {"name": "שופרסל דיל"}]
        self.assertIsNone(overture.chain_twin(grid_of(other), 32.1, 34.8, {"name": "שופרסל דיל"}))


if __name__ == "__main__":
    unittest.main()
