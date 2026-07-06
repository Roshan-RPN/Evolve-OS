-- ============================================================
-- Life OS — full fresh-database setup.
-- Paste this ENTIRE file into Supabase → SQL Editor → Run.
-- Safe to re-run (idempotent: 'if not exists' guards throughout).
-- ============================================================

-- ===== base schema.sql =====
-- Life OS schema. Run this in the Supabase SQL editor for your project.
-- Single-user app: no row-level auth split, passcode gate happens at the app layer.

create extension if not exists "pgcrypto";

-- One row: 3yr/1yr vision + future identity
create table if not exists identity (
  id uuid primary key default gen_random_uuid(),
  vision_3_year text,
  vision_1_year text,
  future_identity_traits text,
  future_identity_behaviors text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row: full onboarding context the AI references before generating anything
create table if not exists profile (
  id uuid primary key default gen_random_uuid(),
  who_you_are_now text,
  strengths text,
  weaknesses text,
  past_patterns text,
  motivation text,
  fears text,
  capacity_check text,
  energy_pattern text,
  feedback_style text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3-year / yearly / monthly / weekly goal cascade
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('three_year', 'yearly', 'monthly', 'weekly')),
  period text not null, -- '2029', '2026', '2026-07', '2026-W27'
  parent_id uuid references goals(id) on delete set null,
  content text not null,
  action text,          -- weekly rows: the concrete action for that day
  day_index smallint,   -- weekly rows: 0=Mon … 6=Sun
  done boolean not null default false,
  rank int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists goals_period_idx on goals(level, period);

-- One saved end-of-week evaluation per week
create table if not exists weekly_reviews (
  period text primary key, -- '2026-W27'
  completion numeric not null default 0,
  planned int not null default 0,
  done_count int not null default 0,
  verdict text,
  stats jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Daily plan submitted each morning
create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  top_priorities jsonb not null default '[]',
  todo jsonb not null default '[]',
  schedule jsonb not null default '[]',
  ai_critique text,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per day: morning + evening journal blocks
create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  morning jsonb, -- affirmations, energy, gratitude, mood_score, etc.
  evening jsonb, -- story_moment, mistakes, better_tomorrow, gratitude, energy_leak, self_respect_score, win, first_move
  ai_morning_story text,
  ai_realization text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Habit stack: identity (non-negotiable), single active stretch habit, backlog
create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('identity', 'stretch', 'backlog')),
  status text not null default 'active' check (status in ('active', 'backlog', 'archived')),
  streak int not null default 0,
  best_streak int not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mid-day check-in pings and tap responses
create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  scheduled_at timestamptz not null default now(),
  responded_at timestamptz,
  prompt text not null,
  linked_priority text,
  habit_id uuid references habits(id) on delete set null,
  response text check (response in ('done', 'partial', 'skipped')),
  mood text check (mood in ('good', 'low', 'stuck', 'confused')),
  follow_up_story text,
  created_at timestamptz not null default now()
);

-- Daily completion per habit, auto-marked from checkins/evening journal
create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  date date not null,
  completed boolean not null default false,
  source text not null default 'manual' check (source in ('checkin', 'evening', 'manual')),
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

-- Append-only: AI-detected say-vs-do patterns
create table if not exists patterns (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  description text not null,
  category text,
  created_at timestamptz not null default now()
);

-- Weekly audits + monthly reviews
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('weekly', 'monthly')),
  period text not null, -- '2026-W27' or '2026-07'
  content text not null,
  created_at timestamptz not null default now()
);

-- Confusion Dump: raw thoughts the coach untangles instantly
create table if not exists thoughts (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  kind text not null default 'confusion' check (kind in ('confusion', 'idea', 'note')),
  content text not null,
  ai_response text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists thoughts_date_idx on thoughts(date desc);

-- Manifestation board: vision-board entries (image + caption) the user pins,
-- rendered as a stories-style feed. Nightly AI visualizations live in
-- journal_entries.evening.manifestation and are surfaced alongside these.
create table if not exists manifestations (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  kind text not null default 'vision' check (kind in ('vision', 'proof', 'affirmation')),
  caption text not null,
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists manifestations_created_idx on manifestations(created_at desc);

-- Web push subscriptions (single user, but may have multiple devices)
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ===== migrations/0001_goals_planning_manifestation.sql =====
-- Migration for existing databases: 3-year goals level, goal done flag,
-- and the manifestation board table. Idempotent — safe to re-run.

-- 1) Widen the goals.level check to include 'three_year'
alter table goals drop constraint if exists goals_level_check;
alter table goals
  add constraint goals_level_check
  check (level in ('three_year', 'yearly', 'monthly', 'weekly'));

-- 2) Add a done flag so monthly/weekly goals can be checked off
alter table goals add column if not exists done boolean not null default false;

