/* Открыто рядом — MVP. Data: OpenStreetMap (Overpass API) + Hebcal (Shabbat/holidays). */
'use strict';

// ---------- i18n ----------
const I18N = {
  ru: {
    title: 'Открыто рядом', locate: 'Рядом со мной', locating: 'Ищу вас…', pickCity: 'Или город…',
    showUnknown: 'Показывать без часов', mapHint: 'Нажмите на карту, чтобы искать в другом месте',
    source: 'Данные о магазинах — OpenStreetMap. Часы указаны не у всех, перед дальней поездкой лучше проверить.',
    cats: { all: 'Всё', food: 'Продукты', bakery: 'Пекарни', pharmacy: 'Аптеки', fuel: 'Заправки' },
    types: { supermarket: 'Супермаркет', convenience: 'Минимаркет', kiosk: 'Киоск', grocery: 'Продукты', greengrocer: 'Овощи и фрукты', deli: 'Деликатесы', alcohol: 'Алкоголь', bakery: 'Пекарня', pastry: 'Кондитерская', pharmacy: 'Аптека', chemist: 'Аптека и косметика', fuel: 'Заправка' },
    open24: 'Круглосуточно', open: 'Открыто', until: 'до {t}', soon: 'Закроется через {m} мин',
    closed: 'Закрыто', opensAt: 'откроется в {t}', opensTomorrow: 'откроется завтра в {t}', opensDay: 'откроется {d} в {t}',
    unknown: 'Часы не указаны', allDay: 'круглосуточно', dayOff: 'закрыто',
    summary: '{o} открыто · {u} без часов', summaryNoUnknown: '{o} открыто сейчас',
    closedTitle: 'Сейчас закрыты ({n})', loading: 'Ищу магазины…',
    empty: 'Поблизости открытых магазинов не нашлось.', widen: 'Искать в радиусе {r} км',
    route: 'Маршрут', waze: 'Waze', call: 'Позвонить',
    geoFail: 'Не получилось определить местоположение. Выберите город или нажмите на карту.',
    demo: 'Показан центр Тель-Авива. Разрешите геолокацию или выберите город.',
    netFail: 'Сервер данных не ответил. Попробуйте ещё раз через минуту.', retry: 'Повторить',
    holiday: 'Сегодня {h}. Многие магазины закрыты или работают по-другому.',
    shabbat: 'Шаббат: зажигание свечей {c}, исход {h}. Большинство сетей в это время закрыты.',
    radius: 'радиус {r}', m: 'м', km: 'км', approx: 'примерно',
  },
  he: {
    title: 'פתוח קרוב', locate: 'לידי', locating: 'מאתר…', pickCity: 'או עיר…',
    showUnknown: 'להציג גם בלי שעות', mapHint: 'הקישו על המפה כדי לחפש במקום אחר',
    source: 'נתוני החנויות מ-OpenStreetMap. לא לכל חנות יש שעות – כדאי לבדוק לפני נסיעה ארוכה.',
    cats: { all: 'הכל', food: 'מזון', bakery: 'מאפיות', pharmacy: 'בתי מרקחת', fuel: 'תחנות דלק' },
    types: { supermarket: 'סופרמרקט', convenience: 'מכולת', kiosk: 'קיוסק', grocery: 'מכולת', greengrocer: 'ירקן', deli: 'מעדנייה', alcohol: 'משקאות', bakery: 'מאפייה', pastry: 'קונדיטוריה', pharmacy: 'בית מרקחת', chemist: 'פארם', fuel: 'תחנת דלק' },
    open24: '24 שעות', open: 'פתוח', until: 'עד {t}', soon: 'ייסגר בעוד {m} דק׳',
    closed: 'סגור', opensAt: 'ייפתח ב-{t}', opensTomorrow: 'ייפתח מחר ב-{t}', opensDay: 'ייפתח ב{d} ב-{t}',
    unknown: 'אין שעות', allDay: '24 שעות', dayOff: 'סגור',
    summary: '{o} פתוחים · {u} בלי שעות', summaryNoUnknown: '{o} פתוחים עכשיו',
    closedTitle: 'סגורים כעת ({n})', loading: 'מחפש חנויות…',
    empty: 'לא נמצאו חנויות פתוחות בסביבה.', widen: 'לחפש ברדיוס {r} ק״מ',
    route: 'ניווט', waze: 'Waze', call: 'חיוג',
    geoFail: 'לא הצלחנו לאתר את המיקום. בחרו עיר או הקישו על המפה.',
    demo: 'מוצג מרכז תל אביב. אפשרו מיקום או בחרו עיר.',
    netFail: 'שרת הנתונים לא הגיב. נסו שוב בעוד דקה.', retry: 'נסו שוב',
    holiday: 'היום {h}. חנויות רבות סגורות או פועלות בשעות שונות.',
    shabbat: 'שבת: הדלקת נרות {c}, צאת שבת {h}. רוב הרשתות סגורות.',
    radius: 'רדיוס {r}', m: 'מ׳', km: 'ק״מ', approx: 'בערך',
  },
  en: {
    title: 'Open Nearby', locate: 'Near me', locating: 'Locating…', pickCity: 'Or a city…',
    showUnknown: 'Show places without hours', mapHint: 'Tap the map to search somewhere else',
    source: 'Shop data from OpenStreetMap. Not every shop lists hours, so check before a long trip.',
    cats: { all: 'All', food: 'Groceries', bakery: 'Bakeries', pharmacy: 'Pharmacies', fuel: 'Gas stations' },
    types: { supermarket: 'Supermarket', convenience: 'Convenience store', kiosk: 'Kiosk', grocery: 'Grocery', greengrocer: 'Greengrocer', deli: 'Deli', alcohol: 'Liquor store', bakery: 'Bakery', pastry: 'Pastry shop', pharmacy: 'Pharmacy', chemist: 'Drugstore', fuel: 'Gas station' },
    open24: 'Open 24 hours', open: 'Open', until: 'until {t}', soon: 'Closes in {m} min',
    closed: 'Closed', opensAt: 'opens at {t}', opensTomorrow: 'opens tomorrow at {t}', opensDay: 'opens {d} at {t}',
    unknown: 'No hours listed', allDay: '24 hours', dayOff: 'closed',
    summary: '{o} open · {u} without hours', summaryNoUnknown: '{o} open now',
    closedTitle: 'Closed now ({n})', loading: 'Finding shops…',
    empty: 'No open shops found nearby.', widen: 'Search within {r} km',
    route: 'Directions', waze: 'Waze', call: 'Call',
    geoFail: "Couldn't get your location. Pick a city or tap the map.",
    demo: 'Showing central Tel Aviv. Allow location or pick a city.',
    netFail: "The data server didn't respond. Try again in a minute.", retry: 'Try again',
    holiday: 'Today is {h}. Many shops are closed or keep different hours.',
    shabbat: 'Shabbat: candle lighting {c}, ends {h}. Most chains are closed.',
    radius: 'radius {r}', m: 'm', km: 'km', approx: 'about',
  },
};
const CITIES = [
  ['tlv', 32.0853, 34.7818, { ru: 'Тель-Авив', he: 'תל אביב', en: 'Tel Aviv' }],
  ['jlm', 31.7767, 35.2345, { ru: 'Иерусалим', he: 'ירושלים', en: 'Jerusalem' }],
  ['hfa', 32.8160, 34.9885, { ru: 'Хайфа', he: 'חיפה', en: 'Haifa' }],
  ['rlz', 31.9730, 34.7925, { ru: 'Ришон-ле-Цион', he: 'ראשון לציון', en: 'Rishon LeZion' }],
  ['ptk', 32.0870, 34.8875, { ru: 'Петах-Тиква', he: 'פתח תקווה', en: 'Petah Tikva' }],
  ['ash', 31.8014, 34.6435, { ru: 'Ашдод', he: 'אשדוד', en: 'Ashdod' }],
  ['net', 32.3290, 34.8566, { ru: 'Нетания', he: 'נתניה', en: 'Netanya' }],
  ['bsh', 31.2518, 34.7913, { ru: 'Беэр-Шева', he: 'באר שבע', en: "Be'er Sheva" }],
  ['ask', 31.6688, 34.5743, { ru: 'Ашкелон', he: 'אשקלון', en: 'Ashkelon' }],
  ['tib', 32.7922, 35.5312, { ru: 'Тверия', he: 'טבריה', en: 'Tiberias' }],
  ['eil', 29.5577, 34.9519, { ru: 'Эйлат', he: 'אילת', en: 'Eilat' }],
];


