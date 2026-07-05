-- 0009: profile email — shown on the Profile page, optional at registration.
-- Paste into the Supabase SQL editor (Dashboard → SQL Editor → New query) and Run.
alter table app_users
  add column if not exists email text;
