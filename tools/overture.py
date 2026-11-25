"""Overture Maps Foundation places (free, open: CDLA-Permissive-2.0 / ODbL), conflated from Meta (business pages),
Microsoft, Foursquare and AllThePlaces. https://overturemaps.org — attribution: "© Overture Maps Foundation".

We take the places that fit the app's categories with confidence >= 0.6, skip ones marked closed, confirm map points
that are already there (by distance + similar name) and add the rest with src "ovt@<date the source last saw it>".
The filtered Israel extract is kept in data/registries/overture.json, so a run without DuckDB/internet keeps the places.
"""
import json, pathlib, re, sys, urllib.request
from difflib import SequenceMatcher

DATA = pathlib.Path(__file__).resolve().parent.parent / "data"
CACHE = DATA / "registries" / "overture.json"
MIN_CONF = 0.6

# Overture category -> OSM-style tags the app understands
T = {
    "supermarket": {"shop": "supermarket"}, "grocery_store": {"shop": "convenience"}, "convenience_store": {"shop": "convenience"},
    "food_and_beverage_store": {"shop": "convenience"}, "produce_store": {"shop": "greengrocer"}, "butcher_shop": {"shop": "butcher"},
    "delicatessen": {"shop": "deli"}, "health_food_store": {"shop": "health_food"}, "liquor_store": {"shop": "alcohol"},
    "candy_store": {"shop": "confectionery"}, "fishmonger": {"shop": "seafood"},
    "bakery": {"shop": "bakery"}, "dessert_shop": {"shop": "pastry"}, "chocolatier": {"shop": "pastry"},
    "pharmacy": {"amenity": "pharmacy"}, "drugstore": {"shop": "chemist"},
    "gas_station": {"amenity": "fuel"},
    "atm": {"amenity": "atm"}, "currency_exchange": {"amenity": "bureau_de_change"}, "money_transfer_service": {"amenity": "money_transfer"},
    "restaurant": {"amenity": "restaurant"}, "fast_food_restaurant": {"amenity": "fast_food"}, "cafe": {"amenity": "cafe"},
    "coffee_shop": {"amenity": "cafe"}, "ice_cream_shop": {"amenity": "ice_cream"}, "sandwich_shop": {"amenity": "fast_food", "cuisine": "sandwich"},
    "diner": {"amenity": "restaurant"}, "juice_bar": {"amenity": "cafe", "cuisine": "juice"}, "food_court": {"amenity": "food_court"},
    "clothing_store": {"shop": "clothes"}, "womens_clothing_store": {"shop": "clothes"}, "mens_clothing_store": {"shop": "clothes"},
    "childrens_clothing_store": {"shop": "clothes"}, "fashion_boutique": {"shop": "boutique"}, "fashion_and_apparel_store": {"shop": "clothes"},
    "lingerie_store": {"shop": "clothes"}, "sportswear_store": {"shop": "sports"}, "shoe_store": {"shop": "shoes"},
    "mobile_phone_store": {"shop": "mobile_phone"}, "electronics_store": {"shop": "electronics"}, "computer_store": {"shop": "computer"},
    "jewelry_store": {"shop": "jewelry"}, "flowers_and_gifts_store": {"shop": "florist"}, "florist": {"shop": "florist"}, "gift_shop": {"shop": "gift"},
    "furniture_store": {"shop": "furniture"}, "home_goods_store": {"shop": "houseware"}, "hardware_store": {"shop": "hardware"},
    "home_improvement_store": {"shop": "doityourself"}, "building_supply_store": {"shop": "trade"}, "eyewear_store": {"shop": "optician"},
    "bike_store": {"shop": "bicycle"}, "sporting_goods_store": {"shop": "sports"}, "tobacco_shop": {"shop": "tobacco"},
    "beauty_supply_store": {"shop": "cosmetics"}, "personal_care_and_beauty_store": {"shop": "cosmetics"}, "book_store": {"shop": "books"},
    "bookstore": {"shop": "books"}, "toy_store": {"shop": "toys"}, "pet_store": {"shop": "pet"}, "lighting_store": {"shop": "lighting"},
    "mattress_store": {"shop": "bed"}, "carpet_store": {"shop": "carpet"}, "nursery_and_gardening_store": {"shop": "garden_centre"},
    "vitamin_and_supplement_store": {"shop": "nutrition_supplements"}, "discount_store": {"shop": "variety_store"},
    "department_store": {"shop": "department_store"}, "shopping_mall": {"shop": "mall"}, "stationery_store": {"shop": "stationery"},
    "office_supply_store": {"shop": "stationery"}, "kitchen_supply_store": {"shop": "houseware"}, "appliance_store": {"shop": "appliance"},
    "baby_gear_and_furniture_store": {"shop": "baby_goods"}, "pawn_shop": {"shop": "pawnbroker"}, "thrift_store": {"shop": "second_hand"},
    "hair_salon": {"shop": "hairdresser"}, "barber": {"shop": "hairdresser"}, "beauty_salon": {"shop": "beauty"},
    "nail_salon": {"shop": "beauty", "beauty": "nails"}, "cosmetics_store": {"shop": "cosmetics"}, "perfume_store": {"shop": "perfumery"},
    "music_store": {"shop": "musical_instrument"}, "photography_store": {"shop": "photo"}, "watch_store": {"shop": "watches"},
}
CUISINE = {"pizza": "pizza", "burger": "burger", "sushi": "sushi", "italian": "italian", "middle_eastern": "middle_eastern", "asian": "asian",
           "seafood": "seafood", "steakhouse": "steak_house", "mediterranean": "mediterranean", "chicken": "chicken", "barbecue": "grill",
           "breakfast_and_brunch": "breakfast", "chinese": "chinese", "japanese": "japanese", "thai": "thai", "indian": "indian",
           "mexican": "mexican", "falafel": "falafel", "shawarma": "shawarma", "hummus": "hummus", "vegan": "vegan", "vegetarian": "vegetarian",
           "georgian": "georgian", "french": "french", "american": "american", "noodles": "noodle", "bagel": "bagel"}


