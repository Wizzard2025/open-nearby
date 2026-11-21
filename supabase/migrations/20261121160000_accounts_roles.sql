-- Accounts, roles and moderation for «בטוח? פתוח!» (1.4.0).
-- NOT APPLIED YET: waiting for the owner to approve it in Supabase. Tested on the live database in a rolled-back transaction.
--   * Only registered members (a real account with a username, not an anonymous session) add or change data.
--   * Admins and superadmins can edit or delete anything the community added and hide any shop from the map.
--   * Only a superadmin can give or take admin rights (set_user_role).
--   * Clients may write only the columns they need: id, created_by and created_at always come from the database,
--     so nobody can post a check-in dated in the future (it would override every later report).
-- Roles live in their own table that no client can write, so a user cannot raise their own role.

-- ---------- usernames ----------
alter table public.profiles add column if not exists username text;
alter table public.profiles drop constraint if exists profiles_username_check;
alter table public.profiles add constraint profiles_username_check
  check (username ~ '^[[:alnum:]_.-]{3,20}$');
create unique index if not exists profiles_username_key on public.profiles (lower(username));

-- A new account gets its profile from the username given at sign-up (anonymous sessions have none).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare uname text := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
begin
  if uname is not null then
    insert into public.profiles (id, username, display_name) values (new.id, uname, uname)
    on conflict (id) do update set username = excluded.username;
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Sign-up form check, so a taken name is reported before the account is created.
create or replace function public.username_available(name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select name ~ '^[[:alnum:]_.-]{3,20}$'
     and not exists (select 1 from public.profiles where lower(username) = lower(name))
$$;

-- ---------- roles ----------
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'superadmin')),
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now()
);
alter table public.user_roles enable row level security;
revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;
drop policy if exists "read own role" on public.user_roles;
create policy "read own role" on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin', 'superadmin'))
$$;
create or replace function public.is_superadmin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'superadmin')
$$;
-- A member: signed in with a real account that has a username (staff always count).
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
     and (exists (select 1 from public.profiles where id = auth.uid() and username is not null)
          or exists (select 1 from public.user_roles where user_id = auth.uid()))
$$;

-- Superadmin only: role 'admin', 'superadmin', or 'user' (removes the role). The last superadmin cannot be removed.
create or replace function public.set_user_role(target_username text, new_role text) returns text
language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  if not public.is_superadmin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if new_role not in ('admin', 'superadmin', 'user') then raise exception 'bad_role' using errcode = '22023'; end if;
  select id into target from public.profiles where lower(username) = lower(trim(target_username));
  if target is null then raise exception 'no_such_user' using errcode = 'P0002'; end if;
  if new_role <> 'superadmin'
     and exists (select 1 from public.user_roles where user_id = target and role = 'superadmin')
     and (select count(*) from public.user_roles where role = 'superadmin') = 1 then
    raise exception 'last_superadmin' using errcode = 'P0001';
  end if;
  if new_role = 'user' then
    delete from public.user_roles where user_id = target;
  else
    insert into public.user_roles (user_id, role, granted_by) values (target, new_role, auth.uid())
    on conflict (user_id) do update set role = excluded.role, granted_by = excluded.granted_by, granted_at = now();
  end if;
  return new_role;
end $$;

