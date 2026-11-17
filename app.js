/* בטח פתוח · Betcha it's open · Точно открыто. Map-first: everything in the visible map area, open places first.
   Data: data/shops.json (OpenStreetMap + official chain hours, refreshed daily) + Hebcal (Shabbat/holidays). */
'use strict';

// ---------- i18n ----------
const I18N = {
  ru: {
    title: 'בטח פתוח · Точно открыто', tagline: 'Точно открыто', pickCity: 'Город…', kicker: 'Сейчас открыто',
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
    layers: 'Что показывать', lyShops: '🛒 Магазины на карте', lyParking: '🅿 Парковки', lyRings: '⭕ Кольца «минут пешком»',
    pkTitle: 'Парковка', pk_free: 'есть места', pk_busy: 'почти полно', pk_full: 'мест нет', pk_gone: 'парковки нет', pkNoReports: 'Отметок пока нет.', pkAsk: 'Вы здесь? Как сейчас:', pkNeedLoc: 'Чтобы отметить парковку, включите геолокацию ➤', pkFar: 'Отметить парковку можно только рядом (до 500 м).',
    ciAsk: 'Вы здесь? Помогите другим:', ciOpen: '✓ Открыто', ciClosed: '✗ Закрыто', ciOkTag: '✓ подтвердили {m}', ciBadTag: '✗ сообщили: закрыто {m}', ciAgo: '{n} мин назад', ciNow: 'только что', ciThanks: 'Спасибо! Ваша отметка видна всем.', ciFar: 'Отметить можно только рядом с магазином (до 300 м). Подойдите ближе.', ciNeedLoc: 'Чтобы отметить, включите геолокацию ➤', ciTooSoon: 'Вы уже отмечали этот магазин недавно.', ciConfirmedOpen: 'Открыто · подтвердили {m}',
    parkNear: 'Парковка в {d}', parkNone: 'Парковок рядом на карте нет', parkShow: 'показать', parkOn: 'Парковки на карте', parkZoom: 'Приблизьте карту, чтобы увидеть парковки',
    addOpen: '+ Нет нужного магазина? Добавьте', addTitle: 'Добавить магазин', addHintPin: 'Нажмите на карте, где он находится. Можно подвинуть карту.', addHintForm: 'Точка выбрана. Заполните пару полей:', addName: 'Название (например, «Маколет у Моше»)', addHoursOther: 'Свои часы', addHoursPh: 'например: вс–чт 7:00–23:00, пт до 14:00', addSend: 'Добавить на карту', addCancel: 'Отмена', addNote: 'Магазин сразу появится на карте у всех с пометкой «добавлено пользователем» и уйдёт в OpenStreetMap как заметка для проверки.', addThanks: 'Спасибо! «{n}» теперь на карте.', addFail: 'Не удалось отправить. Проверьте интернет и попробуйте ещё раз.', h247: 'Круглосуточно', h246: '24/6 (кроме шаббата)', hUnknown: 'Не знаю', userTag: 'добавлено пользователем',
    walkBtn: 'Пешком', routeTitle: '{m} мин пешком · {d}', fromCenter: 'от центра карты — включите геолокацию ➤', shadeBtn: '☀ По тени', shadeCalc: 'Считаю тень…', shadePct: 'в тени ≈ {p}%', shadeFail: 'тень сейчас посчитать не удалось', shadeNight: 'солнца нет — тень не нужна', hotNote: 'жарко {t}° — выбран путь по тени', routeFail: 'Не удалось построить маршрут. Попробуйте ещё раз.', ringMin: '{m} мин',
  },
  he: {
    title: 'בטח פתוח', tagline: "Betcha it's open", pickCity: 'עיר…', kicker: 'פתוח עכשיו',
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
    layers: 'מה להציג', lyShops: '🛒 חנויות במפה', lyParking: '🅿 חניות', lyRings: '⭕ טבעות «דקות הליכה»',
    pkTitle: 'חניה', pk_free: 'יש מקום', pk_busy: 'כמעט מלא', pk_full: 'אין מקום', pk_gone: 'אין כאן חניה', pkNoReports: 'עדיין אין דיווחים.', pkAsk: 'אתם כאן? מה המצב:', pkNeedLoc: 'כדי לדווח על חניה, הפעילו מיקום ➤', pkFar: 'אפשר לדווח רק מקרוב (עד 500 מ׳).',
    ciAsk: 'אתם כאן? עזרו לאחרים:', ciOpen: '✓ פתוח', ciClosed: '✗ סגור', ciOkTag: '✓ אושר {m}', ciBadTag: '✗ דווח: סגור {m}', ciAgo: 'לפני {n} דק׳', ciNow: 'עכשיו', ciThanks: 'תודה! הסימון שלכם גלוי לכולם.', ciFar: 'אפשר לסמן רק ליד החנות (עד 300 מ׳). התקרבו.', ciNeedLoc: 'כדי לסמן, הפעילו מיקום ➤', ciTooSoon: 'כבר סימנתם את החנות הזו לא מזמן.', ciConfirmedOpen: 'פתוח · אושר {m}',
    parkNear: 'חניה במרחק {d}', parkNone: 'אין חניונים קרובים במפה', parkShow: 'להראות', parkOn: 'חניות במפה', parkZoom: 'הגדילו את המפה כדי לראות חניות',
    addOpen: '+ חסרה חנות? הוסיפו אותה', addTitle: 'הוספת חנות', addHintPin: 'הקישו על המפה במקום שבו היא נמצאת.', addHintForm: 'המקום נבחר. מלאו כמה פרטים:', addName: 'שם (למשל «המכולת של משה»)', addHoursOther: 'שעות אחרות', addHoursPh: 'למשל: א׳–ה׳ 7:00–23:00, ו׳ עד 14:00', addSend: 'הוספה למפה', addCancel: 'ביטול', addNote: 'החנות תופיע מיד במפה לכולם עם הסימון «נוסף על ידי משתמש» ותישלח ל-OpenStreetMap כהערה לבדיקה.', addThanks: 'תודה! «{n}» מופיעה עכשיו במפה.', addFail: 'השליחה נכשלה. בדקו את החיבור ונסו שוב.', h247: '24/7', h246: '24/6 (בלי שבת)', hUnknown: 'לא יודע/ת', userTag: 'נוסף על ידי משתמש',
    walkBtn: 'ברגל', routeTitle: '{m} דק׳ הליכה · {d}', fromCenter: 'ממרכז המפה — הפעילו מיקום ➤', shadeBtn: '☀ בצל', shadeCalc: 'מחשב צל…', shadePct: 'בצל ≈ {p}%', shadeFail: 'לא הצלחנו לחשב צל כרגע', shadeNight: 'אין שמש — אין צורך בצל', hotNote: 'חם {t}° — נבחר מסלול מוצל', routeFail: 'לא הצלחנו לבנות מסלול. נסו שוב.', ringMin: '{m} דק׳',
  },
  en: {
    title: "בטח פתוח · Betcha it's open", tagline: "Betcha it's open", pickCity: 'City…', kicker: 'Open right now',
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
    layers: 'Show on map', lyShops: '🛒 Shops on the map', lyParking: '🅿 Parking', lyRings: '⭕ Walking-time rings',
    pkTitle: 'Parking', pk_free: 'spaces free', pk_busy: 'almost full', pk_full: 'full', pk_gone: 'no parking here', pkNoReports: 'No reports yet.', pkAsk: 'Here now? How is it:', pkNeedLoc: 'Turn on location ➤ to report parking', pkFar: 'You can only report parking nearby (within 500 m).',
    ciAsk: 'Here now? Help others:', ciOpen: '✓ Open', ciClosed: '✗ Closed', ciOkTag: '✓ confirmed {m}', ciBadTag: '✗ reported closed {m}', ciAgo: '{n} min ago', ciNow: 'just now', ciThanks: 'Thanks! Everyone can see your check-in.', ciFar: 'You can only check in near the shop (within 300 m). Get a bit closer.', ciNeedLoc: 'Turn on location ➤ to check in', ciTooSoon: 'You checked in here recently.', ciConfirmedOpen: 'Open · confirmed {m}',
    parkNear: 'Parking {d} away', parkNone: 'No car parks nearby on the map', parkShow: 'show', parkOn: 'Parking on the map', parkZoom: 'Zoom in to see parking',
    addOpen: '+ Missing a shop? Add it', addTitle: 'Add a shop', addHintPin: 'Tap the map where it is. You can move the map.', addHintForm: 'Spot picked. Fill in a couple of fields:', addName: "Name (e.g. “Moshe's makolet”)", addHoursOther: 'Other hours', addHoursPh: 'e.g. Sun–Thu 7:00–23:00, Fri until 14:00', addSend: 'Add to the map', addCancel: 'Cancel', addNote: 'It shows on the map for everyone right away, marked “added by a user”, and goes to OpenStreetMap as a note for mappers to check.', addThanks: 'Thanks! “{n}” is on the map now.', addFail: "Couldn't send it. Check your connection and try again.", h247: 'Open 24/7', h246: '24/6 (closed Shabbat)', hUnknown: "Don't know", userTag: 'added by a user',
    walkBtn: 'Walk', routeTitle: '{m} min walk · {d}', fromCenter: 'from the map centre — turn on location ➤', shadeBtn: '☀ Shady way', shadeCalc: 'Working out shade…', shadePct: '≈ {p}% in shade', shadeFail: "couldn't work out shade right now", shadeNight: 'no sun — no shade needed', hotNote: 'hot {t}° — shady path chosen', routeFail: "Couldn't build a route. Try again.", ringMin: '{m} min',
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
const STATUS_VAR = { open: '--open', open24: '--open', soon: '--soon', closed: '--closed', unknown: '--unknown', ciopen: '--open' };
// Base map: OpenFreeMap vector style without shop/parking icons (free, no key, commercial use allowed).
// Falls back to OpenStreetMap raster tiles if WebGL or the style is unavailable.
async function addBaseMap() {
  try {
    if (!L.maplibreGL || !window.maplibregl) throw new Error('no maplibre');
    const style = await (await fetch('https://tiles.openfreemap.org/styles/liberty')).json();
    style.layers = style.layers.filter((l) => l['source-layer'] !== 'poi'); // no built-in shop / parking icons
    L.maplibreGL({ style, attribution: '© <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © OpenStreetMap' }).addTo(map);
  } catch {
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  }
}
function initMap(center, zoom) {
  const touch = matchMedia('(pointer: coarse)').matches;
  map = L.map('map', { zoomControl: !touch, preferCanvas: true, attributionControl: true }).setView(center, zoom);
  if (map.zoomControl) map.zoomControl.setPosition('topright');
  addBaseMap();
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
let ringLayer;
function drawMe() {
  if (!S.me) return;
  if (meMarker) meMarker.setLatLng([S.me.lat, S.me.lon]);
  else meMarker = L.marker([S.me.lat, S.me.lon], { icon: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false, zIndexOffset: 1000 }).addTo(map);
  // Walking-distance rings: 5 / 10 / 15 minutes at ~80 m per minute.
  if (ringLayer) ringLayer.remove();
  ringLayer = L.layerGroup();
  if (LY.rings) ringLayer.addTo(map);
  for (const min of [5, 10, 15]) {
    const r = min * 80;
    L.circle([S.me.lat, S.me.lon], { radius: r, color: '#2a7fff', weight: 1.5, opacity: 0.55, dashArray: '5 6', fill: min === 5, fillOpacity: 0.05, interactive: false }).addTo(ringLayer);
    const lat = S.me.lat + r / 111320;
    L.tooltip({ permanent: true, direction: 'center', className: 'ring-label', interactive: false }).setLatLng([lat, S.me.lon]).setContent(esc(t('ringMin', { m: min }))).addTo(ringLayer);
  }
}

// ---------- walking route ----------
let routeLayer = null;
const RT = { target: null, wantShade: false, seq: 0 };
function clearRoute() {
  if (routeLayer) routeLayer.remove();
  routeLayer = null; RT.target = null;
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
    const p = Route.plan(from, { lat: it.lat, lon: it.lon }, { wantShade: RT.wantShade, at });
    // Draw the plain route quickly; shade (needs building data) may take a few seconds more.
    res = await p;
  } catch {
    if (seq === RT.seq) $('#routeSub').textContent = t('routeFail');
    return;
  }
  if (seq !== RT.seq) return;
  if (routeLayer) routeLayer.remove();
  routeLayer = L.layerGroup().addTo(map);
  res.routes.forEach((r, i) => {
    if (i === res.chosen) return;
    L.polyline(r.coords, { color: cssVar('--unknown'), weight: 5, opacity: 0.45, dashArray: '2 8', lineCap: 'round' }).addTo(routeLayer);
  });
  const ch = res.routes[res.chosen];
  const shady = res.shade != null;
  L.polyline(ch.coords, { color: '#ffffff', weight: 10, opacity: 0.9, lineCap: 'round' }).addTo(routeLayer);
  L.polyline(ch.coords, { color: shady ? '#2f9e5b' : cssVar('--brand'), weight: 6, opacity: 1, lineCap: 'round' }).addTo(routeLayer);
  const pad = wide() ? [[440, 90], [40, 40]] : [[30, 90], [30, Math.round(window.innerHeight * 0.5) + 20]];
  map.fitBounds(L.latLngBounds(ch.coords), { paddingTopLeft: pad[0], paddingBottomRight: pad[1], maxZoom: 17 });

  const mins = Math.max(1, Math.round(ch.duration / 60));
  $('#routeTitle').textContent = `${nameOf(it)} · ${t('routeTitle', { m: mins, d: fmtDist(ch.distance) })}`;
  const sub = [];
  if (!S.me) sub.push(t('fromCenter'));
  if (shady) sub.push((res.hot && !RT.wantShade ? t('hotNote', { t: res.temp }) + ' · ' : '') + t('shadePct', { p: Math.round(res.shade * 100) }));
  else if ((RT.wantShade || res.hot) && !res.sunUp) sub.push(t('shadeNight'));
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
  $('#addOpen').textContent = t('addOpen');
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
  if (it.user) tags.push(`<span class="tag user">${esc(t('userTag'))}</span>`);
  const ci = ciLatest(it.id);
  if (ci && st.k !== 'ciopen' && Date.now() / 1000 - ci.time < 3 * 3600)
    tags.push(ci.v === 'open' ? `<span class="tag ci-ok">${esc(t('ciOkTag', { m: ciAgo(ci.time) }))}</span>` : `<span class="tag ci-bad">${esc(t('ciBadTag', { m: ciAgo(ci.time) }))}</span>`);
  const more = [];
  if (S.selected === it.id) {
    if (st.oh && st.k !== 'open24') more.push(weekTable(st.oh, now));
    if (tg.opening_hours) more.push(`<p class="raw">${esc(tg.opening_hours)}</p>`);
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
  const inView = z >= 10 ? ALL.concat(USER_SHOPS).filter((s) => pad.contains([s.lat, s.lon])) : [];
  if (z >= 13) loadUserShops(b);
  for (const it of inView) {
    it.st = statusOf(it, now); it.d = distM(ref.lat, ref.lon, it.lat, it.lon);
    const ci = ciLatest(it.id);
    if (ci && ci.v === 'open' && it.st.k === 'unknown' && Date.now() / 1000 - ci.time < 3600) it.st = { k: 'ciopen', ci };
  }
  if (z >= 13) loadCheckins(b);
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
  if (S.selected && it && PARK.on) fillParkLine(it);
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

// ---------- shops added by people (OpenStreetMap notes, no server of our own) ----------
// A report becomes a public OSM note tagged #betachpatuach. Everyone's app reads those notes for the visible
// area and shows them right away; OSM mappers can then add the shop to the map for good.
const NOTES_API = 'https://api.openstreetmap.org/api/0.6/notes';
const NOTE_TAG = '#betachpatuach';
const OSM_TYPE = { food: 'shop=convenience', bakery: 'shop=bakery', pharmacy: 'amenity=pharmacy', fuel: 'amenity=fuel' };
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
function addStart() {
  ADD.on = true; ADD.pin = null;
  $('#addBox').hidden = false; $('#addFields').hidden = true;
  $('#addTitle').textContent = t('addTitle'); $('#addHint').textContent = t('addHintPin');
  if (!wide()) setSheet('peek');
  track('add-start', 'add shop');
}
function addStop() {
  ADD.on = false; ADD.pin = null;
  if (ADD.marker) { ADD.marker.remove(); ADD.marker = null; }
  $('#addBox').hidden = true; $('#addBox').reset();
}
function addPick(latlng) {
  ADD.pin = latlng;
  if (ADD.marker) ADD.marker.setLatLng(latlng);
  else ADD.marker = L.marker(latlng, { draggable: true, icon: L.divIcon({ className: '', html: '<div class="add-pin"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }) })
    .on('dragend', (e) => { ADD.pin = e.target.getLatLng(); }).addTo(map);
  $('#addHint').textContent = t('addHintForm');
  $('#addFields').hidden = false;
  $('#addName').placeholder = t('addName');
  $('#addType').innerHTML = ['food', 'bakery', 'pharmacy', 'fuel'].map((k) => `<option value="${k}"${k === ADD.cat ? ' selected' : ''}>${esc(I18N[S.lang].cats[k])}</option>`).join('');
  const opts = [['24/7', t('h247')], ['24/6', t('h246')], ['?', t('hUnknown')], ['other', t('addHoursOther')]];
  $('#addHours').innerHTML = opts.map(([v, l]) => `<button type="button" role="radio" data-h="${v}" aria-checked="${v === ADD.hours}">${esc(l)}</button>`).join('');
  $('#addHoursText').placeholder = t('addHoursPh');
  $('#addHoursText').hidden = ADD.hours !== 'other';
  $('#addSend').textContent = t('addSend'); $('#addCancel').textContent = t('addCancel'); $('#addNote').textContent = t('addNote');
  if (!wide()) setSheet('half');
  setTimeout(() => $('#addName').focus(), 50);
}
async function addSubmit(e) {
  e.preventDefault();
  const name = $('#addName').value.trim();
  if (!name || !ADD.pin) return;
  const hours = ADD.hours === 'other' ? ($('#addHoursText').value.trim() || '?') : ADD.hours;
  const text = `${name}\n${OSM_TYPE[$('#addType').value]}\nopening_hours=${hours}\n\nShop reported by a user of בטח פתוח (betahopen.app). ${NOTE_TAG}`;
  const btn = $('#addSend'); btn.disabled = true;
  try {
    const body = new URLSearchParams({ lat: ADD.pin.lat.toFixed(6), lon: ADD.pin.lng.toFixed(6), text });
    const r = await fetch(`${NOTES_API}.json`, { method: 'POST', body });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const s = noteToShop(await r.json());
    if (s) USER_SHOPS.push(s);
    track('add-sent', `add · ${$('#addType').value} · ${hours === '?' ? 'no hours' : 'hours'}`);
    addStop();
    S.notices.loc = { cls: 'info', text: t('addThanks', { n: name }) }; renderNotices();
    refresh();
  } catch {
    $('#addNote').textContent = t('addFail');
  } finally { btn.disabled = false; }
}
function initAdd() {
  $('#addOpen').addEventListener('click', addStart);
  $('#addCancel').addEventListener('click', addStop);
  $('#addBox').addEventListener('submit', addSubmit);
  $('#addType').addEventListener('change', (e) => { ADD.cat = e.target.value; });
  $('#addHours').addEventListener('click', (e) => {
    const b = e.target.closest('[data-h]'); if (!b) return;
    ADD.hours = b.dataset.h;
    document.querySelectorAll('#addHours [data-h]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    $('#addHoursText').hidden = ADD.hours !== 'other';
    if (ADD.hours === 'other') $('#addHoursText').focus();
  });
  map.on('click', (e) => { if (ADD.on) addPick(e.latlng); });
}

// ---------- "it's open" check-ins (ntfy.sh public topics, kept 12 h; no personal data) ----------
// One topic per ~5 km tile. A message is {"s": shopId, "v": "open"|"closed"}; ntfy stamps the time.
const CI_T = 0.05, CI = new Map(), ciTiles = new Map();
const ciTopic = (lat, lon) => `betachpatuach-ci-${Math.floor(lat / CI_T)}-${Math.floor(lon / CI_T)}`;
function ciAdd(m) {
  try {
    const x = JSON.parse(m.message);
    if (!x || typeof x.s !== 'string' || (x.v !== 'open' && x.v !== 'closed')) return;
    const arr = CI.get(x.s) || [];
    if (!arr.some((y) => y.id === m.id)) arr.push({ id: m.id, v: x.v, time: m.time });
    arr.sort((a, b) => b.time - a.time);
    CI.set(x.s, arr.slice(0, 20));
  } catch {}
}
function ciLatest(id) { const a = CI.get(id); return a && a[0]; }
function ciAgo(time) {
  const n = Math.round((Date.now() / 1000 - time) / 60);
  return n < 2 ? t('ciNow') : t('ciAgo', { n });
}
async function loadCheckins(bounds) {
  const topics = new Set();
  for (let la = Math.floor(bounds.getSouth() / CI_T); la <= Math.floor(bounds.getNorth() / CI_T); la++)
    for (let lo = Math.floor(bounds.getWest() / CI_T); lo <= Math.floor(bounds.getEast() / CI_T); lo++) topics.add(`betachpatuach-ci-${la}-${lo}`);
  if (topics.size > 6) return;
  let got = false;
  await Promise.all([...topics].map(async (tp) => {
    const last = ciTiles.get(tp);
    if (last && Date.now() - last < 120000) return; // re-poll a tile at most every 2 minutes
    ciTiles.set(tp, Date.now());
    try {
      const txt = await (await fetch(`https://ntfy.sh/${tp}/json?poll=1&since=12h`)).text();
      for (const line of txt.split('\n')) {
        if (!line.trim()) continue;
        const m = JSON.parse(line);
        if (m.event === 'message') { ciAdd(m); got = true; }
      }
    } catch { ciTiles.delete(tp); }
  }));
  if (got) refreshSoon();
}
let refreshTimer = null;
function refreshSoon() { clearTimeout(refreshTimer); refreshTimer = setTimeout(refresh, 50); }
async function checkIn(id, v) {
  const it = S.view.find((x) => x.id === id);
  if (!it) return;
  const note = (text, cls = 'info') => { S.notices.loc = { cls, text }; renderNotices(); };
  if (!S.me) { note(t('ciNeedLoc')); locate(false); return; }
  if (distM(S.me.lat, S.me.lon, it.lat, it.lon) > 300) { note(t('ciFar')); return; }
  const key = 'ci:' + id;
  const lastMine = Number(store.get(key) || 0);
  if (Date.now() - lastMine < 30 * 60000) { note(t('ciTooSoon')); return; }
  try {
    const r = await fetch(`https://ntfy.sh/${ciTopic(it.lat, it.lon)}`, { method: 'POST', body: JSON.stringify({ s: id, v }) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    ciAdd(await r.json());
    store.set(key, String(Date.now()));
    track('checkin', `${v} · ${it.cat}`);
    note(t('ciThanks'));
    refresh();
  } catch { note(t('addFail'), 'err'); }
}

// ---------- parking (car parks from the map tiles we already load for shade) ----------
const PARK = { on: false, layer: null, nearMarker: null, cache: new Map() };
const pid = (p) => p.lat.toFixed(5) + ',' + p.lon.toFixed(5);

// Parking reports: same approach as check-ins (ntfy.sh topic per ~5 km tile, kept 12 h).
// Message {"p": "lat,lon", "v": "free"|"busy"|"full"|"gone"}; a report counts for 90 minutes ("gone": 12 h).
const PK = new Map(), pkTiles = new Map();
const PK_EMOJI = { free: '🟢', busy: '🟡', full: '🔴', gone: '⚫' };
const pkTopic = (lat, lon) => `betachpatuach-pk-${Math.floor(lat / CI_T)}-${Math.floor(lon / CI_T)}`;
function pkAdd(m) {
  try {
    const x = JSON.parse(m.message);
    if (!x || typeof x.p !== 'string' || !PK_EMOJI[x.v]) return;
    const arr = PK.get(x.p) || [];
    if (!arr.some((y) => y.id === m.id)) arr.push({ id: m.id, v: x.v, time: m.time });
    arr.sort((a, b) => b.time - a.time);
    PK.set(x.p, arr.slice(0, 10));
  } catch {}
}
function pkLatest(id) {
  const r = (PK.get(id) || [])[0];
  if (!r) return null;
  const age = Date.now() / 1000 - r.time;
  return age < (r.v === 'gone' ? 12 * 3600 : 90 * 60) ? r : null;
}
async function loadParkReports(s, w, n, e) {
  const topics = new Set();
  for (let la = Math.floor(s / CI_T); la <= Math.floor(n / CI_T); la++)
    for (let lo = Math.floor(w / CI_T); lo <= Math.floor(e / CI_T); lo++) topics.add(`betachpatuach-pk-${la}-${lo}`);
  if (topics.size > 6) return false;
  let got = false;
  await Promise.all([...topics].map(async (tp) => {
    const last = pkTiles.get(tp);
    if (last && Date.now() - last < 120000) return;
    pkTiles.set(tp, Date.now());
    try {
      const txt = await (await fetch(`https://ntfy.sh/${tp}/json?poll=1&since=12h`)).text();
      for (const line of txt.split('\n')) {
        if (!line.trim()) continue;
        const m = JSON.parse(line);
        if (m.event === 'message') { pkAdd(m); got = true; }
      }
    } catch { pkTiles.delete(tp); }
  }));
  return got;
}
function pkStatusText(r) { return `${PK_EMOJI[r.v]} ${t('pk_' + r.v)}, ${ciAgo(r.time)}`; }
function pkPopupHTML(p) {
  const id = pid(p), r = pkLatest(id);
  const btn = (v) => `<button type="button" class="pk-btn pk-${v}" data-pk="${id}" data-v="${v}">${PK_EMOJI[v]} ${esc(t('pk_' + v))}</button>`;
  return `<div class="pk-pop"><b>${esc(p.name || t('pkTitle'))}</b>
    <p class="pk-now">${r ? esc(pkStatusText(r)) : esc(t('pkNoReports'))}</p>
    <p class="pk-ask">${esc(t('pkAsk'))}</p>
    <div class="pk-btns">${btn('free')}${btn('busy')}${btn('full')}${btn('gone')}</div></div>`;
}
function pkIcon(p) {
  const r = pkLatest(pid(p));
  return L.divIcon({ className: '', html: `<div class="p-pin${r ? ' pk-' + r.v : ''}">P</div>`, iconSize: [22, 22], iconAnchor: [11, 11] });
}
async function drawParking() {
  if (PARK.layer) { PARK.layer.remove(); PARK.layer = null; }
  if (!PARK.on) return;
  if (map.getZoom() < 14) { S.notices.loc = { cls: 'info', text: t('parkZoom') }; renderNotices(); return; }
  const b = map.getBounds().pad(0.1);
  const [list] = await Promise.all([
    Route.parkingIn([b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]),
    loadParkReports(b.getSouth(), b.getWest(), b.getNorth(), b.getEast()),
  ]);
  if (!PARK.on) return;
  if (PARK.layer) PARK.layer.remove();
  PARK.layer = L.layerGroup().addTo(map);
  for (const p of list.slice(0, 300)) {
    L.marker([p.lat, p.lon], { icon: pkIcon(p), keyboard: false })
      .bindPopup(() => pkPopupHTML(p), { maxWidth: 260 })
      .addTo(PARK.layer);
  }
}
async function pkReport(id, v) {
  const [lat, lon] = id.split(',').map(Number);
  const note = (text, cls = 'info') => { S.notices.loc = { cls, text }; renderNotices(); };
  if (!S.me) { note(t('pkNeedLoc')); locate(false); return; }
  if (distM(S.me.lat, S.me.lon, lat, lon) > 500) { note(t('pkFar')); return; }
  const key = 'pk:' + id;
  if (Date.now() - Number(store.get(key) || 0) < 15 * 60000) { note(t('ciTooSoon')); return; }
  try {
    const r = await fetch(`https://ntfy.sh/${pkTopic(lat, lon)}`, { method: 'POST', body: JSON.stringify({ p: id, v }) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    pkAdd(await r.json());
    store.set(key, String(Date.now()));
    track('parking-report', v);
    note(t('ciThanks'));
    map.closePopup();
    drawParking();
    refresh();
  } catch { note(t('addFail'), 'err'); }
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
  await loadParkReports(it.lat - 0.01, it.lon - 0.01, it.lat + 0.01, it.lon + 0.01);
  const el2 = document.querySelector(`[data-park-for="${CSS.escape(it.id)}"]`);
  if (el2) el2.innerHTML = parkLineHTML(it.id);
}
function showParkSpot(lat, lon) {
  if (PARK.nearMarker) PARK.nearMarker.remove();
  PARK.nearMarker = L.marker([lat, lon], { icon: L.divIcon({ className: '', html: '<div class="p-pin near">P</div>', iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(map);
  map.panTo([lat, lon]);
  track('parking-show', 'parking near shop');
}

// ---------- layers menu: what to draw on the map (remembered per device) ----------
const LY = Object.assign({ shops: true, parking: false, rings: true }, (() => { try { return JSON.parse(store.get('layers') || '{}'); } catch { return {}; } })());
function applyLayers() {
  for (const lyr of [pinLayer, dotLayer]) { if (LY.shops) lyr.addTo(map); else lyr.remove(); }
  if (ringLayer) { if (LY.rings) ringLayer.addTo(map); else ringLayer.remove(); }
  PARK.on = LY.parking;
  if (!PARK.on && PARK.nearMarker) { PARK.nearMarker.remove(); PARK.nearMarker = null; }
  drawParking();
  store.set('layers', JSON.stringify(LY));
}
function initLayers() {
  const pop = $('#layersPop'), btn = $('#layersBtn');
  const sync = () => { $('#lyShops').checked = LY.shops; $('#lyParking').checked = LY.parking; $('#lyRings').checked = LY.rings; };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    pop.hidden = !pop.hidden; btn.setAttribute('aria-expanded', String(!pop.hidden));
    $('#lpTitle').textContent = t('layers'); $('#lyShopsL').textContent = t('lyShops'); $('#lyParkingL').textContent = t('lyParking'); $('#lyRingsL').textContent = t('lyRings');
    sync();
  });
  for (const [id, k] of [['#lyShops', 'shops'], ['#lyParking', 'parking'], ['#lyRings', 'rings']]) {
    $(id).addEventListener('change', (e) => { LY[k] = e.target.checked; track('layer-' + k, LY[k] ? 'on' : 'off'); applyLayers(); refresh(); });
  }
  document.addEventListener('click', (e) => { if (!pop.hidden && !e.target.closest('#layersPop, #layersBtn')) { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
  applyLayers();
}

// ---------- analytics (GoatCounter: cookie-free, no personal data) ----------
function track(path, title) {
  try { window.goatcounter?.count?.({ path, title, event: true }); } catch {}
}

// ---------- wire up ----------
async function init() {
  applyLang();
  const m = location.hash.match(/^#(-?\d+\.?\d*),(-?\d+\.?\d*)(?:,(\d+))?$/);
  let last = null; try { last = JSON.parse(store.get('lastView') || 'null'); } catch {}
  const start = m ? [+m[1], +m[2], +(m[3] || 16)] : last || [32.0853, 34.7818, 15];
  initMap([start[0], start[1]], start[2]);
  initSheet();
  $('#list').innerHTML = '<li class="skeleton"></li><li class="skeleton"></li><li class="skeleton"></li>';

  $('#locate').addEventListener('click', () => { track('click-locate', 'near me'); locate(false); });
  $('#routeClose').addEventListener('click', clearRoute);
  initLayers();
  map.on('moveend', () => { if (PARK.on) drawParking(); });
  initAdd();
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pk]');
    if (b) { e.preventDefault(); pkReport(b.dataset.pk, b.dataset.v); }
  });
  $('#shadeBtn').addEventListener('click', () => {
    RT.wantShade = !RT.wantShade;
    if (RT.target) showRoute(RT.target);
  });
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
    const a = e.target.closest('.actions a');
    if (a) {
      // Count "went to the shop" actions in GoatCounter (no personal data: only which button and chain category).
      const kind = a.href.includes('google.com/maps') ? 'route' : a.href.startsWith('tel:') ? 'call' : 'waze';
      const it = S.view.find((x) => x.id === S.selected);
      track(`click-${kind}`, `${kind} · ${it ? it.cat : ''}`);
    }
    if (e.target.closest('a')) return;
    const cb = e.target.closest('[data-ci]');
    if (cb) { checkIn(cb.dataset.ci, cb.dataset.v); return; }
    const pg = e.target.closest('[data-park-go]');
    if (pg) { const [la, lo] = pg.dataset.parkGo.split(',').map(Number); showParkSpot(la, lo); return; }
    const walk = e.target.closest('[data-walk]');
    if (walk) { const it = S.view.find((x) => x.id === walk.dataset.walk); if (it) showRoute(it); return; }
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
