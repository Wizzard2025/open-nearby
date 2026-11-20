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

  // Everything the community added in a bounding box [s, w, n, e].
  // One database call (function community_area) returns all four kinds of data.
  async function area([s, w, n, e]) {
    const { data, error } = await sb.rpc('community_area', { s, w, n, e });
    if (error) throw error;
    return { places: data.places || [], fixes: data.fixes || [], checkins: data.checkins || [], parking: data.parking || [] };
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
    // Ad requests are write-only for visitors (no read-back): nobody but the owner sees the contacts.
    adRequest: async (row) => {
      await ensureUser();
      const { error } = await sb.from('ad_requests').insert(row);
      if (error) { const e = new Error(error.message); e.code = /rate_limited/.test(error.message) ? 'rate_limited' : 'failed'; throw e; }
    },
    signInEmail, signOut, me, onChange,
  };
})();