// ---------- state ----------
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const S = {
  lang: store.get('lang') || (/^he/i.test(navigator.language) ? 'he' : /^en/i.test(navigator.language) ? 'en' : 'ru'),
  cat: 'all', showUnknown: true, lat: null, lon: null, radius: 1200,
  items: [], selected: null, loading: false, error: false, notices: { loc: null, hebcal: [] },
};
const $ = (s) => document.querySelector(s);
const t = (k, vars) => {
  let s = I18N[S.lang][k] ?? I18N.ru[k] ?? k;
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.replace('{' + a + '}', b);
  return s;
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const locale = () => ({ ru: 'ru-RU', he: 'he-IL', en: 'en-GB' }[S.lang]);
const fmtTime = (d) => new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
const fmtDay = (d) => new Intl.DateTimeFormat(locale(), { weekday: 'short' }).format(d);
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

// ---------- opening hours ----------
function normalizeHours(v) {
  let s = v.trim();
  // Common Israeli shorthand "24/6" = round the clock except Shabbat.
  if (/^24\/6$/.test(s)) return 'Su-Th 00:00-24:00; Fr 00:00-(sunset-01:00); Sa (sunset+01:00)-24:00';
  return s;
}
function stripPH(v) {
  // opening_hours.js has no Israeli public-holiday calendar, so drop PH rules; holidays are flagged via Hebcal instead.
  return v.replace(/\bPH\s*,\s*/g, '').replace(/\s*,\s*PH\b/g, '')
    .split(';').map((r) => r.trim()).filter((r) => r && !/^PH\b/i.test(r)).join('; ')
    .replace(/,\s*PH\s+[^,;]*/g, '');
}
const ohCache = new Map();
function parseHours(v, lat, lon) {
  const key = v + '|' + lat.toFixed(1) + lon.toFixed(1);
  if (ohCache.has(key)) return ohCache.get(key);
  const nom = { lat, lon, address: { country_code: 'il', state: '' } };
  const opt = { mode: 0, tag_key: 'opening_hours' };
  let oh = null;
  const v2 = normalizeHours(v);
  const warn = console.warn, err = console.error; console.warn = console.error = () => {};
  try { oh = new opening_hours(v2, nom, opt); }
  catch (e) { try { oh = new opening_hours(stripPH(v2), nom, opt); } catch { oh = null; } }
  finally { console.warn = warn; console.error = err; }
  ohCache.set(key, oh);
  return oh;
}
function statusOf(item, now) {
  const v = item.tags.opening_hours;
  if (!v) return { k: 'unknown' };
  const oh = parseHours(v, item.lat, item.lon);
  if (!oh) return { k: 'unknown', raw: v };
  try {
    if (oh.getUnknown(now)) return { k: 'unknown', raw: v, oh };
    const open = oh.getState(now);
    const next = oh.getNextChange(now);
    if (open) {
      if (!next) return { k: 'open24', oh };
      const mins = Math.round((next - now) / 60000);
      return { k: mins <= 45 ? 'soon' : 'open', next, mins, oh };
    }
    return { k: 'closed', next, oh };
  } catch { return { k: 'unknown', raw: v }; }
}
function statusText(st, now) {
  switch (st.k) {
    case 'open24': return t('open24');
    case 'open': return t('open') + ' · ' + t('until', { t: fmtTime(st.next) });
    case 'soon': return t('soon', { m: st.mins });
    case 'closed': {
      if (!st.next) return t('closed');
      const d0 = startOfDay(now), d1 = startOfDay(st.next);
      const days = Math.round((d1 - d0) / 864e5);
      const tm = fmtTime(st.next);
      return t('closed') + ' · ' + (days === 0 ? t('opensAt', { t: tm }) : days === 1 ? t('opensTomorrow', { t: tm }) : t('opensDay', { d: fmtDay(st.next), t: tm }));
    }
    default: return t('unknown');
  }
}
function weekTable(oh, now) {
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const from = startOfDay(new Date(now.getTime() + i * 864e5));
    const to = new Date(from.getTime() + 864e5);
    let txt;
    try {
      const iv = oh.getOpenIntervals(from, to);
      if (!iv.length) txt = t('dayOff');
      else if (iv.length === 1 && iv[0][0] - from < 60000 && to - iv[0][1] < 60000) txt = t('allDay');
      else txt = iv.map(([a, b]) => fmtTime(a) + '–' + (b - to >= 0 ? '24:00' : fmtTime(b))).join(', ');
    } catch { txt = '?'; }
    rows.push(`<dt class="${i === 0 ? 'today' : ''}">${esc(fmtDay(from))}</dt><dd class="${i === 0 ? 'today' : ''}">${esc(txt)}</dd>`);
  }
  return `<dl class="week">${rows.join('')}</dl>`;
}