-- Superadmin only: who has a role.
create or replace function public.list_staff() returns table (username text, role text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select coalesce(p.username, '—'), r.role from public.user_roles r
    left join public.profiles p on p.id = r.user_id order by r.role desc, p.username;
end $$;

revoke execute on function public.set_user_role(text, text), public.list_staff() from public, anon;
grant execute on function public.set_user_role(text, text), public.list_staff() to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.is_admin(), public.is_superadmin(), public.is_member() to anon, authenticated;

-- ---------- shops hidden by staff (any shop id, including the built-in OpenStreetMap ones) ----------
create table if not exists public.hidden_shops (
  shop_id text primary key check (char_length(shop_id) <= 64),
  lat double precision not null check (lat between 29 and 34),
  lon double precision not null check (lon between 34 and 36),
  hidden_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.hidden_shops enable row level security;
revoke all on public.hidden_shops from anon, authenticated;
grant select on public.hidden_shops to anon, authenticated;
grant insert (shop_id, lat, lon), delete on public.hidden_shops to authenticated;
drop policy if exists "read hidden_shops" on public.hidden_shops;
create policy "read hidden_shops" on public.hidden_shops for select to anon, authenticated using (true);
drop policy if exists "staff hide shops" on public.hidden_shops;
create policy "staff hide shops" on public.hidden_shops for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "staff unhide shops" on public.hidden_shops;
create policy "staff unhide shops" on public.hidden_shops for delete to authenticated using ((select public.is_admin()));

-- ---------- writes: members only; staff may change or remove anything ----------
-- Column grants: clients never set id, created_by or created_at.
revoke insert, update, truncate, references, trigger on public.places, public.hours_fixes, public.checkins,
  public.parking_reports, public.profiles from anon, authenticated;
revoke truncate, references, trigger on public.ad_requests from anon, authenticated;
grant insert (lat, lon, name, cat, opening_hours, phone) on public.places to authenticated;
grant update (lat, lon, name, cat, opening_hours, phone, hidden) on public.places to authenticated;
grant insert (shop_id, lat, lon, opening_hours) on public.hours_fixes to authenticated;
grant insert (shop_id, lat, lon, status) on public.checkins to authenticated;
grant insert (parking_id, lat, lon, status) on public.parking_reports to authenticated;
grant insert (id, username, display_name), update (username, display_name) on public.profiles to authenticated;

drop policy if exists "add places" on public.places;
create policy "add places" on public.places for insert to authenticated
  with check ((select public.is_member()) and created_by = (select auth.uid()) and not hidden);
drop policy if exists "edit own places" on public.places;
create policy "edit own places" on public.places for update to authenticated
  using ((select public.is_member()) and created_by = (select auth.uid()))
  with check ((select public.is_member()) and created_by = (select auth.uid()));
drop policy if exists "delete own places" on public.places;
create policy "delete own places" on public.places for delete to authenticated
  using ((select public.is_member()) and created_by = (select auth.uid()));
drop policy if exists "staff edit places" on public.places;
create policy "staff edit places" on public.places for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "staff delete places" on public.places;
create policy "staff delete places" on public.places for delete to authenticated using ((select public.is_admin()));
drop policy if exists "staff read places" on public.places;
create policy "staff read places" on public.places for select to authenticated using ((select public.is_admin()));

drop policy if exists "add hours_fixes" on public.hours_fixes;
create policy "add hours_fixes" on public.hours_fixes for insert to authenticated
  with check ((select public.is_member()) and created_by = (select auth.uid()));
drop policy if exists "delete own hours_fixes" on public.hours_fixes;
create policy "delete own hours_fixes" on public.hours_fixes for delete to authenticated
  using ((select public.is_member()) and created_by = (select auth.uid()));
drop policy if exists "staff delete hours_fixes" on public.hours_fixes;
create policy "staff delete hours_fixes" on public.hours_fixes for delete to authenticated using ((select public.is_admin()));

drop policy if exists "add checkins" on public.checkins;
create policy "add checkins" on public.checkins for insert to authenticated
  with check ((select public.is_member()) and created_by = (select auth.uid()));
drop policy if exists "delete own checkins" on public.checkins;
create policy "delete own checkins" on public.checkins for delete to authenticated
  using ((select public.is_member()) and created_by = (select auth.uid()));
drop policy if exists "staff delete checkins" on public.checkins;
create policy "staff delete checkins" on public.checkins for delete to authenticated using ((select public.is_admin()));

drop policy if exists "add parking_reports" on public.parking_reports;
create policy "add parking_reports" on public.parking_reports for insert to authenticated
  with check ((select public.is_member()) and created_by = (select auth.uid()));
drop policy if exists "delete own parking_reports" on public.parking_reports;
create policy "delete own parking_reports" on public.parking_reports for delete to authenticated
  using ((select public.is_member()) and created_by = (select auth.uid()));
drop policy if exists "staff delete parking_reports" on public.parking_reports;
create policy "staff delete parking_reports" on public.parking_reports for delete to authenticated using ((select public.is_admin()));

-- Profiles: a real (non-anonymous) account manages its own row; usernames are public, like display names.
drop policy if exists "own profile" on public.profiles;
drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()) and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists "delete own profile" on public.profiles;
create policy "delete own profile" on public.profiles for delete to authenticated using (id = (select auth.uid()));

-- ---------- area read: also the ids of hidden shops ----------
create or replace function public.community_area(s double precision, w double precision, n double precision, e double precision)
returns jsonb language sql stable set search_path to 'public' as $function$
  select case when n - s > 0.4 or e - w > 0.4 then '{}'::jsonb else jsonb_build_object(
    'places', coalesce((select jsonb_agg(p) from (select id, lat, lon, name, cat, opening_hours, phone from public.places
        where not hidden and lat between s and n and lon between w and e limit 500) p), '[]'::jsonb),
    'fixes', coalesce((select jsonb_agg(f) from (select shop_id, opening_hours, created_at from public.hours_fixes
        where lat between s and n and lon between w and e and created_at > now() - interval '180 days' order by created_at desc limit 500) f), '[]'::jsonb),
    'checkins', coalesce((select jsonb_agg(c) from (select id, shop_id, status, created_at from public.checkins
        where lat between s and n and lon between w and e and created_at > now() - interval '3 hours' order by created_at desc limit 1000) c), '[]'::jsonb),
    'parking', coalesce((select jsonb_agg(k) from (select id, parking_id, status, created_at from public.parking_reports
        where lat between s and n and lon between w and e and created_at > now() - interval '12 hours' order by created_at desc limit 1000) k), '[]'::jsonb),
    'hidden', coalesce((select jsonb_agg(h.shop_id) from (select shop_id from public.hidden_shops
        where lat between s and n and lon between w and e limit 1000) h), '[]'::jsonb)
  ) end
$function$;