def tags_for(cat):
    if not cat:
        return None
    if cat in T:
        return dict(T[cat])
    if cat.endswith("_restaurant"):
        base = cat[: -len("_restaurant")]
        tg = {"amenity": "restaurant"}
        if base == "kosher":
            tg["diet:kosher"] = "yes"
        elif base in CUISINE:
            tg["cuisine"] = CUISINE[base]
        return tg
    return None


def latest_release():
    with urllib.request.urlopen("https://stac.overturemaps.org/catalog.json", timeout=60) as r:
        cat = json.load(r)
    rels = sorted(l["href"].split("/")[-2] for l in cat["links"] if l.get("rel") == "child")
    return rels[-1]


def download():
    import duckdb  # pip install duckdb
    rel = latest_release()
    con = duckdb.connect()
    con.sql("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")
    src = f"s3://overturemaps-us-west-2/release/{rel}/theme=places/type=place/*"
    rows = con.sql(f"""SELECT id, names.primary, taxonomy.primary, confidence, operating_status, bbox.xmin, bbox.ymin,
        addresses[1].freeform, addresses[1].locality, brand.names.primary, websites[1], phones[1], sources[1].update_time
      FROM read_parquet('{src}', hive_partitioning=1)
      WHERE bbox.xmin BETWEEN 34.2 AND 35.9 AND bbox.ymin BETWEEN 29.45 AND 33.35 AND confidence >= {MIN_CONF}""").fetchall()
    out = []
    for (oid, name, cat, conf, status, lon, lat, addr, city, brand, web, phone, upd) in rows:
        tg = tags_for(cat)
        if not tg or not name or (status and status != "open"):
            continue
        tg["name"] = name.strip()[:80]
        for k, v in (("brand", brand), ("website", web), ("phone", phone), ("addr:street", addr), ("addr:city", city)):
            if v:
                tg[k] = str(v).strip()[:120]
        out.append([oid[:16], round(lat, 6), round(lon, 6), round(conf, 2), (upd or "")[:10], tg])
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps({"release": rel, "places": out}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"overture {rel}: {len(out)} places kept")
    return out


def load():
    try:
        return download()
    except Exception as e:
        print(f"overture: download failed ({e}); using the last good copy", file=sys.stderr)
        return json.loads(CACHE.read_text(encoding="utf-8"))["places"] if CACHE.exists() else []


def norm(x):
    x = (x or "").lower()
    x = re.sub(r"[\"'׳״`\-\.,()|/]", " ", x)
    x = re.sub(r"\b(סניף|branch|בע\"?מ|ltd)\b", " ", x)
    return re.sub(r"\s+", " ", x).strip()


def same_name(a_tags, b_name):
    b = norm(b_name)
    if not b:
        return False
    for k in ("name", "name:he", "name:en", "brand", "name:ru"):
        a = norm(a_tags.get(k))
        if a and (a == b or a in b or b in a or SequenceMatcher(None, a, b).ratio() >= 0.62):
            return True
    return False


