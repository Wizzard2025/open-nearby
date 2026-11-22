"""Shop directories of shopping centres (malls), from the export bundle of their indoor map (Mappedin MVF2).

Only facts are kept, one file per centre in data/malls/<slug>.json: each tenant's name (Hebrew and English), what
kind of shop it is, its floor, a point inside its unit, phone and website. The map drawing itself, logos and photos
are not copied. Opening hours are not in the export: a tenant gets the centre's hours when the file states them.

  python tools/malls.py import <bundle.zip> <slug> "<name he>" "<name en>" <source page url>
      Converts an MVF2 bundle (the zip the centre's map page downloads; save it from the browser's network panel)
      into data/malls/<slug>.json.
  python tools/malls.py apply
      Merges every data/malls/*.json into the current data/shops.json and map tiles right away, without the
      nightly download. update_data.py also merges them on every nightly run.
"""
import json, math, pathlib, re, sys, zipfile
from datetime import date
from difflib import SequenceMatcher

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import overture  # noqa: E402
import registries  # noqa: E402

DATA = pathlib.Path(__file__).resolve().parent.parent / "data"
MALLS = DATA / "malls"
NAME_HE, NAME_EN = "name:he", "name:en"
HOURS_SRC = "source:hours"
HEBREW = re.compile(r"[\u0590-\u05ff]")

# Directory categories (Hebrew names, as the centres enter them) -> OpenStreetMap tags. The first match wins, so
# specific kinds come before general ones ("footwear" before "fashion").
CATEGORY_TAGS = [
    ("אופטיקה", {"shop": "optician"}),
    ("ספורט", {"shop": "sports"}),
    ("הנעלה", {"shop": "shoes"}),
    ("תכשיטים", {"shop": "jewelry"}),
    ("הלבשה תחתונה", {"shop": "clothes", "clothes": "underwear"}),
    ("לקטנים", {"shop": "clothes", "clothes": "children"}),
    ("ביוטי", {"shop": "cosmetics"}),
    ("חשמל ואלקטרוניקה", {"shop": "electronics"}),
    ("לבית", {"shop": "houseware"}),
    ("אקססורייז", {"shop": "bag"}),
    ("יוקרה", {"shop": "boutique"}),
    ("אופנה", {"shop": "clothes"}),
    ("נשים", {"shop": "clothes"}),
    ("פנאי", {"shop": "books"}),
]
EAT_HINTS = [(re.compile(r"caf|coffee|espresso|קפה|ארומה|nespresso", re.I), "cafe"),
             (re.compile(r"ice.?cream|gelat|vaniglia|גלידה|sweet|candy|goffre|ממתק", re.I), "ice_cream"),
             (re.compile(r"burger|mcdonald|shake shack|pizza|פיצה|בורגר", re.I), "fast_food")]
# Tenants the app does not list (it is about shops and places to eat).
NOT_SHOPS = re.compile(r"cinema|קולנוע|pop ?up|פופ ?אפ", re.I)
TOYS = re.compile(r"\b(lego|לגו|toys?|צעצועים|צעצוע)\b", re.I)


def _crossings(rings, y):
    """x where the horizontal line at y crosses the rings (outer ring and holes), sorted."""
    xs = []
    for ring in rings:
        for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
            if (y1 > y) != (y2 > y):
                xs.append(x1 + (y - y1) * (x2 - x1) / (y2 - y1))
    return sorted(xs)


def _scan_height(rings, y):
    """A height near y that passes through no vertex, so no edge of the unit or of a hole runs along the line."""
    heights = sorted({p[1] for r in rings for p in r})
    if y not in heights:
        return y
    if len(heights) == 1:
        return y
    i = heights.index(y)
    other = heights[i + 1] if i + 1 < len(heights) else heights[i - 1]
    return (y + other) / 2


