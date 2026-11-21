/* בטוח? פתוח! · Betcha it's open · Точно открыто. Map-first: everything in the visible map area, open places first.
   Data: data/shops.json (OpenStreetMap + official chain hours, refreshed daily) + Hebcal (Shabbat/holidays). */
'use strict';

// ---------- i18n ---------- (tables in i18n.js)
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
  shop: '<path d="M5 8h14l-1.2 12H6.2zM9 8V6.5a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>',
  eat: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 1.5-3 4-3 7v3h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  atm: '<rect x="3" y="5.5" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 9.5h18" stroke="currentColor" stroke-width="2"/><path d="M7 14.5h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  all: '<path d="M4 9.5 5.2 4h13.6L20 9.5M4 9.5h16V20H4zM9.5 20v-5.5h5V20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  food: '<path d="M3 4h2.2l2.3 10.3a1.8 1.8 0 0 0 1.8 1.4h7.6a1.8 1.8 0 0 0 1.7-1.3L20.5 8H6.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.5" cy="19.5" r="1.6" fill="currentColor"/><circle cx="17" cy="19.5" r="1.6" fill="currentColor"/>',
  bakery: '<path d="M4 13.5C4 9.4 7.6 6.5 12 6.5s8 2.9 8 7V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 10v3.5M12 9.5v4M15 10v3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  pharmacy: '<path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z" fill="currentColor"/>',
  fuel: '<path d="M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M3.5 20h12M14 9h2a1.8 1.8 0 0 1 1.8 1.8v5a1.5 1.5 0 0 0 3 0V8.2L18 5.5M7 8h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
};
// Extra map-only icons for the most common kinds of place, so a dot says what it is without opening it.
const DOT_ICONS = {
  cafe: '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5v2.5M12 3.5v2.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  clothes: '<path d="M8.5 4 4 6.5l1.8 4 2.2-1V20h8V9.5l2.2 1 1.8-4L15.5 4a3.5 3.5 0 0 1-7 0z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M11 17.5h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  flower: '<circle cx="12" cy="9" r="2.2" fill="currentColor"/><path d="M12 4.2a2.4 2.4 0 0 1 0 2.6M12 11.3V21M12 17c-2-2.2-4.5-2.5-6-2 1 2.3 3.5 3 6 2zM12 15.5c2-2 4.3-2.2 6-1.7-1 2.2-3.5 2.8-6 1.7M8 6.5a2.4 2.4 0 0 1 2 1.3M16 6.5a2.4 2.4 0 0 0-2 1.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  hair: '<circle cx="6.5" cy="17.5" r="2.8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="17.5" r="2.8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 15.5 18 3.5M15.5 15.5 6 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  beauty: '<path d="M12 3.5l1.8 5 5.2.2-4.1 3.2 1.4 5L12 14l-4.3 2.9 1.4-5L5 8.7l5.2-.2z" fill="currentColor"/><path d="M18.5 15.5v4M16.5 17.5h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  money: '<path d="M12 3v18M16.5 7.5c-.7-1.5-2.4-2.3-4.5-2.3-2.6 0-4.3 1.3-4.3 3.2 0 4.3 9 2.3 9 6.8 0 2-1.9 3.4-4.7 3.4-2.3 0-4-.9-4.8-2.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
};
const DOT_KIND = { cafe: 'cafe', ice_cream: 'cafe', coffee: 'cafe', clothes: 'clothes', boutique: 'clothes', shoes: 'clothes', mobile_phone: 'phone', electronics: 'phone', computer: 'phone', florist: 'flower', garden_centre: 'flower', bureau_de_change: 'money', money_transfer: 'money', bank: 'money', hairdresser: 'hair', barber: 'hair', beauty: 'beauty', cosmetics: 'beauty', perfumery: 'beauty', massage: 'beauty', tattoo: 'beauty' };
// Badges: hours unknown = dark slate with a white icon; closed = pale grey with a grey icon, so it fades back
// and the coloured pins of what is open stand out.
const DOT_COL = { unknown: '#5f6d78', closed: '#d5dade' };
const kindOf = (it) => DOT_KIND[it.tags.amenity] || DOT_KIND[it.tags.shop] || it.cat;
const dotIcon = (it) => (it.st.k === 'closed' ? 'g-' : 'i-') + kindOf(it);
// Register white icons in the map style (drawn from the same SVG paths) for the symbol layer on top of the dots.
function addDotIcons(gm) {
  const all = { ...ICONS, ...DOT_ICONS };
  return Promise.all(Object.entries(all).map(([k, body]) => new Promise((res) => {
    const add = (pre, col) => new Promise((ok) => {
      const img = new Image(48, 48);
      img.onload = () => { try { if (!gm.hasImage(pre + k)) gm.addImage(pre + k, img, { pixelRatio: 2 }); } catch {} ok(); };
      img.onerror = () => ok();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" color="${col}">${body}</svg>`);
    });
    Promise.all([add('i-', '#fff'), add('g-', '#7b8791')]).then(res, res); // add() never rejects; resolve either way
  })));
}
const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k] || DOT_ICONS[k]}</svg>`;

// ---------- state & helpers ----------
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const S = {
  lang: store.get('lang') || (/^ru/i.test(navigator.language) ? 'ru' : /^en/i.test(navigator.language) ? 'en' : 'he'),  // иврит по умолчанию
  cat: 'all', me: null, selected: null, view: [], limits: { list: 60, unknown: 60, closed: 40 },
  notices: { loc: null, hebcal: [] }, loaded: false, error: false,
};
const $ = (s) => document.querySelector(s);
const t = (k, vars) => {
  let s = I18N[S.lang][k] ?? I18N.ru[k] ?? k;
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.replace('{' + a + '}', b);
  return s;
};
const ADD_HOURS_INPUT = '#addHoursText';
const ARIA_EXPANDED = 'aria-expanded';
const ADD_FORM_MIN = 130;   // px: add-shop panel title row + name field (+ padding), see trackKeyboard()
// --sheet-peek: how much of the bottom sheet covers the map on a phone (map buttons and popups keep clear of it).
const SHEET_PEEK = '--sheet-peek';
const setSheetPeek = (px) => document.documentElement.style.setProperty(SHEET_PEEK, px + 'px');
const setAriaLabel = (el, text) => el.setAttribute('aria-label', text);
// Fire-and-forget async work (redraws, background loads, click handlers): a failure is logged instead of
// surfacing as an unhandled promise rejection.
function background(promise) { Promise.resolve(promise).catch((e) => console.error('[background]', e)); }
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
  // Commas are normalised first (split/trim is linear), so the PH patterns need no \s* on both sides.
  return v.split(',').map((x) => x.trim()).join(',').replace(/\bPH,/g, '').replace(/,PH\b/g, '')
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
const isOpen = (k) => k === 'open' || k === 'open24' || k === 'soon' || k === 'ciopen';
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
    case 'ciopen': return t('ciConfirmedOpen', { m: ciAgo(st.ci.time) });
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
const EAT = new Set(['restaurant', 'fast_food', 'cafe', 'food_court', 'ice_cream']);
const FOOD = new Set(['supermarket', 'convenience', 'kiosk', 'grocery', 'greengrocer', 'deli', 'alcohol', 'butcher', 'seafood', 'health_food', 'confectionery', 'dairy', 'cheese', 'spices', 'nuts', 'coffee', 'tea', 'beverages', 'wine', 'frozen_food', 'food']);
const MONEY = new Set(['atm', 'bank', 'bureau_de_change', 'money_transfer']);
function categoryOf(tg) {
  if (MONEY.has(tg.amenity)) return 'atm';
  if (tg.amenity === 'fuel') return 'fuel';
  if (EAT.has(tg.amenity)) return 'eat';
  if (tg.amenity === 'pharmacy' || tg.shop === 'chemist') return 'pharmacy';
  if (tg.shop === 'bakery' || tg.shop === 'pastry') return 'bakery';
  if (!tg.shop || FOOD.has(tg.shop)) return 'food';
  return 'shop';
}
const typeKey = (tg) => (tg.amenity === 'fuel' || tg.amenity === 'pharmacy' || MONEY.has(tg.amenity) || EAT.has(tg.amenity) ? tg.amenity : tg.shop);
// Whose it is, readable for a tourist or a new immigrant: banks, ATM operators and fuel brands in their language.
const OWNERS = [
  [/פועלים|hapoalim/i, { he: 'בנק הפועלים', ru: 'Банк Апоалим', en: 'Bank Hapoalim' }],
  [/לאומי|leumi/i, { he: 'בנק לאומי', ru: 'Банк Леуми', en: 'Bank Leumi' }],
  [/דיסקונט|discount/i, { he: 'בנק דיסקונט', ru: 'Банк Дисконт', en: 'Discount Bank' }],
  [/מזרחי|mizrahi|tefahot/i, { he: 'מזרחי טפחות', ru: 'Мизрахи-Тфахот', en: 'Mizrahi Tefahot' }],
  [/בינלאומי|first international|fibi/i, { he: 'הבנק הבינלאומי', ru: 'Первый международный банк', en: 'First International Bank' }],
  [/ירושלים|jerusalem/i, { he: 'בנק ירושלים', ru: 'Банк Иерусалим', en: 'Bank of Jerusalem' }],
  [/מרכנתיל|mercantile/i, { he: 'מרכנתיל', ru: 'Меркантиль', en: 'Mercantile Bank' }],
  [/אוצר החייל|otsar|otzar/i, { he: 'אוצר החייל', ru: 'Оцар а-Хаяль', en: 'Otsar HaHayal' }],
  [/יהב|yahav/i, { he: 'בנק יהב', ru: 'Банк Яхав', en: 'Bank Yahav' }],
  [/מסד|massad/i, { he: 'בנק מסד', ru: 'Банк Масад', en: 'Bank Massad' }],
  [/כספונט|kaspont/i, { he: 'כספונט', ru: 'Каспонт', en: 'Kaspont' }, 'priv'],
  [/קרן התמר/i, { he: 'קרן התמר', ru: 'Керен а-Тамар', en: 'Keren HaTamar' }, 'priv'],
  [/triton|euronet|cardtronics|bitcoin/i, null, 'priv'],
  [/^פז$|^paz$|yellow|ילו/i, { he: 'פז', ru: 'Паз', en: 'Paz' }],
  [/סונול|sonol/i, { he: 'סונול', ru: 'Сонол', en: 'Sonol' }],
  [/דור אלון|dor alon|אלונית|alonit/i, { he: 'דור אלון', ru: 'Дор Алон', en: 'Dor Alon' }],
  [/^דלק$|^delek$/i, { he: 'דלק', ru: 'Делек', en: 'Delek' }],
  [/^טן$|^ten$/i, { he: 'טן', ru: 'Тен', en: 'Ten' }],
];
function ownerOf(tg) {
  const k = typeKey(tg);
  const raw = tg['brand:' + S.lang] || tg.brand || tg['operator:' + S.lang] || tg.operator || tg.network ||
    (k === 'atm' && tg.name && !/^(כספומט|atm|банкомат)$/i.test(tg.name.trim()) ? tg.name : '');
  if (!raw) return null;
  for (const [re, names, flag] of OWNERS) if (re.test(raw)) return { name: names ? names[S.lang] || names.en : raw, priv: flag === 'priv' };
  return { name: raw, priv: false };
}
// Cuisine in plain words; unknown values are shown as they are.
const CUISINE = {
  ru: { pizza: 'пицца', burger: 'бургеры', falafel: 'фалафель', shawarma: 'шаурма', kebab: 'кебаб', sushi: 'суши', coffee_shop: 'кофе', italian: 'итальянская', asian: 'азиатская', chinese: 'китайская', japanese: 'японская', thai: 'тайская', indian: 'индийская', mexican: 'мексиканская', middle_eastern: 'ближневосточная', israeli: 'израильская', hummus: 'хумус', sandwich: 'сэндвичи', chicken: 'курица', bagel: 'бейглы', breakfast: 'завтраки', steak_house: 'стейки', grill: 'гриль', fish: 'рыба', seafood: 'морепродукты', vegan: 'веганская', vegetarian: 'вегетарианская', ice_cream: 'мороженое', dessert: 'десерты', bakery: 'выпечка', noodle: 'лапша', georgian: 'грузинская', russian: 'русская', ethiopian: 'эфиопская', yemeni: 'йеменская', moroccan: 'марокканская', arab: 'арабская', french: 'французская', american: 'американская', meat: 'мясо', dairy: 'молочная', juice: 'соки' },
  he: { pizza: 'פיצה', burger: 'המבורגר', falafel: 'פלאפל', shawarma: 'שווארמה', kebab: 'קבב', sushi: 'סושי', coffee_shop: 'קפה', italian: 'איטלקי', asian: 'אסייתי', chinese: 'סיני', japanese: 'יפני', thai: 'תאילנדי', indian: 'הודי', mexican: 'מקסיקני', middle_eastern: 'מזרחי', israeli: 'ישראלי', hummus: 'חומוס', sandwich: 'כריכים', chicken: 'עוף', bagel: 'בייגל', breakfast: 'ארוחות בוקר', steak_house: 'סטייקיה', grill: 'גריל', fish: 'דגים', seafood: 'פירות ים', vegan: 'טבעוני', vegetarian: 'צמחוני', ice_cream: 'גלידה', dessert: 'קינוחים', bakery: 'מאפים', noodle: 'נודלס', georgian: 'גאורגי', russian: 'רוסי', ethiopian: 'אתיופי', yemeni: 'תימני', moroccan: 'מרוקאי', arab: 'ערבי', french: 'צרפתי', american: 'אמריקאי', meat: 'בשרי', dairy: 'חלבי', juice: 'מיצים' },
  en: { coffee_shop: 'coffee', middle_eastern: 'Middle Eastern', steak_house: 'steakhouse' },
};
const cuisineText = (tg) => (tg.cuisine || '').split(/[;,]/).map((c) => c.trim()).filter(Boolean).slice(0, 3)
  .map((c) => CUISINE[S.lang][c] || c.replaceAll('_', ' ')).join(', ');
const nameOf = (it) => it.tags['name:' + S.lang] || it.tags['brand:' + S.lang] || it.tags.name || it.tags.brand || ownerOf(it.tags)?.name || I18N[S.lang].types[typeKey(it.tags)] || '';
function distM(aLat, aLon, bLat, bLon) {
  const R = 6371e3, r = Math.PI / 180;
  const dLat = (bLat - aLat) * r, dLon = (bLon - aLon) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const fmtDist = (m) => (m < 1000 ? Math.round(m / 10) * 10 + ' ' + t('m') : (m / 1000).toFixed(1).replace('.0', '') + ' ' + t('km'));
let ALL = [];
// Places come in tiles of 1/4 degree (~10 km); the app fetches only the tiles around what the map shows.
const TILES = { size: 10, have: new Set(), loading: new Map(), list: null, ver: '' };
async function loadAll() {
  const r = await fetch('data/tiles/index.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  TILES.size = j.size; TILES.list = j.tiles; TILES.ver = j.updated;
  ALL = [];
  await ensureTiles(map.getBounds().pad(0.3));
}
function ensureTiles(b) {
  if (!TILES.list || map.getZoom() < 9) return Promise.resolve(false);
  const k = TILES.size, jobs = [];
  for (let y = Math.floor(b.getSouth() * k); y <= Math.floor(b.getNorth() * k); y++)
    for (let x = Math.floor(b.getWest() * k); x <= Math.floor(b.getEast() * k); x++) {
      const key = y + '_' + x;
      if (!TILES.list[key] || TILES.have.has(key)) continue;
      if (!TILES.loading.has(key)) TILES.loading.set(key, fetch(`data/tiles/${key}.json?v=${encodeURIComponent(TILES.ver)}`).then((r) => r.json()).then((arr) => {
        for (const [id, lat, lon, tags] of arr) ALL.push({ id, lat, lon, tags, cat: categoryOf(tags) });
        TILES.have.add(key);
      }).catch(() => {}).finally(() => TILES.loading.delete(key)));
      jobs.push(TILES.loading.get(key));
    }
  return jobs.length ? Promise.all(jobs).then(() => true) : Promise.resolve(false);
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

// ---------- brands: a small round badge in the brand's colours on pins and cards, like map apps do ----------
const BRANDS = [
  [/שופרסל|shufersal/i, 'שופרסל', '#e2231a', '#fff'], [/רמי לוי|rami ?levy/i, 'רמי לוי', '#ffffff', '#e2001a'],
  [/ויקטורי|victory/i, 'VICTORY', '#e30613', '#fff'], [/אושר עד|osher ?ad/i, 'אושר עד', '#ffc20e', '#1b3c87'],
  [/יוחננוף|yochananof|yohananof/i, 'יוחננוף', '#e4002b', '#fff'], [/חצי חינם|hatzi ?hinam/i, 'חצי חינם', '#f39200', '#fff'],
  [/טיב טעם|tiv ?taam/i, 'טיב טעם', '#d0021b', '#fff'], [/מגה|mega/i, 'MEGA', '#e30613', '#fff'],
  [/am:?pm/i, 'am:pm', '#111111', '#ff7a00'], [/קרפור|carrefour/i, 'C', '#0055a4', '#fff'], [/יינות ביתן|yeinot/i, 'ביתן', '#7a1f2b', '#fff'],
  [/סופר.?פארם|super.?pharm/i, 'SUPER PHARM', '#003da5', '#fff'], [/be\b|בי פארם/i, 'BE', '#00a19a', '#fff'], [/גוד ?פארם|good ?pharm/i, 'GOOD', '#ec008c', '#fff'],
  [/(?:^yellow)|ילו/i, 'yellow', '#ffd200', '#1a1a1a'], [/^פז$|^paz\b/i, 'פז', '#ffd100', '#0033a0'], [/סונול|sonol/i, 'sonol', '#ffcc00', '#d6001c'],
  [/דור אלון|dor ?alon|אלונית|alonit/i, 'אלון', '#0072bc', '#fff'], [/^דלק|^delek/i, 'דלק', '#e31e24', '#fff'], [/^טן$|^ten\b/i, 'TEN', '#e4002b', '#fff'],
  [/פועלים|hapoalim/i, 'פועלים', '#e30613', '#fff'], [/לאומי|leumi/i, 'לאומי', '#003f87', '#fff'], [/דיסקונט|discount/i, 'דיסקונט', '#00843d', '#fff'],
  [/מזרחי|mizrahi/i, 'מזרחי', '#f58220', '#fff'], [/בינלאומי|first international|fibi/i, 'הבינ"ל', '#0c3c78', '#fff'],
  [/מקדונלד|mcdonald/i, 'M', '#da291c', '#ffc72c'], [/בורגר קינג|burger king/i, 'BK', '#d62300', '#f5ebdc'], [/ארומה|aroma/i, 'aroma', '#c8102e', '#fff'],
  [/קופיקס|cofix/i, 'cofix', '#e6007e', '#fff'], [/דומינו|domino/i, 'D', '#006491', '#fff'], [/פיצה האט|pizza hut/i, 'PH', '#c8102e', '#fff'],
  [/גרג|greg/i, 'greg', '#6d2c1e', '#fff'], [/לנדוור|landwer/i, 'L', '#1d1d1b', '#fff'], [/kfc/i, 'KFC', '#a3080c', '#fff'],
];
function brandOf(tg) {
  const hay = [tg.brand, tg['brand:en'], tg.operator, tg.name, tg['name:en']].filter(Boolean).join(' | ');
  if (!hay) return null;
  for (const [re, txt, bg, fg] of BRANDS) if (re.test(hay)) return { t: txt, bg, fg };
  return null;
}
const brandTile = (it) => { const b = brandOf(it.tags); return b ? `<span class="ico brand" style="background:${b.bg};color:${b.fg}">${esc(b.t)}</span>` : `<span class="ico c-${it.cat}">${svg(it.cat)}</span>`; };

// ---------- ad slots (empty for now: a house placeholder shows where ads will go) ----------
// To run a real ad, fill these: { title, sub, href, img } — they are labelled "Ad" and never cover the answer.
const ADS = { banner: null, card: null };
const adClosed = () => { try { return sessionStorage.getItem('adClosed') === '1'; } catch { return false; } };
function renderAdBanner() {
  const el = $('#adBanner'); if (!el) return;
  el.hidden = adClosed();
  const a = ADS.banner;
  el.innerHTML = `<span class="adtag">${esc(t('adLabel'))}</span>` +
    (a ? `<a href="${esc(a.href)}" target="_blank" rel="noopener sponsored">${esc(a.title)}</a>` : `<button type="button" class="adtext adopen" data-ad-open>${esc(t('adBanner'))}</button>`) +
    `<button type="button" class="adx" data-ad-close aria-label="${esc(t('adClose'))}">×</button>`;
}
function adCardHTML() {
  const a = ADS.card;
  return `<article class="pcard ad" data-ad-slot="card"><span class="adtag">${esc(t('adLabel'))}</span>
    <div class="pc-top"><span class="ico adico">★</span><div class="pc-name"><b>${esc(a ? a.title : t('adCardTitle'))}</b><small>${esc(a ? a.sub : t('adCardSub'))}</small></div></div>
    <div class="pc-bottom"><span></span>${a ? `<a class="gobtn" href="${esc(a.href)}" target="_blank" rel="noopener sponsored">${esc(t('go'))}</a>` : `<button type="button" class="gobtn" data-ad-open>${esc(t('adCta'))}</button>`}</div></article>`;
}
// "Advertise here": a short request form; requests land in the ad_requests table, readable only by the site owner.
function initAdForm() {
  const dlg = $('#adDlg'), f = $('#adForm'); if (!dlg || !f) return;
  const fill = () => {
    for (const el of dlg.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
    f.business.placeholder = t('adBizPh');
  };
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-ad-open]')) { fill(); $('#adMsgOut').textContent = ''; f.hidden = false; dlg.showModal(); track('ad-form', 'open'); }
    if (e.target.closest('[data-ad-cancel]')) dlg.close();
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = $('#adMsgOut'), btn = f.querySelector('[type=submit]');
    const row = { business: f.business.value.trim(), contact: f.contact.value.trim(), message: f.message.value.trim() || null, lang: S.lang };
    if (row.business.length < 2 || row.contact.length < 5) { out.textContent = t('adFormHint'); out.className = 'ad-out bad'; (row.business.length < 2 ? f.business : f.contact).focus(); return; }
    btn.disabled = true;
    try {
      await DB.adRequest(row);
      out.textContent = t('adSent'); out.className = 'ad-out ok'; f.reset(); f.hidden = true; track('ad-form', 'sent');
    } catch (err) {
      out.textContent = t(err.code === 'rate_limited' ? 'adLimit' : 'adFail'); out.className = 'ad-out bad';
    } finally { btn.disabled = false; }
  });
}
// Swipeable cards of open places (glance mode): name, status, walk time and one big "Go".
function cardsHTML(openL, now) {
  if (!openL.length) return `<article class="pcard none"><p>${esc(t('noneCard'))}</p><button type="button" class="ghost" data-zoomout>${esc(t('zoomOut'))}</button></article>`;
  const out = openL.slice(0, 12).map((it) => {
    const st = it.st, mins = Math.max(1, Math.round(it.d / 80));
    return `<article class="pcard${S.selected === it.id ? ' sel' : ''}" data-card="${esc(it.id)}">
      <div class="pc-top">${brandTile(it)}<div class="pc-name"><b>${esc(nameOf(it))}</b><small>${it.d < 2500 ? `<b>${esc(t('walk', { m: mins }))}</b> · ` : ''}${esc(fmtDist(it.d))}</small></div></div>
      <div class="pc-bottom"><span class="pill ${st.k}${st.doubt ? ' doubt' : ''}${st.oh && ['osm', 'est'].includes(trustOf(it)) ? ' approx' : ''}">${esc(statusText(st, now))}${st.doubt ? ' ?' : ''}</span>
      <button type="button" class="gobtn" data-walk="${esc(it.id)}">${esc(t('go'))}</button></div></article>`;
  });
  out.splice(Math.min(1, out.length), 0, adCardHTML());
  return out.join('');
}

// ---------- map ----------
let map, pinLayer, meMarker;
const CSSV = new Map();
const cssVar = (n) => { if (!CSSV.has(n)) CSSV.set(n, getComputedStyle(document.documentElement).getPropertyValue(n).trim()); return CSSV.get(n); };
const STATUS_VAR = { open: '--open', open24: '--open', soon: '--soon', closed: '--closed', unknown: '--unknown', ciopen: '--open' };
// Base map: OpenFreeMap vector style without shop/parking icons (free, no key, commercial use allowed), drawn by MapLibre,
// so the map can tilt into 3D like Google Maps (two-finger drag, or the 3D button).
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
// Hebrew and Arabic map labels: without this plugin MapLibre lays glyphs out left to right, so «קריית ים» reads «מי תיירק».
const RTL_PLUGIN = 'vendor/mapbox-gl-rtl-text.js';
function initRtlText() {
  try {
    maplibregl.setRTLTextPlugin(new URL(RTL_PLUGIN, document.baseURI).href, false)
      .catch((e) => console.error('RTL text plugin failed', e));
  } catch (e) { console.error('RTL text plugin failed', e); }
}
function initMap(center, zoom) {
  initRtlText();
  const touch = matchMedia('(pointer: coarse)').matches;
  map = new MK.Map('map', { center, zoom, touch, style: { version: 8, sources: {}, layers: [] } });
  // A popup needs map room on a phone: lower the list to its peek state first.
  // A map popup on a phone gets the whole map: the list (with its cards) slides away and comes back when it closes.
  map.onPopup = () => {
    if (wide()) { return; }
    if (sheet().dataset.state !== 'peek') { setSheet('peek'); }
    document.body.classList.add('mappop');
    setSheetPeek(0);
  };
  map.popupInset = () => {
    const sh = $('#sheet');
    // Floating things over the top of the map: the top bar and the "N open nearby / 3D" row under it.
    const top = Math.max(0, ...['.topbar', '#glance'].map((q) => { const el = $(q); const r = el && el.getBoundingClientRect(); return r && r.height ? r.bottom : 0; }));
    // The sheet may be mid-animation; use the height it is moving to (set by setSheet) on phones.
    const peek = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(SHEET_PEEK));
    // On a wide screen the list is a side panel, so nothing covers the bottom of the map.
    let bottom = 0;
    if (!wide() && !document.body.classList.contains('mappop')) { bottom = peek > 0 ? peek : Math.max(0, innerHeight - sh.getBoundingClientRect().top); }
    return { top, bottom };
  };
  map.gm.setStyle(STYLE_URL, { transformStyle: (_, next) => ({ ...next, layers: next.layers.filter((l) => l['source-layer'] !== 'poi') }) });
  map.styled = new Promise((res) => map.gm.on('style.load', () => { if (map.gm.getStyle().layers.length > 5) res(); }));
  map.styled.then(() => {
    addAppLayers();
    setGLNight(document.documentElement.classList.contains('night-map'));
    background(drawLights());
    if (S.loaded) refresh();
    if (SH.on) { background(drawShade()); }
  });
  pinLayer = MK.group().addTo(map);
  let timer;
  map.on('moveend', () => { clearTimeout(timer); timer = setTimeout(refresh, 120); });
  map.gm.on('pitchend', syncTiltBtn);
}
// Our own layers on the vector map: building shadows (under the buildings), small dots for places without hours or closed,
// walking-time rings, the walking route, street lamps and open-shop glows at night.
function addAppLayers() {
  const gm = map.gm;
  for (const id of ['shade', 'dots', 'rings', 'route', 'glows']) map.ensureSource(id);
  const firstBuilding = map.firstLayer((l) => l['source-layer'] === 'building');
  const firstLabel = map.firstLayer((l) => l.type === 'symbol');
  gm.addLayer({ id: 'shade', type: 'fill', source: 'shade', paint: { 'fill-color': '#142054', 'fill-opacity': 0.5, 'fill-antialias': true } }, firstBuilding || firstLabel);
  gm.addLayer({ id: 'rings-fill', type: 'fill', source: 'rings', filter: ['==', ['get', 'm'], 5], paint: { 'fill-color': '#2a7fff', 'fill-opacity': 0.05 } }, firstLabel);
  gm.addLayer({ id: 'rings-line', type: 'line', source: 'rings', paint: { 'line-color': '#2a7fff', 'line-opacity': 0.55, 'line-width': 1.5, 'line-dasharray': [3, 3] } }, firstLabel);
  gm.addLayer({ id: 'route-alt', type: 'line', source: 'route', filter: ['==', ['get', 'r'], 'alt'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#6b7780', 'line-opacity': 0.5, 'line-width': 5, 'line-dasharray': [0.5, 2] } });
  gm.addLayer({ id: 'route-case', type: 'line', source: 'route', filter: ['==', ['get', 'r'], 'main'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 10, 'line-opacity': 0.9 } });
  gm.addLayer({ id: 'route-main', type: 'line', source: 'route', filter: ['==', ['get', 'r'], 'main'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'c'], 'line-width': 6 } });
  gm.addLayer({ id: 'glows', type: 'circle', source: 'glows', paint: { 'circle-color': '#ffd68c', 'circle-blur': 1, 'circle-opacity': 0.55, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 10, 17, 34] } });
  gm.addLayer({ id: 'dots', type: 'circle', source: 'dots', layout: { 'circle-sort-key': ['-', 0, ['get', 's']] }, paint: {
    // small dots when zoomed out; from street level they grow into round badges with an icon of what the place is
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 12.5, 3.5, 13.8, 5, 14.6, ['case', ['==', ['get', 's'], 1], 7.5, 8.5], 16.5, ['case', ['==', ['get', 's'], 1], 10.5, 12]], 'circle-color': ['get', 'c'], 'circle-opacity': ['get', 'o'],
    'circle-stroke-color': ['case', ['==', ['get', 's'], 1], '#b9c1c7', '#ffffff'], 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 13.8, 1.5, 15, 2] } });
  gm.addLayer({ id: 'dot-icons', type: 'symbol', source: 'dots', minzoom: 14, layout: {
    'icon-image': ['get', 'k'], 'icon-size': ['interpolate', ['linear'], ['zoom'], 14, 0.45, 14.6, ['case', ['==', ['get', 's'], 1], 0.5, 0.58], 16.5, ['case', ['==', ['get', 's'], 1], 0.7, 0.8]], 'symbol-sort-key': ['-', 0, ['get', 's']],
    'icon-allow-overlap': true, 'icon-ignore-placement': true }, paint: { 'icon-opacity': ['get', 'o'] } });
  background(addDotIcons(gm));
  for (const ly of ['dots', 'dot-icons']) {
    gm.on('click', ly, (e) => { const f = e.features?.[0]; if (f) select(f.properties.id, true); });
    gm.on('mouseenter', ly, (e) => { gm.getCanvas().style.cursor = 'pointer'; gm.getCanvas().title = e.features?.[0]?.properties.n || ''; });
    gm.on('mouseleave', ly, () => { gm.getCanvas().style.cursor = ''; gm.getCanvas().title = ''; });
  }
  applyLayers();
}
const glReady = () => map && map.gm.getLayer && map.gm.getLayer('dots');
// 3D: tilt and turn the map a little so buildings stand up and their shadows read like the street you are in.
function toggleTilt() {
  const on = map.gm.getPitch() < 10;
  map.gm.easeTo({ pitch: on ? 60 : 0, bearing: on ? -17 : 0, duration: 900 });
  track('tilt', on ? '3d' : '2d');
}
function syncTiltBtn() {
  const b = $('#tiltBtn'); if (!b) return;
  const on = map.gm.getPitch() >= 10;
  b.setAttribute('aria-pressed', String(on));
  b.querySelector('span').textContent = on ? '2D' : '3D';
}
function pinIcon(it, sel) {
  const br = brandOf(it.tags);
  const inner = br ? `<span class="blogo" style="background:${br.bg};color:${br.fg}">${esc(br.t)}</span>` : svg(kindOf(it));
  return MK.divIcon({
    iconSize: [34, 40], iconAnchor: [17, 40],
    html: `<div class="pin${sel ? ' sel' : ''}${br ? ' branded' : ''}" style="--pc:${cssVar(STATUS_VAR[it.st.k])}">${inner}</div>`,
  });
}
const PINS = new Map(); // id -> { m: marker, key }
function drawMarkers(openL, unkL, closedL) {
  const want = new Map();
  for (const it of openL.slice(0, 250)) want.set(it.id, it);
  for (const [id, p] of PINS) if (!want.has(id)) { p.m.remove(); PINS.delete(id); }
  for (const it of want.values()) {
    const key = it.st.k + (it.id === S.selected ? '*' : '') + S.lang;
    const p = PINS.get(it.id);
    if (p) { if (p.key !== key) { p.m.setIcon(pinIcon(it, it.id === S.selected)); p.key = key; } continue; }
    const m = MK.marker([it.lat, it.lon], { icon: pinIcon(it, it.id === S.selected) });
    m.bindTooltip(nameOf(it)); m.on('click', () => select(it.id, true));
    if (LY.shops) m.addTo(map);
    PINS.set(it.id, { m, key });
  }
  if (!glReady()) return;
  const z = map.getZoom(), feats = [];
  if (z >= 14 && LY.shops) for (const it of [...unkL.slice(0, 400), ...closedL.slice(0, 300)])
    feats.push(MK.point(it.lat, it.lon, { id: it.id, n: nameOf(it), k: dotIcon(it), c: DOT_COL[it.st.k] || cssVar(STATUS_VAR[it.st.k]), o: it.st.k === 'closed' ? 0.85 : 0.95, s: it.st.k === 'closed' ? 1 : 0 }));
  map.setData('dots', feats);
}
let ringLabels = null;
function drawMe() {
  if (!S.me) return;
  if (meMarker) meMarker.setLatLng([S.me.lat, S.me.lon]);
  else meMarker = MK.marker([S.me.lat, S.me.lon], { icon: MK.divIcon({ html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false, zIndexOffset: 1000 }).addTo(map);
  drawRings();
}
// Walking-distance rings: 5 / 10 / 15 minutes at ~80 m per minute.
function drawRings() {
  if (ringLabels) ringLabels.remove();
  ringLabels = MK.group();
  const feats = [];
  if (S.me && LY.rings) for (const min of [5, 10, 15]) {
    const r = min * 80;
    feats.push(MK.poly(MK.circle(S.me.lat, S.me.lon, r), { m: min }));
    MK.marker([S.me.lat + r / 111320, S.me.lon], { icon: MK.divIcon({ html: `<span class="ring-label">${esc(t('ringMin', { m: min }))}</span>`, iconSize: [60, 20], iconAnchor: [30, 10] }), interactive: false }).addTo(ringLabels);
  }
  if (S.me && LY.rings) ringLabels.addTo(map);
  if (glReady()) map.setData('rings', feats);
}

// ---------- walking route ----------
const RT = { target: null, wantShade: false, seq: 0 };
function clearRoute() {
  if (glReady()) map.setData('route', []);
  RT.target = null;
  $('#routeBox').hidden = true;
}
async function showRoute(it) {
  RT.target = it;
  const seq = ++RT.seq;
  const from = S.me || { lat: map.getCenter().lat, lon: map.getCenter().lng };
  const box = $('#routeBox');
  box.hidden = false;
  $('#routeTitle').textContent = nameOf(it);
  $('#routeSub').textContent = '…';
  $('#shadeBtn').textContent = t('shadeBtn');
  $('#shadeBtn').setAttribute('aria-pressed', String(RT.wantShade));
  if (!wide() && sheet().dataset.state === 'full') setSheet('half');
  let res;
  try {
    // ?at=HH:MM simulates another time of day (for demos and testing shade at night).
    const atQ = new URLSearchParams(location.search).get('at');
    let at;
    if (atQ && /^\d{1,2}(:\d{2})?$/.test(atQ)) { at = new Date(); const [h, m] = atQ.split(':'); at.setHours(+h, +(m || 0), 0, 0); }
    if (!at && LY.shade && SH.time) at = SH.time;
    const p = Route.plan(from, { lat: it.lat, lon: it.lon }, { wantShade: RT.wantShade || LY.shade, at });
    // Draw the plain route quickly; shade (needs building data) may take a few seconds more.
    res = await p;
  } catch {
    if (seq === RT.seq) $('#routeSub').textContent = t('routeFail');
    return;
  }
  if (seq !== RT.seq) return;
  const ch = res.routes[res.chosen];
  const shady = res.shade != null;
  map.setData('route', [
    ...res.routes.filter((_, i) => i !== res.chosen).map((r) => MK.line(r.coords, { r: 'alt' })),
    MK.line(ch.coords, { r: 'main', c: shady ? '#2f9e5b' : cssVar('--brand') }),
  ]);
  const pad = wide() ? [[440, 120], [40, 40]] : [[30, 130], [30, Math.round(window.innerHeight * 0.45) + 20]];
  map.fitBounds(ch.coords, { paddingTopLeft: pad[0], paddingBottomRight: pad[1], maxZoom: 17 });

  const mins = Math.max(1, Math.round(ch.duration / 60));
  $('#routeTitle').textContent = `${nameOf(it)} · ${t('routeTitle', { m: mins, d: fmtDist(ch.distance) })}`;
  const sub = [];
  if (!S.me) sub.push(t('fromCenter'));
  if (shady) sub.push((res.hot && !RT.wantShade ? t('hotNote', { t: res.temp }) + ' · ' : '') + t('shadePct', { p: Math.round(res.shade * 100) }));
  else if ((RT.wantShade || res.hot) && !res.sunUp) sub.push(t('routeNoSun'));
  else if (res.shadeFailed) sub.push(t('shadeFail'));
  $('#routeSub').textContent = sub.join(' · ');
  track('route-inapp', `walk · ${it.cat}${shady ? ' · shade' : ''}`);
}

// ---------- sheet (phone) ----------
const sheet = () => $('#sheet');
const wide = () => matchMedia('(min-width: 860px)').matches;
function setSheet(state) {
  const el = sheet();
  el.dataset.state = state;
  if (wide()) { setSheetPeek(0); return; }
  const H = el.offsetHeight, vh = window.innerHeight;
  const peekH = (() => { const c = $('#cards'); if (!c || !c.offsetHeight) return 212; return Math.round(c.getBoundingClientRect().bottom - el.getBoundingClientRect().top + 10); })();
  const visible = state === 'full' ? H : state === 'half' ? Math.min(H, Math.round(vh * 0.55)) : Math.min(H, peekH);
  el.style.setProperty('--sheet-offset', H - visible + 'px');
  // Map buttons sit just above the sheet; only a full-height sheet caps them at mid-screen (they are behind it then).
  const peekPx = state === 'full' ? Math.min(visible, Math.round(vh * 0.5)) : visible;
  setSheetPeek(document.body.classList.contains('mappop') ? 0 : peekPx);
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
    drag.off0 = Number.parseFloat(getComputedStyle(el).getPropertyValue('--sheet-offset')) || 0;
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
    const visible = H - (Number.parseFloat(el.style.getPropertyValue('--sheet-offset')) || 0);
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
  document.querySelectorAll('[data-i18n-label]').forEach((el) => { setAriaLabel(el, t(el.dataset.i18nLabel)); });
  document.querySelectorAll('.langs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang)));
  $('#kicker').textContent = t('kicker');
  if ($('#accBtn')) $('#accBtn').title = t('acc');
  if (typeof applyTheme === 'function' && $('#themeBtn')?.textContent) applyTheme();
  $('#addOpen').textContent = t('addOpen');
  setAriaLabel($('#grab'), t('expand'));
  setAriaLabel($('#addFab'), t('addTitle')); $('#addFab').title = t('addTitle');
  $('#tiltBtn').title = t('tilt3d');
  $('#city').innerHTML = `<option value="">${esc(t('pickCity'))}</option>` + CITIES.map(([id, , , n]) => `<option value="${id}">${esc(n[S.lang])}</option>`).join('');
}
function renderNotices() {
  const arr = [...(S.notices.time ? [S.notices.time] : []), ...(S.notices.loc ? [S.notices.loc] : []), ...S.notices.hebcal];
  // On phones a notice shows one line; it is a button that expands to the full text.
  $('#notices').innerHTML = arr.map((n) => `<p class="notice ${n.cls}" role="button" tabindex="0" aria-expanded="false">${esc(n.text)}</p>`).join('');
}
function toggleNotice(e) {
  const n = e.target.closest('#notices .notice');
  if (!n || (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ')) { return; }
  e.preventDefault();
  n.classList.toggle('open');
  n.setAttribute(ARIA_EXPANDED, String(n.classList.contains('open')));
}
// "Fast food · falafel" / "ATM · Bank Leumi" / "Gas station · Paz": what the place is and whose, in one line.
function kindLine(it, type, name) {
  const tg = it.tags, own = ownerOf(tg), cui = cuisineText(tg);
  const parts = [type];
  if (cui) parts.push(cui);
  if (own && own.name && own.name !== name && !name.includes(own.name)) parts.push(own.name);
  const txt = parts.filter(Boolean).filter((x) => x !== name).join(' · ');
  return txt ? `<span class="kind">${esc(txt)}</span>` : '';
}
// Where the hours come from: the chain's own site (reliable), a visitor (recent), or OpenStreetMap (can be old).
function trustOf(it) {
  const src = it.tags['source:hours'];
  if (it.fixed || src === 'user') return 'user';
  if (src === 'estimate') return 'est';
  return src ? 'chain' : 'osm';
}
// Is the place really there? Independent sources that list it (OpenStreetMap, the chain's site, official registries,
// a visitor's check-in) and how fresh each one is.
function sourcesOf(it) {
  const list = (it.tags.src || (it.user ? 'user' : 'osm')).split(';').filter(Boolean).map((x) => {
    const [code, date] = x.split('@');
    return { code: code.split(':')[0], date: date || '' };
  });
  const ci = ciLatest(it.id);
  if (ci && ci.v === 'open' && !list.some((x) => x.code === 'user')) list.push({ code: 'user', date: new Date(ci.time * 1000).toISOString().slice(0, 10) });
  const seen = new Map();
  for (const x of list) if (!seen.has(x.code) || x.date > seen.get(x.code).date) seen.set(x.code, x);
  return [...seen.values()];
}
const fmtDate = (d) => { try { return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d)); } catch { return d; } };
function sourcesLine(it) {
  const srcs = sourcesOf(it), names = I18N[S.lang].srcNames;
  const txt = srcs.map((x) => names[x.code] + (x.date ? ' ' + t('srcAsOf', { d: fmtDate(x.date) }) : '')).join(' · ');
  if (srcs.length >= 2) return `<p class="vsrc ok">${esc(t('srcConfirmed', { s: txt }))}</p>`;
  const y = (srcs[0]?.date || '').slice(0, 4);
  const old = y && +y < new Date().getFullYear() - 2;
  return `<p class="vsrc one">${esc(t('srcSingle', { s: txt }))}${old ? `<br>${esc(t('srcOld', { y }))}` : ''}</p>`;
}
// A single, years-old source is worth a warning right in the list.
function staleYear(it) {
  const srcs = sourcesOf(it);
  if (srcs.length !== 1 || !srcs[0].date) return null;
  const y = +srcs[0].date.slice(0, 4);
  return y && y < new Date().getFullYear() - 3 ? y : null;
}
// When the slider is not at "now", say clearly which time the list is showing.
function renderTimeNote(at) {
  const old = S.notices.time;
  S.notices.time = SH.on && !SH.live && SH.time ? { cls: 'info', text: t('showingAt', { t: fmtTime(at) }) } : null;
  if ((old && old.text) !== (S.notices.time && S.notices.time.text)) renderNotices();
}
function shopHTML(it, now) {
  const tg = it.tags, st = it.st;
  const type = I18N[S.lang].types[typeKey(tg)] || '';
  const name = nameOf(it);
  const addr = [tg['addr:street'], tg['addr:housenumber']].filter(Boolean).join(' ');
  const tags = [];
  if (st.oh && st.k !== 'open24' && opensOnShabbat(it, st.oh, now)) tags.push(`<span class="tag shab">${esc(t('shabbat'))} ✓</span>`);
  if (it.user) tags.push(`<span class="tag user">${esc(t('userTag'))}</span>`);
  if (it.fixed) tags.push(`<span class="tag user">${esc(t('fixedTag'))}</span>`);
  if (tg.cash_in === 'yes') tags.push(`<span class="tag">${esc(t('atmDeposit'))}</span>`);
  if (tg.fee === 'yes') tags.push(`<span class="tag warn">${esc(t('feeYes'))}</span>`);
  else if (tg.fee === 'no' && typeKey(tg) === 'atm') tags.push(`<span class="tag">${esc(t('feeNo'))}</span>`);
  if (tg['atm:where'] === 'בתוך הסניף') tags.push(`<span class="tag">${esc(t('atmInside'))}</span>`);
  if (tg['atm:count']) tags.push(`<span class="tag">${esc(t('atmCount', { n: tg['atm:count'] }))}</span>`);
  if (tg['location:approx']) tags.push(`<span class="tag warn">${esc(t({ street: 'approxStreet', place: 'approxPlace' }[tg['location:approx']] || 'approxLoc', { a: [tg['addr:street'], tg['addr:city']].filter(Boolean).join(', ') }))}</span>`);
  const sy = staleYear(it);
  if (sy) tags.push(`<span class="tag warn">${esc(t('oldTag', { y: sy }))}</span>`);
  const own = ownerOf(tg);
  if (own && own.priv) tags.push(`<span class="tag warn">${esc(t('privAtm'))}</span>`);
  const kosher = tg['diet:kosher'] || tg.kosher;
  if (kosher && kosher !== 'no') tags.push(`<span class="tag">${esc(t('kosher'))}</span>`);
  if (tg.takeaway === 'yes' || tg.takeaway === 'only') tags.push(`<span class="tag">${esc(t('takeaway'))}</span>`);
  if (tg.delivery === 'yes') tags.push(`<span class="tag">${esc(t('delivery'))}</span>`);
  const ci = ciLatest(it.id);
  if (ci && st.k !== 'ciopen' && Date.now() / 1000 - ci.time < 3 * 3600)
    tags.push(ci.v === 'open' ? `<span class="tag ci-ok">${esc(t('ciOkTag', { m: ciAgo(ci.time) }))}</span>` : `<span class="tag ci-bad">${esc(t('ciBadTag', { m: ciAgo(ci.time) }))}</span>`);
  const more = [];
  if (S.selected === it.id) {
    if (st.oh && st.k !== 'open24') more.push(weekTable(st.oh, now));
    if (tg.opening_hours) more.push(`<p class="raw">${esc(tg.opening_hours)}</p><p class="src src-${trustOf(it)}">${esc(t({ chain: 'srcChain', user: 'srcUser', osm: 'srcOsm', est: 'srcEst' }[trustOf(it)]))}</p>`);
    more.push(sourcesLine(it));
    more.push(fixFormHTML(it));
    const acts = [
      `<button type="button" class="walk" data-walk="${esc(it.id)}">🚶 ${esc(t('walkBtn'))}</button>`,
      `<a href="https://www.google.com/maps/dir/?api=1&destination=${it.lat},${it.lon}" target="_blank" rel="noopener">${esc(t('route'))}</a>`,
      `<a href="https://waze.com/ul?ll=${it.lat},${it.lon}&navigate=yes" target="_blank" rel="noopener">${esc(t('waze'))}</a>`,
    ];
    const phone = tg.phone || tg['contact:phone'];
    if (phone) acts.push(`<a href="tel:${esc(phone.split(';')[0].replace(/\s/g, ''))}">${esc(t('call'))}</a>`);
    more.push(`<div class="ci-row"><span>${esc(t('ciAsk'))}</span><button type="button" class="ci-btn ok" data-ci="${esc(it.id)}" data-v="open">${esc(t('ciOpen'))}</button><button type="button" class="ci-btn bad" data-ci="${esc(it.id)}" data-v="closed">${esc(t('ciClosed'))}</button></div>`);
    if (PARK.on) more.push(`<p class="parkline" data-park-for="${esc(it.id)}">${parkLineHTML(it.id)}</p>`);
    more.push(`<div class="actions">${acts.join('')}</div>`);
  }
  const walk = it.d < 2500 ? `<b>${esc(t('walk', { m: Math.max(1, Math.round(it.d / 80)) }))}</b>` : '';
  return `<li class="shop${S.selected === it.id ? ' sel' : ''}" data-id="${esc(it.id)}" tabindex="0">
    ${brandTile(it)}
    <span class="name">${esc(name)}</span>
    <span class="dist">${walk}${fmtDist(it.d)}</span>
    <span class="meta"><span class="pill ${st.k}${st.doubt ? ' doubt' : ''}${st.oh && ['osm', 'est'].includes(trustOf(it)) ? ' approx' : ''}"${st.oh && ['osm', 'est'].includes(trustOf(it)) ? ` title="${esc(t(trustOf(it) === 'est' ? 'srcEst' : 'srcOsm'))}"` : ''}>${esc(statusText(st, now))}${st.doubt ? ' ?' : ''}</span>${st.doubt ? `<span class="tag ci-bad">${esc(t(st.doubt.v === 'closed' ? 'doubtClosed' : 'doubtOpen', { m: ciAgo(st.doubt.time) }))}</span>` : ''}${tags.join('')}${kindLine(it, type, name)}${addr ? `<span>${esc(addr)}</span>` : ''}</span>
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
  const now = sceneTime();
  const b = map.getBounds(), z = map.getZoom();
  const c = map.getCenter();
  const meIn = S.me && b.contains([S.me.lat, S.me.lon]);
  const ref = meIn ? S.me : { lat: c.lat, lon: c.lng };
  const pad = b.pad(0.05);
  background(ensureTiles(b.pad(0.3)).then((got) => { if (got) refreshSoon(); }));
  const inView = z >= 10 ? ALL.concat(USER_SHOPS).filter((s) => pad.contains([s.lat, s.lon])) : [];
  if (z >= 13) { background(loadUserShops(b)); }
  for (const it of inView) {
    const fx = FIX.get(it.id);
    if (fx && it.tags.opening_hours !== fx.oh) { it.tags = { ...it.tags, opening_hours: fx.oh }; it.fixed = true; }
    it.st = statusOf(it, now); it.d = distM(ref.lat, ref.lon, it.lat, it.lon);
    const ci = ciLatest(it.id);
    if (ci && ci.v === 'open' && it.st.k === 'unknown' && Date.now() / 1000 - ci.time < 3600) it.st = { k: 'ciopen', ci };
    // A visitor in the last 2 hours said the opposite of the hours: show it as doubtful, never hide it.
    else if (ci && SH.live !== false && Date.now() / 1000 - ci.time < 7200 && it.st.k !== 'unknown' && (ci.v === 'closed') === isOpen(it.st.k)) it.st.doubt = ci;
  }
  if (z >= 13) { background(loadCommunity(b)); }
  S.view = inView;
  history.replaceState(null, '', `#${c.lat.toFixed(5)},${c.lng.toFixed(5)},${Math.round(z * 10) / 10}`);
  store.set('lastView', JSON.stringify([c.lat, c.lng, z]));

  // category chips with open counts
  const openAll = inView.filter((it) => isOpen(it.st.k));
  const counts = { all: openAll.length, food: 0, eat: 0, shop: 0, bakery: 0, pharmacy: 0, fuel: 0, atm: 0 };
  for (const it of openAll) counts[it.cat]++;
  $('#cats').innerHTML = Object.entries(I18N[S.lang].cats).map(([k, v]) =>
    `<button type="button" class="chip" data-cat="${k}" aria-pressed="${k === S.cat}"><span class="ico c-${k}">${svg(k)}</span>${esc(v)} <span class="n">${counts[k]}</span></button>`).join('');

  const inCat = inView.filter((it) => S.cat === 'all' || it.cat === S.cat).sort((a, b) => a.d - b.d);
  const openL = inCat.filter((it) => isOpen(it.st.k));
  const unkL = inCat.filter((it) => it.st.k === 'unknown');
  const closedL = inCat.filter((it) => it.st.k === 'closed');

  $('#openCount').textContent = z >= 10 ? openL.length : '—';
  $('#gCount').textContent = z >= 10 ? openL.length : '—';
  $('#gText').textContent = `${t('openNear')} · ${I18N[S.lang].cats[S.cat]}`;
  $('#cards').innerHTML = z >= 10 && !S.error ? cardsHTML(openL, now) : '';
  renderAdBanner();
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
  drawShopGlows();
  renderTimeNote(now);
  $('#kicker').textContent = S.notices.time ? t('kickerAt', { t: fmtTime(now) }) : t('kicker');
}
function select(id, fromMap) {
  S.selected = S.selected === id && !fromMap ? null : id;
  const it = S.view.find((x) => x.id === id);
  if (fromMap && it) {
    if (it.st.k === 'unknown') $('#unknownBox').open = true;
    if (it.st.k === 'closed') $('#closedBox').open = true;
    if (!wide() && sheet().dataset.state === 'peek') {
      const card = document.querySelector(`[data-card="${CSS.escape(id)}"]`);
      if (card) { refresh(); document.querySelector(`[data-card="${CSS.escape(id)}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); return; }
      setSheet('half');
    }
  }
  refresh();
  if (S.selected && it && PARK.on) { background(fillParkLine(it)); }
  const el = document.querySelector(`.shop[data-id="${CSS.escape(id)}"]`);
  if (el && fromMap) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (!fromMap && S.selected && it && !map.getBounds().pad(-0.15).contains([it.lat, it.lon])) map.panTo([it.lat, it.lon]);
}

// ---------- location ----------
// Location. GPS (high accuracy) first; indoors an iPhone often cannot get a GPS fix in time, so on a timeout or
// "position unavailable" it asks once more for the network-based position, which is quick and good enough to find
// shops nearby. A refusal (code 1) gets its own message: the browser will not ask again by itself, so the user has
// to allow it in the settings, and on an iPhone that takes two switches.
const GEO_FAST = { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 };
const GEO_PRECISE = { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 };
function locate(isAuto) {
  const btn = $('#locate');
  if (!navigator.geolocation) { if (!isAuto) { showLocErr(); } return; }
  btn.setAttribute('aria-busy', 'true');
  const ok = (p) => {
    btn.removeAttribute('aria-busy'); btn.classList.add('on');
    S.me = { lat: p.coords.latitude, lon: p.coords.longitude };
    S.notices.loc = null; renderNotices(); drawMe();
    map.setView([S.me.lat, S.me.lon], Math.max(map.getZoom(), 16));
    background(loadHebcal(S.me.lat, S.me.lon));
  };
  const fail = (err) => {
    btn.removeAttribute('aria-busy');
    track('geo-error', String(err?.code));
    if (isAuto) { S.notices.loc = { cls: 'info', text: t('demo') }; renderNotices(); } else { showLocErr(err); }
  };
  navigator.geolocation.getCurrentPosition(ok, (err) => {
    if (err?.code === 1) { fail(err); return; }   // refused: retrying would fail the same way
    navigator.geolocation.getCurrentPosition(ok, fail, GEO_FAST);
  }, GEO_PRECISE);
}
function showLocErr(err) {
  let key = 'geoFail';
  if (err?.code === 1) { key = isIOS() ? 'geoDeniedIOS' : 'geoDenied'; }
  S.notices.loc = { cls: 'err', text: t(key) }; renderNotices();
  // Notices are hidden over the map (peek): bring the list up so the message is actually seen.
  if (wide()) { return; }
  // An open map popup slides the sheet away (mappop), which would hide the message too.
  if (document.body.classList.contains('mappop')) { map.closePopup(); document.body.classList.remove('mappop'); }
  setSheet(sheet().dataset.state === 'peek' ? 'half' : sheet().dataset.state);
}
// Ask for the location on start only when the user has already allowed it. Asking before any tap gets refused or
// dismissed easily, and Safari then remembers the refusal for the site, so a later tap on ➤ fails without asking.
async function autoLocate(restored) {
  let state = 'unknown';
  try { state = (await navigator.permissions.query({ name: 'geolocation' })).state; } catch { /* no Permissions API */ }
  if (state === 'granted') { locate(true); return; }
  // "Showing central Tel Aviv" is only true when the map did not reopen where the user left it.
  S.notices.loc = { cls: 'info', text: t(restored ? 'locTap' : 'demo') }; renderNotices();
}

// ---------- shops added by people ----------
// New shops go to our database (community.js). Shops added earlier as OpenStreetMap notes tagged #betachpatuach
// are still read, so nothing people already added disappears.
const NOTES_API = 'https://api.openstreetmap.org/api/0.6/notes';
const NOTE_TAG = '#betachpatuach';
let USER_SHOPS = [];
const noteTiles = new Map();
function noteToShop(f) {
  const text = f.properties.comments?.[0]?.text || '';
  if (!text.includes(NOTE_TAG)) return null;
  const tags = { 'source:hours': 'user' };
  const lines = text.split('\n').map((x) => x.trim()).filter(Boolean);
  tags.name = lines[0].slice(0, 60);
  for (const ln of lines) {
    const m = ln.match(/^(shop|amenity|opening_hours)=(.+)$/);
    if (m && m[2] !== '?') tags[m[1]] = m[2].slice(0, 120);
  }
  if (!tags.shop && !tags.amenity) tags.shop = 'convenience';
  const [lon, lat] = f.geometry.coordinates;
  return { id: 'note' + f.properties.id, lat, lon, tags, cat: categoryOf(tags), user: true };
}
async function loadUserShops(bounds) {
  // Notes are fetched per ~2 km tile, once per session.
  const T = 0.02;
  const keys = [];
  for (let la = Math.floor(bounds.getSouth() / T); la <= Math.floor(bounds.getNorth() / T); la++)
    for (let lo = Math.floor(bounds.getWest() / T); lo <= Math.floor(bounds.getEast() / T); lo++) keys.push([la, lo]);
  if (keys.length > 16) return;
  let added = false;
  await Promise.all(keys.map(async ([la, lo]) => {
    const k = la + ',' + lo;
    if (noteTiles.has(k)) return;
    noteTiles.set(k, 'loading');
    try {
      const r = await fetch(`${NOTES_API}.json?bbox=${(lo * T).toFixed(3)},${(la * T).toFixed(3)},${((lo + 1) * T).toFixed(3)},${((la + 1) * T).toFixed(3)}&closed=0&limit=100`);
      const j = await r.json();
      for (const f of j.features || []) {
        const s = noteToShop(f);
        if (s && !USER_SHOPS.some((x) => x.id === s.id)) { USER_SHOPS.push(s); added = true; }
      }
      noteTiles.set(k, 'ok');
    } catch { noteTiles.delete(k); }
  }));
  if (added) refresh();
}

const ADD = { on: false, pin: null, marker: null, hours: '24/7', cat: 'food' };
// Adding a shop on a phone: step 1 shows only the map with a fixed pin in the middle (the user moves the map under
// it, which is more precise than tapping), step 2 a compact form panel that sits above the keyboard with the pin
// still visible. Everything else (list, cards, ads, map buttons) is hidden while adding: body[data-add].
function addStart() {
  ADD.on = true; ADD.pin = null;
  map.closePopup();
  document.body.dataset.add = 'pick';
  $('#addBox').hidden = true; $('#addPick').hidden = false;
  $('#addPickHint').textContent = t('addHintPin');
  $('#addPickHere').textContent = t('addHere'); $('#addPickCancel').textContent = t('addCancel');
  // Start where the user is (a shop they want to add is usually around them), close enough to aim.
  const c = S.me ? { lat: S.me.lat, lng: S.me.lon } : map.getCenter();
  map.setView([c.lat, c.lng], Math.max(map.getZoom(), 17));
  track('add-start', 'add shop');
}
function addStop() {
  ADD.on = false; ADD.pin = null;
  if (ADD.marker) { ADD.marker.remove(); ADD.marker = null; }
  delete document.body.dataset.add;
  $('#addPick').hidden = true;
  $('#addBox').hidden = true; $('#addBox').reset();
  if (!wide()) { setSheet('peek'); }
}
// Keep the picked pin in the free part of the map: below the top bar, above the form panel.
function addFitPin() {
  if (!ADD.pin || $('#addBox').hidden) { return; }
  const p = map.latLngToContainerPoint([ADD.pin.lat, ADD.pin.lng]);
  const top = $('.topbar').getBoundingClientRect().bottom + 50, bottom = $('#addBox').getBoundingClientRect().top - 16;
  if (bottom <= top) { return; }
  if (p.y < top || p.y > bottom) { map.gm.panBy([0, p.y - (top + bottom) / 2], { duration: 250 }); }
}
function addPick(latlng) {
  ADD.pin = latlng;
  if (ADD.marker) { ADD.marker.setLatLng(latlng); }
  else {
    ADD.marker = MK.marker(latlng, { draggable: true, icon: MK.divIcon({ html: '<div class="add-pin drop"></div>', iconSize: [30, 36], iconAnchor: [15, 36] }) })
      .on('dragend', (e) => { ADD.pin = e.target.getLatLng(); }).addTo(map);
  }
  if (document.body.dataset.add === 'form') { return; }   // tapping the map again only moves the pin
  document.body.dataset.add = 'form';
  $('#addPick').hidden = true; $('#addBox').hidden = false;
  $('#addTitle').textContent = t('addTitle');
  $('#addHint').textContent = t('addHintForm');
  $('#addFields').hidden = false;
  const addName = $('#addName'), addHours = $(ADD_HOURS_INPUT);
  const nameHint = t('addName');
  addName.placeholder = nameHint; setAriaLabel(addName, nameHint);
  $('#addType').innerHTML = ['food', 'shop', 'eat', 'bakery', 'pharmacy', 'fuel', 'atm'].map((k) => `<option value="${k}"${k === ADD.cat ? ' selected' : ''}>${esc(I18N[S.lang].cats[k])}</option>`).join('');
  const opts = [['24/7', t('h247')], ['24/6', t('h246')], ['?', t('hUnknown')], ['other', t('addHoursOther')]];
  $('#addHours').innerHTML = opts.map(([v, l]) => `<button type="button" role="radio" data-h="${v}" aria-checked="${v === ADD.hours}">${esc(l)}</button>`).join('');
  addHours.placeholder = t('addHoursPh'); setAriaLabel(addHours, t('addHoursOther'));
  setAriaLabel($('#addType'), t('addTypeL'));
  addHours.hidden = ADD.hours !== 'other';
  $('#addSend').textContent = t('addSend'); $('#addCancel').textContent = t('addCancel'); $('#addNote').textContent = t('addNote');
  requestAnimationFrame(addFitPin);
  setTimeout(() => addName.focus(), 50);
}
async function addSubmit(e) {
  e.preventDefault();
  const name = $('#addName').value.trim();
  if (!name || !ADD.pin) return;
  // ADD.hours: '24/7', '24/6', '?' (unknown) or 'other' (typed in)
  let hours;
  if (ADD.hours === 'other') { hours = normalizeUserHours($(ADD_HOURS_INPUT).value); } else { hours = ADD.hours === '?' ? null : ADD.hours; }
  if (ADD.hours === 'other' && !hours) { $('#addNote').textContent = t('fixBad'); return; }
  const cat = $('#addType').value;
  const btn = $('#addSend'); btn.disabled = true;
  try {
    const row = await DB.addPlace({ lat: +ADD.pin.lat.toFixed(6), lon: +ADD.pin.lng.toFixed(6), name, cat, opening_hours: hours });
    USER_SHOPS.push(placeToShop(row));
    track('add-sent', `add · ${cat} · ${hours ? 'hours' : 'no hours'}`);
    addStop();
    S.notices.loc = { cls: 'info', text: t('addThanks', { n: name }) }; renderNotices();
    refresh();
  } catch (err) {
    $('#addNote').textContent = t(err.code === 'rate_limited' ? 'tooMany' : 'addFail');
  } finally { btn.disabled = false; }
}
const addGap = (avail, kb) => Math.max(0, Math.min(kb > 0 ? 150 : 200, avail - ADD_FORM_MIN));
// The on-screen keyboard shrinks the visual viewport: lift the form by that much and keep the pin in view.
function trackKeyboard() {
  const vv = window.visualViewport;
  if (!vv) { return; }
  const update = () => {
    const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    document.documentElement.style.setProperty('--kb', kb + 'px');
    // A strip of map stays above the form so the picked pin is visible: ~200px without the keyboard, ~150px with it
    // (top bar + pin). On a short screen (a phone in landscape) the form keeps at least ADD_FORM_MIN for its title
    // and the name field, and the map strip shrinks instead; the form scrolls within whatever it gets.
    document.documentElement.style.setProperty('--add-gap', addGap(vv.height, kb) + 'px');
    document.body.classList.toggle('kbopen', kb > 0);
    if (ADD.on) { requestAnimationFrame(addFitPin); }
  };
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  update();
}
function initAdd() {
  $('#addOpen').addEventListener('click', addStart);
  $('#addFab').addEventListener('click', addStart);
  $('#addPickHere').addEventListener('click', () => addPick(map.getCenter()));
  $('#addPickCancel').addEventListener('click', addStop);
  $('#addClose').addEventListener('click', addStop);
  $('#addCancel').addEventListener('click', addStop);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ADD.on) { addStop(); } });
  trackKeyboard();
  $('#addBox').addEventListener('submit', addSubmit);
  $('#addType').addEventListener('change', (e) => { ADD.cat = e.target.value; });
  $('#addHours').addEventListener('click', (e) => {
    const b = e.target.closest('[data-h]'); if (!b) return;
    ADD.hours = b.dataset.h;
    document.querySelectorAll('#addHours [data-h]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    $(ADD_HOURS_INPUT).hidden = ADD.hours !== 'other';
    if (ADD.hours === 'other') { $(ADD_HOURS_INPUT).focus(); }
  });
  map.on('click', (e) => { if (ADD.on && ADD.pin) { addPick(e.latlng); } });
}

// ---------- community data from the database: added shops, hours fixes, check-ins, parking reports ----------
const CI = new Map(), FIX = new Map(), comTiles = new Map(), CT = 0.05;
const toSec = (iso) => Date.parse(iso) / 1000;
const CAT_TAGS = { food: { shop: 'convenience' }, shop: { shop: 'yes' }, eat: { amenity: 'fast_food' }, bakery: { shop: 'bakery' }, pharmacy: { amenity: 'pharmacy' }, fuel: { amenity: 'fuel' }, atm: { amenity: 'atm' } };
function placeToShop(r) {
  const tags = { name: r.name, ...CAT_TAGS[r.cat], 'source:hours': 'user' };
  if (r.opening_hours) tags.opening_hours = r.opening_hours;
  if (r.phone) tags.phone = r.phone;
  return { id: 'p' + r.id, lat: r.lat, lon: r.lon, tags, cat: r.cat, user: true };
}
function ciPut(shopId, v, time, id) {
  const arr = CI.get(shopId) || [];
  if (!arr.some((y) => y.id === id)) arr.push({ id, v, time });
  arr.sort((a, b) => b.time - a.time);
  CI.set(shopId, arr.slice(0, 20));
}
function ciLatest(id) { const a = CI.get(id); return a && a[0]; }
function ciAgo(time) {
  const n = Math.round((Date.now() / 1000 - time) / 60);
  return n < 2 ? t('ciNow') : t('ciAgo', { n });
}
// Loads community data for the visible area, ~5 km tiles, each re-read at most every 2 minutes.
async function loadCommunity(bounds) {
  if (!window.DB) return false;
  const keys = [];
  for (let la = Math.floor(bounds.getSouth() / CT); la <= Math.floor(bounds.getNorth() / CT); la++)
    for (let lo = Math.floor(bounds.getWest() / CT); lo <= Math.floor(bounds.getEast() / CT); lo++) keys.push([la, lo]);
  if (keys.length > 9) return false;
  // Only tiles not read in the last 2 minutes, fetched together in one call.
  const stale = keys.filter(([la, lo]) => { const last = comTiles.get(la + ',' + lo); return !last || Date.now() - last > 120000; });
  if (!stale.length) return false;
  for (const [la, lo] of stale) comTiles.set(la + ',' + lo, Date.now());
  const las = stale.map((k) => k[0]), los = stale.map((k) => k[1]);
  try {
    const d = await DB.area([Math.min(...las) * CT, Math.min(...los) * CT, (Math.max(...las) + 1) * CT, (Math.max(...los) + 1) * CT]);
    for (const r of d.places) { const s = placeToShop(r); if (!USER_SHOPS.some((x) => x.id === s.id)) USER_SHOPS.push(s); }
    for (const r of d.fixes) { const cur = FIX.get(r.shop_id); if (!cur || toSec(r.created_at) > cur.time) FIX.set(r.shop_id, { oh: r.opening_hours, time: toSec(r.created_at) }); }
    for (const r of d.checkins) ciPut(r.shop_id, r.status, toSec(r.created_at), 'c' + r.id);
    for (const r of d.parking) pkPut(r.parking_id, r.status, toSec(r.created_at), 'k' + r.id);
    if (d.places.length || d.fixes.length || d.checkins.length || d.parking.length) refreshSoon();
    return true;
  } catch { for (const [la, lo] of stale) comTiles.delete(la + ',' + lo); return false; }
}
let refreshTimer = null;
function refreshSoon() { clearTimeout(refreshTimer); refreshTimer = setTimeout(refresh, 50); }
const notify = (text, cls = 'info') => { S.notices.loc = { cls, text }; renderNotices(); };
async function checkIn(id, v) {
  const it = S.view.find((x) => x.id === id);
  if (!it) return;
  if (!S.me) { notify(t('ciNeedLoc')); locate(false); return; }
  if (distM(S.me.lat, S.me.lon, it.lat, it.lon) > 300) { notify(t('ciFar')); return; }
  try {
    const r = await DB.checkin({ shop_id: id, lat: it.lat, lon: it.lon, status: v });
    ciPut(id, v, toSec(r.created_at), 'c' + r.id);
    track('checkin', `${v} · ${it.cat}`);
    notify(t('ciThanks'));
    refresh();
  } catch (err) { notify(t(err.code === 'too_soon' ? 'ciTooSoon' : err.code === 'rate_limited' ? 'tooMany' : 'addFail'), err.code ? 'info' : 'err'); }
}

// ---------- "Wrong hours? Fix them" ----------
// Accepts OSM syntax (Su-Th 07:00-23:00; Fr 07:00-14:00), 24/7, 24/6, or a plain daily range like 7:00-23:00.
function normalizeUserHours(raw) {
  const v = (raw || '').trim();
  if (!v) return null;
  if (v === '24/7' || v === '24/6') return v;
  const m = v.match(/^(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})$/);
  const val = m ? `Mo-Su ${m[1].padStart(2, '0')}:${m[2]}-${m[3].padStart(2, '0')}:${m[4]}` : v;
  return parseHours(val, 32, 35) ? val.slice(0, 200) : null;
}
async function submitFix(id, value) {
  const it = S.view.find((x) => x.id === id);
  const oh = normalizeUserHours(value);
  if (!it || !oh) { notify(t('fixBad'), 'err'); return; }
  try {
    const r = await DB.fixHours({ shop_id: id, lat: it.lat, lon: it.lon, opening_hours: oh });
    FIX.set(id, { oh, time: toSec(r.created_at) });
    track('hours-fix', it.cat);
    notify(t('fixThanks'));
    S.fixOpen = null;
    refresh();
  } catch (err) { notify(t(err.code === 'rate_limited' ? 'tooMany' : 'addFail'), 'err'); }
}
function fixFormHTML(it) {
  if (S.fixOpen !== it.id) return `<button type="button" class="fix-open" data-fix-open="${esc(it.id)}">✎ ${esc(t('fixOpen'))}</button>`;
  return `<div class="fix-form" data-fix-for="${esc(it.id)}">
    <p>${esc(t('fixTitle'))}</p>
    <div class="fix-quick"><button type="button" data-fix-quick="24/7">${esc(t('h247'))}</button><button type="button" data-fix-quick="24/6">${esc(t('h246'))}</button></div>
    <input type="text" id="fixInput" maxlength="200" placeholder="${esc(t('fixPh'))}" dir="ltr">
    <div class="fix-actions"><button type="button" class="walk" data-fix-send>${esc(t('fixSend'))}</button><button type="button" class="ghost" data-fix-cancel>${esc(t('addCancel'))}</button></div>
  </div>`;
}

// ---------- parking (car parks from the map tiles we already load for shade) ----------
const PARK = { on: false, layer: null, nearMarker: null, cache: new Map(), list: [], stale: false };
const pid = (p) => p.lat.toFixed(5) + ',' + p.lon.toFixed(5);

// Parking reports (database): a report counts for 90 minutes ("no parking here": 12 h).
const PK = new Map();
const PK_EMOJI = { free: '🟢', busy: '🟡', full: '🔴', gone: '⚫' };
function pkPut(parkId, v, time, id) {
  const arr = PK.get(parkId) || [];
  if (!arr.some((y) => y.id === id)) arr.push({ id, v, time });
  arr.sort((a, b) => b.time - a.time);
  PK.set(parkId, arr.slice(0, 10));
}
function pkLatest(id) {
  const r = (PK.get(id) || [])[0];
  if (!r) return null;
  const age = Date.now() / 1000 - r.time;
  return age < (r.v === 'gone' ? 12 * 3600 : 90 * 60) ? r : null;
}
function pkStatusText(r) { return `${PK_EMOJI[r.v]} ${t('pk_' + r.v)}, ${ciAgo(r.time)}`; }
// Parking payment apps. No public deep link opens a payment for a given lot, so we open the app's store
// page: Google Play / App Store show "Open" when the app is installed and "Install" when it is not.
const PAY_APPS = {
  pango: { play: 'com.unicell.pangoandroid', ios: '434818173' },
  cello: { play: 'air.com.cellogroup.Cellopark', ios: '499993633' },
};
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function payUrl(app) {
  const a = PAY_APPS[app];
  return isIOS() ? `https://apps.apple.com/il/app/id${a.ios}` : `https://play.google.com/store/apps/details?id=${a.play}`;
}
function pkPayHTML() {
  const link = (app) => `<a class="pk-pay-btn" href="${payUrl(app)}" target="_blank" rel="noopener" data-pay="${app}">${esc(t('pay_' + app))}</a>`;
  return `<div class="pk-pay"><p class="pk-ask">${esc(t('pkPay'))}</p>
    <div class="pk-btns">${Object.keys(PAY_APPS).map(link).join('')}</div>
    <p class="pk-pay-note">${esc(t('pkPayNote'))}</p></div>`;
}
function pkPopupHTML(p, reported = false) {
  const id = pid(p), r = pkLatest(id);
  const btn = (v) => `<button type="button" class="pk-btn pk-${v}" data-pk="${id}" data-v="${v}">${PK_EMOJI[v]} ${esc(t('pk_' + v))}</button>`;
  const head = `<div class="pk-pop"><b>${esc(p.name || t('pkTitle'))}</b>
    <p class="pk-now">${r ? esc(pkStatusText(r)) : esc(t('pkNoReports'))}</p>`;
  if (reported) return `${head}<p class="pk-thanks">${esc(t('pkThanksPay'))}</p>${pkPayHTML()}</div>`;
  return `${head}<p class="pk-ask">${esc(t('pkAsk'))}</p>
    <div class="pk-btns">${btn('free')}${btn('busy')}${btn('full')}${btn('gone')}</div>${pkPayHTML()}</div>`;
}
function pkIcon(p) {
  const r = pkLatest(pid(p));
  return MK.divIcon({ html: `<div class="p-pin${r ? ' pk-' + r.v : ''}">P</div>`, iconSize: [22, 22], iconAnchor: [11, 11] });
}
async function drawParking() {
  if (PARK.layer) { PARK.layer.remove(); PARK.layer = null; }
  if (!PARK.on) return;
  if (map.getZoom() < 14) { S.notices.loc = { cls: 'info', text: t('parkZoom') }; renderNotices(); return; }
  const b = map.getBounds().pad(0.1);
  const [list] = await Promise.all([
    Route.parkingIn([b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]),
    loadCommunity(b),
  ]);
  if (!PARK.on) return;
  if (PARK.layer) PARK.layer.remove();
  PARK.layer = MK.group().addTo(map);
  PARK.list = list;
  for (const p of list.slice(0, 300)) {
    MK.marker([p.lat, p.lon], { icon: pkIcon(p) })
      .bindPopup(() => pkPopupHTML(p), { maxWidth: 260 })
      .addTo(PARK.layer);
  }
}
async function pkReport(id, v) {
  const [lat, lon] = id.split(',').map(Number);
  if (!S.me) { notify(t('pkNeedLoc')); locate(false); return; }
  if (distM(S.me.lat, S.me.lon, lat, lon) > 500) { notify(t('pkFar')); return; }
  try {
    const r = await DB.parking({ parking_id: id, lat, lon, status: v });
    pkPut(id, v, toSec(r.created_at), 'k' + r.id);
    track('parking-report', v);
    notify(t('ciThanks'));
    map.closePopup();
    // Someone who just parked here is the one who may need to pay: reopen the lot with the payment apps.
    const lot = v !== 'gone' && (PARK.list || []).find((x) => pid(x) === id);
    if (lot) map.openPopupAt([lat, lon], pkPopupHTML(lot, true));
    background(drawParking());
    refresh();
  } catch (err) { notify(t(err.code === 'too_soon' ? 'ciTooSoon' : err.code === 'rate_limited' ? 'tooMany' : 'addFail'), err.code ? 'info' : 'err'); }
}
function parkLineHTML(itId) {
  const c = PARK.cache.get(itId);
  if (c === undefined) return '…';
  if (!c) return `<span class="pbadge">P</span> ${esc(t('parkNone'))}`;
  const r = pkLatest(pid(c.p));
  return `<span class="pbadge">P</span> ${esc(t('parkNear', { d: fmtDist(c.d) }))}${r ? ' · ' + esc(pkStatusText(r)) : ''} · <button type="button" data-park-go="${c.p.lat},${c.p.lon}">${esc(t('parkShow'))}</button>`;
}
async function fillParkLine(it) {
  if (!PARK.cache.has(it.id)) {
    const d = 0.006;
    const list = await Route.parkingIn([it.lat - d, it.lon - d * 1.2, it.lat + d, it.lon + d * 1.2]).catch(() => []);
    let best = null, bd = 500;
    for (const p of list) { const x = distM(it.lat, it.lon, p.lat, p.lon); if (x < bd) { bd = x; best = p; } }
    PARK.cache.set(it.id, best ? { p: best, d: bd } : null);
  }
  const el2 = document.querySelector(`[data-park-for="${CSS.escape(it.id)}"]`);
  if (el2) el2.innerHTML = parkLineHTML(it.id);
}
function showParkSpot(lat, lon) {
  if (PARK.nearMarker) PARK.nearMarker.remove();
  PARK.nearMarker = MK.marker([lat, lon], { icon: MK.divIcon({ html: '<div class="p-pin near">P</div>', iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(map);
  map.panTo([lat, lon]);
  track('parking-show', 'parking near shop');
}

// ---------- shade layer: building shadows for a chosen time of day ----------
// Shadow of each building = its footprint swept away from the sun by height / tan(sun altitude).
// Drawn opaque on an off-screen canvas, then shown at fixed opacity so overlapping shadows don't get darker.
const SH = { on: false, time: null, seq: 0, live: true, proj: null, projKey: null };
function shadeMinutes(d) { return d.getHours() * 60 + d.getMinutes(); }
function shadeSetTime(min) {
  const d = new Date(); d.setHours(Math.floor(min / 60), min % 60, 0, 0);
  SH.time = d;
  const l = $('#shadeTimeL');
  l.textContent = fmtTime(d);
  l.classList.toggle('live', SH.live);
  l.title = SH.live ? t('nowLabel') : '';
}
function shadeToggle(on) {
  SH.on = on;
  $('#shadeBar').hidden = !on;
  if (!on) { if (glReady()) map.setData('shade', []); return; }
  if (!SH.time) shadeNowClick(false);
  $('#shadeNow').textContent = t('shadeNow');
  background(drawShade());
}
// "Now" follows the real clock (updated every minute) until the person drags the slider.
function shadeNowClick(redraw = true) {
  SH.live = true;
  const min = shadeMinutes(new Date());
  $('#shadeTime').value = min; shadeSetTime(min);
  if (redraw) { background(drawShade()); applyTheme(); refreshSoon(); }
}
// Convex hull of a building and its copy moved along the shadow: one small polygon per building.
function hull(pts) {
  pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
async function drawShade() {
  if (!SH.on || !glReady()) return;
  const seq = ++SH.seq;
  const clearNote = () => { if (S.notices.loc && (S.notices.loc.text === t('shadeNight') || S.notices.loc.text === t('shadeZoom'))) { S.notices.loc = null; renderNotices(); } };
  if (map.getZoom() < 15) { map.setData('shade', []); S.notices.loc = { cls: 'info', text: t('shadeZoom') }; renderNotices(); return; }
  const c = map.getCenter();
  const sun = SunCalc.getPosition(SH.time || new Date(), c.lat, c.lng);
  if (sun.altitude <= 0.02) { map.setData('shade', []); S.notices.loc = { cls: 'info', text: t('shadeNight') }; renderNotices(); return; }
  // Footprints in local metres around the view centre, prepared once per view; the time only changes the offset.
  const b = map.getBounds().pad(0.2);
  const key = b.toBBoxString();
  if (SH.projKey !== key) {
    const blds = await Route.buildingsIn([b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]);
    if (seq !== SH.seq || !blds) return;
    const lat0 = c.lat, lon0 = c.lng, ky = 111320, kx = 111320 * Math.cos(lat0 * Math.PI / 180);
    SH.proj = { lat0, lon0, kx, ky, list: blds.map((bl) => ({ h: bl.h, pts: bl.poly.map(([la, lo]) => [(lo - lon0) * kx, (la - lat0) * ky]) })) };
    SH.projKey = key;
  }
  const { lat0, lon0, kx, ky, list } = SH.proj;
  const tanAlt = Math.tan(sun.altitude);
  const ux = Math.sin(sun.azimuth), uy = Math.cos(sun.azimuth); // SunCalc azimuth: 0 = south, + toward west; the shadow points away from the sun (east, north)
  const feats = [];
  for (const { h, pts } of list) {
    const len = Math.min(h / tanAlt, 160), dx = ux * len, dy = uy * len; // very low sun: cap the length so the map stays readable
    const hp = hull(pts.concat(pts.map(([x, y]) => [x + dx, y + dy])));
    const ring = hp.map(([x, y]) => [lon0 + x / kx, lat0 + y / ky]); ring.push(ring[0]);
    feats.push(MK.poly(ring));
  }
  map.setData('shade', feats);
  clearNote();
}
function initShade() {
  $('#shadeTime').addEventListener('input', (e) => {
    SH.live = false;
    shadeSetTime(+e.target.value);
    if (!SH.raf) SH.raf = requestAnimationFrame(() => { SH.raf = 0; background(drawShade()); applyTheme(); refreshSoon(); });
  });
  $('#shadeTime').addEventListener('change', () => { track('shade-time', fmtTime(SH.time)); if (RT.target) { background(showRoute(RT.target)); } });
  $('#shadeNow').addEventListener('click', () => { shadeNowClick(); if (RT.target) { background(showRoute(RT.target)); } });
  map.on('moveend', () => { if (SH.on) { background(drawShade()); } });
  setInterval(() => { if (SH.on && SH.live) shadeNowClick(); }, 60000);
}

// ---------- theme: auto (follows the device) / light / dark; dark also darkens the map ----------
const THEME_ICON = { auto: '◐', light: '☀', dark: '☾' };
let THEME = (() => { try { const v = localStorage.getItem('theme'); return v === 'light' || v === 'dark' ? v : 'auto'; } catch { return 'auto'; } })();
const darkMQ = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const root = document.documentElement;
  if (THEME === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', THEME);
  const dark = THEME === 'dark' || (THEME === 'auto' && sunIsDown()); // in auto the map follows the sun where it is, not the phone's dark mode
  CSSV.clear();
  const changed = root.classList.contains('night-map') !== dark;
  root.classList.toggle('night-map', dark);
  if (changed) setGLNight(dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a0f13' : '#0e141a');
  const b = $('#themeBtn');
  if (b) { b.textContent = THEME_ICON[THEME]; const label = t({ auto: 'themeAuto', light: 'themeLight', dark: 'themeDark' }[THEME]); b.title = label; b.setAttribute('aria-label', label); }
  if (changed || !applyTheme.done) { if (S.loaded) { refresh(); } background(drawLights()); } // marker colours come from CSS variables
  applyTheme.done = true;
}
// Real darkness where the map is: the sun more than 4 degrees below the horizon (end of civil twilight-ish).
// The time the map shows: the shade slider when someone moved it, otherwise now.
const sceneTime = () => (SH.on && !SH.live && SH.time ? SH.time : new Date());
function sunIsDown() {
  if (!map) return false;
  const c = map.getCenter();
  return SunCalc.getPosition(sceneTime(), c.lat, c.lng).altitude < -4 * Math.PI / 180;
}
function initTheme() {
  $('#themeBtn').addEventListener('click', () => {
    THEME = { auto: 'light', light: 'dark', dark: 'auto' }[THEME];
    try { localStorage.setItem('theme', THEME); } catch {}
    track('theme', THEME);
    applyTheme.done = false;
    applyTheme();
  });
  darkMQ.addEventListener?.('change', () => { if (THEME === 'auto') applyTheme(); });
  setInterval(() => { if (THEME === 'auto') applyTheme(); }, 5 * 60000); // dusk and dawn arrive on their own
  map.on('moveend', drawLights);
  applyTheme();
}

// ---------- night palette for the vector map ----------
const GLN = { saved: null };
function nightPaint(l) {
  const sl = l['source-layer'] || '', id = l.id;
  if (l.type === 'background') return { 'background-color': '#0e1726' };
  if (l.type === 'fill') {
    if (sl === 'water') return { 'fill-color': '#0b2542' };
    if (sl === 'building') return { 'fill-color': '#1e293b', 'fill-outline-color': '#2b3850' };
    if (sl === 'aeroway') return { 'fill-color': '#18212e' };
    return { 'fill-color': '#122029' };
  }
  if (l.type === 'fill-extrusion') return { 'fill-extrusion-color': '#243047' };
  if (l.type === 'line') {
    if (sl === 'waterway') return { 'line-color': '#14365c' };
    if (sl === 'boundary') return null;
    if (sl === 'transportation') {
      if (/casing/.test(id)) return { 'line-color': '#0a111c' };
      if (/rail|transit/.test(id)) return { 'line-color': '#3a4256' };
      if (/motorway|trunk|primary/.test(id)) return { 'line-color': '#5d6d8a' };
      return { 'line-color': '#3c4a62' };
    }
    return null;
  }
  if (l.type === 'symbol') {
    const house = sl === 'housenumber';
    return { 'text-color': house ? '#b9c6d8' : sl === 'water_name' ? '#7fb0e6' : '#eef3fa', 'text-halo-color': '#08101c', 'text-halo-width': house ? 1.2 : 1.6 };
  }
  return null;
}
function setGLNight(on) {
  const gm = map?.gm;
  if (!glReady()) return;
  if (!GLN.saved) GLN.saved = new Map();
  for (const l of gm.getStyle().layers) {
    const np = nightPaint(l); if (!np) continue;
    for (const [k, v] of Object.entries(np)) {
      const key = l.id + '|' + k;
      if (!GLN.saved.has(key)) GLN.saved.set(key, gm.getPaintProperty(l.id, k));
      try { gm.setPaintProperty(l.id, k, on ? v : GLN.saved.get(key)); } catch {}
    }
  }
}

// ---------- night lights: warm street lights along the road network + glowing open shops ----------
// Real street-lamp positions are not in the map data, so lights follow the streets at an even on-screen spacing.
const LT = { seq: 0, lampKey: null };
function glowSprite(r, rgb, core) {
  const c = document.createElement('canvas'); c.width = c.height = r * 2;
  const g = c.getContext('2d'), grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, `rgba(${rgb}, ${core})`); grad.addColorStop(0.18, `rgba(${rgb}, ${core * 0.55})`);
  grad.addColorStop(0.5, `rgba(${rgb}, ${core * 0.14})`); grad.addColorStop(1, `rgba(${rgb}, 0)`);
  g.fillStyle = grad; g.fillRect(0, 0, r * 2, r * 2);
  return c;
}
// Lamps every ~25-120 m along the streets (closer when zoomed in), drawn by the vector map below street names.
async function drawLamps(on, seq) {
  const gm = map?.gm;
  if (!glReady()) return;
  if (!gm.getSource('lamps')) {
    gm.addSource('lamps', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    const firstLabel = gm.getStyle().layers.find((l) => l.type === 'symbol')?.id;
    gm.addLayer({ id: 'lamps-glow', type: 'circle', source: 'lamps', paint: {
      'circle-color': '#ffc274', 'circle-blur': 1, 'circle-opacity': 0.6,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, ['case', ['get', 'm'], 3, 2], 16, ['case', ['get', 'm'], 9, 7], 19, 18] } }, firstLabel);
    gm.addLayer({ id: 'lamps-core', type: 'circle', source: 'lamps', minzoom: 14, paint: {
      'circle-color': '#fff6dc', 'circle-blur': 0.15, 'circle-opacity': 0.95,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 0.9, 16, 1.8, 19, 3.2] } }, firstLabel);
  }
  const src = gm.getSource('lamps');
  if (!on) { if (LT.lampKey) { src.setData({ type: 'FeatureCollection', features: [] }); LT.lampKey = null; } return; }
  const z = map.getZoom(), b = map.getBounds().pad(0.05);
  const key = Math.round(z) + '|' + b.toBBoxString();
  if (LT.lampKey === key) return;
  const roads = await Route.roadsIn([b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]);
  if (seq !== LT.seq || !roads) return;
  const gapM = z >= 16 ? 30 : z >= 15 ? 45 : z >= 14 ? 70 : 120; // real city lamps stand ~25-35 m apart
  const kx = Math.cos(map.getCenter().lat * Math.PI / 180);
  const feats = [];
  for (const r of roads) {
    if (!r.main && z < 14) continue;
    let carry = 0;
    for (let i = 1; i < r.pts.length && feats.length < 8000; i++) {
      const [la0, lo0] = r.pts[i - 1], [la1, lo1] = r.pts[i];
      const len = Math.hypot((la1 - la0) * 111320, (lo1 - lo0) * 111320 * kx);
      let d = gapM - carry;
      while (d <= len) { const f = d / len; feats.push({ type: 'Feature', properties: { m: !!r.main }, geometry: { type: 'Point', coordinates: [lo0 + (lo1 - lo0) * f, la0 + (la1 - la0) * f] } }); d += gapM; }
      carry = (carry + len) % gapM;
    }
  }
  src.setData({ type: 'FeatureCollection', features: feats });
  LT.lampKey = key;
}
async function drawLights() {
  if (!glReady()) return;
  const night = document.documentElement.classList.contains('night-map');
  const seq = ++LT.seq;
  await drawLamps(night && map.getZoom() >= 13, seq);
  drawShopGlows();
}
// Open shops glow at night: the night version of "here it's open".
function drawShopGlows() {
  if (!glReady()) return;
  const night = document.documentElement.classList.contains('night-map');
  map.setData('glows', night ? (S.view || []).filter((it) => isOpen(it.st?.k)).slice(0, 300).map((it) => MK.point(it.lat, it.lon)) : []);
}

// ---------- layers menu: what to draw on the map (remembered per device) ----------
const LY = Object.assign({ shops: true, parking: false, rings: true, shade: false }, (() => { try { return JSON.parse(store.get('layers') || '{}'); } catch { return {}; } })());
function applyLayers() {
  for (const p of PINS.values()) { if (LY.shops) p.m.addTo(map); else p.m.remove(); }
  if (glReady()) for (const ly of ['dots', 'dot-icons']) map.gm.setLayoutProperty(ly, 'visibility', LY.shops ? 'visible' : 'none');
  drawRings();
  PARK.on = LY.parking;
  if (!PARK.on && PARK.nearMarker) { PARK.nearMarker.remove(); PARK.nearMarker = null; }
  // The "thanks, pay here" popup is not part of the parking layer, so close it with the layer.
  if (!PARK.on && document.querySelector('.maplibregl-popup .pk-pop')) { map.closePopup(); }
  background(drawParking());
  shadeToggle(LY.shade);
  store.set('layers', JSON.stringify(LY));
}
function initLayers() {
  const pop = $('#layersPop'), btn = $('#layersBtn');
  const sync = () => { $('#lyShops').checked = LY.shops; $('#lyParking').checked = LY.parking; $('#lyRings').checked = LY.rings; $('#lyShade').checked = LY.shade; };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    pop.hidden = !pop.hidden; btn.setAttribute(ARIA_EXPANDED, String(!pop.hidden));
    // The menu opens upwards from the map buttons: on a phone, lower the list first so it fits under the top bar.
    if (!pop.hidden && !wide() && sheet().dataset.state !== 'peek') { setSheet('peek'); }
    $('#lpTitle').textContent = t('layers'); $('#lyShopsL').textContent = t('lyShops'); $('#lyParkingL').textContent = t('lyParking'); $('#lyRingsL').textContent = t('lyRings'); $('#lyShadeL').textContent = t('lyShade');
    sync();
  });
  for (const [id, k] of [['#lyShops', 'shops'], ['#lyParking', 'parking'], ['#lyRings', 'rings'], ['#lyShade', 'shade']]) {
    $(id).addEventListener('change', (e) => { LY[k] = e.target.checked; track('layer-' + k, LY[k] ? 'on' : 'off'); applyLayers(); refresh(); });
  }
  document.addEventListener('click', (e) => { if (!pop.hidden && !e.target.closest('#layersPop, #layersBtn')) { pop.hidden = true; btn.setAttribute(ARIA_EXPANDED, 'false'); } });
  applyLayers();
}

// ---------- optional account (email link) ----------
async function renderAccount() {
  const pop = $('#accPop'); if (!pop || pop.hidden) return;
  const me = window.DB ? await DB.me() : null;
  if (me && me.email && !me.anonymous) {
    pop.innerHTML = `<p class="acc-title">${esc(t('accIn', { e: me.email }))}</p><button type="button" class="ghost" id="accOut">${esc(t('accOut'))}</button>`;
    $('#accOut').onclick = async () => { try { await DB.signOut(); } catch (e) { console.error('sign-out failed', e); } await renderAccount(); };
  } else {
    pop.innerHTML = `<p class="acc-title">${esc(t('accTitle'))}</p><p class="acc-why">${esc(t('accWhy'))}</p>
      <form id="accForm"><input type="email" id="accEmail" required placeholder="${esc(t('accEmail'))}" autocomplete="email"><button type="submit" class="walk">${esc(t('accSend'))}</button></form><p class="acc-msg" id="accMsg" aria-live="polite"></p>`;
    $('#accForm').onsubmit = async (e) => {
      e.preventDefault();
      try { await DB.signInEmail($('#accEmail').value.trim()); $('#accMsg').textContent = t('accSent'); track('account', 'link sent'); }
      catch { $('#accMsg').textContent = t('addFail'); }
    };
  }
}
function initAccount() {
  const btn = $('#accBtn'), pop = $('#accPop');
  if (!btn || !window.DB) { if (btn) btn.hidden = true; return; }
  btn.textContent = '👤';
  btn.addEventListener('click', (e) => { e.stopPropagation(); pop.hidden = !pop.hidden; btn.setAttribute(ARIA_EXPANDED, String(!pop.hidden)); background(renderAccount()); });
  document.addEventListener('click', (e) => { if (!pop.hidden && !e.target.closest('#accPop, #accBtn')) { pop.hidden = true; btn.setAttribute(ARIA_EXPANDED, 'false'); } });
  DB.onChange(renderAccount);
}

// ---------- analytics (GoatCounter: cookie-free, no personal data) ----------
function track(path, title) {
  try { window.goatcounter?.count?.({ path, title, event: true }); } catch {}
}

// ---------- wire up ----------
async function init() {
  applyLang();
  const m = location.hash.match(/^#(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?))?$/);
  let last = null; try { last = JSON.parse(store.get('lastView') || 'null'); } catch {}
  const start = m ? [+m[1], +m[2], +(m[3] || 16)] : last || [32.0853, 34.7818, 15];
  initMap([start[0], start[1]], start[2]);
  initSheet();
  $('#list').innerHTML = '<li class="skeleton"></li><li class="skeleton"></li><li class="skeleton"></li>';

  $('#locate').addEventListener('click', () => { track('click-locate', 'near me'); locate(false); });
  $('#routeClose').addEventListener('click', clearRoute);
  $('#answerBtn').addEventListener('click', () => { setSheet(sheet().dataset.state === 'peek' ? 'half' : 'peek'); track('answer-bar', 'toggle list'); });
  $('#tiltBtn').addEventListener('click', toggleTilt);
  $('#cards').addEventListener('click', (e) => {
    const w = e.target.closest('[data-walk]');
    if (w) { const it = S.view.find((x) => x.id === w.dataset.walk); if (it) { track('card-go', it.cat); background(showRoute(it)); } return; }
    if (e.target.closest('[data-zoomout]')) { map.zoomOut(2); return; }
    if (e.target.closest('a')) { track('ad-click', 'card'); return; }
    const c = e.target.closest('[data-card]'); if (!c) return;
    S.selected = c.dataset.card; setSheet('half'); refresh();
    const it = S.view.find((x) => x.id === S.selected); if (it) map.panTo([it.lat, it.lon]);
    setTimeout(() => document.querySelector(`.shop[data-id="${CSS.escape(S.selected)}"]`)?.scrollIntoView({ block: 'nearest' }), 320);
  });
  initAdForm();
  document.addEventListener('click', (e) => { if (e.target.closest('[data-ad-close]')) { try { sessionStorage.setItem('adClosed', '1'); } catch {} renderAdBanner(); setSheet(sheet().dataset.state); } });
  initShade();
  initLayers();
  initTheme();
  initAccount();
  // While a parking popup is open the layer is not redrawn (that would close the popup, and fitting the popup
  // into view itself moves the map); the area it missed is redrawn once the popup closes.
  const parkPopupOpen = () => !!document.querySelector('.maplibregl-popup .pk-pop');
  map.on('moveend', () => {
    if (!PARK.on) { return; }
    if (parkPopupOpen()) { PARK.stale = true; } else { background(drawParking()); }
  });
  map.onPopupClose = () => setTimeout(() => {   // next tick: a popup that replaced this one is open by then
    if (document.querySelector('.maplibregl-popup')) { return; }
    if (document.body.classList.contains('mappop')) { document.body.classList.remove('mappop'); setSheet(sheet().dataset.state); }
    if (PARK.on && PARK.stale && !parkPopupOpen()) { PARK.stale = false; background(drawParking()); }
  }, 0);
  initAdd();
  $('#notices').addEventListener('click', toggleNotice);
  $('#notices').addEventListener('keydown', toggleNotice);
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pk]');
    if (b) { e.preventDefault(); background(pkReport(b.dataset.pk, b.dataset.v)); return; }
    const pay = e.target.closest('[data-pay]');
    if (pay) track('parking-pay', pay.dataset.pay);
  });
  $('#shadeBtn').addEventListener('click', () => {
    RT.wantShade = !RT.wantShade;
    if (RT.target) { background(showRoute(RT.target)); }
  });
  $('#city').addEventListener('change', (e) => {
    const c = CITIES.find((x) => x[0] === e.target.value);
    if (c) { map.setView([c[1], c[2]], 15); background(loadHebcal(c[1], c[2])); }
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
    const c = S.me || { lat: map.getCenter().lat, lon: map.getCenter().lng }; background(loadHebcal(c.lat, c.lon));
  });
  for (const id of ['#unknownBox', '#closedBox']) $(id).addEventListener('toggle', refresh);
  $('#scroller').addEventListener('click', (e) => {
    const a = e.target.closest('.actions a');
    if (a) {
      // Count "went to the shop" actions in GoatCounter (no personal data: only which button and chain category).
      const kind = a.href.includes('google.com/maps') ? 'route' : a.href.startsWith('tel:') ? 'call' : 'waze';
      const it = S.view.find((x) => x.id === S.selected);
      track(`click-${kind}`, `${kind} · ${it ? it.cat : ''}`);
    }
    if (e.target.closest('a')) return;
    const fo = e.target.closest('[data-fix-open]');
    if (fo) { S.fixOpen = fo.dataset.fixOpen; refresh(); setTimeout(() => $('#fixInput')?.focus(), 30); return; }
    if (e.target.closest('[data-fix-cancel]')) { S.fixOpen = null; refresh(); return; }
    const fq = e.target.closest('[data-fix-quick]');
    if (fq) { background(submitFix(fq.closest('[data-fix-for]').dataset.fixFor, fq.dataset.fixQuick)); return; }
    if (e.target.closest('[data-fix-send]')) { const f = e.target.closest('[data-fix-for]'); background(submitFix(f.dataset.fixFor, $('#fixInput').value)); return; }
    if (e.target.closest('.fix-form')) return;
    const cb = e.target.closest('[data-ci]');
    if (cb) { background(checkIn(cb.dataset.ci, cb.dataset.v)); return; }
    const pg = e.target.closest('[data-park-go]');
    if (pg) { const [la, lo] = pg.dataset.parkGo.split(',').map(Number); showParkSpot(la, lo); return; }
    const walk = e.target.closest('[data-walk]');
    if (walk) { const it = S.view.find((x) => x.id === walk.dataset.walk); if (it) { background(showRoute(it)); } return; }
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
  const c = map.getCenter(); background(loadHebcal(c.lat, c.lng));
  if (!m) { background(autoLocate(!!last)); }
}
background(init());