// ---------- data ----------
function categoryOf(tg) {
  if (tg.amenity === 'fuel') return 'fuel';
  if (tg.amenity === 'pharmacy' || tg.shop === 'chemist') return 'pharmacy';
  if (tg.shop === 'bakery' || tg.shop === 'pastry') return 'bakery';
  return 'food';
}
function typeKey(tg) { return tg.amenity === 'fuel' || tg.amenity === 'pharmacy' ? tg.amenity : tg.shop; }
function nameOf(it) {
  const tg = it.tags;
  return tg['name:' + S.lang] || tg.name || tg.brand || (I18N[S.lang].types[typeKey(tg)] || '');
}
function distM(aLat, aLon, bLat, bLon) {
  const R = 6371e3, r = Math.PI / 180;
  const dLat = (bLat - aLat) * r, dLon = (bLon - aLon) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
function fmtDist(m) {
  return m < 1000 ? Math.round(m / 10) * 10 + ' ' + t('m') : (m / 1000).toFixed(1).replace('.0', '') + ' ' + t('km');
}
// All Israeli shops are pre-downloaded nightly by tools/update_data.py into data/shops.json,
// so the app needs no live calls to Overpass (slow and rate-limited).
let allShops = null;
async function loadAll() {
  if (allShops) return allShops;
  const r = await fetch('data/shops.json');
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  allShops = j.shops.map(([id, lat, lon, tags]) => ({ id, lat, lon, tags }));
  return allShops;
}
async function fetchShops(lat, lon, radius) {
  const all = await loadAll();
  const dLat = radius / 111000, dLon = radius / (111000 * Math.cos(lat * Math.PI / 180));
  return all.filter((s) => Math.abs(s.lat - lat) < dLat && Math.abs(s.lon - lon) < dLon && distM(lat, lon, s.lat, s.lon) <= radius);
}

// ---------- Hebcal: holidays + Shabbat ----------
async function loadHebcal(lat, lon) {
  const lg = { ru: 'ru', he: 'he', en: 's' }[S.lang];
  const now = new Date();
  const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const out = [];
  try {
    const r = await fetch(`https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=off&mod=on&nx=off&ss=off&mf=off&c=off&s=off&i=on&lg=${lg}&start=${ymd(now)}&end=${ymd(now)}`);
    const j = await r.json();
    const hol = (j.items || []).filter((x) => x.yomtov || x.subcat === 'modern');
    if (hol.length) out.push({ cls: '', text: t('holiday', { h: hol.map((x) => x.title).join(', ') }) });
  } catch {}
  const dow = now.getDay();
  if (dow === 4 || dow === 5 || dow === 6) {
    try {
      const r = await fetch(`https://www.hebcal.com/shabbat?cfg=json&latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&tzid=Asia/Jerusalem&M=on&lg=${lg}`);
      const j = await r.json();
      const c = (j.items || []).find((x) => x.category === 'candles');
      const h = (j.items || []).find((x) => x.category === 'havdalah');
      if (c && h) {
        const cd = new Date(c.date), hd = new Date(h.date);
        if (hd > now) out.push({ cls: 'info', text: t('shabbat', { c: fmtDay(cd) + ' ' + fmtTime(cd), h: fmtDay(hd) + ' ' + fmtTime(hd) }) });
      }
    } catch {}
  }
  S.notices.hebcal = out;
  renderNotices();
}

// ---------- map ----------
let map, layer, meMarker, radiusCircle;
const markers = new Map();
function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function initMap() {
  map = L.map('map', { zoomControl: true, attributionControl: true }).setView([31.6, 34.95], 8);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  layer = L.layerGroup().addTo(map);
  map.on('click', (e) => search(e.latlng.lat, e.latlng.lng, 1200, { source: 'map' }));
}
function drawMap(list) {
  layer.clearLayers(); markers.clear();
  if (meMarker) meMarker.remove();
  if (radiusCircle) radiusCircle.remove();
  meMarker = L.marker([S.lat, S.lon], { icon: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }), interactive: false }).addTo(map);
  radiusCircle = L.circle([S.lat, S.lon], { radius: S.radius, color: cssVar('--brand'), weight: 1, fillOpacity: 0.04, interactive: false }).addTo(map);
  const col = { open: '--open', open24: '--open', soon: '--soon', closed: '--closed', unknown: '--unknown' };
  for (const it of list) {
    const m = L.circleMarker([it.lat, it.lon], {
      radius: it.st.k === 'closed' ? 5 : 8, weight: 2, color: '#fff',
      fillColor: cssVar(col[it.st.k]), fillOpacity: it.st.k === 'closed' ? 0.6 : 1,
    }).addTo(layer);
    m.bindTooltip(esc(nameOf(it)));
    m.on('click', (e) => { L.DomEvent.stopPropagation(e); select(it.id, true); });
    markers.set(it.id, m);
  }
}