def _centroid(geom):
    """A point inside a unit (the point itself for a Point). The average of the outer ring when that lies strictly
    inside the shape; otherwise (an L-shaped unit, or one with a hole) the middle of the widest inside stretch of a
    horizontal line at about that height, so the pin never lands in the next shop, the corridor or on an edge."""
    if geom["type"] == "Point":
        return geom["coordinates"]
    rings = geom["coordinates"] if geom["type"] == "Polygon" else geom["coordinates"][0]
    rings = [r[:-1] if len(r) > 1 and r[0] == r[-1] else r for r in rings]
    outer = rings[0]
    x = sum(p[0] for p in outer) / len(outer)
    y = _scan_height(rings, sum(p[1] for p in outer) / len(outer))
    xs = _crossings(rings, y)
    spans = list(zip(xs[0::2], xs[1::2]))   # inside stretches: between the 1st and 2nd crossing, 3rd and 4th...
    if not spans or any(a < x < b for a, b in spans):
        return [x, y]
    a, b = max(spans, key=lambda ab: ab[1] - ab[0])
    return [(a + b) / 2, y]


def _hebrew_name(loc):
    """The Hebrew spelling: the name itself if it is Hebrew, else the Hebrew tag right after the name (that is how
    the directory lists transliterations), else the first Hebrew tag."""
    name, tags = loc["name"].strip(), [t.strip() for t in loc.get("tags", [])]
    if HEBREW.search(name):
        return name
    low = [t.lower() for t in tags]
    if name.lower() in low:
        i = low.index(name.lower())
        if i + 1 < len(tags) and HEBREW.search(tags[i + 1]):
            return tags[i + 1]
    return next((t for t in tags if HEBREW.search(t)), None)


def _says(loc, rx):
    """The tenant's name or one of its search tags matches rx."""
    return bool(rx.search(loc["name"])) or any(rx.search(t) for t in loc.get("tags", []))


def _eat_kind(loc):
    return next((amenity for rx, amenity in EAT_HINTS if _says(loc, rx)), "restaurant")


def _kind(loc, cats):
    """OSM tags for a tenant, or None when it is not something the app lists (cinema, pop-up stand, toilets...)."""
    names = [cats.get(c) for c in loc.get("categories", [])]
    if loc["type"] == "amenities":
        return {"amenity": "atm"} if loc.get("amenity") == "atm" else None
    if NOT_SHOPS.search(loc["name"]):
        return None
    if _says(loc, TOYS):
        return {"shop": "toys"}   # the directories file toy shops under "kids", next to children's clothes
    if "מזון" in names:
        return {"amenity": _eat_kind(loc)}
    tags = next((dict(t) for cat, t in CATEGORY_TAGS if cat in names), None)
    # A category the directory does not name (men's fashion in these bundles) or none at all: a shop of some kind.
    return tags or ({"shop": "clothes"} if names else {"shop": "yes"})


class _Bundle:
    """The parts of an MVF2 bundle the import needs: locations, their categories, floors and unit shapes."""

    def __init__(self, path):
        self.zip = zipfile.ZipFile(path)
        self.locations = self.read("enterprise/locations.json")
        categories = self.read("enterprise/categories.json")
        self.cats = {c["id"]: c["name"] for c in categories}
        self.loc_cats = {}   # each category lists its locations
        for c in categories:
            for lid in c.get("locations", []):
                self.loc_cats.setdefault(lid, []).append(c["id"])
        self.floors = {f["properties"]["id"]: f["properties"].get("shortName") or f["properties"].get("name")
                       for f in self.read("floor.geojson")["features"]}
        self.shapes = {f["properties"]["id"]: f["geometry"] for f in self.read("node.geojson")["features"]}
        for p in self.zip.namelist():
            if p.startswith("space/") and p.endswith(".geojson"):
                self.shapes.update({f["properties"]["id"]: f["geometry"] for f in self.read(p)["features"]})

    def read(self, path):
        return json.loads(self.zip.read(path))

    def place(self, loc):
        """(geometry, floor id) of a location: its unit, else its entrance node."""
        for refs, floor_key in ((loc.get("spaces", []), "floor"), (loc.get("nodes", []), "map")):
            for r in refs:
                if r["id"] in self.shapes:
                    return self.shapes[r["id"]], r.get(floor_key)
        return None, None


