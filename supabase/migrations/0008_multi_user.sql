-- Migration: multiple user profiles, each with their own passcode and data.
-- Idempotent — safe to re-run. Paste the CONTENTS into the Supabase SQL editor.
--
-- Design: Netflix-style profiles. app_users holds each profile; every data
-- table gets a user_id that DEFAULTS to the fixed "owner" id below, so all
-- existing rows (and any insert an old client makes) land on the owner.
-- The owner row uses the sentinel hash 'env' — the app verifies that profile
-- against the APP_PASSCODE env var, so the current passcode keeps working.

create extension if not exists "pgcrypto";

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  passcode_hash text not null, -- sha256("<passcode>:<AUTH_SECRET>"), or 'env' for the owner
  created_at timestamptz not null default now()
);

-- Fixed owner id: existing single-user data is claimed by this profile.
insert into app_users (id, name, passcode_hash)
values ('00000000-0000-0000-0000-000000000001', 'Owner', 'env')
on conflict (id) do nothing;

-- user_id on every data table, defaulting to the owner so existing rows are claimed.
alter table identity           add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table profile            add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table goals              add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table weekly_reviews     add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table plans              add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table journal_entries    add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table habits             add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table checkins           add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table habit_logs         add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table patterns           add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table reviews            add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table thoughts           add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table manifestations     add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table vision_sessions    add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table mood_stories       add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;
alter table push_subscriptions add column if not exists user_id uuid not null default '00000000-0000-0000-0000-000000000001' references app_users(id) on delete cascade;

-- Per-day / per-period uniques must now be per-user.
alter table plans drop constraint if exists plans_date_key;
drop index if exists plans_user_date_key;
create unique index plans_user_date_key on plans(user_id, date);

alter table journal_entries drop constraint if exists journal_entries_date_key;
drop index if exists journal_entries_user_date_key;
create unique index journal_entries_user_date_key on journal_entries(user_id, date);

-- weekly_reviews was keyed on period alone; re-key on (user_id, period).
alter table weekly_reviews drop constraint if exists weekly_reviews_pkey;
alter table weekly_reviews add primary key (user_id, period);

alter table mood_stories drop constraint if exists mood_stories_week_mood_key;
drop index if exists mood_stories_user_week_mood_key;
create unique index mood_stories_user_week_mood_key on mood_stories(user_id, week, mood);

-- Speed up the per-user scans every page does.
create index if not exists goals_user_idx on goals(user_id, level, period);
create index if not exists habits_user_idx on habits(user_id);
create index if not exists habit_logs_user_date_idx on habit_logs(user_id, date);
create index if not exists checkins_user_date_idx on checkins(user_id, date);
create index if not exists thoughts_user_idx on thoughts(user_id, date desc);
create index if not exists manifestations_user_idx on manifestations(user_id, created_at desc);
create index if not exists vision_sessions_user_idx on vision_sessions(user_id, created_at desc);
