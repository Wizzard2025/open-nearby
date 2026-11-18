"""Where are we blind? For every Israeli locality (CBS list) count the places we know within reach and how many
have opening hours. Writes data/coverage.json and prints the biggest gaps — the towns and villages to work on next.
Run after update_data.py:  python tools/coverage.py
"""
import json, math, pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import stores

DATA = pathlib.Path(__file__).resolve().parent.parent / "data"


def main():
    shops = json.loads((DATA / "shops.json").read_text(encoding="utf-8"))["shops"]
    grid = {}
    for s in shops:
        grid.setdefault((round(s[1] * 50), round(s[2] * 50)), []).append(s)
    rows = []
    for code, L in stores.localities().items():
        if not L.get("pos") or (L.get("pop") or 0) < 200:
            continue
        lat, lon = L["pos"]
        pop = L["pop"]
        r = 1200 if pop < 5000 else 3000 if pop < 50000 else 6000  # reach grows with the size of the place
        n = h = 0
        gy, gx = round(lat * 50), round(lon * 50)
        k = math.ceil(r / 2200)
        for dy in range(-k, k + 1):
            for dx in range(-k, k + 1):
                for s in grid.get((gy + dy, gx + dx), []):
                    if 111320 * math.hypot(s[1] - lat, (s[2] - lon) * math.cos(math.radians(lat))) <= r:
                        n += 1
                        h += "opening_hours" in s[3]
        rows.append({"code": code, "name": L["name"], "en": L["en"], "pop": pop, "places": n, "with_hours": h})
    rows.sort(key=lambda x: -x["pop"])
    (DATA / "coverage.json").write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    none = [x for x in rows if x["places"] == 0]
    nohours = [x for x in rows if x["places"] and x["with_hours"] == 0]
    print(f"{len(rows)} localities (200+ residents): {len(none)} with no places at all, {len(nohours)} with places but no hours")
    print("Biggest with nothing:", ", ".join(f"{x['en']} ({x['pop']})" for x in none[:15]))
    print("Biggest without hours:", ", ".join(f"{x['en']} ({x['pop']}, {x['places']} places)" for x in nohours[:15]))


if __name__ == "__main__":
    main()
