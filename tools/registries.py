"""Official Israeli open registries (data.gov.il) used to confirm places, fix their details and add missing ones.

Every place in data/shops.json carries a `src` tag: the sources that confirm it is there, each with the date of that
source's data, e.g. "osm;boi@2026-11-13". The app turns this into "confirmed by 2 sources" or "single source, last seen ...".

Sources (all public, free to reuse):
- boi:  Bank of Israel — every bank ATM, with location, fees and deposits (dataset "automated-devices", weekly).
- moe:  Ministry of Energy — every public fuel station with coordinates, plus the station phone numbers.
Each registry keeps its last good copy in data/registries/<name>.json, so a failed download never removes places.
"""
import json, math, pathlib, sys, time, urllib.parse, urllib.request

DATA = pathlib.Path(__file__).resolve().parent.parent / "data"
API = "https://data.gov.il/api/3/action/"
UA = {"User-Agent": "open-nearby-data/1.0 (+https://betahopen.app)"}


def call(action, **params):
    url = API + action + "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
        j = json.load(r)
    if not j.get("success"):
        raise RuntimeError(f"{action} failed")
    return j["result"]


def records(resource_id):
    return call("datastore_search", resource_id=resource_id, limit=32000)["records"]


def modified(package):
    return call("package_show", id=package)["metadata_modified"][:10]


def num(v):
    try:
        return float(str(v).strip())
    except (TypeError, ValueError):
        return None


def in_israel(lat, lon):
    return lat is not None and lon is not None and 29.3 < lat < 33.5 and 34.2 < lon < 35.95


def dist(a_lat, a_lon, b_lat, b_lon):
    x = math.radians(b_lon - a_lon) * math.cos(math.radians((a_lat + b_lat) / 2))
    y = math.radians(b_lat - a_lat)
    return 6371000 * math.hypot(x, y)


# ---------- Bank of Israel ATMs ----------
WHERE = {"על קיר הסניף": "wall", "קיר הסניף": "wall", "בתוך הסניף": "inside", "בלובי הסניף": "lobby"}


def boi_atms():
    date = modified("automated-devices")
    groups = {}
    for r in records("21fde05f-62e3-401b-81cf-5c385862026d"):
        lat, lon = num(r.get("X_Coordinate")), num(r.get("Y_Coordinate"))
        if not in_israel(lat, lon):
            continue
        key = (r.get("Bank_Code"), round(lat, 4), round(lon, 4))
        g = groups.setdefault(key, {"lat": lat, "lon": lon, "n": 0, "r": r})
        g["n"] += 1
    out = []
    for (bank, _, _), g in groups.items():
        r = g["r"]
        where = (r.get("ATM_Location") or "").strip()
        tags = {
            "amenity": "atm", "operator": (r.get("Bank_Name") or "").replace(' בע"מ', "").strip(),
            "addr:street": (r.get("ATM_Address") or "").strip(), "addr:city": (r.get("City") or "").strip(),
            "atm:count": str(g["n"]) if g["n"] > 1 else None,
            "fee": "yes" if r.get("Commission") == "כן" else "no" if r.get("Commission") == "לא" else None,
            "cash_in": "yes" if r.get("Cash_Deposit") == "כן" else None,
            "atm:where": where or None, "atm:where_note": (r.get("ATM_Address_Extra") or "").strip() or None,
            "wheelchair": "yes" if r.get("Handicap_Access") == "כן" else None,
        }
        # A machine on the outside wall of the branch works around the clock; inside the branch it keeps branch hours.
        if WHERE.get(where) == "wall":
            tags["opening_hours"] = "24/7"
            tags["source:hours"] = "estimate"
        out.append({"id": f"boi{bank}-{r.get('Atm_Num')}", "lat": g["lat"], "lon": g["lon"], "tags": {k: v for k, v in tags.items() if v}, "src": f"boi@{date}"})
    return out


# ---------- Ministry of Energy fuel stations ----------
def moe_fuel():
    date = modified("fuelstationbynumber")
    phones = {}
    for r in records("ff3b653c-d268-4eb7-a86b-6de69e77043a"):
        phones[r.get("station_number")] = (r.get("telephone") or "").strip()
    out = []
    for r in records("5537a0ef-3eeb-449c-90c8-51e27564f0cb"):
        lat, lon = num(r.get("נ.צ. רוחב")), num(r.get("נ.צ. אורך"))
        if not in_israel(lat, lon):
            continue
        company, name = (r.get("חברה") or "").strip(), (r.get("שם_תחנה") or "").strip()
        tags = {"amenity": "fuel", "brand": company or None, "name": f"{company} {name}".strip() or None,
                "addr:street": (r.get("כתובת") or "").strip() or None, "addr:city": (r.get("רשות_מקומית") or "").strip() or None,
                "phone": phones.get(r.get("מס_מינהל_הדלק")) or None}
        out.append({"id": f"moe{r.get('מס_מינהל_הדלק')}", "lat": lat, "lon": lon, "tags": {k: v for k, v in tags.items() if v}, "src": f"moe@{date}"})
    return out


FETCHERS = {"boi_atms": (boi_atms, ("atm", "bank"), 40), "moe_fuel": (moe_fuel, ("fuel",), 150)}


def fetch(name):
    cache = DATA / "registries" / f"{name}.json"
    cache.parent.mkdir(parents=True, exist_ok=True)
    fn = FETCHERS[name][0]
    try:
        items = fn()
        if len(items) < 50:
            raise RuntimeError(f"only {len(items)} records")
        cache.write_text(json.dumps(items, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(f"{name}: {len(items)} records")
        return items
    except Exception as e:
        print(f"{name}: download failed ({e}); using the last good copy", file=sys.stderr)
        return json.loads(cache.read_text(encoding="utf-8")) if cache.exists() else []


def add_src(tags, src):
    have = [x for x in (tags.get("src") or "").split(";") if x]
    code = src.split("@")[0]
    have = [x for x in have if x.split("@")[0] != code] + [src]
    tags["src"] = ";".join(have)


def merge_into(shops):
    """Confirms existing places (adds the registry to `src`, fills missing details) and adds places no other source has."""
    grid = {}
    for s in shops:
        grid.setdefault((round(s[1] * 100), round(s[2] * 100)), []).append(s)
    stats = {}
    for name, (_, amenities, radius) in FETCHERS.items():
        used, st = set(), {"records": 0, "confirmed": 0, "added": 0}
        for it in fetch(name):
            st["records"] += 1
            best, bd = None, radius
            gy, gx = round(it["lat"] * 100), round(it["lon"] * 100)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    for s in grid.get((gy + dy, gx + dx), []):
                        if s[0] in used or s[3].get("amenity") not in amenities:
                            continue
                        d = dist(it["lat"], it["lon"], s[1], s[2])
                        if d < bd:
                            best, bd = s, d
            if best:
                used.add(best[0])
                st["confirmed"] += 1
                add_src(best[3], it["src"])
                for k, v in it["tags"].items():
                    if k in ("amenity", "name"):
                        continue
                    if k == "opening_hours":
                        if not best[3].get("opening_hours"):
                            best[3]["opening_hours"], best[3]["source:hours"] = v, it["tags"].get("source:hours", "estimate")
                    elif k != "source:hours" and not best[3].get(k):
                        best[3][k] = v
            else:
                tags = dict(it["tags"])
                add_src(tags, it["src"])
                shops.append([it["id"], round(it["lat"], 6), round(it["lon"], 6), tags])
                st["added"] += 1
        stats[name] = st
    return stats