def _contacts(loc):
    phone = loc.get("phone")
    if isinstance(phone, dict):
        phone = phone.get("number")
    found = {"phone": phone, "website": (loc.get("social") or {}).get("website")}
    return {k: str(v).split("?")[0][:200] for k, v in found.items() if v}


def _tenant(loc, kind, geo, level):
    lon, lat = _centroid(geo)
    item = {"id": str(loc.get("externalId") or loc["id"]), "lat": round(lat, 6), "lon": round(lon, 6),
            "name": loc["name"].strip(), **kind, "level": level}
    he = _hebrew_name(loc)
    if he and he != item["name"]:
        item[NAME_HE] = he
    if not HEBREW.search(item["name"]):
        item[NAME_EN] = item["name"]
    item.update(_contacts(loc))
    return item


def convert(bundle, slug, name_he, name_en, source):
    b = _Bundle(bundle)
    out, skipped = [], []
    for loc in b.locations:
        if loc.get("hidden"):
            continue
        loc = dict(loc, categories=b.loc_cats.get(loc["id"], []))
        kind = _kind(loc, b.cats)
        geo, floor_id = b.place(loc)
        if kind and geo:
            out.append(_tenant(loc, kind, geo, b.floors.get(floor_id)))
        else:
            skipped.append(loc["name"])
    MALLS.mkdir(parents=True, exist_ok=True)
    doc = {"_note": "Tenant list of a shopping centre (facts only), converted by tools/malls.py from its indoor-map export.",
           "slug": slug, "name": name_he, NAME_EN: name_en, "source": source, "fetched": date.today().isoformat(),
           "opening_hours": None, "tenants": sorted(out, key=lambda t: (str(t.get("level")), t["name"].lower()))}
    path = MALLS / f"{slug}.json"
    path.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{path.name}: {len(out)} tenants; skipped {len(skipped)}: {', '.join(skipped)}")
    return doc


def _names(tags, keys=("name", NAME_HE, NAME_EN, "brand")):
    return [n.replace(" ", "") for n in (overture.norm(tags.get(k)) for k in keys) if n]


def _close(a, b):
    """A slightly different spelling of the same name. One name inside the other is a different shop in a mall
    ("H&M" and "H&M HOME", "Zara" and "Zara Home"), so that never counts."""
    return min(len(a), len(b)) >= 5 and a not in b and b not in a and SequenceMatcher(None, a, b).ratio() >= 0.85


def _branch_of_brand(tags, mine, here):
    """A place named "<brand> <this centre>" ("The North Face Glilot Tel Aviv") for a tenant named just the brand.
    "Zara Home" with brand=Zara is not "Zara": what follows the brand there is a product line, not the place."""
    brand = _names(tags, ("brand",))
    if not brand or brand[0] not in mine:
        return False
    rest = [n[len(brand[0]):] for n in _names(tags, ("name", NAME_HE, NAME_EN)) if n.startswith(brand[0])]
    return any(w in r for r in rest for w in here)