def group(tags):
    a, s = tags.get("amenity"), tags.get("shop")
    if a in ("atm", "bank", "bureau_de_change", "money_transfer"):
        return "money"
    if a in ("restaurant", "fast_food", "cafe", "ice_cream", "food_court"):
        return "eat"
    if a == "fuel":
        return "fuel"
    if a == "pharmacy" or s == "chemist":
        return "pharmacy"
    return "shop"


# A chain's official branch list pins a branch at its door; Overture often puts the same shop 60-150 m away and in
# another category (Shufersal supermarkets come as "pharmacy"), which would leave a twin without hours beside it.
CHAIN_RADIUS = 150


def chain_of(shop):
    """The chain whose official branch list added ("c<chain><id>") or confirmed (src "chain:<chain>@...") a place."""
    for x in (shop[3].get("src") or "").split(";"):
        if x.startswith("chain:"):
            return x[len("chain:"):].split("@")[0]
    m = re.match(r"c([a-z]+)\d", shop[0])
    return m.group(1) if m else None


def named_after(chain_key, name):
    """Does a place name start with the chain's name, as whole words ("שופרסל דיל ...", "Super Pharm"), or is it the
    chain's short name ("Be")? A name that only mentions the chain ("iTouch (ליד סופר פארם)") or merely starts with the
    same letters ("ויקטוריה קוסמטיקס" and Victory) is not."""
    import chains
    n = norm(name)
    for a in (norm(x) for x in chains.ALIASES.get(chain_key, [])):
        if (n == a) if len(a) <= 3 else re.match(rf"{re.escape(a)}(?!\w)", n):
            return True
    return False


def _chain_key(shop):
    """chain_of(), with Shufersal's Be pharmacies told apart from its supermarkets."""
    key = chain_of(shop)
    if key == "shufersal" and named_after("shufersal:Be", shop[3].get("name")):
        return "shufersal:Be"
    return key


def chain_twin(grid, lat, lon, tags):
    """The nearest branch from a chain's official list within CHAIN_RADIUS m that this place is named after."""
    import registries
    gy, gx = round(lat * 200), round(lon * 200)
    near = (s for dy in (-1, 0, 1) for dx in (-1, 0, 1) for s in grid.get((gy + dy, gx + dx), []))
    found = [(registries.dist(lat, lon, s[1], s[2]), s[0], s) for s in near
             if (key := _chain_key(s)) and named_after(key, tags.get("name"))]
    found = [f for f in found if f[0] <= CHAIN_RADIUS]
    return min(found)[2] if found else None


def merge_into(shops):
    import registries
    grid = {}
    for s in shops:
        grid.setdefault((round(s[1] * 200), round(s[2] * 200)), []).append(s)
    import stores
    towns = {}
    for L in stores.localities().values():
        if L.get("pos"):
            for nm in (L["name"], L.get("en")):
                if nm:
                    towns[norm(nm)] = L["pos"]
    st = {"places": 0, "confirmed": 0, "added": 0, "wrong_town": 0}
    for oid, lat, lon, conf, upd, tg in load():
        st["places"] += 1
        town = towns.get(norm(tg.get("addr:city")))
        if town and registries.dist(lat, lon, town[0], town[1]) > 15000:
            st["wrong_town"] += 1  # the address says another town: the pin is unreliable, leave it out
            continue
        g = group(tg)
        best = None
        gy, gx = round(lat * 200), round(lon * 200)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                for s in grid.get((gy + dy, gx + dx), []):
                    if group(s[3]) != g and not (g == "shop" and s[3].get("shop")):
                        continue
                    if registries.dist(lat, lon, s[1], s[2]) <= 60 and same_name(s[3], tg["name"]):
                        best = s
                        break
                if best: break
            if best: break
        best = best or chain_twin(grid, lat, lon, tg)
        src = f"ovt@{upd}" if upd else "ovt"
        if best:
            st["confirmed"] += 1
            registries.add_src(best[3], src)
            for k in ("phone", "website", "addr:street", "addr:city", "cuisine"):
                if tg.get(k) and not best[3].get(k):
                    best[3][k] = tg[k]
        else:
            tags = dict(tg)
            tags["ovt:conf"] = str(conf)
            registries.add_src(tags, src)
            item = [f"ov{oid}", lat, lon, tags]
            shops.append(item)
            grid.setdefault((gy, gx), []).append(item)
            st["added"] += 1
    return st
