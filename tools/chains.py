"""Official branch lists and opening hours of Israeli chains.

Each fetcher returns a list of Branch dicts:
  {chain, id, lat, lon, opening_hours, tags}
where opening_hours is already converted to OSM syntax (or None).
merge_into() then attaches hours to matching OpenStreetMap points, or adds missing branches.
"""
import html, http.cookiejar, json, math, pathlib, re, sys, time, urllib.parse, urllib.request
from datetime import date

UA = {"User-Agent": "Mozilla/5.0 (open-nearby data updater)"}
DATA = pathlib.Path(__file__).resolve().parent.parent / "data"


def get(url, data=None, opener=None, timeout=40):
    req = urllib.request.Request(url, data=data, headers=UA)
    with (opener or urllib.request.build_opener()).open(req, timeout=timeout) as r:
        return r.read().decode("utf-8-sig", "replace")


# ---------------------------------------------------------------- Hebrew hours -> OSM opening_hours
DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
LETTER = {"א": 0, "ב": 1, "ג": 2, "ד": 3, "ה": 4, "ו": 5, "ש": 6}
WORD = {"ראשון": 0, "שני": 1, "שלישי": 2, "רביעי": 3, "חמישי": 4, "שישי": 5, "שבת": 6}
HEB = "א-ת"
DAY_TOKEN = rf"(?:מוצ[\"״']?ש|מוצאי\s+שבת|ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת|(?<![{HEB}])[אבגדהוש](?:['׳’]|(?![{HEB}])))"
DAY_SPEC = re.compile(rf"({DAY_TOKEN})(?:\s*[-–]\s*({DAY_TOKEN}))?")
TIME = r"(\d{1,2})[:.](\d{2})"
RANGE = re.compile(rf"{TIME}\s*(?:-|–|עד)\s*{TIME}")


def is_summer(d=None):
    d = d or date.today()
    return 4 <= d.month <= 10 or (d.month == 3 and d.day >= 27)


def day_index(tok):
    tok = tok.strip()
    if tok.startswith("מוצ"):
        return 7  # Saturday night
    if tok in WORD:
        return WORD[tok]
    return LETTER.get(tok[0])


def hhmm(h, m):
    h, m = int(h), int(m)
    return f"{h:02d}:{m:02d}" if (h, m) != (0, 0) else "00:00"


