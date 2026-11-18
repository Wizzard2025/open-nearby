"""Official store lists that Israeli food retailers must publish under the Food (Price Transparency) Law.
The Consumer Protection Authority lists the sites: https://www.gov.il/he/pages/cpfta_prices_regulations
Only sites that need no login are used here. Each "Stores" file gives every branch's name, street address and
locality code; we place it on the map by address (Nominatim, cached in data/geocache.json) and then
confirm the matching map point or add the branch. Places get src "chain:<key>@<file date>".

Also here: the official list of Israeli localities (CBS, data.gov.il), used to turn locality codes into names
and to report which towns and villages have no data yet (tools/coverage.py).
"""
import gzip, io, json, math, pathlib, re, subprocess, sys, time, urllib.parse
import xml.etree.ElementTree as ET

import chains

DATA = pathlib.Path(__file__).resolve().parent.parent / "data"
UA = "open-nearby-data/1.0 (+https://betahopen.app)"


def curl(url, data=None, timeout=90):
    # curl uses the operating system's certificate store, which these portals' certificate chains need.
    cmd = ["curl", "-sSL", "--max-time", str(timeout), "-A", UA]
    if data:
        cmd += ["--data", urllib.parse.urlencode(data)]
    r = subprocess.run(cmd + [url], capture_output=True, timeout=timeout + 10)
    if r.returncode:
        raise RuntimeError(r.stderr.decode("utf-8", "ignore")[:200])
    return r.stdout


# ---------- localities (CBS code -> name, position, population) ----------
def itm_to_wgs84(e, n):
    """Israeli Transverse Mercator -> WGS84 (good to a few tens of metres, enough for towns)."""
    a, f = 6378137.0, 1 / 298.257222101
    k0, lat0, lon0, fe, fn = 1.0000067, math.radians(31.7343936111111), math.radians(35.2045169444444), 219529.584, 626907.390
    e2 = f * (2 - f); ep2 = e2 / (1 - e2)
    def M(phi):
        return a * ((1 - e2 / 4 - 3 * e2**2 / 64 - 5 * e2**3 / 256) * phi - (3 * e2 / 8 + 3 * e2**2 / 32 + 45 * e2**3 / 1024) * math.sin(2 * phi)
                    + (15 * e2**2 / 256 + 45 * e2**3 / 1024) * math.sin(4 * phi) - (35 * e2**3 / 3072) * math.sin(6 * phi))
    m = M(lat0) + (n - fn) / k0
    mu = m / (a * (1 - e2 / 4 - 3 * e2**2 / 64 - 5 * e2**3 / 256))
    e1 = (1 - math.sqrt(1 - e2)) / (1 + math.sqrt(1 - e2))
    phi1 = mu + (3 * e1 / 2 - 27 * e1**3 / 32) * math.sin(2 * mu) + (21 * e1**2 / 16 - 55 * e1**4 / 32) * math.sin(4 * mu) + (151 * e1**3 / 96) * math.sin(6 * mu)
    c1 = ep2 * math.cos(phi1) ** 2; t1 = math.tan(phi1) ** 2
    n1 = a / math.sqrt(1 - e2 * math.sin(phi1) ** 2); r1 = a * (1 - e2) / (1 - e2 * math.sin(phi1) ** 2) ** 1.5
    d = (e - fe) / (n1 * k0)
    lat = phi1 - (n1 * math.tan(phi1) / r1) * (d**2 / 2 - (5 + 3 * t1 + 10 * c1 - 4 * c1**2 - 9 * ep2) * d**4 / 24)
    lon = lon0 + (d - (1 + 2 * t1 + c1) * d**3 / 6 + (5 - 2 * c1 + 28 * t1 - 3 * c1**2 + 8 * ep2 + 24 * t1**2) * d**5 / 120) / math.cos(phi1)
    return round(math.degrees(lat), 5), round(math.degrees(lon), 5)


