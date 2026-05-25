-- ===========================================================================
-- Section J Portal — Phase 1 schema
-- ---------------------------------------------------------------------------
-- Run this in Supabase SQL Editor (left sidebar → SQL Editor → New query).
-- It creates a `profiles` table that mirrors auth.users, plus the trigger and
-- security policies needed for the Phase 1 dashboard to work.
-- ===========================================================================

-- 1. The profiles table — one row per signed-up user, keyed by auth.users.id.
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  company text,
  role text not null default 'client' check (role in ('client', 'admin')),
  created_at timestamptz not null default now()
);

-- 2. Row Level Security: enable it, then write policies.
alter table public.profiles enable row level security;

-- Policy: a user can read their own profile.
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Policy: a user can update their own profile (name, company).
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Policy: admins can read all profiles (Phase 2 will need this).
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 3. Trigger: auto-create a profile row whenever a new auth.users row appears.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- After running, manually promote yourself to admin by running:
--
--   update public.profiles set role = 'admin' where id = (
--     select id from auth.users where email = 'j.poovely@sectionj.au'
--   );
--
-- (You can only do this AFTER you have invited yourself and accepted the
-- invite — i.e. there's a row for you in auth.users.)
-- ===========================================================================
