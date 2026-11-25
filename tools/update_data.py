"""Downloads all shops in Israel from OpenStreetMap (Overpass API) into data/shops.json.
Run nightly (cron / GitHub Actions):  python tools/update_data.py
"""
import math, json, sys, time, urllib.request, urllib.parse, pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import chains  # noqa: E402
import registries  # noqa: E402
import stores  # noqa: E402
import overture  # noqa: E402
import malls  # noqa: E402

OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "shops.json"
RAW = pathlib.Path(__file__).resolve().parent.parent / "data" / "osm_raw.json"
SHOPS = "supermarket|convenience|kiosk|grocery|greengrocer|deli|alcohol|bakery|pastry|chemist"
QUERY = f"""[out:json][timeout:180];
area["ISO3166-1"="IL"][admin_level=2]->.il;
(
  nwr["shop"](area.il);
  nwr["amenity"~"^(pharmacy|fuel)$"](area.il);
  nwr["amenity"="atm"](area.il);
  nwr["amenity"~"^(restaurant|fast_food|cafe|food_court|ice_cream)$"](area.il);
  nwr["amenity"="bank"]["atm"="yes"](area.il);
);
out center tags meta;"""
MIRRORS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
KEEP = ["check_date", "survey:date", "name", "name:he", "name:ru", "name:en", "name:ar", "brand", "shop", "amenity", "opening_hours", "operator", "cash_in", "atm", "network", "brand:en", "brand:ru", "brand:he", "operator:en",
        "cuisine", "diet:kosher", "kosher", "takeaway", "delivery", "fee",
        "addr:street", "addr:housenumber", "addr:city", "phone", "contact:phone", "website"]

def fetch():
    body = urllib.parse.urlencode({"data": QUERY}).encode()
    for url in MIRRORS:
        for attempt in range(2):
            try:
                req = urllib.request.Request(url, data=body, headers={"User-Agent": "open-nearby-data/1.0"})
                with urllib.request.urlopen(req, timeout=240) as r:
                    return json.load(r)["elements"]
            except Exception as e:
                print(f"{url} attempt {attempt + 1}: {e}", file=sys.stderr)
                time.sleep(10)
    sys.exit("All Overpass mirrors failed")

TILE = 10  # tiles of 1/10 degree (~10 km): a phone downloads only the area it shows


def drop_duplicate_ids(shops):
    """The app keys pins, cards and lists on the id, so each id must appear once. A repeat at the same place (a source
    listing a place twice) is dropped and its sources kept on the first copy; a repeat elsewhere is another place and
    gets "~2", "~3"... so it is never lost. Returns the repeated ids."""
    first, dups, keep = {}, [], []
    for s in shops:
        f = first.get(s[0])
        if f is None:
            first[s[0]] = s
            keep.append(s)
            continue
        dups.append(s[0])
        if registries.dist(f[1], f[2], s[1], s[2]) <= 50:
            for src in filter(None, (s[3].get("src") or "").split(";")):
                registries.add_src(f[3], src)
            continue
        n = 2
        while f"{s[0]}~{n}" in first:
            n += 1
        s[0] = f"{s[0]}~{n}"
        first[s[0]] = s
        keep.append(s)
    shops[:] = keep
    return dups


def write_tiles(out):
    tiles_dir = OUT.parent / "tiles"
    tiles_dir.mkdir(exist_ok=True)
    tiles = {}
    for sh in out:
        tiles.setdefault(f"{math.floor(sh[1] * TILE)}_{math.floor(sh[2] * TILE)}", []).append(sh)
    for f in tiles_dir.glob("*.json"):
        f.unlink()
    for k, items in tiles.items():
        (tiles_dir / f"{k}.json").write_text(json.dumps(items, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (tiles_dir / "index.json").write_text(json.dumps({"updated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "size": TILE,
        "tiles": {k: len(v) for k, v in tiles.items()}}, separators=(",", ":")), encoding="utf-8")


def main():
    # --skip-osm reuses the last OpenStreetMap download (handy when only chain data changed).
    if "--skip-osm" in sys.argv and RAW.exists():
        out = json.loads(RAW.read_text(encoding="utf-8"))
    else:
        out = []
        for e in fetch():
            lat = e.get("lat", e.get("center", {}).get("lat"))
            lon = e.get("lon", e.get("center", {}).get("lon"))
            if lat is None:
                continue
            tags = {k: v for k, v in e.get("tags", {}).items() if k in KEEP}
            # When OSM last saw it: the newer of the last edit and an explicit "checked on" date.
            seen = max(filter(None, [e.get("timestamp", "")[:10], tags.get("check_date", "")[:10], tags.get("survey:date", "")[:10]]), default="")
            tags["src"] = f"osm@{seen}" if seen else "osm"
            out.append([e["type"][0] + str(e["id"]), round(lat, 6), round(lon, 6), tags])
        RAW.parent.mkdir(parents=True, exist_ok=True)
        RAW.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    osm_hours = sum('opening_hours' in s[3] for s in out)

    # Official chain branch lists: attach their hours to OSM points, add branches OSM doesn't have.
    for s in out:
        s[3].setdefault("src", "osm")
    stats = chains.merge_into(out, chains.fetch_all())
    # Official registries (Bank of Israel ATMs, Ministry of Energy fuel stations): confirm, enrich, add what is missing.
    for name, st in registries.merge_into(out).items():
        print(f"  {name}: {st}")
    # Store lists every big food retailer must publish (Price Transparency Law): confirm branches, add missing ones.
    for name, st in stores.merge_into(out).items():
        print(f"  stores {name}: {st}")
    # Overture Maps (open data from Meta, Microsoft, Foursquare, AllThePlaces): confirm and add shops and food places.
    print(f"  overture: {overture.merge_into(out)}")
    # Shopping-centre directories (data/malls/*.json): floor and centre for shops already known, the rest added.
    for name, st in malls.merge_into(out).items():
        print(f"  mall {name}: {st}")
    for name, st in stats.items():
        print(f"  {name}: {st}")

    # Sources sometimes send broken coordinates (0,0 or latitude repeated as longitude): keep only points inside Israel.
    bad = [x for x in out if not (29.3 < x[1] < 33.5 and 34.2 < x[2] < 35.95)]
    if bad:
        print(f"  dropped {len(bad)} places with coordinates outside Israel: {[x[0] for x in bad][:5]}")
    out[:] = [x for x in out if 29.3 < x[1] < 33.5 and 34.2 < x[2] < 35.95]
    dups = drop_duplicate_ids(out)
    if dups:
        print(f"  repeated ids (dropped at the same place, renamed elsewhere): {dups[:5]}")
    write_tiles(out)
    OUT.write_text(json.dumps({"updated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "shops": out},
                              ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    total_hours = sum('opening_hours' in s[3] for s in out)
    print(f"{len(out)} shops, with hours: {osm_hours} from OSM -> {total_hours} after chains "
          f"({100 * total_hours // len(out)}%) -> {OUT.name} ({OUT.stat().st_size // 1024} KB)")

if __name__ == "__main__":
    main()