def clean(text):
    text = html.unescape(text or "")
    text = re.sub(r"<\s*br\s*/?>|</p>|</div>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = text.replace("\xa0", " ").replace("״", '"').replace("׳", "'").replace("’", "'")
    # Seasonal variants: keep the one for the current season.
    pick = 2 if is_summer() else 1
    text = re.sub(rf"שעון\s+חורף\s*[-:]?\s*({TIME}\s*(?:-|–|עד)\s*{TIME})[^0-9]{{0,20}}?שעון\s+קיץ\s*[-:]?\s*({TIME}\s*(?:-|–|עד)\s*{TIME})",
                  lambda m: m.group(pick if pick == 1 else 6), text)
    # A lone season label inside a range ("7:30 – חורף 13:00") is noise once pairs are resolved.
    text = re.sub(r"(?:חורף|קיץ)\s*", "", text)
    return re.sub(r"[ \t]+", " ", text).strip()


def hebrew_to_oh(text):
    """Converts free Hebrew opening-hours text to OSM opening_hours. Returns None if unsure."""
    if not text:
        return None
    t = clean(text)
    if not t or re.search(r"סגור(?:ה)? זמנית|זמנית .*סגור", t):
        return None
    if re.fullmatch(r"24\s*/\s*7|24 שעות|פתוח 24 שעות.*", t):
        return "24/7"
    if re.match(r"24\s*/\s*6", t):
        return "Su-Th 00:00-24:00; Fr 00:00-(sunset-01:00); Sa (sunset+01:00)-24:00"

    rules = {}  # day index (0..6, 7 = motzash) -> list of (from, to)
    events = [(m.start(), "day", m) for m in DAY_SPEC.finditer(t)] + [(m.start(), "range", m) for m in RANGE.finditer(t)]
    events.sort(key=lambda e: e[0])
    cur, last_end = None, 0
    for pos, kind, m in events:
        if kind == "day":
            # Ignore day-like letters that sit inside a time range we already consumed.
            if pos < last_end:
                continue
            a = day_index(m.group(1))
            b = day_index(m.group(2)) if m.group(2) else a
            if a is None or b is None:
                continue
            if a == 7 or b == 7:
                cur = [7]
            else:
                cur = list(range(a, b + 1)) if a <= b else list(range(a, 7)) + list(range(0, b + 1))
            between = t[m.end(): m.end() + 40]
            if re.match(r"[^0-9]{0,15}סגור", between):
                for d in cur:
                    rules[d] = []
                cur = None
        else:
            last_end = m.end()
            if cur is None or int(m.group(1)) > 24 or int(m.group(3)) > 24 or int(m.group(2)) > 59 or int(m.group(4)) > 59:
                continue
            frm, to = hhmm(m.group(1), m.group(2)), hhmm(m.group(3), m.group(4))
            if to == "00:00":
                to = "24:00"
            for d in cur:
                rules.setdefault(d, []).append((frm, to))
    # Motzash written as "an hour after Shabbat ends ... until 23:00"
    ms = re.search(r"(?:מוצ[\"']?ש|מוצאי שבת)[^0-9]{0,80}?צאת[^0-9]{0,40}?(\d{1,2})[:.](\d{2})", t)
    if ms and not rules.get(7):
        rules[7] = [("(sunset+01:40)", hhmm(*ms.groups()))]
    # Friday "about two hours before Shabbat"
    if re.search(r"(?:כ)?שעתיים לפני (?:כניסת )?(?:ה)?שבת", t) and 5 in rules and not is_summer():
        rules[5] = [(rules[5][0][0], "(sunset-02:00)")]
    if 7 in rules:
        rules.setdefault(6, [])
        rules[6] = rules[6] + rules.pop(7)
    if not any(rules.values()):
        return None
    return compose(rules)


def compose(rules):
    """rules: {day: [(from, to)]} -> 'Su-Th 08:00-22:00; Fr 07:00-14:00'"""
    groups = []
    for d in range(7):
        spans = ",".join(f"{a}-{b}" for a, b in rules.get(d, []))
        if groups and groups[-1][2] == spans and groups[-1][1] == d - 1:
            groups[-1][1] = d
        else:
            groups.append([d, d, spans])
    out = []
    for a, b, spans in groups:
        if not spans:
            continue
        days = DAYS[a] if a == b else f"{DAYS[a]}-{DAYS[b]}" if b > a + 1 else f"{DAYS[a]},{DAYS[b]}"
        out.append(f"{days} {spans}")
    return "; ".join(out) if out else None


# ---------------------------------------------------------------- fetchers
def shufersal():
    j = json.loads(get("https://www.shufersal.co.il/feeds/rsssnifim.json"))
    out = []
    ru = {"Be": "Би", "שופרסל אקספרס": "Шуферсаль Экспресс", "שופרסל דיל": "Шуферсаль Дил", "שופרסל שלי": "Шуферсаль Шели",
          "יוניברס": "Юниверс", "יש חסד": "Еш Хесед", "דן דיל": "Дан Дил", "גוד מרקט": "Гуд Маркет", "יש בשכונה": "Еш ба-Шхуна"}
    en = {"Be": "Be", "שופרסל אקספרס": "Shufersal Express", "שופרסל דיל": "Shufersal Deal", "שופרסל שלי": "Shufersal Sheli",
          "יוניברס": "Universe", "יש חסד": "Yesh Hesed", "דן דיל": "Dan Deal", "גוד מרקט": "Good Market", "יש בשכונה": "Yesh BaShchuna"}
    for b in j["BranchList"]:
        if not b.get("IsActive") or not b.get("IsShow") or not b.get("IsBranch", True):
            continue
        try:
            lat, lon = float(b["Latitude"]), float(b["Longitude"])
        except (TypeError, ValueError):
            continue
        rules = {}
        summer = is_summer()
        for h in b.get("SnifOpenHours") or []:
            d = LETTER.get((h.get("SnifDay") or "")[:1])
            o, c = h.get("SnifOpen") or 0, h.get("SnifClose") or 0
            if d is None or (o == 0 and c == 0):
                continue
            frm, to = f"{o // 100:02d}:{o % 100:02d}", f"{c // 100:02d}:{c % 100:02d}"
            if to == "00:00":
                to = "24:00"
            if d == 5 and not summer and "לפני כניסת השבת" in (h.get("SnifCloseMsg") or ""):
                to = "(sunset-02:00)"
            rules.setdefault(d, []).append((frm, to))
        net = b.get("CompanyNetwork") or "שופרסל"
        tags = {"name": net, "name:en": en.get(net, net), "name:ru": ru.get(net, en.get(net, net)), "brand": "Shufersal",
                "addr:street": b.get("BranchAddress") or "", "addr:city": b.get("City") or "", "phone": b.get("BranchPhone") or ""}
        if net == "Be":
            tags["shop"] = "chemist"
        else:
            tags["shop"] = "supermarket"
        out.append({"chain": "shufersal", "net": net, "id": b["BranchID"], "lat": lat, "lon": lon,
                    "opening_hours": compose(rules) if rules else None, "tags": tags})
    return out


def superpharm():
    out, page, pages, seen = [], 0, 1, set()
    while page < pages:
        j = json.loads(get(f"https://shop.super-pharm.co.il/branches/filter?q=&page={page}&buildFacets=false&selectedCity=&clinic=&service=&brand=&branch=&ignoreDistanceLimit=true"))
        pages = j["pagination"]["numberOfPages"]
        for s in j["storeList"]:
            # Pages overlap: the same branch can come on two pages.
            if s.get("latitude") is None or s["branchCode"] in seen:
                continue
            seen.add(s["branchCode"])
            oh = None
            if not s.get("temporarilyClosed"):
                oh = "24/7" if s.get("hours24") else hebrew_to_oh(s.get("branchOpeningTime"))
            out.append({"chain": "superpharm", "id": s["branchCode"], "lat": s["latitude"], "lon": s["longitude"], "opening_hours": oh,
                        "tags": {"name": "סופר-פארם " + (s.get("branchName") or ""), "name:en": "Super-Pharm", "name:ru": "Супер-Фарм",
                                 "brand": "Super-Pharm", "amenity": "pharmacy", "addr:street": s.get("branchAddress") or "",
                                 "addr:city": s.get("branchCity") or "", "phone": s.get("dnis") or ""}})
        page += 1
        time.sleep(0.5)
    return out


def delek():
    cj = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    page_html = get("https://delek.co.il/" + urllib.parse.quote("איתור-תחנה") + "/", opener=op)
    nonce = re.search(r"'nonce',\s*'([0-9a-f]+)'", page_html).group(1)
    out, page = [], 1
    while page:
        body = urllib.parse.urlencode({"action": "sq_get_stations", "page": page, "nonce": nonce}).encode()
        j = json.loads(get("https://delek.co.il/wp-admin/admin-ajax.php", data=body, opener=op))
        if not j.get("success"):
            break
        for s in j["data"]["stations"]:
            try:
                lat, lon = float(s["lat"]), float(s["lang"])
            except (TypeError, ValueError, KeyError):
                continue
            has_shop = s.get("minta") == "כן"
            oh = hebrew_to_oh(s.get("hours_joe") if has_shop and s.get("hours_joe") else s.get("hours"))
            out.append({"chain": "delek", "id": s["id"], "lat": lat, "lon": lon, "opening_hours": oh,
                        "tags": {"name": "דלק " + (s.get("name") or ""), "name:en": "Delek", "name:ru": "Делек", "brand": "Delek",
                                 "amenity": "fuel", "addr:street": s.get("address") or "", "addr:city": s.get("city") or "",
                                 "phone": s.get("phone") or ""}})
        page = j["data"].get("next") or 0
        time.sleep(0.5)
    return out


def branch_ids(rows):
    """Stable ids for branches listed as (name, street): the name, or "<name> <street>" for every branch whose name
    another branch shares ("חדרה" twice). Independent of the page's order and of which branches geocode."""
    seen = {}
    for name, _ in rows:
        seen[name] = seen.get(name, 0) + 1
    return [name if seen[name] == 1 else f"{name} {street}" for name, street in rows]


def ramilevy():
    """Parses the public branches page (plain HTML, nothing executed). Coordinates come from geocoding the address."""
    page = get("https://www.rami-levy.co.il/he/stores")
    rows = []
    for block in page.split('<h2 class="mt-1 mb-0 title-list"')[1:]:
        m = re.match(r"[^>]*>([^<]+)<small[^>]*>([^<]*)</small>", block)
        if not m:
            continue
        name, address = html.unescape(m.group(1)).strip(), html.unescape(m.group(2)).strip()
        street, _, city = address.rpartition(",")
        hours = re.search(r"שעות פתיחה</h4>\s*<div[^>]*>(.*?)</div>", block, re.S)
        phone = re.search(r"טלפון</h4>\s*<div[^>]*>([^<]*)</div>", block)
        rows.append((name, street.strip(), city.strip(), hours.group(1) if hours else None,
                     phone.group(1).strip() if phone else ""))
    out = []
    for bid, (name, street, city, hours, phone) in zip(branch_ids([(r[0], r[1]) for r in rows]), rows):
        ll = geocode(street, city) if city else None
        if not ll:
            continue
        out.append({"chain": "ramilevy", "id": bid, "lat": ll[0], "lon": ll[1],
                    "opening_hours": hebrew_to_oh(hours) if hours else None,
                    "tags": {"name": "רמי לוי " + name, "name:en": "Rami Levy", "name:ru": "Рами Леви", "brand": "Rami Levy",
                             "shop": "supermarket", "addr:street": street, "addr:city": city, "phone": phone}})
    return out


def victory():
    """Public branches page: each branch block carries data-latitude/longitude and a per-day hours list."""
    page = get("https://victory.co.il/branches/")
    out = []
    for block in page.split('class="col-md-12 single-branch')[1:]:
        ll = re.search(r'data-latitude="([\d.]+)"\s+data-longitude="([\d.]+)"', block)
        # Capture greedily and strip in Python: "\s*([^<]+?)\s*" backtracks polynomially on long whitespace.
        name = re.search(r"<h3[^>]*>([^<]*)</h3>", block)
        if not ll or not name or not name.group(1).strip():
            continue
        addr = re.search(r"כתובת:\s*<br\s*/?>\s*([^<]+)", block)
        phone = re.search(r'href="tel:([^"]+)"', block)
        rules = {}
        for day, o, c in re.findall(r'day-name">([^<]*)</span>\s*<span class="open-hour">([^<]*)</span>.*?<span class="close-hour">([^<]*)</span>', block, re.S):
            day, o, c = day.strip(), o.strip(), c.strip()
            d = LETTER.get(day.strip()[:1])
            m_o = re.match(r"(\d{1,2})[:.](\d{2})", o)
            if d is None or not m_o:
                continue
            m_c = re.match(r"(\d{1,2})[:.](\d{2})", c)
            if m_c:
                to = hhmm(*m_c.groups())
                to = "24:00" if to == "00:00" else to
            elif "לפני" in c and "שבת" in c:
                to = "(sunset-02:00)"
            else:
                continue
            rules.setdefault(d, []).append((hhmm(*m_o.groups()), to))
        title = html.unescape(name.group(1)).replace("סניף", "").strip()
        out.append({"chain": "victory", "id": title, "lat": float(ll.group(1)), "lon": float(ll.group(2)),
                    "opening_hours": compose(rules) if rules else None,
                    "tags": {"name": "ויקטורי " + title, "name:en": "Victory", "name:ru": "Виктори", "brand": "Victory",
                             "shop": "supermarket", "addr:street": html.unescape(addr.group(1)).strip() if addr else "",
                             "phone": phone.group(1) if phone else ""}})
    return _fix_shared_pins(out)


def _fix_shared_pins(branches):
    """The chain's site sometimes gives two branches the same pin (Victory Bat Yam carried Emek Hefer's). A branch on
    a shared pin whose address geocodes more than 2 km away is moved there; the branch the pin is right for stays."""
    pins = {}
    for b in branches:
        pins.setdefault((b["lat"], b["lon"]), []).append(b)
    for group in (g for g in pins.values() if len(g) > 1):
        for b in group:
            street, _, city = (b["tags"].get("addr:street") or "").rpartition(",")
            ll = geocode(street.strip(), city.strip()) if street.strip() and city.strip() else None
            if ll and dist(b["lat"], b["lon"], ll[0], ll[1]) > 2000:
                b["lat"], b["lon"] = ll
    return branches


def osherad():
    """Public stores page (Elementor listing): name, "city, street" and an hours paragraph per store; geocoded."""
    page = get("https://osherad.co.il/stores/")
    out, seen = [], set()
    for block in page.split("jet-listing-grid__item ")[1:]:
        heads = [html.unescape(h).strip() for h in re.findall(r'<h2 class="elementor-heading-title[^"]*">([^<]+)</h2>', block)]
        hours = re.search(r"שעות פעילות:(.*?)</div>", block, re.S)
        if len(heads) < 2 or not hours or "יפתח" in heads[1] or heads[1] in seen:
            continue
        seen.add(heads[1])
        city, _, street = heads[1].partition(",")
        ll = geocode(street.strip(), city.strip()) if street.strip() else None
        if not ll:
            continue
        out.append({"chain": "osherad", "id": heads[0], "lat": ll[0], "lon": ll[1], "opening_hours": hebrew_to_oh(hours.group(1)),
                    "tags": {"name": "אושר עד " + heads[0], "name:en": "Osher Ad", "name:ru": "Ошер Ад", "brand": "Osher Ad",
                             "shop": "supermarket", "addr:street": street.strip(), "addr:city": city.strip(), "phone": "076-8899999"}})
    return out


def manual():
    """Hand-verified shops from data/manual.json (independent makolets etc. missing from every other source)."""
    path = DATA / "manual.json"
    if not path.exists():
        return []
    out = []
    for s in json.loads(path.read_text(encoding="utf-8"))["shops"]:
        tags = {k: v for k, v in s.items() if k not in ("id", "lat", "lon", "opening_hours", "source") and v}
        out.append({"chain": "manual", "id": s["id"], "lat": s["lat"], "lon": s["lon"], "opening_hours": s.get("opening_hours"), "tags": tags})
    return out


# ---------------------------------------------------------------- geocoding (Nominatim, cached; max 1 request/second)
_geocache = None


def geocode(street, city):
    global _geocache
    path = DATA / "geocache.json"
    if _geocache is None:
        _geocache = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    key = f"{street}|{city}"
    if key in _geocache:
        return _geocache[key]
    res = None
    for q in [f"{street}, {city}", f"{city}"] if street else [city]:
        url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({"q": q, "format": "json", "limit": 1, "countrycodes": "il"})
        try:
            j = json.loads(get(url))
        except Exception:
            j = []
        time.sleep(1.1)
        if j:
            res = [round(float(j[0]["lat"]), 6), round(float(j[0]["lon"]), 6)]
            if q == city:
                res = None  # city centre only: too imprecise to place a shop
            break
    _geocache[key] = res
    path.write_text(json.dumps(_geocache, ensure_ascii=False, indent=0), encoding="utf-8")
    return res


# ---------------------------------------------------------------- matching with OSM points
ALIASES = {
    "shufersal": ["שופרסל", "shufersal", "יש חסד", "יש בשכונה", "yesh", "גוד מרקט", "good market", "יוניברס", "universe", "דן דיל"],
    "shufersal:Be": ["be", "בי פארם", "be pharm", "בי"],
    "superpharm": ["סופר-פארם", "סופר פארם", "super-pharm", "super pharm", "superpharm"],
    "delek": ["דלק", "delek", "מנטה", "menta"],
    "ramilevy": ["רמי לוי", "rami levy", "rami-levy"],
    "victory": ["ויקטורי", "victory"],
    "osherad": ["אושר עד", "osher ad", "osher-ad"],
    "manual": [],
}


def label(tags):
    return " | ".join(str(tags.get(k, "")).lower() for k in ("name", "brand", "name:he", "name:en", "operator"))


def matches(chain_key, tags):
    lab = label(tags)
    for a in ALIASES[chain_key]:
        if len(a) <= 3:  # short names like "Be" must be the whole name
            if any(str(tags.get(k, "")).strip().lower() == a for k in ("name", "brand", "name:en", "name:he")):
                return True
        elif a in lab:
            return True
    return False


def dist(a_lat, a_lon, b_lat, b_lon):
    r = math.pi / 180
    x = (b_lon - a_lon) * r * math.cos((a_lat + b_lat) / 2 * r)
    y = (b_lat - a_lat) * r
    return 6371000 * math.hypot(x, y)


def merge_into(shops, branches):
    """shops: [[id, lat, lon, tags]] from OSM. Mutates and returns stats."""
    grid = {}
    for s in shops:
        grid.setdefault((round(s[1] * 100), round(s[2] * 100)), []).append(s)
    used, stats = set(), {}
    for b in branches:
        key = b["chain"] + (":Be" if b.get("net") == "Be" else "")
        radius = 300 if b["chain"] == "delek" else 40 if b["chain"] == "manual" else 200
        best, bd = None, radius
        gy, gx = round(b["lat"] * 100), round(b["lon"] * 100)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                for s in grid.get((gy + dy, gx + dx), []):
                    if s[0] in used or (key != "manual" and not matches(key, s[3])):
                        continue
                    d = dist(b["lat"], b["lon"], s[1], s[2])
                    if d < bd:
                        best, bd = s, d
        st = stats.setdefault(b["chain"], {"branches": 0, "matched": 0, "added": 0, "with_hours": 0})
        st["branches"] += 1
        if b["opening_hours"]:
            st["with_hours"] += 1
        src = f"chain:{b['chain']}@{date.today().isoformat()}"
        if best:
            used.add(best[0])
            st["matched"] += 1
            have = [x for x in (best[3].get("src") or "").split(";") if x and not x.startswith("chain:")]
            best[3]["src"] = ";".join(have + [src])
            if b["opening_hours"]:
                best[3]["opening_hours"] = b["opening_hours"]
                best[3]["source:hours"] = b["chain"]
            for k in ("phone", "addr:street"):
                if b["tags"].get(k) and not best[3].get(k):
                    best[3][k] = b["tags"][k]
        else:
            tags = {k: v for k, v in b["tags"].items() if v}
            if b["opening_hours"]:
                tags["opening_hours"] = b["opening_hours"]
                tags["source:hours"] = b["chain"]
            tags["src"] = src
            shops.append([f"c{b['chain']}{b['id']}", round(b["lat"], 6), round(b["lon"], 6), tags])
            st["added"] += 1
    return stats


# Delek is off by default: its station list is only served through the site's internal AJAX call guarded by a
# per-page token. Enable it (--with-delek) only after Delek agrees to the data being reused.
FETCHERS = {"shufersal": shufersal, "superpharm": superpharm, "ramilevy": ramilevy, "victory": victory, "osherad": osherad, "manual": manual}
if "--with-delek" in sys.argv:
    FETCHERS["delek"] = delek


def fetch_all():
    """Fetches every chain. A chain that fails (site down, or blocking non-Israeli servers such as GitHub's)
    falls back to its last good copy in data/chains/<name>.json, so its branches never disappear from the site."""
    cache_dir = DATA / "chains"
    cache_dir.mkdir(parents=True, exist_ok=True)
    branches = []
    for name, fn in FETCHERS.items():
        cache = cache_dir / f"{name}.json"
        try:
            got = fn()
            if not got:
                raise ValueError("empty branch list")
            cache.write_text(json.dumps({"fetched": time.strftime("%Y-%m-%d"), "branches": got}, ensure_ascii=False), encoding="utf-8")
            print(f"{name}: {len(got)} branches, {sum(1 for b in got if b['opening_hours'])} with hours", file=sys.stderr)
        except Exception as e:  # one broken site must not stop the nightly update
            if cache.exists():
                saved = json.loads(cache.read_text(encoding="utf-8"))
                got = saved["branches"]
                print(f"{name}: FAILED {e!r}; using cached copy from {saved['fetched']} ({len(got)} branches)", file=sys.stderr)
            else:
                got = []
                print(f"{name}: FAILED {e!r}; no cached copy", file=sys.stderr)
        branches += got
    return branches