-- 3) Manifestation board
create table if not exists manifestations (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  kind text not null default 'vision' check (kind in ('vision', 'proof', 'affirmation')),
  caption text not null,
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists manifestations_created_idx on manifestations(created_at desc);

-- ===== migrations/0002_goal_parent_link.sql =====
-- Cascade linkage: let a goal optionally point at a higher-level goal it serves.
-- Idempotent. schema.sql already declares parent_id for fresh installs; this backfills
-- existing databases where migration 0001 did not add the column.
alter table goals
  add column if not exists parent_id uuid references goals(id) on delete set null;

-- ===== migrations/0003_weekly_day_actions.sql =====
-- Weekly redesign: each weekday holds one goal + one action, marked done.
-- Adds per-day fields to goals and a table to persist end-of-week evaluations.
-- Idempotent — safe to re-run.

alter table goals
  add column if not exists action text;

alter table goals
  add column if not exists day_index smallint; -- 0=Mon … 6=Sun, weekly rows only

-- One saved evaluation per week (auto-scored when a week rolls over, or on demand).
create table if not exists weekly_reviews (
  period text primary key,            -- '2026-W27'
  completion numeric not null default 0, -- 0..1 done/planned
  planned int not null default 0,
  done_count int not null default 0,
  verdict text,                       -- Leo's blunt evaluation
  stats jsonb not null default '{}',  -- { gaps: [{weekday, goal}] }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===== migrations/0004_manifest_ritual_habit_stack.sql =====
-- Migration: guided manifestation ritual log + real habit stacking.
-- Idempotent — safe to re-run.

-- 1) Felt-sense log for the guided visualization ritual AND the evening sensory step.
create table if not exists vision_sessions (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  focus text not null default '1yr'
    check (focus in ('3yr', '1yr', 'first_move', 'affirmation')),
  vividness int not null default 5,
  body_location text,
  felt_note text,
  created_at timestamptz not null default now()
);
create index if not exists vision_sessions_created_idx on vision_sessions(created_at desc);

-- 2) Habit stacking: an anchor cue ("after X"), a time-of-day group, and whether
--    the habit was written by the user or suggested by Leo.
alter table habits add column if not exists anchor text;
alter table habits add column if not exists time_of_day text not null default 'anytime';
alter table habits add column if not exists origin text not null default 'self';

-- Constrain the new text columns (drop-then-add so re-runs stay clean).
alter table habits drop constraint if exists habits_time_of_day_check;
alter table habits
  add constraint habits_time_of_day_check
  check (time_of_day in ('morning', 'afternoon', 'evening', 'anytime'));

alter table habits drop constraint if exists habits_origin_check;
alter table habits
  add constraint habits_origin_check
  check (origin in ('self', 'leo'));

-- ===== migrations/0005_vision_board_goal_images.sql =====
-- Migration: vision-board hero image + goal-tagged images + weekly real-story cache.
-- Idempotent — safe to re-run.
-- Paste the CONTENTS of this file into the Supabase SQL editor (not the file path).

-- 1) Storage bucket for uploaded vision-board / goal images.
--    Public so the browser can render the returned URL directly; object paths are
--    randomized (unguessable) at upload time. Server writes use the service-role
--    key, so these policies mainly future-proof an anon-key switch.
insert into storage.buckets (id, name, public)
values ('vision-board', 'vision-board', true)
on conflict (id) do nothing;

drop policy if exists "vision_board_read" on storage.objects;
create policy "vision_board_read" on storage.objects
  for select using (bucket_id = 'vision-board');

drop policy if exists "vision_board_write" on storage.objects;
create policy "vision_board_write" on storage.objects
  for insert with check (bucket_id = 'vision-board');

drop policy if exists "vision_board_delete" on storage.objects;
create policy "vision_board_delete" on storage.objects
  for delete using (bucket_id = 'vision-board');

-- 2) Single vision-board hero image, stored on the existing one-row identity table.
alter table identity add column if not exists vision_board_url text;

