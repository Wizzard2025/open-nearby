/* Community data for «בטוח? פתוח!» — Supabase (Postgres + Auth).
   Everyone reads. The first time someone adds something, a silent anonymous session is created;
   signing in with an email link later keeps the same user, so their check-ins and fixes follow them.
   The key below is the public "publishable" key: access is controlled by row-level security in the database. */
'use strict';
window.DB = (() => {
  const URL = 'https://pmxrltyekfddkbagzomn.supabase.co';
  const KEY = 'sb_publishable_PaHG07aS3KSF-eE5fOHLbg__c6b-a3a';
  const sb = window.supabase?.createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  if (!sb) return null;

  async function session() { return (await sb.auth.getSession()).data.session; }
  async function ensureUser() {
    const s = await session();
    if (s) return s.user;
    const { data, error } = await sb.auth.signInAnonymously();
    if (error) throw error;
    return data.user;
  }
  const inBox = (q, [s, w, n, e]) => q.gte('lat', s).lte('lat', n).gte('lon', w).lte('lon', e);
  const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();

  // Everything the community added in a bounding box [s, w, n, e].
  async function area(box) {
    const [places, fixes, checkins, parking] = await Promise.all([
      inBox(sb.from('places').select('id,lat,lon,name,cat,opening_hours,phone'), box).limit(500),
      inBox(sb.from('hours_fixes').select('shop_id,opening_hours,created_at'), box).gte('created_at', ago(24 * 180)).order('created_at', { ascending: false }).limit(500),
      inBox(sb.from('checkins').select('id,shop_id,status,created_at'), box).gte('created_at', ago(3)).order('created_at', { ascending: false }).limit(1000),
      inBox(sb.from('parking_reports').select('id,parking_id,status,created_at'), box).gte('created_at', ago(12)).order('created_at', { ascending: false }).limit(1000),
    ]);
    for (const r of [places, fixes, checkins, parking]) if (r.error) throw r.error;
    return { places: places.data, fixes: fixes.data, checkins: checkins.data, parking: parking.data };
  }

  // Inserts; database errors 'too_soon' / 'rate_limited' come back as err.code for the UI.
  async function insert(table, row) {
    await ensureUser();
    const { data, error } = await sb.from(table).insert(row).select().single();
    if (error) { const e = new Error(error.message); e.code = /too_soon/.test(error.message) ? 'too_soon' : /rate_limited/.test(error.message) ? 'rate_limited' : 'failed'; throw e; }
    return data;
  }

  // Optional sign-in by a one-time email link. An anonymous visitor keeps their data: the email is attached to them.
  async function signInEmail(email) {
    const s = await session();
    const redirect = location.origin + location.pathname;
    const { error } = s?.user?.is_anonymous
      ? await sb.auth.updateUser({ email }, { emailRedirectTo: redirect })
      : await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
    if (error) throw error;
  }
  async function signOut() { await sb.auth.signOut(); }
  async function me() { const s = await session(); return s ? { email: s.user.email || null, anonymous: !!s.user.is_anonymous } : null; }
  function onChange(cb) { sb.auth.onAuthStateChange(() => cb()); }

  return {
    area,
    addPlace: (row) => insert('places', row),
    fixHours: (row) => insert('hours_fixes', row),
    checkin: (row) => insert('checkins', row),
    parking: (row) => insert('parking_reports', row),
    signInEmail, signOut, me, onChange,
  };
})();