def _match(tags, item, chain=False, here=()):
    """'exact' when a name is the same in some language (case, spaces and punctuation aside), 'brand' when the
    tenant's name starts with the chain brand of a known branch ("Super-pharm gallery" and Super-Pharm), 'close'
    for a very similar spelling, else None. Stricter than the Overture matcher: a mall has many short brand names
    side by side."""
    keys = ("name", NAME_HE, NAME_EN)
    mine, theirs = _names(item, keys), _names(tags, keys)
    if any(a == b for a in theirs for b in mine) or _branch_of_brand(tags, mine, here):
        return "exact"
    # A brand alone is never a name match ("Zara Home" may carry brand=Zara). The prefix rule is only for branches
    # from a chain's official list, named "<chain> <branch>", and tenants named "<chain> <branch>" too:
    # "Super-pharm gallery" and "סופר-פארם גאלרי ביג גלילות". A record named just the brand, or a tenant named just
    # the brand, is never matched this way ("Example" and "Example Home" are two shops).
    brand = _names(tags, ("brand",))
    if chain and brand and len(brand[0]) >= 5 and brand[0] not in _names(tags, ("name",)) \
            and any(b.startswith(brand[0]) and b != brand[0] for b in mine):
        return "brand"
    if any(_close(a, b) for a in theirs for b in mine):
        return "close"
    return None


def _is_chain_branch(shop):
    """From a chain's official branch list: added by it (ids "c...") or an OSM place it confirmed (src "chain:...")."""
    return shop[0].startswith("c") or any(x.startswith("chain:") for x in (shop[3].get("src") or "").split(";"))


def _same_place(shop, t, d, here):
    """Is the known place `shop`, d metres away, this tenant? `here`: words of the centre's name."""
    how = _match(shop[3], t, chain=_is_chain_branch(shop), here=here)
    same_kind = overture.group(shop[3]) == overture.group(t)
    if how == "brand" or (how == "exact" and shop[3].get("brand") and not same_kind):
        return d < 120   # a chain branch keeps its own kind (Super-Pharm is a pharmacy, not "beauty")
    if not same_kind:
        return False
    if how == "exact":
        # Far only for Overture points, often pinned anywhere on a centre's roof; an OpenStreetMap point 100+ m
        # away may be another branch (in a neighbouring centre).
        return shop[0].startswith("ov") or d < 90
    # ATMs rarely have a name: the nearest one is the same machine.
    return (how == "close" and d < 90) or (t.get("amenity") == "atm" and d < 40)


def _known(grid, t, here):
    """The nearest known place that is this tenant, within 350 m (grid cells are ~250 m), and its distance."""
    gy, gx = round(t["lat"] * 200), round(t["lon"] * 200)
    near = [s for dy in range(-2, 3) for dx in range(-2, 3) for s in grid.get((gy + dy, gx + dx), [])]
    found = sorted((registries.dist(t["lat"], t["lon"], s[1], s[2]), i, s) for i, s in enumerate(near))
    return next(((s, d) for d, _, s in found if d < 350 and _same_place(s, t, d, here)), (None, None))


KIND_KEYS = ("shop", "amenity", "clothes")


def _set_or_drop(tags, key, value):
    if value:
        tags[key] = value
    else:
        tags.pop(key, None)


def _enrich(shop, t, d, doc, extra):
    """Floor, centre and contacts for a place already on the map; it moves to its unit when pinned 40+ m away.
    A place this importer added itself also takes the directory's current kind; others keep their own."""
    tags = shop[3]
    if shop[0].startswith(f"m{doc['slug']}-"):
        for k in KIND_KEYS:
            _set_or_drop(tags, k, t.get(k))
    moved = d > 40
    if moved:
        shop[1], shop[2] = t["lat"], t["lon"]
    for k, v in extra.items():   # floor and centre come from the directory: always its current values
        _set_or_drop(tags, k, v)
    for k in ("phone", "website", NAME_HE, NAME_EN):   # contacts and names: only fill what other sources lack
        tags[k] = tags.get(k) or t.get(k)
        _set_or_drop(tags, k, tags[k])
    # The centre's hours fill a gap, and replace hours this centre set before; hours from elsewhere (a chain) stay.
    mine = tags.get(HOURS_SRC) == _hours_source(doc)
    if doc.get("opening_hours") and (mine or not tags.get("opening_hours")):
        tags["opening_hours"] = doc["opening_hours"]
        tags[HOURS_SRC] = _hours_source(doc)
    return moved


