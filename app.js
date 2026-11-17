/* Открыто рядом — Pixel Studio. Map-first: everything in the visible map area, open places first.
   Data: data/shops.json (OpenStreetMap + official chain hours, refreshed daily) + Hebcal (Shabbat/holidays). */
'use strict';

// ---------- i18n ----------
const I18N = {
  ru: {
    title: 'Открыто рядом', pickCity: 'Город…', kicker: 'Сейчас открыто',
    units: ['место', 'места', 'мест'], whereMe: 'рядом с вами', whereMap: 'в этой части карты',
    zoomIn: 'Приблизьте карту, чтобы увидеть магазины',
    source: 'Данные: OpenStreetMap и официальные сайты сетей, обновляются каждый день.', madeBy: 'Сделано в',
    cats: { all: 'Всё', food: 'Продукты', bakery: 'Пекарни', pharmacy: 'Аптеки', fuel: 'Заправки' },
    types: { supermarket: 'Супермаркет', convenience: 'Минимаркет', kiosk: 'Киоск', grocery: 'Продукты', greengrocer: 'Овощи и фрукты', deli: 'Деликатесы', alcohol: 'Алкоголь', bakery: 'Пекарня', pastry: 'Кондитерская', pharmacy: 'Аптека', chemist: 'Аптека и косметика', fuel: 'Заправка' },
    open24: 'Круглосуточно', open: 'Открыто', until: 'до {t}', soon: 'Закроется через {m} мин',
    closed: 'Закрыто', opensAt: 'откроется в {t}', opensTomorrow: 'завтра в {t}', opensDay: '{d} в {t}',
    unknown: 'Часы не указаны', allDay: 'круглосуточно', dayOff: 'закрыто',
    unknownTitle: 'Часы не указаны · {n}', unknownNote: 'Эти места есть на карте, но их часы работы нам пока неизвестны.',
    closedTitle: 'Сейчас закрыты · {n}', more: 'Показать ещё {n}',
    empty: 'В этой части карты открытых мест нет.', zoomOut: 'Отдалить карту',
    walk: '{m} мин', shabbat: 'Шаббат', route: 'Маршрут', waze: 'Waze', call: 'Позвонить',
    geoFail: 'Не получилось определить местоположение. Выберите город или подвиньте карту.',
    demo: 'Показан центр Тель-Авива. Нажмите ➤, чтобы найти места рядом с вами.',
    netFail: 'Не удалось загрузить данные. Проверьте интернет.', retry: 'Повторить',
    holiday: 'Сегодня {h}. Многие магазины закрыты или работают по-другому.',
    shabbatNote: 'Шаббат: свечи {c}, исход {h}. Большинство сетей в это время закрыты.',
    m: 'м', km: 'км', expand: 'Развернуть список',
  },
  he: {
    title: 'פתוח קרוב', pickCity: 'עיר…', kicker: 'פתוח עכשיו',
    units: ['מקום', 'מקומות', 'מקומות'], whereMe: 'לידך', whereMap: 'באזור המפה',
    zoomIn: 'הגדילו את המפה כדי לראות חנויות',
    source: 'נתונים: OpenStreetMap ואתרי הרשתות, מתעדכנים מדי יום.', madeBy: 'נבנה ב-',
    cats: { all: 'הכל', food: 'מזון', bakery: 'מאפיות', pharmacy: 'בתי מרקחת', fuel: 'דלק' },
    types: { supermarket: 'סופרמרקט', convenience: 'מכולת', kiosk: 'קיוסק', grocery: 'מכולת', greengrocer: 'ירקן', deli: 'מעדנייה', alcohol: 'משקאות', bakery: 'מאפייה', pastry: 'קונדיטוריה', pharmacy: 'בית מרקחת', chemist: 'פארם', fuel: 'תחנת דלק' },
    open24: '24 שעות', open: 'פתוח', until: 'עד {t}', soon: 'נסגר בעוד {m} דק׳',
    closed: 'סגור', opensAt: 'ייפתח ב-{t}', opensTomorrow: 'מחר ב-{t}', opensDay: '{d} ב-{t}',
    unknown: 'אין שעות', allDay: '24 שעות', dayOff: 'סגור',
    unknownTitle: 'בלי שעות · {n}', unknownNote: 'המקומות האלה מופיעים במפה, אבל שעות הפתיחה שלהם עדיין לא ידועות לנו.',
    closedTitle: 'סגורים עכשיו · {n}', more: 'עוד {n}',
    empty: 'אין מקומות פתוחים באזור הזה של המפה.', zoomOut: 'להרחיק את המפה',
    walk: '{m} דק׳', shabbat: 'שבת', route: 'ניווט', waze: 'Waze', call: 'חיוג',
    geoFail: 'לא הצלחנו לאתר את המיקום. בחרו עיר או הזיזו את המפה.',
    demo: 'מוצג מרכז תל אביב. הקישו ➤ כדי למצוא מקומות לידכם.',
    netFail: 'לא הצלחנו לטעון נתונים. בדקו את החיבור.', retry: 'נסו שוב',
    holiday: 'היום {h}. חנויות רבות סגורות או פועלות בשעות שונות.',
    shabbatNote: 'שבת: הדלקת נרות {c}, צאת שבת {h}. רוב הרשתות סגורות.',
    m: 'מ׳', km: 'ק״מ', expand: 'להרחיב את הרשימה',
  },
  en: {
    title: 'Open Nearby', pickCity: 'City…', kicker: 'Open right now',
    units: ['place', 'places', 'places'], whereMe: 'near you', whereMap: 'in this part of the map',
    zoomIn: 'Zoom in to see shops',
    source: 'Data: OpenStreetMap and the chains\' own websites, refreshed daily.', madeBy: 'Made by',
    cats: { all: 'All', food: 'Groceries', bakery: 'Bakeries', pharmacy: 'Pharmacies', fuel: 'Gas' },
    types: { supermarket: 'Supermarket', convenience: 'Convenience store', kiosk: 'Kiosk', grocery: 'Grocery', greengrocer: 'Greengrocer', deli: 'Deli', alcohol: 'Liquor store', bakery: 'Bakery', pastry: 'Pastry shop', pharmacy: 'Pharmacy', chemist: 'Drugstore', fuel: 'Gas station' },
    open24: 'Open 24 hours', open: 'Open', until: 'until {t}', soon: 'Closes in {m} min',
    closed: 'Closed', opensAt: 'opens at {t}', opensTomorrow: 'tomorrow {t}', opensDay: '{d} {t}',
    unknown: 'No hours listed', allDay: '24 hours', dayOff: 'closed',
    unknownTitle: 'No hours listed · {n}', unknownNote: 'These places are on the map, but we don\'t know their hours yet.',
    closedTitle: 'Closed now · {n}', more: 'Show {n} more',
    empty: 'Nothing open in this part of the map.', zoomOut: 'Zoom out',
    walk: '{m} min', shabbat: 'Shabbat', route: 'Directions', waze: 'Waze', call: 'Call',
    geoFail: "Couldn't get your location. Pick a city or move the map.",
    demo: 'Showing central Tel Aviv. Tap ➤ to find places near you.',
    netFail: "Couldn't load data. Check your connection.", retry: 'Try again',
    holiday: 'Today is {h}. Many shops are closed or keep different hours.',
    shabbatNote: 'Shabbat: candles {c}, ends {h}. Most chains are closed.',
    m: 'm', km: 'km', expand: 'Expand the list',
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
const ICONS = {
  all: '<path d="M4 9.5 5.2 4h13.6L20 9.5M4 9.5h16V20H4zM9.5 20v-5.5h5V20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  food: '<path d="M3 4h2.2l2.3 10.3a1.8 1.8 0 0 0 1.8 1.4h7.6a1.8 1.8 0 0 0 1.7-1.3L20.5 8H6.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.5" cy="19.5" r="1.6" fill="currentColor"/><circle cx="17" cy="19.5" r="1.6" fill="currentColor"/>',
  bakery: '<path d="M4 13.5C4 9.4 7.6 6.5 12 6.5s8 2.9 8 7V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 10v3.5M12 9.5v4M15 10v3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  pharmacy: '<path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z" fill="currentColor"/>',
  fuel: '<path d="M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M3.5 20h12M14 9h2a1.8 1.8 0 0 1 1.8 1.8v5a1.5 1.5 0 0 0 3 0V8.2L18 5.5M7 8h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;

// ---------- state & helpers ----------
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const S = {
  lang: store.get('lang') || (/^he/i.test(navigator.language) ? 'he' : /^en/i.test(navigator.language) ? 'en' : 'ru'),
  cat: 'all', me: null, selected: null, view: [], limits: { list: 60, unknown: 60, closed: 40 },
  notices: { loc: null, hebcal: [] }, loaded: false, error: false,
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
function plural(n) {
  const u = I18N[S.lang].units;
  if (S.lang !== 'ru') return n === 1 ? u[0] : u[1];
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? u[0] : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? u[1] : u[2];
}

// ---------- opening hours ----------
function normalizeHours(v) {
  const s = v.trim();
  if (/^24\/6$/.test(s)) return 'Su-Th 00:00-24:00; Fr 00:00-(sunset-01:00); Sa (sunset+01:00)-24:00';
  return s;
}
function stripPH(v) {
  // opening_hours.js has no Israeli holiday calendar; drop PH rules (holidays are flagged via Hebcal).
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
  catch { try { oh = new opening_hours(stripPH(v2), nom, opt); } catch { oh = null; } }
  finally { console.warn = warn; console.error = err; }
  ohCache.set(key, oh);
  return oh;
}
function statusOf(it, now) {
  const v = it.tags.opening_hours;
  if (!v) return { k: 'unknown' };
  const oh = parseHours(v, it.lat, it.lon);
  if (!oh) return { k: 'unknown' };
  try {
    if (oh.getUnknown(now)) return { k: 'unknown', oh };
    const open = oh.getState(now);
    const next = oh.getNextChange(now);
    if (open) {
      if (!next) return { k: 'open24', oh };
      const mins = Math.round((next - now) / 60000);
      return { k: mins <= 45 ? 'soon' : 'open', next, mins, oh };
    }
    return { k: 'closed', next, oh };
  } catch { return { k: 'unknown' }; }
}
const isOpen = (k) => k === 'open' || k === 'open24' || k === 'soon';
function statusText(st, now) {
  switch (st.k) {
    case 'open24': return t('open24');
    case 'open': return t('open') + ' · ' + t('until', { t: fmtTime(st.next) });
    case 'soon': return t('soon', { m: st.mins });
    case 'closed': {
      if (!st.next) return t('closed');
      const days = Math.round((startOfDay(st.next) - startOfDay(now)) / 864e5);
      const tm = fmtTime(st.next);
      return t('closed') + ' · ' + (days === 0 ? t('opensAt', { t: tm }) : days === 1 ? t('opensTomorrow', { t: tm }) : t('opensDay', { d: fmtDay(st.next), t: tm }));
    }
    default: return t('unknown');
  }
}
const shabCache = new Map();
function opensOnShabbat(it, oh, now) {
  if (shabCache.has(it.id)) return shabCache.get(it.id);
  let r = false;
  try {
    const sat = startOfDay(now); sat.setDate(sat.getDate() + ((6 - sat.getDay() + 7) % 7)); sat.setHours(12);
    r = !!oh.getState(sat);
  } catch {}
  shabCache.set(it.id, r);
  return r;
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
    const c = i === 0 ? ' class="today"' : '';
    rows.push(`<dt${c}>${esc(fmtDay(from))}</dt><dd${c}>${esc(txt)}</dd>`);
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
const typeKey = (tg) => (tg.amenity === 'fuel' || tg.amenity === 'pharmacy' ? tg.amenity : tg.shop);
const nameOf = (it) => it.tags['name:' + S.lang] || it.tags.name || it.tags.brand || I18N[S.lang].types[typeKey(it.tags)] || '';
function distM(aLat, aLon, bLat, bLon) {
  const R = 6371e3, r = Math.PI / 180;
  const dLat = (bLat - aLat) * r, dLon = (bLon - aLon) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const fmtDist = (m) => (m < 1000 ? Math.round(m / 10) * 10 + ' ' + t('m') : (m / 1000).toFixed(1).replace('.0', '') + ' ' + t('km'));
let ALL = [];
async function loadAll() {
  const r = await fetch('data/shops.json');
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  ALL = j.shops.map(([id, lat, lon, tags]) => ({ id, lat, lon, tags, cat: categoryOf(tags) }));
}

// ---------- Hebcal ----------
async function loadHebcal(lat, lon) {
  const lg = { ru: 'ru', he: 'he', en: 's' }[S.lang];
  const now = new Date();
  const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const out = [];
  try {
    const j = await (await fetch(`https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=off&mod=on&nx=off&ss=off&mf=off&c=off&s=off&i=on&lg=${lg}&start=${ymd(now)}&end=${ymd(now)}`)).json();
    const hol = (j.items || []).filter((x) => x.yomtov || x.subcat === 'modern');
    if (hol.length) out.push({ cls: '', text: t('holiday', { h: hol.map((x) => x.title).join(', ') }) });
  } catch {}
  if ([4, 5, 6].includes(now.getDay())) {
    try {
      const j = await (await fetch(`https://www.hebcal.com/shabbat?cfg=json&latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&tzid=Asia/Jerusalem&M=on&lg=${lg}`)).json();
      const c = (j.items || []).find((x) => x.category === 'candles');
      const h = (j.items || []).find((x) => x.category === 'havdalah');
      if (c && h && new Date(h.date) > now) {
        const cd = new Date(c.date), hd = new Date(h.date);
        out.push({ cls: 'info', text: t('shabbatNote', { c: fmtDay(cd) + ' ' + fmtTime(cd), h: fmtDay(hd) + ' ' + fmtTime(hd) }) });
      }
    } catch {}
  }
  S.notices.hebcal = out;
  renderNotices();
}

// ---------- map ----------
let map, pinLayer, dotLayer, meMarker;
const markers = new Map();
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const STATUS_VAR = { open: '--open', open24: '--open', soon: '--soon', closed: '--closed', unknown: '--unknown' };
function initMap(center, zoom) {
  const touch = matchMedia('(pointer: coarse)').matches;
  map = L.map('map', { zoomControl: !touch, preferCanvas: true, attributionControl: true }).setView(center, zoom);
  if (map.zoomControl) map.zoomControl.setPosition('topright');
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  dotLayer = L.layerGroup().addTo(map);
  pinLayer = L.layerGroup().addTo(map);
  let timer;
  map.on('moveend', () => { clearTimeout(timer); timer = setTimeout(refresh, 120); });
}
function pinIcon(it, sel) {
  return L.divIcon({
    className: '', iconSize: [30, 30], iconAnchor: [15, 30],
    html: `<div class="pin${sel ? ' sel' : ''}" style="background:${cssVar(STATUS_VAR[it.st.k])}">${svg(it.cat)}</div>`,
  });
}
function drawMarkers(openL, unkL, closedL) {
  pinLayer.clearLayers(); dotLayer.clearLayers(); markers.clear();
  const z = map.getZoom();
  for (const it of openL.slice(0, 250)) {
    const m = L.marker([it.lat, it.lon], { icon: pinIcon(it, it.id === S.selected), keyboard: false, riseOnHover: true }).addTo(pinLayer);
    m.bindTooltip(esc(nameOf(it)), { direction: 'top', offset: [0, -28] });
    m.on('click', () => select(it.id, true));
    markers.set(it.id, m);
  }
  if (z >= 14) {
    const dots = [...unkL.slice(0, 300), ...closedL.slice(0, 200)];
    for (const it of dots) {
      const m = L.circleMarker([it.lat, it.lon], {
        radius: 5, weight: 1.5, color: '#fff', fillColor: cssVar(STATUS_VAR[it.st.k]), fillOpacity: it.st.k === 'closed' ? 0.55 : 0.85,
      }).addTo(dotLayer);
      m.bindTooltip(esc(nameOf(it)));
      m.on('click', () => select(it.id, true));
      markers.set(it.id, m);
    }
  }
}
function drawMe() {
  if (!S.me) return;
  if (meMarker) meMarker.setLatLng([S.me.lat, S.me.lon]);
  else meMarker = L.marker([S.me.lat, S.me.lon], { icon: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false, zIndexOffset: 1000 }).addTo(map);
}

// ---------- sheet (phone) ----------
const sheet = () => $('#sheet');
const wide = () => matchMedia('(min-width: 860px)').matches;
function setSheet(state) {
  const el = sheet();
  el.dataset.state = state;
  if (wide()) { document.documentElement.style.setProperty('--sheet-peek', '0px'); return; }
  const H = el.offsetHeight, vh = window.innerHeight;
  const visible = state === 'full' ? H : state === 'half' ? Math.min(H, Math.round(vh * 0.5)) : Math.min(H, 212);
  el.style.setProperty('--sheet-offset', H - visible + 'px');
  document.documentElement.style.setProperty('--sheet-peek', Math.min(visible, Math.round(vh * 0.5)) + 'px');
}
function initSheet() {
  const el = sheet(), grab = $('#grab');
  const order = ['peek', 'half', 'full'];
  grab.addEventListener('click', () => {
    if (drag.moved) return;
    setSheet(order[(order.indexOf(el.dataset.state) + 1) % order.length]);
  });
  const drag = { y0: 0, off0: 0, moved: false, on: false };
  const start = (e) => {
    if (wide() || e.target.closest('select,button:not(.grab),a')) return;
    drag.on = true; drag.moved = false; drag.y0 = e.clientY;
    drag.off0 = parseFloat(getComputedStyle(el).getPropertyValue('--sheet-offset')) || 0;
    el.classList.add('dragging');
    el.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    if (!drag.on) return;
    const dy = e.clientY - drag.y0;
    if (Math.abs(dy) > 4) drag.moved = true;
    const H = el.offsetHeight;
    el.style.setProperty('--sheet-offset', Math.max(0, Math.min(H - 120, drag.off0 + dy)) + 'px');
  };
  const end = () => {
    if (!drag.on) return;
    drag.on = false; el.classList.remove('dragging');
    if (!drag.moved) return;
    const H = el.offsetHeight, vh = window.innerHeight;
    const visible = H - (parseFloat(el.style.getPropertyValue('--sheet-offset')) || 0);
    const targets = { peek: 212, half: vh * 0.5, full: H };
    const best = Object.entries(targets).sort((a, b) => Math.abs(a[1] - visible) - Math.abs(b[1] - visible))[0][0];
    setSheet(best);
    setTimeout(() => { drag.moved = false; }, 0);
  };
  for (const h of [grab, $('.hero')]) h.addEventListener('pointerdown', start);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  window.addEventListener('resize', () => setSheet(el.dataset.state));
  setSheet('half');
}

// ---------- render ----------
function applyLang() {
  document.documentElement.lang = S.lang;
  document.documentElement.dir = S.lang === 'he' ? 'rtl' : 'ltr';
  document.title = t('title');
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('.langs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang)));
  $('#kicker').textContent = t('kicker');
  $('#grab').setAttribute('aria-label', t('expand'));
  $('#city').innerHTML = `<option value="">${esc(t('pickCity'))}</option>` + CITIES.map(([id, , , n]) => `<option value="${id}">${esc(n[S.lang])}</option>`).join('');
}
function renderNotices() {
  const arr = [...(S.notices.loc ? [S.notices.loc] : []), ...S.notices.hebcal];
  $('#notices').innerHTML = arr.map((n) => `<p class="notice ${n.cls}">${esc(n.text)}</p>`).join('');
}
function shopHTML(it, now) {
  const tg = it.tags, st = it.st;
  const type = I18N[S.lang].types[typeKey(tg)] || '';
  const name = nameOf(it);
  const addr = [tg['addr:street'], tg['addr:housenumber']].filter(Boolean).join(' ');
  const tags = [];
  if (st.oh && st.k !== 'open24' && opensOnShabbat(it, st.oh, now)) tags.push(`<span class="tag shab">${esc(t('shabbat'))} ✓</span>`);
  const more = [];
  if (S.selected === it.id) {
    if (st.oh) more.push(weekTable(st.oh, now));
    if (tg.opening_hours) more.push(`<p class="raw">${esc(tg.opening_hours)}</p>`);
    const acts = [
      `<a class="go" href="https://www.google.com/maps/dir/?api=1&destination=${it.lat},${it.lon}" target="_blank" rel="noopener">${esc(t('route'))}</a>`,
      `<a href="https://waze.com/ul?ll=${it.lat},${it.lon}&navigate=yes" target="_blank" rel="noopener">${esc(t('waze'))}</a>`,
    ];
    const phone = tg.phone || tg['contact:phone'];
    if (phone) acts.push(`<a href="tel:${esc(phone.split(';')[0].replace(/\s/g, ''))}">${esc(t('call'))}</a>`);
    more.push(`<div class="actions">${acts.join('')}</div>`);
  }
  const walk = it.d < 2500 ? `<b>${esc(t('walk', { m: Math.max(1, Math.round(it.d / 80)) }))}</b>` : '';
  return `<li class="shop${S.selected === it.id ? ' sel' : ''}" data-id="${esc(it.id)}" tabindex="0">
    <span class="ico c-${it.cat}">${svg(it.cat)}</span>
    <span class="name">${esc(name)}</span>
    <span class="dist">${walk}${fmtDist(it.d)}</span>
    <span class="meta"><span class="pill ${st.k}">${esc(statusText(st, now))}</span>${tags.join('')}${type && type !== name ? `<span>${esc(type)}</span>` : ''}${addr ? `<span>${esc(addr)}</span>` : ''}</span>
    <div class="more">${more.join('')}</div>
  </li>`;
}
function listWithMore(items, key, now) {
  const lim = S.limits[key];
  const rest = items.length - lim;
  return items.slice(0, lim).map((it) => shopHTML(it, now)).join('') +
    (rest > 0 ? `<li class="empty"><button type="button" class="ghost" data-more="${key}">${esc(t('more', { n: rest }))}</button></li>` : '');
}
function refresh() {
  if (!S.loaded) return;
  const now = new Date();
  const b = map.getBounds(), z = map.getZoom();
  const c = map.getCenter();
  const meIn = S.me && b.contains([S.me.lat, S.me.lon]);
  const ref = meIn ? S.me : { lat: c.lat, lon: c.lng };
  const pad = b.pad(0.05);
  const inView = z >= 10 ? ALL.filter((s) => pad.contains([s.lat, s.lon])) : [];
  for (const it of inView) { it.st = statusOf(it, now); it.d = distM(ref.lat, ref.lon, it.lat, it.lon); }
  S.view = inView;
  history.replaceState(null, '', `#${c.lat.toFixed(5)},${c.lng.toFixed(5)},${z}`);
  store.set('lastView', JSON.stringify([c.lat, c.lng, z]));

  // category chips with open counts
  const openAll = inView.filter((it) => isOpen(it.st.k));
  const counts = { all: openAll.length, food: 0, bakery: 0, pharmacy: 0, fuel: 0 };
  for (const it of openAll) counts[it.cat]++;
  $('#cats').innerHTML = Object.entries(I18N[S.lang].cats).map(([k, v]) =>
    `<button type="button" class="chip" data-cat="${k}" aria-pressed="${k === S.cat}"><span class="ico c-${k}">${svg(k)}</span>${esc(v)} <span class="n">${counts[k]}</span></button>`).join('');

  const inCat = inView.filter((it) => S.cat === 'all' || it.cat === S.cat).sort((a, b) => a.d - b.d);
  const openL = inCat.filter((it) => isOpen(it.st.k));
  const unkL = inCat.filter((it) => it.st.k === 'unknown');
  const closedL = inCat.filter((it) => it.st.k === 'closed');

  $('#openCount').textContent = z >= 10 ? openL.length : '—';
  $('#openUnit').textContent = plural(openL.length);
  $('#whereLine').textContent = z < 10 ? t('zoomIn') : meIn ? t('whereMe') : t('whereMap');

  if (S.error) {
    $('#list').innerHTML = `<li class="empty">${esc(t('netFail'))}<br><button type="button" class="ghost" data-retry>${esc(t('retry'))}</button></li>`;
  } else if (z < 10) {
    $('#list').innerHTML = `<li class="empty">${esc(t('zoomIn'))}</li>`;
  } else if (!openL.length) {
    $('#list').innerHTML = `<li class="empty">${esc(t('empty'))}<br><button type="button" class="ghost" data-zoomout>${esc(t('zoomOut'))}</button></li>`;
  } else {
    $('#list').innerHTML = listWithMore(openL, 'list', now);
  }
  $('#unknownBox').hidden = !unkL.length;
  $('#unknownTitle').textContent = t('unknownTitle', { n: unkL.length });
  if ($('#unknownBox').open) $('#unknownList').innerHTML = listWithMore(unkL, 'unknown', now);
  $('#closedBox').hidden = !closedL.length;
  $('#closedTitle').textContent = t('closedTitle', { n: closedL.length });
  if ($('#closedBox').open) $('#closedList').innerHTML = listWithMore(closedL, 'closed', now);
  S.lists = { unknown: unkL, closed: closedL };
  drawMarkers(openL, unkL, closedL);
}
function select(id, fromMap) {
  S.selected = S.selected === id && !fromMap ? null : id;
  const it = S.view.find((x) => x.id === id);
  if (fromMap && it) {
    if (it.st.k === 'unknown') $('#unknownBox').open = true;
    if (it.st.k === 'closed') $('#closedBox').open = true;
    if (!wide() && sheet().dataset.state === 'peek') setSheet('half');
  }
  refresh();
  const el = document.querySelector(`.shop[data-id="${CSS.escape(id)}"]`);
  if (el && fromMap) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (!fromMap && S.selected && it && !map.getBounds().pad(-0.15).contains([it.lat, it.lon])) map.panTo([it.lat, it.lon]);
}

// ---------- location ----------
function locate(isAuto) {
  const btn = $('#locate');
  if (!navigator.geolocation) { if (!isAuto) showLocErr(); return; }
  btn.setAttribute('aria-busy', 'true');
  navigator.geolocation.getCurrentPosition(
    (p) => {
      btn.removeAttribute('aria-busy'); btn.classList.add('on');
      S.me = { lat: p.coords.latitude, lon: p.coords.longitude };
      S.notices.loc = null; renderNotices(); drawMe();
      map.setView([S.me.lat, S.me.lon], Math.max(map.getZoom(), 16));
      loadHebcal(S.me.lat, S.me.lon);
    },
    () => { btn.removeAttribute('aria-busy'); if (isAuto) { S.notices.loc = { cls: 'info', text: t('demo') }; renderNotices(); } else showLocErr(); },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
  );
}
function showLocErr() { S.notices.loc = { cls: 'err', text: t('geoFail') }; renderNotices(); }

// ---------- wire up ----------
async function init() {
  applyLang();
  const m = location.hash.match(/^#(-?\d+\.?\d*),(-?\d+\.?\d*)(?:,(\d+))?$/);
  let last = null; try { last = JSON.parse(store.get('lastView') || 'null'); } catch {}
  const start = m ? [+m[1], +m[2], +(m[3] || 16)] : last || [32.0853, 34.7818, 15];
  initMap([start[0], start[1]], start[2]);
  initSheet();
  $('#list').innerHTML = '<li class="skeleton"></li><li class="skeleton"></li><li class="skeleton"></li>';

  $('#locate').addEventListener('click', () => locate(false));
  $('#city').addEventListener('change', (e) => {
    const c = CITIES.find((x) => x[0] === e.target.value);
    if (c) { map.setView([c[1], c[2]], 15); loadHebcal(c[1], c[2]); }
    e.target.value = '';
  });
  $('#cats').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    S.cat = b.dataset.cat; S.limits = { list: 60, unknown: 60, closed: 40 }; refresh();
  });
  document.querySelector('.langs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]'); if (!b) return;
    S.lang = b.dataset.lang; store.set('lang', S.lang);
    applyLang(); refresh();
    const c = S.me || { lat: map.getCenter().lat, lon: map.getCenter().lng }; loadHebcal(c.lat, c.lon);
  });
  for (const id of ['#unknownBox', '#closedBox']) $(id).addEventListener('toggle', refresh);
  $('#scroller').addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    const more = e.target.closest('[data-more]');
    if (more) { S.limits[more.dataset.more] += 60; refresh(); return; }
    if (e.target.closest('[data-zoomout]')) { map.zoomOut(2); return; }
    if (e.target.closest('[data-retry]')) { location.reload(); return; }
    const li = e.target.closest('.shop'); if (li) select(li.dataset.id, false);
  });
  $('#scroller').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const li = e.target.closest('.shop'); if (li && e.target === li) { e.preventDefault(); select(li.dataset.id, false); }
  });
  setInterval(refresh, 60000);

  try { await loadAll(); S.loaded = true; } catch { S.loaded = true; S.error = true; }
  refresh();
  const c = map.getCenter(); loadHebcal(c.lat, c.lng);
  if (!m) locate(true);
}
init();