def localities():
    cache = DATA / "registries" / "localities.json"
    try:
        url = "https://data.gov.il/api/3/action/datastore_search?resource_id=d47a54ff-87f0-44b3-b33a-f284c0c38e5a&limit=5000"
        recs = json.loads(curl(url))["result"]["records"]
        out = {}
        for r in recs:
            code, name = r.get("סמל יישוב"), (r.get("שם יישוב") or "").strip()
            c = str(r.get("קואורדינטות") or "")
            pos = itm_to_wgs84(int(c[:6]), int(c[6:])) if len(c) == 12 and c.isdigit() else None
            out[str(code)] = {"name": name, "en": (r.get("שם יישוב באנגלית") or "").strip(), "pop": r.get("סך הכל אוכלוסייה 2023 - ארעי") or 0, "pos": pos}
        if len(out) > 1000:
            cache.parent.mkdir(parents=True, exist_ok=True)
            cache.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
            return out
    except Exception as e:
        print(f"localities: download failed ({e}); using the last good copy", file=sys.stderr)
    return json.loads(cache.read_text(encoding="utf-8")) if cache.exists() else {}


# ---------- reading a Stores file ----------
def parse_stores(raw):
    if raw[:2] == b"\x1f\x8b":
        raw = gzip.decompress(raw)
    for enc in ("utf-16", "utf-8-sig", "utf-8", "cp1255"):
        try:
            text = raw.decode(enc)
            if "<" in text[:200]:
                break
        except UnicodeDecodeError:
            continue
    text = re.sub(r"<\?xml[^>]*\?>", "", text).strip()
    root = ET.fromstring(text)
    def low(el):
        for x in el.iter():
            x.tag = x.tag.split("}")[-1].lower()
    low(root)
    chain_name = (root.findtext(".//chainname") or "").strip()
    stores = []
    for st in root.iter("store"):
        g = lambda k: (st.findtext(k) or "").strip()
        stores.append({"id": g("storeid"), "name": g("storename"), "address": g("address"), "city": g("city"),
                       "sub": g("subchainname"), "chain": chain_name})
    return stores


# ---------- sources (no login needed) ----------
def carrefour():
    page = curl("https://prices.carrefour.co.il/").decode("utf-8", "ignore")
    path = re.search(r"const path = '(\d+)'", page).group(1)
    files = json.loads(re.search(r"const files = (\[.*?\]);", page, re.S).group(1))
    name = sorted(f["name"] for f in files if f["name"].lower().startswith("stores"))[-1]
    return parse_stores(curl(f"https://prices.carrefour.co.il/{path}/{name}")), path


def bina(host):
    def f():
        idx = json.loads(curl(f"https://{host}/MainIO_Hok.aspx", data={"WStore": "0", "WDate": "", "WFileType": "1"}))
        name = sorted(x["FileNm"] for x in idx if x["FileNm"].lower().startswith("stores"))[-1]
        link = json.loads(curl(f"https://{host}/Download.aspx?FileNm={urllib.parse.quote(name)}"))[0]["SPath"]
        date = re.search(r"-(\d{8})-", name).group(1)
        return parse_stores(curl(link)), date
    return f


# key: (fetcher, OSM tag set for added branches, words that identify the brand on map points)
SOURCES = {
    "carrefour": (carrefour, {"shop": "supermarket"}, ["קרפור", "carrefour", "יינות ביתן", "מגה", "mega"]),
    "kingstore": (bina("kingstore.binaprojects.com"), {"shop": "supermarket"}, ["קינג סטור", "king store"]),
    "maayan2000": (bina("maayan2000.binaprojects.com"), {"shop": "supermarket"}, ["מעיין 2000", "מעיין אלפיים"]),
    "goodpharm": (bina("goodpharm.binaprojects.com"), {"shop": "chemist"}, ["גוד פארם", "good pharm"]),
    "zolvebegadol": (bina("zolvebegadol.binaprojects.com"), {"shop": "supermarket"}, ["זול ובגדול"]),
    "supersapir": (bina("supersapir.binaprojects.com"), {"shop": "supermarket"}, ["סופר ספיר", "ספיר"]),
    "citymarket": (bina("citymarketkiryatgat.binaprojects.com"), {"shop": "supermarket"}, ["סיטי מרקט", "city market"]),
    "superbareket": (bina("superbareket.binaprojects.com"), {"shop": "butcher"}, ["ברקת"]),
    "ktshivuk": (bina("ktshivuk.binaprojects.com"), {"shop": "supermarket"}, ["משנת יוסף"]),
    "shukhayir": (bina("shuk-hayir.binaprojects.com"), {"shop": "supermarket"}, ["שוק העיר"]),
    "shefa": (bina("shefabirkathashem.binaprojects.com"), {"shop": "supermarket"}, ["שפע ברכת השם"]),
}


