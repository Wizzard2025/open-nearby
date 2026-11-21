"""Public AM:PM and Good Pharm branch pages, using the existing chain contract.

No private endpoints or browser automation. Keep unlocated source records for
review; never invent a point or substitute a city/street centre for a branch.
"""
import hashlib
import html
import json
import math
import os
import pathlib
import re
import sys
import tempfile
import time
import urllib.parse
from datetime import date, datetime, time as day_time, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

AMPM_URL = "https://www.ampm.co.il/branches/"
GOODPHARM_URL = "https://goodpharm.co.il/allstores"
_last_geocode = 0.0
_geocode_unavailable = False
_shop_index = None


def _core():
    import chains
    return chains


def _text(value):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", value or ""))).strip()


def _atomic_json(path, value):
    path = pathlib.Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                         prefix="." + path.name, delete=False) as f:
            temporary = f.name
            json.dump(value, f, ensure_ascii=False, separators=(",", ":"))
            f.flush()
            os.fsync(f.fileno())
        os.replace(temporary, path)
    finally:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)


def _season(day=None):
    day = day or datetime.now(timezone.utc).date()
    try:
        local = datetime.combine(day, day_time(12), tzinfo=ZoneInfo("Asia/Jerusalem"))
        return "קיץ" if local.dst().total_seconds() else "חורף"
    except ZoneInfoNotFoundError:
        # Keep the updater usable on Windows without an installed tzdata package.
        return "קיץ" if _core().is_summer(day) else "חורף"


def _hours(rows):
    """Parse only published time ranges; retain uncertain day rules as unknown."""
    core = _core()
    cleaned = [_text(r).replace("׳", "'").replace("״", '"') for r in rows]
    value = "\n".join(cleaned)
    if re.fullmatch(r"24\s*/\s*7", value.strip()):
        return "24/7"
    # A day-free range on the branch page applies daily. Correct the observed
    # AM:PM typo '07:00-23-00' only when the entire row has that exact shape.
    value = re.sub(r"^(\d{1,2}:\d{2})-(\d{1,2})-(\d{2})$", r"\1-\2:\3", value.strip())
    daily = re.fullmatch(r"(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})", value)
    if daily:
        a, am, b, bm = map(int, daily.groups())
        if a > 23 or b > 24 or am > 59 or bm > 59 or (b == 24 and bm):
            return None
        start, end = f"{a:02d}:{am:02d}", f"{b:02d}:{bm:02d}"
        if start == end:
            return None
        return "Su-Sa " + start + "-" + ("24:00" if end == "00:00" else end)
    result = core.hebrew_to_oh(value)
    unknown = []
    for row in cleaned:
        days = list(core.DAY_SPEC.finditer(row))
        if days and not core.RANGE.search(row) and not re.search(r"סגור", row):
            for match in days:
                first = core.day_index(match.group(1))
                last = core.day_index(match.group(2)) if match.group(2) else first
                if first == 7 or last == 7:
                    unknown.append("Sa")
                elif first is not None and last is not None:
                    d = first
                    unknown.append(core.DAYS[d])
                    for _ in range(6):
                        if d == last:
                            break
                        d = (d + 1) % 7
                        unknown.append(core.DAYS[d])
    parts = [result] if result else []
    parts.extend(day + " unknown" for day in dict.fromkeys(unknown))
    return "; ".join(parts) or None


def _address(value, title=""):
    value = _text(value)
    # Only address punctuation is stripped; never query a city as a fallback.
    plain = re.sub(r"\([^)]*\)", "", value).strip(" ,")
    if "," in plain and not re.search(r"\d", plain.rsplit(",", 1)[1]):
        street, city = plain.rsplit(",", 1)
        return street.strip(), city.strip()
    for city in ("קריית חיים", "טירת הכרמל", "הרצליה פיתוח", "קרית אונו", "ראשון לציון",
                 "רמת החייל", "הוד השרון", "נס ציונה", "תל אביב", "גבעתיים", "הרצליה", "חיפה", "יהוד"):
        if plain.endswith(city):
            return plain[:-len(city)].strip(" ,"), city
    if "," in title:
        return plain, title.rsplit(",", 1)[1].strip()
    return plain, _text(title)


def parse_ampm(page):
    records = []
    for block in re.split(r'<div\s+class=["\']branch-item["\']\s*>', page)[1:]:
        name = re.search(r'<h2\b[^>]*class=["\']branch-name["\'][^>]*>(.*?)</h2>', block, re.S)
        address = re.search(r'<div\b[^>]*class=["\']address["\'][^>]*>(.*?)</div>', block, re.S)
        ident = re.search(r'aria-controls=["\']panel-(\d+)["\']', block)
        if not name or not address or not ident:
            raise ValueError("AM:PM branch block is missing identity or address")
        title, full_address = _text(name.group(1)), _text(address.group(1))
        rows = re.findall(r'<div\b[^>]*class=["\']opening-hours-row["\'][^>]*>(.*?)</div>', block, re.S)
        phone = re.search(r'href=["\']tel:([^"\']+)', block)
        street, city = _address(full_address, title)
        records.append({"chain": "ampm", "id": ident.group(1), "title": title,
                        "address": full_address, "street": street, "city": city,
                        "phone": html.unescape(phone.group(1)) if phone else "",
                        "hours_text": "\n".join(_text(r) for r in rows), "opening_hours": _hours(rows),
                        "source_url": AMPM_URL + "#panel-" + ident.group(1), "nav_url": None})
    return _unique(records, "AM:PM")


