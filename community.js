/* Community data for «בטוח? פתוח!» — Supabase (Postgres + Auth).
   Everyone reads. Adding or changing anything needs an account (username, email and password); the database
   enforces this with row-level security (supabase/migrations), the app only explains it.
   Staff (admin, superadmin) can edit or remove what the community added and hide any shop.
   The key below is the public "publishable" key: access is controlled by row-level security in the database. */
'use strict';
window.DB = (() => {
  const URL = 'https://pmxrltyekfddkbagzomn.supabase.co';
  const KEY = 'sb_publishable_PaHG07aS3KSF-eE5fOHLbg__c6b-a3a';
  const sb = window.supabase?.createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  if (!sb) { return null; }

  const fail = (code, message = code) => Object.assign(new Error(message), { code });
  // Database and auth errors become short codes the UI has texts for.
  const ERROR_CODES = [
    [/too_soon/, 'too_soon'],
    [/rate_limited|over_email_send_rate|over_request_rate|429/, 'rate_limited'],
    [/42501|row-level security|permission denied|forbidden/, 'need_account'],
    [/invalid_credentials|Invalid login credentials/, 'bad_login'],
    [/email_not_confirmed|Email not confirmed/, 'not_confirmed'],
    [/user_already_exists|already registered/, 'email_taken'],
    [/weak_password|Password should/, 'weak_password'],
    [/23505|profiles_username_key|duplicate key/, 'name_taken'],
    [/profiles_username_check/, 'bad_name'],
    [/email_address_invalid|invalid format|validate email/, 'bad_email'],
    [/no_such_user/, 'no_such_user'],
    [/last_superadmin/, 'last_superadmin'],
  ];
  function codeOf(error) {
    const m = `${error?.code || ''} ${error?.message || ''}`;
    return ERROR_CODES.find(([re]) => re.test(m))?.[1] || 'failed';
  }
  const check = ({ data, error }) => { if (error) { throw fail(codeOf(error), error.message); } return data; };

  async function session() { return (await sb.auth.getSession()).data.session; }

  // The signed-in account: email, username and role (null for a guest or an anonymous session).
  let cached = null;
  async function account() {
    const s = await session();
    if (!s || s.user.is_anonymous) { cached = null; return null; }
    if (cached?.id === s.user.id) { return cached; }
    const [p, r] = await Promise.all([
      sb.from('profiles').select('username').eq('id', s.user.id).maybeSingle(),
      sb.from('user_roles').select('role').eq('user_id', s.user.id).maybeSingle(),
    ]);
    const role = r.data?.role || 'user';
    cached = { id: s.user.id, email: s.user.email || '', username: p.data?.username || null, role,
      admin: role === 'admin' || role === 'superadmin', superadmin: role === 'superadmin' };
    cached.member = !!cached.username || cached.admin;
    return cached;
  }
  const forget = () => { cached = null; };

  // Members only: the database refuses everyone else, so the app asks before trying.
  async function insert(table, row) {
    const a = await account();
    if (!a?.member) { throw fail('need_account'); }
    const data = check(await sb.from(table).insert(row).select().single());
    return data;
  }

  const USERNAME = /^[\p{L}\p{N}_.-]{3,20}$/u;
  async function usernameAvailable(name) {
    if (!USERNAME.test(name)) { return false; }
    return check(await sb.rpc('username_available', { name }));
  }
  const redirect = () => location.origin + location.pathname;
  // New account. With email confirmation on (the Supabase default) there is no session until the link in the
  // confirmation email is opened; the username is kept in the account and its profile is created right away.
  async function signUp({ email, password, username }) {
    if (!USERNAME.test(username)) { throw fail('bad_name'); }
    if (!(await usernameAvailable(username))) { throw fail('name_taken'); }
    const data = check(await sb.auth.signUp({ email, password, options: { data: { username }, emailRedirectTo: redirect() } }));
    forget();
    // Supabase answers an already registered email with a user that has no identities (it does not say so openly).
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) { throw fail('email_taken'); }
    return { confirm: !data.session };
  }
  async function signIn({ email, password }) { forget(); check(await sb.auth.signInWithPassword({ email, password })); return account(); }
  async function resetPassword(email) { check(await sb.auth.resetPasswordForEmail(email, { redirectTo: redirect() })); }
  async function setPassword(password) { check(await sb.auth.updateUser({ password })); }
  // For accounts made before usernames existed (email-link sign-in).
  async function setUsername(username) {
    const s = await session();
    if (!s || s.user.is_anonymous) { throw fail('need_account'); }
    if (!USERNAME.test(username)) { throw fail('bad_name'); }
    check(await sb.from('profiles').upsert({ id: s.user.id, username, display_name: username }));
    forget();
    return account();
  }
  async function signOut() { forget(); await sb.auth.signOut(); }
  // cb(event): 'PASSWORD_RECOVERY' when the user came back from a password reset email.
  function onChange(cb) { sb.auth.onAuthStateChange((event) => { forget(); setTimeout(() => cb(event), 0); }); }

  // ---------- staff tools (the database checks the role again) ----------
  async function staff() { const a = await account(); if (!a?.admin) { throw fail('need_account'); } }
  const changed = (rows) => { if (!rows?.length) { throw fail('need_account'); } return rows; };
  const admin = {
    renamePlace: async (id, name) => { await staff(); return changed(check(await sb.from('places').update({ name }).eq('id', id).select('id'))); },
    deletePlace: async (id) => { await staff(); return changed(check(await sb.from('places').delete().eq('id', id).select('id'))); },
    hideShop: async (shopId, lat, lon) => { await staff(); check(await sb.from('hidden_shops').upsert({ shop_id: shopId, lat, lon }, { onConflict: 'shop_id', ignoreDuplicates: true })); },
    unhideShop: async (shopId) => { await staff(); check(await sb.from('hidden_shops').delete().eq('shop_id', shopId)); },
    clearFixes: async (shopId) => { await staff(); check(await sb.from('hours_fixes').delete().eq('shop_id', shopId)); },
    clearCheckins: async (shopId) => { await staff(); check(await sb.from('checkins').delete().eq('shop_id', shopId)); },
    clearParking: async (parkingId) => { await staff(); check(await sb.from('parking_reports').delete().eq('parking_id', parkingId)); },
    setRole: async (username, role) => { await staff(); return check(await sb.rpc('set_user_role', { target_username: username, new_role: role })); },
    listStaff: async () => { await staff(); return check(await sb.rpc('list_staff')) || []; },
  };

  // Everything the community added in a bounding box [s, w, n, e].
  // One database call (function community_area) returns all kinds of data.
  async function area([s, w, n, e]) {
    const data = check(await sb.rpc('community_area', { s, w, n, e }));
    return { places: data.places || [], fixes: data.fixes || [], checkins: data.checkins || [], parking: data.parking || [], hidden: data.hidden || [] };
  }

  return {
    area,
    addPlace: (row) => insert('places', row),
    fixHours: (row) => insert('hours_fixes', row),
    checkin: (row) => insert('checkins', row),
    parking: (row) => insert('parking_reports', row),
    // Ad requests are write-only for visitors (no read-back): nobody but the owner sees the contacts.
    // A business asking about ads does not need an account: a silent anonymous session is enough here.
    adRequest: async (row) => {
      if (!(await session())) { check(await sb.auth.signInAnonymously()); }
      const { error } = await sb.from('ad_requests').insert(row);
      if (error) { throw fail(codeOf(error) === 'rate_limited' ? 'rate_limited' : 'failed', error.message); }
    },
    account, signUp, signIn, signOut, resetPassword, setPassword, setUsername, usernameAvailable, onChange, admin,
    USERNAME,
  };
})();