-- 3) Tag a pinned board image to a specific goal (drives the "Why I'm doing this" strip).
alter table manifestations add column if not exists goal_id uuid references goals(id) on delete set null;
create index if not exists manifestations_goal_idx on manifestations(goal_id);

-- 4) Weekly cache of the Leo-picked REAL-person story per (week, mood).
--    Generated once per week per mood, reused on every load — stable + cheap,
--    and lets us vet realness once rather than on each render.
create table if not exists mood_stories (
  id uuid primary key default gen_random_uuid(),
  week text not null,          -- ISO week key, e.g. '2026-W27'
  mood text not null,          -- MOODS id, e.g. 'lost-belief'
  name text not null,
  field text,
  headline text,
  body jsonb not null default '[]',
  lesson text,
  source text not null default 'leo' check (source in ('leo', 'curated')),
  created_at timestamptz not null default now(),
  unique (week, mood)
);
create index if not exists mood_stories_week_idx on mood_stories(week);

-- ===== migrations/0006_habit_minutes.sql =====
-- Time-tracking for habits: optional minutes logged per completion.
-- Binary completion is unchanged; minutes is nullable (done-but-untimed = null).
-- Paste the CONTENTS of this file into the Supabase SQL editor and Run.
-- Idempotent.

alter table habit_logs add column if not exists minutes integer
  check (minutes is null or (minutes >= 0 and minutes <= 1440));

-- Optional per-habit default duration, so timed habits can pre-fill a sensible
-- chip and the "time spent" charts have something to expect. Null = untimed.
alter table habits add column if not exists target_minutes integer
  check (target_minutes is null or (target_minutes >= 0 and target_minutes <= 1440));

-- ===== migrations/0007_habit_icons.sql =====
-- Custom icon per habit: stores a key from lib/habit-icons.ts (e.g. 'gym', 'read').
-- Null = auto-pick from the habit name. Paste into the Supabase SQL editor and Run.
-- Idempotent.

alter table habits add column if not exists icon text;

-- ===== migrations/0008_multi_user.sql =====
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

-- ===== migrations/0009_user_email.sql =====
-- 0009: profile email — shown on the Profile page, optional at registration.
-- Paste into the Supabase SQL editor (Dashboard → SQL Editor → New query) and Run.
alter table app_users
  add column if not exists email text;

-- ===== migrations/0010_profile_extras.sql =====
-- Profile extras: preset avatar + per-profile Gemini API key
-- (each profile brings its own key so Leo runs on their own quota).
alter table app_users add column if not exists avatar text;
alter table app_users add column if not exists gemini_api_key text;

-- ===== migrations/0011_habit_colors.sql =====
-- 0011: per-habit accent colour, chosen when building the habit.
-- Stores a palette key from lib/habit-colors.ts (not a raw hex) so the
-- palette can be tuned later without touching saved rows.
alter table habits add column if not exists color text;

-- ===== migrations/0012_user_email_unique.sql =====
-- 0012: email is now the login identifier, so it must be unique (case-insensitive).
-- Emails are stored lowercased by the app; this index enforces no duplicates.
-- Paste into the Supabase SQL editor (Dashboard → SQL Editor → New query) and Run.
create unique index if not exists app_users_email_unique
  on app_users (lower(email))
  where email is not null;

-- ===== migrations/0013_enable_rls.sql =====
-- Migration 0013: lock down direct REST access. Idempotent — safe to re-run.
-- Paste the CONTENTS into the Supabase SQL editor and run.
--
-- WHY (critical): the browser ships NEXT_PUBLIC_SUPABASE_ANON_KEY. With RLS
-- OFF, that public key can hit the Supabase REST API directly and read/write
-- EVERY table for EVERY user (password hashes, emails, journals, API keys).
--
-- FIX: turn RLS on for every table and add NO policies. The public roles
-- (anon, authenticated) then get zero rows. All app code uses the
-- service_role key, which BYPASSES RLS, so the app keeps working unchanged.
-- Also revoke table/sequence grants from the public roles as a second layer.

do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', t.tablename);
  end loop;
end $$;

-- Belt and suspenders: strip privileges from the browser-facing roles.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- ===== migrations/0014_user_model.sql =====
-- Per-profile AI model choice. Each user picks which Gemini model Leo runs on
-- (null = fall back to the app's GEMINI_MODEL env default).
alter table app_users add column if not exists gemini_model text;