def parse_goodpharm(page, day=None):
    headings = list(re.finditer(r'<h1\b[^>]*>\s*<a\s+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>\s*</h1>', page, re.S))
    records = []
    for i, heading in enumerate(headings):
        title = _text(heading.group(2))
        if "סגור לצמיתות" in title or "יפתח" in title:
            continue
        block = page[heading.end():headings[i + 1].start() if i + 1 < len(headings) else len(page)]
        address = re.search(r'elementor-widget-text-editor["\'][^>]*>\s*<div\b[^>]*>(.*?)</div>', block, re.S)
        if not address:
            raise ValueError("Good Pharm branch is missing its address: " + title)
        full_address = _text(address.group(1))
        if not full_address:
            raise ValueError("Good Pharm returned a blank address: " + title)
        all_rows = [_text(r) for r in re.findall(r'<span\b[^>]*class=["\']elementor-icon-list-text["\'][^>]*>(.*?)</span>', block, re.S)]
        seasonal = [r for r in all_rows if "שעון" in r]
        rows = [r for r in seasonal if "שעון " + _season(day) in r]
        # A missing season is unknown, not permission to reuse the other season.
        phone = re.search(r'href=["\']tel:([^"\']+)', block)
        nav = re.search(r'href=["\'](https://(?:www\.)?waze\.com/[^"\']+)', block)
        source = html.unescape(heading.group(1))
        street, city = _address(full_address, title)
        records.append({"chain": "goodpharm", "id": hashlib.sha256(source.encode()).hexdigest()[:16],
                        "title": title, "address": full_address, "street": street, "city": city,
                        "phone": html.unescape(phone.group(1)) if phone else "",
                        "hours_text": "\n".join(rows), "opening_hours": _hours(rows) if rows else None,
                        "source_url": source, "nav_url": html.unescape(nav.group(1)) if nav else None})
    return _unique(records, "Good Pharm")


def _unique(records, name):
    if not records:
        raise ValueError(name + " returned no branch blocks")
    seen = {}
    for record in records:
        old = seen.get(record["id"])
        if old and old != record:
            raise ValueError(name + " has a conflicting duplicate branch ID")
        seen[record["id"]] = record
    return list(seen.values())


def _valid_point(point):
    return (isinstance(point, (list, tuple)) and len(point) == 2
            and all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) for v in point)
            and 29.4 <= point[0] <= 33.5 and 34.1 <= point[1] <= 35.95)


def _direct_point(link):
    if not link:
        return None
    parsed = urllib.parse.urlparse(link)
    if parsed.hostname not in ("waze.com", "www.waze.com"):
        return None
    query = urllib.parse.parse_qs(parsed.query)
    for value in query.get("to", []) + query.get("ll", []):
        match = re.fullmatch(r"(?:ll\.)?(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)", value)
        if match:
            point = [float(v) for v in match.groups()]
            if _valid_point(point):
                return point
    return None


def _normal(value):
    return re.sub(r"[^\w]", "", value.lower()).replace("קריית", "קרית").replace("יפו", "")


def _phone(value):
    value = re.sub(r"\D", "", value or "")
    return "0" + value[3:] if value.startswith("972") else value


def _existing_point(record):
    global _shop_index
    core = _core()
    try:
        saved = json.loads((core.DATA / "chains" / (record["chain"] + ".json")).read_text(encoding="utf-8"))
        for old in saved.get("branches", []):
            if (str(old.get("id")) == str(record["id"])
                    and _normal(old.get("tags", {}).get("addr:street", "")) == _normal(record["street"])
                    and _normal(old.get("tags", {}).get("addr:city", "")) == _normal(record["city"])
                    and _valid_point([old.get("lat"), old.get("lon")])):
                return [old["lat"], old["lon"]]
    except (OSError, ValueError, AttributeError):
        pass
    if _shop_index is None:
        path = core.DATA / "shops.json"
        try:
            _shop_index = json.loads(path.read_text(encoding="utf-8"))["shops"]
        except (OSError, ValueError, KeyError):
            _shop_index = []
    candidates = [s for s in _shop_index if core.matches(record["chain"], s[3]) and _valid_point(s[1:3])]
    phone = _phone(record["phone"])
    matched = [s for s in candidates if phone and phone == _phone(s[3].get("phone") or s[3].get("contact:phone"))]
    if len(matched) == 1:
        return matched[0][1:3]
    return None