// ---------- render ----------
function applyLang() {
  document.documentElement.lang = S.lang;
  document.documentElement.dir = S.lang === 'he' ? 'rtl' : 'ltr';
  document.title = t('title');
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('.langs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang)));
  const sel = $('#city');
  sel.innerHTML = `<option value="">${esc(t('pickCity'))}</option>` + CITIES.map(([id, , , n]) => `<option value="${id}">${esc(n[S.lang])}</option>`).join('');
  $('#cats').innerHTML = Object.entries(I18N[S.lang].cats).map(([k, v]) => `<button type="button" data-cat="${k}" aria-pressed="${k === S.cat}">${esc(v)}</button>`).join('');
}
function renderNotices() {
  const arr = [...(S.notices.loc ? [S.notices.loc] : []), ...S.notices.hebcal];
  $('#notices').innerHTML = arr.map((n) => `<p class="notice ${n.cls}">${esc(n.text)}</p>`).join('');
}
function shopHTML(it, now) {
  const tg = it.tags;
  const type = I18N[S.lang].types[typeKey(tg)] || '';
  const name = nameOf(it);
  const st = it.st;
  const more = [];
  if (st.oh) more.push(weekTable(st.oh, now));
  if (tg.opening_hours) more.push(`<p class="raw">${esc(tg.opening_hours)}</p>`);
  const addr = [tg['addr:street'], tg['addr:housenumber']].filter(Boolean).join(' ');
  const acts = [
    `<a class="go" href="https://www.google.com/maps/dir/?api=1&destination=${it.lat},${it.lon}" target="_blank" rel="noopener">${esc(t('route'))}</a>`,
    `<a href="https://waze.com/ul?ll=${it.lat},${it.lon}&navigate=yes" target="_blank" rel="noopener">${esc(t('waze'))}</a>`,
  ];
  const phone = tg.phone || tg['contact:phone'];
  if (phone) acts.push(`<a href="tel:${esc(phone.split(';')[0].replace(/\s/g, ''))}">${esc(t('call'))}</a>`);
  more.push(`<div class="actions">${acts.join('')}</div>`);
  return `<li class="shop${S.selected === it.id ? ' sel' : ''}" data-id="${it.id}" tabindex="0">
    <span class="name">${esc(name)}</span><span class="dist">${fmtDist(it.d)}</span>
    <span class="meta"><span class="pill ${st.k}">${esc(statusText(st, now))}</span>${type && type !== name ? `<span>${esc(type)}</span>` : ''}${addr ? `<span>${esc(addr)}</span>` : ''}</span>
    <div class="more">${more.join('')}</div>
  </li>`;
}
function render() {
  const now = new Date();
  if (S.loading) {
    $('#summary').textContent = t('loading');
    $('#list').innerHTML = '<li class="skeleton"></li><li class="skeleton"></li><li class="skeleton"></li>';
    $('#closedBox').hidden = true;
    return;
  }
  if (S.error) {
    $('#summary').textContent = '';
    $('#list').innerHTML = `<li class="empty">${esc(t('netFail'))}<br><button type="button" class="ghost" data-retry>${esc(t('retry'))}</button></li>`;
    $('#closedBox').hidden = true;
    return;
  }
  if (S.lat == null) { $('#summary').textContent = ''; $('#list').innerHTML = ''; return; }
  for (const it of S.items) it.st = statusOf(it, now);
  const inCat = S.items.filter((it) => S.cat === 'all' || it.cat === S.cat);
  const rank = { open24: 0, open: 0, soon: 0, unknown: 1, closed: 2 };
  inCat.sort((a, b) => rank[a.st.k] - rank[b.st.k] || a.d - b.d);
  const openL = inCat.filter((it) => rank[it.st.k] === 0);
  const unkL = inCat.filter((it) => it.st.k === 'unknown');
  const closedL = inCat.filter((it) => it.st.k === 'closed');
  const shown = S.showUnknown ? [...openL, ...unkL] : openL;
  $('#summary').textContent = S.showUnknown ? t('summary', { o: openL.length, u: unkL.length }) : t('summaryNoUnknown', { o: openL.length });
  if (!openL.length && !(S.showUnknown && unkL.length)) {
    const r2 = S.radius < 3000 ? 3000 : S.radius < 6000 ? 6000 : 0;
    $('#list').innerHTML = `<li class="empty">${esc(t('empty'))}${r2 ? `<br><button type="button" class="ghost" data-widen="${r2}">${esc(t('widen', { r: r2 / 1000 }))}</button>` : ''}</li>`;
  } else {
    $('#list').innerHTML = shown.map((it) => shopHTML(it, now)).join('');
  }
  $('#closedBox').hidden = !closedL.length;
  $('#closedTitle').textContent = t('closedTitle', { n: closedL.length });
  $('#closedList').innerHTML = closedL.map((it) => shopHTML(it, now)).join('');
  drawMap(S.showUnknown ? inCat : [...openL, ...closedL]);
}
function select(id, fromMap) {
  S.selected = S.selected === id && !fromMap ? null : id;
  document.querySelectorAll('.shop').forEach((el) => el.classList.toggle('sel', el.dataset.id === S.selected));
  const it = S.items.find((x) => x.id === id);
  if (!it) return;
  if (fromMap) {
    const el = document.querySelector(`.shop[data-id="${id}"]`);
    if (el) { if (el.closest('details')) el.closest('details').open = true; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  } else if (S.selected) {
    map.panTo([it.lat, it.lon]);
    markers.get(id)?.openTooltip();
  }
}

// ---------- flow ----------
let searchSeq = 0;
async function search(lat, lon, radius = 1200, { source, auto } = {}) {
  const seq = ++searchSeq;
  S.lat = lat; S.lon = lon; S.radius = radius; S.selected = null; S.loading = true; S.error = false;
  if (source !== 'demo') S.notices.loc = null;
  history.replaceState(null, '', '#' + lat.toFixed(5) + ',' + lon.toFixed(5));
  store.set('lastLoc', JSON.stringify([lat, lon]));
  renderNotices(); render();
  const z = radius <= 1200 ? 15 : radius <= 3000 ? 14 : 13;
  map.setView([lat, lon], source === 'map' ? Math.max(map.getZoom(), z) : z);
  loadHebcal(lat, lon);
  try {
    const raw = await fetchShops(lat, lon, radius);
    if (seq !== searchSeq) return;
    S.items = raw.map((it) => ({ ...it, cat: categoryOf(it.tags), d: distM(lat, lon, it.lat, it.lon) }));
    S.loading = false;
    render();
    const now = new Date();
    const openCount = S.items.filter((it) => ['open', 'open24', 'soon'].includes(statusOf(it, now).k)).length;
    if (!auto && openCount < 3 && radius < 3000) search(lat, lon, 3000, { source, auto: true });
  } catch (e) {
    if (seq !== searchSeq) return;
    S.loading = false; S.error = true; render();
  }
}
function locate(isAuto) {
  const btn = $('#locate');
  if (!navigator.geolocation) { fallback(isAuto); return; }
  btn.setAttribute('aria-busy', 'true');
  btn.querySelector('span').textContent = t('locating');
  navigator.geolocation.getCurrentPosition(
    (p) => { resetBtn(); search(p.coords.latitude, p.coords.longitude, 1200, { source: 'gps' }); },
    () => { resetBtn(); fallback(isAuto); },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
  );
  function resetBtn() { btn.removeAttribute('aria-busy'); btn.querySelector('span').textContent = t('locate'); }
}
function fallback(isAuto) {
  if (isAuto && S.lat == null) {
    search(32.0853, 34.7818, 1200, { source: 'demo' });
    S.notices.loc = { cls: 'info', text: t('demo') };
  } else {
    S.notices.loc = { cls: 'err', text: t('geoFail') };
  }
  renderNotices();
}

// ---------- wire up ----------
function init() {
  applyLang();
  initMap();
  $('#locate').addEventListener('click', () => locate(false));
  $('#city').addEventListener('change', (e) => {
    const c = CITIES.find((x) => x[0] === e.target.value);
    if (c) search(c[1], c[2], 1200, { source: 'city' });
  });
  $('#cats').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    S.cat = b.dataset.cat;
    document.querySelectorAll('#cats button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    render();
  });
  $('#showUnknown').addEventListener('change', (e) => { S.showUnknown = e.target.checked; render(); });
  document.querySelector('.langs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]'); if (!b) return;
    S.lang = b.dataset.lang; store.set('lang', S.lang);
    applyLang(); render();
    if (S.lat != null) loadHebcal(S.lat, S.lon);
  });
  document.querySelector('.panel').addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    const w = e.target.closest('[data-widen]');
    if (w) { search(S.lat, S.lon, +w.dataset.widen, { auto: true }); return; }
    if (e.target.closest('[data-retry]')) { search(S.lat, S.lon, S.radius); return; }
    const li = e.target.closest('.shop'); if (li) select(li.dataset.id, false);
  });
  document.querySelector('.panel').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const li = e.target.closest('.shop'); if (li && e.target === li) { e.preventDefault(); select(li.dataset.id, false); }
  });
  setInterval(() => { if (!S.loading && S.items.length) render(); }, 60000);

  const m = location.hash.match(/^#(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
  if (m) { search(+m[1], +m[2], 1200, { source: 'link' }); return; }
  locate(true);
}
init();