def _hours_source(doc):
    return "mall:" + doc["slug"]


def _own_id(doc, t):
    """The id of the place this importer adds for a tenant: m<centre>-<directory id>."""
    return f"m{doc['slug']}-{t['id']}"[:60]


def _new_place(t, doc, extra, src):
    tags = {k: v for k, v in t.items() if k not in ("id", "lat", "lon") and v}
    tags.update({k: v for k, v in extra.items() if v})
    if doc.get("opening_hours"):
        tags["opening_hours"] = doc["opening_hours"]
        tags[HOURS_SRC] = _hours_source(doc)
    tags["src"] = src
    return [_own_id(doc, t), t["lat"], t["lon"], tags]


# Words shared by many centres' names (chain and kind of centre), which say nothing about which centre it is.
CENTRE_WORDS = {"big", "fashion", "mall", "center", "centre", "outlet", "power", "shopping", "park",
                "ביג", "פאשן", "קניון", "מרכז", "אאוטלט", "פאוור", "סנטר", "פארק", "מסחרי"}


def _place_words(doc):
    """Distinctive words of the centre's name ("glilot", "גלילות"), to recognise "<brand> <this centre>" names."""
    return {w for n in (doc["name"], doc.get(NAME_EN)) for w in overture.norm(n).split()
            if len(w) >= 4 and w not in CENTRE_WORDS}


def merge_into(shops):
    """Adds every centre's tenants to shops ([[id, lat, lon, tags]]). A tenant already on the map gets the floor,
    the centre's name, phone and website, and moves to its unit when it was pinned more than 40 m away; the others
    are added. Running it again changes nothing. Already on the map means: the same name within 350 m for an
    Overture point (often pinned anywhere on a big centre's roof), the same or a very similar name within 90 m
    otherwise, or a chain branch whose brand the name starts with within 120 m. Returns stats per centre."""
    stats = {}
    if not MALLS.exists():
        return stats
    grid = {}
    for s in shops:
        grid.setdefault((round(s[1] * 200), round(s[2] * 200)), []).append(s)
    for path in sorted(MALLS.glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        st = {"tenants": 0, "matched": 0, "added": 0, "moved": 0}
        src = f"mall:{doc['slug']}@{doc['fetched']}"
        here = _place_words(doc)
        prefix = f"m{doc['slug']}-"
        ids = {s[0]: s for s in shops if s[0].startswith(prefix)}
        for t in doc["tenants"]:
            st["tenants"] += 1
            extra = {"level": t.get("level"), "mall": doc["name"], "mall:en": doc.get(NAME_EN)}
            # A place this importer added is found by its id, whatever its kind became since; others by name.
            own = ids.get(_own_id(doc, t))
            shop, d = (own, registries.dist(t["lat"], t["lon"], own[1], own[2])) if own else _known(grid, t, here)
            if shop:
                st["matched"] += 1
                st["moved"] += _enrich(shop, t, d, doc, extra)
                registries.add_src(shop[3], src)
            else:
                item = _new_place(t, doc, extra, src)
                shops.append(item)
                ids[item[0]] = item
                grid.setdefault((round(t["lat"] * 200), round(t["lon"] * 200)), []).append(item)
                st["added"] += 1
        stats[doc["slug"]] = st
    return stats


def apply_now():
    import update_data
    doc = json.loads(update_data.OUT.read_text(encoding="utf-8"))
    shops = doc["shops"]
    before = len(shops)
    for slug, st in merge_into(shops).items():
        print(f"  {slug}: {st}")
    update_data.write_tiles(shops)
    doc["shops"] = shops
    update_data.OUT.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{before} -> {len(shops)} shops")


if __name__ == "__main__":
    if len(sys.argv) >= 7 and sys.argv[1] == "import":
        convert(*sys.argv[2:7])
    elif sys.argv[1:] == ["apply"]:
        apply_now()
    else:
        sys.exit(__doc__)