def _street_name(value):
    value = re.sub(r"^רחוב\s+", "", value.strip())
    value = re.sub(r"^(?:שדרות|שד[׳'\"]?)\s+", "", value)
    value = re.sub(r"\b\d+[a-zא-ת]?\b", "", value, flags=re.I)
    return _normal(value).replace("דיזינגוף", "דיזנגוף")


def _geocode(record):
    global _last_geocode, _geocode_unavailable
    core = _core()
    street, city = record["street"], record["city"]
    street = next((part.strip() for part in street.split(",") if re.search(r"\d", part)), street)
    house = re.search(r"\b(\d+[a-zא-ת]?)\b", street, re.I)
    if not house or not city:
        return None
    key = street + "|" + city
    if core._geocache is None:
        path = core.DATA / "geocache.json"
        try:
            core._geocache = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
        except (OSError, ValueError):
            core._geocache = {}
    # Legacy geocache points have no house-level provenance. Previously located
    # branches are reused by _existing_point instead of trusting those points.
    if _geocode_unavailable:
        return None
    time.sleep(max(0, 1.1 - (time.monotonic() - _last_geocode)))
    _last_geocode = time.monotonic()
    query = urllib.parse.urlencode({"q": street + ", " + city, "format": "jsonv2", "limit": 3,
                                    "countrycodes": "il", "addressdetails": 1, "accept-language": "he"})
    try:
        results = json.loads(core.get("https://nominatim.openstreetmap.org/search?" + query, timeout=15))
        if not isinstance(results, list):
            raise ValueError("Unexpected geocoder response")
    except Exception as error:
        _geocode_unavailable = True
        print("Additional-chain geocoding unavailable; preserving unlocated records: " + repr(error), file=sys.stderr)
        return None
    for result in results:
        addr = result.get("address") or {}
        actual_city = [addr.get(k, "") for k in ("city", "town", "village", "suburb", "quarter", "city_district")]
        if (addr.get("country_code") != "il" or _normal(addr.get("house_number", "")) != _normal(house.group(1))
                or _street_name(addr.get("road", "")) != _street_name(street)
                or not any(_normal(city) in _normal(v) or _normal(v) in _normal(city) for v in actual_city if v)):
            continue
        try:
            point = [round(float(result["lat"]), 6), round(float(result["lon"]), 6)]
        except (KeyError, TypeError, ValueError):
            continue
        if _valid_point(point):
            core._geocache[key] = point
            return point
    return None


def resolve(records, chain):
    core = _core()
    pending_path = core.DATA / "chains" / (chain + "-unlocated.json")
    try:
        previous = json.loads(pending_path.read_text(encoding="utf-8")).get("source_count", 0)
    except (OSError, ValueError, AttributeError):
        previous = 0
    if previous and len(records) < previous * 0.7:
        raise ValueError(f"{chain}: partial source response ({len(records)} vs {previous}); keep last good copy")
    out, pending = [], []
    checked = datetime.now(timezone.utc).date().isoformat()
    for number, record in enumerate(records, 1):
        point = _direct_point(record.get("nav_url")) or _existing_point(record) or _geocode(record)
        if not point:
            pending.append(record)
            continue
        brand, ru = ("AM:PM", "АМ:ПМ") if chain == "ampm" else ("Good Pharm", "Гуд Фарм")
        tags = {"name": ("am:pm " if chain == "ampm" else "גוד פארם ") + record["title"],
                "name:en": brand + " " + record["title"], "name:ru": ru + " " + record["title"],
                "brand": brand, "shop": "convenience" if chain == "ampm" else "chemist",
                "addr:street": record["street"], "addr:city": record["city"], "phone": record["phone"],
                "website": record["source_url"], "source:hours:url": record["source_url"],
                "check_date:opening_hours": checked, "source:hours:text": record["hours_text"]}
        out.append({"chain": chain, "id": record["id"], "lat": point[0], "lon": point[1],
                    "opening_hours": record["opening_hours"], "tags": {k: v for k, v in tags.items() if v}})
        if number % 10 == 0:
            print(f"{chain}: located {len(out)}/{number} source records", file=sys.stderr)
    # All source records survive even if geocoding is temporarily unavailable.
    _atomic_json(pending_path, {"fetched": checked, "source_count": len(records), "branches": pending})
    if core._geocache is not None:
        _atomic_json(core.DATA / "geocache.json", core._geocache)
    if not out:
        raise ValueError(chain + ": no precise locations; source records retained for review")
    try:
        saved = json.loads((core.DATA / "chains" / (chain + ".json")).read_text(encoding="utf-8"))
        previous_located = len(saved.get("branches", []))
    except (OSError, ValueError, AttributeError):
        previous_located = 0
    if previous_located and len(out) < previous_located * 0.7:
        raise ValueError(chain + ": too few precise locations; keep last good branch cache")
    return out


def ampm():
    return resolve(parse_ampm(_core().get(AMPM_URL)), "ampm")


def goodpharm():
    return resolve(parse_goodpharm(_core().get(GOODPHARM_URL)), "goodpharm")