def fetch(key, locs):
    cache = DATA / "registries" / f"stores_{key}.json"
    try:
        stores, date = SOURCES[key][0]()
        by_name = {L["name"]: L for L in locs.values()}
        date = f"{date[:4]}-{date[4:6]}-{date[6:8]}"
        out = []
        for s in stores:
            city = locs.get(s["city"].lstrip("0"), {}).get("name") if s["city"].isdigit() else s["city"]
            if not city or not s["address"]:
                continue
            pos, approx = chains.geocode(s["address"], city), False
            if not pos:
                # In a small town or village the branch is near the centre anyway: place it there, marked approximate.
                L = locs.get(s["city"].lstrip("0")) if s["city"].isdigit() else by_name.get(city)
                if L and L.get("pos") and (L.get("pop") or 0) < 15000:
                    pos, approx = L["pos"], True
            if not pos:
                continue
            out.append({"id": f"st-{key}-{s['id']}", "lat": pos[0], "lon": pos[1], "name": s["name"] or s["chain"], "chain": s["chain"],
                        "addr": s["address"], "city": city, "date": date, "approx": approx})
        if len(out) >= max(1, len(stores) // 3):
            cache.parent.mkdir(parents=True, exist_ok=True)
            cache.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
        print(f"stores {key}: {len(stores)} in file, {len(out)} placed")
        return out
    except Exception as e:
        print(f"stores {key}: failed ({e}); using the last good copy", file=sys.stderr)
        return json.loads(cache.read_text(encoding="utf-8")) if cache.exists() else []


def merge_into(shops):
    import registries
    locs = localities()
    grid = {}
    for s in shops:
        grid.setdefault((round(s[1] * 100), round(s[2] * 100)), []).append(s)
    stats = {}
    for key, (_, base_tags, words) in SOURCES.items():
        st = {"stores": 0, "confirmed": 0, "added": 0}
        used = set()
        for b in fetch(key, locs):
            st["stores"] += 1
            best, bd = None, 250
            gy, gx = round(b["lat"] * 100), round(b["lon"] * 100)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    for s in grid.get((gy + dy, gx + dx), []):
                        if s[0] in used:
                            continue
                        # Match by the place's current name only: an old brand tag (e.g. "Mega" on a store now called
                        # Yochananof) must not make it look like another chain's branch.
                        lab = " | ".join(str(s[3].get(k, "")).lower() for k in ("name", "name:he", "name:en"))
                        if not any(w.lower() in lab for w in words):
                            continue
                        d = registries.dist(b["lat"], b["lon"], s[1], s[2])
                        if d < bd:
                            best, bd = s, d
            src = f"chain:{key}@{b['date']}"
            if best:
                used.add(best[0]); st["confirmed"] += 1
                registries.add_src(best[3], src)
                best[3].setdefault("addr:street", b["addr"]); best[3].setdefault("addr:city", b["city"])
            else:
                tags = dict(base_tags, name=b["name"], brand=b["chain"] or None, **{"addr:street": b["addr"], "addr:city": b["city"]})
                if b.get("approx"):
                    tags["location:approx"] = "yes"
                tags = {k: v for k, v in tags.items() if v}
                registries.add_src(tags, src)
                shops.append([b["id"], b["lat"], b["lon"], tags])
                st["added"] += 1
        stats[key] = st
    return stats
